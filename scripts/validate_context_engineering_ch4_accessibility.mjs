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
    route: '/series/context-engineering-memory-mcp/04-retrieval-context-assembly-freshness-relevance-conflict-grounding/',
    required: [
      'Retrieval ≠ ensamblado ≠ grounding','GENERACIÓN DE CANDIDATOS','CONSULTA / TAREA','LÉXICO','SEMÁNTICO','ESTRUCTURADO',
      'CANDIDATOS','POLÍTICA DE ENSAMBLADO · APLICACIÓN','1 · ÁMBITO + ACL','2 · FRESCURA + VERSIÓN','3 · AUTORIDAD',
      'CONJUNTO DE CONFLICTOS','FUENTE AUTORITATIVA · LECTURA DIRECTA','SISTEMA DE REGISTRO · rev B','rev A indexada → OBSOLETA',
      'CONTEXTO DE EVIDENCIA Aₜ','MODELO','AFIRMACIONES','ABSTENER / ESCALAR','grounded_by ID de evidencia','RECHAZADO'
    ],
    forbidden: ['QUERY / TAREA','source revision ≠ index age','CONFLICT SET','SYSTEM OF RECORD · rev B','EVIDENCE CONTEXT Aₜ','CLAIMS'],
  },
  {
    locale: 'en',
    route: '/en/series/context-engineering-memory-mcp/04-retrieval-context-assembly-freshness-relevance-conflict-grounding/',
    required: [
      'Retrieval ≠ assembly ≠ grounding','CANDIDATE GENERATION','QUERY / TASK','LEXICAL','SEMANTIC','STRUCTURED',
      'CANDIDATES','ASSEMBLY POLICY · APPLICATION','1 · SCOPE + ACL','2 · FRESHNESS + VERSION','3 · AUTHORITY',
      'CONFLICT SET','AUTHORITATIVE SOURCE / READ-THROUGH','SYSTEM OF RECORD · rev B','indexed rev A → STALE',
      'EVIDENCE CONTEXT Aₜ','MODEL','CLAIMS','ABSTAIN / ESCALATE','grounded_by evidence_id','REJECTED'
    ],
    forbidden: [
      'ensamblado','Recuperar candidatos','La similitud ayuda','GENERACIÓN DE CANDIDATOS','CONSULTA / TAREA','LÉXICO','SEMÁNTICO','ESTRUCTURADO',
      'POLÍTICA DE ENSAMBLADO','ÁMBITO','FRESCURA','AUTORIDAD','FUENTE AUTORITATIVA','lectura fresca','CONTEXTO ADMITIDO',
      'SISTEMA DE REGISTRO','CONTEXTO DE EVIDENCIA','AFIRMACIONES','MODELO','ABSTENER','RECHAZADO','Leyenda del diagrama','flujo admitido','línea gruesa'
    ],
  },
];
const viewports = [
  { name:'desktop', width:1440, height:1000, hasTouch:false },
  { name:'mobile', width:390, height:844, hasTouch:true },
];

