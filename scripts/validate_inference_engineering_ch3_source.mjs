#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const [es, en, snippet, mirror, i18nRaw, mkdocsEs, mkdocsEn, manifestEn, prVisual] = await Promise.all([
  fs.readFile(path.resolve('docs/series/llm-inference-engineering-economics/03-quantization-parallelism-memory-quality-tradeoffs.md'), 'utf8'),
  fs.readFile(path.resolve('locales/en/series/llm-inference-engineering-economics/03-quantization-parallelism-memory-quality-tradeoffs.md'), 'utf8'),
  fs.readFile(path.resolve('docs/snippets/articulos-tecnicos/inference-quantization-parallelism-tradeoffs.html'), 'utf8'),
  fs.readFile(path.resolve('locales/en/snippets/articulos-tecnicos/inference-quantization-parallelism-tradeoffs.html'), 'utf8'),
  fs.readFile(path.resolve('locales/en/snippets/articulos-tecnicos/inference-quantization-parallelism-tradeoffs.i18n.json'), 'utf8'),
  fs.readFile(path.resolve('mkdocs.yml'), 'utf8'),
  fs.readFile(path.resolve('mkdocs.en.yml'), 'utf8'),
  fs.readFile(path.resolve('locales/en/manifest.yml'), 'utf8'),
  fs.readFile(path.resolve('.github/workflows/series4-golden-review.yml'), 'utf8'),
]);

const i18n = JSON.parse(i18nRaw);
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const route = 'series/llm-inference-engineering-economics/03-quantization-parallelism-memory-quality-tradeoffs.md';
const visualPath = 'snippets/articulos-tecnicos/inference-quantization-parallelism-tradeoffs.html';
check(mkdocsEs.includes(`Cuantización, paralelismo y trade-offs de memoria/calidad: ${route}`) || mkdocsEs.includes(`Cuantización, paralelismo y compromisos de memoria, rendimiento y calidad: ${route}`), 'ES: Series 4 / chapter 4.3 navigation missing');
check(mkdocsEn.includes(`Quantization, parallelism and memory/quality trade-offs: ${route}`) || mkdocsEn.includes(`Quantization, parallelism, and memory/performance/quality trade-offs: ${route}`), 'EN: Series 4 / chapter 4.3 navigation missing');
check(manifestEn.includes(`  - ${route}`), 'EN: chapter 4.3 missing from published_routes manifest');
check(manifestEn.includes(`  - ${visualPath}`), 'EN: chapter 4.3 visual missing from required_snippets manifest');
check(prVisual.includes('node scripts/validate_inference_engineering_ch3_source.mjs'), 'CI: chapter 4.3 source gate missing from permanent Series 4 review');
check(prVisual.includes('node scripts/validate_inference_engineering_ch3_accessibility.mjs'), 'CI: chapter 4.3 browser/accessibility gate missing from permanent Series 4 review');

const primaryUrls = [
  'https://nvidia.github.io/TensorRT-LLM/features/quantization.html',
  'https://docs.vllm.ai/en/latest/features/quantization/',
  'https://docs.vllm.ai/en/latest/features/quantization/quantized_kvcache/',
  'https://arxiv.org/abs/2210.17323',
  'https://arxiv.org/abs/2306.00978',
  'https://arxiv.org/abs/2211.10438',
  'https://nvidia.github.io/TensorRT-LLM/features/parallel-strategy.html',
  'https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/usage/collectives.html',
  'https://docs.nvidia.com/megatron-core/developer-guide/latest/user-guide/features/context_parallel.html',
];
for (const url of primaryUrls) {
  check(es.includes(url), `ES: missing primary source ${url}`);
  check(en.includes(url), `EN: missing primary source ${url}`);
}

