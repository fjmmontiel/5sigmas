#!/usr/bin/env node

import fs from 'node:fs';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const failures = [];
const browser = await chromium.launch({ headless: true });
const artifactDir = 'artifacts/visual-review';
fs.mkdirSync(artifactDir, { recursive: true });

const cases = [
  { route: '/herramientas/presupuesto-contexto/', locale: 'es' },
  { route: '/en/tools/context-budget/', locale: 'en' }
];
const viewports = [
  { width: 390, height: 844, name: 'mobile' },
  { width: 1440, height: 1100, name: 'desktop' }
];

const parseCompact = (text) => {
  const raw = String(text).trim().replace(/\s/g, '').replace(',', '.');
  const sign = raw.startsWith('−') || raw.startsWith('-') ? -1 : 1;
  const clean = raw.replace(/^[-−]/, '');
  if (/M$/i.test(clean)) return sign * Number(clean.slice(0, -1)) * 1_000_000;
  if (/K$/i.test(clean)) return sign * Number(clean.slice(0, -1)) * 1_000;
  return sign * Number(clean.replace(/[^0-9.]/g, ''));
};

for (const spec of cases) {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    let response = await page.goto(`${base}${spec.route}`, { waitUntil: 'networkidle' });
    if (!response?.ok()) {
      failures.push(`${spec.route} ${viewport.name}: HTTP ${response?.status() ?? 'no response'}`);
      await page.close();
      continue;
    }

    if (await page.locator('[data-s5-context-budget]').count() !== 1) failures.push(`${spec.route} ${viewport.name}: planner root missing`);
    const overflowPx = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflowPx > 1) failures.push(`${spec.route} ${viewport.name}: horizontal overflow ${overflowPx}px`);

    const unlabeled = await page.locator('[data-s5-tool-form] input').evaluateAll((nodes) => nodes.filter((node) => !node.id || !document.querySelector(`label[for="${CSS.escape(node.id)}"]`)).length);
    if (unlabeled) failures.push(`${spec.route} ${viewport.name}: ${unlabeled} form controls lack labels`);

    const defaultState = {
      planned: parseCompact(await page.locator('[data-output="planned"]').textContent()),
      available: parseCompact(await page.locator('[data-output="availableInput"]').textContent()),
      remaining: parseCompact(await page.locator('[data-output="remainingInput"]').textContent()),
      budgetState: await page.locator('[data-output="budgetStatus"]').getAttribute('data-state'),
      segments: await page.locator('[data-budget-bar] > span').count()
    };
    if (Math.abs(defaultState.planned - 65596) > 100) failures.push(`${spec.route} ${viewport.name}: default planned context should be ≈65.6K, got ${defaultState.planned}`);
    if (Math.abs(defaultState.available - 115904) > 100) failures.push(`${spec.route} ${viewport.name}: default available input should be ≈115.9K, got ${defaultState.available}`);
    if (Math.abs(defaultState.remaining - 62404) > 100) failures.push(`${spec.route} ${viewport.name}: default remaining input should be ≈62.4K, got ${defaultState.remaining}`);
    if (defaultState.budgetState !== 'good') failures.push(`${spec.route} ${viewport.name}: default scenario should fit`);
    if (defaultState.segments < 7) failures.push(`${spec.route} ${viewport.name}: stacked budget is incomplete`);

    await page.locator('[data-context-preset="32768"]').click();
    const overflowState = await page.locator('[data-output="budgetStatus"]').getAttribute('data-state');
    const overflowTokens = parseCompact(await page.locator('[data-output="overflow"]').textContent());
    const overflowBar = page.locator('[data-budget-bar]');
    const hasOverflowMarker = await overflowBar.evaluate((node) => node.classList.contains('is-overflow'));
    const limitShare = await overflowBar.evaluate((node) => Number.parseFloat(getComputedStyle(node).getPropertyValue('--limit-share')));
    if (overflowState !== 'warn') failures.push(`${spec.route} ${viewport.name}: 32K preset should surface overflow`);
    if (Math.abs(overflowTokens - 33596) > 100) failures.push(`${spec.route} ${viewport.name}: 32K overflow should be ≈33.6K, got ${overflowTokens}`);
    if (!hasOverflowMarker) failures.push(`${spec.route} ${viewport.name}: overflow allocation lacks the context-limit marker`);
    if (!(limitShare > 45 && limitShare < 55)) failures.push(`${spec.route} ${viewport.name}: overflow limit marker should be near 50%, got ${limitShare}`);

    await page.locator('[data-field="historyGrowthPerTurn"]').fill('0');
    await page.locator('[data-field="historyGrowthPerTurn"]').dispatchEvent('input');
    const overflowTurnsText = (await page.locator('[data-output="turns"]').textContent() || '').trim();
    if (/sin presión por historial|no configured history pressure/i.test(overflowTurnsText)) failures.push(`${spec.route} ${viewport.name}: overflow plus zero growth must still report current pressure`);

    await page.locator('[data-action="reset"]').click();
    await page.locator('[data-field="historyGrowthPerTurn"]').fill('0');
    await page.locator('[data-field="historyGrowthPerTurn"]').dispatchEvent('input');
    const turnsText = (await page.locator('[data-output="turns"]').textContent() || '').trim();
    if (!turnsText || /NaN|Infinity/.test(turnsText)) failures.push(`${spec.route} ${viewport.name}: zero-growth turn output is invalid`);

    await page.locator('[data-action="reset"]').click();
    await page.locator('[data-field="ragTokens"]').fill('90000');
    await page.locator('[data-field="ragTokens"]').dispatchEvent('input');
    const largest = (await page.locator('[data-output="largestBlock"]').textContent() || '').trim();
    if (!/RAG/i.test(largest)) failures.push(`${spec.route} ${viewport.name}: largest-block diagnostic did not identify RAG`);

    await page.locator('[data-action="share"]').click();
    if (!page.url().includes('rag=90000')) failures.push(`${spec.route} ${viewport.name}: share action did not encode changed RAG budget`);

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

    const sourceLinks = await page.locator('.s5-tool-method__notes a').evaluateAll((links) => links.map((link) => link.href));
    if (!sourceLinks.some((href) => href.includes('help.openai.com/en/articles/4936856'))) failures.push(`${spec.route} ${viewport.name}: token-limit source missing`);
    if (!sourceLinks.some((href) => href.includes('developers.openai.com/api/reference'))) failures.push(`${spec.route} ${viewport.name}: Responses source missing`);

    response = await page.goto(`${base}${spec.route}?c=0&rag=1234.6`, { waitUntil: 'networkidle' });
    if (!response?.ok()) failures.push(`${spec.route} ${viewport.name}: normalized deep-link HTTP ${response?.status() ?? 'no response'}`);
    const normalizedLimit = await page.locator('[data-field="contextLimit"]').inputValue();
    const normalizedRag = await page.locator('[data-field="ragTokens"]').inputValue();
    if (normalizedLimit !== '1') failures.push(`${spec.route} ${viewport.name}: deep-link context limit must normalize to 1, got ${normalizedLimit}`);
    if (normalizedRag !== '1235') failures.push(`${spec.route} ${viewport.name}: deep-link RAG tokens must normalize to integer tokens, got ${normalizedRag}`);

    await page.goto(`${base}${spec.route}`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `${artifactDir}/context-budget-${spec.locale}-${viewport.name}.png`, fullPage: true });
    await page.close();
  }
}

await browser.close();
if (failures.length) {
  console.error('Context budget browser QA failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('Context budget browser QA passed: ES/EN, 390px/1440px, math interactions, overflow marker, normalized deep links, diagnostics, provenance, JSON-LD, labels and shareable state verified.');
