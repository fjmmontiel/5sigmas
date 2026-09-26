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
 * Runtime/resource listeners remain active until browser-context teardown. Media
 * ERR_ABORTED is never blanket-allowed: context-close cancellation is expected;
 * navigation cancellation is expected only for the exact native media source when
 * the corresponding article→watch or watch→article navigation actually succeeds;
 * and watch-page range cancellation is expected only with prior 200/206 evidence
 * for the same request plus a healthy native player. All other runtime/resource
 * errors remain fatal. The final verdict is computed from retained evidence after
 * the context has closed.
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

function expectedMediaUrlFor(item) {
  return new URL(item.article.replace(/\/$/, '.mp4'), canonicalOrigin).href;
}

function isHealthyWatchPlayer(player, expectedMediaUrl) {
  return Boolean(
    player
    && player.source_matches_expected === true
    && Number(player.ready_state) >= 1
    && player.error == null
    && player.current_src === expectedMediaUrl
  );
}

function classifyRuntimeEvents(events, facts = {}) {
  const fatal = [];
  const expected = [];
  const mediaResponses = Array.isArray(facts.mediaResponses) ? facts.mediaResponses : [];
  for (const event of events) {
    const isAbort = event.type === 'requestfailed' && String(event.detail || '').includes('ERR_ABORTED');
    if (!isAbort) {
      fatal.push(event);
      continue;
    }

    if (event.phase === 'teardown') {
      expected.push({ ...event, classification: 'EXPECTED_CONTEXT_TEARDOWN_ABORT' });
      continue;
    }

    const exactNativeMedia = (
      event.resourceType === 'media'
      && typeof facts.expectedMediaUrl === 'string'
      && event.url === facts.expectedMediaUrl
    );
    if (!exactNativeMedia) {
      fatal.push(event);
      continue;
    }

    const navigationSucceeded = (
      (event.phase === 'article-to-watch' && facts.articleToWatchSuccess === true)
      || (event.phase === 'watch-to-article' && facts.watchToArticleSuccess === true)
    );
    if (navigationSucceeded) {
      expected.push({ ...event, classification: 'EXPECTED_MEDIA_CANCELLED_BY_VERIFIED_NAVIGATION' });
      continue;
    }

    if (event.phase === 'watch-interaction' && facts.watchReached === true) {
      const priorSameRequestResponse = mediaResponses.some(response => (
        response.requestId === event.requestId
        && response.resourceType === 'media'
        && response.url === event.url
        && (response.status === 200 || response.status === 206)
        && response.seq < event.seq
      ));
      if (priorSameRequestResponse && isHealthyWatchPlayer(facts.watchPlayer, facts.expectedMediaUrl)) {
        expected.push({ ...event, classification: 'EXPECTED_VERIFIED_MEDIA_RANGE_CANCELLATION' });
        continue;
      }
    }

    fatal.push(event);
  }
  return { fatal, expected };
}

