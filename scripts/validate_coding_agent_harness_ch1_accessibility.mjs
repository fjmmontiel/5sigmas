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
    requiredVisual: ['Modelo ≠ harness', 'La autonomía está en el bucle', 'Tarea', 'Contexto', 'Modelo', 'Policy + dispatch', 'Workspace + tools', 'Observación', 'Verificar', 'continue', 'Done / handback', 'run state · provenance · checkpoint · evidence', 'cerrar el feedback loop'],
    forbidden: [],
  },
  {
    locale: 'en',
    route: '/en/series/coding-agents-agent-harnesses/01-que-es-agent-harness/',
    tableHeader: 'Responsibility',
    requiredVisual: ['Model ≠ harness', 'Autonomy lives in the loop', 'Task', 'Context', 'Model', 'Policy + dispatch', 'Workspace + tools', 'Observation', 'Verify', 'continue', 'Done / handback', 'run state · provenance · checkpoint · evidence', 'closing the feedback loop'],
    forbidden: ['La autonomía está en el bucle', 'Tarea', 'Contexto', 'Modelo', 'propone; no ejecuta', 'contexto acotado', 'propuesta', 'acción autorizada', 'Observación', 'resultado vuelve', 'Verificar', 'nueva evidencia', 'flujo causal', 'estado persistente', 'cerrar el feedback loop'],
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
        check(label.length >= 35, `${testCase.route}: ${viewport.name} harness visual missing meaningful aria-label`);
        const visualText = await visual.innerText();
        const normalizedVisualText = visualText.toLocaleLowerCase();
        for (const token of testCase.requiredVisual) check(normalizedVisualText.includes(token.toLocaleLowerCase()), `${testCase.route}: ${viewport.name} harness visual missing ${JSON.stringify(token)}`);
        for (const token of testCase.forbidden) check(!normalizedVisualText.includes(token.toLocaleLowerCase()), `${testCase.route}: ${viewport.name} untranslated visual token ${JSON.stringify(token)}`);

        const visualBox = await visual.boundingBox();
        check(Boolean(visualBox && visualBox.width <= viewport.width + 1), `${testCase.route}: ${viewport.name} visual exceeds viewport (${JSON.stringify(visualBox)})`);
        check((await visual.locator('.s5v-arch-map__pipe').count()) === 0, `${testCase.route}: ${viewport.name} obsolete linear card pipe rendered`);
        check((await visual.locator('.s5v__steps--tabs').count()) === 0, `${testCase.route}: ${viewport.name} cosmetic tabs rendered`);

        const geometry = await visual.evaluate((root) => {
          const box = (selector) => {
            const node = root.querySelector(selector);
            if (!node) return null;
            const r = node.getBoundingClientRect();
            return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
          };
          return {
            context: box('[data-node="context"]'),
            model: box('[data-node="model"]'),
            dispatch: box('[data-node="dispatch"]'),
            workspace: box('[data-node="workspace"]'),
            observation: box('[data-node="observation"]'),
            verifier: box('[data-node="verifier"]'),
            handback: box('[data-node="handback"]'),
            continueEdge: box('[data-edge="continue-return"]'),
            stopEdge: box('[data-edge="stop-exit"]'),
            stateRail: box('[data-state-rail="run-state"]'),
          };
        });
        for (const [name, box] of Object.entries(geometry)) check(Boolean(box && box.width > 1 && box.height >= 0), `${testCase.route}: ${viewport.name} relationship geometry missing ${name} (${JSON.stringify(box)})`);
        if (geometry.model && geometry.context && geometry.dispatch && geometry.workspace && geometry.observation && geometry.verifier && geometry.handback) {
          check(geometry.model.cy < geometry.context.cy - 70, `${testCase.route}: ${viewport.name} model is not visibly outside/above the harness loop (${JSON.stringify(geometry)})`);
          check(geometry.context.cx < geometry.dispatch.cx - 80, `${testCase.route}: ${viewport.name} context→dispatch direction collapsed (${JSON.stringify(geometry)})`);
          check(geometry.workspace.cx > geometry.dispatch.cx + 180, `${testCase.route}: ${viewport.name} workspace no longer sits across the execution boundary (${JSON.stringify(geometry)})`);
          check(geometry.observation.cy > geometry.dispatch.cy + 70, `${testCase.route}: ${viewport.name} observation is not visibly downstream of execution (${JSON.stringify(geometry)})`);
          check(geometry.verifier.cx < geometry.observation.cx - 60, `${testCase.route}: ${viewport.name} observation→verifier direction collapsed (${JSON.stringify(geometry)})`);
          check(geometry.handback.cy > geometry.verifier.cy + 55, `${testCase.route}: ${viewport.name} stop/handback exit no longer leaves the feedback loop (${JSON.stringify(geometry)})`);
        }
        if (geometry.continueEdge && geometry.context && geometry.verifier) {
          check(geometry.continueEdge.left <= geometry.context.cx + 12 && geometry.continueEdge.right >= geometry.verifier.left - 12, `${testCase.route}: ${viewport.name} continue edge no longer connects the verifier boundary back toward context (${JSON.stringify(geometry.continueEdge)})`);
          check(geometry.continueEdge.height > 40, `${testCase.route}: ${viewport.name} continue edge collapsed into a cosmetic connector (${JSON.stringify(geometry.continueEdge)})`);
        }
        if (geometry.stateRail && geometry.context && geometry.observation) {
          check(geometry.stateRail.top > geometry.context.cy && geometry.stateRail.right >= geometry.observation.cx, `${testCase.route}: ${viewport.name} persistent state rail no longer underpins the loop (${JSON.stringify(geometry.stateRail)})`);
        }

        const scroller = visual.locator('.s5v-harness-loop__scroll');
        check((await scroller.count()) === 1, `${testCase.route}: ${viewport.name} topology-preserving scroll region missing`);
        if (await scroller.count()) {
          check((await scroller.getAttribute('tabindex')) === '0', `${testCase.route}: ${viewport.name} visual scroll region is not keyboard focusable`);
          const scrollState = await scroller.evaluate((node) => {
            const maxScroll = node.scrollWidth - node.clientWidth;
            node.scrollLeft = maxScroll;
            void node.offsetWidth;
            return { maxScroll, actualScroll: node.scrollLeft, clientWidth: node.clientWidth, scrollWidth: node.scrollWidth };
          });
          if (viewport.name === 'mobile') {
            check(scrollState.maxScroll > 300 && scrollState.actualScroll > 300, `${testCase.route}: mobile relationship canvas did not preserve topology through horizontal scroll (${JSON.stringify(scrollState)})`);
            await scroller.screenshot({ path: path.join(outDir, `coding-harness-ch1-${testCase.locale}-mobile-loop-end.png`), animations: 'disabled' });
            await scroller.evaluate((node) => { node.scrollLeft = 0; });
          } else {
            check(scrollState.scrollWidth >= 900, `${testCase.route}: desktop relationship canvas collapsed unexpectedly (${JSON.stringify(scrollState)})`);
            await scroller.evaluate((node) => { node.scrollLeft = 0; });
          }
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

console.log('Coding agent harness chapter browser/accessibility QA PASS: ES/EN language, relationship-first feedback-loop geometry, model/harness/environment boundaries, continue/stop branching, persistent state rail, topology-preserving mobile scroll, reduced-motion, comparison-table reachability, page overflow, runtime errors and review screenshots are valid.');