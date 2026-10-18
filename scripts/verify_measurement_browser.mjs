#!/usr/bin/env node
/**
 * Real Chromium checks against built MkDocs pages and current source runtimes.
 * All page requests are intercepted: static files come from --site, measurement
 * config is a local approved fixture, and captured events receive a local 202.
 * No request reaches 5sigmas, Cloudflare, Google or any other external service.
 * No Playwright dependency is added to the application or installed by this test.
 *
 * node scripts/verify_measurement_browser.mjs --site ./site \
 *   --chromium /path/to/chrome --output /tmp/5sigmas-measurement-browser
 *
 * Optional --source points at the current repository source root. Playwright is
 * resolved from the environment or --playwright-root (a node_modules directory).
 * Environment equivalents: S5_MEASUREMENT_SITE, S5_MEASUREMENT_SOURCE,
 * S5_MEASUREMENT_SCREENSHOTS, S5_CHROMIUM, CODEX_PRIMARY_RUNTIME_NODE_MODULES.
 */
import assert from 'node:assert/strict';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function argument(name, fallback) {
  const at = process.argv.indexOf(`--${name}`);
  if (at === -1) return fallback;
  assert.ok(process.argv[at + 1] && !process.argv[at + 1].startsWith('--'), `--${name} requires a value`);
  return process.argv[at + 1];
}
const sourceRoot = resolve(argument('source', process.env.S5_MEASUREMENT_SOURCE || repository));
const siteRoot = resolve(argument('site', process.env.S5_MEASUREMENT_SITE || join(repository, 'site')));
const outputRoot = resolve(argument('output', process.env.S5_MEASUREMENT_SCREENSHOTS || '/tmp/5sigmas-measurement-browser'));
const executablePath = argument('chromium', process.env.S5_CHROMIUM);
assert.ok(executablePath, 'Set --chromium or S5_CHROMIUM to an installed Chromium executable');
await access(executablePath);
await access(join(siteRoot, 'herramientas/precio-rendimiento-modelos/index.html'));
await access(join(siteRoot, 'en/tools/model-price-performance/index.html'));
await mkdir(outputRoot, { recursive: true });

const require = createRequire(import.meta.url);
const playwrightRoot = argument('playwright-root', process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES);
const { chromium } = playwrightRoot ? require(join(playwrightRoot, 'playwright')) : require('playwright');
const ORIGIN = 'https://5sigmas.com';
const ENDPOINT = `${ORIGIN}/_s5/measurement/events`;
const SESSION_KEY = 's5:measurement-session:v1';
const CONSENT_KEY = 's5:measurement-consent:v1';
const policyRevision = '2026-10-18';
const configFixture = `window.__S5_MEASUREMENT__=Object.freeze(${JSON.stringify({
  endpoint: '/_s5/measurement/events', approved: true, policyRevision,
})});`;
const overrides = new Map([
  ['/assets/javascripts/measurement.js', 'docs/assets/javascripts/measurement.js'],
  ['/assets/javascripts/measurement-catalog.js', 'docs/assets/javascripts/measurement-catalog.js'],
  ['/assets/javascripts/tools/model-price-performance.js', 'docs/assets/javascripts/tools/model-price-performance.js'],
  ['/javascripts/external-links.js', 'docs/javascripts/external-links.js'],
]);
const mime = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
};
const cachedFiles = new Map();
async function fileBytes(path) {
  if (!cachedFiles.has(path)) cachedFiles.set(path, await readFile(path));
  return cachedFiles.get(path);
}
async function storageState(page) {
  return page.evaluate(({ sessionKey, consentKey }) => ({
    session: sessionStorage.getItem(sessionKey), consent: sessionStorage.getItem(consentKey),
    status: window.s5Measurement.status(),
  }), { sessionKey: SESSION_KEY, consentKey: CONSENT_KEY });
}
async function settle(page) {
  // Two actual animation frames allow synchronous input/change handlers and
  // local fetch completions to settle without fixed, timing-sensitive sleeps.
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
  await page.waitForFunction(() => window.s5Measurement.status().lastDelivery !== 'queued');
}
async function panelGeometry(page, testCase) {
  const bounds = await page.locator('#s5-measurement-privacy').boundingBox();
  assert.ok(bounds && bounds.x >= 0 && bounds.y >= 0
    && bounds.x + bounds.width <= testCase.viewport.width + 1
    && bounds.y + bounds.height <= testCase.viewport.height + 1,
  `${testCase.name}: the consent panel must fit the viewport: ${JSON.stringify(bounds)}`);
  return bounds;
}
const cases = [
  { name: 'es-desktop', locale: 'es', path: '/herramientas/precio-rendimiento-modelos/', viewport: { width: 1440, height: 1000 } },
  { name: 'en-desktop', locale: 'en', path: '/en/tools/model-price-performance/', viewport: { width: 1440, height: 1000 } },
  { name: 'es-mobile', locale: 'es', path: '/herramientas/precio-rendimiento-modelos/', viewport: { width: 390, height: 844 }, isMobile: true },
  { name: 'en-mobile', locale: 'en', path: '/en/tools/model-price-performance/', viewport: { width: 390, height: 844 }, isMobile: true },
];
const browser = await chromium.launch({
  executablePath, headless: true, args: ['--no-sandbox', '--disable-gpu', '--disable-background-networking'],
});
const results = [];

