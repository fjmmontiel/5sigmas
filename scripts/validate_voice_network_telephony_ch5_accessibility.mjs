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
    route: '/series/agentes-voz-tiempo-real/05-webrtc-sip-telefonia-red/',
    tableHeader: 'Pregunta',
    forbidden: [],
    steps: [
      ['Browser · WebRTC', 'WebRTC + ICE', 'STUN/TURN según ruta', 'Agent runtime'],
      ['PSTN · SIP/RTP', 'SIP + SDP', 'RTP / SRTP', 'Media endpoint'],
      ['PSTN · WSS', 'Media gateway', 'contrato del carrier', 'WSS audio', 'App / runtime'],
    ],
  },
  {
    locale: 'en',
    route: '/en/series/agentes-voz-tiempo-real/05-webrtc-sip-telefonia-red/',
    tableHeader: 'Question',
    forbidden: ['Red y media', 'micrófono', 'pierna telefónica', 'contrato del carrier', 'runtime del agente'],
    steps: [
      ['Browser · WebRTC', 'WebRTC + ICE', 'STUN/TURN depending on path', 'Agent runtime'],
      ['PSTN · SIP/RTP', 'SIP + SDP', 'RTP / SRTP', 'Media endpoint'],
      ['PSTN · WSS', 'Media gateway', 'carrier contract', 'WSS audio', 'App / runtime'],
    ],
  },
];

const viewports = [
  { name: 'desktop', width: 1440, height: 1000, hasTouch: false },
  { name: 'mobile', width: 390, height: 844, hasTouch: true },
];

