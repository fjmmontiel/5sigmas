#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const route = '/en/series/modelos-razonadores/01-que-es-razonar/';
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

    const body = page.locator('body');
    const [pageClientWidth, pageScrollWidth] = await page.evaluate(() => [document.documentElement.clientWidth, document.documentElement.scrollWidth]);
    if (pageScrollWidth > pageClientWidth + 2) failures.push(`${viewport.name}: page overflow ${pageScrollWidth - pageClientWidth}px`);

    const ecosystem = page.locator('[data-demo="01-ecosistema-modelos"]');
    if (await ecosystem.count() !== 1) {
      failures.push(`${viewport.name}: expected exactly one canonical reasoning-ecosystem visual`);
    } else {
      if (await ecosystem.locator('[data-role="tab"]').count() !== 3) failures.push(`${viewport.name}: ecosystem lost one of three canonical tabs`);
      if (await ecosystem.locator('[data-panel]').count() !== 3) failures.push(`${viewport.name}: ecosystem lost one of three canonical panels`);
      if (await ecosystem.locator('.eco-event').count() !== 5) failures.push(`${viewport.name}: ecosystem timeline lost canonical five-model sequence`);
      if (await ecosystem.locator('.eco-cell').count() !== 16) failures.push(`${viewport.name}: ecosystem openness matrix lost canonical 4x4 cells`);
      if (await ecosystem.locator('.eco-bcard').count() !== 3) failures.push(`${viewport.name}: ecosystem lost one of three benchmark cards`);
      if (await ecosystem.locator('.eco-bar-row').count() !== 15) failures.push(`${viewport.name}: ecosystem benchmark density changed from canonical 15 rows`);

      const text = (await ecosystem.textContent()) || '';
      for (const token of [
        'The reasoning-model ecosystem',
        'Timeline',
        'Openness',
        'DeepSeek R1',
        'Visible CoT',
        'Open weights',
        'AIME 2024',
        'GPQA Diamond',
        'SWE-bench Verified',
        'Real software engineering · GitHub issues · not saturated',
      ]) {
        if (!text.includes(token)) failures.push(`${viewport.name}: ecosystem missing ${JSON.stringify(token)}`);
      }
      for (const token of ['Cronología', 'Apertura', 'Primer modelo', 'Legibilidad', 'Pesos abiertos', 'Expertos PhD', 'Ingeniería de software']) {
        if (text.includes(token)) failures.push(`${viewport.name}: ecosystem Spanish leakage ${JSON.stringify(token)}`);
      }

      const tabs = ecosystem.locator('[data-role="tab"]');
      const panels = ecosystem.locator('[data-panel]');
      for (let index = 0; index < 3; index += 1) {
        await tabs.nth(index).click();
        if ((await tabs.nth(index).getAttribute('aria-selected')) !== 'true') failures.push(`${viewport.name}: ecosystem tab ${index + 1} did not activate`);
        if (!(await panels.nth(index).isVisible())) failures.push(`${viewport.name}: ecosystem panel ${index + 1} did not become visible`);
      }
      await assertNoOverflow(ecosystem, `${viewport.name}: ecosystem`);
      await ecosystem.screenshot({ path: path.join(outDir, `english-reasoning-ch1-ecosystem-${viewport.name}.png`), animations: 'disabled' });
    }

    const reasoning = page.locator('[data-demo="01-razonamiento-pasos"]');
    if (await reasoning.count() !== 1) {
      failures.push(`${viewport.name}: expected exactly one canonical reasoning-steps visual`);
    } else {
      if (await reasoning.locator('[data-role="tab"]').count() !== 2) failures.push(`${viewport.name}: reasoning visual lost one of two canonical tabs`);
      if (await reasoning.locator('[data-panel]').count() !== 2) failures.push(`${viewport.name}: reasoning visual lost one of two canonical panels`);
      if (await reasoning.locator('.raz-chain-step').count() !== 5) failures.push(`${viewport.name}: reasoning chain lost canonical five steps`);
      if (await reasoning.locator('.raz-prop').count() !== 3) failures.push(`${viewport.name}: reasoning visual lost one of three process properties`);
      if (await reasoning.locator('.raz-bench').count() !== 3) failures.push(`${viewport.name}: reasoning visual lost one of three benchmark cards`);
      if (await reasoning.locator('.raz-bar-row').count() !== 7) failures.push(`${viewport.name}: reasoning benchmark density changed from canonical seven rows`);

      const text = (await reasoning.textContent()) || '';
      for (const token of [
        'What does "reasoning" mean for an LLM?',
        'The process',
        'The benchmarks',
        'Direct answer',
        'Decompose the problem',
        'Check consistency',
        'Chained steps',
        'Consumes resources',
        'o1 · 64 samples',
        'PhD experts',
        'First time a model exceeds human experts on this benchmark',
      ]) {
        if (!text.includes(token)) failures.push(`${viewport.name}: reasoning visual missing ${JSON.stringify(token)}`);
      }
      for (const token of ['Qué es "razonar"', 'El proceso', 'Respuesta directa', 'Descomponer el problema', 'Con pasos encadenados', 'Consume recursos', 'Matemáticas de competición', 'Expertos PhD']) {
        if (text.includes(token)) failures.push(`${viewport.name}: reasoning visual Spanish leakage ${JSON.stringify(token)}`);
      }

      const tabs = reasoning.locator('[data-role="tab"]');
      const panels = reasoning.locator('[data-panel]');
      for (let index = 0; index < 2; index += 1) {
        await tabs.nth(index).click();
        if ((await tabs.nth(index).getAttribute('aria-selected')) !== 'true') failures.push(`${viewport.name}: reasoning tab ${index + 1} did not activate`);
        if (!(await panels.nth(index).isVisible())) failures.push(`${viewport.name}: reasoning panel ${index + 1} did not become visible`);
      }
      await assertNoOverflow(reasoning, `${viewport.name}: reasoning`);
      await reasoning.screenshot({ path: path.join(outDir, `english-reasoning-ch1-steps-${viewport.name}.png`), animations: 'disabled' });
    }

    const pageText = (await body.textContent()) || '';
    if (!pageText.includes('Chapter 1 — What does it mean for an LLM to "reason"?')) failures.push(`${viewport.name}: canonical English article hook/title missing`);
    if (runtimeErrors.length) failures.push(`${viewport.name}: runtime errors: ${runtimeErrors.join(' | ')}`);
    await page.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error('English Reasoning Chapter 1 QA failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('English Reasoning Chapter 1 QA passed: canonical ecosystem and reasoning-step visuals preserved, localized, interactive, unique, and overflow-clean on desktop/mobile.');