try {
  for (const testCase of cases) {
    const context = await browser.newContext({
      viewport: testCase.viewport, deviceScaleFactor: 1, isMobile: testCase.isMobile || false,
      hasTouch: testCase.isMobile || false, serviceWorkers: 'block', acceptDownloads: false,
    });
    const captured = [];
    const blockedHosts = new Set();
    const missingStatic = new Set();
    const pageErrors = [];
    let staticCookieObserved = false;
    try {
      // A real HttpOnly cookie proves absence on measurement is due to
      // credentials:omit, rather than the browser having no ambient cookies.
      await context.addCookies([{
        name: 's5_synthetic_browser_cookie', value: 'local-qa-cookie-sentinel',
        url: ORIGIN, httpOnly: true, secure: true, sameSite: 'Lax',
      }]);
      await context.route('**/*', async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.origin !== ORIGIN) {
          blockedHosts.add(url.hostname);
          await route.abort('blockedbyclient');
          return;
        }
        if (url.href === ENDPOINT && request.method() === 'POST') {
          // allHeaders includes security-related browser headers that the
          // shorter headers() accessor intentionally omits.
          captured.push({ headers: await request.allHeaders(), payload: JSON.parse(request.postData()) });
          await route.fulfill({ status: 202, contentType: 'application/json', body: '{"accepted":true}' });
          return;
        }
        if (!['GET', 'HEAD'].includes(request.method())) {
          await route.abort('blockedbyclient');
          return;
        }
        const headers = await request.allHeaders();
        if (headers.cookie?.includes('s5_synthetic_browser_cookie=')) staticCookieObserved = true;
        const relativePath = decodeURIComponent(url.pathname);
        const runtimePath = relativePath.replace(/^\/en\//, '/');
        if (runtimePath === '/assets/javascripts/measurement-config.js') {
          await route.fulfill({ contentType: 'application/javascript', body: configFixture });
          return;
        }
        let localPath;
        if (overrides.has(runtimePath)) localPath = resolve(sourceRoot, overrides.get(runtimePath));
        else {
          localPath = resolve(siteRoot, `.${relativePath.endsWith('/') ? `${relativePath}index.html` : relativePath}`);
          if (localPath !== siteRoot && !localPath.startsWith(`${siteRoot}${sep}`)) {
            await route.abort('blockedbyclient');
            return;
          }
        }
        try {
          await route.fulfill({
            status: 200, contentType: mime[extname(localPath)] || 'application/octet-stream',
            body: await fileBytes(localPath),
          });
        } catch (error) {
          if (error.code !== 'ENOENT') throw error;
          missingStatic.add(url.pathname);
          await route.fulfill({ status: 404, body: '' });
        }
      });
      if (context.routeWebSocket) await context.routeWebSocket('**/*', (socket) => socket.close());
      const page = await context.newPage();
      page.on('pageerror', (error) => pageErrors.push({ message: error.message, stack: error.stack || '' }));
      const navigation = await page.goto(`${ORIGIN}${testCase.path}?qa_private=local-query-sentinel#local-fragment-sentinel`, {
        waitUntil: 'networkidle', referer: 'https://www.google.com/search?q=local-referrer-sentinel', timeout: 30000,
      });
      assert.equal(navigation.status(), 200);
      await page.waitForFunction(() => window.s5Measurement
        && document.querySelector('[data-model-table-body] tr')
        && document.querySelectorAll('[data-field="provider"] option').length > 1);
      const measurementAssets = await page.locator('script[data-s5-agent-runtime^="measurement"]').evaluateAll(
        (scripts) => scripts.map((script) => script.src));
      assert.equal(measurementAssets.length, 3);
      for (const asset of measurementAssets) {
        assert.equal(new URL(asset).searchParams.get('v'), policyRevision,
          'Versioned requests must isolate the consent runtime from older browser caches');
      }
      await settle(page);
      assert.equal(captured.length, 0, `${testCase.name}: no event before consent`);
      const initial = await storageState(page);
      assert.equal(initial.session, null);
      assert.equal(initial.consent, null);
      assert.equal(initial.status.configured, true);
      assert.equal(initial.status.consent, 'unknown');
      assert.equal(initial.status.lastDelivery, 'not_sent');
      assert.equal(staticCookieObserved, true, 'The synthetic ambient cookie must be present on ordinary local static requests');
      assert.equal(await page.locator('#s5-measurement-privacy').getAttribute('lang'), testCase.locale);
      assert.equal(await page.locator('[data-s5-consent="granted"]').innerText(),
        testCase.locale === 'es' ? 'Permitir medición' : 'Allow measurement');
      // Override smooth scrolling for this test action so screenshots show a
      // stationary viewport, not a compositor frame from an ongoing scroll.
      await page.evaluate(() => document.querySelector('[data-s5-model-explorer]').scrollIntoView({ block: 'start', behavior: 'instant' }));
      await settle(page);
      const panelBounds = await panelGeometry(page, testCase);
      const screenshot = join(outputRoot, `${testCase.name}-consent.png`);
      await page.screenshot({ path: screenshot, animations: 'disabled' });

      await page.locator('#s5-measurement-privacy summary').click();
      await settle(page);
      assert.equal(await page.locator('#s5-measurement-privacy details').evaluate((details) => details.open), true);
      const expandedBounds = await panelGeometry(page, testCase);
      // On small screens the detailed policy scrolls within the bounded panel;
      // the actual allow/decline buttons must remain reachable by normal clicks.
      await page.locator('[data-s5-consent="denied"]').scrollIntoViewIfNeeded();
      await settle(page);
      const declineBounds = await page.locator('[data-s5-consent="denied"]').boundingBox();
      assert.ok(declineBounds && declineBounds.y >= 0
        && declineBounds.y + declineBounds.height <= testCase.viewport.height + 1);
      assert.equal(captured.length, 0, 'Reading the detailed policy cannot imply consent');

      await page.locator('[data-s5-consent="granted"]').click();
      await settle(page);
      assert.equal(captured.filter((event) => event.payload.event_name === 'page_view').length, 1);
      assert.equal(captured.filter((event) => event.payload.event_name === 'tool_open').length, 1);
      assert.equal(captured.filter((event) => ['result_rendered', 'scenario_completed'].includes(event.payload.event_name)).length, 0,
        'Consent and initial default rendering must not inflate conversions');
      const granted = await storageState(page);
      assert.match(JSON.parse(granted.session).session_id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      assert.equal(granted.consent, `${policyRevision}:granted`);

      const input = page.locator('[data-field="inputTokens"]');
      await input.fill('23500');
      await input.press('Tab');
      await settle(page);
      for (const name of ['meaningful_input_change', 'result_rendered', 'scenario_completed']) {
        assert.equal(captured.filter((event) => event.payload.event_name === name).length, 1, `${testCase.name}: ${name} from a real valid tool change`);
      }
      assert.equal(await input.inputValue(), '23500');
      assert.ok(await page.locator('[data-model-table-body] tr').count() > 0);
      const conversions = () => captured.filter((event) => ['result_rendered', 'scenario_completed'].includes(event.payload.event_name)).length;
      const validConversions = conversions();
      await input.fill('-1');
      await input.press('Tab');
      await settle(page);
      assert.equal(await input.evaluate((field) => field.validity.valid), false);
      assert.equal(conversions(), validConversions, 'An invalid native number input cannot produce conversion events');

      for (const { headers, payload } of captured) {
        assert.equal(headers.origin, ORIGIN, 'Chromium must append the actual canonical Origin');
        assert.equal(headers.referer, undefined, 'Measurement must not include a Referer header');
        assert.equal(headers.cookie, undefined, 'Measurement must omit the synthetic ambient cookie');
        assert.equal(headers['x-s5-consent'], 'granted');
        assert.equal(headers['x-s5-policy-revision'], policyRevision);
        assert.equal(payload.locale, testCase.locale);
        assert.equal(payload.page_path, testCase.path);
        assert.equal(payload.landing_path, testCase.path);
        assert.equal(payload.traffic_channel, 'organic_search');
        assert.equal(payload.referrer_host, 'google.com');
        assert.equal(JSON.stringify(payload.context).includes('23500'), false);
        for (const marker of ['local-query-sentinel', 'local-fragment-sentinel', 'local-referrer-sentinel', 'local-qa-cookie-sentinel']) {
          assert.equal(JSON.stringify(payload).includes(marker), false, 'URL, referrer, cookie and input values must remain outside analytics');
        }
        assert.equal(Object.hasOwn(payload.context, 'value'), false);
      }
      assert.equal((await storageState(page)).status.lastDelivery, 'accepted');

      await page.locator('#s5-measurement-preferences').click();
      await page.locator('[data-s5-consent="denied"]').click();
      await settle(page);
      const beforeWithdrawalChange = captured.length;
      await input.fill('24000');
      await input.press('Tab');
      await settle(page);
      assert.equal(captured.length, beforeWithdrawalChange, 'A real subsequent change must not send after withdrawal');
      const denied = await storageState(page);
      assert.equal(denied.session, null);
      assert.equal(denied.consent, `${policyRevision}:denied`);
      assert.equal(denied.status.consent, 'denied');
      assert.equal(await page.evaluate(() => window.s5Measurement.track('result_rendered', {
        tool_id: 'model-price-performance', result_kind: 'comparison',
      })), false);
      assert.equal(captured.length, beforeWithdrawalChange);
      const unexpectedErrors = pageErrors.filter((error) => !error.stack.includes('/javascripts/mathjax.js:'));
      assert.deepEqual(unexpectedErrors, [], 'No runtime exception may be hidden by a successful analytics request');

      results.push({
        case: testCase.name, locale: testCase.locale, viewport: testCase.viewport,
        measurement_requests_before_consent: 0, session_identifier_before_consent: false,
        event_counts: Object.fromEntries([...new Set(captured.map(({ payload }) => payload.event_name))]
          .map((name) => [name, captured.filter(({ payload }) => payload.event_name === name).length])),
        actual_measurement_origin: ORIGIN, measurement_referer_present: false, measurement_cookie_present: false,
        query_fragment_referrer_and_input_values_excluded: true,
        no_default_or_invalid_conversion: true, withdrawal_stops_transmission: true,
        blocked_external_hosts: [...blockedHosts].sort(), missing_static_paths: [...missingStatic].sort(),
        // MathJax's existing subscription expects the intentionally blocked
        // unpkg runtime. Preserve that explicit isolation limitation in evidence.
        blocked_mathjax_dependency_errors: pageErrors.map((error) => error.message),
        consent_panel_bounds: panelBounds, expanded_consent_panel_bounds: expandedBounds,
        detailed_policy_and_withdrawal_buttons_reachable: true, screenshot,
      });
      console.log(`Chromium measurement ${testCase.name}: PASS`);
    } finally { await context.close(); }
  }
  const report = { synthetic_local_verification: true, browser: browser.version(), generated_at: new Date().toISOString(), results };
  await writeFile(join(outputRoot, 'verification.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Chromium measurement: PASS (${results.length} real-page cases; every request intercepted locally)`);
  console.log(`Screenshots and verification: ${outputRoot}`);
} finally { await browser.close(); }
