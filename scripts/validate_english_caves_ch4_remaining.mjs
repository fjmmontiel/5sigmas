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

async function expectRuntime(page, selector, datasetKey, label, viewport) {
  try {
    await page.waitForFunction(
      ({ selector, datasetKey }) => document.querySelector(selector)?.dataset?.[datasetKey] === '1',
      { selector, datasetKey },
      { timeout: 2500 },
    );
  } catch {
    failures.push(`${viewport}: ${label} runtime did not initialize`);
  }
}

try {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
    if (!response?.ok()) failures.push(`${viewport.name}: HTTP ${response?.status() ?? 'no response'}`);

    // Productization: GPT-3 -> alignment -> ChatGPT.
    const product = page.locator('[data-demo="04-escala-producto"]');
    if (await product.count() !== 1) failures.push(`${viewport.name}: expected one canonical product-scale visual`);
    else {
      const text = (await product.textContent()) || '';
      for (const anchor of ['Scale leaves the lab and enters the product', 'GPT-3: the paper', 'The technical gap', 'ChatGPT: the product', '175B', '300B', 'RLHF', 'Time to reach 100 million active users', '3.5 years', '2 months']) {
        if (!text.includes(anchor)) failures.push(`${viewport.name}: product-scale visual missing ${JSON.stringify(anchor)}`);
      }
      for (const token of ['La escala sale del laboratorio', 'El gap técnico', 'PARÁMETROS', 'TOKENS DE ENTRENAMIENTO', 'MODELO BASE', 'MODELO ALINEADO', 'Tiempo en alcanzar', 'meses']) {
        if (text.includes(token)) failures.push(`${viewport.name}: product-scale Spanish leakage ${JSON.stringify(token)}`);
      }
      if (await product.locator('.esp-tab').count() !== 3) failures.push(`${viewport.name}: expected three product-scale tabs`);
      if (await product.locator('.esp-panel').count() !== 3) failures.push(`${viewport.name}: expected three product-scale panels`);
      if (await product.locator('.esp-stat').count() !== 3) failures.push(`${viewport.name}: expected three GPT-3 stats`);
      if (await product.locator('.esp-gap-step').count() !== 2) failures.push(`${viewport.name}: expected base/aligned gap pair`);
      if (await product.locator('.esp-adopt-row').count() !== 4) failures.push(`${viewport.name}: expected four adoption rows`);
      await expectRuntime(page, '[data-demo="04-escala-producto"]', 'espReady', 'product-scale', viewport.name);
      await product.locator('.esp-tab[data-tab="gap"]').click();
      if (!(await product.locator('.esp-panel[data-panel="gap"]').evaluate(el => el.classList.contains('esp-panel--active')))) failures.push(`${viewport.name}: product gap panel did not activate`);
      await product.locator('.esp-tab[data-tab="chatgpt"]').click();
      if (!(await product.locator('.esp-panel[data-panel="chatgpt"]').evaluate(el => el.classList.contains('esp-panel--active')))) failures.push(`${viewport.name}: ChatGPT panel did not activate`);
      await page.waitForTimeout(700);
      const chatgptBar = await product.locator('.esp-adopt-row--hl .esp-adopt-fill').evaluate(el => parseFloat(getComputedStyle(el).width));
      if (!(chatgptBar > 0)) failures.push(`${viewport.name}: product adoption animation did not render`);
    }

    // Scaling laws: predictability plus four scale regimes.
    const scaling = page.locator('[data-demo="04-leyes-escala"]');
    if (await scaling.count() !== 1) failures.push(`${viewport.name}: expected one canonical scaling-laws visual`);
    else {
      const text = (await scaling.textContent()) || '';
      for (const anchor of ['Scaling has predictable returns', 'BEFORE · 2019', 'AFTER · Kaplan et al. 2020', 'Explore what changes as you scale', '10M–100M parameters', 'Current frontier', 'L(x) ~ x']) {
        if (!text.includes(anchor)) failures.push(`${viewport.name}: scaling-laws visual missing ${JSON.stringify(anchor)}`);
      }
      for (const token of ['Escalar tiene retorno predecible', 'ANTES · 2019', 'DESPUÉS · Kaplan', 'Explora qué cambia', 'Escala pequeña', 'Pérdida:', 'Respuesta del modelo:']) {
        if (text.includes(token)) failures.push(`${viewport.name}: scaling-laws Spanish leakage ${JSON.stringify(token)}`);
      }
      if (await scaling.locator('.les-stab').count() !== 4) failures.push(`${viewport.name}: expected four scale tabs`);
      if (await scaling.locator('.les-spanel').count() !== 4) failures.push(`${viewport.name}: expected four scale panels`);
      if (await scaling.locator('.les-example').count() !== 8) failures.push(`${viewport.name}: expected eight scale examples`);
      await expectRuntime(page, '[data-demo="04-leyes-escala"]', 'lesReady', 'scaling-laws', viewport.name);
      for (const n of ['2', '3', '4', '1']) {
        await scaling.locator(`.les-stab[data-scale="${n}"]`).click();
        if (!(await scaling.locator(`.les-spanel[data-spanel="${n}"]`).evaluate(el => el.classList.contains('les-spanel--active')))) failures.push(`${viewport.name}: scale panel ${n} did not activate`);
      }
    }

    // Emergence: same task and both interpretations of the metric.
    const emergence = page.locator('[data-demo="04-emergencia-capacidades"]');
    if (await emergence.count() !== 1) failures.push(`${viewport.name}: expected one canonical emergence visual`);
    else {
      const text = (await emergence.textContent()) || '';
      for (const anchor of ['Real emergence or measurement artifact?', 'The task', 'The debate', '~1B parameters', '~7B parameters', '~70B parameters', 'Strong reading · Wei et al. 2022', 'Cautious reading · Schaeffer et al. 2023', 'Why this debate matters']) {
        if (!text.includes(anchor)) failures.push(`${viewport.name}: emergence visual missing ${JSON.stringify(anchor)}`);
      }
      for (const token of ['¿Emergencia real', 'La tarea', 'El debate', 'parámetros', 'Lectura fuerte', 'Lectura cauta', 'Métrica:', 'Por qué importa este debate']) {
        if (text.includes(token)) failures.push(`${viewport.name}: emergence Spanish leakage ${JSON.stringify(token)}`);
      }
      if (await emergence.locator('.eca-tab').count() !== 2) failures.push(`${viewport.name}: expected two emergence tabs`);
      if (await emergence.locator('.eca-panel').count() !== 2) failures.push(`${viewport.name}: expected two emergence panels`);
      if (await emergence.locator('.eca-scale-item').count() !== 3) failures.push(`${viewport.name}: expected three emergence scale examples`);
      if (await emergence.locator('.eca-view').count() !== 2) failures.push(`${viewport.name}: expected two emergence interpretations`);
      if (await emergence.locator('.eca-cbar').count() !== 10) failures.push(`${viewport.name}: expected ten emergence chart bars`);
      await expectRuntime(page, '[data-demo="04-emergencia-capacidades"]', 'ecaReady', 'emergence', viewport.name);
      await emergence.locator('.eca-tab[data-tab="debate"]').click();
      if (!(await emergence.locator('.eca-panel[data-panel="debate"]').evaluate(el => el.classList.contains('eca-panel--active')))) failures.push(`${viewport.name}: emergence debate panel did not activate`);
      await emergence.locator('.eca-tab[data-tab="tarea"]').click();
      if (!(await emergence.locator('.eca-panel[data-panel="tarea"]').evaluate(el => el.classList.contains('eca-panel--active')))) failures.push(`${viewport.name}: emergence task panel did not reactivate`);
    }

    // Foundation-model pipeline: pretraining -> alignment -> real-world use.
    const pipeline = page.locator('[data-demo="04-preentrenamiento-finetuning"]');
    if (await pipeline.count() !== 1) failures.push(`${viewport.name}: expected one canonical pretraining pipeline visual`);
    else {
      const text = (await pipeline.textContent()) || '';
      for (const anchor of ['From raw data to product: three stages', 'Stage 1', 'Pretraining', 'Stage 2', 'Alignment', 'Stage 3', 'Real-world use', 'Base model', 'Aligned model', 'Product', 'RLHF / DPO']) {
        if (!text.includes(anchor)) failures.push(`${viewport.name}: pretraining pipeline missing ${JSON.stringify(anchor)}`);
      }
      for (const token of ['Del dato en bruto', 'Etapa 1', 'Preentrenamiento', 'Alineamiento', 'Uso real', 'Modelo base', 'Modelo alineado', 'Herramientas externas', 'Producto']) {
        if (text.includes(token)) failures.push(`${viewport.name}: pretraining-pipeline Spanish leakage ${JSON.stringify(token)}`);
      }
      if (await pipeline.locator('.pft-tab').count() !== 3) failures.push(`${viewport.name}: expected three pipeline tabs`);
      if (await pipeline.locator('.pft-panel').count() !== 3) failures.push(`${viewport.name}: expected three pipeline panels`);
      if (await pipeline.locator('.pft-inp').count() !== 11) failures.push(`${viewport.name}: expected eleven pipeline input chips`);
      if (await pipeline.locator('.pft-output').count() !== 3) failures.push(`${viewport.name}: expected three pipeline outputs`);
      await expectRuntime(page, '[data-demo="04-preentrenamiento-finetuning"]', 'pftReady', 'pretraining-pipeline', viewport.name);
      for (const n of ['2', '3', '1']) {
        await pipeline.locator(`.pft-tab[data-tab="${n}"]`).click();
        if (!(await pipeline.locator(`.pft-panel[data-panel="${n}"]`).evaluate(el => el.classList.contains('pft-panel--active')))) failures.push(`${viewport.name}: pipeline stage ${n} did not activate`);
      }
    }

    const [clientWidth, scrollWidth] = await page.evaluate(() => [document.documentElement.clientWidth, document.documentElement.scrollWidth]);
    if (scrollWidth > clientWidth + 2) failures.push(`${viewport.name}: horizontal overflow ${scrollWidth - clientWidth}px`);

    if (viewport.name === 'desktop') {
      await page.screenshot({ path: path.join(outDir, 'english-history-04-canonical-remaining.png'), fullPage: true, animations: 'disabled' });
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
console.log('English Chapter 4 remaining visual QA passed: productization, scaling laws, emergence and pretraining pipeline are canonical translations on desktop/mobile.');
