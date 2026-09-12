#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const [es, en, snippet, mirror, i18nRaw, mkdocsEs, mkdocsEn, manifestEn, seriesWorkflow] = await Promise.all([
  fs.readFile(path.resolve('docs/series/llm-inference-engineering-economics/06-benchmarking-inference-cost-task-throughput-latency-energy-hardware-constraints.md'), 'utf8'),
  fs.readFile(path.resolve('locales/en/series/llm-inference-engineering-economics/06-benchmarking-inference-cost-task-throughput-latency-energy-hardware-constraints.md'), 'utf8'),
  fs.readFile(path.resolve('docs/snippets/articulos-tecnicos/inference-benchmark-measurement-boundary.html'), 'utf8'),
  fs.readFile(path.resolve('locales/en/snippets/articulos-tecnicos/inference-benchmark-measurement-boundary.html'), 'utf8'),
  fs.readFile(path.resolve('locales/en/snippets/articulos-tecnicos/inference-benchmark-measurement-boundary.i18n.json'), 'utf8'),
  fs.readFile(path.resolve('mkdocs.yml'), 'utf8'),
  fs.readFile(path.resolve('mkdocs.en.yml'), 'utf8'),
  fs.readFile(path.resolve('locales/en/manifest.yml'), 'utf8'),
  fs.readFile(path.resolve('.github/workflows/series4-golden-review.yml'), 'utf8'),
]);

const i18n = JSON.parse(i18nRaw);
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const route = 'series/llm-inference-engineering-economics/06-benchmarking-inference-cost-task-throughput-latency-energy-hardware-constraints.md';
const visualPath = 'snippets/articulos-tecnicos/inference-benchmark-measurement-boundary.html';
check(mkdocsEs.includes(`"Benchmarking de inferencia: cost/task, throughput, latencia, energía y hardware": ${route}`), 'ES: Series 4 / chapter 4.6 navigation missing');
check(mkdocsEn.includes(`"Benchmarking inference: cost/task, throughput, latency, energy, and hardware constraints": ${route}`), 'EN: Series 4 / chapter 4.6 navigation missing');
check(manifestEn.includes(`  - ${route}`), 'EN: chapter 4.6 missing from published_routes manifest');
check(manifestEn.includes(`  - ${visualPath}`), 'EN: chapter 4.6 visual missing from required_snippets manifest');
check(seriesWorkflow.includes('node scripts/validate_inference_engineering_ch6_source.mjs'), 'CI: chapter 4.6 source gate missing from permanent Series 4 review');
check(seriesWorkflow.includes('node scripts/validate_inference_engineering_ch6_accessibility.mjs'), 'CI: chapter 4.6 browser/accessibility gate missing from permanent Series 4 review');

const primaryUrls = [
  'https://docs.nvidia.com/aiperf/reference/ai-perf-metrics-reference',
  'https://docs.nvidia.com/aiperf/tutorials/metrics-analysis/benchmark-goodput-with-ai-perf',
  'https://docs.nvidia.com/aiperf/benchmark-modes/load-generator-options-reference',
  'https://docs.nvidia.com/aiperf/tutorials/load-patterns-scheduling/warmup-phase-configuration',
  'https://docs.vllm.ai/en/stable/cli/bench/serve/',
  'https://docs.mlcommons.org/inference/index_gh/',
  'https://github.com/mlcommons/inference_policies/blob/master/inference_rules.adoc',
  'https://github.com/mlcommons/inference_policies/blob/master/power_measurement.adoc',
  'https://github.com/mlcommons/policies/blob/master/MLPerf_Results_Messaging_Guidelines.adoc',
];
for (const url of primaryUrls) {
  check(es.includes(url), `ES: missing primary source ${url}`);
  check(en.includes(url), `EN: missing primary source ${url}`);
}

