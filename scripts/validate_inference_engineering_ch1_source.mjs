#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const [es, en, snippet, mirror, i18nRaw, mkdocsEs, mkdocsEn, manifestEn, prVisual] = await Promise.all([
  fs.readFile(path.resolve('docs/series/llm-inference-engineering-economics/01-prefill-vs-decode-ttft-tpot-throughput-latency-budget.md'), 'utf8'),
  fs.readFile(path.resolve('locales/en/series/llm-inference-engineering-economics/01-prefill-vs-decode-ttft-tpot-throughput-latency-budget.md'), 'utf8'),
  fs.readFile(path.resolve('docs/snippets/articulos-tecnicos/inference-prefill-decode-latency-budget.html'), 'utf8'),
  fs.readFile(path.resolve('locales/en/snippets/articulos-tecnicos/inference-prefill-decode-latency-budget.html'), 'utf8'),
  fs.readFile(path.resolve('locales/en/snippets/articulos-tecnicos/inference-prefill-decode-latency-budget.i18n.json'), 'utf8'),
  fs.readFile(path.resolve('mkdocs.yml'), 'utf8'),
  fs.readFile(path.resolve('mkdocs.en.yml'), 'utf8'),
  fs.readFile(path.resolve('locales/en/manifest.yml'), 'utf8'),
  fs.readFile(path.resolve('.github/workflows/pr-visual-review.yml'), 'utf8'),
]);
const i18n = JSON.parse(i18nRaw);
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const route = 'series/llm-inference-engineering-economics/01-prefill-vs-decode-ttft-tpot-throughput-latency-budget.md';
const visualPath = 'snippets/articulos-tecnicos/inference-prefill-decode-latency-budget.html';
check(mkdocsEs.includes('Ingeniería y economía de inferencia de LLMs:') && mkdocsEs.includes(`Prefill vs decode: ${route}`), 'ES: Series 4 / chapter 4.1 navigation missing');
check(mkdocsEn.includes('LLM Inference Engineering & Economics:') && mkdocsEn.includes(`Prefill vs decode: ${route}`), 'EN: Series 4 / chapter 4.1 navigation missing');
check(manifestEn.includes(`  - ${route}`), 'EN: chapter 4.1 missing from published_routes manifest');
check(manifestEn.includes(`  - ${visualPath}`), 'EN: chapter 4.1 visual missing from required_snippets manifest');
check(prVisual.includes('node scripts/validate_inference_engineering_ch1_source.mjs'), 'CI: chapter 4.1 source gate missing from PR visual review');
check(prVisual.includes('node scripts/validate_inference_engineering_ch1_accessibility.mjs'), 'CI: chapter 4.1 browser/accessibility gate missing from PR visual review');

const primaryUrls = [
  'https://docs.nvidia.com/aiperf/reference/ai-perf-metrics-reference',
  'https://docs.nvidia.com/aiperf/getting-started/migrating-from-gen-ai-perf',
  'https://docs.nvidia.com/nim/benchmarking/llm/latest/metrics.html',
  'https://docs.vllm.ai/en/latest/benchmarking/cli/',
  'https://arxiv.org/abs/2401.09670',
  'https://arxiv.org/abs/2403.02310',
  'https://arxiv.org/abs/2309.06180',
];
for (const url of primaryUrls) {
  check(es.includes(url), `ES: missing primary source ${url}`);
  check(en.includes(url), `EN: missing primary source ${url}`);
}

