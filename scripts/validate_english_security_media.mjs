#!/usr/bin/env node
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const root = '/en/series/seguridad-ia/';
const pages = [
  ['00_presentacion_serie', 'AI Security'],
  ['01-prompt-injection', 'Chapter 1 — Prompt injection'],
  ['02-jailbreaks', 'Chapter 2 — Jailbreaks'],
  ['03-envenenamiento', 'Chapter 3 — Poisoning'],
  ['04-red-teaming', 'Chapter 4 — Red teaming'],
  ['05-controles-produccion', 'Chapter 5 — Production controls'],
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
      if (await videos.count() !== 1) failures.push(`${route}: expected one approved R5 video, found ${await videos.count()}`);
      else {
        const video = videos.first();
        const source = new URL((await video.locator('source').first().getAttribute('src')) || '', page.url());
        const poster = new URL((await video.getAttribute('poster')) || '', page.url());
        const mediaRoot = `/en/series/seguridad-ia/${slug}`;
        if (source.pathname !== `${mediaRoot}.mp4`) failures.push(`${route}: video source does not match approved English R5 asset: ${source.pathname}`);
        if (poster.pathname !== `${mediaRoot}.jpg`) failures.push(`${route}: poster does not match approved English R5 asset: ${poster.pathname}`);
      }
      const watchLinks = page.locator('.s5-video-embed__watch a');
      if (await watchLinks.count() !== 1) failures.push(`${route}: approved video watch link is missing`);
      else if (!new URL((await watchLinks.first().getAttribute('href')) || '', page.url()).pathname.startsWith('/en/videos/series/seguridad-ia/')) {
        failures.push(`${route}: video watch link escaped the English video library`);
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
  console.error('Native English AI Security media QA failed:');
  for (const failure of [...new Set(failures)]) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('Native English AI Security media QA passed: presentation + Chapters 1–5 expose approved R5 videos on desktop/mobile.');
