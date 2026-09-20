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
const MIN_VISIBLE_EDGE_LENGTH = 1.5;

const within = (inner, outer, pad = 1) => Boolean(
  inner && outer
  && inner.x >= outer.x - pad
  && inner.y >= outer.y - pad
  && inner.x + inner.width <= outer.x + outer.width + pad
  && inner.y + inner.height <= outer.y + outer.height + pad,
);

const overlapsMeaningfully = (a, b, minOverlapPx = 2) => {
  if (!a || !b) return false;
  const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return overlapX > minOverlapPx && overlapY > minOverlapPx;
};

const inspectGraph = async (page, selector) => page.locator(selector).evaluate((graph) => {
  const graphRect = graph.getBoundingClientRect();
  const nodes = [...graph.querySelectorAll('[data-mobile-graph-node]')].map((node) => {
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return {
      id: node.dataset.mobileGraphNode,
      text: node.textContent.trim(),
      box: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      clientWidth: node.clientWidth,
      scrollWidth: node.scrollWidth,
      clientHeight: node.clientHeight,
      scrollHeight: node.scrollHeight,
      fontSize: parseFloat(style.fontSize),
    };
  });
  const labels = [...graph.querySelectorAll('[data-mobile-graph-edge-label]')].map((label) => {
    const rect = label.getBoundingClientRect();
    return {
      id: label.dataset.mobileGraphEdgeLabel,
      text: label.textContent.trim(),
      box: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      clientWidth: label.clientWidth,
      scrollWidth: label.scrollWidth,
      clientHeight: label.clientHeight,
      scrollHeight: label.scrollHeight,
    };
  });
  const edges = [...graph.querySelectorAll('[data-mobile-graph-edge]')].map((edge) => {
    const style = getComputedStyle(edge);
    let length = 0;
    try { length = edge.getTotalLength(); } catch {}
    return {
      id: edge.dataset.mobileGraphEdge,
      from: edge.dataset.mobileGraphFrom || '',
      to: edge.dataset.mobileGraphTo || '',
      markerEnd: edge.getAttribute('marker-end') || '',
      length,
      display: style.display,
      visibility: style.visibility,
      opacity: parseFloat(style.opacity || '1'),
      strokeWidth: parseFloat(style.strokeWidth || '0'),
    };
  });
  return {
    graph: { x: graphRect.x, y: graphRect.y, width: graphRect.width, height: graphRect.height },
    nodes,
    labels,
    edges,
  };
});

const collectLayoutFailures = (result, prefix) => {
  const failures = [];
  for (const node of result.nodes) {
    if (!within(node.box, result.graph)) failures.push(`${prefix}: node ${node.id} box clipped ${JSON.stringify(node.box)}`);
    if (node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1) {
      failures.push(`${prefix}: node ${node.id} text clips/overflows (${node.scrollWidth}x${node.scrollHeight} > ${node.clientWidth}x${node.clientHeight}) ${JSON.stringify(node.text)}`);
    }
    if (node.fontSize < 12) failures.push(`${prefix}: node ${node.id} text below 12px (${node.fontSize}px)`);
  }
  for (let i = 0; i < result.nodes.length; i += 1) {
    for (let j = i + 1; j < result.nodes.length; j += 1) {
      if (overlapsMeaningfully(result.nodes[i].box, result.nodes[j].box)) {
        failures.push(`${prefix}: node overlap ${result.nodes[i].id}<->${result.nodes[j].id}`);
      }
    }
  }
  for (const label of result.labels) {
    if (!within(label.box, result.graph)) failures.push(`${prefix}: edge label ${label.id} clipped ${JSON.stringify(label.box)} ${JSON.stringify(label.text)}`);
    if (label.scrollWidth > label.clientWidth + 1 || label.scrollHeight > label.clientHeight + 1) {
      failures.push(`${prefix}: edge label ${label.id} text clips/overflows ${JSON.stringify(label.text)}`);
    }
    for (const node of result.nodes) {
      if (overlapsMeaningfully(label.box, node.box)) {
        failures.push(`${prefix}: edge label ${label.id} overlaps node ${node.id}`);
      }
    }
  }
  for (let i = 0; i < result.labels.length; i += 1) {
    for (let j = i + 1; j < result.labels.length; j += 1) {
      if (overlapsMeaningfully(result.labels[i].box, result.labels[j].box)) {
        failures.push(`${prefix}: edge-label overlap ${result.labels[i].id}<->${result.labels[j].id}`);
      }
    }
  }
  for (const edge of result.edges) {
    if (!edge.markerEnd) failures.push(`${prefix}: edge ${edge.id} lacks direction marker`);
    if (edge.display === 'none' || edge.visibility === 'hidden' || edge.opacity <= 0 || edge.strokeWidth <= 0) {
      failures.push(`${prefix}: edge ${edge.id} is not visibly rendered`);
    }
    if (!Number.isFinite(edge.length) || edge.length < MIN_VISIBLE_EDGE_LENGTH) {
      failures.push(`${prefix}: edge ${edge.id} visible path too short (${edge.length.toFixed(3)} < ${MIN_VISIBLE_EDGE_LENGTH})`);
    }
  }
  return failures;
};

