#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const [es, en, snippet, mirror, i18nRaw, mkdocsEs, mkdocsEn, manifestEn, seriesWorkflow] = await Promise.all([
  fs.readFile(path.resolve('docs/series/llm-inference-engineering-economics/05-model-routing-fallback-caching-workload-aware-serving.md'), 'utf8'),
  fs.readFile(path.resolve('locales/en/series/llm-inference-engineering-economics/05-model-routing-fallback-caching-workload-aware-serving.md'), 'utf8'),
  fs.readFile(path.resolve('docs/snippets/articulos-tecnicos/inference-routing-fallback-cache-policy.html'), 'utf8'),
  fs.readFile(path.resolve('locales/en/snippets/articulos-tecnicos/inference-routing-fallback-cache-policy.html'), 'utf8'),
  fs.readFile(path.resolve('locales/en/snippets/articulos-tecnicos/inference-routing-fallback-cache-policy.i18n.json'), 'utf8'),
  fs.readFile(path.resolve('mkdocs.yml'), 'utf8'),
  fs.readFile(path.resolve('mkdocs.en.yml'), 'utf8'),
  fs.readFile(path.resolve('locales/en/manifest.yml'), 'utf8'),
  fs.readFile(path.resolve('.github/workflows/series4-golden-review.yml'), 'utf8'),
]);

const i18n = JSON.parse(i18nRaw);
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const route = 'series/llm-inference-engineering-economics/05-model-routing-fallback-caching-workload-aware-serving.md';
const visualPath = 'snippets/articulos-tecnicos/inference-routing-fallback-cache-policy.html';
check(mkdocsEs.includes(`Model routing, fallback, caching y serving adaptado al workload: ${route}`), 'ES: Series 4 / chapter 4.5 navigation missing');
check(mkdocsEn.includes(`Model routing, fallback, caching, and workload-aware serving: ${route}`), 'EN: Series 4 / chapter 4.5 navigation missing');
check(manifestEn.includes(`  - ${route}`), 'EN: chapter 4.5 missing from published_routes manifest');
check(manifestEn.includes(`  - ${visualPath}`), 'EN: chapter 4.5 visual missing from required_snippets manifest');
check(seriesWorkflow.includes('node scripts/validate_inference_engineering_ch5_source.mjs'), 'CI: chapter 4.5 source gate missing from permanent Series 4 review');
check(seriesWorkflow.includes('node scripts/validate_inference_engineering_ch5_accessibility.mjs'), 'CI: chapter 4.5 browser/accessibility gate missing from permanent Series 4 review');

const primaryUrls = [
  'https://arxiv.org/abs/2406.18665',
  'https://github.com/lm-sys/RouteLLM',
  'https://arxiv.org/abs/2305.05176',
  'https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-routing.html',
  'https://docs.litellm.ai/',
  'https://www.rfc-editor.org/rfc/rfc9111',
  'https://github.com/zilliztech/GPTCache',
  'https://arxiv.org/abs/2502.03771',
  'https://arxiv.org/abs/2608.01718',
  'https://docs.nvidia.com/dynamo/v1.4.0/knowledge-base/modular-components/router/overview',
  'https://docs.nvidia.com/dynamo/dev/knowledge-base/concepts/system-architecture/kv-aware-routing',
  'https://github.com/kubernetes-sigs/gateway-api-inference-extension',
];
for (const url of primaryUrls) {
  check(es.includes(url), `ES: missing primary source ${url}`);
  check(en.includes(url), `EN: missing primary source ${url}`);
}

const esAnchors = [
  'La política empieza por lo que **no** puede elegir',
  'Model routing elige antes del primer intento',
  'Routing estático, reglas y routers aprendidos resuelven problemas distintos',
  'El router sólo ve el outcome del modelo que eligió',
  'Fallback ocurre **después** de una condición de fallo o degradación',
  'Compatibilidad de fallback no significa «misma API»',
  'Response caching evita inferencia completa; prefix caching no',
  'Una cache key es parte del contrato de verdad',
  'Semantic cache añade un clasificador de equivalencia',
  'Model routing y worker placement son dos niveles distintos',
  'Workload-aware significa segmentar por la distribución que realmente importa',
  'Observabilidad: registra la **decisión**, no sólo la inferencia',
  'Evals separadas por mecanismo',
  'Contrato de benchmark reproducible',
];
const enAnchors = [
  'Policy starts with what it **cannot** choose',
  'Model routing chooses before the first attempt',
  'Static routing, explicit rules, and learned routers solve different problems',
  'The router only observes the outcome of the model it selected',
  'Fallback happens **after** a failure or degradation condition',
  'Fallback compatibility is more than “same API”',
  'Response caching skips full inference; prefix caching does not',
  'A cache key is part of the truth contract',
  'Semantic caching adds an equivalence classifier',
  'Model routing and worker placement are two different levels',
  'Workload-aware means segmenting by the distribution that actually matters',
  'Observability: record the **decision**, not only the inference',
  'Evaluate each mechanism separately',
  'Reproducible benchmark contract',
];
for (const anchor of esAnchors) check(es.includes(anchor), `ES: missing concept ${anchor}`);
for (const anchor of enAnchors) check(en.includes(anchor), `EN: missing concept ${anchor}`);

