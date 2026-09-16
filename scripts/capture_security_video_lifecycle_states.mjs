#!/usr/bin/env node
/**
 * Bounded manual-review evidence capture for the active Security00 article.
 *
 * This is deliberately NOT a MEDIA_PASS or BROWSER_PASS gate. The canonical
 * validate_security_video_lifecycle.mjs gate runs separately and owns strict
 * request-cancellation classification. This capture keeps error/resource
 * listeners alive through poster -> play -> pause -> seek -> end -> next and
 * retains small current-head JPEGs for human pixel/pedagogy inspection.
 *
 * The videos are muted only so browser policy cannot block deterministic visual
 * lifecycle capture. Muting is not audio evidence and cannot satisfy the
 * narration/captions/transcript requirements.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const out = path.resolve(process.env.S5_SECURITY_LIFECYCLE_STATE_DIR || 'artifacts/security-requalification/video-lifecycle-states');
const shotDir = path.join(out, 'screenshots');
await fs.mkdir(shotDir, { recursive: true });

const routes = [
  { locale: 'es', route: '/series/seguridad-ia/00_presentacion_serie/', next: '/series/seguridad-ia/01-prompt-injection/' },
  { locale: 'en', route: '/en/series/seguridad-ia/00_presentacion_serie/', next: '/en/series/seguridad-ia/01-prompt-injection/' },
];
const widths = [1440, 390];
const motions = ['no-preference', 'reduce'];
const failures = [];
const contexts = [];
const check = (ok, message, detail = null) => { if (!ok) failures.push({ message, detail }); };
const slug = (value) => String(value).replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-|-$/g, '');

async function launchBrowser() {
  try {
    return { browser: await chromium.launch({ channel: 'chrome', headless: true }), engine: 'google-chrome' };
  } catch (chromeError) {
    return { browser: await chromium.launch({ headless: true }), engine: 'playwright-chromium', chromeError: String(chromeError) };
  }
}

async function jpeg(locator, file) {
  await locator.screenshot({ path: file, type: 'jpeg', quality: 72, animations: 'disabled' });
}

async function captureRoot(root, record, state) {
  const filename = `${record.locale}-${record.mobile ? 'mobile' : 'desktop'}-${record.motion}-${state}.jpg`;
  const target = path.join(shotDir, filename);
  await jpeg(root, target);
  record.screenshots.push({ state, path: path.relative(out, target) });
}

async function captureViewport(page, record, state) {
  const filename = `${record.locale}-${record.mobile ? 'mobile' : 'desktop'}-${record.motion}-${state}.jpg`;
  const target = path.join(shotDir, filename);
  await page.screenshot({ path: target, type: 'jpeg', quality: 72, fullPage: false, animations: 'disabled' });
  record.screenshots.push({ state, path: path.relative(out, target) });
}

async function activatePoster(page, poster, mobile, ctx, record) {
  await poster.scrollIntoViewIfNeeded();
  if (mobile) {
    await poster.tap({ timeout: 5000 });
    record.activation = 'touch-tap';
    return;
  }
  await poster.focus();
  const focused = await poster.evaluate((node) => document.activeElement === node);
  check(focused, `${ctx}: poster did not receive keyboard focus`);
  await page.keyboard.press('Enter');
  record.activation = 'keyboard-enter';
}

async function snapshotMedia(video) {
  return video.evaluate((node) => ({
    currentSrc: node.currentSrc,
    currentTime: Number(node.currentTime || 0),
    duration: Number(node.duration),
    paused: Boolean(node.paused),
    ended: Boolean(node.ended),
    readyState: node.readyState,
    networkState: node.networkState,
    errorCode: node.error?.code ?? null,
  }));
}

const launched = await launchBrowser();
const browser = launched.browser;
try {
  for (const item of routes) {
    for (const width of widths) {
      for (const motion of motions) {
        const mobile = width === 390;
        const ctx = `${item.locale}/${mobile ? 'mobile' : 'desktop'}/${motion}`;
        const record = {
          ...item,
          width,
          mobile,
          motion,
          engine: launched.engine,
          chrome_launch_error: launched.chromeError || null,
          screenshots: [],
          runtime_events: [],
          verdict_basis: 'MANUAL_REVIEW_EVIDENCE_ONLY_CANONICAL_LIFECYCLE_GATE_RUNS_SEPARATELY',
          muted_for_visual_capture: true,
        };
        const context = await browser.newContext({
          viewport: { width, height: mobile ? 844 : 1000 },
          isMobile: mobile,
          hasTouch: mobile,
          reducedMotion: motion,
        });
        const page = await context.newPage();
        let phase = 'navigation';
        let seq = 0;
        const runtime = record.runtime_events;

        page.on('pageerror', error => runtime.push({ type: 'pageerror', seq: ++seq, phase, detail: String(error) }));
        page.on('console', message => {
          if (message.type() === 'error') runtime.push({ type: 'console', seq: ++seq, phase, detail: message.text() });
        });
        page.on('requestfailed', request => runtime.push({
          type: 'requestfailed', seq: ++seq, phase, resourceType: request.resourceType(),
          url: request.url(), detail: request.failure()?.errorText || '',
        }));
        page.on('response', response => {
          if (response.status() >= 400) runtime.push({
            type: 'http', seq: ++seq, phase, resourceType: response.request().resourceType(),
            status: response.status(), url: response.url(),
          });
        });

        try {
          const response = await page.goto(new URL(item.route, base).href, { waitUntil: 'domcontentloaded', timeout: 20000 });
          check(response?.ok(), `${ctx}: page HTTP failed`, { status: response?.status() });
          await page.evaluate(async () => {
            await Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 1500))]);
          });

          const root = page.locator('article [data-s5-inline-video]').first();
          const poster = root.locator('[data-s5-inline-video-start]').first();
          const video = root.locator('[data-s5-inline-video-player]').first();
          check((await root.count()) === 1, `${ctx}: inline video root missing`);
          check((await poster.count()) === 1, `${ctx}: poster control missing`);
          check((await video.count()) === 1, `${ctx}: video player missing`);
          if (!(await root.count()) || !(await poster.count()) || !(await video.count())) throw new Error('required inline video DOM missing');

          await root.scrollIntoViewIfNeeded();
          await video.evaluate((node) => {
            const events = [];
            for (const name of ['loadstart', 'loadedmetadata', 'canplay', 'playing', 'pause', 'seeking', 'seeked', 'ended', 'error']) {
              node.addEventListener(name, () => events.push({
                name,
                t: Number(node.currentTime || 0),
                readyState: node.readyState,
                networkState: node.networkState,
                errorCode: node.error?.code ?? null,
              }));
            }
            window.__s5LifecycleStateEvidence = events;
            node.muted = true;
            node.volume = 0;
          });

          check(await poster.isVisible(), `${ctx}: poster not visible at initial state`);
          check(!(await video.isVisible()), `${ctx}: player visible before activation`);
          await captureRoot(root, record, '01-poster');

          phase = 'play';
          await activatePoster(page, poster, mobile, ctx, record);
          await video.waitFor({ state: 'visible', timeout: 5000 });
          await page.waitForFunction(() => {
            const node = document.querySelector('article [data-s5-inline-video-player]');
            return Boolean(node && !node.paused && node.readyState >= 2 && node.currentTime > 0);
          }, { timeout: 9000 });
          await page.waitForTimeout(150);
          record.playing = await snapshotMedia(video);
          check(!record.playing.paused && record.playing.currentTime > 0 && record.playing.errorCode == null, `${ctx}: playing state invalid`, record.playing);
          await captureRoot(root, record, '02-playing');

          phase = 'pause';
          await video.evaluate(async (node) => {
            node.pause();
            await new Promise(resolve => setTimeout(resolve, 100));
          });
          record.paused = await snapshotMedia(video);
          check(record.paused.paused && record.paused.errorCode == null, `${ctx}: paused state invalid`, record.paused);
          await captureRoot(root, record, '03-paused');

          phase = 'seek';
          const duration = record.paused.duration;
          check(Number.isFinite(duration) && duration > 1, `${ctx}: invalid decoded duration`, record.paused);
          const seekTarget = Math.min(Math.max(0.5, duration * 0.25), duration - 0.5);
          const seekObserved = await video.evaluate(async (node, target) => {
            let observed = false;
            await Promise.race([
              new Promise(resolve => {
                node.addEventListener('seeked', () => { observed = true; resolve(); }, { once: true });
                node.currentTime = target;
              }),
              new Promise(resolve => setTimeout(resolve, 3000)),
            ]);
            return observed;
          }, seekTarget);
          record.seeked = await snapshotMedia(video);
          record.seeked.target = seekTarget;
          record.seeked.eventObserved = seekObserved;
          check(seekObserved && Math.abs(record.seeked.currentTime - seekTarget) <= 1.0 && record.seeked.paused, `${ctx}: seek state invalid`, record.seeked);
          await captureRoot(root, record, '04-seeked');

          phase = 'end';
          const endTarget = Math.max(0, duration - Math.min(0.35, duration / 4));
          await video.evaluate(async (node, target) => {
            await Promise.race([
              new Promise(resolve => {
                node.addEventListener('seeked', resolve, { once: true });
                node.currentTime = target;
              }),
              new Promise(resolve => setTimeout(resolve, 3000)),
            ]);
            const p = node.play();
            if (p && typeof p.catch === 'function') await p.catch(() => {});
          }, endTarget);
          await page.waitForFunction(() => {
            const rootNode = document.querySelector('article [data-s5-inline-video]');
            const node = rootNode?.querySelector('[data-s5-inline-video-player]');
            const events = window.__s5LifecycleStateEvidence || [];
            return Boolean(rootNode && node && events.some(event => event.name === 'ended') && !rootNode.classList.contains('is-playing') && node.paused && node.currentTime < 0.5);
          }, { timeout: 9000 });
          record.ended = await root.evaluate((rootNode) => {
            const node = rootNode.querySelector('[data-s5-inline-video-player]');
            const start = rootNode.querySelector('[data-s5-inline-video-start]');
            const events = window.__s5LifecycleStateEvidence || [];
            return {
              endedEvent: events.some(event => event.name === 'ended'),
              isPlaying: rootNode.classList.contains('is-playing'),
              currentTime: Number(node?.currentTime || 0),
              paused: Boolean(node?.paused),
              playerVisible: Boolean(node && getComputedStyle(node).display !== 'none' && getComputedStyle(node).visibility !== 'hidden'),
              posterVisible: Boolean(start && getComputedStyle(start).display !== 'none' && getComputedStyle(start).visibility !== 'hidden'),
              events,
            };
          });
          check(record.ended.endedEvent && !record.ended.isPlaying && record.ended.paused && record.ended.currentTime < 0.5 && record.ended.posterVisible, `${ctx}: ended/reset state invalid`, record.ended);
          await captureRoot(root, record, '05-ended-reset');

          const next = page.locator('.s5-reader-end__next').first();
          check((await next.count()) === 1, `${ctx}: next CTA missing`);
          if (!(await next.count())) throw new Error('reader next CTA missing');
          const href = await next.getAttribute('href');
          const nextPath = href ? new URL(href, page.url()).pathname : null;
          record.next_href = href;
          check(nextPath === item.next, `${ctx}: next target drifted`, { expected: item.next, actual: nextPath });
          if (nextPath !== item.next) throw new Error('next route mismatch');

          phase = 'next-navigation';
          await next.scrollIntoViewIfNeeded();
          if (mobile) {
            await next.tap({ timeout: 5000 });
            record.next_activation = 'touch-tap';
          } else {
            await next.focus();
            check(await next.evaluate(node => document.activeElement === node), `${ctx}: next CTA did not receive keyboard focus`);
            await page.keyboard.press('Enter');
            record.next_activation = 'keyboard-enter';
          }
          await page.waitForURL(url => url.pathname === item.next, { timeout: 8000 });
          record.next_navigation = new URL(page.url()).pathname;
          check(record.next_navigation === item.next, `${ctx}: next navigation failed`, record.next_navigation);
          await page.evaluate(async () => {
            await Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 1000))]);
          });
          await captureViewport(page, record, '06-next-article');
        } catch (error) {
          record.unhandled_error = { name: error?.name || 'Error', message: String(error?.message || error) };
          failures.push({ message: `${ctx}: lifecycle state capture exception`, detail: record.unhandled_error });
        } finally {
          phase = 'teardown';
          try {
            await context.close();
          } catch (error) {
            failures.push({ message: `${ctx}: browser context close failed`, detail: String(error) });
          }
          record.runtime_unexpected = runtime.filter(event => (
            event.type === 'pageerror'
            || event.type === 'console'
            || event.type === 'http'
            || (event.type === 'requestfailed' && !(event.resourceType === 'media' && String(event.detail || '').includes('ERR_ABORTED')))
          ));
          check(record.runtime_unexpected.length === 0, `${ctx}: unexpected runtime/resource errors during retained capture`, record.runtime_unexpected);
          contexts.push(record);
        }
      }
    }
  }
} finally {
  await browser.close();
}

const report = {
  captured_at: new Date().toISOString(),
  scope: 'security-00-video-lifecycle-state-pixels',
  engine: launched.engine,
  chrome_launch_error: launched.chromeError || null,
  expected_contexts: routes.length * widths.length * motions.length,
  contexts_observed: contexts.length,
  expected_screenshots_per_context: 6,
  screenshots_observed: contexts.reduce((sum, row) => sum + row.screenshots.length, 0),
  media_audio_evidence: false,
  media_pass: false,
  pixel_review: 'PENDING_MANUAL_INSPECTION',
  pedagogy_review: 'PENDING_MANUAL_INSPECTION',
  failures,
  contexts,
};
await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2));

if (failures.length) {
  console.error(`Security00 lifecycle state capture FAILED (${failures.length}) using ${launched.engine}`);
  for (const failure of failures) console.error(`- ${failure.message}${failure.detail ? ` :: ${JSON.stringify(failure.detail)}` : ''}`);
  process.exit(1);
}
console.log(`Security00 lifecycle state capture PASS: ${contexts.length} contexts, ${report.screenshots_observed} retained JPEGs; manual PIXEL/PEDAGOGY review still required; MEDIA_PASS remains false.`);
