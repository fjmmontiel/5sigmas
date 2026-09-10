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
    route: '/series/coding-agents-agent-harnesses/05-tests-verifiers-review-diffs-stop-conditions-evaluacion/',
    requiredVisual: ['Verificación · review · stop', 'Candidato', 'Checks deterministas', 'Diff review', 'Juicio adicional', 'Freshness gate', 'Decisión', 'Regla de cierre'],
    forbidden: [],
  },
  {
    locale: 'en',
    route: '/en/series/coding-agents-agent-harnesses/05-tests-verifiers-review-diffs-stop-conditions-evaluacion/',
    requiredVisual: ['Verification · review · stop', 'Candidate', 'Deterministic checks', 'Diff review', 'Additional judgment', 'Freshness gate', 'Decision', 'Closure rule'],
    forbidden: ['Pila de evidencia', 'Verificación · review', 'exige evidencia ligada', 'Un test verde es una señal', 'Candidato', 'Checks deterministas', 'tipos · lint', 'Juicio adicional', 'mismo SHA · misma evidencia', 'Decisión', 'Regla de cierre', 'cualquier cambio posterior'],
  },
];
const viewports = [
  { name: 'desktop', width: 1440, height: 1000, hasTouch: false },
  { name: 'mobile', width: 390, height: 844, hasTouch: true },
];

async function assertTables(page, testCase, viewport) {
  const tables = page.locator('main table');
  check((await tables.count()) >= 2, `${testCase.route}: ${viewport.name} expected at least two teaching tables`);
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
      return {
        hasLastHeader: true,
        hasScroller: true,
        maxScroll,
        actualScroll: scroller.scrollLeft,
        lastColumnReachable: lastBox.left >= scrollerBox.left - 2 && lastBox.right <= scrollerBox.right + 2,
      };
    }, { viewportName: viewport.name });
    check(state.hasLastHeader === true, `${testCase.route}: ${viewport.name} table ${index + 1} missing final header`);
    if (viewport.name === 'desktop') {
      check(state.desktopFits === true, `${testCase.route}: desktop table ${index + 1} clipped (${JSON.stringify(state)})`);
    } else if (state.hasScroller) {
      check(Number(state.maxScroll) > 10 && Number(state.actualScroll) > 10, `${testCase.route}: mobile table ${index + 1} horizontal scroll inert (${JSON.stringify(state)})`);
      check(state.lastColumnReachable === true, `${testCase.route}: mobile table ${index + 1} final column unreachable (${JSON.stringify(state)})`);
    } else {
      check(Number(state.tableWidth) <= viewport.width + 1, `${testCase.route}: mobile table ${index + 1} clips without scroller (${JSON.stringify(state)})`);
    }
  }
}

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
      check(((await page.locator('main h1').first().innerText()).trim()).length >= 50, `${testCase.route}: ${viewport.name} missing article h1`);
      check(await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches), `${testCase.route}: ${viewport.name} reduced-motion emulation inactive`);

      const visual = page.locator('.s5v-coding-agent-verification-stack');
      check((await visual.count()) === 1, `${testCase.route}: ${viewport.name} expected exactly one verification-stack visual`);
      if (await visual.count()) {
        const label = (await visual.getAttribute('aria-label'))?.trim() || '';
        check(label.length >= 35, `${testCase.route}: ${viewport.name} verification visual missing meaningful aria-label`);
        const visualText = (await visual.innerText()).toLocaleLowerCase();
        for (const token of testCase.requiredVisual) check(visualText.includes(token.toLocaleLowerCase()), `${testCase.route}: ${viewport.name} visual missing ${JSON.stringify(token)}`);
        for (const token of testCase.forbidden) check(!visualText.includes(token.toLocaleLowerCase()), `${testCase.route}: ${viewport.name} untranslated visual token ${JSON.stringify(token)}`);
        const visualBox = await visual.boundingBox();
        check(Boolean(visualBox && visualBox.width <= viewport.width + 1), `${testCase.route}: ${viewport.name} visual exceeds viewport (${JSON.stringify(visualBox)})`);
        const cards = visual.locator('.s5v-arch-map__pipe').first().locator(':scope > span');
        check((await cards.count()) === 6, `${testCase.route}: ${viewport.name} expected six verification cards`);
        for (let index = 0; index < await cards.count(); index += 1) {
          const box = await cards.nth(index).boundingBox();
          check(Boolean(box && box.width >= (viewport.name === 'mobile' ? 120 : 40)), `${testCase.route}: ${viewport.name} verification card ${index + 1} collapsed (${JSON.stringify(box)})`);
          check(Boolean(box && box.height <= 230), `${testCase.route}: ${viewport.name} verification card ${index + 1} wraps pathologically (${JSON.stringify(box)})`);
        }
        await visual.screenshot({ path: path.join(outDir, `coding-harness-ch5-${testCase.locale}-${viewport.name}-visual.png`), animations: 'disabled' });
      }

      const overflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      check(overflow.scrollWidth <= overflow.clientWidth + 1, `${testCase.route}: ${viewport.name} horizontal page overflow ${JSON.stringify(overflow)}`);
      await assertTables(page, testCase, viewport);

      const articleText = (await page.locator('main').innerText()).toLocaleLowerCase();
      for (const token of ['candidate_sha', 'contract_version', 'environment_fingerprint', 'verifier_version', 'required_checks', 'diff_review', 'test_oracle_changed', 'all_evidence_matches_candidate', 'stop_reason', 'accepted', 'hand_back_to_human', 'blocked/unverified', 'pass@k', 'pass^k']) {
        check(articleText.includes(token), `${testCase.route}: ${viewport.name} verification invariant missing ${token}`);
      }
      check(articleText.includes('84cd120') && articleText.includes('not yet verified'), `${testCase.route}: ${viewport.name} candidate invalidation invariant missing`);
      check(articleText.includes('c(h)') && articleText.includes('v(h)') && articleText.includes('d(h)') && articleText.includes('p(h)') && articleText.includes('f(h)'), `${testCase.route}: ${viewport.name} acceptance predicate incomplete`);

      for (const error of runtimeErrors) failures.push(`${testCase.route}: ${viewport.name} runtime error: ${error}`);
      for (const error of consoleErrors.filter((entry) => !/favicon|Failed to load resource.*404/i.test(entry))) failures.push(`${testCase.route}: ${viewport.name} console error: ${error}`);
      await page.screenshot({ path: path.join(outDir, `coding-harness-ch5-${testCase.locale}-${viewport.name}-page.png`), fullPage: true, animations: 'disabled' });
      await context.close();
    }
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`Coding agent harness chapter 2.5 browser/accessibility QA failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Coding agent harness chapter 2.5 browser/accessibility QA PASS: ES/EN language, localized verification visual, reduced-motion, desktop/mobile geometry, table reachability, page overflow, verification invariants, runtime errors and review screenshots are valid.');
