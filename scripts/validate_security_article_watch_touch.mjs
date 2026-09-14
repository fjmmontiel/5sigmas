#!/usr/bin/env node
/**
 * Fail closed on real touch navigation for the Security 00/1.1 article↔watch contract.
 *
 * Static URL/render fixtures and desktop keyboard traversal are not evidence that
 * the published mobile controls are actually tappable. This gate exercises the
 * built ES/EN pages with a real Playwright touch context under normal and reduced
 * motion, keeps runtime/resource listeners alive across both navigations, and
 * verifies article → watch → article as an actual round trip.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const evidenceRoot = path.resolve('artifacts/security-requalification');
const out = path.join(evidenceRoot, 'article-watch-touch');
await fs.mkdir(out, { recursive: true });

const routes = [
  {
    locale: 'es',
    kind: 'presentation',
    article: '/series/seguridad-ia/00_presentacion_serie/',
    watch: '/videos/series/seguridad-ia/00_presentacion_serie/',
  },
  {
    locale: 'en',
    kind: 'presentation',
    article: '/en/series/seguridad-ia/00_presentacion_serie/',
    watch: '/en/videos/series/seguridad-ia/00_presentacion_serie/',
  },
  {
    locale: 'es',
    kind: 'prompt',
    article: '/series/seguridad-ia/01-prompt-injection/',
    watch: '/videos/series/seguridad-ia/01-prompt-injection/',
  },
  {
    locale: 'en',
    kind: 'prompt',
    article: '/en/series/seguridad-ia/01-prompt-injection/',
    watch: '/en/videos/series/seguridad-ia/01-prompt-injection/',
  },
];
const motions = ['no-preference', 'reduce'];
const failures = [];
const evidence = [];
const fail = (message, detail = null) => failures.push({ message, detail });

async function launchBrowser() {
  try {
    return { browser: await chromium.launch({ channel: 'chrome', headless: true }), engine: 'google-chrome' };
  } catch (chromeError) {
    return {
      browser: await chromium.launch({ headless: true }),
      engine: 'playwright-chromium',
      chromeError: String(chromeError),
    };
  }
}

function attachRuntimeListeners(page, runtime) {
  page.on('pageerror', error => runtime.push({ type: 'pageerror', detail: String(error) }));
  page.on('console', message => {
    if (message.type() === 'error') runtime.push({ type: 'console', detail: message.text() });
  });
  page.on('requestfailed', request => {
    const detail = request.failure()?.errorText || '';
    if (!detail.includes('ERR_ABORTED')) runtime.push({ type: 'requestfailed', url: request.url(), detail });
  });
  page.on('response', response => {
    if (response.status() >= 400) runtime.push({ type: 'http', status: response.status(), url: response.url() });
  });
}

async function assertViewportBound(locator, width, ctx, label) {
  if (!(await locator.isVisible())) {
    fail(`${ctx}: ${label} is not visible`);
    return null;
  }
  const box = await locator.boundingBox();
  if (!box) {
    fail(`${ctx}: ${label} has no tappable geometry`);
    return null;
  }
  if (box.x < -1 || box.x + box.width > width + 1 || box.width < 1 || box.height < 1) {
    fail(`${ctx}: ${label} clips or has invalid tap geometry`, { box, width });
  }
  return box;
}

const launched = await launchBrowser();
const browser = launched.browser;
try {
  for (const item of routes) {
    for (const motion of motions) {
      const ctx = `${item.locale}/${item.kind}/mobile/${motion}`;
      const runtime = [];
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        reducedMotion: motion,
      });
      const page = await context.newPage();
      attachRuntimeListeners(page, runtime);
      const record = {
        ...item,
        motion,
        width: 390,
        engine: launched.engine,
        chrome_launch_error: launched.chromeError || null,
      };

      const articleResponse = await page.goto(new URL(item.article, base).href, {
        waitUntil: 'domcontentloaded',
        timeout: 20_000,
      });
      if (!articleResponse?.ok()) fail(`${ctx}: article HTTP failed`, { status: articleResponse?.status() });
      await page.evaluate(async () => {
        await Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 1500))]);
      });

      const articleLang = await page.locator('html').getAttribute('lang');
      if (!String(articleLang || '').toLowerCase().startsWith(item.locale)) {
        fail(`${ctx}: article locale mismatch`, { articleLang });
      }

      const watchLink = page.locator('article .s5-video-embed__watch a').first();
      if ((await watchLink.count()) !== 1) {
        fail(`${ctx}: article→watch link missing`);
      } else {
        await watchLink.scrollIntoViewIfNeeded();
        record.article_watch_box = await assertViewportBound(watchLink, 390, ctx, 'article→watch link');
        const href = await watchLink.getAttribute('href');
        const hrefPath = href ? new URL(href, page.url()).pathname : null;
        record.article_watch_href = href;
        if (hrefPath !== item.watch) {
          fail(`${ctx}: article→watch target drifted`, { expected: item.watch, actual: hrefPath });
        } else {
          await watchLink.tap({ timeout: 5000 });
          await page.waitForURL(url => url.pathname === item.watch, { timeout: 8000 });
        }
      }

      if (new URL(page.url()).pathname === item.watch) {
        const watchLang = await page.locator('html').getAttribute('lang');
        if (!String(watchLang || '').toLowerCase().startsWith(item.locale)) {
          fail(`${ctx}: watch locale mismatch`, { watchLang });
        }
        const watchPlayer = page.locator('[data-s5-watch-player]').first();
        if ((await watchPlayer.count()) !== 1 || !(await watchPlayer.isVisible())) {
          fail(`${ctx}: prominent watch player missing/not visible after touch navigation`);
        }

        const sourceLink = page.locator('.s5-video-watch__source-link').first();
        if ((await sourceLink.count()) !== 1) {
          fail(`${ctx}: watch→article source link missing`);
        } else {
          await sourceLink.scrollIntoViewIfNeeded();
          record.watch_article_box = await assertViewportBound(sourceLink, 390, ctx, 'watch→article link');
          const href = await sourceLink.getAttribute('href');
          const hrefPath = href ? new URL(href, page.url()).pathname : null;
          record.watch_article_href = href;
          if (hrefPath !== item.article) {
            fail(`${ctx}: watch→article target drifted`, { expected: item.article, actual: hrefPath });
          } else {
            await sourceLink.tap({ timeout: 5000 });
            await page.waitForURL(url => url.pathname === item.article, { timeout: 8000 });
          }
        }
      }

      record.final_path = new URL(page.url()).pathname;
      if (record.final_path !== item.article) {
        fail(`${ctx}: touch round trip did not return to article`, { expected: item.article, actual: record.final_path });
      }
      const geometry = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      if (geometry.scrollWidth > geometry.clientWidth + 1) {
        fail(`${ctx}: page overflow after touch round trip`, geometry);
      }
      if (runtime.length) fail(`${ctx}: persistent runtime/resource errors across touch round trip`, runtime);
      record.runtime = runtime;
      record.geometry = geometry;
      evidence.push(record);
      await context.close();
    }
  }
} finally {
  await browser.close();
}

const report = JSON.stringify({
  engine: launched.engine,
  chrome_launch_error: launched.chromeError || null,
  failures,
  evidence,
}, null, 2);
await fs.writeFile(path.join(out, 'report.json'), report);
// Keep a second flat copy in the retained evidence root. The first exact-head
// run proved the step but the nested report did not survive into the uploaded
// diagnostic artifact; duplicating the small JSON summary makes evidence loss
// deterministic to detect without moving or duplicating screenshots/media.
await fs.writeFile(path.join(evidenceRoot, 'article-watch-touch-report.json'), report);

if (failures.length) {
  console.error(`Security article↔watch touch gate FAILED (${failures.length}) using ${launched.engine}`);
  for (const item of failures) console.error(`- ${item.message}${item.detail ? ` :: ${JSON.stringify(item.detail)}` : ''}`);
  process.exit(1);
}
console.log(`Security article↔watch touch PASS using ${launched.engine}: ES/EN Security 00/1.1 × normal/reduced motion completed a real mobile tap round trip.`);
