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
  const channels = rgb.map(value => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground, background) {
  const a = relativeLuminance(hexToRgb(foreground));
  const b = relativeLuminance(hexToRgb(background));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
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
  if (failures.length) {
    console.error('Security contrast self-test FAILED', JSON.stringify(failures, null, 2));
    process.exit(1);
  }
  console.log('Security contrast self-test PASS: known legacy amber/teal mutations fail and repaired palette passes.');
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
            return [...ctx.getImageData(0, 0, 1, 1).data];
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
          const alpha = value => {
            const match = value.match(/rgba?\([^)]*[,/ ]\s*([0-9.]+)\s*\)$/i);
            return value === 'transparent' ? 0 : match && value.startsWith('rgba') ? Number(match[1]) : 1;
          };
          const effectiveBackground = node => {
            for (let current = node; current; current = current.parentElement) {
              const value = getComputedStyle(current).backgroundColor;
              if (value && alpha(value) > 0.98) return { value, source: current.className || current.tagName };
            }
            return { value: 'rgb(255,255,255)', source: 'fallback-white' };
          };
          const rows = [];
          for (const selector of selectors) {
            for (const node of document.querySelectorAll(selector)) {
              const style = getComputedStyle(node);
              const rect = node.getBoundingClientRect();
              if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) < 0.05 || rect.width <= 0 || rect.height <= 0) continue;
              const fg = parseColor(style.color);
              const background = effectiveBackground(node);
              const bg = parseColor(background.value);
              rows.push({
                selector,
                text: (node.textContent || '').trim().slice(0, 120),
                foreground: style.color,
                background: background.value,
                backgroundSource: String(background.source),
                fontSize: style.fontSize,
                fontWeight: style.fontWeight,
                ratio: ratio(fg, bg),
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
console.log(`Security contrast gate PASS: ${contexts.length} contexts, all inspected small-text probes >= ${AA_NORMAL}:1.`);
