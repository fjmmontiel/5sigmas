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
    route: '/series/context-engineering-memory-mcp/02-context-budgets-prioritisation-compaction-provenance/',
    required: [
      'Budget ≠ capacidad máxima', 'CANDIDATOS · FUERA DEL MODELO', 'Política · 4k',
      'Restricciones', 'VERBATIM', 'COMPACT', 'REFERENCIA', 'DROP / DEFER',
      'CONTEXTO ACTIVO · Bdynamic = 60k', 'Modelo', 'PROVENANCE / LINEAGE',
      'HEAD cambia → STALE', 'derived_from · version · transform · rehydrate'
    ],
    forbidden: [],
  },
  {
    locale: 'en',
    route: '/en/series/context-engineering-memory-mcp/02-context-budgets-prioritisation-compaction-provenance/',
    required: [
      'Budget ≠ maximum capacity', 'CANDIDATES · OUTSIDE THE MODEL', 'Policy · 4k',
      'Constraints', 'VERBATIM', 'COMPACT', 'REFERENCE', 'DROP / DEFER',
      'ACTIVE CONTEXT · Bdynamic = 60k', 'Model', 'PROVENANCE / LINEAGE',
      'HEAD changes → STALE', 'derived_from · version · transform · rehydrate'
    ],
    forbidden: [
      'capacidad máxima', 'CANDIDATOS · FUERA DEL MODELO', 'Política · 4k', 'Restricciones',
      'REFERENCIA', 'CONTEXTO ACTIVO', 'Modelo', 'HEAD cambia', 'sólo esto cruza',
      'flujo hacia el contexto activo', 'lineage hacia la fuente'
    ],
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
      check(await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches), `${testCase.route}: ${viewport.name} reduced-motion emulation inactive`);

      const visual = page.locator('.s5v-context-budget-lineage');
      check((await visual.count()) === 1, `${testCase.route}: ${viewport.name} expected exactly one budget-lineage visual`);
      if (await visual.count()) {
        const label = (await visual.getAttribute('aria-label'))?.trim() || '';
        check(label.length >= 35, `${testCase.route}: ${viewport.name} visual missing meaningful aria-label`);
        const text = (await visual.innerText()).toLocaleLowerCase();
        for (const token of testCase.required) check(text.includes(token.toLocaleLowerCase()), `${testCase.route}: ${viewport.name} visual missing ${JSON.stringify(token)}`);
        for (const token of testCase.forbidden) check(!text.includes(token.toLocaleLowerCase()), `${testCase.route}: ${viewport.name} untranslated visual token ${JSON.stringify(token)}`);
        check((await visual.locator('.s5v-arch-map__pipe').count()) === 0, `${testCase.route}: obsolete linear pipe rendered`);
        check((await visual.locator('.s5v__steps--tabs,[data-s5v-stepper]').count()) === 0, `${testCase.route}: cosmetic interaction rendered`);

        const geometry = await visual.evaluate((root) => {
          const box = (selector) => {
            const node = root.querySelector(selector);
            if (!node) return null;
            const r = node.getBoundingClientRect();
            return { left:r.left, right:r.right, top:r.top, bottom:r.bottom, width:r.width, height:r.height, cx:r.left+r.width/2, cy:r.top+r.height/2 };
          };
          return {
            stage: box('.cb-stage'), scroller: box('.cb-scroll'),
            candidate: box('[data-boundary="candidate-universe"]'), budget: box('[data-boundary="budget-envelope"]'), provenance: box('[data-boundary="provenance-plane"]'),
            policy: box('[data-source="policy"]'), logs: box('[data-source="logs"]'), history: box('[data-source="history"]'), stale: box('[data-source="stale"]'),
            gate: box('[data-node="policy-gate"]'), verbatim: box('[data-node="verbatim"]'), compact: box('[data-node="compact"]'), reference: box('[data-node="reference"]'), drop: box('[data-node="drop"]'), model: box('[data-node="model"]'),
            repoSource: box('[data-source-version="repo-a1b2c3"]'), repoNew: box('[data-node="repo-new-version"]'), invalidate: box('[data-edge="invalidate-derived-context"]'),
            logsLineage: box('[data-edge="logs-lineage"]'), historyLineage: box('[data-edge="history-lineage"]'), repoLineage: box('[data-edge="repo-lineage"]'),
          };
        });

        for (const [name, box] of Object.entries(geometry)) check(Boolean(box && box.width >= 0 && box.height >= 0), `${testCase.route}: ${viewport.name} missing geometry ${name}`);
        if (geometry.candidate && geometry.gate && geometry.budget && geometry.model) {
          check(geometry.candidate.cx < geometry.gate.cx - 120, `${testCase.route}: ${viewport.name} candidate→policy convergence collapsed`);
          check(geometry.gate.cx < geometry.budget.cx - 250, `${testCase.route}: ${viewport.name} policy→bounded-context branching collapsed`);
          check(geometry.budget.cx < geometry.model.cx - 150, `${testCase.route}: ${viewport.name} active-context→model boundary collapsed`);
        }
        if (geometry.verbatim && geometry.compact && geometry.reference && geometry.drop) {
          check(geometry.verbatim.cy < geometry.compact.cy - 70, `${testCase.route}: ${viewport.name} verbatim/compact branches collapsed`);
          check(geometry.compact.cy < geometry.reference.cy - 70, `${testCase.route}: ${viewport.name} compact/reference branches collapsed`);
          check(geometry.reference.cy < geometry.drop.cy - 70, `${testCase.route}: ${viewport.name} reference/drop branches collapsed`);
        }
        if (geometry.provenance && geometry.budget) {
          check(geometry.provenance.top > geometry.budget.bottom + 55, `${testCase.route}: ${viewport.name} provenance plane collapsed into active context`);
          check(geometry.provenance.width > geometry.budget.width * 2.5, `${testCase.route}: ${viewport.name} provenance plane no longer spans source lineage`);
        }
        if (geometry.logsLineage && geometry.historyLineage && geometry.repoLineage) {
          check(geometry.logsLineage.height > 120, `${testCase.route}: ${viewport.name} logs lineage collapsed into cosmetic connector`);
          check(geometry.historyLineage.height > 90, `${testCase.route}: ${viewport.name} history lineage collapsed into cosmetic connector`);
          check(geometry.repoLineage.height > 180, `${testCase.route}: ${viewport.name} repo lineage collapsed into cosmetic connector`);
        }
        if (geometry.repoSource && geometry.repoNew && geometry.invalidate) {
          check(geometry.repoNew.cx > geometry.repoSource.cx + 120, `${testCase.route}: ${viewport.name} source-version change no longer has direction`);
          check(geometry.invalidate.height > 100, `${testCase.route}: ${viewport.name} version change no longer propagates invalidation to derived context`);
        }

        const scroller = visual.locator('.cb-scroll');
        check((await scroller.count()) === 1, `${testCase.route}: ${viewport.name} topology-preserving scroll region missing`);
        if (await scroller.count()) {
          check((await scroller.getAttribute('tabindex')) === '0', `${testCase.route}: ${viewport.name} scroll region not keyboard focusable`);
          const state = await scroller.evaluate((node) => {
            const maxScroll = node.scrollWidth - node.clientWidth;
            node.scrollLeft = maxScroll; void node.offsetWidth;
            const stage = node.querySelector('.cb-stage')?.getBoundingClientRect(); const r = node.getBoundingClientRect();
            return { maxScroll, actualScroll:node.scrollLeft, stageWidth:stage?.width ?? 0, stageRight:stage?.right ?? 0, scrollerRight:r.right };
          });
          if (viewport.name === 'mobile') {
            check(state.maxScroll > 400 && state.actualScroll > 400, `${testCase.route}: mobile topology did not survive horizontal scroll (${JSON.stringify(state)})`);
            await scroller.screenshot({ path: path.join(outDir, `context-engineering-ch2-${testCase.locale}-mobile-visual-end.png`), animations:'disabled' });
          } else {
            check(state.maxScroll <= 1 && state.actualScroll <= 1, `${testCase.route}: desktop visual clips horizontally (${JSON.stringify(state)})`);
            check(state.stageWidth >= 900 && state.stageRight <= state.scrollerRight + 1, `${testCase.route}: desktop stage is too narrow or escapes viewport (${JSON.stringify(state)})`);
          }
          await scroller.evaluate((node) => { node.scrollLeft = 0; });
        }
        await visual.screenshot({ path:path.join(outDir, `context-engineering-ch2-${testCase.locale}-${viewport.name}-visual.png`), animations:'disabled' });
      }

      const articleText = (await page.locator('main').innerText()).toLocaleLowerCase();
      for (const token of ['compaction','provenance','b_dynamic','stale']) check(articleText.includes(token.toLocaleLowerCase()), `${testCase.route}: ${viewport.name} article missing ${token}`);
      const overflow = await page.evaluate(() => ({ scrollWidth:document.documentElement.scrollWidth, clientWidth:document.documentElement.clientWidth }));
      check(overflow.scrollWidth <= overflow.clientWidth + 1, `${testCase.route}: ${viewport.name} page overflow ${JSON.stringify(overflow)}`);
      for (const error of runtimeErrors) failures.push(`${testCase.route}: ${viewport.name} runtime error: ${error}`);
      for (const error of consoleErrors.filter((entry) => !/favicon|Failed to load resource.*404/i.test(entry))) failures.push(`${testCase.route}: ${viewport.name} console error: ${error}`);
      await page.screenshot({ path:path.join(outDir, `context-engineering-ch2-${testCase.locale}-${viewport.name}-page.png`), fullPage:true, animations:'disabled' });
      await context.close();
    }
  }
} finally { await browser.close(); }

if (failures.length) {
  console.error(`Context engineering chapter 3.2 browser/accessibility QA failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Context engineering chapter 3.2 browser/accessibility QA PASS: ES/EN, finite-budget branching, provenance lineage, version invalidation, desktop fit, topology-preserving mobile scroll, reduced-motion, overflow and screenshots are valid.');
