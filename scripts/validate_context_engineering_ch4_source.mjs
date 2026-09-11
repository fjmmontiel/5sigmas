#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const read = (p) => fs.readFile(path.resolve(p), 'utf8');
const [es, en, snippet, mirror, i18nRaw, mkdocsEs, mkdocsEn, manifestEn, prVisual] = await Promise.all([
  read('docs/series/context-engineering-memory-mcp/04-retrieval-context-assembly-freshness-relevance-conflict-grounding.md'),
  read('locales/en/series/context-engineering-memory-mcp/04-retrieval-context-assembly-freshness-relevance-conflict-grounding.md'),
  read('docs/snippets/articulos-tecnicos/context-retrieval-grounding.html'),
  read('locales/en/snippets/articulos-tecnicos/context-retrieval-grounding.html'),
  read('locales/en/snippets/articulos-tecnicos/context-retrieval-grounding.i18n.json'),
  read('mkdocs.yml'), read('mkdocs.en.yml'), read('locales/en/manifest.yml'),
  read('.github/workflows/pr-visual-review.yml'),
]);
const i18n = JSON.parse(i18nRaw);
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const route = 'series/context-engineering-memory-mcp/04-retrieval-context-assembly-freshness-relevance-conflict-grounding.md';
const visualPath = 'snippets/articulos-tecnicos/context-retrieval-grounding.html';
check(mkdocsEs.includes('Context engineering, memoria y MCP:') && mkdocsEs.includes(route) && mkdocsEs.includes('Retrieval y ensamblado de contexto'), 'ES: chapter 3.4 navigation missing');
check(mkdocsEn.includes('Context Engineering, Memory & MCP:') && mkdocsEn.includes(route) && mkdocsEn.includes('Retrieval and context assembly'), 'EN: chapter 3.4 navigation missing');
check(manifestEn.includes(`  - ${route}`), 'EN: chapter 3.4 missing from published_routes manifest');
check(manifestEn.includes(`  - ${visualPath}`), 'EN: chapter 3.4 visual missing from required_snippets manifest');
check(prVisual.includes('node scripts/validate_context_engineering_ch4_source.mjs'), 'CI: chapter 3.4 source gate missing from PR visual review');
check(prVisual.includes('node scripts/validate_context_engineering_ch4_accessibility.mjs'), 'CI: chapter 3.4 browser/accessibility gate missing from PR visual review');

const primaryUrls = [
  'https://www.anthropic.com/engineering/contextual-retrieval',
  'https://developers.openai.com/api/reference/python/resources/vector_stores/methods/search',
  'https://openai.com/index/inside-our-in-house-data-agent/',
  'https://www.postgresql.org/docs/17/textsearch-controls.html',
  'https://github.com/pgvector/pgvector',
  'https://www.elastic.co/docs/reference/elasticsearch/rest-apis/reciprocal-rank-fusion',
  'https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/grounding/grounding-with-vertex-ai-search',
  'https://aclanthology.org/2025.findings-naacl.55/',
];
for (const url of primaryUrls) {
  check(es.includes(url), `ES: missing primary source ${url}`);
  check(en.includes(url), `EN: missing primary source ${url}`);
}

const conceptPairs = [
  ['Retrieval no es context assembly', 'Retrieval is not context assembly'],
  ['Léxico, semántico y estructurado resuelven problemas diferentes', 'Lexical, semantic, and structured retrieval solve different problems'],
  ['Fusionar rankings no fusiona significado', 'Fusing rankings does not fuse meaning'],
  ['Relevance es una señal; no es truth', 'Relevance is a signal, not truth'],
  ['Freshness tiene al menos dos relojes', 'Freshness has at least two clocks'],
  ['El índice necesita una política de invalidación', 'The index needs an invalidation policy'],
  ['Authority no es lo mismo que relevance', 'Authority is not relevance'],
  ['Los conflictos deben ser objetos explícitos', 'Conflicts should be explicit objects'],
  ['El modelo no debería resolver silenciosamente la autoridad', 'The model should not silently own authority resolution'],
  ['Qué ofrecen APIs actuales y qué no', 'What current APIs provide — and what they do not'],
  ['Grounding empieza después del retrieval', 'Grounding starts after retrieval'],
  ['Construye el contexto como un evidence packet', 'Build context as an evidence packet'],
  ['Ordenar contexto también es una decisión', 'Context ordering is also a decision'],
  ['Caso completo: una policy que cambió hoy', 'Worked example: a policy changed today'],
  ['Cómo evaluar retrieval, assembly y grounding por separado', 'Evaluate retrieval, assembly, and grounding separately'],
  ['Qué registrar para poder depurar un turno', 'What to trace for a debuggable turn'],
  ['Implicación de producción: retrieve wide, assemble narrow', 'Production implication: retrieve wide, assemble narrow'],
];
for (const [esToken, enToken] of conceptPairs) {
  check(es.toLowerCase().includes(esToken.toLowerCase()), `ES: missing concept ${esToken}`);
  check(en.toLowerCase().includes(enToken.toLowerCase()), `EN: missing concept ${enToken}`);
}

