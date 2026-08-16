#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const route = '/en/series/ia-pib-bienestar-energia/01-electricidad-bienestar/';
const failures = [];
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

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
async function checkTabs(root, count, viewport, name) {
  const tabs = root.locator('[data-tab]');
  const panels = root.locator('[data-panel]');
  if (await tabs.count() !== count) failures.push(`${viewport}: ${name} lost canonical ${count}-tab structure`);
  if (await panels.count() !== count) failures.push(`${viewport}: ${name} lost canonical ${count}-panel structure`);
  if (await tabs.count() !== count || await panels.count() !== count) return;
  for (let index = 0; index < count; index += 1) {
    await tabs.nth(index).click();
    if ((await tabs.nth(index).getAttribute('aria-selected')) !== 'true') failures.push(`${viewport}: ${name} tab ${index + 1} did not activate`);
    if (!(await panels.nth(index).isVisible())) failures.push(`${viewport}: ${name} panel ${index + 1} did not become visible`);
  }
  await tabs.nth(0).click();
  await tabs.nth(0).focus();
  await tabs.nth(0).press('ArrowRight');
  if ((await tabs.nth(1).getAttribute('aria-selected')) !== 'true' || !(await panels.nth(1).isVisible())) {
    failures.push(`${viewport}: ${name} keyboard interaction diverged from canonical behavior`);
  }
  await tabs.nth(0).click();
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

    const [pageClientWidth, pageScrollWidth] = await page.evaluate(() => [document.documentElement.clientWidth, document.documentElement.scrollWidth]);
    if (pageScrollWidth > pageClientWidth + 2) failures.push(`${viewport.name}: page overflow ${pageScrollWidth - pageClientWidth}px`);

    const body = await page.locator('body').innerText();
    requireText(body, [
      'Chapter 1 — Electricity and well-being: the real mechanisms',
      'electricity consumption by data centers increased by 17% in 2025',
      'Panel-data analyses covering 47 countries',
      'between 0.64 and 0.94 percentage points',
      'more than thirty percentage points in respiratory-disease indicators',
      'can double or triple yield per hectare',
      'twelve hours of outages every day',
      'from 50 to 200 kWh per capita per year',
      'HDI of 0.9 or higher',
      'at least 4,000 kWh per capita per year',
      '5–6% of annual revenue for large firms',
      'can exceed 20% for small and medium-sized firms',
      'between two and eight hours of electricity per day',
      'between 3% and 15% of annual revenue',
      'The electrification gap can become an AI gap if the first is not resolved.',
      'The four channels that turn electricity into well-being',
      'The relationship between energy and human development is not linear',
      'The real cost of an outage is not the missing kWh',
      'Electricity has no value by itself: its value is what it unlocks',
    ], `${viewport.name}: article`);
    forbidText(body, [
      'Capítulo ', 'Electricidad y bienestar', 'Los cuatro canales', 'Siguiente lectura',
      'Continue the path', 'Electricity enables other systems',
      'The next chapter looks at that physical demand directly.',
    ], `${viewport.name}: article`);

    const mechanism = page.locator('[data-demo="01-mecanismos"]');
    if (await mechanism.count() !== 1) failures.push(`${viewport.name}: expected exactly one canonical mechanisms visual`);
    else {
      if (await mechanism.locator('.elec-dim').count() !== 2) failures.push(`${viewport.name}: mechanisms lost quantity/quality dimensions`);
      if (await mechanism.locator('.elec-channel').count() !== 4) failures.push(`${viewport.name}: mechanisms lost one of four channels`);
      if (await mechanism.locator('.elec-metric').count() !== 4) failures.push(`${viewport.name}: mechanisms lost one of four outcomes`);
      if (await mechanism.locator('[data-tab]').count() !== 0) failures.push(`${viewport.name}: mechanisms reintroduced invented tab interaction`);
      const text = (await mechanism.textContent()) || '';
      requireText(text, ['Electricity supply', 'Quantity', 'Quality', 'Health', 'Logistics and industry', 'Services and education', 'Reduced domestic burden', 'Well-being'], `${viewport.name}: mechanisms`);
      forbidText(text, ['Suministro eléctrico', 'Cantidad', 'Calidad', 'Logística e industria', 'Reducción de carga doméstica', 'Bienestar'], `${viewport.name}: mechanisms`);
      await checkOverflow(mechanism, viewport.name, 'mechanisms');
      await mechanism.screenshot({ path: path.join(outDir, `english-energy-ch1-mechanisms-${viewport.name}.png`), animations: 'disabled' });
    }

    const curve = page.locator('[data-demo="01-kwh-idi-curva"]');
    if (await curve.count() !== 1) failures.push(`${viewport.name}: expected exactly one canonical energy-development curve`);
    else {
      if (await curve.locator('svg').count() !== 1) failures.push(`${viewport.name}: development curve lost canonical SVG`);
      if (await curve.locator('.kic-step').count() !== 4) failures.push(`${viewport.name}: development curve lost four high-return steps`);
      if (await curve.locator('.kic-compare-col').count() !== 2) failures.push(`${viewport.name}: development curve lost low/high marginal comparison`);
      if (await curve.locator('.kic-rule').count() !== 2) failures.push(`${viewport.name}: development curve lost necessary/not-sufficient rules`);
      const text = (await curve.textContent()) || '';
      requireText(text, [
        'The relationship between energy and human development is not linear',
        'The full curve', 'High-return zone', 'Diminishing returns', '4,000 kWh threshold',
        '+1% energy', '+0.64–0.94%', 'well-being · 47 countries',
        '0 – 50 kWh', '50 – 100 kWh', '100 – 200 kWh', '200 – 400 kWh',
        '23% more likely to enter the labor market',
        'Empirical threshold: 4,000 kWh/year',
        'No country with HDI ≥ 0.9 consumes less than 4,000 kWh/capita/year',
        'Not every country above 4,000 kWh has reached HDI ≥ 0.9',
        'Direct implication for AI',
      ], `${viewport.name}: development curve`);
      forbidText(text, ['La curva completa', 'Zona de alta rentabilidad', 'Rendimientos decrecientes', 'bienestar · 47 países', 'Condición necesaria', 'Implicación directa para la IA'], `${viewport.name}: development curve`);
      await checkTabs(curve, 4, viewport.name, 'development curve');
      await checkOverflow(curve, viewport.name, 'development curve');
      await curve.screenshot({ path: path.join(outDir, `english-energy-ch1-development-curve-${viewport.name}.png`), animations: 'disabled' });
    }

    const outage = page.locator('[data-demo="01-costes-cortes"]');
    if (await outage.count() !== 1) failures.push(`${viewport.name}: expected exactly one canonical outage-cost visual`);
    else {
      if (await outage.locator('.cc2-card').count() !== 3) failures.push(`${viewport.name}: outage-cost visual lost three canonical impact cards`);
      if (await outage.locator('[data-tab]').count() !== 0) failures.push(`${viewport.name}: outage-cost visual still has invented English tabs`);
      const text = (await outage.textContent()) || '';
      requireText(text, ['The real cost of an outage is not the missing kWh', 'Large firm', '5 – 6%', 'Small and medium-sized firm', '20%+', 'Healthcare', 'Irreversible', 'Source: World Bank, Enterprise Surveys.'], `${viewport.name}: outage costs`);
      forbidText(text, ['El coste real de un corte', 'Gran empresa', 'Pequeña y mediana empresa', 'Sector salud', 'Fuente: Banco Mundial'], `${viewport.name}: outage costs`);
      await checkOverflow(outage, viewport.name, 'outage costs');
      await outage.screenshot({ path: path.join(outDir, `english-energy-ch1-outage-costs-${viewport.name}.png`), animations: 'disabled' });
    }

    const infra = page.locator('[data-demo="01-electricidad-infraestructura"]');
    if (await infra.count() !== 1) failures.push(`${viewport.name}: expected exactly one canonical enabling-infrastructure visual`);
    else {
      if (await infra.locator('.ei-col').count() !== 3) failures.push(`${viewport.name}: enabling-infrastructure visual lost one of three analogies`);
      if (await infra.locator('.ei-item').count() !== 12) failures.push(`${viewport.name}: enabling-infrastructure visual lost canonical downstream systems`);
      if (await infra.locator('[data-tab]').count() !== 0) failures.push(`${viewport.name}: enabling-infrastructure visual still has invented English tabs`);
      const text = (await infra.textContent()) || '';
      requireText(text, ['Electricity has no value by itself: its value is what it unlocks', 'Electricity', 'Drinking water', 'Transport', 'Healthcare cold chain', 'Reduced domestic burden', 'With 40% network losses', 'Cut off for half the year'], `${viewport.name}: enabling infrastructure`);
      forbidText(text, ['La electricidad no tiene valor', 'Agua potable', 'Transporte', 'Cadena de frío sanitaria', 'Reducción de carga doméstica', 'Con pérdidas del 40%'], `${viewport.name}: enabling infrastructure`);
      await checkOverflow(infra, viewport.name, 'enabling infrastructure');
      await infra.screenshot({ path: path.join(outDir, `english-energy-ch1-enabling-infrastructure-${viewport.name}.png`), animations: 'disabled' });
    }

    const positions = await page.evaluate(() => {
      const text = (document.querySelector('.md-content__inner') || document.body).innerText;
      return {
        mechanismBefore: text.indexOf("Electricity does not produce well-being directly."),
        mechanismVisual: text.indexOf('The four channels that turn electricity into well-being'),
        mechanismAfter: text.indexOf('The most immediate impact occurs in healthcare.'),
        curveBefore: text.indexOf('institutional, educational and distributive factors determine whether the energy potential translates into broadly shared well-being.'),
        curveVisual: text.indexOf('The relationship between energy and human development is not linear'),
        curveAfter: text.indexOf('What happens when supply fails'),
        outageBefore: text.indexOf('families unable to pay for backup alternatives.'),
        outageVisual: text.indexOf('The real cost of an outage is not the missing kWh'),
        outageAfter: text.indexOf('Electricity supply as enabling infrastructure'),
        infraBefore: text.indexOf('critical services cannot operate on it.'),
        infraVisual: text.indexOf('Electricity has no value by itself: its value is what it unlocks'),
        infraAfter: text.indexOf('What matters is not only how much electricity is available'),
      };
    });
    for (const [name, before, visual, after] of [
      ['mechanisms', positions.mechanismBefore, positions.mechanismVisual, positions.mechanismAfter],
      ['development curve', positions.curveBefore, positions.curveVisual, positions.curveAfter],
      ['outage costs', positions.outageBefore, positions.outageVisual, positions.outageAfter],
      ['enabling infrastructure', positions.infraBefore, positions.infraVisual, positions.infraAfter],
    ]) {
      if (!(before >= 0 && visual > before && after > visual)) failures.push(`${viewport.name}: ${name} moved away from canonical article hook`);
    }

    const videos = page.locator('video[data-s5-inline-video-player]');
    if (await videos.count() !== 1) failures.push(`${viewport.name}: expected one native-English chapter video, found ${await videos.count()}`);
    else {
      const video = videos.first();
      const sourceUrl = new URL((await video.locator('source').first().getAttribute('src')) || '', page.url());
      const posterUrl = new URL((await video.getAttribute('poster')) || '', page.url());
      if (sourceUrl.pathname !== '/en/series/ia-pib-bienestar-energia/01-electricidad-bienestar.mp4') failures.push(`${viewport.name}: wrong native-English video ${sourceUrl.pathname}`);
      if (posterUrl.pathname !== '/en/series/ia-pib-bienestar-energia/01-electricidad-bienestar.jpg') failures.push(`${viewport.name}: wrong native-English poster ${posterUrl.pathname}`);
    }

    if (runtimeErrors.length) failures.push(`${viewport.name}: runtime errors: ${runtimeErrors.join(' | ')}`);
    await page.screenshot({ path: path.join(outDir, `english-energy-ch1-${viewport.name}.png`), fullPage: true, animations: 'disabled' });
    await page.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error('English Energy chapter 1 QA failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('English Energy chapter 1 QA passed: canonical prose evidence, all four visuals, native media, interactions, hook placement and desktop/mobile layout are faithful.');
