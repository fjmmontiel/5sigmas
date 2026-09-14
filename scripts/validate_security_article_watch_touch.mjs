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
 * Navigation waits are armed before the tap and settle at DOMContentLoaded rather
 * than full load so lazy media cannot make a valid navigation look hung. Before a
 * context is torn down, the returned article must also reach network quiescence.
 * Runtime/proxy arrays are then checked again after context close so teardown-time
 * failures can never appear in retained evidence while escaping the fail verdict.
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
        // error is already retained and must be judged after context close.
      }
    }
  });
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
      const record = {
        ...item,
        motion,
        width: 390,
        engine: launched.engine,
        chrome_launch_error: launched.chromeError || null,
        canonical_origin: canonicalOrigin,
        canonical_origin_proxied_to_exact_preview: true,
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
        attachRuntimeListeners(page, runtime);

        // Start on the canonical origin, but serve the exact branch-preview bytes.
        // This keeps article→watch navigation same-origin just like production.
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
            await tapAndWaitPath(page, watchLink, item.watch, ctx, 'article→watch');
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
              await tapAndWaitPath(page, sourceLink, item.article, ctx, 'watch→article');
            }
          }
        }

        record.final_path = new URL(page.url()).pathname;
        record.final_origin = new URL(page.url()).origin;
        if (record.final_path !== item.article) {
          fail(`${ctx}: touch round trip did not return to article`, { expected: item.article, actual: record.final_path });
        }
        if (record.final_origin !== canonicalOrigin) {
          fail(`${ctx}: touch round trip did not remain on canonical browser origin`, { expected: canonicalOrigin, actual: record.final_origin });
        }

        await settleReturnedArticle(page, ctx);

        const geometry = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        if (geometry.scrollWidth > geometry.clientWidth + 1) {
          fail(`${ctx}: page overflow after touch round trip`, geometry);
        }
        if (proxyErrors.length) fail(`${ctx}: canonical→preview proxy errors`, [...proxyErrors]);
        const watchProxyCount = proxyEvidence.filter(proxyItem => new URL(proxyItem.canonical_url).pathname === item.watch).length;
        const articleProxyCount = proxyEvidence.filter(proxyItem => new URL(proxyItem.canonical_url).pathname === item.article).length;
        record.watch_proxy_count = watchProxyCount;
        record.article_proxy_count = articleProxyCount;
        if (watchProxyCount < 1) {
          fail(`${ctx}: canonical watch navigation was not fulfilled from exact preview`, { watchProxyCount, proxyEvidence: [...proxyEvidence] });
        }
        // The article must be proxied twice: initial canonical load + touch return.
        // Requiring >=2 prevents the initial navigation from masking a broken return.
        if (articleProxyCount < 2) {
          fail(`${ctx}: canonical article return was not fulfilled from exact preview`, { articleProxyCount, proxyEvidence: [...proxyEvidence] });
        }
        if (runtime.length) fail(`${ctx}: persistent runtime/resource errors across touch round trip`, [...runtime]);
        record.geometry = geometry;
      } catch (error) {
        record.unhandled_error = {
          name: error?.name || 'Error',
          message: String(error?.message || error),
        };
        fail(`${ctx}: unhandled touch round-trip exception`, record.unhandled_error);
      } finally {
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

        // The previous revision checked runtime/proxy arrays before context.close,
        // while the retained report still held references to those mutable arrays.
        // That allowed teardown-time errors to appear in the artifact after the
        // verdict had already been computed. Re-check after close and snapshot the
        // exact arrays that will be serialized so retained evidence and verdict are
        // conjunctive by construction.
        if (proxyErrors.length) {
          fail(`${ctx}: proxy errors present in retained evidence after context teardown`, [...proxyErrors]);
        }
        if (runtime.length) {
          fail(`${ctx}: runtime/resource errors present in retained evidence after context teardown`, [...runtime]);
        }
        record.runtime = [...runtime];
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
  failures,
  evidence,
}, null, 2);
await fs.writeFile(path.join(out, 'report.json'), report);
// Keep a second flat copy in the retained evidence root. A prior exact-head run
// proved that step status alone is insufficient when the nested report is absent;
// duplicating this small JSON summary makes retention deterministic to verify.
await fs.writeFile(path.join(evidenceRoot, 'article-watch-touch-report.json'), report);

if (failures.length) {
  console.error(`Security article↔watch touch gate FAILED (${failures.length}) using ${launched.engine}`);
  for (const item of failures) console.error(`- ${item.message}${item.detail ? ` :: ${JSON.stringify(item.detail)}` : ''}`);
  process.exit(1);
}
console.log(`Security article↔watch touch PASS using ${launched.engine}: ES/EN Security 00/1.1 × normal/reduced motion completed a real mobile tap round trip against exact branch preview bytes while preserving canonical hrefs and retaining zero runtime/proxy errors after teardown.`);
