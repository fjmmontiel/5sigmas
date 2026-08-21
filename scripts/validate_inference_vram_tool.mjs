#!/usr/bin/env node

import fs from 'node:fs';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const failures = [];
const browser = await chromium.launch({ headless: true });
const artifactDir = 'artifacts/visual-review';
fs.mkdirSync(artifactDir, { recursive: true });

const cases = [
  { route: '/herramientas/vram-inferencia/', locale: 'es' },
  { route: '/en/tools/inference-vram/', locale: 'en' }
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

    const root = page.locator('[data-s5-inference-vram]');
    if (await root.count() !== 1) failures.push(`${spec.route} ${viewport.name}: calculator root missing`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 1) failures.push(`${spec.route} ${viewport.name}: horizontal overflow ${overflow}px`);

    const unlabeled = await page.locator('[data-s5-tool-form] input, [data-s5-tool-form] select').evaluateAll((nodes) => nodes.filter((node) => {
      if (!node.id) return true;
      return !document.querySelector(`label[for="${CSS.escape(node.id)}"]`);
    }).length);
    if (unlabeled) failures.push(`${spec.route} ${viewport.name}: ${unlabeled} form controls lack labels`);

    await page.waitForFunction(() => document.querySelector('[data-field="preset"]')?.options.length >= 4);
    const totalBefore = (await page.locator('[data-output="totalVram"]').textContent() || '').trim();
    const kvBefore = (await page.locator('[data-output="kvCache"]').textContent() || '').trim();
    if (!totalBefore || totalBefore === '—') failures.push(`${spec.route} ${viewport.name}: total VRAM did not render`);
    if (!kvBefore || kvBefore === '—') failures.push(`${spec.route} ${viewport.name}: KV cache did not render`);

    await page.locator('[data-field="contextTokens"]').fill('16384');
    await page.locator('[data-field="contextTokens"]').dispatchEvent('input');
    const kvAfter = (await page.locator('[data-output="kvCache"]').textContent() || '').trim();
    if (!(numberFrom(kvAfter, spec.locale) > numberFrom(kvBefore, spec.locale))) failures.push(`${spec.route} ${viewport.name}: doubling context did not increase KV cache`);

    const weightBefore = (await page.locator('[data-output="weights"]').textContent() || '').trim();
    await page.locator('[data-field="weightBits"]').fill('4');
    await page.locator('[data-field="weightBits"]').dispatchEvent('input');
    const weightAfter = (await page.locator('[data-output="weights"]').textContent() || '').trim();
    if (!(numberFrom(weightAfter, spec.locale) < numberFrom(weightBefore, spec.locale))) failures.push(`${spec.route} ${viewport.name}: lower weight precision did not reduce weight memory`);

    await page.locator('[data-field="attentionHeads"]').fill('32');
    await page.locator('[data-field="kvHeads"]').fill('7');
    await page.locator('[data-field="kvHeads"]').dispatchEvent('input');
    const architectureState = await page.locator('[data-output="architectureStatus"]').getAttribute('data-state');
    if (architectureState !== 'warn') failures.push(`${spec.route} ${viewport.name}: invalid GQA geometry was not surfaced`);

    await page.locator('[data-action="reset"]').click();
    const sourceHref = await page.locator('[data-output="sourceLink"]').getAttribute('href');
    if (!sourceHref?.startsWith('https://github.com/meta-llama/')) failures.push(`${spec.route} ${viewport.name}: primary preset source not exposed`);

    await page.locator('[data-action="share"]').click();
    if (!page.url().includes('?') || !page.url().includes('ctx=')) failures.push(`${spec.route} ${viewport.name}: share action did not encode the scenario`);

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
    await page.screenshot({ path: `${artifactDir}/inference-vram-${spec.locale}-${viewport.name}.png`, fullPage: true });
    await page.close();
  }
}

await browser.close();
if (failures.length) {
  console.error('Inference VRAM browser QA failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('Inference VRAM browser QA passed: ES/EN, 390px/1440px, responsiveness, labels, interaction, provenance, JSON-LD and shareable state verified.');
