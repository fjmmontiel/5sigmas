#!/usr/bin/env node
/** Security 00/01 media lifecycle gate: keyboard/touch activation, pause/seek/end, then reader-next navigation. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const out = path.resolve('artifacts/security-requalification/video-lifecycle');
await fs.mkdir(out, { recursive: true });

const routes = [
  { locale: 'es', kind: 'presentation', route: '/series/seguridad-ia/00_presentacion_serie/', next: '/series/seguridad-ia/01-prompt-injection/' },
  { locale: 'en', kind: 'presentation', route: '/en/series/seguridad-ia/00_presentacion_serie/', next: '/en/series/seguridad-ia/01-prompt-injection/' },
  { locale: 'es', kind: 'prompt', route: '/series/seguridad-ia/01-prompt-injection/', next: '/series/seguridad-ia/02-jailbreaks/' },
  { locale: 'en', kind: 'prompt', route: '/en/series/seguridad-ia/01-prompt-injection/', next: '/en/series/seguridad-ia/02-jailbreaks/' },
];

const failures = [];
const evidence = [];
const check = (ok, message, detail = null) => { if (!ok) failures.push({ message, detail }); };

async function launchBrowser() {
  try {
    return { browser: await chromium.launch({ channel: 'chrome', headless: true }), engine: 'google-chrome' };
  } catch (chromeError) {
    return { browser: await chromium.launch({ headless: true }), engine: 'playwright-chromium', chromeError: String(chromeError) };
  }
}

async function activateStart(page, poster, mobile, ctx, record) {
  await poster.scrollIntoViewIfNeeded();
  if (mobile) {
    await poster.tap({ timeout: 5000 });
    record.activation = 'touch-tap';
    return;
  }
  await poster.focus();
  const focus = await poster.evaluate((node) => {
    const style = getComputedStyle(node);
    const play = node.querySelector('.s5-video-embed__play');
    const playStyle = play ? getComputedStyle(play) : null;
    return {
      active: document.activeElement === node,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      boxShadow: style.boxShadow,
      playTransform: playStyle?.transform || 'none',
    };
  });
  record.poster_focus = focus;
  check(focus.active, `${ctx}: poster did not receive keyboard focus`, focus);
  const focusVisible = (focus.outlineStyle && focus.outlineStyle !== 'none' && focus.outlineWidth !== '0px')
    || (focus.boxShadow && focus.boxShadow !== 'none')
    || (focus.playTransform && focus.playTransform !== 'none');
  check(Boolean(focusVisible), `${ctx}: poster focus is not visibly distinguishable`, focus);
  await page.keyboard.press('Enter');
  record.activation = 'keyboard-enter';
}

async function exerciseLifecycle(page, item, mobile, motion, record) {
  const ctx = `${item.locale}/${item.kind}/${mobile ? 'mobile' : 'desktop'}/${motion}`;
  const root = page.locator('article [data-s5-inline-video]').first();
  const poster = root.locator('[data-s5-inline-video-start]').first();
  const video = root.locator('[data-s5-inline-video-player]').first();
  check((await root.count()) === 1, `${ctx}: inline video root missing`);
  check((await poster.count()) === 1, `${ctx}: poster control missing`);
  check((await video.count()) === 1, `${ctx}: video player missing`);
  if (!(await root.count()) || !(await poster.count()) || !(await video.count())) return;

  await video.evaluate((node) => {
    const log = [];
    for (const name of ['loadstart','loadedmetadata','canplay','playing','pause','seeking','seeked','ended','error']) {
      node.addEventListener(name, () => log.push({
        name,
        t: Number(node.currentTime || 0),
        readyState: node.readyState,
        networkState: node.networkState,
        error: node.error ? { code: node.error.code, message: node.error.message } : null,
      }));
    }
    window.__s5SecurityLifecycle = log;
    node.muted = true;
    node.volume = 0;
  });

  check(await poster.isVisible(), `${ctx}: poster not initially visible`);
  check(!(await video.isVisible()), `${ctx}: player visible before activation`);
  await activateStart(page, poster, mobile, ctx, record);
  await video.waitFor({ state: 'visible', timeout: 5000 });
  await page.waitForFunction(() => {
    const node = document.querySelector('article [data-s5-inline-video-player]');
    return Boolean(node && (node.currentTime > 0 || (!node.paused && node.readyState >= 2)));
  }, { timeout: 9000 });

  const paused = await video.evaluate(async (node) => {
    node.pause();
    await new Promise(resolve => setTimeout(resolve, 80));
    return { paused: node.paused, currentTime: Number(node.currentTime), duration: Number(node.duration) };
  });
  record.paused = paused;
  check(paused.paused, `${ctx}: pause lifecycle failed`, paused);
  check(Number.isFinite(paused.duration) && paused.duration > 1, `${ctx}: invalid decoded duration`, paused);
  if (!(Number.isFinite(paused.duration) && paused.duration > 1)) return;

  const seekTarget = Math.min(Math.max(0.5, paused.duration * 0.25), paused.duration - 0.5);
  const seeked = await video.evaluate(async (node, target) => {
    await Promise.race([
      new Promise(resolve => { node.addEventListener('seeked', resolve, { once: true }); node.currentTime = target; }),
      new Promise(resolve => setTimeout(resolve, 3000)),
    ]);
    return { currentTime: Number(node.currentTime), paused: node.paused };
  }, seekTarget);
  record.seeked = seeked;
  check(Math.abs(seeked.currentTime - seekTarget) <= 1.0, `${ctx}: seek did not reach expected position`, { seekTarget, seeked });

  const ending = await video.evaluate(async (node) => {
    const duration = Number(node.duration);
    const target = Math.max(0, duration - Math.min(0.35, duration / 4));
    node.currentTime = target;
    await new Promise(resolve => node.addEventListener('seeked', resolve, { once: true }));
    const playPromise = node.play();
    if (playPromise && typeof playPromise.catch === 'function') await playPromise.catch(() => {});
    return { duration, target };
  });
  record.ending = ending;
  await page.waitForFunction(() => {
    const rootNode = document.querySelector('article [data-s5-inline-video]');
    const node = rootNode?.querySelector('[data-s5-inline-video-player]');
    return Boolean(rootNode && node && !rootNode.classList.contains('is-playing') && node.paused && node.currentTime < 0.5);
  }, { timeout: 9000 }).catch(() => {});

  const ended = await root.evaluate((rootNode) => {
    const node = rootNode.querySelector('[data-s5-inline-video-player]');
    const start = rootNode.querySelector('[data-s5-inline-video-start]');
    const style = node ? getComputedStyle(node) : null;
    const startStyle = start ? getComputedStyle(start) : null;
    return {
      isPlaying: rootNode.classList.contains('is-playing'),
      currentTime: Number(node?.currentTime || 0),
      paused: Boolean(node?.paused),
      playerDisplay: style?.display || '',
      playerVisibility: style?.visibility || '',
      posterDisplay: startStyle?.display || '',
      posterVisibility: startStyle?.visibility || '',
      events: window.__s5SecurityLifecycle || [],
    };
  });
  record.ended = ended;
  const endedEvent = ended.events.some((event) => event.name === 'ended');
  check(endedEvent, `${ctx}: ended event was not observed`, ended);
  check(!ended.isPlaying && ended.paused && ended.currentTime < 0.5, `${ctx}: ended state did not reset inline player`, ended);
  check(ended.posterDisplay !== 'none' && ended.posterVisibility !== 'hidden', `${ctx}: poster not restored after end`, ended);

  const next = page.locator('.s5-reader-end__next').first();
  check((await next.count()) === 1, `${ctx}: reader next CTA missing after video lifecycle`);
  if (!(await next.count())) return;
  const href = await next.getAttribute('href');
  const nextPath = href ? new URL(href, page.url()).pathname : null;
  record.next_href = href;
  check(nextPath === item.next, `${ctx}: reader next target drifted`, { expected: item.next, actual: nextPath });
  if (nextPath !== item.next) return;

  await next.scrollIntoViewIfNeeded();
  if (mobile) await next.tap({ timeout: 5000 });
  else {
    await next.focus();
    check(await next.evaluate(node => document.activeElement === node), `${ctx}: next CTA did not receive keyboard focus`);
    await page.keyboard.press('Enter');
  }
  await page.waitForURL(url => url.pathname === item.next, { timeout: 8000 });
  record.next_navigation = new URL(page.url()).pathname;
  check(record.next_navigation === item.next, `${ctx}: next navigation did not reach expected article`, record.next_navigation);
}

const launched = await launchBrowser();
const browser = launched.browser;
try {
  for (const item of routes) {
    for (const width of [1440, 390]) {
      for (const motion of ['no-preference', 'reduce']) {
        const mobile = width === 390;
        const ctx = `${item.locale}/${item.kind}/${mobile ? 'mobile' : 'desktop'}/${motion}`;
        const record = { ...item, width, motion, mobile, engine: launched.engine, chrome_launch_error: launched.chromeError || null };
        const context = await browser.newContext({ viewport: { width, height: mobile ? 844 : 1000 }, isMobile: mobile, hasTouch: mobile, reducedMotion: motion });
        const page = await context.newPage();
        const runtime = [];
        page.on('pageerror', error => runtime.push({ type: 'pageerror', detail: String(error) }));
        page.on('requestfailed', request => {
          const detail = request.failure()?.errorText || '';
          if (!detail.includes('ERR_ABORTED')) runtime.push({ type: 'requestfailed', url: request.url(), detail });
        });
        page.on('response', response => { if (response.status() >= 400) runtime.push({ type: 'http', status: response.status(), url: response.url() }); });
        const response = await page.goto(new URL(item.route, base).href, { waitUntil: 'domcontentloaded', timeout: 20000 });
        check(response?.ok(), `${ctx}: page HTTP failed`, { status: response?.status() });
        await page.evaluate(async () => { await Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 1500))]); });
        await exerciseLifecycle(page, item, mobile, motion, record);
        check(runtime.length === 0, `${ctx}: persistent runtime/resource errors during lifecycle/navigation`, runtime);
        record.runtime = runtime;
        evidence.push(record);
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}

await fs.writeFile(path.join(out, 'report.json'), JSON.stringify({ engine: launched.engine, chrome_launch_error: launched.chromeError || null, failures, evidence }, null, 2));
if (failures.length) {
  console.error(`Security video lifecycle gate FAILED (${failures.length}) using ${launched.engine}`);
  for (const failure of failures) console.error(`- ${failure.message}${failure.detail ? ` :: ${JSON.stringify(failure.detail)}` : ''}`);
  process.exit(1);
}
console.log(`Security video lifecycle technical gate PASS using ${launched.engine}.`);
