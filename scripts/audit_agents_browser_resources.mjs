import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const upstreamReportPath = path.resolve('artifacts/security-requalification/shared-browser-resources/report.json');
const proofPath = path.resolve('artifacts/agents-requalification/browser-resource-proof.json');

const isHealthyVideo = (video) => Boolean(
  video
  && video.readyState >= 1
  && video.networkState !== 3
  && video.errorCode == null
  && Number.isFinite(video.duration)
  && video.duration > 0
);

const matchingHealthyVideo = (failure, context) => (context.videos ?? []).find((video) => (
  (video.sources ?? []).includes(failure.url) && isHealthyVideo(video)
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

const proveExpectedAbort = (failure, context) => {
  if (!/ERR_ABORTED/i.test(failure.errorText ?? '')) {
    return { expected: false, classification: 'FATAL_NON_ABORT_REQUEST_FAILURE' };
  }
  if (failure.phase === 'teardown') {
    return { expected: true, classification: 'EXPECTED_CONTEXT_TEARDOWN_ABORT' };
  }
  if (!['navigation', 'lazy-load', 'settle'].includes(failure.phase) || failure.resourceType !== 'media') {
    return { expected: false, classification: 'FATAL_UNPROVEN_PRE_TEARDOWN_ABORT' };
  }

  const video = matchingHealthyVideo(failure, context);
  if (!video) {
    return { expected: false, classification: 'FATAL_MEDIA_ABORT_WITHOUT_HEALTHY_MATCHING_VIDEO' };
  }

  const sameRequestResponse = (context.network_responses ?? []).find((response) => (
    response.seq < failure.seq
    && response.requestId === failure.requestId
    && response.url === failure.url
    && [200, 206].includes(response.status)
  ));
  if (sameRequestResponse) {
    return {
      expected: true,
      classification: 'EXPECTED_METADATA_RANGE_CANCEL_AFTER_RESPONSE_HEADERS_AND_FINAL_HEALTH',
      proof: { sameRequestResponse, finalVideo: video },
    };
  }

  const start = (context.media_request_starts ?? []).find((candidate) => (
    candidate.requestId === failure.requestId && candidate.url === failure.url
  ));
  if (!start) {
    return { expected: false, classification: 'FATAL_MEDIA_ABORT_WITHOUT_REQUEST_START' };
  }
  const startClock = requestStartClock(start);
  if (!startClock) {
    return { expected: false, classification: 'FATAL_MEDIA_ABORT_WITHOUT_REQUEST_START_CLOCK' };
  }

  const priorResponse = (context.network_responses ?? [])
    .filter((response) => (
      response.requestId !== failure.requestId
      && response.url === failure.url
      && [200, 206].includes(response.status)
      && response.seq < start.seq
      && Number.isFinite(response.observedAtMs)
      && response.observedAtMs <= startClock.observedAtMs
    ))
    .sort((left, right) => right.observedAtMs - left.observedAtMs)[0];
  if (!priorResponse) {
    return {
      expected: false,
      classification: 'FATAL_MEDIA_ABORT_WITHOUT_PRIOR_SUCCESSFUL_RANGE_RESPONSE',
      proof: { start, startClock, finalVideo: video },
    };
  }

  return {
    expected: true,
    classification: 'EXPECTED_REDUNDANT_MEDIA_ABORT_AFTER_PRIOR_RANGE_RESPONSE_AND_FINAL_HEALTH',
    proof: { start, startClock, priorResponse, finalVideo: video },
  };
};

const runMutationFixtures = () => {
  const url = 'https://example.invalid/video.mp4';
  const healthyVideo = { sources: [url], readyState: 1, networkState: 1, errorCode: null, duration: 60 };
  const failure = {
    seq: 5,
    requestId: 'request-2',
    phase: 'navigation',
    resourceType: 'media',
    url,
    errorText: 'net::ERR_ABORTED',
  };
  const sameRequestContext = {
    videos: [healthyVideo],
    media_request_starts: [{ seq: 1, requestId: 'request-2', url, nodeObservedAtMs: 100 }],
    network_responses: [{ seq: 2, requestId: 'request-2', url, status: 206, observedAtMs: 101 }],
  };
  const redundantContext = {
    videos: [healthyVideo],
    media_request_starts: [
      { seq: 1, requestId: 'request-1', url, nodeObservedAtMs: 80 },
      { seq: 4, requestId: 'request-2', url, nodeObservedAtMs: 120 },
    ],
    network_responses: [{ seq: 2, requestId: 'request-1', url, status: 206, observedAtMs: 90 }],
  };
  const fixtures = [
    ['navigation abort after same-request 206 and final healthy metadata', failure, sameRequestContext, true],
    ['redundant abort after prior 206 and final healthy metadata', failure, redundantContext, true],
    ['same-request response cannot mask unhealthy final media', failure, {
      ...sameRequestContext,
      videos: [{ ...healthyVideo, readyState: 0, duration: null }],
    }, false],
    ['prior response after redundant request start remains fatal', failure, {
      ...redundantContext,
      network_responses: [{ seq: 6, requestId: 'request-1', url, status: 206, observedAtMs: 130 }],
    }, false],
    ['different URL response remains fatal', failure, {
      ...redundantContext,
      network_responses: [{ seq: 2, requestId: 'request-1', url: `${url}.other`, status: 206, observedAtMs: 90 }],
    }, false],
    ['no response proof remains fatal', failure, { ...redundantContext, network_responses: [] }, false],
    ['non-media navigation abort remains fatal', { ...failure, resourceType: 'script' }, sameRequestContext, false],
    ['non-abort failure remains fatal', { ...failure, errorText: 'net::ERR_FAILED' }, sameRequestContext, false],
  ];
  for (const [name, event, context, expected] of fixtures) {
    const actual = proveExpectedAbort(event, context).expected;
    if (actual !== expected) {
      throw new Error(`Agents browser abort mutation failed: ${name}; expected=${expected}; actual=${actual}`);
    }
  }
  return fixtures.length;
};

const mutationFixtureCount = runMutationFixtures();
const upstream = spawnSync(process.execPath, ['scripts/audit_browser_resources.mjs'], {
  env: process.env,
  encoding: 'utf8',
});
if (upstream.stdout) process.stdout.write(upstream.stdout);
if (upstream.stderr) process.stderr.write(upstream.stderr);

if (upstream.status === 0) {
  console.log(`Agents browser resource audit passed upstream; ${mutationFixtureCount} supplemental proof mutations PASS.`);
  process.exit(0);
}

let report;
try {
  report = JSON.parse(await fs.readFile(upstreamReportPath, 'utf8'));
} catch (error) {
  console.error(`Cannot read complete upstream browser report after failure: ${error.message}`);
  process.exit(upstream.status ?? 1);
}

const unresolved = [];
const reclassified = [];
if (!report.complete || report.contexts_observed !== report.contexts_expected) {
  unresolved.push({
    classification: 'FATAL_INCOMPLETE_BROWSER_AUDIT',
    complete: report.complete,
    contexts_observed: report.contexts_observed,
    contexts_expected: report.contexts_expected,
  });
}

for (const context of report.contexts ?? []) {
  if ((context.direct_failure_count ?? 0) > 0) {
    unresolved.push({
      route: context.route,
      profile: context.profile,
      classification: 'FATAL_DIRECT_BROWSER_FAILURE',
      direct_failure_count: context.direct_failure_count,
    });
  }
  for (const failure of context.request_failures ?? []) {
    if (failure.expected) continue;
    const verdict = proveExpectedAbort(failure, context);
    const record = { route: context.route, profile: context.profile, failure, verdict };
    if (verdict.expected) reclassified.push(record);
    else unresolved.push(record);
  }
}

const proof = {
  schema_version: 1,
  contract: 'POST_TEARDOWN_CAUSAL_MEDIA_ABORT_PROOF_WITH_FINAL_HEALTH_AND_PRIOR_OR_SAME_REQUEST_SUCCESS',
  upstream_report: path.relative(process.cwd(), upstreamReportPath),
  upstream_exit_code: upstream.status,
  upstream_complete: report.complete,
  contexts_expected: report.contexts_expected,
  contexts_observed: report.contexts_observed,
  mutation_fixture_count: mutationFixtureCount,
  reclassified_abort_count: reclassified.length,
  unresolved_failure_count: unresolved.length,
  reclassified,
  unresolved,
};
await fs.mkdir(path.dirname(proofPath), { recursive: true });
await fs.writeFile(proofPath, `${JSON.stringify(proof, null, 2)}\n`, 'utf8');

if (unresolved.length > 0) {
  console.error(`Agents browser resource causal proof FAILED: ${unresolved.length} unresolved failures remain.`);
  console.error(`Proof: ${proofPath}`);
  process.exit(1);
}

console.log(
  `Agents browser resource causal proof PASS: ${reclassified.length} Chromium media aborts were proven `
  + 'redundant/metadata-range cancellations using successful response order plus final healthy media state; '
  + `${mutationFixtureCount} negative/positive proof mutations PASS.`,
);
console.log(`Proof: ${proofPath}`);
