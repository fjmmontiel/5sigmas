import assert from 'node:assert/strict';
import fs from 'node:fs';
import { webcrypto } from 'node:crypto';
import {
  bootMeasurement, approvedConfig, publicCatalog, SESSION_KEY, CONSENT_KEY, POLICY_REVISION,
} from './measurement_test_harness.mjs';

const runtimePath = process.argv[2] || 'docs/assets/javascripts/measurement.js';
const loaderPath = process.argv[3] || 'docs/javascripts/external-links.js';
const source = fs.readFileSync(runtimePath, 'utf8');
for (const forbidden of ['location.search', 'location.hash', 'location.href', 'localStorage', 'document.cookie', 'sendBeacon', 'Math.random']) {
  assert.equal(source.includes(forbidden), false, `privacy contract forbids ${forbidden}`);
}
assert.equal(/\.value\b/.test(source), false, 'measurement runtime must not read form values');
assert.match(fs.readFileSync(loaderPath, 'utf8'), /\/assets\/javascripts\/measurement\.js/);
const boot = (options) => bootMeasurement({ runtimePath, ...options });
const context = { tool_id: 'model-price-performance', result_kind: 'comparison' };
const consented = (options) => { const browser = boot(options); browser.grant(); return browser; };
const writes = (browser) => browser.storageOperations.filter(({ method }) => method === 'setItem');
let cases = 0;
async function check(name, fn) {
  try { await fn(); cases += 1; } catch (error) { error.message = `${name}: ${error.message}`; throw error; }
}

