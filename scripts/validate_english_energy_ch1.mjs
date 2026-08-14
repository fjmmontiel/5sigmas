#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const route = '/en/series/ia-pib-bienestar-energia/01-electricidad-bienestar/';
const failures = [];
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

const visit = async (label) => {
  const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
  if (!response?.ok()) failures.push(`${label}: HTTP ${response?.status() ?? 'no response'}`);
  const dims = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  if (dims.scroll > dims.viewport + 2) failures.push(`${label}: horizontal overflow ${dims.scroll}px > ${dims.viewport}px`);
  return page.locator('body').innerText();
};

const body = await visit('desktop');
for (const expected of [
  'Chapter 1 — Electricity and well-being: the real mechanisms',
  'Electricity improves well-being through systems it enables',
  'Electricity and human development: the curve is steepest at low access',
  'An outage costs more than the missing electricity',
  'Electricity is enabling infrastructure',
  'Multi-Tier Framework',
]) {
  if (!body.includes(expected)) failures.push(`${route}: missing English content ${JSON.stringify(expected)}`);
}
for (const forbidden of ['Capítulo ', 'Electricidad y bienestar', 'Los cuatro canales', 'Coste de los cortes', 'Siguiente lectura']) {
  if (body.includes(forbidden)) failures.push(`${route}: Spanish leakage ${JSON.stringify(forbidden)}`);
}

for (const selector of ['.well-wrap', '.out-wrap']) {
  const root = page.locator(selector);
  if (await root.count() !== 1) {
    failures.push(`${route}: expected one ${selector}`);
    continue;
  }
  const buttons = root.locator('button[data-tab]');
  if (await buttons.count() < 2) {
    failures.push(`${route}: ${selector} lost interactive tabs`);
    continue;
  }
  await buttons.nth(1).click();
  if (await buttons.nth(1).getAttribute('aria-selected') !== 'true') failures.push(`${route}: ${selector} second tab does not activate`);
}

for (const selector of ['.kwh-wrap', '.infra-wrap']) {
  if (await page.locator(selector).count() !== 1) failures.push(`${route}: expected one ${selector}`);
}

const videos = page.locator('video[data-s5-inline-video-player]');
if (await videos.count() !== 1) {
  failures.push(`${route}: expected one declared native-English chapter video, found ${await videos.count()}`);
} else {
  const video = videos.first();
  const sourceUrl = new URL((await video.locator('source').first().getAttribute('src')) || '', page.url());
  const posterUrl = new URL((await video.getAttribute('poster')) || '', page.url());
  if (sourceUrl.pathname !== '/en/series/ia-pib-bienestar-energia/01-electricidad-bienestar.mp4') {
    failures.push(`${route}: chapter video is not the native-English Energy asset: ${sourceUrl.pathname}`);
  }
  if (posterUrl.pathname !== '/en/series/ia-pib-bienestar-energia/01-electricidad-bienestar.jpg') {
    failures.push(`${route}: chapter poster is not the native-English Energy asset: ${posterUrl.pathname}`);
  }
}

await page.screenshot({ path: path.join(outDir, 'english-energy-ch1-desktop.png'), fullPage: true });
await page.setViewportSize({ width: 390, height: 844 });
await visit('mobile');
await page.screenshot({ path: path.join(outDir, 'english-energy-ch1-mobile.png'), fullPage: true });

await browser.close();
if (failures.length) {
  console.error('English Energy chapter 1 QA failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('English Energy chapter 1 QA passed: full localized chapter, four visual systems, native-English media, interactive tabs, desktop/mobile clean.');