function runSelfTest() {
  const expectedMediaUrl = 'https://5sigmas.com/series/seguridad-ia/01-prompt-injection.mp4';
  const abort = {
    type: 'requestfailed',
    seq: 5,
    requestId: 'req-1',
    resourceType: 'media',
    url: expectedMediaUrl,
    detail: 'net::ERR_ABORTED',
  };
  const healthyPlayer = {
    current_src: expectedMediaUrl,
    source_matches_expected: true,
    ready_state: 4,
    network_state: 1,
    error: null,
  };
  const response = {
    seq: 4,
    requestId: 'req-1',
    resourceType: 'media',
    url: expectedMediaUrl,
    status: 206,
  };

  const teardown = classifyRuntimeEvents([{ ...abort, phase: 'teardown' }], { expectedMediaUrl });
  if (teardown.fatal.length || teardown.expected.length !== 1) {
    throw new Error('context-teardown ERR_ABORTED fixture was rejected');
  }

  const articleNavigation = classifyRuntimeEvents(
    [{ ...abort, phase: 'article-to-watch' }],
    { expectedMediaUrl, articleToWatchSuccess: true },
  );
  if (articleNavigation.fatal.length || articleNavigation.expected[0]?.classification !== 'EXPECTED_MEDIA_CANCELLED_BY_VERIFIED_NAVIGATION') {
    throw new Error('verified article→watch media cancellation fixture was rejected');
  }

  const watchNavigation = classifyRuntimeEvents(
    [{ ...abort, phase: 'watch-to-article' }],
    { expectedMediaUrl, watchToArticleSuccess: true },
  );
  if (watchNavigation.fatal.length || watchNavigation.expected[0]?.classification !== 'EXPECTED_MEDIA_CANCELLED_BY_VERIFIED_NAVIGATION') {
    throw new Error('verified watch→article media cancellation fixture was rejected');
  }

  const rangeCancellation = classifyRuntimeEvents(
    [{ ...abort, phase: 'watch-interaction' }],
    {
      expectedMediaUrl,
      watchReached: true,
      watchPlayer: healthyPlayer,
      mediaResponses: [response],
    },
  );
  if (rangeCancellation.fatal.length || rangeCancellation.expected[0]?.classification !== 'EXPECTED_VERIFIED_MEDIA_RANGE_CANCELLATION') {
    throw new Error('request-correlated watch media range cancellation fixture was rejected');
  }

  const mutations = [
    {
      name: 'navigation media abort without successful destination',
      events: [{ ...abort, phase: 'article-to-watch' }],
      facts: { expectedMediaUrl, articleToWatchSuccess: false },
    },
    {
      name: 'wrong media URL',
      events: [{ ...abort, phase: 'article-to-watch', url: 'https://5sigmas.com/wrong.mp4' }],
      facts: { expectedMediaUrl, articleToWatchSuccess: true },
    },
    {
      name: 'non-media navigation abort',
      events: [{ ...abort, phase: 'article-to-watch', resourceType: 'script' }],
      facts: { expectedMediaUrl, articleToWatchSuccess: true },
    },
    {
      name: 'watch interaction abort without response proof',
      events: [{ ...abort, phase: 'watch-interaction' }],
      facts: { expectedMediaUrl, watchReached: true, watchPlayer: healthyPlayer, mediaResponses: [] },
    },
    {
      name: 'watch interaction abort with different request proof',
      events: [{ ...abort, phase: 'watch-interaction' }],
      facts: { expectedMediaUrl, watchReached: true, watchPlayer: healthyPlayer, mediaResponses: [{ ...response, requestId: 'req-2' }] },
    },
    {
      name: 'watch interaction abort with response after failure',
      events: [{ ...abort, phase: 'watch-interaction' }],
      facts: { expectedMediaUrl, watchReached: true, watchPlayer: healthyPlayer, mediaResponses: [{ ...response, seq: 6 }] },
    },
    {
      name: 'watch interaction abort with unhealthy player',
      events: [{ ...abort, phase: 'watch-interaction' }],
      facts: {
        expectedMediaUrl,
        watchReached: true,
        watchPlayer: { ...healthyPlayer, ready_state: 0 },
        mediaResponses: [response],
      },
    },
    {
      name: 'return-settle abort',
      events: [{ ...abort, phase: 'return-settle' }],
      facts: { expectedMediaUrl },
    },
    {
      name: 'non-abort request failure',
      events: [{ ...abort, phase: 'teardown', detail: 'net::ERR_FAILED' }],
      facts: { expectedMediaUrl },
    },
    {
      name: 'late pageerror',
      events: [{ type: 'pageerror', seq: 6, phase: 'teardown', detail: 'boom' }],
      facts: { expectedMediaUrl },
    },
    {
      name: 'late console error',
      events: [{ type: 'console', seq: 7, phase: 'teardown', detail: 'boom' }],
      facts: { expectedMediaUrl },
    },
    {
      name: 'late HTTP error',
      events: [{ type: 'http', seq: 8, phase: 'teardown', status: 500, url: 'https://example.invalid/fail' }],
      facts: { expectedMediaUrl },
    },
  ];
  for (const mutation of mutations) {
    if (classifyRuntimeEvents(mutation.events, mutation.facts).fatal.length !== 1) {
      throw new Error(`${mutation.name} mutation escaped fail-closed runtime classification`);
    }
  }

  console.log('Security article↔watch touch self-test PASS: only teardown aborts, media cancellation caused by a verified round-trip navigation, or request-correlated healthy-player range cancellation are tolerated; all mutations remain fatal.');
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

function attachRuntimeListeners(page, runtime, mediaResponses, trace) {
  let nextRequestId = 1;
  const requestIds = new WeakMap();
  const requestId = request => {
    if (!requestIds.has(request)) requestIds.set(request, `req-${nextRequestId++}`);
    return requestIds.get(request);
  };
  const nextSeq = () => ++trace.seq;
  const push = event => runtime.push({ seq: nextSeq(), phase: trace.phase, ...event });

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
    const request = response.request();
    const resourceType = request.resourceType();
    const id = requestId(request);
    if (resourceType === 'media' && (response.status() === 200 || response.status() === 206)) {
      mediaResponses.push({
        seq: nextSeq(),
        phase: trace.phase,
        requestId: id,
        resourceType,
        status: response.status(),
        url: response.url(),
      });
    }
    if (response.status() >= 400) {
      push({
        type: 'http',
        requestId: id,
        resourceType,
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
      const mediaResponses = [];
      const proxyEvidence = [];
      const proxyErrors = [];
      const trace = { phase: 'setup', seq: 0 };
      const expectedMediaUrl = expectedMediaUrlFor(item);
      const record = {
        ...item,
        motion,
        width: 390,
        engine: launched.engine,
        chrome_launch_error: launched.chromeError || null,
        canonical_origin: canonicalOrigin,
        canonical_origin_proxied_to_exact_preview: true,
        expected_media_url: expectedMediaUrl,
        runtime_verdict_basis: 'POST_CONTEXT_TEARDOWN_REQUEST_CORRELATED_MEDIA_NAVIGATION_V2',
        article_to_watch_success: false,
        watch_to_article_success: false,
        watch_reached: false,
        watch_player: null,
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
        attachRuntimeListeners(page, runtime, mediaResponses, trace);

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
            record.article_to_watch_success = await tapAndWaitPath(page, watchLink, item.watch, ctx, 'article→watch');
          }
        }

        if (new URL(page.url()).pathname === item.watch) {
          record.watch_reached = true;
          trace.phase = 'watch-interaction';
          const watchLang = await page.locator('html').getAttribute('lang');
          if (!String(watchLang || '').toLowerCase().startsWith(item.locale)) {
            fail(`${ctx}: watch locale mismatch`, { watchLang });
          }
          const watchPlayer = page.locator('[data-s5-watch-player]').first();
          if ((await watchPlayer.count()) !== 1 || !(await watchPlayer.isVisible())) {
            fail(`${ctx}: prominent watch player missing/not visible after touch navigation`);
          } else {
            try {
              await page.waitForFunction(() => {
                const video = document.querySelector('[data-s5-watch-player]');
                return Boolean(video && (video.readyState >= 1 || video.error));
              }, { timeout: 5_000 });
            } catch {
              // The lifecycle gate owns playback readiness. This touch gate only
              // uses readiness as evidence when classifying a media range abort.
            }
            record.watch_player = await watchPlayer.evaluate((video, mediaUrl) => {
              const source = video.currentSrc || video.querySelector('source')?.src || '';
              const resolved = source ? new URL(source, document.baseURI).href : '';
              return {
                current_src: resolved,
                source_matches_expected: resolved === mediaUrl,
                ready_state: video.readyState,
                network_state: video.networkState,
                error: video.error ? { code: video.error.code, message: video.error.message || '' } : null,
              };
            }, expectedMediaUrl);
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
              record.watch_to_article_success = await tapAndWaitPath(page, sourceLink, item.article, ctx, 'watch→article');
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

        const runtimeVerdict = classifyRuntimeEvents(runtime, {
          expectedMediaUrl,
          articleToWatchSuccess: record.article_to_watch_success,
          watchToArticleSuccess: record.watch_to_article_success,
          watchReached: record.watch_reached,
          watchPlayer: record.watch_player,
          mediaResponses,
        });
        if (proxyErrors.length) {
          fail(`${ctx}: proxy errors present in retained evidence after context teardown`, [...proxyErrors]);
        }
        if (runtimeVerdict.fatal.length) {
          fail(`${ctx}: fatal runtime/resource errors present after context teardown`, runtimeVerdict.fatal);
        }
        record.runtime = [...runtime];
        record.media_responses = [...mediaResponses];
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
  runtime_policy: 'FAIL_CLOSED; TEARDOWN_ABORT_EXPECTED; NAVIGATION_MEDIA_ABORT_REQUIRES_EXACT_SOURCE_PLUS_SUCCESSFUL_DESTINATION; WATCH_RANGE_ABORT_REQUIRES_SAME_REQUEST_200_206_PLUS_HEALTHY_PLAYER',
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
console.log(`Security article↔watch touch PASS using ${launched.engine}: ES/EN Security 00/1.1 × normal/reduced motion completed a real mobile tap round trip against exact branch preview bytes; runtime/resource verdict was computed after teardown with navigation- and request-correlated media cancellation evidence.`);
