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
    concepts: ['productivity J-curve', '80.6%', '67%', 'Previously unavailable capabilities', 'The problem of mismeasured value', 'Core sources', 'Acemoglu'],
    demos: ['04-jcurva-productividad', '04-evidencia-sectorial', '04-difusion', '04-brecha-adopcion', '04-debate-proyecciones'],
    demoSelector: '[data-demo="04-jcurva-productividad"], [data-demo="04-evidencia-sectorial"], [data-demo="04-difusion"], [data-demo="04-brecha-adopcion"], [data-demo="04-debate-proyecciones"]',
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

      if (chapter.interaction === 'tabs') {
        const root = page.locator('[data-demo="03-kahneman-killingsworth"]');
        if (await root.count() !== 1 || await root.locator('[data-tab]').count() !== 4) failures.push(`${chapter.route}: canonical four-tab income/well-being interaction missing`);
        else {
          await root.locator('[data-tab="4"]').click();
          if (await root.locator('[data-panel="4"]').getAttribute('hidden') !== null) failures.push(`${chapter.route}: canonical income/well-being tab interaction failed`);
        }
      } else if (chapter.interaction === 'mixed-ch4') {
        const sequence = [
          '1. Why macro impact takes time to arrive',
          '2. Where it appears before GDP',
          '3. New products and services that did not exist before',
          '4. The problem of mismeasured value',
          '5. The most indicative early signals',
          'Frequently asked questions',
          '6. References',
        ];
        let previous = -1;
        for (const token of sequence) {
          const index = body.indexOf(token);
          if (index < 0) failures.push(`${chapter.route}: missing canonical article section ${JSON.stringify(token)}`);
          if (index >= 0 && index <= previous) failures.push(`${chapter.route}: canonical article section order changed at ${JSON.stringify(token)}`);
          if (index >= 0) previous = index;
        }
        for (const antiPattern of ['The full series chain', 'Series complete', 'The adoption gap\n']) {
          if (body.includes(antiPattern)) failures.push(`${chapter.route}: stale English-only framing ${JSON.stringify(antiPattern)}`);
        }

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

        const diffusion = page.locator('[data-demo="04-difusion"]');
        if (await diffusion.count() !== 1) {
          failures.push(`${chapter.route}: canonical diffusion visual missing`);
        } else {
          if (await diffusion.locator('.dif2-stage').count() !== 3) failures.push(`${chapter.route}: diffusion visual expected 3 stages`);
          if (await diffusion.locator('.dif2-pill').count() !== 6) failures.push(`${chapter.route}: diffusion visual expected 6 stage pills`);
          if (await diffusion.locator('.dif2-signal').count() !== 3) failures.push(`${chapter.route}: diffusion visual expected 3 leading signals`);
          if (await diffusion.locator('.dif2-arrow').count() !== 2) failures.push(`${chapter.route}: diffusion visual expected 2 causal arrows`);
          const diffusionText = await diffusion.innerText();
          for (const token of ['20–50%', 'AlphaFold ×45,000', '2–5%']) {
            if (!diffusionText.includes(token)) failures.push(`${chapter.route}: diffusion visual missing canonical signal ${JSON.stringify(token)}`);
          }
          for (const token of ['Adopción y exploración', 'Rediseño organizativo', 'Impacto macro visible', 'Qué mirar antes que el PIB']) {
            if (diffusionText.includes(token)) failures.push(`${chapter.route}: diffusion Spanish leakage ${JSON.stringify(token)}`);
          }
        }

        const adoption = page.locator('[data-demo="04-brecha-adopcion"]');
        if (await adoption.count() !== 1) {
          failures.push(`${chapter.route}: canonical adoption-gap visual missing`);
        } else {
          if (await adoption.locator('.ba-row').count() !== 2) failures.push(`${chapter.route}: adoption gap expected 2 company-size rows`);
          if (await adoption.locator('.ba-fill').count() !== 2) failures.push(`${chapter.route}: adoption gap expected 2 quantitative fills`);
          if (await adoption.locator('.ba-maturity').count() !== 1) failures.push(`${chapter.route}: adoption gap maturity block missing`);
          const adoptionText = await adoption.innerText();
          for (const token of ['~55%', '~25%', '+30 percentage-point gap', '1%', '99%']) {
            if (!adoptionText.includes(token)) failures.push(`${chapter.route}: adoption-gap visual missing canonical signal ${JSON.stringify(token)}`);
          }
          for (const token of ['La brecha de adopción', 'Gran empresa', 'Pyme', 'madurez real']) {
            if (adoptionText.includes(token)) failures.push(`${chapter.route}: adoption-gap Spanish leakage ${JSON.stringify(token)}`);
          }
        }

        const forecasts = page.locator('[data-demo="04-debate-proyecciones"]');
        if (await forecasts.count() !== 1) {
          failures.push(`${chapter.route}: canonical forecast-debate visual missing`);
        } else {
          if (await forecasts.locator('.dp-pole').count() !== 2) failures.push(`${chapter.route}: forecast debate expected 2 scenario poles`);
          if (await forecasts.locator('.dp-stat').count() !== 4) failures.push(`${chapter.route}: forecast debate expected 4 quantitative stats`);
          if (await forecasts.locator('.dp-pole-premise').count() !== 2) failures.push(`${chapter.route}: forecast debate expected 2 premise blocks`);
          if (await forecasts.locator('.dp-bottom-item').count() !== 3) failures.push(`${chapter.route}: forecast debate expected 3 decisive variables`);
          const forecastsText = await forecasts.innerText();
          for (const token of ['$7 trillion', '60-70%', '<0.53%', '~5%', '$7T–$15.7T']) {
            if (!forecastsText.includes(token)) failures.push(`${chapter.route}: forecast debate missing canonical signal ${JSON.stringify(token)}`);
          }
          for (const token of ['El debate macroeconómico', 'Optimista', 'Cauteloso', 'La variable decisiva']) {
            if (forecastsText.includes(token)) failures.push(`${chapter.route}: forecast-debate Spanish leakage ${JSON.stringify(token)}`);
          }
        }

        if (await page.locator('[data-demo^="energy-04-"]').count() !== 0) failures.push(`${chapter.route}: obsolete independent English Chapter 4 redesign still rendered`);
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
console.log('Complete English Energy QA passed: Chapters 3–4, canonical Chapter 4 article and visuals, native-English media, interactions, desktop/mobile clean.');