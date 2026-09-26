(() => {
  'use strict';

  const SCHEMA_VERSION = 1;
  const SESSION_KEY = 's5:measurement-session:v1';
  const ALLOWED_EVENTS = new Set([
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
  ]);
  const CONTEXT_KEYS = new Set([
    'tool_id',
    'field',
    'action',
    'source_kind',
    'related_kind',
    'target_path',
    'video_id',
    'milestone',
    'result_kind',
  ]);
  const AI_REFERRERS = new Set([
    'chatgpt.com',
    'chat.openai.com',
    'claude.ai',
    'perplexity.ai',
    'gemini.google.com',
    'copilot.microsoft.com',
    'poe.com',
  ]);
  const SEARCH_HOSTS = [
    'google.',
    'bing.com',
    'duckduckgo.com',
    'search.brave.com',
    'search.yahoo.',
    'yandex.',
    'ecosia.org',
  ];

  const state = {
    listenersReady: false,
    pagePath: '',
    changedFields: new Set(),
    articleMilestones: new Set(),
    scrollQueued: false,
  };

  const randomId = () => {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return `s5-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
  };

  const locale = () => (location.pathname.startsWith('/en/') || location.pathname === '/en' ? 'en' : 'es');

  const pathOnly = (value) => {
    if (!value) return '';
    try {
      return new URL(String(value), location.origin).pathname || '/';
    } catch {
      return '';
    }
  };

  const normalizedHost = (value) => {
    if (!value) return '';
    try {
      return new URL(String(value), location.origin).hostname.toLowerCase().replace(/^www\./, '');
    } catch {
      return '';
    }
  };

  const classifyReferrer = (referrer) => {
    const host = normalizedHost(referrer);
    if (!host) return { traffic_channel: 'direct', referrer_host: '' };
    if (host === location.hostname.toLowerCase().replace(/^www\./, '')) {
      return { traffic_channel: 'internal', referrer_host: host };
    }
    if (AI_REFERRERS.has(host)) return { traffic_channel: 'ai_referral', referrer_host: host };
    if (SEARCH_HOSTS.some((candidate) => host.includes(candidate))) {
      return { traffic_channel: 'organic_search', referrer_host: host };
    }
    return { traffic_channel: 'referral', referrer_host: host };
  };

  const newSession = () => {
    const attribution = classifyReferrer(document.referrer || '');
    return {
      session_id: randomId(),
      landing_path: pathOnly(location.pathname) || '/',
      traffic_channel: attribution.traffic_channel,
      referrer_host: attribution.referrer_host,
    };
  };

  const getSession = () => {
    try {
      const existing = sessionStorage.getItem(SESSION_KEY);
      if (existing) {
        const parsed = JSON.parse(existing);
        if (parsed?.session_id && parsed?.landing_path && parsed?.traffic_channel) return parsed;
      }
      const session = newSession();
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return session;
    } catch {
      if (!state.memorySession) state.memorySession = newSession();
      return state.memorySession;
    }
  };

  const endpoint = () => {
    const configured = window.__S5_MEASUREMENT__?.endpoint
      || document.querySelector('meta[name="s5-measurement-endpoint"]')?.content
      || '';
    if (!configured) return null;
    try {
      const url = new URL(String(configured), location.origin);
      if (url.origin !== location.origin) return null;
      if (location.protocol === 'https:' && url.protocol !== 'https:') return null;
      if (url.username || url.password) return null;
      return url;
    } catch {
      return null;
    }
  };

  const cleanToken = (value) => String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9_.:-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  const cleanContext = (context) => {
    const output = {};
    for (const [key, value] of Object.entries(context || {})) {
      if (!CONTEXT_KEYS.has(key) || value === null || value === undefined) continue;
      if (key === 'target_path') {
        const target = pathOnly(value);
        if (target) output[key] = target.slice(0, 240);
        continue;
      }
      if (key === 'milestone' && Number.isFinite(Number(value))) {
        output[key] = Math.max(0, Math.min(100, Math.round(Number(value))));
        continue;
      }
      const token = cleanToken(value);
      if (token) output[key] = token;
    }
    return output;
  };

  const transmit = (eventName, context = {}) => {
    if (!ALLOWED_EVENTS.has(eventName)) return false;
    const collector = endpoint();
    if (!collector) return false;

    const session = getSession();
    const payload = {
      schema_version: SCHEMA_VERSION,
      event_name: eventName,
      event_id: randomId(),
      occurred_at: new Date().toISOString(),
      session_id: session.session_id,
      landing_path: session.landing_path,
      page_path: pathOnly(location.pathname) || '/',
      locale: locale(),
      traffic_channel: session.traffic_channel,
      referrer_host: session.referrer_host,
      context: cleanContext(context),
    };
    const body = JSON.stringify(payload);

    try {
      if (navigator.sendBeacon) {
        const accepted = navigator.sendBeacon(
          collector.href,
          new Blob([body], { type: 'application/json' }),
        );
        if (accepted) return true;
      }
    } catch {
      // Fall through to a credential-free, keepalive POST.
    }

    if (typeof fetch === 'function') {
      fetch(collector.href, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        credentials: 'omit',
        keepalive: true,
        cache: 'no-store',
      }).catch(() => {});
      return true;
    }
    return false;
  };

  const toolIdFor = (element) => {
    const root = element?.closest?.('[data-s5-tool]');
    return cleanToken(root?.dataset?.s5Tool || '');
  };

  const targetContext = (anchor) => ({ target_path: pathOnly(anchor?.getAttribute?.('href') || '') });

  const onClick = (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const anchor = target.closest('a');
    const actionElement = target.closest('[data-action]');
    const toolId = toolIdFor(target);
    const action = cleanToken(actionElement?.dataset?.action || '');

    if (toolId && action === 'share') {
      transmit('share', { tool_id: toolId, action: 'share' });
      return;
    }
    if (toolId && ['export', 'download'].includes(action)) {
      transmit('export', { tool_id: toolId, action });
      return;
    }
    if (!anchor) return;

    if (anchor.closest('.s5-tool-source, [data-s5-source]')) {
      transmit('source_click', { tool_id: toolId, source_kind: 'primary-source', ...targetContext(anchor) });
      return;
    }
    if (anchor.closest('[data-s5-related-content], .s5-reader-end, .s5-semantic-nav, .s5-video-watch__related-grid')) {
      transmit('related_content_click', { tool_id: toolId, related_kind: 'contextual', ...targetContext(anchor) });
    }
  };

  const onChange = (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target?.matches?.('[data-field]')) return;
    const toolId = toolIdFor(target);
    if (!toolId) return;
    const field = cleanToken(target.getAttribute('data-field') || target.getAttribute('name') || 'field');
    const dedupeKey = `${location.pathname}|${toolId}|${field}`;
    if (state.changedFields.has(dedupeKey)) return;
    state.changedFields.add(dedupeKey);
    transmit('meaningful_input_change', { tool_id: toolId, field });
  };

  const onSubmit = (event) => {
    const form = event.target instanceof Element ? event.target.closest('[data-s5-tool-form]') : null;
    if (!form) return;
    const toolId = toolIdFor(form);
    if (toolId) transmit('scenario_completed', { tool_id: toolId, action: 'submit' });
  };

  const onVideo = (event) => {
    const video = event.target;
    if (!(video instanceof HTMLVideoElement)) return;
    const mediaPath = pathOnly(video.currentSrc || '');
    const mediaName = mediaPath.split('/').filter(Boolean).pop() || '';
    const videoId = cleanToken(video.dataset.s5VideoId || video.id || mediaName || 'video');
    transmit(event.type === 'ended' ? 'video_complete' : 'video_play', { video_id: videoId });
  };

  const measureArticleEngagement = () => {
    state.scrollQueued = false;
    const article = document.querySelector('article.md-content__inner');
    if (!article) return;
    const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const ratio = Math.max(0, Math.min(1, window.scrollY / scrollable));
    for (const milestone of [50, 90]) {
      if (ratio * 100 < milestone || state.articleMilestones.has(milestone)) continue;
      state.articleMilestones.add(milestone);
      transmit('article_engagement', { milestone });
    }
  };

  const onScroll = () => {
    if (state.scrollQueued) return;
    state.scrollQueued = true;
    requestAnimationFrame(measureArticleEngagement);
  };

  const installListeners = () => {
    if (state.listenersReady) return;
    state.listenersReady = true;
    document.addEventListener('click', onClick, true);
    document.addEventListener('change', onChange, true);
    document.addEventListener('submit', onSubmit, true);
    document.addEventListener('play', onVideo, true);
    document.addEventListener('ended', onVideo, true);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('s5:measurement', (event) => {
      const detail = event?.detail || {};
      transmit(detail.event_name, detail.context || {});
    });
  };

  const initializePage = () => {
    installListeners();
    const currentPath = pathOnly(location.pathname) || '/';
    if (state.pagePath === currentPath) return;
    state.pagePath = currentPath;
    state.changedFields = new Set();
    state.articleMilestones = new Set();
    transmit('page_view');
    for (const root of document.querySelectorAll('[data-s5-tool]')) {
      const toolId = cleanToken(root.dataset.s5Tool || '');
      if (toolId) transmit('tool_open', { tool_id: toolId });
    }
  };

  window.s5Measurement = Object.freeze({
    version: SCHEMA_VERSION,
    track: transmit,
  });

  if (typeof document$ !== 'undefined' && document$?.subscribe) {
    document$.subscribe(initializePage);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage, { once: true });
  } else {
    initializePage();
  }
})();
