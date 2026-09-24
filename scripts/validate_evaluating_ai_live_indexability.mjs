#!/usr/bin/env node

import { execFileSync } from 'node:child_process';

const requestBase = (process.env.S5_PREVIEW_BASE || 'https://5sigmas.com').replace(/\/$/, '');
const canonicalOrigin = 'https://5sigmas.com';
const expectedRevision = (process.env.S5_EXPECTED_SHA || '').trim();
const series = 'evaluating-ai-systems-production';
const videoPublished = execFileSync('python3', [
  '-c',
  'from hooks.video_publication_policy import is_video_source_published; print(is_video_source_published("series/evaluating-ai-systems-production/01-placeholder.md"))',
], { encoding: 'utf8' }).trim() === 'True';
const slugs = [
  '01-que-evaluar-modelo-componente-sistema-workflow-trayectoria',
  '02-offline-eval-sets-curation-hard-negatives-contamination-versioning',
  '03-llm-as-judge-evaluacion-humana-calibracion-sesgo-varianza-acuerdo',
  '04-evaluacion-trayectorias-agentes-tools-exito-eficiencia-recuperacion-policy',
  '05-online-evaluation-shadow-canary-ab-guardrails-regression-gates',
  '06-observability-failure-taxonomies-production-eval-repair-feedback-loops',
];

const failures = [];
const pages = new Map();
const metadata = [];

const decode = (value = '') => value
  .replaceAll('&amp;', '&')
  .replaceAll('&quot;', '"')
  .replaceAll('&#39;', "'")
  .replaceAll('&lt;', '<')
  .replaceAll('&gt;', '>')
  .replaceAll('&nbsp;', ' ');

const attrs = (tag) => {
  const result = {};
  const pattern = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  for (const match of tag.matchAll(pattern)) result[match[1].toLowerCase()] = decode(match[2] ?? match[3] ?? match[4] ?? '');
  return result;
};
const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map((m) => m[0]);
const linkTags = (html) => tags(html, 'link').map((tag) => attrs(tag));
const metaTags = (html) => tags(html, 'meta').map((tag) => attrs(tag));
const anchorTags = (html) => tags(html, 'a').map((tag) => attrs(tag));

const normalizePublic = (href, currentUrl) => {
  try {
    const parsed = new URL(href, currentUrl);
    if (parsed.origin !== canonicalOrigin) return null;
    parsed.hash = '';
    parsed.search = '';
    let pathname = parsed.pathname.replace(/\/{2,}/g, '/');
    if (!pathname.endsWith('/') && !/\/[^/]+\.[A-Za-z0-9]+$/.test(pathname)) pathname += '/';
    return `${canonicalOrigin}${pathname}`;
  } catch {
    return null;
  }
};

const publicUrl = (locale, kind, slug) => {
  const prefix = locale === 'en' ? '/en' : '';
  const root = kind === 'watch' ? 'videos/series' : 'series';
  return `${canonicalOrigin}${prefix}/${root}/${series}/${slug}/`;
};
const requestUrl = (publicAbsolute) => `${requestBase}${new URL(publicAbsolute).pathname}`;

const fetchExact = async (url, label) => {
  let response;
  try {
    response = await fetch(url, {
      redirect: 'manual',
      headers: {
        'cache-control': 'no-cache',
        pragma: 'no-cache',
        'user-agent': '5sigmas-golden-evaluating-ai-indexability/1.0',
      },
    });
  } catch (error) {
    failures.push(`${label}: request failed: ${error.message}`);
    return null;
  }
  if (response.status !== 200) {
    const location = response.headers.get('location');
    failures.push(`${label}: expected direct HTTP 200, got ${response.status}${location ? ` -> ${location}` : ''}`);
    return null;
  }
  const xRobots = (response.headers.get('x-robots-tag') || '').toLowerCase();
  if (/(?:^|[,;\s])(?:noindex|none)(?:$|[,;\s])/.test(xRobots)) {
    failures.push(`${label}: X-Robots-Tag blocks indexing: ${JSON.stringify(xRobots)}`);
  }
  return response;
};