const runNegativeMutation = async (browser) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.setContent(`
    <style>
      #g{position:relative;width:280px;height:180px;overflow:hidden}
      .n{position:absolute;width:54px;height:42px;overflow:visible;font-size:12px}
      #n1{left:20px;top:20px;white-space:nowrap}
      #n2{left:48px;top:34px}
      #l{position:absolute;left:44px;top:38px;width:54px;height:18px}
      svg{position:absolute;inset:0;width:100%;height:100%}
      [data-mobile-graph-edge]{fill:none;stroke:#000;stroke-width:1.45}
    </style>
    <div id="g">
      <svg viewBox="0 0 100 100">
        <defs><marker id="mutant-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#000"/></marker></defs>
        <polyline points="10,10 10.5,10" marker-end="url(#mutant-arrow)" data-mobile-graph-edge="mutant-short"></polyline>
      </svg>
      <div id="n1" class="n" data-mobile-graph-node="mutant-a">THIS_LABEL_MUST_OVERFLOW</div>
      <div id="n2" class="n" data-mobile-graph-node="mutant-b">OVERLAP</div>
      <span id="l" data-mobile-graph-edge-label="mutant-edge">COLLIDE</span>
    </div>
  `);
  const result = await inspectGraph(page, '#g');
  const failures = collectLayoutFailures(result, 'negative-mutation');
  const expected = [
    failures.some((failure) => failure.includes('text clips/overflows')),
    failures.some((failure) => failure.includes('node overlap')),
    failures.some((failure) => failure.includes('edge label mutant-edge overlaps node')),
    failures.some((failure) => failure.includes('edge mutant-short visible path too short')),
  ];
  if (expected.some((detected) => !detected)) {
    throw new Error(`Negative mobile-layout mutations were not all detected: ${JSON.stringify(failures)}`);
  }
  await page.close();
};

const browser = await chromium.launch({ headless: true });
const failures = [];
try {
  await runNegativeMutation(browser);
  for (const motion of ['normal', 'reduced']) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      reducedMotion: motion === 'reduced' ? 'reduce' : 'no-preference',
    });
    const page = await context.newPage();
    for (const locale of ['es', 'en']) {
      for (let index = 0; index < routes.length; index += 1) {
        const key = String(index + 1).padStart(2, '0');
        const route = `${locale === 'en' ? '/en' : ''}/series/llm-inference-engineering-economics/${routes[index]}/`;
        const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
        if (!response?.ok()) {
          failures.push(`${key}/${locale}/${motion}: HTTP ${response?.status() ?? 'no response'}`);
          continue;
        }
        const selector = `[data-inference-mobile-graph="${key}"]`;
        if (!(await page.locator(selector).count())) {
          failures.push(`${key}/${locale}/${motion}: native mobile graph missing`);
          continue;
        }
        const result = await inspectGraph(page, selector);
        failures.push(...collectLayoutFailures(result, `${key}/${locale}/${motion}`));
        const pageWidth = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
        if (pageWidth.scrollWidth > pageWidth.clientWidth + 1) failures.push(`${key}/${locale}/${motion}: page horizontal overflow ${JSON.stringify(pageWidth)}`);
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`Inference mobile text-fit/layout gate failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`PASS: negative overflow/overlap/short-edge mutations fail as expected; all 12 ES/EN inference mobile graphs fit node and edge-label text, avoid meaningful node/label collisions, and retain directed visible edge paths >= ${MIN_VISIBLE_EDGE_LENGTH} SVG units at 390px in normal/reduced motion.`);
