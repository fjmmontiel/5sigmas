#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const [es, en, snippet, mirror, i18nRaw, mkdocsEs, mkdocsEn, manifestEn, prVisual] = await Promise.all([
  fs.readFile(path.resolve('docs/series/context-engineering-memory-mcp/01-context-engineering-vs-prompt-engineering.md'), 'utf8'),
  fs.readFile(path.resolve('locales/en/series/context-engineering-memory-mcp/01-context-engineering-vs-prompt-engineering.md'), 'utf8'),
  fs.readFile(path.resolve('docs/snippets/articulos-tecnicos/context-engineering-assembly-loop.html'), 'utf8'),
  fs.readFile(path.resolve('locales/en/snippets/articulos-tecnicos/context-engineering-assembly-loop.html'), 'utf8'),
  fs.readFile(path.resolve('locales/en/snippets/articulos-tecnicos/context-engineering-assembly-loop.i18n.json'), 'utf8'),
  fs.readFile(path.resolve('mkdocs.yml'), 'utf8'),
  fs.readFile(path.resolve('mkdocs.en.yml'), 'utf8'),
  fs.readFile(path.resolve('locales/en/manifest.yml'), 'utf8'),
  fs.readFile(path.resolve('.github/workflows/pr-visual-review.yml'), 'utf8'),
]);
const i18n = JSON.parse(i18nRaw);
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const route = 'series/context-engineering-memory-mcp/01-context-engineering-vs-prompt-engineering.md';
const visualPath = 'snippets/articulos-tecnicos/context-engineering-assembly-loop.html';
check(mkdocsEs.includes('Context engineering, memoria y MCP:') && mkdocsEs.includes(`Context engineering vs prompt engineering: ${route}`), 'ES: Series 3 / chapter 3.1 navigation missing');
check(mkdocsEn.includes('Context Engineering, Memory & MCP:') && mkdocsEn.includes(`Context engineering vs prompt engineering: ${route}`), 'EN: Series 3 / chapter 3.1 navigation missing');
check(manifestEn.includes(`  - ${route}`), 'EN: chapter 3.1 missing from published_routes manifest');
check(manifestEn.includes(`  - ${visualPath}`), 'EN: context assembly visual missing from required_snippets manifest');
check(prVisual.includes('node scripts/validate_context_engineering_ch1_source.mjs'), 'CI: chapter 3.1 source gate missing from PR visual review');
check(prVisual.includes('node scripts/validate_context_engineering_ch1_accessibility.mjs'), 'CI: chapter 3.1 browser/accessibility gate missing from PR visual review');

const primaryUrls = [
  'https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents',
  'https://openai.com/index/equip-responses-api-computer-environment/',
  'https://openai.com/index/inside-our-in-house-data-agent/',
  'https://openai.com/index/introducing-the-agents-api/',
  'https://arxiv.org/abs/2307.03172',
  'https://ai.google.dev/gemini-api/docs/generate-content/tokens',
  'https://ai.google.dev/gemini-api/docs/caching',
];
for (const url of primaryUrls) {
  check(es.includes(url), `ES: missing primary source ${url}`);
  check(en.includes(url), `EN: missing primary source ${url}`);
}

const esAnchors = [
  'qué significa aquí «contexto»',
  'Prompt engineering es una parte del problema',
  'El contexto es un snapshot, no el estado completo de la aplicación',
  'Qué decide realmente un context assembler',
  'Elegibilidad: qué podría entrar',
  'Selección: qué es relevante ahora',
  'Autoridad y frescura: qué fuente gana si hay conflicto',
  'Compresión y representación: cuánto detalle conservar',
  'Orden y ensamblado: cómo cruza la frontera de inferencia',
  'Cuándo entra cada tipo de contexto',
  'Preload vs just-in-time: una decisión arquitectónica, no una religión',
  'Un ejemplo: el mismo prompt, dos contextos diferentes',
  'Qué NO es context engineering',
  'Cómo evaluar un sistema de context engineering',
  'Implicación de producción: el contexto es una interfaz versionada',
];
const enAnchors = [
  'what does “context” mean here?',
  'Prompt engineering is one part of the problem',
  'Context is a snapshot, not the full application state',
  'What a context assembler actually decides',
  'Eligibility: what could enter',
  'Selection: what matters now',
  'Authority and freshness: what wins when sources conflict',
  'Compression and representation: how much detail to preserve',
  'Ordering and assembly: how information crosses the inference boundary',
  'When each kind of context enters',
  'Preload vs just-in-time is an architectural trade-off',
  'One prompt, two different contexts',
  'What context engineering is not',
  'How to evaluate a context-engineering system',
  'Production implication: context is a versioned interface',
];
for (const anchor of esAnchors) check(es.toLowerCase().includes(anchor.toLowerCase()), `ES: missing concept ${anchor}`);
for (const anchor of enAnchors) check(en.toLowerCase().includes(anchor.toLowerCase()), `EN: missing concept ${anchor}`);

for (const text of [es, en]) {
  for (const token of ['C_t', 'I', 'U_t', 'H_t', 'T_t', 'R_t', 'O_t', 'M_t', 'P_t', 'B_t', 'p_\\theta']) {
    check(text.includes(token), `Missing context-assembly notation ${token}`);
  }
  for (const token of ['retrieval', 'memory', 'compaction', 'tool', 'provenance', 'freshness', 'stale', 'preload', 'just-in-time']) {
    check(text.toLowerCase().includes(token.toLowerCase()), `Missing required context-engineering token ${token}`);
  }
}

