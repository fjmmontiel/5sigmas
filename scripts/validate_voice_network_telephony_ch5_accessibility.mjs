#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const center = (box) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });

const source = await fs.readFile(path.resolve('docs/snippets/articulos-tecnicos/voice-network-paths.html'), 'utf8');
for (const token of ['GOLDEN_VISUAL_CONTRACT', 'learning_objective:', 'mechanism:', 'visual_variables:', 'why_visual:']) {
  check(source.includes(token), `source: missing relationship-first visual contract token ${token}`);
}
for (const encoding of [
  'x-position=ownership progression',
  'lane=network architecture',
  'solid path=media',
  'dotted path=signaling/control',
  'branch topology=direct versus relayed media',
  'shaded zone=operator/trust boundary',
  'vertical boundary=protocol handoff',
]) check(source.includes(encoding), `source: missing declared relationship encoding ${encoding}`);
for (const forbidden of ['data-s5v-stepper', 's5v__steps--tabs', 's5v-arch-map__pipe', 'button data-s5v-step']) {
  check(!source.includes(forbidden), `source: legacy cosmetic visual primitive returned: ${forbidden}`);
}
for (const route of ['webrtc', 'sip-rtp', 'carrier-wss']) {
  check(source.includes(`data-network-route="${route}"`), `source: missing simultaneous network route ${route}`);
}
for (const pathName of ['webrtc-direct', 'webrtc-relay', 'sip-signaling', 'rtp-media', 'carrier-hidden-sip-rtp', 'wss-audio']) {
  check(source.includes(`data-network-path="${pathName}"`), `source: missing topology path ${pathName}`);
}
check(source.includes('data-network-boundary="carrier-app"'), 'source: carrier/application handoff boundary missing');
check(source.includes('overflow-x:auto') && source.includes('tabindex="0"'), 'source: mobile topology reachability missing');
check(source.includes('@media(prefers-reduced-motion:reduce)'), 'source: reduced-motion contract missing');

