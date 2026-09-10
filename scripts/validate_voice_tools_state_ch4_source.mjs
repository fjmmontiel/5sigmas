#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const esPath = path.resolve('docs/series/agentes-voz-tiempo-real/04-tools-estado-acciones-asincronas.md');
const enPath = path.resolve('locales/en/series/agentes-voz-tiempo-real/04-tools-estado-acciones-asincronas.md');
const [es, en, snippet, mirror, i18nRaw, mkdocsEs, mkdocsEn, manifest] = await Promise.all([
  fs.readFile(esPath, 'utf8'),
  fs.readFile(enPath, 'utf8'),
  fs.readFile(path.resolve('docs/snippets/articulos-tecnicos/voice-action-lifecycle.html'), 'utf8'),
  fs.readFile(path.resolve('locales/en/snippets/articulos-tecnicos/voice-action-lifecycle.html'), 'utf8'),
  fs.readFile(path.resolve('locales/en/snippets/articulos-tecnicos/voice-action-lifecycle.i18n.json'), 'utf8'),
  fs.readFile(path.resolve('mkdocs.yml'), 'utf8'),
  fs.readFile(path.resolve('mkdocs.en.yml'), 'utf8'),
  fs.readFile(path.resolve('locales/en/manifest.yml'), 'utf8'),
]);
const i18n = JSON.parse(i18nRaw);

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const requiredPrimaryUrls = [
  'https://docs.livekit.io/agents/logic/tools/',
  'https://docs.livekit.io/agents/logic/tools/definition/',
  'https://docs.livekit.io/agents/logic/tools/async/',
  'https://docs.livekit.io/agents/logic/tasks/',
  'https://docs.livekit.io/agents/logic/agents-handoffs/',
  'https://docs.pipecat.ai/pipecat/learn/function-calling',
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
check(snippet.includes('s5v-action-lifecycle') && snippet.includes('operation_id') && snippet.includes('UNKNOWN'), 'Visual: action lifecycle mechanism incomplete');
check(mirror.trim() === '<!-- 5sigmas-canonical-mirror -->', 'EN: action lifecycle mirror marker invalid');
check(i18n.source === 'snippets/articulos-tecnicos/voice-action-lifecycle.html', 'EN: action lifecycle i18n source path invalid');
const snippetBytes = Buffer.from(snippet, 'utf8');
const blobHeader = Buffer.from(`blob ${snippetBytes.length}\0`, 'utf8');
const snippetBlobSha = crypto.createHash('sha1').update(Buffer.concat([blobHeader, snippetBytes])).digest('hex');
check(i18n.source_blob_sha === snippetBlobSha, `EN: action lifecycle i18n source_blob_sha stale (${i18n.source_blob_sha} != ${snippetBlobSha})`);
for (const token of ['Tool requested', 'Action admitted', 'External outcome', 'Result observed', 'system of record']) {
  check(Object.values(i18n.replacements).some((value) => String(value).includes(token)), `EN: action lifecycle translation missing ${token}`);
}
check(mkdocsEs.includes('Tools, estado y acciones asíncronas: series/agentes-voz-tiempo-real/04-tools-estado-acciones-asincronas.md'), 'ES: chapter 4 navigation missing');
check(mkdocsEn.includes('Tools, state and async actions: series/agentes-voz-tiempo-real/04-tools-estado-acciones-asincronas.md'), 'EN: chapter 4 navigation missing');
check(manifest.includes('series/agentes-voz-tiempo-real/04-tools-estado-acciones-asincronas.md'), 'EN: chapter 4 manifest route missing');
check(manifest.includes('snippets/articulos-tecnicos/voice-action-lifecycle.html'), 'EN: chapter 4 required snippet missing');

check(es.includes('`ToolFlag.CANCELLABLE`') && es.includes('nombre de tool, no por argumentos') && es.includes('`replace`'), 'ES: current LiveKit cancellation/duplicate semantics missing');
check(en.includes('`ToolFlag.CANCELLABLE`') && en.includes('tool name, not its arguments') && en.includes('`replace`'), 'EN: current LiveKit cancellation/duplicate semantics missing');
check(es.includes('`enable_async_tool_cancellation=True`') && es.includes('`cancel_async_tool_call`') && es.includes('`timeout_secs`') && es.includes('`function_call_timeout_secs`'), 'ES: current Pipecat async cancellation/timeout semantics missing');
check(en.includes('`enable_async_tool_cancellation=True`') && en.includes('`cancel_async_tool_call`') && en.includes('`timeout_secs`') && en.includes('`function_call_timeout_secs`'), 'EN: current Pipecat async cancellation/timeout semantics missing');
check(!es.includes('`cancellable_by_llm=True`') && !en.includes('`cancellable_by_llm=True`'), 'Stale Pipecat cancellable_by_llm API claim detected');
check(!es.includes('`cancel_<nombre>`') && !en.includes('`cancel_<name>`'), 'Stale Pipecat per-tool cancel_<name> claim detected');
check(!es.includes('`asyncio.CancelledError`') && !en.includes('`asyncio.CancelledError`'), 'Unsupported Pipecat timeout cancellation-mechanism claim detected');

if (failures.length) {
  console.error(`Voice tools/state chapter source gate failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Voice tools/state chapter source gate PASS');
console.log(`ES bytes=${Buffer.byteLength(es)} EN bytes=${Buffer.byteLength(en)}`);
