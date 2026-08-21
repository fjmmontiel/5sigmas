#!/usr/bin/env node
import fs from 'node:fs';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || process.env.S5_BASE_URL || 'http://127.0.0.1:8000';
const failures = [];
const artifactDir = 'artifacts/visual-review';
fs.mkdirSync(artifactDir, { recursive: true });
const cases = [
  { route: '/herramientas/leyes-escalado/', locale: 'es' },
  { route: '/en/tools/scaling-laws/', locale: 'en' }
];
const viewports = [
  { width: 390, height: 844, name: 'mobile' },
  { width: 1440, height: 1100, name: 'desktop' }
];

const browser = await chromium.launch({ headless: true });
try {
  for (const spec of cases) {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport });
      let response = await page.goto(`${base}${spec.route}`, { waitUntil: 'networkidle' });
      if (!response?.ok()) { failures.push(`${spec.route} ${viewport.name}: HTTP ${response?.status() ?? 'none'}`); await page.close(); continue; }
      const root = page.locator('[data-s5-scaling-laws]');
      if (await root.count() !== 1) failures.push(`${spec.route} ${viewport.name}: tool root missing`);
      await page.waitForFunction(() => document.querySelector('[data-s5-scaling-laws]')?.dataset.ready === 'true');

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 1) failures.push(`${spec.route} ${viewport.name}: page horizontal overflow ${overflow}px`);
      const unlabeled = await page.locator('[data-field]').evaluateAll((nodes) => nodes.filter((node) => !node.getAttribute('aria-label') && (!node.id || !document.querySelector(`label[for="${CSS.escape(node.id)}"]`))).length);
      if (unlabeled) failures.push(`${spec.route} ${viewport.name}: ${unlabeled} unlabeled controls`);
      const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
      if (!jsonLd.some((raw) => { try { return JSON.parse(raw)['@type'] === 'WebApplication'; } catch { return false; } })) failures.push(`${spec.route} ${viewport.name}: WebApplication JSON-LD missing`);

      const nOpt = (await page.locator('[data-output="optimal-params"]').textContent() || '').trim();
      const dOpt = (await page.locator('[data-output="optimal-tokens"]').textContent() || '').trim();
      if (!/[0-9]/.test(nOpt) || !/[0-9]/.test(dOpt)) failures.push(`${spec.route} ${viewport.name}: optimum allocation not rendered`);
      const pExp = Number((await page.locator('[data-output="parameter-exponent"]').textContent() || '').replace(',', '.'));
      const dExp = Number((await page.locator('[data-output="token-exponent"]').textContent() || '').replace(',', '.'));
      if (Math.abs(pExp - 0.452) > 0.003 || Math.abs(dExp - 0.548) > 0.003) failures.push(`${spec.route} ${viewport.name}: default compute elasticities incorrect`);
      if (await page.locator('[data-output="chart"] svg').count() !== 1) failures.push(`${spec.route} ${viewport.name}: allocation SVG missing`);
      if (await page.locator('.s5-scaling-marker').count() !== 2) failures.push(`${spec.route} ${viewport.name}: optimum/current markers missing`);

      const sensitivity = page.locator('details').filter({ has: page.locator('[data-field="alpha"]') });
      await sensitivity.evaluate((element) => { element.open = true; });
      await page.locator('[data-field="alpha"]').fill('0.20');
      await page.locator('[data-field="beta"]').fill('0.40');
      const changedP = Number((await page.locator('[data-output="parameter-exponent"]').textContent() || '').replace(',', '.'));
      const changedD = Number((await page.locator('[data-output="token-exponent"]').textContent() || '').replace(',', '.'));
      if (Math.abs(changedP - 0.667) > 0.003 || Math.abs(changedD - 0.333) > 0.003) failures.push(`${spec.route} ${viewport.name}: exponent sensitivity not reflected`);

      response = await page.goto(`${base}${spec.route}?n=13&d=260&c=4&a=0.31&b=0.29`, { waitUntil: 'networkidle' });
      if (!response?.ok()) failures.push(`${spec.route} ${viewport.name}: deep-link failed`);
      await page.waitForFunction(() => document.querySelector('[data-s5-scaling-laws]')?.dataset.ready === 'true');
      const restored = await page.locator('[data-field="parametersB"]').inputValue();
      const restoredBudget = await page.locator('[data-field="budgetMultiplier"]').inputValue();
      if (restored !== '13' || restoredBudget !== '4') failures.push(`${spec.route} ${viewport.name}: deep-link state not restored`);

      const sourceHrefs = await page.locator('.s5-note-feature__meta a').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')));
      if (!sourceHrefs.includes('https://arxiv.org/abs/2203.15556') || !sourceHrefs.includes('https://arxiv.org/abs/2001.08361')) failures.push(`${spec.route} ${viewport.name}: primary-source links missing`);
      if (viewport.width <= 520) {
        const chartHost = page.locator('.s5-scaling-chart');
        const contained = await chartHost.evaluate((node) => node.scrollWidth > node.clientWidth && document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
        if (!contained) failures.push(`${spec.route} mobile: chart should scroll inside its own container without page overflow`);
      }

      await page.screenshot({ path: `${artifactDir}/scaling-laws-${spec.locale}-${viewport.name}.png`, fullPage: true });
      await page.close();
    }
  }
} finally { await browser.close(); }

if (failures.length) {
  console.error('Scaling-laws explorer browser QA failed:');
  failures.forEach((failure) => console.error(` - ${failure}`));
  process.exit(1);
}
console.log('Scaling-laws browser QA passed: ES/EN, 390/1440, deep links, sensitivity controls, accessible inputs, provenance and contained chart verified.');
