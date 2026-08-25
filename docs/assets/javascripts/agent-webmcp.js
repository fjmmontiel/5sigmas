(() => {
  'use strict';

  const VERSION = '2026-08-25';
  const MAX_RESULTS = 12;
  const MAX_LINKS = 30;
  let registrationController = null;

  function locale() {
    return location.pathname === '/en' || location.pathname.startsWith('/en/') ? 'en' : 'es';
  }

  function localePrefix() {
    return locale() === 'en' ? '/en' : '';
  }

  function normalizePath(value) {
    let path = String(value || '/').split('#')[0].split('?')[0];
    path = path.replace(/\/index\.html$/, '/').replace(/\/{2,}/g, '/');
    if (!path.startsWith('/')) path = `/${path}`;
    if (!/\.[a-z0-9]+$/i.test(path) && !path.endsWith('/')) path += '/';
    return path;
  }

  function canonicalUrl() {
    const canonical = document.querySelector('link[rel="canonical"]')?.href;
    return canonical || new URL(location.pathname, location.origin).href;
  }

  function mainRoot() {
    return document.querySelector('.md-content') || document.querySelector('main') || document.body;
  }

  function text(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function tokens(value) {
    return text(value)
      .toLocaleLowerCase(locale() === 'es' ? 'es' : 'en')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(/[^a-z0-9+#.@/-]+/i)
      .filter((item) => item.length > 1);
  }

  function jsonResult(payload) {
    const serializable = { ...payload, webmcp_version: VERSION };
    return {
      content: [{ type: 'text', text: JSON.stringify(serializable) }],
      structuredContent: serializable
    };
  }

  async function loadJson(url) {
    const response = await fetch(url, { credentials: 'same-origin' });
    if (!response.ok) throw new Error(`5sigmas resource unavailable (${response.status}): ${url}`);
    return response.json();
  }

  let catalogPromise;
  function loadCatalog() {
    if (!catalogPromise) {
      const path = `${localePrefix()}/agent-tools.json` || '/agent-tools.json';
      catalogPromise = loadJson(path);
    }
    return catalogPromise;
  }

  let searchIndexPromise;
  function loadSearchIndex() {
    if (!searchIndexPromise) {
      const path = `${localePrefix()}/search/search_index.json` || '/search/search_index.json';
      searchIndexPromise = loadJson(path);
    }
    return searchIndexPromise;
  }

  function scoreText(queryTokens, haystack, boosts = 1) {
    if (!queryTokens.length) return 1;
    const normalized = tokens(haystack);
    const tokenSet = new Set(normalized);
    let score = 0;
    for (const queryToken of queryTokens) {
      if (tokenSet.has(queryToken)) score += 5 * boosts;
      else if (normalized.some((item) => item.startsWith(queryToken) || queryToken.startsWith(item))) score += 2 * boosts;
      else if (text(haystack).toLowerCase().includes(queryToken)) score += boosts;
    }
    return score;
  }

  function absolute(path) {
    return new URL(path, location.origin).href;
  }

  async function discoverTools({ query = '', category = '', audience = '', limit = 8 } = {}) {
    const catalog = await loadCatalog();
    const q = tokens(query);
    const categoryNeedle = text(category).toLowerCase();
    const audienceNeedle = text(audience).toLowerCase();
    const lang = locale();
    const rows = (catalog.tools || [])
      .map((tool) => {
        const audienceText = (tool.audiences || []).join(' ');
        const searchable = [tool.name, tool.category, tool.summary, audienceText].join(' ');
        let score = scoreText(q, tool.name, 4) + scoreText(q, tool.summary, 2) + scoreText(q, searchable, 1);
        if (!q.length) score = 1;
        if (categoryNeedle && text(tool.category).toLowerCase() !== categoryNeedle) score = -1;
        if (audienceNeedle && !audienceText.toLowerCase().includes(audienceNeedle)) score = -1;
        return { tool, score };
      })
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score || a.tool.name.localeCompare(b.tool.name))
      .slice(0, Math.max(1, Math.min(MAX_RESULTS, Number(limit) || 8)))
      .map(({ tool }) => ({
        id: tool.id,
        name: tool.name,
        category: tool.category,
        audiences: tool.audiences,
        summary: tool.summary,
        url: absolute(tool.paths?.[lang] || tool.paths?.en || tool.paths?.es)
      }));
    return jsonResult({
      kind: '5sigmas_tool_discovery',
      query,
      category,
      audience,
      count: rows.length,
      tools: rows,
      catalog_url: absolute(`${localePrefix()}/agent-tools.json` || '/agent-tools.json')
    });
  }

  function searchScore(queryTokens, doc) {
    const title = text(doc.title);
    const locationText = text(doc.location);
    const body = text(doc.text);
    return scoreText(queryTokens, title, 5) + scoreText(queryTokens, locationText, 3) + scoreText(queryTokens, body, 1);
  }

  function libraryUrl(locationValue) {
    const basePath = locale() === 'en' ? '/en/' : '/';
    return new URL(locationValue || './', new URL(basePath, location.origin)).href;
  }

  function kindFromLocation(locationValue) {
    const path = normalizePath(new URL(locationValue || './', new URL(locale() === 'en' ? '/en/' : '/', location.origin)).pathname);
    if (/\/(?:tools|herramientas)\//.test(path)) return 'tool';
    if (/\/series\//.test(path)) return 'series';
    if (/\/(?:temas)\//.test(path)) return 'concept';
    if (/\/videos\//.test(path)) return 'video';
    if (/\/(?:articulos-tecnicos)\//.test(path)) return 'engineering';
    if (/\/visuales\//.test(path)) return 'visual';
    return 'page';
  }

  async function relatedLibrary(tool, limit = 6) {
    const index = await loadSearchIndex();
    const docs = Array.isArray(index.docs) ? index.docs : [];
    const queryTokens = tokens([tool.name, tool.category, tool.summary].join(' '));
    const currentPath = normalizePath(location.pathname);
    return docs
      .map((doc) => {
        const docUrl = libraryUrl(doc.location);
        const docPath = normalizePath(new URL(docUrl).pathname);
        const kind = kindFromLocation(doc.location);
        let score = searchScore(queryTokens, doc);
        if (kind !== 'tool') score += 4;
        return { doc, docUrl, docPath, kind, score };
      })
      .filter((row) => row.score > 0 && row.docPath !== currentPath)
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(1, Math.min(MAX_RESULTS, Number(limit) || 6)))
      .map(({ doc, docUrl, kind }) => ({
        title: text(doc.title),
        kind,
        url: docUrl,
        excerpt: text(doc.text).slice(0, 260)
      }));
  }

  async function searchLibrary({ query, limit = 8 } = {}) {
    const cleanQuery = text(query);
    if (!cleanQuery) throw new Error('query is required');
    const queryTokens = tokens(cleanQuery);
    const index = await loadSearchIndex();
    const docs = Array.isArray(index.docs) ? index.docs : [];
    const rows = docs
      .map((doc) => ({ doc, score: searchScore(queryTokens, doc) }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(1, Math.min(MAX_RESULTS, Number(limit) || 8)))
      .map(({ doc, score }) => ({
        title: text(doc.title),
        kind: kindFromLocation(doc.location),
        url: libraryUrl(doc.location),
        excerpt: text(doc.text).slice(0, 420),
        score
      }));
    return jsonResult({
      kind: '5sigmas_library_search',
      query: cleanQuery,
      count: rows.length,
      results: rows
    });
  }

  function collectLinks() {
    const root = mainRoot();
    const internal = [];
    const external = [];
    const seen = new Set();
    for (const anchor of root.querySelectorAll('a[href]')) {
      let url;
      try { url = new URL(anchor.href, location.href); } catch { continue; }
      if (!/^https?:$/.test(url.protocol)) continue;
      const key = `${url.origin}${normalizePath(url.pathname)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const item = { label: text(anchor.textContent) || url.hostname, url: url.href };
      if (url.origin === location.origin) internal.push(item);
      else external.push(item);
    }
    return {
      internal: internal.slice(0, MAX_LINKS),
      external: external.slice(0, MAX_LINKS)
    };
  }

  async function pageContext() {
    const root = mainRoot();
    const headings = [...root.querySelectorAll('h1, h2, h3')]
      .map((node) => ({ level: node.tagName.toLowerCase(), text: text(node.textContent) }))
      .filter((item) => item.text)
      .slice(0, 40);
    const links = collectLinks();
    const catalog = await loadCatalog();
    const path = normalizePath(location.pathname);
    const lang = locale();
    const currentTool = (catalog.tools || []).find((tool) => normalizePath(tool.paths?.[lang]) === path);
    const alternates = [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((node) => ({
      language: node.getAttribute('hreflang'),
      url: node.href
    }));
    return jsonResult({
      kind: '5sigmas_page_context',
      title: text(document.title),
      description: document.querySelector('meta[name="description"]')?.content || '',
      canonical_url: canonicalUrl(),
      locale: lang,
      current_tool: currentTool ? {
        id: currentTool.id,
        name: currentTool.name,
        category: currentTool.category,
        audiences: currentTool.audiences,
        summary: currentTool.summary
      } : null,
      headings,
      related_internal_links: links.internal,
      external_sources: links.external,
      language_alternates: alternates
    });
  }

  function fieldLabel(element) {
    const container = element.closest('.s5-tool-field') || element.parentElement;
    const explicit = element.id ? document.querySelector(`label[for="${CSS.escape(element.id)}"]`) : null;
    const label = explicit || container?.querySelector('label');
    const helper = container?.querySelector('small, .s5-tool-help, .s5-tool-field__help');
    return text([label?.textContent, helper?.textContent].filter(Boolean).join('. ')) || element.dataset.field;
  }

  function primitiveValue(element) {
    if (element.type === 'checkbox') return Boolean(element.checked);
    if (element.type === 'number' || element.type === 'range') {
      const value = Number(element.value);
      return Number.isFinite(value) ? value : 0;
    }
    return element.value;
  }

  function schemaForField(element) {
    const schema = { description: fieldLabel(element) };
    if (element.type === 'checkbox') {
      schema.type = 'boolean';
      schema.default = Boolean(element.checked);
      return schema;
    }
    if (element.type === 'number' || element.type === 'range') {
      schema.type = 'number';
      const min = Number(element.min);
      const max = Number(element.max);
      if (element.min !== '' && Number.isFinite(min)) schema.minimum = min;
      if (element.max !== '' && Number.isFinite(max)) schema.maximum = max;
      const current = Number(element.value);
      if (Number.isFinite(current)) schema.default = current;
      return schema;
    }
    schema.type = 'string';
    if (element.tagName === 'SELECT') {
      const values = [...element.options].map((option) => option.value).filter((value) => value !== '');
      if (values.length) schema.enum = values;
    }
    if (element.value !== '') schema.default = element.value;
    return schema;
  }

  function toolFields() {
    const root = document.querySelector('.s5-tool-page') || mainRoot();
    const entries = [];
    const seen = new Set();
    for (const element of root.querySelectorAll('[data-field]')) {
      const name = text(element.dataset.field);
      if (!name || seen.has(name)) continue;
      seen.add(name);
      entries.push([name, element]);
    }
    return entries;
  }

  function applyField(element, value) {
    if (value === undefined || value === null) return;
    if (element.type === 'checkbox') element.checked = Boolean(value);
    else element.value = String(value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function waitForRender() {
    return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 0))));
  }

  function collectOutputs(root) {
    const outputs = {};
    for (const element of root.querySelectorAll('[data-output]')) {
      const key = text(element.dataset.output);
      if (!key) continue;
      outputs[key] = text(element.textContent);
    }
    const gates = [...root.querySelectorAll('[data-gate]')].map((element) => ({
      key: text(element.dataset.gate),
      state: text(element.dataset.state || element.querySelector('[data-gate-state]')?.textContent),
      actual: text(element.querySelector('[data-gate-actual]')?.textContent)
    })).filter((item) => item.key);
    return { outputs, gates };
  }

  async function runCurrentTool(args, tool) {
    const root = document.querySelector('.s5-tool-page') || mainRoot();
    const fields = toolFields();
    const byName = new Map(fields);
    for (const [name, value] of Object.entries(args || {})) {
      const element = byName.get(name);
      if (element) applyField(element, value);
    }
    await waitForRender();
    const scenario = Object.fromEntries(fields.map(([name, element]) => [name, primitiveValue(element)]));
    const rendered = collectOutputs(root);
    const links = collectLinks();
    const related = await relatedLibrary(tool, 6);
    return jsonResult({
      kind: '5sigmas_tool_result',
      tool: {
        id: tool.id,
        name: tool.name,
        category: tool.category,
        audiences: tool.audiences
      },
      canonical_url: canonicalUrl(),
      locale: locale(),
      scenario,
      outputs: rendered.outputs,
      gates: rendered.gates,
      source_links: links.external,
      related_content: related
    });
  }

  function currentToolDefinition(tool) {
    const fields = toolFields();
    if (!fields.length) return null;
    return {
      name: `5sigmas_run_${tool.id.replace(/[^a-z0-9]+/gi, '_')}`,
      description: `Run the 5sigmas ${tool.name} on the live page. Unspecified inputs keep their current values. Returns the rendered deterministic outputs, release gates when present, source links and the final scenario.`,
      inputSchema: {
        type: 'object',
        properties: Object.fromEntries(fields.map(([name, element]) => [name, schemaForField(element)])),
        additionalProperties: false
      },
      execute: (args) => runCurrentTool(args, tool)
    };
  }

  async function register(modelContext, definition, signal) {
    try {
      await modelContext.registerTool(definition, { signal });
      return true;
    } catch (error) {
      console.warn('[5sigmas WebMCP] registration failed', definition.name, error);
      return false;
    }
  }

  async function init() {
    const modelContext = document.modelContext;
    if (!modelContext || typeof modelContext.registerTool !== 'function') return;

    registrationController?.abort();
    registrationController = new AbortController();
    const { signal } = registrationController;

    await register(modelContext, {
      name: '5sigmas_discover_tools',
      description: 'Discover the 18 deterministic 5sigmas AI engineering tools by problem, category or intended audience. Returns localized live URLs and concise capability descriptions.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Problem or capability, for example voice latency, RAG evaluation, VRAM or prompt injection.' },
          category: { type: 'string', description: 'Optional exact category from the catalog.' },
          audience: { type: 'string', description: 'Optional audience substring, for example agent engineers or ML researchers.' },
          limit: { type: 'number', minimum: 1, maximum: MAX_RESULTS, default: 8 }
        },
        additionalProperties: false
      },
      execute: discoverTools
    }, signal);

    await register(modelContext, {
      name: '5sigmas_search_library',
      description: 'Search the current-language 5sigmas knowledge library across tools, concepts, learning series, videos and engineering notes. Use this to connect a technical question to the most relevant 5sigmas material.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', minLength: 2, description: 'Technical question, concept or engineering problem to search for.' },
          limit: { type: 'number', minimum: 1, maximum: MAX_RESULTS, default: 8 }
        },
        required: ['query'],
        additionalProperties: false
      },
      execute: searchLibrary
    }, signal);

    await register(modelContext, {
      name: '5sigmas_page_context',
      description: 'Return structured context for the current 5sigmas page: canonical URL, current tool metadata, headings, related internal content, external source links and language alternates.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      execute: pageContext
    }, signal);

    const catalog = await loadCatalog();
    const path = normalizePath(location.pathname);
    const lang = locale();
    const currentTool = (catalog.tools || []).find((tool) => normalizePath(tool.paths?.[lang]) === path);
    if (currentTool && document.querySelector('.s5-tool-page')) {
      const definition = currentToolDefinition(currentTool);
      if (definition) await register(modelContext, definition, signal);
    }

    document.documentElement.dataset.webmcp = 'ready';
  }

  if (typeof document$ !== 'undefined' && document$?.subscribe) {
    document$.subscribe(() => init());
  } else if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', init, { once: true });
  }
})();
