#!/usr/bin/env node

import fs from 'node:fs';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const failures = [];
const browser = await chromium.launch({ headless: true });
const artifactDir = 'artifacts/visual-review';
fs.mkdirSync(artifactDir, { recursive: true });

const cases = [
  { route: '/herramientas/evaluacion-rag/', locale: 'es' },
  { route: '/en/tools/rag-evaluation/', locale: 'en' }
];
const viewports = [
  { width: 390, height: 844, name: 'mobile' },
  { width: 1440, height: 1100, name: 'desktop' }
];

const numberText = async (locator) => Number((await locator.textContent() || '').trim().replace(',', '.').replace('%', ''));

for (const spec of cases) {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    let response = await page.goto(`${base}${spec.route}`, { waitUntil: 'networkidle' });
    if (!response?.ok()) {
      failures.push(`${spec.route} ${viewport.name}: HTTP ${response?.status() ?? 'no response'}`);
      await page.close();
      continue;
    }

    if (await page.locator('[data-s5-rag-evaluation]').count() !== 1) failures.push(`${spec.route} ${viewport.name}: evaluator root missing`);
    const overflowPx = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflowPx > 1) failures.push(`${spec.route} ${viewport.name}: horizontal overflow ${overflowPx}px`);

    const unlabeled = await page.locator('[data-s5-tool-form] input').evaluateAll((nodes) => nodes.filter((node) => !node.id || !document.querySelector(`label[for="${CSS.escape(node.id)}"]`)).length);
    if (unlabeled) failures.push(`${spec.route} ${viewport.name}: ${unlabeled} form controls lack labels`);

    const context = await numberText(page.locator('[data-output="contextRelevance"]'));
    const faithfulness = await numberText(page.locator('[data-output="faithfulness"]'));
    const correctness = await numberText(page.locator('[data-output="answerCorrectness"]'));
    const coverage = await numberText(page.locator('[data-output="referenceCoverage"]'));
    if (Math.abs(context - 66.7) > 1) failures.push(`${spec.route} ${viewport.name}: default context relevance should be about 67%, got ${context}`);
    if (faithfulness !== 60) failures.push(`${spec.route} ${viewport.name}: default faithfulness should be 60%, got ${faithfulness}`);
    if (correctness !== 60) failures.push(`${spec.route} ${viewport.name}: default correctness should be 60%, got ${correctness}`);
    if (coverage !== 75) failures.push(`${spec.route} ${viewport.name}: default coverage should be 75%, got ${coverage}`);

    const contextCards = page.locator('[data-contexts] .s5-rag-eval-card');
    const claimCards = page.locator('[data-claims] .s5-rag-eval-claim');
    if (await contextCards.count() !== 6) failures.push(`${spec.route} ${viewport.name}: expected 6 context cards`);
    if (await claimCards.count() !== 5) failures.push(`${spec.route} ${viewport.name}: expected 5 claim cards`);

    const firstContextToggle = contextCards.first().locator('button');
    const beforeContext = await numberText(page.locator('[data-output="contextRelevance"]'));
    await firstContextToggle.click();
    const afterContext = await numberText(page.locator('[data-output="contextRelevance"]'));
    if (!(afterContext < beforeContext)) failures.push(`${spec.route} ${viewport.name}: context toggle did not change relevance metric`);

    const thirdClaimButtons = claimCards.nth(2).locator('button');
    await thirdClaimButtons.nth(0).click();
    const afterFaithfulness = await numberText(page.locator('[data-output="faithfulness"]'));
    if (afterFaithfulness !== 80) failures.push(`${spec.route} ${viewport.name}: support toggle should move faithfulness to 80%, got ${afterFaithfulness}`);
    await thirdClaimButtons.nth(1).click();
    const afterCorrectness = await numberText(page.locator('[data-output="answerCorrectness"]'));
    if (afterCorrectness !== 80) failures.push(`${spec.route} ${viewport.name}: correctness toggle should move correctness to 80%, got ${afterCorrectness}`);

    await page.locator('[data-action="reset"]').click();
    await page.locator('[data-field="referenceFacts"]').fill('8');
    await page.locator('[data-field="coveredFacts"]').fill('4');
    await page.locator('[data-field="coveredFacts"]').dispatchEvent('input');
    const halfCoverage = await numberText(page.locator('[data-output="referenceCoverage"]'));
    if (halfCoverage !== 50) failures.push(`${spec.route} ${viewport.name}: coverage should be 50% for 4/8, got ${halfCoverage}`);

    await page.locator('[data-field="wContext"]').fill('100');
    await page.locator('[data-field="wFaithfulness"]').fill('0');
    await page.locator('[data-field="wCorrectness"]').fill('0');
    await page.locator('[data-field="wCoverage"]').fill('0');
    await page.locator('[data-field="wCoverage"]').dispatchEvent('input');
    const weighted = await numberText(page.locator('[data-output="weightedScore"]'));
    const currentContext = await numberText(page.locator('[data-output="contextRelevance"]'));
    if (Math.abs(weighted - currentContext) > 1) failures.push(`${spec.route} ${viewport.name}: explicit weights are not reflected in composite score`);

    await page.locator('[data-action="share"]').click();
    if (!page.url().includes('ctx=') || !page.url().includes('clm=') || !page.url().includes('w=')) failures.push(`${spec.route} ${viewport.name}: share URL missing evaluator state`);

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
    for (const expected of ['2024.eacl-demo.16', '2311.09476']) {
      if (!sourceLinks.some((href) => href.includes(expected))) failures.push(`${spec.route} ${viewport.name}: source missing ${expected}`);
    }

    const intervals = await page.locator('[data-output$="Interval"]').allTextContents();
    if (intervals.length !== 4 || intervals.some((text) => !/Wilson/.test(text))) failures.push(`${spec.route} ${viewport.name}: Wilson interval readouts missing`);

    response = await page.goto(`${base}${spec.route}?ctx=0-1-0-1-0-1&clm=11-11-00-11-00&rf=6&cf=2&w=10,20,30,40`, { waitUntil: 'networkidle' });
    if (!response?.ok()) failures.push(`${spec.route} ${viewport.name}: deep-link HTTP ${response?.status() ?? 'no response'}`);
    if (await page.locator('[data-field="referenceFacts"]').inputValue() !== '6') failures.push(`${spec.route} ${viewport.name}: deep-link reference facts not restored`);
    if (await page.locator('[data-field="wCoverage"]').inputValue() !== '40') failures.push(`${spec.route} ${viewport.name}: deep-link weights not restored`);

    await page.goto(`${base}${spec.route}`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `${artifactDir}/rag-evaluation-${spec.locale}-${viewport.name}.png`, fullPage: true });
    await page.close();
  }
}

await browser.close();
if (failures.length) {
  console.error('RAG evaluation browser QA failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('RAG evaluation browser QA passed: ES/EN, 390px/1440px, metric separation, toggles, weighting, uncertainty, deep links, provenance, JSON-LD, labels and responsive overflow verified.');
