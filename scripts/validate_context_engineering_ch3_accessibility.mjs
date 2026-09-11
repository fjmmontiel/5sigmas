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
    route: '/series/context-engineering-memory-mcp/03-memory-architectures-working-episodic-semantic-persistent-state/',
    required: [
      'Memory lifecycle · semántica ≠ persistencia','WORKING SET Wₜ','EPISODIC STORE','Consolidate','SEMANTIC MEMORY',
      'Selective retrieval','BUSINESS AUTHORITY · EXTERNAL','SYSTEM OF RECORD','fresh read',
      'contradiction → stale / lower authority','RECOVERY LANE · DIFFERENT CONTRACT','CHECKPOINT','resume ≠ recall',
      'Persistir no hace equivalentes estos stores.'
    ],
    forbidden: [],
  },
  {
    locale: 'en',
    route: '/en/series/context-engineering-memory-mcp/03-memory-architectures-working-episodic-semantic-persistent-state/',
    required: [
      'Memory lifecycle · semantics ≠ persistence','WORKING SET Wₜ','EPISODIC STORE','Consolidate','SEMANTIC MEMORY',
      'Selective retrieval','BUSINESS AUTHORITY · EXTERNAL','SYSTEM OF RECORD','fresh read',
      'contradiction → stale / lower authority','RECOVERY LANE · DIFFERENT CONTRACT','CHECKPOINT','resume ≠ recall',
      'Persistence does not make these stores equivalent.'
    ],
    forbidden: [
      'semántica ≠ persistencia','La memoria útil necesita','RUNTIME ACTIVO','PERSISTENT MEMORY PLANE · DERIVED / RECALLABLE',
      'flujo de estado o acción','derivación / checkpoint','línea gruesa = autoridad actual','Persistir no hace'
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

      const visual = page.locator('.s5v-context-memory-lifecycle');
      check((await visual.count()) === 1, `${testCase.route}: ${viewport.name} expected exactly one memory-lifecycle visual`);
      if (await visual.count()) {
        const label = (await visual.getAttribute('aria-label'))?.trim() || '';
        check(label.length >= 45, `${testCase.route}: ${viewport.name} visual missing meaningful aria-label`);
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
            stage:box('.ml-stage'), scroller:box('.ml-scroll'),
            active:box('[data-boundary="active-runtime"]'), memory:box('[data-boundary="memory-plane"]'),
            authority:box('[data-boundary="authority-plane"]'), recovery:box('[data-boundary="checkpoint-lane"]'),
            working:box('[data-node="working-set"]'), action:box('[data-node="decision-action"]'),
            episodic:box('[data-node="episodic-store"]'), consolidate:box('[data-node="consolidation"]'), semantic:box('[data-node="semantic-store"]'), retrieval:box('[data-node="retrieval"]'),
            sor:box('[data-node="system-of-record"]'), revision:box('[data-node="source-revision"]'), checkpoint:box('[data-node="checkpoint"]'),
            actionEpisode:box('[data-edge="action-to-episode"]'), lineage:box('[data-edge="semantic-lineage"]'), semanticRetrieval:box('[data-edge="semantic-to-retrieval"]'), retrievalWorking:box('[data-edge="retrieval-to-working"]'),
            authorityWorking:box('[data-edge="authority-to-working"]'), invalidate:box('[data-edge="invalidate-semantic"]'),
            execCheckpoint:box('[data-edge="execution-to-checkpoint"]'), checkpointWorking:box('[data-edge="checkpoint-to-working"]'),
          };
        });
        for (const [name, box] of Object.entries(geometry)) check(Boolean(box && box.width >= 0 && box.height >= 0), `${testCase.route}: ${viewport.name} missing geometry ${name}`);

        if (geometry.active && geometry.memory && geometry.authority && geometry.recovery) {
          check(geometry.memory.top > geometry.active.bottom + 20, `${testCase.route}: ${viewport.name} persistent-memory plane collapsed into active runtime`);
          check(geometry.authority.left > geometry.active.right, `${testCase.route}: ${viewport.name} business-authority boundary collapsed into runtime`);
          check(geometry.recovery.left > geometry.memory.right, `${testCase.route}: ${viewport.name} recovery lane collapsed into memory plane`);
          check(geometry.recovery.top > geometry.authority.cy, `${testCase.route}: ${viewport.name} recovery lane no longer remains a separate lower contract`);
        }
        if (geometry.working && geometry.action) {
          check(geometry.working.cy < geometry.action.cy - 50, `${testCase.route}: ${viewport.name} working-state→action direction collapsed`);
        }
        if (geometry.episodic && geometry.consolidate && geometry.semantic) {
          check(geometry.episodic.cx < geometry.consolidate.cx - 80, `${testCase.route}: ${viewport.name} episode→consolidation direction collapsed`);
          check(geometry.consolidate.cx < geometry.semantic.cx - 80, `${testCase.route}: ${viewport.name} consolidation→semantic direction collapsed`);
        }
        if (geometry.semantic && geometry.retrieval) {
          check(geometry.retrieval.cy > geometry.semantic.cy + 70, `${testCase.route}: ${viewport.name} retrieval no longer distinct from semantic storage`);
        }
        if (geometry.sor && geometry.revision) {
          check(geometry.revision.cy > geometry.sor.cy + 100, `${testCase.route}: ${viewport.name} source revision no longer follows authoritative state`);
        }
        if (geometry.lineage && geometry.invalidate) {
          check(geometry.lineage.width > 140, `${testCase.route}: ${viewport.name} semantic derived_from lineage collapsed`);
          check(geometry.invalidate.width > 70 && geometry.invalidate.height > 40, `${testCase.route}: ${viewport.name} authority contradiction no longer propagates to semantic memory`);
        }
        if (geometry.actionEpisode && geometry.retrievalWorking) {
          check(geometry.actionEpisode.height > 80, `${testCase.route}: ${viewport.name} action→episode write path collapsed`);
          check(geometry.retrievalWorking.height > 140, `${testCase.route}: ${viewport.name} retrieval→working feedback path collapsed`);
        }
        if (geometry.authorityWorking && geometry.checkpointWorking && geometry.execCheckpoint) {
          check(geometry.authorityWorking.width > 90, `${testCase.route}: ${viewport.name} fresh authoritative read path collapsed`);
          check(geometry.execCheckpoint.width > 160 && geometry.execCheckpoint.height > 150, `${testCase.route}: ${viewport.name} execution→checkpoint path collapsed`);
          check(geometry.checkpointWorking.width > 180 && geometry.checkpointWorking.height > 180, `${testCase.route}: ${viewport.name} checkpoint→resume path collapsed`);
        }

        const scroller = visual.locator('.ml-scroll');
        check((await scroller.count()) === 1, `${testCase.route}: ${viewport.name} topology-preserving scroll region missing`);
        if (await scroller.count()) {
          check((await scroller.getAttribute('tabindex')) === '0', `${testCase.route}: ${viewport.name} scroll region not keyboard focusable`);
          const state = await scroller.evaluate((node) => {
            const maxScroll = node.scrollWidth - node.clientWidth;
            node.scrollLeft = maxScroll; void node.offsetWidth;
            const stage = node.querySelector('.ml-stage')?.getBoundingClientRect();
            const r = node.getBoundingClientRect();
            return { maxScroll, actualScroll:node.scrollLeft, stageWidth:stage?.width ?? 0, stageRight:stage?.right ?? 0, scrollerRight:r.right };
          });
          if (viewport.name === 'mobile') {
            check(state.maxScroll > 450 && state.actualScroll > 450, `${testCase.route}: mobile lifecycle topology did not survive horizontal scroll (${JSON.stringify(state)})`);
            await scroller.screenshot({ path:path.join(outDir,`context-engineering-ch3-${testCase.locale}-mobile-visual-end.png`), animations:'disabled' });
          } else {
            check(state.maxScroll <= 1 && state.actualScroll <= 1, `${testCase.route}: desktop visual clips horizontally (${JSON.stringify(state)})`);
            check(state.stageWidth >= 900 && state.stageRight <= state.scrollerRight + 1, `${testCase.route}: desktop stage is too narrow or escapes viewport (${JSON.stringify(state)})`);
          }
          await scroller.evaluate((node) => { node.scrollLeft = 0; });
        }
        await visual.screenshot({ path:path.join(outDir,`context-engineering-ch3-${testCase.locale}-${viewport.name}-visual.png`), animations:'disabled' });
      }

      const articleText = (await page.locator('main').innerText()).toLocaleLowerCase();
      for (const token of ['working','episodic','semantic','system of record','checkpoint','derived_from']) check(articleText.includes(token), `${testCase.route}: ${viewport.name} article missing ${token}`);
      const overflow = await page.evaluate(() => ({ scrollWidth:document.documentElement.scrollWidth, clientWidth:document.documentElement.clientWidth }));
      check(overflow.scrollWidth <= overflow.clientWidth + 1, `${testCase.route}: ${viewport.name} page overflow ${JSON.stringify(overflow)}`);
      for (const error of runtimeErrors) failures.push(`${testCase.route}: ${viewport.name} runtime error: ${error}`);
      for (const error of consoleErrors.filter((entry) => !/favicon|Failed to load resource.*404/i.test(entry))) failures.push(`${testCase.route}: ${viewport.name} console error: ${error}`);
      await page.screenshot({ path:path.join(outDir,`context-engineering-ch3-${testCase.locale}-${viewport.name}-page.png`), fullPage:true, animations:'disabled' });
      await context.close();
    }
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`Context engineering chapter 3.3 browser/accessibility QA failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Context engineering chapter 3.3 browser/accessibility QA PASS: active working state, episodic write, semantic consolidation/retrieval, authoritative fresh-read/invalidation, separate checkpoint recovery, desktop fit, topology-preserving mobile scroll, reduced-motion, overflow and screenshots are valid.');