const esAnchors = [
  'Cuantización no significa que todo el modelo tenga la misma precisión',
  'La operación básica introduce error de representación',
  'Weight-only y weight+activation atacan cuellos distintos',
  'El KV cache es una tercera decisión de precisión',
  'El ahorro ideal de carga útil es fácil; la huella real no',
  'La calidad no se deduce del nombre del esquema',
  'Paralelizar significa decidir dónde vive cada parte',
  'Data parallel: escala peticiones, no una petición por arte de magia',
  'Tensor parallel: menos tensor por rank, más comunicación dentro de la capa',
  'Pipeline parallel: menos capas por rank, pero la petición atraviesa etapas',
  'Expert parallel: sólo tiene sentido si existen expertos',
  'Context parallel: fragmentar secuencia no fragmenta automáticamente pesos',
  'Las estrategias se componen, pero no con una fórmula universal de memoria',
  'La interconexión forma parte del modelo de rendimiento',
  'Cuantización y paralelismo interactúan',
  'Dominios de fallo: una petición distribuida depende de más componentes',
  'Contrato para benchmarks reproducibles',
  'Evals deterministas antes del benchmark',
];
const enAnchors = [
  'Quantization does not mean that the whole model has one precision',
  'The basic operation introduces representation error',
  'Weight-only and weight-plus-activation quantization target different bottlenecks',
  'KV cache is a third precision decision',
  'Ideal payload savings are easy to compute; real footprint is not',
  'Quality does not follow from the scheme name',
  'Parallelization is a placement decision',
  'Data parallel: scale requests, not one request by magic',
  'Tensor parallel: less tensor per rank, more intra-layer communication',
  'Pipeline parallel: fewer layers per rank, but the request crosses stages',
  'Expert parallel: only meaningful when the model has experts',
  'Context parallel: sharding sequence does not automatically shard weights',
  'Strategies compose, but memory has no universal division formula',
  'The interconnect is part of the performance model',
  'Quantization and parallelism interact',
  'Failure domains: a distributed request depends on more components',
  'Reproducible benchmark contract',
  'Deterministic evals before performance benchmarking',
];
for (const anchor of esAnchors) check(es.includes(anchor), `ES: missing concept ${anchor}`);
for (const anchor of enAnchors) check(en.includes(anchor), `EN: missing concept ${anchor}`);

for (const text of [es, en]) {
  for (const token of ['W4A16', 'W8A8', 'FP8 KV', 'GPTQ', 'AWQ', 'SmoothQuant', 'Data parallel', 'Tensor parallel', 'Pipeline parallel', 'Expert parallel', 'Context parallel', 'AllReduce', 'AllGather', 'ReduceScatter', 'AllToAll']) {
    check(text.includes(token), `Missing required chapter 4.3 token ${token}`);
  }
  check(text.includes('70\\times10^9\\cdot2\\text{ bytes}=140\\text{ GB}=130.4\\text{ GiB}'), 'Illustrative 16-bit payload arithmetic missing');
  check(text.includes('70\\times10^9\\cdot0.5\\text{ bytes}=35\\text{ GB}=32.6\\text{ GiB}'), 'Illustrative 4-bit payload arithmetic missing');
  check(text.includes('35\\text{ GB}/4=8.75\\text{ GB'), 'Illustrative TP4 payload arithmetic missing');
}

check(es.includes('Menor dtype no es una instrucción de hardware') || es.includes('**Menor dtype no es una instrucción de hardware.**'), 'ES: kernel-support caveat missing');
check(en.includes('A smaller dtype is not a hardware instruction'), 'EN: kernel-support caveat missing');
check(es.includes('no una afirmación de que un proceso real consumirá exactamente 35 GB') && es.includes('ni de que será 4× más rápido'), 'ES: payload-vs-speed caveat missing');
check(en.includes('not a claim that a real process will consume exactly 35 GB or run four times faster'), 'EN: payload-vs-speed caveat missing');
check(es.includes('memory_per_GPU = total_memory / (TP × PP × DP × EP × CP)') || es.includes('memoria_por_GPU = memoria_total / (TP × PP × DP × EP × CP)'), 'ES: anti-universal-memory-formula example missing');
check(en.includes('memory_per_GPU = total_memory / (TP × PP × DP × EP × CP)'), 'EN: anti-universal-memory-formula example missing');
check(es.includes('porque es falso en general'), 'ES: universal division formula must be explicitly rejected');
check(en.includes('It is false'), 'EN: universal division formula must be explicitly rejected');
check(es.includes('CP divide contexto; TP divide tensores del modelo'), 'ES: CP/TP boundary missing');
check(en.includes('CP shards context. TP shards model tensors'), 'EN: CP/TP boundary missing');
check(es.includes('no son el mismo experimento'), 'ES: topology benchmark boundary missing');
check(en.includes('not the same experiment'), 'EN: topology benchmark boundary missing');
check(es.includes('dos stacks completos') && es.includes('no una estimación causal'), 'ES: benchmark attribution boundary missing');
check(en.includes('two complete stacks') && en.includes('does not isolate the causal effect'), 'EN: benchmark attribution boundary missing');
check(!/^\s*-\s+.+;\s*$/m.test(en), 'EN: semicolon-list anti-pattern detected');

