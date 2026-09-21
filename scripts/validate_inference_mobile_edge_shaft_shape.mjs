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
const ROUTE_VERSION = 'orthogonal-clearance-v2';
const MIN_MAIN_SHAFT = 8;
const MIN_NONZERO_SEGMENT = 0.75;
const MIN_NODE_CLEARANCE = 1.25;
const COVERAGE_TOLERANCE_PX = 1;
const COVERAGE_MARKER = 'all-full-height-v2';
const EPS = 0.25;

const inspect = async (page, selector) => page.locator(selector).evaluate((graph) => {
  const svg = graph.querySelector('svg');
  const graphRect = graph.getBoundingClientRect();
  const vb = svg?.viewBox?.baseVal;
  const rectOf = (rect) => rect ? ({ x: rect.x, y: rect.y, width: rect.width, height: rect.height }) : null;
  const boxFor = (id) => {
    if (!id || !vb?.width || !vb?.height || !graphRect.width || !graphRect.height) return null;
    const node = graph.querySelector(`[data-mobile-graph-node="${CSS.escape(id)}"]`);
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    const left = vb.x + ((rect.left - graphRect.left) / graphRect.width) * vb.width;
    const right = vb.x + ((rect.right - graphRect.left) / graphRect.width) * vb.width;
    const top = vb.y + ((rect.top - graphRect.top) / graphRect.height) * vb.height;
    const bottom = vb.y + ((rect.bottom - graphRect.top) / graphRect.height) * vb.height;
    return { left, right, top, bottom };
  };
  const edges = [...graph.querySelectorAll('[data-mobile-graph-edge][data-mobile-graph-short-edge="true"]')].map((edge) => {
    const points = String(edge.getAttribute('points') || '').trim().split(/\s+/).map((point) => point.split(',').map(Number));
    return {
      id: edge.dataset.mobileGraphEdge,
      from: edge.dataset.mobileGraphFrom || '',
      to: edge.dataset.mobileGraphTo || '',
      routed: edge.dataset.mobileGraphRoutedShortEdge === 'true',
      routeVersion: edge.dataset.mobileGraphShortEdgeRoute || '',
      clearanceMarker: edge.dataset.mobileGraphShaftClearance || '',
      points,
      sourceBox: boxFor(edge.dataset.mobileGraphFrom || ''),
      targetBox: boxFor(edge.dataset.mobileGraphTo || ''),
    };
  });
  return {
    layout: {
      graph: rectOf(graphRect),
      svg: svg ? rectOf(svg.getBoundingClientRect()) : null,
      coverageFix: svg?.dataset?.mobileGraphCoverageFix || '',
    },
    edges,
  };
});

const layoutFailures = (layout, prefix) => {
  const failures = [];
  if (!layout?.graph || !layout?.svg) {
    failures.push(`${prefix}: graph/SVG layout bounds unavailable`);
    return failures;
  }
  for (const key of ['x', 'y', 'width', 'height']) {
    const graphValue = Number(layout.graph[key]);
    const svgValue = Number(layout.svg[key]);
    if (!Number.isFinite(graphValue) || !Number.isFinite(svgValue)) {
      failures.push(`${prefix}: non-finite graph/SVG ${key}`);
      continue;
    }
    if (Math.abs(svgValue - graphValue) > COVERAGE_TOLERANCE_PX) {
      failures.push(`${prefix}: edge SVG ${key} ${svgValue.toFixed(2)} does not cover graph ${key} ${graphValue.toFixed(2)} within ${COVERAGE_TOLERANCE_PX}px`);
    }
  }
  if (layout.coverageFix !== COVERAGE_MARKER) {
    failures.push(`${prefix}: edge SVG lacks ${COVERAGE_MARKER} coverage marker`);
  }
  return failures;
};

const shaftClearsBoxes = (edge) => {
  if (!edge.sourceBox || !edge.targetBox || !Array.isArray(edge.points) || edge.points.length < 4) return false;
  const a = edge.points[1];
  const b = edge.points[edge.points.length - 2];
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  if (Math.abs(dy) <= EPS && Math.abs(dx) > EPS) {
    const y = (a[1] + b[1]) / 2;
    const above = y <= Math.min(edge.sourceBox.top, edge.targetBox.top) - MIN_NODE_CLEARANCE;
    const below = y >= Math.max(edge.sourceBox.bottom, edge.targetBox.bottom) + MIN_NODE_CLEARANCE;
    return above || below;
  }
  if (Math.abs(dx) <= EPS && Math.abs(dy) > EPS) {
    const x = (a[0] + b[0]) / 2;
    const left = x <= Math.min(edge.sourceBox.left, edge.targetBox.left) - MIN_NODE_CLEARANCE;
    const right = x >= Math.max(edge.sourceBox.right, edge.targetBox.right) + MIN_NODE_CLEARANCE;
    return left || right;
  }
  return false;
};

