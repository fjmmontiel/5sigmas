import fs from 'node:fs';
import crypto from 'node:crypto';

const fail = (message) => {
  console.error(`SERIES 3 RELEASE GATE FAIL: ${message}`);
  process.exitCode = 1;
};
const assert = (condition, message) => {
  if (!condition) fail(message);
};
const read = (path) => fs.readFileSync(path, 'utf8');
const sha256 = (path) => crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');

const base = 'series/context-engineering-memory-mcp';
const chapters = [
  ['01-context-engineering-vs-prompt-engineering.md', 'context-engineering-assembly-loop.html'],
  ['02-context-budgets-prioritisation-compaction-provenance.md', 'context-budget-lineage.html'],
  ['03-memory-architectures-working-episodic-semantic-persistent-state.md', 'context-memory-lifecycle.html'],
  ['04-retrieval-context-assembly-freshness-relevance-conflict-grounding.md', 'context-retrieval-grounding.html'],
  ['05-mcp-hosts-clients-servers-tools-resources-prompts-lifecycle-trust-boundaries.md', 'context-mcp-trust-boundaries.html'],
  ['06-skills-plugins-subagents-hooks-context-isolation-evaluation.md', 'context-extension-isolation-lifecycle.html'],
];

const navEs = read('mkdocs.yml');
const navEn = read('mkdocs.en.yml');
const manifest = read('locales/en/manifest.yml');
const prWorkflow = read('.github/workflows/pr-visual-review.yml');

let previousEsNav = -1;
let previousEnNav = -1;
const inventory = [];

for (let i = 0; i < chapters.length; i += 1) {
  const [article, visual] = chapters[i];
  const n = i + 1;
  const esPath = `docs/${base}/${article}`;
  const enPath = `locales/en/${base}/${article}`;
  const visualPath = `docs/snippets/articulos-tecnicos/${visual}`;
  const enVisualPath = `locales/en/snippets/articulos-tecnicos/${visual}`;
  const enI18nPath = enVisualPath.replace(/\.html$/, '.i18n.json');

  for (const path of [esPath, enPath, visualPath, enVisualPath, enI18nPath]) {
    assert(fs.existsSync(path), `missing required Series 3 file: ${path}`);
  }
  if (![esPath, enPath, visualPath, enVisualPath, enI18nPath].every(fs.existsSync)) continue;

  const es = read(esPath);
  const en = read(enPath);
  // Canonical placeholder markers are uppercase engineering tokens. Keep this
  // case-sensitive so ordinary Spanish prose such as "todo" is not a false positive.
  const forbidden = /\b(?:TODO|TBD|PLACEHOLDER|FIXME)\b/;
  assert(!forbidden.test(es), `placeholder marker in ${esPath}`);
  assert(!forbidden.test(en), `placeholder marker in ${enPath}`);
  assert(es.includes(`include_html("snippets/articulos-tecnicos/${visual}")`), `${esPath} does not include canonical visual ${visual}`);
  assert(en.includes(`include_html("snippets/articulos-tecnicos/${visual}")`), `${enPath} does not include canonical visual ${visual}`);
  assert(!/(?:<video\b|\.mp4\b|youtube\.com|youtu\.be)/i.test(es), `${esPath} unexpectedly references video media; inventory/review required`);
  assert(!/(?:<video\b|\.mp4\b|youtube\.com|youtu\.be)/i.test(en), `${enPath} unexpectedly references video media; inventory/review required`);
  assert((es.match(/^## /gm) || []).length >= 6, `${esPath} has suspiciously shallow pedagogical structure`);
  assert((en.match(/^## /gm) || []).length >= 6, `${enPath} has suspiciously shallow pedagogical structure`);
  assert((es.match(/\[\^[^\]]+\]/g) || []).length >= 4, `${esPath} has too few explicit source references for release review`);
  assert((en.match(/\[\^[^\]]+\]/g) || []).length >= 4, `${enPath} has too few explicit source references for release review`);

  const esNav = navEs.indexOf(article);
  const enNav = navEn.indexOf(article);
  assert(esNav >= 0, `${article} missing from mkdocs.yml navigation`);
  assert(enNav >= 0, `${article} missing from mkdocs.en.yml navigation`);
  assert(esNav > previousEsNav, `${article} is out of order in mkdocs.yml`);
  assert(enNav > previousEnNav, `${article} is out of order in mkdocs.en.yml`);
  previousEsNav = esNav;
  previousEnNav = enNav;

  assert(manifest.includes(`${base}/${article}`), `${article} missing from EN manifest`);
  assert(manifest.includes(`snippets/articulos-tecnicos/${visual}`), `${visual} missing from EN manifest`);
  assert(prWorkflow.includes(`validate_context_engineering_ch${n}_source.mjs`), `chapter ${n} source gate missing from permanent PR workflow`);
  assert(prWorkflow.includes(`validate_context_engineering_ch${n}_accessibility.mjs`), `chapter ${n} accessibility gate missing from permanent PR workflow`);

  inventory.push({
    chapter: `3.${n}`,
    es: { path: esPath, sha256: sha256(esPath), bytes: fs.statSync(esPath).size },
    en: { path: enPath, sha256: sha256(enPath), bytes: fs.statSync(enPath).size },
    visual: { path: visualPath, sha256: sha256(visualPath), bytes: fs.statSync(visualPath).size },
    enMirror: { path: enVisualPath, sha256: sha256(enVisualPath), bytes: fs.statSync(enVisualPath).size },
    enI18n: { path: enI18nPath, sha256: sha256(enI18nPath), bytes: fs.statSync(enI18nPath).size },
  });
}

assert(chapters.length === 6, 'Series 3 chapter inventory must contain exactly six chapters');

if (!process.exitCode) {
  fs.mkdirSync('artifacts/visual-review', { recursive: true });
  fs.writeFileSync(
    'artifacts/visual-review/context-engineering-series3-inventory.json',
    `${JSON.stringify({ generatedFrom: process.env.GITHUB_SHA || 'local', chapters: inventory }, null, 2)}\n`,
  );
  console.log(`Series 3 deterministic release inventory PASS (${inventory.length} chapters, zero video dependencies).`);
}
