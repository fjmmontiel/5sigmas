import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.S5_PREVIEW_URL ?? 'http://127.0.0.1:8000';
const outputDir = process.env.S5_SECURITY_EDITORIAL_DIR ?? 'artifacts/security-requalification/editorial-evidence';
const screenshotDir = path.join(outputDir, 'screenshots');
await mkdir(screenshotDir, { recursive: true });

const routes = [
  { locale: 'es', slug: '00-presentacion', path: '/series/seguridad-ia/00_presentacion_serie/', roots: ['.secpath'] },
  { locale: 'en', slug: '00-presentacion', path: '/en/series/seguridad-ia/00_presentacion_serie/', roots: ['.secpath'] },
  { locale: 'es', slug: '01-prompt-injection', path: '/series/seguridad-ia/01-prompt-injection/', roots: ['.ctxmix', '.ragtrace', '.defsim'] },
  { locale: 'en', slug: '01-prompt-injection', path: '/en/series/seguridad-ia/01-prompt-injection/', roots: ['.ctxmix', '.ragtrace', '.defsim'] },
];

const profiles = [
  { name: 'desktop-normal', viewport: { width: 1440, height: 1100 }, mobile: false, reducedMotion: 'no-preference' },
  { name: 'desktop-reduced', viewport: { width: 1440, height: 1100 }, mobile: false, reducedMotion: 'reduce' },
  { name: 'mobile-normal', viewport: { width: 390, height: 844 }, mobile: true, reducedMotion: 'no-preference' },
  { name: 'mobile-reduced', viewport: { width: 390, height: 844 }, mobile: true, reducedMotion: 'reduce' },
];

const isGenericResourceConsoleError = (text) => (
  /^Failed to load resource: the server responded with a status of \d+/.test(text)
  || /^Failed to load resource: net::ERR_/.test(text)
);

const sanitize = (value) => value
  .replace(/^\./, '')
  .replace(/[^a-zA-Z0-9_-]+/g, '-')
  .replace(/^-+|-+$/g, '');

const isExpectedTeardownCancellation = (event) => (
  event.type === 'requestfailed'
  && event.phase === 'teardown'
  && /ERR_ABORTED/i.test(event.errorText ?? '')
);

const classifyRuntime = (events) => ({
  unexpected: events.filter((event) => !isExpectedTeardownCancellation(event)),
  expectedTeardownCancellations: events.filter(isExpectedTeardownCancellation),
});

const failures = [];
const contexts = [];
const fail = (label, message) => failures.push(`${label}: ${message}`);

async function capture(locator, filename) {
  await locator.scrollIntoViewIfNeeded();
  await locator.screenshot({
    path: path.join(screenshotDir, filename),
    type: 'jpeg',
    quality: 88,
    animations: 'allow',
    style: '.md-header,.md-tabs,[data-md-component="header"] { visibility: hidden !important; }',
  });
  return `screenshots/${filename}`;
}

async function captureAssetStates(page, root, selector, route, profile, label) {
  const asset = sanitize(selector);
  const screenshots = [];
  await root.scrollIntoViewIfNeeded();
  await page.waitForTimeout(profile.reducedMotion === 'reduce' ? 40 : 180);

  const box = await root.boundingBox();
  if (!box || box.width < 220 || box.height < 70) {
    fail(label, `${selector} invalid bounds ${JSON.stringify(box)}`);
    return { selector, screenshots, bounds: box };
  }

  const initialName = `${route.locale}-${route.slug}-${profile.name}-${asset}-initial.jpg`;
  screenshots.push(await capture(root, initialName));

  const stateButtons = root.locator('[data-state-btn]:visible:not([disabled])');
  const stateCount = await stateButtons.count();
  if (stateCount > 0) {
    for (let index = 0; index < stateCount; index += 1) {
      const button = stateButtons.nth(index);
      const state = await button.getAttribute('data-state-btn') ?? String(index + 1);
      try {
        if (profile.mobile) await button.tap(); else await button.click();
        await page.waitForTimeout(profile.reducedMotion === 'reduce' ? 50 : 450);
        const name = `${route.locale}-${route.slug}-${profile.name}-${asset}-state-${sanitize(state)}.jpg`;
        screenshots.push(await capture(root, name));
      } catch (error) {
        fail(label, `${selector} state ${state} activation/capture failed: ${error.message}`);
      }
    }
  } else {
    const buttons = root.locator('button:visible:not([disabled])');
    const count = await buttons.count();
    for (let index = 0; index < count; index += 1) {
      const button = buttons.nth(index);
      const text = (((await button.innerText()) || '').trim() || await button.getAttribute('aria-label') || `control-${index + 1}`).slice(0, 48);
      try {
        if (profile.mobile) await button.tap(); else await button.click();
        await page.waitForTimeout(profile.reducedMotion === 'reduce' ? 50 : 180);
        const name = `${route.locale}-${route.slug}-${profile.name}-${asset}-control-${index + 1}-${sanitize(text)}.jpg`;
        screenshots.push(await capture(root, name));
      } catch (error) {
        fail(label, `${selector} control ${index + 1} activation/capture failed: ${error.message}`);
      }
    }
  }

  const geometry = await root.evaluate((node) => ({
    clientWidth: node.clientWidth,
    scrollWidth: node.scrollWidth,
    clientHeight: node.clientHeight,
    scrollHeight: node.scrollHeight,
  }));

  return {
    selector,
    bounds: { width: Math.round(box.width), height: Math.round(box.height) },
    geometry,
    screenshots,
  };
}

