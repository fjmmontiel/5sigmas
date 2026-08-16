#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const route = '/en/series/modelos-razonadores/03-test-time-compute/';
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

    const visual = page.locator('[data-demo="03-prm-orm-comparacion"]');
    if (await visual.count() !== 1) {
      failures.push(`${viewport.name}: expected exactly one canonical PRM/ORM visual`);
    } else {
      if (await visual.locator('[data-role="tab"]').count() !== 3) failures.push(`${viewport.name}: PRM/ORM visual lost one of three canonical tabs`);
      if (await visual.locator('[data-panel]').count() !== 3) failures.push(`${viewport.name}: PRM/ORM visual lost one of three canonical panels`);
      if (await visual.locator('.po-step').count() !== 5) failures.push(`${viewport.name}: PRM panel lost canonical five-step/reward chain`);
      if (await visual.locator('.po-reward').count() !== 5) failures.push(`${viewport.name}: PRM panel lost canonical five reward blocks`);
      if (await visual.locator('.po-case').count() !== 3) failures.push(`${viewport.name}: ORM panel lost canonical three outcome cases`);
      if (await visual.locator('.po-col').count() !== 2) failures.push(`${viewport.name}: comparison panel lost canonical PRM/ORM columns`);
      if (await visual.locator('.po-item').count() !== 6) failures.push(`${viewport.name}: comparison panel lost canonical six comparison items`);

      const text = (await visual.textContent()) || '';
      for (const token of [
        'PRMs vs ORMs: two ways to teach reasoning',
        'PRM — step by step',
        'ORM — by outcome',
        'When the difference matters',
        'Model reasoning chain',
        '+0.95',
        '+0.91',
        '+0.31',
        '+0.58',
        '+0.70',
        'Error detected at P3',
        'Correct form, wrong coefficients',
        'Case 1 — ORM works well',
        'Case 2 — ORM fails silently',
        'Case 3 — ORM penalizes unfairly',
        'Final computation error',
        'Formal mathematics, logic, code with partial tests',
        'DeepSeek R1 uses a binary ORM',
      ]) {
        if (!text.includes(token)) failures.push(`${viewport.name}: PRM/ORM visual missing ${JSON.stringify(token)}`);
      }
      for (const token of [
        'dos formas de enseñar a razonar',
        'Secciones',
        'por pasos',
        'por resultado',
        'Cadena de razonamiento',
        'Error detectado',
        'Forma correcta',
        'funciona bien',
        'falla silenciosamente',
        'penaliza injustamente',
        'Dominio ideal',
        'Ventaja principal',
        'Matemáticas formales',
      ]) {
        if (text.includes(token)) failures.push(`${viewport.name}: PRM/ORM Spanish leakage ${JSON.stringify(token)}`);
      }

      const tabs = visual.locator('[data-role="tab"]');
      const panels = visual.locator('[data-panel]');
      for (let index = 0; index < 3; index += 1) {
        await tabs.nth(index).click();
        if ((await tabs.nth(index).getAttribute('aria-selected')) !== 'true') failures.push(`${viewport.name}: PRM/ORM tab ${index + 1} did not activate`);
        if (!(await panels.nth(index).isVisible())) failures.push(`${viewport.name}: PRM/ORM panel ${index + 1} did not become visible`);
      }
      await tabs.nth(0).click();
      await tabs.nth(0).focus();
      await tabs.nth(0).press('ArrowRight');
      if ((await tabs.nth(1).getAttribute('aria-selected')) !== 'true' || !(await panels.nth(1).isVisible())) {
        failures.push(`${viewport.name}: PRM/ORM keyboard tab interaction diverged from canonical behavior`);
      }

      const positions = await page.evaluate(() => {
        const bodyText = (document.querySelector('.md-content__inner') || document.body).innerText;
        return {
          before: bodyText.indexOf('How the candidates are scored matters.'),
          visual: bodyText.indexOf('PRMs vs ORMs: two ways to teach reasoning'),
          after: bodyText.indexOf('Best-of-N also exhibits a clear cost curve'),
        };
      });
      if (!(positions.before >= 0 && positions.visual > positions.before && positions.after > positions.visual)) {
        failures.push(`${viewport.name}: PRM/ORM visual moved away from its canonical article hook`);
      }

      await assertNoOverflow(visual, `${viewport.name}: PRM/ORM visual`);
      await visual.screenshot({ path: path.join(outDir, `english-reasoning-ch3-prm-orm-${viewport.name}.png`), animations: 'disabled' });
    }

    const pageText = (await page.locator('body').textContent()) || '';
    if (!pageText.includes('Chapter 3 — Test-Time Compute')) failures.push(`${viewport.name}: canonical English article title missing`);
    if (runtimeErrors.length) failures.push(`${viewport.name}: runtime errors: ${runtimeErrors.join(' | ')}`);
    await page.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error('English Reasoning Chapter 3 QA failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('English Reasoning Chapter 3 QA passed: canonical PRM/ORM visual preserved, localized, interactive, correctly placed, unique, and overflow-clean on desktop/mobile.');
