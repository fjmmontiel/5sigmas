#!/usr/bin/env node
/**
 * Security 00/1.1 runtime/resource listener lifetime gate.
 *
 * Runtime/resource events are retained through browser-context teardown and the
 * verdict is computed only from the final arrays. Chromium may legitimately
 * cancel an in-flight media request when a seek supersedes it, but that is only
 * accepted when the cancellation is correlated with the explicit seek phase,
 * the same media URL, a successful later 200/206 response and a settled media
 * state. Generic pre-teardown ERR_ABORTED events remain fatal.
 *
 * Technical gate only: it never certifies PIXEL_REVIEW or PEDAGOGY_REVIEW.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const out = path.resolve('artifacts/security-requalification/runtime-listener-lifetime');
await fs.mkdir(out, { recursive: true });

function isSettledSeek(video) {
  return Boolean(
    video
    && video.seeked === true
    && Number.isFinite(video.duration)
    && video.duration > 1
    && Number.isFinite(video.seekTarget)
    && Math.abs(video.currentTime - video.seekTarget) <= 1.0
    && video.readyState >= 2
  );
}

function laterSuccessfulMediaResponse(event, record) {
  return (record.network_responses || []).some((response) => (
    response.seq > event.seq
    && response.url === event.url
    && [200, 206].includes(response.status)
  ));
}

function classifyRuntimeEvents(events, record) {
  const fatal = [];
  const expected = [];

  for (const event of events) {
    if (event.type !== 'requestfailed' || !String(event.detail || '').includes('ERR_ABORTED')) {
      fatal.push(event);
      continue;
    }

    if (event.phase === 'teardown') {
      expected.push({ ...event, classification: 'EXPECTED_CONTEXT_TEARDOWN_ABORT' });
      continue;
    }

    const provenSeekSupersession = (
      event.phase === 'media-seek'
      && event.resourceType === 'media'
      && record.video?.currentSrc === event.url
      && isSettledSeek(record.video)
      && laterSuccessfulMediaResponse(event, record)
    );
    if (provenSeekSupersession) {
      expected.push({ ...event, classification: 'EXPECTED_MEDIA_SEEK_SUPERSESSION' });
      continue;
    }

    fatal.push(event);
  }

  return { fatal, expected };
}

function runSelfTest() {
  const baseRecord = {
    video: {
      currentSrc: 'https://example.invalid/video.mp4',
      seeked: true,
      duration: 60,
      seekTarget: 12,
      currentTime: 12,
      readyState: 4,
    },
    network_responses: [
      { seq: 4, url: 'https://example.invalid/video.mp4', status: 206 },
    ],
  };

  const genericAbort = [{
    type: 'requestfailed', seq: 2, phase: 'interaction', resourceType: 'media',
    url: 'https://example.invalid/video.mp4', detail: 'net::ERR_ABORTED',
  }];
  if (classifyRuntimeEvents(genericAbort, baseRecord).fatal.length !== 1) {
    throw new Error('generic pre-teardown ERR_ABORTED mutation escaped');
  }

  const seekAbort = [{
    type: 'requestfailed', seq: 2, phase: 'media-seek', resourceType: 'media',
    url: 'https://example.invalid/video.mp4', detail: 'net::ERR_ABORTED',
  }];
  const seekResult = classifyRuntimeEvents(seekAbort, baseRecord);
  if (seekResult.fatal.length !== 0 || seekResult.expected.length !== 1) {
    throw new Error('proven media-seek supersession fixture was rejected');
  }

  const noLaterResponse = { ...baseRecord, network_responses: [{ seq: 1, url: baseRecord.video.currentSrc, status: 206 }] };
  if (classifyRuntimeEvents(seekAbort, noLaterResponse).fatal.length !== 1) {
    throw new Error('media-seek abort without later successful response escaped');
  }

  const wrongUrl = { ...baseRecord, video: { ...baseRecord.video, currentSrc: 'https://example.invalid/other.mp4' } };
  if (classifyRuntimeEvents(seekAbort, wrongUrl).fatal.length !== 1) {
    throw new Error('media-seek abort for the wrong source escaped');
  }

  const unsettled = { ...baseRecord, video: { ...baseRecord.video, seeked: false } };
  if (classifyRuntimeEvents(seekAbort, unsettled).fatal.length !== 1) {
    throw new Error('unsettled media-seek abort escaped');
  }

  const teardownAbort = [{
    type: 'requestfailed', seq: 5, phase: 'teardown', resourceType: 'media',
    url: baseRecord.video.currentSrc, detail: 'net::ERR_ABORTED',
  }];
  if (classifyRuntimeEvents(teardownAbort, baseRecord).fatal.length !== 0) {
    throw new Error('context-teardown ERR_ABORTED fixture was rejected');
  }

  const nonAbort = [{
    type: 'requestfailed', seq: 2, phase: 'media-seek', resourceType: 'media',
    url: baseRecord.video.currentSrc, detail: 'net::ERR_FAILED',
  }];
  if (classifyRuntimeEvents(nonAbort, baseRecord).fatal.length !== 1) {
    throw new Error('non-abort request failure escaped');
  }

  const lateConsole = [{ type: 'console', seq: 8, phase: 'teardown', detail: 'synthetic late failure' }];
  if (classifyRuntimeEvents(lateConsole, baseRecord).fatal.length !== 1) {
    throw new Error('late non-request runtime mutation escaped');
  }

  console.log('Security runtime-listener lifetime mutation fixtures PASS: generic pre-teardown aborts remain fatal; only context teardown or a same-source, settled seek with a later successful 200/206 media response can classify ERR_ABORTED as expected.');
}

if (process.argv.includes('--self-test')) {
  runSelfTest();
  process.exit(0);
}

const routes = [
  { locale: 'es', kind: 'presentation', route: '/series/seguridad-ia/00_presentacion_serie/' },
  { locale: 'en', kind: 'presentation', route: '/en/series/seguridad-ia/00_presentacion_serie/' },
  { locale: 'es', kind: 'prompt', route: '/series/seguridad-ia/01-prompt-injection/' },
  { locale: 'en', kind: 'prompt', route: '/en/series/seguridad-ia/01-prompt-injection/' },
];

const failures = [];
const evidence = [];
const fail = (context, reason, detail = null) => failures.push({ context, reason, detail });

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

async function activate(locator, mobile) {
  await locator.scrollIntoViewIfNeeded();
  if (mobile) await locator.tap({ timeout: 5000 });
  else await locator.click({ timeout: 5000 });
}

async function waitForStep(page, selector, step, timeout = 6000) {
  await page.waitForFunction(
    ({ selector, step }) => document.querySelector(selector)?.dataset.step === String(step),
    { selector, step },
    { timeout },
  );
}

async function exercisePresentation(page, mobile, contextLabel, record) {
  const root = page.locator('.secpath').first();
  if (!(await root.count())) {
    fail(contextLabel, 'presentation-mechanism-missing');
    return;
  }
  const unbounded = root.locator('[data-mode-btn="unbounded"]').first();
  const play = root.locator('[data-action="play"]').first();
  if (!(await unbounded.count()) || !(await play.count())) {
    fail(contextLabel, 'presentation-controls-missing');
    return;
  }
  await activate(unbounded, mobile);
  if ((await root.getAttribute('data-mode')) !== 'unbounded') {
    fail(contextLabel, 'presentation-unbounded-mode-did-not-activate');
  }
  await activate(play, mobile);
  try {
    await page.waitForFunction(() => document.querySelector('.secpath')?.dataset.step === '6', { timeout: 6500 });
  } catch (error) {
    fail(contextLabel, 'presentation-trajectory-did-not-reach-final-state', String(error));
  }
  record.presentation = {
    mode: await root.getAttribute('data-mode'),
    step: await root.getAttribute('data-step'),
  };
}

async function exercisePrompt(page, mobile, contextLabel, record) {
  const ctxmix = page.locator('.ctxmix').first();
  const rag = page.locator('.ragtrace').first();
  const defsim = page.locator('.defsim').first();
  if (!(await ctxmix.count()) || !(await rag.count()) || !(await defsim.count())) {
    fail(contextLabel, 'prompt-mechanism-missing', {
      ctxmix: await ctxmix.count(), rag: await rag.count(), defsim: await defsim.count(),
    });
    return;
  }

  const ctxStates = [];
  for (const state of ['1', '2', '3', '4']) {
    const button = ctxmix.locator(`[data-state-btn="${state}"]`).first();
    if (!(await button.count())) {
      fail(contextLabel, `ctxmix-state-${state}-control-missing`);
      continue;
    }
    await activate(button, mobile);
    await page.waitForTimeout(60);
    const actual = await ctxmix.getAttribute('data-state');
    ctxStates.push(actual);
    if (actual !== state) fail(contextLabel, `ctxmix-state-${state}-did-not-activate`, { actual });
  }

  const ragModes = [];
  for (const mode of ['clean', 'poisoned']) {
    const modeButton = rag.locator(`[data-mode-btn="${mode}"]`).first();
    const run = rag.locator('[data-run]').first();
    if (!(await modeButton.count()) || !(await run.count())) {
      fail(contextLabel, `rag-${mode}-controls-missing`);
      continue;
    }
    await activate(modeButton, mobile);
    await page.waitForTimeout(50);
    if ((await rag.getAttribute('data-mode')) !== mode) fail(contextLabel, `rag-${mode}-mode-did-not-activate`);
    await activate(run, mobile);
    try {
      await waitForStep(page, '.ragtrace', 2);
      await waitForStep(page, '.ragtrace', 3);
    } catch (error) {
      fail(contextLabel, `rag-${mode}-did-not-reach-final-state`, String(error));
    }
    ragModes.push({ mode, step: await rag.getAttribute('data-step') });
  }

  const disabledGates = [];
  const gates = defsim.locator('[data-gate]');
  const gateCount = await gates.count();
  if (gateCount < 4) fail(contextLabel, 'defense-gates-missing', { gateCount });
  for (let index = 0; index < gateCount; index += 1) {
    const gate = gates.nth(index);
    const key = await gate.getAttribute('data-gate');
    await activate(gate, mobile);
    await page.waitForTimeout(60);
    disabledGates.push(key);
  }

  record.prompt = {
    ctxmix_states: ctxStates,
    rag_modes: ragModes,
    disabled_defense_gates: disabledGates,
    final_defense_stop: await defsim.getAttribute('data-stop'),
  };
}

async function exerciseInlineVideo(page, mobile, contextLabel, record, trace) {
  const root = page.locator('article [data-s5-inline-video]').first();
  const poster = root.locator('[data-s5-inline-video-start]').first();
  const video = root.locator('[data-s5-inline-video-player]').first();
  if (!(await root.count()) || !(await poster.count()) || !(await video.count())) {
    fail(contextLabel, 'inline-video-surface-missing');
    return;
  }

  trace.phase = 'media-start';
  await activate(poster, mobile);
  try {
    await video.waitFor({ state: 'visible', timeout: 5000 });
  } catch (error) {
    fail(contextLabel, 'inline-video-not-visible-after-activation', String(error));
    return;
  }

  const playback = await video.evaluate(async (node) => {
    node.muted = true;
    node.volume = 0;
    if (node.readyState < 1) {
      await Promise.race([
        new Promise(resolve => node.addEventListener('loadedmetadata', resolve, { once: true })),
        new Promise(resolve => setTimeout(resolve, 3000)),
      ]);
    }
    const playPromise = node.play();
    if (playPromise && typeof playPromise.catch === 'function') await playPromise.catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 180));
    node.pause();
    return {
      currentSrc: node.currentSrc,
      readyState: node.readyState,
      networkState: node.networkState,
      duration: Number(node.duration),
      currentTime: Number(node.currentTime),
      paused: node.paused,
    };
  });

  let seekTarget = null;
  let seeked = false;
  if (Number.isFinite(playback.duration) && playback.duration > 1) {
    seekTarget = Math.min(Math.max(0.5, playback.duration * 0.2), playback.duration - 0.5);
    trace.phase = 'media-seek';
    seeked = await video.evaluate(async (node, target) => {
      let didSeek = false;
      await Promise.race([
        new Promise(resolve => {
          node.addEventListener('seeked', () => { didSeek = true; resolve(); }, { once: true });
          node.currentTime = target;
        }),
        new Promise(resolve => setTimeout(resolve, 2500)),
      ]);
      await new Promise(resolve => setTimeout(resolve, 120));
      return didSeek;
    }, seekTarget);
  }

  trace.phase = 'media-steady';
  const settled = await video.evaluate(node => ({
    currentSrc: node.currentSrc,
    readyState: node.readyState,
    networkState: node.networkState,
    duration: Number(node.duration),
    currentTime: Number(node.currentTime),
    paused: node.paused,
  }));

  const media = { ...settled, seekTarget, seeked };
  record.video = media;
  if (!(Number.isFinite(media.duration) && media.duration > 1)) fail(contextLabel, 'inline-video-duration-invalid', media);
  if (seekTarget !== null && (!seeked || Math.abs(media.currentTime - seekTarget) > 1.0)) {
    fail(contextLabel, 'inline-video-seek-did-not-settle', media);
  }
}

const launched = await launchBrowser();
try {
  for (const item of routes) {
    for (const width of [1440, 390]) {
      for (const motion of ['no-preference', 'reduce']) {
        const mobile = width === 390;
        const label = `${item.locale}/${item.kind}/${mobile ? 'mobile' : 'desktop'}/${motion}`;
        const record = {
          ...item,
          width,
          motion,
          mobile,
          engine: launched.engine,
          chrome_launch_error: launched.chromeError || null,
          verdict_basis: 'POST_CONTEXT_TEARDOWN_CORRELATED_REQUEST_LIFECYCLE',
          network_responses: [],
        };
        const runtime = [];
        const trace = { phase: 'navigation', seq: 0 };
        let context = null;

        const nextSeq = () => { trace.seq += 1; return trace.seq; };

        try {
          context = await launched.browser.newContext({
            viewport: { width, height: mobile ? 844 : 1000 },
            isMobile: mobile,
            hasTouch: mobile,
            reducedMotion: motion,
          });
          const page = await context.newPage();
          page.on('pageerror', error => runtime.push({ type: 'pageerror', seq: nextSeq(), phase: trace.phase, detail: String(error) }));
          page.on('console', message => {
            if (message.type() === 'error') runtime.push({ type: 'console', seq: nextSeq(), phase: trace.phase, detail: message.text() });
          });
          page.on('requestfailed', request => {
            runtime.push({
              type: 'requestfailed',
              seq: nextSeq(),
              phase: trace.phase,
              url: request.url(),
              resourceType: request.resourceType(),
              method: request.method(),
              detail: request.failure()?.errorText || '',
            });
          });
          page.on('response', async response => {
            const seq = nextSeq();
            const request = response.request();
            const headers = await response.allHeaders().catch(() => ({}));
            if (request.resourceType() === 'media' || /\.mp4(?:$|\?)/i.test(response.url())) {
              record.network_responses.push({
                seq,
                phase: trace.phase,
                url: response.url(),
                status: response.status(),
                resourceType: request.resourceType(),
                contentRange: headers['content-range'] || null,
                acceptRanges: headers['accept-ranges'] || null,
                contentLength: headers['content-length'] || null,
              });
            }
            if (response.status() >= 400) {
              runtime.push({ type: 'http', seq, phase: trace.phase, status: response.status(), url: response.url() });
            }
          });

          const response = await page.goto(new URL(item.route, base).href, { waitUntil: 'networkidle', timeout: 20000 });
          if (!response?.ok()) fail(label, 'page-http-failed', { status: response?.status() });
          trace.phase = 'lazy-scroll';
          await page.evaluate(async () => {
            await Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 1500))]);
            for (let y = 0; y < document.documentElement.scrollHeight; y += Math.max(innerHeight, 400)) {
              scrollTo(0, y);
              await new Promise(resolve => setTimeout(resolve, 20));
            }
            scrollTo(0, 0);
          });

          trace.phase = 'teaching-interactions';
          if (item.kind === 'presentation') await exercisePresentation(page, mobile, label, record);
          else await exercisePrompt(page, mobile, label, record);
          await exerciseInlineVideo(page, mobile, label, record, trace);

          trace.phase = 'post-media';
          await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});
          await page.waitForTimeout(150);
          record.runtime_before_teardown = [...runtime];
        } catch (error) {
          record.unhandled_error = { name: error?.name || 'Error', message: String(error?.message || error) };
          fail(label, 'unhandled-runtime-lifetime-exception', record.unhandled_error);
        } finally {
          if (context) {
            try {
              trace.phase = 'teardown';
              await context.close();
            } catch (error) {
              const detail = { name: error?.name || 'Error', message: String(error?.message || error) };
              record.context_close_error = detail;
              fail(label, 'browser-context-close-failed', detail);
            }
          }

          const finalRuntime = [...runtime];
          record.runtime_after_teardown = finalRuntime;
          record.teardown_appended_runtime = finalRuntime.slice((record.runtime_before_teardown || []).length);
          const classified = classifyRuntimeEvents(finalRuntime, record);
          record.expected_runtime_cancellations = classified.expected;
          record.fatal_runtime_errors = classified.fatal;
          if (classified.fatal.length) {
            fail(label, 'fatal-runtime-resource-errors-present-after-context-teardown', classified.fatal);
          }
          evidence.push(record);
        }
      }
    }
  }
} finally {
  await launched.browser.close();
}

const report = {
  engine: launched.engine,
  chrome_launch_error: launched.chromeError || null,
  verdict_basis: 'POST_CONTEXT_TEARDOWN_CORRELATED_REQUEST_LIFECYCLE',
  request_abort_policy: 'ERR_ABORTED is expected only for context teardown or a same-source media-seek supersession proven by settled seek state and a later successful 200/206 response.',
  contexts_expected: 16,
  contexts_observed: evidence.length,
  failures,
  evidence,
};
await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2));

if (evidence.length !== 16) {
  console.error(`Security runtime-listener lifetime gate FAILED: expected 16 contexts, observed ${evidence.length}`);
  process.exit(1);
}
if (failures.length) {
  console.error(`Security runtime-listener lifetime gate FAILED (${failures.length}) using ${launched.engine}`);
  for (const item of failures) console.error(`- ${item.context}: ${item.reason}${item.detail ? ` :: ${JSON.stringify(item.detail)}` : ''}`);
  process.exit(1);
}
console.log(`Security runtime-listener lifetime PASS using ${launched.engine}: 16 ES/EN Security 00/1.1 desktop/mobile normal/reduced contexts retained runtime/resource events through context teardown; generic pre-teardown ERR_ABORTED remained fatal, while any expected media cancellation had to be correlated to an explicit same-source seek, settled playback state and a later successful 200/206 response. PIXEL_REVIEW/PEDAGOGY_REVIEW remain editorial.`);
