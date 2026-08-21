#!/usr/bin/env node

import fs from 'node:fs';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const failures = [];
const browser = await chromium.launch({ headless: true });
const artifactDir = 'artifacts/visual-review';
fs.mkdirSync(artifactDir, { recursive: true });

const cases = [
  { route: '/herramientas/laboratorio-recuperacion-rag/', locale: 'es' },
  { route: '/en/tools/rag-retrieval-lab/', locale: 'en' }
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

    if (await page.locator('[data-s5-rag-retrieval]').count() !== 1) failures.push(`${spec.route} ${viewport.name}: lab root missing`);
    const overflowPx = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflowPx > 1) failures.push(`${spec.route} ${viewport.name}: horizontal overflow ${overflowPx}px`);

    const unlabeled = await page.locator('[data-s5-tool-form] input').evaluateAll((nodes) => nodes.filter((node) => !node.id || !document.querySelector(`label[for="${CSS.escape(node.id)}"]`)).length);
    if (unlabeled) failures.push(`${spec.route} ${viewport.name}: ${unlabeled} form controls lack labels`);

    const precision = await numberText(page.locator('[data-output="precision"]'));
    const recall = await numberText(page.locator('[data-output="recall"]'));
    const mrr = await numberText(page.locator('[data-output="mrr"]'));
    const ndcg = await numberText(page.locator('[data-output="ndcg"]'));
    if (precision !== 80) failures.push(`${spec.route} ${viewport.name}: default Precision@5 should be 80%, got ${precision}`);
    if (recall !== 50) failures.push(`${spec.route} ${viewport.name}: default Recall@5 should be 50%, got ${recall}`);
    if (Math.abs(mrr - 1) > 0.001) failures.push(`${spec.route} ${viewport.name}: default MRR should be 1, got ${mrr}`);
    if (Math.abs(ndcg - 0.75) > 0.02) failures.push(`${spec.route} ${viewport.name}: default nDCG@5 should be ≈0.75, got ${ndcg}`);

    const defaultRows = await page.locator('[data-ranking] .s5-rag-result').count();
    const highlighted = await page.locator('[data-ranking] .s5-rag-result[data-in-k="true"]').count();
    if (defaultRows !== 10) failures.push(`${spec.route} ${viewport.name}: expected 10 visible ranked candidates, got ${defaultRows}`);
    if (highlighted !== 5) failures.push(`${spec.route} ${viewport.name}: expected 5 top-k highlighted rows, got ${highlighted}`);

    await page.locator('[data-field="rerankDepth"]').fill('8');
    await page.locator('[data-field="rerankDepth"]').dispatchEvent('input');
    const rerankedPrecision = await numberText(page.locator('[data-output="precision"]'));
    const rerankedRecall = await numberText(page.locator('[data-output="recall"]'));
    const rerankedNdcg = await numberText(page.locator('[data-output="ndcg"]'));
    const secondIdText = (await page.locator('[data-ranking] .s5-rag-result').nth(1).textContent() || '');
    if (rerankedPrecision !== 100 || Math.abs(rerankedRecall - 62.5) > 0.1 || Math.abs(rerankedNdcg - 1) > 0.001) failures.push(`${spec.route} ${viewport.name}: rerank scenario metrics are incorrect`);
    if (!/híbrida|hybrid/i.test(secondIdText)) failures.push(`${spec.route} ${viewport.name}: reranked position 2 should be the hybrid-retrieval item`);

    await page.locator('[data-field="overlap"]').fill('0');
    await page.locator('[data-field="overlap"]').dispatchEvent('input');
    const duplication = await numberText(page.locator('[data-output="duplication"]'));
    if (duplication !== 0) failures.push(`${spec.route} ${viewport.name}: zero overlap must produce zero duplication, got ${duplication}`);

    await page.locator('[data-field="chunkSize"]').fill('300');
    await page.locator('[data-field="overlap"]').fill('300');
    await page.locator('[data-field="overlap"]').dispatchEvent('input');
    const normalizedOverlap = await page.locator('[data-field="overlap"]').inputValue();
    if (normalizedOverlap !== '299') failures.push(`${spec.route} ${viewport.name}: overlap should normalize below chunk size, got ${normalizedOverlap}`);

    await page.locator('[data-action="reset"]').click();
    await page.locator('[data-field="k"]').fill('7');
    await page.locator('[data-field="k"]').dispatchEvent('input');
    await page.locator('[data-action="share"]').click();
    if (!page.url().includes('k=7')) failures.push(`${spec.route} ${viewport.name}: share action did not encode k=7`);

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
    for (const expected of ['2020.emnlp-main.550', '2005.11401', '2104.08663', '10.1145/582415.582418']) {
      if (!sourceLinks.some((href) => href.includes(expected))) failures.push(`${spec.route} ${viewport.name}: source missing ${expected}`);
    }

    response = await page.goto(`${base}${spec.route}?c=1000&s=300&o=100&k=3&r=8&t=2&q=5`, { waitUntil: 'networkidle' });
    if (!response?.ok()) failures.push(`${spec.route} ${viewport.name}: deep-link HTTP ${response?.status() ?? 'no response'}`);
    if (await page.locator('[data-field="chunkSize"]').inputValue() !== '300') failures.push(`${spec.route} ${viewport.name}: deep-link chunk size not restored`);
    if (await page.locator('[data-field="relevanceThreshold"]').inputValue() !== '2') failures.push(`${spec.route} ${viewport.name}: deep-link relevance threshold not restored`);

    await page.goto(`${base}${spec.route}`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `${artifactDir}/rag-retrieval-${spec.locale}-${viewport.name}.png`, fullPage: true });
    await page.close();
  }
}

await browser.close();
if (failures.length) {
  console.error('RAG retrieval browser QA failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('RAG retrieval browser QA passed: ES/EN, 390px/1440px, metric math, reranking, chunk overlap, deep links, provenance, JSON-LD, labels and responsive overflow verified.');
