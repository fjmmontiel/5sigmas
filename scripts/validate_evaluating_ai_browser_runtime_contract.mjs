#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const chapters = [
  {
    id: 'ch1',
    visual: '.s5v-eval-boundary',
    scroller: '.s5v-eval-boundary__scroll',
    routes: {
      es: '/series/evaluating-ai-systems-production/01-que-evaluar-modelo-componente-sistema-workflow-trayectoria/',
      en: '/en/series/evaluating-ai-systems-production/01-que-evaluar-modelo-componente-sistema-workflow-trayectoria/',
    },
  },
  {
    id: 'ch2',
    visual: '.s5v-eval-dataset',
    scroller: '.s5v-eval-dataset__scroll',
    routes: {
      es: '/series/evaluating-ai-systems-production/02-offline-eval-sets-curation-hard-negatives-contamination-versioning/',
      en: '/en/series/evaluating-ai-systems-production/02-offline-eval-sets-curation-hard-negatives-contamination-versioning/',
    },
  },
  {
    id: 'ch3',
    visual: '.s5v-judge-calibration',
    scroller: '.jc-scroll',
    routes: {
      es: '/series/evaluating-ai-systems-production/03-llm-as-judge-evaluacion-humana-calibracion-sesgo-varianza-acuerdo/',
      en: '/en/series/evaluating-ai-systems-production/03-llm-as-judge-evaluacion-humana-calibracion-sesgo-varianza-acuerdo/',
    },
  },
  {
    id: 'ch4',
    visual: '.s5v-agent-trajectory',
    scroller: '.at-scroll',
    routes: {
      es: '/series/evaluating-ai-systems-production/04-evaluacion-trayectorias-agentes-tools-exito-eficiencia-recuperacion-policy/',
      en: '/en/series/evaluating-ai-systems-production/04-evaluacion-trayectorias-agentes-tools-exito-eficiencia-recuperacion-policy/',
    },
  },
  {
    id: 'ch5',
    visual: '.s5v-online-eval',
    scroller: '.oe-scroll',
    routes: {
      es: '/series/evaluating-ai-systems-production/05-online-evaluation-shadow-canary-ab-guardrails-regression-gates/',
      en: '/en/series/evaluating-ai-systems-production/05-online-evaluation-shadow-canary-ab-guardrails-regression-gates/',
    },
  },
  {
    id: 'ch6',
    visual: '.s5v-eval-feedback',
    scroller: '.fb-scroll',
    routes: {
      es: '/series/evaluating-ai-systems-production/06-observability-failure-taxonomies-production-eval-repair-feedback-loops/',
      en: '/en/series/evaluating-ai-systems-production/06-observability-failure-taxonomies-production-eval-repair-feedback-loops/',
    },
  },
];

const viewports = [
  { name: 'desktop', width: 1440, height: 1000, hasTouch: false },
  { name: 'mobile', width: 390, height: 844, hasTouch: true },
];
const motions = [
  { name: 'normal', reducedMotion: 'no-preference', mediaMatches: false },
  { name: 'reduced', reducedMotion: 'reduce', mediaMatches: true },
];

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