const browser = await chromium.launch({ headless:true });
try {
  for (const testCase of cases) {
    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport:{ width:viewport.width, height:viewport.height },
        hasTouch:viewport.hasTouch,
        isMobile:viewport.hasTouch,
        reducedMotion:'reduce',
      });
      const page = await context.newPage();
      const runtimeErrors = [];
      const consoleErrors = [];
      page.on('pageerror', (error) => runtimeErrors.push(error.message));
      page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });

      const response = await page.goto(`${base}${testCase.route}`, { waitUntil:'networkidle' });
      check(response?.ok(), `${testCase.route}: ${viewport.name} HTTP ${response?.status() ?? 'no response'}`);
      const htmlLang = await page.locator('html').getAttribute('lang');
      check((htmlLang || '').toLowerCase().startsWith(testCase.locale), `${testCase.route}: ${viewport.name} wrong html lang ${htmlLang}`);
      check(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), `${testCase.route}: ${viewport.name} reduced-motion emulation inactive`);

      const visual = page.locator('.s5v-context-retrieval-grounding');
      check((await visual.count()) === 1, `${testCase.route}: ${viewport.name} expected exactly one retrieval-grounding visual`);
      if (await visual.count()) {
        const label = (await visual.getAttribute('aria-label'))?.trim() || '';
        check(label.length >= 55, `${testCase.route}: ${viewport.name} visual missing meaningful aria-label`);
        const text = (await visual.innerText()).toLocaleLowerCase();
        for (const token of testCase.required) check(text.includes(token.toLocaleLowerCase()), `${testCase.route}: ${viewport.name} visual missing ${JSON.stringify(token)}`);
        for (const token of testCase.forbidden) check(!text.includes(token.toLocaleLowerCase()), `${testCase.route}: ${viewport.name} untranslated visual token ${JSON.stringify(token)}`);
        check((await visual.locator('.s5v-arch-map__pipe').count()) === 0, `${testCase.route}: obsolete linear pipe rendered`);
        check((await visual.locator('.s5v__steps--tabs,[data-s5v-stepper],[data-s5v-tabs]').count()) === 0, `${testCase.route}: cosmetic interaction rendered`);

        const geometry = await visual.evaluate((root) => {
          const box = (selector) => {
            const node = root.querySelector(selector);
            if (!node) return null;
            const r = node.getBoundingClientRect();
            return { left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height,cx:r.left+r.width/2,cy:r.top+r.height/2 };
          };
          return {
            stage:box('.rg-stage'), scroller:box('.rg-scroll'),
            retrieval:box('[data-boundary="retrieval-plane"]'), assembly:box('[data-boundary="assembly-plane"]'),
            authorityPlane:box('[data-boundary="authority-plane"]'), generation:box('[data-boundary="generation-plane"]'),
            query:box('[data-node="query"]'), lexical:box('[data-node="lexical"]'), semantic:box('[data-node="semantic"]'), structured:box('[data-node="structured"]'), candidates:box('[data-node="candidate-pool"]'),
            scope:box('[data-node="scope-gate"]'), freshness:box('[data-node="freshness-gate"]'), authority:box('[data-node="authority-gate"]'), conflict:box('[data-node="conflict-gate"]'),
            sor:box('[data-node="system-of-record"]'), bounded:box('[data-node="bounded-context"]'), model:box('[data-node="model"]'), claims:box('[data-node="claims"]'), abstain:box('[data-node="abstain"]'), rejected:box('[data-node="rejected-stale"]'),
            poolScope:box('[data-edge="pool-to-scope"]'), authorityFreshness:box('[data-edge="authority-freshness"]'), conflictContext:box('[data-edge="conflict-to-context"]'), unresolved:box('[data-edge="unresolved-to-abstain"]'), claimEvidence:box('[data-edge="claim-to-evidence"]'), reject:box('[data-edge="reject-path"]'),
          };
        });
        for (const [name, box] of Object.entries(geometry)) check(Boolean(box && box.width >= 0 && box.height >= 0), `${testCase.route}: ${viewport.name} missing geometry ${name}`);

        if (geometry.retrieval && geometry.assembly && geometry.generation && geometry.authorityPlane) {
          check(geometry.retrieval.right < geometry.assembly.left + 5, `${testCase.route}: ${viewport.name} retrieval and assembly boundaries overlap`);
          check(geometry.assembly.right < geometry.generation.left + 5, `${testCase.route}: ${viewport.name} assembly and generation boundaries overlap`);
          check(geometry.authorityPlane.top > geometry.assembly.bottom + 20, `${testCase.route}: ${viewport.name} authoritative source lane collapsed into assembly policy`);
        }
        if (geometry.query && geometry.lexical && geometry.semantic && geometry.structured && geometry.candidates) {
          check(geometry.query.cy < geometry.lexical.cy - 70 && geometry.query.cy < geometry.semantic.cy - 70, `${testCase.route}: ${viewport.name} query fan-out collapsed`);
          check(Math.abs(geometry.lexical.cy - geometry.semantic.cy) < 10, `${testCase.route}: ${viewport.name} lexical/semantic parallelism lost`);
          check(geometry.structured.cy > geometry.lexical.cy + 70, `${testCase.route}: ${viewport.name} structured retrieval lane collapsed`);
          check(geometry.candidates.cy > geometry.structured.cy + 70, `${testCase.route}: ${viewport.name} candidate convergence collapsed`);
        }
        if (geometry.scope && geometry.freshness && geometry.authority && geometry.conflict) {
          check(geometry.scope.cy < geometry.freshness.cy - 65, `${testCase.route}: ${viewport.name} scope→freshness policy order collapsed`);
          check(geometry.freshness.cy < geometry.authority.cy - 65, `${testCase.route}: ${viewport.name} freshness→authority policy order collapsed`);
          check(geometry.authority.cy < geometry.conflict.cy - 70, `${testCase.route}: ${viewport.name} authority→conflict policy order collapsed`);
        }
        if (geometry.sor && geometry.freshness && geometry.authorityFreshness) {
          check(geometry.sor.cy > geometry.freshness.cy + 300, `${testCase.route}: ${viewport.name} system-of-record fresh-read boundary collapsed`);
          check(geometry.authorityFreshness.height > 250 && geometry.authorityFreshness.width > 55, `${testCase.route}: ${viewport.name} authoritative freshness path collapsed`);
        }
        if (geometry.conflict && geometry.bounded && geometry.abstain && geometry.conflictContext && geometry.unresolved) {
          check(geometry.bounded.cx > geometry.conflict.cx + 250, `${testCase.route}: ${viewport.name} admitted-context branch collapsed`);
          check(geometry.abstain.cy > geometry.bounded.cy + 250, `${testCase.route}: ${viewport.name} unresolved branch no longer distinct`);
          check(geometry.conflictContext.width > 100 && geometry.conflictContext.height > 120, `${testCase.route}: ${viewport.name} conflict→admitted-context relationship collapsed`);
          check(geometry.unresolved.width > 100, `${testCase.route}: ${viewport.name} unresolved→abstain branch collapsed`);
        }
        if (geometry.bounded && geometry.model && geometry.claims) {
          check(geometry.bounded.cy < geometry.model.cy - 70 && geometry.model.cy < geometry.claims.cy - 70, `${testCase.route}: ${viewport.name} evidence→model→claims direction collapsed`);
        }
        if (geometry.claimEvidence) {
          check(geometry.claimEvidence.width > 65 && geometry.claimEvidence.height > 170, `${testCase.route}: ${viewport.name} claim→evidence grounding link collapsed`);
        }
        if (geometry.rejected && geometry.reject) {
          check(geometry.rejected.cy > geometry.freshness.cy + 300, `${testCase.route}: ${viewport.name} rejection sink no longer distinct from policy gate`);
          check(geometry.reject.height > 250, `${testCase.route}: ${viewport.name} policy rejection path collapsed`);
        }

        const scroller = visual.locator('.rg-scroll');
        check((await scroller.count()) === 1, `${testCase.route}: ${viewport.name} topology-preserving scroll region missing`);
        if (await scroller.count()) {
          check((await scroller.getAttribute('tabindex')) === '0', `${testCase.route}: ${viewport.name} scroll region not keyboard focusable`);
          const state = await scroller.evaluate((node) => {
            const maxScroll = node.scrollWidth - node.clientWidth;
            node.scrollLeft = maxScroll; void node.offsetWidth;
            const stage = node.querySelector('.rg-stage')?.getBoundingClientRect();
            const r = node.getBoundingClientRect();
            return { maxScroll, actualScroll:node.scrollLeft, stageWidth:stage?.width ?? 0, stageRight:stage?.right ?? 0, scrollerRight:r.right };
          });
          if (viewport.name === 'mobile') {
            check(state.maxScroll > 450 && state.actualScroll > 450, `${testCase.route}: mobile retrieval/assembly topology did not survive horizontal scroll (${JSON.stringify(state)})`);
            await scroller.screenshot({ path:path.join(outDir,`context-engineering-ch4-${testCase.locale}-mobile-visual-end.png`), animations:'disabled' });
          } else {
            check(state.maxScroll <= 1 && state.actualScroll <= 1, `${testCase.route}: desktop visual clips horizontally (${JSON.stringify(state)})`);
            check(state.stageWidth >= 900 && state.stageRight <= state.scrollerRight + 1, `${testCase.route}: desktop stage is too narrow or escapes viewport (${JSON.stringify(state)})`);
          }
          await scroller.evaluate((node) => { node.scrollLeft = 0; });
        }
        await visual.screenshot({ path:path.join(outDir,`context-engineering-ch4-${testCase.locale}-${viewport.name}-visual.png`), animations:'disabled' });
      }

      const articleText = (await page.locator('main').innerText()).toLocaleLowerCase();
      for (const token of ['retrieval','freshness','authority','conflict','grounding','evidence']) check(articleText.includes(token), `${testCase.route}: ${viewport.name} article missing ${token}`);
      const overflow = await page.evaluate(() => ({ scrollWidth:document.documentElement.scrollWidth, clientWidth:document.documentElement.clientWidth }));
      check(overflow.scrollWidth <= overflow.clientWidth + 1, `${testCase.route}: ${viewport.name} page overflow ${JSON.stringify(overflow)}`);
      for (const error of runtimeErrors) failures.push(`${testCase.route}: ${viewport.name} runtime error: ${error}`);
      for (const error of consoleErrors.filter((entry) => !/favicon|Failed to load resource.*404/i.test(entry))) failures.push(`${testCase.route}: ${viewport.name} console error: ${error}`);
      await page.screenshot({ path:path.join(outDir,`context-engineering-ch4-${testCase.locale}-${viewport.name}-page.png`), fullPage:true, animations:'disabled' });
      await context.close();
    }
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`Context engineering chapter 3.4 browser/accessibility QA failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Context engineering chapter 3.4 browser/accessibility QA PASS: candidate retrieval, assembly constraints, authoritative freshness validation, conflict branching, claim-level grounding, desktop fit, topology-preserving mobile scroll, reduced-motion, overflow and screenshots are valid.');