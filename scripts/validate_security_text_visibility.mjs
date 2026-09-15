#!/usr/bin/env node
/** Fail closed when explanatory Security 1.1 text is dimmed through ancestor opacity. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const MIN_EFFECTIVE_OPACITY = 0.99;

function cumulativeOpacity(values) {
  return values.reduce((value, opacity) => value * opacity, 1);
}

function runSelfTest() {
  const visible = cumulativeOpacity([1, 1, 1]);
  const legacyDimmed = cumulativeOpacity([1, 0.2, 1]);
  const nestedDimmed = cumulativeOpacity([0.8, 0.5]);
  if (visible < MIN_EFFECTIVE_OPACITY || legacyDimmed >= MIN_EFFECTIVE_OPACITY || nestedDimmed >= MIN_EFFECTIVE_OPACITY) {
    throw new Error(`opacity mutation fixture failed: visible=${visible}, legacy=${legacyDimmed}, nested=${nestedDimmed}`);
  }
  console.log('Security text-visibility mutation fixtures PASS: ancestor opacity is part of the rendered-text contract.');
}

if (process.argv.includes('--self-test')) {
  runSelfTest();
  process.exit(0);
}

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/security-requalification/text-visibility');
await fs.mkdir(outDir, { recursive: true });

const routes = [
  { locale: 'es', route: '/series/seguridad-ia/01-prompt-injection/' },
  { locale: 'en', route: '/en/series/seguridad-ia/01-prompt-injection/' },
];

const probes = [
  '.ctxmix__lane-label',
  '.ctxmix__segment',
  '.ctxmix__model-copy',
  '.ctxmix__runtime strong',
  '.ctxmix__runtime small',
  '.ctxmix__check',
  '.ctxmix__proposal-item',
  '.ctxmix__principle',
  '.ctxmix__explain p',
];

async function launchBrowser() {
  try {
    return { browser: await chromium.launch({ channel: 'chrome', headless: true }), engine: 'google-chrome' };
  } catch (chromeError) {
    return { browser: await chromium.launch({ headless: true }), engine: 'playwright-chromium', chromeError: String(chromeError) };
  }
}

const launched = await launchBrowser();
const failures = [];
const contexts = [];

try {
  for (const item of routes) {
    for (const width of [1440, 390]) {
      for (const motion of ['no-preference', 'reduce']) {
        const label = `${item.locale}/${width === 390 ? 'mobile' : 'desktop'}/${motion}`;
        const context = await launched.browser.newContext({
          viewport: { width, height: width === 390 ? 844 : 1000 },
          isMobile: width === 390,
          hasTouch: width === 390,
          reducedMotion: motion,
        });
        const page = await context.newPage();
        const runtime = [];
        page.on('pageerror', error => runtime.push({ type: 'pageerror', detail: String(error) }));
        page.on('requestfailed', request => {
          const detail = request.failure()?.errorText || '';
          if (!detail.includes('ERR_ABORTED')) runtime.push({ type: 'requestfailed', url: request.url(), detail });
        });
        page.on('response', response => {
          if (response.status() >= 400) runtime.push({ type: 'http', status: response.status(), url: response.url() });
        });

        const response = await page.goto(new URL(item.route, base).href, { waitUntil: 'networkidle', timeout: 20000 });
        if (!response?.ok()) failures.push({ context: label, reason: 'page-http', status: response?.status() });
        await page.evaluate(async () => {
          await Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 1500))]);
        });

        const states = [];
        for (const state of [1, 2, 3, 4]) {
          const button = page.locator(`.ctxmix [data-state-btn="${state}"]`).first();
          if (!(await button.count())) {
            failures.push({ context: label, state, reason: 'state-control-missing' });
            continue;
          }
          if (width === 390) await button.tap();
          else await button.click();
          await page.waitForTimeout(motion === 'reduce' ? 30 : 380);

          const stateResult = await page.evaluate(({ selectors, threshold, expectedState }) => {
            const root = document.querySelector('.ctxmix[data-state]');
            if (!root) return { missingRoot: true, expectedState, actualState: null, probes: [], verdict: null };

            const inspect = node => {
              const chain = [];
              let current = node;
              let effectiveOpacity = 1;
              let visible = true;
              while (current) {
                const style = getComputedStyle(current);
                const opacity = Number.parseFloat(style.opacity || '1');
                effectiveOpacity *= Number.isFinite(opacity) ? opacity : 1;
                chain.push({
                  node: current.className || current.tagName,
                  opacity,
                  display: style.display,
                  visibility: style.visibility,
                });
                if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') visible = false;
                if (current === root) break;
                current = current.parentElement;
              }
              const rect = node.getBoundingClientRect();
              if (rect.width <= 0 || rect.height <= 0) visible = false;
              return {
                text: (node.textContent || '').trim().slice(0, 160),
                effectiveOpacity,
                visible,
                chain,
                passes: visible && effectiveOpacity + 1e-9 >= threshold,
              };
            };

            const rows = [];
            for (const selector of selectors) {
              for (const node of root.querySelectorAll(selector)) rows.push({ selector, ...inspect(node) });
            }
            const verdictNode = root.querySelector('.ctxmix__verdict');
            const verdict = verdictNode ? inspect(verdictNode) : null;
            return {
              missingRoot: false,
              expectedState,
              actualState: Number(root.dataset.state),
              probes: rows,
              verdict,
            };
          }, { selectors: probes, threshold: MIN_EFFECTIVE_OPACITY, expectedState: state });

          if (stateResult.missingRoot) failures.push({ context: label, state, reason: 'ctxmix-root-missing' });
          if (stateResult.actualState !== state) failures.push({ context: label, state, reason: 'state-did-not-change', actualState: stateResult.actualState });
          if (!stateResult.probes.length) failures.push({ context: label, state, reason: 'no-text-probes-found' });
          for (const probe of stateResult.probes) {
            if (!probe.passes) failures.push({ context: label, state, reason: 'explanatory-text-not-fully-legible', probe });
          }
          if (!stateResult.verdict) {
            failures.push({ context: label, state, reason: 'verdict-missing' });
          } else if (state < 4) {
            if (stateResult.verdict.visible && stateResult.verdict.effectiveOpacity > 0.01) {
              failures.push({ context: label, state, reason: 'inactive-verdict-shown-as-ghost-text', verdict: stateResult.verdict });
            }
          } else if (!stateResult.verdict.passes) {
            failures.push({ context: label, state, reason: 'final-verdict-not-fully-legible', verdict: stateResult.verdict });
          }
          states.push(stateResult);
        }

        await page.waitForTimeout(100);
        if (runtime.length) failures.push({ context: label, reason: 'runtime-resource-errors', runtime });
        contexts.push({ context: label, states, runtime });
        await context.close();
      }
    }
  }
} finally {
  await launched.browser.close();
}

const report = {
  engine: launched.engine,
  chrome_launch_error: launched.chromeError || null,
  minimum_effective_opacity: MIN_EFFECTIVE_OPACITY,
  failures,
  contexts,
};
await fs.writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));

if (failures.length) {
  console.error(`Security text-visibility gate FAILED (${failures.length})`);
  for (const failure of failures) console.error(JSON.stringify(failure));
  process.exit(1);
}
console.log(`Security text-visibility gate PASS: ${contexts.length} ES/EN desktop/mobile normal/reduced contexts × 4 states, no explanatory text dimmed through ancestor opacity.`);
