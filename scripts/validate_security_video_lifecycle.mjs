#!/usr/bin/env node
/**
 * Security 00/01 media lifecycle gate: keyboard/touch activation, pause/seek/end,
 * then reader-next navigation.
 *
 * Runtime/resource listeners remain active through browser-context teardown. A
 * requestfailed ERR_ABORTED is never blanket-ignored: outside teardown it is
 * accepted only for the explicitly exercised media seek/playback lifecycle when
 * request identity, successful response evidence and final media state prove a
 * healthy supersession/cancellation. The retained report and verdict are both
 * computed after close.
 */
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

function healthyPrimaryLifecycle(record, event) {
  const seek = record.primary_seek;
  return Boolean(
    ['media-seek', 'post-seek-playback'].includes(event.phase)
    && event.resourceType === 'media'
    && seek
    && seek.currentSrc === event.url
    && seek.seeked === true
    && Number.isFinite(seek.duration)
    && seek.duration > 1
    && Number.isFinite(seek.seekTarget)
    && Number.isFinite(seek.currentTime)
    && Math.abs(seek.currentTime - seek.seekTarget) <= 1.0
    && seek.readyState >= 2
    && seek.networkState !== 3
    && seek.errorCode == null
    && seek.postSeekPlaybackAdvanced === true
  );
}

function healthyEndSeek(record, event) {
  const seek = record.end_seek;
  const ended = record.ended;
  return Boolean(
    event.phase === 'media-end-seek'
    && event.resourceType === 'media'
    && seek
    && seek.currentSrc === event.url
    && seek.seeked === true
    && Number.isFinite(seek.duration)
    && seek.duration > 1
    && Number.isFinite(seek.target)
    && Number.isFinite(seek.currentTime)
    && Math.abs(seek.currentTime - seek.target) <= 1.0
    && seek.readyState >= 2
    && seek.networkState !== 3
    && seek.errorCode == null
    && ended?.endedEvent === true
    && ended?.isPlaying === false
    && ended?.paused === true
    && Number.isFinite(ended?.currentTime)
    && ended.currentTime < 0.5
  );
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
    const primaryLifecycle = healthyPrimaryLifecycle(record, event);
    const endSeek = healthyEndSeek(record, event);
    // A cancellation observed after the post-seek play/pause probe must belong to
    // the same request that already delivered successful range headers. A merely
    // later same-source request is insufficient evidence for this phase. During
    // the seek itself we may also accept a later same-source replacement request.
    const proofIsStrongEnough = event.phase === 'post-seek-playback'
      ? responseProof.priorSameRequest
      : responseProof.proven;
    if ((primaryLifecycle || endSeek) && proofIsStrongEnough) {
      expected.push({
        ...event,
        classification: responseProof.priorSameRequest
          ? 'EXPECTED_MEDIA_LIFECYCLE_CANCEL_AFTER_RESPONSE_HEADERS'
          : 'EXPECTED_MEDIA_LIFECYCLE_SUPERSEDED_BY_LATER_RESPONSE',
      });
      continue;
    }
    fatal.push(event);
  }
  return { fatal, expected };
}

