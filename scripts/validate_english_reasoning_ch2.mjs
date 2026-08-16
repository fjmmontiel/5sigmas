#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const route = '/en/series/modelos-razonadores/02-fallos/';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const failures = [];
const browser = await chromium.launch({ headless: true });

const assertNoOverflow = async (locator, label) => {
  const [clientWidth, scrollWidth] = await locator.evaluate((node) => [node.clientWidth, node.scrollWidth]);
  if (scrollWidth > clientWidth + 2) failures.push(`${label}: internal overflow ${scrollWidth - clientWidth}px`);
};

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

    const sycophancy = page.locator('[data-demo="02-sycofancia"]');
    if (await sycophancy.count() !== 1) {
      failures.push(`${viewport.name}: expected exactly one canonical sycophancy visual`);
    } else {
      if (await sycophancy.locator('[data-role="tab"]').count() !== 3) failures.push(`${viewport.name}: sycophancy lost one of three canonical tabs`);
      if (await sycophancy.locator('[data-panel]').count() !== 3) failures.push(`${viewport.name}: sycophancy lost one of three canonical panels`);
      if (await sycophancy.locator('.sy-turn').count() !== 6) failures.push(`${viewport.name}: sycophancy conversation lost canonical six-turn escalation`);
      if (await sycophancy.locator('.sy-status').count() !== 3) failures.push(`${viewport.name}: sycophancy conversation lost canonical three response states`);
      if (await sycophancy.locator('.sy-mstep').count() !== 4) failures.push(`${viewport.name}: sycophancy mechanism lost canonical four training stages`);
      if (await sycophancy.locator('.sy-stat').count() !== 3) failures.push(`${viewport.name}: sycophancy evidence lost canonical three quantitative blocks`);

      const text = (await sycophancy.textContent()) || '';
      for (const token of [
        'Sycophancy: the model that always agrees',
        'Demonstration',
        'Mechanism',
        'Quantitative evidence',
        'The Great Wall is between 4 and 9 meters wide',
        'Partial capitulation',
        'Full capitulation',
        'The model received no new evidence between turns',
        'Pretraining',
        'Optimization',
        'Generalization',
        '85%',
        '−27pp',
        'Persists',
        'GPT-4 is the most robust to user pressure',
      ]) {
        if (!text.includes(token)) failures.push(`${viewport.name}: sycophancy missing ${JSON.stringify(token)}`);
      }
      for (const token of [
        'el modelo que siempre da la razón',
        'Demostración',
        'Evidencia cuantitativa',
        'USUARIO',
        'Capitulación',
        'El usuario',
        'Preentrenamiento',
        'Optimización',
        'Generalización',
        'Persiste',
      ]) {
        if (text.includes(token)) failures.push(`${viewport.name}: sycophancy Spanish leakage ${JSON.stringify(token)}`);
      }

      const tabs = sycophancy.locator('[data-role="tab"]');
      const panels = sycophancy.locator('[data-panel]');
      for (let index = 0; index < 3; index += 1) {
        await tabs.nth(index).click();
        if ((await tabs.nth(index).getAttribute('aria-selected')) !== 'true') failures.push(`${viewport.name}: sycophancy tab ${index + 1} did not activate`);
        if (!(await panels.nth(index).isVisible())) failures.push(`${viewport.name}: sycophancy panel ${index + 1} did not become visible`);
      }

      const positions = await page.evaluate(() => {
        const bodyText = document.body.innerText;
        return {
          evidence: bodyText.indexOf('Telling the model that the user "is an expert"'),
          visual: bodyText.indexOf('Sycophancy: the model that always agrees'),
          arithmetic: bodyText.indexOf('Basic arithmetic and algebra errors.'),
        };
      });
      if (!(positions.evidence >= 0 && positions.visual > positions.evidence && positions.arithmetic > positions.visual)) {
        failures.push(`${viewport.name}: sycophancy visual moved away from its canonical article hook`);
      }

      await assertNoOverflow(sycophancy, `${viewport.name}: sycophancy`);
      await sycophancy.screenshot({ path: path.join(outDir, `english-reasoning-ch2-sycophancy-${viewport.name}.png`), animations: 'disabled' });
    }

    const pageText = (await page.locator('body').textContent()) || '';
    if (!pageText.includes('Chapter 2 — What reasoning-model failures look like')) failures.push(`${viewport.name}: canonical English article title missing`);
    if (runtimeErrors.length) failures.push(`${viewport.name}: runtime errors: ${runtimeErrors.join(' | ')}`);
    await page.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error('English Reasoning Chapter 2 QA failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('English Reasoning Chapter 2 QA passed: canonical sycophancy visual preserved, localized, interactive, correctly placed, unique, and overflow-clean on desktop/mobile.');
