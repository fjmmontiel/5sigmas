#!/usr/bin/env node
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const root = '/en/series/datacenters-espacio/';
const pages = [
  ['00_presentacion_serie', 'Data Centers in Space'],
  ['01-por-que-ahora', 'Chapter 1 — Why now'],
  ['02-energia-calor-conectividad', 'Chapter 2 — Energy, heat and connectivity'],
  ['03-que-es-datacenter-espacio', 'Chapter 3 — What is “a data center in space”?'],
  ['04-huella-real-datacenter', 'Chapter 4 — The real footprint of a data center'],
];
const viewports = [
  ['desktop', { width: 1440, height: 1000 }],
  ['mobile', { width: 390, height: 844 }],
];
const failures = [];
const browser = await chromium.launch({ headless: true });

try {
  for (const [slug, title] of pages) {
    for (const [label, viewport] of viewports) {
      const page = await browser.newPage({ viewport });
      const runtimeErrors = [];
      page.on('pageerror', (error) => runtimeErrors.push(error.message));
      const route = `${root}${slug}/`;
      const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
      if (!response?.ok()) failures.push(`${route}: HTTP ${response?.status() ?? 'no response'}`);
      const body = await page.locator('body').innerText().catch(() => '');
      if (!body.includes(title)) failures.push(`${route}: missing English title ${JSON.stringify(title)}`);

      const videos = page.locator('video[data-s5-inline-video-player]');
      const videoCount = await videos.count();
      if (videoCount !== 1) failures.push(`${route}: expected one native-English video, found ${videoCount}`);
      else {
        const video = videos.first();
        const sourceUrl = new URL((await video.locator('source').first().getAttribute('src')) || '', page.url());
        const posterUrl = new URL((await video.getAttribute('poster')) || '', page.url());
        if (sourceUrl.pathname !== `${root}${slug}.mp4`) failures.push(`${route}: unexpected video path ${sourceUrl.pathname}`);
        if (posterUrl.pathname !== `${root}${slug}.jpg`) failures.push(`${route}: unexpected poster path ${posterUrl.pathname}`);
      }
      if (await page.locator('audio').count()) failures.push(`${route}: unexpected inherited audio`);
      const sizes = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
      if (sizes.scroll > sizes.client + 2) failures.push(`${route}: ${label} horizontal overflow ${sizes.scroll - sizes.client}px`);
      for (const error of runtimeErrors) failures.push(`${route}: pageerror: ${error}`);
      await page.close();
    }
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error('Native English Data Centers media QA failed:');
  for (const failure of [...new Set(failures)]) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('Native English Data Centers media QA passed: presentation + Chapters 1–4, exact /en/ MP4/poster pairs, desktop/mobile clean.');