function runSelfTest() {
  const source = 'https://example.invalid/video.mp4';
  const healthyRecord = {
    network_responses: [
      { seq: 1, requestId: 'seek-1', url: source, status: 206 },
      { seq: 3, requestId: 'end-1', url: source, status: 206 },
    ],
    primary_seek: {
      currentSrc: source,
      seeked: true,
      duration: 60,
      seekTarget: 12,
      currentTime: 12.2,
      readyState: 4,
      networkState: 1,
      errorCode: null,
      postSeekPlaybackAdvanced: true,
    },
    end_seek: {
      currentSrc: source,
      seeked: true,
      duration: 60,
      target: 59.65,
      currentTime: 59.65,
      readyState: 4,
      networkState: 1,
      errorCode: null,
    },
    ended: { endedEvent: true, isPlaying: false, paused: true, currentTime: 0 },
  };
  const primaryAbort = {
    type: 'requestfailed', seq: 2, requestId: 'seek-1', phase: 'media-seek',
    resourceType: 'media', url: source, detail: 'net::ERR_ABORTED',
  };
  const postSeekAbort = { ...primaryAbort, phase: 'post-seek-playback' };
  const endAbort = {
    type: 'requestfailed', seq: 4, requestId: 'end-1', phase: 'media-end-seek',
    resourceType: 'media', url: source, detail: 'net::ERR_ABORTED',
  };
  for (const event of [primaryAbort, postSeekAbort, endAbort]) {
    const result = classifyRuntimeEvents([event], healthyRecord);
    if (result.fatal.length || result.expected.length !== 1) {
      throw new Error(`healthy ${event.phase} cancellation fixture was rejected`);
    }
  }

  const mutations = [
    { name: 'generic interaction abort', event: { ...primaryAbort, phase: 'interaction' }, record: healthyRecord },
    { name: 'media-start abort is not a seek/playback exception', event: { ...primaryAbort, phase: 'media-start' }, record: healthyRecord },
    { name: 'wrong resource type', event: { ...primaryAbort, resourceType: 'script' }, record: healthyRecord },
    { name: 'unrelated response request', event: primaryAbort, record: { ...healthyRecord, network_responses: [{ seq: 1, requestId: 'other', url: source, status: 206 }] } },
    { name: 'post-seek requires same-request response proof', event: postSeekAbort, record: { ...healthyRecord, network_responses: [{ seq: 3, requestId: 'other', url: source, status: 206 }] } },
    { name: 'no response proof', event: primaryAbort, record: { ...healthyRecord, network_responses: [] } },
    { name: 'wrong source', event: primaryAbort, record: { ...healthyRecord, primary_seek: { ...healthyRecord.primary_seek, currentSrc: 'https://example.invalid/other.mp4' } } },
    { name: 'unsettled primary seek', event: primaryAbort, record: { ...healthyRecord, primary_seek: { ...healthyRecord.primary_seek, seeked: false } } },
    { name: 'primary media error', event: primaryAbort, record: { ...healthyRecord, primary_seek: { ...healthyRecord.primary_seek, errorCode: 3 } } },
    { name: 'primary playback did not advance', event: primaryAbort, record: { ...healthyRecord, primary_seek: { ...healthyRecord.primary_seek, postSeekPlaybackAdvanced: false } } },
    { name: 'end event absent', event: endAbort, record: { ...healthyRecord, ended: { ...healthyRecord.ended, endedEvent: false } } },
    { name: 'end state not reset', event: endAbort, record: { ...healthyRecord, ended: { ...healthyRecord.ended, currentTime: 59.9, paused: false, isPlaying: true } } },
    { name: 'non-abort request failure', event: { ...primaryAbort, detail: 'net::ERR_FAILED' }, record: healthyRecord },
    { name: 'late console error', event: { type: 'console', seq: 8, phase: 'teardown', detail: 'boom' }, record: healthyRecord },
    { name: 'late HTTP error', event: { type: 'http', seq: 9, phase: 'teardown', status: 500, url: 'https://example.invalid/fail' }, record: healthyRecord },
  ];
  for (const mutation of mutations) {
    if (classifyRuntimeEvents([mutation.event], mutation.record).fatal.length !== 1) {
      throw new Error(`${mutation.name} mutation escaped fail-closed runtime classification`);
    }
  }
  const teardownAbort = classifyRuntimeEvents([{ ...primaryAbort, seq: 10, requestId: 'closing', phase: 'teardown' }], healthyRecord);
  if (teardownAbort.fatal.length || teardownAbort.expected.length !== 1) {
    throw new Error('context teardown cancellation fixture was rejected');
  }
  console.log('Security video lifecycle self-test PASS: request-correlated seek/playback lifecycle and post-teardown listener mutations are fail-closed.');
}

if (process.argv.includes('--self-test')) {
  runSelfTest();
  process.exit(0);
}

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

