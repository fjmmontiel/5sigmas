#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const esPath = path.resolve('docs/series/agentes-voz-tiempo-real/04-tools-estado-acciones-asincronas.md');
const enPath = path.resolve('locales/en/series/agentes-voz-tiempo-real/04-tools-estado-acciones-asincronas.md');
const visualPath = path.resolve('docs/snippets/articulos-tecnicos/voice-action-lifecycle.html');
const mirrorPath = path.resolve('locales/en/snippets/articulos-tecnicos/voice-action-lifecycle.html');
const i18nPath = path.resolve('locales/en/snippets/articulos-tecnicos/voice-action-lifecycle.i18n.json');

const [es, en, snippet, mirror, i18nRaw, mkdocsEs, mkdocsEn, manifest] = await Promise.all([
  fs.readFile(esPath, 'utf8'),
  fs.readFile(enPath, 'utf8'),
  fs.readFile(visualPath, 'utf8'),
  fs.readFile(mirrorPath, 'utf8'),
  fs.readFile(i18nPath, 'utf8'),
  fs.readFile(path.resolve('mkdocs.yml'), 'utf8'),
  fs.readFile(path.resolve('mkdocs.en.yml'), 'utf8'),
  fs.readFile(path.resolve('locales/en/manifest.yml'), 'utf8'),
]);
const i18n = JSON.parse(i18nRaw);

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const blobSha = (text) => {
  const bytes = Buffer.from(text, 'utf8');
  return crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
};

const requiredPrimaryUrls = [
  'https://docs.livekit.io/agents/logic/tools/',
  'https://docs.livekit.io/agents/logic/tools/definition/',
  'https://docs.livekit.io/agents/logic/tools/async/',
  'https://docs.livekit.io/agents/logic/tasks/',
  'https://docs.livekit.io/agents/logic/agents-handoffs/',
  'https://docs.pipecat.ai/pipecat/learn/function-calling',
  'https://github.com/pipecat-ai/pipecat/issues/5481',
  'https://platform.openai.com/docs/api-reference/realtime-client-events/conversation/item/create',
];
for (const url of requiredPrimaryUrls) {
  check(es.includes(url), `ES: missing primary source ${url}`);
  check(en.includes(url), `EN: missing primary source ${url}`);
}

const esAnchors = [
  'Una tool call no es el efecto externo',
  'Separa cuatro tipos de estado',
  'El contrato mínimo de una acción',
  'Cancelar speech, generación y side effects son operaciones distintas',
  'Barge-in mientras una tool sigue corriendo',
  'Async no significa fire-and-forget',
  'LiveKit Agents: herramientas de sesión no equivalen a estado durable',
  'Pipecat: function calls dentro de una pipeline explícita',
  'Vanilla/thin Python: máxima explicitud, máximo ownership',
  'La máquina de estados debe sobrevivir a un restart',
  'Retry necesita idempotencia y un presupuesto',
  'Compensation no es cancellation',
  'Backpressure también existe en tools',
  'El resultado tardío debe pasar por un gate de relevancia',
  'Evals y replay: prueba carreras, no sólo happy paths',
  'LiveKit, Pipecat o vanilla: decide por la frontera que necesitas controlar',
];
const enAnchors = [
  'A tool call is not the external effect',
  'Separate four kinds of state',
  'The minimum action contract',
  'Cancelling speech, generation, and side effects are different operations',
  'Barge-in while a tool is still running',
  'Async does not mean fire-and-forget',
  'LiveKit Agents: session tooling is not durable business state',
  'Pipecat: function calls inside an explicit pipeline',
  'Vanilla/thin Python: maximum explicitness, maximum ownership',
  'The state machine must survive a restart',
  'A retry needs idempotency and a budget',
  'Compensation is not cancellation',
  'Tools need backpressure too',
  'Gate late results for relevance',
  'Evals and replay: test races, not only happy paths',
  'LiveKit, Pipecat, or vanilla: choose the boundary you need to control',
];
for (const anchor of esAnchors) check(es.includes(anchor), `ES: missing concept ${anchor}`);
for (const anchor of enAnchors) check(en.includes(anchor), `EN: missing concept ${anchor}`);

for (const text of [es, en]) {
  for (const token of [
    'tool_requested',
    'action_admitted',
    'effect_committed',
    'result_observed',
    'turn_id',
    'provider_call_id',
    'operation_id',
    'idempotency_key',
    'UNKNOWN',
    'AsyncToolset',
    'RunContext',
    'FunctionCallParams',
    'cancel_on_interruption=False',
    'app_resources',
  ]) check(text.includes(token), `Missing required state/tool token ${token}`);
}

