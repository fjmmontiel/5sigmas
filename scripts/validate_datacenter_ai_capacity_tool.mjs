#!/usr/bin/env node
import fs from 'node:fs';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || process.env.S5_BASE_URL || 'http://127.0.0.1:8000';
const failures = [];
const artifactDir = 'artifacts/visual-review';
fs.mkdirSync(artifactDir, { recursive: true });
const cases = [
  { route: '/herramientas/capacidad-datacenter-ia/', locale: 'es', coolingWord: 'Refrigeración' },
  { route: '/en/tools/datacenter-ai-capacity/', locale: 'en', coolingWord: 'cooling' }
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
      await page.waitForFunction(() => document.querySelector('[data-s5-datacenter-ai-capacity]')?.dataset.ready === 'true');
      const root = page.locator('[data-s5-datacenter-ai-capacity]');
      if (await root.count() !== 1) failures.push(`${spec.route} ${viewport.name}: tool root missing`);

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

      if (await page.locator('.s5-dc-constraint').count() !== 4) failures.push(`${spec.route} ${viewport.name}: expected four independent constraint bars`);
      if (await page.locator('.s5-dc-constraint--active').count() < 1) failures.push(`${spec.route} ${viewport.name}: active bottleneck not highlighted`);

      const active = (await page.locator('[data-output="active-accelerators"]').textContent() || '').trim();
      const facility = (await page.locator('[data-output="facility-draw"]').textContent() || '').trim();
      const training = (await page.locator('[data-output="training-throughput"]').first().textContent() || '').trim();
      if (!/[0-9]/.test(active) || !/[0-9]/.test(facility) || !/[0-9]/.test(training)) failures.push(`${spec.route} ${viewport.name}: default outputs not rendered`);

      const defaultActive = active;
      const defaultFacility = facility;
      const defaultTraining = training;
      await page.locator('[data-field="mfuPct"]').fill('22.5');
      const halfTraining = (await page.locator('[data-output="training-throughput"]').first().textContent() || '').trim();
      const activeAfterMfu = (await page.locator('[data-output="active-accelerators"]').textContent() || '').trim();
      const facilityAfterMfu = (await page.locator('[data-output="facility-draw"]').textContent() || '').trim();
      if (halfTraining === defaultTraining) failures.push(`${spec.route} ${viewport.name}: MFU change did not affect training throughput`);
      if (activeAfterMfu !== defaultActive || facilityAfterMfu !== defaultFacility) failures.push(`${spec.route} ${viewport.name}: MFU must not alter physical capacity or electrical draw`);

      await page.locator('[data-field="rackCoolingKW"]').fill('5');
      const bottleneck = (await page.locator('[data-output="bottleneck"]').textContent() || '').trim();
      if (!bottleneck.toLowerCase().includes(spec.coolingWord.toLowerCase())) failures.push(`${spec.route} ${viewport.name}: low rack cooling did not become the visible bottleneck`);

      await page.locator('[data-field="measuredTokensPerSecPerAccelerator"]').fill('250');
      const inferenceTokens = (await page.locator('[data-output="inference-tokens"]').textContent() || '').trim();
      const inferenceCompletions = (await page.locator('[data-output="inference-completions"]').textContent() || '').trim();
      if (!/[0-9]/.test(inferenceTokens) || !/[0-9]/.test(inferenceCompletions)) failures.push(`${spec.route} ${viewport.name}: measured inference throughput was not aggregated`);

      response = await page.goto(`${base}${spec.route}?hw=h200-sxm-bf16&fac=20&pue=1.15&res=5&r=100&inst=32&rp=45&rc=40&pwr=75&it=20&mfu=50&tok=300&out=256&peak=989.5&tdp=700`, { waitUntil: 'networkidle' });
      if (!response?.ok()) failures.push(`${spec.route} ${viewport.name}: deep-link failed`);
      await page.waitForFunction(() => document.querySelector('[data-s5-datacenter-ai-capacity]')?.dataset.ready === 'true');
      if (await page.locator('[data-field="facilityMW"]').inputValue() !== '20' || await page.locator('[data-field="racks"]').inputValue() !== '100' || await page.locator('[data-field="measuredTokensPerSecPerAccelerator"]').inputValue() !== '300') failures.push(`${spec.route} ${viewport.name}: deep-link state not restored`);

      const sourceHrefs = await page.locator('.s5-note-feature__meta a').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')));
      if (!sourceHrefs.includes('https://www.nvidia.com/en-us/data-center/h200/') || !sourceHrefs.includes('https://docs.nvidia.com/dgx-pdf/nvidia-dgx-superpod-data-center-best-practices-with-dgx-b200.pdf') || !sourceHrefs.includes('https://www.thegreengrid.org/node/372')) failures.push(`${spec.route} ${viewport.name}: methodology source links missing`);

      const kpis = await page.locator('.s5-datacenter-capacity-kpis > div').evaluateAll((nodes) => nodes.map((node) => {
        const box = node.getBoundingClientRect();
        return { top: box.top, left: box.left };
      }));
      if (kpis.length !== 4) failures.push(`${spec.route} ${viewport.name}: expected four result KPIs`);
      if (viewport.width >= 1000 && kpis.length === 4 && Math.max(...kpis.map((box) => box.top)) - Math.min(...kpis.map((box) => box.top)) > 2) failures.push(`${spec.route} desktop: KPI row geometry is uneven`);
      if (viewport.width <= 520 && kpis.length === 4 && Math.max(...kpis.map((box) => box.left)) - Math.min(...kpis.map((box) => box.left)) > 2) failures.push(`${spec.route} mobile: KPI cards must stack without side-by-side compression`);

      await page.screenshot({ path: `${artifactDir}/datacenter-ai-capacity-${spec.locale}-${viewport.name}.png`, fullPage: true });
      await page.close();
    }
  }
} finally { await browser.close(); }

if (failures.length) {
  console.error('Datacenter AI capacity browser QA failed:');
  failures.forEach((failure) => console.error(` - ${failure}`));
  process.exit(1);
}
console.log('Datacenter AI capacity browser QA passed: ES/EN, 390/1440, independent constraints, MFU/power separation, measured inference mapping, deep links, accessible controls, provenance and responsive geometry verified.');