async function exerciseLifecycle(page, item, mobile, motion, record, trace) {
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
  trace.phase = 'media-start';
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
  trace.phase = 'media-seek';
  const seeked = await video.evaluate(async (node, target) => {
    let observed = false;
    await Promise.race([
      new Promise(resolve => {
        node.addEventListener('seeked', () => { observed = true; resolve(); }, { once: true });
        node.currentTime = target;
      }),
      new Promise(resolve => setTimeout(resolve, 3000)),
    ]);
    return {
      currentSrc: node.currentSrc,
      currentTime: Number(node.currentTime),
      duration: Number(node.duration),
      paused: node.paused,
      seekTarget: target,
      seeked: observed,
      readyState: node.readyState,
      networkState: node.networkState,
      errorCode: node.error?.code ?? null,
    };
  }, seekTarget);
  check(seeked.seeked && Math.abs(seeked.currentTime - seekTarget) <= 1.0, `${ctx}: seek did not reach expected position`, { seekTarget, seeked });

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
      currentTime: end,
      duration: Number(node.duration),
      readyState: node.readyState,
      networkState: node.networkState,
      errorCode: node.error?.code ?? null,
      error: node.error ? { code: node.error.code, message: node.error.message } : null,
    };
  });
  record.primary_seek = { ...seeked, ...postSeek, seekTarget, seeked: seeked.seeked, postSeekPlaybackAdvanced: postSeek.advanced };
  check(record.primary_seek.postSeekPlaybackAdvanced === true, `${ctx}: playback did not advance after primary seek`, record.primary_seek);
  check(record.primary_seek.errorCode == null, `${ctx}: media error after primary seek`, record.primary_seek);

  trace.phase = 'media-end-seek';
  const ending = await video.evaluate(async (node) => {
    const duration = Number(node.duration);
    const target = Math.max(0, duration - Math.min(0.35, duration / 4));
    const seekResult = await new Promise(resolve => {
      let settled = false;
      const finish = (eventObserved) => {
        if (settled) return;
        settled = true;
        resolve({
          eventObserved,
          currentSrc: node.currentSrc,
          currentTime: Number(node.currentTime),
          readyState: node.readyState,
          networkState: node.networkState,
          errorCode: node.error?.code ?? null,
        });
      };
      node.addEventListener('seeked', () => finish(true), { once: true });
      node.currentTime = target;
      setTimeout(() => finish(false), 3000);
    });
    return { duration, target, seekResult };
  });
  record.end_seek = {
    currentSrc: ending.seekResult.currentSrc,
    seeked: ending.seekResult.eventObserved,
    duration: ending.duration,
    target: ending.target,
    currentTime: ending.seekResult.currentTime,
    readyState: ending.seekResult.readyState,
    networkState: ending.seekResult.networkState,
    errorCode: ending.seekResult.errorCode,
  };
  check(record.end_seek.seeked && Math.abs(record.end_seek.currentTime - record.end_seek.target) <= 1.0, `${ctx}: end-seek did not reach expected position`, record.end_seek);
  check(record.end_seek.errorCode == null, `${ctx}: media error after end-seek`, record.end_seek);

  trace.phase = 'media-end-playback';
  await video.evaluate(async (node) => {
    const playPromise = node.play();
    if (playPromise && typeof playPromise.catch === 'function') await playPromise.catch(() => {});
  });
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
    const events = window.__s5SecurityLifecycle || [];
    return {
      isPlaying: rootNode.classList.contains('is-playing'),
      currentTime: Number(node?.currentTime || 0),
      paused: Boolean(node?.paused),
      playerDisplay: style?.display || '',
      playerVisibility: style?.visibility || '',
      posterDisplay: startStyle?.display || '',
      posterVisibility: startStyle?.visibility || '',
      events,
      endedEvent: events.some((event) => event.name === 'ended'),
    };
  });
  record.ended = ended;
  check(ended.endedEvent, `${ctx}: ended event was not observed`, ended);
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

  trace.phase = 'next-navigation';
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
        const record = {
          ...item,
          width,
          motion,
          mobile,
          engine: launched.engine,
          chrome_launch_error: launched.chromeError || null,
          verdict_basis: 'POST_CONTEXT_TEARDOWN_REQUEST_CORRELATED_MEDIA_LIFECYCLE_V2',
        };
        const context = await browser.newContext({ viewport: { width, height: mobile ? 844 : 1000 }, isMobile: mobile, hasTouch: mobile, reducedMotion: motion });
        const page = await context.newPage();
        const runtime = [];
        const networkResponses = [];
        const requestIds = new WeakMap();
        let requestCounter = 0;
        let seq = 0;
        const trace = { phase: 'navigation' };
        const requestId = (request) => {
          if (!requestIds.has(request)) requestIds.set(request, `req-${++requestCounter}`);
          return requestIds.get(request);
        };

        page.on('request', request => { requestId(request); });
        page.on('pageerror', error => runtime.push({ type: 'pageerror', seq: ++seq, phase: trace.phase, detail: String(error) }));
        page.on('console', message => {
          if (message.type() === 'error') runtime.push({ type: 'console', seq: ++seq, phase: trace.phase, detail: message.text() });
        });
        page.on('requestfailed', request => {
          runtime.push({
            type: 'requestfailed',
            seq: ++seq,
            requestId: requestId(request),
            phase: trace.phase,
            resourceType: request.resourceType(),
            url: request.url(),
            detail: request.failure()?.errorText || '',
          });
        });
        page.on('response', response => {
          const request = response.request();
          const status = response.status();
          const event = {
            seq: ++seq,
            requestId: requestId(request),
            phase: trace.phase,
            resourceType: request.resourceType(),
            status,
            url: response.url(),
          };
          if ([200, 206].includes(status) && request.resourceType() === 'media') networkResponses.push(event);
          if (status >= 400) runtime.push({ type: 'http', ...event });
        });

        try {
          const response = await page.goto(new URL(item.route, base).href, { waitUntil: 'domcontentloaded', timeout: 20000 });
          check(response?.ok(), `${ctx}: page HTTP failed`, { status: response?.status() });
          await page.evaluate(async () => { await Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 1500))]); });
          trace.phase = 'interaction';
          await exerciseLifecycle(page, item, mobile, motion, record, trace);
        } catch (error) {
          record.unhandled_error = { name: error?.name || 'Error', message: String(error?.message || error) };
          failures.push({ message: `${ctx}: unhandled lifecycle exception`, detail: record.unhandled_error });
        } finally {
          trace.phase = 'teardown';
          try {
            await context.close();
          } catch (error) {
            failures.push({ message: `${ctx}: browser context close failed`, detail: String(error) });
          }

          record.network_responses = [...networkResponses];
          record.runtime_events = [...runtime];
          const classified = classifyRuntimeEvents(record.runtime_events, record);
          record.runtime_expected = classified.expected;
          record.runtime_fatal = classified.fatal;
          check(classified.fatal.length === 0, `${ctx}: persistent runtime/resource errors during lifecycle/navigation`, classified.fatal);
          evidence.push(record);
        }
      }
    }
  }
} finally {
  await browser.close();
}

await fs.writeFile(path.join(out, 'report.json'), JSON.stringify({
  engine: launched.engine,
  chrome_launch_error: launched.chromeError || null,
  verdict_basis: 'POST_CONTEXT_TEARDOWN_REQUEST_CORRELATED_MEDIA_LIFECYCLE_V2',
  contexts_expected: routes.length * 2 * 2,
  contexts_observed: evidence.length,
  failures,
  evidence,
}, null, 2));
if (failures.length) {
  console.error(`Security video lifecycle gate FAILED (${failures.length}) using ${launched.engine}`);
  for (const failure of failures) console.error(`- ${failure.message}${failure.detail ? ` :: ${JSON.stringify(failure.detail)}` : ''}`);
  process.exit(1);
}
console.log(`Security video lifecycle technical gate PASS using ${launched.engine}; verdict computed post-teardown with request-correlated seek/playback cancellation evidence.`);
