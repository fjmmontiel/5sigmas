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

    const prmOrm = page.locator('[data-demo="03-prm-orm-comparacion"]');
    if (await prmOrm.count() !== 1) {
      failures.push(`${viewport.name}: expected exactly one canonical PRM/ORM visual`);
    } else {
      if (await prmOrm.locator('[data-role="tab"]').count() !== 3) failures.push(`${viewport.name}: PRM/ORM visual lost one of three canonical tabs`);
      if (await prmOrm.locator('[data-panel]').count() !== 3) failures.push(`${viewport.name}: PRM/ORM visual lost one of three canonical panels`);
      if (await prmOrm.locator('.po-step').count() !== 5) failures.push(`${viewport.name}: PRM panel lost canonical five-step/reward chain`);
      if (await prmOrm.locator('.po-reward').count() !== 5) failures.push(`${viewport.name}: PRM panel lost canonical five reward blocks`);
      if (await prmOrm.locator('.po-case').count() !== 3) failures.push(`${viewport.name}: ORM panel lost canonical three outcome cases`);
      if (await prmOrm.locator('.po-col').count() !== 2) failures.push(`${viewport.name}: comparison panel lost canonical PRM/ORM columns`);
      if (await prmOrm.locator('.po-item').count() !== 6) failures.push(`${viewport.name}: comparison panel lost canonical six comparison items`);

      const text = (await prmOrm.textContent()) || '';
      for (const token of [
        'PRMs vs ORMs: two ways to teach reasoning',
        'PRM — step by step',
        'ORM — by outcome',
        'When the difference matters',
        'Model reasoning chain',
        '+0.95', '+0.91', '+0.31', '+0.58', '+0.70',
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
        'dos formas de enseñar a razonar', 'Secciones', 'por pasos', 'por resultado',
        'Cadena de razonamiento', 'Error detectado', 'Forma correcta', 'funciona bien',
        'falla silenciosamente', 'penaliza injustamente', 'Dominio ideal', 'Ventaja principal',
        'Matemáticas formales',
      ]) {
        if (text.includes(token)) failures.push(`${viewport.name}: PRM/ORM Spanish leakage ${JSON.stringify(token)}`);
      }

      const tabs = prmOrm.locator('[data-role="tab"]');
      const panels = prmOrm.locator('[data-panel]');
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

      await assertNoOverflow(prmOrm, `${viewport.name}: PRM/ORM visual`);
      await prmOrm.screenshot({ path: path.join(outDir, `english-reasoning-ch3-prm-orm-${viewport.name}.png`), animations: 'disabled' });
    }

    const bestOfN = page.locator('[data-demo="03-best-of-n-visual"]');
    if (await bestOfN.count() !== 1) {
      failures.push(`${viewport.name}: expected exactly one canonical Best-of-N visual`);
    } else {
      if (await bestOfN.locator('[data-role="tab"]').count() !== 3) failures.push(`${viewport.name}: Best-of-N visual lost one of three canonical tabs`);
      if (await bestOfN.locator('[data-panel]').count() !== 3) failures.push(`${viewport.name}: Best-of-N visual lost one of three canonical panels`);
      if (await bestOfN.locator('.bn-candidate').count() !== 3) failures.push(`${viewport.name}: Best-of-N mechanism lost canonical three candidates`);
      if (await bestOfN.locator('.bn-score-bar').count() !== 3) failures.push(`${viewport.name}: Best-of-N mechanism lost canonical candidate score bars`);
      if (await bestOfN.locator('.bn-variant').count() !== 3) failures.push(`${viewport.name}: Best-of-N variants lost canonical three selection strategies`);
      if (await bestOfN.locator('.bn-svg').count() !== 1) failures.push(`${viewport.name}: Best-of-N lost canonical performance SVG`);
      if (await bestOfN.locator('.bn-cnote').count() !== 3) failures.push(`${viewport.name}: Best-of-N lost canonical three curve notes`);

      const text = (await bestOfN.textContent()) || '';
      for (const token of [
        'Best-of-N: generate multiple answers and choose the best',
        'Mechanism', 'Variants', 'Performance curve',
        'Prove that the sum of a triangle\'s angles is 180°',
        'Candidate 1', 'Candidate 2', 'Candidate 3',
        '0.91 ★ Selected', '0.78', '0.65',
        'SELECTION CRITERION (PRM)',
        'Best-of-N with verifier', 'N = 4–64',
        'Self-consistency (majority)', 'N = 8–40',
        'Model-as-judge', 'N = 3–8',
        'Performance (% correct)',
        'N=1', 'N=4', 'N=16', 'N=64',
        'Best-of-N + PRM', 'Self-consistency',
        'Diminishing returns', 'Practical optimum',
        'N between 8 and 32',
      ]) {
        if (!text.includes(token)) failures.push(`${viewport.name}: Best-of-N visual missing ${JSON.stringify(token)}`);
      }
      for (const token of [
        'generar múltiples respuestas', 'La palanca más simple', 'Secciones', 'Mecanismo',
        'Variantes', 'Curva de rendimiento', 'Demuestra que', 'Candidato 1', 'Candidato 2',
        'Candidato 3', 'Seleccionado', 'CRITERIO DE SELECCIÓN', 'con verificador',
        'mayoría', 'Modelo-como-juez', 'Rendimiento (% correcto)', 'Número de candidatos',
        'Retorno decreciente', 'Punto óptimo práctico',
      ]) {
        if (text.includes(token)) failures.push(`${viewport.name}: Best-of-N Spanish leakage ${JSON.stringify(token)}`);
      }

      const tabs = bestOfN.locator('[data-role="tab"]');
      const panels = bestOfN.locator('[data-panel]');
      for (let index = 0; index < 3; index += 1) {
        await tabs.nth(index).click();
        if ((await tabs.nth(index).getAttribute('aria-selected')) !== 'true') failures.push(`${viewport.name}: Best-of-N tab ${index + 1} did not activate`);
        if (!(await panels.nth(index).isVisible())) failures.push(`${viewport.name}: Best-of-N panel ${index + 1} did not become visible`);
      }

      const positions = await page.evaluate(() => {
        const bodyText = (document.querySelector('.md-content__inner') || document.body).innerText;
        return {
          before: bodyText.indexOf('Best-of-N also exhibits a clear cost curve'),
          visual: bodyText.indexOf('Best-of-N: generate multiple answers and choose the best'),
          after: bodyText.indexOf('Lever 3: More structure in the reasoning process'),
        };
      });
      if (!(positions.before >= 0 && positions.visual > positions.before && positions.after > positions.visual)) {
        failures.push(`${viewport.name}: Best-of-N visual moved away from its canonical article hook`);
      }

      await assertNoOverflow(bestOfN, `${viewport.name}: Best-of-N visual`);
      await bestOfN.screenshot({ path: path.join(outDir, `english-reasoning-ch3-best-of-n-${viewport.name}.png`), animations: 'disabled' });
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

console.log('English Reasoning Chapter 3 QA passed: canonical PRM/ORM and Best-of-N visuals preserved, localized, interactive, correctly placed, unique, and overflow-clean on desktop/mobile.');
