#!/usr/bin/env node
/**
 * Fail closed on real touch navigation for the Security 00/1.1 article↔watch contract.
 *
 * Static URL/render fixtures and desktop keyboard traversal are not evidence that
 * the published mobile controls are actually tappable. This gate exercises the
 * built ES/EN pages with a real Playwright touch context under normal and reduced
 * motion, keeps runtime/resource listeners alive across both navigations, and
 * verifies article → watch → article as an actual round trip.
 *
 * The rendered internal links intentionally use the public canonical origin
 * (https://5sigmas.com). During branch QA, requests to that canonical origin are
 * intercepted and fulfilled from the exact local preview bytes while the browser
 * keeps the canonical URL. The initial article is also opened at the canonical
 * origin through that proxy so internal links remain same-origin exactly as they
 * are in production rather than being misclassified as external from localhost.
 *
 * Runtime/resource listeners remain active until browser-context teardown. This
 * gate does not exercise an explicit media seek/cancellation lifecycle, so an
 * ERR_ABORTED before teardown is always fatal. Only a request cancellation emitted
 * while context.close() is actually tearing the context down may be classified as
 * expected. The final verdict is computed from the same retained arrays after the
 * context has closed.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const canonicalOrigin = 'https://5sigmas.com';
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

function classifyRuntimeEvents(events) {
  const fatal = [];
  const expected = [];
  for (const event of events) {
    const isAbort = event.type === 'requestfailed' && String(event.detail || '').includes('ERR_ABORTED');
    if (isAbort && event.phase === 'teardown') {
      expected.push({ ...event, classification: 'EXPECTED_CONTEXT_TEARDOWN_ABORT' });
      continue;
    }
    fatal.push(event);
  }
  return { fatal, expected };
}

function runSelfTest() {
  const abort = {
    type: 'requestfailed',
    seq: 1,
    requestId: 'req-1',
    resourceType: 'media',
    url: 'https://example.invalid/video.mp4',
    detail: 'net::ERR_ABORTED',
  };
  const teardown = classifyRuntimeEvents([{ ...abort, phase: 'teardown' }]);
  if (teardown.fatal.length || teardown.expected.length !== 1) {
    throw new Error('context-teardown ERR_ABORTED fixture was rejected');
  }
  const mutations = [
    { name: 'article navigation abort', event: { ...abort, phase: 'article-navigation' } },
    { name: 'article-to-watch abort', event: { ...abort, phase: 'article-to-watch' } },
    { name: 'watch-to-article abort', event: { ...abort, phase: 'watch-to-article' } },
    { name: 'return-settle abort', event: { ...abort, phase: 'return-settle' } },
    { name: 'non-abort request failure', event: { ...abort, phase: 'teardown', detail: 'net::ERR_FAILED' } },
    { name: 'late pageerror', event: { type: 'pageerror', seq: 2, phase: 'teardown', detail: 'boom' } },
    { name: 'late console error', event: { type: 'console', seq: 3, phase: 'teardown', detail: 'boom' } },
    { name: 'late HTTP error', event: { type: 'http', seq: 4, phase: 'teardown', status: 500, url: 'https://example.invalid/fail' } },
  ];
  for (const mutation of mutations) {
    if (classifyRuntimeEvents([mutation.event]).fatal.length !== 1) {
      throw new Error(`${mutation.name} mutation escaped fail-closed runtime classification`);
    }
  }
  console.log('Security article↔watch touch self-test PASS: only context-teardown ERR_ABORTED is tolerated; navigation/interaction and late non-abort failures remain fatal.');
}

if (process.argv.includes('--self-test')) {
  runSelfTest();
  process.exit(0);
}

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

async function proxyCanonicalSiteToPreview(context, proxyEvidence, proxyErrors) {
  await context.route(`${canonicalOrigin}/**`, async route => {
    const requestUrl = new URL(route.request().url());
    const previewUrl = new URL(`${requestUrl.pathname}${requestUrl.search}`, base).href;
    try {
      const response = await route.fetch({ url: previewUrl });
      proxyEvidence.push({
        canonical_url: requestUrl.href,
        preview_url: previewUrl,
        status: response.status(),
      });
      await route.fulfill({ response });
    } catch (error) {
      proxyErrors.push({
        canonical_url: requestUrl.href,
        preview_url: previewUrl,
        name: error?.name || 'Error',
        message: String(error?.message || error),
      });
      try {
        await route.abort('failed');
      } catch {
        // Context teardown can make abort itself impossible. The original proxy
        // error is retained and judged after context close.
      }
    }
  });
}

function attachRuntimeListeners(page, runtime, trace) {
  let nextRequestId = 1;
  const requestIds = new WeakMap();
  const requestId = request => {
    if (!requestIds.has(request)) requestIds.set(request, `req-${nextRequestId++}`);
    return requestIds.get(request);
  };
  const push = event => runtime.push({ seq: ++trace.seq, phase: trace.phase, ...event });

  page.on('pageerror', error => push({ type: 'pageerror', detail: String(error) }));
  page.on('console', message => {
    if (message.type() === 'error') push({ type: 'console', detail: message.text() });
  });
  page.on('requestfailed', request => push({
    type: 'requestfailed',
    requestId: requestId(request),
    resourceType: request.resourceType(),
    url: request.url(),
    detail: request.failure()?.errorText || '',
  }));
  page.on('response', response => {
    if (response.status() >= 400) {
      const request = response.request();
      push({
        type: 'http',
        requestId: requestId(request),
        resourceType: request.resourceType(),
        status: response.status(),
        url: response.url(),
      });
    }
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

async function tapAndWaitPath(page, locator, expectedPath, ctx, label) {
  try {
    await Promise.all([
      page.waitForURL(url => url.pathname === expectedPath, {
        timeout: 12_000,
        waitUntil: 'domcontentloaded',
      }),
      locator.tap({ timeout: 5_000 }),
    ]);
    return true;
  } catch (error) {
    fail(`${ctx}: ${label} touch navigation failed`, {
      expected_path: expectedPath,
      actual_path: (() => {
        try { return new URL(page.url()).pathname; } catch { return page.url(); }
      })(),
      name: error?.name || 'Error',
      message: String(error?.message || error),
    });
    return false;
  }
}

async function settleReturnedArticle(page, ctx) {
  try {
    await page.waitForLoadState('load', { timeout: 5_000 });
    await page.waitForLoadState('networkidle', { timeout: 5_000 });
    await page.waitForTimeout(200);
    return true;
  } catch (error) {
    fail(`${ctx}: returned article did not reach resource quiescence before teardown`, {
      name: error?.name || 'Error',
      message: String(error?.message || error),
      url: page.url(),
    });
    return false;
  }
}

const launched = await launchBrowser();
const browser = launched.browser;
try {
  for (const item of routes) {
    for (const motion of motions) {
      const ctx = `${item.locale}/${item.kind}/mobile/${motion}`;
      const runtime = [];
      const proxyEvidence = [];
      const proxyErrors = [];
      const trace = { phase: 'setup', seq: 0 };
      const record = {
        ...item,
        motion,
        width: 390,
        engine: launched.engine,
        chrome_launch_error: launched.chromeError || null,
        canonical_origin: canonicalOrigin,
        canonical_origin_proxied_to_exact_preview: true,
        runtime_verdict_basis: 'POST_CONTEXT_TEARDOWN_FAIL_CLOSED_EXCEPT_TEARDOWN_ERR_ABORTED',
      };
      let context = null;
      let page = null;
      try {
        context = await browser.newContext({
          viewport: { width: 390, height: 844 },
          isMobile: true,
          hasTouch: true,
          reducedMotion: motion,
        });
        await proxyCanonicalSiteToPreview(context, proxyEvidence, proxyErrors);
        page = await context.newPage();
        attachRuntimeListeners(page, runtime, trace);

        trace.phase = 'article-navigation';
        const articleResponse = await page.goto(new URL(item.article, canonicalOrigin).href, {
          waitUntil: 'domcontentloaded',
          timeout: 20_000,
        });
        if (!articleResponse?.ok()) fail(`${ctx}: article HTTP failed`, { status: articleResponse?.status() });
        record.initial_path = new URL(page.url()).pathname;
        record.initial_origin = new URL(page.url()).origin;
        if (record.initial_path !== item.article) {
          fail(`${ctx}: initial article path drifted`, { expected: item.article, actual: record.initial_path });
        }
        if (record.initial_origin !== canonicalOrigin) {
          fail(`${ctx}: initial article did not remain on canonical browser origin`, { expected: canonicalOrigin, actual: record.initial_origin });
        }
        await page.evaluate(async () => {
          await Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 1500))]);
        });

        trace.phase = 'article-interaction';
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
          const resolvedHref = href ? new URL(href, page.url()) : null;
          const hrefPath = resolvedHref?.pathname || null;
          record.article_watch_href = href;
          record.article_watch_origin = resolvedHref?.origin || null;
          if (resolvedHref?.origin !== canonicalOrigin) {
            fail(`${ctx}: article→watch canonical origin drifted`, { expected: canonicalOrigin, actual: resolvedHref?.origin || null });
          }
          if (hrefPath !== item.watch) {
            fail(`${ctx}: article→watch target drifted`, { expected: item.watch, actual: hrefPath });
          } else {
            trace.phase = 'article-to-watch';
            await tapAndWaitPath(page, watchLink, item.watch, ctx, 'article→watch');
          }
        }

        if (new URL(page.url()).pathname === item.watch) {
          trace.phase = 'watch-interaction';
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
            const resolvedHref = href ? new URL(href, page.url()) : null;
            const hrefPath = resolvedHref?.pathname || null;
            record.watch_article_href = href;
            record.watch_article_origin = resolvedHref?.origin || null;
            if (resolvedHref?.origin !== canonicalOrigin) {
              fail(`${ctx}: watch→article canonical origin drifted`, { expected: canonicalOrigin, actual: resolvedHref?.origin || null });
            }
            if (hrefPath !== item.article) {
              fail(`${ctx}: watch→article target drifted`, { expected: item.article, actual: hrefPath });
            } else {
              trace.phase = 'watch-to-article';
              await tapAndWaitPath(page, sourceLink, item.article, ctx, 'watch→article');
            }
          }
        }

        trace.phase = 'return-settle';
        record.final_path = new URL(page.url()).pathname;
        record.final_origin = new URL(page.url()).origin;
        if (record.final_path !== item.article) {
          fail(`${ctx}: touch round trip did not return to article`, { expected: item.article, actual: record.final_path });
        }
        if (record.final_origin !== canonicalOrigin) {
          fail(`${ctx}: touch round trip did not remain on canonical browser origin`, { expected: canonicalOrigin, actual: record.final_origin });
        }

        await settleReturnedArticle(page, ctx);

        trace.phase = 'post-roundtrip';
        const geometry = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        if (geometry.scrollWidth > geometry.clientWidth + 1) {
          fail(`${ctx}: page overflow after touch round trip`, geometry);
        }
        const watchProxyCount = proxyEvidence.filter(proxyItem => new URL(proxyItem.canonical_url).pathname === item.watch).length;
        const articleProxyCount = proxyEvidence.filter(proxyItem => new URL(proxyItem.canonical_url).pathname === item.article).length;
        record.watch_proxy_count = watchProxyCount;
        record.article_proxy_count = articleProxyCount;
        if (watchProxyCount < 1) {
          fail(`${ctx}: canonical watch navigation was not fulfilled from exact preview`, { watchProxyCount, proxyEvidence: [...proxyEvidence] });
        }
        if (articleProxyCount < 2) {
          fail(`${ctx}: canonical article return was not fulfilled from exact preview`, { articleProxyCount, proxyEvidence: [...proxyEvidence] });
        }
        record.geometry = geometry;
      } catch (error) {
        record.unhandled_error = {
          name: error?.name || 'Error',
          message: String(error?.message || error),
        };
        fail(`${ctx}: unhandled touch round-trip exception`, record.unhandled_error);
      } finally {
        trace.phase = 'teardown';
        if (context) {
          try {
            await context.close();
          } catch (error) {
            fail(`${ctx}: browser context close failed`, {
              name: error?.name || 'Error',
              message: String(error?.message || error),
            });
          }
        }

        const runtimeVerdict = classifyRuntimeEvents(runtime);
        if (proxyErrors.length) {
          fail(`${ctx}: proxy errors present in retained evidence after context teardown`, [...proxyErrors]);
        }
        if (runtimeVerdict.fatal.length) {
          fail(`${ctx}: fatal runtime/resource errors present after context teardown`, runtimeVerdict.fatal);
        }
        record.runtime = [...runtime];
        record.runtime_fatal = runtimeVerdict.fatal;
        record.runtime_expected = runtimeVerdict.expected;
        record.proxy_errors = [...proxyErrors];
        record.proxy_requests = [...proxyEvidence];
        evidence.push(record);
      }
    }
  }
} finally {
  await browser.close();
}

const report = JSON.stringify({
  engine: launched.engine,
  chrome_launch_error: launched.chromeError || null,
  canonical_origin: canonicalOrigin,
  preview_origin: new URL(base).origin,
  canonical_origin_proxied_to_exact_preview: true,
  runtime_policy: 'FAIL_CLOSED_ALL_RUNTIME_ERRORS; ERR_ABORTED_EXPECTED_ONLY_DURING_CONTEXT_TEARDOWN',
  failures,
  evidence,
}, null, 2);
await fs.writeFile(path.join(out, 'report.json'), report);
await fs.writeFile(path.join(evidenceRoot, 'article-watch-touch-report.json'), report);

if (failures.length) {
  console.error(`Security article↔watch touch gate FAILED (${failures.length}) using ${launched.engine}`);
  for (const item of failures) console.error(`- ${item.message}${item.detail ? ` :: ${JSON.stringify(item.detail)}` : ''}`);
  process.exit(1);
}
console.log(`Security article↔watch touch PASS using ${launched.engine}: ES/EN Security 00/1.1 × normal/reduced motion completed a real mobile tap round trip against exact branch preview bytes; runtime/resource verdict was computed after teardown with no blanket ERR_ABORTED allow-list.`);
