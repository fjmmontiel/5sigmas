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
  'PRMs vs ORMs: two ways to teach reasoning',
  'Best-of-N: generate multiple answers and choose the best',
  'The three levers of test-time compute',
  'Training scale and inference compute: two distinct axes',
  'Frequently asked questions',
]) if (!body.includes(expected)) failures.push(`${route}: missing English chapter/visual copy ${JSON.stringify(expected)}`);

for (const forbidden of ['Capítulo ','Prerrequisitos','Las tres palancas','Más pasos','Más candidatos','Cuándo importa','Curva de rendimiento','Evidencia empírica','Fuentes base']) {
  if (body.includes(forbidden)) failures.push(`${route}: Spanish leakage ${JSON.stringify(forbidden)}`);
}

for (const selector of ['[data-demo="03-prm-orm-comparacion"]','[data-demo="03-best-of-n-visual"]','[data-demo="03-ttc-palancas"]','[data-demo="03-escala-complementaria"]']) {
  const root = page.locator(selector);
  if (await root.count() !== 1) failures.push(`${route}: expected exactly one ${selector}`);
  const buttons = root.locator('button[data-tab]');
  if (await buttons.count() < 3) failures.push(`${route}: ${selector} lost its interactive tabs`);
  if (await buttons.count() >= 2) {
    await buttons.nth(1).click();
    if (await buttons.nth(1).getAttribute('aria-selected') !== 'true') failures.push(`${route}: ${selector} second tab does not activate`);
  }
}

const scale = page.locator('[data-demo="03-escala-complementaria"]');
if (await scale.count() === 1) {
  if (await scale.locator('[data-role="tab"]').count() !== 3) failures.push(`${route}: complementary-scale visual lost one of three canonical tabs`);
  if (await scale.locator('[data-panel]').count() !== 3) failures.push(`${route}: complementary-scale visual lost one of three canonical panels`);
  if (await scale.locator('.esc-axis').count() !== 3) failures.push(`${route}: complementary-scale axes panel lost canonical three-axis structure`);
  if (await scale.locator('.esc-bar-row').count() !== 4) failures.push(`${route}: complementary-scale evidence panel lost canonical four AIME rows`);
  if (await scale.locator('.esc-insight-item').count() !== 3) failures.push(`${route}: complementary-scale evidence panel lost canonical three evidence notes`);
  if (await scale.locator('.esc-gpqa-row').count() !== 2) failures.push(`${route}: complementary-scale evidence panel lost canonical GPQA comparison`);
  if (await scale.locator('.esc-shift-col').count() !== 2) failures.push(`${route}: complementary-scale design panel lost before/now cost comparison`);
  if (await scale.locator('.esc-decision').count() !== 2) failures.push(`${route}: complementary-scale design panel lost canonical two decision cards`);

  const scaleText = (await scale.textContent()) || '';
  for (const expected of [
    'Training scale and inference compute: two distinct axes', 'Empirical evidence', 'Two dimensions', 'Design implication',
    'Training compute', 'Inference compute (TTC)', 'Maximum quality', 'Why the distinction matters',
    '13%', '74%', '83%', '56.7%', '+61 pp', '+9 additional pp', 'GPQA Diamond — expert level', '~69%', '78%',
    'The shift in the cost curve', 'Before', 'Now', 'Model + budget, not just model', 'Unpredictable per-query cost', '3–10×',
  ]) if (!scaleText.includes(expected)) failures.push(`${route}: complementary-scale visual missing ${JSON.stringify(expected)}`);

  for (const forbidden of [
    'Escala de entrenamiento', 'Más parámetros y más tiempo', 'Secciones', 'Evidencia empírica', 'Dos dimensiones',
    'Implicación de diseño', 'Cómputo de entrenamiento', 'Más datos', 'Más epochs', 'Por qué importa la distinción',
    'Lo que muestran los datos', 'nivel experto', 'El cambio en la curva de coste', 'Decisiones que cambian',
    'Modelo + presupuesto', 'Coste por consulta impredecible',
  ]) if (scaleText.includes(forbidden)) failures.push(`${route}: complementary-scale Spanish leakage ${JSON.stringify(forbidden)}`);

  const scaleDims = await scale.evaluate((node) => ({ width: node.clientWidth, scroll: node.scrollWidth }));
  if (scaleDims.scroll > scaleDims.width + 2) failures.push(`${route}: complementary-scale desktop internal overflow ${scaleDims.scroll}px > ${scaleDims.width}px`);
  await scale.screenshot({ path: path.join(outDir, 'english-test-time-compute-scale-desktop.png'), animations: 'disabled' });
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
const mobileScale = page.locator('[data-demo="03-escala-complementaria"]');
if (await mobileScale.count() === 1) {
  const mobileScaleDims = await mobileScale.evaluate((node) => ({ width: node.clientWidth, scroll: node.scrollWidth }));
  if (mobileScaleDims.scroll > mobileScaleDims.width + 2) failures.push(`${route}: complementary-scale mobile internal overflow ${mobileScaleDims.scroll}px > ${mobileScaleDims.width}px`);
  const mobileTabs = mobileScale.locator('[data-role="tab"]');
  for (let index = 0; index < 3; index += 1) {
    await mobileTabs.nth(index).click();
    if ((await mobileTabs.nth(index).getAttribute('aria-selected')) !== 'true') failures.push(`${route}: complementary-scale mobile tab ${index + 1} did not activate`);
  }
  await mobileScale.screenshot({ path: path.join(outDir, 'english-test-time-compute-scale-mobile.png'), animations: 'disabled' });
}
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
console.log(`English Test-Time Compute QA passed: full chapter, four canonical interactive visuals, locale-native player/watch link, desktop/mobile clean${requireMedia ? ', MP4/poster fetched' : ''}.`);
