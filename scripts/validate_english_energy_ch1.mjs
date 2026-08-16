#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const route = '/en/series/ia-pib-bienestar-energia/01-electricidad-bienestar/';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });
const failures = [];
const browser = await chromium.launch({ headless: true });

function requireText(text, tokens, prefix) {
  for (const token of tokens) if (!text.includes(token)) failures.push(`${prefix}: missing ${JSON.stringify(token)}`);
}
function forbidText(text, tokens, prefix) {
  for (const token of tokens) if (text.includes(token)) failures.push(`${prefix}: forbidden/leaked ${JSON.stringify(token)}`);
}
async function checkOverflow(root, viewport, name) {
  const dims = await root.evaluate((node) => [node.clientWidth, node.scrollWidth]);
  if (dims[1] > dims[0] + 2) failures.push(`${viewport}: ${name} internal overflow ${dims[1] - dims[0]}px`);
}

async function checkCurveTabs(root, viewport) {
  const tabs = root.locator('.kic-tab');
  const panels = root.locator('.kic-panel');
  if (await tabs.count() !== 4) failures.push(`${viewport}: development curve lost canonical four tabs`);
  if (await panels.count() !== 4) failures.push(`${viewport}: development curve lost canonical four panels`);
  if (await tabs.count() !== 4 || await panels.count() !== 4) return;

  for (let index = 0; index < 4; index += 1) {
    await tabs.nth(index).click();
    if ((await tabs.nth(index).getAttribute('aria-selected')) !== 'true') failures.push(`${viewport}: curve tab ${index + 1} did not activate`);
    if (!(await panels.nth(index).isVisible())) failures.push(`${viewport}: curve panel ${index + 1} did not become visible`);
  }

  await tabs.nth(0).click();
  await tabs.nth(0).focus();
  await tabs.nth(0).press('ArrowRight');
  if ((await tabs.nth(1).getAttribute('aria-selected')) !== 'true' || !(await panels.nth(1).isVisible())) {
    failures.push(`${viewport}: curve keyboard interaction diverged from canonical behavior`);
  }
  await tabs.nth(0).click();
}

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

    const pageDims = await page.evaluate(() => [document.documentElement.clientWidth, document.documentElement.scrollWidth]);
    if (pageDims[1] > pageDims[0] + 2) failures.push(`${viewport.name}: page overflow ${pageDims[1] - pageDims[0]}px`);

    const body = (await page.locator('body').textContent()) || '';
    requireText(body, [
      'Chapter 1 — Electricity and well-being: the real mechanisms',
      'electricity consumption by data centers rose 17% in 2025',
      '47 countries', '0.64 and 0.94 percentage points',
      '50 to 200 kWh per capita per year', '4,000 kWh per year',
      '5–6% of annual revenue', 'can exceed 20%',
      '500–1,000 kWh per capita per year', 'between two and eight hours of electricity per day',
      'between 3% and 15% of annual revenue',
      'The electrification gap can become an AI gap',
      'Dinkelman, T. (2011)', 'World Bank / ESMAP (2015)',
    ], `${viewport.name}: article`);
    forbidText(body, [
      'Chapter 2 will appear in English as soon as',
      'Electricity is best understood as infrastructure. It creates value by making other systems dependable.',
    ], `${viewport.name}: article`);

    const mechanisms = page.locator('[data-demo="01-mecanismos"]');
    if (await mechanisms.count() !== 1) {
      failures.push(`${viewport.name}: expected exactly one canonical mechanisms visual`);
    } else {
      if (await mechanisms.locator('.elec-source').count() !== 1) failures.push(`${viewport.name}: mechanisms lost canonical source block`);
      if (await mechanisms.locator('.elec-dim').count() !== 2) failures.push(`${viewport.name}: mechanisms lost quantity/quality dimensions`);
      if (await mechanisms.locator('.elec-channel').count() !== 4) failures.push(`${viewport.name}: mechanisms lost one of four channels`);
      if (await mechanisms.locator('.elec-metric').count() !== 4) failures.push(`${viewport.name}: mechanisms lost one of four well-being outcomes`);
      const text = (await mechanisms.textContent()) || '';
      requireText(text, [
        'The four channels that turn electricity into well-being', 'Electricity supply', 'Quantity', 'Quality',
        'Reliability · Stability · Cost of outages', 'Health', 'Logistics and industry', 'Services and education',
        'Reduced domestic workload', 'Well-being', 'Life expectancy', 'Infant mortality', 'Productivity', 'Access to services',
      ], `${viewport.name}: mechanisms`);
      forbidText(text, ['Suministro eléctrico', 'Reducción de carga doméstica', 'Esperanza de vida'], `${viewport.name}: mechanisms`);
      await checkOverflow(mechanisms, viewport.name, 'mechanisms');
      await mechanisms.screenshot({ path: path.join(outDir, `english-energy-ch1-mechanisms-${viewport.name}.png`), animations: 'disabled' });
    }

    const curve = page.locator('[data-demo="01-kwh-idi-curva"]');
    if (await curve.count() !== 1) {
      failures.push(`${viewport.name}: expected exactly one canonical development curve`);
    } else {
      if (await curve.locator('.kic-tab').count() !== 4) failures.push(`${viewport.name}: curve lost four canonical tabs`);
      if (await curve.locator('.kic-step').count() !== 4) failures.push(`${viewport.name}: curve lost four high-return access steps`);
      if (await curve.locator('.kic-compare-col').count() !== 2) failures.push(`${viewport.name}: curve lost diminishing-return comparison`);
      if (await curve.locator('.kic-rule').count() !== 2) failures.push(`${viewport.name}: curve lost two threshold rules`);
      const text = (await curve.textContent()) || '';
      requireText(text, [
        'The relationship between energy and human development is not linear', 'The full curve', 'High-return zone',
        'Diminishing returns', '4,000 kWh threshold', '+1% energy', '+0.64–0.94%', 'well-being · 47 countries',
        'Zone 0–400 kWh/year', '0 – 50 kWh', '50 – 100 kWh', '100 – 200 kWh', '200 – 400 kWh',
        '23% more likely to enter the labor market', 'Zone 400–4,000 kWh/year',
        'Empirical threshold: 4,000 kWh/year', 'No country with HDI ≥ 0.9 has less than 4,000 kWh/capita/year',
        'Direct implication for AI',
      ], `${viewport.name}: curve`);
      forbidText(text, ['La curva completa', 'Zona de alta rentabilidad', 'bienestar · 47 países', 'Condición necesaria'], `${viewport.name}: curve`);
      await checkCurveTabs(curve, viewport.name);
      await checkOverflow(curve, viewport.name, 'development curve');
      await curve.screenshot({ path: path.join(outDir, `english-energy-ch1-curve-${viewport.name}.png`), animations: 'disabled' });
    }

    const outages = page.locator('[data-demo="01-costes-cortes"]');
    if (await outages.count() !== 1) {
      failures.push(`${viewport.name}: expected exactly one canonical outage-cost visual`);
    } else {
      if (await outages.locator('.cc2-card').count() !== 3) failures.push(`${viewport.name}: outage visual lost canonical three consequence cards`);
      const text = (await outages.textContent()) || '';
      requireText(text, [
        'The real cost of a supply outage is not the lost kWh', 'Large firm', '5 – 6%', 'Small and medium-sized firm',
        '20%+', 'Healthcare', 'Irreversible', 'clinical outcomes', 'World Bank, Enterprise Surveys',
      ], `${viewport.name}: outages`);
      forbidText(text, ['Gran empresa', 'Pequeña y mediana empresa', 'Sector salud'], `${viewport.name}: outages`);
      await checkOverflow(outages, viewport.name, 'outage-cost visual');
      await outages.screenshot({ path: path.join(outDir, `english-energy-ch1-outages-${viewport.name}.png`), animations: 'disabled' });
    }

    const infrastructure = page.locator('[data-demo="01-electricidad-infraestructura"]');
    if (await infrastructure.count() !== 1) {
      failures.push(`${viewport.name}: expected exactly one canonical infrastructure visual`);
    } else {
      if (await infrastructure.locator('.ei-col').count() !== 3) failures.push(`${viewport.name}: infrastructure visual lost canonical three infrastructure columns`);
      if (await infrastructure.locator('.ei-item').count() !== 12) failures.push(`${viewport.name}: infrastructure visual lost canonical twelve enabled-system items`);
      if (await infrastructure.locator('.ei-col-limit').count() !== 3) failures.push(`${viewport.name}: infrastructure visual lost canonical three quality-limit examples`);
      const text = (await infrastructure.textContent()) || '';
      requireText(text, [
        'Electricity has no value by itself: its value is in what it unlocks', 'Electricity', 'Drinking water', 'Transport',
        'Healthcare cold chain', 'Digital connectivity', 'Reduced domestic workload', 'Access to markets',
        'With 40% losses in the network', 'Cut off for half the year',
        'Supply quality is as decisive as quantity',
      ], `${viewport.name}: infrastructure`);
      forbidText(text, ['Agua potable', 'Reducción de carga doméstica', 'Acceso a mercados'], `${viewport.name}: infrastructure`);
      await checkOverflow(infrastructure, viewport.name, 'infrastructure visual');
      await infrastructure.screenshot({ path: path.join(outDir, `english-energy-ch1-infrastructure-${viewport.name}.png`), animations: 'disabled' });
    }

    const positions = await page.evaluate(() => {
      const bodyText = (document.querySelector('.md-content__inner') || document.body).innerText;
      return {
        mechanismsBefore: bodyText.indexOf('Electricity does not produce well-being directly'),
        mechanisms: bodyText.indexOf('The four channels that turn electricity into well-being'),
        mechanismsAfter: bodyText.indexOf('The most immediate impact occurs in healthcare'),
        curveBefore: bodyText.indexOf('The upper end of the distribution adds another perspective'),
        curve: bodyText.indexOf('The relationship between energy and human development is not linear'),
        curveAfter: bodyText.indexOf('What happens when supply fails'),
        outagesBefore: bodyText.indexOf('For households, prolonged outages in summer or winter'),
        outages: bodyText.indexOf('The real cost of a supply outage is not the lost kWh'),
        outagesAfter: bodyText.indexOf('Electricity supply as enabling infrastructure'),
        infrastructureBefore: bodyText.indexOf('A drinking-water system has no value if the distribution network loses 40%'),
        infrastructure: bodyText.indexOf('Electricity has no value by itself: its value is in what it unlocks'),
        infrastructureAfter: bodyText.indexOf('What matters is not only how much electricity is available'),
      };
    });
    for (const [name, before, visual, after] of [
      ['mechanisms', positions.mechanismsBefore, positions.mechanisms, positions.mechanismsAfter],
      ['curve', positions.curveBefore, positions.curve, positions.curveAfter],
      ['outages', positions.outagesBefore, positions.outages, positions.outagesAfter],
      ['infrastructure', positions.infrastructureBefore, positions.infrastructure, positions.infrastructureAfter],
    ]) {
      if (!(before >= 0 && visual > before && after > visual)) failures.push(`${viewport.name}: ${name} visual moved away from its canonical article hook`);
    }

    if (runtimeErrors.length) failures.push(`${viewport.name}: runtime errors: ${runtimeErrors.join(' | ')}`);
    await page.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error('English Energy Chapter 1 QA failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('English Energy Chapter 1 QA passed: canonical article evidence and all four chapter visuals are faithful, correctly placed and overflow-clean on desktop/mobile.');
