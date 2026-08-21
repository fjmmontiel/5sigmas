#!/usr/bin/env node

import fs from 'node:fs';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const failures = [];
const browser = await chromium.launch({ headless: true });
const artifactDir = 'artifacts/visual-review';
fs.mkdirSync(artifactDir, { recursive: true });

const cases = [
  { route: '/herramientas/coste-latencia-llm/', locale: 'es' },
  { route: '/en/tools/llm-cost-latency/', locale: 'en' }
];
const viewports = [
  { width: 390, height: 844, name: 'mobile' },
  { width: 1440, height: 1100, name: 'desktop' }
];

const numericText = (text) => Number(String(text).replace(/[^0-9.,-]/g, '').replace(/\./g, '').replace(',', '.'));

for (const spec of cases) {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    const response = await page.goto(`${base}${spec.route}`, { waitUntil: 'networkidle' });
    if (!response?.ok()) {
      failures.push(`${spec.route} ${viewport.name}: HTTP ${response?.status() ?? 'no response'}`);
      await page.close();
      continue;
    }

    const root = page.locator('[data-s5-llm-calculator]');
    if (await root.count() !== 1) failures.push(`${spec.route} ${viewport.name}: calculator root missing`);

    const h1 = (await page.locator('h1').first().textContent() || '').trim();
    if (!h1) failures.push(`${spec.route} ${viewport.name}: H1 missing`);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 1) failures.push(`${spec.route} ${viewport.name}: horizontal overflow ${overflow}px`);

    const unlabeled = await page.locator('[data-s5-tool-form] input:not([aria-label]), [data-s5-tool-form] select:not([aria-label])').evaluateAll((nodes) => nodes.filter((node) => {
      if (!node.id) return true;
      return !document.querySelector(`label[for="${CSS.escape(node.id)}"]`);
    }).length);
    if (unlabeled) failures.push(`${spec.route} ${viewport.name}: ${unlabeled} form controls lack labels`);

    await page.waitForFunction(() => document.querySelector('[data-field="model"]')?.options.length >= 5);
    const costBefore = (await page.locator('[data-output="monthlyCost"]').textContent() || '').trim();
    const latencyBefore = (await page.locator('[data-output="responseTime"]').textContent() || '').trim();
    if (!costBefore || costBefore === '—') failures.push(`${spec.route} ${viewport.name}: monthly cost did not render`);
    if (!latencyBefore || latencyBefore === '—') failures.push(`${spec.route} ${viewport.name}: response time did not render`);

    await page.locator('[data-field="outputTokens"]').fill('1000');
    await page.locator('[data-field="outputTokens"]').dispatchEvent('input');
    const costAfter = (await page.locator('[data-output="monthlyCost"]').textContent() || '').trim();
    const latencyAfter = (await page.locator('[data-output="responseTime"]').textContent() || '').trim();
    if (costAfter === costBefore) failures.push(`${spec.route} ${viewport.name}: output tokens did not change monthly cost`);
    if (latencyAfter === latencyBefore) failures.push(`${spec.route} ${viewport.name}: output tokens did not change response time`);

    await page.locator('[data-field="outputTokens"]').fill('0');
    await page.locator('[data-field="cacheHitRate"]').fill('0');
    await page.locator('[data-field="cacheHitRate"]').dispatchEvent('input');
    const uncached = (await page.locator('[data-output="costPerRequest"]').textContent() || '').trim();
    await page.locator('[data-field="cacheHitRate"]').fill('100');
    await page.locator('[data-field="cacheHitRate"]').dispatchEvent('input');
    const cached = (await page.locator('[data-output="costPerRequest"]').textContent() || '').trim();
    if (!(numericText(cached) < numericText(uncached))) failures.push(`${spec.route} ${viewport.name}: 100% cache should reduce cost for the default preset`);

    const share = page.locator('[data-action="share"]');
    await share.click();
    if (!page.url().includes('?') || !page.url().includes('rpm=')) failures.push(`${spec.route} ${viewport.name}: share action did not encode scenario in URL`);

    const sourceHref = await page.locator('[data-output="sourceLink"]').getAttribute('href');
    if (!sourceHref?.startsWith('https://')) failures.push(`${spec.route} ${viewport.name}: primary pricing source not exposed`);

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

    await page.locator('[data-action="reset"]').click();
    await page.screenshot({
      path: `${artifactDir}/llm-cost-latency-${spec.locale}-${viewport.name}.png`,
      fullPage: true
    });
    await page.close();
  }
}

await browser.close();

if (failures.length) {
  console.error('LLM cost/latency browser QA failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('LLM cost/latency browser QA passed: ES/EN, 390px/1440px, interactivity, labels, provenance, JSON-LD, horizontal fit and visual evidence verified.');
