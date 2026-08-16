#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const route = '/en/series/ia-pib-bienestar-energia/03-pib-vs-bienestar/';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });
const failures = [];

function requireText(text, tokens, prefix) {
  for (const token of tokens) if (!text.includes(token)) failures.push(`${prefix}: missing ${JSON.stringify(token)}`);
}
function forbidText(text, tokens, prefix) {
  for (const token of tokens) if (text.includes(token)) failures.push(`${prefix}: unexpected ${JSON.stringify(token)}`);
}

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

    const article = page.locator('.md-content__inner');
    const articleText = (await article.textContent()) || '';
    requireText(articleText, [
      'Chapter 3 — Measurement: GDP vs well-being',
      '30–40% of official GDP',
      '1% of the population captures 90% of growth',
      '7.7 out of 10',
      'around 6.5',
      '$75,000 per year',
      'roughly the 20% who already report low well-being',
      'Genuine Progress Indicator (GPI)',
      'eleven dimensions',
      'The next chapter applies this distinction',
      'How does AI automation affect well-being beyond income?',
      '## 5. References'.replace('## ', ''),
      'Core sources',
    ], `${viewport.name}: article fidelity`);
    forbidText(articleText, [
      'What this changes when evaluating AI',
      'measurement pluralism',
      'Task output:',
      'Firm productivity:',
      'Market output:',
      'Prerrequisitos',
      'Preguntas frecuentes',
      'Fuentes base',
    ], `${viewport.name}: article fidelity`);

    const visual = page.locator('[data-demo="03-pib-bienestar"]');
    if (await visual.count() !== 1) {
      failures.push(`${viewport.name}: expected exactly one canonical GDP-vs-well-being visual`);
    } else {
      if (await visual.locator('.pib-side').count() !== 2) failures.push(`${viewport.name}: expected two canonical comparison sides`);
      if (await visual.locator('.pib-point').count() !== 6) failures.push(`${viewport.name}: expected six canonical comparison points`);
      if (await visual.locator('.pib-div-item').count() !== 3) failures.push(`${viewport.name}: expected three canonical divergence cases`);
      if (await visual.locator('[data-tab]').count() !== 0) failures.push(`${viewport.name}: canonical GDP visual contains invented tabs`);
      if (await page.locator('[data-demo="energy-03-gdp-wellbeing"]').count() !== 0) failures.push(`${viewport.name}: legacy English GDP visual still exists`);

      const text = (await visual.textContent()) || '';
      requireText(text, [
        'GDP vs well-being: they do not answer the same question',
        'Production', 'Price', 'Pace',
        'economic activity is not lived experience',
        'Distribution', 'Quality of life', 'Subjective experience',
        'Inequality', 'Externalities', 'Automation',
      ], `${viewport.name}: GDP visual`);
      forbidText(text, [
        'PIB vs bienestar', 'Qué ve bien', 'Producción', 'Precio', 'Ritmo',
        'actividad no equivale', 'Distribución', 'Calidad de vida', 'Experiencia subjetiva',
        'Desigualdad', 'Externalidades', 'Automatización',
      ], `${viewport.name}: GDP visual`);

      const placement = await visual.evaluate((node) => {
        const content = node.closest('.md-content__inner') || document.querySelector('.md-content__inner') || document.body;
        const h2 = [...content.querySelectorAll('h2')].find((el) => (el.textContent || '').includes('What well-being measures that GDP does not capture'));
        const h3 = [...content.querySelectorAll('h3')].find((el) => (el.textContent || '').trim() === 'Material dimensions');
        if (!h2 || !h3) return false;
        return Boolean(h2.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING)
          && Boolean(node.compareDocumentPosition(h3) & Node.DOCUMENT_POSITION_FOLLOWING);
      });
      if (!placement) failures.push(`${viewport.name}: GDP visual is not at the canonical Section 2 hook`);

      const [clientWidth, scrollWidth] = await visual.evaluate((node) => [node.clientWidth, node.scrollWidth]);
      if (scrollWidth > clientWidth + 2) failures.push(`${viewport.name}: GDP visual internal overflow ${scrollWidth - clientWidth}px`);
      await visual.screenshot({ path: path.join(outDir, `english-energy-ch3-gdp-wellbeing-${viewport.name}.png`) });
    }

    const [pageClientWidth, pageScrollWidth] = await page.evaluate(() => [document.documentElement.clientWidth, document.documentElement.scrollWidth]);
    if (pageScrollWidth > pageClientWidth + 2) failures.push(`${viewport.name}: page overflow ${pageScrollWidth - pageClientWidth}px`);
    if (runtimeErrors.length) failures.push(`${viewport.name}: runtime errors: ${runtimeErrors.join(' | ')}`);
    await page.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('English Energy Chapter 3 first-half fidelity QA passed.');
