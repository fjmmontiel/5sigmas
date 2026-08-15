#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const route = '/en/series/from-cave-to-agi/05-mas-alla/';
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

    const visual = page.locator('[data-demo="05-memoria-tipos"]');
    if (await visual.count() !== 1) {
      failures.push(`${viewport.name}: expected one canonical memory visual`);
    } else {
      const text = (await visual.textContent()) || '';
      for (const anchor of [
        'Three types of memory, three different mechanisms',
        'Immediate context',
        'External memory',
        'Parametric memory',
        'Context window (e.g. 128K tokens)',
        'Vector database / RAG',
        'Model weights (fixed during inference)',
        'The most common mistake',
      ]) {
        if (!text.includes(anchor)) failures.push(`${viewport.name}: memory visual missing ${JSON.stringify(anchor)}`);
      }
      for (const token of ['Tres tipos de memoria', 'Contexto inmediato', 'Memoria externa', 'Memoria paramétrica', 'Ventana de contexto', 'Base vectorial', 'Pesos del modelo', 'El error más común']) {
        if (text.includes(token)) failures.push(`${viewport.name}: memory visual Spanish leakage ${JSON.stringify(token)}`);
      }
      if (await visual.locator('.mem-tab').count() !== 3) failures.push(`${viewport.name}: expected three canonical memory tabs`);
      if (await visual.locator('.mem-panel').count() !== 3) failures.push(`${viewport.name}: expected three canonical memory panels`);
      if (await visual.locator('.mem-ctx-seg').count() !== 4) failures.push(`${viewport.name}: expected four context-window segments`);
      if (await visual.locator('.mem-param-node').count() !== 9) failures.push(`${viewport.name}: expected nine parametric-memory nodes`);
      try {
        await page.waitForFunction(() => document.querySelector('[data-demo="05-memoria-tipos"]')?.dataset?.memReady === '1', null, { timeout: 2500 });
      } catch {
        failures.push(`${viewport.name}: canonical memory runtime did not initialize`);
      }
      for (const key of ['ext', 'param', 'ctx']) {
        await visual.locator(`.mem-tab[data-mtab="${key}"]`).click();
        if (!(await visual.locator(`[data-mpanel="${key}"]`).evaluate(el => el.classList.contains('mem-panel--active')))) {
          failures.push(`${viewport.name}: memory panel ${key} did not activate`);
        }
      }
    }

    const [clientWidth, scrollWidth] = await page.evaluate(() => [document.documentElement.clientWidth, document.documentElement.scrollWidth]);
    if (scrollWidth > clientWidth + 2) failures.push(`${viewport.name}: horizontal overflow ${scrollWidth - clientWidth}px`);

    if (viewport.name === 'desktop') {
      await page.screenshot({ path: path.join(outDir, 'english-history-05-canonical-memory.png'), fullPage: true, animations: 'disabled' });
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
console.log('English Chapter 5 memory visual QA passed: canonical structure, translations and interactions are preserved on desktop/mobile.');
