#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const [es, en, snippet, mirror, i18nRaw, mkdocsEs, mkdocsEn, manifestEn, prVisual] = await Promise.all([
  fs.readFile(path.resolve('docs/series/llm-inference-engineering-economics/02-kv-cache-memory-hierarchy-continuous-batching-pagedattention.md'), 'utf8'),
  fs.readFile(path.resolve('locales/en/series/llm-inference-engineering-economics/02-kv-cache-memory-hierarchy-continuous-batching-pagedattention.md'), 'utf8'),
  fs.readFile(path.resolve('docs/snippets/articulos-tecnicos/inference-kv-cache-paging-batching.html'), 'utf8'),
  fs.readFile(path.resolve('locales/en/snippets/articulos-tecnicos/inference-kv-cache-paging-batching.html'), 'utf8'),
  fs.readFile(path.resolve('locales/en/snippets/articulos-tecnicos/inference-kv-cache-paging-batching.i18n.json'), 'utf8'),
  fs.readFile(path.resolve('mkdocs.yml'), 'utf8'),
  fs.readFile(path.resolve('mkdocs.en.yml'), 'utf8'),
  fs.readFile(path.resolve('locales/en/manifest.yml'), 'utf8'),
  fs.readFile(path.resolve('.github/workflows/pr-visual-review.yml'), 'utf8'),
]);

const i18n = JSON.parse(i18nRaw);
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const route = 'series/llm-inference-engineering-economics/02-kv-cache-memory-hierarchy-continuous-batching-pagedattention.md';
const visualPath = 'snippets/articulos-tecnicos/inference-kv-cache-paging-batching.html';
check(mkdocsEs.includes(`KV cache, memoria y batching: ${route}`) || mkdocsEs.includes(`KV cache, jerarquía de memoria, continuous batching y PagedAttention: ${route}`), 'ES: Series 4 / chapter 4.2 navigation missing');
check(mkdocsEn.includes(`KV cache, memory hierarchy, continuous batching and PagedAttention: ${route}`) || mkdocsEn.includes(`KV cache, memory and batching: ${route}`), 'EN: Series 4 / chapter 4.2 navigation missing');
check(manifestEn.includes(`  - ${route}`), 'EN: chapter 4.2 missing from published_routes manifest');
check(manifestEn.includes(`  - ${visualPath}`), 'EN: chapter 4.2 visual missing from required_snippets manifest');
check(prVisual.includes('node scripts/validate_inference_engineering_ch2_source.mjs'), 'CI: chapter 4.2 source gate missing from PR visual review');
check(prVisual.includes('node scripts/validate_inference_engineering_ch2_accessibility.mjs'), 'CI: chapter 4.2 browser/accessibility gate missing from PR visual review');

const primaryUrls = [
  'https://huggingface.co/docs/transformers/main/cache_explanation',
  'https://huggingface.co/docs/transformers/main/kv_cache',
  'https://huggingface.co/docs/transformers/main/continuous_batching_architecture',
  'https://arxiv.org/abs/2309.06180',
  'https://www.usenix.org/conference/osdi22/presentation/yu',
  'https://nvidia.github.io/TensorRT-LLM/features/kvcache.html',
  'https://nvidia.github.io/TensorRT-LLM/features/attention.html',
  'https://nvidia.github.io/TensorRT-LLM/latest/legacy/performance/performance-tuning-guide/useful-runtime-flags.html',
  'https://docs.vllm.ai/en/latest/design/hybrid_kv_cache_manager/',
  'https://docs.vllm.ai/en/latest/features/kv_offloading_usage/',
];
for (const url of primaryUrls) {
  check(es.includes(url), `ES: missing primary source ${url}`);
  check(en.includes(url), `EN: missing primary source ${url}`);
}

