import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.S5_PREVIEW_URL ?? 'http://127.0.0.1:8000';
const defaultPaths = [
  '/',
  '/visuales/',
  '/temas/',
  '/series/',
  '/series/modelos-razonadores/03-test-time-compute/',
];
const requestedPaths = (process.env.S5_BROWSER_RESOURCE_PATHS ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const paths = requestedPaths.length ? [...new Set(requestedPaths)] : defaultPaths;

const profileCatalog = {
  'desktop-normal': {
    viewport: { width: 1440, height: 1100 },
    reducedMotion: 'no-preference',
    isMobile: false,
    hasTouch: false,
  },
  'desktop-reduced': {
    viewport: { width: 1440, height: 1100 },
    reducedMotion: 'reduce',
    isMobile: false,
    hasTouch: false,
  },
  'mobile-normal': {
    viewport: { width: 390, height: 844 },
    reducedMotion: 'no-preference',
    isMobile: true,
    hasTouch: true,
  },
  'mobile-reduced': {
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
    isMobile: true,
    hasTouch: true,
  },
};
const requestedProfiles = (process.env.S5_BROWSER_RESOURCE_PROFILES ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const profileNames = requestedProfiles.length
  ? [...new Set(requestedProfiles)]
  : Object.keys(profileCatalog);
const requestedConcurrency = Number.parseInt(
  process.env.S5_BROWSER_RESOURCE_CONCURRENCY ?? '4',
  10,
);

for (const route of paths) {
  if (!route.startsWith('/')) throw new Error(`Browser resource audit path must start with '/': ${route}`);
}
for (const name of profileNames) {
  if (!profileCatalog[name]) {
    throw new Error(
      `Unknown browser resource profile '${name}'. Expected one of: ${Object.keys(profileCatalog).join(', ')}`,
    );
  }
}
if (!Number.isInteger(requestedConcurrency) || requestedConcurrency < 1 || requestedConcurrency > 8) {
  throw new Error('S5_BROWSER_RESOURCE_CONCURRENCY must be an integer between 1 and 8');
}

const isTransientExternalFontFailure = (url, resourceType) => {
  if (resourceType !== 'font') return false;
  try {
    return new URL(url).hostname === 'fonts.gstatic.com';
  } catch {
    return false;
  }
};

const safeFrameUrl = (request) => {
  try {
    return request.frame().url();
  } catch {
    return '<detached-frame>';
  }
};

const isHealthyVideo = (video) => Boolean(
  video
  && video.readyState >= 1
  && video.networkState !== 3
  && video.errorCode == null
  && Number.isFinite(video.duration)
  && video.duration > 0
);

const isHealthyCheckpoint = (checkpoint) => Boolean(
  checkpoint
  && checkpoint.readyState >= 1
  && checkpoint.networkState !== 3
  && checkpoint.errorCode == null
  && Number.isFinite(checkpoint.duration)
  && checkpoint.duration > 0
);

const matchingHealthyVideo = (event, record) => (record.videos ?? []).find((video) => (
  video.sources.includes(event.url)
  && isHealthyVideo(video)
));

const priorSameRequestResponse = (event, record) => (record.networkResponses ?? []).find((response) => (
  response.seq < event.seq
  && response.requestId === event.requestId
  && response.url === event.url
  && [200, 206].includes(response.status)
));

const requestStartClock = (start) => {
  if (!start) return null;
  if (Number.isFinite(start.startedAtMs)) {
    return { observedAtMs: start.startedAtMs, source: 'playwright-request-timing' };
  }
  if (Number.isFinite(start.nodeObservedAtMs)) {
    return { observedAtMs: start.nodeObservedAtMs, source: 'node-request-event' };
  }
  return null;
};

const redundantAbortProof = (event, record) => {
  const start = (record.mediaRequestStarts ?? []).find((candidate) => (
    candidate.requestId === event.requestId
    && candidate.url === event.url
  ));
  if (!start) {
    return { proven: false, reason: 'missing-request-start' };
  }

  const startClock = requestStartClock(start);
  if (!startClock) {
    return { proven: false, reason: 'missing-request-start-timestamp', start };
  }

  const checkpoint = (record.mediaHealthCheckpoints ?? [])
    .filter((candidate) => (
      candidate.sources.includes(event.url)
      && isHealthyCheckpoint(candidate)
      && Number.isFinite(candidate.observedAtMs)
      && candidate.observedAtMs <= startClock.observedAtMs
    ))
    .sort((left, right) => right.observedAtMs - left.observedAtMs)[0];
  if (!checkpoint) {
    return {
      proven: false,
      reason: 'no-healthy-metadata-before-request-start',
      start,
      startClock,
    };
  }

  const priorResponse = (record.networkResponses ?? [])
    .filter((response) => (
      response.requestId !== event.requestId
      && response.url === event.url
      && [200, 206].includes(response.status)
      && response.seq < start.seq
      && Number.isFinite(response.observedAtMs)
      && response.observedAtMs <= startClock.observedAtMs
    ))
    .sort((left, right) => right.observedAtMs - left.observedAtMs)[0];
  if (!priorResponse) {
    return {
      proven: false,
      reason: 'no-prior-successful-different-request-before-redundant-start',
      start,
      startClock,
      checkpoint,
    };
  }

  return {
    proven: true,
    start,
    startClock,
    checkpoint,
    priorResponse,
  };
};

const classifyRequestFailure = (event, record) => {
  if (!/ERR_ABORTED/i.test(event.errorText ?? '')) {
    return { expected: false, classification: 'FATAL_NON_ABORT_REQUEST_FAILURE' };
  }

  if (event.phase === 'teardown') {
    return { expected: true, classification: 'EXPECTED_CONTEXT_TEARDOWN_ABORT' };
  }

  if (!['lazy-load', 'settle'].includes(event.phase) || event.resourceType !== 'media') {
    return { expected: false, classification: 'FATAL_UNPROVEN_PRE_TEARDOWN_ABORT' };
  }

  const video = matchingHealthyVideo(event, record);
  if (!video) {
    return { expected: false, classification: 'FATAL_MEDIA_ABORT_WITHOUT_HEALTHY_MATCHING_VIDEO' };
  }

  const sameRequestResponse = priorSameRequestResponse(event, record);
  if (sameRequestResponse) {
    return {
      expected: true,
      classification: 'EXPECTED_METADATA_RANGE_CANCEL_AFTER_RESPONSE_HEADERS',
      proof: { sameRequestResponse },
    };
  }

  const redundantProof = redundantAbortProof(event, record);
  if (redundantProof.proven) {
    return {
      expected: true,
      classification: 'EXPECTED_REDUNDANT_MEDIA_REQUEST_ABORT_AFTER_HEALTHY_METADATA',
      proof: redundantProof,
    };
  }

  return {
    expected: false,
    classification: 'FATAL_MEDIA_ABORT_WITHOUT_SEQUENCE_PROOF',
    proof: redundantProof,
  };
};

const runClassifierMutations = () => {
  const url = 'https://example.invalid/video.mp4';
  const otherUrl = 'https://example.invalid/other.mp4';
  const healthyVideo = {
    sources: [url], readyState: 1, networkState: 1, errorCode: null, duration: 60,
  };
  const healthyCheckpoint = {
    sources: [url], readyState: 1, networkState: 1, errorCode: null, duration: 60, observedAtMs: 100,
  };
  const lazyAbort = {
    seq: 4,
    requestId: 'media-1',
    phase: 'lazy-load',
    resourceType: 'media',
    url,
    errorText: 'net::ERR_ABORTED',
  };
  const sameRequestRecord = {
    videos: [healthyVideo],
    mediaRequestStarts: [{ seq: 1, requestId: 'media-1', url, startedAtMs: 90 }],
    mediaHealthCheckpoints: [],
    networkResponses: [{ seq: 2, requestId: 'media-1', url, status: 206, observedAtMs: 110 }],
  };
  const redundantAbort = { ...lazyAbort, seq: 8, requestId: 'media-2' };
  const redundantRecord = {
    videos: [healthyVideo],
    mediaRequestStarts: [
      { seq: 1, requestId: 'media-1', url, startedAtMs: 80 },
      { seq: 6, requestId: 'media-2', url, startedAtMs: 120 },
    ],
    mediaHealthCheckpoints: [healthyCheckpoint],
    networkResponses: [{ seq: 2, requestId: 'media-1', url, status: 206, observedAtMs: 90 }],
  };
  const redundantRecordNodeClock = {
    ...redundantRecord,
    mediaRequestStarts: [
      { seq: 1, requestId: 'media-1', url, startedAtMs: 80, nodeObservedAtMs: 80 },
      { seq: 6, requestId: 'media-2', url, startedAtMs: null, nodeObservedAtMs: 120 },
    ],
  };

  const fixtures = [
    ['proven same-request metadata cancellation', lazyAbort, sameRequestRecord, true],
    ['redundant request after healthy metadata and prior response', redundantAbort, redundantRecord, true],
    ['redundant request uses request-event clock when browser timing is unavailable', redundantAbort, redundantRecordNodeClock, true],
    ['later same-source response cannot prove earlier abort', lazyAbort, {
      videos: [healthyVideo],
      mediaRequestStarts: [{ seq: 1, requestId: 'media-1', url, startedAtMs: 90 }],
      mediaHealthCheckpoints: [],
      networkResponses: [{ seq: 5, requestId: 'media-2', url, status: 206, observedAtMs: 130 }],
    }, false],
    ['different prior request without metadata checkpoint', redundantAbort, {
      ...redundantRecord,
      mediaHealthCheckpoints: [],
    }, false],
    ['metadata checkpoint after redundant request start', redundantAbort, {
      ...redundantRecord,
      mediaHealthCheckpoints: [{ ...healthyCheckpoint, observedAtMs: 121 }],
    }, false],
    ['unhealthy metadata checkpoint', redundantAbort, {
      ...redundantRecord,
      mediaHealthCheckpoints: [{ ...healthyCheckpoint, readyState: 0, duration: null }],
    }, false],
    ['wrong metadata URL', redundantAbort, {
      ...redundantRecord,
      mediaHealthCheckpoints: [{ ...healthyCheckpoint, sources: [otherUrl] }],
    }, false],
    ['missing redundant request start', redundantAbort, {
      ...redundantRecord,
      mediaRequestStarts: redundantRecord.mediaRequestStarts.filter((item) => item.requestId !== 'media-2'),
    }, false],
    ['request start without any usable clock remains fatal', redundantAbort, {
      ...redundantRecord,
      mediaRequestStarts: [
        redundantRecord.mediaRequestStarts[0],
        { seq: 6, requestId: 'media-2', url, startedAtMs: null, nodeObservedAtMs: null },
      ],
    }, false],
    ['prior response after redundant request start', redundantAbort, {
      ...redundantRecord,
      networkResponses: [{ seq: 7, requestId: 'media-1', url, status: 206, observedAtMs: 121 }],
    }, false],
    ['prior response wrong URL', redundantAbort, {
      ...redundantRecord,
      networkResponses: [{ seq: 2, requestId: 'media-1', url: otherUrl, status: 206, observedAtMs: 90 }],
    }, false],
    ['generic navigation abort', { ...lazyAbort, phase: 'navigation' }, sameRequestRecord, false],
    ['generic non-media lazy abort', { ...lazyAbort, resourceType: 'script' }, sameRequestRecord, false],
    ['missing response proof', lazyAbort, {
      videos: [healthyVideo], mediaRequestStarts: [], mediaHealthCheckpoints: [], networkResponses: [],
    }, false],
    ['wrong final media URL', lazyAbort, {
      ...sameRequestRecord,
      videos: [{ ...healthyVideo, sources: [otherUrl] }],
    }, false],
    ['unhealthy final media', lazyAbort, {
      ...sameRequestRecord,
      videos: [{ ...healthyVideo, readyState: 0, duration: null }],
    }, false],
    ['final media error', lazyAbort, {
      ...sameRequestRecord,
      videos: [{ ...healthyVideo, errorCode: 3 }],
    }, false],
    ['non-abort request failure', { ...lazyAbort, errorText: 'net::ERR_FAILED' }, sameRequestRecord, false],
    ['context teardown abort', { ...lazyAbort, phase: 'teardown' }, {
      videos: [], mediaRequestStarts: [], mediaHealthCheckpoints: [], networkResponses: [],
    }, true],
  ];

  for (const [name, event, record, expected] of fixtures) {
    const actual = classifyRequestFailure(event, record).expected;
    if (actual !== expected) {
      throw new Error(`Browser resource failure-classifier mutation failed: ${name}; expected=${expected}; actual=${actual}`);
    }
  }
  return fixtures.length;
};

const mutationCount = runClassifierMutations();

const exerciseLazyResources = async (page) => {
  await page.evaluate(async () => {
    const resolveUrl = (value) => {
      if (!value) return null;
      try { return new URL(value, document.baseURI).href; }
      catch { return value; }
    };
    const snapshotVideo = (video, kind) => ({
      kind,
      observedAtMs: Date.now(),
      sources: [...new Set([
        video.currentSrc,
        video.getAttribute('src'),
        ...[...video.querySelectorAll('source')].map((source) => source.getAttribute('src')),
      ].map(resolveUrl).filter(Boolean))],
      readyState: video.readyState,
      networkState: video.networkState,
      errorCode: video.error?.code ?? null,
      duration: Number.isFinite(video.duration) ? Number(video.duration) : null,
    });

    window.__s5MediaHealthCheckpoints = [];
    const videos = [...document.querySelectorAll('video')];
    for (const video of videos) {
      if (video.readyState >= 1) {
        window.__s5MediaHealthCheckpoints.push(snapshotVideo(video, 'initial-healthy-state'));
      }
      video.addEventListener('loadedmetadata', () => {
        window.__s5MediaHealthCheckpoints.push(snapshotVideo(video, 'loadedmetadata'));
      }, { once: true });
    }

    const root = document.scrollingElement ?? document.documentElement;
    const maxY = Math.max(0, root.scrollHeight - window.innerHeight);
    if (maxY > 0) {
      const steps = Math.min(12, Math.max(2, Math.ceil(maxY / Math.max(window.innerHeight, 1))));
      for (let index = 1; index <= steps; index += 1) {
        window.scrollTo({ top: Math.round((maxY * index) / steps), behavior: 'instant' });
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      }
    }

    for (const video of videos) {
      // Changing preload from none to metadata is sufficient to ask Chromium to run
      // media resource selection. Calling load() in the same task races that selection
      // and can itself cancel the valid range request we are trying to observe.
      if (video.preload === 'none') video.preload = 'metadata';
    }

    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    await Promise.all(videos.map(async (video) => {
      if (video.readyState >= 1 || video.error) return;
      await Promise.race([
        new Promise((resolve) => video.addEventListener('loadedmetadata', resolve, { once: true })),
        new Promise((resolve) => video.addEventListener('error', resolve, { once: true })),
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ]);
    }));
  });
};

const captureVideoHealth = async (page) => page.evaluate(() => [...document.querySelectorAll('video')].map((video) => {
  const resolveUrl = (value) => {
    if (!value) return null;
    try { return new URL(value, document.baseURI).href; }
    catch { return value; }
  };
  const sources = [
    video.currentSrc,
    video.getAttribute('src'),
    ...[...video.querySelectorAll('source')].map((source) => source.getAttribute('src')),
  ].map(resolveUrl).filter(Boolean);
  return {
    sources: [...new Set(sources)],
    readyState: video.readyState,
    networkState: video.networkState,
    errorCode: video.error?.code ?? null,
    duration: Number.isFinite(video.duration) ? Number(video.duration) : null,
  };
}));

const captureMediaHealthCheckpoints = async (page) => page.evaluate(() => (
  Array.isArray(window.__s5MediaHealthCheckpoints) ? window.__s5MediaHealthCheckpoints : []
));

const launchAuditBrowser = async () => {
  try {
    const browser = await chromium.launch({ headless: true, channel: 'chrome' });
    return {
      browser,
      runtime: {
        requested_channel: 'chrome',
        actual_channel: 'chrome',
        version: browser.version(),
        fallback_reason: null,
      },
    };
  } catch (error) {
    const fallbackReason = error instanceof Error ? error.message : String(error);
    const browser = await chromium.launch({ headless: true });
    return {
      browser,
      runtime: {
        requested_channel: 'chrome',
        actual_channel: 'playwright-chromium',
        version: browser.version(),
        fallback_reason: fallbackReason,
      },
    };
  }
};

const reportPath = path.resolve('artifacts/security-requalification/shared-browser-resources/report.json');
await fs.mkdir(path.dirname(reportPath), { recursive: true });

const { browser, runtime: browserRuntime } = await launchAuditBrowser();
const failures = [];
const expectedAborts = [];
const contextRecords = [];
const tasks = paths.flatMap((route, routeIndex) => profileNames.map((profileName, profileIndex) => ({
  route,
  profileName,
  order: routeIndex * profileNames.length + profileIndex,
})));
const concurrency = Math.min(requestedConcurrency, Math.max(tasks.length, 1));
const auditStartedAt = Date.now();
let auditedContexts = 0;

const auditContext = async ({ route, profileName, order }) => {
  const profile = profileCatalog[profileName];
  const context = await browser.newContext({
    viewport: profile.viewport,
    colorScheme: 'light',
    reducedMotion: profile.reducedMotion,
    isMobile: profile.isMobile,
    hasTouch: profile.hasTouch,
  });
  const page = await context.newPage();
  let phase = 'navigation';
  let seq = 0;
  let requestCounter = 0;
  const requestIds = new WeakMap();
  const mediaRequestStarts = [];
  const networkResponses = [];
  const requestFailures = [];
  const directFailures = [];
  let mediaHealthCheckpoints = [];
  let videos = [];
  const label = `${route} [${profileName}]`;
  const contextStartedAt = Date.now();
  const requestIdFor = (request) => {
    if (!requestIds.has(request)) requestIds.set(request, `request-${++requestCounter}`);
    return requestIds.get(request);
  };

  page.on('pageerror', (error) => {
    directFailures.push(`${label}: pageerror during ${phase}: ${error.message}`);
  });

  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    directFailures.push(`${label}: console:error during ${phase}: ${message.text()}`);
  });

  page.on('request', (request) => {
    if (request.resourceType() !== 'media') return;
    let startedAtMs = null;
    try {
      const candidate = request.timing()?.startTime;
      if (Number.isFinite(candidate) && candidate > 0) startedAtMs = candidate;
    } catch {
      startedAtMs = null;
    }
    mediaRequestStarts.push({
      seq: ++seq,
      requestId: requestIdFor(request),
      url: request.url(),
      phase,
      startedAtMs,
      nodeObservedAtMs: Date.now(),
    });
  });

  page.on('response', (response) => {
    const request = response.request();
    const resourceType = request.resourceType();
    const eventSeq = ++seq;
    if (resourceType === 'media' && [200, 206].includes(response.status())) {
      networkResponses.push({
        seq: eventSeq,
        requestId: requestIdFor(request),
        url: response.url(),
        status: response.status(),
        observedAtMs: Date.now(),
      });
    }
    if (response.status() < 400) return;
    if (isTransientExternalFontFailure(response.url(), resourceType)) return;
    directFailures.push(
      `${label}: HTTP ${response.status()} during ${phase}: ${response.url()} `
      + `[type=${resourceType}; frame=${safeFrameUrl(request)}; navigation=${request.isNavigationRequest()}]`,
    );
  });

  page.on('requestfailed', (request) => {
    if (isTransientExternalFontFailure(request.url(), request.resourceType())) return;
    requestFailures.push({
      seq: ++seq,
      requestId: requestIdFor(request),
      phase,
      url: request.url(),
      errorText: request.failure()?.errorText ?? 'unknown error',
      resourceType: request.resourceType(),
      frame: safeFrameUrl(request),
      navigation: request.isNavigationRequest(),
      observedAtMs: Date.now(),
    });
  });

  try {
    const response = await page.goto(`${baseUrl}${route}`, {
      waitUntil: 'networkidle',
      timeout: 30_000,
    });
    if (!response?.ok()) {
      directFailures.push(`${label}: document returned ${response?.status() ?? 'no response'}`);
    }

    phase = 'lazy-load';
    await exerciseLazyResources(page);
    await page.waitForTimeout(250);

    phase = 'settle';
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(100);
    mediaHealthCheckpoints = await captureMediaHealthCheckpoints(page);
    videos = await captureVideoHealth(page);
    for (const [videoIndex, video] of videos.entries()) {
      if (!isHealthyVideo(video)) {
        directFailures.push(
          `${label}: video ${videoIndex + 1} did not reach healthy metadata state `
          + `[readyState=${video.readyState}; networkState=${video.networkState}; errorCode=${video.errorCode}; `
          + `duration=${video.duration}; sources=${video.sources.join(',')}]`,
        );
      }
    }
  } catch (error) {
    directFailures.push(`${label}: audit exception during ${phase}: ${error.message}`);
  } finally {
    phase = 'teardown';
    await context.close();
  }

  const record = { videos, networkResponses, mediaRequestStarts, mediaHealthCheckpoints };
  const classified = requestFailures.map((event) => ({
    event,
    verdict: classifyRequestFailure(event, record),
  }));
  const localFailures = [...directFailures];
  const localExpectedAborts = [];
  for (const item of classified) {
    if (item.verdict.expected) {
      localExpectedAborts.push({
        label,
        ...item.event,
        classification: item.verdict.classification,
        proof: item.verdict.proof ?? null,
      });
      continue;
    }
    localFailures.push(
      `${label}: request failed during ${item.event.phase}: ${item.event.url} (${item.event.errorText}) `
      + `[requestId=${item.event.requestId}; seq=${item.event.seq}; type=${item.event.resourceType}; `
      + `frame=${item.event.frame}; navigation=${item.event.navigation}; `
      + `classification=${item.verdict.classification}; proof=${JSON.stringify(item.verdict.proof ?? null)}]`,
    );
  }

  return {
    order,
    failures: localFailures,
    expectedAborts: localExpectedAborts,
    context: {
      route,
      profile: profileName,
      elapsed_ms: Date.now() - contextStartedAt,
      video_count: videos.length,
      request_failure_count: requestFailures.length,
      expected_abort_count: classified.filter((item) => item.verdict.expected).length,
      fatal_request_failure_count: classified.filter((item) => !item.verdict.expected).length,
      direct_failure_count: directFailures.length,
      successful_media_response_count: networkResponses.length,
      media_request_start_count: mediaRequestStarts.length,
      media_health_checkpoint_count: mediaHealthCheckpoints.length,
      videos,
      media_request_starts: mediaRequestStarts,
      media_health_checkpoints: mediaHealthCheckpoints,
      network_responses: networkResponses,
      request_failures: classified.map(({ event, verdict }) => ({
        ...event,
        classification: verdict.classification,
        expected: verdict.expected,
        proof: verdict.proof ?? null,
      })),
    },
  };
};

