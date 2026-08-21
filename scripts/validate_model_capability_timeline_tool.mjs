#!/usr/bin/env node
import fs from 'node:fs';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || process.env.S5_BASE_URL || 'http://127.0.0.1:8000';
const failures = [];
const artifactDir = 'artifacts/visual-review';
fs.mkdirSync(artifactDir, { recursive: true });
const cases = [
  { route: '/herramientas/linea-temporal-capacidades-modelos/', locale: 'es' },
  { route: '/en/tools/model-capability-timeline/', locale: 'en' }
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
      const root = page.locator('[data-s5-model-capability-timeline]');
      if (await root.count() !== 1) failures.push(`${spec.route} ${viewport.name}: tool root missing`);
      await page.waitForFunction(() => document.querySelector('[data-s5-model-capability-timeline]')?.dataset.ready === 'true');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 1) failures.push(`${spec.route} ${viewport.name}: page horizontal overflow ${overflow}px`);
      const unlabeled = await page.locator('[data-field]').evaluateAll((nodes) => nodes.filter((node) => !node.getAttribute('aria-label') && (!node.id || !document.querySelector(`label[for="${CSS.escape(node.id)}"]`))).length);
      if (unlabeled) failures.push(`${spec.route} ${viewport.name}: ${unlabeled} unlabeled controls`);
      const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
      if (!jsonLd.some((raw) => { try { return JSON.parse(raw)['@type'] === 'WebApplication'; } catch { return false; } })) failures.push(`${spec.route} ${viewport.name}: WebApplication JSON-LD missing`);

      const title = (await page.locator('[data-output="series-title"]').textContent() || '').toLowerCase();
      if (!title.includes('gpqa')) failures.push(`${spec.route} ${viewport.name}: default GPQA series missing`);
      const latest = (await page.locator('[data-output="latest"]').textContent() || '').trim();
      if (!latest.includes('94') || !latest.includes('6')) failures.push(`${spec.route} ${viewport.name}: default latest GPQA value should be 94.6%`);
      const rows = await page.locator('[data-output="table-body"] tr').count();
      if (rows !== 6) failures.push(`${spec.route} ${viewport.name}: GPQA should render six points, got ${rows}`);
      const sourceCount = await page.locator('[data-output="sources"] li').count();
      if (sourceCount < 4) failures.push(`${spec.route} ${viewport.name}: point-level source coverage is incomplete`);
      const chart = page.locator('[data-output="chart"] svg');
      if (await chart.count() !== 1) failures.push(`${spec.route} ${viewport.name}: SVG timeline missing`);
      const pointCount = await chart.locator('.s5-timeline-point').count();
      if (pointCount !== 6) failures.push(`${spec.route} ${viewport.name}: expected six chart points, got ${pointCount}`);

      await page.locator('[data-field="series"]').selectOption('swe-bench-verified');
      const breakText = (await page.locator('[data-output="breaks"]').textContent() || '').toLowerCase();
      if (spec.locale === 'es' && !breakText.includes('1 cambio')) failures.push(`${spec.route} ${viewport.name}: Spanish protocol break not surfaced`);
      if (spec.locale === 'en' && !breakText.includes('1 explicit')) failures.push(`${spec.route} ${viewport.name}: English protocol break not surfaced`);
      const duplicateNote = (await page.locator('[data-output="duplicate-note"]').textContent() || '').toLowerCase();
      if (spec.locale === 'es' && !duplicateNote.includes('misma generación')) failures.push(`${spec.route} ${viewport.name}: Spanish duplicate-protocol warning missing`);
      if (spec.locale === 'en' && !duplicateNote.includes('same model generation')) failures.push(`${spec.route} ${viewport.name}: English duplicate-protocol warning missing`);
      const gpt5Rows = await page.locator('[data-output="table-body"] tr').evaluateAll((rows) => rows.filter((row) => row.textContent.includes('GPT-5')).length);
      if (gpt5Rows < 2) failures.push(`${spec.route} ${viewport.name}: SWE-bench protocol discontinuity should keep duplicate GPT-5 reports`);

      response = await page.goto(`${base}${spec.route}?series=arc-agi-2`, { waitUntil: 'networkidle' });
      if (!response?.ok()) failures.push(`${spec.route} ${viewport.name}: deep-link failed`);
      const arcTitle = (await page.locator('[data-output="series-title"]').textContent() || '').toLowerCase();
      if (!arcTitle.includes('arc-agi-2')) failures.push(`${spec.route} ${viewport.name}: deep-link series not restored`);
      if ((await page.locator('[data-output="table-body"] tr').count()) !== 3) failures.push(`${spec.route} ${viewport.name}: ARC-AGI-2 should stop at three sourced points`);

      const tableRegion = page.locator('.s5-timeline-table-wrap');
      if ((await tableRegion.getAttribute('role')) !== 'region' || !(await tableRegion.getAttribute('aria-label'))) failures.push(`${spec.route} ${viewport.name}: table scroller must be labelled`);
      if (viewport.width <= 600) {
        const contained = await tableRegion.evaluate((node) => node.scrollWidth > node.clientWidth);
        if (!contained) failures.push(`${spec.route} mobile: data table should retain readable columns inside its own scroller`);
      }
      await page.screenshot({ path: `${artifactDir}/model-capability-timeline-${spec.locale}-${viewport.name}.png`, fullPage: true });
      await page.close();
    }
  }
} finally { await browser.close(); }

if (failures.length) {
  console.error('Model capability timeline browser QA failed:');
  failures.forEach((failure) => console.error(` - ${failure}`));
  process.exit(1);
}
console.log('Model capability timeline browser QA passed: ES/EN, 390/1440, provenance, protocol discontinuity, deep links, accessible controls and contained tables verified.');
