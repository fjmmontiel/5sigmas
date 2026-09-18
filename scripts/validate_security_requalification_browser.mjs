#!/usr/bin/env node
/**
 * Focused technical browser gate for Security 00/01.
 * Pixel/pedagogy review remains manual.
 *
 * Runtime/resource evidence is retained through browser-context teardown. A
 * requestfailed ERR_ABORTED is never blanket-ignored: outside teardown it is
 * accepted only for the explicitly exercised inline-media seek when request
 * identity/response evidence plus settled, error-free, advancing playback
 * prove a healthy seek supersession.
 */
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

function isSettledSeek(video) {
  return Boolean(
    video
    && video.seeked === true
    && Number.isFinite(video.duration)
    && video.duration > 1
    && Number.isFinite(video.seekTarget)
    && Number.isFinite(video.currentTime)
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
  const source = 'https://example.invalid/video.mp4';
  const record = {
    video: {
      currentSrc: source,
      seeked: true,
      duration: 60,
      seekTarget: 12,
      currentTime: 12.3,
      readyState: 4,
      networkState: 1,
      errorCode: null,
      postSeekPlaybackAdvanced: true,
    },
    network_responses: [{ seq: 1, requestId: 'media-1', url: source, status: 206 }],
  };
  const seekAbort = {
    type: 'requestfailed', seq: 2, requestId: 'media-1', phase: 'media-seek',
    resourceType: 'media', url: source, detail: 'net::ERR_ABORTED',
  };
  const mustBeExpected = classifyRuntimeEvents([seekAbort], record);
  if (mustBeExpected.fatal.length || mustBeExpected.expected.length !== 1) {
    throw new Error('request-correlated healthy seek cancellation fixture was rejected');
  }
  const mutations = [
    { name: 'generic interaction abort', event: { ...seekAbort, phase: 'interaction' }, record },
    { name: 'unrelated request response', event: seekAbort, record: { ...record, network_responses: [{ seq: 1, requestId: 'other', url: source, status: 206 }] } },
    { name: 'no response proof', event: seekAbort, record: { ...record, network_responses: [] } },
    { name: 'wrong source', event: seekAbort, record: { ...record, video: { ...record.video, currentSrc: 'https://example.invalid/other.mp4' } } },
    { name: 'unsettled seek', event: seekAbort, record: { ...record, video: { ...record.video, seeked: false } } },
    { name: 'media error', event: seekAbort, record: { ...record, video: { ...record.video, errorCode: 3 } } },
    { name: 'non-advancing playback', event: seekAbort, record: { ...record, video: { ...record.video, postSeekPlaybackAdvanced: false } } },
    { name: 'non-abort request failure', event: { ...seekAbort, detail: 'net::ERR_FAILED' }, record },
    { name: 'late console error', event: { type: 'console', seq: 8, phase: 'teardown', detail: 'boom' }, record },
    { name: 'late HTTP error', event: { type: 'http', seq: 9, phase: 'teardown', status: 500, url: 'https://example.invalid/fail' }, record },
  ];
  for (const mutation of mutations) {
    if (classifyRuntimeEvents([mutation.event], mutation.record).fatal.length !== 1) {
      throw new Error(`${mutation.name} mutation escaped fail-closed runtime classification`);
    }
  }
  const teardownAbort = classifyRuntimeEvents([{ ...seekAbort, seq: 10, requestId: 'closing', phase: 'teardown' }], record);
  if (teardownAbort.fatal.length || teardownAbort.expected.length !== 1) {
    throw new Error('context teardown cancellation fixture was rejected');
  }
  console.log('Security requalification browser self-test PASS: request-correlated seek cancellation and post-teardown listener mutations are fail-closed.');
}

if (process.argv.includes('--self-test')) {
  runSelfTest();
  process.exit(0);
}

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

async function inspectVideo(page, ctx, record, trace) {
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
    check([200, 206].includes(range.status()), `${ctx}: video Range fetch failed`, { status: range.status(), mediaUrl });
  }

  record.codec = await video.evaluate(node => ({
    genericMp4: node.canPlayType('video/mp4'),
    h264Baseline: node.canPlayType('video/mp4; codecs="avc1.42E01E"'),
    h264Main: node.canPlayType('video/mp4; codecs="avc1.4D401F"'),
    readyState: node.readyState,
    networkState: node.networkState,
  }));

  await video.evaluate(node => {
    const log = [];
    for (const name of ['loadstart', 'loadedmetadata', 'canplay', 'playing', 'pause', 'seeked', 'error']) {
      node.addEventListener(name, () => log.push({
        name,
        t: Number(node.currentTime || 0),
        readyState: node.readyState,
        networkState: node.networkState,
        error: node.error ? { code: node.error.code, message: node.error.message } : null,
      }));
    }
    window.__s5SecurityVideoEvents = log;
    node.muted = true;
    node.volume = 0;
  });

  check(await poster.isVisible(), `${ctx}: poster not initially visible`);
  check(!(await video.isVisible()), `${ctx}: player visible before poster activation`);
  trace.phase = 'media-start';
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

  trace.phase = 'media-seek';
  const seek = await video.evaluate(async node => {
    node.pause();
    const duration = Number(node.duration);
    let seekTarget = null;
    let seeked = false;
    if (Number.isFinite(duration) && duration > 1) {
      seekTarget = Math.min(Math.max(0.5, duration * 0.2), duration - 0.5);
      await Promise.race([
        new Promise(resolve => {
          node.addEventListener('seeked', () => { seeked = true; resolve(); }, { once: true });
          node.currentTime = seekTarget;
        }),
        new Promise(resolve => setTimeout(resolve, 2500)),
      ]);
      await new Promise(resolve => setTimeout(resolve, 120));
    }
    return {
      seekTarget,
      seeked,
      currentTime: Number(node.currentTime),
      duration,
      readyState: node.readyState,
      networkState: node.networkState,
      errorCode: node.error?.code ?? null,
    };
  });

  trace.phase = 'post-seek-playback';
  const postSeek = await video.evaluate(async node => {
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
      paused: node.paused,
      videoWidth: node.videoWidth,
      videoHeight: node.videoHeight,
      readyState: node.readyState,
      networkState: node.networkState,
      errorCode: node.error?.code ?? null,
      error: node.error ? { code: node.error.code, message: node.error.message } : null,
      events: window.__s5SecurityVideoEvents || [],
    };
  });
  trace.phase = 'media-steady';

  record.video = {
    ...postSeek,
    seekTarget: seek.seekTarget,
    seeked: seek.seeked,
    postSeekPlaybackAdvanced: postSeek.advanced,
  };
  record.media = record.video;

  if (playbackError) {
    const unsupported = !record.codec.genericMp4 && !record.codec.h264Baseline && !record.codec.h264Main;
    if (record.engine === 'playwright-chromium' && unsupported) {
      failures.push({ message: `${ctx}: BROWSER_HARNESS_CODEC_UNSUPPORTED`, detail: { playbackError, codec: record.codec, media: record.video } });
    } else {
      failures.push({ message: `${ctx}: VIDEO_PLAYBACK_ERROR`, detail: { playbackError, codec: record.codec, media: record.video } });
    }
    return;
  }

  check(Number.isFinite(record.video.duration) && record.video.duration > 0, `${ctx}: invalid video duration`, record.video);
  check(record.video.videoWidth > 0 && record.video.videoHeight > 0, `${ctx}: invalid decoded video dimensions`, record.video);
  check(record.video.paused, `${ctx}: pause lifecycle failed`, record.video);
  if (record.video.seekTarget !== null) {
    check(record.video.seeked && Math.abs(record.video.currentTime - record.video.seekTarget) <= 1.0, `${ctx}: seek lifecycle failed`, record.video);
    check(record.video.postSeekPlaybackAdvanced === true, `${ctx}: post-seek playback did not advance`, record.video);
  }
  check(record.video.errorCode == null, `${ctx}: media error after lifecycle`, record.video);
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
    const ctx = `${item.locale}/${item.kind}/${mobile ? 'mobile' : 'desktop'}/${motion}`;
    check((await root.count()) === 1, `${ctx}: ctxmix missing`);
    if (!(await root.count())) return;

    for (const step of ['1', '2', '3', '4']) {
      await activate(root.locator(`[data-state-btn="${step}"]`), mobile);
      check((await root.getAttribute('data-state')) === step, `${ctx}: step ${step} did not activate`);
    }

    const sources = root.locator('.ctxmix__source');
    check((await sources.count()) === 3, `${ctx}: expected three provenance sources`, { count: await sources.count() });
    for (let i = 0; i < await sources.count(); i++) {
      const source = sources.nth(i);
      const eyebrow = await source.locator('.ctxmix__eyebrow').boundingBox();
      const title = await source.locator('.ctxmix__source-title').boundingBox();
      const detailLocator = source.locator('p,.ctxmix__payload').first();
      const detail = (await detailLocator.count()) ? await detailLocator.boundingBox() : null;
      check(Boolean(eyebrow && title), `${ctx}: source ${i} missing provenance/title geometry`, { eyebrow, title });
      check(!overlap(eyebrow, title), `${ctx}: source ${i} provenance label overlaps source title`, { eyebrow, title });
      if (detail) check(!overlap(title, detail), `${ctx}: source ${i} title overlaps explanatory payload`, { title, detail });
    }

    check((await root.locator('.ctxmix__segment').count()) === 3, `${ctx}: assembled context must preserve all three provenance segments`);
    check(await root.locator('[data-node="authorization-gate"]').isVisible(), `${ctx}: authorization gate not visible at step 4`);
    check(await root.locator('[data-node="execution-result"]').isVisible(), `${ctx}: execution result not visible at step 4`);
    const proposal = (await root.locator('[data-node="model-proposal"]').innerText()).trim();
    check(proposal.includes('send_credentials'), `${ctx}: model proposal does not expose the risky tool call`, { proposal });
    const result = (await root.locator('[data-node="execution-result"]').innerText()).trim();
    const denied = item.locale === 'es' ? 'ACCIÓN DENEGADA' : 'ACTION DENIED';
    check(result.includes(denied), `${ctx}: runtime authority boundary does not deny the external effect`, { result });
  }

  if (motion === 'reduce') {
    const active = await page.locator(item.kind === 'presentation' ? '.secpath' : '.ctxmix').evaluate(root => root.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length);
    check(active === 0, `${item.locale}/${item.kind}/${mobile ? 'mobile' : 'desktop'}: animations still running under reduced motion`, { active });
  }
  record.interaction_review = 'AUTOMATED_TECHNICAL_ONLY';
}

