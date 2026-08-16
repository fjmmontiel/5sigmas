#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const route = '/en/series/ia-pib-bienestar-energia/02-ia-tecnologia-electrica/';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });
const failures = [];

function requireText(text, tokens, prefix) {
  for (const token of tokens) if (!text.includes(token)) failures.push(`${prefix}: missing ${JSON.stringify(token)}`);
}
function forbidText(text, tokens, prefix) {
  for (const token of tokens) if (text.includes(token)) failures.push(`${prefix}: unexpected ${JSON.stringify(token)}`);
}
async function checkOverflow(root, viewport, name) {
  const [clientWidth, scrollWidth] = await root.evaluate((node) => [node.clientWidth, node.scrollWidth]);
  if (scrollWidth > clientWidth + 2) failures.push(`${viewport}: ${name} internal overflow ${scrollWidth - clientWidth}px`);
}

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    const runtimeErrors = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
    if (!response?.ok()) failures.push(`${viewport.name}: HTTP ${response?.status() ?? 'no response'}`);

    const [pageClientWidth, pageScrollWidth] = await page.evaluate(() => [document.documentElement.clientWidth, document.documentElement.scrollWidth]);
    if (pageScrollWidth > pageClientWidth + 2) failures.push(`${viewport.name}: page overflow ${pageScrollWidth - pageClientWidth}px`);

    const body = await page.locator('body').innerText();
    requireText(body, [
      'Chapter 2 — AI as an electrical technology',
      'around 42 GWh',
      'approximately ten times more energy than a conventional web search',
      'forty times the energy use of that search',
      '415 TWh in 2024',
      'between 945 TWh and 1,260 TWh in 2030',
      'from 50 TWh in 2023 to 554 TWh in 2030',
      'approximately 180 to 320 million tonnes',
      'between 1.6 and 7.6 times higher',
      'between 98% and 99% of global production',
      'approximately 2.3 MWh',
      'between 1.2 and 5 million tonnes of electronic waste by 2030',
      'between 36 and 52 weeks',
      'around two million liters per day',
      'from 560 billion liters in 2024 to 1.2 trillion in 2030',
      'around 85 million liters per year',
      'around 2.01 trillion liters',
      'roughly 3.6 times',
      'more than 20% of the country\'s total electricity consumption',
      'close to 80% by 2030',
      'Why is AI described as an "electrical technology"?',
      'Will improvements in AI hardware efficiency reduce its global energy consumption?',
      'Primary source for the 415→945→1,260 TWh projections',
    ], `${viewport.name}: article`);
    forbidText(body, [
      'Capítulo 2', 'Qué implica "compute"', 'Por qué la eficiencia no frena', 'Los cuellos de botella reales',
      'Preguntas frecuentes', 'Fuentes base', 'Continue the path', 'A better measurement stack',
      'The engineering question is whether efficiency improves faster than aggregate demand expands.',
    ], `${viewport.name}: article`);

    const training = page.locator('[data-demo="02-entrenamiento-inferencia"]');
    if (await training.count() !== 1) failures.push(`${viewport.name}: expected exactly one canonical training/inference visual`);
    else {
      if (await training.locator('.ei2-phase').count() !== 2) failures.push(`${viewport.name}: training/inference lost one of two canonical phases`);
      if (await training.locator('.ei2-stat').count() !== 2) failures.push(`${viewport.name}: training/inference lost one of two canonical quantitative blocks`);
      if (await training.locator('.ei2-item').count() !== 6) failures.push(`${viewport.name}: training/inference lost canonical six supporting facts`);
      if (await training.locator('[data-tab]').count() !== 0) failures.push(`${viewport.name}: training/inference still contains invented English interaction`);
      const text = (await training.textContent()) || '';
      requireText(text, [
        'Two phases with radically different consumption profiles',
        'Training', 'Episodic · High intensity · Concentrated', '~42 GWh',
        'Inference', 'Continuous · Low per query · Distributed', '~2.9 Wh',
        '×10 versus a web search (0.3 Wh)', 'up to ×40 per minute of generated video',
        'Billions of daily queries in continuous production',
        'Source: IEA, Energy and AI, 2025.',
      ], `${viewport.name}: training/inference visual`);
      forbidText(text, ['Dos fases con perfiles', 'Entrenamiento', 'Inferencia', '~2,9 Wh', 'Miles de millones de consultas', 'Fuente: IEA'], `${viewport.name}: training/inference visual`);
      await checkOverflow(training, viewport.name, 'training/inference visual');
      await training.screenshot({ path: path.join(outDir, `english-energy-ch2-training-inference-${viewport.name}.png`), animations: 'disabled' });
    }

    const rebound = page.locator('[data-demo="02-efecto-rebote"]');
    if (await rebound.count() !== 1) failures.push(`${viewport.name}: expected exactly one canonical rebound-effect visual`);
    else {
      if (await rebound.locator('.er-step').count() !== 4) failures.push(`${viewport.name}: rebound visual lost canonical four-step causal chain`);
      if (await rebound.locator('.er-arrow').count() !== 3) failures.push(`${viewport.name}: rebound visual lost canonical three arrows`);
      if (await rebound.locator('[data-tab]').count() !== 0) failures.push(`${viewport.name}: rebound visual still contains invented English tabs`);
      const text = (await rebound.textContent()) || '';
      requireText(text, [
        'Why efficiency does not reduce consumption: the rebound effect',
        'More efficient chips', 'Lower cost per query', 'More viable use cases', 'Higher total demand',
        'Each operation consumes less energy.',
        'Usage volume grows faster than efficiency improves.',
        'Jevons paradox (1865)',
      ], `${viewport.name}: rebound visual`);
      forbidText(text, ['Por qué la eficiencia no reduce', 'Chips más eficientes', 'Menor coste por consulta', 'Más casos de uso viables', 'Mayor demanda total', 'Este patrón tiene nombre'], `${viewport.name}: rebound visual`);
      await checkOverflow(rebound, viewport.name, 'rebound visual');
      await rebound.screenshot({ path: path.join(outDir, `english-energy-ch2-rebound-${viewport.name}.png`), animations: 'disabled' });
    }

    const positions = await page.evaluate(() => {
      const text = (document.querySelector('.md-content__inner') || document.body).innerText;
      return {
        trainingBefore: text.indexOf('A model with millions of daily users consumes energy continuously, not episodically.'),
        trainingVisual: text.indexOf('Two phases with radically different consumption profiles'),
        trainingAfter: text.indexOf('Why efficiency does not stop demand'),
        reboundBefore: text.indexOf('despite real improvements in efficiency per operation.'),
        reboundVisual: text.indexOf('Why efficiency does not reduce consumption: the rebound effect'),
        reboundAfter: text.indexOf('The real bottlenecks'),
      };
    });
    if (!(positions.trainingBefore >= 0 && positions.trainingVisual > positions.trainingBefore && positions.trainingAfter > positions.trainingVisual)) {
      failures.push(`${viewport.name}: training/inference visual moved away from canonical article hook`);
    }
    if (!(positions.reboundBefore >= 0 && positions.reboundVisual > positions.reboundBefore && positions.reboundAfter > positions.reboundVisual)) {
      failures.push(`${viewport.name}: rebound visual moved away from canonical article hook`);
    }

    for (const demo of ['02-cuellos-botella', '02-proyeccion-demanda', '02-huella-ambiental', '02-agua-golf-datacenters', '02-geografia-ia']) {
      if (await page.locator(`[data-demo="${demo}"]`).count() !== 1) failures.push(`${viewport.name}: expected one remaining Chapter 2 visual ${demo}`);
    }

    const videos = page.locator('video[data-s5-inline-video-player]');
    if (await videos.count() !== 1) failures.push(`${viewport.name}: expected one native-English Chapter 2 video, found ${await videos.count()}`);
    else {
      const video = videos.first();
      const sourceUrl = new URL((await video.locator('source').first().getAttribute('src')) || '', page.url());
      const posterUrl = new URL((await video.getAttribute('poster')) || '', page.url());
      if (sourceUrl.pathname !== '/en/series/ia-pib-bienestar-energia/02-ia-tecnologia-electrica.mp4') failures.push(`${viewport.name}: wrong native-English Chapter 2 video ${sourceUrl.pathname}`);
      if (posterUrl.pathname !== '/en/series/ia-pib-bienestar-energia/02-ia-tecnologia-electrica.jpg') failures.push(`${viewport.name}: wrong native-English Chapter 2 poster ${posterUrl.pathname}`);
    }

    if (runtimeErrors.length) failures.push(`${viewport.name}: runtime errors: ${runtimeErrors.join(' | ')}`);
    await page.screenshot({ path: path.join(outDir, `english-energy-ch2-${viewport.name}.png`), fullPage: true, animations: 'disabled' });
    await page.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error('English Energy Chapter 2 QA failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('English Energy Chapter 2 QA passed: canonical article evidence plus training/inference and rebound visuals are faithful, correctly placed and overflow-clean on desktop/mobile.');