async function assertStepper(stepper, testCase, viewport, step) {
  const buttons = stepper.locator('button[data-s5v-step]');
  const pipes = stepper.locator('.s5v-arch-map__pipe');
  check((await buttons.count()) === 3, `${testCase.route}: ${viewport.name} expected three network-path controls`);
  check((await pipes.count()) === 3, `${testCase.route}: ${viewport.name} expected three network-path panels`);
  check((await stepper.getAttribute('data-step')) === String(step), `${testCase.route}: ${viewport.name} did not expose data-step=${step}`);

  for (let index = 0; index < await buttons.count(); index += 1) {
    const active = index + 1 === step;
    const button = buttons.nth(index);
    check((await button.getAttribute('aria-pressed')) === (active ? 'true' : 'false'), `${testCase.route}: ${viewport.name} step ${index + 1} aria-pressed drift`);
    check((await button.getAttribute('aria-current')) === (active ? 'step' : null), `${testCase.route}: ${viewport.name} step ${index + 1} aria-current drift`);
  }

  const selected = pipes.nth(step - 1);
  const selectedBox = await selected.boundingBox();
  check(Boolean(selectedBox), `${testCase.route}: ${viewport.name} selected path ${step} is not visible`);
  if (selectedBox) {
    check(selectedBox.width >= (viewport.name === 'mobile' ? 280 : 500), `${testCase.route}: ${viewport.name} selected path ${step} collapsed horizontally (${JSON.stringify(selectedBox)})`);
    check(selectedBox.height <= (viewport.name === 'mobile' ? 560 : 280), `${testCase.route}: ${viewport.name} selected path ${step} wraps pathologically (${JSON.stringify(selectedBox)})`);
  }

  const selectedText = (await selected.innerText()).trim();
  for (const token of testCase.steps[step - 1].slice(1)) {
    check(selectedText.includes(token), `${testCase.route}: ${viewport.name} step ${step} missing ${JSON.stringify(token)}`);
  }
  const buttonText = (await buttons.nth(step - 1).innerText()).trim();
  check(buttonText.includes(testCase.steps[step - 1][0]), `${testCase.route}: ${viewport.name} step ${step} control label drift`);

  const cards = selected.locator(':scope > span');
  check((await cards.count()) >= 4, `${testCase.route}: ${viewport.name} step ${step} lost boundary cards`);
  for (let cardIndex = 0; cardIndex < await cards.count(); cardIndex += 1) {
    const cardBox = await cards.nth(cardIndex).boundingBox();
    check(Boolean(cardBox && cardBox.width >= (viewport.name === 'mobile' ? 120 : 55)), `${testCase.route}: ${viewport.name} step ${step} card ${cardIndex + 1} collapsed (${JSON.stringify(cardBox)})`);
  }

  for (let index = 0; index < await pipes.count(); index += 1) {
    if (index + 1 === step) continue;
    check((await pipes.nth(index).boundingBox()) === null, `${testCase.route}: ${viewport.name} inactive path ${index + 1} remains visually exposed at step ${step}`);
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
      check(((await page.locator('main h1').first().innerText()).trim()).length >= 25, `${testCase.route}: ${viewport.name} missing article h1`);
      check(await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches), `${testCase.route}: ${viewport.name} reduced-motion emulation inactive`);

      const visual = page.locator('.s5v-network-paths');
      check((await visual.count()) === 1, `${testCase.route}: ${viewport.name} expected exactly one network-path visual`);
      if (await visual.count()) {
        check((await visual.getAttribute('data-s5v-stepper')) !== null, `${testCase.route}: ${viewport.name} network paths are not wired to the canonical stepper runtime`);
        check((await visual.getAttribute('data-s5v-steps')) === '3', `${testCase.route}: ${viewport.name} network paths do not declare three states`);
        const label = (await visual.getAttribute('aria-label'))?.trim() || '';
        check(label.length >= 20, `${testCase.route}: ${viewport.name} network visual missing meaningful aria-label`);
        const visualBox = await visual.boundingBox();
        check(Boolean(visualBox && visualBox.width <= viewport.width + 1), `${testCase.route}: ${viewport.name} visual exceeds viewport (${JSON.stringify(visualBox)})`);
        const visualText = await visual.textContent() || '';
        for (const token of testCase.forbidden) check(!visualText.includes(token), `${testCase.route}: ${viewport.name} untranslated visual token ${JSON.stringify(token)}`);

        const buttons = visual.locator('button[data-s5v-step]');
        await assertStepper(visual, testCase, viewport, 1);
        for (const step of [1, 2, 3]) {
          const button = buttons.nth(step - 1);
          const transitions = await button.evaluate((node) => getComputedStyle(node).transitionDuration.split(',').map((value) => value.trim()));
          check(transitions.every((value) => value === '0s'), `${testCase.route}: ${viewport.name} step ${step} keeps transition under reduced-motion (${transitions.join(', ')})`);
          if (viewport.hasTouch) {
            await button.tap();
          } else {
            await button.focus();
            check(await button.evaluate((node) => document.activeElement === node), `${testCase.route}: desktop step ${step} cannot receive keyboard focus`);
            await button.press('Enter');
          }
          await assertStepper(visual, testCase, viewport, step);
          await visual.screenshot({ path: path.join(outDir, `voice-network-ch5-${testCase.locale}-${viewport.name}-path-${step}.png`), animations: 'disabled' });
        }
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
          scroller.dataset.s5Ch5NetworkScroller = args.marker;
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
          const scroller = page.locator(`[data-s5-ch5-network-scroller="${testCase.locale}-${viewport.name}"]`);
          if (await scroller.count()) await scroller.screenshot({ path: path.join(outDir, `voice-network-ch5-${testCase.locale}-mobile-runtime-table-end.png`), animations: 'disabled' });
        }
      }

      for (const error of runtimeErrors) failures.push(`${testCase.route}: ${viewport.name} runtime error: ${error}`);
      for (const error of consoleErrors.filter((entry) => !/favicon|Failed to load resource.*404/i.test(entry))) failures.push(`${testCase.route}: ${viewport.name} console error: ${error}`);
      await page.screenshot({ path: path.join(outDir, `voice-network-ch5-${testCase.locale}-${viewport.name}-page.png`), fullPage: true, animations: 'disabled' });
      await context.close();
    }
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`Voice network/telephony chapter browser/accessibility QA failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Voice network/telephony chapter browser/accessibility QA PASS: ES/EN route language, keyboard/touch reachability of all three network-path states, ARIA state, localized labels, reduced-motion behavior, desktop/mobile geometry, runtime-matrix reachability, whole-page overflow, runtime errors and review screenshots are valid.');
