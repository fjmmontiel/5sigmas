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

    const demo = page.locator('[data-demo="04-shock-2012"]');
    if (await demo.count() !== 1) {
      failures.push(`${viewport.name}: expected one canonical AlexNet visual, found ${await demo.count()}`);
      await page.close();
      continue;
    }

    const text = (await demo.textContent()) || '';
    for (const anchor of [
      '2012 changed the regime',
      'The jump',
      'Why it worked',
      'The consequence',
      'ImageNet top-5 error',
      '28.2%',
      '25.8%',
      '15.3%',
      '6.7%',
      '1.2M',
      'Two GTX 580 GPUs',
      'BEFORE',
      'AFTER',
    ]) {
      if (!text.includes(anchor)) failures.push(`${viewport.name}: AlexNet visual missing ${JSON.stringify(anchor)}`);
    }

    for (const token of [
      '2012 cambia el régimen', 'El salto', 'Por qué funcionó', 'La consecuencia', 'Antes del salto',
      'Error top-5 en ImageNet', 'Nivel humano', 'Menos es mejor', 'Tres piezas convergieron',
      'CÓMPUTO', 'ARQUITECTURA', 'Visión artificial', 'La red aprende las características', 'El cambio de régimen',
    ]) {
      if (text.includes(token)) failures.push(`${viewport.name}: AlexNet Spanish leakage ${JSON.stringify(token)}`);
    }

    if (await demo.locator('.s12-tab').count() !== 3) failures.push(`${viewport.name}: expected three canonical AlexNet tabs`);
    if (await demo.locator('.s12-panel').count() !== 3) failures.push(`${viewport.name}: expected three canonical AlexNet panels`);
    if (await demo.locator('.s12-bar-row').count() !== 5) failures.push(`${viewport.name}: expected five canonical ImageNet benchmark rows`);
    if (await demo.locator('.s12-card').count() !== 3) failures.push(`${viewport.name}: expected three canonical convergence cards`);
    if (await demo.locator('.s12-consq-before').count() !== 1 || await demo.locator('.s12-consq-after').count() !== 1) failures.push(`${viewport.name}: expected canonical before/after consequence comparison`);

    try {
      await page.waitForFunction(() => document.querySelector('[data-demo="04-shock-2012"]')?.dataset.s12Ready === '1', null, { timeout: 2000 });
    } catch {
      failures.push(`${viewport.name}: AlexNet runtime did not initialize`);
    }

    const mechanism = demo.locator('.s12-tab[data-tab="mecanismo"]');
    await mechanism.click();
    if (!(await mechanism.evaluate(el => el.classList.contains('s12-tab--active')))) failures.push(`${viewport.name}: mechanism tab did not activate`);
    if (!(await demo.locator('.s12-panel[data-panel="mecanismo"]').evaluate(el => el.classList.contains('s12-panel--active')))) failures.push(`${viewport.name}: mechanism panel did not activate`);

    const consequence = demo.locator('.s12-tab[data-tab="consecuencia"]');
    await consequence.click();
    if (!(await demo.locator('.s12-panel[data-panel="consecuencia"]').evaluate(el => el.classList.contains('s12-panel--active')))) failures.push(`${viewport.name}: consequence panel did not activate`);

    const jump = demo.locator('.s12-tab[data-tab="ruptura"]');
    await jump.click();
    if (!(await demo.locator('.s12-panel[data-panel="ruptura"]').evaluate(el => el.classList.contains('s12-panel--active')))) failures.push(`${viewport.name}: jump panel did not reactivate`);
    await page.waitForTimeout(500);
    const alexNetWidth = await demo.locator('.s12-fill--break').evaluate(el => parseFloat(getComputedStyle(el).width));
    if (!(alexNetWidth > 0)) failures.push(`${viewport.name}: benchmark bar animation did not render`);

    const [clientWidth, scrollWidth] = await page.evaluate(() => [document.documentElement.clientWidth, document.documentElement.scrollWidth]);
    if (scrollWidth > clientWidth + 2) failures.push(`${viewport.name}: horizontal overflow ${scrollWidth - clientWidth}px`);

    if (viewport.name === 'desktop') {
      await page.screenshot({ path: path.join(outDir, 'english-history-04-alexnet.png'), fullPage: true, animations: 'disabled' });
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
console.log('English Chapter 4 AlexNet QA passed: canonical three-tab visual, benchmark chart, convergence mechanism, consequence comparison and desktop/mobile layout.');
