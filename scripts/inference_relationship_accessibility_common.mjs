import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');

const CONFIGS = {
  '01': {
    route: '01-prefill-vs-decode-ttft-tpot-throughput-latency-budget',
    visual: '.s5v-inference-phases',
    scroll: '.s5v-inference-phases__scroll',
    boundaries: ['client-observation', 'server-runtime', 'scheduler-pressure'],
    nodes: ['request-sent', 'first-output', 'final-output', 'ingress', 'queue', 'prefill', 'first-token-server', 'decode-1', 'decode-2', 'kv-cache', 'concurrency', 'scheduler', 'throughput', 'latency-slos'],
    edges: ['ingress-to-queue', 'queue-to-prefill', 'prefill-to-first', 'first-to-decode', 'decode-loop', 'prefill-to-kv', 'kv-to-decode', 'decode-extends-kv', 'server-first-to-client-first', 'concurrency-to-scheduler', 'scheduler-to-throughput', 'scheduler-to-latency', 'scheduler-to-queue', 'scheduler-to-prefill-decode'],
    metrics: ['ttft', 'generation', 'e2e', 'tpot'],
    desktopTokens: { es: ['TTFT', 'TPOT'], en: ['TTFT', 'TPOT'] },
    mobileTitle: { es: 'La primera salida y el ritmo posterior nacen en fronteras distintas', en: 'First output and the later token cadence come from different boundaries' },
    mobileRelation: { es: 'Concurrencia → scheduler/batching → throughput o goodput', en: 'Concurrency → scheduler/batching → throughput or goodput' },
  },
  '02': {
    route: '02-kv-cache-memory-hierarchy-continuous-batching-pagedattention',
    visual: '.s5v-kv-paging',
    scroll: '.s5v-kv-paging__scroll',
    boundaries: ['logical-requests', 'allocation-manager', 'gpu-physical-pool', 'continuous-scheduler', 'host-memory-tier'],
    nodes: ['request-a', 'request-b', 'request-c-waiting', 'block-table', 'released-a', 'gpu-pool', 'free-pool', 'scheduler', 'finish-event', 'capacity-event', 'admitted-c', 'host-tier', 'gpu-hot-tier', 'page-p0', 'page-p2', 'page-p4', 'page-p7', 'page-p8', 'page-p9', 'page-p10', 'page-p11'],
    edges: ['a-to-table', 'b-to-table', 'table-to-gpu', 'finish-to-release', 'release-to-free', 'free-to-scheduler', 'scheduler-to-c', 'c-to-table', 'gpu-to-host', 'host-to-gpu'],
    desktopTokens: { es: ['Paging decide dónde vive el KV', 'continuous batching decide quién está activo', 'A termina → release', 'Admitir C', 'no elimina el coste de transferir estado'], en: ['Paging decides where KV state lives', 'continuous batching decides which requests are active', 'A finishes → release', 'Admit C', 'does not remove the cost of moving state'] },
    mobileTitle: { es: 'KV lógico, bloques físicos y batching continuo son capas diferentes', en: 'Logical KV, physical blocks, and continuous batching are different layers' },
    mobileRelation: { es: 'Más memoria utilizable → mayor batch posible', en: 'More usable memory → larger possible batches' },
  },
  '03': {
    route: '03-quantization-parallelism-memory-quality-tradeoffs',
    visual: '.s5v-quant-parallel',
    scroll: '.s5v-quant-parallel__scroll',
    boundaries: ['quantization', 'parallelism'],
    nodes: ['weights', 'activations', 'kv', 'quantizer', 'kernel', 'memory-performance', 'quality', 'dp', 'tp', 'pp', 'ep', 'cp', 'topology'],
    desktopTokens: { es: ['menos bytes ≠ menos latencia', 'collective dentro de capas', 'dispatch / all-to-all / desbalance', 'la atención necesita estado remoto', 'Interconexión + runtime + carga deciden el resultado'], en: ['fewer bytes ≠ lower latency', 'collective inside layers', 'dispatch / all-to-all / imbalance', 'attention needs remote state', 'Interconnect + runtime + workload determine the outcome'] },
    mobileTitle: { es: 'Cuantizar bytes y repartir el modelo resuelven cuellos distintos', en: 'Reducing bytes and splitting the model solve different bottlenecks' },
    mobileRelation: { es: 'minimiza bytes y trabajo local', en: 'cuts bytes and local work' },
  },
  '04': {
    route: '04-speculative-decoding-prefix-caching-latency-optimisations',
    visual: '.s5v-reuse-spec',
    scroll: '.s5v-reuse-spec__scroll',
    boundaries: ['reuse', 'speculation'],
    nodes: ['prefix', 'identity', 'lookup', 'hit', 'miss', 'remaining-prefill', 'retention', 'target-state', 'proposer', 'verify', 'accept', 'reject', 'commit', 'pressure'],
    desktopTokens: { es: ['Un hit reduce trabajo de prefill; no implica menor TPOT.', 'Hit rate ≠ reducción proporcional de TTFT.', 'sólo secuencia aceptada', 'KV capacity + scheduler + batching = frontera compartida'], en: ['A hit reduces prefill work; it does not imply lower TPOT.', 'Hit rate ≠ proportional TTFT reduction.', 'accepted sequence only', 'KV capacity + scheduler + batching = shared boundary'] },
    mobileTitle: { es: 'Prefix caching salta trabajo ya validado; speculative decoding crea trabajo provisional', en: 'Prefix caching skips already validated work; speculative decoding creates provisional work' },
    mobileRelation: { es: 'Ambos mecanismos consumen KV/scheduler capacity', en: 'Both mechanisms consume KV/scheduler capacity' },
  },
  '05': {
    route: '05-model-routing-fallback-caching-workload-aware-serving',
    visual: '.s5v-routing-policy',
    scroll: '.s5v-routing-policy__scroll',
    boundaries: ['decision-plane', 'execution-plane'],
    nodes: ['request', 'eligibility', 'cache-lookup', 'cache-hit', 'model-policy', 'selected-model', 'worker-placement', 'primary-attempt', 'success', 'fallback-gate', 'fallback-model', 'terminal-failure', 'telemetry', 'paired-evals', 'policy-update'],
    desktopTokens: { es: ['Cache de respuesta ≠ prefix/KV cache', 'Fallback no revierte output ya emitido ni side effects externos.', 'filtra antes de optimizar'], en: ['Response cache ≠ prefix/KV cache', 'Fallback does not undo already emitted output or external side effects.', 'filter before optimizing'] },
    mobileTitle: { es: 'Cache, routing, placement y fallback no son la misma capa', en: 'Caching, routing, placement, and fallback are not the same layer' },
    mobileRelation: { es: 'La telemetría debe conservar decisión, cache, intento y outcome', en: 'Telemetry must preserve decision, cache, attempt, and outcome' },
  },
  '06': {
    route: '06-benchmarking-inference-cost-task-throughput-latency-energy-hardware-constraints',
    visual: '.s5v-benchmark-boundary',
    scroll: '.s5v-benchmark-boundary__scroll',
    boundaries: ['sut', 'client-clock', 'accounting'],
    nodes: ['workload', 'arrival-process', 'queue', 'service', 'hardware', 'response', 'throughput', 'quality-filter', 'goodput', 'request-send', 'first-output', 'token-gap', 'final-output', 'power-meter', 'energy-integral', 'cost-ledger', 'successful-tasks', 'normalized-outcomes', 'saturation-sweep', 'operating-region', 'report'],
    desktopTokens: { es: ['TTFT = network + queue + prompt + first output', 'SLO + quality gate', '∫ P(t) dt', 'throughput plateau', 'queue / tail ↑', 'misma performance window'], en: ['TTFT = network + queue + prompt + first output', 'SLO + quality gate', '∫ P(t) dt', 'throughput plateau', 'queue / tail ↑', 'same performance window'] },
    mobileTitle: { es: 'Workload, reloj, SLO, energía y hardware deben compartir una frontera declarada', en: 'Workload, clock, SLO, energy, and hardware must share a declared measurement boundary' },
    mobileRelation: { es: 'Sin denominador y frontera publicados, el benchmark no es reproducible ni comparable.', en: 'Without a published denominator and boundary, the benchmark is not reproducible or comparable.' },
  },
};

