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
  'Chapter 3 — Test-Time Compute', 'The three levers',
  'PRM vs ORM: two ways to reward reasoning',
  'Best-of-N: generate several answers, then select',
  'Three levers for spending more inference compute',
  'Training scale and inference compute are complementary',
  'Frequently asked questions',
]) if (!body.includes(expected)) failures.push(`${route}: missing English chapter/visual copy ${JSON.stringify(expected)}`);

for (const forbidden of ['Capítulo ','Prerrequisitos','Las tres palancas','Más pasos','Más candidatos','Cuándo importa','Curva de rendimiento','Evidencia empírica','Fuentes base']) {
  if (body.includes(forbidden)) failures.push(`${route}: Spanish leakage ${JSON.stringify(forbidden)}`);
}

for (const selector of ['[data-ttc-tabs]','[data-bon]','[data-levers]','[data-scale2d]']) {
  const root = page.locator(selector);
  if (await root.count() !== 1) failures.push(`${route}: expected exactly one ${selector}`);
  const buttons = root.locator('button[data-tab]');
  if (await buttons.count() < 3) failures.push(`${route}: ${selector} lost its interactive tabs`);
  if (await buttons.count() >= 2) {
    await buttons.nth(1).click();
    if (await buttons.nth(1).getAttribute('aria-selected') !== 'true') failures.push(`${route}: ${selector} second tab does not activate`);
  }
}

const video = page.locator('video[data-s5-inline-video-player]');
if (await video.count() !== 1) failures.push(`${route}: expected exactly one English poster-first video player`);
const videoSource = await video.locator('source').getAttribute('src').catch(() => null) || await video.getAttribute('src').catch(() => null);
const poster = await video.getAttribute('poster').catch(() => null);
if (!String(videoSource || '').endsWith('/en/series/modelos-razonadores/03-test-time-compute.mp4') && videoSource !== '../03-test-time-compute.mp4') {
  failures.push(`${route}: English video source escaped locale namespace: ${JSON.stringify(videoSource)}`);
}
if (!String(poster || '').endsWith('/en/series/modelos-razonadores/03-test-time-compute.jpg') && poster !== '../03-test-time-compute.jpg') {
  failures.push(`${route}: English poster escaped locale namespace: ${JSON.stringify(poster)}`);
}
if ((await page.locator('.s5-video-embed__poster').getAttribute('aria-label').catch(() => '')).startsWith('Reproducir')) {
  failures.push(`${route}: video player controls leaked Spanish`);
}
const watch = page.locator('.s5-video-embed__watch a');
if (await watch.count() !== 1) {
  failures.push(`${route}: mirrored /en/videos/ surface requires exactly one English watch link`);
} else {
  const watchHref = await watch.getAttribute('href');
  const watchText = (await watch.innerText()).trim();
  const expectedWatch = 'https://5sigmas.com/en/videos/series/modelos-razonadores/03-test-time-compute/';
  if (watchHref !== expectedWatch) failures.push(`${route}: English watch link is not route-native: ${JSON.stringify(watchHref)}`);
  if (watchText !== 'Watch video, summary and related content') failures.push(`${route}: English watch link copy mismatch: ${JSON.stringify(watchText)}`);
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

if (requireMedia && videoSource) {
  const mediaPath = new URL(videoSource, `https://5sigmas.com${route}`).pathname;
  const media = await page.request.get(`${base}${mediaPath}`, { headers: { Range: 'bytes=0-1023' } });
  if (![200, 206].includes(media.status())) failures.push(`${route}: localized MP4 range request failed: ${media.status()}`);
  const posterPath = new URL(poster, `https://5sigmas.com${route}`).pathname;
  const posterResponse = await page.request.get(`${base}${posterPath}`);
  if (!posterResponse.ok() || !String(posterResponse.headers()['content-type'] || '').startsWith('image/')) {
    failures.push(`${route}: localized poster is not fetchable as an image (${posterResponse.status()})`);
  }
}

await browser.close();
if (failures.length) {
  console.error('English Test-Time Compute parity QA failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log(`English Test-Time Compute QA passed: full chapter, four interactive visuals, locale-native player/watch link, desktop/mobile clean${requireMedia ? ', MP4/poster fetched' : ''}.`);
