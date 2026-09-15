#!/usr/bin/env node
/**
 * Fail closed on real keyboard traversal/focus visibility for Security 00/1.1.
 *
 * This is intentionally separate from click/touch geometry gates: controls must
 * be reached by actual Tab key traversal, expose :focus-visible, show a visible
 * focus treatment and respond to Enter without programmatic .focus() shortcuts.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const out = path.resolve('artifacts/security-requalification/keyboard-focus');
await fs.mkdir(out, { recursive: true });

const routes = [
  { locale: 'es', kind: 'presentation', route: '/series/seguridad-ia/00_presentacion_serie/' },
  { locale: 'en', kind: 'presentation', route: '/en/series/seguridad-ia/00_presentacion_serie/' },
  { locale: 'es', kind: 'prompt', route: '/series/seguridad-ia/01-prompt-injection/' },
  { locale: 'en', kind: 'prompt', route: '/en/series/seguridad-ia/01-prompt-injection/' },
];
const motions = ['no-preference', 'reduce'];
const failures = [];
const evidence = [];

function fail(message, detail = null) {
  failures.push({ message, detail });
}

function isExpectedTeardownCancellation(event) {
  return event.type === 'requestfailed'
    && event.phase === 'teardown'
    && String(event.detail || '').includes('ERR_ABORTED');
}

function classifyRuntime(events) {
  return {
    unexpected: events.filter(event => !isExpectedTeardownCancellation(event)),
    expectedTeardownCancellations: events.filter(isExpectedTeardownCancellation),
  };
}

function runRuntimeMutationSelfTest() {
  const cases = [
    {
      name: 'teardown ERR_ABORTED is expected context cancellation',
      event: { type: 'requestfailed', phase: 'teardown', detail: 'net::ERR_ABORTED' },
      expected: true,
    },
    {
      name: 'poster interaction ERR_ABORTED remains fatal',
      event: { type: 'requestfailed', phase: 'poster-play', detail: 'net::ERR_ABORTED' },
      expected: false,
    },
    {
      name: 'keyboard mechanism ERR_ABORTED remains fatal',
      event: { type: 'requestfailed', phase: 'mechanism-keyboard', detail: 'net::ERR_ABORTED' },
      expected: false,
    },
    {
      name: 'teardown non-abort request failure remains fatal',
      event: { type: 'requestfailed', phase: 'teardown', detail: 'net::ERR_FAILED' },
      expected: false,
    },
    {
      name: 'teardown pageerror remains fatal',
      event: { type: 'pageerror', phase: 'teardown', detail: 'late exception' },
      expected: false,
    },
    {
      name: 'teardown console error remains fatal',
      event: { type: 'console', phase: 'teardown', detail: 'late console error' },
      expected: false,
    },
    {
      name: 'teardown HTTP failure remains fatal',
      event: { type: 'http', phase: 'teardown', status: 500, url: 'https://example.invalid/fail' },
      expected: false,
    },
  ];
  const broken = cases.filter(item => isExpectedTeardownCancellation(item.event) !== item.expected);
  if (broken.length) {
    throw new Error(`Keyboard/focus runtime classification mutation self-test failed: ${broken.map(item => item.name).join(', ')}`);
  }
}

runRuntimeMutationSelfTest();

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

async function resetKeyboardOrigin(page) {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    document.body.setAttribute('tabindex', '-1');
    document.body.focus({ preventScroll: true });
  });
}

async function tabTo(page, locator, ctx, label) {
  if ((await locator.count()) !== 1 || !(await locator.isVisible())) {
    fail(`${ctx}: keyboard target missing/not visible: ${label}`);
    return null;
  }

  await resetKeyboardOrigin(page);
  let reached = false;
  let tabs = 0;
  for (; tabs < 220; tabs += 1) {
    await page.keyboard.press('Tab');
    reached = await locator.evaluate((node) => document.activeElement === node);
    if (reached) break;
  }
  await page.evaluate(() => document.body.removeAttribute('tabindex'));

  if (!reached) {
    fail(`${ctx}: Tab traversal did not reach ${label}`, { tabs });
    return null;
  }

  const focus = await locator.evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      focusVisible: node.matches(':focus-visible'),
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      outlineColor: style.outlineColor,
      outlineOffset: style.outlineOffset,
      boxShadow: style.boxShadow,
      activeTag: document.activeElement?.tagName || null,
    };
  });
  const outlinePx = Number.parseFloat(focus.outlineWidth) || 0;
  const visibleTreatment = (
    (focus.outlineStyle !== 'none' && outlinePx >= 1)
    || (focus.boxShadow && focus.boxShadow !== 'none')
  );
  if (!focus.focusVisible) fail(`${ctx}: ${label} reached by Tab but :focus-visible is false`, focus);
  if (!visibleTreatment) fail(`${ctx}: ${label} has no visible focus treatment`, focus);
  return { label, tabs: tabs + 1, ...focus };
}

async function keyboardActivate(page, locator, ctx, label) {
  const focus = await tabTo(page, locator, ctx, label);
  if (!focus) return null;
  await page.keyboard.press('Enter');
  await page.waitForTimeout(60);
  return focus;
}

const launched = await launchBrowser();
const browser = launched.browser;
try {
  for (const item of routes) {
    for (const motion of motions) {
      const ctx = `${item.locale}/${item.kind}/desktop/${motion}`;
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
        reducedMotion: motion,
      });
      const page = await context.newPage();
      const runtime = [];
      let phase = 'navigation';
      let seq = 0;
      let nextRequestId = 1;
      const requestIds = new WeakMap();
      const requestId = request => {
        if (!requestIds.has(request)) requestIds.set(request, nextRequestId++);
        return requestIds.get(request);
      };
      const pushRuntime = event => runtime.push({ seq: ++seq, phase, ...event });

      page.on('pageerror', error => pushRuntime({ type: 'pageerror', detail: String(error) }));
      page.on('console', message => {
        if (message.type() === 'error') pushRuntime({ type: 'console', detail: message.text() });
      });
      page.on('response', response => {
        if (response.status() >= 400) {
          const request = response.request();
          pushRuntime({
            type: 'http',
            requestId: requestId(request),
            resourceType: request.resourceType(),
            status: response.status(),
            url: response.url(),
          });
        }
      });
      page.on('requestfailed', request => {
        pushRuntime({
          type: 'requestfailed',
          requestId: requestId(request),
          resourceType: request.resourceType(),
          url: request.url(),
          detail: request.failure()?.errorText || 'unknown',
        });
      });

      phase = 'navigation';
      const response = await page.goto(new URL(item.route, base).href, {
        waitUntil: 'domcontentloaded',
        timeout: 20_000,
      });
      if (!response?.ok()) fail(`${ctx}: page HTTP failed`, { status: response?.status() });
      phase = 'font-settle';
      await page.evaluate(async () => {
        await Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 1500))]);
      });

      const record = {
        route: item.route,
        locale: item.locale,
        kind: item.kind,
        motion,
        engine: launched.engine,
        chrome_launch_error: launched.chromeError || null,
        focus: [],
      };

      phase = 'poster-play';
      const poster = page.locator('article [data-s5-inline-video-start]').first();
      const posterFocus = await keyboardActivate(page, poster, ctx, 'video poster/play control');
      if (posterFocus) {
        record.focus.push(posterFocus);
        const video = page.locator('article [data-s5-inline-video-player]').first();
        try {
          await video.waitFor({ state: 'visible', timeout: 4000 });
        } catch (error) {
          fail(`${ctx}: Enter on poster did not expose the video player`, String(error));
        }
      }

      phase = 'article-watch-focus';
      const watch = page.locator('article .s5-video-embed__watch a').first();
      const watchFocus = await tabTo(page, watch, ctx, 'article-to-watch link');
      if (watchFocus) record.focus.push(watchFocus);

      phase = 'mechanism-keyboard';
      if (item.kind === 'presentation') {
        const root = page.locator('.secpath').first();
        const unbounded = root.locator('[data-mode-btn="unbounded"]');
        const modeFocus = await keyboardActivate(page, unbounded, ctx, 'unbounded authorization mode');
        if (modeFocus) record.focus.push(modeFocus);
        if ((await root.getAttribute('data-mode')) !== 'unbounded') {
          fail(`${ctx}: Enter did not switch secpath to unbounded mode`);
        }
        if ((await unbounded.getAttribute('aria-pressed')) !== 'true') {
          fail(`${ctx}: unbounded mode did not expose aria-pressed=true`);
        }

        const play = root.locator('[data-action="play"]');
        const playFocus = await keyboardActivate(page, play, ctx, 'trajectory play control');
        if (playFocus) record.focus.push(playFocus);
        try {
          await page.waitForFunction(() => document.querySelector('.secpath')?.dataset.step === '6', { timeout: 6000 });
        } catch (error) {
          fail(`${ctx}: Enter on play did not drive the unbounded trajectory to external effect`, String(error));
        }
      } else {
        const root = page.locator('.ctxmix').first();
        const step4 = root.locator('[data-state-btn="4"]');
        const stepFocus = await keyboardActivate(page, step4, ctx, 'authorization/result mechanism step 4');
        if (stepFocus) record.focus.push(stepFocus);
        if ((await root.getAttribute('data-state')) !== '4') {
          fail(`${ctx}: Enter did not activate ctxmix state 4`);
        }
        if ((await step4.getAttribute('aria-pressed')) !== 'true') {
          fail(`${ctx}: ctxmix state 4 did not expose aria-pressed=true`);
        }
        const result = (await root.locator('[data-node="execution-result"]').innerText()).trim();
        const expected = item.locale === 'es' ? 'ACCIÓN DENEGADA' : 'ACTION DENIED';
        if (!result.includes(expected)) {
          fail(`${ctx}: keyboard-activated state 4 did not expose ${expected}`, { result });
        }
      }

      phase = 'settle';
      await page.waitForTimeout(150);
      phase = 'teardown';
      try {
        await context.close();
      } catch (error) {
        pushRuntime({ type: 'context-close', detail: String(error) });
      }

      const finalRuntime = runtime.map(event => ({ ...event }));
      const runtimeVerdict = classifyRuntime(finalRuntime);
      if (runtimeVerdict.unexpected.length) fail(`${ctx}: persistent runtime/resource errors`, runtimeVerdict.unexpected);
      record.runtime = finalRuntime;
      record.runtime_unexpected = runtimeVerdict.unexpected;
      record.expected_teardown_cancellations = runtimeVerdict.expectedTeardownCancellations;
      record.verdict_basis = 'POST_CONTEXT_TEARDOWN';
      evidence.push(record);
    }
  }
} finally {
  await browser.close();
}

await fs.writeFile(
  path.join(out, 'report.json'),
  JSON.stringify({ engine: launched.engine, chrome_launch_error: launched.chromeError || null, failures, evidence }, null, 2),
);

if (failures.length) {
  console.error(`Security keyboard/focus gate FAILED (${failures.length}) using ${launched.engine}`);
  for (const item of failures) console.error(`- ${item.message}${item.detail ? ` :: ${JSON.stringify(item.detail)}` : ''}`);
  process.exit(1);
}
console.log(`Security keyboard/focus PASS using ${launched.engine}: ES/EN Security 00/1.1 × normal/reduced motion reached by real Tab traversal, visible focus and Enter activation.`);
