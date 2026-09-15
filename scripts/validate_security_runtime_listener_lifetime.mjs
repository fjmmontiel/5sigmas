#!/usr/bin/env node
/**
 * Security 00/1.1 runtime/resource listener lifetime gate.
 *
 * The verdict is computed only after browser-context teardown. Chromium can
 * cancel an in-flight media request when an explicit seek supersedes the
 * current load. Such ERR_ABORTED events are accepted only when request
 * lifecycle evidence proves one of two same-source patterns:
 *   1) the failed media request had already produced successful 200/206
 *      response headers before the seek cancelled its body, or
 *   2) a later successful 200/206 media response superseded the failed request.
 * In both cases the explicit seek must settle and post-seek playback must
 * advance without a media error. Generic aborts remain fatal.
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
    && video.networkState !== 3
    && video.errorCode == null
    && video.postSeekPlaybackAdvanced === true
  );
}

function matchingSuccessfulResponse(event, record) {
  const responses = record.network_responses || [];
  const priorSameRequest = responses.some((response) => (
    response.seq < event.seq
    && response.requestId === event.requestId
    && response.url === event.url
    && [200, 206].includes(response.status)
  ));
  const laterSameSource = responses.some((response) => (
    response.seq > event.seq
    && response.url === event.url
    && [200, 206].includes(response.status)
  ));
  return { priorSameRequest, laterSameSource, proven: priorSameRequest || laterSameSource };
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

    const responseProof = matchingSuccessfulResponse(event, record);
    const provenSeekSupersession = (
      event.phase === 'media-seek'
      && event.resourceType === 'media'
      && record.video?.currentSrc === event.url
      && isSettledSeek(record.video)
      && responseProof.proven
    );
    if (provenSeekSupersession) {
      expected.push({
        ...event,
        classification: responseProof.priorSameRequest
          ? 'EXPECTED_MEDIA_SEEK_CANCEL_AFTER_RESPONSE_HEADERS'
          : 'EXPECTED_MEDIA_SEEK_SUPERSEDED_BY_LATER_RESPONSE',
      });
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
      networkState: 1,
      errorCode: null,
      postSeekPlaybackAdvanced: true,
    },
    network_responses: [
      { seq: 1, requestId: 'media-1', url: 'https://example.invalid/video.mp4', status: 206 },
    ],
  };
  const seekAbort = [{
    type: 'requestfailed', seq: 2, requestId: 'media-1', phase: 'media-seek', resourceType: 'media',
    url: 'https://example.invalid/video.mp4', detail: 'net::ERR_ABORTED',
  }];

  const genericAbort = [{ ...seekAbort[0], phase: 'interaction' }];
  if (classifyRuntimeEvents(genericAbort, baseRecord).fatal.length !== 1) {
    throw new Error('generic pre-teardown ERR_ABORTED mutation escaped');
  }

  const provenPriorResponse = classifyRuntimeEvents(seekAbort, baseRecord);
  if (provenPriorResponse.fatal.length !== 0 || provenPriorResponse.expected.length !== 1) {
    throw new Error('same-request response-then-seek cancellation fixture was rejected');
  }

  const laterResponseRecord = {
    ...baseRecord,
    network_responses: [{ seq: 3, requestId: 'media-2', url: baseRecord.video.currentSrc, status: 206 }],
  };
  if (classifyRuntimeEvents(seekAbort, laterResponseRecord).fatal.length !== 0) {
    throw new Error('later same-source superseding response fixture was rejected');
  }

  const differentRequest = {
    ...baseRecord,
    network_responses: [{ seq: 1, requestId: 'other-request', url: baseRecord.video.currentSrc, status: 206 }],
  };
  if (classifyRuntimeEvents(seekAbort, differentRequest).fatal.length !== 1) {
    throw new Error('unrelated prior response escaped request correlation');
  }

  const noResponse = { ...baseRecord, network_responses: [] };
  if (classifyRuntimeEvents(seekAbort, noResponse).fatal.length !== 1) {
    throw new Error('media-seek abort without response proof escaped');
  }

  const wrongUrl = { ...baseRecord, video: { ...baseRecord.video, currentSrc: 'https://example.invalid/other.mp4' } };
  if (classifyRuntimeEvents(seekAbort, wrongUrl).fatal.length !== 1) {
    throw new Error('media-seek abort for the wrong source escaped');
  }

  const unsettled = { ...baseRecord, video: { ...baseRecord.video, seeked: false } };
  if (classifyRuntimeEvents(seekAbort, unsettled).fatal.length !== 1) {
    throw new Error('unsettled media-seek abort escaped');
  }

  const replayFailed = { ...baseRecord, video: { ...baseRecord.video, postSeekPlaybackAdvanced: false } };
  if (classifyRuntimeEvents(seekAbort, replayFailed).fatal.length !== 1) {
    throw new Error('media-seek abort without post-seek playback escaped');
  }

  const mediaErrored = { ...baseRecord, video: { ...baseRecord.video, errorCode: 3 } };
  if (classifyRuntimeEvents(seekAbort, mediaErrored).fatal.length !== 1) {
    throw new Error('media-seek abort with media error escaped');
  }

  const teardownAbort = [{
    ...seekAbort[0], seq: 5, phase: 'teardown', requestId: 'teardown-media',
  }];
  if (classifyRuntimeEvents(teardownAbort, baseRecord).fatal.length !== 0) {
    throw new Error('context-teardown ERR_ABORTED fixture was rejected');
  }

  const nonAbort = [{ ...seekAbort[0], detail: 'net::ERR_FAILED' }];
  if (classifyRuntimeEvents(nonAbort, baseRecord).fatal.length !== 1) {
    throw new Error('non-abort request failure escaped');
  }

  const lateConsole = [{ type: 'console', seq: 8, phase: 'teardown', detail: 'synthetic late failure' }];
  if (classifyRuntimeEvents(lateConsole, baseRecord).fatal.length !== 1) {
    throw new Error('late non-request runtime mutation escaped');
  }

  console.log('Security runtime-listener lifetime mutation fixtures PASS: generic aborts remain fatal; media-seek ERR_ABORTED is accepted only with same-source request/response correlation, settled seek, error-free media and advancing post-seek playback.');
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

async function waitForStep(page, selector, step, timeout = 6500) {
  await page.waitForFunction(
    ({ selector, step }) => document.querySelector(selector)?.dataset.step === String(step),
    { selector, step },
    { timeout },
  );
}

async function exerciseTeachingMechanism(page, item, mobile, label, record) {
  if (item.kind === 'presentation') {
    const root = page.locator('.secpath').first();
    const unbounded = root.locator('[data-mode-btn="unbounded"]').first();
    const play = root.locator('[data-action="play"]').first();
    if (!(await root.count()) || !(await unbounded.count()) || !(await play.count())) {
      fail(label, 'presentation-controls-missing');
      return;
    }
    await activate(unbounded, mobile);
    await activate(play, mobile);
    try { await waitForStep(page, '.secpath', 6); }
    catch (error) { fail(label, 'presentation-trajectory-did-not-reach-final-state', String(error)); }
    record.presentation = { mode: await root.getAttribute('data-mode'), step: await root.getAttribute('data-step') };
    return;
  }

  const ctxmix = page.locator('.ctxmix').first();
  const rag = page.locator('.ragtrace').first();
  const defsim = page.locator('.defsim').first();
  if (!(await ctxmix.count()) || !(await rag.count()) || !(await defsim.count())) {
    fail(label, 'prompt-mechanism-missing');
    return;
  }

  const ctxStates = [];
  for (const state of ['1', '2', '3', '4']) {
    const button = ctxmix.locator(`[data-state-btn="${state}"]`).first();
    if (!(await button.count())) { fail(label, `ctxmix-state-${state}-control-missing`); continue; }
    await activate(button, mobile);
    await page.waitForTimeout(60);
    const actual = await ctxmix.getAttribute('data-state');
    ctxStates.push(actual);
    if (actual !== state) fail(label, `ctxmix-state-${state}-did-not-activate`, { actual });
  }

  const ragModes = [];
  for (const mode of ['clean', 'poisoned']) {
    const modeButton = rag.locator(`[data-mode-btn="${mode}"]`).first();
    const run = rag.locator('[data-run]').first();
    if (!(await modeButton.count()) || !(await run.count())) { fail(label, `rag-${mode}-controls-missing`); continue; }
    await activate(modeButton, mobile);
    await page.waitForTimeout(50);
    if ((await rag.getAttribute('data-mode')) !== mode) fail(label, `rag-${mode}-mode-did-not-activate`);
    await activate(run, mobile);
    try { await waitForStep(page, '.ragtrace', 2); await waitForStep(page, '.ragtrace', 3); }
    catch (error) { fail(label, `rag-${mode}-did-not-reach-final-state`, String(error)); }
    ragModes.push({ mode, step: await rag.getAttribute('data-step') });
  }

  const disabledGates = [];
  const gates = defsim.locator('[data-gate]');
  const gateCount = await gates.count();
  if (gateCount < 4) fail(label, 'defense-gates-missing', { gateCount });
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

async function exerciseInlineVideo(page, mobile, label, record, trace) {
  const root = page.locator('article [data-s5-inline-video]').first();
  const poster = root.locator('[data-s5-inline-video-start]').first();
  const video = root.locator('[data-s5-inline-video-player]').first();
  if (!(await root.count()) || !(await poster.count()) || !(await video.count())) {
    fail(label, 'inline-video-surface-missing');
    return;
  }

  trace.phase = 'media-start';
  await activate(poster, mobile);
  try { await video.waitFor({ state: 'visible', timeout: 5000 }); }
  catch (error) { fail(label, 'inline-video-not-visible-after-activation', String(error)); return; }

  const initial = await video.evaluate(async (node) => {
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
      duration: Number(node.duration),
      currentTime: Number(node.currentTime),
    };
  });

  let seekTarget = null;
  let seeked = false;
  if (Number.isFinite(initial.duration) && initial.duration > 1) {
    seekTarget = Math.min(Math.max(0.5, initial.duration * 0.2), initial.duration - 0.5);
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

  trace.phase = 'post-seek-playback';
  const postSeek = await video.evaluate(async (node) => {
    const start = Number(node.currentTime);
    const playPromise = node.play();
    if (playPromise && typeof playPromise.catch === 'function') await playPromise.catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 350));
    node.pause();
    const end = Number(node.currentTime);
    return {
      start,
      end,
      advanced: Number.isFinite(start) && Number.isFinite(end) && end >= start + 0.05,
      currentSrc: node.currentSrc,
      readyState: node.readyState,
      networkState: node.networkState,
      duration: Number(node.duration),
      currentTime: Number(node.currentTime),
      paused: node.paused,
      errorCode: node.error?.code ?? null,
    };
  });

  trace.phase = 'media-steady';
  record.video = {
    ...postSeek,
    seekTarget,
    seeked,
    postSeekPlaybackAdvanced: postSeek.advanced,
  };
  if (!(Number.isFinite(record.video.duration) && record.video.duration > 1)) fail(label, 'inline-video-duration-invalid', record.video);
  if (seekTarget !== null && (!seeked || Math.abs(record.video.start - seekTarget) > 1.0)) {
    fail(label, 'inline-video-seek-did-not-settle', record.video);
  }
  if (record.video.errorCode != null) fail(label, 'inline-video-media-error-after-seek', record.video);
  if (seekTarget !== null && record.video.postSeekPlaybackAdvanced !== true) {
    fail(label, 'inline-video-post-seek-playback-did-not-advance', record.video);
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
          verdict_basis: 'POST_CONTEXT_TEARDOWN_CORRELATED_REQUEST_LIFECYCLE_V2',
          network_responses: [],
        };
        const runtime = [];
        const trace = { phase: 'navigation', seq: 0 };
        const requestIds = new WeakMap();
        let requestCounter = 0;
        let context = null;

        const nextSeq = () => { trace.seq += 1; return trace.seq; };
        const requestId = (request) => {
          if (!requestIds.has(request)) requestIds.set(request, `request-${++requestCounter}`);
          return requestIds.get(request);
        };

        try {
          context = await launched.browser.newContext({
            viewport: { width, height: mobile ? 844 : 1000 },
            isMobile: mobile,
            hasTouch: mobile,
            reducedMotion: motion,
          });
          const page = await context.newPage();
          page.on('request', request => { requestId(request); });
          page.on('pageerror', error => runtime.push({ type: 'pageerror', seq: nextSeq(), phase: trace.phase, detail: String(error) }));
          page.on('console', message => {
            if (message.type() === 'error') runtime.push({ type: 'console', seq: nextSeq(), phase: trace.phase, detail: message.text() });
          });
          page.on('requestfailed', request => {
            runtime.push({
              type: 'requestfailed',
              seq: nextSeq(),
              requestId: requestId(request),
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
                requestId: requestId(request),
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
          await exerciseTeachingMechanism(page, item, mobile, label, record);
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
          if (classified.fatal.length) fail(label, 'fatal-runtime-resource-errors-present-after-context-teardown', classified.fatal);
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
  verdict_basis: 'POST_CONTEXT_TEARDOWN_CORRELATED_REQUEST_LIFECYCLE_V2',
  request_abort_policy: 'ERR_ABORTED is expected only for context teardown or an explicit same-source media seek with settled error-free state, advancing post-seek playback, and request-correlated successful 200/206 response evidence before the cancellation or a later same-source superseding response.',
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
console.log(`Security runtime-listener lifetime PASS using ${launched.engine}: 16 ES/EN Security 00/1.1 desktop/mobile normal/reduced contexts retained runtime/resource events through context teardown; generic aborts remained fatal, and media-seek cancellations required request/response correlation plus settled, error-free and advancing post-seek playback. PIXEL_REVIEW/PEDAGOGY_REVIEW remain editorial.`);
