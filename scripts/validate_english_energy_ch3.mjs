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
async function checkOverflow(root, viewport, name) {
  const [clientWidth, scrollWidth] = await root.evaluate((node) => [node.clientWidth, node.scrollWidth]);
  if (scrollWidth > clientWidth + 2) failures.push(`${viewport}: ${name} internal overflow ${scrollWidth - clientWidth}px`);
}
async function checkPlacement(root, viewport, name, beforeText, afterText) {
  const ok = await root.evaluate((node, { beforeText, afterText }) => {
    const content = node.closest('.md-content__inner') || document.querySelector('.md-content__inner') || document.body;
    const candidates = [...content.querySelectorAll('p,h2,h3,h4,blockquote')];
    const before = candidates.find((el) => (el.textContent || '').includes(beforeText));
    const after = candidates.find((el) => (el.textContent || '').includes(afterText));
    if (!before || !after) return false;
    return Boolean(before.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING)
      && Boolean(node.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING);
  }, { beforeText, afterText });
  if (!ok) failures.push(`${viewport}: ${name} moved away from canonical article hook`);
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
      '5. References',
      'Core sources',
    ], `${viewport.name}: article fidelity`);
    forbidText(articleText, [
      'What this changes when evaluating AI', 'measurement pluralism', 'Task output:', 'Firm productivity:', 'Market output:',
      'Prerrequisitos', 'Preguntas frecuentes', 'Fuentes base',
    ], `${viewport.name}: article fidelity`);

    const gdp = page.locator('[data-demo="03-pib-bienestar"]');
    if (await gdp.count() !== 1) failures.push(`${viewport.name}: expected exactly one canonical GDP-vs-well-being visual`);
    else {
      if (await gdp.locator('.pib-side').count() !== 2) failures.push(`${viewport.name}: GDP visual lost one of two comparison sides`);
      if (await gdp.locator('.pib-point').count() !== 6) failures.push(`${viewport.name}: GDP visual lost one of six comparison points`);
      if (await gdp.locator('.pib-div-item').count() !== 3) failures.push(`${viewport.name}: GDP visual lost one of three divergence cases`);
      if (await gdp.locator('[data-tab]').count() !== 0) failures.push(`${viewport.name}: GDP visual contains invented tabs`);
      if (await page.locator('[data-demo="energy-03-gdp-wellbeing"]').count() !== 0) failures.push(`${viewport.name}: legacy English GDP redesign remains`);
      const text = (await gdp.textContent()) || '';
      requireText(text, ['GDP vs well-being: they do not answer the same question', 'Production', 'Price', 'Pace', 'economic activity is not lived experience', 'Distribution', 'Quality of life', 'Subjective experience', 'Inequality', 'Externalities', 'Automation'], `${viewport.name}: GDP visual`);
      forbidText(text, ['PIB vs bienestar', 'Qué ve bien', 'Producción', 'Precio', 'Ritmo', 'actividad no equivale', 'Distribución', 'Calidad de vida', 'Experiencia subjetiva', 'Desigualdad', 'Externalidades', 'Automatización'], `${viewport.name}: GDP visual`);
      await checkPlacement(gdp, viewport.name, 'GDP visual', 'well-being frameworks developed by economists, psychologists and international organizations', 'Material dimensions');
      await checkOverflow(gdp, viewport.name, 'GDP visual');
      await gdp.screenshot({ path: path.join(outDir, `english-energy-ch3-gdp-wellbeing-${viewport.name}.png`), animations: 'disabled' });
    }

    const kk = page.locator('[data-demo="03-kahneman-killingsworth"]');
    if (await kk.count() !== 1) failures.push(`${viewport.name}: expected exactly one canonical Kahneman-Killingsworth visual`);
    else {
      if (await kk.locator('.kk-tab').count() !== 4) failures.push(`${viewport.name}: Kahneman-Killingsworth lost one of four canonical tabs`);
      if (await kk.locator('.kk-panel').count() !== 4) failures.push(`${viewport.name}: Kahneman-Killingsworth lost one of four canonical panels`);
      if (await kk.locator('.kk-country').count() !== 3) failures.push(`${viewport.name}: Kahneman-Killingsworth lost three-country comparison`);
      if (await kk.locator('.kk-fdi').count() !== 6) failures.push(`${viewport.name}: Kahneman-Killingsworth lost methodology/finding detail rows`);
      if (await kk.locator('.kk-res-card').count() !== 3) failures.push(`${viewport.name}: Kahneman-Killingsworth lost three resolution cards`);
      if (await page.locator('[data-demo="energy-03-income-wellbeing"]').count() !== 0) failures.push(`${viewport.name}: legacy English income/well-being redesign remains`);
      const text = (await kk.textContent()) || '';
      requireText(text, [
        'The paradox resolved: well-being and income do not relate as simply as once thought',
        'The conflict', 'Kahneman: the unhappy 20%', 'Killingsworth: the majority', '2023 resolution',
        'Finland', '7.7 / 10', 'Spain', '6.5 / 10', 'US', '7.1 / 10',
        'about $75,000 per year', 'Who are these people?', 'no ceiling detected →',
        'Different methodology, different result', '2023 adversarial collaboration',
        'The Easterlin paradox was correct', 'Killingsworth was correct', 'Implication for AI',
      ], `${viewport.name}: Kahneman-Killingsworth`);
      forbidText(text, ['La paradoja resuelta', 'El conflicto', 'insatisfecho', 'Finlandia', 'España', 'EE.UU.', 'Ingreso anual', 'Bienestar hedónico', '¿Quiénes son estas personas?', 'Metodología diferente', 'sin techo detectado', 'Implicación para la IA'], `${viewport.name}: Kahneman-Killingsworth`);

      await kk.locator('.kk-tab[data-tab="4"]').click();
      if (await kk.locator('.kk-panel[data-panel="4"]').isHidden()) failures.push(`${viewport.name}: tab 4 click did not reveal canonical resolution panel`);
      await kk.locator('.kk-tab[data-tab="1"]').focus();
      await page.keyboard.press('ArrowRight');
      if (await kk.locator('.kk-panel[data-panel="2"]').isHidden()) failures.push(`${viewport.name}: keyboard tab interaction did not reveal Kahneman panel`);
      await kk.locator('.kk-tab[data-tab="1"]').click();

      await checkPlacement(kk, viewport.name, 'Kahneman-Killingsworth visual', 'although they rarely appear as priorities in standard economic metrics', 'Alternative frameworks that try to capture more');
      await checkOverflow(kk, viewport.name, 'Kahneman-Killingsworth visual');
      await kk.screenshot({ path: path.join(outDir, `english-energy-ch3-kahneman-killingsworth-${viewport.name}.png`), animations: 'disabled' });
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
  console.error('English Energy Chapter 3 QA failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('English Energy Chapter 3 fidelity QA passed: canonical article, GDP/well-being and Kahneman-Killingsworth visuals are faithful, interactive and overflow-clean on desktop/mobile.');
