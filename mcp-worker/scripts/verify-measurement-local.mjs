#!/usr/bin/env node
/**
 * Native workerd + SQLite Durable Object smoke using the real Wrangler bundle.
 * Every request remains local. GitHub JWKS is a generated test fixture, and no
 * analytics are sent to 5sigmas or Cloudflare. Requires `npm ci` in mcp-worker.
 * workerd does not implement geographic jurisdictions: the local entry wrapper
 * asserts that production requests "eu", then uses isolated local SQLite.
 * Actual EU placement and Cloudflare credentials require live verification.
 *
 * Run from any directory: node mcp-worker/scripts/verify-measurement-local.mjs
 * Add --keep-state to retain the synthetic SQLite state in the printed temp dir.
 * --bundle /absolute/path/index.js uses a separately built Wrangler dry bundle.
 */
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { webcrypto } from 'node:crypto';
import { Miniflare, convertV4MiniflareOptions, Log, LogLevel } from 'miniflare';

const workerRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const execute = promisify(execFile);
const work = await mkdtemp(join(tmpdir(), '5sigmas-measurement-local-'));
const keepState = process.argv.includes('--keep-state');
process.env.WRANGLER_SEND_METRICS = 'false';
process.env.WRANGLER_LOG_PATH = join(work, 'wrangler.log');
process.env.XDG_CONFIG_HOME = join(work, 'config');
await mkdir(process.env.XDG_CONFIG_HOME, { recursive: true });
let runtime;