check(es.includes('userdata') && es.includes('no una garantía de persistencia'), 'ES: LiveKit userdata durable-state caveat missing');
check(en.includes('userdata') && en.includes('not a persistence guarantee'), 'EN: LiveKit userdata durable-state caveat missing');
check(es.includes('actualizaciones pendientes se descartan si ocurre un handoff') && es.includes('AsyncToolset'), 'ES: LiveKit agent-bound async handoff semantics missing');
check(en.includes('pending updates from those tools are dropped when a handoff occurs') && en.includes('AsyncToolset'), 'EN: LiveKit agent-bound async handoff semantics missing');
check(es.includes('mensaje de developer') && es.includes('nueva inferencia'), 'ES: Pipecat async result reinjection semantics missing');
check(en.includes('developer message') && en.includes('another LLM inference'), 'EN: Pipecat async result reinjection semantics missing');
check(es.includes('no los copia ni los limpia'), 'ES: Pipecat app_resources ownership caveat missing');
check(en.includes('does not copy or clear them'), 'EN: Pipecat app_resources ownership caveat missing');

check(es.includes('`response.cancel`') && es.includes('`output_audio_buffer.clear`') && es.includes('no cancelan por sí mismos'), 'ES: provider response/audio cancellation vs business-effect distinction missing');
check(en.includes('`response.cancel`') && en.includes('`output_audio_buffer.clear`') && en.includes('do not cancel a booking'), 'EN: provider response/audio cancellation vs business-effect distinction missing');

check(es.includes('El modelo propone; la aplicación admite; el sistema de registro confirma; la conversación comunica.'), 'ES: production ownership rule missing');
check(en.includes('The model proposes; the application admits; the system of record confirms; the conversation communicates.'), 'EN: production ownership rule missing');

check(es.includes('No hay un ganador universal'), 'ES: no-universal-winner caveat missing');
check(en.includes('There is no universal winner'), 'EN: no-universal-winner caveat missing');
check(es.includes('Mismo hardware') || es.includes('mantén constantes hardware'), 'ES: controlled overhead comparison conditions missing');
check(en.includes('hold hardware, network, provider/model'), 'EN: controlled overhead comparison conditions missing');

const vanillaEs = ['registry y schemas de tools', 'durable state machine', 'idempotency keys', 'bounded concurrency y backpressure', 'persistencia y recuperación tras crash', 'tracing, audit log y replay'];
const vanillaEn = ['tool registry and schemas', 'durable state machine', 'idempotency keys', 'bounded concurrency and backpressure', 'crash persistence and recovery', 'tracing, audit log, and replay'];
for (const anchor of vanillaEs) check(es.includes(anchor), `ES: vanilla ownership missing ${anchor}`);
for (const anchor of vanillaEn) check(en.includes(anchor), `EN: vanilla ownership missing ${anchor}`);

check(!/^\s*-\s+.+;\s*$/m.test(en), 'EN: semicolon-list anti-pattern detected');
check(!/LiveKit (es|is) (el )?(mejor|best|fastest)/i.test(`${es}\n${en}`), 'Universal LiveKit winner claim detected');
check(!/Pipecat (es|is) (el )?(mejor|best|fastest)/i.test(`${es}\n${en}`), 'Universal Pipecat winner claim detected');

const visualInclude = '{{ include_html("snippets/articulos-tecnicos/voice-action-lifecycle.html") }}';
check(es.includes(visualInclude), 'ES: action lifecycle visual include missing');
check(en.includes(visualInclude), 'EN: action lifecycle visual include missing');
check(mirror.trim() === '<!-- 5sigmas-canonical-mirror -->', 'EN: action lifecycle mirror marker invalid');
check(i18n.source === 'snippets/articulos-tecnicos/voice-action-lifecycle.html', 'EN: action lifecycle i18n source path invalid');
check(i18n.source_blob_sha === blobSha(snippet), `EN: action lifecycle i18n source_blob_sha stale (${i18n.source_blob_sha} != ${blobSha(snippet)})`);

// Relationship-first visual contract: the mechanism must survive without prose/cards.
check(snippet.includes('GOLDEN_VISUAL_CONTRACT'), 'Visual: GOLDEN_VISUAL_CONTRACT missing');
for (const key of ['learning_objective:', 'mechanism:', 'visual_variables:', 'why_visual:']) {
  check(snippet.includes(key), `Visual: contract field ${key} missing`);
}
for (const encoding of [
  'x-position=time',
  'lane=independent state domain',
  'line continuity=lifecycle continues',
  'vertical cut=barge-in boundary',
  'branch topology=mutually exclusive external outcomes',
  'dashed path=uncertain/reconciliation path',
]) check(snippet.includes(encoding), `Visual: declared relationship encoding missing ${encoding}`);
for (const forbidden of ['s5v-arch-map__pipe', 'data-s5v-stepper', 's5v__steps--tabs']) {
  check(!snippet.includes(forbidden), `Visual: legacy/cosmetic primitive ${forbidden} must not return`);
}
for (const track of ['turn-a', 'turn-b', 'agent-audio', 'operation-running']) {
  check(snippet.includes(`data-action-track="${track}"`), `Visual: missing state-domain track ${track}`);
}
for (const event of ['user-request', 'new-turn', 'audio-cancel', 'tool-requested', 'action-admitted', 'external-outcome', 'reconcile']) {
  check(snippet.includes(`data-action-event="${event}"`), `Visual: missing observable/state event ${event}`);
}
check(snippet.includes('data-action-boundary="barge-in"'), 'Visual: barge-in boundary missing');
for (const outcome of ['committed', 'failed', 'unknown']) {
  check(snippet.includes(`data-action-outcome="${outcome}"`), `Visual: missing external outcome branch ${outcome}`);
}
check(snippet.includes('data-action-path="unknown-to-reconcile"'), 'Visual: UNKNOWN reconciliation path missing');
check(snippet.includes('data-action-reconcile="effect-exists"'), 'Visual: reconciliation effect-exists path missing');
check(snippet.includes('data-action-reconcile="no-effect"'), 'Visual: reconciliation no-effect/retry path missing');
check(snippet.includes('overflow-x:auto') && snippet.includes('tabindex="0"'), 'Visual: mobile horizontal reachability missing');
check(snippet.includes('min-width:980px') && snippet.includes('min-width:940px'), 'Visual: relationship-preserving timeline geometry missing');
check(snippet.includes('@media(prefers-reduced-motion:reduce)'), 'Visual: reduced-motion contract missing');
check(snippet.includes('RUNNING: cruza el barge-in'), 'Visual: operation continuity across barge-in not explained');
check(snippet.includes('UNKNOWN') && snippet.includes('Consultar sistema de registro'), 'Visual: UNKNOWN → system-of-record reconciliation missing');
check(snippet.includes('retry sólo si') && snippet.includes('segura/idempotente'), 'Visual: retry guard after reconciliation missing');

