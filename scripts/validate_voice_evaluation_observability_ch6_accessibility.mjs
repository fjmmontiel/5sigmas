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
    requiredVisual: ['Runtime', 'Conversación', 'Media', 'Resultado', 'causa raíz', 'recuperación', 'PRIMER OBSERVABLE', 'Diagnóstico del turno', 'SUCCESS'],
    forbidden: [],
  },
  {
    locale: 'en',
    route: '/en/series/agentes-voz-tiempo-real/06-evaluacion-observabilidad-reliability/',
    tableHeader: 'Dimension',
    requiredVisual: ['Runtime', 'Conversation', 'Media', 'Outcome', 'root cause', 'recovery', 'FIRST HARMFUL', 'Turn diagnosis', 'SUCCESS'],
    forbidden: ['Evidencia por turno', 'El primer daño visible', 'Una cadena causal', 'Conversación', 'Resultado', 'causa raíz', 'recuperación', 'PRIMER OBSERVABLE', 'Diagnóstico del turno'],
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

      const visual = page.locator('.s5v-turn-evidence-graph');
      check((await visual.count()) === 1, `${testCase.route}: ${viewport.name} expected exactly one causal evidence visual`);
      if (await visual.count()) {
        const label = (await visual.getAttribute('aria-label'))?.trim() || '';
        check(label.length >= 40, `${testCase.route}: ${viewport.name} evidence visual missing meaningful aria-label`);
        const visualText = await visual.innerText();
        for (const token of testCase.requiredVisual) check(visualText.includes(token), `${testCase.route}: ${viewport.name} evidence visual missing ${JSON.stringify(token)}`);
        for (const token of testCase.forbidden) check(!visualText.includes(token), `${testCase.route}: ${viewport.name} untranslated visual token ${JSON.stringify(token)}`);

        const visualBox = await visual.boundingBox();
        check(Boolean(visualBox && visualBox.width <= viewport.width + 1), `${testCase.route}: ${viewport.name} visual exceeds viewport (${JSON.stringify(visualBox)})`);
        check((await visual.locator('.s5v-arch-map__pipe').count()) === 0, `${testCase.route}: ${viewport.name} legacy linear card pipe returned`);
        check((await visual.locator('[data-s5v-stepper], .s5v__steps--tabs').count()) === 0, `${testCase.route}: ${viewport.name} cosmetic tab/stepper returned`);

        const scroll = visual.locator('.s5v-turn-evidence-graph__scroll');
        check((await scroll.count()) === 1, `${testCase.route}: ${viewport.name} evidence graph scroller missing`);
        const geom = await visual.evaluate((root) => {
          const box = (selector) => {
            const el = root.querySelector(selector);
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, cx: r.left + r.width / 2, cy: r.top + r.height / 2, width: r.width, height: r.height };
          };
          return {
            timeout: box('[data-evidence-event="provider-timeout"]'),
            fallback: box('[data-evidence-event="fallback"]'),
            harm: box('[data-evidence-boundary="first-harmful"]'),
            answer: box('[data-evidence-event="agent-answer"]'),
            firstPlayout: box('[data-evidence-event="first-playout"]'),
            outcome: box('[data-evidence-event="business-success"]'),
            diagnosis: box('[data-evidence-diagnosis="bundle"]'),
            recoveryEdge: Boolean(root.querySelector('[data-evidence-edge="recovery"]')),
            harmEdge: Boolean(root.querySelector('[data-evidence-edge="recovery-cost-to-harm"]')),
            convergenceCount: root.querySelectorAll('[data-evidence-converges]').length,
          };
        });
        for (const [name, box] of Object.entries(geom).filter(([name]) => !['recoveryEdge','harmEdge','convergenceCount'].includes(name))) {
          check(Boolean(box && box.width > 0 && box.height > 0), `${testCase.route}: ${viewport.name} relationship node ${name} is not rendered (${JSON.stringify(box)})`);
        }
        if (geom.timeout && geom.fallback && geom.harm && geom.firstPlayout && geom.outcome && geom.diagnosis) {
          check(geom.timeout.cx < geom.fallback.cx, `${testCase.route}: ${viewport.name} root cause must precede recovery (${JSON.stringify(geom)})`);
          check(geom.fallback.cx < geom.harm.cx, `${testCase.route}: ${viewport.name} recovery must precede first harmful boundary (${JSON.stringify(geom)})`);
          check(geom.firstPlayout.cx >= geom.harm.left && geom.firstPlayout.cx <= geom.harm.right, `${testCase.route}: ${viewport.name} first playout must sit inside harmful-observable band (${JSON.stringify(geom)})`);
          check(geom.outcome.cx > geom.firstPlayout.cx, `${testCase.route}: ${viewport.name} business outcome must remain a later independent observation (${JSON.stringify(geom)})`);
          check(geom.timeout.cy < geom.answer.cy && geom.answer.cy < geom.firstPlayout.cy && geom.firstPlayout.cy < geom.outcome.cy, `${testCase.route}: ${viewport.name} evidence domains collapsed into one row (${JSON.stringify(geom)})`);
          check(geom.diagnosis.left > geom.outcome.cx, `${testCase.route}: ${viewport.name} diagnosis no longer sits downstream of evidence (${JSON.stringify(geom)})`);
        }
        check(geom.recoveryEdge === true && geom.harmEdge === true, `${testCase.route}: ${viewport.name} causal/recovery edges missing (${JSON.stringify(geom)})`);
        check(geom.convergenceCount === 4, `${testCase.route}: ${viewport.name} four evidence domains must converge on diagnosis (${JSON.stringify(geom)})`);

        const scrollState = await scroll.evaluate((el, args) => {
          const maxScroll = el.scrollWidth - el.clientWidth;
          const focusable = el.tabIndex === 0;
          const initial = el.scrollLeft;
          if (args.mobile) el.scrollLeft = maxScroll;
          void el.offsetWidth;
          const diagnosis = el.querySelector('[data-evidence-diagnosis="bundle"]')?.getBoundingClientRect();
          const viewportBox = el.getBoundingClientRect();
          return {
            maxScroll,
            initial,
            actualScroll: el.scrollLeft,
            focusable,
            diagnosisReachable: diagnosis ? diagnosis.left >= viewportBox.left - 4 && diagnosis.right <= viewportBox.right + 4 : false,
          };
        }, { mobile: viewport.name === 'mobile' });
        check(scrollState.focusable === true, `${testCase.route}: ${viewport.name} graph scroller is not keyboard-focusable`);
        if (viewport.name === 'desktop') {
          check(scrollState.maxScroll <= 2, `${testCase.route}: desktop evidence graph still clips behind an internal horizontal scroll (${JSON.stringify(scrollState)})`);
          check(scrollState.diagnosisReachable === true, `${testCase.route}: desktop diagnosis bundle is not fully visible without scrolling (${JSON.stringify(scrollState)})`);
        }
        if (viewport.name === 'mobile') {
          check(scrollState.maxScroll > 300, `${testCase.route}: mobile causal graph did not preserve topology through horizontal reachability (${JSON.stringify(scrollState)})`);
          check(scrollState.actualScroll > 250, `${testCase.route}: mobile causal graph horizontal scroll is inert (${JSON.stringify(scrollState)})`);
          check(scrollState.diagnosisReachable === true, `${testCase.route}: mobile diagnosis bundle is not reachable at graph end (${JSON.stringify(scrollState)})`);
          await scroll.screenshot({ path: path.join(outDir, `voice-eval-ch6-${testCase.locale}-mobile-evidence-end.png`), animations: 'disabled' });
          await scroll.evaluate((el) => { el.scrollLeft = Math.round((el.scrollWidth - el.clientWidth) / 2); });
          await scroll.screenshot({ path: path.join(outDir, `voice-eval-ch6-${testCase.locale}-mobile-evidence-mid.png`), animations: 'disabled' });
          await scroll.evaluate((el) => { el.scrollLeft = 0; });
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

console.log('Voice evaluation/observability chapter browser/accessibility QA PASS: ES/EN locale, relationship-first causal geometry, recovery path, harmful-observable boundary, four-domain evidence convergence, mobile topology reachability, reduced-motion, runtime matrix, page overflow, runtime errors and screenshots are valid.');