const esAnchors = [
  'Qué guarda realmente el KV cache',
  'Una fórmula útil para estimar memoria — con límites explícitos',
  'La VRAM disponible para KV no es la VRAM de la GPU',
  'El problema de una reserva contigua máxima',
  'PagedAttention separa el espacio lógico del físico',
  'Paging no hace desaparecer todo desperdicio',
  'PagedAttention y continuous batching resuelven problemas distintos',
  'La relación crítica es: terminar → liberar KV → admitir trabajo',
  'Más utilización puede aumentar preemption',
  'La jerarquía de memoria añade capacidad a cambio de movimiento',
  'Sliding window, GQA y caches híbridos cambian la ecuación',
  'Reutilizar prefijos es otra optimización — no la confundas con paging',
  'Qué debe observar el scheduler',
  'Caso concreto: chat con longitudes heterogéneas',
  'Cómo comparar sistemas sin atribuir el resultado a la capa equivocada',
  'Evals deterministas para esta capa',
  'Implicación de producción: capacidad es estado vivo, no sólo FLOPs',
];
const enAnchors = [
  'What the KV cache actually stores',
  'A useful memory formula — with explicit limits',
  'The VRAM available to KV is not the GPU’s total VRAM',
  'Why maximum contiguous reservation wastes capacity',
  'PagedAttention separates logical space from physical space',
  'Paging does not eliminate every form of waste',
  'PagedAttention and continuous batching solve different problems',
  'The critical relationship is finish → release KV → admit work',
  'Higher utilization can increase preemption',
  'Memory hierarchy adds capacity by adding movement',
  'Sliding windows, GQA, and hybrid caches change the equation',
  'Prefix reuse is another optimization — do not confuse it with paging',
  'What the scheduler should expose',
  'Concrete case: chat with heterogeneous lengths',
  'Benchmark systems without attributing results to the wrong layer',
  'Deterministic evals for this layer',
  'Production implication: capacity is live state, not only FLOPs',
];
for (const anchor of esAnchors) check(es.includes(anchor), `ES: missing concept ${anchor}`);
for (const anchor of enAnchors) check(en.includes(anchor), `EN: missing concept ${anchor}`);

for (const text of [es, en]) {
  for (const token of ['M_{KV}(T)', 'H_{KV}', 'd_h', 'M_{KV,live}', 'PagedAttention', 'continuous batching', 'GQA', 'MQA', 'offload', 'preempt', 'prefix', 'scheduler']) {
    check(text.includes(token), `Missing required chapter 4.2 token ${token}`);
  }
  check(text.includes('131072\\text{ bytes}') && text.includes('128\\text{ KiB/token}'), 'Illustrative KV bytes/token arithmetic missing');
  check(text.includes('8192\\cdot128\\text{ KiB}=1\\text{ GiB}'), 'Illustrative 8192-token KV result must equal 1 GiB');
  check(text.includes('4 GiB'), 'Illustrative H_KV=32 comparison must equal 4 GiB');
  check(text.includes('https://arxiv.org/abs/2309.06180'), 'PagedAttention must cite original paper');
}

check(es.includes('esta fórmula **no es universal**') || es.includes('Esta fórmula **no es universal**'), 'ES: formula universality caveat missing');
check(en.includes('This formula is **not universal**'), 'EN: formula universality caveat missing');
check(es.includes('PagedAttention / paged KV cache') && es.includes('Continuous batching / iteration-level scheduling'), 'ES: paging/scheduling boundary missing');
check(en.includes('PagedAttention / paged KV cache') && en.includes('Continuous batching / iteration-level scheduling'), 'EN: paging/scheduling boundary missing');
check(es.includes('paged ≠ utilización perfecta'), 'ES: paging fragmentation caveat missing');
check(en.includes('paged = perfect utilization'), 'EN: paging fragmentation caveat missing');
check(es.includes('no convierte memoria lenta en VRAM gratuita'), 'ES: offload cost boundary missing');
check(en.includes('does not turn slower memory into free VRAM'), 'EN: offload cost boundary missing');
check(es.includes('no una constante multiplicativa') || es.includes('no una constante multiplicativa que podamos trasladar'), 'ES: historical performance generalization caveat missing');
check(en.includes('not a multiplicative constant'), 'EN: historical performance generalization caveat missing');
check(!/^\s*-\s+.+;\s*$/m.test(en), 'EN: semicolon-list anti-pattern detected');

