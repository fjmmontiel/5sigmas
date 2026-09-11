#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const [es, en, snippet, mirror, i18nRaw, mkdocsEs, mkdocsEn, manifestEn, prVisual] = await Promise.all([
  fs.readFile(path.resolve('docs/series/context-engineering-memory-mcp/02-context-budgets-prioritisation-compaction-provenance.md'), 'utf8'),
  fs.readFile(path.resolve('locales/en/series/context-engineering-memory-mcp/02-context-budgets-prioritisation-compaction-provenance.md'), 'utf8'),
  fs.readFile(path.resolve('docs/snippets/articulos-tecnicos/context-budget-lineage.html'), 'utf8'),
  fs.readFile(path.resolve('locales/en/snippets/articulos-tecnicos/context-budget-lineage.html'), 'utf8'),
  fs.readFile(path.resolve('locales/en/snippets/articulos-tecnicos/context-budget-lineage.i18n.json'), 'utf8'),
  fs.readFile(path.resolve('mkdocs.yml'), 'utf8'),
  fs.readFile(path.resolve('mkdocs.en.yml'), 'utf8'),
  fs.readFile(path.resolve('locales/en/manifest.yml'), 'utf8'),
  fs.readFile(path.resolve('.github/workflows/pr-visual-review.yml'), 'utf8'),
]);
const i18n = JSON.parse(i18nRaw);
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const route = 'series/context-engineering-memory-mcp/02-context-budgets-prioritisation-compaction-provenance.md';
const visualPath = 'snippets/articulos-tecnicos/context-budget-lineage.html';
check(mkdocsEs.includes('Context engineering, memoria y MCP:') && mkdocsEs.includes(`Context budgets, priorización, compaction y provenance: ${route}`), 'ES: chapter 3.2 navigation missing');
check(mkdocsEn.includes('Context Engineering, Memory & MCP:') && mkdocsEn.includes(`Context budgets, prioritization, compaction, and provenance: ${route}`), 'EN: chapter 3.2 navigation missing');
check(manifestEn.includes(`  - ${route}`), 'EN: chapter 3.2 missing from published_routes manifest');
check(manifestEn.includes(`  - ${visualPath}`), 'EN: chapter 3.2 visual missing from required_snippets manifest');
check(prVisual.includes('node scripts/validate_context_engineering_ch2_source.mjs'), 'CI: chapter 3.2 source gate missing from PR visual review');
check(prVisual.includes('node scripts/validate_context_engineering_ch2_accessibility.mjs'), 'CI: chapter 3.2 browser/accessibility gate missing from PR visual review');

const primaryUrls = [
  'https://platform.claude.com/docs/en/build-with-claude/context-windows',
  'https://platform.claude.com/docs/en/build-with-claude/compaction',
  'https://platform.claude.com/docs/en/build-with-claude/context-editing',
  'https://openai.com/index/unrolling-the-codex-agent-loop/',
  'https://developers.openai.com/api/reference/java/resources/responses/methods/compact',
  'https://openai.com/index/introducing-the-agents-api/',
  'https://ai.google.dev/gemini-api/docs/tokens',
  'https://ai.google.dev/gemini-api/docs/caching',
  'https://www.w3.org/TR/prov-o/',
];
for (const url of primaryUrls) {
  check(es.includes(url), `ES: missing primary source ${url}`);
  check(en.includes(url), `EN: missing primary source ${url}`);
}

const esAnchors = [
  'El máximo de contexto no es tu presupuesto operativo',
  'Un item de contexto necesita más que texto',
  'Priorizar no es ordenar por similarity score',
  'Qué hacer cuando una pieza útil no cabe',
  'Compaction es una transformación, no memoria perfecta',
  'Cache no es compaction',
  'Provenance: poder volver desde una representación a su origen',
  'Freshness no es una timestamp',
  'Caso completo: un agente de código bajo presión de tokens',
  'Tool search y context loading son priorización, no magia',
  'Cómo evaluar una política de contexto',
  'Implicación de producción: persiste el assembly manifest',
];
const enAnchors = [
  'The maximum context window is not your operational budget',
  'A context item needs more than text',
  'Prioritization is not sorting by similarity score',
  'What to do when useful information does not fit',
  'Compaction is a transformation, not perfect memory',
  'Cache is not compaction',
  'Provenance: being able to walk from a representation back to its source',
  'Freshness is not a timestamp',
  'Worked example: a coding agent under token pressure',
  'Tool search and context loading are prioritization mechanisms, not magic',
  'How to evaluate a context policy',
  'Production implication: persist an assembly manifest',
];
for (const anchor of esAnchors) check(es.toLowerCase().includes(anchor.toLowerCase()), `ES: missing concept ${anchor}`);
for (const anchor of enAnchors) check(en.toLowerCase().includes(anchor.toLowerCase()), `EN: missing concept ${anchor}`);

