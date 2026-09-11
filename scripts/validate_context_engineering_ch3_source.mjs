#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const read = (p) => fs.readFile(path.resolve(p), 'utf8');
const [es, en, snippet, mirror, i18nRaw, mkdocsEs, mkdocsEn, manifestEn, prVisual] = await Promise.all([
  read('docs/series/context-engineering-memory-mcp/03-memory-architectures-working-episodic-semantic-persistent-state.md'),
  read('locales/en/series/context-engineering-memory-mcp/03-memory-architectures-working-episodic-semantic-persistent-state.md'),
  read('docs/snippets/articulos-tecnicos/context-memory-lifecycle.html'),
  read('locales/en/snippets/articulos-tecnicos/context-memory-lifecycle.html'),
  read('locales/en/snippets/articulos-tecnicos/context-memory-lifecycle.i18n.json'),
  read('mkdocs.yml'), read('mkdocs.en.yml'), read('locales/en/manifest.yml'),
  read('.github/workflows/pr-visual-review.yml'),
]);
const i18n = JSON.parse(i18nRaw);
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const route = 'series/context-engineering-memory-mcp/03-memory-architectures-working-episodic-semantic-persistent-state.md';
const visualPath = 'snippets/articulos-tecnicos/context-memory-lifecycle.html';
check(mkdocsEs.includes('Context engineering, memoria y MCP:') && mkdocsEs.includes(route) && mkdocsEs.includes('Arquitecturas de memoria: working, episodic, semantic y estado persistente'), 'ES: chapter 3.3 navigation missing');
check(mkdocsEn.includes('Context Engineering, Memory & MCP:') && mkdocsEn.includes(route) && mkdocsEn.includes('Memory architectures: working, episodic, semantic, and persistent state'), 'EN: chapter 3.3 navigation missing');
check(manifestEn.includes(`  - ${route}`), 'EN: chapter 3.3 missing from published_routes manifest');
check(manifestEn.includes(`  - ${visualPath}`), 'EN: chapter 3.3 visual missing from required_snippets manifest');
check(prVisual.includes('node scripts/validate_context_engineering_ch3_source.mjs'), 'CI: chapter 3.3 source gate missing from PR visual review');
check(prVisual.includes('node scripts/validate_context_engineering_ch3_accessibility.mjs'), 'CI: chapter 3.3 browser/accessibility gate missing from PR visual review');

const primaryUrls = [
  'https://arxiv.org/abs/2309.02427',
  'https://arxiv.org/abs/2304.03442',
  'https://openai.github.io/openai-agents-python/sessions/',
  'https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool',
  'https://platform.claude.com/docs/en/managed-agents/memory',
];
for (const url of primaryUrls) {
  check(es.includes(url), `ES: missing primary source ${url}`);
  check(en.includes(url), `EN: missing primary source ${url}`);
}

const conceptPairs = [
  ['Working state: lo que la ejecución necesita ahora', 'Working state: what execution needs now'],
  ['Episodic memory: hechos situados en el tiempo', 'Episodic memory: events situated in time'],
  ['Semantic memory: conocimiento consolidado, no una copia del historial', 'Semantic memory: consolidated knowledge, not copied history'],
  ['Estado persistente autoritativo: memoria del agente no debe sustituirlo', 'Authoritative persistent state: agent memory should not replace it'],
  ['La persistencia es un eje, no un cuarto tipo', 'Persistence is an axis, not a fourth bucket'],
  ['Retrieval tampoco es un tipo de memoria', 'Retrieval is not a memory type either'],
  ['Checkpoint ≠ memory', 'Checkpoint ≠ memory'],
  ['Qué ofrecen los frameworks actuales y qué no', 'What current frameworks provide — and what they do not'],
  ['Escribir memoria es una operación con política', 'Writing memory is a policy-controlled operation'],
  ['Conflictos: autoridad primero, después relevancia', 'Conflicts: authority first, then relevance'],
  ['Borrado y corrección necesitan trazabilidad', 'Deletion and correction need lineage'],
  ['Caso completo: agente de soporte', 'Worked example: a support agent'],
  ['Cómo evaluar una arquitectura de memoria', 'How to evaluate a memory architecture'],
  ['Implicación de producción: trata memoria como un pipeline de datos', 'Production implication: treat memory as a data pipeline'],
];
for (const [esToken, enToken] of conceptPairs) {
  check(es.toLowerCase().includes(esToken.toLowerCase()), `ES: missing concept ${esToken}`);
  check(en.toLowerCase().includes(enToken.toLowerCase()), `EN: missing concept ${enToken}`);
}

