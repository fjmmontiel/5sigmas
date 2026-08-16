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
        const bodyText = (document.querySelector('.md-content__inner') || document.body).innerText;
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

    const propagation = page.locator('[data-demo="02-propagacion-error"]');
    if (await propagation.count() !== 1) {
      failures.push(`${viewport.name}: expected exactly one canonical error-propagation visual`);
    } else {
      if (await propagation.locator('[data-role="tab"]').count() !== 2) failures.push(`${viewport.name}: error propagation lost one of two canonical tabs`);
      if (await propagation.locator('[data-panel]').count() !== 2) failures.push(`${viewport.name}: error propagation lost one of two canonical panels`);
      if (await propagation.locator('.pe-step').count() !== 6) failures.push(`${viewport.name}: error propagation lost canonical six-step chain`);
      if (await propagation.locator('.pe-step--ok').count() !== 1) failures.push(`${viewport.name}: error propagation lost canonical correct state`);
      if (await propagation.locator('.pe-step--error').count() !== 1) failures.push(`${viewport.name}: error propagation lost canonical originating-error state`);
      if (await propagation.locator('.pe-step--contaminated').count() !== 3) failures.push(`${viewport.name}: error propagation lost canonical three contaminated states`);
      if (await propagation.locator('.pe-step--wrong').count() !== 1) failures.push(`${viewport.name}: error propagation lost canonical wrong-result state`);
      if (await propagation.locator('.pe-ampl-svg').count() !== 1) failures.push(`${viewport.name}: error propagation lost canonical amplification SVG`);
      if (await propagation.locator('.pe-impl-card').count() !== 3) failures.push(`${viewport.name}: error propagation lost canonical three implication cards`);

      const text = (await propagation.textContent()) || '';
      for (const token of [
        'Error propagation through reasoning chains',
        'Chain with an error',
        'Implications',
        'How many days are there from March 15 to June 10',
        'Error here',
        'off-by-one error is introduced at this step',
        'Contaminated',
        'Incorrect result',
        '87 days',
        'Correct answer: 88 days',
        'Cumulative error probability as a function of reasoning-chain length',
        '2 steps',
        '6 steps',
        '12 steps',
        '20 steps',
        'Length matters',
        'The final answer is not enough',
        'Intermediate verification',
      ]) {
        if (!text.includes(token)) failures.push(`${viewport.name}: error propagation missing ${JSON.stringify(token)}`);
      }
      for (const token of [
        'Propagación de error',
        'Cadena con error',
        '¿Cuántos días hay',
        'Error aquí',
        'Contaminado',
        'Resultado incorrecto',
        '87 días',
        'Probabilidad de error acumulada',
        'La longitud importa',
        'El resultado final no basta',
        'Verificación intermedia',
      ]) {
        if (text.includes(token)) failures.push(`${viewport.name}: error propagation Spanish leakage ${JSON.stringify(token)}`);
      }

      const tabs = propagation.locator('[data-role="tab"]');
      const panels = propagation.locator('[data-panel]');
      for (let index = 0; index < 2; index += 1) {
        await tabs.nth(index).click();
        if ((await tabs.nth(index).getAttribute('aria-selected')) !== 'true') failures.push(`${viewport.name}: error propagation tab ${index + 1} did not activate`);
        if (!(await panels.nth(index).isVisible())) failures.push(`${viewport.name}: error propagation panel ${index + 1} did not become visible`);
      }
      await tabs.nth(0).click();
      await tabs.nth(0).focus();
      await tabs.nth(0).press('ArrowRight');
      if ((await tabs.nth(1).getAttribute('aria-selected')) !== 'true' || !(await panels.nth(1).isVisible())) {
        failures.push(`${viewport.name}: error propagation keyboard tab interaction diverged from canonical behavior`);
      }

      const positions = await page.evaluate(() => {
        const bodyText = (document.querySelector('.md-content__inner') || document.body).innerText;
        return {
          risk: bodyText.indexOf('Longer chains introduce risk.'),
          visual: bodyText.indexOf('Error propagation through reasoning chains'),
          hallucinations: bodyText.indexOf('Hallucinations inside reasoning'),
        };
      });
      if (!(positions.risk >= 0 && positions.visual > positions.risk && positions.hallucinations > positions.visual)) {
        failures.push(`${viewport.name}: error-propagation visual moved away from its canonical article hook`);
      }

      await assertNoOverflow(propagation, `${viewport.name}: error propagation`);
      await propagation.screenshot({ path: path.join(outDir, `english-reasoning-ch2-error-propagation-${viewport.name}.png`), animations: 'disabled' });
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

console.log('English Reasoning Chapter 2 QA passed: canonical sycophancy and error-propagation visuals preserved, localized, interactive, correctly placed, unique, and overflow-clean on desktop/mobile.');