for (const text of [es, en]) {
  for (const token of ['B_{\\text{input}}', 'B_{\\text{dynamic}}', 'z_i', 'u_i', 'x_i', 'provenance', 'rehydrat', 'STALE', 'derived_from', 'lossy']) {
    check(text.toLowerCase().includes(token.toLowerCase()), `Missing budget/provenance contract ${token}`);
  }
  for (const token of ['Verbatim', 'Selection', 'Structured extraction', 'Compaction', 'Reference + rehydration', 'Drop']) {
    const localized = text === es ? ({
      'Verbatim':'Verbatim', 'Selection':'Selección', 'Structured extraction':'Extracción estructurada',
      'Compaction':'Compaction', 'Reference + rehydration':'Referencia + rehidratación', 'Drop':'Drop'
    })[token] : token;
    check(text.toLowerCase().includes(localized.toLowerCase()), `Missing context-reduction operation ${localized}`);
  }
}

check(es.includes('`B_dynamic` no es una propiedad del modelo'), 'ES: operational budget must not be attributed to the model');
check(en.includes('`B_dynamic` is not a model property'), 'EN: operational budget must not be attributed to the model');
check(es.includes('Es una **decisión de producto y runtime**'), 'ES: application/runtime budget ownership missing');
check(en.includes('It is an **application and runtime policy**'), 'EN: application/runtime budget ownership missing');
check(es.includes('Caching puede hacer más barato reutilizar un prefijo') && es.includes('No elimina lógicamente ese contenido'), 'ES: cache-vs-compaction boundary missing');
check(en.includes('Caching can make a repeated prefix cheaper') && en.includes('does not logically remove that content'), 'EN: cache-vs-compaction boundary missing');
check(es.includes('ejemplo de esquema de aplicación') && es.includes('no un estándar de proveedor'), 'ES: provenance schema caveat missing');
check(en.includes('illustrative application schema') && en.includes('not a provider standard'), 'EN: provenance schema caveat missing');
check(es.includes('model capability\n≠\nprovider/API context-management capability\n≠\napplication/harness context policy'), 'ES: model/provider/application boundary missing');
check(en.includes('model capability\n≠\nprovider/API context-management capability\n≠\napplication/harness context policy'), 'EN: model/provider/application boundary missing');
check(es.includes('universo candidato **puramente ilustrativo**') && es.includes('las cifras no describen un proveedor ni un benchmark'), 'ES: numeric scenario must be explicitly illustrative');
check(en.includes('**purely illustrative** candidate universe') && en.includes('numbers are not a provider claim or benchmark'), 'EN: numeric scenario must be explicitly illustrative');
check(!es.includes('150.000 tokens disponibles') && !en.includes('150,000 tokens of available capacity'), 'Opening must not imply an uncited concrete provider/model capacity');
check(!/\?\./.test(en), 'EN: malformed question punctuation detected');
check(!/^\s*-\s+.+;\s*$/m.test(en), 'EN: semicolon-list anti-pattern detected');

