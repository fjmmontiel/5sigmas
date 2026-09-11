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
    route: '/series/coding-agents-agent-harnesses/03-specs-planificacion-task-decomposition-checkpoints/',
    requiredVisual: ['Contrato v1 permanece fijo', 'Plan v1', 'OBSERVACIÓN', 'Plan v2', 'AUTORIDAD EXTERNA', 'Contrato v2', 'DEPENDENCIAS DEL PLAN', 'STALE para acceptance v2', 'Revalidar v2'],
    forbidden: [],
  },
  {
    locale: 'en',
    route: '/en/series/coding-agents-agent-harnesses/03-specs-planificacion-task-decomposition-checkpoints/',
    requiredVisual: ['Contract v1 remains fixed', 'Plan v1', 'OBSERVATION', 'Plan v2', 'EXTERNAL AUTHORITY', 'Contract v2', 'PLAN DEPENDENCIES', 'STALE for acceptance v2', 'Reverify v2'],
    forbidden: ['Contrato estable', 'Replanificar y enmendar', 'AUTORIDAD ·', 'ESTRATEGIA ·', 'EVIDENCIA ·', 'permanece fijo', 'OBSERVACIÓN', 'hipótesis', 'enmienda autorizada', 'DEPENDENCIAS DEL PLAN', 'propaga invalidación', 'Revalidar'],
  },
];
const viewports = [
  { name: 'desktop', width: 1440, height: 1000, hasTouch: false },
  { name: 'mobile', width: 390, height: 844, hasTouch: true },
];

async function box(locator) {
  const value = await locator.boundingBox();
  return value ? { x: value.x, y: value.y, width: value.width, height: value.height, right: value.x + value.width, bottom: value.y + value.height, cx: value.x + value.width / 2, cy: value.y + value.height / 2 } : null;
}

async function assertTables(page, testCase, viewport) {
  const tables = page.locator('main table');
  check((await tables.count()) >= 1, `${testCase.route}: ${viewport.name} expected at least one teaching table`);
  for (let index = 0; index < await tables.count(); index += 1) {
    const table = tables.nth(index);
    const state = await table.evaluate((node, args) => {
      const lastHeader = node.querySelector('thead th:last-child');
      const tableBox = node.getBoundingClientRect();
      if (!lastHeader) return { hasLastHeader: false };
      if (args.viewportName !== 'mobile') {
        const lastBox = lastHeader.getBoundingClientRect();
        return { hasLastHeader: true, desktopFits: tableBox.right <= window.innerWidth + 1 && lastBox.right <= window.innerWidth + 1 };
      }
      let scroller = node.parentElement;
      while (scroller && scroller !== document.body) {
        const style = getComputedStyle(scroller);
        if (scroller.scrollWidth > scroller.clientWidth + 1 && (style.overflowX === 'auto' || style.overflowX === 'scroll')) break;
        scroller = scroller.parentElement;
      }
      if (!scroller || scroller === document.body) return { hasLastHeader: true, hasScroller: false, tableWidth: tableBox.width };
      const maxScroll = scroller.scrollWidth - scroller.clientWidth;
      scroller.scrollLeft = maxScroll;
      void scroller.offsetWidth;
      const scrollerBox = scroller.getBoundingClientRect();
      const lastBox = lastHeader.getBoundingClientRect();
      return { hasLastHeader: true, hasScroller: true, maxScroll, actualScroll: scroller.scrollLeft, lastColumnReachable: lastBox.left >= scrollerBox.left - 2 && lastBox.right <= scrollerBox.right + 2 };
    }, { viewportName: viewport.name });
    check(state.hasLastHeader === true, `${testCase.route}: ${viewport.name} table ${index + 1} missing final header`);
    if (viewport.name === 'desktop') check(state.desktopFits === true, `${testCase.route}: desktop table ${index + 1} clipped (${JSON.stringify(state)})`);
    else if (state.hasScroller) {
      check(Number(state.maxScroll) > 10 && Number(state.actualScroll) > 10, `${testCase.route}: mobile table ${index + 1} horizontal scroll inert (${JSON.stringify(state)})`);
      check(state.lastColumnReachable === true, `${testCase.route}: mobile table ${index + 1} final column unreachable (${JSON.stringify(state)})`);
    } else check(Number(state.tableWidth) <= viewport.width + 1, `${testCase.route}: mobile table ${index + 1} clips without scroller (${JSON.stringify(state)})`);
  }
}

