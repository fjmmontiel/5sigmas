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
  { locale: 'es', route: '/series/agentes-voz-tiempo-real/02-turn-taking/', runtimeHeader: 'Pregunta de turn-taking' },
  { locale: 'en', route: '/en/series/agentes-voz-tiempo-real/02-turn-taking/', runtimeHeader: 'Turn-taking question' },
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
      page.on('pageerror', (error) => runtimeErrors.push(error.message));

      const response = await page.goto(`${base}${testCase.route}`, { waitUntil: 'networkidle' });
      check(response?.ok(), `${testCase.route}: ${viewport.name} HTTP ${response?.status() ?? 'no response'}`);

      const htmlLang = await page.locator('html').getAttribute('lang');
      check((htmlLang || '').toLowerCase().startsWith(testCase.locale), `${testCase.route}: ${viewport.name} wrong html lang ${htmlLang}`);

      const visual = page.locator('.s5v-turn-signals.s5v-turn-timeline');
      check((await visual.count()) === 1, `${testCase.route}: ${viewport.name} expected exactly one relationship-first turn-taking timeline`);
      if (await visual.count()) {
        const label = (await visual.getAttribute('aria-label'))?.trim() || '';
        check(label.length >= 30, `${testCase.route}: ${viewport.name} turn-taking visual missing meaningful aria-label`);

        check((await visual.locator('.s5v-arch-map__pipe').count()) === 0, `${testCase.route}: ${viewport.name} legacy linear-box pipe rendered`);
        check((await visual.locator('[data-s5v-stepper], .s5v__steps--tabs').count()) === 0, `${testCase.route}: ${viewport.name} cosmetic tab/stepper rendered`);

        const scenarios = visual.locator('[data-turn-scenario]');
        check((await scenarios.count()) === 2, `${testCase.route}: ${viewport.name} expected pause + overlap temporal scenarios`);

        const visualBox = await visual.boundingBox();
        check(Boolean(visualBox && visualBox.width <= viewport.width + 1), `${testCase.route}: ${viewport.name} visual shell exceeds viewport (${JSON.stringify(visualBox)})`);

        // The timeline's x-position carries time. On mobile it must remain a
        // real horizontally navigable timeline, not collapse into a card list.
        const scrolls = visual.locator('.s5v-turn-scroll');
        check((await scrolls.count()) === 2, `${testCase.route}: ${viewport.name} expected two timeline scrollers`);
        for (let index = 0; index < await scrolls.count(); index += 1) {
          const state = await scrolls.nth(index).evaluate((element) => {
            const style = getComputedStyle(element);
            const maxScroll = element.scrollWidth - element.clientWidth;
            const before = element.scrollLeft;
            element.scrollLeft = maxScroll;
            void element.offsetWidth;
            const after = element.scrollLeft;
            return {
              overflowX: style.overflowX,
              clientWidth: element.clientWidth,
              scrollWidth: element.scrollWidth,
              maxScroll,
              before,
              after,
              tabIndex: element.tabIndex,
            };
          });
          check(state.overflowX === 'auto' || state.overflowX === 'scroll', `${testCase.route}: ${viewport.name} timeline ${index + 1} cannot scroll horizontally (${JSON.stringify(state)})`);
          check(state.tabIndex === 0, `${testCase.route}: ${viewport.name} timeline ${index + 1} is not keyboard focusable`);
          if (viewport.name === 'desktop') {
            check(state.maxScroll <= 4, `${testCase.route}: desktop timeline ${index + 1} unexpectedly requires horizontal scrolling (${JSON.stringify(state)})`);
          } else {
            check(state.maxScroll >= 250 && state.after >= state.maxScroll - 2, `${testCase.route}: mobile timeline ${index + 1} does not preserve/reach full time geometry (${JSON.stringify(state)})`);
            await scrolls.nth(index).screenshot({
              path: path.join(outDir, `voice-turn-taking-ch2-${testCase.locale}-mobile-scenario-${index + 1}-end.png`),
              animations: 'disabled',
            });
          }
          await scrolls.nth(index).evaluate((element) => { element.scrollLeft = 0; element.focus(); });
          const focused = await scrolls.nth(index).evaluate((element) => document.activeElement === element);
          check(focused === true, `${testCase.route}: ${viewport.name} timeline ${index + 1} cannot receive focus`);
        }

        // Scenario 1: an internal acoustic pause changes VAD state but the
        // turn-open state must visibly span that pause and continue until the
        // later commit boundary.
        const pause = visual.locator('[data-turn-scenario="pause"]');
        const pauseGeometry = await pause.evaluate((root) => {
          const box = (selector) => {
            const el = root.querySelector(selector);
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
          };
          return {
            speechA: box('[data-turn-segment="user-speech-a"]'),
            speechB: box('[data-turn-segment="user-speech-b"]'),
            silence: box('[data-turn-segment="vad-silence"]'),
            open: box('[data-turn-segment="turn-open"]'),
            vadStop: box('[data-turn-marker="vad-stop"]'),
            commit: box('[data-turn-marker="turn-commit"]'),
            noCommit: box('[data-turn-note="no-commit"]'),
          };
        });
        check(Object.values(pauseGeometry).every(Boolean), `${testCase.route}: ${viewport.name} pause scenario missing required geometry (${JSON.stringify(pauseGeometry)})`);
        if (Object.values(pauseGeometry).every(Boolean)) {
          check(pauseGeometry.speechA.right <= pauseGeometry.silence.right + 2, `${testCase.route}: ${viewport.name} speech/pause ordering is invalid`);
          check(pauseGeometry.speechB.left >= pauseGeometry.silence.right - 2, `${testCase.route}: ${viewport.name} user continuation does not occur after VAD silence`);
          check(pauseGeometry.vadStop.left < pauseGeometry.speechB.left, `${testCase.route}: ${viewport.name} VAD stop is not before user continuation`);
          check(pauseGeometry.commit.left >= pauseGeometry.speechB.right - 3, `${testCase.route}: ${viewport.name} turn commit occurs before the continued utterance finishes`);
          check(pauseGeometry.open.left < pauseGeometry.vadStop.left && pauseGeometry.open.right >= pauseGeometry.speechB.right - 3, `${testCase.route}: ${viewport.name} turn-open state does not visibly span the false endpoint and continuation`);
        }

        // Scenario 2: user speech must geometrically overlap agent playout.
        // The same candidate then branches into continuation vs cancellation.
        const overlap = visual.locator('[data-turn-scenario="overlap"]');
        const overlapGeometry = await overlap.evaluate((root) => {
          const box = (selector) => {
            const el = root.querySelector(selector);
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
          };
          return {
            playout: box('[data-turn-segment="agent-playout"]'),
            user: box('[data-turn-segment="overlap-speech"]'),
            candidate: box('[data-turn-marker="interrupt-candidate"]'),
            branch: box('[data-turn-branch="intent"]'),
            continueOutcome: box('[data-turn-outcome="continue"]'),
            cancelOutcome: box('[data-turn-outcome="cancel"]'),
            cancelMarker: box('[data-turn-marker="barge-in-cancel"]'),
          };
        });
        check(Object.values(overlapGeometry).every(Boolean), `${testCase.route}: ${viewport.name} overlap scenario missing required geometry (${JSON.stringify(overlapGeometry)})`);
        if (Object.values(overlapGeometry).every(Boolean)) {
          const overlapWidth = Math.min(overlapGeometry.playout.right, overlapGeometry.user.right) - Math.max(overlapGeometry.playout.left, overlapGeometry.user.left);
          check(overlapWidth > 30, `${testCase.route}: ${viewport.name} user speech does not visibly overlap agent playout (${JSON.stringify(overlapGeometry)})`);
          check(overlapGeometry.candidate.left >= overlapGeometry.user.left - 3 && overlapGeometry.candidate.left <= overlapGeometry.user.right + 3, `${testCase.route}: ${viewport.name} speech_start candidate is not anchored to overlapping user speech`);
          check(overlapGeometry.cancelMarker.left > overlapGeometry.candidate.left + 40, `${testCase.route}: ${viewport.name} cancellation boundary is not temporally after interruption candidate`);
          check(overlapGeometry.continueOutcome.left >= overlapGeometry.cancelMarker.left - 5 && overlapGeometry.cancelOutcome.left >= overlapGeometry.cancelMarker.left - 5, `${testCase.route}: ${viewport.name} branch outcomes do not begin after the decision boundary`);
          check(Math.abs(overlapGeometry.continueOutcome.top - overlapGeometry.cancelOutcome.top) > 25, `${testCase.route}: ${viewport.name} continue/cancel outcomes are not distinct branches`);
          check(overlapGeometry.branch.height >= 25, `${testCase.route}: ${viewport.name} decision branch collapsed`);
        }

        const visualText = await visual.innerText();
        if (testCase.locale === 'en') {
          for (const token of ['Pausa interna', 'La pausa acústica', 'Usuario', 'Estado de turno', 'Solapamiento', 'Audio del agente', 'habla superpuesta', 'Si es backchannel', 'Si es barge-in', 'Detección ≠ decisión']) {
            check(!visualText.includes(token), `${testCase.route}: ${viewport.name} untranslated visual token ${JSON.stringify(token)}`);
          }
          for (const token of ['Internal pause', 'Turn state', 'Overlap:', 'Agent audio', 'If backchannel', 'If barge-in', 'Detection ≠ decision ≠ effect']) {
            check(visualText.includes(token), `${testCase.route}: ${viewport.name} localized visual token missing ${JSON.stringify(token)}`);
          }
        } else {
          for (const token of ['Pausa interna', 'Estado de turno', 'Solapamiento:', 'Audio del agente', 'Si es backchannel', 'Si es barge-in', 'Detección ≠ decisión ≠ efecto']) {
            check(visualText.includes(token), `${testCase.route}: ${viewport.name} Spanish visual token missing ${JSON.stringify(token)}`);
          }
        }

        await visual.screenshot({
          path: path.join(outDir, `voice-turn-taking-ch2-${testCase.locale}-${viewport.name}-timeline.png`),
          animations: 'disabled',
        });
      }

      const documentOverflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      check(documentOverflow.scrollWidth <= documentOverflow.clientWidth + 1, `${testCase.route}: ${viewport.name} horizontal page overflow ${JSON.stringify(documentOverflow)}`);

      const h1 = (await page.locator('main h1').first().innerText()).trim();
      check(h1.length >= 20, `${testCase.route}: ${viewport.name} missing article h1`);

      // The four-column runtime matrix is wider than a phone viewport by
      // design. The final column must remain reachable through a real scroll
      // container instead of being clipped.
      const runtimeTable = page.locator('main table').filter({ hasText: testCase.runtimeHeader }).first();
      check((await runtimeTable.count()) === 1, `${testCase.route}: ${viewport.name} runtime decision table missing`);
      if (await runtimeTable.count()) {
        const tableState = await runtimeTable.evaluate((table, args) => {
          const lastHeader = table.querySelector('thead th:last-child');
          if (!lastHeader) return { hasLastHeader: false };

          if (args.viewportName !== 'mobile') {
            const tableBox = table.getBoundingClientRect();
            const lastBox = lastHeader.getBoundingClientRect();
            return {
              hasLastHeader: true,
              desktopFits: tableBox.right <= window.innerWidth + 1 && lastBox.right <= window.innerWidth + 1,
              tableRight: tableBox.right,
              lastRight: lastBox.right,
              viewportWidth: window.innerWidth,
            };
          }

          let scroller = table.parentElement;
          while (scroller && scroller !== document.body) {
            const style = getComputedStyle(scroller);
            const canScroll = scroller.scrollWidth > scroller.clientWidth + 1;
            const overflowAllowsScroll = style.overflowX === 'auto' || style.overflowX === 'scroll';
            if (canScroll && overflowAllowsScroll) break;
            scroller = scroller.parentElement;
          }
          if (!scroller || scroller === document.body) return { hasLastHeader: true, hasScroller: false };

          const maxScroll = scroller.scrollWidth - scroller.clientWidth;
          scroller.dataset.s5Ch2RuntimeScroller = args.marker;
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
            scrollerLeft: scrollerBox.left,
            scrollerRight: scrollerBox.right,
            lastLeft: lastBox.left,
            lastRight: lastBox.right,
          };
        }, { viewportName: viewport.name, marker: `${testCase.locale}-${viewport.name}` });

        check(tableState.hasLastHeader === true, `${testCase.route}: ${viewport.name} runtime table last header missing`);
        if (viewport.name === 'desktop') {
          check(tableState.desktopFits === true, `${testCase.route}: desktop runtime matrix clipped (${JSON.stringify(tableState)})`);
        } else {
          check(tableState.hasScroller === true, `${testCase.route}: mobile runtime matrix clips without horizontal scroll container (${JSON.stringify(tableState)})`);
          check(Number(tableState.maxScroll) > 20 && Number(tableState.actualScroll) > 20, `${testCase.route}: mobile runtime matrix horizontal scroll is inert (${JSON.stringify(tableState)})`);
          check(tableState.lastColumnReachable === true, `${testCase.route}: mobile runtime matrix final column is not reachable (${JSON.stringify(tableState)})`);

          const scroller = page.locator(`[data-s5-ch2-runtime-scroller="${testCase.locale}-${viewport.name}"]`);
          if (await scroller.count()) {
            await scroller.screenshot({
              path: path.join(outDir, `voice-turn-taking-ch2-${testCase.locale}-mobile-runtime-table-end.png`),
              animations: 'disabled',
            });
            await scroller.evaluate((element) => {
              element.scrollLeft = 0;
              delete element.dataset.s5Ch2RuntimeScroller;
            });
          }
        }
      }

      for (const error of runtimeErrors) failures.push(`${testCase.route}: ${viewport.name} runtime error: ${error}`);
      await page.screenshot({
        path: path.join(outDir, `voice-turn-taking-ch2-${testCase.locale}-${viewport.name}-page.png`),
        fullPage: true,
        animations: 'disabled',
      });
      await context.close();
    }
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`Turn-taking chapter browser/accessibility QA failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Turn-taking chapter browser/accessibility QA PASS: ES/EN language, relationship-first timing geometry, pause-vs-commit separation, overlap/branch semantics, mobile timeline reachability, reduced-motion, runtime matrix reachability, page overflow and runtime errors are valid.');