async function settleTransientShell(page, profile) {
  // The Material permalink tooltip can remain positioned off-viewport after
  // scripted scrolling/clicking and temporarily contribute its 100vw inner
  // box to document.scrollWidth. Reset only transient hover/focus UI before
  // measuring article layout; do not hide or resize article content.
  if (!profile.mobile) await page.mouse.move(1, 1);
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    const active = document.activeElement;
    if (active && typeof active.blur === 'function') active.blur();
  });
  await page.waitForTimeout(300);
}

let browser;
let browserVersion = null;
try {
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  browserVersion = browser.version();

  for (const route of routes) {
    for (const profile of profiles) {
      const label = `${route.locale}/${route.slug}/${profile.name}`;
      const context = await browser.newContext({
        viewport: profile.viewport,
        isMobile: profile.mobile,
        hasTouch: profile.mobile,
        reducedMotion: profile.reducedMotion,
        deviceScaleFactor: 1,
        colorScheme: 'light',
      });
      const page = await context.newPage();
      const runtimeEvents = [];
      let phase = 'navigation';
      let seq = 0;
      let nextRequestId = 1;
      const requestIds = new WeakMap();
      const requestId = (request) => {
        if (!requestIds.has(request)) requestIds.set(request, `request-${nextRequestId++}`);
        return requestIds.get(request);
      };
      const pushRuntime = (event) => runtimeEvents.push({ seq: ++seq, phase, ...event });

      page.on('pageerror', (error) => pushRuntime({ type: 'pageerror', detail: String(error) }));
      page.on('console', (message) => {
        if (message.type() !== 'error') return;
        const text = message.text();
        if (isGenericResourceConsoleError(text)) return;
        pushRuntime({ type: 'console', detail: text, location: message.location() });
      });
      page.on('response', (response) => {
        if (response.status() < 400) return;
        const request = response.request();
        pushRuntime({
          type: 'http',
          requestId: requestId(request),
          resourceType: request.resourceType(),
          status: response.status(),
          url: response.url(),
        });
      });
      page.on('requestfailed', (request) => pushRuntime({
        type: 'requestfailed',
        requestId: requestId(request),
        resourceType: request.resourceType(),
        url: request.url(),
        errorText: request.failure()?.errorText ?? 'unknown',
      }));

      const evidence = [];
      let navigationError = null;
      let initial = null;
      let after = null;
      let fullPageScreenshot = null;

      try {
        phase = 'navigation';
        const response = await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'networkidle', timeout: 30_000 });
        if (!response?.ok()) fail(label, `HTTP ${response?.status() ?? 'no response'}`);

        phase = 'font-settle';
        await page.evaluate(() => document.fonts.ready);
        const lang = ((await page.locator('html').getAttribute('lang')) || '').toLowerCase();
        if (!lang.startsWith(route.locale)) fail(label, `html lang=${JSON.stringify(lang)}`);

        phase = 'initial-layout';
        initial = await page.evaluate(() => ({
          viewportWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          scrollHeight: document.documentElement.scrollHeight,
          brokenImages: [...document.images]
            .filter((img) => img.complete && img.naturalWidth === 0)
            .map((img) => img.currentSrc || img.src),
        }));
        if (initial.scrollWidth > initial.viewportWidth + 4) fail(label, `global horizontal overflow ${JSON.stringify(initial)}`);
        if (initial.brokenImages.length) fail(label, `broken images ${initial.brokenImages.join(', ')}`);

        phase = 'asset-state-capture';
        for (const selector of route.roots) {
          const matches = page.locator(selector);
          const count = await matches.count();
          if (count !== 1) {
            fail(label, `expected exactly one ${selector}, found ${count}`);
            continue;
          }
          const root = matches.first();
          if (!await root.isVisible()) {
            fail(label, `${selector} is not visible`);
            continue;
          }
          evidence.push(await captureAssetStates(page, root, selector, route, profile, label));
        }

        phase = 'full-page-scroll';
        await page.evaluate(async () => {
          const step = Math.max(280, innerHeight * 0.7);
          for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
            scrollTo(0, y);
            await new Promise((resolve) => setTimeout(resolve, 30));
          }
          scrollTo(0, document.documentElement.scrollHeight);
        });
        await page.waitForTimeout(300);

        phase = 'transient-shell-settle';
        await settleTransientShell(page, profile);

        phase = 'post-interaction-layout';
        after = await page.evaluate(() => ({
          viewportWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          scrollHeight: document.documentElement.scrollHeight,
          brokenImages: [...document.images]
            .filter((img) => img.complete && img.naturalWidth === 0)
            .map((img) => img.currentSrc || img.src),
        }));
        if (after.scrollWidth > after.viewportWidth + 4) fail(label, `global overflow after interaction ${JSON.stringify(after)}`);
        if (after.brokenImages.length) fail(label, `broken images after interaction ${after.brokenImages.join(', ')}`);

        phase = 'full-page-screenshot';
        const fullName = `${route.locale}-${route.slug}-${profile.name}-full.jpg`;
        await page.screenshot({
          path: path.join(screenshotDir, fullName),
          fullPage: true,
          type: 'jpeg',
          quality: 88,
          animations: 'allow',
        });
        fullPageScreenshot = `screenshots/${fullName}`;

        phase = 'settle';
        await page.waitForTimeout(150);
      } catch (error) {
        navigationError = error.message;
        fail(label, `capture execution failed: ${error.message}`);
      }

      phase = 'teardown';
      try {
        await context.close();
      } catch (error) {
        pushRuntime({ type: 'context-close', detail: String(error) });
      }

      const runtimeVerdict = classifyRuntime(runtimeEvents);
      if (runtimeVerdict.unexpected.length) {
        fail(label, `runtime/resource errors ${JSON.stringify(runtimeVerdict.unexpected)}`);
      }

      contexts.push({
        route: route.path,
        locale: route.locale,
        article: route.slug,
        profile: profile.name,
        viewport: profile.viewport,
        reducedMotion: profile.reducedMotion,
        hasTouch: profile.mobile,
        navigationError,
        initial,
        after,
        assets: evidence,
        fullPageScreenshot,
        runtimeEvents,
        runtimeUnexpected: runtimeVerdict.unexpected,
        expectedTeardownCancellations: runtimeVerdict.expectedTeardownCancellations,
        verdictBasis: 'POST_CONTEXT_TEARDOWN',
      });
    }
  }
} finally {
  if (browser) await browser.close();
}

