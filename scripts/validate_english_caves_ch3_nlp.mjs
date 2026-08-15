#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const route = '/en/series/from-cave-to-agi/03-aprender/';
const failures = [];
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
    if (!response?.ok()) failures.push(`${viewport.name}: HTTP ${response?.status() ?? 'no response'}`);

    const nlp = page.locator('[data-demo="03-nlp-pre-transformer"]');
    if (await nlp.count() !== 1) {
      failures.push(`${viewport.name}: expected one canonical pre-Transformer NLP visual, found ${await nlp.count()}`);
      await page.close();
      continue;
    }

    const text = (await nlp.textContent()) || '';
    for (const anchor of [
      'NLP before the Transformer: three approaches, one common limit',
      'N-grams: predict the next word from local context',
      'HMM: labels as states that generate words',
      'CRF: model the label directly, with hand-engineered features',
      'What the three approaches could not do',
      'Before the Transformer',
      'The Transformer (2017)',
    ]) {
      if (!text.includes(anchor)) failures.push(`${viewport.name}: NLP visual missing ${JSON.stringify(anchor)}`);
    }

    for (const token of [
      'NLP antes del Transformer', 'Durante cuatro décadas', 'N-gramas', 'Perspectiva',
      'Enfoque estadístico', 'El límite', 'Modelo de estados ocultos', 'Estados ocultos',
      'Palabras observadas', 'Modelo discriminativo', 'Features diseñadas', 'El patrón común',
      'Antes del Transformer', 'La transición', 'Anterior', 'Siguiente',
    ]) {
      if (text.includes(token)) failures.push(`${viewport.name}: NLP Spanish leakage ${JSON.stringify(token)}`);
    }

    if (await nlp.locator('.nlp-step').count() !== 4) failures.push(`${viewport.name}: expected four canonical NLP steps`);
    if (await nlp.locator('.nlp-panel').count() !== 4) failures.push(`${viewport.name}: expected four canonical NLP panels`);
    if (await nlp.locator('.nlp-prob-row').count() !== 3) failures.push(`${viewport.name}: expected three canonical N-gram probability rows`);
    if (await nlp.locator('.nlp-hstate').count() !== 5) failures.push(`${viewport.name}: expected five canonical HMM hidden states`);
    if (await nlp.locator('.nlp-hobs').count() !== 5) failures.push(`${viewport.name}: expected five canonical HMM observations`);
    if (await nlp.locator('.nlp-crf-tok').count() !== 6) failures.push(`${viewport.name}: expected six canonical CRF tokens`);
    if (await nlp.locator('.nlp-crf-feat').count() !== 3) failures.push(`${viewport.name}: expected three canonical CRF feature rows`);
    if (await nlp.locator('.nlp-comp-col').count() !== 2) failures.push(`${viewport.name}: expected pre/post-Transformer comparison columns`);

    try {
      await page.waitForFunction(() => document.querySelector('[data-demo="03-nlp-pre-transformer"]')?.dataset.nlpReady === '1', null, { timeout: 2000 });
    } catch {
      failures.push(`${viewport.name}: NLP runtime did not initialize`);
    }

    const next = nlp.locator('#nlp-next');
    for (let i = 1; i < 4; i += 1) {
      await next.click();
      if (!(await nlp.locator(`.nlp-panel[data-p="${i}"]`).evaluate(el => el.classList.contains('nlp-panel--active')))) {
        failures.push(`${viewport.name}: NLP Next did not activate panel ${i}`);
      }
    }
    if (!(await next.isDisabled())) failures.push(`${viewport.name}: NLP Next was not disabled on final panel`);
    await nlp.locator('#nlp-prev').click();
    if (!(await nlp.locator('.nlp-panel[data-p="2"]').evaluate(el => el.classList.contains('nlp-panel--active')))) failures.push(`${viewport.name}: NLP Previous did not return to CRF panel`);
    await nlp.locator('.nlp-step[data-s="0"]').click();
    if (!(await nlp.locator('.nlp-panel[data-p="0"]').evaluate(el => el.classList.contains('nlp-panel--active')))) failures.push(`${viewport.name}: NLP stepper did not return to N-gram panel`);

    const [clientWidth, scrollWidth] = await page.evaluate(() => [document.documentElement.clientWidth, document.documentElement.scrollWidth]);
    if (scrollWidth > clientWidth + 2) failures.push(`${viewport.name}: horizontal overflow ${scrollWidth - clientWidth}px`);

    if (viewport.name === 'desktop') {
      await page.screenshot({ path: path.join(outDir, 'english-history-03-nlp-pre-transformer.png'), fullPage: true, animations: 'disabled' });
    }
    await page.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  for (const failure of [...new Set(failures)]) console.error(failure);
  process.exit(1);
}
console.log('English Chapter 3 pre-Transformer NLP QA passed: canonical 4-step visual, translated copy, interactions and desktop/mobile layout.');
