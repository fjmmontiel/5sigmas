#!/usr/bin/env node

import fs from 'node:fs';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const failures = [];
const browser = await chromium.launch({ headless: true });
const artifactDir = 'artifacts/visual-review';
fs.mkdirSync(artifactDir, { recursive: true });

const cases = [
  { route: '/herramientas/precio-rendimiento-modelos/', locale: 'es' },
  { route: '/en/tools/model-price-performance/', locale: 'en' }
];
const viewports = [
  { width: 390, height: 844, name: 'mobile' },
  { width: 1440, height: 1100, name: 'desktop' }
];

for (const spec of cases) {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    const response = await page.goto(`${base}${spec.route}`, { waitUntil: 'networkidle' });
    if (!response?.ok()) {
      failures.push(`${spec.route} ${viewport.name}: HTTP ${response?.status() ?? 'no response'}`);
      await page.close();
      continue;
    }

    const root = page.locator('[data-s5-model-explorer]');
    if (await root.count() !== 1) failures.push(`${spec.route} ${viewport.name}: explorer root missing`);
    const h1 = (await page.locator('h1').first().textContent() || '').trim();
    if (!h1) failures.push(`${spec.route} ${viewport.name}: H1 missing`);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 1) failures.push(`${spec.route} ${viewport.name}: page horizontal overflow ${overflow}px`);

    const unlabeled = await page.locator('[data-s5-tool-form] input:not([aria-label]), [data-s5-tool-form] select:not([aria-label])').evaluateAll((nodes) => nodes.filter((node) => {
      if (!node.id) return true;
      return !document.querySelector(`label[for="${CSS.escape(node.id)}"]`);
    }).length);
    if (unlabeled) failures.push(`${spec.route} ${viewport.name}: ${unlabeled} controls lack labels`);

    await page.waitForFunction(() => document.querySelectorAll('[data-model-table-body] tr').length >= 5);
    const visible = (await page.locator('[data-output="visibleCount"]').textContent() || '').trim();
    if (visible !== '5') failures.push(`${spec.route} ${viewport.name}: expected 5 visible models, got ${visible}`);

    const points = await page.locator('.s5-model-point').count();
    if (points !== 5) failures.push(`${spec.route} ${viewport.name}: expected 5 chart points, got ${points}`);
    const frontierPoints = await page.locator('.s5-model-point[data-frontier="true"]').count();
    if (frontierPoints !== 3) failures.push(`${spec.route} ${viewport.name}: expected 3 default frontier points, got ${frontierPoints}`);

    const sourceLinks = await page.locator('[data-model-focus] a[href^="https://"]').count();
    if (sourceLinks < 2) failures.push(`${spec.route} ${viewport.name}: focused model does not expose both provenance links`);

    await page.locator('[data-field="provider"]').selectOption('OpenAI');
    const openAiRows = await page.locator('[data-model-table-body] tr').count();
    if (openAiRows !== 3) failures.push(`${spec.route} ${viewport.name}: provider filter expected 3 OpenAI rows, got ${openAiRows}`);

    await page.locator('[data-field="provider"]').selectOption('all');
    await page.locator('[data-field="maxTtftSeconds"]').fill('30');
    await page.locator('[data-field="maxTtftSeconds"]').dispatchEvent('input');
    const lowLatencyRows = await page.locator('[data-model-table-body] tr').count();
    if (lowLatencyRows !== 1) failures.push(`${spec.route} ${viewport.name}: TTFT filter expected 1 row, got ${lowLatencyRows}`);

    await page.locator('[data-action="reset"]').click();
    const costBefore = (await page.locator('[data-model-table-body] tr').first().locator('td').nth(1).textContent() || '').trim();
    await page.locator('[data-field="inputTokens"]').fill('300000');
    await page.locator('[data-field="inputTokens"]').dispatchEvent('input');
    const costAfter = (await page.locator('[data-model-table-body] tr').first().locator('td').nth(1).textContent() || '').trim();
    if (costAfter === costBefore) failures.push(`${spec.route} ${viewport.name}: workload change did not update scenario costs`);

    const share = page.locator('[data-action="share"]');
    await share.click();
    if (!page.url().includes('?') || !page.url().includes('in=300000')) failures.push(`${spec.route} ${viewport.name}: share action did not encode workload`);

    const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
    let hasWebApplication = false;
    for (const raw of jsonLd) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed['@type'] === 'WebApplication') hasWebApplication = true;
      } catch {
        failures.push(`${spec.route} ${viewport.name}: invalid JSON-LD`);
      }
    }
    if (!hasWebApplication) failures.push(`${spec.route} ${viewport.name}: WebApplication JSON-LD missing`);

    const scrollRegion = page.locator('.s5-model-table-scroll');
    if (await scrollRegion.count() !== 1) failures.push(`${spec.route} ${viewport.name}: comparison table scroll region missing`);

    await page.locator('[data-action="reset"]').click();
    await page.screenshot({
      path: `${artifactDir}/model-price-performance-${spec.locale}-${viewport.name}.png`,
      fullPage: true
    });
    await page.close();
  }
}

await browser.close();

if (failures.length) {
  console.error('Model price/performance browser QA failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('Model price/performance browser QA passed: ES/EN, 390px/1440px, filters, workload updates, Pareto frontier, provenance, JSON-LD, horizontal fit and visual evidence verified.');
