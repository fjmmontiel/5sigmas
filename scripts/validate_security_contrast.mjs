#!/usr/bin/env node
/** Deterministic WCAG contrast gate for the active Security 00/01 teaching visuals. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const AA_NORMAL = 4.5;

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

  // Regression fixture for CSS Color 4 translucent backgrounds. Chromium can
  // return `color(srgb ... / alpha)` for color-mix(). The prior gate treated
  // that tint as an opaque background and produced a false ~1:1 ratio instead
  // of compositing it over the page background.
  const risk = hexToRgb('#b93636');
  const tintedWhite = compositeRgb(risk, [255, 255, 255], 0.05);
  const riskRatio = contrastRatioRgb(risk, tintedWhite);
  if (riskRatio < AA_NORMAL || riskRatio > contrastRatio('#b93636', '#ffffff')) {
    failures.push({ name: 'translucent risk tint must be composited over white', ratio: riskRatio, background: tintedWhite });
  }

  if (failures.length) {
    console.error('Security contrast self-test FAILED', JSON.stringify(failures, null, 2));
    process.exit(1);
  }
  console.log('Security contrast self-test PASS: legacy mutations fail, repaired palette passes, and translucent backgrounds are composited before WCAG comparison.');
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

const probesByKind = {
  presentation: [
    '.secpath__lesson--influence b',
    '.secpath__lesson--authority b',
    '.secpath__boundary',
    '.secpath__verdict',
  ],
  prompt: [
    '.ctxmix__model-core',
    '.ctxmix__check',
    '.ctxmix__proposal-item--risk',
    '.ctxmix__principle b',
    '.ctxmix__explain b',
    '.ragtrace__rank',
    '.ragtrace__selected',
    '.ragtrace__ctx--system b',
    '.ragtrace__ctx--user b',
    '.ragtrace__status b',
    '.defsim__state',
    '.defsim__result-badge',
    '.defsim__legend b',
  ],
};

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
        const label = `${item.locale}/${item.kind}/${width === 390 ? 'mobile' : 'desktop'}/${motion}`;
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
        await page.evaluate(async () => { await Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 1500))]); });

        if (item.kind === 'prompt') {
          const poison = page.locator('.ragtrace [data-mode-btn="poisoned"]').first();
          if (await poison.count()) await poison.click();
          const firstGate = page.locator('.defsim [data-gate]').first();
          if (await firstGate.count()) await firstGate.click();
        } else {
          const unbounded = page.locator('.secpath [data-mode-btn="unbounded"]').first();
          if (await unbounded.count()) await unbounded.click();
        }

        const contrast = await page.evaluate(selectors => {
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
            for (let index = layers.length - 1; index >= 0; index -= 1) {
              effective = composite(layers[index].rgba, effective);
            }
            return {
              rgba: effective,
              value: `rgb(${effective.slice(0, 3).map(channel => Math.round(channel)).join(', ')})`,
              sources: layers.map(layer => ({ value: layer.value, source: layer.source, alpha: layer.rgba[3] })),
            };
          };
          const rows = [];
          for (const selector of selectors) {
            for (const node of document.querySelectorAll(selector)) {
              const style = getComputedStyle(node);
              const rect = node.getBoundingClientRect();
              if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) < 0.05 || rect.width <= 0 || rect.height <= 0) continue;
              const background = effectiveBackground(node);
              const foregroundRaw = parseColor(style.color);
              const foreground = foregroundRaw[3] < 0.999 ? composite(foregroundRaw, background.rgba) : foregroundRaw;
              rows.push({
                selector,
                text: (node.textContent || '').trim().slice(0, 120),
                foreground: style.color,
                background: background.value,
                backgroundSources: background.sources,
                fontSize: style.fontSize,
                fontWeight: style.fontWeight,
                ratio: ratio(foreground, background.rgba),
              });
            }
          }
          return rows;
        }, probesByKind[item.kind]);

        for (const row of contrast) {
          if (row.ratio + 1e-9 < AA_NORMAL) failures.push({ context: label, reason: 'contrast-below-wcag-aa', ...row });
        }
        if (!contrast.length) failures.push({ context: label, reason: 'no-contrast-probes-found' });
        if (runtime.length) failures.push({ context: label, reason: 'runtime-resource-errors', runtime });
        contexts.push({ context: label, probes: contrast, runtime });
        await context.close();
      }
    }
  }
} finally {
  await launched.browser.close();
}

const report = { engine: launched.engine, chrome_launch_error: launched.chromeError || null, threshold: AA_NORMAL, failures, contexts };
await fs.writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
if (failures.length) {
  console.error(`Security contrast gate FAILED (${failures.length})`);
  for (const failure of failures) console.error(JSON.stringify(failure));
  process.exit(1);
}
console.log(`Security contrast gate PASS: ${contexts.length} contexts, all inspected small-text probes >= ${AA_NORMAL}:1 after compositing translucent backgrounds.`);