const cases = [
  {
    locale: 'es',
    route: '/series/agentes-voz-tiempo-real/05-webrtc-sip-telefonia-red/',
    tableHeader: 'Pregunta',
    expected: ['candidate pair directo · UDP preferido', 'SIP + SDP · señalización', 'RTP / SRTP · transporta el audio', 'La app no termina SIP/RTP', 'contrato del carrier → buffering y estado de app'],
    forbidden: [],
  },
  {
    locale: 'en',
    route: '/en/series/agentes-voz-tiempo-real/05-webrtc-sip-telefonia-red/',
    tableHeader: 'Question',
    expected: ['direct candidate pair · UDP preferred', 'SIP + SDP · signaling', 'RTP / SRTP · carries the audio', 'The app does not terminate SIP/RTP', 'carrier contract → buffering and app state'],
    forbidden: ['Red y media', 'El protocolo visible depende', 'micrófono', 'señalización', 'transporta el audio', 'La app no termina', 'contrato del carrier', 'Lectura operacional'],
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
      check(((await page.locator('main h1').first().innerText()).trim()).length >= 25, `${testCase.route}: ${viewport.name} missing article h1`);

      const visual = page.locator('.s5v-network-topology');
      check((await visual.count()) === 1, `${testCase.route}: ${viewport.name} expected exactly one relationship-first network topology`);
      if (await visual.count()) {
        const visualText = (await visual.innerText()).trim();
        for (const token of testCase.expected) check(visualText.includes(token), `${testCase.route}: ${viewport.name} missing localized mechanism label ${JSON.stringify(token)}`);
        for (const token of testCase.forbidden) check(!visualText.includes(token), `${testCase.route}: ${viewport.name} untranslated token ${JSON.stringify(token)}`);
        check((await visual.locator('button, [data-s5v-stepper], .s5v__steps--tabs, .s5v-arch-map__pipe').count()) === 0, `${testCase.route}: ${viewport.name} cosmetic tabs/cards returned`);
        check((await visual.locator('[data-network-route]').count()) === 3, `${testCase.route}: ${viewport.name} all three topologies must be visible simultaneously`);

        const visualBox = await visual.boundingBox();
        check(Boolean(visualBox && visualBox.width <= viewport.width + 1), `${testCase.route}: ${viewport.name} visual exceeds viewport ${JSON.stringify(visualBox)}`);

        const scroll = visual.locator('.s5v-network-topology__scroll');
        const svg = visual.locator('.s5v-network-topology__svg');
        check((await scroll.count()) === 1 && (await svg.count()) === 1, `${testCase.route}: ${viewport.name} topology canvas missing`);

        if ((await scroll.count()) && (await svg.count())) {
          const scrollState = await scroll.evaluate((node) => ({ tabIndex: node.tabIndex, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth }));
          check(scrollState.tabIndex >= 0, `${testCase.route}: ${viewport.name} topology is not keyboard-focusable`);
          check(scrollState.scrollWidth >= scrollState.clientWidth, `${testCase.route}: ${viewport.name} invalid topology scroll geometry ${JSON.stringify(scrollState)}`);
          if (viewport.name === 'mobile') check(scrollState.scrollWidth > scrollState.clientWidth + 500, `${testCase.route}: mobile topology collapsed instead of preserving route geometry ${JSON.stringify(scrollState)}`);

          const getBox = async (selector) => {
            const locator = visual.locator(selector);
            const count = await locator.count();
            if (count !== 1) {
              failures.push(`${testCase.route}: ${viewport.name} expected one ${selector}, found ${count}`);
              return null;
            }
            return locator.boundingBox();
          };

          const webrtc = await getBox('[data-network-route="webrtc"]');
          const sip = await getBox('[data-network-route="sip-rtp"]');
          const carrierWss = await getBox('[data-network-route="carrier-wss"]');
          if (webrtc && sip && carrierWss) {
            check(center(webrtc).y + 150 < center(sip).y && center(sip).y + 150 < center(carrierWss).y, `${testCase.route}: ${viewport.name} route lanes are not spatially independent`);
          }

          const direct = await getBox('[data-network-path="webrtc-direct"]');
          const relay = await getBox('[data-network-path="webrtc-relay"]');
          const turn = await getBox('[data-network-node="turn-relay"]');
          const browserNode = await getBox('[data-network-node="browser"]');
          const endpoint = await getBox('[data-network-node="webrtc-endpoint"]');
          if (direct && relay && turn && browserNode && endpoint) {
            check(direct.y + direct.height < center(turn).y - 8, `${testCase.route}: ${viewport.name} direct WebRTC route is not topologically separated from TURN relay`);
            check(relay.y + relay.height > center(turn).y - 5, `${testCase.route}: ${viewport.name} TURN relay path does not visibly descend through relay`);
            check(center(browserNode).x < center(turn).x && center(turn).x < center(endpoint).x, `${testCase.route}: ${viewport.name} TURN relay is not positioned between browser and media endpoint`);
          }

          const signaling = await getBox('[data-network-path="sip-signaling"]');
          const rtp = await getBox('[data-network-path="rtp-media"]');
          const sipEdge = await getBox('[data-network-node="sip-edge"]');
          const mediaEndpoint = await getBox('[data-network-node="media-endpoint"]');
          if (signaling && rtp && sipEdge && mediaEndpoint) {
            check(center(signaling).y + 25 < center(rtp).y, `${testCase.route}: ${viewport.name} SIP signaling and RTP media collapsed onto one path`);
            check(center(sipEdge).y + 25 < center(mediaEndpoint).y, `${testCase.route}: ${viewport.name} SIP edge and media endpoint are not distinct planes`);
          }

          const carrierZone = await getBox('[data-network-zone="wss-carrier"]');
          const appZone = await getBox('[data-network-zone="application"]');
          const carrierGateway = await getBox('[data-network-node="carrier-media-gateway"]');
          const appRuntime = await getBox('[data-network-node="app-runtime"]');
          const boundary = await getBox('[data-network-boundary="carrier-app"]');
          const hidden = await getBox('[data-network-path="carrier-hidden-sip-rtp"]');
          const wss = await getBox('[data-network-path="wss-audio"]');
          if (carrierZone && appZone && carrierGateway && appRuntime && boundary && hidden && wss) {
            const bx = center(boundary).x;
            check(carrierZone.x + carrierZone.width < appZone.x, `${testCase.route}: ${viewport.name} carrier and application ownership zones overlap`);
            check(center(carrierGateway).x < bx && center(appRuntime).x > bx, `${testCase.route}: ${viewport.name} WSS handoff boundary is not between carrier gateway and app runtime`);
            check(hidden.x + hidden.width < bx - 120, `${testCase.route}: ${viewport.name} hidden SIP/RTP path leaks across carrier boundary`);
            check(wss.x < bx - 100 && wss.x + wss.width > bx + 150, `${testCase.route}: ${viewport.name} WSS audio does not visibly cross carrier/application boundary`);
          }

          const svgTextBounds = await svg.evaluate((node) => {
            const vb = node.viewBox.baseVal;
            return [...node.querySelectorAll('text')].map((text) => {
              const b = text.getBBox();
              return { text: text.textContent || '', x: b.x, y: b.y, width: b.width, height: b.height, viewWidth: vb.width, viewHeight: vb.height };
            });
          });
          for (const item of svgTextBounds) {
            check(item.x >= -1 && item.y >= -1 && item.x + item.width <= item.viewWidth + 1 && item.y + item.height <= item.viewHeight + 1, `${testCase.route}: ${viewport.name} SVG label clips outside relationship canvas: ${JSON.stringify(item)}`);
          }

          const activeAnimations = await visual.evaluate((node) => node.getAnimations({ subtree: true }).length);
          check(activeAnimations === 0, `${testCase.route}: ${viewport.name} reduced-motion view has ${activeAnimations} active animations`);

          if (viewport.name === 'mobile') {
            const midState = await scroll.evaluate((node) => {
              const maxScroll = node.scrollWidth - node.clientWidth;
              node.scrollLeft = Math.round(maxScroll * 0.55);
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
                endpointReachable: visible('[data-network-node="webrtc-endpoint"]'),
                sipMediaReachable: visible('[data-network-node="media-endpoint"]'),
                turnReachable: visible('[data-network-node="turn-relay"]'),
                carrierGatewayReachable: visible('[data-network-node="carrier-media-gateway"]'),
              };
            });
            check(midState.maxScroll > 500 && midState.actualScroll > 200, `${testCase.route}: mobile topology mid-scroll is inert ${JSON.stringify(midState)}`);
            check(midState.endpointReachable || midState.sipMediaReachable, `${testCase.route}: mobile cannot reach media termination nodes at their natural scroll position ${JSON.stringify(midState)}`);
            check(midState.turnReachable || midState.carrierGatewayReachable, `${testCase.route}: mobile cannot reach intermediate relay/gateway nodes ${JSON.stringify(midState)}`);
            await scroll.screenshot({ path: path.join(outDir, `voice-network-ch5-${testCase.locale}-mobile-topology-mid.png`), animations: 'disabled' });

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
                agentReachable: visible('[data-network-node="agent-runtime"]'),
                sipAgentReachable: visible('[data-network-node="sip-agent-runtime"]'),
                appRuntimeReachable: visible('[data-network-node="app-runtime"]'),
              };
            });
            check(endState.maxScroll > 500 && endState.actualScroll > 500, `${testCase.route}: mobile topology end-scroll is inert ${JSON.stringify(endState)}`);
            check(endState.agentReachable && endState.sipAgentReachable && endState.appRuntimeReachable, `${testCase.route}: mobile cannot reach all right-side runtime endpoints ${JSON.stringify(endState)}`);
            await scroll.screenshot({ path: path.join(outDir, `voice-network-ch5-${testCase.locale}-mobile-topology-end.png`), animations: 'disabled' });
            await scroll.evaluate((node) => { node.scrollLeft = 0; });
          }
        }

        await visual.screenshot({ path: path.join(outDir, `voice-network-ch5-${testCase.locale}-${viewport.name}-topology.png`), animations: 'disabled' });
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
          check(tableState.desktopFits === true, `${testCase.route}: desktop runtime decision matrix clipped ${JSON.stringify(tableState)}`);
        } else {
          check(tableState.hasScroller === true, `${testCase.route}: mobile runtime matrix clips without horizontal scroll ${JSON.stringify(tableState)}`);
          check(Number(tableState.maxScroll) > 20 && Number(tableState.actualScroll) > 20, `${testCase.route}: mobile runtime matrix horizontal scroll is inert ${JSON.stringify(tableState)}`);
          check(tableState.lastColumnReachable === true, `${testCase.route}: mobile runtime matrix final column is not reachable ${JSON.stringify(tableState)}`);
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
  console.error(`Voice network/telephony relationship-first browser/accessibility QA failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Voice network/telephony relationship-first browser/accessibility QA PASS: all three routes are simultaneous; WebRTC direct/relay, SIP signaling/media separation and carrier-WSS ownership handoff are encoded geometrically; ES/EN, reduced motion, desktop/mobile reachability, tables, overflow and runtime errors are valid.');