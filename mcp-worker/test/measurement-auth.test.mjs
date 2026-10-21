import assert from 'node:assert/strict';
import { test } from 'node:test';
import { verifyExportAuthorization, EXPORT_AUDIENCE } from '../src/measurement-auth.js';

const pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...await crypto.subtle.exportKey('jwk', pair.publicKey), kid: 'test-key', use: 'sig', alg: 'RS256' };
const now = Date.parse('2026-10-18T17:00:00Z');
const nowSeconds = now / 1000;
const baseClaims = {
  iss: 'https://token.actions.githubusercontent.com', aud: EXPORT_AUDIENCE,
  sub: 'repo:fjmmontiel/5sigmas-tools-content:ref:refs/heads/main',
  exp: nowSeconds + 300, iat: nowSeconds, nbf: nowSeconds,
  repository: 'fjmmontiel/5sigmas-tools-content', repository_id: '1249897559', repository_owner_id: '162696664',
  repository_visibility: 'private', ref: 'refs/heads/main', ref_type: 'branch',
  workflow_ref: 'fjmmontiel/5sigmas-tools-content/.github/workflows/gsc-direct-growth-data.yml@refs/heads/main',
  workflow_sha: '83f6cce0fc64e7a3fb4b869a9ca20b3e5c66a05d', event_name: 'workflow_dispatch', run_id: '12345678',
};
function base64(value) { return Buffer.from(value).toString('base64url'); }
async function signed(changes = {}, headerChanges = {}) {
  const header = base64(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: 'test-key', ...headerChanges }));
  const body = base64(JSON.stringify({ ...baseClaims, ...changes }));
  const bytes = new TextEncoder().encode(`${header}.${body}`);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', pair.privateKey, bytes);
  return `${header}.${body}.${base64(signature)}`;
}
function request(token) { return new Request(EXPORT_AUDIENCE, { headers: { Authorization: `Bearer ${token}` } }); }
const fetcher = async (url, options) => {
  assert.equal(url, 'https://token.actions.githubusercontent.com/.well-known/jwks');
  assert.equal(options.redirect, 'manual');
  assert.equal(options.credentials, 'omit');
  return Response.json({ keys: [jwk] });
};
async function verify(token, fetchFunction = fetcher) { return verifyExportAuthorization(request(token), {}, { now, fetcher: fetchFunction }); }

test('only a valid signed main report workflow identity may read aggregates', async () => {
  assert.equal(await verify(await signed()), true);
  assert.equal(await verify(await signed({ sub: 'repo:fjmmontiel@162696664/5sigmas-tools-content@1249897559:ref:refs/heads/main' })), true);
});

test('untrusted branch, repo, owner, workflow, audience, subject and pull request are denied', async () => {
  for (const changes of [
    { repository_id: '9' }, { repository_owner_id: '9' }, { repository: 'attacker/clone' },
    { sub: 'repo:attacker/clone:ref:refs/heads/main' }, { aud: 'other-service' },
    { ref: 'refs/heads/draft' }, { workflow_ref: 'other-workflow' },
    { job_workflow_ref: 'untrusted-reusable-workflow' }, { event_name: 'pull_request_target' },
    { event_name: 'pull_request' }, { repository_visibility: 'public' },
    { iss: 'https://attacker.invalid' }, { workflow_sha: 'not-a-sha' },
  ]) assert.equal(await verify(await signed(changes)), false, JSON.stringify(changes));
});

test('expired, future, malformed or excessively long-lived tokens fail closed', async () => {
  for (const changes of [
    { exp: nowSeconds - 1 }, { iat: nowSeconds + 60 }, { nbf: nowSeconds + 60 },
    { exp: nowSeconds + 601 }, { iat: nowSeconds - 601 }, { exp: 'future' },
  ]) assert.equal(await verify(await signed(changes)), false);
  assert.equal(await verify('not.a.valid.token'), false);
  assert.equal(await verify('x'.repeat(20000)), false);
});

test('algorithm substitution, attacker key URLs and signature modification fail closed', async () => {
  for (const header of [{ alg: 'none' }, { alg: 'HS256' }, { jku: 'https://attacker.invalid/key' }, { kid: 'unknown' }]) {
    assert.equal(await verify(await signed({}, header)), false);
  }
  const token = await signed();
  const parts = token.split('.');
  const signature = Buffer.from(parts[2], 'base64url'); signature[10] ^= 0xff;
  assert.equal(await verify(`${parts[0]}.${parts[1]}.${signature.toString('base64url')}`), false);
});

test('key service outage, redirect and excessive response cannot grant access', async () => {
  const token = await signed();
  assert.equal(await verify(token, async () => { throw new Error('network failed'); }), false);
  assert.equal(await verify(token, async () => new Response('', { status: 302, headers: { location: 'https://attacker.invalid' } })), false);
  assert.equal(await verify(token, async () => new Response('x'.repeat(65537))), false);
  assert.equal(await verifyExportAuthorization(new Request(EXPORT_AUDIENCE)), false);
});

test('rotated signing keys refresh once with a bounded unknown-kid request rate', async () => {
  let calls = 0;
  const rotated = { ...jwk, kid: 'rotated-key' };
  const rotatingFetcher = async () => Response.json({ keys: [++calls === 1 ? jwk : rotated] });
  const options = { now, fetcher: rotatingFetcher, useCache: true };
  assert.equal(await verifyExportAuthorization(request(await signed()), {}, options), true);
  assert.equal(calls, 1);
  assert.equal(await verifyExportAuthorization(request(await signed({}, { kid: 'rotated-key' })), {}, { ...options, now: now + 61000 }), true);
  assert.equal(calls, 2);
  for (const kid of ['unknown-one', 'unknown-two']) {
    assert.equal(await verifyExportAuthorization(request(await signed({}, { kid })), {}, { ...options, now: now + 62000 }), false);
  }
  assert.equal(calls, 2);
});
