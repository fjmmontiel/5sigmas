#!/usr/bin/env node
/**
 * Fail closed when visible explanatory Security 1.1 text is dimmed through
 * ancestor opacity or when ctxmix reveals a later mechanism state early.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const MIN_EFFECTIVE_OPACITY = 0.99;

function cumulativeOpacity(values) {
  return values.reduce((value, opacity) => value * opacity, 1);
}

function expectedCtxmixVisibility(state) {
  return {
    context: state >= 2,
    proposal: state >= 3,
    checks: state >= 4,
    verdict: state >= 4,
  };
}

function stagingFailures(state, observed) {
  const expected = expectedCtxmixVisibility(state);
  return Object.entries(expected)
    .filter(([key, value]) => observed[key] !== value)
    .map(([key, value]) => ({ key, expected: value, actual: observed[key] }));
}

function runSelfTest() {
  const visible = cumulativeOpacity([1, 1, 1]);
  const legacyDimmed = cumulativeOpacity([1, 0.2, 1]);
  const nestedDimmed = cumulativeOpacity([0.8, 0.5]);
  if (visible < MIN_EFFECTIVE_OPACITY || legacyDimmed >= MIN_EFFECTIVE_OPACITY || nestedDimmed >= MIN_EFFECTIVE_OPACITY) {
    throw new Error(`opacity mutation fixture failed: visible=${visible}, legacy=${legacyDimmed}, nested=${nestedDimmed}`);
  }

  for (const state of [1, 2, 3, 4]) {
    const expected = expectedCtxmixVisibility(state);
    if (stagingFailures(state, expected).length) throw new Error(`valid staging rejected at state ${state}`);
  }
  const mutations = [
    { state: 1, observed: { context: true, proposal: false, checks: false, verdict: false } },
    { state: 1, observed: { context: false, proposal: true, checks: false, verdict: false } },
    { state: 2, observed: { context: true, proposal: true, checks: false, verdict: false } },
    { state: 3, observed: { context: true, proposal: true, checks: true, verdict: false } },
    { state: 3, observed: { context: true, proposal: true, checks: false, verdict: true } },
    { state: 4, observed: { context: true, proposal: true, checks: false, verdict: true } },
    { state: 4, observed: { context: true, proposal: false, checks: true, verdict: true } },
  ];
  for (const fixture of mutations) {
    if (!stagingFailures(fixture.state, fixture.observed).length) {
      throw new Error(`ctxmix staging mutation escaped at state ${fixture.state}: ${JSON.stringify(fixture.observed)}`);
    }
  }
  console.log('Security text-visibility mutation fixtures PASS: visible text opacity and ctxmix context/proposal/check-results/verdict semantic staging are enforced.');
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
        page.on('console', message => {
          if (message.type() === 'error') runtime.push({ type: 'console', detail: message.text() });
        });
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
            if (!root) return { missingRoot: true, expectedState, actualState: null, probes: [], semanticVisibility: null };

            const inspect = node => {
              if (!node) return null;
              const chain = [];
              let current = node;
              let effectiveOpacity = 1;
              let visible = true;
              while (current) {
                const style = getComputedStyle(current);
                const opacity = Number.parseFloat(style.opacity || '1');
                effectiveOpacity *= Number.isFinite(opacity) ? opacity : 1;
                chain.push({ node: current.className || current.tagName, opacity, display: style.display, visibility: style.visibility });
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
                legibleWhenVisible: !visible || effectiveOpacity + 1e-9 >= threshold,
              };
            };

            const rows = [];
            for (const selector of selectors) {
              for (const node of root.querySelectorAll(selector)) rows.push({ selector, ...inspect(node) });
            }
            const contextNode = inspect(root.querySelector('[data-node="context"]'));
            const proposalNode = inspect(root.querySelector('[data-node="model-proposal"]'));
            const checksNode = inspect(root.querySelector('[data-node="authorization-check-results"]'));
            const verdictNode = inspect(root.querySelector('[data-node="execution-result"]'));
            return {
              missingRoot: false,
              expectedState,
              actualState: Number(root.dataset.state),
              probes: rows,
              semanticVisibility: {
                context: Boolean(contextNode?.visible),
                proposal: Boolean(proposalNode?.visible),
                checks: Boolean(checksNode?.visible),
                verdict: Boolean(verdictNode?.visible),
              },
              contextNode,
              proposalNode,
              checksNode,
              verdictNode,
            };
          }, { selectors: probes, threshold: MIN_EFFECTIVE_OPACITY, expectedState: state });

          if (stateResult.missingRoot) failures.push({ context: label, state, reason: 'ctxmix-root-missing' });
          if (stateResult.actualState !== state) failures.push({ context: label, state, reason: 'state-did-not-change', actualState: stateResult.actualState });
          if (!stateResult.probes.length) failures.push({ context: label, state, reason: 'no-text-probes-found' });
          for (const probe of stateResult.probes) {
            if (!probe.legibleWhenVisible) failures.push({ context: label, state, reason: 'visible-explanatory-text-not-fully-legible', probe });
          }
          for (const stagingFailure of stagingFailures(state, stateResult.semanticVisibility || {})) {
            failures.push({ context: label, state, reason: 'ctxmix-semantic-disclosure-out-of-order', ...stagingFailure, semanticVisibility: stateResult.semanticVisibility });
          }
          if (state === 3 && !stateResult.proposalNode?.text.includes('send_credentials')) {
            failures.push({ context: label, state, reason: 'state-3-risky-proposal-missing', proposal: stateResult.proposalNode });
          }
          if (state === 4) {
            const expectedVerdict = item.locale === 'es' ? 'ACCIÓN DENEGADA' : 'ACTION DENIED';
            if (!stateResult.checksNode?.text.includes('scope') || !stateResult.checksNode?.text.includes('permission') && item.locale === 'en') {
              failures.push({ context: label, state, reason: 'state-4-authorization-check-results-missing', checks: stateResult.checksNode });
            }
            if (!stateResult.verdictNode?.text.includes(expectedVerdict)) {
              failures.push({ context: label, state, reason: 'state-4-verdict-missing', expectedVerdict, verdict: stateResult.verdictNode });
            }
          }
          states.push(stateResult);
        }

        await page.waitForTimeout(100);
        if (runtime.length) failures.push({ context: label, reason: 'runtime-resource-errors', runtime: [...runtime] });
        contexts.push({ context: label, states, runtime: [...runtime] });
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
  semantic_staging_contract: {
    state_1: expectedCtxmixVisibility(1),
    state_2: expectedCtxmixVisibility(2),
    state_3: expectedCtxmixVisibility(3),
    state_4: expectedCtxmixVisibility(4),
  },
  failures,
  contexts,
};
await fs.writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));

if (failures.length) {
  console.error(`Security text-visibility gate FAILED (${failures.length})`);
  for (const failure of failures) console.error(JSON.stringify(failure));
  process.exit(1);
}
console.log(`Security text-visibility gate PASS: ${contexts.length} ES/EN desktop/mobile normal/reduced contexts × 4 states; visible explanatory text is fully opaque and ctxmix reveals context → proposal → authorization-check results + verdict only at semantic states 2 → 3 → 4.`);