for (const text of [es, en]) {
  for (const token of ['E(x)', 'm^*(x)', 'R(x)', 'B_{remaining}', 'policy_version', 'attempt_id', 'cost/task', 'goodput']) {
    check(text.includes(token), `Missing required chapter 4.5 token ${token}`);
  }
  check(text.includes('RouteLLM') && text.includes('FrugalGPT'), 'Model-routing/cascade evidence boundary missing');
  check(text.includes('exactly two models') || text.includes('exactamente dos modelos'), 'Bedrock exact-two-model capability boundary missing');
  check(text.includes('selection bias'), 'Counterfactual routing-eval caveat missing');
  check(text.includes('worker placement'), 'Model-selection versus worker-placement boundary missing');
  check(text.includes('false-positive') || text.includes('false positives'), 'Semantic-cache false-positive boundary missing');
}

check(es.includes('Un semantic-cache hit incorrecto evita la inferencia equivocada'), 'ES: cache correctness framing missing');
check(en.includes('A wrong semantic-cache hit skips the wrong inference'), 'EN: cache correctness framing missing');
check(es.includes('fallback model') && es.includes('no significa necesariamente'), 'ES: Bedrock fallback terminology caveat missing');
check(en.includes('fallback model') && en.includes('does not necessarily mean'), 'EN: Bedrock fallback terminology caveat missing');
check(es.includes('Fallback es una política de continuidad de servicio, no una equivalencia matemática'), 'ES: fallback equivalence caveat missing');
check(en.includes('Fallback is a service-continuity policy, not a mathematical equivalence'), 'EN: fallback equivalence caveat missing');
check(es.includes('cache hit rate no es el objetivo primario'), 'ES: semantic cache objective boundary missing');
check(en.includes('cache hit rate is not the primary objective'), 'EN: semantic cache objective boundary missing');
check(es.includes('un worker con mucho prefix overlap puede perder frente a otro más frío'), 'ES: KV-locality versus load boundary missing');
check(en.includes('a worker with strong prefix overlap can lose to a colder worker'), 'EN: KV-locality versus load boundary missing');
check(es.includes('compara **stacks completos**'), 'ES: benchmark attribution boundary missing');
check(en.includes('compares **complete stacks**'), 'EN: benchmark attribution boundary missing');
check(!/^\s*-\s+.+;\s*$/m.test(en), 'EN: semicolon-list anti-pattern detected');

const visualInclude = '{{ include_html("snippets/articulos-tecnicos/inference-routing-fallback-cache-policy.html") }}';
check(es.includes(visualInclude), 'ES: 4.5 visual include missing');
check(en.includes(visualInclude), 'EN: 4.5 visual include missing');
check(snippet.includes('GOLDEN_VISUAL_CONTRACT'), 'Visual: relationship-first contract marker missing');
check(snippet.includes('interaction="static:no-cosmetic-controls"'), 'Visual: cosmetic interaction must be rejected');
check(snippet.includes('mobile="horizontal-scroll-preserves-cache-routing-fallback-placement-topology"'), 'Visual: mobile topology-preservation contract missing');
check(snippet.includes('.s5v-routing-policy__stage{width:100%;min-width:0;max-width:1240px;margin:0 auto}'), 'Visual: desktop stage contract missing');
check(snippet.includes('.s5v-routing-policy__stage{width:auto;min-width:1180px}'), 'Visual: mobile horizontal topology contract missing');
check(!snippet.includes('data-s5v-stepper') && !snippet.includes('s5v__steps--tabs'), 'Visual regression: cosmetic tabs/stepper detected');
for (const boundary of ['decision-plane', 'execution-plane']) check(snippet.includes(`data-boundary="${boundary}"`), `Visual: missing semantic boundary ${boundary}`);
for (const node of ['request', 'eligibility', 'cache-lookup', 'cache-hit', 'model-policy', 'selected-model', 'worker-placement', 'primary-attempt', 'success', 'fallback-gate', 'fallback-model', 'terminal-failure', 'telemetry', 'paired-evals', 'policy-update']) {
  check(snippet.includes(`data-node="${node}"`), `Visual: missing mechanism node ${node}`);
}
check(snippet.includes('Cache de respuesta ≠ prefix/KV cache'), 'Visual: response-cache/prefix-cache boundary missing');
check(snippet.includes('Fallback no revierte output ya emitido ni side effects externos.'), 'Visual: fallback irreversibility boundary missing');
check(snippet.includes('filtra antes de optimizar'), 'Visual: hard-eligibility-before-scoring boundary missing');

check(mirror.trim() === '<!-- 5sigmas-canonical-mirror -->', 'EN: visual canonical mirror marker invalid');
check(i18n.source === visualPath, 'EN: visual i18n source path invalid');
const snippetBytes = Buffer.from(snippet, 'utf8');
const blobHeader = Buffer.from(`blob ${snippetBytes.length}\0`, 'utf8');
const snippetBlobSha = crypto.createHash('sha1').update(Buffer.concat([blobHeader, snippetBytes])).digest('hex');
check(i18n.source_blob_sha === snippetBlobSha, `EN: visual source_blob_sha stale (${i18n.source_blob_sha} != ${snippetBlobSha})`);
for (const token of ['Four distinct decisions', 'Hard eligibility', 'Admitted HIT', 'Model policy', 'Selected model', 'Worker placement', 'Fallback model', 'Terminal failure', 'Paired evals / shadow', 'decision boundary']) {
  check(Object.values(i18n.replacements).some((value) => String(value).includes(token)), `EN visual translation missing ${token}`);
}

if (failures.length) {
  console.error(`Inference engineering chapter 4.5 source gate failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Inference engineering chapter 4.5 source gate PASS');
console.log(`ES bytes=${Buffer.byteLength(es)} EN bytes=${Buffer.byteLength(en)} visual_blob=${snippetBlobSha}`);
