#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const [es, en, snippet, mirror, i18nRaw, mkdocsEs, mkdocsEn, manifestEn, prVisual] = await Promise.all([
  fs.readFile(path.resolve('docs/series/llm-inference-engineering-economics/04-speculative-decoding-prefix-caching-latency-optimisations.md'), 'utf8'),
  fs.readFile(path.resolve('locales/en/series/llm-inference-engineering-economics/04-speculative-decoding-prefix-caching-latency-optimisations.md'), 'utf8'),
  fs.readFile(path.resolve('docs/snippets/articulos-tecnicos/inference-speculative-prefix-latency.html'), 'utf8'),
  fs.readFile(path.resolve('locales/en/snippets/articulos-tecnicos/inference-speculative-prefix-latency.html'), 'utf8'),
  fs.readFile(path.resolve('locales/en/snippets/articulos-tecnicos/inference-speculative-prefix-latency.i18n.json'), 'utf8'),
  fs.readFile(path.resolve('mkdocs.yml'), 'utf8'),
  fs.readFile(path.resolve('mkdocs.en.yml'), 'utf8'),
  fs.readFile(path.resolve('locales/en/manifest.yml'), 'utf8'),
  fs.readFile(path.resolve('.github/workflows/series4-golden-review.yml'), 'utf8'),
]);

const i18n = JSON.parse(i18nRaw);
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const route = 'series/llm-inference-engineering-economics/04-speculative-decoding-prefix-caching-latency-optimisations.md';
const visualPath = 'snippets/articulos-tecnicos/inference-speculative-prefix-latency.html';
check(mkdocsEs.includes(`Speculative decoding, prefix caching y otras optimizaciones de latencia: ${route}`), 'ES: Series 4 / chapter 4.4 navigation missing');
check(mkdocsEn.includes(`Speculative decoding, prefix caching, and other latency optimizations: ${route}`), 'EN: Series 4 / chapter 4.4 navigation missing');
check(manifestEn.includes(`  - ${route}`), 'EN: chapter 4.4 missing from published_routes manifest');
check(manifestEn.includes(`  - ${visualPath}`), 'EN: chapter 4.4 visual missing from required_snippets manifest');
check(prVisual.includes('node scripts/validate_inference_engineering_ch4_source.mjs'), 'CI: chapter 4.4 source gate missing from permanent Series 4 review');
check(prVisual.includes('node scripts/validate_inference_engineering_ch4_accessibility.mjs'), 'CI: chapter 4.4 browser/accessibility gate missing from permanent Series 4 review');

const primaryUrls = [
  'https://docs.vllm.ai/en/latest/features/automatic_prefix_caching/',
  'https://docs.vllm.ai/en/latest/design/prefix_caching/',
  'https://docs.vllm.ai/en/latest/usage/security/',
  'https://nvidia.github.io/TensorRT-LLM/features/kvcache.html',
  'https://nvidia.github.io/TensorRT-LLM/1.2.0rc8/features/speculative-decoding.html',
  'https://docs.vllm.ai/en/latest/features/speculative_decoding/draft_model/',
  'https://docs.vllm.ai/en/latest/features/speculative_decoding/n_gram/',
  'https://docs.vllm.ai/en/latest/features/speculative_decoding/mtp/',
  'https://docs.vllm.ai/en/latest/features/speculative_decoding/acceptance_metrics/',
  'https://arxiv.org/abs/2211.17192',
  'https://arxiv.org/abs/2302.01318',
];
for (const url of primaryUrls) {
  check(es.includes(url), `ES: missing primary source ${url}`);
  check(en.includes(url), `EN: missing primary source ${url}`);
}

const esAnchors = [
  'El presupuesto de latencia vuelve a ser el punto de partida',
  'Prefix caching reutiliza estado de un prefijo ya calculado',
  'Un hit sólo existe para la parte realmente reutilizable',
  'La identidad del cache forma parte de la corrección',
  'En multi-tenant, el hit de cache también es una señal observable',
  'Capacidad, eviction y hit rate están acoplados',
  'Speculative decoding ataca la dependencia secuencial del decode',
  '«Verificar varios» no significa «varios tokens gratis»',
  'Acceptance rate es necesaria, pero no suficiente',
  'El draft model es sólo una familia de proposer',
  'El KV cache también participa en la especulación',
  'La carga del sistema puede invertir el resultado',
  'Prefix caching y speculative decoding pueden coexistir, pero no son aditivos',
  'Otras optimizaciones: clasifícalas por el trabajo que cambian',
  'Contrato de benchmark reproducible',
  'Evals deterministas antes de rendimiento',
];
const enAnchors = [
  'Start from the latency budget again',
  'Prefix caching reuses state from a previously computed prefix',
  'A hit only covers the state that is actually reusable',
  'Cache identity is part of correctness',
  'In multi-tenant serving, a cache hit is also an observable signal',
  'Capacity, eviction, and hit rate are coupled',
  "Speculative decoding attacks decode's sequential dependency",
  '“Verify several” does not mean “several free tokens”',
  'Acceptance rate is necessary, but not sufficient',
  'A draft model is only one proposer family',
  'KV cache participates in speculation too',
  'System load can reverse the result',
  'Prefix caching and speculative decoding can coexist, but gains are not additive',
  'Other optimizations: classify them by the work they change',
  'Reproducible benchmark contract',
  'Deterministic evals before performance numbers',
];
for (const anchor of esAnchors) check(es.includes(anchor), `ES: missing concept ${anchor}`);
for (const anchor of enAnchors) check(en.includes(anchor), `EN: missing concept ${anchor}`);

