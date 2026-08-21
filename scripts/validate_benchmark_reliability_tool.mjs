#!/usr/bin/env node

import fs from 'node:fs';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || process.env.S5_BASE_URL || 'http://127.0.0.1:8000';
const failures = [];
const artifactDir = 'artifacts/visual-review';
fs.mkdirSync(artifactDir, { recursive: true });

const cases = [
  { route: '/herramientas/fiabilidad-benchmarks/', locale: 'es' },
  { route: '/en/tools/benchmark-reliability/', locale: 'en' }
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
      if (!response?.ok()) {
        failures.push(`${spec.route} ${viewport.name}: HTTP ${response?.status() ?? 'no response'}`);
        await page.close();
        continue;
      }

      const root = page.locator('[data-s5-benchmark-reliability]');
      if (await root.count() !== 1) failures.push(`${spec.route} ${viewport.name}: tool root missing`);

      const overflowPx = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflowPx > 1) failures.push(`${spec.route} ${viewport.name}: horizontal overflow ${overflowPx}px`);

      const unlabeled = await page.locator('[data-field]').evaluateAll((nodes) => nodes.filter((node) => {
        if (node.closest('label') || node.getAttribute('aria-label')) return false;
        return !node.id || !document.querySelector(`label[for="${CSS.escape(node.id)}"]`);
      }).length);
      if (unlabeled) failures.push(`${spec.route} ${viewport.name}: ${unlabeled} controls lack programmatic labels`);

      const jsonLdBlocks = await page.locator('script[type="application/ld+json"]').allTextContents();
      let hasWebApplication = false;
      for (const raw of jsonLdBlocks) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed['@type'] === 'WebApplication') hasWebApplication = true;
        } catch {
          failures.push(`${spec.route} ${viewport.name}: invalid JSON-LD`);
        }
      }
      if (!hasWebApplication) failures.push(`${spec.route} ${viewport.name}: WebApplication JSON-LD missing`);

      const sourceLinks = await page.locator('.s5-note-feature__meta a').evaluateAll((links) => links.map((link) => link.href));
      for (const expected of ['arxiv.org/abs/2107.07002', 'crfm.stanford.edu/2022/11/17/helm.html', 'arxiv.org/abs/2406.19314']) {
        if (!sourceLinks.some((href) => href.includes(expected))) failures.push(`${spec.route} ${viewport.name}: source missing ${expected}`);
      }

      const bodyText = ` ${(await root.innerText()).toLowerCase().replace(/\s+/g, ' ')} `;
      if (spec.locale === 'es') {
        for (const phrase of ['p-value', 'score agregado', 'ranking']) {
          if (!bodyText.includes(phrase)) failures.push(`${spec.route} ${viewport.name}: key Spanish methodological phrase missing: ${phrase}`);
        }
        if (!bodyText.includes('no son evidencia de contaminación')) failures.push(`${spec.route} ${viewport.name}: contamination limitation missing`);
      } else {
        if (!bodyText.includes('do not infer paired significance')) failures.push(`${spec.route} ${viewport.name}: paired-comparison limitation missing`);
        if (!bodyText.includes('not contamination detection')) failures.push(`${spec.route} ${viewport.name}: contamination limitation missing`);
      }

      const scoreA = (await page.locator('[data-output="scoreA"]').first().textContent() || '').trim();
      const scoreB = (await page.locator('[data-output="scoreB"]').first().textContent() || '').trim();
      const gap = (await page.locator('[data-output="gap"]').first().textContent() || '').trim();
      const cleanItems = (await page.locator('[data-output="cleanItems"]').first().textContent() || '').replace(/[^0-9]/g, '');
      if (scoreA !== '80.3%' || scoreB !== '80.0%') failures.push(`${spec.route} ${viewport.name}: default weighted scores are wrong (${scoreA}, ${scoreB})`);
      if (!gap.includes('0.25 pp')) failures.push(`${spec.route} ${viewport.name}: default gap should be 0.25 pp`);
      if (cleanItems !== '980') failures.push(`${spec.route} ${viewport.name}: default usable item count should be 980`);

      const defaultWeightStatus = (await page.locator('[data-output="weightStatus"]').textContent() || '').toLowerCase();
      if (spec.locale === 'es' && !defaultWeightStatus.includes('puede cambiar')) failures.push(`${spec.route} ${viewport.name}: default ranking should be weight-fragile in Spanish`);
      if (spec.locale === 'en' && !defaultWeightStatus.includes('can flip')) failures.push(`${spec.route} ${viewport.name}: default ranking should be weight-fragile in English`);

      const initialFlags = await page.locator('.s5-benchmark-flag').allTextContents();
      if (initialFlags.length < 4) failures.push(`${spec.route} ${viewport.name}: default scenario should surface multiple independent fragility flags`);

      await page.locator('[data-field="items"]').fill('100000');
      await page.locator('[data-field="invalidRate"]').fill('0');
      await page.locator('[data-field="contaminationExposure"]').fill('0');
      await page.locator('[data-field="weightSwing"]').fill('10');
      for (let index = 0; index < 4; index += 1) {
        await page.locator(`[data-field="a${index}"]`).fill(String(90 - index * 2));
        await page.locator(`[data-field="b${index}"]`).fill(String(70 + index * 2));
      }
      const stableStatus = (await page.locator('[data-output="weightStatus"]').textContent() || '').toLowerCase();
      if (spec.locale === 'es' && !stableStatus.includes('estable')) failures.push(`${spec.route} ${viewport.name}: large-gap scenario should be stable in Spanish`);
      if (spec.locale === 'en' && !stableStatus.includes('stable')) failures.push(`${spec.route} ${viewport.name}: large-gap scenario should be stable in English`);
      if ((await page.locator('[data-output="invalidEnvelope"]').textContent() || '').trim().toLowerCase() !== (spec.locale === 'es' ? 'no' : 'no')) failures.push(`${spec.route} ${viewport.name}: zero invalid items must not cover the gap`);
      if ((await page.locator('[data-output="contaminationEnvelope"]').textContent() || '').trim().toLowerCase() !== (spec.locale === 'es' ? 'no' : 'no')) failures.push(`${spec.route} ${viewport.name}: zero exposure must not cover the gap`);

      await page.locator('[data-action="share"]').click();
      for (const token of ['n=', 'invalid=', 'contam=', 'swing=', 'w0=', 'a0=', 'b0=']) {
        if (!page.url().includes(token)) failures.push(`${spec.route} ${viewport.name}: share URL missing ${token}`);
      }

      response = await page.goto(`${base}${spec.route}?n=2000&invalid=1&contam=2&swing=0&w0=25&a0=90&b0=80&w1=25&a1=90&b1=80&w2=25&a2=90&b2=80&w3=25&a3=90&b3=80`, { waitUntil: 'networkidle' });
      if (!response?.ok()) failures.push(`${spec.route} ${viewport.name}: deep-link HTTP ${response?.status() ?? 'no response'}`);
      if ((await page.locator('[data-field="items"]').inputValue()) !== '2000') failures.push(`${spec.route} ${viewport.name}: deep-link item count not restored`);
      if (!((await page.locator('[data-output="gap"]').textContent() || '').includes('10.00 pp'))) failures.push(`${spec.route} ${viewport.name}: deep-link score gap not restored`);

      await page.locator('[data-action="reset"]').click();
      if ((await page.locator('[data-field="items"]').inputValue()) !== '1000') failures.push(`${spec.route} ${viewport.name}: reset did not restore defaults`);
      if (new URL(page.url()).search) failures.push(`${spec.route} ${viewport.name}: reset should clear query state`);

      const kpis = await page.locator('.s5-benchmark-kpis > div').evaluateAll((nodes) => nodes.map((node) => {
        const r = node.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      }));
      if (viewport.width >= 1200 && kpis.length === 4) {
        if (Math.max(...kpis.map((b) => b.y)) - Math.min(...kpis.map((b) => b.y)) > 1) failures.push(`${spec.route} desktop: KPI cells should share one row`);
        if (Math.max(...kpis.map((b) => b.width)) - Math.min(...kpis.map((b) => b.width)) > 1) failures.push(`${spec.route} desktop: KPI cells should have equal width`);
      }

      await page.screenshot({ path: `${artifactDir}/benchmark-reliability-${spec.locale}-${viewport.name}.png`, fullPage: true });
      await page.close();
    }
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error('Benchmark reliability browser QA failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('Benchmark reliability browser QA passed: ES/EN, 390px/1440px, default math, ranking sensitivity, integrity envelopes, deep links, provenance, JSON-LD, labels and horizontal fit verified.');
