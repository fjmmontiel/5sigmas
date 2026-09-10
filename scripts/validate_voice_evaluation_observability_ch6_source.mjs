#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const [es, en, snippet, mirror, i18nRaw, mkdocsEs, mkdocsEn, manifest] = await Promise.all([
  fs.readFile(path.resolve('docs/series/agentes-voz-tiempo-real/06-evaluacion-observabilidad-reliability.md'), 'utf8'),
  fs.readFile(path.resolve('locales/en/series/agentes-voz-tiempo-real/06-evaluacion-observabilidad-reliability.md'), 'utf8'),
  fs.readFile(path.resolve('docs/snippets/articulos-tecnicos/voice-turn-evidence-stack.html'), 'utf8'),
  fs.readFile(path.resolve('locales/en/snippets/articulos-tecnicos/voice-turn-evidence-stack.html'), 'utf8'),
  fs.readFile(path.resolve('locales/en/snippets/articulos-tecnicos/voice-turn-evidence-stack.i18n.json'), 'utf8'),
  fs.readFile(path.resolve('mkdocs.yml'), 'utf8'),
  fs.readFile(path.resolve('mkdocs.en.yml'), 'utf8'),
  fs.readFile(path.resolve('locales/en/manifest.yml'), 'utf8'),
]);
const i18n = JSON.parse(i18nRaw);

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const primaryUrls = [
  'https://docs.livekit.io/agents/start/testing/',
  'https://docs.livekit.io/deploy/observability/data/',
  'https://docs.livekit.io/deploy/observability/tracing/',
  'https://docs.livekit.io/deploy/observability/insights/',
  'https://docs.livekit.io/reference/agents/events/',
  'https://docs.livekit.io/deploy/observability/pii-redaction/',
  'https://docs.pipecat.ai/pipecat/evals/overview',
  'https://docs.pipecat.ai/pipecat/evals/lifecycle',
  'https://docs.pipecat.ai/pipecat/fundamentals/metrics',
  'https://docs.pipecat.ai/api-reference/server/utilities/observers/user-bot-latency-observer',
  'https://docs.pipecat.ai/api-reference/server/utilities/observers/observer-pattern',
  'https://docs.pipecat.ai/api-reference/server/events/frame-processor-events',
  'https://opentelemetry.io/docs/specs/semconv/general/recording-errors/',
];
for (const url of primaryUrls) {
  check(es.includes(url), `ES: missing primary source ${url}`);
  check(en.includes(url), `EN: missing primary source ${url}`);
}

const esAnchors = [
  'Una transcripción no es la verdad del sistema',
  'El objeto mínimo de análisis debe ser el turno lógico',
  'Observado, inferido y juzgado no son lo mismo',
  'Separa síntoma, causa y recuperación',
  'Una taxonomía de voz debe incluir fallos que no existen en chat',
  'Métricas: empieza por el denominador',
  'Define invariantes que un judge no debería decidir',
  'Evaluación por capas: de barato y determinista a realista',
  'El replay correcto no es «volver a enviar la transcripción»',
  'Observabilidad: una traza debe conectar el turno, no sólo providers',
  'LiveKit: qué observas en el SDK y qué pertenece a Cloud',
  'Pipecat: observa frames y turns, pero conserva las fronteras',
  'LiveKit Agents vs Pipecat vs vanilla/thin para evals y observabilidad',
  'De producción a eval sin copiar basura',
  'Seguridad y privacidad forman parte de observabilidad',
];
const enAnchors = [
  "A transcript is not the system's ground truth",
  'The useful unit of analysis is the logical turn',
  'Observed, inferred, and judged are different kinds of evidence',
  'Keep symptom, cause, and recovery separate',
  'Voice needs failure classes that chat does not',
  'Start every reliability metric with its denominator',
  'Use deterministic assertions where a judge is unnecessary',
  'Build evaluation in layers, from cheap to realistic',
  'Correct replay means more than resending the transcript',
  'Observability should connect the logical turn, not just provider calls',
  'LiveKit: separate SDK evidence from Cloud capabilities',
  'Pipecat: frame-level visibility is useful, but keep product boundaries',
  'LiveKit Agents vs Pipecat vs vanilla/thin for evaluation and observability',
  'Turn production failures into the smallest useful regression',
  'Privacy and security are part of observability design',
];
for (const anchor of esAnchors) check(es.includes(anchor), `ES: missing concept ${anchor}`);
for (const anchor of enAnchors) check(en.includes(anchor), `EN: missing concept ${anchor}`);

for (const text of [es, en]) {
  for (const token of [
    'session_id', 'turn_id', 'operation_id', 'first_harmful_observable', 'root_cause',
    'stage', 'symptom', 'cause', 'recovery', 'user_impact',
    'turn_failure_rate', 'internal_failure_rate', 'recovery_success_rate',
    'unknown_effect_rate', 'retry_amplification', 'UNKNOWN',
    'OpenTelemetry', 'error.type', 'SessionReport', 'ErrorEvent', 'ev.error.recoverable',
    'MetricsFrame', 'UserBotLatencyObserver', 'TurnTrackingObserver', 'ErrorFrame',
  ]) check(text.includes(token), `Missing required evaluation/observability token ${token}`);
}