const esAnchors = [
  'La petición cambia de forma después del prefill',
  'TTFT mide una frontera visible para el cliente, no una sola operación',
  'En modelos con razonamiento, distingue TTFT de TTFO',
  'TPOT e ITL necesitan una definición antes de compararse',
  'La latencia total combina espera inicial y generación',
  'Longitud de entrada y longitud de salida presionan partes diferentes',
  '«Prefill es compute-bound y decode memory-bound» es una heurística, no una ley',
  'Throughput no es latencia y optimizar uno puede empeorar la otra',
  'Goodput responde una pregunta más útil bajo SLOs',
  'Tres workloads, tres presupuestos distintos',
  'El scheduler conecta TTFT, TPOT y throughput',
  'Un presupuesto de latencia útil debe conservar fronteras',
  'Cómo benchmarkear sin engañarnos',
  'Qué medir primero cuando algo va lento',
  'Implicación de producción: la latencia es un contrato por fases',
];
const enAnchors = [
  'The request changes shape after prefill',
  'TTFT is a client-visible boundary, not one operation',
  'For reasoning models, distinguish TTFT from TTFO',
  'Define TPOT and ITL before comparing them',
  'Total latency combines initial waiting and generation',
  'Input length and output length stress different parts of the path',
  '“Prefill is compute-bound and decode is memory-bound” is a heuristic, not a law',
  'Throughput is not latency, and optimizing one can hurt the other',
  'Goodput asks a better question when SLOs matter',
  'Three workloads, three different latency budgets',
  'The scheduler connects TTFT, TPOT, and throughput',
  'A useful latency budget preserves measurement boundaries',
  'Benchmark without erasing the experiment',
  'What to measure first when inference feels slow',
  'Production implication: latency is a phase-level contract',
];
for (const anchor of esAnchors) check(es.includes(anchor), `ES: missing concept ${anchor}`);
for (const anchor of enAnchors) check(en.includes(anchor), `EN: missing concept ${anchor}`);

for (const text of [es, en]) {
  for (const token of ['L_in', 'L_out', 'T_{TTFT}', 'T_{e2e}', 'TPOT', 'TTFT', 'TTFO', 'ITL', 'goodput', 'throughput', 'KV cache', 'scheduler']) {
    check(text.includes(token), `Missing required inference token ${token}`);
  }
  check(text.includes('0.450 + (120-1)\\cdot0.025'), 'Illustrative latency arithmetic missing');
  check(text.includes('3.425\\text{ s}'), 'Illustrative latency result must equal 3.425 s');
  check(text.includes('https://arxiv.org/abs/2309.06180'), 'PagedAttention must be attributed to the original paper');
}

check(es.includes('TTFT no es sinónimo de tiempo de kernel de prefill'), 'ES: TTFT/prefill measurement-boundary caveat missing');
check(en.includes('TTFT is therefore not synonymous with prefill kernel time'), 'EN: TTFT/prefill measurement-boundary caveat missing');
check(es.includes('TTFT llega hasta el primer token de cualquier tipo, incluidos tokens de razonamiento') && es.includes('TTFO, time to first output token, llega hasta el primer token no razonador de salida'), 'ES: current AIPerf TTFT/TTFO reasoning boundary missing');
check(en.includes('TTFT ends at the first token of any type, including a reasoning token') && en.includes('TTFO, time to first output token, ends at the first non-reasoning output token'), 'EN: current AIPerf TTFT/TTFO reasoning boundary missing');
check(es.includes('heurística, no una ley'), 'ES: compute-bound/memory-bound caveat missing');
check(en.includes('heuristic, not a law'), 'EN: compute-bound/memory-bound caveat missing');
check(es.includes('no publica un ranking de runtimes'), 'ES: uncontrolled benchmark ranking rejection missing');
check(en.includes('does not publish a runtime ranking'), 'EN: uncontrolled benchmark ranking rejection missing');
check(es.includes('mismo hardware') && es.includes('suficientes repeticiones'), 'ES: controlled comparison requirements incomplete');
check(en.includes('same hardware') && en.includes('enough repetitions'), 'EN: controlled comparison requirements incomplete');
check(!/^\s*-\s+.+;\s*$/m.test(en), 'EN: semicolon-list anti-pattern detected');

