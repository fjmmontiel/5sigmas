#!/usr/bin/env node
/**
 * Deterministic legibility/contrast gate for the active Security 00/01 teaching visuals.
 *
 * Important: CSS `opacity` on an ancestor composites the whole subtree after paint. Reading
 * only a descendant's computed `color` and `backgroundColor` can therefore report a false
 * WCAG pass for text that is visibly faded on screen. This gate treats any inspected teaching
 * text rendered through subtree opacity as a failure and exercises the interactive states that
 * can introduce that condition.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const AA_NORMAL = 4.5;
const OPAQUE_TEXT_MIN = 0.999;

function hexToRgb(hex) {
  const value = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(value)) throw new Error(`invalid hex color: ${hex}`);
  return [0, 2, 4].map(index => Number.parseInt(value.slice(index, index + 2), 16));
}

function relativeLuminance(rgb) {
  const channels = rgb.slice(0, 3).map(value => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatioRgb(foreground, background) {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function contrastRatio(foreground, background) {
  return contrastRatioRgb(hexToRgb(foreground), hexToRgb(background));
}

function compositeRgb(foreground, background, alpha) {
  return foreground.map((value, index) => value * alpha + background[index] * (1 - alpha));
}

function isExpectedTeardownCancellation(event) {
  return event?.type === 'requestfailed'
    && event?.phase === 'teardown'
    && String(event?.detail || '').includes('ERR_ABORTED');
}

function runSelfTest() {
  const fixtures = [
    { name: 'legacy amber badge must fail', fg: '#b87400', bg: '#f4ead9', pass: false },
    { name: 'repaired amber badge must pass', fg: '#8f5a00', bg: '#eee6d9', pass: true },
    { name: 'legacy teal label must fail', fg: '#16877e', bg: '#ffffff', pass: false },
    { name: 'repaired teal label must pass', fg: '#0f716a', bg: '#ffffff', pass: true },
  ];
  const failures = [];
  for (const fixture of fixtures) {
    const ratio = contrastRatio(fixture.fg, fixture.bg);
    const actual = ratio >= AA_NORMAL;
    if (actual !== fixture.pass) failures.push({ ...fixture, ratio });
  }

  // CSS Color 4 translucent background regression fixture.
  const risk = hexToRgb('#b93636');
  const tintedWhite = compositeRgb(risk, [255, 255, 255], 0.05);
  const riskRatio = contrastRatioRgb(risk, tintedWhite);
  if (riskRatio < AA_NORMAL || riskRatio > contrastRatio('#b93636', '#ffffff')) {
    failures.push({ name: 'translucent risk tint must be composited over white', ratio: riskRatio });
  }

  // Ancestor-opacity regression fixture. The old browser gate inspected the local color pair
  // and missed the group compositing produced by e.g. `opacity:.2` on a parent teaching panel.
  const ink = hexToRgb('#111827');
  const white = hexToRgb('#ffffff');
  const fadedInk = compositeRgb(ink, white, 0.2);
  const fadedRatio = contrastRatioRgb(fadedInk, white);
  if (fadedRatio >= AA_NORMAL) {
    failures.push({ name: '20% ancestor opacity must not masquerade as readable text', ratio: fadedRatio });
  }

  // Listener-lifetime regression fixtures: an abort is ignorable only when context teardown
  // itself cancels an in-flight request. Interaction/navigation aborts and every other error
  // remain fatal, so this gate cannot become a blanket ERR_ABORTED allow-list.
  const runtimeFixtures = [
    { name: 'interaction ERR_ABORTED must fail', event: { type: 'requestfailed', phase: 'interaction', detail: 'net::ERR_ABORTED' }, expected: false },
    { name: 'teardown ERR_ABORTED may be classified as expected cancellation', event: { type: 'requestfailed', phase: 'teardown', detail: 'net::ERR_ABORTED' }, expected: true },
    { name: 'teardown non-abort request failure must fail', event: { type: 'requestfailed', phase: 'teardown', detail: 'net::ERR_FAILED' }, expected: false },
    { name: 'teardown pageerror must fail', event: { type: 'pageerror', phase: 'teardown', detail: 'boom' }, expected: false },
    { name: 'teardown console error must fail', event: { type: 'console', phase: 'teardown', detail: 'boom' }, expected: false },
    { name: 'teardown HTTP error must fail', event: { type: 'http', phase: 'teardown', status: 500 }, expected: false },
  ];
  for (const fixture of runtimeFixtures) {
    const actual = isExpectedTeardownCancellation(fixture.event);
    if (actual !== fixture.expected) failures.push({ name: fixture.name, actual, expected: fixture.expected });
  }

  if (failures.length) {
    console.error('Security contrast self-test FAILED', JSON.stringify(failures, null, 2));
    process.exit(1);
  }
  console.log('Security contrast self-test PASS: palette, translucent backgrounds, ancestor opacity, and fail-closed listener-lifetime mutations are covered.');
}

if (process.argv.includes('--self-test')) {
  runSelfTest();
  process.exit(0);
}

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/security-requalification/contrast');
await fs.mkdir(outDir, { recursive: true });

const routes = [
  { locale: 'es', kind: 'presentation', route: '/series/seguridad-ia/00_presentacion_serie/' },
  { locale: 'en', kind: 'presentation', route: '/en/series/seguridad-ia/00_presentacion_serie/' },
  { locale: 'es', kind: 'prompt', route: '/series/seguridad-ia/01-prompt-injection/' },
  { locale: 'en', kind: 'prompt', route: '/en/series/seguridad-ia/01-prompt-injection/' },
];

const probes = {
  presentation: [
    '.secpath__title', '.secpath__role', '.secpath__boundary', '.secpath__readout strong',
    '.secpath__readout p', '.secpath__verdict', '.secpath__lesson b', '.secpath__lesson div',
  ],
  ctxmix: [
    '.ctxmix__lane-label', '.ctxmix__eyebrow', '.ctxmix__source-title', '.ctxmix__source p',
    '.ctxmix__payload', '.ctxmix__segment', '.ctxmix__model-core', '.ctxmix__model-copy',
    '.ctxmix__runtime strong', '.ctxmix__runtime small', '.ctxmix__check', '.ctxmix__proposal-item',
    '.ctxmix__verdict strong', '.ctxmix__verdict span', '.ctxmix__principle', '.ctxmix__explain p',
  ],
  rag: [
    '.ragtrace__label', '.ragtrace__rank', '.ragtrace__doc-title', '.ragtrace__doc-note',
    '.ragtrace__selected', '.ragtrace__ctx b', '.ragtrace__ctx', '.ragtrace__proposal',
    '.ragtrace__status', '.ragtrace__foot',
  ],
  defsim: [
    '.defsim__gate-name', '.defsim__gate-scope', '.defsim__state', '.defsim__result-badge',
    '.defsim__result strong', '.defsim__result span', '.defsim__legend b', '.defsim__legend div',
  ],
};

async function launchBrowser() {
  try {
    return { browser: await chromium.launch({ channel: 'chrome', headless: true }), engine: 'google-chrome' };
  } catch (chromeError) {
    return { browser: await chromium.launch({ headless: true }), engine: 'playwright-chromium', chromeError: String(chromeError) };
  }
}

async function measure(page, selectors) {
  return page.evaluate(({ selectors, opaqueMin }) => {
    const parseColor = value => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#000000';
      ctx.fillStyle = value;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = [...ctx.getImageData(0, 0, 1, 1).data];
      return [r, g, b, a / 255];
    };
    const composite = (foreground, background) => {
      const fa = foreground[3];
      const ba = background[3];
      const outA = fa + ba * (1 - fa);
      if (outA <= 1e-9) return [0, 0, 0, 0];
      return [
        (foreground[0] * fa + background[0] * ba * (1 - fa)) / outA,
        (foreground[1] * fa + background[1] * ba * (1 - fa)) / outA,
        (foreground[2] * fa + background[2] * ba * (1 - fa)) / outA,
        outA,
      ];
    };
    const luminance = ([r, g, b]) => {
      const values = [r, g, b].map(value => {
        const c = value / 255;
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
    };
    const ratio = (a, b) => {
      const x = luminance(a), y = luminance(b);
      return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
    };
    const effectiveBackground = node => {
      const layers = [];
      for (let current = node; current; current = current.parentElement) {
        const value = getComputedStyle(current).backgroundColor;
        if (!value || value === 'transparent') continue;
        const rgba = parseColor(value);
        if (rgba[3] <= 1e-9) continue;
        layers.push({ value, rgba, source: String(current.className || current.tagName) });
      }
      let effective = [255, 255, 255, 1];
      for (let index = layers.length - 1; index >= 0; index -= 1) effective = composite(layers[index].rgba, effective);
      return { rgba: effective, value: `rgb(${effective.slice(0, 3).map(v => Math.round(v)).join(', ')})`, sources: layers };
    };
    const ancestorOpacity = node => {
      let cumulative = 1;
      const chain = [];
      for (let current = node; current; current = current.parentElement) {
        const opacity = Number.parseFloat(getComputedStyle(current).opacity || '1');
        if (opacity < opaqueMin) chain.push({ source: String(current.className || current.tagName), opacity });
        cumulative *= opacity;
      }
      return { cumulative, chain };
    };

    const rows = [];
    for (const selector of selectors) {
      for (const node of document.querySelectorAll(selector)) {
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        if (style.display === 'none' || style.visibility === 'hidden' || rect.width <= 0 || rect.height <= 0) continue;
        const text = (node.textContent || '').trim();
        if (!text) continue;
        const background = effectiveBackground(node);
        const foregroundRaw = parseColor(style.color);
        const foreground = foregroundRaw[3] < 0.999 ? composite(foregroundRaw, background.rgba) : foregroundRaw;
        const opacity = ancestorOpacity(node);
        rows.push({
          selector,
          text: text.slice(0, 140),
          foreground: style.color,
          background: background.value,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          ratio: ratio(foreground, background.rgba),
          ancestorOpacity: opacity.cumulative,
          opacityChain: opacity.chain,
        });
      }
    }
    return rows;
  }, { selectors, opaqueMin: OPAQUE_TEXT_MIN });
}

const launched = await launchBrowser();
const failures = [];
const contexts = [];

async function record(page, contextLabel, scenario, selectors) {
  await page.waitForTimeout(80);
  const rows = await measure(page, selectors);
  if (!rows.length) failures.push({ context: contextLabel, scenario, reason: 'no-contrast-probes-found' });
  for (const row of rows) {
    if (row.ancestorOpacity + 1e-9 < OPAQUE_TEXT_MIN) {
      failures.push({ context: contextLabel, scenario, reason: 'teaching-text-rendered-through-ancestor-opacity', ...row });
    }
    if (row.ratio + 1e-9 < AA_NORMAL) {
      failures.push({ context: contextLabel, scenario, reason: 'contrast-below-wcag-aa', ...row });
    }
  }
  contexts.push({ context: contextLabel, scenario, probes: rows });
}

async function waitForStep(page, selector, step, timeout = 5000) {
  await page.waitForFunction(
    ({ selector, step }) => document.querySelector(selector)?.dataset.step === String(step),
    { selector, step },
    { timeout },
  );
}

try {
  for (const item of routes) {
    for (const width of [1440, 390]) {
      for (const motion of ['no-preference', 'reduce']) {
        const label = `${item.locale}/${item.kind}/${width === 390 ? 'mobile' : 'desktop'}/${motion}`;
        const context = await launched.browser.newContext({
          viewport: { width, height: width === 390 ? 844 : 1000 },
          isMobile: width === 390,
          hasTouch: width === 390,
          reducedMotion: motion,
        });
        const page = await context.newPage();
        const runtime = [];
        let phase = 'navigation';
        page.on('pageerror', error => runtime.push({ type: 'pageerror', phase, detail: String(error) }));
        page.on('console', message => {
          if (message.type() === 'error') runtime.push({ type: 'console', phase, detail: message.text() });
        });
        page.on('requestfailed', request => {
          runtime.push({ type: 'requestfailed', phase, url: request.url(), detail: request.failure()?.errorText || '' });
        });
        page.on('response', response => {
          if (response.status() >= 400) runtime.push({ type: 'http', phase, status: response.status(), url: response.url() });
        });

        const response = await page.goto(new URL(item.route, base).href, { waitUntil: 'networkidle', timeout: 20000 });
        if (!response?.ok()) failures.push({ context: label, reason: 'page-http', status: response?.status() });
        await page.evaluate(async () => { await Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 1500))]); });
        phase = 'interaction';

        if (item.kind === 'presentation') {
          await record(page, label, 'bounded', probes.presentation);
          const unbounded = page.locator('.secpath [data-mode-btn="unbounded"]').first();
          if (await unbounded.count()) {
            await unbounded.click();
            await record(page, label, 'unbounded', probes.presentation);
          }
        } else {
          for (const step of ['1', '2', '3', '4']) {
            const button = page.locator(`.ctxmix [data-state-btn="${step}"]`).first();
            if (await button.count()) await button.click();
            await record(page, label, `ctxmix-step-${step}`, probes.ctxmix);
          }

          for (const mode of ['clean', 'poisoned']) {
            const modeButton = page.locator(`.ragtrace [data-mode-btn="${mode}"]`).first();
            if (await modeButton.count()) await modeButton.click();
            await record(page, label, `rag-${mode}-step-0`, probes.rag);
            const run = page.locator('.ragtrace [data-run]').first();
            if (await run.count()) {
              await run.click();
              await waitForStep(page, '.ragtrace', 2);
              await record(page, label, `rag-${mode}-step-2`, probes.rag);
              await waitForStep(page, '.ragtrace', 3);
              await record(page, label, `rag-${mode}-step-3`, probes.rag);
            } else {
              failures.push({ context: label, scenario: `rag-${mode}`, reason: 'rag-run-control-missing' });
            }
          }

          await record(page, label, 'defsim-all-on', probes.defsim);
          const firstGate = page.locator('.defsim [data-gate]').first();
          if (await firstGate.count()) await firstGate.click();
          await record(page, label, 'defsim-first-gate-off', probes.defsim);
        }

        await page.waitForTimeout(120);
        phase = 'teardown';
        await context.close();
        const runtimeFailures = runtime.filter(event => !isExpectedTeardownCancellation(event));
        if (runtimeFailures.length) failures.push({ context: label, reason: 'runtime-resource-errors', runtime: runtimeFailures });
        contexts.push({
          context: label,
          scenario: 'runtime-listeners',
          verdictBasis: 'POST_CONTEXT_TEARDOWN',
          runtime,
          expectedTeardownCancellations: runtime.filter(isExpectedTeardownCancellation).length,
          runtimeFailures,
        });
      }
    }
  }
} finally {
  await launched.browser.close();
}

const report = {
  engine: launched.engine,
  chrome_launch_error: launched.chromeError || null,
  thresholds: { wcag_normal_text: AA_NORMAL, opaque_teaching_text_min: OPAQUE_TEXT_MIN },
  runtime_verdict_basis: 'POST_CONTEXT_TEARDOWN_FAIL_CLOSED_EXCEPT_TEARDOWN_ERR_ABORTED',
  failures,
  contexts,
};
await fs.writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
if (failures.length) {
  console.error(`Security contrast/legibility gate FAILED (${failures.length})`);
  for (const failure of failures) console.error(JSON.stringify(failure));
  process.exit(1);
}
console.log(`Security contrast/legibility gate PASS: ${contexts.length} state/context records; inspected teaching text is opaque and >= ${AA_NORMAL}:1, with runtime/resource verdict computed after context teardown.`);
