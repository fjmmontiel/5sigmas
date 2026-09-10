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
    route: '/series/agentes-voz-tiempo-real/06-evaluacion-observabilidad-reliability/',
    tableHeader: 'Dimensión',
    requiredVisual: ['Resultado', 'Conversación', 'Media', 'Runtime', 'primer observable dañino', 'causa raíz'],
    forbidden: [],
  },
  {
    locale: 'en',
    route: '/en/series/agentes-voz-tiempo-real/06-evaluacion-observabilidad-reliability/',
    tableHeader: 'Dimension',
    requiredVisual: ['Outcome', 'Conversation', 'Media', 'Runtime', 'first harmful observable', 'root cause'],
    forbidden: ['Capas de evidencia', 'Evaluación y reliability', '¿se completó la tarea correcta?', 'primer observable dañino', 'causa raíz'],
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
      check(((await page.locator('main h1').first().innerText()).trim()).length >= 30, `${testCase.route}: ${viewport.name} missing article h1`);
      check(await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches), `${testCase.route}: ${viewport.name} reduced-motion emulation inactive`);

      const visual = page.locator('.s5v-turn-evidence-stack');
      check((await visual.count()) === 1, `${testCase.route}: ${viewport.name} expected exactly one turn-evidence visual`);
      if (await visual.count()) {
        const label = (await visual.getAttribute('aria-label'))?.trim() || '';
        check(label.length >= 20, `${testCase.route}: ${viewport.name} evidence visual missing meaningful aria-label`);
        const visualText = await visual.innerText();
        for (const token of testCase.requiredVisual) check(visualText.includes(token), `${testCase.route}: ${viewport.name} evidence visual missing ${JSON.stringify(token)}`);
        for (const token of testCase.forbidden) check(!visualText.includes(token), `${testCase.route}: ${viewport.name} untranslated visual token ${JSON.stringify(token)}`);

        const visualBox = await visual.boundingBox();
        check(Boolean(visualBox && visualBox.width <= viewport.width + 1), `${testCase.route}: ${viewport.name} visual exceeds viewport (${JSON.stringify(visualBox)})`);
        const pipe = visual.locator('.s5v-arch-map__pipe').first();
        const pipeBox = await pipe.boundingBox();
        check(Boolean(pipeBox), `${testCase.route}: ${viewport.name} evidence pipe is not visible`);
        const cards = pipe.locator(':scope > span');
        check((await cards.count()) === 4, `${testCase.route}: ${viewport.name} expected four evidence cards`);
        for (let index = 0; index < await cards.count(); index += 1) {
          const cardBox = await cards.nth(index).boundingBox();
          check(Boolean(cardBox && cardBox.width >= (viewport.name === 'mobile' ? 120 : 55)), `${testCase.route}: ${viewport.name} evidence card ${index + 1} collapsed (${JSON.stringify(cardBox)})`);
          check(Boolean(cardBox && cardBox.height <= (viewport.name === 'mobile' ? 180 : 200)), `${testCase.route}: ${viewport.name} evidence card ${index + 1} wraps pathologically (${JSON.stringify(cardBox)})`);
        }
        await visual.screenshot({ path: path.join(outDir, `voice-eval-ch6-${testCase.locale}-${viewport.name}-evidence.png`), animations: 'disabled' });
      }

      const overflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      check(overflow.scrollWidth <= overflow.clientWidth + 1, `${testCase.route}: ${viewport.name} horizontal page overflow ${JSON.stringify(overflow)}`);

      const runtimeTable = page.locator('main table').filter({ hasText: testCase.tableHeader }).last();
      check((await runtimeTable.count()) === 1, `${testCase.route}: ${viewport.name} runtime decision table missing`);
      if (await runtimeTable.count()) {
        const tableState = await runtimeTable.evaluate((table, args) => {
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
          scroller.dataset.s5Ch6EvalScroller = args.marker;
          scroller.scrollLeft = maxScroll;
          void scroller.offsetWidth;
          const scrollerBox = scroller.getBoundingClientRect();
          const lastBox = lastHeader.getBoundingClientRect();
          return { hasLastHeader: true, hasScroller: true, maxScroll, actualScroll: scroller.scrollLeft, lastColumnReachable: lastBox.left >= scrollerBox.left - 2 && lastBox.right <= scrollerBox.right + 2 };
        }, { viewportName: viewport.name, marker: `${testCase.locale}-${viewport.name}` });
        check(tableState.hasLastHeader === true, `${testCase.route}: ${viewport.name} runtime table last header missing`);
        if (viewport.name === 'desktop') {
          check(tableState.desktopFits === true, `${testCase.route}: desktop runtime decision matrix clipped (${JSON.stringify(tableState)})`);
        } else {
          check(tableState.hasScroller === true, `${testCase.route}: mobile runtime matrix clips without horizontal scroll (${JSON.stringify(tableState)})`);
          check(Number(tableState.maxScroll) > 20 && Number(tableState.actualScroll) > 20, `${testCase.route}: mobile runtime matrix horizontal scroll is inert (${JSON.stringify(tableState)})`);
          check(tableState.lastColumnReachable === true, `${testCase.route}: mobile runtime matrix final column is not reachable (${JSON.stringify(tableState)})`);
          const scroller = page.locator(`[data-s5-ch6-eval-scroller="${testCase.locale}-${viewport.name}"]`);
          if (await scroller.count()) await scroller.screenshot({ path: path.join(outDir, `voice-eval-ch6-${testCase.locale}-mobile-runtime-table-end.png`), animations: 'disabled' });
        }
      }

      for (const error of runtimeErrors) failures.push(`${testCase.route}: ${viewport.name} runtime error: ${error}`);
      for (const error of consoleErrors.filter((entry) => !/favicon|Failed to load resource.*404/i.test(entry))) failures.push(`${testCase.route}: ${viewport.name} console error: ${error}`);
      await page.screenshot({ path: path.join(outDir, `voice-eval-ch6-${testCase.locale}-${viewport.name}-page.png`), fullPage: true, animations: 'disabled' });
      await context.close();
    }
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`Voice evaluation/observability chapter browser/accessibility QA failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Voice evaluation/observability chapter browser/accessibility QA PASS: ES/EN language, localized evidence visual, four-card geometry, reduced-motion, desktop/mobile layout, runtime-matrix reachability, page overflow, runtime errors and review screenshots are valid.');
