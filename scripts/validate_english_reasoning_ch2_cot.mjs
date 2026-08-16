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

    const visual = page.locator('[data-demo="02-cot-fidelidad"]');
    if (await visual.count() !== 1) {
      failures.push(`${viewport.name}: expected exactly one canonical CoT-fidelity visual`);
    } else {
      if (await visual.locator('[data-role="tab"]').count() !== 2) failures.push(`${viewport.name}: CoT fidelity lost one of two canonical tabs`);
      if (await visual.locator('[data-panel]').count() !== 2) failures.push(`${viewport.name}: CoT fidelity lost one of two canonical panels`);
      if (await visual.locator('.cof-stat-block').count() !== 2) failures.push(`${viewport.name}: CoT fidelity lost canonical two evidence blocks`);
      if (await visual.locator('.cof-compare-col').count() !== 2) failures.push(`${viewport.name}: CoT fidelity lost canonical visible-vs-real comparison`);
      if (await visual.locator('.cof-step').count() !== 8) failures.push(`${viewport.name}: CoT fidelity lost canonical eight comparison steps`);
      if (await visual.locator('.cof-step--hidden').count() !== 3) failures.push(`${viewport.name}: CoT fidelity lost canonical three hidden determinants`);
      if (await visual.locator('.cof-ileg-ex-box').count() !== 1) failures.push(`${viewport.name}: CoT fidelity lost canonical illegibility example`);
      if (await visual.locator('.cof-ileg-noise').count() !== 2) failures.push(`${viewport.name}: CoT fidelity lost canonical two illegible fragments`);

      const text = (await visual.textContent()) || '';
      for (const token of [
        'Chain of thought as a black box',
        'CoT unfaithfulness',
        'CoT illegibility',
        '25–39%',
        'What the model says in the CoT',
        'What actually influenced the answer',
        'Cue in the question format that was not mentioned',
        'Statistical correlation from pretraining',
        'Position of the option in the list',
        'Answer: A (same answer, for different reasons)',
        '−53%',
        'analysis of 14 reasoning models',
        'What an illegible CoT looks like',
        'Illegible fragments contribute to the final result',
      ]) {
        if (!text.includes(token)) failures.push(`${viewport.name}: CoT fidelity missing ${JSON.stringify(token)}`);
      }
      for (const token of [
        'La cadena de pensamiento',
        'Infidelidad del CoT',
        'Ilegibilidad del CoT',
        'Lo que el modelo dice',
        'Lo que realmente influyó',
        'Pista en el formato',
        'Correlación estadística',
        'Posición de la opción',
        'Respuesta: A',
        'análisis de 14 modelos',
        'Qué tiene aspecto',
        'Los fragmentos ilegibles',
      ]) {
        if (text.includes(token)) failures.push(`${viewport.name}: CoT fidelity Spanish leakage ${JSON.stringify(token)}`);
      }

      const tabs = visual.locator('[data-role="tab"]');
      const panels = visual.locator('[data-panel]');
      for (let index = 0; index < 2; index += 1) {
        await tabs.nth(index).click();
        if ((await tabs.nth(index).getAttribute('aria-selected')) !== 'true') failures.push(`${viewport.name}: CoT fidelity tab ${index + 1} did not activate`);
        if (!(await panels.nth(index).isVisible())) failures.push(`${viewport.name}: CoT fidelity panel ${index + 1} did not become visible`);
      }
      await tabs.nth(0).click();
      await tabs.nth(0).focus();
      await tabs.nth(0).press('ArrowRight');
      if ((await tabs.nth(1).getAttribute('aria-selected')) !== 'true' || !(await panels.nth(1).isVisible())) {
        failures.push(`${viewport.name}: CoT fidelity keyboard interaction diverged from canonical behavior`);
      }

      const positions = await page.evaluate(() => {
        const bodyText = (document.querySelector('.md-content__inner') || document.body).innerText;
        return {
          evidence: bodyText.indexOf('accuracy fell by 53%'),
          visual: bodyText.indexOf('Chain of thought as a black box'),
          detection: bodyText.indexOf('2. Detection methods'),
        };
      });
      if (!(positions.evidence >= 0 && positions.visual > positions.evidence && positions.detection > positions.visual)) {
        failures.push(`${viewport.name}: CoT-fidelity visual moved away from its canonical article hook`);
      }

      await assertNoOverflow(visual, `${viewport.name}: CoT fidelity`);
      await visual.screenshot({ path: path.join(outDir, `english-reasoning-ch2-cot-fidelity-${viewport.name}.png`), animations: 'disabled' });
    }

    if (runtimeErrors.length) failures.push(`${viewport.name}: runtime errors: ${runtimeErrors.join(' | ')}`);
    await page.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error('English Reasoning Chapter 2 CoT QA failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('English Reasoning Chapter 2 CoT QA passed: canonical CoT-fidelity visual preserved, localized, interactive, correctly placed, unique, and overflow-clean on desktop/mobile.');
