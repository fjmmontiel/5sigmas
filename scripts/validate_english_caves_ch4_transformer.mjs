#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const route = '/en/series/from-cave-to-agi/04-escalar/';
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

    const demo = page.locator('[data-demo="04-transformer-reutilizacion"]');
    if (await demo.count() !== 1) {
      failures.push(`${viewport.name}: expected one canonical Transformer-reuse visual, found ${await demo.count()}`);
      await page.close();
      continue;
    }

    const text = (await demo.textContent()) || '';
    for (const anchor of [
      'Attention unlocks reuse',
      'The previous limit',
      'The mechanism',
      'Reuse',
      'BEFORE · RNN/LSTM',
      'AFTER · Transformer',
      'Pretraining at scale',
      'Transferable representations',
      'Downstream reuse',
      'PRETRAINING',
      'Base model',
      'Conversational assistant',
      'Code assistant',
      'Medicine / Legal / Science',
      'Vision + language',
    ]) {
      if (!text.includes(anchor)) failures.push(`${viewport.name}: Transformer-reuse visual missing ${JSON.stringify(anchor)}`);
    }

    for (const token of [
      'La atención desbloquea reutilización', 'El límite anterior', 'El mecanismo', 'La reutilización',
      'Las RNNs procesaban tokens', 'ANTES · RNN/LSTM', 'DESPUÉS · Transformer', 'La autoatención permite',
      'Preentrenamiento a escala', 'Representaciones transferibles', 'Reutilización downstream',
      'PREENTRENAMIENTO', 'Modelo base', 'ADAPTACIÓN', 'Asistente conversacional', 'Visión + lenguaje',
    ]) {
      if (text.includes(token)) failures.push(`${viewport.name}: Transformer-reuse Spanish leakage ${JSON.stringify(token)}`);
    }

    if (await demo.locator('.trr-tab').count() !== 3) failures.push(`${viewport.name}: expected three canonical Transformer-reuse tabs`);
    if (await demo.locator('.trr-panel').count() !== 3) failures.push(`${viewport.name}: expected three canonical Transformer-reuse panels`);
    if (await demo.locator('.trr-side').count() !== 2) failures.push(`${viewport.name}: expected canonical RNN/Transformer two-side comparison`);
    if (await demo.locator('.trr-mech-step').count() !== 3) failures.push(`${viewport.name}: expected three canonical mechanism steps`);
    if (await demo.locator('.trr-branch').count() !== 4) failures.push(`${viewport.name}: expected four canonical downstream branches`);

    try {
      await page.waitForFunction(() => document.querySelector('[data-demo="04-transformer-reutilizacion"]')?.dataset.trrReady === '1', null, { timeout: 2000 });
    } catch {
      failures.push(`${viewport.name}: Transformer-reuse runtime did not initialize`);
    }

    const mechanism = demo.locator('.trr-tab[data-tab="mecanismo"]');
    await mechanism.click();
    if (!(await mechanism.evaluate(el => el.classList.contains('trr-tab--active')))) failures.push(`${viewport.name}: mechanism tab did not activate`);
    if (!(await demo.locator('.trr-panel[data-panel="mecanismo"]').evaluate(el => el.classList.contains('trr-panel--active')))) failures.push(`${viewport.name}: mechanism panel did not activate`);

    const reuse = demo.locator('.trr-tab[data-tab="reutilizacion"]');
    await reuse.click();
    if (!(await reuse.evaluate(el => el.classList.contains('trr-tab--active')))) failures.push(`${viewport.name}: reuse tab did not activate`);
    if (!(await demo.locator('.trr-panel[data-panel="reutilizacion"]').evaluate(el => el.classList.contains('trr-panel--active')))) failures.push(`${viewport.name}: reuse panel did not activate`);

    const limit = demo.locator('.trr-tab[data-tab="limite"]');
    await limit.click();
    if (!(await demo.locator('.trr-panel[data-panel="limite"]').evaluate(el => el.classList.contains('trr-panel--active')))) failures.push(`${viewport.name}: previous-limit panel did not reactivate`);

    const [clientWidth, scrollWidth] = await page.evaluate(() => [document.documentElement.clientWidth, document.documentElement.scrollWidth]);
    if (scrollWidth > clientWidth + 2) failures.push(`${viewport.name}: horizontal overflow ${scrollWidth - clientWidth}px`);

    if (viewport.name === 'desktop') {
      await page.screenshot({ path: path.join(outDir, 'english-history-04-transformer-reuse.png'), fullPage: true, animations: 'disabled' });
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
console.log('English Chapter 4 Transformer reuse QA passed: canonical three-tab comparison, mechanism, downstream reuse and desktop/mobile layout.');