const visualInclude = '{{ include_html("snippets/articulos-tecnicos/inference-quantization-parallelism-tradeoffs.html") }}';
check(es.includes(visualInclude), 'ES: 4.3 visual include missing');
check(en.includes(visualInclude), 'EN: 4.3 visual include missing');
check(snippet.includes('GOLDEN_VISUAL_CONTRACT'), 'Visual: relationship-first contract marker missing');
check(snippet.includes('interaction="static:no-cosmetic-controls"'), 'Visual: cosmetic interaction must be rejected');
check(snippet.includes('mobile="horizontal-scroll-preserves-tensor-scope-rank-placement-and-communication-topology"'), 'Visual: mobile topology-preservation contract missing');
check(snippet.includes('.s5v-quant-parallel__stage{width:100%;min-width:0;max-width:1240px;margin:0 auto}'), 'Visual: desktop stage contract missing');
check(snippet.includes('.s5v-quant-parallel__stage{width:auto;min-width:1180px}'), 'Visual: mobile horizontal topology contract missing');
check(!snippet.includes('data-s5v-stepper') && !snippet.includes('s5v__steps--tabs'), 'Visual regression: cosmetic tabs/stepper detected');
for (const boundary of ['quantization', 'parallelism']) check(snippet.includes(`data-boundary="${boundary}"`), `Visual: missing semantic boundary ${boundary}`);
for (const node of ['weights', 'activations', 'kv', 'quantizer', 'kernel', 'memory-performance', 'quality', 'dp', 'tp', 'pp', 'ep', 'cp', 'topology']) {
  check(snippet.includes(`data-node="${node}"`), `Visual: missing mechanism node ${node}`);
}
check(snippet.includes('menos bytes ≠ menos latencia'), 'Visual: quantization latency caveat missing');
check(snippet.includes('TP · tensor fragmentado') && snippet.includes('collective dentro de capas'), 'Visual: TP communication relation missing');
check(snippet.includes('EP · expertos') && snippet.includes('all-to-all'), 'Visual: EP routing/communication relation missing');
check(snippet.includes('CP · contexto') && snippet.includes('la atención necesita estado remoto'), 'Visual: CP remote-attention relation missing');
check(snippet.includes('Interconexión + runtime + carga deciden el resultado'), 'Visual: topology outcome boundary missing');

check(mirror.trim() === '<!-- 5sigmas-canonical-mirror -->', 'EN: visual canonical mirror marker invalid');
check(i18n.source === visualPath, 'EN: visual i18n source path invalid');
const snippetBytes = Buffer.from(snippet, 'utf8');
const blobHeader = Buffer.from(`blob ${snippetBytes.length}\0`, 'utf8');
const snippetBlobSha = crypto.createHash('sha1').update(Buffer.concat([blobHeader, snippetBytes])).digest('hex');
check(i18n.source_blob_sha === snippetBlobSha, `EN: visual source_blob_sha stale (${i18n.source_blob_sha} != ${snippetBlobSha})`);
for (const token of ['Fewer bits change which bytes move', 'QUANTIZATION · BIT WIDTH', 'Weights', 'Supported kernel', 'PARALLELISM · PLACEMENT', 'DP · replicas', 'TP · tensor shard', 'PP · layers', 'EP · experts', 'CP · context', 'Interconnect + runtime + workload determine the outcome']) {
  check(Object.values(i18n.replacements).some((value) => String(value).includes(token)), `EN visual translation missing ${token}`);
}

if (failures.length) {
  console.error(`Inference engineering chapter 4.3 source gate failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Inference engineering chapter 4.3 source gate PASS');
console.log(`ES bytes=${Buffer.byteLength(es)} EN bytes=${Buffer.byteLength(en)} visual_blob=${snippetBlobSha}`);