const visibleText = (html) => decode(html
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
  .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
  .replace(/<template\b[^>]*>[\s\S]*?<\/template>/gi, ' ')
  .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

const extractJsonLd = (html, label) => {
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const a = attrs(`<script ${match[1]}>`);
    if ((a.type || '').toLowerCase() !== 'application/ld+json' || !match[2].trim()) continue;
    try {
      JSON.parse(match[2].trim());
    } catch (error) {
      failures.push(`${label}: invalid JSON-LD: ${error.message}`);
    }
  }
};

const inspectPage = async (locale, kind, slug) => {
  const expected = publicUrl(locale, kind, slug);
  const label = `${locale} ${kind} ${slug}`;
  const response = await fetchExact(requestUrl(expected), label);
  if (!response) return;
  const html = await response.text();
  const htmlTag = html.match(/<html\b[^>]*>/i)?.[0] || '';
  const lang = (attrs(htmlTag).lang || '').toLowerCase().split('-', 1)[0];
  if (lang !== locale) failures.push(`${label}: html lang ${JSON.stringify(lang)} != ${locale}`);

  const links = linkTags(html);
  const canonicals = links.filter((a) => (a.rel || '').toLowerCase().split(/\s+/).includes('canonical'));
  if (canonicals.length !== 1 || canonicals[0].href !== expected) {
    failures.push(`${label}: canonical must be exactly ${expected}, got ${JSON.stringify(canonicals.map((a) => a.href))}`);
  }
  const pageHreflang = links.filter((a) => (a.rel || '').toLowerCase().split(/\s+/).includes('alternate') && a.hreflang);
  if (pageHreflang.length) {
    failures.push(`${label}: page-level hreflang contradicts the canonical locale-root contract: ${JSON.stringify(pageHreflang)}`);
  }

  for (const meta of metaTags(html)) {
    const name = (meta.name || '').toLowerCase();
    if (!['robots', 'googlebot'].includes(name)) continue;
    if (/(?:^|[,;\s])(?:noindex|none)(?:$|[,;\s])/.test((meta.content || '').toLowerCase())) {
      failures.push(`${label}: ${name} meta blocks indexing: ${JSON.stringify(meta.content || '')}`);
    }
  }

  const title = decode(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/\s+/g, ' ').trim();
  const description = metaTags(html).find((a) => (a.name || '').toLowerCase() === 'description')?.content?.trim() || '';
  const h1 = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => visibleText(m[1])).filter(Boolean);
  if (!title) failures.push(`${label}: empty <title>`);
  if (!description) failures.push(`${label}: empty meta description`);
  if (h1.length !== 1) failures.push(`${label}: expected exactly one non-empty H1, got ${h1.length}`);
  const text = visibleText(html);
  if (text.length < 200) failures.push(`${label}: crawlable text unexpectedly thin (${text.length} characters)`);
  metadata.push({ label, locale, kind, title, description });
  extractJsonLd(html, label);

  const outgoing = new Set();
  for (const a of anchorTags(html)) {
    if (!a.href || /^(?:mailto:|tel:|javascript:|#)/i.test(a.href)) continue;
    const normalized = normalizePublic(a.href, expected);
    if (normalized) outgoing.add(normalized);
  }
  if (videoPublished) {
    const paired = kind === 'article' ? publicUrl(locale, 'watch', slug) : publicUrl(locale, 'article', slug);
    if (!outgoing.has(paired)) {
      failures.push(`${label}: missing crawlable ${kind === 'article' ? 'article→watch' : 'watch→article'} link ${paired}`);
    }
  }
  pages.set(expected, { locale, kind, slug, outgoing });
};

const inspectHub = async (locale) => {
  const pathname = locale === 'en' ? '/en/series/' : '/series/';
  const expected = `${canonicalOrigin}${pathname}`;
  const response = await fetchExact(`${requestBase}${pathname}`, `${locale} series hub`);
  if (!response) return;
  const html = await response.text();
  const outgoing = new Set();
  for (const a of anchorTags(html)) {
    if (!a.href) continue;
    const normalized = normalizePublic(a.href, expected);
    if (normalized) outgoing.add(normalized);
  }
  pages.set(expected, { locale, kind: 'hub', slug: 'series', outgoing });
};

const parseRobots = (text) => {
  const groups = [];
  let group = { agents: [], disallows: [], hasRules: false };
  const push = () => {
    if (group.agents.length || group.hasRules) groups.push(group);
    group = { agents: [], disallows: [], hasRules: false };
  };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.split('#', 1)[0].trim();
    if (!line || !line.includes(':')) continue;
    const index = line.indexOf(':');
    const key = line.slice(0, index).trim().toLowerCase();
    const value = line.slice(index + 1).trim();
    if (key === 'user-agent') {
      if (group.hasRules) push();
      group.agents.push(value.toLowerCase());
    } else if (key === 'disallow') {
      group.hasRules = true;
      if (value) group.disallows.push(value);
    } else if (key === 'allow') {
      group.hasRules = true;
    }
  }
  push();
  return groups;
};

