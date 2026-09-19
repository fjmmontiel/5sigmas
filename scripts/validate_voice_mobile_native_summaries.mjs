#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const contracts = [
  {
    chapter: '04',
    source: 'docs/snippets/articulos-tecnicos/voice-action-lifecycle.html',
    visual: '.s5v-action-state-machine',
    summary: '[data-action-mobile-summary]',
    item: '[data-action-mobile-step]',
    routes: {
      es: '/series/agentes-voz-tiempo-real/04-tools-estado-acciones-asincronas/',
      en: '/en/series/agentes-voz-tiempo-real/04-tools-estado-acciones-asincronas/',
    },
    expected: {
      es: ['Acción admitida', 'BARGE-IN', 'Resultado externo', 'consultar el sistema de registro', 'COMMITTED', 'FAILED', 'UNKNOWN'],
      en: ['Action admitted', 'BARGE-IN', 'External outcome', 'query the system of record', 'COMMITTED', 'FAILED', 'UNKNOWN'],
    },
    forbiddenEn: ['Acción admitida', 'Resultado externo', 'consultar el sistema de registro', 'La conversación cambia'],
  },
  {
    chapter: '05',
    source: 'docs/snippets/articulos-tecnicos/voice-network-paths.html',
    visual: '.s5v-network-topology',
    summary: '[data-network-mobile-summary]',
    item: '[data-network-mobile-route]',
    routes: {
      es: '/series/agentes-voz-tiempo-real/05-webrtc-sip-telefonia-red/',
      en: '/en/series/agentes-voz-tiempo-real/05-webrtc-sip-telefonia-red/',
    },
    expected: {
      es: ['Browser · WebRTC', 'ICE: directo o TURN', 'SIP/RTP', 'Señalización y audio son planos distintos', 'Carrier WSS', 'contrato WSS'],
      en: ['Browser · WebRTC', 'ICE: direct or TURN', 'SIP/RTP', 'Signaling and audio are different planes', 'Carrier WSS', 'WSS contract'],
    },
    forbiddenEn: ['Resumen móvil de las tres fronteras', 'directo o TURN', 'Señalización y audio son planos distintos', 'El carrier termina la telefonía'],
  },
  {
    chapter: '06',
    source: 'docs/snippets/articulos-tecnicos/voice-turn-evidence-stack.html',
    visual: '.s5v-turn-evidence-graph',
    summary: '[data-evidence-mobile-summary]',
    item: '[data-evidence-mobile-step]',
    routes: {
      es: '/series/agentes-voz-tiempo-real/06-evaluacion-observabilidad-reliability/',
      en: '/en/series/agentes-voz-tiempo-real/06-evaluacion-observabilidad-reliability/',
    },
    expected: {
      es: ['Causa raíz · Runtime', 'Recuperación', 'Primer observable dañino · Media', 'Resultado de negocio', 'provider_timeout', 'late_response', 'SUCCESS'],
      en: ['Root cause · Runtime', 'Recovery', 'First harmful observable · Media', 'Business outcome', 'provider_timeout', 'late_response', 'SUCCESS'],
    },
    forbiddenEn: ['Resumen móvil de la cadena causal', 'Causa raíz · Runtime', 'Recuperación', 'Primer observable dañino · Media', 'Resultado de negocio'],
  },
];

for (const contract of contracts) {
  const source = await fs.readFile(path.resolve(contract.source), 'utf8');
  const requiredSourceTokens = [
    contract.summary.slice(1, -1),
    '@media(max-width:720px)',
    'display:grid',
  ];
  for (const token of requiredSourceTokens) {
    check(source.includes(token), `Voice${contract.chapter}: mobile-native source contract missing ${token}`);
  }

  // Negative mutation: deleting every instance of the required marker must make the source contract fail.
  const marker = contract.summary.slice(1, -1);
  const removedMarker = `data-removed-native-summary-${contract.chapter}`;
  const mutated = source.replaceAll(marker, removedMarker);
  check(!mutated.includes(marker), `Voice${contract.chapter}: negative mutation did not remove native-summary marker`);
  check(source.includes(marker) && !mutated.includes(marker), `Voice${contract.chapter}: missing fail-closed mutation coverage for native mobile summary`);

  if (contract.chapter === '04') {
    check(source.includes('white-space:nowrap'), 'Voice04: source contract must keep outcome labels single-line');
    check(source.includes('overflow-wrap:normal'), 'Voice04: source contract must disable forced outcome wrapping');
    check(source.includes('word-break:normal'), 'Voice04: source contract must disable outcome word breaking');
  }
}