check(es.includes('prompt engineering\n    ⊂\ncontext engineering'), 'ES: prompt subset relation missing');
check(en.includes('prompt engineering\n    ⊂\ncontext engineering'), 'EN: prompt subset relation missing');
check(es.includes('model capability\n≠\nprovider/API context management\n≠\napplication/harness context policy'), 'ES: model/provider/application boundary missing');
check(en.includes('model capability\n≠\nprovider/API context management\n≠\napplication/harness context policy'), 'EN: model/provider/application boundary missing');
check(es.includes('Modelos posteriores han mejorado mucho en long context'), 'ES: Lost-in-the-Middle temporal caveat missing');
check(en.includes('Long-context models have improved considerably since 2023'), 'EN: Lost-in-the-Middle temporal caveat missing');
check(es.includes('capacidades concretas de ese harness, no propiedades intrínsecas del modelo'), 'ES: provider/harness attribution caveat missing');
check(en.includes('capabilities of that specific harness') && en.includes('not intrinsic properties of the model'), 'EN: provider/harness attribution caveat missing');
check(!/^\s*-\s+.+;\s*$/m.test(en), 'EN: semicolon-list anti-pattern detected');

const visualInclude = '{{ include_html("snippets/articulos-tecnicos/context-engineering-assembly-loop.html") }}';
check(es.includes(visualInclude), 'ES: context assembly visual include missing');
check(en.includes(visualInclude), 'EN: context assembly visual include missing');
check(snippet.includes('GOLDEN_VISUAL_CONTRACT'), 'Visual: relationship-first contract marker missing');
check(snippet.includes('relationship="superset-and-feedback:'), 'Visual: set-inclusion + feedback relationship missing');
check(snippet.includes('interaction="static:no-cosmetic-controls"'), 'Visual: cosmetic interaction must be explicitly rejected');
check(snippet.includes('mobile="horizontal-scroll-preserves-source-convergence-and-feedback-topology"'), 'Visual: mobile topology preservation contract missing');
check(snippet.includes('.s5v-context-assembly__stage{width:100%;min-width:0;max-width:1180px;margin:0 auto}'), 'Visual: desktop stage must fit the available width without horizontal clipping');
check(snippet.includes('.s5v-context-assembly__stage{width:auto;min-width:1000px}'), 'Visual: mobile stage must preserve topology through intentional horizontal scrolling');
check(!snippet.includes('s5v-arch-map__pipe'), 'Visual regression: linear card-pipe pattern returned');
check(!snippet.includes('data-s5v-stepper') && !snippet.includes('s5v__steps--tabs'), 'Visual regression: cosmetic tabs/stepper returned');
for (const source of ['instructions', 'examples', 'history', 'tools', 'retrieval', 'observations', 'memory']) {
  check(snippet.includes(`data-source="${source}"`), `Visual: missing candidate source ${source}`);
  check(snippet.includes(`data-edge="${source}-to-assembler"`), `Visual: source ${source} lacks explicit convergence edge`);
}
for (const boundary of ['candidate-universe', 'prompt-engineering', 'context-engineering', 'environment-effects']) {
  check(snippet.includes(`data-boundary="${boundary}"`), `Visual: missing semantic boundary ${boundary}`);
}
for (const node of ['assembler', 'inference-context', 'model', 'action', 'environment']) {
  check(snippet.includes(`data-node="${node}"`), `Visual: missing mechanism node ${node}`);
}
for (const edge of ['assembler-to-context', 'context-to-model', 'model-to-action', 'action-to-environment', 'feedback']) {
  check(snippet.includes(`data-edge="${edge}"`), `Visual: missing mechanism edge ${edge}`);
}
check(snippet.includes('PROMPT ENGINEERING') && snippet.includes('CONTEXT ENGINEERING · CADA INFERENCIA'), 'Visual: prompt/context responsibility boundaries missing');
check(snippet.includes('candidatos ≠ contexto'), 'Visual: candidate-vs-effective-context distinction missing');
check(snippet.includes('Siete fuentes candidatas') && snippet.includes('instrucciones y ejemplos forman la parte de prompt engineering'), 'Visual: accessible description does not match seven source lanes / prompt subset');
check(snippet.includes('Cₜ₊₁') && snippet.includes('no reescribe retroactivamente Cₜ'), 'Visual: temporal feedback semantics missing');

check(mirror.trim() === '<!-- 5sigmas-canonical-mirror -->', 'EN: visual canonical mirror marker invalid');
check(i18n.source === visualPath, 'EN: visual i18n source path invalid');
const snippetBytes = Buffer.from(snippet, 'utf8');
const blobHeader = Buffer.from(`blob ${snippetBytes.length}\0`, 'utf8');
const snippetBlobSha = crypto.createHash('sha1').update(Buffer.concat([blobHeader, snippetBytes])).digest('hex');
check(i18n.source_blob_sha === snippetBlobSha, `EN: visual source_blob_sha stale (${i18n.source_blob_sha} != ${snippetBlobSha})`);
for (const token of ['The model does not see', 'Seven candidate sources', 'UNIVERSE OF CANDIDATE INFORMATION', 'Message history', 'Tools and contracts', 'Runtime observations', 'Memory / persistent state', 'Select', 'ACTUAL CONTEXT Cₜ', 'cannot see what was excluded', 'Real effect', 'Cₜ₊₁']) {
  check(Object.values(i18n.replacements).some((value) => String(value).includes(token)), `EN visual translation missing ${token}`);
}

if (failures.length) {
  console.error(`Context engineering chapter 3.1 source gate failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Context engineering chapter 3.1 source gate PASS');
console.log(`ES bytes=${Buffer.byteLength(es)} EN bytes=${Buffer.byteLength(en)} visual_blob=${snippetBlobSha}`);
