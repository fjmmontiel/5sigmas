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
    route: '/series/agentes-voz-tiempo-real/03-presupuesto-latencia/',
    runtimeHeader: 'Pregunta de latencia',
    toolHref: '/herramientas/latencia-agente-voz/',
    toolLabel: 'Prueba el presupuesto con el explorador interactivo de latencia',
  },
  {
    locale: 'en',
    route: '/en/series/agentes-voz-tiempo-real/03-presupuesto-latencia/',
    runtimeHeader: 'Latency question',
    toolHref: '/en/tools/voice-latency-budget/',
    toolLabel: 'Try the budget in the interactive latency explorer',
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

      const visual = page.locator('.s5v-latency-timeline');
      check((await visual.count()) === 1, `${testCase.route}: ${viewport.name} expected exactly one latency timeline`);
      if (await visual.count()) {
        const label = (await visual.getAttribute('aria-label'))?.trim() || '';
        check(label.length >= 30, `${testCase.route}: ${viewport.name} latency visual missing meaningful aria-label`);
        check((await visual.locator('.s5v-arch-map__pipe').count()) === 0, `${testCase.route}: ${viewport.name} legacy box pipe returned`);
        check((await visual.locator('[data-s5v-stepper], .s5v__steps--tabs').count()) === 0, `${testCase.route}: ${viewport.name} cosmetic stepper/tabs returned`);

        const visualBox = await visual.boundingBox();
        check(Boolean(visualBox && visualBox.width <= viewport.width + 1), `${testCase.route}: ${viewport.name} visual exceeds viewport (${JSON.stringify(visualBox)})`);

        const scroll = visual.locator('.s5v-latency-scroll');
        const canvas = visual.locator('.s5v-latency-canvas');
        check((await scroll.count()) === 1 && (await canvas.count()) === 1, `${testCase.route}: ${viewport.name} timeline scroll/canvas missing`);
        if ((await scroll.count()) && (await canvas.count())) {
          const scrollState = await scroll.evaluate((node) => ({
            tabIndex: node.tabIndex,
            scrollWidth: node.scrollWidth,
            clientWidth: node.clientWidth,
            scrollLeft: node.scrollLeft,
          }));
          check(scrollState.tabIndex >= 0, `${testCase.route}: ${viewport.name} timeline is not keyboard-focusable`);
          check(scrollState.scrollWidth >= scrollState.clientWidth, `${testCase.route}: ${viewport.name} invalid timeline scroll geometry ${JSON.stringify(scrollState)}`);
          if (viewport.name === 'mobile') {
            check(scrollState.scrollWidth > scrollState.clientWidth + 300, `${testCase.route}: mobile timeline collapsed instead of preserving time geometry ${JSON.stringify(scrollState)}`);
          }

          const getBox = async (selector) => {
            const locator = visual.locator(selector);
            if ((await locator.count()) !== 1) {
              failures.push(`${testCase.route}: ${viewport.name} expected one ${selector}, found ${await locator.count()}`);
              return null;
            }
            return locator.boundingBox();
          };

          const speechStop = await getBox('[data-latency-marker="speech-stop"]');
          const turnCommit = await getBox('[data-latency-marker="turn-commit"]');
          const firstToken = await getBox('[data-latency-marker="first-token"]');
          const firstAudio = await getBox('[data-latency-marker="first-audio"]');
          const firstPlayout = await getBox('[data-latency-marker="first-playout"]');

          if (speechStop && turnCommit && firstToken && firstAudio && firstPlayout) {
            check(
              speechStop.x + 10 < turnCommit.x &&
              turnCommit.x + 10 < firstToken.x &&
              firstToken.x + 10 < firstAudio.x &&
              firstAudio.x + 10 < firstPlayout.x,
              `${testCase.route}: ${viewport.name} observable boundaries are not ordered in time (${JSON.stringify({ speechStop, turnCommit, firstToken, firstAudio, firstPlayout })})`,
            );
          }

          const userSpeech = await getBox('[data-latency-segment="user-speech"]');
          const sttPre = await getBox('[data-latency-segment="stt-pre"]');
          const sttResidual = await getBox('[data-latency-segment="stt-residual"]');
          const eouWait = await getBox('[data-latency-segment="eou-wait"]');
          const llm = await getBox('[data-latency-segment="llm-stream"]');
          const tts = await getBox('[data-latency-segment="tts-stream"]');
          const media = await getBox('[data-latency-segment="media-to-playout"]');
          const playout = await getBox('[data-latency-segment="playout"]');
          const critical = await getBox('[data-latency-critical-path="true"]');
          const userWait = await getBox('[data-latency-window="user-wait"]');
          const preZone = await getBox('[data-latency-zone="pre-speech-stop"]');

          const overlapWidth = (a, b) => Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
          const near = (a, b, tolerance = 12) => Math.abs(a - b) <= tolerance;

          if (speechStop && userSpeech && sttPre && sttResidual && preZone) {
            check(userSpeech.x < speechStop.x && near(userSpeech.x + userSpeech.width, speechStop.x, 14), `${testCase.route}: ${viewport.name} user speech must terminate at speech_stop`);
            check(sttPre.x < speechStop.x && near(sttPre.x + sttPre.width, speechStop.x, 14), `${testCase.route}: ${viewport.name} streaming STT pre-work must terminate at speech_stop`);
            check(near(sttResidual.x, speechStop.x, 14) && sttResidual.x + sttResidual.width > speechStop.x + 20, `${testCase.route}: ${viewport.name} residual STT must cross into post-speech-stop wait`);
            check(preZone.x < speechStop.x && near(preZone.x + preZone.width, speechStop.x, 14), `${testCase.route}: ${viewport.name} pre-work zone must end at speech_stop`);
          }

          if (speechStop && turnCommit && eouWait) {
            check(near(eouWait.x, speechStop.x, 14) && near(eouWait.x + eouWait.width, turnCommit.x, 14), `${testCase.route}: ${viewport.name} endpointing wait must span speech_stop→turn_commit`);
          }
          if (turnCommit && llm) {
            check(near(llm.x, turnCommit.x, 14), `${testCase.route}: ${viewport.name} model lane must begin at turn_commit in the illustrative path`);
          }
          if (llm && tts && media) {
            check(overlapWidth(llm, tts) > 80, `${testCase.route}: ${viewport.name} LLM/TTS streaming overlap is not visibly encoded`);
            check(overlapWidth(tts, media) > 25, `${testCase.route}: ${viewport.name} TTS/media overlap is not visibly encoded`);
          }
          if (firstAudio && media) {
            check(near(media.x, firstAudio.x, 14), `${testCase.route}: ${viewport.name} media path must begin at first_audio`);
          }
          if (firstPlayout && playout && llm && tts) {
            check(near(playout.x, firstPlayout.x, 14), `${testCase.route}: ${viewport.name} playout lane must start at first_playout`);
            check(llm.x + llm.width > firstPlayout.x + 35, `${testCase.route}: ${viewport.name} model continuation after first_playout is not visible`);
            check(tts.x + tts.width > firstPlayout.x + 35, `${testCase.route}: ${viewport.name} TTS continuation after first_playout is not visible`);
          }
          if (speechStop && firstPlayout && critical && userWait) {
            check(near(critical.x, speechStop.x, 14) && near(critical.x + critical.width, firstPlayout.x, 18), `${testCase.route}: ${viewport.name} critical ribbon must span speech_stop→first_playout`);
            check(near(userWait.x, speechStop.x, 14) && near(userWait.x + userWait.width, firstPlayout.x, 18), `${testCase.route}: ${viewport.name} L_user window must span speech_stop→first_playout`);
          }

          const animations = await visual.evaluate((node) => node.getAnimations({ subtree: true }).length);
          check(animations === 0, `${testCase.route}: ${viewport.name} reduced-motion view still has ${animations} active animations`);

          if (viewport.name === 'mobile') {
            const endState = await scroll.evaluate((node) => {
              const maxScroll = node.scrollWidth - node.clientWidth;
              node.scrollLeft = maxScroll;
              void node.offsetWidth;
              const box = node.getBoundingClientRect();
              const marker = node.querySelector('[data-latency-marker="first-playout"]');
              const playoutNode = node.querySelector('[data-latency-segment="playout"]');
              const markerBox = marker?.getBoundingClientRect();
              const playoutBox = playoutNode?.getBoundingClientRect();
              return {
                maxScroll,
                actualScroll: node.scrollLeft,
                firstPlayoutReachable: Boolean(markerBox && markerBox.left >= box.left - 2 && markerBox.left <= box.right + 2),
                playoutReachable: Boolean(playoutBox && playoutBox.right <= box.right + 2 && playoutBox.right >= box.left - 2),
              };
            });
            check(endState.maxScroll > 300 && endState.actualScroll > 300, `${testCase.route}: mobile timeline horizontal scroll is inert (${JSON.stringify(endState)})`);
            check(endState.firstPlayoutReachable && endState.playoutReachable, `${testCase.route}: mobile timeline cannot reach first_playout/playout (${JSON.stringify(endState)})`);
            await scroll.screenshot({
              path: path.join(outDir, `voice-latency-ch3-${testCase.locale}-mobile-timeline-end.png`),
              animations: 'disabled',
            });
            await scroll.evaluate((node) => { node.scrollLeft = 0; });
          }
        }

        const bodyText = await visual.innerText();
        check(bodyText.includes('speech_stop') && bodyText.includes('first_playout'), `${testCase.route}: ${viewport.name} user-facing measurement boundaries missing`);
        if (testCase.locale === 'en') {
          for (const token of ['Camino crítico', 'La espera del usuario', 'Fin de turno', 'respuesta en streaming', 'síntesis en streaming', 'reproducción', 'Qué evita el doble conteo', 'Prueba el presupuesto']) {
            check(!bodyText.includes(token), `${testCase.route}: ${viewport.name} untranslated visual token ${JSON.stringify(token)}`);
          }
        }

        const toolLink = visual.locator('a').filter({ hasText: testCase.toolLabel });
        check((await toolLink.count()) === 1, `${testCase.route}: ${viewport.name} expected one localized latency explorer link`);
        if (await toolLink.count()) {
          check((await toolLink.getAttribute('href')) === testCase.toolHref, `${testCase.route}: ${viewport.name} wrong latency explorer href`);
          const tabIndex = await toolLink.evaluate((node) => node.tabIndex);
          check(tabIndex >= 0, `${testCase.route}: ${viewport.name} latency explorer link is not keyboard-focusable`);
        }

        await visual.screenshot({
          path: path.join(outDir, `voice-latency-ch3-${testCase.locale}-${viewport.name}-critical-path.png`),
          animations: 'disabled',
        });
      }

      const documentOverflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      check(documentOverflow.scrollWidth <= documentOverflow.clientWidth + 1, `${testCase.route}: ${viewport.name} horizontal page overflow ${JSON.stringify(documentOverflow)}`);

      const runtimeTable = page.locator('main table').filter({ hasText: testCase.runtimeHeader }).first();
      check((await runtimeTable.count()) === 1, `${testCase.route}: ${viewport.name} runtime latency table missing`);
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
          scroller.dataset.s5Ch3LatencyScroller = args.marker;
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

        check(tableState.hasLastHeader === true, `${testCase.route}: ${viewport.name} runtime table last header missing`);
        if (viewport.name === 'desktop') {
          check(tableState.desktopFits === true, `${testCase.route}: desktop runtime latency matrix clipped (${JSON.stringify(tableState)})`);
        } else {
          check(tableState.hasScroller === true, `${testCase.route}: mobile runtime latency matrix clips without horizontal scroll container (${JSON.stringify(tableState)})`);
          check(Number(tableState.maxScroll) > 20 && Number(tableState.actualScroll) > 20, `${testCase.route}: mobile runtime latency matrix horizontal scroll is inert (${JSON.stringify(tableState)})`);
          check(tableState.lastColumnReachable === true, `${testCase.route}: mobile runtime latency matrix final column is not reachable (${JSON.stringify(tableState)})`);

          const scroller = page.locator(`[data-s5-ch3-latency-scroller="${testCase.locale}-${viewport.name}"]`);
          if (await scroller.count()) {
            await scroller.screenshot({
              path: path.join(outDir, `voice-latency-ch3-${testCase.locale}-mobile-runtime-table-end.png`),
              animations: 'disabled',
            });
            await scroller.evaluate((element) => {
              element.scrollLeft = 0;
              delete element.dataset.s5Ch3LatencyScroller;
            });
          }
        }
      }

      for (const error of runtimeErrors) failures.push(`${testCase.route}: ${viewport.name} runtime error: ${error}`);
      await page.screenshot({
        path: path.join(outDir, `voice-latency-ch3-${testCase.locale}-${viewport.name}-page.png`),
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
  console.error(`Voice latency chapter browser/accessibility QA failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Voice latency chapter browser/accessibility QA PASS: relationship-first timeline preserves pre-work, residual critical path, streaming overlap and first-playout boundaries in ES/EN desktop/mobile, including reduced motion, horizontal reachability, runtime-matrix reachability, whole-page overflow, runtime errors and review screenshots.');