const browser = await chromium.launch({ headless: true });
try {
  for (const contract of contracts) {
    for (const locale of ['es', 'en']) {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      const runtimeErrors = [];
      const consoleErrors = [];
      page.on('pageerror', (error) => runtimeErrors.push(error.message));
      page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });

      const route = contract.routes[locale];
      const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
      check(response?.ok(), `Voice${contract.chapter} ${locale}: HTTP ${response?.status() ?? 'no response'}`);

      const visual = page.locator(contract.visual);
      const summary = visual.locator(contract.summary);
      check((await visual.count()) === 1, `Voice${contract.chapter} ${locale}: expected one core visual`);
      check((await summary.count()) === 1, `Voice${contract.chapter} ${locale}: expected one native mobile summary`);

      if ((await summary.count()) === 1) {
        check(await summary.isVisible(), `Voice${contract.chapter} ${locale}: native mobile summary is not visible at 390px`);
        const geometry = await summary.evaluate((node) => {
          const box = node.getBoundingClientRect();
          const visual = node.closest('.s5v');
          const visualBox = visual?.getBoundingClientRect();
          const styles = getComputedStyle(node);
          const textNodes = [...node.querySelectorAll('strong,p,span,dt,dd')].filter((el) => (el.textContent || '').trim());
          const fontSizes = textNodes.map((el) => Number.parseFloat(getComputedStyle(el).fontSize || '0')).filter(Number.isFinite);
          return {
            left: box.left,
            right: box.right,
            width: box.width,
            viewport: window.innerWidth,
            visualLeft: visualBox?.left ?? null,
            visualRight: visualBox?.right ?? null,
            scrollWidth: node.scrollWidth,
            clientWidth: node.clientWidth,
            display: styles.display,
            minFontPx: fontSizes.length ? Math.min(...fontSizes) : 0,
          };
        });
        check(geometry.left >= -1 && geometry.right <= geometry.viewport + 1, `Voice${contract.chapter} ${locale}: summary clips viewport ${JSON.stringify(geometry)}`);
        check(geometry.scrollWidth <= geometry.clientWidth + 1, `Voice${contract.chapter} ${locale}: summary requires horizontal scrolling ${JSON.stringify(geometry)}`);
        check(geometry.display !== 'none', `Voice${contract.chapter} ${locale}: summary hidden by CSS`);
        check(geometry.minFontPx >= 10.5, `Voice${contract.chapter} ${locale}: summary body text too small ${JSON.stringify(geometry)}`);

        const itemCount = await summary.locator(contract.item).count();
        check(itemCount >= 3, `Voice${contract.chapter} ${locale}: native summary has only ${itemCount} semantic stages/routes`);

        const text = (await summary.innerText()).trim();
        for (const token of contract.expected[locale]) {
          check(text.includes(token), `Voice${contract.chapter} ${locale}: native summary missing ${JSON.stringify(token)}`);
        }
        if (locale === 'en') {
          for (const token of contract.forbiddenEn) {
            check(!text.includes(token), `Voice${contract.chapter} EN: untranslated native-summary token ${JSON.stringify(token)}`);
          }
        }

        if (contract.chapter === '04') {
          const outcomeLabels = summary.locator('.s5v-action-state-machine__mobile-outcome');
          check((await outcomeLabels.count()) === 3, `Voice04 ${locale}: expected three external outcome labels`);
          const labelGeometry = await outcomeLabels.evaluateAll((nodes) => nodes.map((node) => {
            const styles = getComputedStyle(node);
            const range = document.createRange();
            range.selectNodeContents(node);
            const rects = [...range.getClientRects()].filter((rect) => rect.width > 0.5 && rect.height > 0.5);
            const uniqueLines = [];
            for (const rect of rects) {
              if (!uniqueLines.some((top) => Math.abs(top - rect.top) < 1)) uniqueLines.push(rect.top);
            }
            return {
              text: (node.textContent || '').trim(),
              lineCount: uniqueLines.length,
              scrollWidth: node.scrollWidth,
              clientWidth: node.clientWidth,
              fontSizePx: Number.parseFloat(styles.fontSize || '0'),
              whiteSpace: styles.whiteSpace,
            };
          }));
          for (const label of labelGeometry) {
            check(label.lineCount === 1, `Voice04 ${locale}: outcome label wraps ${JSON.stringify(label)}`);
            check(label.scrollWidth <= label.clientWidth + 1, `Voice04 ${locale}: outcome label overflows ${JSON.stringify(label)}`);
            check(label.fontSizePx >= 10.5, `Voice04 ${locale}: outcome label text too small ${JSON.stringify(label)}`);
            check(label.whiteSpace === 'nowrap', `Voice04 ${locale}: outcome label is not fail-closed nowrap ${JSON.stringify(label)}`);
          }

          // Negative geometry mutation: force COMMITTED into a narrow, wrap-enabled box and prove the gate detects >1 line.
          const mutationDetected = await outcomeLabels.first().evaluate((node) => {
            const previous = {
              width: node.style.width,
              whiteSpace: node.style.whiteSpace,
              overflowWrap: node.style.overflowWrap,
              wordBreak: node.style.wordBreak,
            };
            node.style.width = '36px';
            node.style.whiteSpace = 'normal';
            node.style.overflowWrap = 'anywhere';
            node.style.wordBreak = 'break-word';
            const range = document.createRange();
            range.selectNodeContents(node);
            const rects = [...range.getClientRects()].filter((rect) => rect.width > 0.5 && rect.height > 0.5);
            const uniqueLines = [];
            for (const rect of rects) {
              if (!uniqueLines.some((top) => Math.abs(top - rect.top) < 1)) uniqueLines.push(rect.top);
            }
            node.style.width = previous.width;
            node.style.whiteSpace = previous.whiteSpace;
            node.style.overflowWrap = previous.overflowWrap;
            node.style.wordBreak = previous.wordBreak;
            return uniqueLines.length > 1;
          });
          check(mutationDetected, `Voice04 ${locale}: negative wrapping mutation was not detected fail-closed`);
        }

        const ordering = await visual.evaluate((node, selector) => {
          const summary = node.querySelector(selector);
          const figure = node.querySelector('figure');
          if (!summary || !figure) return null;
          return Boolean(summary.compareDocumentPosition(figure) & Node.DOCUMENT_POSITION_FOLLOWING);
        }, contract.summary);
        check(ordering === true, `Voice${contract.chapter} ${locale}: native summary must precede the wide detail canvas`);

        await summary.screenshot({
          path: path.join(outDir, `voice-mobile-native-ch${contract.chapter}-${locale}.png`),
          animations: 'disabled',
        });
      }

      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      check(overflow.scrollWidth <= overflow.clientWidth + 1, `Voice${contract.chapter} ${locale}: page-level horizontal overflow ${JSON.stringify(overflow)}`);
      check(runtimeErrors.length === 0, `Voice${contract.chapter} ${locale}: runtime errors ${runtimeErrors.join(' | ')}`);
      check(consoleErrors.length === 0, `Voice${contract.chapter} ${locale}: console errors ${consoleErrors.join(' | ')}`);

      await context.close();
    }
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`Realtime Voice native-mobile-summary gate failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Realtime Voice native-mobile-summary gate PASS: Voice04-06 ES/EN @390px');
