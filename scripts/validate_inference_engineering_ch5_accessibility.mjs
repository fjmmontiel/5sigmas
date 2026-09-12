#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const routes = {
  es: '/series/llm-inference-engineering-economics/05-model-routing-fallback-caching-workload-aware-serving/',
  en: '/en/series/llm-inference-engineering-economics/05-model-routing-fallback-caching-workload-aware-serving/',
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

      const visual = page.locator('.s5v-routing-policy').first();
      check((await visual.count()) === 1, `${locale}/${viewport.name}: routing/fallback/cache visual missing`);
      if (!(await visual.count())) continue;

      const htmlLang = (await page.locator('html').getAttribute('lang') || '').toLowerCase();
      check(htmlLang.startsWith(locale), `${locale}/${viewport.name}: wrong html lang ${htmlLang}`);
      const scroll = visual.locator('.s5v-routing-policy__scroll');
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
      for (const name of ['decision-plane', 'execution-plane']) check((await selector('boundary', name).count()) === 1, `${locale}/${viewport.name}: missing boundary ${name}`);
      const requiredNodes = ['request', 'eligibility', 'cache-lookup', 'cache-hit', 'model-policy', 'selected-model', 'worker-placement', 'primary-attempt', 'success', 'fallback-gate', 'fallback-model', 'terminal-failure', 'telemetry', 'paired-evals', 'policy-update'];
      for (const name of requiredNodes) check((await selector('node', name).count()) === 1, `${locale}/${viewport.name}: missing node ${name}`);

      const request = center(await selector('node', 'request').boundingBox());
      const eligibility = center(await selector('node', 'eligibility').boundingBox());
      const cache = center(await selector('node', 'cache-lookup').boundingBox());
      const hit = center(await selector('node', 'cache-hit').boundingBox());
      const policy = center(await selector('node', 'model-policy').boundingBox());
      const selected = center(await selector('node', 'selected-model').boundingBox());
      if (request && eligibility && cache) check(request.x < eligibility.x && eligibility.x < cache.x, `${locale}/${viewport.name}: request → hard eligibility → cache order drifted`);
      if (cache && hit && policy) {
        check(hit.x > cache.x && policy.x > cache.x, `${locale}/${viewport.name}: cache hit/miss branches must remain downstream of lookup`);
        check(hit.y + 60 < policy.y, `${locale}/${viewport.name}: cache hit and model-policy miss path must remain visually distinct`);
      }
      if (policy && selected) check(policy.x < selected.x, `${locale}/${viewport.name}: model policy must precede selected model`);

      const placement = center(await selector('node', 'worker-placement').boundingBox());
      const attempt = center(await selector('node', 'primary-attempt').boundingBox());
      const success = center(await selector('node', 'success').boundingBox());
      const fallbackGate = center(await selector('node', 'fallback-gate').boundingBox());
      const fallback = center(await selector('node', 'fallback-model').boundingBox());
      const terminal = center(await selector('node', 'terminal-failure').boundingBox());
      if (placement && attempt) check(placement.x < attempt.x, `${locale}/${viewport.name}: worker placement must precede physical attempt`);
      if (attempt && success && fallbackGate) {
        check(success.x > attempt.x && fallbackGate.x > attempt.x, `${locale}/${viewport.name}: success/failure branches must remain downstream of attempt`);
        check(success.y + 70 < fallbackGate.y, `${locale}/${viewport.name}: success and fallback branches must remain visually distinct`);
      }
      if (fallbackGate && fallback && terminal) {
        check(fallback.x > fallbackGate.x && terminal.x > fallbackGate.x, `${locale}/${viewport.name}: allowed/blocked fallback branches must stay downstream of gate`);
        check(terminal.x > fallback.x, `${locale}/${viewport.name}: terminal failure should remain separate from compatible fallback route`);
      }

      const telemetry = center(await selector('node', 'telemetry').boundingBox());
      const paired = center(await selector('node', 'paired-evals').boundingBox());
      const update = center(await selector('node', 'policy-update').boundingBox());
      if (telemetry && paired && update) check(telemetry.x < paired.x && paired.x < update.x, `${locale}/${viewport.name}: telemetry → paired evals → policy update feedback order drifted`);
      if (update && policy) check(update.y > policy.y + 450, `${locale}/${viewport.name}: policy feedback must remain outside the online execution path`);

      const visualText = await visual.innerText();
      if (locale === 'es') {
        check(visualText.includes('Cache de respuesta ≠ prefix/KV cache'), `${locale}/${viewport.name}: response-cache/prefix-cache boundary missing`);
        check(visualText.includes('Fallback no revierte output ya emitido ni side effects externos.'), `${locale}/${viewport.name}: fallback irreversibility boundary missing`);
        check(visualText.includes('filtra antes de optimizar'), `${locale}/${viewport.name}: hard eligibility boundary missing`);
      } else {
        check(visualText.includes('Response cache ≠ prefix/KV cache'), `${locale}/${viewport.name}: response-cache/prefix-cache boundary missing`);
        check(visualText.includes('Fallback does not undo already emitted output or external side effects.'), `${locale}/${viewport.name}: fallback irreversibility boundary missing`);
        check(visualText.includes('filter before optimizing'), `${locale}/${viewport.name}: hard eligibility boundary missing`);
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

      const screenshotBase = `inference-engineering-ch5-${locale}-${viewport.name}`;
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
  console.error(`Inference engineering chapter 4.5 browser/accessibility gate failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Inference engineering chapter 4.5 browser/accessibility gate PASS: cache short-circuit, model selection, worker placement, failure fallback, evaluation feedback, desktop/mobile topology, focus, reduced motion, and page geometry are intact.');