const report = {
  schema_version: 4,
  scope: 'security-00-01-whole-article-editorial-evidence',
  golden: false,
  pixel_review: 'REQUIRES_MANUAL_PIXEL_INSPECTION_OF_ALL_RETAINED_SCREENSHOTS',
  pedagogy_review: 'REQUIRES_MANUAL_EDITORIAL_REVIEW; THIS_CAPTURE_DOES_NOT_CERTIFY_PEDAGOGY',
  isolated_asset_capture: {
    sticky_chrome_hidden: true,
    document_scroll_mutated_for_isolated_capture: false,
    transient_framework_tooltips_settled_before_global_overflow_verdict: true,
    purpose: 'ISOLATE_COMPLETE_VISUAL_STATE_FOR_EDITORIAL_REVIEW_WITHOUT_STICKY_CHROME_CONTAMINATION',
    full_page_capture_preserves_real_sticky_chrome: true,
  },
  browser: { channel: 'chrome', version: browserVersion },
  expected_contexts: routes.length * profiles.length,
  observed_contexts: contexts.length,
  locales: ['es', 'en'],
  profiles: profiles.map((profile) => profile.name),
  failures,
  contexts,
};

await writeFile(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
if (contexts.length !== routes.length * profiles.length) {
  failures.push(`Expected ${routes.length * profiles.length} contexts, observed ${contexts.length}`);
}
if (failures.length) {
  console.error(`Security editorial evidence capture failed (${failures.length})`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}
console.log(`Security editorial evidence capture PASS technically: ${contexts.length} contexts. Pixel and pedagogy remain manual fail-closed reviews.`);