const inspectRobots = async () => {
  const response = await fetchExact(`${requestBase}/robots.txt`, 'robots.txt');
  if (!response) return;
  const protectedPrefixes = [
    `/series/${series}/`, `/en/series/${series}/`,
    `/videos/series/${series}/`, `/en/videos/series/${series}/`,
    '/assets/', '/en/assets/',
  ];
  const text = await response.text();
  for (const group of parseRobots(text).filter((g) => g.agents.includes('*'))) {
    for (const disallow of group.disallows) {
      if (disallow === '/' || protectedPrefixes.some((prefix) => prefix.startsWith(disallow) || disallow.startsWith(prefix))) {
        failures.push(`robots.txt: User-agent * Disallow overlaps an evaluating-ai route/resource prefix: ${disallow}`);
      }
    }
  }
};

const xmlUrlBlock = (xml, expected) => {
  for (const match of xml.matchAll(/<url\b[^>]*>([\s\S]*?)<\/url>/gi)) {
    const block = match[1];
    if (decode(block.match(/<loc\b[^>]*>([\s\S]*?)<\/loc>/i)?.[1] || '').trim() === expected) return block;
  }
  return null;
};
const sitemapAlternates = (block) => {
  const result = {};
  if (!block) return result;
  for (const match of block.matchAll(/<(?:[A-Za-z0-9_-]+:)?link\b[^>]*>/gi)) {
    const a = attrs(match[0]);
    if ((a.rel || '').toLowerCase() === 'alternate' && a.hreflang && a.href) result[a.hreflang.toLowerCase()] = a.href;
  }
  return result;
};

const inspectSitemaps = async () => {
  const documents = {};
  for (const pathname of ['/sitemap.xml', '/en/sitemap.xml', '/video-sitemap.xml', '/en/video-sitemap.xml']) {
    const response = await fetchExact(`${requestBase}${pathname}`, pathname);
    if (response) documents[pathname] = await response.text();
  }
  for (const slug of slugs) for (const locale of ['es', 'en']) {
    const normalPath = locale === 'en' ? '/en/sitemap.xml' : '/sitemap.xml';
    const videoPath = locale === 'en' ? '/en/video-sitemap.xml' : '/video-sitemap.xml';
    const other = locale === 'en' ? 'es' : 'en';
    for (const kind of videoPublished ? ['article', 'watch'] : ['article']) {
      const expected = publicUrl(locale, kind, slug);
      const block = documents[normalPath] ? xmlUrlBlock(documents[normalPath], expected) : null;
      if (!block) {
        failures.push(`${normalPath}: missing ${expected}`);
      } else {
        const alternates = sitemapAlternates(block);
        const otherExpected = publicUrl(other, kind, slug);
        if (alternates[other] !== otherExpected) {
          failures.push(`${normalPath}: ${expected} hreflang ${other} ${JSON.stringify(alternates[other])} != ${otherExpected}`);
        }
      }
      if (kind === 'watch' && documents[videoPath] && !xmlUrlBlock(documents[videoPath], expected)) {
        failures.push(`${videoPath}: missing watch URL ${expected}`);
      }
    }
    if (!videoPublished) {
      const watch = publicUrl(locale, 'watch', slug);
      if (documents[normalPath] && xmlUrlBlock(documents[normalPath], watch)) {
        failures.push(`${normalPath}: unapproved watch URL remains ${watch}`);
      }
      if (documents[videoPath] && xmlUrlBlock(documents[videoPath], watch)) {
        failures.push(`${videoPath}: unapproved watch URL remains ${watch}`);
      }
    }
  }
};

