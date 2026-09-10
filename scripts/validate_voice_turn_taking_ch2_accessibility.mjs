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
      });
      const page = await context.newPage();
      const runtimeErrors = [];
      page.on('pageerror', (error) => runtimeErrors.push(error.message));

      const response = await page.goto(`${base}${testCase.route}`, { waitUntil: 'networkidle' });
      check(response?.ok(), `${testCase.route}: ${viewport.name} HTTP ${response?.status() ?? 'no response'}`);

      const htmlLang = await page.locator('html').getAttribute('lang');
      check((htmlLang || '').toLowerCase().startsWith(testCase.locale), `${testCase.route}: ${viewport.name} wrong html lang ${htmlLang}`);

      const visual = page.locator('.s5v-turn-signals');
      check((await visual.count()) === 1, `${testCase.route}: ${viewport.name} expected exactly one turn-taking visual`);
      if (await visual.count()) {
        const label = (await visual.getAttribute('aria-label'))?.trim() || '';
        check(label.length >= 20, `${testCase.route}: ${viewport.name} turn-taking visual missing meaningful aria-label`);

        const cards = visual.locator('.s5v-arch-map__pipe > span');
        check((await cards.count()) === 4, `${testCase.route}: ${viewport.name} expected four decision cards`);
        const visualBox = await visual.boundingBox();
        check(Boolean(visualBox && visualBox.width <= viewport.width + 1), `${testCase.route}: ${viewport.name} visual exceeds viewport (${JSON.stringify(visualBox)})`);

        for (let index = 0; index < await cards.count(); index += 1) {
          const box = await cards.nth(index).boundingBox();
          check(Boolean(box && box.width >= (viewport.name === 'mobile' ? 180 : 70)), `${testCase.route}: ${viewport.name} card ${index + 1} collapsed horizontally (${JSON.stringify(box)})`);
          check(Boolean(box && box.height <= 150), `${testCase.route}: ${viewport.name} card ${index + 1} wraps pathologically (${JSON.stringify(box)})`);
        }

        const copy = (await visual.locator('.s5v__copy').innerText()).trim();
        check(copy.length >= 50, `${testCase.route}: ${viewport.name} visual explanatory copy missing`);
        if (testCase.locale === 'en') {
          check(!copy.includes('aporta una observación') && !copy.includes('decisión'), `${testCase.route}: ${viewport.name} Spanish visual copy leaked into English`);
          const bodyText = await visual.innerText();
          for (const token of ['Actividad de voz', 'Fin de turno', 'Interrupción', '¿Terminó la idea?']) {
            check(!bodyText.includes(token), `${testCase.route}: ${viewport.name} untranslated visual token ${JSON.stringify(token)}`);
          }
        }

        await visual.screenshot({
          path: path.join(outDir, `voice-turn-taking-ch2-${testCase.locale}-${viewport.name}-signals.png`),
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

      // The four-column runtime matrix is wider than a phone viewport by design.
      // Fail closed unless the final column is reachable through a real horizontal
      // scroll container; a clipped table with no scroll affordance is not acceptable.
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
          if (!scroller || scroller === document.body) {
            return { hasLastHeader: true, hasScroller: false };
          }

          const maxScroll = scroller.scrollWidth - scroller.clientWidth;
          scroller.dataset.s5Ch2RuntimeScroller = args.marker;
          scroller.scrollLeft = maxScroll;
          // Force layout after changing scrollLeft before measuring reachability.
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

console.log('Turn-taking chapter browser/accessibility QA PASS: ES/EN route language, visual semantics, localization, desktop/mobile geometry, responsive runtime-matrix reachability, whole-page overflow, runtime errors and review screenshots are valid.');
