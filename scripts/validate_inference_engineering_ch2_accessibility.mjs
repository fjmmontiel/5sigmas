#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const routes = {
  es: '/series/llm-inference-engineering-economics/02-kv-cache-memory-hierarchy-continuous-batching-pagedattention/',
  en: '/en/series/llm-inference-engineering-economics/02-kv-cache-memory-hierarchy-continuous-batching-pagedattention/',
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

      const visual = page.locator('.s5v-kv-paging').first();
      check((await visual.count()) === 1, `${locale}/${viewport.name}: KV paging visual missing`);
      if (!(await visual.count())) continue;

      const htmlLang = (await page.locator('html').getAttribute('lang') || '').toLowerCase();
      check(htmlLang.startsWith(locale), `${locale}/${viewport.name}: wrong html lang ${htmlLang}`);
      const scroll = visual.locator('.s5v-kv-paging__scroll');
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
      const requiredBoundaries = ['logical-requests', 'allocation-manager', 'gpu-physical-pool', 'continuous-scheduler', 'host-memory-tier'];
      const requiredNodes = ['request-a', 'request-b', 'request-c-waiting', 'block-table', 'released-a', 'gpu-pool', 'free-pool', 'scheduler', 'finish-event', 'capacity-event', 'admitted-c', 'host-tier', 'gpu-hot-tier'];
      const requiredEdges = ['a-to-table', 'b-to-table', 'table-to-gpu', 'finish-to-release', 'release-to-free', 'free-to-scheduler', 'scheduler-to-c', 'c-to-table', 'gpu-to-host', 'host-to-gpu'];
      for (const name of requiredBoundaries) check((await selector('boundary', name).count()) === 1, `${locale}/${viewport.name}: missing boundary ${name}`);
      for (const name of requiredNodes) check((await selector('node', name).count()) === 1, `${locale}/${viewport.name}: missing node ${name}`);
      for (const name of requiredEdges) check((await selector('edge', name).count()) === 1, `${locale}/${viewport.name}: missing edge ${name}`);

      const requestA = center(await selector('node', 'request-a').boundingBox());
      const blockTable = center(await selector('node', 'block-table').boundingBox());
      const gpuPool = center(await selector('node', 'gpu-pool').boundingBox());
      if (requestA && blockTable && gpuPool) {
        check(requestA.x < blockTable.x && blockTable.x < gpuPool.x, `${locale}/${viewport.name}: logical → table → physical mapping is not left-to-right`);
      }

      const requestB = center(await selector('node', 'request-b').boundingBox());
      const requestC = center(await selector('node', 'request-c-waiting').boundingBox());
      if (requestA && requestB && requestC) check(requestA.y < requestB.y && requestB.y < requestC.y, `${locale}/${viewport.name}: request logical-space ordering drifted`);

      const released = center(await selector('node', 'released-a').boundingBox());
      const freePool = center(await selector('node', 'free-pool').boundingBox());
      if (released && freePool) check(released.x < freePool.x && Math.abs(released.y - freePool.y) < 80, `${locale}/${viewport.name}: release → recovered-capacity relationship drifted`);

      const scheduler = center(await selector('node', 'scheduler').boundingBox());
      const finish = center(await selector('node', 'finish-event').boundingBox());
      const capacity = center(await selector('node', 'capacity-event').boundingBox());
      const admittedC = center(await selector('node', 'admitted-c').boundingBox());
      if (scheduler && finish && capacity && admittedC) {
        check(scheduler.x < finish.x && finish.x < capacity.x && capacity.x < admittedC.x, `${locale}/${viewport.name}: continuous-batching lifecycle is not scheduler → finish → capacity → admit`);
        check(scheduler.y > (gpuPool?.y || 0), `${locale}/${viewport.name}: scheduler lifecycle must remain separate below allocation/pool mapping`);
      }

      const hostTier = center(await selector('node', 'host-tier').boundingBox());
      const gpuHotTier = center(await selector('node', 'gpu-hot-tier').boundingBox());
      if (hostTier && gpuHotTier && scheduler) {
        check(hostTier.y > scheduler.y && gpuHotTier.y > scheduler.y, `${locale}/${viewport.name}: memory tiering must remain visually below scheduling lifecycle`);
        check(hostTier.x < gpuHotTier.x, `${locale}/${viewport.name}: host → GPU tier ordering drifted`);
      }

      for (const pageName of ['page-p0', 'page-p2', 'page-p4', 'page-p7', 'page-p8', 'page-p9', 'page-p10', 'page-p11']) {
        check((await selector('node', pageName).count()) === 1, `${locale}/${viewport.name}: physical page ${pageName} missing`);
      }

      const visualText = await visual.innerText();
      if (locale === 'es') {
        check(visualText.includes('Paging decide dónde vive el KV') && visualText.includes('continuous batching decide quién está activo'), `${locale}/${viewport.name}: allocation/scheduling distinction missing`);
        check(visualText.includes('A termina → release') && visualText.includes('Admitir C'), `${locale}/${viewport.name}: reclamation/admission lifecycle labels missing`);
        check(visualText.includes('no elimina el coste de transferir estado'), `${locale}/${viewport.name}: offload trade-off missing`);
      } else {
        check(visualText.includes('Paging decides where KV state lives') && visualText.includes('continuous batching decides which requests are active'), `${locale}/${viewport.name}: allocation/scheduling distinction missing`);
        check(visualText.includes('A finishes → release') && visualText.includes('Admit C'), `${locale}/${viewport.name}: reclamation/admission lifecycle labels missing`);
        check(visualText.includes('does not remove the cost of moving state'), `${locale}/${viewport.name}: offload trade-off missing`);
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

      const screenshotBase = `inference-engineering-ch2-${locale}-${viewport.name}`;
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
  console.error(`Inference engineering chapter 4.2 browser/accessibility gate failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Inference engineering chapter 4.2 browser/accessibility gate PASS: ES/EN logical-to-physical mapping, release/reuse/admission lifecycle, memory-tier boundary, desktop/mobile topology, focus, reduced-motion and page geometry are intact.');
