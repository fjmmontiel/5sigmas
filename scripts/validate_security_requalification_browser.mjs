#!/usr/bin/env node
/** Focused technical gate for Security 00/01. Pixel/pedagogy review remains manual. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const out = path.resolve('artifacts/security-requalification');
await fs.mkdir(out, { recursive: true });

const routes = [
  { locale: 'es', kind: 'presentation', route: '/series/seguridad-ia/00_presentacion_serie/' },
  { locale: 'en', kind: 'presentation', route: '/en/series/seguridad-ia/00_presentacion_serie/' },
  { locale: 'es', kind: 'prompt', route: '/series/seguridad-ia/01-prompt-injection/' },
  { locale: 'en', kind: 'prompt', route: '/en/series/seguridad-ia/01-prompt-injection/' },
];

const failures = [];
const evidence = [];
const check = (ok, message, detail = null) => { if (!ok) failures.push({ message, detail }); };
const overlap = (a, b, pad = 1) => Boolean(a && b && a.x < b.x + b.width - pad && a.x + a.width > b.x + pad && a.y < b.y + b.height - pad && a.y + a.height > b.y + pad);

async function launchBrowser() {
  try {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    return { browser, engine: 'google-chrome' };
  } catch (chromeError) {
    const browser = await chromium.launch({ headless: true });
    return { browser, engine: 'playwright-chromium', chromeError: String(chromeError) };
  }
}

async function activate(locator, mobile) {
  await locator.scrollIntoViewIfNeeded();
  if (mobile) await locator.tap({ timeout: 5000 });
  else await locator.click({ timeout: 5000 });
}

async function inspectVideo(page, ctx, record) {
  const root = page.locator('article [data-s5-inline-video]').first();
  if (!(await root.count())) {
    failures.push({ message: `${ctx}: video embed missing` });
    return;
  }
  const poster = root.locator('[data-s5-inline-video-start]').first();
  const video = root.locator('[data-s5-inline-video-player]').first();
  const source = video.locator('source').first();
  check((await poster.count()) === 1, `${ctx}: poster control missing`);
  check((await video.count()) === 1, `${ctx}: video player missing`);
  if (!(await video.count())) return;

  const sourceValue = await source.getAttribute('src');
  check(Boolean(sourceValue), `${ctx}: video source missing`);
  if (sourceValue) {
    const mediaUrl = new URL(sourceValue, page.url()).href;
    const range = await page.request.get(mediaUrl, { headers: { Range: 'bytes=0-1023' }, timeout: 10000 });
    record.media_url = mediaUrl;
    record.range_status = range.status();
    check([200,206].includes(range.status()), `${ctx}: video Range fetch failed`, { status: range.status(), mediaUrl });
  }

  record.codec = await video.evaluate(node => ({
    genericMp4: node.canPlayType('video/mp4'),
    h264Baseline: node.canPlayType('video/mp4; codecs="avc1.42E01E"'),
    h264Main: node.canPlayType('video/mp4; codecs="avc1.4D401F"'),
    readyState: node.readyState,
    networkState: node.networkState,
  }));

  const events = await video.evaluate(node => {
    const log = [];
    for (const name of ['loadstart','loadedmetadata','canplay','playing','pause','seeked','error']) {
      node.addEventListener(name, () => log.push({ name, t: Number(node.currentTime || 0), readyState: node.readyState, networkState: node.networkState, error: node.error ? { code: node.error.code, message: node.error.message } : null }));
    }
    window.__s5SecurityVideoEvents = log;
    node.muted = true;
    node.volume = 0;
    return log;
  });
  void events;

  check(await poster.isVisible(), `${ctx}: poster not initially visible`);
  check(!(await video.isVisible()), `${ctx}: player visible before poster activation`);
  await activate(poster, record.mobile);
  await video.waitFor({ state: 'visible', timeout: 5000 });

  let playbackError = null;
  try {
    await page.waitForFunction(() => {
      const node = document.querySelector('article [data-s5-inline-video-player]');
      return Boolean(node && (node.currentTime > 0 || (!node.paused && node.readyState >= 2)));
    }, { timeout: 9000 });
  } catch (error) {
    playbackError = String(error);
  }

  const media = await video.evaluate(async node => {
    const snapshot = () => ({
      duration: Number(node.duration), currentTime: Number(node.currentTime), paused: node.paused,
      videoWidth: node.videoWidth, videoHeight: node.videoHeight, readyState: node.readyState,
      networkState: node.networkState,
      error: node.error ? { code: node.error.code, message: node.error.message } : null,
      events: window.__s5SecurityVideoEvents || [],
    });
    if (node.currentTime > 0 || !node.paused) {
      node.pause();
      const duration = Number(node.duration);
      if (Number.isFinite(duration) && duration > 1) {
        const target = Math.min(Math.max(.25, duration * .25), duration - .25);
        await Promise.race([
          new Promise(resolve => { node.addEventListener('seeked', resolve, { once: true }); node.currentTime = target; }),
          new Promise(resolve => setTimeout(resolve, 3000)),
        ]);
      }
    }
    return snapshot();
  });
  record.media = media;

  if (playbackError) {
    const unsupported = !record.codec.genericMp4 && !record.codec.h264Baseline && !record.codec.h264Main;
    if (record.engine === 'playwright-chromium' && unsupported) {
      failures.push({ message: `${ctx}: BROWSER_HARNESS_CODEC_UNSUPPORTED`, detail: { playbackError, codec: record.codec, media } });
    } else {
      failures.push({ message: `${ctx}: VIDEO_PLAYBACK_ERROR`, detail: { playbackError, codec: record.codec, media } });
    }
    return;
  }

  check(Number.isFinite(media.duration) && media.duration > 0, `${ctx}: invalid video duration`, media);
  check(media.videoWidth > 0 && media.videoHeight > 0, `${ctx}: invalid decoded video dimensions`, media);
  check(media.paused, `${ctx}: pause lifecycle failed`, media);
}

async function inspectVisual(page, item, mobile, motion, record) {
  if (item.kind === 'presentation') {
    const root = page.locator('.secpath').first();
    check((await root.count()) === 1, `${item.locale}/${item.kind}/${mobile ? 'mobile' : 'desktop'}/${motion}: secpath missing`);
    if (!(await root.count())) return;
    const bounded = root.locator('[data-mode-btn="bounded"]');
    const unbounded = root.locator('[data-mode-btn="unbounded"]');
    const play = root.locator('[data-action="play"]');
    await activate(bounded, mobile);
    await activate(play, mobile);
    await page.waitForFunction(() => document.querySelector('.secpath')?.dataset.step === '5', { timeout: 5000 });
    check((await root.locator('[data-verdict]').innerText()).trim().length > 0, `${item.locale}/${item.kind}: bounded verdict empty`);
    await activate(unbounded, mobile);
    await activate(play, mobile);
    await page.waitForFunction(() => document.querySelector('.secpath')?.dataset.step === '6', { timeout: 5000 });
    const stage5 = await root.locator('[data-stage="auth"] .secpath__title').boundingBox();
    const badge = await root.locator('[data-boundary-label]').boundingBox();
    check(!overlap(stage5, badge), `${item.locale}/${item.kind}/${mobile ? 'mobile' : 'desktop'}: authorization badge overlaps stage title`, { stage5, badge });
  } else {
    const root = page.locator('.ctxmix').first();
    check((await root.count()) === 1, `${item.locale}/${item.kind}/${mobile ? 'mobile' : 'desktop'}/${motion}: ctxmix missing`);
    if (!(await root.count())) return;
    for (const step of ['2','3','4']) {
      await activate(root.locator(`[data-state-btn="${step}"]`), mobile);
      check((await root.getAttribute('data-state')) === step, `${item.locale}/${item.kind}: step ${step} did not activate`);
    }
    const sources = root.locator('.ctxmix__source');
    for (let i = 0; i < await sources.count(); i++) {
      const source = sources.nth(i);
      const badge = await source.locator('[data-trust-badge]').boundingBox();
      const title = await source.locator('[data-source-title]').boundingBox();
      check(!overlap(badge, title), `${item.locale}/${item.kind}/${mobile ? 'mobile' : 'desktop'}: trust badge overlaps source title`, { i, badge, title });
    }
    check(await root.locator('[data-node="authorization-gate"]').isVisible(), `${item.locale}/${item.kind}: authorization gate not visible at step 4`);
    check(await root.locator('[data-node="execution-result"]').isVisible(), `${item.locale}/${item.kind}: execution result not visible at step 4`);
  }

  if (motion === 'reduce') {
    const active = await page.locator(item.kind === 'presentation' ? '.secpath' : '.ctxmix').evaluate(root => root.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length);
    check(active === 0, `${item.locale}/${item.kind}/${mobile ? 'mobile' : 'desktop'}: animations still running under reduced motion`, { active });
  }
  record.interaction_review = 'AUTOMATED_TECHNICAL_ONLY';
}

const launched = await launchBrowser();
const browser = launched.browser;
try {
  for (const item of routes) {
    for (const width of [1440, 390]) {
      for (const motion of ['no-preference','reduce']) {
        const mobile = width === 390;
        const ctx = `${item.locale}/${item.kind}/${mobile ? 'mobile' : 'desktop'}/${motion}`;
        const record = { ...item, width, motion, mobile, engine: launched.engine, chrome_launch_error: launched.chromeError || null, pixel_review: 'PENDING', pedagogy_review: 'PENDING' };
        const context = await browser.newContext({ viewport: { width, height: mobile ? 844 : 1000 }, isMobile: mobile, hasTouch: mobile, reducedMotion: motion });
        const page = await context.newPage();
        const runtime = [];
        page.on('pageerror', e => runtime.push({ type:'pageerror', detail:String(e) }));
        page.on('requestfailed', r => { const detail=r.failure()?.errorText||''; if(!detail.includes('ERR_ABORTED')) runtime.push({ type:'requestfailed', url:r.url(), detail }); });
        page.on('response', r => { if(r.status() >= 400) runtime.push({ type:'http', status:r.status(), url:r.url() }); });
        const response = await page.goto(new URL(item.route, base).href, { waitUntil:'domcontentloaded', timeout:20000 });
        check(response?.ok(), `${ctx}: page HTTP failed`, { status: response?.status() });
        await page.evaluate(async () => { await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,1500))]); });
        await page.evaluate(async () => { for(let y=0;y<document.documentElement.scrollHeight;y+=Math.max(innerHeight,400)){scrollTo(0,y);await new Promise(r=>setTimeout(r,20));}scrollTo(0,0); });
        await page.waitForTimeout(150);
        const geometry = await page.evaluate(() => ({ scrollWidth:document.documentElement.scrollWidth, clientWidth:document.documentElement.clientWidth, lang:document.documentElement.lang }));
        check(geometry.scrollWidth <= geometry.clientWidth + 1, `${ctx}: page overflow`, geometry);
        check(geometry.lang.toLowerCase().startsWith(item.locale), `${ctx}: locale mismatch`, geometry);
        await inspectVisual(page, item, mobile, motion, record);
        await inspectVideo(page, ctx, record);
        check(runtime.length === 0, `${ctx}: persistent runtime/resource errors`, runtime);
        record.runtime = runtime;
        const stem = `${item.locale}-${item.kind}-${mobile?'mobile':'desktop'}-${motion}`;
        await page.screenshot({ path:path.join(out,`${stem}-page.png`), fullPage:true, animations:motion==='reduce'?'disabled':'allow' });
        const visual = page.locator(item.kind === 'presentation' ? '.secpath' : '.ctxmix').first();
        if(await visual.count()) await visual.screenshot({ path:path.join(out,`${stem}-visual.png`), animations:motion==='reduce'?'disabled':'allow' });
        evidence.push(record);
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}

await fs.writeFile(path.join(out,'report.json'), JSON.stringify({ engine:launched.engine, chrome_launch_error:launched.chromeError||null, failures, evidence }, null, 2));
if (failures.length) {
  console.error(`Security requalification browser gate FAILED (${failures.length}) using ${launched.engine}`);
  for (const f of failures) console.error(`- ${f.message}${f.detail ? ` :: ${JSON.stringify(f.detail)}` : ''}`);
  process.exit(1);
}
console.log(`Security requalification browser technical gate PASS using ${launched.engine}; PIXEL_REVIEW and PEDAGOGY_REVIEW remain PENDING.`);
