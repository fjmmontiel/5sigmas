#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const routes = {
  es: '/series/llm-inference-engineering-economics/01-prefill-vs-decode-ttft-tpot-throughput-latency-budget/',
  en: '/en/series/llm-inference-engineering-economics/01-prefill-vs-decode-ttft-tpot-throughput-latency-budget/',
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

      const visual = page.locator('.s5v-inference-phases').first();
      check((await visual.count()) === 1, `${locale}/${viewport.name}: inference phase visual missing`);
      if (!(await visual.count())) continue;

      const htmlLang = (await page.locator('html').getAttribute('lang') || '').toLowerCase();
      check(htmlLang.startsWith(locale), `${locale}/${viewport.name}: wrong html lang ${htmlLang}`);
      const scroll = visual.locator('.s5v-inference-phases__scroll');
      check((await scroll.getAttribute('tabindex')) === '0', `${locale}/${viewport.name}: topology scroller must be keyboard focusable`);
      check((await scroll.getAttribute('role')) === 'region', `${locale}/${viewport.name}: topology scroller must expose region role`);
      const aria = await scroll.getAttribute('aria-label');
      check(Boolean(aria && aria.length > 20), `${locale}/${viewport.name}: topology scroller lacks meaningful aria-label`);

      const pageOverflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      check(pageOverflow.scrollWidth <= pageOverflow.clientWidth + 1, `${locale}/${viewport.name}: page-level horizontal overflow ${JSON.stringify(pageOverflow)}`);
      const scrollerMetrics = await scroll.evaluate((node) => ({ scrollWidth: node.scrollWidth, clientWidth: node.clientWidth, overflowX: getComputedStyle(node).overflowX }));
      if (viewport.name === 'mobile') {
        check(scrollerMetrics.scrollWidth > scrollerMetrics.clientWidth + 200, `${locale}/mobile: relationship topology should require intentional horizontal scroll ${JSON.stringify(scrollerMetrics)}`);
        check(['auto', 'scroll'].includes(scrollerMetrics.overflowX), `${locale}/mobile: scroller overflow-x is ${scrollerMetrics.overflowX}`);
      } else {
        check(scrollerMetrics.scrollWidth <= scrollerMetrics.clientWidth + 2, `${locale}/desktop: visual should fit without internal horizontal scroll ${JSON.stringify(scrollerMetrics)}`);
      }

      const selector = (kind, value) => visual.locator(`[data-${kind}="${value}"]`).first();
      const requiredBoundaries = ['client-observation', 'server-runtime', 'scheduler-pressure'];
      const requiredNodes = ['request-sent', 'first-output', 'final-output', 'ingress', 'queue', 'prefill', 'first-token-server', 'decode-1', 'decode-2', 'kv-cache', 'concurrency', 'scheduler', 'throughput', 'latency-slos'];
      const requiredEdges = ['ingress-to-queue', 'queue-to-prefill', 'prefill-to-first', 'first-to-decode', 'decode-loop', 'prefill-to-kv', 'kv-to-decode', 'decode-extends-kv', 'server-first-to-client-first', 'concurrency-to-scheduler', 'scheduler-to-throughput', 'scheduler-to-latency', 'scheduler-to-queue', 'scheduler-to-prefill-decode'];
      const requiredMetrics = ['ttft', 'generation', 'e2e', 'tpot'];
      for (const name of requiredBoundaries) check((await selector('boundary', name).count()) === 1, `${locale}/${viewport.name}: missing boundary ${name}`);
      for (const name of requiredNodes) check((await selector('node', name).count()) === 1, `${locale}/${viewport.name}: missing node ${name}`);
      for (const name of requiredEdges) check((await selector('edge', name).count()) === 1, `${locale}/${viewport.name}: missing edge ${name}`);
      for (const name of requiredMetrics) check((await selector('metric', name).count()) === 1, `${locale}/${viewport.name}: missing metric bracket ${name}`);

      const boxes = {};
      for (const name of ['ingress', 'queue', 'prefill', 'first-token-server', 'decode-1', 'decode-2']) boxes[name] = center(await selector('node', name).boundingBox());
      if (Object.values(boxes).every(Boolean)) {
        check(boxes.ingress.x < boxes.queue.x && boxes.queue.x < boxes.prefill.x && boxes.prefill.x < boxes['first-token-server'].x && boxes['first-token-server'].x < boxes['decode-1'].x && boxes['decode-1'].x < boxes['decode-2'].x, `${locale}/${viewport.name}: causal server timeline is not left-to-right`);
      }

      const clientFirst = center(await selector('node', 'first-output').boundingBox());
      const serverFirst = center(await selector('node', 'first-token-server').boundingBox());
      if (clientFirst && serverFirst) check(Math.abs(clientFirst.x - serverFirst.x) < 80, `${locale}/${viewport.name}: client first-output and server first-output boundaries drifted apart`);

      const kv = await selector('node', 'kv-cache').boundingBox();
      const prefill = await selector('node', 'prefill').boundingBox();
      const decode1 = await selector('node', 'decode-1').boundingBox();
      const decode2 = await selector('node', 'decode-2').boundingBox();
      if (kv && prefill && decode1 && decode2) {
        check(kv.y > prefill.y + prefill.height, `${locale}/${viewport.name}: KV rail must remain below prefill/decode phase row`);
        check(kv.x <= prefill.x + prefill.width / 2 && kv.x + kv.width >= decode2.x + decode2.width / 2, `${locale}/${viewport.name}: KV rail must span from prefill into decode`);
      }

      const scheduler = center(await selector('node', 'scheduler').boundingBox());
      const throughput = center(await selector('node', 'throughput').boundingBox());
      const slos = center(await selector('node', 'latency-slos').boundingBox());
      if (scheduler && throughput && slos) {
        check(scheduler.y > (decode1?.y || 0), `${locale}/${viewport.name}: population/scheduler lane must remain separate below request execution`);
        check(scheduler.x < throughput.x && throughput.x < slos.x, `${locale}/${viewport.name}: scheduler pressure lane ordering drifted`);
      }

      const motion = await visual.evaluate((node) => {
        const all = [node, ...node.querySelectorAll('*')];
        return all.map((el) => {
          const style = getComputedStyle(el);
          return { animation: style.animationName, duration: style.animationDuration, transition: style.transitionDuration };
        }).filter((x) => x.animation !== 'none' && x.duration !== '0s');
      });
      check(motion.length === 0, `${locale}/${viewport.name}: visual should remain static under reduced motion ${JSON.stringify(motion.slice(0, 5))}`);

      await scroll.focus();
      check(await scroll.evaluate((node) => document.activeElement === node), `${locale}/${viewport.name}: topology scroller cannot receive keyboard focus`);

      const screenshotBase = `inference-engineering-ch1-${locale}-${viewport.name}`;
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
  console.error(`Inference engineering chapter 4.1 browser/accessibility gate failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Inference engineering chapter 4.1 browser/accessibility gate PASS: ES/EN causal timeline, client/server measurement boundaries, KV state flow, scheduler pressure, desktop/mobile topology, focus, reduced-motion and page geometry are intact.');
