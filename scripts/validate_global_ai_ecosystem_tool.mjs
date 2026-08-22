#!/usr/bin/env node
import fs from 'node:fs';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || process.env.S5_BASE_URL || 'http://127.0.0.1:8000';
const failures = [];
const artifactDir = 'artifacts/visual-review';
fs.mkdirSync(artifactDir, { recursive: true });

const cases = [
  { route: '/herramientas/ecosistema-global-ia/', locale: 'es', expectedCoverage: '12/28', expectedCountry: 'Estados Unidos', excludedWord: 'excluidos' },
  { route: '/en/tools/global-ai-ecosystem/', locale: 'en', expectedCoverage: '12/28', expectedCountry: 'United States', excludedWord: 'excluded' },
];
const viewports = [
  { width: 390, height: 844, name: 'mobile' },
  { width: 1440, height: 1100, name: 'desktop' },
];

const browser = await chromium.launch({ headless: true });
try {
  for (const spec of cases) {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport });
      let response = await page.goto(`${base}${spec.route}`, { waitUntil: 'networkidle' });
      if (!response?.ok()) {
        failures.push(`${spec.route} ${viewport.name}: HTTP ${response?.status() ?? 'none'}`);
        await page.close();
        continue;
      }

      await page.waitForFunction(() => document.querySelectorAll('.s5-ecosystem-rank-row').length > 0);
      const root = page.locator('[data-s5-global-ai-ecosystem]');
      if (await root.count() !== 1) failures.push(`${spec.route} ${viewport.name}: tool root missing`);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 1) failures.push(`${spec.route} ${viewport.name}: page horizontal overflow ${overflow}px`);

      const unlabeled = await root.locator('input, select, button').evaluateAll((nodes) => nodes.filter((node) => {
        if (node.tagName === 'BUTTON') return !(node.textContent || '').trim() && !node.getAttribute('aria-label');
        return !node.getAttribute('aria-label') && (!node.id || !document.querySelector(`label[for="${CSS.escape(node.id)}"]`)) && !node.closest('label');
      }).length);
      if (unlabeled) failures.push(`${spec.route} ${viewport.name}: ${unlabeled} unlabeled tool controls`);

      const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
      if (!jsonLd.some((raw) => { try { return JSON.parse(raw)['@type'] === 'WebApplication'; } catch { return false; } })) failures.push(`${spec.route} ${viewport.name}: WebApplication JSON-LD missing`);

      const coverage = (await page.locator('[data-output="coverage"]').textContent() || '').trim();
      if (!coverage.includes(spec.expectedCoverage) || !coverage.toLowerCase().includes(spec.excludedWord)) failures.push(`${spec.route} ${viewport.name}: default coverage must expose 12/28 and missing-data exclusions, got ${coverage}`);
      const activeCount = (await page.locator('[data-output="active-count"]').textContent() || '').trim();
      if (activeCount !== '2') failures.push(`${spec.route} ${viewport.name}: initial scenario must use two active signals`);
      const leader = (await page.locator('[data-output="leader"]').textContent() || '').trim();
      if (!leader.includes(spec.expectedCountry)) failures.push(`${spec.route} ${viewport.name}: expected US to lead default sourced scenario`);
      if (await page.locator('.s5-ecosystem-rank-row').count() !== 12) failures.push(`${spec.route} ${viewport.name}: expected 12 visible default ranking rows`);

      const firstRankRow = page.locator('.s5-ecosystem-rank-row').first();
      const mobileRankGeometry = await firstRankRow.evaluate((node) => {
        const score = node.querySelector('.s5-ecosystem-score');
        const country = node.querySelector('.s5-ecosystem-country');
        const countryName = country?.querySelector('strong');
        if (!score || !country || !countryName) return null;
        const scoreBox = score.getBoundingClientRect();
        const countryBox = country.getBoundingClientRect();
        const countryNameBox = countryName.getBoundingClientRect();
        const style = getComputedStyle(score);
        const lineHeight = Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize) * 1.2;
        return {
          scoreTop: scoreBox.top,
          scoreBottom: scoreBox.bottom,
          scoreCenter: scoreBox.top + scoreBox.height / 2,
          scoreHeight: scoreBox.height,
          scoreClientWidth: score.clientWidth,
          scoreScrollWidth: score.scrollWidth,
          countryTop: countryBox.top,
          countryBottom: countryBox.bottom,
          countryNameTop: countryNameBox.top,
          countryNameBottom: countryNameBox.bottom,
          lineHeight,
          scoreText: (score.textContent || '').trim(),
        };
      });
      if (!mobileRankGeometry) failures.push(`${spec.route} ${viewport.name}: first ranking row geometry unavailable`);
      if (viewport.width <= 520 && mobileRankGeometry) {
        // Different fonts/weights can have different line-box centers even when they are visibly on the same row.
        // Assert the semantic layout contract instead: the score stays inside the country block, overlaps the
        // country-name line vertically, remains single-line and never overflows its own column.
        const insideCountryBlock = mobileRankGeometry.scoreCenter >= mobileRankGeometry.countryTop - 1 && mobileRankGeometry.scoreCenter <= mobileRankGeometry.countryBottom + 1;
        const overlapsCountryNameLine = mobileRankGeometry.scoreBottom >= mobileRankGeometry.countryNameTop - 2 && mobileRankGeometry.scoreTop <= mobileRankGeometry.countryNameBottom + 2;
        if (!insideCountryBlock || !overlapsCountryNameLine) failures.push(`${spec.route} mobile: score must stay beside the country name in the first grid row`);
        if (mobileRankGeometry.scoreScrollWidth > mobileRankGeometry.scoreClientWidth + 1) failures.push(`${spec.route} mobile: ranking score overflows its score column`);
        if (mobileRankGeometry.scoreHeight > mobileRankGeometry.lineHeight * 1.5) failures.push(`${spec.route} mobile: ranking score wrapped across multiple lines (${mobileRankGeometry.scoreText})`);
      }

      const metricControls = page.locator('[data-metric-active]');
      if (await metricControls.count() !== 6) failures.push(`${spec.route} ${viewport.name}: expected six selectable signals`);
      const datacenterToggle = page.locator('[data-metric-active="data_centers_2025"]');
      if (await datacenterToggle.isChecked()) failures.push(`${spec.route} ${viewport.name}: infrastructure should not be active by default`);
      await datacenterToggle.check();
      await page.waitForFunction(() => (document.querySelector('[data-output="coverage"]')?.textContent || '').includes('9/28'));
      const infrastructureCoverage = (await page.locator('[data-output="coverage"]').textContent() || '').trim();
      if (!infrastructureCoverage.includes('9/28')) failures.push(`${spec.route} ${viewport.name}: enabling infrastructure must expose 9/28 comparable coverage`);
      if (await page.locator('.s5-ecosystem-rank-row').count() !== 9) failures.push(`${spec.route} ${viewport.name}: infrastructure scenario must render nine rows`);

      await page.locator('[data-metric-active="notable_models_2025"]').check();
      await page.waitForFunction(() => document.querySelectorAll('.s5-ecosystem-rank-row').length > 0);
      const tableHeaders = await page.locator('.s5-ecosystem-table thead th').allTextContents();
      if (tableHeaders.length !== 2 + 4 + 1) failures.push(`${spec.route} ${viewport.name}: table header must track four active signals dynamically`);

      response = await page.goto(`${base}${spec.route}?m=private_investment_2025,new_ai_companies_2025&w_private_investment_2025=3&w_new_ai_companies_2025=1&focus=fr`, { waitUntil: 'networkidle' });
      if (!response?.ok()) failures.push(`${spec.route} ${viewport.name}: deep-link failed`);
      await page.waitForFunction(() => document.querySelectorAll('.s5-ecosystem-rank-row').length > 0);
      if (await page.locator('[data-field="focus"]').inputValue() !== 'fr') failures.push(`${spec.route} ${viewport.name}: focus deep-link did not restore`);
      if (await page.locator('[data-metric-weight="private_investment_2025"]').inputValue() !== '3') failures.push(`${spec.route} ${viewport.name}: weight deep-link did not restore`);

      const sourceLinks = await page.locator('.s5-ecosystem-source-list a').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')));
      if (!sourceLinks.some((href) => href?.includes('hai.stanford.edu/ai-index/2026-ai-index-report/economy'))) failures.push(`${spec.route} ${viewport.name}: Stanford economy provenance link missing`);
      if (!sourceLinks.some((href) => href?.includes('global-vibrancy-tool'))) failures.push(`${spec.route} ${viewport.name}: external vibrancy reference missing`);

      const summaryBoxes = await page.locator('.s5-page-intro + .s5-tool-summary-strip > div').evaluateAll((nodes) => nodes.map((node) => {
        const box = node.getBoundingClientRect();
        return { top: box.top, left: box.left, width: box.width };
      }));
      if (summaryBoxes.length !== 4) failures.push(`${spec.route} ${viewport.name}: expected four top summary items`);
      if (viewport.width >= 1000 && summaryBoxes.length === 4 && Math.max(...summaryBoxes.map((box) => box.top)) - Math.min(...summaryBoxes.map((box) => box.top)) > 2) failures.push(`${spec.route} desktop: top summary must remain one row`);
      if (viewport.width <= 520 && summaryBoxes.length === 4 && Math.max(...summaryBoxes.map((box) => box.left)) - Math.min(...summaryBoxes.map((box) => box.left)) > 2) failures.push(`${spec.route} mobile: top summary must stack`);

      const tableWrap = page.locator('.s5-ecosystem-table-wrap');
      const tableGeometry = await tableWrap.evaluate((node) => ({ client: node.clientWidth, scroll: node.scrollWidth }));
      if (viewport.width <= 520 && tableGeometry.scroll <= tableGeometry.client) failures.push(`${spec.route} mobile: wide data table should scroll inside its own region`);

      await page.screenshot({ path: `${artifactDir}/global-ai-ecosystem-${spec.locale}-${viewport.name}.png`, fullPage: true });
      await page.close();
    }
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error('Global AI ecosystem browser QA failed:');
  failures.forEach((failure) => console.error(` - ${failure}`));
  process.exit(1);
}
console.log('Global AI ecosystem browser QA passed: ES/EN, 390/1440, 28-record coverage, strict missing-data exclusion, dynamic signals/table, deep links, provenance, accessible tool controls, single-line mobile ranking scores aligned with country names, and responsive containment verified.');
