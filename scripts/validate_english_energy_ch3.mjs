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
async function capture(root, viewport, name) {
  await root.screenshot({ path: path.join(outDir, `english-energy-ch3-${name}-${viewport}.png`), animations: 'disabled' });
}
async function checkPlacement(root, viewport, name, beforeText, afterText) {
  const ok = await root.evaluate((node, { beforeText, afterText }) => {
    const content = node.closest('.md-content__inner') || document.querySelector('.md-content__inner') || document.body;
    const candidates = [...content.querySelectorAll('p,h2,h3,h4,blockquote')];
    const before = candidates.find((el) => (el.textContent || '').includes(beforeText));
    const after = candidates.find((el) => (el.textContent || '').includes(afterText));
    if (!before || !after) return false;
    const beforeOk = before.contains(node) || Boolean(before.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING);
    const afterOk = node.contains(after) || Boolean(node.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING);
    return beforeOk && afterOk;
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

    const body = await page.locator('body').innerText();
    requireText(body, [
      'Chapter 3 — Measurement: GDP vs well-being',
      'between 30 and 40% of official GDP',
      '1% of the population captures 90% of growth',
      '7.7 out of 10',
      'approximately the 20% who already report low well-being',
      'Human Development Index (HDI)',
      'Genuine Progress Indicator (GPI)',
      'Gross National Happiness',
      'How does AI automation affect well-being beyond income?',
      'Core sources',
      'Stiglitz, J., Sen, A., Fitoussi, J.-P. (2009)',
      'Penn World Table',
      'OECD (2013)',
    ], `${viewport.name}: article`);
    forbidText(body, [
      'Capítulo 3', 'Qué mide el PIB', 'Preguntas frecuentes', 'Fuentes base',
      'The correct conclusion is therefore measurement pluralism',
      'What this changes when evaluating AI',
      'How should AI\'s impact be measured?',
      'GDP is one layer of the outcome stack',
      'One average can hide two response curves',
      'Different indicators answer different questions',
    ], `${viewport.name}: article`);

    const gdp = page.locator('[data-demo="03-pib-bienestar"]');
    if (await gdp.count() !== 1) failures.push(`${viewport.name}: expected exactly one canonical GDP/well-being visual`);
    else {
      if (await gdp.locator('.pib-side').count() !== 2) failures.push(`${viewport.name}: GDP/well-being lost canonical two-sided comparison`);
      if (await gdp.locator('.pib-point').count() !== 6) failures.push(`${viewport.name}: GDP/well-being lost one of six canonical points`);
      if (await gdp.locator('.pib-div-item').count() !== 3) failures.push(`${viewport.name}: GDP/well-being lost one of three divergence cases`);
      if (await gdp.locator('.en-energy-v').count() !== 0) failures.push(`${viewport.name}: old English GDP/well-being redesign remains`);
      const text = (await gdp.textContent()) || '';
      requireText(text, [
        'GDP vs well-being: they do not answer the same question', 'What GDP measures well', 'Production', 'Price', 'Pace',
        'activity is not the same as lived experience', 'What well-being adds', 'Distribution', 'Quality of life', 'Subjective experience',
        'Where they diverge most', 'Inequality', 'Externalities', 'Automation',
      ], `${viewport.name}: GDP/well-being`);
      forbidText(text, ['PIB vs bienestar', 'Qué mide bien el PIB', 'Producción', 'Qué añade el bienestar', 'Distribución', 'Desigualdad'], `${viewport.name}: GDP/well-being`);
      await checkPlacement(gdp, viewport.name, 'GDP/well-being', 'converge on similar dimensions', 'Material dimensions');
      await checkOverflow(gdp, viewport.name, 'GDP/well-being');
      await capture(gdp, viewport.name, 'gdp-wellbeing');
    }

    const income = page.locator('[data-demo="03-kahneman-killingsworth"]');
    if (await income.count() !== 1) failures.push(`${viewport.name}: expected exactly one canonical Kahneman-Killingsworth visual`);
    else {
      if (await income.locator('[data-tab]').count() !== 4) failures.push(`${viewport.name}: income/well-being lost one of four canonical tabs`);
      if (await income.locator('[data-panel]').count() !== 4) failures.push(`${viewport.name}: income/well-being lost one of four canonical panels`);
      if (await income.locator('.kk-country').count() !== 3) failures.push(`${viewport.name}: income/well-being lost one of three country examples`);
      if (await income.locator('svg').count() !== 3) failures.push(`${viewport.name}: income/well-being lost one of three canonical charts`);
      if (await income.locator('.kk-fdi').count() !== 6) failures.push(`${viewport.name}: income/well-being lost canonical methodology details`);
      if (await income.locator('.kk-res-card').count() !== 3) failures.push(`${viewport.name}: income/well-being lost one of three resolution cards`);
      const text = (await income.textContent()) || '';
      requireText(text, [
        'The paradox resolved', 'The conflict', 'Kahneman: the dissatisfied 20%', 'Killingsworth: the majority', '2023 resolution',
        'Finland', '7.7 / 10', 'Spain', '6.5 / 10', 'U.S.', '7.1 / 10', '~$75,000/year',
        'no ceiling detected', 'Different methodology, different result', '2023 adversarial collaboration', 'Implication for AI',
      ], `${viewport.name}: income/well-being`);
      forbidText(text, ['La paradoja resuelta', 'El conflicto', 'insatisfecho', 'Finlandia', 'España', 'Ingreso anual', 'Bienestar hedónico', 'Colaboración adversarial'], `${viewport.name}: income/well-being`);
      for (const key of ['1', '2', '3', '4']) {
        await income.locator(`[data-tab="${key}"]`).click();
        const panel = income.locator(`[data-panel="${key}"]`);
        if (await panel.getAttribute('hidden') !== null) failures.push(`${viewport.name}: income/well-being tab ${key} did not reveal its panel`);
      }
      await checkPlacement(income, viewport.name, 'income/well-being', 'although they rarely appear as priorities in standard economic metrics', 'Alternative frameworks that try to capture more');
      await checkOverflow(income, viewport.name, 'income/well-being');
      await capture(income, viewport.name, 'income-wellbeing');
    }

    const frameworks = page.locator('[data-demo="03-marcos-alternativos"]');
    if (await frameworks.count() !== 1) failures.push(`${viewport.name}: expected exactly one canonical alternative-frameworks visual`);
    else {
      if (await frameworks.locator('.ma-fw-card').count() !== 4) failures.push(`${viewport.name}: frameworks lost one of four canonical cards`);
      if (await frameworks.locator('.ma-fw-add').count() !== 11) failures.push(`${viewport.name}: frameworks lost canonical added-dimension items`);
      if (await frameworks.locator('.ma-fw-miss').count() !== 12) failures.push(`${viewport.name}: frameworks lost canonical limitation items`);
      if (await frameworks.locator('.en-energy-v').count() !== 0) failures.push(`${viewport.name}: old English frameworks redesign remains`);
      const text = (await frameworks.textContent()) || '';
      requireText(text, [
        'Four alternatives to GDP', 'Human Development Index', 'UNDP · since 1990', 'Adds beyond GDP', 'Still misses',
        'Genuine Progress Indicator', 'Better Life Index', 'OECD · since 2011', 'Gross National Happiness', 'Bhutan · since 1972',
      ], `${viewport.name}: frameworks`);
      forbidText(text, ['Cuatro marcos alternativos', 'Índice de Desarrollo Humano', 'Añade respecto al PIB', 'Sigue sin capturar', 'Felicidad Nacional Bruta'], `${viewport.name}: frameworks`);
      await checkPlacement(frameworks, viewport.name, 'frameworks', 'alternative frameworks show what is lost', 'The next chapter applies this distinction');
      await checkOverflow(frameworks, viewport.name, 'frameworks');
      await capture(frameworks, viewport.name, 'frameworks');
    }

    const previewCards = page.locator('[data-series-preview] .sp-card');
    if (await previewCards.count() !== 1) failures.push(`${viewport.name}: expected exactly one shared GDP/HDI preview, found ${await previewCards.count()}`);
    else if (await previewCards.first().getAttribute('data-sp-title') !== 'GDP vs well-being') failures.push(`${viewport.name}: wrong GDP/HDI preview title`);

    const videos = page.locator('video[data-s5-inline-video-player]');
    if (await videos.count() !== 1) failures.push(`${viewport.name}: expected one native-English Chapter 3 video, found ${await videos.count()}`);
    else {
      const video = videos.first();
      const sourceUrl = new URL((await video.locator('source').first().getAttribute('src')) || '', page.url());
      const posterUrl = new URL((await video.getAttribute('poster')) || '', page.url());
      if (sourceUrl.pathname !== '/en/series/ia-pib-bienestar-energia/03-pib-vs-bienestar.mp4') failures.push(`${viewport.name}: wrong native-English Chapter 3 video ${sourceUrl.pathname}`);
      if (posterUrl.pathname !== '/en/series/ia-pib-bienestar-energia/03-pib-vs-bienestar.jpg') failures.push(`${viewport.name}: wrong native-English Chapter 3 poster ${posterUrl.pathname}`);
    }
    if (await page.locator('audio').count()) failures.push(`${viewport.name}: unexpected inherited Spanish audio`);

    const [clientWidth, scrollWidth] = await page.evaluate(() => [document.documentElement.clientWidth, document.documentElement.scrollWidth]);
    if (scrollWidth > clientWidth + 2) failures.push(`${viewport.name}: page horizontal overflow ${scrollWidth - clientWidth}px`);
    for (const runtimeError of runtimeErrors) failures.push(`${viewport.name}: pageerror: ${runtimeError}`);
    await page.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  for (const failure of [...new Set(failures)]) console.error(failure);
  process.exit(1);
}
console.log('English Energy Chapter 3 fidelity QA passed: canonical article, 3 canonical visuals, interaction, native media, desktop/mobile clean.');