const visualInclude = '{{ include_html("snippets/articulos-tecnicos/inference-kv-cache-paging-batching.html") }}';
check(es.includes(visualInclude), 'ES: 4.2 visual include missing');
check(en.includes(visualInclude), 'EN: 4.2 visual include missing');
check(snippet.includes('GOLDEN_VISUAL_CONTRACT'), 'Visual: relationship-first contract marker missing');
check(snippet.includes('relationship="request-logical-blocks->block-table->physical-gpu-pages;request-A-finish->release-pages->free-pool->scheduler->admit-C->allocate-pages;gpu-pages<->host-tier"'), 'Visual: relationship declaration missing');
check(snippet.includes('interaction="static:no-cosmetic-controls"'), 'Visual: cosmetic interaction must be rejected');
check(snippet.includes('mobile="horizontal-scroll-preserves-logical-to-physical-mapping-reclamation-and-tier-boundaries"'), 'Visual: mobile topology preservation contract missing');
check(snippet.includes('.s5v-kv-paging__stage{width:100%;min-width:0;max-width:1240px;margin:0 auto}'), 'Visual: desktop stage contract missing');
check(snippet.includes('.s5v-kv-paging__stage{width:auto;min-width:1120px}'), 'Visual: mobile horizontal topology contract missing');
check(!snippet.includes('data-s5v-stepper') && !snippet.includes('s5v__steps--tabs'), 'Visual regression: cosmetic tabs/stepper detected');
for (const boundary of ['logical-requests', 'allocation-manager', 'gpu-physical-pool', 'continuous-scheduler', 'host-memory-tier']) {
  check(snippet.includes(`data-boundary="${boundary}"`), `Visual: missing semantic boundary ${boundary}`);
}
for (const node of ['request-a', 'request-b', 'request-c-waiting', 'block-table', 'released-a', 'gpu-pool', 'free-pool', 'scheduler', 'finish-event', 'capacity-event', 'admitted-c', 'host-tier', 'gpu-hot-tier']) {
  check(snippet.includes(`data-node="${node}"`), `Visual: missing mechanism node ${node}`);
}
for (const edge of ['a-to-table', 'b-to-table', 'table-to-gpu', 'finish-to-release', 'release-to-free', 'free-to-scheduler', 'scheduler-to-c', 'c-to-table', 'gpu-to-host', 'host-to-gpu']) {
  check(snippet.includes(`data-edge="${edge}"`), `Visual: missing causal edge ${edge}`);
}
check(snippet.includes('Paging decide dónde vive el KV; continuous batching decide quién está activo'), 'Visual: allocation/scheduling distinction missing');
check(snippet.includes('A termina → release') && snippet.includes('Admitir C'), 'Visual: finish/reclaim/admission lifecycle missing');
check(snippet.includes('offload amplía capacidad; no elimina el coste de transferir estado'), 'Visual: tiering trade-off missing');

check(mirror.trim() === '<!-- 5sigmas-canonical-mirror -->', 'EN: visual canonical mirror marker invalid');
check(i18n.source === visualPath, 'EN: visual i18n source path invalid');
const snippetBytes = Buffer.from(snippet, 'utf8');
const blobHeader = Buffer.from(`blob ${snippetBytes.length}\0`, 'utf8');
const snippetBlobSha = crypto.createHash('sha1').update(Buffer.concat([blobHeader, snippetBytes])).digest('hex');
check(i18n.source_blob_sha === snippetBlobSha, `EN: visual source_blob_sha stale (${i18n.source_blob_sha} != ${snippetBlobSha})`);
for (const token of ['Paging decides where KV state lives', 'REQUESTS · LOGICAL SPACE', 'Logical → physical mapping', 'PHYSICAL KV BLOCK POOL', 'Recovered capacity', 'CONTINUOUS BATCHING', 'Admit C', 'MEMORY HIERARCHY', 'does not turn slower memory into free VRAM']) {
  check(Object.values(i18n.replacements).some((value) => String(value).includes(token)), `EN visual translation missing ${token}`);
}

if (failures.length) {
  console.error(`Inference engineering chapter 4.2 source gate failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Inference engineering chapter 4.2 source gate PASS');
console.log(`ES bytes=${Buffer.byteLength(es)} EN bytes=${Buffer.byteLength(en)} visual_blob=${snippetBlobSha}`);
