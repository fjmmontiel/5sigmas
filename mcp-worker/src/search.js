const GRAPH_URLS = [
  { locale: "es", url: "https://5sigmas.com/agent/knowledge.json" },
  { locale: "en", url: "https://5sigmas.com/en/agent/knowledge.json" }
];

const PAGE_KINDS = new Set([
  "page",
  "home",
  "concept",
  "concept-hub",
  "series",
  "series-chapter",
  "series-hub",
  "engineering",
  "engineering-hub",
  "tool",
  "tool-hub",
  "video-page",
  "video-hub"
]);

const CHILD_KINDS = new Set(["image", "svg", "animation", "video"]);
const EXCLUDED_KINDS = new Set(["evidence"]);
const MAX_RESULTS = 10;
const MAX_TEXT_CHARS = 200_000;
const CACHE_TTL_MS = 5 * 60 * 1000;

let graphCache = { expiresAt: 0, graphs: null };

export function normalize(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function tokens(value) {
  return [...new Set(normalize(value).split(/\s+/).filter((token) => token.length > 1))];
}

function headingText(item) {
  if (!Array.isArray(item?.headings)) return "";
  return item.headings.map((entry) => typeof entry === "string" ? entry : entry?.text ?? "").join(" ");
}

function listText(value) {
  return Array.isArray(value) ? value.join(" ") : String(value ?? "");
}

function searchable(item) {
  return [
    item?.title,
    item?.description,
    item?.kind,
    item?.parent_title,
    item?.domain,
    headingText(item),
    listText(item?.keywords),
    listText(item?.tags),
    item?.text_excerpt
  ].map(normalize).join(" ");
}

export function scoreItem(query, item) {
  const queryNorm = normalize(query);
  const queryTokens = tokens(query);
  if (!queryTokens.length) return 0;

  const title = normalize(item?.title);
  const description = normalize(item?.description);
  const headings = normalize(headingText(item));
  const keywords = normalize([listText(item?.keywords), listText(item?.tags)].join(" "));
  const excerpt = normalize(item?.text_excerpt);
  const all = searchable(item);

  let score = 0;
  if (title.includes(queryNorm)) score += 40;
  if (description.includes(queryNorm)) score += 18;
  if (headings.includes(queryNorm)) score += 12;

  for (const token of queryTokens) {
    if (title.includes(token)) score += 10;
    if (keywords.includes(token)) score += 7;
    if (description.includes(token)) score += 5;
    if (headings.includes(token)) score += 4;
    if (excerpt.includes(token)) score += 2;
    if (all.includes(token)) score += 1;
  }

  if (PAGE_KINDS.has(item?.kind)) score += 3;
  return score;
}

function citationUrl(item) {
  const candidate = CHILD_KINDS.has(item?.kind)
    ? (item?.parent_url || item?.url)
    : item?.url;
  if (typeof candidate !== "string" || !candidate) return "";
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "https:" && parsed.hostname === "5sigmas.com" ? parsed.href : "";
  } catch {
    return "";
  }
}

function itemTitle(item) {
  return String(item?.title || item?.parent_title || "5sigmas");
}

function graphItems(graphs) {
  return graphs.flatMap(({ locale, graph }) =>
    Array.isArray(graph?.items)
      ? graph.items.map((item) => ({ ...item, _locale: locale }))
      : []
  );
}

export function searchGraphs(graphs, query, limit = MAX_RESULTS) {
  const ranked = graphItems(graphs)
    .filter((item) => !EXCLUDED_KINDS.has(item?.kind))
    .map((item) => ({ item, score: scoreItem(query, item), url: citationUrl(item) }))
    .filter(({ item, score, url }) => Boolean(item?.id) && score > 0 && Boolean(url))
    .sort((a, b) => b.score - a.score || itemTitle(a.item).localeCompare(itemTitle(b.item)));

  const seen = new Set();
  const results = [];
  for (const { item, url } of ranked) {
    if (seen.has(url)) continue;
    seen.add(url);
    results.push({ id: String(item.id), title: itemTitle(item), url });
    if (results.length >= limit) break;
  }
  return { results };
}

export function findItem(graphs, id) {
  return graphItems(graphs).find((item) => String(item?.id) === String(id)) ?? null;
}

function markdownUrl(item) {
  const candidate = item?.markdown_url;
  if (typeof candidate !== "string" || !candidate) return "";
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "https:" && parsed.hostname === "5sigmas.com" ? parsed.href : "";
  } catch {
    return "";
  }
}

export async function fetchDocument(graphs, id, fetchImpl = fetch) {
  const item = findItem(graphs, id);
  if (!item) throw new Error(`Unknown 5sigmas knowledge id: ${id}`);

  const url = citationUrl(item);
  if (!url) throw new Error(`Knowledge item is not backed by a citable 5sigmas URL: ${id}`);

  let text = String(item.description || item.text_excerpt || "");
  let truncated = false;
  const mdUrl = markdownUrl(item);

  if (mdUrl) {
    const response = await fetchImpl(mdUrl, {
      headers: { "Accept": "text/markdown,text/plain;q=0.9,*/*;q=0.1" }
    });
    if (!response.ok) throw new Error(`Markdown fetch failed (${response.status}) for ${mdUrl}`);
    const full = await response.text();
    if (full.length > MAX_TEXT_CHARS) {
      text = full.slice(0, MAX_TEXT_CHARS);
      truncated = true;
    } else {
      text = full;
    }
  }

  return {
    id: String(item.id),
    title: itemTitle(item),
    text,
    url,
    metadata: {
      locale: String(item._locale || ""),
      kind: String(item.kind || "page"),
      description: String(item.description || ""),
      markdown_url: mdUrl,
      parent_url: String(item.parent_url || ""),
      truncated
    }
  };
}

async function fetchGraph(spec, fetchImpl) {
  const response = await fetchImpl(spec.url, {
    headers: { "Accept": "application/json" },
    cf: { cacheEverything: true, cacheTtl: 300 }
  });
  if (!response.ok) throw new Error(`Knowledge graph fetch failed (${response.status}) for ${spec.url}`);
  const graph = await response.json();
  if (graph?.schema_version !== 2 || !Array.isArray(graph?.items)) {
    throw new Error(`Unexpected knowledge graph schema at ${spec.url}`);
  }
  return { locale: spec.locale, graph };
}

export async function loadGraphs(fetchImpl = fetch) {
  const now = Date.now();
  if (graphCache.graphs && graphCache.expiresAt > now) return graphCache.graphs;
  const graphs = await Promise.all(GRAPH_URLS.map((spec) => fetchGraph(spec, fetchImpl)));
  graphCache = { graphs, expiresAt: now + CACHE_TTL_MS };
  return graphs;
}

export function resetGraphCacheForTests() {
  graphCache = { expiresAt: 0, graphs: null };
}
