#!/usr/bin/env node
import fs from 'node:fs';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || process.env.S5_BASE_URL || 'http://127.0.0.1:8000';
const failures = [];
const artifactDir = 'artifacts/visual-review';
fs.mkdirSync(artifactDir, { recursive: true });
const cases = [
  { route: '/herramientas/computo-energia-entrenamiento/', locale: 'es' },
  { route: '/en/tools/training-compute-energy/', locale: 'en' }
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
      const root = page.locator('[data-s5-training-compute-energy]');
      if (await root.count() !== 1) failures.push(`${spec.route} ${viewport.name}: tool root missing`);
      await page.waitForFunction(() => document.querySelector('[data-s5-training-compute-energy]')?.dataset.ready === 'true');

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 1) failures.push(`${spec.route} ${viewport.name}: page horizontal overflow ${overflow}px`);
      const unlabeled = await page.locator('[data-field]').evaluateAll((nodes) => nodes.filter((node) => !node.getAttribute('aria-label') && (!node.id || !document.querySelector(`label[for="${CSS.escape(node.id)}"]`))).length);
      if (unlabeled) failures.push(`${spec.route} ${viewport.name}: ${unlabeled} unlabeled controls`);
      const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
      if (!jsonLd.some((raw) => { try { return JSON.parse(raw)['@type'] === 'WebApplication'; } catch { return false; } })) failures.push(`${spec.route} ${viewport.name}: WebApplication JSON-LD missing`);

      const summaryBoxes = await page.locator('.s5-tool-summary-strip > div').evaluateAll((nodes) => nodes.map((node) => {
        const box = node.getBoundingClientRect();
        return { top: box.top, left: box.left };
      }));
      if (summaryBoxes.length !== 4) failures.push(`${spec.route} ${viewport.name}: expected four summary items`);
      if (viewport.width >= 1000 && summaryBoxes.length === 4 && Math.max(...summaryBoxes.map((box) => box.top)) - Math.min(...summaryBoxes.map((box) => box.top)) > 2) failures.push(`${spec.route} desktop: summary must remain on one row`);
      if (viewport.width <= 520 && summaryBoxes.length === 4 && Math.max(...summaryBoxes.map((box) => box.left)) - Math.min(...summaryBoxes.map((box) => box.left)) > 2) failures.push(`${spec.route} mobile: summary items must stack`);

      const coverage = (await page.locator('[data-output="coverage"]').textContent() || '').trim();
      const facilityEnergy = (await page.locator('[data-output="scheduled-energy"]').textContent() || '').trim();
      const duration = (await page.locator('[data-output="estimated-duration"]').textContent() || '').trim();
      if (!/[0-9]/.test(coverage) || !/[0-9]/.test(facilityEnergy) || !/[0-9]/.test(duration)) failures.push(`${spec.route} ${viewport.name}: default outputs not rendered`);
      if (await page.locator('.s5-energy-breakdown__row').count() !== 3) failures.push(`${spec.route} ${viewport.name}: energy decomposition must have three components`);

      const defaultPower = (await page.locator('[data-output="facility-power"]').textContent() || '').trim();
      await page.locator('[data-field="mfuPct"]').fill('22.5');
      const slowerDuration = (await page.locator('[data-output="estimated-duration"]').textContent() || '').trim();
      const powerAfterMfu = (await page.locator('[data-output="facility-power"]').textContent() || '').trim();
      if (slowerDuration === duration) failures.push(`${spec.route} ${viewport.name}: MFU change did not affect estimated duration`);
      if (powerAfterMfu !== defaultPower) failures.push(`${spec.route} ${viewport.name}: MFU must not implicitly change electrical power`);

      await page.locator('[data-field="pue"]').fill('1');
      const overheadMetric = await page.locator('.s5-energy-breakdown__row').nth(2).locator('strong').textContent();
      if (!/0([,.]0)?%/.test(overheadMetric || '')) failures.push(`${spec.route} ${viewport.name}: PUE=1 should remove facility overhead`);

      response = await page.goto(`${base}${spec.route}?hw=h100-sxm-bf16&g=512&h=360&mfu=50&pwr=80&it=10&pue=1.15&n=34&d=680&k=6&peak=989&tdp=700`, { waitUntil: 'networkidle' });
      if (!response?.ok()) failures.push(`${spec.route} ${viewport.name}: deep-link failed`);
      await page.waitForFunction(() => document.querySelector('[data-s5-training-compute-energy]')?.dataset.ready === 'true');
      if (await page.locator('[data-field="gpus"]').inputValue() !== '512' || await page.locator('[data-field="parametersB"]').inputValue() !== '34') failures.push(`${spec.route} ${viewport.name}: deep-link state not restored`);

      const sourceHrefs = await page.locator('.s5-note-feature__meta a').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')));
      if (!sourceHrefs.includes('https://www.nvidia.com/en-us/data-center/h100/') || !sourceHrefs.includes('https://arxiv.org/abs/2203.15556') || !sourceHrefs.includes('https://www.thegreengrid.org/node/372')) failures.push(`${spec.route} ${viewport.name}: methodology source links missing`);

      const kpis = await page.locator('.s5-training-energy-kpis > div').evaluateAll((nodes) => nodes.map((node) => {
        const box = node.getBoundingClientRect();
        return { top: box.top, right: box.right, bottom: box.bottom, left: box.left };
      }));
      if (kpis.length !== 4) failures.push(`${spec.route} ${viewport.name}: expected four result KPIs`);
      if (viewport.width >= 1000 && kpis.length === 4 && Math.max(...kpis.map((box) => box.top)) - Math.min(...kpis.map((box) => box.top)) > 2) failures.push(`${spec.route} desktop: KPI row geometry is uneven`);

      await page.screenshot({ path: `${artifactDir}/training-compute-energy-${spec.locale}-${viewport.name}.png`, fullPage: true });
      await page.close();
    }
  }
} finally { await browser.close(); }

if (failures.length) {
  console.error('Training compute/energy browser QA failed:');
  failures.forEach((failure) => console.error(` - ${failure}`));
  process.exit(1);
}
console.log('Training compute/energy browser QA passed: ES/EN, 390/1440, deep links, MFU/power separation, PUE decomposition, accessible controls, provenance and responsive geometry verified.');
