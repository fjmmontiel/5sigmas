import fs from 'node:fs';
import crypto from 'node:crypto';

const fail = (message) => {
  console.error(`SERIES 4 RELEASE GATE FAIL: ${message}`);
  process.exitCode = 1;
};
const assert = (condition, message) => {
  if (!condition) fail(message);
};
const read = (path) => fs.readFileSync(path, 'utf8');
const sha256 = (path) => crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');

const base = 'series/llm-inference-engineering-economics';
const chapters = [
  ['01-prefill-vs-decode-ttft-tpot-throughput-latency-budget.md', 'inference-prefill-decode-latency-budget.html'],
  ['02-kv-cache-memory-hierarchy-continuous-batching-pagedattention.md', 'inference-kv-cache-paging-batching.html'],
  ['03-quantization-parallelism-memory-quality-tradeoffs.md', 'inference-quantization-parallelism-tradeoffs.html'],
  ['04-speculative-decoding-prefix-caching-latency-optimisations.md', 'inference-speculative-prefix-latency.html'],
  ['05-model-routing-fallback-caching-workload-aware-serving.md', 'inference-routing-fallback-cache-policy.html'],
  ['06-benchmarking-inference-cost-task-throughput-latency-energy-hardware-constraints.md', 'inference-benchmark-measurement-boundary.html'],
];

const navEs = read('mkdocs.yml');
const navEn = read('mkdocs.en.yml');
const manifest = read('locales/en/manifest.yml');
const seriesWorkflow = read('.github/workflows/series4-golden-review.yml');

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
    assert(fs.existsSync(path), `missing required Series 4 file: ${path}`);
  }
  if (![esPath, enPath, visualPath, enVisualPath, enI18nPath].every(fs.existsSync)) continue;

  const es = read(esPath);
  const en = read(enPath);
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
  // The dedicated Series 4 PR workflow is the permanent owner for all six
  // chapter source/accessibility gates. pr-visual-review remains a broader
  // site-wide regression suite and is not required to duplicate these steps.
  assert(seriesWorkflow.includes(`validate_inference_engineering_ch${n}_source.mjs`), `chapter ${n} source gate missing from Series 4 PR workflow`);
  assert(seriesWorkflow.includes(`validate_inference_engineering_ch${n}_accessibility.mjs`), `chapter ${n} accessibility gate missing from Series 4 PR workflow`);

  inventory.push({
    chapter: `4.${n}`,
    es: { path: esPath, sha256: sha256(esPath), bytes: fs.statSync(esPath).size },
    en: { path: enPath, sha256: sha256(enPath), bytes: fs.statSync(enPath).size },
    visual: { path: visualPath, sha256: sha256(visualPath), bytes: fs.statSync(visualPath).size },
    enMirror: { path: enVisualPath, sha256: sha256(enVisualPath), bytes: fs.statSync(enVisualPath).size },
    enI18n: { path: enI18nPath, sha256: sha256(enI18nPath), bytes: fs.statSync(enI18nPath).size },
  });
}

assert(chapters.length === 6, 'Series 4 chapter inventory must contain exactly six chapters');
assert(seriesWorkflow.includes('validate_inference_engineering_series4_release.mjs'), 'Series 4 PR workflow does not execute deterministic release inventory');
assert(seriesWorkflow.includes('validate_english_series_mirror.mjs'), 'Series 4 PR workflow does not execute English series mirror validation');
assert(seriesWorkflow.includes('validate_reader_header_overlap.mjs'), 'Series 4 PR workflow does not execute reader header overlap validation');
assert(seriesWorkflow.includes('validate_responsive_polish.mjs'), 'Series 4 PR workflow does not execute responsive polish validation');

if (!process.exitCode) {
  fs.mkdirSync('artifacts/visual-review', { recursive: true });
  fs.writeFileSync(
    'artifacts/visual-review/inference-engineering-series4-inventory.json',
    `${JSON.stringify({ generatedFrom: process.env.GITHUB_SHA || 'local', chapters: inventory }, null, 2)}\n`,
  );
  console.log(`Series 4 deterministic release inventory PASS (${inventory.length} chapters, zero video dependencies).`);
}