const compact = (text) => text.replace(/\s+/g, ' ');
for (const [locale, text] of [['ES', es], ['EN', en]]) {
  const normalized = compact(text);
  check(/C_t\s*=\s*R_\{\\mathrm\{lex\}\}\(q_t\).*?R_\{\\mathrm\{sem\}\}\(q_t\).*?R_\{\\mathrm\{struct\}\}\(q_t\)/.test(normalized), `${locale}: candidate-retrieval union equation missing`);
  check(/A_t\s*=\s*\\pi\(.*?C_t.*?freshness.*?authority.*?conflicts.*?B_t/s.test(normalized), `${locale}: assembly-policy equation missing`);
  check(/g_j:.*?\\text\{claim\}_j.*?E_j.*?\\subseteq.*?A_t/s.test(normalized), `${locale}: claim-grounding equation missing`);
  for (const token of ['source_version','indexed_at','valid_from / valid_to','authority_class','resolution = unresolved','grounded_by','stale admission rate','authority error rate','ACL/scope violation rate']) {
    check(text.toLowerCase().includes(token.toLowerCase()), `${locale}: missing retrieval/assembly contract ${token}`);
  }
}

check(es.includes('retrieval propone candidatos; context assembly decide qué evidencia entra; grounding conecta claims con la evidencia admitida'), 'ES: retrieval/assembly/grounding boundary missing');
check(en.includes('retrieval proposes candidates; context assembly decides what evidence enters; grounding connects claims to the admitted evidence'), 'EN: retrieval/assembly/grounding boundary missing');
check(es.includes('newest timestamp wins') && es.includes('no es una regla universal'), 'ES: freshness timestamp caveat missing');
check(en.includes('newest timestamp wins') && en.includes('not a universal rule'), 'EN: freshness timestamp caveat missing');
check(es.includes('**capacidad de retrieval gestionado**'), 'ES: OpenAI managed retrieval capability boundary missing');
check(en.includes('**managed retrieval capability**'), 'EN: OpenAI managed retrieval capability boundary missing');
check(es.includes('**capacidad del servicio de grounding**'), 'ES: Google grounding-service capability boundary missing');
check(en.includes('**grounding-service capability**'), 'EN: Google grounding-service capability boundary missing');
check(es.includes('no una prueba de que una configuración híbrida concreta sea universalmente superior'), 'ES: hybrid-retrieval generalization caveat missing');
check(en.includes('not proof that one hybrid configuration is universally superior'), 'EN: hybrid-retrieval generalization caveat missing');
check(es.includes('constraints antes de preference ranking'), 'ES: constraint-before-ranking policy missing');
check(en.includes('constraints before preference ranking'), 'EN: constraint-before-ranking policy missing');
check(es.includes('`unresolved` es un estado válido'), 'ES: unresolved conflict state missing');
check(en.includes('`unresolved` is a valid system state'), 'EN: unresolved conflict state missing');
for (const token of ['relevance','freshness','authority','permission','grounding']) {
  check(es.includes(token), `ES: final distinction missing ${token}`);
  check(en.includes(token), `EN: final distinction missing ${token}`);
}
check(!/^\s*-\s+.+;\s*$/m.test(en), 'EN: semicolon-list anti-pattern detected');
check(!/\?\./.test(en), 'EN: malformed question punctuation detected');

const visualInclude = '{{ include_html("snippets/articulos-tecnicos/context-retrieval-grounding.html") }}';
check(es.includes(visualInclude) && en.includes(visualInclude), 'ES/EN: retrieval-grounding visual include missing');
for (const token of [
  'GOLDEN_VISUAL_CONTRACT','learning-objective=','mechanism=','visual-variables=','why-visual=',
  'relationship="retrieval-assembly:','interaction="static:no-cosmetic-controls"',
  'mobile="horizontal-scroll-preserves-retrieval-assembly-conflict-and-grounding-topology"',
  '.rg-stage{width:100%;min-width:0;max-width:1180px;margin:0 auto}',
  '.rg-stage{width:auto;min-width:1100px}',
  'Retrieval ≠ ensamblado ≠ grounding','POLÍTICA DE ENSAMBLADO · APLICACIÓN','CONFLICT SET','EVIDENCE CONTEXT Aₜ'
]) check(snippet.includes(token), `Visual: missing contract ${token}`);
check(!snippet.includes('s5v-arch-map__pipe'), 'Visual regression: linear card-pipe pattern returned');
check(!snippet.includes('data-s5v-stepper') && !snippet.includes('s5v__steps--tabs') && !snippet.includes('data-s5v-tabs'), 'Visual regression: cosmetic tabs/stepper returned');

for (const node of [
  'query','lexical','semantic','structured','candidate-pool','scope-gate','freshness-gate','authority-gate','conflict-gate',
  'system-of-record','bounded-context','model','claims','abstain','rejected-stale'
]) check(snippet.includes(`data-node="${node}"`), `Visual: missing mechanism node ${node}`);
for (const boundary of ['retrieval-plane','assembly-plane','authority-plane','generation-plane']) {
  check(snippet.includes(`data-boundary="${boundary}"`), `Visual: missing semantic boundary ${boundary}`);
}
for (const edge of [
  'query-to-lexical','query-to-semantic','query-to-structured','lexical-to-pool','semantic-to-pool','structured-to-pool',
  'pool-to-scope','scope-to-freshness','freshness-to-authority','authority-to-conflict','authority-freshness',
  'conflict-to-context','context-to-model','model-to-claims','unresolved-to-abstain','claim-to-evidence','reject-path'
]) check(snippet.includes(`data-edge="${edge}"`), `Visual: missing relationship edge ${edge}`);
check(snippet.includes('rev A indexada → STALE'), 'Visual: source-version invalidation consequence missing');
check(snippet.includes('grounded_by evidence_id'), 'Visual: claim-level evidence grounding missing');
check(snippet.includes('ranking propone; no autoriza'), 'Visual: relevance-vs-authority distinction missing');

check(mirror.trim() === '<!-- 5sigmas-canonical-mirror -->', 'EN: visual canonical mirror marker invalid');
check(i18n.source === visualPath, 'EN: visual i18n source path invalid');
const bytes = Buffer.from(snippet, 'utf8');
const blobSha = crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`, 'utf8'), bytes])).digest('hex');
check(i18n.source_blob_sha === blobSha, `EN: visual source_blob_sha stale (${i18n.source_blob_sha} != ${blobSha})`);
for (const token of [
  'Retrieval ≠ assembly ≠ grounding','CANDIDATE GENERATION','QUERY / TASK','LEXICAL','SEMANTIC','STRUCTURED','CANDIDATES',
  'ASSEMBLY POLICY · APPLICATION','1 · SCOPE + ACL','2 · FRESHNESS + VERSION','3 · AUTHORITY','AUTHORITATIVE SOURCE / READ-THROUGH',
  'ADMITTED CONTEXT + GENERATION','MODEL','ABSTAIN / ESCALATE','REJECTED','claim → evidence link',
  'A relevant result is still only a candidate.'
]) check(Object.values(i18n.replacements).some((value) => String(value).includes(token)), `EN visual translation missing ${token}`);

if (failures.length) {
  console.error(`Context engineering chapter 3.4 source gate failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Context engineering chapter 3.4 source gate PASS');
console.log(`ES bytes=${Buffer.byteLength(es)} EN bytes=${Buffer.byteLength(en)} visual_blob=${blobSha}`);
