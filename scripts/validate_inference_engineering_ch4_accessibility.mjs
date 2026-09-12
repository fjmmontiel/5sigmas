#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const routes = {
  es: '/series/llm-inference-engineering-economics/04-speculative-decoding-prefix-caching-latency-optimisations/',
  en: '/en/series/llm-inference-engineering-economics/04-speculative-decoding-prefix-caching-latency-optimisations/',
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

      const visual = page.locator('.s5v-reuse-spec').first();
      check((await visual.count()) === 1, `${locale}/${viewport.name}: reuse/speculation visual missing`);
      if (!(await visual.count())) continue;

      const htmlLang = (await page.locator('html').getAttribute('lang') || '').toLowerCase();
      check(htmlLang.startsWith(locale), `${locale}/${viewport.name}: wrong html lang ${htmlLang}`);
      const scroll = visual.locator('.s5v-reuse-spec__scroll');
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
      for (const name of ['reuse', 'speculation']) check((await selector('boundary', name).count()) === 1, `${locale}/${viewport.name}: missing boundary ${name}`);
      const requiredNodes = ['prefix', 'identity', 'lookup', 'hit', 'miss', 'remaining-prefill', 'retention', 'target-state', 'proposer', 'verify', 'accept', 'reject', 'commit', 'pressure'];
      for (const name of requiredNodes) check((await selector('node', name).count()) === 1, `${locale}/${viewport.name}: missing node ${name}`);

      const prefix = center(await selector('node', 'prefix').boundingBox());
      const identity = center(await selector('node', 'identity').boundingBox());
      const lookup = center(await selector('node', 'lookup').boundingBox());
      const hit = center(await selector('node', 'hit').boundingBox());
      const miss = center(await selector('node', 'miss').boundingBox());
      const remaining = center(await selector('node', 'remaining-prefill').boundingBox());
      const retention = center(await selector('node', 'retention').boundingBox());
      if (prefix && identity && lookup && remaining) {
        check(prefix.x < identity.x && identity.x < lookup.x && lookup.x < remaining.x, `${locale}/${viewport.name}: prefix → identity → lookup → remaining-prefill path drifted`);
      }
      if (lookup && hit && miss) {
        check(hit.x > lookup.x && miss.x > lookup.x, `${locale}/${viewport.name}: hit/miss must branch downstream of lookup`);
        check(hit.y + 60 < miss.y, `${locale}/${viewport.name}: hit/miss branches must remain visually distinct`);
      }
      if (hit && miss && remaining) {
        check(remaining.x > hit.x && remaining.x > miss.x, `${locale}/${viewport.name}: hit and miss must rejoin before remaining prefill`);
      }
      if (retention && lookup) check(retention.y > lookup.y + 120, `${locale}/${viewport.name}: retention/eviction feedback must remain separate from lookup execution path`);

      const target = center(await selector('node', 'target-state').boundingBox());
      const proposer = center(await selector('node', 'proposer').boundingBox());
      const verify = center(await selector('node', 'verify').boundingBox());
      const accept = center(await selector('node', 'accept').boundingBox());
      const reject = center(await selector('node', 'reject').boundingBox());
      const commit = center(await selector('node', 'commit').boundingBox());
      const pressure = center(await selector('node', 'pressure').boundingBox());
      if (target && proposer && verify && commit) {
        check(target.x < proposer.x && proposer.x < verify.x && verify.x < commit.x, `${locale}/${viewport.name}: target → proposer → verify → commit path drifted`);
      }
      if (verify && accept && reject) {
        check(accept.x > verify.x && reject.x > verify.x, `${locale}/${viewport.name}: accept/reject must branch downstream of verification`);
        check(accept.y + 70 < reject.y, `${locale}/${viewport.name}: accept/reject branches must remain visually distinct`);
      }
      if (accept && reject && commit) check(commit.x > accept.x && commit.x > reject.x, `${locale}/${viewport.name}: accept/reject branches must rejoin only at committed state`);
      if (pressure && proposer && reject) check(pressure.y > Math.max(proposer.y, reject.y) + 140, `${locale}/${viewport.name}: shared resource-pressure boundary must remain outside speculative execution path`);

      const visualText = await visual.innerText();
      if (locale === 'es') {
        check(visualText.includes('Un hit reduce trabajo de prefill; no implica menor TPOT.'), `${locale}/${viewport.name}: cache/TPOT boundary missing`);
        check(visualText.includes('Hit rate ≠ reducción proporcional de TTFT.'), `${locale}/${viewport.name}: hit-rate/TTFT boundary missing`);
        check(visualText.includes('sólo secuencia aceptada'), `${locale}/${viewport.name}: commit boundary missing`);
        check(visualText.includes('KV capacity + scheduler + batching = frontera compartida'), `${locale}/${viewport.name}: shared pressure boundary missing`);
      } else {
        check(visualText.includes('A hit reduces prefill work; it does not imply lower TPOT.'), `${locale}/${viewport.name}: cache/TPOT boundary missing`);
        check(visualText.includes('Hit rate ≠ proportional TTFT reduction.'), `${locale}/${viewport.name}: hit-rate/TTFT boundary missing`);
        check(visualText.includes('accepted sequence only'), `${locale}/${viewport.name}: commit boundary missing`);
        check(visualText.includes('KV capacity + scheduler + batching = shared boundary'), `${locale}/${viewport.name}: shared pressure boundary missing`);
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

      const screenshotBase = `inference-engineering-ch4-${locale}-${viewport.name}`;
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
  console.error(`Inference engineering chapter 4.4 browser/accessibility gate failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Inference engineering chapter 4.4 browser/accessibility gate PASS: ES/EN cache hit/miss, speculative accept/reject, commit boundary, shared KV/scheduler pressure, desktop/mobile topology, focus, reduced motion, and page geometry are intact.');
