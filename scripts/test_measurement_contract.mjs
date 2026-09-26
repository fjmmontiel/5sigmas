import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const runtimePath = process.argv[2] || 'docs/assets/javascripts/measurement.js';
const loaderPath = process.argv[3] || 'docs/javascripts/external-links.js';
const source = fs.readFileSync(runtimePath, 'utf8');
const loader = fs.readFileSync(loaderPath, 'utf8');

const REQUIRED_EVENTS = [
  'page_view',
  'tool_open',
  'meaningful_input_change',
  'scenario_completed',
  'result_rendered',
  'share',
  'export',
  'source_click',
  'related_content_click',
  'video_play',
  'video_complete',
  'article_engagement',
];
for (const name of REQUIRED_EVENTS) {
  assert.match(source, new RegExp(`['\"]${name}['\"]`), `missing event semantic: ${name}`);
}
for (const forbidden of ['location.search', 'location.hash', 'location.href', 'localStorage', 'document.cookie']) {
  assert.equal(source.includes(forbidden), false, `PII/privacy contract forbids ${forbidden}`);
}
assert.equal(/\.value\b/.test(source), false, 'measurement runtime must not serialize form values');
assert.match(source, /url\.origin !== location\.origin/, 'collector must be same-origin');
assert.match(source, /credentials:\s*['\"]omit['\"]/, 'collector requests must not include browser credentials');
assert.match(loader, /\/assets\/javascripts\/measurement\.js/, 'global runtime loader is missing');

const sent = [];
const storage = new Map();
class FakeElement {
  closest() { return null; }
  matches() { return false; }
  getAttribute() { return ''; }
}
class FakeVideoElement extends FakeElement {}
const documentStub = {
  referrer: 'https://www.google.com/search?q=private-query',
  readyState: 'complete',
  documentElement: { scrollHeight: 1000 },
  querySelector(selector) {
    if (selector === 'meta[name="s5-measurement-endpoint"]') return null;
    return null;
  },
  querySelectorAll() { return []; },
  addEventListener() {},
};
const locationStub = {
  origin: 'https://5sigmas.com',
  protocol: 'https:',
  hostname: '5sigmas.com',
  pathname: '/en/tools/example/',
};
const windowStub = {
  __S5_MEASUREMENT__: { endpoint: '/api/measure' },
  innerHeight: 800,
  scrollY: 0,
  addEventListener() {},
};
const context = {
  window: windowStub,
  document: documentStub,
  location: locationStub,
  navigator: { sendBeacon: () => false },
  sessionStorage: {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value),
  },
  fetch: async (url, options) => {
    sent.push({ url, options });
    return { ok: true };
  },
  URL,
  Blob,
  crypto: globalThis.crypto,
  Date,
  Math,
  JSON,
  Set,
  Object,
  String,
  Number,
  Element: FakeElement,
  HTMLVideoElement: FakeVideoElement,
  requestAnimationFrame: (callback) => callback(),
  console,
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(source, context, { filename: runtimePath });

assert.equal(sent.length, 1, 'page_view should be emitted when a collector is configured');
let payload = JSON.parse(sent[0].options.body);
assert.equal(payload.event_name, 'page_view');
assert.equal(payload.page_path, '/en/tools/example/');
assert.equal(payload.landing_path, '/en/tools/example/');
assert.equal(payload.locale, 'en');
assert.equal(payload.traffic_channel, 'organic_search');
assert.equal(payload.referrer_host, 'google.com');
assert.equal(sent[0].options.credentials, 'omit');
assert.equal(sent[0].url, 'https://5sigmas.com/api/measure');
assert.equal(sent[0].options.body.includes('private-query'), false, 'full referrer/query leaked into payload');

const firstSessionId = payload.session_id;
assert.equal(context.window.s5Measurement.track('source_click', {
  target_path: '/sources/paper/?email=person@example.com#fragment',
  source_kind: 'primary source',
  arbitrary_secret: 'must-not-leak',
}), true);
assert.equal(sent.length, 2);
payload = JSON.parse(sent[1].options.body);
assert.equal(payload.session_id, firstSessionId, 'session id must remain stable within sessionStorage');
assert.deepEqual(JSON.parse(JSON.stringify(payload.context)), {
  target_path: '/sources/paper/',
  source_kind: 'primary-source',
});
assert.equal(sent[1].options.body.includes('person@example.com'), false, 'target query leaked into payload');
assert.equal(sent[1].options.body.includes('must-not-leak'), false, 'non-allowlisted context leaked into payload');

const beforeUnknown = sent.length;
assert.equal(context.window.s5Measurement.track('email_submitted', { field: 'email' }), false);
assert.equal(sent.length, beforeUnknown, 'unknown events must fail closed');

context.window.__S5_MEASUREMENT__.endpoint = 'https://collector.example.net/events';
assert.equal(context.window.s5Measurement.track('tool_open', { tool_id: 'demo' }), false);
assert.equal(sent.length, beforeUnknown, 'cross-origin collector must fail closed');

console.log('Measurement contract: PASS');