const normalized = (text) => text.replace(/\s+/g, ' ');
for (const [locale, text] of [['ES', es], ['EN', en]]) {
  const compact = normalized(text);
  check(/W_t\s*=\s*A\(U_t,\s*H_t,\s*E_t,\s*S_t,\s*R_t\)/.test(compact), `${locale}: working-set assembly equation missing`);
  for (const token of ['derived_from', 'fresh authoritative state', 'stale derived memory', 'resume correctness', 'cross-tenant leakage']) {
    check(text.toLowerCase().includes(token.toLowerCase()), `${locale}: missing memory lifecycle contract ${token}`);
  }
}

check(es.includes('persistente no es, por sí solo, un tipo cognitivo de memoria'), 'ES: persistence-axis caveat missing');
check(en.includes('persistent is not, by itself, a cognitive memory type'), 'EN: persistence-axis caveat missing');
check(es.includes('Retrieval responde **cómo accedemos**') && es.includes('Episodic y semantic describen **qué representa**'), 'ES: retrieval-vs-memory semantic boundary missing');
check(en.includes('Retrieval answers **how we access**') && en.includes('Episodic and semantic describe **what the information represents**'), 'EN: retrieval-vs-memory semantic boundary missing');
check(es.includes('checkpoint') && es.includes('**resume correctness**, no **future usefulness**'), 'ES: checkpoint-vs-memory contract missing');
check(en.includes('checkpoint') && en.includes('**resume correctness**, not **future usefulness**'), 'EN: checkpoint-vs-memory contract missing');
check(es.includes('Eso es una **capacidad del harness**'), 'ES: OpenAI Sessions capability boundary missing');
check(en.includes('That is a **harness capability**'), 'EN: OpenAI Sessions capability boundary missing');
check(es.includes('Memory Tool es client-side') && es.includes('la aplicación ejecuta y controla el almacenamiento'), 'ES: Anthropic Memory Tool application ownership missing');
check(en.includes('Memory Tool is client-side') && en.includes('the application executes them and controls storage'), 'EN: Anthropic Memory Tool application ownership missing');
check(es.includes('Managed Agents, en cambio, ofrece memory stores persistentes como una capacidad gestionada de ese producto'), 'ES: managed-service capability boundary missing');
check(en.includes('Managed Agents, by contrast, offers persistent memory stores as a managed product capability'), 'EN: managed-service capability boundary missing');
check(es.includes('fresh authoritative state') && es.includes('stale derived memory'), 'ES: authority ordering missing');
check(en.includes('fresh authoritative state') && en.includes('stale derived memory'), 'EN: authority ordering missing');
check(es.includes('«Último timestamp gana» tampoco es una política universal'), 'ES: timestamp authority caveat missing');
check(en.includes('“Newest timestamp wins” is not a universal policy either'), 'EN: timestamp authority caveat missing');
check(!es.includes('cuarto bucket') && !es.includes('Deletion y corrección') && !es.includes('data pipeline'), 'ES: unnatural mixed-language lifecycle terminology returned');
check(!/^\s*-\s+.+;\s*$/m.test(en), 'EN: semicolon-list anti-pattern detected');
check(!/\?\./.test(en), 'EN: malformed question punctuation detected');

