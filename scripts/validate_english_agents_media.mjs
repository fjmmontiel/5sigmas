#!/usr/bin/env node
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const root = '/en/series/agentes-ia/';
const pages = [
  ['00_presentacion_serie', 'AI Agents'],
  ['01-que-es-un-agente', 'An agent is a loop with permissions'],
  ['02-anatomia-de-un-agente', 'The anatomy of an agent'],
  ['03-como-evaluar-un-agente', 'A demo measures an output. An agent needs a trace.'],
  ['04-seguridad-agentes', 'Incoming data can become an instruction'],
  ['05-de-la-demo-a-produccion', 'From demo to production'],
];
const viewports = [
  ['desktop', { width: 1440, height: 1000 }],
  ['mobile', { width: 390, height: 844 }],
];
const failures = [];
const browser = await chromium.launch({ headless: true });

try {
  for (const [slug, marker] of pages) {
    for (const [label, viewport] of viewports) {
      const page = await browser.newPage({ viewport });
      const runtimeErrors = [];
      page.on('pageerror', (error) => runtimeErrors.push(error.message));
      const route = `${root}${slug}/`;
      const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
      if (!response?.ok()) failures.push(`${route}: HTTP ${response?.status() ?? 'no response'}`);
      const body = await page.locator('body').innerText().catch(() => '');
      if (!body.includes(marker)) failures.push(`${route}: missing English marker ${JSON.stringify(marker)}`);
      const videos = page.locator('video[data-s5-inline-video-player]');
      const videoCount = await videos.count();
      if (videoCount !== 1) failures.push(`${route}: expected one native-English video, found ${videoCount}`);
      else {
        const video = videos.first();
        const sourceUrl = new URL((await video.locator('source').first().getAttribute('src')) || '', page.url());
        const posterUrl = new URL((await video.getAttribute('poster')) || '', page.url());
        if (sourceUrl.pathname !== `${root}${slug}.mp4`) failures.push(`${route}: unexpected video path ${sourceUrl.pathname}`);
        if (posterUrl.pathname !== `${root}${slug}.jpg`) failures.push(`${route}: unexpected poster path ${posterUrl.pathname}`);
        const mediaResponse = await page.request.get(sourceUrl.href, { headers: { Range: 'bytes=0-1023' } });
        if (![200, 206].includes(mediaResponse.status())) failures.push(`${route}: MP4 range request failed with HTTP ${mediaResponse.status()}`);
        const posterResponse = await page.request.get(posterUrl.href);
        if (!posterResponse.ok()) failures.push(`${route}: poster request failed with HTTP ${posterResponse.status()}`);
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
  console.error('Native English AI Agents media QA failed:');
  for (const failure of [...new Set(failures)]) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('Native English AI Agents media QA passed: presentation + Chapters 1–5, exact /en/ MP4/poster pairs, range delivery, desktop/mobile clean.');
