#!/usr/bin/env node
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const root = '/en/series/agentes-ia/';
const pages = [
  ['00_presentacion_serie', 'AI Agents'],
  ['01-que-es-un-agente', 'An agent is a loop with permissions'],
  ['02-anatomia-de-un-agente', 'The anatomy of an agent'],
  ['03-como-evaluar-un-agente', 'One task, one trajectory, four evaluators'],
  ['04-seguridad-agentes', 'An attack only needs one complete path to an effect'],
  ['05-de-la-demo-a-produccion', 'Chapter 5 — From demo to an operable system'],
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
      if (videoCount !== 0) failures.push(`${route}: owner-unpublished series must expose zero videos, found ${videoCount}`);
      if (await page.locator('.s5-video-embed, .s5-video-embed__watch').count()) {
        failures.push(`${route}: owner-unpublished video embed/watch link remains`);
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
console.log('Native English AI Agents rollback QA passed: presentation + Chapters 1–5 remain intact and expose zero public video embeds on desktop/mobile.');