for (const text of [es, en]) {
  for (const token of ['H_{tokens}', 'L_{uncached}', 'T_{spec}(k)', '\\mathbb{E}[C(k)]', 'TTFT', 'TPOT', 'ITL', 'goodput', 'cache_salt', 'KV cache rewind', 'MTP']) {
    check(text.includes(token), `Missing required chapter 4.4 token ${token}`);
  }
  check(text.includes('7,680 / 8,192 = 93.75%'), 'Illustrative prefix-reuse arithmetic missing');
  check(text.includes('target model +') || text.includes('target model and exact revision') || text.includes('target model + revision'), 'Target-model benchmark identity missing');
}

check(es.includes('no podemos convertir `93.75%` en «93.75% menos TTFT»'), 'ES: cache-hit-versus-TTFT caveat missing');
check(en.includes('cannot turn `93.75%` into “93.75% lower TTFT”'), 'EN: cache-hit-versus-TTFT caveat missing');
check(es.includes('no autoriza a afirmar que cualquier método llamado “speculative decoding” es distribution-preserving'), 'ES: exact-speculation attribution boundary missing');
check(en.includes('does not imply that every method carrying the label “speculative decoding” is distribution-preserving'), 'EN: exact-speculation attribution boundary missing');
check(es.includes('no podemos sumar porcentajes de mejora'), 'ES: non-additive optimization caveat missing');
check(en.includes('percentages cannot simply be added'), 'EN: non-additive optimization caveat missing');
check(es.includes('comparison entre stacks') && es.includes('no evidencia causal'), 'ES: benchmark attribution boundary missing');
check(en.includes('compares two complete stacks') && en.includes('does not isolate the causal effect'), 'EN: benchmark attribution boundary missing');
check(!/^\s*-\s+.+;\s*$/m.test(en), 'EN: semicolon-list anti-pattern detected');

const visualInclude = '{{ include_html("snippets/articulos-tecnicos/inference-speculative-prefix-latency.html") }}';
check(es.includes(visualInclude), 'ES: 4.4 visual include missing');
check(en.includes(visualInclude), 'EN: 4.4 visual include missing');
check(snippet.includes('GOLDEN_VISUAL_CONTRACT'), 'Visual: relationship-first contract marker missing');
check(snippet.includes('interaction="static:no-cosmetic-controls"'), 'Visual: cosmetic interaction must be rejected');
check(snippet.includes('mobile="horizontal-scroll-preserves-hit-miss-and-accept-reject-topology"'), 'Visual: mobile topology-preservation contract missing');
check(snippet.includes('.s5v-reuse-spec__stage{width:100%;min-width:0;max-width:1240px;margin:0 auto}'), 'Visual: desktop stage contract missing');
check(snippet.includes('.s5v-reuse-spec__stage{width:auto;min-width:1180px}'), 'Visual: mobile horizontal topology contract missing');
check(!snippet.includes('data-s5v-stepper') && !snippet.includes('s5v__steps--tabs'), 'Visual regression: cosmetic tabs/stepper detected');
for (const boundary of ['reuse', 'speculation']) check(snippet.includes(`data-boundary="${boundary}"`), `Visual: missing semantic boundary ${boundary}`);
for (const node of ['prefix', 'identity', 'lookup', 'hit', 'miss', 'remaining-prefill', 'retention', 'target-state', 'proposer', 'verify', 'accept', 'reject', 'commit', 'pressure']) {
  check(snippet.includes(`data-node="${node}"`), `Visual: missing mechanism node ${node}`);
}
check(snippet.includes('Un hit reduce trabajo de prefill; no implica menor TPOT.'), 'Visual: cache/TPOT boundary missing');
check(snippet.includes('Hit rate ≠ reducción proporcional de TTFT.'), 'Visual: cache-hit/TTFT boundary missing');
check(snippet.includes('sólo secuencia aceptada'), 'Visual: speculative commit boundary missing');
check(snippet.includes('KV capacity + scheduler + batching = frontera compartida'), 'Visual: shared resource-pressure boundary missing');

check(mirror.trim() === '<!-- 5sigmas-canonical-mirror -->', 'EN: visual canonical mirror marker invalid');
check(i18n.source === visualPath, 'EN: visual i18n source path invalid');
const snippetBytes = Buffer.from(snippet, 'utf8');
const blobHeader = Buffer.from(`blob ${snippetBytes.length}\0`, 'utf8');
const snippetBlobSha = crypto.createHash('sha1').update(Buffer.concat([blobHeader, snippetBytes])).digest('hex');
check(i18n.source_blob_sha === snippetBlobSha, `EN: visual source_blob_sha stale (${i18n.source_blob_sha} != ${snippetBlobSha})`);
for (const token of ['Reuse ≠ speculation', 'Request prefix', 'Cache identity', 'reuses verified KV', 'Remaining prefill', 'Target state', 'Target verifies', 'Accept prefix', 'Reject / correct', 'Commit KV/state', 'shared boundary']) {
  check(Object.values(i18n.replacements).some((value) => String(value).includes(token)), `EN visual translation missing ${token}`);
}

if (failures.length) {
  console.error(`Inference engineering chapter 4.4 source gate failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Inference engineering chapter 4.4 source gate PASS');
console.log(`ES bytes=${Buffer.byteLength(es)} EN bytes=${Buffer.byteLength(en)} visual_blob=${snippetBlobSha}`);