const esAnchors = [
  'Un benchmark es un protocolo, no un escalar',
  'El workload debe parecerse al problema que quieres resolver',
  'Request rate y concurrencia no describen la misma carga',
  'TTFT mide una frontera de usuario, no un kernel de prefill',
  'TPOT, ITL y chunk latency tampoco son sinónimos universales',
  'Throughput responde «cuánto terminamos»; goodput añade «dentro del SLO»',
  'El benchmark necesita una dimensión de calidad',
  'Cost/request, cost/token y cost/successful-task responden preguntas distintas',
  'Potencia y energía no son la misma magnitud',
  'Energy/request, energy/token y energy/task también deben separarse',
  'La frontera energética debe dibujarse físicamente',
  'Hardware constraint no significa sólo «qué GPU»',
  'Warmup y cache state son parte del experimento',
  'Repeticiones: una sola corrida no describe varianza',
  'El gráfico más útil es la curva de saturación',
  'Herramientas distintas pueden usar el mismo nombre para métricas distintas',
  'MLPerf enseña por qué el escenario forma parte del resultado',
  'Un protocolo mínimo para 5sigmas',
];
const enAnchors = [
  'A benchmark is a protocol, not a scalar',
  'The workload should resemble the problem you are trying to solve',
  'Request rate and concurrency describe different load models',
  'TTFT is a user-facing boundary, not a prefill-kernel timer',
  'TPOT, ITL, and chunk latency are not universal synonyms',
  'Throughput asks “how much finished”; goodput adds “within the SLO”',
  'A benchmark also needs a quality dimension',
  'Cost/request, cost/token, and cost/successful-task answer different questions',
  'Power and energy are different physical quantities',
  'Energy/request, energy/token, and energy/task need separate denominators',
  'Draw the energy boundary physically',
  'Hardware constraints are more than the GPU model',
  'Warmup and cache state are part of the experiment',
  'Repetition matters because one run does not describe variance',
  'The most informative system view is often a saturation curve',
  'Identical metric names do not guarantee identical measurements',
  'MLPerf shows why scenario is part of the result',
  'A minimum 5sigmas benchmark record',
];
for (const anchor of esAnchors) check(es.includes(anchor), `ES: missing concept ${anchor}`);
for (const anchor of enAnchors) check(en.includes(anchor), `EN: missing concept ${anchor}`);

for (const text of [es, en]) {
  for (const token of ['B=(W,A,M,R,S,H,N,E,Q)', 'TTFT_{client}', 'T_{prefill\\ kernel}', 'TPOT=', 'goodput', 'C_{successful\\ task}', 'E_{run}', 'E_{successful\\ task}', 'N_{success}', 'MLPerf Inference v6.1']) {
    check(text.includes(token), `Missing required chapter 4.6 token ${token}`);
  }
  check(text.includes('AIPerf') && text.includes('vLLM') && text.includes('MLPerf'), 'Benchmark harness provenance missing');
  check(text.includes('Poisson') || text.includes('poisson'), 'Arrival-process variance boundary missing');
  check(text.includes('warmup') || text.includes('Warmup'), 'Warmup-state boundary missing');
  check(text.includes('p50') && text.includes('p95') && text.includes('p99'), 'Latency distribution reporting missing');
  check(text.includes('complete stacks') || text.includes('stacks completos'), 'Causal attribution boundary missing');
  check(text.includes('TDP'), 'TDP-versus-measured-energy caveat missing');
  check(text.includes('power') || text.includes('potencia'), 'Power measurement boundary missing');
}

check(es.includes('TTFT se calcula desde el inicio de la request hasta el primer chunk/token recibido por el cliente'), 'ES: client TTFT endpoint missing');
check(en.includes('AIPerf measures TTFT from request start until the client receives the first non-empty response chunk'), 'EN: client TTFT endpoint missing');
check(es.includes('Reportar sólo `0.024 €/request` ocultaría'), 'ES: cost/success denominator example missing');
check(en.includes('Reporting only `€0.024/request` would hide'), 'EN: cost/success denominator example missing');
check(es.includes('24/920\\approx0.02609'), 'ES: illustrative cost/task arithmetic drift');
check(en.includes('24/920\\approx0.02609'), 'EN: illustrative cost/task arithmetic drift');
check(es.includes('1800/920\\approx1.957'), 'ES: illustrative energy/task arithmetic drift');
check(en.includes('1800/920\\approx1.957'), 'EN: illustrative energy/task arithmetic drift');
check(es.includes('prohíben usar TDP, potencia nominal de PSU u otros proxies'), 'ES: measured-system-power caveat missing');
check(en.includes('reject TDP, PSU rating, or other proxy values'), 'EN: measured-system-power caveat missing');
check(es.includes('misma ventana de performance'), 'ES: same-run power/performance window missing');
check(en.includes('same performance window'), 'EN: same-run power/performance window missing');
check(!/TTFT\s*=\s*prefill/i.test(es + en), 'Invalid TTFT=prefill equivalence detected');
check(!/(power|potencia)\s*=\s*(energy|energ[ií]a)/i.test(es + en), 'Invalid power=energy equivalence detected');
check(!/^\s*-\s+.+;\s*$/m.test(en), 'EN: semicolon-list anti-pattern detected');

