#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const chapters = [
  {
    route: '/en/series/ia-pib-bienestar-energia/03-pib-vs-bienestar/',
    title: 'Chapter 3 — Measurement: GDP vs well-being',
    concepts: ['unpaid work', 'Easterlin', 'Human Development Index', 'measurement pluralism'],
    demos: ['energy-03-gdp-wellbeing', 'energy-03-income-wellbeing', 'energy-03-frameworks'],
    previewTitle: 'GDP vs well-being',
    expectedVisuals: 4,
    screenshot: 'english-energy-03-gdp-wellbeing.png',
  },
  {
    route: '/en/series/ia-pib-bienestar-energia/04-ia-pib-hoy/',
    title: 'Chapter 4 — AI and GDP today: real impact, lags and early signals',
    concepts: ['productivity J-curve', '80.6%', '67%', 'Acemoglu'],
    demos: ['energy-04-jcurve', 'energy-04-evidence', 'energy-04-diffusion', 'energy-04-adoption-gap', 'energy-04-forecasts'],
    previewTitle: 'AI and GDP today',
    expectedVisuals: 6,
    screenshot: 'english-energy-04-ai-gdp.png',
  },
];

const forbidden = ['Capítulo ', 'Preguntas frecuentes', 'Fuentes base', 'Prerrequisitos', 'Siguiente capítulo'];
const failures = [];
const browser = await chromium.launch({ headless: true });
let totalVisuals = 0;

try {
  for (const chapter of chapters) {
    for (const viewport of [
      { name: 'desktop', width: 1440, height: 1000 },
      { name: 'mobile', width: 390, height: 844 },
    ]) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      const runtimeErrors = [];
      page.on('pageerror', (error) => runtimeErrors.push(`pageerror: ${error.message}`));
      const response = await page.goto(`${base}${chapter.route}`, { waitUntil: 'networkidle' });
      if (!response?.ok()) failures.push(`${chapter.route}: HTTP ${response?.status() ?? 'no response'}`);

      const body = await page.locator('body').innerText();
      if (!body.includes(chapter.title)) failures.push(`${chapter.route}: missing English chapter title`);
      for (const concept of chapter.concepts) if (!body.toLowerCase().includes(concept.toLowerCase())) failures.push(`${chapter.route}: missing core concept ${concept}`);
      for (const token of forbidden) if (body.includes(token)) failures.push(`${chapter.route}: Spanish leakage ${JSON.stringify(token)}`);

      const demoValues = await page.locator('[data-demo^="energy-"]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-demo')));
      if (demoValues.length !== chapter.demos.length) failures.push(`${chapter.route}: expected ${chapter.demos.length} native teaching visuals, found ${demoValues.length}`);
      if (new Set(demoValues).size !== demoValues.length) failures.push(`${chapter.route}: duplicate data-demo visual identifiers`);
      for (const demo of chapter.demos) if (!demoValues.includes(demo)) failures.push(`${chapter.route}: missing [data-demo="${demo}"]`);

      const previewCards = page.locator('[data-series-preview] .sp-card');
      if (await previewCards.count() !== 1) failures.push(`${chapter.route}: expected exactly one shared English macro preview card, found ${await previewCards.count()}`);
      else {
        const previewTitle = await previewCards.first().getAttribute('data-sp-title');
        if (previewTitle !== chapter.previewTitle) failures.push(`${chapter.route}: unexpected macro preview title ${JSON.stringify(previewTitle)}`);
      }

      const visualCount = demoValues.length + await previewCards.count();
      if (visualCount !== chapter.expectedVisuals) failures.push(`${chapter.route}: expected ${chapter.expectedVisuals} rendered visual units, found ${visualCount}`);
      if (viewport.name === 'desktop') totalVisuals += visualCount;

      const details = page.locator('[data-demo^="energy-"] details');
      if (await details.count() === 0) failures.push(`${chapter.route}: native visuals expose no interactive disclosure`);
      else {
        const candidate = details.first();
        const before = await candidate.getAttribute('open');
        await candidate.locator('summary').click();
        const after = await candidate.getAttribute('open');
        if (before === after) failures.push(`${chapter.route}: details interaction did not toggle`);
      }

      if (await page.locator('video[data-s5-inline-video-player]').count()) failures.push(`${chapter.route}: unexpected inherited Spanish video`);
      if (await page.locator('audio').count()) failures.push(`${chapter.route}: unexpected inherited Spanish audio`);

      const [clientWidth, scrollWidth] = await page.evaluate(() => [document.documentElement.clientWidth, document.documentElement.scrollWidth]);
      if (scrollWidth > clientWidth + 2) failures.push(`${chapter.route}: ${viewport.name} horizontal overflow ${scrollWidth - clientWidth}px`);
      for (const runtimeError of runtimeErrors) failures.push(`${chapter.route}: ${runtimeError}`);

      if (viewport.name === 'desktop') await page.screenshot({ path: path.join(outDir, chapter.screenshot), fullPage: true, animations: 'disabled' });
      await page.close();
    }
  }
} finally {
  await browser.close();
}

if (totalVisuals !== 10) failures.push(`Energy Chapters 3–4: expected 10 rendered visual units, found ${totalVisuals}`);
if (failures.length) {
  for (const failure of [...new Set(failures)]) console.error(failure);
  process.exit(1);
}
console.log('Complete English Energy QA passed: Chapters 3–4, 10 rendered visuals, interactions, no Spanish media inheritance, desktop/mobile clean.');