async function inspectPromptProvenanceDetails(page, item, mobile, motion, record, stem) {
  if (item.kind !== 'prompt') return;
  const ctx = `${item.locale}/${item.kind}/${mobile ? 'mobile' : 'desktop'}/${motion}`;
  const expectedSummary = item.locale === 'es' ? 'Fuentes y evidencia adyacente' : 'Sources and adjacent evidence';
  const summary = page.getByText(expectedSummary, { exact: true }).first();
  check((await summary.count()) === 1, `${ctx}: provenance details summary missing`);
  if (!(await summary.count())) return;
  const details = summary.locator('xpath=ancestor::details[1]');
  check((await details.count()) === 1, `${ctx}: provenance details container missing`);
  if (!(await details.count())) return;
  check(!(await details.getAttribute('open')), `${ctx}: provenance details unexpectedly open before interaction`);

  await activate(summary, mobile);
  await page.waitForFunction((text) => {
    const summaries = [...document.querySelectorAll('article details > summary')];
    const node = summaries.find(el => el.textContent?.trim() === text);
    return Boolean(node?.parentElement?.open);
  }, expectedSummary, { timeout: 5000 });

  const links = details.locator('a[href]');
  const linkCount = await links.count();
  check(linkCount >= 5, `${ctx}: provenance details must expose at least five source links`, { linkCount });
  const linkEvidence = [];
  for (let i = 0; i < linkCount; i++) {
    const link = links.nth(i);
    const href = await link.getAttribute('href');
    const visible = await link.isVisible();
    const box = visible ? await link.boundingBox() : null;
    check(Boolean(href && /^https:\/\//.test(href)), `${ctx}: provenance source link ${i} must use an absolute HTTPS URL`, { href });
    check(visible, `${ctx}: provenance source link ${i} is not visible after expansion`, { href });
    if (box) check(box.x >= -1 && box.x + box.width <= record.width + 1, `${ctx}: provenance source link ${i} clips horizontally`, { href, box, width: record.width });
    linkEvidence.push({ href, visible, box });
  }
  const geometry = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  check(geometry.scrollWidth <= geometry.clientWidth + 1, `${ctx}: expanded provenance details introduce page overflow`, geometry);
  record.provenance_details = { summary: expectedSummary, linkCount, links: linkEvidence, geometry };
  await details.screenshot({ path: path.join(out, `${stem}-references-expanded.png`), animations: motion === 'reduce' ? 'disabled' : 'allow' });
  await activate(summary, mobile);
  check(!(await details.getAttribute('open')), `${ctx}: provenance details did not close after evidence capture`);
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
          pixel_review: 'PENDING',
          pedagogy_review: 'PENDING',
          verdict_basis: 'POST_CONTEXT_TEARDOWN_CORRELATED_REQUEST_LIFECYCLE_V2',
          network_responses: [],
        };
        const runtime = [];
        const trace = { phase: 'navigation', seq: 0 };
        const requestIds = new WeakMap();
        let requestCounter = 0;
        let context = null;
        const nextSeq = () => { trace.seq += 1; return trace.seq; };
        const requestId = request => {
          if (!requestIds.has(request)) requestIds.set(request, `request-${++requestCounter}`);
          return requestIds.get(request);
        };

        try {
          context = await browser.newContext({ viewport: { width, height: mobile ? 844 : 1000 }, isMobile: mobile, hasTouch: mobile, reducedMotion: motion });
          const page = await context.newPage();
          page.on('request', request => { requestId(request); });
          page.on('pageerror', error => runtime.push({ type: 'pageerror', seq: nextSeq(), phase: trace.phase, detail: String(error) }));
          page.on('console', message => {
            if (message.type() === 'error') runtime.push({ type: 'console', seq: nextSeq(), phase: trace.phase, detail: message.text() });
          });
          page.on('requestfailed', request => runtime.push({
            type: 'requestfailed',
            seq: nextSeq(),
            requestId: requestId(request),
            phase: trace.phase,
            url: request.url(),
            resourceType: request.resourceType(),
            method: request.method(),
            detail: request.failure()?.errorText || '',
          }));
          page.on('response', response => {
            const seq = nextSeq();
            const request = response.request();
            if (request.resourceType() === 'media' || /\.mp4(?:$|\?)/i.test(response.url())) {
              record.network_responses.push({
                seq,
                requestId: requestId(request),
                phase: trace.phase,
                url: response.url(),
                status: response.status(),
                resourceType: request.resourceType(),
              });
            }
            if (response.status() >= 400) runtime.push({ type: 'http', seq, phase: trace.phase, status: response.status(), url: response.url() });
          });

          const response = await page.goto(new URL(item.route, base).href, { waitUntil: 'domcontentloaded', timeout: 20000 });
          check(response?.ok(), `${ctx}: page HTTP failed`, { status: response?.status() });
          trace.phase = 'lazy-scroll';
          await page.evaluate(async () => { await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]); });
          await page.evaluate(async () => {
            for (let y = 0; y < document.documentElement.scrollHeight; y += Math.max(innerHeight, 400)) {
              scrollTo(0, y);
              await new Promise(r => setTimeout(r, 20));
            }
            scrollTo(0, 0);
          });
          await page.waitForTimeout(150);
          const geometry = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, lang: document.documentElement.lang }));
          check(geometry.scrollWidth <= geometry.clientWidth + 1, `${ctx}: page overflow`, geometry);
          check(geometry.lang.toLowerCase().startsWith(item.locale), `${ctx}: locale mismatch`, geometry);

          trace.phase = 'teaching-interactions';
          await inspectVisual(page, item, mobile, motion, record);
          await inspectVideo(page, ctx, record, trace);

          trace.phase = 'evidence-capture';
          const stem = `${item.locale}-${item.kind}-${mobile ? 'mobile' : 'desktop'}-${motion}`;
          await page.screenshot({ path: path.join(out, `${stem}-page.png`), fullPage: true, animations: motion === 'reduce' ? 'disabled' : 'allow' });
          const visual = page.locator(item.kind === 'presentation' ? '.secpath' : '.ctxmix').first();
          if (await visual.count()) await visual.screenshot({ path: path.join(out, `${stem}-visual.png`), animations: motion === 'reduce' ? 'disabled' : 'allow' });
          await inspectPromptProvenanceDetails(page, item, mobile, motion, record, stem);
          await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});
          await page.waitForTimeout(150);
          record.runtime_before_teardown = [...runtime];
        } catch (error) {
          record.unhandled_error = { name: error?.name || 'Error', message: String(error?.message || error) };
          check(false, `${ctx}: unhandled browser gate exception`, record.unhandled_error);
        } finally {
          if (context) {
            try {
              trace.phase = 'teardown';
              await context.close();
            } catch (error) {
              record.context_close_error = { name: error?.name || 'Error', message: String(error?.message || error) };
              check(false, `${ctx}: browser context close failed`, record.context_close_error);
            }
          }
          const finalRuntime = [...runtime];
          record.runtime_after_teardown = finalRuntime;
          record.teardown_appended_runtime = finalRuntime.slice((record.runtime_before_teardown || []).length);
          const classified = classifyRuntimeEvents(finalRuntime, record);
          record.expected_runtime_cancellations = classified.expected;
          record.fatal_runtime_errors = classified.fatal;
          check(classified.fatal.length === 0, `${ctx}: persistent runtime/resource errors after context teardown`, classified.fatal);
          evidence.push(record);
        }
      }
    }
  }
} finally {
  await browser.close();
}

const report = {
  engine: launched.engine,
  chrome_launch_error: launched.chromeError || null,
  verdict_basis: 'POST_CONTEXT_TEARDOWN_CORRELATED_REQUEST_LIFECYCLE_V2',
  request_abort_policy: 'ERR_ABORTED is expected only for context teardown or an explicit same-source media seek with settled error-free state, advancing post-seek playback, and request-correlated successful 200/206 response evidence before cancellation or a later same-source superseding response.',
  contexts_expected: 16,
  contexts_observed: evidence.length,
  failures,
  evidence,
};
await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
if (evidence.length !== 16) {
  console.error(`Security requalification browser gate FAILED: expected 16 contexts, observed ${evidence.length}`);
  process.exit(1);
}
if (failures.length) {
  console.error(`Security requalification browser gate FAILED (${failures.length}) using ${launched.engine}`);
  for (const failure of failures) console.error(`- ${failure.message}${failure.detail ? ` :: ${JSON.stringify(failure.detail)}` : ''}`);
  process.exit(1);
}
console.log(`Security requalification browser technical gate PASS using ${launched.engine}; runtime/resource verdict retained through context teardown with request-correlated media-seek cancellation policy. PIXEL_REVIEW and PEDAGOGY_REVIEW remain PENDING.`);