check(es.includes('observado:') && es.includes('inferido:') && es.includes('juzgado:'), 'ES: evidence provenance split missing');
check(en.includes('observed:') && en.includes('inferred:') && en.includes('judged:'), 'EN: evidence provenance split missing');
check(es.includes('primer observable dañino') && es.includes('causa raíz'), 'ES: harmful-observable vs root-cause distinction missing');
check(en.includes('first harmful observable') && en.includes('root cause'), 'EN: harmful-observable vs root-cause distinction missing');

check(es.includes('turn_failure_rate') && es.includes('/ eligible_logical_turns'), 'ES: turn failure denominator missing');
check(en.includes('turn_failure_rate') && en.includes('/ eligible_logical_turns'), 'EN: turn failure denominator missing');
check(es.includes('No mezcles un «turn failure rate»') && es.includes('requests'), 'ES: denominator incompatibility caveat missing');
check(en.includes('Do not compare a turn failure rate') && en.includes('requests'), 'EN: denominator incompatibility caveat missing');

check(es.includes('mismo `operation_id` no debe producir dos efectos') && es.includes('`UNKNOWN` no debe convertirse en `SUCCESS`'), 'ES: deterministic business-state invariants missing');
check(en.includes('same `operation_id` must not create two business effects') && en.includes('`UNKNOWN` side effect must not become `SUCCESS`'), 'EN: deterministic business-state invariants missing');

check(es.includes('test framework integrado con pytest/Vitest') && es.includes('no crea una conexión a una room'), 'ES: LiveKit test-framework scope missing');
check(en.includes('test framework integrated with pytest/Vitest') && en.includes('do not create a LiveKit room connection'), 'EN: LiveKit test-framework scope missing');
check(es.includes('eval transport sustituye Daily/WebRTC/telephony'), 'ES: Pipecat eval transport boundary missing');
check(en.includes('eval transport replaces Daily/WebRTC/telephony'), 'EN: Pipecat eval transport boundary missing');
check(es.includes('transport desplegado, carga/concurrencia') && es.includes('replay de audio exacto'), 'ES: Pipecat local-eval limitations missing');
check(en.includes('deployed transport, sustained load/concurrency') && en.includes('exact-audio replay'), 'EN: Pipecat local-eval limitations missing');

check(es.includes('Agent insights') && es.includes('capacidad de LiveKit Cloud') && es.includes('completamente self-hosted'), 'ES: LiveKit core-vs-managed observability boundary missing');
check(en.includes('Agent insights') && en.includes('LiveKit Cloud capability') && en.includes('fully self-hosted media servers'), 'EN: LiveKit core-vs-managed observability boundary missing');
check(es.includes('`ev.error.recoverable`') && es.includes('no éxito del producto'), 'ES: LiveKit recoverability-vs-outcome boundary missing');
check(en.includes('`ev.error.recoverable`') && en.includes('not product success'), 'EN: LiveKit recoverability-vs-outcome boundary missing');

// Pipecat 1.x current source/docs (revalidated 2026-09-11): ErrorFrame again exposes fatal.
check(es.includes('`FrameProcessor` dispara `on_error`') && es.includes('`fatal=True`') && es.includes('cancela el pipeline') && es.includes('`fatal=False`'), 'ES: current Pipecat ErrorFrame fatal semantics missing');
check(en.includes('`FrameProcessor` fires `on_error`') && en.includes('`fatal=True`') && en.includes('cancels the pipeline') && en.includes('`fatal=False`'), 'EN: current Pipecat ErrorFrame fatal semantics missing');
check(!es.includes('`error.processor.is_usable`') && !es.includes('deprecado desde v1.8.0'), 'ES: stale Pipecat is_usable/deprecation semantics remain');
check(!en.includes('`error.processor.is_usable`') && !en.includes('deprecated since v1.8.0'), 'EN: stale Pipecat is_usable/deprecation semantics remain');
check(es.includes('`fatal=False` no demuestra que el turno haya salido bien'), 'ES: Pipecat fatal-vs-product-outcome boundary missing');
check(en.includes('`fatal=False` does not prove that the turn succeeded'), 'EN: Pipecat fatal-vs-product-outcome boundary missing');
check(es.includes('`UserBotLatencyObserver` mide entre la parada de habla detectada') && es.includes('inicio de habla del bot'), 'ES: Pipecat latency metric boundary missing');
check(en.includes('`UserBotLatencyObserver` measures from detected user-speech stop') && en.includes('bot-speech start'), 'EN: Pipecat latency metric boundary missing');

check(es.includes('No hay ganador universal'), 'ES: no-universal-winner rule missing');
check(en.includes('There is no universal winner'), 'EN: no-universal-winner rule missing');
for (const token of ['LiveKit Agents', 'Pipecat', 'Vanilla/thin Python']) {
  check(es.includes(token), `ES: runtime decision missing ${token}`);
  check(en.includes(token), `EN: runtime decision missing ${token}`);
}
check(es.includes('turn ledger canónico de la aplicación'), 'ES: hybrid app-owned ledger missing');
check(en.includes('application-owned canonical turn ledger'), 'EN: hybrid app-owned ledger missing');