await check('disabled and unapproved collectors are fully inert', () => {
  for (const config of [null, {}, { endpoint: approvedConfig.endpoint }, { ...approvedConfig, approved: false }, { ...approvedConfig, policyRevision: 'old' }]) {
    const b = boot({ config });
    assert.equal(b.sent.length, 0);
    assert.equal(writes(b).length, 0);
    assert.equal(b.document.querySelector('#s5-measurement-privacy'), null);
    assert.equal(b.api.track('page_view'), false);
    assert.equal(b.api.openPreferences(), false);
  }
});
await check('collector URL is exact HTTPS same origin, without credentials, query or fragment', () => {
  for (const endpoint of [
    'https://collector.example.net/_s5/measurement/events', 'http://5sigmas.com/_s5/measurement/events',
    '/api/measure', `${approvedConfig.endpoint}?email=person@example.com`,
    `${approvedConfig.endpoint}#fragment`, 'https://user:password@5sigmas.com/_s5/measurement/events',
  ]) {
    const b = boot({ config: { ...approvedConfig, endpoint } });
    b.grant();
    assert.equal(b.sent.length, 0);
    assert.equal(writes(b).length, 0);
  }
  const http = boot({ origin: 'http://5sigmas.com' });
  http.grant();
  assert.equal(http.sent.length, 0);
});
await check('build-approved meta configuration is supported', () => {
  const b = consented({ config: null, meta: {
    's5-measurement-endpoint': approvedConfig.endpoint,
    's5-measurement-approved': 'true',
    's5-measurement-policy-revision': POLICY_REVISION,
  } });
  assert.equal(b.sent.length, 2);
});
await check('missing catalog and unknown paths cannot expose visitors through 404 URLs', () => {
  for (const options of [{ catalog: null }, { pathname: '/private/person@example.com/' }]) {
    const b = boot(options);
    b.grant();
    assert.equal(b.sent.length, 0);
    assert.equal(writes(b).length, 0);
    assert.equal(b.document.querySelector('#s5-measurement-privacy'), null);
  }
});
await check('no collection, identifiers or buffering before explicit consent', () => {
  const b = boot();
  assert.equal(b.sent.length, 0);
  assert.equal(writes(b).length, 0);
  assert.equal(b.api.track('scenario_completed', context), false);
  b.dispatch('change', b.fields.inputTokens);
  b.scroll(1200);
  assert.equal(writes(b).length, 0);
  b.grant();
  assert.deepEqual(b.sent.map(({ payload }) => payload.event_name), ['page_view', 'tool_open']);
  b.dispatch('change', b.fields.inputTokens);
  assert.equal(b.sent.at(-1).payload.event_name, 'meaningful_input_change');
});
await check('consent choices are bilingual, accessible and equal actions', () => {
  for (const [pathname, language, allowText] of [
    ['/en/tools/model-price-performance/', 'en', 'Allow measurement'],
    ['/herramientas/precio-rendimiento-modelos/', 'es', 'Permitir medición'],
  ]) {
    const b = boot({ pathname });
    const panel = b.document.querySelector('#s5-measurement-privacy');
    assert.equal(panel.lang, language);
    assert.equal(panel.getAttribute('role'), 'region');
    assert.equal(panel.getAttribute('aria-labelledby'), 's5-measurement-privacy-title');
    assert.equal(panel.hidden, false);
    assert.equal(b.document.querySelector('[data-s5-consent="granted"]').textContent, allowText);
    assert.equal(b.document.querySelector('[data-s5-consent="denied"]').type, 'button');
    b.deny();
    assert.equal(panel.hidden, true);
    assert.equal(b.storage.has(SESSION_KEY), false);
    assert.equal(b.sent.length, 0);
    const trigger = b.document.querySelector('#s5-measurement-preferences');
    assert.equal(trigger.hidden, false);
    trigger.click();
    assert.equal(panel.hidden, false);
    assert.equal(trigger.getAttribute('aria-expanded'), 'true');
  }
});
await check('consented events contain only the v1 contract and credential-free transport', async () => {
  const b = consented();
  const { url, options, payload } = b.sent[0];
  assert.equal(url, `https://5sigmas.com${approvedConfig.endpoint}`);
  assert.deepEqual(Object.keys(payload).sort(), [
    'schema_version', 'event_name', 'event_id', 'occurred_at', 'session_id',
    'landing_path', 'page_path', 'locale', 'traffic_channel', 'referrer_host', 'context',
  ].sort());
  assert.equal(payload.event_name, 'page_view');
  assert.equal(payload.page_path, '/en/tools/model-price-performance/');
  assert.equal(payload.landing_path, payload.page_path);
  assert.equal(payload.locale, 'en');
  assert.equal(payload.traffic_channel, 'organic_search');
  assert.equal(payload.referrer_host, 'google.com');
  assert.equal(options.body.includes('private-query'), false);
  assert.equal(options.credentials, 'omit');
  assert.equal(options.referrerPolicy, 'no-referrer');
  assert.equal(options.redirect, 'error');
  assert.equal(options.mode, 'cors');
  assert.equal(b.sent[0].requestHeaders.origin, 'https://5sigmas.com',
    'no-referrer transport must preserve the same-site Origin for collector admission');
  assert.equal(options.keepalive, true);
  assert.equal(options.headers['X-S5-Consent'], 'granted');
  assert.equal(options.headers['X-S5-Policy-Revision'], POLICY_REVISION);
  assert.notEqual(payload.session_id, payload.event_id);
  assert.equal(b.sent[1].payload.session_id, payload.session_id);
  await b.flush();
  assert.equal(b.api.status().lastDelivery, 'accepted');
});
await check('referrer attribution uses exact hosts and never sends unknown hostnames', () => {
  for (const [referrer, channel, host] of [
    ['https://chatgpt.com/c/private-conversation?secret=yes', 'ai_referral', 'chatgpt.com'],
    ['https://www.google.es/search?q=private', 'organic_search', 'google.es'],
    ['https://google.com.attacker.example/private', 'referral', ''],
    ['https://notgoogle.com/private', 'referral', ''],
    ['https://person-identifier.example/private', 'referral', ''],
    ['https://5sigmas.com/en/?email=private', 'internal', '5sigmas.com'],
    ['', 'direct', ''],
  ]) {
    const payload = consented({ referrer }).sent[0].payload;
    assert.equal(payload.traffic_channel, channel);
    assert.equal(payload.referrer_host, host);
  }
});
await check('context strings require catalog identifiers and event-specific enums', () => {
  const b = consented();
  const count = b.sent.length;
  for (const [name, input] of [
    ['email_submitted', { field: 'email' }], ['tool_open', { tool_id: 'person-example-com' }],
    ['tool_open', { tool_id: 'llm-cost-latency' }],
    ['meaningful_input_change', { tool_id: context.tool_id, field: 'person-example-com' }],
    ['meaningful_input_change', { tool_id: context.tool_id, field: 'inputtokens' }],
    ['scenario_completed', { tool_id: context.tool_id, result_kind: 'person-example-com' }],
    ['scenario_completed', { tool_id: context.tool_id, action: 'submit' }],
    ['share', { tool_id: context.tool_id, action: 'person-example-com' }],
    ['video_play', { video_id: 'person-example-com' }],
    ['article_engagement', { milestone: 37 }], ['article_engagement', { milestone: '50' }],
  ]) assert.equal(b.api.track(name, input), false);
  assert.equal(b.sent.length, count);
  assert.equal(b.api.track('result_rendered', { ...context, arbitrary_secret: 'must-not-leak', value: 'private' }), true);
  assert.deepEqual(b.sent.at(-1).payload.context, context);
  assert.equal(JSON.stringify(b.sent).includes('must-not-leak'), false);
});
await check('link context strips same-site query/fragment and all external/unknown paths', () => {
  const b = consented();
  const target = '/herramientas/precio-rendimiento-modelos/';
  for (const [path, expected] of [
    [`${target}?email=person@example.com#private`, target],
    [`https://external.example${target}?email=person@example.com`, undefined],
    ['/people/person@example.com/', undefined],
  ]) {
    assert.equal(b.api.track('source_click', { source_kind: 'primary-source', target_path: path }), true);
    assert.equal(b.sent.at(-1).payload.context.target_path, expected);
    assert.equal(b.sent.at(-1).options.body.includes('person@example.com'), false);
  }
});
await check('valid first field changes deduplicate without ever reading values', () => {
  const b = consented();
  b.fields.inputTokens.validity.valid = false;
  b.dispatch('change', b.fields.inputTokens);
  assert.equal(b.sent.length, 2);
  b.fields.inputTokens.validity.valid = true;
  b.dispatch('change', b.fields.inputTokens);
  b.dispatch('change', b.fields.inputTokens);
  assert.equal(b.sent.length, 3);
  assert.deepEqual(b.sent.at(-1).payload.context, { tool_id: context.tool_id, field: 'inputTokens' });
});
await check('generic form submission never fabricates a completed scenario', () => {
  const b = consented();
  const form = b.add('form', { 'data-s5-tool-form': '' }, b.root);
  b.dispatch('submit', form);
  assert.equal(b.sent.length, 2);
  b.api.track('scenario_completed', context);
  assert.equal(b.sent.at(-1).payload.event_name, 'scenario_completed');
});
await check('existing unannotated tools use published path/field mappings', () => {
  const b = consented({ pathname: '/en/tools/llm-cost-latency/', inferredTool: true });
  assert.equal(b.sent[1].payload.context.tool_id, 'llm-cost-latency');
  const field = Object.keys(b.fields)[0];
  b.dispatch('change', b.fields[field]);
  assert.deepEqual(b.sent.at(-1).payload.context, { tool_id: 'llm-cost-latency', field });
  for (const action of ['share', 'export', 'csv', 'json', 'download']) {
    const button = b.add('button', { 'data-action': action }, b.root);
    b.dispatch('click', button);
    assert.equal(b.sent.at(-1).payload.event_name, action === 'share' ? 'share' : 'export');
    assert.equal(b.sent.at(-1).payload.context.action, ['share', 'download'].includes(action) ? action : 'export');
  }
});
await check('video events require a public catalog identifier', () => {
  const b = consented();
  const video = b.add('video', { 'data-s5-video-id': publicCatalog.video_ids[0] });
  video.currentSrc = 'https://external.example/private/person@example.com';
  b.dispatch('play', video);
  b.dispatch('ended', video);
  assert.deepEqual(b.sent.slice(-2).map(({ payload }) => payload.event_name), ['video_play', 'video_complete']);
  assert.equal(b.sent.at(-1).options.body.includes('person@example.com'), false);
  const unknown = b.add('video', { id: 'private-person' });
  unknown.currentSrc = 'https://external.example/private-person.mp4';
  const count = b.sent.length;
  b.dispatch('play', unknown);
  assert.equal(b.sent.length, count);
});
await check('article engagement and rendered routes deduplicate separately', () => {
  const b = consented();
  b.scroll(610);
  b.scroll(1110);
  b.scroll(1200);
  assert.deepEqual(b.sent.filter(({ payload }) => payload.event_name === 'article_engagement').map(({ payload }) => payload.context.milestone), [50, 90]);
  const count = b.sent.length;
  b.replayPage();
  assert.equal(b.sent.length, count);
  b.navigate('/herramientas/precio-rendimiento-modelos/');
  assert.equal(b.sent.at(-2).payload.locale, 'es');
  assert.equal(b.sent.at(-2).payload.landing_path, b.sent[0].payload.landing_path);
  assert.equal(b.sent.at(-2).payload.session_id, b.sent[0].payload.session_id);
  b.scroll(1200);
  assert.equal(b.sent.filter(({ payload }) => payload.event_name === 'article_engagement').length, 4);
});
await check('sessions renew after 30 minutes idle and never exceed 24 hours', () => {
  const b = consented();
  const first = b.sent[0].payload.session_id;
  b.advance(29 * 60 * 1000);
  b.api.track('result_rendered', context);
  assert.equal(b.sent.at(-1).payload.session_id, first);
  b.advance(30 * 60 * 1000);
  b.api.track('result_rendered', context);
  assert.notEqual(b.sent.at(-1).payload.session_id, first);
  assert.equal(b.sent.at(-1).payload.traffic_channel, 'direct');
  const second = b.sent.at(-1).payload.session_id;
  for (let i = 0; i < 50; i += 1) { b.advance(29 * 60 * 1000); b.api.track('result_rendered', context); }
  assert.notEqual(b.sent.at(-1).payload.session_id, second);
});
await check('reloading preserves only validated bounded per-tab session fields', () => {
  const first = consented();
  const b = boot({ storage: first.storage, uuidStart: 100 });
  assert.equal(b.sent[0].payload.session_id, first.sent[0].payload.session_id);
  const corrupt = JSON.parse(first.storage.get(SESSION_KEY));
  corrupt.landing_path += '?email=person@example.com';
  corrupt.secret = 'must-not-leak';
  first.storage.set(SESSION_KEY, JSON.stringify(corrupt));
  const repaired = boot({ storage: first.storage, uuidStart: 200 });
  assert.notEqual(repaired.sent[0].payload.session_id, first.sent[0].payload.session_id);
  assert.equal(repaired.sent[0].options.body.includes('person@example.com'), false);
  assert.equal(first.storage.get(SESSION_KEY).includes('must-not-leak'), false);
});
await check('withdrawal removes identifiers and cancels pending/future transmission', () => {
  const b = consented();
  const first = b.sent[0].payload.session_id;
  b.api.revokeConsent();
  assert.equal(b.storage.has(SESSION_KEY), false);
  assert.equal(b.storage.get(CONSENT_KEY), `${POLICY_REVISION}:denied`);
  assert.ok(b.sent.every(({ options }) => options.signal.aborted));
  assert.equal(b.api.track('result_rendered', context), false);
  assert.equal(b.sent.length, 2);
  b.api.openPreferences();
  b.grant();
  assert.notEqual(b.sent.at(-1).payload.session_id, first);
});
await check('GPC and DNT override stored grants and cannot silently reactivate', () => {
  for (const navigator of [{ globalPrivacyControl: true }, { doNotTrack: '1' }, { msDoNotTrack: '1' }]) {
    const storage = new Map([[CONSENT_KEY, `${POLICY_REVISION}:granted`]]);
    const b = boot({ navigator, storage });
    b.grant();
    assert.equal(b.sent.length, 0);
    assert.equal(writes(b).length, 0);
    assert.equal(b.storage.has(SESSION_KEY), false);
    assert.equal(b.storage.has(CONSENT_KEY), false);
  }
  const b = consented();
  b.navigator.globalPrivacyControl = true;
  assert.equal(b.api.track('result_rendered', context), false);
  assert.equal(b.storage.has(SESSION_KEY), false);
  b.navigator.globalPrivacyControl = false;
  assert.equal(b.api.track('result_rendered', context), false);
});
await check('storage denial falls back only to memory and cryptography fails closed', () => {
  const b = consented({ storageThrows: true });
  b.api.track('result_rendered', context);
  assert.equal(b.sent.length, 3);
  assert.equal(b.sent[2].payload.session_id, b.sent[0].payload.session_id);
  assert.equal(b.storage.size, 0);
  const fresh = boot({ storageThrows: true });
  assert.equal(fresh.sent.length, 0);
  const insecure = consented({ crypto: undefined });
  assert.equal(insecure.sent.length, 0);
  assert.equal(insecure.storage.has(SESSION_KEY), false);
  const secureFallback = consented({ crypto: { getRandomValues: (bytes) => webcrypto.getRandomValues(bytes) } });
  assert.equal(secureFallback.sent.length, 2);
  assert.match(secureFallback.sent[0].payload.session_id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
await check('offline/rejected collection never crashes the page or queues a later replay', async () => {
  const noFetch = consented({ noFetch: true });
  assert.equal(noFetch.storage.has(SESSION_KEY), false);
  for (const options of [{ fetchThrows: true }, { fetchRejects: true }, { httpOk: false }]) {
    const b = consented(options);
    await b.flush();
    assert.equal(b.api.status().lastDelivery, 'failed');
  }
});

console.log(`Measurement contract: PASS (${cases} behavioral scenarios)`);