const visualInclude = '{{ include_html("snippets/articulos-tecnicos/inference-benchmark-measurement-boundary.html") }}';
check(es.includes(visualInclude), 'ES: 4.6 visual include missing');
check(en.includes(visualInclude), 'EN: 4.6 visual include missing');
check(snippet.includes('GOLDEN_VISUAL_CONTRACT'), 'Visual: relationship-first contract marker missing');
check(snippet.includes('interaction="static:no-cosmetic-controls"'), 'Visual: cosmetic interaction must be rejected');
check(snippet.includes('mobile="horizontal-scroll-preserves-request-measurement-energy-saturation-topology"'), 'Visual: mobile topology-preservation contract missing');
check(snippet.includes('.s5v-benchmark-boundary__stage{width:100%;min-width:0;max-width:1240px;margin:0 auto}'), 'Visual: desktop stage contract missing');
check(snippet.includes('.s5v-benchmark-boundary__stage{width:auto;min-width:1180px}'), 'Visual: mobile horizontal topology contract missing');
check(!snippet.includes('data-s5v-stepper') && !snippet.includes('s5v__steps--tabs'), 'Visual regression: cosmetic tabs/stepper detected');
for (const boundary of ['sut', 'client-clock', 'accounting']) check(snippet.includes(`data-boundary="${boundary}"`), `Visual: missing semantic boundary ${boundary}`);
for (const node of ['workload', 'arrival-process', 'queue', 'service', 'hardware', 'response', 'throughput', 'quality-filter', 'goodput', 'request-send', 'first-output', 'token-gap', 'final-output', 'power-meter', 'energy-integral', 'cost-ledger', 'successful-tasks', 'normalized-outcomes', 'saturation-sweep', 'operating-region', 'report']) {
  check(snippet.includes(`data-node="${node}"`), `Visual: missing mechanism node ${node}`);
}
check(snippet.includes('TTFT = network + queue + prompt + first output'), 'Visual: TTFT measurement-boundary decomposition missing');
check(snippet.includes('throughput plateau') && snippet.includes('queue / tail ↑'), 'Visual: saturation relationship missing');
check(snippet.includes('power boundary must match declared SUT'), 'Visual: power/SUT boundary relationship missing');

check(mirror.trim() === '<!-- 5sigmas-canonical-mirror -->', 'EN: visual canonical mirror marker invalid');
check(i18n.source === visualPath, 'EN: visual i18n source path invalid');
const snippetBytes = Buffer.from(snippet, 'utf8');
const blobHeader = Buffer.from(`blob ${snippetBytes.length}\0`, 'utf8');
const snippetBlobSha = crypto.createHash('sha1').update(Buffer.concat([blobHeader, snippetBytes])).digest('hex');
check(i18n.source_blob_sha === snippetBlobSha, `EN: visual source_blob_sha stale (${i18n.source_blob_sha} != ${snippetBlobSha})`);
for (const token of ['A number comes from a boundary', 'THE WORKLOAD CREATES THE REGIME', 'DECLARED PHYSICAL BOUNDARY', 'SAME WINDOW · DIFFERENT DENOMINATORS', 'LOAD CHANGES THE REGIME', 'measurement boundary or window']) {
  check(snippet.includes(token) || Object.values(i18n.replacements).some((value) => String(value).includes(token)), `EN visual translation missing ${token}`);
}

if (failures.length) {
  console.error(`Inference engineering chapter 4.6 source gate failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Inference engineering chapter 4.6 source gate PASS');
console.log(`ES bytes=${Buffer.byteLength(es)} EN bytes=${Buffer.byteLength(en)} visual_blob=${snippetBlobSha}`);