const visualInclude = '{{ include_html("snippets/articulos-tecnicos/inference-prefill-decode-latency-budget.html") }}';
check(es.includes(visualInclude), 'ES: 4.1 visual include missing');
check(en.includes(visualInclude), 'EN: 4.1 visual include missing');
check(snippet.includes('GOLDEN_VISUAL_CONTRACT'), 'Visual: relationship-first contract marker missing');
check(snippet.includes('relationship="timeline-and-feedback:'), 'Visual: timeline + scheduler-pressure relationship missing');
check(snippet.includes('interaction="static:no-cosmetic-controls"'), 'Visual: cosmetic interaction must be rejected');
check(snippet.includes('mobile="horizontal-scroll-preserves-time-axis-phase-boundaries-and-scheduler-pressure"'), 'Visual: mobile topology preservation contract missing');
check(snippet.includes('.s5v-inference-phases__stage{width:100%;min-width:0;max-width:1240px;margin:0 auto}'), 'Visual: desktop stage contract missing');
check(snippet.includes('.s5v-inference-phases__stage{width:auto;min-width:1120px}'), 'Visual: mobile horizontal topology contract missing');
check(!snippet.includes('data-s5v-stepper') && !snippet.includes('s5v__steps--tabs'), 'Visual regression: cosmetic tabs/stepper detected');
for (const boundary of ['client-observation', 'server-runtime', 'scheduler-pressure']) {
  check(snippet.includes(`data-boundary="${boundary}"`), `Visual: missing semantic boundary ${boundary}`);
}
for (const node of ['request-sent', 'first-output', 'final-output', 'ingress', 'queue', 'prefill', 'first-token-server', 'decode-1', 'decode-2', 'kv-cache', 'concurrency', 'scheduler', 'throughput', 'latency-slos']) {
  check(snippet.includes(`data-node="${node}"`), `Visual: missing mechanism node ${node}`);
}
for (const edge of ['ingress-to-queue', 'queue-to-prefill', 'prefill-to-first', 'first-to-decode', 'decode-loop', 'prefill-to-kv', 'kv-to-decode', 'decode-extends-kv', 'server-first-to-client-first', 'concurrency-to-scheduler', 'scheduler-to-throughput', 'scheduler-to-latency', 'scheduler-to-queue', 'scheduler-to-prefill-decode']) {
  check(snippet.includes(`data-edge="${edge}"`), `Visual: missing causal edge ${edge}`);
}
for (const metric of ['ttft', 'generation', 'e2e', 'tpot']) {
  check(snippet.includes(`data-metric="${metric}"`), `Visual: missing metric bracket ${metric}`);
}
check(snippet.includes('TTFT no es «tiempo de prefill» y TPOT no es «throughput»'), 'Visual: central measurement distinction missing');
check(snippet.includes('batching puede subir capacidad y mover latencia'), 'Visual: throughput-latency coupling missing');
check(snippet.includes('prefill construye KV₁:Lin') && snippet.includes('decode añade KV₊₁'), 'Visual: KV state transition missing');

check(mirror.trim() === '<!-- 5sigmas-canonical-mirror -->', 'EN: visual canonical mirror marker invalid');
check(i18n.source === visualPath, 'EN: visual i18n source path invalid');
const snippetBytes = Buffer.from(snippet, 'utf8');
const blobHeader = Buffer.from(`blob ${snippetBytes.length}\0`, 'utf8');
const snippetBlobSha = crypto.createHash('sha1').update(Buffer.concat([blobHeader, snippetBytes])).digest('hex');
check(i18n.source_blob_sha === snippetBlobSha, `EN: visual source_blob_sha stale (${i18n.source_blob_sha} != ${snippetBlobSha})`);
for (const token of ['TTFT is not', 'CLIENT · END-TO-END MEASUREMENT POINT', 'INFERENCE SERVER · INTERNAL SPANS', 'Queue', 'processes L_in tokens', 'REUSABLE STATE · KV CACHE', 'Concurrency / arrival rate', 'Throughput / goodput', 'batching can raise capacity and move latency', 'causal flow for one request']) {
  check(Object.values(i18n.replacements).some((value) => String(value).includes(token)), `EN visual translation missing ${token}`);
}

if (failures.length) {
  console.error(`Inference engineering chapter 4.1 source gate failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Inference engineering chapter 4.1 source gate PASS');
console.log(`ES bytes=${Buffer.byteLength(es)} EN bytes=${Buffer.byteLength(en)} visual_blob=${snippetBlobSha}`);
