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

    const visual = page.locator('[data-demo="02-tipos-fallos"]');
    if (await visual.count() !== 1) {
      failures.push(`${viewport.name}: expected exactly one canonical failure-types visual`);
    } else {
      if (await visual.locator('.fal-card').count() !== 5) failures.push(`${viewport.name}: failure types lost one of five canonical cards`);
      if (await visual.locator('.fal-card--wide').count() !== 1) failures.push(`${viewport.name}: failure types lost canonical wide CoT card`);
      if (await visual.locator('.fal-card-tag').count() !== 5) failures.push(`${viewport.name}: failure types lost canonical category tags`);
      if (await visual.locator('.fal-card-signal').count() !== 5) failures.push(`${viewport.name}: failure types lost canonical detection signals`);

      const text = (await visual.textContent()) || '';
      for (const token of [
        'Five failure types in reasoning models',
        'Shortcuts',
        'Systematic biases',
        'Non-random errors',
        'Specification gaming',
        'Objective drift',
        'o3 hacked the chess board in 88% of attempts',
        'Propagation',
        'Cascading failures',
        'Unfaithfulness + illegibility',
        'Unreliable CoT',
        '25–39%',
        'accuracy drops by 53%',
        'Signal: CoT monitoring is less reliable than it appears.',
      ]) {
        if (!text.includes(token)) failures.push(`${viewport.name}: failure types missing ${JSON.stringify(token)}`);
      }
      for (const token of [
        'Cinco tipos de fallo',
        'Atajos',
        'Sesgos sistemáticos',
        'Errores no aleatorios',
        'Deriva de objetivo',
        'hackeó el tablero',
        'Fallos en cadena',
        'Infidelidad + ilegibilidad',
        'CoT no fiable',
        'Señal:',
      ]) {
        if (text.includes(token)) failures.push(`${viewport.name}: failure types Spanish leakage ${JSON.stringify(token)}`);
      }

      const positions = await page.evaluate(() => {
        const bodyText = (document.querySelector('.md-content__inner') || document.body).innerText;
        return {
          faithfulness: bodyText.indexOf('only 25–39% of the analyzed cases'),
          visual: bodyText.indexOf('Five failure types in reasoning models'),
          illegibility: bodyText.indexOf('In addition, outcome-based RL produces chains of thought'),
        };
      });
      if (!(positions.faithfulness >= 0 && positions.visual > positions.faithfulness && positions.illegibility > positions.visual)) {
        failures.push(`${viewport.name}: failure-types visual moved away from its canonical article hook`);
      }

      const [clientWidth, scrollWidth] = await visual.evaluate((node) => [node.clientWidth, node.scrollWidth]);
      if (scrollWidth > clientWidth + 2) failures.push(`${viewport.name}: failure-types internal overflow ${scrollWidth - clientWidth}px`);
      await visual.screenshot({ path: path.join(outDir, `english-reasoning-ch2-failure-types-${viewport.name}.png`), animations: 'disabled' });
    }

    if (runtimeErrors.length) failures.push(`${viewport.name}: runtime errors: ${runtimeErrors.join(' | ')}`);
    await page.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error('English Reasoning Chapter 2 failure-types QA failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('English Reasoning Chapter 2 failure-types QA passed: canonical five-card evidence grid preserved, localized, correctly placed, unique, and overflow-clean on desktop/mobile.');
