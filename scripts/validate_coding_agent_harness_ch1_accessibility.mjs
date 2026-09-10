#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const cases = [
  {
    locale: 'es',
    route: '/series/coding-agents-agent-harnesses/01-que-es-agent-harness/',
    tableHeader: 'Responsabilidad',
    requiredVisual: ['Modelo ≠ harness', 'Contrato de tarea', 'Modelo', 'Harness + entorno', 'Verificador / stop', 'continuidad causal'],
    forbidden: [],
  },
  {
    locale: 'en',
    route: '/en/series/coding-agents-agent-harnesses/01-que-es-agent-harness/',
    tableHeader: 'Responsibility',
    requiredVisual: ['Model ≠ harness', 'Task contract', 'Model', 'Harness + environment', 'Verifier / stop', 'causal continuity'],
    forbidden: ['Fronteras de responsabilidad', 'Modelo ≠ harness', 'Contrato de tarea', 'propone la siguiente acción', 'Harness + entorno', 'Verificador / stop', 'continuidad causal'],
  },
];

const viewports = [
  { name: 'desktop', width: 1440, height: 1000, hasTouch: false },
  { name: 'mobile', width: 390, height: 844, hasTouch: true },
];

const browser = await chromium.launch({ headless: true });
try {
  for (const testCase of cases) {
    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        hasTouch: viewport.hasTouch,
        isMobile: viewport.hasTouch,
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      const runtimeErrors = [];
      const consoleErrors = [];
      page.on('pageerror', (error) => runtimeErrors.push(error.message));
      page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });

      const response = await page.goto(`${base}${testCase.route}`, { waitUntil: 'networkidle' });
      check(response?.ok(), `${testCase.route}: ${viewport.name} HTTP ${response?.status() ?? 'no response'}`);
      const htmlLang = await page.locator('html').getAttribute('lang');
      check((htmlLang || '').toLowerCase().startsWith(testCase.locale), `${testCase.route}: ${viewport.name} wrong html lang ${htmlLang}`);
      check(((await page.locator('main h1').first().innerText()).trim()).length >= 35, `${testCase.route}: ${viewport.name} missing article h1`);
      check(await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches), `${testCase.route}: ${viewport.name} reduced-motion emulation inactive`);

      const visual = page.locator('.s5v-coding-harness-loop');
      check((await visual.count()) === 1, `${testCase.route}: ${viewport.name} expected exactly one harness visual`);
      if (await visual.count()) {
        const label = (await visual.getAttribute('aria-label'))?.trim() || '';
        check(label.length >= 20, `${testCase.route}: ${viewport.name} harness visual missing meaningful aria-label`);
        const visualText = await visual.innerText();
        for (const token of testCase.requiredVisual) check(visualText.includes(token), `${testCase.route}: ${viewport.name} harness visual missing ${JSON.stringify(token)}`);
        for (const token of testCase.forbidden) check(!visualText.includes(token), `${testCase.route}: ${viewport.name} untranslated visual token ${JSON.stringify(token)}`);

        const visualBox = await visual.boundingBox();
        check(Boolean(visualBox && visualBox.width <= viewport.width + 1), `${testCase.route}: ${viewport.name} visual exceeds viewport (${JSON.stringify(visualBox)})`);
        const pipe = visual.locator('.s5v-arch-map__pipe').first();
        const cards = pipe.locator(':scope > span');
        check((await cards.count()) === 4, `${testCase.route}: ${viewport.name} expected four responsibility cards`);
        for (let index = 0; index < await cards.count(); index += 1) {
          const box = await cards.nth(index).boundingBox();
          check(Boolean(box && box.width >= (viewport.name === 'mobile' ? 120 : 55)), `${testCase.route}: ${viewport.name} card ${index + 1} collapsed (${JSON.stringify(box)})`);
          check(Boolean(box && box.height <= (viewport.name === 'mobile' ? 190 : 210)), `${testCase.route}: ${viewport.name} card ${index + 1} wraps pathologically (${JSON.stringify(box)})`);
        }
        await visual.screenshot({ path: path.join(outDir, `coding-harness-ch1-${testCase.locale}-${viewport.name}-visual.png`), animations: 'disabled' });
      }

      const overflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      check(overflow.scrollWidth <= overflow.clientWidth + 1, `${testCase.route}: ${viewport.name} horizontal page overflow ${JSON.stringify(overflow)}`);

      const comparisonTable = page.locator('main table').filter({ hasText: testCase.tableHeader }).last();
      check((await comparisonTable.count()) === 1, `${testCase.route}: ${viewport.name} assistant/agent comparison table missing`);
      if (await comparisonTable.count()) {
        const state = await comparisonTable.evaluate((table, args) => {
          const lastHeader = table.querySelector('thead th:last-child');
          if (!lastHeader) return { hasLastHeader: false };
          if (args.viewportName !== 'mobile') {
            const tableBox = table.getBoundingClientRect();
            const lastBox = lastHeader.getBoundingClientRect();
            return { hasLastHeader: true, desktopFits: tableBox.right <= window.innerWidth + 1 && lastBox.right <= window.innerWidth + 1 };
          }
          let scroller = table.parentElement;
          while (scroller && scroller !== document.body) {
            const style = getComputedStyle(scroller);
            if (scroller.scrollWidth > scroller.clientWidth + 1 && (style.overflowX === 'auto' || style.overflowX === 'scroll')) break;
            scroller = scroller.parentElement;
          }
          if (!scroller || scroller === document.body) return { hasLastHeader: true, hasScroller: false };
          const maxScroll = scroller.scrollWidth - scroller.clientWidth;
          scroller.dataset.s5CodingHarnessScroller = args.marker;
          scroller.scrollLeft = maxScroll;
          void scroller.offsetWidth;
          const scrollerBox = scroller.getBoundingClientRect();
          const lastBox = lastHeader.getBoundingClientRect();
          return {
            hasLastHeader: true,
            hasScroller: true,
            maxScroll,
            actualScroll: scroller.scrollLeft,
            lastColumnReachable: lastBox.left >= scrollerBox.left - 2 && lastBox.right <= scrollerBox.right + 2,
          };
        }, { viewportName: viewport.name, marker: `${testCase.locale}-${viewport.name}` });
        check(state.hasLastHeader === true, `${testCase.route}: ${viewport.name} comparison table last header missing`);
        if (viewport.name === 'desktop') {
          check(state.desktopFits === true, `${testCase.route}: desktop comparison table clipped (${JSON.stringify(state)})`);
        } else if (state.hasScroller) {
          check(Number(state.maxScroll) > 10 && Number(state.actualScroll) > 10, `${testCase.route}: mobile table scroll is inert (${JSON.stringify(state)})`);
          check(state.lastColumnReachable === true, `${testCase.route}: mobile final table column not reachable (${JSON.stringify(state)})`);
          const scroller = page.locator(`[data-s5-coding-harness-scroller="${testCase.locale}-${viewport.name}"]`);
          if (await scroller.count()) await scroller.screenshot({ path: path.join(outDir, `coding-harness-ch1-${testCase.locale}-mobile-table-end.png`), animations: 'disabled' });
        } else {
          const tableBox = await comparisonTable.boundingBox();
          check(Boolean(tableBox && tableBox.width <= viewport.width + 1), `${testCase.route}: mobile table clips without a scroll container (${JSON.stringify(tableBox)})`);
        }
      }

      for (const error of runtimeErrors) failures.push(`${testCase.route}: ${viewport.name} runtime error: ${error}`);
      for (const error of consoleErrors.filter((entry) => !/favicon|Failed to load resource.*404/i.test(entry))) failures.push(`${testCase.route}: ${viewport.name} console error: ${error}`);
      await page.screenshot({ path: path.join(outDir, `coding-harness-ch1-${testCase.locale}-${viewport.name}-page.png`), fullPage: true, animations: 'disabled' });
      await context.close();
    }
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`Coding agent harness chapter browser/accessibility QA failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Coding agent harness chapter browser/accessibility QA PASS: ES/EN language, localized harness visual, four-card geometry, reduced-motion, desktop/mobile layout, comparison-table reachability, page overflow, runtime errors and review screenshots are valid.');
