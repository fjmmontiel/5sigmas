#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const route = '/en/series/multimodalidad-iag/04-evaluacion/';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const failures = [];
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

    const metrics = page.locator('[data-demo="mm-04-metrics"]');
    if (await metrics.count() !== 1) {
      failures.push(`${viewport.name}: expected one canonical evaluation-metrics visual`);
    } else {
      if (await metrics.locator('.met-tab').count() !== 4) failures.push(`${viewport.name}: metrics visual lost one of four canonical tabs`);
      if (await metrics.locator('.met-panel').count() !== 4) failures.push(`${viewport.name}: metrics visual lost one of four canonical panels`);
      if (await metrics.locator('.met-contrast-col').count() !== 2) failures.push(`${viewport.name}: grounding panel lost its two-way evidence contrast`);
      if (await metrics.locator('.met-para-row').count() !== 3) failures.push(`${viewport.name}: consistency panel lost its three paraphrase cases`);
      if (await metrics.locator('.met-loc-col').count() !== 2) failures.push(`${viewport.name}: localization panel lost partial-vs-localized comparison`);
      if (await metrics.locator('.met-calib-case').count() !== 2) failures.push(`${viewport.name}: calibration panel lost poorly-vs-well calibrated cases`);

      const text = (await metrics.textContent()) || '';
      for (const token of [
        'Four dimensions accuracy does not capture',
        'Grounding failure',
        'Diagnostic test',
        'Same image · same question · different phrasings',
        'SEEDBench',
        'Partial understanding',
        'Understanding with localization',
        'Poorly calibrated model',
        'Well-calibrated model',
        'Production failure signal',
      ]) {
        if (!text.includes(token)) failures.push(`${viewport.name}: metrics visual missing ${JSON.stringify(token)}`);
      }

      for (const token of [
        'Cuatro dimensiones que la exactitud no captura',
        'Qué mide',
        'Fallo de grounding',
        'Misma imagen · misma pregunta',
        'Comprensión parcial',
        'Modelo mal calibrado',
        'Señal de fallo en producción',
      ]) {
        if (text.includes(token)) failures.push(`${viewport.name}: Spanish leakage ${JSON.stringify(token)}`);
      }

      const tabs = metrics.locator('.met-tab');
      const panels = metrics.locator('.met-panel');
      for (let index = 0; index < 4; index += 1) {
        await tabs.nth(index).click();
        if (!(await tabs.nth(index).evaluate((node) => node.classList.contains('active')))) {
          failures.push(`${viewport.name}: tab ${index + 1} did not become active`);
        }
        if (!(await panels.nth(index).isVisible())) failures.push(`${viewport.name}: panel ${index + 1} did not become visible`);
      }

      const [visualClientWidth, visualScrollWidth] = await metrics.evaluate((node) => [node.clientWidth, node.scrollWidth]);
      if (visualScrollWidth > visualClientWidth + 2) failures.push(`${viewport.name}: metrics visual internal overflow ${visualScrollWidth - visualClientWidth}px`);

      await metrics.screenshot({
        path: path.join(outDir, `english-multimodality-04-metrics-${viewport.name}.png`),
        animations: 'disabled',
      });
    }

    const [clientWidth, scrollWidth] = await page.evaluate(() => [document.documentElement.clientWidth, document.documentElement.scrollWidth]);
    if (scrollWidth > clientWidth + 2) failures.push(`${viewport.name}: page horizontal overflow ${scrollWidth - clientWidth}px`);
    for (const error of runtimeErrors) failures.push(`${viewport.name}: pageerror: ${error}`);

    await page.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  for (const failure of [...new Set(failures)]) console.error(failure);
  process.exit(1);
}

console.log('Canonical English Multimodality Chapter 4 evaluation-metrics QA passed: four tabs/panels, grounding/consistency/localization/calibration density, real interactions, no Spanish leakage, desktop/mobile overflow clean.');
