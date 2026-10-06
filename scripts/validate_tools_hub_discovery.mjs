import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const evidenceDir = 'artifacts/visual-review';
fs.mkdirSync(evidenceDir, { recursive: true });

const specs = [
  { locale: 'es', route: '/herramientas/', query: 'latencia', all: 'Todas', rag: 'RAG' },
  { locale: 'en', route: '/en/tools/', query: 'latency', all: 'All', rag: 'RAG' },
];
const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
];

const browser = await chromium.launch({ headless: true });
const failures = [];
let checks = 0;

try {
  for (const spec of specs) {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      const pageErrors = [];
      page.on('pageerror', error => pageErrors.push(error.message));
      const url = base + spec.route;

      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForSelector('[data-s5-tools-hub][data-tools-discovery-ready="true"]', { timeout: 5000 });

        const cards = page.locator('[data-s5-tool-card]');
        assert.equal(await cards.count(), 18, spec.locale + ' must expose exactly 18 tool cards');
        checks += 1;

        const visibleCount = async () => page.locator('[data-s5-tool-card]:visible').count();
        assert.equal(await visibleCount(), 18, spec.locale + ' starts with all 18 tools visible');
        checks += 1;

        const ragButton = page.getByRole('button', { name: spec.rag, exact: true });
        await ragButton.click();
        assert.equal(await ragButton.getAttribute('aria-pressed'), 'true', spec.locale + ' RAG filter must expose pressed state');
        assert.equal(await visibleCount(), 2, spec.locale + ' RAG filter must expose exactly two tools');
        assert.equal(await page.locator('[data-s5-tool-count]').textContent(), '2');
        checks += 3;

        await page.getByRole('button', { name: spec.all, exact: true }).click();
        const search = page.locator('[data-s5-tool-search]');
        await search.fill(spec.query);
        assert.equal(await visibleCount(), 2, spec.locale + ' latency search should find the LLM and voice latency tools');
        assert.equal(await page.locator('[data-s5-tool-count]').textContent(), '2');
        checks += 2;

        await search.fill('zzzz-no-match-5sigmas');
        assert.equal(await visibleCount(), 0, spec.locale + ' impossible query must hide all cards');
        assert.equal(await page.locator('.s5-tool-discovery__empty').isVisible(), true, spec.locale + ' must explain an empty result');
        checks += 2;

        await search.fill('');
        assert.equal(await visibleCount(), 18, spec.locale + ' clearing search restores all cards');
        checks += 1;

        const layout = await page.evaluate(() => {
          const input = document.querySelector('[data-s5-tool-search]');
          const filters = document.querySelector('.s5-tool-filter-group');
          const rect = node => {
            const r = node?.getBoundingClientRect();
            return r ? { left: r.left, right: r.right, width: r.width, top: r.top, bottom: r.bottom } : null;
          };
          return {
            viewportWidth: innerWidth,
            scrollWidth: document.documentElement.scrollWidth,
            input: rect(input),
            filters: rect(filters),
          };
        });
        assert.ok(layout.scrollWidth <= layout.viewportWidth + 1, spec.locale + ' tools hub must not overflow horizontally');
        assert.ok(layout.input && layout.input.left >= 0 && layout.input.right <= layout.viewportWidth + 1, spec.locale + ' search must fit viewport');
        assert.ok(layout.filters && layout.filters.left >= 0 && layout.filters.right <= layout.viewportWidth + 1, spec.locale + ' filters must fit viewport');
        assert.deepEqual(pageErrors, [], spec.locale + ' hub must not emit runtime errors');
        checks += 4;

        await page.screenshot({
          path: `${evidenceDir}/tools-hub-${spec.locale}-${viewport.name}.png`,
          fullPage: true,
        });
      } catch (error) {
        failures.push({ locale: spec.locale, viewport: viewport.name, url, message: String(error), stack: error.stack });
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(JSON.stringify({ status: 'FAIL', checks, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ status: 'PASS', checks, locales: 2, viewports: 2, tools: 18 }));
