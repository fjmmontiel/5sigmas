#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const routes = {
  es: '/series/llm-inference-engineering-economics/03-quantization-parallelism-memory-quality-tradeoffs/',
  en: '/en/series/llm-inference-engineering-economics/03-quantization-parallelism-memory-quality-tradeoffs/',
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

      const visual = page.locator('.s5v-quant-parallel').first();
      check((await visual.count()) === 1, `${locale}/${viewport.name}: quantization/parallelism visual missing`);
      if (!(await visual.count())) continue;

      const htmlLang = (await page.locator('html').getAttribute('lang') || '').toLowerCase();
      check(htmlLang.startsWith(locale), `${locale}/${viewport.name}: wrong html lang ${htmlLang}`);
      const scroll = visual.locator('.s5v-quant-parallel__scroll');
      check((await scroll.getAttribute('tabindex')) === '0', `${locale}/${viewport.name}: topology scroller must be keyboard focusable`);
      check((await scroll.getAttribute('role')) === 'region', `${locale}/${viewport.name}: topology scroller must expose region role`);
      const aria = await scroll.getAttribute('aria-label');
      check(Boolean(aria && aria.length > 20), `${locale}/${viewport.name}: topology scroller lacks meaningful aria-label`);

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
      for (const name of ['quantization', 'parallelism']) check((await selector('boundary', name).count()) === 1, `${locale}/${viewport.name}: missing boundary ${name}`);
      const requiredNodes = ['weights', 'activations', 'kv', 'quantizer', 'kernel', 'memory-performance', 'quality', 'dp', 'tp', 'pp', 'ep', 'cp', 'topology'];
      for (const name of requiredNodes) check((await selector('node', name).count()) === 1, `${locale}/${viewport.name}: missing node ${name}`);

      const weights = center(await selector('node', 'weights').boundingBox());
      const activations = center(await selector('node', 'activations').boundingBox());
      const kv = center(await selector('node', 'kv').boundingBox());
      const quantizer = center(await selector('node', 'quantizer').boundingBox());
      const kernel = center(await selector('node', 'kernel').boundingBox());
      const system = center(await selector('node', 'memory-performance').boundingBox());
      const quality = center(await selector('node', 'quality').boundingBox());
      if (weights && activations && kv) {
        check(Math.abs(weights.x - activations.x) < 30 && Math.abs(weights.x - kv.x) < 30, `${locale}/${viewport.name}: weights/activations/KV must remain separate aligned quantization inputs`);
        check(weights.y < activations.y && activations.y < kv.y, `${locale}/${viewport.name}: tensor-scope lanes drifted`);
      }
      if (weights && quantizer && kernel && system) check(weights.x < quantizer.x && quantizer.x < kernel.x && kernel.x < system.x, `${locale}/${viewport.name}: representation → quantizer → kernel → system path is not left-to-right`);
      if (quality && system && quantizer) {
        check(quality.x > quantizer.x, `${locale}/${viewport.name}: quality evaluation must remain downstream of quantization scope`);
        check(quality.y > system.y + 80, `${locale}/${viewport.name}: quality must remain a separate outcome from performance/footprint`);
      }

      const dp = center(await selector('node', 'dp').boundingBox());
      const tp = center(await selector('node', 'tp').boundingBox());
      const pp = center(await selector('node', 'pp').boundingBox());
      const ep = center(await selector('node', 'ep').boundingBox());
      const cp = center(await selector('node', 'cp').boundingBox());
      const topology = center(await selector('node', 'topology').boundingBox());
      if (dp && tp && pp && ep && cp) {
        check(dp.x < tp.x && tp.x < pp.x && pp.x < ep.x && ep.x < cp.x, `${locale}/${viewport.name}: DP/TP/PP/EP/CP topology ordering drifted`);
        check(Math.max(dp.y, tp.y, pp.y, ep.y, cp.y) - Math.min(dp.y, tp.y, pp.y, ep.y, cp.y) < 45, `${locale}/${viewport.name}: parallel strategies must remain comparable on one placement lane`);
      }
      if (topology && tp && pp && ep && cp) check(topology.y > Math.max(tp.y, pp.y, ep.y, cp.y) + 100, `${locale}/${viewport.name}: interconnect/runtime outcome boundary must remain below rank-placement strategies`);

      const visualText = await visual.innerText();
      if (locale === 'es') {
        check(visualText.includes('menos bytes ≠ menos latencia'), `${locale}/${viewport.name}: kernel-support caveat missing`);
        check(visualText.includes('collective dentro de capas'), `${locale}/${viewport.name}: TP collective relation missing`);
        check(visualText.includes('dispatch / all-to-all / desbalance'), `${locale}/${viewport.name}: EP communication relation missing`);
        check(visualText.includes('la atención necesita estado remoto'), `${locale}/${viewport.name}: CP remote-state relation missing`);
        check(visualText.includes('Interconexión + runtime + carga deciden el resultado'), `${locale}/${viewport.name}: topology outcome boundary missing`);
      } else {
        check(visualText.includes('fewer bytes ≠ lower latency'), `${locale}/${viewport.name}: kernel-support caveat missing`);
        check(visualText.includes('collective inside layers'), `${locale}/${viewport.name}: TP collective relation missing`);
        check(visualText.includes('dispatch / all-to-all / imbalance'), `${locale}/${viewport.name}: EP communication relation missing`);
        check(visualText.includes('attention needs remote state'), `${locale}/${viewport.name}: CP remote-state relation missing`);
        check(visualText.includes('Interconnect + runtime + workload determine the outcome'), `${locale}/${viewport.name}: topology outcome boundary missing`);
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

      const screenshotBase = `inference-engineering-ch3-${locale}-${viewport.name}`;
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
  console.error(`Inference engineering chapter 4.3 browser/accessibility gate failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Inference engineering chapter 4.3 browser/accessibility gate PASS: ES/EN quantization scope, kernel/quality separation, DP/TP/PP/EP/CP placement, interconnect boundary, desktop/mobile topology, focus, reduced motion and page geometry are intact.');
