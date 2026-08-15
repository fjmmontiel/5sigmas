#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const failures = [];
const browser = await chromium.launch({ headless: true });
const forbidden = [
  'Aprende sin salir de la página',
  'Vídeos reproducibles',
  'Rutas guiadas',
  'Abrir capítulo',
  'explicaciones disponibles',
  'Profundizar en el capítulo',
];

const expectedVideos = [
  '/en/series/modelos-razonadores/03-test-time-compute.mp4',
  '/en/series/multimodalidad-iag/03-arquitecturas.mp4',
  '/en/series/from-cave-to-agi/04-escalar.mp4',
  '/en/series/datacenters-espacio/02-energia-calor-conectividad.mp4',
  '/en/series/fundamentos-ia-iag/02-que-es-ia-generativa.mp4',
  '/en/series/ia-pib-bienestar-energia/02-ia-tecnologia-electrica.mp4',
];

try {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    const runtimeErrors = [];
    page.on('pageerror', (error) => runtimeErrors.push(`pageerror: ${error.message}`));

    const response = await page.goto(`${base}/en/visuales/`, { waitUntil: 'networkidle' });
    if (!response?.ok()) failures.push(`/en/visuales/: HTTP ${response?.status() ?? 'no response'}`);

    const body = await page.locator('body').innerText();
    if (!body.includes('Build intuition without leaving the page.')) failures.push('/en/visuales/: missing native-English hub heading');
    if (!body.includes('From visual intuition to a complete mental model.')) failures.push('/en/visuales/: missing native-English closing section');
    for (const token of forbidden) if (body.includes(token)) failures.push(`/en/visuales/: Spanish leakage ${JSON.stringify(token)}`);

    const htmlLang = await page.locator('html').getAttribute('lang');
    if (htmlLang !== 'en') failures.push(`/en/visuales/: html lang=${JSON.stringify(htmlLang)}`);
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    if (canonical !== 'https://5sigmas.com/en/visuales/') failures.push(`/en/visuales/: canonical ${JSON.stringify(canonical)} != https://5sigmas.com/en/visuales/`);

    const videos = page.locator('.s5-visual-hub .s5-inline-video');
    const count = await videos.count();
    if (count !== expectedVideos.length) failures.push(`/en/visuales/: expected ${expectedVideos.length} native-English videos, found ${count}`);
    for (let index = 0; index < count; index += 1) {
      const video = videos.nth(index);
      const source = await video.locator('source').getAttribute('src');
      const poster = await video.getAttribute('poster');
      if (source !== expectedVideos[index]) failures.push(`/en/visuales/: video ${index + 1} source ${JSON.stringify(source)} != ${expectedVideos[index]}`);
      if (!poster?.startsWith('/en/')) failures.push(`/en/visuales/: video ${index + 1} poster escapes English media namespace: ${JSON.stringify(poster)}`);
      if (source?.startsWith('/series/') || poster?.startsWith('/series/')) failures.push(`/en/visuales/: video ${index + 1} inherits Spanish media`);
    }

    for (const id of ['best-of-n', 'prm-orm', 'imagebind']) {
      if (!(await page.locator(`#${id}`).count())) failures.push(`/en/visuales/: missing interactive visual #${id}`);
    }

    await page.locator('button[data-s5-topic="infrastructure"]').click();
    const filterStatus = (await page.locator('[data-s5-filter-status]').innerText()).trim();
    if (filterStatus !== '2 explanations available') failures.push(`/en/visuales/: locale-aware filter runtime returned ${JSON.stringify(filterStatus)}`);

    const [clientWidth, scrollWidth] = await page.evaluate(() => [document.documentElement.clientWidth, document.documentElement.scrollWidth]);
    if (scrollWidth > clientWidth + 2) failures.push(`/en/visuales/: ${viewport.name} horizontal overflow ${scrollWidth - clientWidth}px`);
    for (const err of runtimeErrors) failures.push(`/en/visuales/: ${viewport.name} ${err}`);

    await page.screenshot({
      path: path.join(outDir, `english-visual-hub-${viewport.name}.png`),
      fullPage: true,
      animations: 'disabled',
    });
    await page.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error('English visual hub QA failed:');
  for (const failure of [...new Set(failures)]) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('English visual hub QA passed: native English copy, /en/ media namespace, interactive visuals, locale-aware runtime, canonical URL and desktop/mobile layout are clean.');
