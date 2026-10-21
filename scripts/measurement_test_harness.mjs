import fs from 'node:fs';
import vm from 'node:vm';

export const SESSION_KEY = 's5:measurement-session:v1';
export const CONSENT_KEY = 's5:measurement-consent:v1';
export const POLICY_REVISION = '2026-10-18';
export const approvedConfig = {
  endpoint: '/_s5/measurement/events', approved: true, policyRevision: POLICY_REVISION,
};
export const publicCatalog = JSON.parse(fs.readFileSync(new URL('../mcp-worker/src/measurement-catalog.json', import.meta.url), 'utf8'));

class Element {
  constructor(tag = 'div') {
    this.tagName = tag.toLowerCase();
    this.dataset = {};
    this.attributes = {};
    this.children = [];
    this.parentElement = null;
    this.listeners = new Map();
    this.hidden = false;
    this.disabled = false;
    this.className = '';
    this.id = '';
    this.textContent = '';
  }
  setAttribute(key, text) {
    this.attributes[key] = String(text);
    if (key === 'id') this.id = String(text);
    if (key === 'class') this.className = String(text);
    if (key.startsWith('data-')) {
      this.dataset[key.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = String(text);
    }
  }
  getAttribute(key) {
    if (key === 'id') return this.id;
    if (key === 'class') return this.className;
    if (key.startsWith('data-')) return this.dataset[key.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] ?? null;
    return this.attributes[key] ?? null;
  }
  matches(selector) {
    return selector.split(',').some((part) => {
      const s = part.trim();
      if (s.startsWith('#')) return this.id === s.slice(1);
      const attribute = s.match(/^(\w+)?\[([^=\]]+)(?:="([^"]*)")?\]$/);
      if (attribute) return (!attribute[1] || this.tagName === attribute[1])
        && this.getAttribute(attribute[2]) !== null
        && (attribute[3] === undefined || this.getAttribute(attribute[2]) === attribute[3]);
      const [tag, className] = s.split('.');
      return (!tag || this.tagName === tag)
        && (!className || this.className.split(/\s+/).includes(className));
    });
  }
  closest(selector) {
    return this.matches(selector) ? this : this.parentElement?.closest(selector) || null;
  }
  querySelectorAll(selector) {
    return this.children.flatMap((child) => [
      ...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector),
    ]);
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  appendChild(node) { this.children.push(node); node.parentElement = this; return node; }
  addEventListener(name, listener) {
    if (!this.listeners.has(name)) this.listeners.set(name, []);
    this.listeners.get(name).push(listener);
  }
  dispatch(name, target = this, detail) {
    for (const listener of this.listeners.get(name) || []) listener({ type: name, target, detail });
  }
  click() { if (!this.disabled) this.dispatch('click'); }
  focus() { this.focused = true; }
}
class VideoElement extends Element { constructor() { super('video'); } }

/** Execute the real browser runtime, using only local fixtures and fake transport. */
export function bootMeasurement(options = {}) {
  const runtimePath = options.runtimePath || new URL('../docs/assets/javascripts/measurement.js', import.meta.url);
  const source = fs.readFileSync(runtimePath, 'utf8');
  const sent = [];
  const storage = options.storage || new Map();
  const storageOperations = [];
  const document = new Element('document');
  document.head = document.appendChild(new Element('head'));
  document.body = document.appendChild(new Element('body'));
  document.readyState = 'complete';
  document.documentElement = { scrollHeight: 2000 };
  document.referrer = options.referrer ?? 'https://www.google.com/search?q=private-query';
  document.createElement = (tag) => tag === 'video' ? new VideoElement() : new Element(tag);
  const add = (tag, attributes = {}, parent = document.body) => {
    const node = document.createElement(tag);
    for (const [key, text] of Object.entries(attributes)) node.setAttribute(key, text);
    parent.appendChild(node);
    return node;
  };
  const article = add('article', { class: 'md-content__inner' });
  const location = {
    origin: options.origin || 'https://5sigmas.com',
    protocol: options.origin?.startsWith('http:') ? 'http:' : 'https:',
    hostname: '5sigmas.com', pathname: options.pathname || '/en/tools/model-price-performance/',
  };
  const catalog = Object.hasOwn(options, 'catalog') ? options.catalog : structuredClone(publicCatalog);
  const toolId = catalog?.tool_paths?.[location.pathname];
  const root = options.noTool ? null : add('section', {
    class: 's5-tool-page', ...(options.inferredTool ? {} : { 'data-s5-tool': toolId || 'model-price-performance' }),
  }, article);
  const fields = {};
  if (root) {
    for (const name of catalog?.tool_fields?.[toolId] || ['inputTokens', 'provider']) {
      fields[name] = add('input', { 'data-field': name }, root);
      fields[name].validity = { valid: true };
      Object.defineProperty(fields[name], 'value', { get() { throw new Error('Input values must never be read'); } });
    }
  }
  for (const [key, content] of Object.entries(options.meta || {})) {
    const node = add('meta', { name: key }, document.head);
    node.content = content;
  }
  const window = new Element('window');
  window.__S5_MEASUREMENT__ = Object.hasOwn(options, 'config') ? options.config : { ...approvedConfig };
  window.__S5_MEASUREMENT_CATALOG__ = catalog;
  window.innerHeight = 800;
  window.scrollY = 0;
  window.doNotTrack = options.windowDnt;
  const navigator = { ...options.navigator };
  let now = options.now ?? Date.parse('2026-10-18T12:00:00.000Z');
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  let uuidCounter = options.uuidStart || 0;
  const crypto = Object.hasOwn(options, 'crypto') ? options.crypto : {
    randomUUID: () => `00000000-0000-4000-8000-${(++uuidCounter).toString(16).padStart(12, '0')}`,
  };
  const sessionStorage = Object.fromEntries(['getItem', 'setItem', 'removeItem'].map((method) => [method, (key, content) => {
    storageOperations.push({ method, key });
    if (options.storageThrows) throw new Error('Storage denied');
    if (method === 'getItem') return storage.get(key) || null;
    if (method === 'removeItem') return storage.delete(key);
    storage.set(key, content);
  }]));
  let initialize;
  const context = {
    window, document, location, navigator, sessionStorage, crypto,
    fetch: options.noFetch ? undefined : (url, request) => {
      const requestHeaders = new Headers(request.headers);
      // Fetch appends Origin for POST. With no-referrer, non-CORS modes send
      // "null"; the real-browser QA independently verifies this distinction.
      requestHeaders.set('Origin', request.mode === 'cors' || request.referrerPolicy !== 'no-referrer' ? location.origin : 'null');
      sent.push({ url, options: request, requestHeaders: Object.fromEntries(requestHeaders), payload: JSON.parse(request.body) });
      if (options.fetchThrows) throw new Error('Network unavailable');
      if (options.fetchRejects) return Promise.reject(new Error('Network unavailable'));
      return Promise.resolve({ ok: options.httpOk !== false });
    },
    URL, Uint8Array, Date: Clock, Math, JSON, Set, Object, String, Number, Promise,
    Element, HTMLVideoElement: VideoElement, AbortController,
    requestAnimationFrame: (callback) => callback(),
    document$: { subscribe(callback) { initialize = callback; callback(); } },
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: String(runtimePath) });
  return {
    context, window, document, location, navigator, root, article, fields, add, sent,
    storage, storageOperations, api: window.s5Measurement,
    grant: () => document.querySelector('[data-s5-consent="granted"]')?.click(),
    deny: () => document.querySelector('[data-s5-consent="denied"]')?.click(),
    advance: (milliseconds) => { now += milliseconds; },
    navigate: (path) => { location.pathname = path; initialize(); },
    replayPage: () => initialize(),
    dispatch: (name, target) => document.dispatch(name, target),
    scroll: (offset) => { window.scrollY = offset; window.dispatch('scroll'); },
    flush: async () => { await new Promise((resolve) => setImmediate(resolve)); },
  };
}
