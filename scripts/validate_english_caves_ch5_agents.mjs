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

    const visual = page.locator('[data-demo="05-agentes-convergencia"]');
    if (await visual.count() !== 1) {
      failures.push(`${viewport.name}: expected one canonical agent-loop visual`);
    } else {
      const text = (await visual.textContent()) || '';
      for (const anchor of [
        'The agent as a loop, not an arrow',
        '1 · Observe',
        '2 · Plan',
        '3 · Execute',
        '4 · Verify',
        '5 · Memory',
        'OBJECTIVE',
        'Update memory',
        'vector memory',
      ]) {
        if (!text.includes(anchor)) failures.push(`${viewport.name}: agent-loop visual missing ${JSON.stringify(anchor)}`);
      }
      for (const token of ['El agente como bucle', 'Observar', 'Planear', 'Ejecutar', 'Verificar', 'Actualizar memoria', 'memoria vectorial']) {
        if (text.includes(token)) failures.push(`${viewport.name}: agent-loop Spanish leakage ${JSON.stringify(token)}`);
      }
      if (await visual.locator('.agc-tab').count() !== 5) failures.push(`${viewport.name}: expected five canonical agent tabs`);
      if (await visual.locator('.agc-detail').count() !== 5) failures.push(`${viewport.name}: expected five canonical detail panels`);
      if (await visual.locator('.agc-node').count() !== 5) failures.push(`${viewport.name}: expected five canonical loop nodes`);
      try {
        await page.waitForFunction(() => document.querySelector('[data-demo="05-agentes-convergencia"]')?.dataset?.agcReady === '1', null, { timeout: 2500 });
      } catch {
        failures.push(`${viewport.name}: canonical agent-loop runtime did not initialize`);
      }
      for (const n of ['2', '3', '4', '5', '1']) {
        await visual.locator(`.agc-tab[data-atab="${n}"]`).click();
        if (!(await visual.locator(`.agc-detail[data-detail="${n}"]`).evaluate(el => el.classList.contains('agc-detail--active')))) {
          failures.push(`${viewport.name}: agent-loop detail ${n} did not activate`);
        }
      }
    }

    const [clientWidth, scrollWidth] = await page.evaluate(() => [document.documentElement.clientWidth, document.documentElement.scrollWidth]);
    if (scrollWidth > clientWidth + 2) failures.push(`${viewport.name}: horizontal overflow ${scrollWidth - clientWidth}px`);

    if (viewport.name === 'desktop') {
      await page.screenshot({ path: path.join(outDir, 'english-history-05-canonical-agents.png'), fullPage: true, animations: 'disabled' });
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
console.log('English Chapter 5 agent-loop visual QA passed: canonical structure, translations and interactions are preserved on desktop/mobile.');
