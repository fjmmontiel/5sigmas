(() => {
  'use strict';

  const VERSION = '2026-08-26-knowledge-v2';
  const MAX_RESULTS = 24;
  const DEFAULT_RESULTS = 8;
  const MAX_MARKDOWN_CHARS = 30000;
  let controller = null;
  let graphPromise = null;

  function locale() {
    return location.pathname === '/en' || location.pathname.startsWith('/en/') ? 'en' : 'es';
  }

  function graphUrl() {
    return locale() === 'en' ? '/en/agent/knowledge.json' : '/agent/knowledge.json';
  }

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function tokens(value) {
    return clean(value)
      .toLocaleLowerCase(locale() === 'es' ? 'es' : 'en')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(/[^a-z0-9+#.@/-]+/i)
      .filter((item) => item.length > 1);
  }

  function result(payload) {
    const structuredContent = { ...payload, webmcp_version: VERSION };
    return {
      content: [{ type: 'text', text: JSON.stringify(structuredContent) }],
      structuredContent
    };
  }

  async function loadGraph() {
    if (!graphPromise) {
      graphPromise = fetch(graphUrl(), { credentials: 'same-origin' }).then(async (response) => {
        if (!response.ok) throw new Error(`5sigmas knowledge graph unavailable (${response.status})`);
        const payload = await response.json();
        if (payload.schema_version !== 2 || !Array.isArray(payload.items)) {
          throw new Error('Unsupported 5sigmas knowledge graph schema');
        }
        return payload;
      });
    }
    return graphPromise;
  }

  function normalizedKindFilter(kinds) {
    if (!Array.isArray(kinds)) return [];
    return kinds.map((kind) => clean(kind).toLowerCase()).filter(Boolean);
  }

  function searchable(item) {
    const headings = Array.isArray(item.headings) ? item.headings.map((entry) => entry.text).join(' ') : '';
    const keywords = Array.isArray(item.keywords) ? item.keywords.join(' ') : clean(item.keywords);
    const tags = Array.isArray(item.tags) ? item.tags.join(' ') : clean(item.tags);
    return [
      item.title,
      item.description,
      item.kind,
      item.parent_title,
      item.domain,
      keywords,
      tags,
      headings,
      item.text_excerpt
    ].map(clean).join(' ');
  }

  function score(queryTokens, item) {
    if (!queryTokens.length) return 1;
    const titleTokens = new Set(tokens(item.title));
    const descriptionTokens = new Set(tokens(item.description));
    const parentTokens = new Set(tokens(item.parent_title));
    const allTokens = tokens(searchable(item));
    const allSet = new Set(allTokens);
    let total = 0;
    for (const token of queryTokens) {
      if (titleTokens.has(token)) total += 14;
      if (descriptionTokens.has(token)) total += 7;
      if (parentTokens.has(token)) total += 6;
      if (allSet.has(token)) total += 4;
      else if (allTokens.some((candidate) => candidate.startsWith(token) || token.startsWith(candidate))) total += 2;
    }
    return total;
  }

  function compact(item) {
    return {
      id: item.id,
      kind: item.kind,
      title: item.title,
      description: clean(item.description).slice(0, 700),
      url: item.url,
      asset_url: item.asset_url || undefined,
      poster_url: item.poster_url || undefined,
      parent_id: item.parent_id || undefined,
      parent_title: item.parent_title || undefined,
      parent_url: item.parent_url || undefined,
      domain: item.domain || undefined
    };
  }

  function searchItems(graph, { query = '', kinds = [], limit = DEFAULT_RESULTS } = {}) {
    const queryTokens = tokens(query);
    const kindFilter = normalizedKindFilter(kinds);
    const capped = Math.max(1, Math.min(MAX_RESULTS, Number(limit) || DEFAULT_RESULTS));
    return graph.items
      .map((item) => ({ item, score: score(queryTokens, item) }))
      .filter(({ item, score: itemScore }) => itemScore > 0 && (!kindFilter.length || kindFilter.includes(clean(item.kind).toLowerCase())))
      .sort((a, b) => b.score - a.score || clean(a.item.title).localeCompare(clean(b.item.title)))
      .slice(0, capped)
      .map(({ item, score: itemScore }) => ({ ...compact(item), score: itemScore }));
  }

  async function searchKnowledge(args = {}) {
    const graph = await loadGraph();
    const matches = searchItems(graph, args);
    return result({
      kind: '5sigmas_knowledge_search',
      query: clean(args.query),
      requested_kinds: normalizedKindFilter(args.kinds),
      locale: graph.locale,
      count: matches.length,
      total_indexed_items: graph.total_items,
      indexed_kinds: graph.counts,
      results: matches
    });
  }

  async function fetchMarkdown(url) {
    if (!url) return '';
    const parsed = new URL(url, location.origin);
    if (parsed.origin !== location.origin) return '';
    const response = await fetch(parsed.href, { credentials: 'same-origin' });
    if (!response.ok) return '';
    return (await response.text()).slice(0, MAX_MARKDOWN_CHARS);
  }

  async function getKnowledgeItem({ id, include_content = true } = {}) {
    const graph = await loadGraph();
    const item = graph.items.find((candidate) => candidate.id === id);
    if (!item) throw new Error(`Unknown 5sigmas knowledge item: ${id}`);
    let markdown = '';
    if (include_content && item.kind !== 'evidence') {
      markdown = await fetchMarkdown(item.markdown_url || (item.parent_id ? graph.items.find((candidate) => candidate.id === item.parent_id)?.markdown_url : ''));
    }
    const related = [];
    if (Array.isArray(item.related_item_ids)) {
      for (const relatedId of item.related_item_ids.slice(0, 20)) {
        const relatedItem = graph.items.find((candidate) => candidate.id === relatedId);
        if (relatedItem) related.push(compact(relatedItem));
      }
    }
    if (item.parent_id) {
      const parent = graph.items.find((candidate) => candidate.id === item.parent_id);
      if (parent) related.unshift(compact(parent));
    }
    return result({
      kind: '5sigmas_knowledge_item',
      locale: graph.locale,
      item,
      related_items: related,
      markdown_content: markdown || undefined,
      markdown_truncated: Boolean(markdown && markdown.length >= MAX_MARKDOWN_CHARS)
    });
  }

  function bucket(item) {
    if (item.kind === 'tool' || item.kind === 'tool-hub') return 'tools';
    if (['image', 'svg', 'animation'].includes(item.kind)) return 'visuals';
    if (item.kind === 'video' || item.kind === 'video-page' || item.kind === 'video-hub') return 'videos';
    if (item.kind === 'evidence') return 'evidence';
    if (item.kind === 'concept' || item.kind === 'concept-hub') return 'concepts';
    if (item.kind === 'engineering' || item.kind === 'engineering-hub') return 'engineering';
    if (item.kind === 'series' || item.kind === 'series-chapter' || item.kind === 'series-hub') return 'learning';
    return 'pages';
  }

  async function topicBundle({ query, limit_per_kind = 4 } = {}) {
    const cleanQuery = clean(query);
    if (!cleanQuery) throw new Error('query is required');
    const graph = await loadGraph();
    const queryTokens = tokens(cleanQuery);
    const cap = Math.max(1, Math.min(8, Number(limit_per_kind) || 4));
    const grouped = { concepts: [], learning: [], engineering: [], tools: [], visuals: [], videos: [], evidence: [], pages: [] };
    const ranked = graph.items
      .map((item) => ({ item, score: score(queryTokens, item) }))
      .filter(({ score: itemScore }) => itemScore > 0)
      .sort((a, b) => b.score - a.score);
    const seen = new Set();
    for (const { item, score: itemScore } of ranked) {
      const group = bucket(item);
      if (grouped[group].length >= cap) continue;
      const dedupe = `${group}|${item.parent_id || item.id}|${item.url}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      grouped[group].push({ ...compact(item), score: itemScore });
      if (Object.values(grouped).every((entries) => entries.length >= cap)) break;
    }
    return result({
      kind: '5sigmas_topic_bundle',
      query: cleanQuery,
      locale: graph.locale,
      bundle: grouped
    });
  }

  async function searchVisuals({ query = '', visual_type = '', limit = DEFAULT_RESULTS } = {}) {
    const graph = await loadGraph();
    const visualKinds = visual_type ? [clean(visual_type).toLowerCase()] : ['image', 'svg', 'animation', 'video'];
    const matches = searchItems(graph, { query, kinds: visualKinds, limit });
    return result({
      kind: '5sigmas_visual_search',
      query: clean(query),
      visual_type: clean(visual_type),
      locale: graph.locale,
      count: matches.length,
      results: matches
    });
  }

  async function getEvidence({ query = '', item_id = '', limit = DEFAULT_RESULTS } = {}) {
    const graph = await loadGraph();
    const capped = Math.max(1, Math.min(MAX_RESULTS, Number(limit) || DEFAULT_RESULTS));
    let parentId = clean(item_id);
    if (parentId) {
      const selected = graph.items.find((item) => item.id === parentId);
      if (!selected) throw new Error(`Unknown 5sigmas knowledge item: ${parentId}`);
      parentId = selected.parent_id || selected.id;
    }
    let rows = graph.items.filter((item) => item.kind === 'evidence' && (!parentId || item.parent_id === parentId));
    if (clean(query)) {
      const queryTokens = tokens(query);
      rows = rows
        .map((item) => ({ item, score: score(queryTokens, item) }))
        .filter(({ score: itemScore }) => itemScore > 0)
        .sort((a, b) => b.score - a.score)
        .map(({ item }) => item);
    }
    rows = rows.slice(0, capped);
    return result({
      kind: '5sigmas_evidence',
      query: clean(query),
      item_id: clean(item_id),
      locale: graph.locale,
      count: rows.length,
      evidence: rows.map(compact)
    });
  }

  async function knowledgeStats() {
    const graph = await loadGraph();
    return result({
      kind: '5sigmas_knowledge_stats',
      locale: graph.locale,
      total_items: graph.total_items,
      counts: graph.counts,
      graph_url: new URL(graphUrl(), location.origin).href
    });
  }

  async function register(modelContext, definition, signal) {
    try {
      await modelContext.registerTool({
        ...definition,
        title: definition.title || definition.name,
        annotations: { readOnlyHint: true, ...(definition.annotations || {}) }
      }, { signal });
    } catch (error) {
      console.warn('[5sigmas knowledge WebMCP] registration failed', definition.name, error);
    }
  }

  async function init() {
    const modelContext = document.modelContext;
    if (!modelContext || typeof modelContext.registerTool !== 'function') return;
    controller?.abort();
    controller = new AbortController();
    const { signal } = controller;

    await register(modelContext, {
      name: '5sigmas_search_knowledge',
      title: 'Search all 5sigmas knowledge',
      description: 'Search every machine-indexed item deployed on 5sigmas in the current language: concepts, series chapters, engineering notes, tools, graphics, SVG diagrams, animations, videos and referenced evidence.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Topic, technical question, concept, visual or evidence to find. Empty returns representative indexed items.' },
          kinds: { type: 'array', items: { type: 'string' }, description: 'Optional item-kind filters such as concept, series-chapter, engineering, tool, image, svg, animation, video or evidence.' },
          limit: { type: 'integer', minimum: 1, maximum: MAX_RESULTS, default: DEFAULT_RESULTS }
        },
        additionalProperties: false
      },
      execute: searchKnowledge
    }, signal);

    await register(modelContext, {
      name: '5sigmas_get_knowledge_item',
      title: 'Get a 5sigmas knowledge item',
      description: 'Retrieve one indexed 5sigmas page, visual, animation, video or evidence item by stable ID. For site content and visuals it can also return the clean Markdown source of the parent page.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', minLength: 3, description: 'Stable item ID returned by 5sigmas_search_knowledge, 5sigmas_search_visuals or 5sigmas_get_topic_bundle.' },
          include_content: { type: 'boolean', default: true, description: 'Fetch the same-origin clean Markdown representation when available.' }
        },
        required: ['id'],
        additionalProperties: false
      },
      execute: getKnowledgeItem
    }, signal);

    await register(modelContext, {
      name: '5sigmas_get_topic_bundle',
      title: 'Build a complete 5sigmas topic bundle',
      description: 'Assemble the strongest 5sigmas material for one topic across concepts, learning series, engineering notes, executable tools, visuals/animations, videos and primary/external evidence.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', minLength: 2, description: 'Topic or engineering problem, for example agent reliability, prompt injection, inference memory or test-time compute.' },
          limit_per_kind: { type: 'integer', minimum: 1, maximum: 8, default: 4 }
        },
        required: ['query'],
        additionalProperties: false
      },
      execute: topicBundle
    }, signal);

    await register(modelContext, {
      name: '5sigmas_search_visuals',
      title: 'Search 5sigmas visuals and videos',
      description: 'Find meaningful images, inline SVG diagrams, interactive animation shells and videos that are actually deployed inside 5sigmas content, linked back to their explanatory page and Markdown source.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Visual topic or concept to find.' },
          visual_type: { type: 'string', enum: ['image', 'svg', 'animation', 'video'], description: 'Optional visual type filter.' },
          limit: { type: 'integer', minimum: 1, maximum: MAX_RESULTS, default: DEFAULT_RESULTS }
        },
        additionalProperties: false
      },
      execute: searchVisuals
    }, signal);

    await register(modelContext, {
      name: '5sigmas_get_evidence',
      title: 'Get 5sigmas evidence and sources',
      description: 'Retrieve external evidence links referenced by 5sigmas. Filter globally by query or restrict to the page behind a specific knowledge item.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Optional source/evidence topic.' },
          item_id: { type: 'string', description: 'Optional page or child knowledge item whose supporting external references should be returned.' },
          limit: { type: 'integer', minimum: 1, maximum: MAX_RESULTS, default: DEFAULT_RESULTS }
        },
        additionalProperties: false
      },
      execute: getEvidence
    }, signal);

    await register(modelContext, {
      name: '5sigmas_knowledge_stats',
      title: 'Inspect 5sigmas agent coverage',
      description: 'Return counts of every knowledge-object type currently indexed from the deployed locale. Useful for verifying that pages, visuals, animations, videos and evidence are exposed.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      execute: knowledgeStats
    }, signal);

    document.documentElement.dataset.webmcpKnowledge = 'ready';
  }

  if (typeof document$ !== 'undefined' && document$?.subscribe) {
    document$.subscribe(() => init());
  } else if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', init, { once: true });
  }
})();