const writeReport = async ({ complete }) => {
  const sortedContexts = [...contextRecords].sort((left, right) => left.order - right.order);
  const report = {
    schema_version: 6,
    verdict_basis: 'POST_CONTEXT_TEARDOWN_WITH_REQUEST_EVENT_CLOCK_RESPONSE_AND_PRE_REQUEST_METADATA_SEQUENCE_PROOF',
    execution_model: 'BOUNDED_PARALLEL_BATCHES_WITH_INCREMENTAL_REPORTING',
    browser_runtime: browserRuntime,
    complete,
    concurrency,
    elapsed_ms: Date.now() - auditStartedAt,
    paths,
    profiles: profileNames,
    contexts_expected: tasks.length,
    contexts_observed: auditedContexts,
    mutation_fixture_count: mutationCount,
    expected_abort_count: expectedAborts.length,
    failure_count: failures.length,
    failures,
    expected_aborts: expectedAborts,
    contexts: sortedContexts.map(({ order: omittedOrder, ...record }) => record),
  };
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
};

try {
  await writeReport({ complete: false });
  for (let offset = 0; offset < tasks.length; offset += concurrency) {
    const batch = tasks.slice(offset, offset + concurrency);
    const results = await Promise.all(batch.map((task) => auditContext(task)));
    for (const result of results) {
      failures.push(...result.failures);
      expectedAborts.push(...result.expectedAborts);
      contextRecords.push({ order: result.order, ...result.context });
      auditedContexts += 1;
    }
    await writeReport({ complete: false });
    console.log(
      `[shared-browser-resources] completed ${auditedContexts}/${tasks.length} contexts `
      + `with concurrency=${concurrency}; elapsed_ms=${Date.now() - auditStartedAt}`,
    );
  }
  await writeReport({ complete: true });
} finally {
  await browser.close();
}

if (auditedContexts !== tasks.length) {
  failures.push(`Browser resource audit observed ${auditedContexts}/${tasks.length} expected contexts`);
  await writeReport({ complete: false });
}

if (failures.length > 0) {
  console.error('Browser resource audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error(`Report: ${reportPath}`);
  process.exit(1);
}

console.log(
  `Browser resource audit passed for ${paths.length} pages across ${profileNames.length} profiles `
  + `(${auditedContexts} contexts), including lazy-resource exercise, ${mutationCount} classifier mutations, `
  + `${expectedAborts.length} proven expected media/teardown aborts, bounded concurrency=${concurrency} `
  + 'and post-teardown verdicts.',
);
console.log(`Browser runtime: ${browserRuntime.actual_channel} ${browserRuntime.version}`);
console.log(`Report: ${reportPath}`);