const shapeFailures = (edge, prefix) => {
  const failures = [];
  if (!edge.routed) failures.push(`${prefix}: short edge ${edge.id} is not routed`);
  if (edge.routeVersion !== ROUTE_VERSION) failures.push(`${prefix}: short edge ${edge.id} lacks ${ROUTE_VERSION}`);
  if (edge.clearanceMarker !== '2') failures.push(`${prefix}: short edge ${edge.id} lacks measured node-clearance routing`);
  if (!Array.isArray(edge.points) || edge.points.length < 4) failures.push(`${prefix}: short edge ${edge.id} lacks a multi-segment shaft (${edge.points?.length ?? 0} points)`);
  if (!Array.isArray(edge.points) || edge.points.length < 2) return failures;
  for (let i = 1; i < edge.points.length; i += 1) {
    const [x1, y1] = edge.points[i - 1];
    const [x2, y2] = edge.points[i];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (Math.abs(dx) > EPS && Math.abs(dy) > EPS) failures.push(`${prefix}: short edge ${edge.id} contains diagonal chevron segment`);
    if (len < MIN_NONZERO_SEGMENT) failures.push(`${prefix}: short edge ${edge.id} contains a degenerate segment ${len.toFixed(2)} < ${MIN_NONZERO_SEGMENT}`);
  }
  const main = edge.points.length >= 4 ? Math.hypot(
    edge.points[edge.points.length - 2][0] - edge.points[1][0],
    edge.points[edge.points.length - 2][1] - edge.points[1][1],
  ) : 0;
  if (main < MIN_MAIN_SHAFT) failures.push(`${prefix}: short edge ${edge.id} main shaft ${main.toFixed(2)} < ${MIN_MAIN_SHAFT}`);
  if (!shaftClearsBoxes(edge)) failures.push(`${prefix}: short edge ${edge.id} main shaft does not clear source/target node boxes by >=${MIN_NODE_CLEARANCE}`);
  return failures;
};

const sourceBox = { left: 8, right: 14, top: 8, bottom: 14 };
const targetBox = { left: 20, right: 26, top: 8, bottom: 14 };
const common = { routed: true, routeVersion: ROUTE_VERSION, clearanceMarker: '2', sourceBox, targetBox };
const mutantV = { ...common, id: 'mutant-v', points: [[14, 11], [16, 7], [20, 11]] };
const mutantDirect = { ...common, id: 'mutant-direct', points: [[14, 11], [20, 11]] };
const mutantDegenerate = { ...common, id: 'mutant-degenerate', points: [[11, 8], [11, 6], [11, 6], [23, 8]] };
const mutantInsideBoundary = { ...common, id: 'mutant-inside-boundary', points: [[11, 8], [11, 13.5], [23, 13.5], [23, 8]] };
const mutantTinyShaft = { ...common, id: 'mutant-tiny-shaft', targetBox: { left: 14.5, right: 20.5, top: 8, bottom: 14 }, points: [[11, 8], [11, 5], [15, 5], [17.5, 8]] };
const compressedSvgMutation = {
  graph: { x: 0, y: 0, width: 288, height: 640 },
  svg: { x: 0, y: 0, width: 288, height: 288 },
  coverageFix: COVERAGE_MARKER,
};
if (!shapeFailures(mutantV, 'negative-v').some((failure) => failure.includes('multi-segment shaft') || failure.includes('diagonal chevron'))) throw new Error('V-shaped routed-short-edge mutation escaped');
if (!shapeFailures(mutantDirect, 'negative-direct').some((failure) => failure.includes('multi-segment shaft'))) throw new Error('direct short-edge mutation escaped');
if (!shapeFailures(mutantDegenerate, 'negative-degenerate').some((failure) => failure.includes('degenerate segment'))) throw new Error('degenerate orthogonal-segment mutation escaped');
if (!shapeFailures(mutantInsideBoundary, 'negative-boundary').some((failure) => failure.includes('does not clear'))) throw new Error('node-boundary-hidden shaft mutation escaped');
if (!shapeFailures(mutantTinyShaft, 'negative-tiny-shaft').some((failure) => failure.includes('main shaft'))) throw new Error('tiny main-shaft mutation escaped');
if (!layoutFailures(compressedSvgMutation, 'negative-compressed-svg').some((failure) => failure.includes('height'))) throw new Error('compressed edge-overlay SVG mutation escaped');

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
        const inspection = await inspect(page, selector);
        const prefix = `${key}/${locale}/${motion}`;
        failures.push(...layoutFailures(inspection.layout, prefix));
        for (const edge of inspection.edges) failures.push(...shapeFailures(edge, prefix));
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
console.log('PASS: compressed-SVG/V/direct/degenerate/boundary-hidden/tiny-shaft mutations fail; every mobile edge overlay fully covers its graph with the explicit full-height marker; every routed short edge has a node-clear orthogonal shaft >=8 SVG units across 12 ES/EN routes in normal/reduced motion.');
