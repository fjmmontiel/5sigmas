#!/usr/bin/env node

import fs from 'node:fs';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const failures = [];
const browser = await chromium.launch({ headless: true });
const artifactDir = 'artifacts/visual-review';
fs.mkdirSync(artifactDir, { recursive: true });

const cases = [
  { route: '/herramientas/kv-cache-contexto/', locale: 'es' },
  { route: '/en/tools/kv-cache-context/', locale: 'en' }
];
const viewports = [
  { width: 390, height: 844, name: 'mobile' },
  { width: 1440, height: 1100, name: 'desktop' }
];

const numberFrom = (text, locale) => {
  const cleaned = String(text).replace(/[^0-9.,-]/g, '');
  return locale === 'es'
    ? Number(cleaned.replace(/\./g, '').replace(',', '.'))
    : Number(cleaned.replace(/,/g, ''));
};

for (const spec of cases) {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    const response = await page.goto(`${base}${spec.route}`, { waitUntil: 'networkidle' });
    if (!response?.ok()) {
      failures.push(`${spec.route} ${viewport.name}: HTTP ${response?.status() ?? 'no response'}`);
      await page.close();
      continue;
    }

    const root = page.locator('[data-s5-kv-context]');
    if (await root.count() !== 1) failures.push(`${spec.route} ${viewport.name}: explorer root missing`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 1) failures.push(`${spec.route} ${viewport.name}: horizontal overflow ${overflow}px`);

    const unlabeled = await page.locator('[data-s5-tool-form] input, [data-s5-tool-form] select').evaluateAll((nodes) => nodes.filter((node) => {
      if (!node.id) return true;
      return !document.querySelector(`label[for="${CSS.escape(node.id)}"]`);
    }).length);
    if (unlabeled) failures.push(`${spec.route} ${viewport.name}: ${unlabeled} form controls lack labels`);

    await page.waitForFunction(() => document.querySelector('[data-field="preset"]')?.options.length >= 5);
    const kvInitialText = (await page.locator('[data-output="kvTotal"]').textContent() || '').trim();
    const kvInitial = numberFrom(kvInitialText, spec.locale);
    if (Math.abs(kvInitial - 1) > 0.01) failures.push(`${spec.route} ${viewport.name}: expected default KV≈1 GiB, got ${kvInitialText}`);

    await page.locator('[data-context-preset="32768"]').click();
    const kv32kText = (await page.locator('[data-output="kvTotal"]').textContent() || '').trim();
    const kv32k = numberFrom(kv32kText, spec.locale);
    if (Math.abs(kv32k - 4) > 0.02) failures.push(`${spec.route} ${viewport.name}: 32K context should use ≈4 GiB, got ${kv32kText}`);

    await page.locator('[data-action="reset"]').click();
    await page.locator('[data-field="kvBits"]').fill('8');
    await page.locator('[data-field="kvBits"]').dispatchEvent('input');
    const kvFp8Text = (await page.locator('[data-output="kvTotal"]').textContent() || '').trim();
    if (Math.abs(numberFrom(kvFp8Text, spec.locale) - 0.5) > 0.01) failures.push(`${spec.route} ${viewport.name}: 8-bit KV should use ≈0.5 GiB, got ${kvFp8Text}`);

    await page.locator('[data-action="reset"]').click();
    await page.locator('[data-field="concurrentSequences"]').fill('4');
    await page.locator('[data-field="concurrentSequences"]').dispatchEvent('input');
    const kvSeqText = (await page.locator('[data-output="kvTotal"]').textContent() || '').trim();
    if (Math.abs(numberFrom(kvSeqText, spec.locale) - 4) > 0.02) failures.push(`${spec.route} ${viewport.name}: four sequences should use ≈4 GiB, got ${kvSeqText}`);

    await page.locator('[data-field="kvBudgetGiB"]').fill('2');
    await page.locator('[data-field="kvBudgetGiB"]').dispatchEvent('input');
    const budgetState = await page.locator('[data-output="budgetStatus"]').getAttribute('data-state');
    if (budgetState !== 'warn') failures.push(`${spec.route} ${viewport.name}: over-budget workload was not surfaced`);

    await page.locator('[data-action="reset"]').click();
    await page.locator('[data-field="attentionHeads"]').fill('32');
    await page.locator('[data-field="kvHeads"]').fill('7');
    await page.locator('[data-field="kvHeads"]').dispatchEvent('input');
    const architectureState = await page.locator('[data-output="architectureStatus"]').getAttribute('data-state');
    if (architectureState !== 'warn') failures.push(`${spec.route} ${viewport.name}: invalid GQA geometry was not surfaced`);

    await page.locator('[data-action="reset"]').click();
    await page.locator('[data-field="contextTokens"]').fill('262144');
    await page.locator('[data-field="contextTokens"]').dispatchEvent('input');
    const contextState = await page.locator('[data-output="contextStatus"]').getAttribute('data-state');
    if (contextState !== 'warn') failures.push(`${spec.route} ${viewport.name}: context above the published preset maximum was not surfaced`);

    await page.locator('[data-action="reset"]').click();
    const sourceHref = await page.locator('[data-output="sourceLink"]').getAttribute('href');
    if (!sourceHref?.startsWith('https://github.com/meta-llama/')) failures.push(`${spec.route} ${viewport.name}: primary preset source not exposed`);

    const chartState = await page.locator('[data-kv-chart]').evaluate((svg) => {
      const box = svg.viewBox.baseVal;
      const point = svg.querySelector('.s5-kv-chart__point');
      const attrs = point ? ['cx', 'cy'].map((name) => Number(point.getAttribute(name))) : [];
      return {
        viewBox: [box.x, box.y, box.width, box.height],
        selectedLines: svg.querySelectorAll('.s5-kv-chart__line--selected').length,
        mhaLines: svg.querySelectorAll('.s5-kv-chart__line--mha').length,
        budgetLines: svg.querySelectorAll('.s5-kv-chart__budget').length,
        presetLines: svg.querySelectorAll('.s5-kv-chart__preset').length,
        point: attrs,
        hasNaN: svg.innerHTML.includes('NaN') || svg.innerHTML.includes('Infinity')
      };
    });
    if (chartState.selectedLines !== 1 || chartState.mhaLines !== 1 || chartState.budgetLines !== 1 || chartState.presetLines !== 1) {
      failures.push(`${spec.route} ${viewport.name}: chart comparison layers are incomplete`);
    }
    if (chartState.hasNaN) failures.push(`${spec.route} ${viewport.name}: chart contains NaN/Infinity geometry`);
    if (chartState.point.length !== 2 || chartState.point.some((value) => !Number.isFinite(value))) failures.push(`${spec.route} ${viewport.name}: selected chart point is invalid`);
    else {
      const [, , width, height] = chartState.viewBox;
      const [cx, cy] = chartState.point;
      if (cx < 0 || cx > width || cy < 0 || cy > height) failures.push(`${spec.route} ${viewport.name}: selected chart point falls outside the viewBox`);
    }

    await page.locator('[data-action="share"]').click();
    if (!page.url().includes('?') || !page.url().includes('ctx=') || !page.url().includes('seq=')) failures.push(`${spec.route} ${viewport.name}: share action did not encode context/concurrency`);

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
    await page.screenshot({ path: `${artifactDir}/kv-context-${spec.locale}-${viewport.name}.png`, fullPage: true });
    await page.close();
  }
}

await browser.close();
if (failures.length) {
  console.error('KV cache/context browser QA failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('KV cache/context browser QA passed: ES/EN, 390px/1440px, math interactions, budget/context warnings, chart geometry, provenance, JSON-LD and shareable state verified.');
