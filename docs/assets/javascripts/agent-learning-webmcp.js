(() => {
  'use strict';

  const VERSION = '2026-08-26-learning-paths-v1';
  let controller = null;
  let pathsPromise = null;

  function locale() {
    return location.pathname === '/en' || location.pathname.startsWith('/en/') ? 'en' : 'es';
  }

  function pathsUrl() {
    return locale() === 'en' ? '/en/agent/learning-paths.json' : '/agent/learning-paths.json';
  }

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function tokens(value) {
    return clean(value)
      .toLocaleLowerCase(locale() === 'es' ? 'es' : 'en')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(/[^a-z0-9+#.-]+/i)
      .filter((token) => token.length > 2);
  }

  function normalizePath(value) {
    try {
      const url = new URL(String(value || '/'), location.origin);
      let path = url.pathname.replace(/\/index\.html$/, '/').replace(/\/{2,}/g, '/');
      if (!/\.[a-z0-9]+$/i.test(path) && !path.endsWith('/')) path += '/';
      return path;
    } catch {
      return '/';
    }
  }

  function result(payload) {
    const structuredContent = { ...payload, webmcp_version: VERSION };
    return {
      content: [{ type: 'text', text: JSON.stringify(structuredContent) }],
      structuredContent
    };
  }

  async function loadPaths() {
    if (!pathsPromise) {
      pathsPromise = fetch(pathsUrl(), { credentials: 'same-origin' }).then(async (response) => {
        if (!response.ok) throw new Error(`5sigmas learning paths unavailable (${response.status})`);
        const payload = await response.json();
        if (payload.version !== 1 || !Array.isArray(payload.paths)) {
          throw new Error('Unsupported 5sigmas learning-path schema');
        }
        return payload;
      });
    }
    return pathsPromise;
  }

  function searchable(path) {
    const links = Object.values(path.links || {});
    return [
      path.current?.title,
      path.current?.topic,
      path.current?.kind,
      ...links.flatMap((item) => [item.title, item.description, item.kind])
    ].map(clean).join(' ');
  }

  function score(queryTokens, path) {
    if (!queryTokens.length) return 1;
    const title = new Set(tokens(path.current?.title));
    const topic = new Set(tokens(path.current?.topic));
    const all = new Set(tokens(searchable(path)));
    let total = 0;
    for (const token of queryTokens) {
      if (title.has(token)) total += 12;
      if (topic.has(token)) total += 9;
      if (all.has(token)) total += 4;
    }
    return total;
  }

  function orderedLinks(path, goal) {
    const links = path.links || {};
    const priorities = {
      learn: ['understand', 'read_next', 'watch_next', 'go_deeper', 'try_tool'],
      watch: ['watch_next', 'understand', 'read_next', 'go_deeper', 'try_tool'],
      build: ['try_tool', 'read_next', 'go_deeper', 'understand', 'watch_next'],
      explore: ['read_next', 'watch_next', 'understand', 'try_tool', 'go_deeper']
    };
    const order = priorities[goal] || priorities.learn;
    const rows = [];
    const seen = new Set();
    for (const role of [...order, ...Object.keys(links)]) {
      const item = links[role];
      if (!item || seen.has(item.url)) continue;
      seen.add(item.url);
      rows.push({ role, ...item });
    }
    return rows;
  }

  async function getLearningPath({ query = '', current_url = '', goal = 'learn' } = {}) {
    const payload = await loadPaths();
    const requestedPath = normalizePath(current_url || location.href);
    let selected = payload.paths.find((path) => normalizePath(path.current?.url) === requestedPath);

    const cleanQuery = clean(query);
    if (!selected && cleanQuery) {
      const queryTokens = tokens(cleanQuery);
      selected = payload.paths
        .map((path) => ({ path, score: score(queryTokens, path) }))
        .filter((row) => row.score > 0)
        .sort((a, b) => b.score - a.score)[0]?.path;
    }

    if (!selected && payload.paths.length) {
      selected = payload.paths[0];
    }
    if (!selected) throw new Error('5sigmas has no learning paths in this locale');

    return result({
      kind: '5sigmas_learning_path',
      locale: payload.locale,
      goal,
      query: cleanQuery,
      current: selected.current,
      recommendations: orderedLinks(selected, goal),
      coverage: payload.coverage,
      paths_url: new URL(pathsUrl(), location.origin).href
    });
  }

  async function init() {
    const modelContext = document.modelContext;
    if (!modelContext || typeof modelContext.registerTool !== 'function') return;

    controller?.abort();
    controller = new AbortController();
    const { signal } = controller;

    try {
      await modelContext.registerTool({
        name: '5sigmas_get_learning_path',
        title: 'Navigate a 5sigmas learning path',
        description: 'Return the crawlable semantic path around the current page or a requested topic: what to understand, read next, watch next, try interactively and explore in depth. The same relationships are rendered as real internal links for people and search engines.',
        annotations: { readOnlyHint: true },
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Optional topic to route through 5sigmas when the current page is not the desired starting point.' },
            current_url: { type: 'string', description: 'Optional public 5sigmas URL to use as the starting page. Defaults to the current browser page.' },
            goal: { type: 'string', enum: ['learn', 'watch', 'build', 'explore'], default: 'learn' }
          },
          additionalProperties: false
        },
        execute: getLearningPath
      }, { signal });
      document.documentElement.dataset.webmcpLearningPaths = 'ready';
    } catch (error) {
      console.warn('[5sigmas learning-path WebMCP] registration failed', error);
    }
  }

  if (typeof document$ !== 'undefined' && document$?.subscribe) {
    document$.subscribe(() => init());
  } else if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', init, { once: true });
  }
})();