const visualInclude = '{{ include_html("snippets/articulos-tecnicos/context-budget-lineage.html") }}';
check(es.includes(visualInclude), 'ES: context-budget visual include missing');
check(en.includes(visualInclude), 'EN: context-budget visual include missing');
check(snippet.includes('GOLDEN_VISUAL_CONTRACT'), 'Visual: relationship-first contract marker missing');
check(snippet.includes('relationship="budget-convergence-and-lineage:'), 'Visual: budget + lineage relationship missing');
check(snippet.includes('interaction="static:no-cosmetic-controls"'), 'Visual: cosmetic interaction must be explicitly rejected');
check(snippet.includes('mobile="horizontal-scroll-preserves-budget-branching-lineage-and-invalidation-topology"'), 'Visual: mobile topology preservation contract missing');
check(snippet.includes('.cb-stage{width:100%;min-width:0;max-width:1180px;margin:0 auto}'), 'Visual: desktop stage must fit available width');
check(snippet.includes('.cb-stage{width:auto;min-width:1080px}'), 'Visual: mobile stage must preserve topology through horizontal scrolling');
check(snippet.includes('Ejemplo · budget ≠ capacidad máxima'), 'Visual: illustrative-scenario kicker missing');
check(snippet.includes('no son límites de un proveedor ni resultados de benchmark'), 'Visual: numeric-example caveat missing');
check(!snippet.includes('s5v-arch-map__pipe'), 'Visual regression: linear card-pipe pattern returned');
check(!snippet.includes('data-s5v-stepper') && !snippet.includes('s5v__steps--tabs'), 'Visual regression: cosmetic tabs/stepper returned');

for (const source of ['policy','repo','logs','history','stale']) {
  check(snippet.includes(`data-source="${source}"`), `Visual: missing candidate source ${source}`);
  check(snippet.includes(`data-edge="${source}-to-gate"`), `Visual: source ${source} lacks prioritization edge`);
}
for (const node of ['policy-gate','verbatim','compact','reference','drop','model','repo-new-version']) {
  check(snippet.includes(`data-node="${node}"`), `Visual: missing mechanism node ${node}`);
}
for (const boundary of ['candidate-universe','budget-envelope','provenance-plane']) {
  check(snippet.includes(`data-boundary="${boundary}"`), `Visual: missing semantic boundary ${boundary}`);
}
for (const edge of [
  'gate-to-verbatim','gate-to-compact','gate-to-reference','gate-to-drop',
  'verbatim-to-context','compact-to-context','reference-to-context','context-to-model',
  'logs-lineage','history-lineage','repo-lineage','source-version-change','invalidate-derived-context'
]) {
  check(snippet.includes(`data-edge="${edge}"`), `Visual: missing relationship edge ${edge}`);
}
for (const sourceVersion of ['logs-run17','history-v8','repo-a1b2c3']) {
  check(snippet.includes(`data-source-version="${sourceVersion}"`), `Visual: missing source-version lineage node ${sourceVersion}`);
}
check(snippet.includes('HEAD cambia → STALE'), 'Visual: source-version invalidation consequence missing');
check(snippet.includes('derived_from · version · transform · rehydrate'), 'Visual: provenance semantics missing');
check(snippet.includes('CONTEXTO ACTIVO · Bdynamic = 60k'), 'Visual: bounded active context missing');
check(snippet.includes('23k quedan libres / reservados'), 'Visual: budget headroom missing');

check(mirror.trim() === '<!-- 5sigmas-canonical-mirror -->', 'EN: visual canonical mirror marker invalid');
check(i18n.source === visualPath, 'EN: visual i18n source path invalid');
const snippetBytes = Buffer.from(snippet, 'utf8');
const blobHeader = Buffer.from(`blob ${snippetBytes.length}\0`, 'utf8');
const snippetBlobSha = crypto.createHash('sha1').update(Buffer.concat([blobHeader, snippetBytes])).digest('hex');
check(i18n.source_blob_sha === snippetBlobSha, `EN: visual source_blob_sha stale (${i18n.source_blob_sha} != ${snippetBlobSha})`);
for (const token of [
  'Example · budget ≠ maximum capacity', 'Illustrative scenario:', 'not provider limits or benchmark results',
  'CANDIDATES · OUTSIDE THE MODEL', 'Policy · 4k', 'Constraints', 'COMPACT', 'REFERENCE', 'DROP / DEFER',
  'ACTIVE CONTEXT · Bdynamic = 60k', 'Model', 'PROVENANCE / LINEAGE', 'HEAD changes → STALE',
  'flow into active context', 'lineage back to source', 'Token reduction is never free'
]) {
  check(Object.values(i18n.replacements).some((value) => String(value).includes(token)), `EN visual translation missing ${token}`);
}

if (failures.length) {
  console.error(`Context engineering chapter 3.2 source gate failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Context engineering chapter 3.2 source gate PASS');
console.log(`ES bytes=${Buffer.byteLength(es)} EN bytes=${Buffer.byteLength(en)} visual_blob=${snippetBlobSha}`);
