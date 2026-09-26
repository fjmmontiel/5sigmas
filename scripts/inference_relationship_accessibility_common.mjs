import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');

const CONFIGS = {
  '01': {
    route: '01-prefill-vs-decode-ttft-tpot-throughput-latency-budget', visual: '.s5v-inference-phases', scroll: '.s5v-inference-phases__scroll',
    boundaries: ['client-observation', 'server-runtime', 'scheduler-pressure'],
    nodes: ['request-sent', 'first-output', 'final-output', 'ingress', 'queue', 'prefill', 'first-token-server', 'decode-1', 'decode-2', 'kv-cache', 'concurrency', 'scheduler', 'throughput', 'latency-slos'],
    edges: ['ingress-to-queue', 'queue-to-prefill', 'prefill-to-first', 'first-to-decode', 'decode-loop', 'prefill-to-kv', 'kv-to-decode', 'decode-extends-kv', 'server-first-to-client-first', 'concurrency-to-scheduler', 'scheduler-to-throughput', 'scheduler-to-latency', 'scheduler-to-queue', 'scheduler-to-prefill-decode'],
    metrics: ['ttft', 'generation', 'e2e', 'tpot'], desktopTokens: { es: ['TTFT', 'TPOT'], en: ['TTFT', 'TPOT'] }, mobileNodes: 9, mobileEdges: 9,
    mobileTitle: { es: 'TTFT y TPOT nacen en fronteras distintas del mismo pipeline', en: 'TTFT and TPOT come from different boundaries in the same pipeline' },
    mobileRelation: { es: 'La petición atraviesa cola y prefill', en: 'The request crosses queueing and prefill' },
  },
  '02': {
    route: '02-kv-cache-memory-hierarchy-continuous-batching-pagedattention', visual: '.s5v-kv-paging', scroll: '.s5v-kv-paging__scroll',
    boundaries: ['logical-requests', 'allocation-manager', 'gpu-physical-pool', 'continuous-scheduler', 'host-memory-tier'],
    nodes: ['request-a', 'request-b', 'request-c-waiting', 'block-table', 'released-a', 'gpu-pool', 'free-pool', 'scheduler', 'finish-event', 'capacity-event', 'admitted-c', 'host-tier', 'gpu-hot-tier', 'page-p0', 'page-p2', 'page-p4', 'page-p7', 'page-p8', 'page-p9', 'page-p10', 'page-p11'],
    edges: ['a-to-table', 'b-to-table', 'table-to-gpu', 'finish-to-release', 'release-to-free', 'free-to-scheduler', 'scheduler-to-c', 'c-to-table', 'gpu-to-host', 'host-to-gpu'],
    desktopTokens: { es: ['Paging decide dónde vive el KV', 'continuous batching decide quién está activo'], en: ['Paging decides where KV state lives', 'continuous batching decides which requests are active'] }, mobileNodes: 10, mobileEdges: 10,
    mobileTitle: { es: 'KV lógico, bloques físicos y batching continuo forman un circuito de asignación', en: 'Logical KV, physical blocks, and continuous batching form an allocation loop' },
    mobileRelation: { es: 'La tabla desacopla el KV lógico', en: 'The block table decouples logical KV' },
  },
  '03': {
    route: '03-quantization-parallelism-memory-quality-tradeoffs', visual: '.s5v-quant-parallel', scroll: '.s5v-quant-parallel__scroll',
    boundaries: ['quantization', 'parallelism'], nodes: ['weights', 'activations', 'kv', 'quantizer', 'kernel', 'memory-performance', 'quality', 'dp', 'tp', 'pp', 'ep', 'cp', 'topology'],
    desktopTokens: { es: ['menos bytes ≠ menos latencia', 'Interconexión + runtime + carga deciden el resultado'], en: ['fewer bytes ≠ lower latency', 'Interconnect + runtime + workload determine the outcome'] }, mobileNodes: 9, mobileEdges: 8,
    mobileTitle: { es: 'Cuantización y paralelismo atacan cuellos distintos y convergen en el mismo resultado', en: 'Quantization and parallelism attack different bottlenecks and converge on one outcome' },
    mobileRelation: { es: 'La lane superior reduce representación', en: 'The upper lane reduces representation' },
  },
  '04': {
    route: '04-speculative-decoding-prefix-caching-latency-optimisations', visual: '.s5v-reuse-spec', scroll: '.s5v-reuse-spec__scroll',
    boundaries: ['reuse', 'speculation'], nodes: ['prefix', 'identity', 'lookup', 'hit', 'miss', 'remaining-prefill', 'retention', 'target-state', 'proposer', 'verify', 'accept', 'reject', 'commit', 'pressure'],
    desktopTokens: { es: ['Un hit reduce trabajo de prefill', 'sólo secuencia aceptada'], en: ['A hit reduces prefill work', 'accepted sequence only'] }, mobileNodes: 13, mobileEdges: 13,
    mobileTitle: { es: 'Reutilizar estado validado y especular tokens son dos ramas diferentes', en: 'Reusing validated state and speculating tokens are two different branches' },
    mobileRelation: { es: 'Prefix caching bifurca en hit/miss', en: 'Prefix caching branches on hit/miss' },
  },
  '05': {
    route: '05-model-routing-fallback-caching-workload-aware-serving', visual: '.s5v-routing-policy', scroll: '.s5v-routing-policy__scroll',
    boundaries: ['decision-plane', 'execution-plane'], nodes: ['request', 'eligibility', 'cache-lookup', 'cache-hit', 'model-policy', 'selected-model', 'worker-placement', 'primary-attempt', 'success', 'fallback-gate', 'fallback-model', 'terminal-failure', 'telemetry', 'paired-evals', 'policy-update'],
    desktopTokens: { es: ['Cache de respuesta ≠ prefix/KV cache', 'filtra antes de optimizar'], en: ['Response cache ≠ prefix/KV cache', 'filter before optimizing'] }, mobileNodes: 12, mobileEdges: 13,
    mobileTitle: { es: 'Cache, routing, placement y fallback forman un árbol de decisión con feedback', en: 'Caching, routing, placement, and fallback form a decision tree with feedback' },
    mobileRelation: { es: 'Primero se filtran restricciones', en: 'Constraints are filtered first' },
  },
  '06': {
    route: '06-benchmarking-inference-cost-task-throughput-latency-energy-hardware-constraints', visual: '.s5v-benchmark-boundary', scroll: '.s5v-benchmark-boundary__scroll',
    boundaries: ['sut', 'client-clock', 'accounting'], nodes: ['workload', 'arrival-process', 'queue', 'service', 'hardware', 'response', 'throughput', 'quality-filter', 'goodput', 'request-send', 'first-output', 'token-gap', 'final-output', 'power-meter', 'energy-integral', 'cost-ledger', 'successful-tasks', 'normalized-outcomes', 'saturation-sweep', 'operating-region', 'report'],
    desktopTokens: { es: ['TTFT = network + queue + prompt + first output', '∫ P(t) dt'], en: ['TTFT = network + queue + prompt + first output', '∫ P(t) dt'] }, mobileNodes: 11, mobileEdges: 11,
    mobileTitle: { es: 'Performance, latencia y economía deben medir la misma frontera', en: 'Performance, latency, and economics must measure the same boundary' },
    mobileRelation: { es: 'Workload/SUT, reloj cliente y contabilidad energética', en: 'Workload/SUT, client clock, and energy accounting' },
  },
};

