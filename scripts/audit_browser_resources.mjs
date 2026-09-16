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

const matchingSuccessfulResponse = (event, record) => {
  const responses = record.networkResponses ?? [];
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
};

const isHealthyVideo = (video) => Boolean(
  video
  && video.readyState >= 1
  && video.networkState !== 3
  && video.errorCode == null
  && Number.isFinite(video.duration)
  && video.duration > 0
);

const matchingHealthyVideo = (event, record) => (record.videos ?? []).find((video) => (
  video.sources.includes(event.url)
  && isHealthyVideo(video)
));

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

  const responseProof = matchingSuccessfulResponse(event, record);
  if (!responseProof.proven) {
    return { expected: false, classification: 'FATAL_MEDIA_ABORT_WITHOUT_RESPONSE_PROOF' };
  }

  return {
    expected: true,
    classification: responseProof.priorSameRequest
      ? 'EXPECTED_METADATA_RANGE_CANCEL_AFTER_RESPONSE_HEADERS'
      : 'EXPECTED_METADATA_RANGE_CANCEL_SUPERSEDED_BY_LATER_RESPONSE',
  };
};

const runClassifierMutations = () => {
  const url = 'https://example.invalid/video.mp4';
  const healthyVideo = {
    sources: [url], readyState: 1, networkState: 1, errorCode: null, duration: 60,
  };
  const baseRecord = {
    videos: [healthyVideo],
    networkResponses: [{ seq: 1, requestId: 'media-1', url, status: 206 }],
  };
  const lazyAbort = {
    seq: 2,
    requestId: 'media-1',
    phase: 'lazy-load',
    resourceType: 'media',
    url,
    errorText: 'net::ERR_ABORTED',
  };

  const fixtures = [
    ['proven same-request metadata cancellation', lazyAbort, baseRecord, true],
    ['later same-source superseding response', lazyAbort, {
      videos: [healthyVideo],
      networkResponses: [{ seq: 3, requestId: 'media-2', url, status: 206 }],
    }, true],
    ['generic navigation abort', { ...lazyAbort, phase: 'navigation' }, baseRecord, false],
    ['generic non-media lazy abort', { ...lazyAbort, resourceType: 'script' }, baseRecord, false],
    ['different prior request only', lazyAbort, {
      videos: [healthyVideo],
      networkResponses: [{ seq: 1, requestId: 'other-request', url, status: 206 }],
    }, false],
    ['missing response proof', lazyAbort, { videos: [healthyVideo], networkResponses: [] }, false],
    ['wrong media URL', lazyAbort, {
      videos: [{ ...healthyVideo, sources: ['https://example.invalid/other.mp4'] }],
      networkResponses: baseRecord.networkResponses,
    }, false],
    ['unhealthy media', lazyAbort, {
      videos: [{ ...healthyVideo, readyState: 0, duration: null }],
      networkResponses: baseRecord.networkResponses,
    }, false],
    ['media error', lazyAbort, {
      videos: [{ ...healthyVideo, errorCode: 3 }],
      networkResponses: baseRecord.networkResponses,
    }, false],
    ['non-abort request failure', { ...lazyAbort, errorText: 'net::ERR_FAILED' }, baseRecord, false],
    ['context teardown abort', { ...lazyAbort, phase: 'teardown' }, { videos: [], networkResponses: [] }, true],
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
    const root = document.scrollingElement ?? document.documentElement;
    const maxY = Math.max(0, root.scrollHeight - window.innerHeight);
    if (maxY > 0) {
      const steps = Math.min(12, Math.max(2, Math.ceil(maxY / Math.max(window.innerHeight, 1))));
      for (let index = 1; index <= steps; index += 1) {
        window.scrollTo({ top: Math.round((maxY * index) / steps), behavior: 'instant' });
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      }
    }

    const videos = [...document.querySelectorAll('video')];
    for (const video of videos) {
      // Changing preload from none to metadata is sufficient to ask Chromium to run
      // media resource selection. Calling load() in the same task races that selection
      // and can itself cancel the valid range request we are trying to observe.
      if (video.preload === 'none') video.preload = 'metadata';
    }

    // Give the resource-selection task a chance to start before awaiting metadata.
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

const reportPath = path.resolve('artifacts/security-requalification/shared-browser-resources/report.json');
await fs.mkdir(path.dirname(reportPath), { recursive: true });

const browser = await chromium.launch({ headless: true });
const failures = [];
const expectedAborts = [];
const contextRecords = [];
let auditedContexts = 0;

try {
  for (const route of paths) {
    for (const profileName of profileNames) {
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
      const networkResponses = [];
      const requestFailures = [];
      const directFailures = [];
      let videos = [];
      const label = `${route} [${profileName}]`;
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
        // Keep every listener active through context teardown. The verdict is computed only afterwards.
        phase = 'teardown';
        await context.close();
        auditedContexts += 1;
      }

      const record = { videos, networkResponses };
      const classified = requestFailures.map((event) => ({
        event,
        verdict: classifyRequestFailure(event, record),
      }));
      for (const item of classified) {
        if (item.verdict.expected) {
          expectedAborts.push({ label, ...item.event, classification: item.verdict.classification });
          continue;
        }
        failures.push(
          `${label}: request failed during ${item.event.phase}: ${item.event.url} (${item.event.errorText}) `
          + `[type=${item.event.resourceType}; frame=${item.event.frame}; navigation=${item.event.navigation}; `
          + `classification=${item.verdict.classification}]`,
        );
      }
      failures.push(...directFailures);
      contextRecords.push({
        route,
        profile: profileName,
        video_count: videos.length,
        request_failure_count: requestFailures.length,
        expected_abort_count: classified.filter((item) => item.verdict.expected).length,
        fatal_request_failure_count: classified.filter((item) => !item.verdict.expected).length,
        direct_failure_count: directFailures.length,
        successful_media_response_count: networkResponses.length,
        videos,
      });
    }
  }
} finally {
  await browser.close();
}

const report = {
  schema_version: 2,
  verdict_basis: 'POST_CONTEXT_TEARDOWN_WITH_REQUEST_RESPONSE_CORRELATION_AND_FINAL_MEDIA_HEALTH',
  paths,
  profiles: profileNames,
  contexts_expected: paths.length * profileNames.length,
  contexts_observed: auditedContexts,
  mutation_fixture_count: mutationCount,
  expected_abort_count: expectedAborts.length,
  failure_count: failures.length,
  failures,
  expected_aborts: expectedAborts,
  contexts: contextRecords,
};
await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

if (failures.length > 0) {
  console.error('Browser resource audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error(`Report: ${reportPath}`);
  process.exit(1);
}

console.log(
  `Browser resource audit passed for ${paths.length} pages across ${profileNames.length} profiles `
  + `(${auditedContexts} contexts), including lazy-resource exercise, ${mutationCount} classifier mutations, `
  + `${expectedAborts.length} proven expected media/teardown aborts and post-teardown verdicts.`,
);
console.log(`Report: ${reportPath}`);
