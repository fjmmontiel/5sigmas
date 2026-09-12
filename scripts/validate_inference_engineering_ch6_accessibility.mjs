#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const routes = {
  es: '/series/llm-inference-engineering-economics/06-benchmarking-inference-cost-task-throughput-latency-energy-hardware-constraints/',
  en: '/en/series/llm-inference-engineering-economics/06-benchmarking-inference-cost-task-throughput-latency-energy-hardware-constraints/',
};
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const center = (box) => box ? ({ x: box.x + box.width / 2, y: box.y + box.height / 2 }) : null;

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 1000, hasTouch: false },
    { name: 'mobile', width: 390, height: 844, hasTouch: true },
  ]) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      hasTouch: viewport.hasTouch,
      isMobile: viewport.hasTouch,
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();

    for (const [locale, route] of Object.entries(routes)) {
      const badResources = [];
      const listener = (response) => {
        try {
          const url = new URL(response.url());
          const origin = new URL(base).origin;
          if (url.origin === origin && response.status() >= 400 && !/favicon/i.test(url.pathname)) badResources.push(`${response.status()} ${url.pathname}`);
        } catch {}
      };
      page.on('response', listener);
      const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
      page.off('response', listener);
      check(response?.ok(), `${locale}/${viewport.name}: HTTP ${response?.status() ?? 'no response'}`);
      check(badResources.length === 0, `${locale}/${viewport.name}: broken same-origin resources ${JSON.stringify(badResources)}`);

      const visual = page.locator('.s5v-benchmark-boundary').first();
      check((await visual.count()) === 1, `${locale}/${viewport.name}: benchmarking measurement visual missing`);
      if (!(await visual.count())) continue;

      const htmlLang = (await page.locator('html').getAttribute('lang') || '').toLowerCase();
      check(htmlLang.startsWith(locale), `${locale}/${viewport.name}: wrong html lang ${htmlLang}`);
      const scroll = visual.locator('.s5v-benchmark-boundary__scroll');
      check((await scroll.getAttribute('tabindex')) === '0', `${locale}/${viewport.name}: topology scroller must be keyboard focusable`);
      check((await scroll.getAttribute('role')) === 'region', `${locale}/${viewport.name}: topology scroller must expose region role`);
      const aria = await scroll.getAttribute('aria-label');
      check(Boolean(aria && aria.length > 25), `${locale}/${viewport.name}: topology scroller lacks meaningful aria-label`);

      const pageOverflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      check(pageOverflow.scrollWidth <= pageOverflow.clientWidth + 1, `${locale}/${viewport.name}: page-level horizontal overflow ${JSON.stringify(pageOverflow)}`);
      const scrollerMetrics = await scroll.evaluate((node) => ({ scrollWidth: node.scrollWidth, clientWidth: node.clientWidth, overflowX: getComputedStyle(node).overflowX }));
      if (viewport.name === 'mobile') {
        check(scrollerMetrics.scrollWidth > scrollerMetrics.clientWidth + 300, `${locale}/mobile: relationship topology should require intentional horizontal scroll ${JSON.stringify(scrollerMetrics)}`);
        check(['auto', 'scroll'].includes(scrollerMetrics.overflowX), `${locale}/mobile: scroller overflow-x is ${scrollerMetrics.overflowX}`);
      } else {
        check(scrollerMetrics.scrollWidth <= scrollerMetrics.clientWidth + 2, `${locale}/desktop: visual should fit without internal horizontal scroll ${JSON.stringify(scrollerMetrics)}`);
      }

      const selector = (kind, value) => visual.locator(`[data-${kind}="${value}"]`).first();
      for (const name of ['sut', 'client-clock', 'accounting']) check((await selector('boundary', name).count()) === 1, `${locale}/${viewport.name}: missing boundary ${name}`);
      const requiredNodes = ['workload', 'arrival-process', 'queue', 'service', 'hardware', 'response', 'throughput', 'quality-filter', 'goodput', 'request-send', 'first-output', 'token-gap', 'final-output', 'power-meter', 'energy-integral', 'cost-ledger', 'successful-tasks', 'normalized-outcomes', 'saturation-sweep', 'operating-region', 'report'];
      for (const name of requiredNodes) check((await selector('node', name).count()) === 1, `${locale}/${viewport.name}: missing node ${name}`);

      const workload = center(await selector('node', 'workload').boundingBox());
      const arrivals = center(await selector('node', 'arrival-process').boundingBox());
      const queue = center(await selector('node', 'queue').boundingBox());
      const service = center(await selector('node', 'service').boundingBox());
      const responseNode = center(await selector('node', 'response').boundingBox());
      if (workload && arrivals && queue && service && responseNode) {
        check(workload.x < arrivals.x && arrivals.x < queue.x && queue.x < service.x && service.x < responseNode.x, `${locale}/${viewport.name}: workload → arrivals → queue → service → response topology drifted`);
      }

      const throughput = center(await selector('node', 'throughput').boundingBox());
      const gate = center(await selector('node', 'quality-filter').boundingBox());
      const goodput = center(await selector('node', 'goodput').boundingBox());
      if (responseNode && throughput && gate && goodput) {
        check(throughput.y > responseNode.y, `${locale}/${viewport.name}: throughput branch must remain downstream of response`);
        check(gate.y > throughput.y && goodput.y > gate.y, `${locale}/${viewport.name}: SLO/quality gate must remain between response and goodput`);
      }

      const send = center(await selector('node', 'request-send').boundingBox());
      const first = center(await selector('node', 'first-output').boundingBox());
      const gap = center(await selector('node', 'token-gap').boundingBox());
      const final = center(await selector('node', 'final-output').boundingBox());
      if (send && first && gap && final) check(send.x < first.x && first.x < gap.x && gap.x < final.x, `${locale}/${viewport.name}: request-send → first-output → token-gap → final-output timing order drifted`);

      const power = center(await selector('node', 'power-meter').boundingBox());
      const energy = center(await selector('node', 'energy-integral').boundingBox());
      const cost = center(await selector('node', 'cost-ledger').boundingBox());
      const success = center(await selector('node', 'successful-tasks').boundingBox());
      const normalized = center(await selector('node', 'normalized-outcomes').boundingBox());
      if (power && energy && cost && success && normalized) {
        check(power.x < energy.x && energy.x < cost.x && cost.x < success.x && success.x < normalized.x, `${locale}/${viewport.name}: power/energy/cost/success denominators must remain visually ordered`);
      }

      const sweep = center(await selector('node', 'saturation-sweep').boundingBox());
      const region = center(await selector('node', 'operating-region').boundingBox());
      const report = center(await selector('node', 'report').boundingBox());
      if (sweep && region && report) check(sweep.x < region.x && region.x < report.x, `${locale}/${viewport.name}: saturation sweep → operating region → report order drifted`);

      const sut = await selector('boundary', 'sut').boundingBox();
      const queueBox = await selector('node', 'queue').boundingBox();
      const serviceBox = await selector('node', 'service').boundingBox();
      const hardwareBox = await selector('node', 'hardware').boundingBox();
      if (sut && queueBox && serviceBox && hardwareBox) {
        const inside = (box) => box.x >= sut.x && box.y >= sut.y && box.x + box.width <= sut.x + sut.width && box.y + box.height <= sut.y + sut.height;
        check(inside(queueBox) && inside(serviceBox) && inside(hardwareBox), `${locale}/${viewport.name}: queue/service/hardware must remain inside declared SUT boundary`);
      }

      const visualText = await visual.innerText();
      if (locale === 'es') {
        for (const token of ['TTFT = network + queue + prompt + first output', 'SLO + quality gate', '∫ P(t) dt', 'throughput plateau', 'queue / tail ↑', 'misma performance window']) check(visualText.includes(token), `${locale}/${viewport.name}: missing benchmark relationship ${JSON.stringify(token)}`);
      } else {
        for (const token of ['TTFT = network + queue + prompt + first output', 'SLO + quality gate', '∫ P(t) dt', 'throughput plateau', 'queue / tail ↑', 'same performance window']) check(visualText.includes(token), `${locale}/${viewport.name}: missing benchmark relationship ${JSON.stringify(token)}`);
      }

      const motion = await visual.evaluate((node) => {
        const all = [node, ...node.querySelectorAll('*')];
        return all.map((el) => {
          const style = getComputedStyle(el);
          return { animation: style.animationName, duration: style.animationDuration };
        }).filter((x) => x.animation !== 'none' && x.duration !== '0s');
      });
      check(motion.length === 0, `${locale}/${viewport.name}: visual should remain static under reduced motion ${JSON.stringify(motion.slice(0, 5))}`);

      await scroll.focus();
      check(await scroll.evaluate((node) => document.activeElement === node), `${locale}/${viewport.name}: topology scroller cannot receive keyboard focus`);

      const screenshotBase = `inference-engineering-ch6-${locale}-${viewport.name}`;
      await page.screenshot({ path: path.join(outDir, `${screenshotBase}-page.png`), fullPage: true, animations: 'disabled' });
      await visual.screenshot({ path: path.join(outDir, `${screenshotBase}-visual.png`), animations: 'disabled' });
      if (viewport.name === 'mobile') {
        await scroll.evaluate((node) => { node.scrollLeft = node.scrollWidth; });
        await page.waitForTimeout(100);
        await visual.screenshot({ path: path.join(outDir, `${screenshotBase}-visual-end.png`), animations: 'disabled' });
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`Inference engineering chapter 4.6 browser/accessibility gate failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Inference engineering chapter 4.6 browser/accessibility gate PASS: request path, latency endpoints, throughput/goodput branch, physical SUT and power boundary, cost/energy denominators, saturation topology, desktop/mobile geometry, focus, and reduced motion are intact.');