const requiredEnglishVisualFragments = [
  'Conversation ≠ effect',
  'A barge-in cuts one track',
  'What happens when the user interrupts',
  'Durable operation',
  'audio cancelled',
  'RUNNING: crosses the barge-in',
  'Query the system of record',
  'retry only if',
  'Production rule:',
];
for (const fragment of requiredEnglishVisualFragments) {
  check(Object.values(i18n.replacements || {}).some((value) => String(value).includes(fragment)), `EN: action state-machine translation missing ${fragment}`);
}
check(Array.isArray(i18n.forbidden_output_tokens) && i18n.forbidden_output_tokens.length >= 20, 'EN: visual forbidden-output token list is too weak');

check(mkdocsEs.includes('Tools, estado y acciones asíncronas: series/agentes-voz-tiempo-real/04-tools-estado-acciones-asincronas.md'), 'ES: chapter 4 navigation missing');
check(mkdocsEn.includes('Tools, state and async actions: series/agentes-voz-tiempo-real/04-tools-estado-acciones-asincronas.md'), 'EN: chapter 4 navigation missing');
check(manifest.includes('series/agentes-voz-tiempo-real/04-tools-estado-acciones-asincronas.md'), 'EN: chapter 4 manifest route missing');
check(manifest.includes('snippets/articulos-tecnicos/voice-action-lifecycle.html'), 'EN: chapter 4 required snippet missing');

check(es.includes('`ToolFlag.CANCELLABLE`') && es.includes('nombre de tool, no por argumentos') && es.includes('`replace`'), 'ES: current LiveKit cancellation/duplicate semantics missing');
check(en.includes('`ToolFlag.CANCELLABLE`') && en.includes('tool name, not its arguments') && en.includes('`replace`'), 'EN: current LiveKit cancellation/duplicate semantics missing');
check(es.includes('cancellable_by_llm=True') && es.includes('`cancel_<name>`') && es.includes('`tool_call_id`') && es.includes('`timeout_secs`') && es.includes('`function_call_timeout_secs`') && es.includes('`asyncio.CancelledError`'), 'ES: current Pipecat per-tool cancellation/timeout semantics missing');
check(en.includes('cancellable_by_llm=True') && en.includes('`cancel_<name>`') && en.includes('`tool_call_id`') && en.includes('`timeout_secs`') && en.includes('`function_call_timeout_secs`') && en.includes('`asyncio.CancelledError`'), 'EN: current Pipecat per-tool cancellation/timeout semantics missing');
check(es.includes('`enable_async_tool_cancellation`') && es.includes('deprecado') && es.includes('2.0.0'), 'ES: Pipecat deprecated global cancellation flag caveat missing');
check(en.includes('`enable_async_tool_cancellation`') && en.includes('deprecated') && en.includes('2.0.0'), 'EN: Pipecat deprecated global cancellation flag caveat missing');
check(es.includes('No lo trates hoy como una garantía absoluta') && es.includes('issue upstream #5481') && es.includes('watchdog/cancelación independiente'), 'ES: Pipecat intermediate-update timeout bug caveat missing');
check(en.includes('Do not currently treat it as an absolute guarantee') && en.includes('upstream issue #5481') && en.includes('application-owned watchdog/cancellation path'), 'EN: Pipecat intermediate-update timeout bug caveat missing');
check(!es.includes('`cancel_async_tool_call`') && !en.includes('`cancel_async_tool_call`'), 'Stale Pipecat global cancel_async_tool_call claim detected');

if (failures.length) {
  console.error(`Voice tools/state chapter source gate failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Voice tools/state chapter source + relationship-first visual gate PASS');
console.log(`ES bytes=${Buffer.byteLength(es)} EN bytes=${Buffer.byteLength(en)} visual_blob=${blobSha(snippet)}`);