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
      page.on('pageerror', error => runtime.push(`pageerror: ${error.message}`));
      page.on('console', message => {
        if (message.type() === 'error') runtime.push(`console: ${message.text()}`);
      });
      page.on('response', response => {
        if (response.status() >= 400) runtime.push(`http ${response.status()}: ${response.url()}`);
      });
      page.on('requestfailed', request => {
        const reason = request.failure()?.errorText || 'unknown';
        if (!reason.includes('ERR_ABORTED')) runtime.push(`requestfailed: ${request.url()} (${reason})`);
      });

      const response = await page.goto(new URL(item.route, base).href, {
        waitUntil: 'domcontentloaded',
        timeout: 20_000,
      });
      if (!response?.ok()) fail(`${ctx}: page HTTP failed`, { status: response?.status() });
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

      const watch = page.locator('article .s5-video-embed__watch a').first();
      const watchFocus = await tabTo(page, watch, ctx, 'article-to-watch link');
      if (watchFocus) record.focus.push(watchFocus);

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

      if (runtime.length) fail(`${ctx}: persistent runtime/resource errors`, runtime);
      record.runtime = runtime;
      evidence.push(record);
      await context.close();
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
