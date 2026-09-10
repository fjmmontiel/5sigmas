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
    route: '/series/agentes-voz-tiempo-real/04-tools-estado-acciones-asincronas/',
    tableHeader: 'Necesidad',
    systemOfRecord: 'sistema de registro',
  },
  {
    locale: 'en',
    route: '/en/series/agentes-voz-tiempo-real/04-tools-estado-acciones-asincronas/',
    tableHeader: 'Need',
    systemOfRecord: 'system of record',
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
      page.on('pageerror', (error) => runtimeErrors.push(error.message));

      const response = await page.goto(`${base}${testCase.route}`, { waitUntil: 'networkidle' });
      check(response?.ok(), `${testCase.route}: ${viewport.name} HTTP ${response?.status() ?? 'no response'}`);
      const htmlLang = await page.locator('html').getAttribute('lang');
      check((htmlLang || '').toLowerCase().startsWith(testCase.locale), `${testCase.route}: ${viewport.name} wrong html lang ${htmlLang}`);

      const h1 = (await page.locator('main h1').first().innerText()).trim();
      check(h1.length >= 20, `${testCase.route}: ${viewport.name} missing article h1`);

      const visual = page.locator('.s5v-action-state-machine');
      check((await visual.count()) === 1, `${testCase.route}: ${viewport.name} expected exactly one relationship-first action state machine`);
      if (await visual.count()) {
        const label = (await visual.getAttribute('aria-label'))?.trim() || '';
        check(label.length >= 30, `${testCase.route}: ${viewport.name} action visual missing meaningful aria-label`);
        check((await visual.locator('.s5v-arch-map__pipe').count()) === 0, `${testCase.route}: ${viewport.name} legacy card pipe returned`);
        check((await visual.locator('[data-s5v-stepper], .s5v__steps--tabs').count()) === 0, `${testCase.route}: ${viewport.name} cosmetic tabs/stepper returned`);

        const visualBox = await visual.boundingBox();
        check(Boolean(visualBox && visualBox.width <= viewport.width + 1), `${testCase.route}: ${viewport.name} visual exceeds viewport (${JSON.stringify(visualBox)})`);

        const scroll = visual.locator('.s5v-action-state-machine__scroll');
        const svg = visual.locator('.s5v-action-state-machine__svg');
        check((await scroll.count()) === 1 && (await svg.count()) === 1, `${testCase.route}: ${viewport.name} relationship canvas missing`);

        if ((await scroll.count()) && (await svg.count())) {
          const scrollState = await scroll.evaluate((node) => ({
            tabIndex: node.tabIndex,
            scrollWidth: node.scrollWidth,
            clientWidth: node.clientWidth,
            scrollLeft: node.scrollLeft,
          }));
          check(scrollState.tabIndex >= 0, `${testCase.route}: ${viewport.name} timeline is not keyboard-focusable`);
          check(scrollState.scrollWidth >= scrollState.clientWidth, `${testCase.route}: ${viewport.name} invalid scroll geometry ${JSON.stringify(scrollState)}`);
          if (viewport.name === 'mobile') {
            check(scrollState.scrollWidth > scrollState.clientWidth + 400, `${testCase.route}: mobile state machine collapsed instead of preserving topology ${JSON.stringify(scrollState)}`);
          }

          const getBox = async (selector) => {
            const locator = visual.locator(selector);
            if ((await locator.count()) !== 1) {
              failures.push(`${testCase.route}: ${viewport.name} expected one ${selector}, found ${await locator.count()}`);
              return null;
            }
            return locator.boundingBox();
          };
          const centerX = (b) => b.x + b.width / 2;
          const centerY = (b) => b.y + b.height / 2;

          const barge = await getBox('[data-action-boundary="barge-in"]');
          const agentAudio = await getBox('[data-action-track="agent-audio"]');
          const operation = await getBox('[data-action-track="operation-running"]');
          const newTurn = await getBox('[data-action-event="new-turn"]');
          const admitted = await getBox('[data-action-event="action-admitted"]');
          const externalOutcome = await getBox('[data-action-event="external-outcome"]');
          const committed = await getBox('[data-action-outcome="committed"]');
          const failed = await getBox('[data-action-outcome="failed"]');
          const unknown = await getBox('[data-action-outcome="unknown"]');
          const unknownToReconcile = await getBox('[data-action-path="unknown-to-reconcile"]');
          const reconcile = await getBox('[data-action-event="reconcile"]');
          const effectExists = await getBox('[data-action-reconcile="effect-exists"]');
          const noEffect = await getBox('[data-action-reconcile="no-effect"]');

          if (barge && agentAudio && operation && newTurn && admitted && externalOutcome) {
            const bx = centerX(barge);
            check(agentAudio.x < bx - 80 && agentAudio.x + agentAudio.width <= bx + 15, `${testCase.route}: ${viewport.name} agent audio must end at barge-in (${JSON.stringify({ agentAudio, barge })})`);
            check(operation.x < bx - 80 && operation.x + operation.width > bx + 150, `${testCase.route}: ${viewport.name} durable operation must visibly cross barge-in (${JSON.stringify({ operation, barge })})`);
            check(centerX(admitted) < bx - 50, `${testCase.route}: ${viewport.name} action must be admitted before barge-in`);
            check(centerX(newTurn) > bx + 30, `${testCase.route}: ${viewport.name} new conversational turn must begin after barge-in`);
            check(centerX(externalOutcome) > bx + 150, `${testCase.route}: ${viewport.name} external outcome must occur after barge-in`);
          }

          if (committed && failed && unknown) {
            const ys = { committed: centerY(committed), failed: centerY(failed), unknown: centerY(unknown) };
            check(ys.committed + 35 < ys.failed && ys.failed + 35 < ys.unknown, `${testCase.route}: ${viewport.name} COMMITTED/FAILED/UNKNOWN are not topologically distinct branches (${JSON.stringify(ys)})`);
            check(committed.width > 30 && failed.width > 30 && unknown.width > 30, `${testCase.route}: ${viewport.name} outcome branches collapsed`);
          }

          if (unknown && unknownToReconcile && reconcile && effectExists && noEffect) {
            check(centerY(reconcile) > centerY(unknown) + 35, `${testCase.route}: ${viewport.name} UNKNOWN does not descend into reconciliation`);
            check(centerY(unknownToReconcile) > centerY(unknown), `${testCase.route}: ${viewport.name} UNKNOWN reconciliation path has no downward extent`);
            check(effectExists.width > 50 && noEffect.height > 25, `${testCase.route}: ${viewport.name} reconciliation outcomes are not materially distinct paths`);
          }

          const animations = await visual.evaluate((node) => node.getAnimations({ subtree: true }).length);
          check(animations === 0, `${testCase.route}: ${viewport.name} reduced-motion view still has ${animations} active animations`);

          if (viewport.name === 'mobile') {
            const endState = await scroll.evaluate((node) => {
              const maxScroll = node.scrollWidth - node.clientWidth;
              node.scrollLeft = maxScroll;
              void node.offsetWidth;
              const box = node.getBoundingClientRect();
              const visible = (selector) => {
                const item = node.querySelector(selector);
                if (!item) return false;
                const b = item.getBoundingClientRect();
                return b.right >= box.left - 2 && b.left <= box.right + 2;
              };
              return {
                maxScroll,
                actualScroll: node.scrollLeft,
                committedReachable: visible('[data-action-outcome="committed"]'),
                failedReachable: visible('[data-action-outcome="failed"]'),
                unknownReachable: visible('[data-action-outcome="unknown"]'),
                reconcileReachable: visible('[data-action-event="reconcile"]'),
                retryGuardReachable: visible('[data-action-reconcile="no-effect"]'),
              };
            });
            check(endState.maxScroll > 400 && endState.actualScroll > 400, `${testCase.route}: mobile relationship canvas horizontal scroll is inert (${JSON.stringify(endState)})`);
            check(endState.committedReachable && endState.failedReachable && endState.unknownReachable, `${testCase.route}: mobile cannot reach all external outcome branches (${JSON.stringify(endState)})`);
            check(endState.reconcileReachable && endState.retryGuardReachable, `${testCase.route}: mobile cannot reach UNKNOWN reconciliation/retry guard (${JSON.stringify(endState)})`);
            await scroll.screenshot({ path: path.join(outDir, `voice-tools-ch4-${testCase.locale}-mobile-state-machine-end.png`), animations: 'disabled' });
            await scroll.evaluate((node) => { node.scrollLeft = 0; });
          }
        }

        const bodyText = (await visual.innerText()).trim();
        check(bodyText.includes('UNKNOWN'), `${testCase.route}: ${viewport.name} UNKNOWN state missing`);
        check(bodyText.includes('operation_id'), `${testCase.route}: ${viewport.name} operation_id authority boundary missing`);
        check(bodyText.toLowerCase().includes(testCase.systemOfRecord), `${testCase.route}: ${viewport.name} localized system-of-record reconciliation missing`);
        if (testCase.locale === 'en') {
          for (const token of [
            'Conversación ≠ efecto', 'Un barge-in corta una pista', 'Qué ocurre cuando', 'Timeline desplazable',
            'Reserva a las 21:00', 'Mejor a las 21:30', 'el turno ya cambió', 'Audio agente', 'audio cancelado',
            'Operación durable', 'cruza el barge-in', 'la operación no retrocede', 'respuesta externa',
            'Consultar sistema de registro', 'persistir verdad', 'retry sólo si', 'Regla de producción',
          ]) check(!bodyText.includes(token), `${testCase.route}: ${viewport.name} untranslated visual token ${JSON.stringify(token)}`);
        }

        await visual.screenshot({ path: path.join(outDir, `voice-tools-ch4-${testCase.locale}-${viewport.name}-state-machine.png`), animations: 'disabled' });
      }

      const documentOverflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      check(documentOverflow.scrollWidth <= documentOverflow.clientWidth + 1, `${testCase.route}: ${viewport.name} horizontal page overflow ${JSON.stringify(documentOverflow)}`);

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
            const canScroll = scroller.scrollWidth > scroller.clientWidth + 1;
            const overflowAllowsScroll = style.overflowX === 'auto' || style.overflowX === 'scroll';
            if (canScroll && overflowAllowsScroll) break;
            scroller = scroller.parentElement;
          }
          if (!scroller || scroller === document.body) return { hasLastHeader: true, hasScroller: false };
          const maxScroll = scroller.scrollWidth - scroller.clientWidth;
          scroller.dataset.s5Ch4ToolsScroller = args.marker;
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
          const scroller = page.locator(`[data-s5-ch4-tools-scroller="${testCase.locale}-${viewport.name}"]`);
          if (await scroller.count()) await scroller.screenshot({ path: path.join(outDir, `voice-tools-ch4-${testCase.locale}-mobile-runtime-table-end.png`), animations: 'disabled' });
        }
      }

      for (const error of runtimeErrors) failures.push(`${testCase.route}: ${viewport.name} runtime error: ${error}`);
      await page.screenshot({ path: path.join(outDir, `voice-tools-ch4-${testCase.locale}-${viewport.name}-page.png`), fullPage: true, animations: 'disabled' });
      await context.close();
    }
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`Voice tools/state chapter relationship-first browser/accessibility QA failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Voice tools/state chapter relationship-first browser/accessibility QA PASS: ES/EN state-machine topology, barge-in/audio-vs-operation geometry, UNKNOWN reconciliation, mobile reachability, reduced-motion, runtime-matrix reachability, whole-page overflow and runtime errors are valid.');
