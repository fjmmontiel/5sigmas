#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const requireMedia = process.env.S5_REQUIRE_EN_TTC_MEDIA === '1';
const route = '/en/series/modelos-razonadores/03-test-time-compute/';
const failures = [];
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
if (!response?.ok()) failures.push(`${route}: HTTP ${response?.status() ?? 'no response'}`);

const body = await page.locator('body').innerText();
for (const expected of [
  'Chapter 3 — Test-Time Compute',
  'The three levers',
  'PRM vs ORM: two ways to reward reasoning',
  'Best-of-N: generate several answers, then select',
  'Three levers for spending more inference compute',
  'Training scale and inference compute are complementary',
  'Frequently asked questions',
]) {
  if (!body.includes(expected)) failures.push(`${route}: missing English chapter/visual copy ${JSON.stringify(expected)}`);
}

for (const forbidden of [
  'Capítulo ', 'Prerrequisitos', 'Las tres palancas', 'Más pasos', 'Más candidatos',
  'Cuándo importa', 'Curva de rendimiento', 'Evidencia empírica', 'Fuentes base',
]) {
  if (body.includes(forbidden)) failures.push(`${route}: Spanish leakage ${JSON.stringify(forbidden)}`);
}

for (const selector of ['[data-ttc-tabs]', '[data-bon]', '[data-levers]', '[data-scale2d]']) {
  if (await page.locator(selector).count() !== 1) failures.push(`${route}: expected exactly one ${selector}`);
}

for (const selector of ['[data-ttc-tabs]', '[data-bon]', '[data-levers]', '[data-scale2d]']) {
  const root = page.locator(selector);
  const buttons = root.locator('button[data-tab]');
  if (await buttons.count() < 3) failures.push(`${route}: ${selector} lost its interactive tabs`);
  if (await buttons.count() >= 2) {
    await buttons.nth(1).click();
    const selected = await buttons.nth(1).getAttribute('aria-selected');
    if (selected !== 'true') failures.push(`${route}: ${selector} second tab does not activate`);
  }
}

const checkOverflow = async (label) => {
  const dims = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  if (dims.scroll > dims.width + 2) failures.push(`${route} ${label}: horizontal overflow ${dims.scroll}px > ${dims.width}px`);
};
await checkOverflow('desktop');
await page.screenshot({ path: path.join(outDir, 'english-test-time-compute-desktop.png'), fullPage: true });

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
await checkOverflow('mobile');
await page.screenshot({ path: path.join(outDir, 'english-test-time-compute-mobile.png'), fullPage: true });

const video = page.locator('video');
const posterLike = page.locator('img[src*="03-test-time-compute.jpg"], video[poster*="03-test-time-compute.jpg"]');
if (requireMedia) {
  if (await video.count() !== 1) failures.push(`${route}: native English video is required before production merge`);
  if (await posterLike.count() < 1) failures.push(`${route}: native English poster is required before production merge`);
  const videoSource = await video.locator('source').getAttribute('src').catch(() => null) || await video.getAttribute('src').catch(() => null);
  if (!String(videoSource || '').includes('/en/series/modelos-razonadores/03-test-time-compute.mp4')) {
    failures.push(`${route}: video source must remain inside /en/, got ${JSON.stringify(videoSource)}`);
  }
  if (videoSource) {
    const mediaPath = new URL(videoSource, 'https://5sigmas.com').pathname;
    const media = await page.request.get(`${base}${mediaPath}`, { headers: { Range: 'bytes=0-1023' } });
    if (![200, 206].includes(media.status())) failures.push(`${route}: video range request failed: ${media.status()}`);
  }
} else if (await video.count()) {
  failures.push(`${route}: unexpected video present before the English media contract is enabled`);
}

await browser.close();
if (failures.length) {
  console.error('English Test-Time Compute parity QA failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log(`English Test-Time Compute QA passed: full chapter, four interactive visuals, desktop/mobile clean${requireMedia ? ', localized MP4/poster required' : ''}.`);