const activeMotion = async (root) => root.evaluate((node) => {
  const all = [node, ...node.querySelectorAll('*')];
  return all.map((el) => {
    const style = getComputedStyle(el);
    return { animation: style.animationName, animationDuration: style.animationDuration, transitionDuration: style.transitionDuration };
  }).filter((entry) => ((entry.animation !== 'none' && entry.animationDuration !== '0s') || entry.transitionDuration.split(',').some((duration) => duration.trim() !== '0s')));
});
const boxWithinViewport = (box, width) => Boolean(box && box.x >= -1 && box.x + box.width <= width + 1 && box.width > 0 && box.height > 0);

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
          const badResources = [];
          const runtimeErrors = [];
          const onResponse = (response) => {
            try {
              const url = new URL(response.url()); const origin = new URL(base).origin;
              if (url.origin === origin && response.status() >= 400 && !/favicon/i.test(url.pathname)) badResources.push(`${response.status()} ${url.pathname}`);
            } catch {}
          };
          const onRequestFailed = (request) => runtimeErrors.push(`requestfailed ${request.url()} ${request.failure()?.errorText || ''}`);
          const onPageError = (error) => runtimeErrors.push(`pageerror ${error.message}`);
          const onConsole = (message) => { if (message.type() === 'error') runtimeErrors.push(`console.error ${message.text()}`); };
          page.on('response', onResponse); page.on('requestfailed', onRequestFailed); page.on('pageerror', onPageError); page.on('console', onConsole);

          const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
          check(response?.ok(), `${key}/${locale}/${viewport.name}/${motion}: HTTP ${response?.status() ?? 'no response'}`);
          const htmlLang = (await page.locator('html').getAttribute('lang') || '').toLowerCase();
          check(htmlLang.startsWith(locale), `${key}/${locale}/${viewport.name}/${motion}: wrong html lang ${htmlLang}`);
          const visual = page.locator(config.visual).first();
          check((await visual.count()) === 1, `${key}/${locale}/${viewport.name}/${motion}: visual ${config.visual} missing`);
          if (!(await visual.count())) { page.off('response', onResponse); page.off('requestfailed', onRequestFailed); page.off('pageerror', onPageError); page.off('console', onConsole); continue; }

          const pageOverflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
          check(pageOverflow.scrollWidth <= pageOverflow.clientWidth + 1, `${key}/${locale}/${viewport.name}/${motion}: page-level horizontal overflow ${JSON.stringify(pageOverflow)}`);
          const scroll = visual.locator(config.scroll).first();
          check((await scroll.count()) === 1, `${key}/${locale}/${viewport.name}/${motion}: canonical desktop topology missing`);

          if (viewport.name === 'desktop') {
            check(await scroll.isVisible(), `${key}/${locale}/desktop/${motion}: canonical relationship topology is not visible`);
            check((await scroll.getAttribute('tabindex')) === '0', `${key}/${locale}/desktop/${motion}: topology scroller must be keyboard focusable`);
            check((await scroll.getAttribute('role')) === 'region', `${key}/${locale}/desktop/${motion}: topology scroller must expose region role`);
            const aria = await scroll.getAttribute('aria-label');
            check(Boolean(aria && aria.length > 20), `${key}/${locale}/desktop/${motion}: topology scroller lacks meaningful aria-label`);
            const metrics = await scroll.evaluate((node) => ({ scrollWidth: node.scrollWidth, clientWidth: node.clientWidth, display: getComputedStyle(node).display }));
            check(metrics.display !== 'none', `${key}/${locale}/desktop/${motion}: canonical topology unexpectedly hidden`);
            check(metrics.scrollWidth <= metrics.clientWidth + 2, `${key}/${locale}/desktop/${motion}: topology does not fit desktop ${JSON.stringify(metrics)}`);
            const selector = (kind, value) => visual.locator(`[data-${kind}="${value}"]`);
            for (const name of config.boundaries || []) check((await selector('boundary', name).count()) === 1, `${key}/${locale}/desktop/${motion}: missing boundary ${name}`);
            for (const name of config.nodes || []) {
              const node = selector('node', name); check((await node.count()) === 1, `${key}/${locale}/desktop/${motion}: missing node ${name}`);
              if ((await node.count()) === 1) { const box = await node.first().boundingBox(); check(Boolean(box && box.width >= 8 && box.height >= 8), `${key}/${locale}/desktop/${motion}: collapsed node ${name} ${JSON.stringify(box)}`); }
            }
            for (const name of config.edges || []) check((await selector('edge', name).count()) === 1, `${key}/${locale}/desktop/${motion}: missing edge ${name}`);
            for (const name of config.metrics || []) check((await selector('metric', name).count()) === 1, `${key}/${locale}/desktop/${motion}: missing metric ${name}`);
            const visualText = await visual.innerText();
            for (const token of config.desktopTokens[locale]) check(visualText.includes(token), `${key}/${locale}/desktop/${motion}: missing relationship text ${JSON.stringify(token)}`);
            await scroll.focus(); check(await scroll.evaluate((node) => document.activeElement === node), `${key}/${locale}/desktop/${motion}: topology scroller cannot receive focus`);
            const native = visual.locator(`[data-inference-mobile-native="${key}"]`).first();
            check((await native.count()) === 1, `${key}/${locale}/desktop/${motion}: mobile semantic fallback not present in DOM`);
            if (await native.count()) check(!(await native.isVisible()), `${key}/${locale}/desktop/${motion}: mobile semantic fallback must stay hidden on desktop`);
          } else {
            const display = await scroll.evaluate((node) => getComputedStyle(node).display);
            check(display === 'none', `${key}/${locale}/mobile/${motion}: giant canonical scroller must be hidden, got display=${display}`);
            check(!(await scroll.isVisible()), `${key}/${locale}/mobile/${motion}: giant canonical scroller remains visible`);
            await scroll.focus(); check(!(await scroll.evaluate((node) => document.activeElement === node)), `${key}/${locale}/mobile/${motion}: hidden giant scroller remains keyboard-focusable`);
            const summary = visual.locator(`[data-inference-mobile-native="${key}"]`).first();
            check((await summary.count()) === 1, `${key}/${locale}/mobile/${motion}: native mobile relationship summary missing`);
            if (await summary.count()) {
              check(await summary.isVisible(), `${key}/${locale}/mobile/${motion}: native mobile relationship summary is hidden`);
              check((await summary.getAttribute('role')) === 'group', `${key}/${locale}/mobile/${motion}: native summary must expose role=group`);
              const aria = await summary.getAttribute('aria-label'); check(Boolean(aria && aria.length > 20), `${key}/${locale}/mobile/${motion}: native summary aria-label missing`);
              const summaryBox = await summary.boundingBox(); check(boxWithinViewport(summaryBox, viewport.width), `${key}/${locale}/mobile/${motion}: native summary is clipped horizontally ${JSON.stringify(summaryBox)}`);
              const summaryOverflow = await summary.evaluate((node) => ({ scrollWidth: node.scrollWidth, clientWidth: node.clientWidth }));
              check(summaryOverflow.scrollWidth <= summaryOverflow.clientWidth + 1, `${key}/${locale}/mobile/${motion}: native summary requires horizontal scroll ${JSON.stringify(summaryOverflow)}`);
              const steps = summary.locator('.s5v-inference-mobile-native__step'); const stepCount = await steps.count();
              check(stepCount === 4, `${key}/${locale}/mobile/${motion}: expected four causal steps, found ${stepCount}`);
              for (let index = 0; index < stepCount; index += 1) {
                const step = steps.nth(index); const box = await step.boundingBox(); check(boxWithinViewport(box, viewport.width), `${key}/${locale}/mobile/${motion}: step ${index + 1} clipped ${JSON.stringify(box)}`);
                const strong = step.locator('strong').first(); const paragraph = step.locator('p').first();
                check((await strong.innerText()).trim().length >= 3, `${key}/${locale}/mobile/${motion}: step ${index + 1} label empty`);
                check((await paragraph.innerText()).trim().length >= 25, `${key}/${locale}/mobile/${motion}: step ${index + 1} explanation too thin`);
                const type = await step.evaluate((node) => { const strong = node.querySelector('strong'); const p = node.querySelector('p'); return { strongPx: strong ? parseFloat(getComputedStyle(strong).fontSize) : 0, bodyPx: p ? parseFloat(getComputedStyle(p).fontSize) : 0, bodyLine: p ? parseFloat(getComputedStyle(p).lineHeight) : 0 }; });
                check(type.strongPx >= 13, `${key}/${locale}/mobile/${motion}: step ${index + 1} label too small (${type.strongPx}px)`);
                check(type.bodyPx >= 12, `${key}/${locale}/mobile/${motion}: step ${index + 1} body too small (${type.bodyPx}px)`);
                check(type.bodyLine >= type.bodyPx * 1.35, `${key}/${locale}/mobile/${motion}: step ${index + 1} line-height too tight (${type.bodyLine}px)`);
              }
              const title = summary.locator('h4').first(); const titleText = (await title.innerText()).trim();
              check(titleText === config.mobileTitle[locale], `${key}/${locale}/mobile/${motion}: localized mobile title drifted: ${JSON.stringify(titleText)}`);
              const titlePx = await title.evaluate((node) => parseFloat(getComputedStyle(node).fontSize)); check(titlePx >= 16, `${key}/${locale}/mobile/${motion}: native summary title too small (${titlePx}px)`);
              const relation = summary.locator('.s5v-inference-mobile-native__relation').first(); check((await relation.count()) === 1, `${key}/${locale}/mobile/${motion}: relationship consequence missing`);
              if (await relation.count()) { const relationText = (await relation.innerText()).trim(); check(relationText.includes(config.mobileRelation[locale]), `${key}/${locale}/mobile/${motion}: relationship consequence drifted: ${JSON.stringify(relationText)}`); const relationPx = await relation.evaluate((node) => parseFloat(getComputedStyle(node).fontSize)); check(relationPx >= 12, `${key}/${locale}/mobile/${motion}: relationship consequence too small (${relationPx}px)`); }
            }
          }

          if (motion === 'reduced') { const moving = await activeMotion(visual); check(moving.length === 0, `${key}/${locale}/${viewport.name}/reduced: animation/transition remains active ${JSON.stringify(moving.slice(0, 5))}`); }
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
  console.log(`Inference engineering chapter ${key} relationship/accessibility PASS: desktop causal topology + native no-horizontal-scroll mobile summary, ES/EN, normal/reduced, resource/runtime listeners and responsive legibility are intact.`);
}