const inspectMetadataUniqueness = () => {
  const kinds = videoPublished ? ['article', 'watch'] : ['article'];
  for (const locale of ['es', 'en']) for (const kind of kinds) {
    const group = metadata.filter((item) => item.locale === locale && item.kind === kind);
    for (const field of ['title', 'description']) {
      const seen = new Map();
      for (const item of group) {
        const key = item[field];
        if (!key) continue;
        if (seen.has(key)) failures.push(`${item.label}: duplicate localized ${field} also used by ${seen.get(key)}`);
        else seen.set(key, item.label);
      }
    }
  }
};

const inspectInternalGraph = () => {
  const incoming = new Map();
  for (const [source, page] of pages) for (const target of page.outgoing) {
    if (!incoming.has(target)) incoming.set(target, new Set());
    incoming.get(target).add(source);
  }
  for (const slug of slugs) for (const locale of ['es', 'en']) {
    const article = publicUrl(locale, 'article', slug);
    const watch = publicUrl(locale, 'watch', slug);
    const articleRefs = [...(incoming.get(article) || [])].filter((source) => source !== article && source !== watch);
    if (!articleRefs.length) failures.push(`${locale} article ${slug}: orphaned from hub/nav/contextual graph; only paired watch/self references found`);
    if (videoPublished) {
      const watchRefs = [...(incoming.get(watch) || [])].filter((source) => source !== watch);
      if (!watchRefs.includes(article)) failures.push(`${locale} watch ${slug}: no crawlable article referrer`);
    } else if (incoming.has(watch)) {
      failures.push(`${locale} unapproved watch ${slug}: remains crawlably linked`);
    }
  }
};

const inspectAbsentWatch = async (locale, slug) => {
  const watch = publicUrl(locale, 'watch', slug);
  const url = requestUrl(watch);
  try {
    const response = await fetch(url, {
      redirect: 'manual',
      headers: { 'cache-control': 'no-cache', pragma: 'no-cache' },
    });
    if (![404, 410].includes(response.status)) {
      failures.push(`${locale} unapproved watch ${slug}: expected 404/410, got ${response.status}`);
    }
  } catch (error) {
    failures.push(`${locale} unapproved watch ${slug}: request failed: ${error.message}`);
  }
};

const inspectRevision = async () => {
  if (!expectedRevision) return;
  const response = await fetchExact(`${requestBase}/build.json`, 'build.json');
  if (!response) return;
  let data;
  try {
    data = await response.json();
  } catch (error) {
    failures.push(`build.json: invalid JSON: ${error.message}`);
    return;
  }
  if (data?.revision !== expectedRevision) {
    failures.push(`build.json: deployed revision ${JSON.stringify(data?.revision)} != expected ${expectedRevision}`);
  }
};

await inspectRevision();
await inspectRobots();
await inspectSitemaps();
for (const locale of ['es', 'en']) await inspectHub(locale);
for (const slug of slugs) for (const locale of ['es', 'en']) {
  await inspectPage(locale, 'article', slug);
  if (videoPublished) await inspectPage(locale, 'watch', slug);
  else await inspectAbsentWatch(locale, slug);
}
inspectMetadataUniqueness();
inspectInternalGraph();

if (failures.length) {
  console.error('Evaluating AI Systems live INDEXABILITY QA failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
const surfaceSummary = videoPublished
  ? '12 route×locale pairs / 24 article+watch surfaces; direct 200/no redirects; article↔watch discovery'
  : '12 indexed article surfaces / 12 blocked watch URLs verified absent from sitemaps and crawl graph';
console.log(`Evaluating AI Systems live INDEXABILITY PASS: deployed_revision=${expectedRevision || 'preview-not-required'}; ${surfaceSummary}; canonical; robots/noindex/X-Robots; localized unique metadata/H1/crawlable text/JSON-LD syntax; reciprocal sitemap hreflang; hub/nav/contextual discovery. Google selection/index state intentionally not asserted.`);
