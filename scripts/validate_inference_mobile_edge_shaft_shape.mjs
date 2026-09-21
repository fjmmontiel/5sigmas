import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const routes = [
  '01-prefill-vs-decode-ttft-tpot-throughput-latency-budget',
  '02-kv-cache-memory-hierarchy-continuous-batching-pagedattention',
  '03-quantization-parallelism-memory-quality-tradeoffs',
  '04-speculative-decoding-prefix-caching-latency-optimisations',
  '05-model-routing-fallback-caching-workload-aware-serving',
  '06-benchmarking-inference-cost-task-throughput-latency-energy-hardware-constraints',
];
const ROUTE_VERSION = 'orthogonal-shaft-v1';
const MIN_DETOUR_SEGMENT = 4;
const EPS = 0.25;

const inspect = async (page, selector) => page.locator(selector).evaluate((graph) => [...graph.querySelectorAll('[data-mobile-graph-edge][data-mobile-graph-short-edge="true"]')].map((edge) => {
  const points = String(edge.getAttribute('points') || '').trim().split(/\s+/).map((point) => point.split(',').map(Number));
  return {
    id: edge.dataset.mobileGraphEdge,
    routed: edge.dataset.mobileGraphRoutedShortEdge === 'true',
    routeVersion: edge.dataset.mobileGraphShortEdgeRoute || '',
    points,
  };
}));

const shapeFailures = (edge, prefix) => {
  const failures = [];
  if (!edge.routed) failures.push(`${prefix}: short edge ${edge.id} is not routed`);
  if (edge.routeVersion !== ROUTE_VERSION) failures.push(`${prefix}: short edge ${edge.id} lacks ${ROUTE_VERSION}`);
  if (!Array.isArray(edge.points) || edge.points.length < 4) failures.push(`${prefix}: short edge ${edge.id} lacks a multi-segment shaft (${edge.points?.length ?? 0} points)`);
  if (!Array.isArray(edge.points) || edge.points.length < 2) return failures;
  const lengths = [];
  for (let i = 1; i < edge.points.length; i += 1) {
    const [x1, y1] = edge.points[i - 1];
    const [x2, y2] = edge.points[i];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    lengths.push(len);
    if (Math.abs(dx) > EPS && Math.abs(dy) > EPS) failures.push(`${prefix}: short edge ${edge.id} contains diagonal chevron segment`);
  }
  if (Math.max(0, ...lengths) < MIN_DETOUR_SEGMENT) failures.push(`${prefix}: short edge ${edge.id} has no continuous shaft segment >= ${MIN_DETOUR_SEGMENT}`);
  return failures;
};

const mutantV = { id: 'mutant-v', routed: true, routeVersion: ROUTE_VERSION, points: [[10, 10], [12, 6], [14, 10]] };
const mutantDirect = { id: 'mutant-direct', routed: true, routeVersion: ROUTE_VERSION, points: [[10, 10], [14, 10]] };
if (!shapeFailures(mutantV, 'negative-v').some((failure) => failure.includes('multi-segment shaft') || failure.includes('diagonal chevron'))) throw new Error('V-shaped routed-short-edge mutation escaped');
if (!shapeFailures(mutantDirect, 'negative-direct').some((failure) => failure.includes('multi-segment shaft'))) throw new Error('direct short-edge mutation escaped');

const browser = await chromium.launch({ headless: true });
const failures = [];
try {
  for (const motion of ['normal', 'reduced']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: motion === 'reduced' ? 'reduce' : 'no-preference' });
    const page = await context.newPage();
    for (const locale of ['es', 'en']) {
      for (let index = 0; index < routes.length; index += 1) {
        const key = String(index + 1).padStart(2, '0');
        const route = `${locale === 'en' ? '/en' : ''}/series/llm-inference-engineering-economics/${routes[index]}/`;
        const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
        if (!response?.ok()) { failures.push(`${key}/${locale}/${motion}: HTTP ${response?.status() ?? 'no response'}`); continue; }
        const selector = `[data-inference-mobile-graph="${key}"]`;
        if (!(await page.locator(selector).count())) { failures.push(`${key}/${locale}/${motion}: graph missing`); continue; }
        await page.waitForTimeout(100);
        const edges = await inspect(page, selector);
        for (const edge of edges) failures.push(...shapeFailures(edge, `${key}/${locale}/${motion}`));
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`Inference orthogonal short-edge shaft gate failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('PASS: V/direct negative mutations fail and every routed short edge has a >=4-point orthogonal shaft with a continuous >=4 SVG-unit segment across 12 ES/EN routes in normal/reduced motion.');
