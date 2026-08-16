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
    slug: '03-pib-vs-bienestar',
    title: 'Chapter 3 — Measurement: GDP vs well-being',
    concepts: ['unpaid work', 'Easterlin', 'Human Development Index', 'Core sources'],
    demos: ['03-pib-bienestar', '03-kahneman-killingsworth', '03-marcos-alternativos'],
    demoSelector: '[data-demo^="03-"]',
    previewTitle: 'GDP vs well-being',
    expectedVisuals: 4,
    screenshot: 'english-energy-03-gdp-wellbeing.png',
    interaction: 'tabs',
  },
  {
    route: '/en/series/ia-pib-bienestar-energia/04-ia-pib-hoy/',
    slug: '04-ia-pib-hoy',
    title: 'Chapter 4 — AI and GDP today: real impact, lags and early signals',
    concepts: ['productivity J-curve', '80.6%', '67%', 'Acemoglu'],
    demos: ['04-jcurva-productividad', '04-evidencia-sectorial', 'energy-04-diffusion', 'energy-04-adoption-gap', 'energy-04-forecasts'],
    demoSelector: '[data-demo="04-jcurva-productividad"], [data-demo="04-evidencia-sectorial"], [data-demo^="energy-04-"]',
    previewTitle: 'AI and GDP today',
    expectedVisuals: 6,
    screenshot: 'english-energy-04-ai-gdp.png',
    interaction: 'mixed-ch4',
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

      const demoValues = await page.locator(chapter.demoSelector).evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-demo')));
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

      if (chapter.interaction === 'details') {
        const details = page.locator(`${chapter.demoSelector} details`);
        if (await details.count() === 0) failures.push(`${chapter.route}: native visuals expose no interactive disclosure`);
        else {
          const candidate = details.first();
          const before = await candidate.getAttribute('open');
          await candidate.locator('summary').click();
          const after = await candidate.getAttribute('open');
          if (before === after) failures.push(`${chapter.route}: details interaction did not toggle`);
        }
      } else if (chapter.interaction === 'tabs') {
        const root = page.locator('[data-demo="03-kahneman-killingsworth"]');
        if (await root.count() !== 1 || await root.locator('[data-tab]').count() !== 4) failures.push(`${chapter.route}: canonical four-tab income/well-being interaction missing`);
        else {
          await root.locator('[data-tab="4"]').click();
          if (await root.locator('[data-panel="4"]').getAttribute('hidden') !== null) failures.push(`${chapter.route}: canonical income/well-being tab interaction failed`);
        }
      } else if (chapter.interaction === 'mixed-ch4') {
        const root = page.locator('[data-demo="04-jcurva-productividad"]');
        if (await root.count() !== 1) {
          failures.push(`${chapter.route}: canonical productivity J-curve visual missing`);
        } else {
          const tabs = root.locator('[data-tab]');
          const panels = root.locator('[data-panel]');
          if (await tabs.count() !== 4) failures.push(`${chapter.route}: J-curve expected 4 tabs, found ${await tabs.count()}`);
          if (await panels.count() !== 4) failures.push(`${chapter.route}: J-curve expected 4 panels, found ${await panels.count()}`);
          if (await root.locator('.jc-era').count() !== 3) failures.push(`${chapter.route}: J-curve electrification analogy expected 3 eras`);
          if (await root.locator('.jc-mech').count() !== 4) failures.push(`${chapter.route}: J-curve expected 4 lag mechanisms`);
          if (await root.locator('.jc-ni').count() !== 3) failures.push(`${chapter.route}: J-curve expected 3 current-position signals`);
          if (await root.locator('svg').count() !== 2) failures.push(`${chapter.route}: J-curve expected 2 canonical SVG charts`);
          if (await tabs.count() === 4) {
            await root.locator('[data-tab="4"]').click();
            if (await root.locator('[data-panel="4"]').getAttribute('hidden') !== null) failures.push(`${chapter.route}: canonical J-curve tab interaction failed`);
          }
          const jcurveText = await root.innerText();
          for (const token of ['La curva J', 'Difusión lenta', 'Estamos aquí', 'Las señales de dónde estamos realmente']) {
            if (jcurveText.includes(token)) failures.push(`${chapter.route}: J-curve Spanish leakage ${JSON.stringify(token)}`);
          }
        }

        const evidence = page.locator('[data-demo="04-evidencia-sectorial"]');
        if (await evidence.count() !== 1) {
          failures.push(`${chapter.route}: canonical sector-evidence visual missing`);
        } else {
          if (await evidence.locator('.es-row').count() !== 4) failures.push(`${chapter.route}: sector evidence expected 4 observed rows`);
          if (await evidence.locator('.es-track').count() !== 4) failures.push(`${chapter.route}: sector evidence expected 4 quantitative tracks`);
          if (await evidence.locator('.es-fill').count() !== 4) failures.push(`${chapter.route}: sector evidence expected 4 quantitative fills`);
          const evidenceText = await evidence.innerText();
          for (const token of ['12–32%', '+26%', '14%', 'more than 220']) {
            if (!evidenceText.includes(token)) failures.push(`${chapter.route}: sector evidence missing canonical quantitative signal ${JSON.stringify(token)}`);
          }
          for (const token of ['Servicios legales', 'Desarrollo de software', 'Atención al cliente', 'Diagnóstico por imagen']) {
            if (evidenceText.includes(token)) failures.push(`${chapter.route}: sector-evidence Spanish leakage ${JSON.stringify(token)}`);
          }
        }

        const details = page.locator('[data-demo^="energy-04-"] details');
        if (await details.count() === 0) failures.push(`${chapter.route}: remaining Chapter 4 visuals expose no interactive disclosure`);
        else {
          const candidate = details.first();
          const before = await candidate.getAttribute('open');
          await candidate.locator('summary').click();
          const after = await candidate.getAttribute('open');
          if (before === after) failures.push(`${chapter.route}: remaining Chapter 4 details interaction did not toggle`);
        }
      }

      const videos = page.locator('video[data-s5-inline-video-player]');
      if (await videos.count() !== 1) {
        failures.push(`${chapter.route}: expected one native-English video, found ${await videos.count()}`);
      } else {
        const video = videos.first();
        const sourceUrl = new URL((await video.locator('source').first().getAttribute('src')) || '', page.url());
        const posterUrl = new URL((await video.getAttribute('poster')) || '', page.url());
        const root = '/en/series/ia-pib-bienestar-energia/';
        if (sourceUrl.pathname !== `${root}${chapter.slug}.mp4`) failures.push(`${chapter.route}: unexpected video source ${sourceUrl.pathname}`);
        if (posterUrl.pathname !== `${root}${chapter.slug}.jpg`) failures.push(`${chapter.route}: unexpected video poster ${posterUrl.pathname}`);
      }
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
console.log('Complete English Energy QA passed: Chapters 3–4, 10 rendered visuals, native-English media, interactions, desktop/mobile clean.');