check(es.includes('Un sistema fiable no es uno sin errores internos'), 'ES: internal-failure-vs-user-outcome teaching missing');
check(en.includes('A reliable system is not a system with no internal faults'), 'EN: internal-failure-vs-user-outcome teaching missing');
check(es.includes('production failure') && es.includes('smallest reproducible evidence'), 'ES: production-to-regression loop missing');
check(en.includes('production failure') && en.includes('smallest reproducible evidence'), 'EN: production-to-regression loop missing');

check(es.includes('PII redaction') && es.includes('datos que el agente recolecta o exporta por su cuenta'), 'ES: managed redaction boundary missing');
check(en.includes('PII redaction') && en.includes('Data collected or exported independently'), 'EN: managed redaction boundary missing');
check(es.includes('baja cardinalidad'), 'ES: low-cardinality error taxonomy requirement missing');
check(en.includes('low-cardinality'), 'EN: low-cardinality error taxonomy requirement missing');

check(!/^\s*-\s+.+;\s*$/m.test(en), 'EN: semicolon-list anti-pattern detected');
check(!/LiveKit (es|is) (el )?(mejor|best|fastest)/i.test(`${es}\n${en}`), 'Universal LiveKit winner claim detected');
check(!/Pipecat (es|is) (el )?(mejor|best|fastest)/i.test(`${es}\n${en}`), 'Universal Pipecat winner claim detected');

const visualInclude = '{{ include_html("snippets/articulos-tecnicos/voice-turn-evidence-stack.html") }}';
check(es.includes(visualInclude), 'ES: turn evidence visual include missing');
check(en.includes(visualInclude), 'EN: turn evidence visual include missing');
check(snippet.includes('GOLDEN_VISUAL_CONTRACT'), 'Visual: GOLDEN visual contract missing');
check(!snippet.includes('s5v-arch-map__pipe'), 'Visual: legacy linear card pipe returned');
check(!snippet.includes('data-s5v-stepper') && !snippet.includes('s5v__steps--tabs'), 'Visual: cosmetic tabs/stepper returned');
for (const token of [
  's5v-turn-evidence-graph', 'data-evidence-event="provider-timeout"', 'data-evidence-event="fallback"',
  'data-evidence-boundary="first-harmful"', 'data-evidence-event="first-playout"',
  'data-evidence-event="business-success"', 'data-evidence-diagnosis="bundle"',
  'data-evidence-converges="runtime"', 'data-evidence-converges="conversation"',
  'data-evidence-converges="media"', 'data-evidence-converges="outcome"',
  'causa raíz', 'recuperación', 'primer observable dañino', 'SUCCESS',
]) check(snippet.includes(token), `Visual: relationship-first evidence token missing ${token}`);
check(snippet.includes('x-position=time') && snippet.includes('lane=evidence domain') && snippet.includes('solid arrow=causal propagation') && snippet.includes('dashed arrow=recovery path'), 'Visual: declared relationship variables incomplete');
check(mirror.trim() === '<!-- 5sigmas-canonical-mirror -->', 'EN: turn evidence canonical mirror marker invalid');
check(i18n.source === 'snippets/articulos-tecnicos/voice-turn-evidence-stack.html', 'EN: turn evidence i18n source path invalid');
const snippetBytes = Buffer.from(snippet, 'utf8');
const blobHeader = Buffer.from(`blob ${snippetBytes.length}\0`, 'utf8');
const snippetBlobSha = crypto.createHash('sha1').update(Buffer.concat([blobHeader, snippetBytes])).digest('hex');
check(i18n.source_blob_sha === snippetBlobSha, `EN: turn evidence source_blob_sha stale (${i18n.source_blob_sha} != ${snippetBlobSha})`);
for (const token of ['Turn-level evidence', 'Outcome', 'Conversation', 'first harmful observable', 'root cause', 'recovery', 'Turn diagnosis']) {
  check(snippet.includes(token) || Object.values(i18n.replacements).some((value) => String(value).includes(token)), `EN visual translation missing ${token}`);
}

check(mkdocsEs.includes('Evaluación, observabilidad y reliability: series/agentes-voz-tiempo-real/06-evaluacion-observabilidad-reliability.md'), 'ES: chapter 6 navigation missing');
check(mkdocsEn.includes('Evaluation, observability and reliability: series/agentes-voz-tiempo-real/06-evaluacion-observabilidad-reliability.md'), 'EN: chapter 6 navigation missing');
check(manifest.includes('series/agentes-voz-tiempo-real/06-evaluacion-observabilidad-reliability.md'), 'EN: chapter 6 manifest route missing');
check(manifest.includes('snippets/articulos-tecnicos/voice-turn-evidence-stack.html'), 'EN: chapter 6 required snippet missing');

if (failures.length) {
  console.error(`Voice evaluation/observability chapter source gate failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Voice evaluation/observability chapter source gate PASS');
console.log(`ES bytes=${Buffer.byteLength(es)} EN bytes=${Buffer.byteLength(en)}`);