const activeMotion = async (root) => root.evaluate((node) => {
  const all = [node, ...node.querySelectorAll('*')];
  return all.map((el) => {
    const style = getComputedStyle(el);
    return { animation: style.animationName, animationDuration: style.animationDuration, transitionDuration: style.transitionDuration };
  }).filter((entry) => ((entry.animation !== 'none' && entry.animationDuration !== '0s') || entry.transitionDuration.split(',').some((duration) => duration.trim() !== '0s')));
});
const within = (inner, outer, pad = 1) => Boolean(inner && outer && inner.x >= outer.x - pad && inner.y >= outer.y - pad && inner.x + inner.width <= outer.x + outer.width + pad && inner.y + inner.height <= outer.y + outer.height + pad && inner.width > 0 && inner.height > 0);

const isExpectedPlatformTelemetryAbort = (urlValue, errorText) => {
  if (!/ERR_ABORTED/i.test(errorText || '')) return false;
  try {
    const requestUrl = new URL(urlValue);
    const previewUrl = new URL(base);
    return requestUrl.origin === previewUrl.origin && requestUrl.pathname === '/cdn-cgi/rum';
  } catch {
    return false;
  }
};

const platformTelemetryAbortMutationCount = (() => {
  const fixtures = [
    [`${base}/cdn-cgi/rum?test=1`, 'net::ERR_ABORTED', true, 'exact same-origin Cloudflare RUM abort'],
    [`${base}/cdn-cgi/rum?test=1`, 'net::ERR_FAILED', false, 'non-abort RUM failure'],
    [`${base}/assets/site.js`, 'net::ERR_ABORTED', false, 'other same-origin abort'],
    ['https://example.invalid/cdn-cgi/rum?test=1', 'net::ERR_ABORTED', false, 'cross-origin RUM abort'],
  ];
  for (const [urlValue, errorText, expected, name] of fixtures) {
    const actual = isExpectedPlatformTelemetryAbort(urlValue, errorText);
    if (actual !== expected) throw new Error(`Inference platform-telemetry abort classifier mutation failed: ${name}; expected=${expected}; actual=${actual}`);
  }
  return fixtures.length;
})();