async function performRealTouchDrag(context, page, scroller, label) {
  const metricsBefore = await scroller.evaluate((node) => ({
    scrollLeft: node.scrollLeft,
    scrollWidth: node.scrollWidth,
    clientWidth: node.clientWidth,
  }));
  if (metricsBefore.scrollWidth <= metricsBefore.clientWidth + 8) return { required: false, moved: true };

  const box = await scroller.boundingBox();
  if (!box || box.width < 80 || box.height < 40) {
    check(false, `${label}: overflowing scroller has no usable touch target`);
    return { required: true, moved: false };
  }

  await scroller.scrollIntoViewIfNeeded();
  const session = await context.newCDPSession(page);
  try {
    const startX = box.x + Math.min(box.width - 24, Math.max(56, box.width * 0.78));
    const endX = box.x + Math.max(24, Math.min(box.width - 56, box.width * 0.22));
    const y = box.y + Math.min(box.height - 28, Math.max(28, box.height * 0.5));
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: startX, y, radiusX: 4, radiusY: 4, force: 1 }],
    });
    for (let step = 1; step <= 7; step += 1) {
      const x = startX + ((endX - startX) * step) / 7;
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x, y, radiusX: 4, radiusY: 4, force: 1 }],
      });
      await page.waitForTimeout(20);
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(180);
  } finally {
    await session.detach();
  }

  const after = await scroller.evaluate((node) => node.scrollLeft);
  return { required: true, moved: after > metricsBefore.scrollLeft + 4 };
}

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) {
    for (const motion of motions) {
      for (const chapter of chapters) {
        for (const [locale, route] of Object.entries(chapter.routes)) {
          const label = `${chapter.id}/${locale}/${viewport.name}/${motion.name}`;
          const context = await browser.newContext({
            viewport: { width: viewport.width, height: viewport.height },
            hasTouch: viewport.hasTouch,
            isMobile: viewport.hasTouch,
            reducedMotion: motion.reducedMotion,
          });
          const page = await context.newPage();
          const badResources = [];
          const runtimeErrors = [];
          const consoleErrors = [];
          const responseListener = (response) => {
            try {
              const url = new URL(response.url());
              const origin = new URL(base).origin;
              if (url.origin === origin && response.status() >= 400 && !/favicon/i.test(url.pathname)) {
                badResources.push(`${response.status()} ${url.pathname}`);
              }
            } catch {}
          };
          const pageErrorListener = (error) => runtimeErrors.push(String(error));
          const consoleListener = (message) => {
            if (message.type() === 'error') consoleErrors.push(message.text());
          };
          page.on('response', responseListener);
          page.on('pageerror', pageErrorListener);
          page.on('console', consoleListener);

          try {
            const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
            check(response?.ok(), `${label}: HTTP ${response?.status() ?? 'no response'}`);

            const htmlLang = (await page.locator('html').getAttribute('lang') || '').toLowerCase();
            check(htmlLang.startsWith(locale), `${label}: wrong html lang ${htmlLang}`);

            const motionMatches = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
            check(motionMatches === motion.mediaMatches, `${label}: browser motion preference mismatch (${motionMatches})`);

            const visual = page.locator(chapter.visual).first();
            check((await visual.count()) === 1, `${label}: visual missing (${chapter.visual})`);
            if (await visual.count()) {
              await visual.scrollIntoViewIfNeeded();
              const visible = await visual.isVisible();
              check(visible, `${label}: visual is not visible`);

              const scroller = visual.locator(chapter.scroller).first();
              check((await scroller.count()) === 1, `${label}: relationship scroller missing (${chapter.scroller})`);
              if (await scroller.count()) {
                check((await scroller.getAttribute('tabindex')) === '0', `${label}: relationship scroller is not keyboard-focusable`);
                check((await scroller.getAttribute('role')) === 'region', `${label}: relationship scroller must expose role=region`);
                const aria = await scroller.getAttribute('aria-label');
                check(Boolean(aria && aria.trim().length >= 20), `${label}: relationship scroller lacks a meaningful aria-label`);

                await scroller.focus();
                check(await scroller.evaluate((node) => document.activeElement === node), `${label}: relationship scroller cannot receive keyboard focus`);

                if (viewport.hasTouch) {
                  const touch = await performRealTouchDrag(context, page, scroller, label);
                  if (touch.required) check(touch.moved, `${label}: overflowing relationship view did not respond to real CDP touch drag`);
                }
              }

              const pageOverflow = await page.evaluate(() => ({
                scrollWidth: document.documentElement.scrollWidth,
                clientWidth: document.documentElement.clientWidth,
              }));
              check(pageOverflow.scrollWidth <= pageOverflow.clientWidth + 1, `${label}: page-level horizontal overflow ${JSON.stringify(pageOverflow)}`);

              await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
              await page.waitForTimeout(220);
              await page.evaluate(() => window.scrollTo(0, 0));
              await page.waitForTimeout(100);

              const screenshotBase = `ai-systems-eval-runtime-${chapter.id}-${locale}-${viewport.name}-${motion.name}`;
              await page.screenshot({
                path: path.join(outDir, `${screenshotBase}-page.png`),
                fullPage: true,
                animations: motion.name === 'reduced' ? 'disabled' : 'allow',
              });
              await visual.screenshot({
                path: path.join(outDir, `${screenshotBase}-visual.png`),
                animations: motion.name === 'reduced' ? 'disabled' : 'allow',
              });
            }

            // Keep runtime/resource listeners attached through lazy-load, interaction and the final pre-teardown settle.
            await page.waitForTimeout(150);
          } finally {
            // Page teardown is part of the observed lifecycle. The arrays remain inspectable after close.
            await page.close({ runBeforeUnload: true }).catch((error) => runtimeErrors.push(`teardown:${String(error)}`));
            await new Promise((resolve) => setTimeout(resolve, 30));
            check(badResources.length === 0, `${label}: broken same-origin resources ${JSON.stringify(badResources)}`);
            check(runtimeErrors.length === 0, `${label}: runtime/page errors through teardown ${JSON.stringify(runtimeErrors)}`);
            check(consoleErrors.length === 0, `${label}: console errors through teardown ${JSON.stringify(consoleErrors.slice(0, 8))}`);
            await context.close();
          }
        }
      }
    }
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`Evaluating AI Systems owner browser runtime contract failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Evaluating AI Systems owner browser runtime contract PASS: 6 chapters × ES/EN × desktop/mobile × normal/reduced, persistent resource/runtime listeners through teardown, keyboard focus, real touch drag for overflowing relationship views, and page-level overflow checks.');