const browser = await chromium.launch({ headless: true });
try {
  for (const testCase of cases) {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, hasTouch: viewport.hasTouch, isMobile: viewport.hasTouch, reducedMotion: 'reduce' });
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

      const visual = page.locator('.s5v-coding-agent-task-contract');
      check((await visual.count()) === 1, `${testCase.route}: ${viewport.name} expected exactly one task-contract visual`);
      if (await visual.count()) {
        const label = (await visual.getAttribute('aria-label'))?.trim() || '';
        check(label.length >= 45, `${testCase.route}: ${viewport.name} visual aria-label is not descriptive enough`);
        const visualText = (await visual.innerText()).toLocaleLowerCase();
        for (const token of testCase.requiredVisual) check(visualText.includes(token.toLocaleLowerCase()), `${testCase.route}: ${viewport.name} visual missing ${JSON.stringify(token)}`);
        for (const token of testCase.forbidden) check(!visualText.includes(token.toLocaleLowerCase()), `${testCase.route}: ${viewport.name} untranslated visual token ${JSON.stringify(token)}`);
        check((await visual.locator('.s5v-arch-map__pipe').count()) === 0, `${testCase.route}: ${viewport.name} legacy card-pipe rendered`);
        check((await visual.locator('button,[data-s5v-stepper],.s5v__steps--tabs').count()) === 0, `${testCase.route}: ${viewport.name} cosmetic interaction returned`);

        const scroller = visual.locator('.s5v-task-contract__scroll');
        check((await scroller.count()) === 1, `${testCase.route}: ${viewport.name} relationship scroller missing`);
        check((await scroller.getAttribute('tabindex')) === '0', `${testCase.route}: ${viewport.name} relationship scroller not keyboard focusable`);
        const visualBox = await visual.boundingBox();
        check(Boolean(visualBox && visualBox.width <= viewport.width + 1), `${testCase.route}: ${viewport.name} section exceeds viewport (${JSON.stringify(visualBox)})`);

        const contractFixed = await box(visual.locator('[data-contract="v1-replan"]'));
        const planV1 = await box(visual.locator('[data-plan="v1"]'));
        const observation = await box(visual.locator('[data-observation="invalid-assumption"]'));
        const planV2 = await box(visual.locator('[data-plan="v2"]'));
        const evidenceSame = await box(visual.locator('[data-evidence="same-contract"]'));
        check(Boolean(contractFixed && planV1 && observation && planV2 && evidenceSame), `${testCase.route}: ${viewport.name} replan geometry nodes missing`);
        if (contractFixed && planV1 && observation && planV2 && evidenceSame) {
          check(contractFixed.cy < planV1.cy && planV1.cy < observation.cy && observation.cy < planV2.cy && planV2.cy < evidenceSame.cy, `${testCase.route}: ${viewport.name} replan scenario does not descend authority→strategy→observation→replan→evidence (${JSON.stringify({contractFixed, planV1, observation, planV2, evidenceSame})})`);
          check(Math.abs(contractFixed.cx - planV2.cx) < 100, `${testCase.route}: ${viewport.name} plan v2 is no longer visually anchored under unchanged contract v1`);
        }

        const authority = await box(visual.locator('[data-authority="product-decision"]'));
        const contractV2 = await box(visual.locator('[data-contract="v2"]'));
        const nodeB = await box(visual.locator('[data-graph="v1"] circle').nth(0));
        const nodeC = await box(visual.locator('[data-graph="v1"] circle').nth(1));
        const nodeD = await box(visual.locator('[data-graph="v1"] circle').nth(2));
        const nodeF = await box(visual.locator('[data-graph="v1"] circle').nth(3));
        const stale = await box(visual.locator('[data-evidence="stale-v1"]'));
        const reverified = await box(visual.locator('[data-evidence="reverified-v2"]'));
        check(Boolean(authority && contractV2 && nodeB && nodeC && nodeD && nodeF && stale && reverified), `${testCase.route}: ${viewport.name} amendment/invalidation geometry nodes missing`);
        if (authority && contractV2 && nodeB && nodeC && nodeD && nodeF && stale && reverified) {
          check(authority.cy < contractV2.cy && contractV2.cy < nodeC.cy && nodeC.cy < stale.cy, `${testCase.route}: ${viewport.name} amendment path does not cross authority→contract→dependency→evidence lanes`);
          check(nodeD.cx > nodeB.cx && nodeD.cx > nodeC.cx && nodeF.cx > nodeD.cx, `${testCase.route}: ${viewport.name} dependency graph no longer encodes convergence/progression (${JSON.stringify({nodeB,nodeC,nodeD,nodeF})})`);
          check(reverified.cx > stale.cx && Math.abs(reverified.cy - stale.cy) < 35, `${testCase.route}: ${viewport.name} stale→reverify outcome is not spatially distinct on evidence lane`);
        }
        for (const edge of ['replan-loop', 'authority-to-contract-v2', 'contract-v2-to-c', 'invalidate-c-to-d', 'invalidate-d-to-f', 'amendment-invalidates-evidence', 'stale-to-reverify']) {
          check((await visual.locator(`[data-edge="${edge}"]`).count()) === 1, `${testCase.route}: ${viewport.name} relationship edge missing ${edge}`);
        }

        await visual.screenshot({ path: path.join(outDir, `coding-harness-ch3-${testCase.locale}-${viewport.name}-visual-start.png`), animations: 'disabled' });
        if (viewport.name === 'mobile') {
          const scrollState = await scroller.evaluate((node) => { const max = node.scrollWidth - node.clientWidth; node.scrollLeft = max; void node.offsetWidth; return { max, actual: node.scrollLeft, clientWidth: node.clientWidth, scrollWidth: node.scrollWidth }; });
          check(scrollState.max > 400 && scrollState.actual > 400, `${testCase.route}: mobile graph does not preserve wide topology with real horizontal scrolling (${JSON.stringify(scrollState)})`);
          const scrollerBox = await box(scroller);
          const reverifiedEnd = await box(visual.locator('[data-evidence="reverified-v2"]'));
          check(Boolean(scrollerBox && reverifiedEnd && reverifiedEnd.x >= scrollerBox.x - 2 && reverifiedEnd.right <= scrollerBox.right + 2), `${testCase.route}: mobile final revalidation node unreachable after scrolling (${JSON.stringify({scrollerBox,reverifiedEnd})})`);
          await visual.screenshot({ path: path.join(outDir, `coding-harness-ch3-${testCase.locale}-mobile-visual-end.png`), animations: 'disabled' });
          await scroller.evaluate((node) => { node.scrollLeft = 0; });
        }
      }

      const overflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      check(overflow.scrollWidth <= overflow.clientWidth + 1, `${testCase.route}: ${viewport.name} horizontal page overflow ${JSON.stringify(overflow)}`);
      await assertTables(page, testCase, viewport);

      const articleText = (await page.locator('main').innerText()).toLocaleLowerCase();
      for (const token of ['task_contract_version', 'plan_version', 'checkpoint_id', 'verification_head_sha', 'cleanup_state']) check(articleText.includes(token), `${testCase.route}: ${viewport.name} production invariant missing ${token}`);
      for (const error of runtimeErrors) failures.push(`${testCase.route}: ${viewport.name} runtime error: ${error}`);
      for (const error of consoleErrors.filter((entry) => !/favicon|Failed to load resource.*404/i.test(entry))) failures.push(`${testCase.route}: ${viewport.name} console error: ${error}`);
      await page.screenshot({ path: path.join(outDir, `coding-harness-ch3-${testCase.locale}-${viewport.name}-page.png`), fullPage: true, animations: 'disabled' });
      await context.close();
    }
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`Coding agent harness chapter 2.3 relationship/accessibility QA failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Coding agent harness chapter 2.3 relationship/accessibility QA PASS: ES/EN localization, unchanged-contract replan loop, authorized contract amendment, dependency invalidation, stale-evidence propagation, revalidation, reduced-motion, responsive reachability, tables, overflow and runtime behavior are valid.');