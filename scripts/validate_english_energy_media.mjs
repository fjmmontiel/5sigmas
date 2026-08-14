#!/usr/bin/env node
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const root = '/en/series/ia-pib-bienestar-energia/';
const pages = [
  ['00_presentacion_serie', 'AI, GDP, Well-being and Energy'],
  ['01-electricidad-bienestar', 'Chapter 1 — Electricity and well-being: the real mechanisms'],
  ['02-ia-tecnologia-electrica', 'Chapter 2 — AI as an electrical technology'],
  ['03-pib-vs-bienestar', 'Chapter 3 — Measurement: GDP vs well-being'],
  ['04-ia-pib-hoy', 'Chapter 4 — AI and GDP today: real impact, lags and early signals'],
];
const failures = [];
const browser = await chromium.launch({ headless: true });

try {
  for (const [slug, title] of pages) {
    const route = `${root}${slug}/`;
    for (const viewport of [
      { name: 'desktop', width: 1440, height: 1000 },
      { name: 'mobile', width: 390, height: 844 },
    ]) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      const runtimeErrors = [];
      page.on('pageerror', (error) => runtimeErrors.push(error.message));
      const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
      if (!response?.ok()) failures.push(`${route}: HTTP ${response?.status() ?? 'no response'}`);

      const body = await page.locator('body').innerText();
      if (!body.includes(title)) failures.push(`${route}: missing English title ${JSON.stringify(title)}`);

      const videos = page.locator('video[data-s5-inline-video-player]');
      const videoCount = await videos.count();
      if (videoCount !== 1) {
        failures.push(`${route}: expected one native English inline video, found ${videoCount}`);
      } else {
        const video = videos.first();
        const source = video.locator('source').first();
        const sourceUrl = new URL((await source.getAttribute('src')) || '', page.url());
        const posterUrl = new URL((await video.getAttribute('poster')) || '', page.url());
        if (!sourceUrl.pathname.startsWith(root) || !sourceUrl.pathname.endsWith(`/${slug}.mp4`)) {
          failures.push(`${route}: video escaped English Energy media root: ${sourceUrl.pathname}`);
        }
        if (!posterUrl.pathname.startsWith(root) || !posterUrl.pathname.endsWith(`/${slug}.jpg`)) {
          failures.push(`${route}: poster escaped English Energy media root: ${posterUrl.pathname}`);
        }
      }

      if (await page.locator('audio').count()) failures.push(`${route}: unexpected inherited audio`);
      const [clientWidth, scrollWidth] = await page.evaluate(() => [document.documentElement.clientWidth, document.documentElement.scrollWidth]);
      if (scrollWidth > clientWidth + 2) failures.push(`${route}: ${viewport.name} horizontal overflow ${scrollWidth - clientWidth}px`);
      for (const error of runtimeErrors) failures.push(`${route}: pageerror: ${error}`);
      await page.close();
    }
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error('English Energy native-media QA failed:');
  for (const failure of [...new Set(failures)]) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('English Energy native-media QA passed: presentation + Chapters 1–4 use five native-English MP4/poster pairs, no Spanish media inheritance, desktop/mobile clean.');
