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

const within = (inner, outer, pad = 1) => Boolean(
  inner && outer
  && inner.x >= outer.x - pad
  && inner.y >= outer.y - pad
  && inner.x + inner.width <= outer.x + outer.width + pad
  && inner.y + inner.height <= outer.y + outer.height + pad,
);

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
  return {
    graph: { x: graphRect.x, y: graphRect.y, width: graphRect.width, height: graphRect.height },
    nodes,
    labels,
  };
});

const runNegativeMutation = async (browser) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.setContent(`
    <style>
      #g{position:relative;width:280px;height:180px;overflow:hidden}
      #n{position:absolute;width:54px;height:42px;overflow:visible;white-space:nowrap;font-size:12px}
    </style>
    <div id="g"><div id="n" data-mobile-graph-node="mutant">THIS_LABEL_MUST_OVERFLOW</div></div>
  `);
  const result = await inspectGraph(page, '#g');
  const mutant = result.nodes[0];
  if (!(mutant.scrollWidth > mutant.clientWidth + 1)) {
    throw new Error(`Negative text-overflow mutation was not detected: ${JSON.stringify(mutant)}`);
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
        for (const node of result.nodes) {
          if (!within(node.box, result.graph)) failures.push(`${key}/${locale}/${motion}: node ${node.id} box clipped ${JSON.stringify(node.box)}`);
          if (node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1) {
            failures.push(`${key}/${locale}/${motion}: node ${node.id} text clips/overflows (${node.scrollWidth}x${node.scrollHeight} > ${node.clientWidth}x${node.clientHeight}) ${JSON.stringify(node.text)}`);
          }
          if (node.fontSize < 12) failures.push(`${key}/${locale}/${motion}: node ${node.id} text below 12px (${node.fontSize}px)`);
        }
        for (const label of result.labels) {
          if (!within(label.box, result.graph)) failures.push(`${key}/${locale}/${motion}: edge label ${label.id} clipped ${JSON.stringify(label.box)} ${JSON.stringify(label.text)}`);
          if (label.scrollWidth > label.clientWidth + 1 || label.scrollHeight > label.clientHeight + 1) {
            failures.push(`${key}/${locale}/${motion}: edge label ${label.id} text clips/overflows ${JSON.stringify(label.text)}`);
          }
        }
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
  console.error(`Inference mobile text-fit gate failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('PASS: negative clipping mutation fails as expected; all 12 ES/EN inference mobile graphs fit node and edge-label text at 390px in normal/reduced motion.');