try {
  const { unstable_getMiniflareWorkerOptions } = await import('wrangler');
  const { workerOptions } = unstable_getMiniflareWorkerOptions(join(workerRoot, 'wrangler.jsonc'));
  assert.equal(workerOptions.durableObjects?.MEASUREMENT_STORE?.className, 'MeasurementStore');
  assert.equal(workerOptions.durableObjects?.MEASUREMENT_STORE?.useSQLite, true,
    'The production binding and migration must enable native SQLite');
  assert.equal(workerOptions.bindings?.MEASUREMENT_ENABLED, 'true');
  const bundleArgument = process.argv.indexOf('--bundle');
  let bundlePath;
  if (bundleArgument !== -1) {
    assert.ok(process.argv[bundleArgument + 1], '--bundle requires an existing Wrangler output path');
    bundlePath = resolve(process.argv[bundleArgument + 1]);
  } else {
    const bundleDirectory = join(work, 'bundle');
    const wrangler = join(dirname(require.resolve('wrangler/package.json')), 'bin', 'wrangler.js');
    await execute(process.execPath, [wrangler, 'deploy', '--dry-run', '--outdir', bundleDirectory], {
      cwd: workerRoot, env: process.env, encoding: 'utf8', stdio: 'pipe', timeout: 60000,
    });
    bundlePath = join(bundleDirectory, 'index.js');
  }

  const pair = await webcrypto.subtle.generateKey({
    name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256',
  }, true, ['sign', 'verify']);
  const jwk = { ...await webcrypto.subtle.exportKey('jwk', pair.publicKey),
    kid: 'local-smoke-key', alg: 'RS256', use: 'sig' };
  const origin = 'https://5sigmas.com';
  const prefix = `${origin}/_s5/measurement`;
  const jwksUrl = 'https://token.actions.githubusercontent.com/.well-known/jwks';
  const outbound = [];
  const localEntry = `
    import worker from './index.js';
    export { MeasurementStore } from './index.js';
    export default {
      fetch(request, env, ctx) {
        const localNamespace = env.MEASUREMENT_STORE;
        return worker.fetch(request, { ...env, MEASUREMENT_STORE: {
          jurisdiction(requested) {
            if (requested !== 'eu') throw new Error('Unexpected production jurisdiction');
            return localNamespace;
          }
        } }, ctx);
      }
    };
  `;
  const options = convertV4MiniflareOptions({
    ...workerOptions,
    name: 'five-sigmas-measurement-local-smoke',
    // Wrangler already resolved/bundled source rules. Mount its emitted module
    // explicitly; v5's converter intentionally refuses unbundled module rules.
    modules: [
      { type: 'ESModule', path: join(dirname(bundlePath), 'local-measurement-entry.mjs'), contents: localEntry },
      { type: 'ESModule', path: bundlePath },
    ], modulesRoot: dirname(bundlePath),
    modulesRules: undefined,
    cf: false, logRequests: false, telemetry: { enabled: false },
    log: new Log(LogLevel.ERROR),
    // With shared storage disabled, v5 derives its isolated persistence root
    // from resourcePersistencePath (not isolatedResourcePersistencePath).
    resourcePersistencePath: join(work, 'state'),
    outboundService: async (request) => {
      // Even an accidental production fetch fails locally instead of escaping.
      outbound.push(request.url);
      assert.equal(request.url, jwksUrl, 'Unexpected outbound request in local smoke');
      assert.equal(request.method, 'GET');
      assert.equal(request.headers.has('Authorization'), false);
      return new Response(JSON.stringify({ keys: [jwk] }), {
        headers: { 'Content-Type': 'application/json' },
      });
    },
  });
  runtime = new Miniflare(options);
  const mcpHealth = await runtime.dispatchFetch(`${origin}/mcp/health`);
  assert.equal(mcpHealth.status, 200, 'Existing MCP route must still initialize');
  const health = await runtime.dispatchFetch(`${prefix}/health`);
  if (!health.ok) {
    // Local-only diagnostics expose runtime wiring failures otherwise redacted
    // by the production HTTP boundary. No visitor data exists in this test.
    const namespace = await runtime.getDurableObjectNamespace('MEASUREMENT_STORE');
    const stub = namespace.get(namespace.idFromName('5sigmas-postclick-v1'));
    const detail = await stub.fetch('https://measurement.internal/health');
    assert.equal(detail.status, 200, `Native binding health: ${await detail.text()}`);
  }
  assert.equal(health.status, 200, `Native storage readiness: ${await health.clone().text()}`);
  const healthBody = await health.json();
  assert.equal(healthBody.storage, 'ready');
  assert.equal(healthBody.consent_mode, 'explicit_opt_in');
  assert.equal((await runtime.dispatchFetch(`${prefix}/export`)).status, 401);
  assert.equal((await runtime.dispatchFetch(`${prefix}/export`, {
    headers: { Authorization: 'Bearer malformed.token.signature' },
  })).status, 401);

  // The real runtime supplies the entire schema and requires explicit consent.
  const { bootMeasurement } = await import('../../scripts/measurement_test_harness.mjs');
  const browser = bootMeasurement({ now: Date.now(), crypto: webcrypto });
  assert.equal(browser.sent.length, 0);
  browser.grant();
  browser.dispatch('change', browser.fields.inputTokens);
  browser.api.track('result_rendered', { tool_id: 'model-price-performance', result_kind: 'comparison' });
  browser.api.track('scenario_completed', { tool_id: 'model-price-performance', result_kind: 'comparison' });
  browser.api.track('export', { tool_id: 'model-price-performance', action: 'export' });
  assert.equal(browser.sent.length, 6);
  const intake = async (record, headerChanges = {}, body = record.options.body) => {
    const headers = new Headers({ ...record.requestHeaders, ...headerChanges });
    for (const [key, value] of Object.entries(headerChanges)) if (value === null) headers.delete(key);
    return runtime.dispatchFetch(record.url, { method: 'POST', headers, body });
  };
  const first = browser.sent[0];
  assert.equal((await intake(first, { 'X-S5-Consent': null })).status, 403);
  assert.equal((await intake(first, { Origin: 'https://attacker.invalid' })).status, 403);
  assert.equal((await intake(first, { Cookie: 'synthetic=not-allowed' })).status, 403);
  assert.equal((await intake(first, { 'Sec-GPC': '1' })).status, 403);
  for (const record of browser.sent) {
    const response = await intake(record);
    assert.equal(response.status, 202, `Native intake rejected ${record.payload.event_name}: ${await response.text()}`);
  }
  assert.equal((await intake(first)).status, 200, 'A duplicate must not increment unique counters');
  assert.equal((await intake(first, {}, JSON.stringify({ ...first.payload, page_path: '/en/' }))).status, 409);

  async function token(changes = {}) {
    const seconds = Math.floor(Date.now() / 1000);
    const claims = {
      iss: 'https://token.actions.githubusercontent.com', aud: `${prefix}/export`,
      sub: 'repo:fjmmontiel/5sigmas-tools-content:ref:refs/heads/main',
      exp: seconds + 300, iat: seconds, nbf: seconds,
      repository: 'fjmmontiel/5sigmas-tools-content', repository_id: '1249897559',
      repository_owner_id: '162696664', repository_visibility: 'private',
      ref: 'refs/heads/main', ref_type: 'branch',
      workflow_ref: 'fjmmontiel/5sigmas-tools-content/.github/workflows/gsc-direct-growth-data.yml@refs/heads/main',
      workflow_sha: '83f6cce0fc64e7a3fb4b869a9ca20b3e5c66a05d',
      event_name: 'workflow_dispatch', run_id: '1', ...changes,
    };
    const encoded = [
      { alg: 'RS256', typ: 'JWT', kid: jwk.kid }, claims,
    ].map((part) => Buffer.from(JSON.stringify(part)).toString('base64url')).join('.');
    const signature = await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5', pair.privateKey, new TextEncoder().encode(encoded));
    return `${encoded}.${Buffer.from(signature).toString('base64url')}`;
  }
  const authorizedToken = await token();
  const exportCounts = () => runtime.dispatchFetch(`${prefix}/export`, {
    headers: { Authorization: `Bearer ${authorizedToken}` },
  });
  const wrongWorkflow = await token({ workflow_ref: 'fjmmontiel/5sigmas-tools-content/.github/workflows/other.yml@refs/heads/main' });
  assert.equal((await runtime.dispatchFetch(`${prefix}/export`, {
    headers: { Authorization: `Bearer ${wrongWorkflow}` },
  })).status, 401);
  const exported = await exportCounts();
  assert.equal(exported.status, 200, `Native authenticated export (${outbound.length} local key requests): ${await exported.clone().text()}`);
  const data = await exported.json();
  const row = data.first_party.rows[0];
  assert.equal(data.first_party.rows.length, 1);
  assert.equal(row.sessions, 1);
  assert.equal(row.pageviews, 1);
  assert.equal(row.engaged_sessions, 1);
  assert.equal(row.converted_sessions, 1);
  assert.equal(row.meaningful_input_changes, 1);
  assert.equal(row.results_rendered, 1);
  assert.equal(row.scenario_completions, 1);
  assert.equal(row.exports, 1);
  assert.equal(row.key_events, 3);
  assert.equal(data.first_party.diagnostics.unique_events, 6);
  assert.equal(data.first_party.diagnostics.duplicate_events_ignored, 1);
  assert.equal(data.page_activity.rows[0].pageviews, 1);
  const serialized = JSON.stringify(data);
  for (const record of browser.sent) {
    assert.equal(serialized.includes(record.payload.session_id), false);
    assert.equal(serialized.includes(record.payload.event_id), false);
  }
  assert.equal(serialized.includes('private-query'), false);
  const beforeWithdrawal = browser.sent.length;
  browser.api.revokeConsent();
  assert.equal(browser.api.track('result_rendered', { tool_id: 'model-price-performance', result_kind: 'comparison' }), false);
  assert.equal(browser.sent.length, beforeWithdrawal);

  // Close the actual workerd process, then reopen the same local SQLite state.
  await runtime.dispose();
  runtime = new Miniflare(options);
  const restored = await exportCounts();
  assert.equal(restored.status, 200, `Native persisted export: ${await restored.clone().text()}`);
  const restoredData = await restored.json();
  assert.deepEqual(restoredData.first_party.rows, data.first_party.rows,
    'Native SQLite counters must survive a Worker restart');
  assert.ok(outbound.length >= 1 && outbound.every((url) => url === jwksUrl));
  console.log('Native measurement smoke: PASS (real Wrangler handler/store, workerd, SQLite persistence, consent, deduplication, signed export, no external requests)');
  console.log('Local limitation: EU jurisdiction selection is asserted by a test wrapper; geographic placement requires live Cloudflare verification.');
} finally {
  if (runtime) await runtime.dispose();
  if (keepState) console.log(`Synthetic test state: ${work}`);
  else await rm(work, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