const visualInclude = '{{ include_html("snippets/articulos-tecnicos/context-memory-lifecycle.html") }}';
check(es.includes(visualInclude) && en.includes(visualInclude), 'ES/EN: memory lifecycle visual include missing');
for (const token of [
  'GOLDEN_VISUAL_CONTRACT',
  'learning-objective=',
  'mechanism=',
  'visual-variables=',
  'why-visual=',
  'relationship="memory-lifecycle:',
  'interaction="static:no-cosmetic-controls"',
  'mobile="horizontal-scroll-preserves-memory-lifecycle-authority-and-checkpoint-topology"',
  '.ml-stage{width:100%;min-width:0;max-width:1180px;margin:0 auto}',
  '.ml-stage{width:auto;min-width:1080px}',
  'Ciclo de vida de memoria · semántica ≠ persistencia',
  'MEMORIA EPISÓDICA','MEMORIA SEMÁNTICA','AUTORIDAD DE NEGOCIO · EXTERNA','RUTA DE RECUPERACIÓN · CONTRATO DISTINTO',
]) check(snippet.includes(token), `Visual: missing contract ${token}`);
check(!snippet.includes('s5v-arch-map__pipe'), 'Visual regression: linear card-pipe pattern returned');
check(!snippet.includes('data-s5v-stepper') && !snippet.includes('s5v__steps--tabs') && !snippet.includes('data-s5v-tabs'), 'Visual regression: cosmetic tabs/stepper returned');

for (const node of [
  'working-set','decision-action','episodic-store','consolidation','semantic-store','retrieval',
  'system-of-record','source-revision','checkpoint'
]) check(snippet.includes(`data-node="${node}"`), `Visual: missing mechanism node ${node}`);
for (const boundary of ['active-runtime','memory-plane','authority-plane','checkpoint-lane']) {
  check(snippet.includes(`data-boundary="${boundary}"`), `Visual: missing semantic boundary ${boundary}`);
}
for (const edge of [
  'working-to-action','action-to-episode','episode-to-consolidation','consolidation-to-semantic',
  'semantic-lineage','semantic-to-retrieval','retrieval-to-working','authority-to-working',
  'source-change','invalidate-semantic','execution-to-checkpoint','checkpoint-to-working'
]) check(snippet.includes(`data-edge="${edge}"`), `Visual: missing relationship edge ${edge}`);
check(snippet.includes('contradicción → stale / menor autoridad'), 'Visual: authoritative-state invalidation consequence missing');
check(snippet.includes('reanudar ≠ recordar'), 'Visual: checkpoint/resume boundary missing');
check(snippet.includes('derived_from'), 'Visual: semantic-memory lineage missing');
check(snippet.includes('lectura fresca'), 'Visual: fresh authoritative read missing');

check(mirror.trim() === '<!-- 5sigmas-canonical-mirror -->', 'EN: visual canonical mirror marker invalid');
check(i18n.source === visualPath, 'EN: visual i18n source path invalid');
const bytes = Buffer.from(snippet, 'utf8');
const blobSha = crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`, 'utf8'), bytes])).digest('hex');
check(i18n.source_blob_sha === blobSha, `EN: visual source_blob_sha stale (${i18n.source_blob_sha} != ${blobSha})`);
for (const token of [
  'Memory lifecycle · semantics ≠ persistence',
  'Useful memory needs different paths for recall, consolidation, verification, and resume',
  'ACTIVE RUNTIME · TRANSIENT','PERSISTENT MEMORY PLANE · DERIVED / RECALLABLE',
  'WORKING SET Wₜ','EPISODIC STORE','SEMANTIC MEMORY','Selective retrieval',
  'BUSINESS AUTHORITY · EXTERNAL','SYSTEM OF RECORD','fresh read',
  'contradiction → stale / lower authority','RECOVERY LANE · DIFFERENT CONTRACT','CHECKPOINT','resume ≠ recall',
  'Persistence does not make these stores equivalent.'
]) check(Object.values(i18n.replacements).some((value) => String(value).includes(token)), `EN visual translation missing ${token}`);

if (failures.length) {
  console.error(`Context engineering chapter 3.3 source gate failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Context engineering chapter 3.3 source gate PASS');
console.log(`ES bytes=${Buffer.byteLength(es)} EN bytes=${Buffer.byteLength(en)} visual_blob=${blobSha}`);