export async function validateInferenceChapter(key) {
  const config = CONFIGS[key];
  if (!config) throw new Error(`Unknown inference chapter contract ${key}`);
  await fs.mkdir(outDir, { recursive: true });
  const failures = [];
  const check = (condition, message) => { if (!condition) failures.push(message); };
  const browser = await chromium.launch({ headless: true });
  try {
    for (const motion of ['normal', 'reduced']) {
      for (const viewport of [{ name: 'desktop', width: 1440, height: 1000, hasTouch: false }, { name: 'mobile', width: 390, height: 844, hasTouch: true }]) {
        const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, hasTouch: viewport.hasTouch, isMobile: viewport.hasTouch, reducedMotion: motion === 'reduced' ? 'reduce' : 'no-preference' });
        const page = await context.newPage();
        for (const locale of ['es', 'en']) {
          const route = `${locale === 'en' ? '/en' : ''}/series/llm-inference-engineering-economics/${config.route}/`;
          const badResources = []; const runtimeErrors = []; const expectedPlatformAborts = [];
          const onResponse = (response) => { try { const url = new URL(response.url()); const origin = new URL(base).origin; if (url.origin === origin && response.status() >= 400 && !/favicon/i.test(url.pathname)) badResources.push(`${response.status()} ${url.pathname}`); } catch {} };
          const onRequestFailed = (request) => {
            const errorText = request.failure()?.errorText || '';
            if (isExpectedPlatformTelemetryAbort(request.url(), errorText)) {
              expectedPlatformAborts.push(`requestfailed ${request.url()} ${errorText}`);
              return;
            }
            runtimeErrors.push(`requestfailed ${request.url()} ${errorText}`);
          };
          const onPageError = (error) => runtimeErrors.push(`pageerror ${error.message}`);
          const onConsole = (message) => { if (message.type() === 'error') runtimeErrors.push(`console.error ${message.text()}`); };
          page.on('response', onResponse); page.on('requestfailed', onRequestFailed); page.on('pageerror', onPageError); page.on('console', onConsole);

          const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
          check(response?.ok(), `${key}/${locale}/${viewport.name}/${motion}: HTTP ${response?.status() ?? 'no response'}`);
          const htmlLang = (await page.locator('html').getAttribute('lang') || '').toLowerCase();
          check(htmlLang.startsWith(locale), `${key}/${locale}/${viewport.name}/${motion}: wrong html lang ${htmlLang}`);
          const visual = page.locator(config.visual).first();
          check((await visual.count()) === 1, `${key}/${locale}/${viewport.name}/${motion}: visual ${config.visual} missing`);
          if (!(await visual.count())) continue;
          const overflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
          check(overflow.scrollWidth <= overflow.clientWidth + 1, `${key}/${locale}/${viewport.name}/${motion}: page-level horizontal overflow ${JSON.stringify(overflow)}`);
          const scroll = visual.locator(config.scroll).first();
          check((await scroll.count()) === 1, `${key}/${locale}/${viewport.name}/${motion}: canonical desktop topology missing`);

          if (viewport.name === 'desktop') {
            check(await scroll.isVisible(), `${key}/${locale}/desktop/${motion}: canonical topology not visible`);
            check((await scroll.getAttribute('tabindex')) === '0', `${key}/${locale}/desktop/${motion}: topology scroller not keyboard focusable`);
            check((await scroll.getAttribute('role')) === 'region', `${key}/${locale}/desktop/${motion}: topology scroller missing region role`);
            const aria = await scroll.getAttribute('aria-label'); check(Boolean(aria && aria.length > 20), `${key}/${locale}/desktop/${motion}: topology lacks meaningful aria-label`);
            const selector = (kind, value) => visual.locator(`[data-${kind}="${value}"]`);
            for (const name of config.boundaries || []) check((await selector('boundary', name).count()) === 1, `${key}/${locale}/desktop/${motion}: missing boundary ${name}`);
            for (const name of config.nodes || []) check((await selector('node', name).count()) === 1, `${key}/${locale}/desktop/${motion}: missing node ${name}`);
            for (const name of config.edges || []) check((await selector('edge', name).count()) === 1, `${key}/${locale}/desktop/${motion}: missing edge ${name}`);
            for (const name of config.metrics || []) check((await selector('metric', name).count()) === 1, `${key}/${locale}/desktop/${motion}: missing metric ${name}`);
            const text = await visual.innerText(); for (const token of config.desktopTokens[locale]) check(text.includes(token), `${key}/${locale}/desktop/${motion}: missing relationship text ${JSON.stringify(token)}`);
            const native = visual.locator(`[data-inference-mobile-native="${key}"]`).first();
            check((await native.count()) === 1, `${key}/${locale}/desktop/${motion}: mobile graph absent from DOM`);
            if (await native.count()) check(!(await native.isVisible()), `${key}/${locale}/desktop/${motion}: mobile graph visible on desktop`);
          } else {
            const display = await scroll.evaluate((node) => getComputedStyle(node).display);
            check(display === 'none', `${key}/${locale}/mobile/${motion}: giant canonical scroller must be hidden, got ${display}`);
            const summary = visual.locator(`[data-inference-mobile-native="${key}"]`).first();
            check((await summary.count()) === 1, `${key}/${locale}/mobile/${motion}: native mobile graph missing`);
            if (await summary.count()) {
              check(await summary.isVisible(), `${key}/${locale}/mobile/${motion}: native mobile graph not visible`);
              const summaryBox = await summary.boundingBox();
              check(Boolean(summaryBox && summaryBox.x >= -1 && summaryBox.x + summaryBox.width <= viewport.width + 1), `${key}/${locale}/mobile/${motion}: summary clipped ${JSON.stringify(summaryBox)}`);
              check((await summary.locator('.s5v-inference-mobile-native__step').count()) === 0, `${key}/${locale}/mobile/${motion}: legacy card-step fallback returned`);
              const graph = summary.locator(`[data-inference-mobile-graph="${key}"]`).first();
              check((await graph.count()) === 1, `${key}/${locale}/mobile/${motion}: relationship graph container missing`);
              if (await graph.count()) {
                const graphBox = await graph.boundingBox(); check(Boolean(graphBox && graphBox.height >= 300), `${key}/${locale}/mobile/${motion}: graph too shallow ${JSON.stringify(graphBox)}`);
                const nodes = graph.locator('[data-mobile-graph-node]'); const edges = graph.locator('[data-mobile-graph-edge]');
                check((await nodes.count()) === config.mobileNodes, `${key}/${locale}/mobile/${motion}: expected ${config.mobileNodes} graph nodes, found ${await nodes.count()}`);
                check((await edges.count()) === config.mobileEdges, `${key}/${locale}/mobile/${motion}: expected ${config.mobileEdges} graph edges, found ${await edges.count()}`);
                for (let i = 0; i < await nodes.count(); i += 1) {
                  const node = nodes.nth(i); const box = await node.boundingBox(); check(within(box, graphBox), `${key}/${locale}/mobile/${motion}: graph node ${i + 1} clipped ${JSON.stringify(box)}`);
                  const px = await node.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)); check(px >= 12, `${key}/${locale}/mobile/${motion}: graph node ${i + 1} text too small (${px}px)`);
                  check((await node.innerText()).trim().length >= 3, `${key}/${locale}/mobile/${motion}: graph node ${i + 1} label empty`);
                }
                for (let i = 0; i < await edges.count(); i += 1) check(Boolean(await edges.nth(i).getAttribute('marker-end')), `${key}/${locale}/mobile/${motion}: edge ${i + 1} lacks direction marker`);
              }
              const titleText = (await summary.locator('h4').first().innerText()).trim(); check(titleText === config.mobileTitle[locale], `${key}/${locale}/mobile/${motion}: localized title drifted ${JSON.stringify(titleText)}`);
              const relation = summary.locator('.s5v-inference-mobile-native__relation').first(); check((await relation.count()) === 1, `${key}/${locale}/mobile/${motion}: relation explanation missing`);
              if (await relation.count()) { const relationText = (await relation.innerText()).trim(); check(relationText.includes(config.mobileRelation[locale]), `${key}/${locale}/mobile/${motion}: relation explanation drifted ${JSON.stringify(relationText)}`); const px = await relation.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)); check(px >= 12, `${key}/${locale}/mobile/${motion}: relation text too small (${px}px)`); }
            }
          }

          if (motion === 'reduced') { const moving = await activeMotion(visual); check(moving.length === 0, `${key}/${locale}/${viewport.name}/reduced: motion remains active ${JSON.stringify(moving.slice(0, 5))}`); }
          await page.screenshot({ path: path.join(outDir, `inference-engineering-ch${Number(key)}-${locale}-${viewport.name}-${motion}-page.png`), fullPage: true, animations: 'disabled' });
          if (viewport.name === 'mobile') { const summary = visual.locator(`[data-inference-mobile-native="${key}"]`).first(); if (await summary.count()) await summary.screenshot({ path: path.join(outDir, `inference-engineering-ch${Number(key)}-${locale}-${viewport.name}-${motion}-native.png`), animations: 'disabled' }); }
          else await visual.screenshot({ path: path.join(outDir, `inference-engineering-ch${Number(key)}-${locale}-${viewport.name}-${motion}-visual.png`), animations: 'disabled' });
          check(badResources.length === 0, `${key}/${locale}/${viewport.name}/${motion}: broken same-origin resources ${JSON.stringify(badResources)}`);
          check(runtimeErrors.length === 0, `${key}/${locale}/${viewport.name}/${motion}: runtime errors ${JSON.stringify(runtimeErrors.slice(0, 8))}`);
          page.off('response', onResponse); page.off('requestfailed', onRequestFailed); page.off('pageerror', onPageError); page.off('console', onConsole);
        }
        await context.close();
      }
    }
  } finally { await browser.close(); }
  if (failures.length) { console.error(`Inference engineering chapter ${key} relationship/accessibility gate failed (${failures.length}):`); for (const failure of failures) console.error(`- ${failure}`); process.exitCode = 1; return; }
  console.log(`Inference engineering chapter ${key} relationship/accessibility PASS: desktop causal topology + native mobile directed graph, ES/EN, normal/reduced, resource/runtime listeners and responsive legibility are intact; platform telemetry abort classifier mutations=${platformTelemetryAbortMutationCount}.`);
}
