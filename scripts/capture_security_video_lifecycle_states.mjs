#!/usr/bin/env node
/**
 * Bounded manual-review evidence capture for Security00 and Security01.
 *
 * This is deliberately NOT a MEDIA_VISUAL_PASS or BROWSER_PASS gate. Canonical
 * validators run separately. This capture keeps error/resource listeners alive
 * through poster -> play -> pause -> seek -> end -> next and retains current-head
 * JPEGs for manual pixel/pedagogy review. It also samples six VISUAL video states
 * per locale/article so non-voice key moments can be curated from actual frames.
 *
 * Videos are muted only so browser policy cannot block deterministic visual
 * lifecycle capture. Muting is not audio evidence. No narration, transcript,
 * captions, or narration-derived timings are inferred here. Voice remains
 * DEFERRED_OWNER_LOCAL under owner amendment 5716685049.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const out = path.resolve(process.env.S5_SECURITY_LIFECYCLE_STATE_DIR || 'artifacts/security-requalification/video-lifecycle-states');
const shotDir = path.join(out, 'screenshots');
await fs.mkdir(shotDir, { recursive: true });

const routes = [
  { chapter: '00', locale: 'es', route: '/series/seguridad-ia/00_presentacion_serie/', next: '/series/seguridad-ia/01-prompt-injection/' },
  { chapter: '00', locale: 'en', route: '/en/series/seguridad-ia/00_presentacion_serie/', next: '/en/series/seguridad-ia/01-prompt-injection/' },
  { chapter: '01', locale: 'es', route: '/series/seguridad-ia/01-prompt-injection/', next: '/series/seguridad-ia/02-jailbreaks/' },
  { chapter: '01', locale: 'en', route: '/en/series/seguridad-ia/01-prompt-injection/', next: '/en/series/seguridad-ia/02-jailbreaks/' },
];
const widths = [1440, 390];
const motions = ['no-preference', 'reduce'];
const visualSampleFractions = [0.02, 0.2, 0.4, 0.6, 0.8, 0.98];
const failures = [];
const contexts = [];
const check = (ok, message, detail = null) => { if (!ok) failures.push({ message, detail }); };

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
  const filename = `security${record.chapter}-${record.locale}-${record.mobile ? 'mobile' : 'desktop'}-${record.motion}-${state}.jpg`;
  const target = path.join(shotDir, filename);
  await jpeg(root, target);
  record.screenshots.push({ state, path: path.relative(out, target) });
  return path.relative(out, target);
}

async function captureViewport(page, record, state) {
  const filename = `security${record.chapter}-${record.locale}-${record.mobile ? 'mobile' : 'desktop'}-${record.motion}-${state}.jpg`;
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
    videoWidth: Number(node.videoWidth || 0),
    videoHeight: Number(node.videoHeight || 0),
  }));
}

async function seekPaused(video, target) {
  return video.evaluate(async (node, t) => {
    node.pause();
    let observed = false;
    await Promise.race([
      new Promise(resolve => {
        node.addEventListener('seeked', () => { observed = true; resolve(); }, { once: true });
        node.currentTime = t;
      }),
      new Promise(resolve => setTimeout(resolve, 3000)),
    ]);
    await new Promise(resolve => setTimeout(resolve, 80));
    return { observed, currentTime: Number(node.currentTime || 0), paused: Boolean(node.paused), errorCode: node.error?.code ?? null };
  }, target);
}

const launched = await launchBrowser();
const browser = launched.browser;
try {
  for (const item of routes) {
    for (const width of widths) {
      for (const motion of motions) {
        const mobile = width === 390;
        const ctx = `security${item.chapter}/${item.locale}/${mobile ? 'mobile' : 'desktop'}/${motion}`;
        const record = {
          ...item,
          width,
          mobile,
          motion,
          engine: launched.engine,
          chrome_launch_error: launched.chromeError || null,
          screenshots: [],
          video_frame_samples: [],
          runtime_events: [],
          verdict_basis: 'MANUAL_REVIEW_EVIDENCE_ONLY_CANONICAL_GATES_RUN_SEPARATELY',
          muted_for_visual_capture: true,
          voice_enhancement: 'DEFERRED_OWNER_LOCAL',
          narration_or_transcript_inference: false,
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
          check(record.playing.videoWidth > 0 && record.playing.videoHeight > 0, `${ctx}: decoded video dimensions missing`, record.playing);
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
          const seekState = await seekPaused(video, seekTarget);
          record.seeked = { ...(await snapshotMedia(video)), target: seekTarget, eventObserved: seekState.observed };
          check(seekState.observed && Math.abs(record.seeked.currentTime - seekTarget) <= 1.0 && record.seeked.paused, `${ctx}: seek state invalid`, record.seeked);
          await captureRoot(root, record, '04-seeked');

          phase = 'visual-sampling';
          for (let sampleIndex = 0; sampleIndex < visualSampleFractions.length; sampleIndex++) {
            const fraction = visualSampleFractions[sampleIndex];
            const target = Math.min(Math.max(0.05, duration * fraction), Math.max(0.05, duration - 0.15));
            const state = await seekPaused(video, target);
            check(state.observed && state.errorCode == null, `${ctx}: visual frame seek failed`, { fraction, target, state });
            const label = `frame-${String(sampleIndex).padStart(2, '0')}-${String(Math.round(fraction * 100)).padStart(2, '0')}pct`;
            const screenshot = await captureRoot(root, record, label);
            record.video_frame_samples.push({
              fraction,
              requested_second: target,
              observed_second: state.currentTime,
              screenshot,
            });
          }

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
  scope: 'security-00-01-video-lifecycle-and-nonvoice-visual-key-moment-evidence',
  owner_amendment_comment: 5716685049,
  engine: launched.engine,
  chrome_launch_error: launched.chromeError || null,
  expected_contexts: routes.length * widths.length * motions.length,
  contexts_observed: contexts.length,
  expected_screenshots_per_context: 12,
  screenshots_observed: contexts.reduce((sum, row) => sum + row.screenshots.length, 0),
  expected_visual_samples_per_context: visualSampleFractions.length,
  visual_samples_observed: contexts.reduce((sum, row) => sum + row.video_frame_samples.length, 0),
  media_audio_evidence: false,
  voice_enhancement: 'DEFERRED_OWNER_LOCAL',
  voice_is_blocker: false,
  narration_or_transcript_inference: false,
  media_visual_review: 'PENDING_MANUAL_INSPECTION_OF_NATIVE_VIDEO_FRAMES_AND_METADATA',
  pixel_review: 'PENDING_MANUAL_INSPECTION',
  pedagogy_review: 'PENDING_MANUAL_INSPECTION',
  failures,
  contexts,
};
await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2));

if (failures.length) {
  console.error(`Security00/01 lifecycle + visual sampling FAILED (${failures.length}) using ${launched.engine}`);
  for (const failure of failures) console.error(`- ${failure.message}${failure.detail ? ` :: ${JSON.stringify(failure.detail)}` : ''}`);
  process.exit(1);
}
console.log(`Security00/01 lifecycle + visual sampling PASS: ${contexts.length} contexts, ${report.screenshots_observed} retained JPEGs, ${report.visual_samples_observed} non-voice video samples; manual MEDIA_VISUAL/PIXEL/PEDAGOGY review still required; VOICE stays DEFERRED_OWNER_LOCAL.`);
