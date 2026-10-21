(() => {
  'use strict';

  const SCHEMA_VERSION = 1;
  const POLICY_REVISION = '2026-10-18';
  const COLLECTOR_PATH = '/_s5/measurement/events';
  const SESSION_KEY = 's5:measurement-session:v1';
  const CONSENT_KEY = 's5:measurement-consent:v1';
  const IDLE_MS = 30 * 60 * 1000;
  const MAX_SESSION_MS = 24 * 60 * 60 * 1000;
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  const ALLOWED_EVENTS = new Set([
    'page_view', 'tool_open', 'meaningful_input_change', 'scenario_completed',
    'result_rendered', 'share', 'export', 'source_click', 'related_content_click',
    'video_play', 'video_complete', 'article_engagement',
  ]);
  const RESULT_KINDS = new Set(['scenario', 'estimate', 'ranking', 'comparison']);
  const AI_REFERRERS = new Set([
    'chatgpt.com', 'chat.openai.com', 'claude.ai', 'perplexity.ai',
    'gemini.google.com', 'copilot.microsoft.com', 'poe.com',
  ]);
  // Exact hosts only: google.com.attacker.example must never count as search.
  const SEARCH_HOSTS = new Set([
    'google.com', 'google.es', 'google.co.uk', 'google.de', 'google.fr',
    'google.it', 'google.pt', 'google.nl', 'google.be', 'google.ca',
    'google.com.au', 'google.com.br', 'google.com.mx', 'google.co.in',
    'google.co.jp', 'google.com.ar', 'google.cl', 'google.co', 'google.ch',
    'google.at', 'google.ie', 'google.se', 'google.no', 'google.dk',
    'google.fi', 'google.pl', 'google.cz', 'google.ro', 'google.co.nz',
    'google.com.sg', 'bing.com', 'duckduckgo.com', 'search.brave.com',
    'search.yahoo.com', 'search.yahoo.co.jp', 'yandex.com', 'yandex.ru', 'ecosia.org',
  ]);
  const CHANNELS = new Set(['direct', 'internal', 'organic_search', 'ai_referral', 'referral']);
  const state = {
    listenersReady: false, pagePath: '', choice: null, memorySession: null,
    initialAttributionAvailable: true, changedFields: new Set(),
    articleMilestones: new Set(), scrollQueued: false, pending: new Set(), ui: null,
    lastDelivery: 'not_sent',
  };

  const locale = () => (location.pathname.startsWith('/en/') || location.pathname === '/en' ? 'en' : 'es');
  const meta = (name) => document.querySelector(`meta[name="${name}"]`)?.content || '';
  const endpoint = () => {
    const config = window.__S5_MEASUREMENT__;
    const configured = config ? config.endpoint : meta('s5-measurement-endpoint');
    const approved = config ? config.approved === true : meta('s5-measurement-approved') === 'true';
    const revision = config ? config.policyRevision : meta('s5-measurement-policy-revision');
    if (!approved || revision !== POLICY_REVISION || typeof configured !== 'string' || !configured) return null;
    try {
      const url = new URL(configured, location.origin);
      if (url.origin !== location.origin || url.protocol !== 'https:' || location.protocol !== 'https:') return null;
      if (url.pathname !== COLLECTOR_PATH || url.search || url.hash || url.username || url.password) return null;
      return url;
    } catch { return null; }
  };

  // The generated catalog contains only public routes and code identifiers.
  // Unknown/404 paths and arbitrary API strings never become analytics data.
  const catalog = () => window.__S5_MEASUREMENT_CATALOG__;
  const catalogHas = (key, value) => typeof value === 'string'
    && Array.isArray(catalog()?.[key]) && catalog()[key].includes(value);
  const publicPath = (value) => {
    if (typeof value !== 'string' || !value) return '';
    try {
      const url = new URL(value, new URL(location.pathname, location.origin));
      if (url.origin !== location.origin || url.username || url.password) return '';
      return catalogHas('paths', url.pathname) ? url.pathname : '';
    } catch { return ''; }
  };
  const privacySignal = () => navigator.globalPrivacyControl === true
    || [navigator.doNotTrack, navigator.msDoNotTrack, window.doNotTrack]
      .some((signal) => signal === '1' || signal === 'yes');
  const clearSession = () => {
    state.memorySession = null;
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* No persistent-ID fallback. */ }
    for (const controller of state.pending) controller.abort();
    state.pending.clear();
  };
  const consent = () => {
    if (privacySignal()) {
      state.choice = 'denied';
      try { sessionStorage.removeItem(CONSENT_KEY); } catch { /* Keep refusal in memory. */ }
      clearSession();
      return 'denied';
    }
    if (state.choice !== null) return state.choice;
    try {
      const saved = sessionStorage.getItem(CONSENT_KEY);
      state.choice = saved === `${POLICY_REVISION}:granted` ? 'granted'
        : saved === `${POLICY_REVISION}:denied` ? 'denied' : 'unknown';
    } catch { state.choice = 'unknown'; }
    if (state.choice !== 'granted') clearSession();
    return state.choice;
  };
  const randomId = () => {
    try {
      if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
      if (!globalThis.crypto?.getRandomValues) return null;
      const bytes = new Uint8Array(16);
      globalThis.crypto.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 15) | 64;
      bytes[8] = (bytes[8] & 63) | 128;
      const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0'));
      return [hex.slice(0, 4), hex.slice(4, 6), hex.slice(6, 8), hex.slice(8, 10), hex.slice(10)].map((part) => part.join('')).join('-');
    } catch { return null; }
  };
  const normalizedHost = (value) => {
    try {
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol)) return '';
      return url.hostname.toLowerCase().replace(/^www\./, '');
    } catch { return ''; }
  };
  const classifyReferrer = (referrer) => {
    const host = normalizedHost(referrer);
    if (!host) return { traffic_channel: 'direct', referrer_host: '' };
    if (host === location.hostname.toLowerCase().replace(/^www\./, '')) {
      return { traffic_channel: 'internal', referrer_host: host };
    }
    if (AI_REFERRERS.has(host)) return { traffic_channel: 'ai_referral', referrer_host: host };
    if (SEARCH_HOSTS.has(host)) return { traffic_channel: 'organic_search', referrer_host: host };
    // Arbitrary referring hostnames can themselves contain identifying text.
    return { traffic_channel: 'referral', referrer_host: '' };
  };
  const validSession = (session, now) => {
    if (!session || !UUID.test(session.session_id) || !session.landing_path
      || publicPath(session.landing_path) !== session.landing_path) return false;
    if (!CHANNELS.has(session.traffic_channel) || typeof session.referrer_host !== 'string') return false;
    const host = session.referrer_host;
    const attribution = classifyReferrer(host ? `https://${host}/` : '');
    if (host && (attribution.referrer_host !== host || attribution.traffic_channel !== session.traffic_channel)) return false;
    if (!host && !['direct', 'referral'].includes(session.traffic_channel)) return false;
    return Number.isSafeInteger(session.created_at) && Number.isSafeInteger(session.last_seen)
      && session.created_at <= session.last_seen && session.last_seen <= now
      && now - session.last_seen < IDLE_MS && now - session.created_at < MAX_SESSION_MS;
  };
  const getSession = () => {
    const now = Date.now();
    let existing = state.memorySession;
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) existing = JSON.parse(saved);
    } catch { /* Corrupt or unavailable storage must not stop the site. */ }
    let session;
    if (validSession(existing, now)) {
      session = {
        session_id: existing.session_id, landing_path: existing.landing_path,
        traffic_channel: existing.traffic_channel, referrer_host: existing.referrer_host,
        created_at: existing.created_at, last_seen: now,
      };
    } else {
      const id = randomId();
      const landing = publicPath(location.pathname);
      if (!id || !UUID.test(id) || !landing) return null;
      session = {
        session_id: id, landing_path: landing,
        ...classifyReferrer(state.initialAttributionAvailable ? document.referrer || '' : ''),
        created_at: now, last_seen: now,
      };
    }
    state.initialAttributionAvailable = false;
    state.memorySession = session;
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch { /* Per-document memory only. */ }
    return session;
  };

  const toolRoots = () => [...document.querySelectorAll('[data-s5-tool], .s5-tool-page')];
  const rootId = (root) => root?.dataset?.s5Tool || catalog()?.tool_paths?.[publicPath(location.pathname)] || '';
  const toolRoot = (id) => catalogHas('tool_ids', id) ? toolRoots().find((root) => rootId(root) === id) : null;
  const toolIdFor = (element) => {
    const root = element?.closest?.('[data-s5-tool], .s5-tool-page');
    const id = rootId(root);
    return root && toolRoot(id) ? id : '';
  };
  const validField = (id, field) => catalogHas('fields', field)
    && (!catalog()?.tool_fields?.[id] || catalog().tool_fields[id].includes(field))
    && [...(toolRoot(id)?.querySelectorAll('[data-field]') || [])].some((node) => node.dataset.field === field);
  const cleanContext = (eventName, input) => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
    const output = {};
    const toolEvents = ['tool_open', 'meaningful_input_change', 'scenario_completed', 'result_rendered', 'share', 'export'];
    if (toolEvents.includes(eventName)
      || (['source_click', 'related_content_click'].includes(eventName) && Object.hasOwn(input, 'tool_id'))) {
      if (!toolRoot(input.tool_id)) return null;
      output.tool_id = input.tool_id;
    }
    if (eventName === 'meaningful_input_change') {
      if (!validField(output.tool_id, input.field)) return null;
      output.field = input.field;
    }
    if (['scenario_completed', 'result_rendered'].includes(eventName)) {
      if (!RESULT_KINDS.has(input.result_kind)) return null;
      output.result_kind = input.result_kind;
    }
    if (eventName === 'share' || eventName === 'export') {
      const allowed = eventName === 'share' ? ['share'] : ['export', 'download'];
      if (!allowed.includes(input.action)) return null;
      output.action = input.action;
    }
    if (eventName === 'source_click' || eventName === 'related_content_click') {
      const key = eventName === 'source_click' ? 'source_kind' : 'related_kind';
      const expected = eventName === 'source_click' ? 'primary-source' : 'contextual';
      if (input[key] !== expected) return null;
      output[key] = expected;
      const target = publicPath(input.target_path);
      if (target) output.target_path = target;
    }
    if (eventName === 'video_play' || eventName === 'video_complete') {
      if (!catalogHas('video_ids', input.video_id)) return null;
      output.video_id = input.video_id;
    }
    if (eventName === 'article_engagement') {
      if (![50, 90].includes(input.milestone)) return null;
      output.milestone = input.milestone;
    }
    return output;
  };
  const transmit = (eventName, context = {}) => {
    if (!ALLOWED_EVENTS.has(eventName)) return false;
    const collector = endpoint();
    if (!collector) { clearSession(); return false; }
    if (consent() !== 'granted' || typeof fetch !== 'function') return false;
    const page = publicPath(location.pathname);
    const cleaned = cleanContext(eventName, context);
    if (!page || !cleaned) return false;
    const eventId = randomId();
    if (!eventId || !UUID.test(eventId)) return false;
    const session = getSession();
    if (!session) return false;
    const payload = {
      schema_version: SCHEMA_VERSION, event_name: eventName, event_id: eventId,
      occurred_at: new Date().toISOString(), session_id: session.session_id,
      landing_path: session.landing_path, page_path: page, locale: locale(),
      traffic_channel: session.traffic_channel, referrer_host: session.referrer_host,
      context: cleaned,
    };
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    if (controller) state.pending.add(controller);
    try {
      state.lastDelivery = 'queued';
      // Only keepalive fetch: beacons can send ambient cookies.
      Promise.resolve(fetch(collector.href, {
        method: 'POST', headers: {
          'Content-Type': 'application/json', 'X-S5-Consent': 'granted',
          'X-S5-Policy-Revision': POLICY_REVISION,
        },
        // CORS mode preserves the Origin header with no-referrer. The approved
        // exact same-origin URL and redirect:error still constrain the target.
        body: JSON.stringify(payload), credentials: 'omit', mode: 'cors',
        referrerPolicy: 'no-referrer', redirect: 'error', keepalive: true,
        cache: 'no-store', ...(controller ? { signal: controller.signal } : {}),
      })).then((response) => { state.lastDelivery = response.ok ? 'accepted' : 'failed'; })
        .catch(() => { state.lastDelivery = controller?.signal.aborted ? 'cancelled' : 'failed'; })
        .finally(() => { if (controller) state.pending.delete(controller); });
      return true; // Queued only; delivery is verified by the collector.
    } catch {
      state.lastDelivery = 'failed';
      if (controller) state.pending.delete(controller);
      return false;
    }
  };

  const onClick = (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const toolId = toolIdFor(target);
    const action = target.closest('[data-action]')?.dataset?.action;
    if (toolId && action === 'share') { transmit('share', { tool_id: toolId, action }); return; }
    if (toolId && ['export', 'download', 'csv', 'json'].includes(action)) {
      transmit('export', { tool_id: toolId, action: action === 'download' ? 'download' : 'export' }); return;
    }
    const anchor = target.closest('a');
    if (!anchor) return;
    const context = { ...(toolId ? { tool_id: toolId } : {}), target_path: anchor.getAttribute('href') || '' };
    if (anchor.closest('.s5-tool-source, [data-s5-source]')) {
      transmit('source_click', { ...context, source_kind: 'primary-source' });
    } else if (anchor.closest('[data-s5-related-content], .s5-reader-end, .s5-semantic-nav, .s5-video-watch__related-grid')) {
      transmit('related_content_click', { ...context, related_kind: 'contextual' });
    }
  };
  const onChange = (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target?.matches?.('[data-field]')) return;
    const toolId = toolIdFor(target);
    const field = target.dataset.field;
    if (!validField(toolId, field) || target.validity?.valid === false) return;
    const dedupeKey = `${location.pathname}|${toolId}|${field}`;
    if (state.changedFields.has(dedupeKey)) return;
    if (transmit('meaningful_input_change', { tool_id: toolId, field })) state.changedFields.add(dedupeKey);
  };
  // A submit/DOM change cannot prove success. Tool controllers emit completion
  // and result events explicitly after a meaningful result has been produced.
  const onVideo = (event) => {
    const video = event.target;
    if (!(video instanceof HTMLVideoElement)) return;
    let filename = '';
    try { filename = new URL(video.currentSrc || '', location.origin).pathname.split('/').pop() || ''; } catch { /* Invalid source. */ }
    const id = [video.dataset.s5VideoId, video.id, filename].find((candidate) => catalogHas('video_ids', candidate));
    if (id) transmit(event.type === 'ended' ? 'video_complete' : 'video_play', { video_id: id });
  };
  const measureArticleEngagement = () => {
    state.scrollQueued = false;
    if (!document.querySelector('article.md-content__inner')) return;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollable <= 0) return;
    const depth = (window.scrollY / scrollable) * 100;
    for (const milestone of [50, 90]) {
      if (depth < milestone || state.articleMilestones.has(milestone)) continue;
      if (transmit('article_engagement', { milestone })) state.articleMilestones.add(milestone);
    }
  };
  const installListeners = () => {
    if (state.listenersReady) return;
    state.listenersReady = true;
    document.addEventListener('click', onClick, true);
    document.addEventListener('change', onChange, true);
    document.addEventListener('play', onVideo, true);
    document.addEventListener('ended', onVideo, true);
    window.addEventListener('scroll', () => {
      if (state.scrollQueued || consent() !== 'granted') return;
      state.scrollQueued = true;
      requestAnimationFrame(measureArticleEngagement);
    }, { passive: true });
    window.addEventListener('s5:measurement', (event) => {
      transmit(event?.detail?.event_name, event?.detail?.context || {});
    });
  };

  const COPY = {
    es: {
      title: 'Medición opcional de uso', allow: 'Permitir medición', deny: 'Rechazar medición',
      settings: 'Privacidad de la medición', details: 'Qué medimos y durante cuánto tiempo',
      description: 'Con tu permiso contamos visitas e interacciones con herramientas y vídeos para mejorar 5sigmas. No enviamos lo que escribes en las herramientas, direcciones de correo ni parámetros de URL.',
      retention: 'Guardamos tu elección en esta pestaña y usamos una sesión aleatoria que caduca tras 30 minutos sin actividad, con un máximo de 24 horas. El almacenamiento de Cloudflare está en la UE: registros temporales hasta 48 horas, recuentos consultables durante 90 días y copias de recuperación hasta 30 días más tras el borrado; los informes históricos conservan solo totales agrupados sin identificadores de sesión. Puedes retirar tu permiso aquí en cualquier momento.',
      granted: 'Medición activada con tu permiso.', denied: 'Medición desactivada.',
      unknown: 'La medición permanece desactivada hasta que la permitas.',
      signal: 'La preferencia de privacidad de tu navegador mantiene la medición desactivada.',
    },
    en: {
      title: 'Optional usage measurement', allow: 'Allow measurement', deny: 'Decline measurement',
      settings: 'Measurement privacy', details: 'What we measure and how long we keep it',
      description: 'With your permission we count visits and interactions with tools and videos to improve 5sigmas. We do not send what you enter in tools, email addresses or URL parameters.',
      retention: 'Your choice stays in this tab, and the random session identifier expires after 30 minutes of inactivity, with a 24-hour maximum. We use Cloudflare storage in the EU: temporary records last up to 48 hours, counts remain queryable for 90 days, and recovery backups may keep deleted data for up to 30 additional days; historical reports keep only grouped totals without session identifiers. You can withdraw permission here at any time.',
      granted: 'Measurement is enabled with your permission.', denied: 'Measurement is disabled.',
      unknown: 'Measurement remains disabled until you allow it.',
      signal: 'Your browser privacy preference keeps measurement disabled.',
    },
  };
  const renderConsentUI = (open = false) => {
    const ui = state.ui;
    if (!ui) return;
    const copy = COPY[locale()];
    const choice = consent();
    ui.panel.lang = locale();
    for (const key of ['title', 'description', 'retention', 'allow', 'deny']) ui[key].textContent = copy[key];
    ui.summary.textContent = copy.details;
    ui.allow.disabled = privacySignal();
    ui.status.textContent = privacySignal() ? copy.signal : copy[choice];
    ui.trigger.textContent = copy.settings;
    ui.panel.hidden = !(open || choice === 'unknown');
    ui.trigger.hidden = !ui.panel.hidden;
    ui.trigger.setAttribute('aria-expanded', String(!ui.panel.hidden));
  };
  const chooseConsent = (choice) => {
    const previous = consent();
    if (choice === 'granted' && (!endpoint() || privacySignal())) return false;
    state.choice = choice;
    try { sessionStorage.setItem(CONSENT_KEY, `${POLICY_REVISION}:${choice}`); } catch { /* Choice remains in memory. */ }
    if (choice !== 'granted' || previous !== 'granted') {
      clearSession();
      state.pagePath = '';
      state.changedFields.clear();
      state.articleMilestones.clear();
    }
    renderConsentUI();
    if (choice === 'granted') initializePage();
    state.ui?.trigger.focus();
    return true;
  };
  const ensureConsentUI = () => {
    if (state.ui || !document.body) return;
    const create = (tag, parent) => {
      const node = document.createElement(tag);
      if (parent) parent.appendChild(node);
      return node;
    };
    const style = create('style', document.head);
    style.textContent = `
      #s5-measurement-privacy{position:fixed;inset:auto 1rem 1rem 1rem;max-width:38rem;max-height:70vh;overflow:auto;z-index:1000;padding:1rem;border:1px solid #777;border-radius:.5rem;background:var(--md-default-bg-color,#fff);color:var(--md-default-fg-color,#222);font-size:.8rem;box-shadow:0 3px 18px #0003}
      #s5-measurement-privacy[hidden],#s5-measurement-preferences[hidden]{display:none}
      #s5-measurement-privacy h2{margin:0 0 .5rem;font-size:1rem}
      #s5-measurement-privacy p{margin:.5rem 0;line-height:1.5}
      #s5-measurement-privacy summary{cursor:pointer;text-decoration:underline}
      #s5-measurement-privacy .s5-measurement-choices{display:flex;flex-wrap:wrap;gap:.75rem;margin-top:.75rem}
      #s5-measurement-privacy button,#s5-measurement-preferences{font:inherit;border:1px solid currentColor;border-radius:.3rem;padding:.6rem .8rem;cursor:pointer;background:var(--md-default-bg-color,#fff);color:var(--md-default-fg-color,#222)}
      #s5-measurement-privacy button{flex:1;min-width:9rem}
      #s5-measurement-privacy button:disabled{opacity:.6;cursor:default}
      #s5-measurement-privacy button:focus-visible,#s5-measurement-preferences:focus-visible,#s5-measurement-privacy summary:focus-visible{outline:3px solid #3367d6;outline-offset:3px}
      #s5-measurement-preferences{position:fixed;bottom:.5rem;left:.5rem;z-index:999;font-size:.65rem}
    `;
    const panel = create('section', document.body);
    panel.id = 's5-measurement-privacy';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-labelledby', 's5-measurement-privacy-title');
    const title = create('h2', panel);
    title.id = 's5-measurement-privacy-title';
    const description = create('p', panel);
    const details = create('details', panel);
    const summary = create('summary', details);
    const retention = create('p', details);
    const status = create('p', panel);
    status.setAttribute('aria-live', 'polite');
    const buttons = create('div', panel);
    buttons.className = 's5-measurement-choices';
    const allow = create('button', buttons);
    const deny = create('button', buttons);
    allow.type = deny.type = 'button';
    allow.dataset.s5Consent = 'granted';
    deny.dataset.s5Consent = 'denied';
    allow.addEventListener('click', () => chooseConsent('granted'));
    deny.addEventListener('click', () => chooseConsent('denied'));
    const trigger = create('button', document.body);
    trigger.type = 'button';
    trigger.id = 's5-measurement-preferences';
    trigger.setAttribute('aria-controls', panel.id);
    trigger.addEventListener('click', () => { renderConsentUI(true); (allow.disabled ? deny : allow).focus(); });
    state.ui = { panel, title, description, summary, retention, status, allow, deny, trigger, style };
    renderConsentUI();
  };
  const initializePage = () => {
    if (!endpoint() || !publicPath(location.pathname)) {
      clearSession();
      state.pagePath = '';
      if (state.ui) { state.ui.panel.hidden = true; state.ui.trigger.hidden = true; }
      return;
    }
    installListeners();
    ensureConsentUI();
    renderConsentUI();
    if (consent() !== 'granted') return;
    const currentPath = publicPath(location.pathname);
    if (state.pagePath === currentPath) return;
    state.changedFields.clear();
    state.articleMilestones.clear();
    if (!transmit('page_view')) return;
    state.pagePath = currentPath;
    const opened = new Set();
    for (const root of toolRoots()) {
      const id = rootId(root);
      if (catalogHas('tool_ids', id) && !opened.has(id)) {
        transmit('tool_open', { tool_id: id });
        opened.add(id);
      }
    }
  };

  window.s5Measurement = Object.freeze({
    version: SCHEMA_VERSION, track: transmit,
    revokeConsent: () => chooseConsent('denied'),
    openPreferences: () => {
      if (!endpoint() || !publicPath(location.pathname)) return false;
      ensureConsentUI();
      renderConsentUI(true);
      if (state.ui) (state.ui.allow.disabled ? state.ui.deny : state.ui.allow).focus();
      return true;
    },
    status: () => ({ configured: Boolean(endpoint()), consent: consent(), policyRevision: POLICY_REVISION, lastDelivery: state.lastDelivery }),
  });
  if (typeof document$ !== 'undefined' && document$?.subscribe) {
    document$.subscribe(initializePage);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage, { once: true });
  } else { initializePage(); }
})();
