#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const [es, en, snippet, mirror, i18nRaw, mkdocsEs, mkdocsEn, manifest] = await Promise.all([
  fs.readFile(path.resolve('docs/series/coding-agents-agent-harnesses/06-tareas-largas-memoria-subagentes-recuperacion-merge-observabilidad.md'), 'utf8'),
  fs.readFile(path.resolve('locales/en/series/coding-agents-agent-harnesses/06-tareas-largas-memoria-subagentes-recuperacion-merge-observabilidad.md'), 'utf8'),
  fs.readFile(path.resolve('docs/snippets/articulos-tecnicos/coding-agent-long-task-state.html'), 'utf8'),
  fs.readFile(path.resolve('locales/en/snippets/articulos-tecnicos/coding-agent-long-task-state.html'), 'utf8'),
  fs.readFile(path.resolve('locales/en/snippets/articulos-tecnicos/coding-agent-long-task-state.i18n.json'), 'utf8'),
  fs.readFile(path.resolve('mkdocs.yml'), 'utf8'),
  fs.readFile(path.resolve('mkdocs.en.yml'), 'utf8'),
  fs.readFile(path.resolve('locales/en/manifest.yml'), 'utf8'),
]);
const i18n = JSON.parse(i18nRaw);
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const primaryUrls = [
  'https://openai.com/index/introducing-the-agents-api/',
  'https://developers.openai.com/api/docs/guides/agents-api/sessions/events',
  'https://developers.openai.com/api/docs/guides/agents-api/sessions/manage',
  'https://developers.openai.com/api/docs/guides/agents-api/multi-agent',
  'https://developers.openai.com/api/docs/guides/agents-api/observability',
  'https://developers.openai.com/api/docs/guides/agents-api/tracing',
  'https://www.anthropic.com/engineering/harness-design-long-running-apps',
  'https://docs.github.com/en/copilot/how-tos/copilot-sdk/features/session-persistence',
  'https://docs.github.com/en/copilot/how-tos/copilot-sdk/features/fleet-mode',
];
for (const url of primaryUrls) {
  check(es.includes(url), `ES: missing primary source ${url}`);
  check(en.includes(url), `EN: missing primary source ${url}`);
}

const esAnchors = [
  'Una tarea larga es una máquina de estados durable, no una conversación infinita',
  '«Memoria» no es un único objeto',
  'Contexto, compaction, checkpoint y durable state tampoco son sinónimos',
  'Compaction y reset resuelven problemas distintos',
  'Un reinicio no debería convertir la memoria del modelo en source of truth',
  'Recuperar un stream no es repetir el stream',
  'Un estado `idle` o un stream cerrado no demuestra éxito',
  'Subagentes sólo ayudan si ownership y dependencias son explícitos',
  'Cada subagente necesita su propia identidad de ejecución',
  'No atribuyas al subagente capacidades que pertenecen al runtime',
  'Paralelismo seguro necesita una superficie de integración diseñada',
  'El target branch puede moverse mientras los workers trabajan',
  'Checkpoint de worker y checkpoint de integración son objetos diferentes',
  'Observabilidad útil reconstruye causalidad, no sólo logs',
  'Métricas de tarea larga: separa actividad de progreso',
  'Caso trabajado: tres workers y un target que avanza',
  'Recovery correcto tiene que ser repetible',
  'Trade-off: durabilidad y paralelismo cuestan complejidad',
  'La arquitectura debe poder simplificarse cuando cambia el modelo',
  'Implicación de producción: continuidad significa poder reconstruir verdad',
];
const enAnchors = [
  'A long-running task is a durable state machine, not an infinite conversation',
  '“Memory” is not one object',
  'Context, compaction, checkpoints, and durable state are not synonyms either',
  'Compaction and reset solve different problems',
  'A restart should not turn model memory into the source of truth',
  'Recovering a stream is not replaying the stream',
  'An `idle` state or closed stream does not prove success',
  'Subagents help only when ownership and dependencies are explicit',
  'Every subagent needs its own execution identity',
  'Do not attribute runtime capabilities to the subagent abstraction',
  'Safe parallelism needs a designed integration surface',
  'The target branch can move while workers are running',
  'A worker checkpoint and an integration checkpoint are different objects',
  'Useful observability reconstructs causality, not just logs',
  'Long-task metrics: separate activity from progress',
  'Worked example: three workers and a moving target',
  'Correct recovery must be repeatable',
  'Trade-off: durability and parallelism cost complexity',
  'The architecture should become simpler when the model changes',
  'Production implication: continuity means being able to reconstruct truth',
];
for (const anchor of esAnchors) check(es.includes(anchor), `ES: missing concept ${anchor}`);
for (const anchor of enAnchors) check(en.includes(anchor), `EN: missing concept ${anchor}`);

for (const text of [es, en]) {
  for (const token of ['task_id','contract_version','target_sha','work_unit_id','owner','base_sha','workspace_id','candidate_sha','required_actions','item_id','subagent_id','action_id','RUNNING','RECOVERING','INTEGRATING','VERIFYING','ACCEPTED','REWORK_REQUIRED','HAND_BACK_TO_HUMAN']) check(text.includes(token), `Missing durable-task contract token ${token}`);
  check(text.includes('candidate identity changed → dependent evidence becomes stale'), 'Missing fan-in freshness invariant');
  check(text.includes('persisted state + observed external state → next safe transition'), 'Missing recovery reconciliation invariant');
  check(text.includes('wait_call = done → worker = successful'), 'Missing subagent coordination caveat');
  check(text.includes('resume(session) ≠ restore(entire world exactly)'), 'Missing resume boundary invariant');
}
check(es.includes('streams no reproducen eventos perdidos') || es.includes('streams no replayean eventos perdidos'), 'ES: missed-event stream caveat missing');
check(en.includes('streams do not replay missed events'), 'EN: missed-event stream caveat missing');
check(es.includes('no soportan function tools'), 'ES: Agents API subagent function-tool limitation missing');
check(en.includes('do not support function tools'), 'EN: Agents API subagent function-tool limitation missing');
check(es.includes('`usage` es best-effort') && es.includes('no es la factura final'), 'ES: usage observability caveat missing');
check(en.includes('`usage` is best-effort') && en.includes('not the final bill'), 'EN: usage observability caveat missing');
check(es.includes('external trace exporters') && es.includes('public beta'), 'ES: tracing beta limitation missing');
check(en.includes('external trace exporters') && en.includes('public beta'), 'EN: tracing beta limitation missing');
check(es.includes('estado experimental') || es.includes('experimental'), 'ES: GitHub Fleet experimental status missing');
check(en.includes('experimental'), 'EN: GitHub Fleet experimental status missing');
check(!/^\s*-\s+.+;\s*$/m.test(en), 'EN: semicolon-list anti-pattern detected');
for (const text of [es, en]) {
  check(!/(?:merge limpio|clean merge).*(?:demuestra|proves).*(?:semantic|semántic)/i.test(text), 'Clean merge incorrectly framed as semantic proof');
  check(!/(?:resume|reanudar).*(?:restores|restaura).*(?:everything|todo exactamente)/i.test(text), 'Resume incorrectly framed as exact-world restoration');
  check(!/(?:subagent|subagente).*(?:completed|terminado).*(?:automatically|automáticamente).*(?:success|éxito)/i.test(text), 'Subagent coordination event incorrectly framed as task success');
}

const visualInclude = '{{ include_html("snippets/articulos-tecnicos/coding-agent-long-task-state.html") }}';
check(es.includes(visualInclude), 'ES: long-task visual include missing');
check(en.includes(visualInclude), 'EN: long-task visual include missing');
check(snippet.includes('GOLDEN_VISUAL_CONTRACT'), 'Visual: GOLDEN_VISUAL_CONTRACT missing');
check(snippet.includes('interaction="static:no-cosmetic-controls"'), 'Visual: static no-cosmetic-controls contract missing');
check(snippet.includes('relationship="context-A->durable-ledger->context-B|durable-ledger->{worker-A,worker-B}->{integration-candidate}|target-A->target-B->integration-candidate->stale-worker-evidence->reverify->merge|disconnect->buffer-live->retrieve-saved-state->reconcile-by-id->continue|{root,workers,integration}->observability-rail"'), 'Visual: relationship topology contract missing');
check(snippet.includes('mobile="horizontal-scroll-preserves-persistence-fanout-recovery-and-invalidation-topology"'), 'Visual: mobile topology-preservation contract missing');
check(!snippet.includes('s5v-arch-map__pipe'), 'Visual: legacy linear card pipe is forbidden');
check(!snippet.includes('data-s5v-stepper'), 'Visual: cosmetic stepper is forbidden');
check(!/<button\b/i.test(snippet), 'Visual: cosmetic buttons are forbidden');
for (const token of [
  'data-zone="context"','data-zone="durable"','data-zone="workers"','data-zone="integration"','data-zone="recovery"',
  'data-node="context-a"','data-node="context-b"','data-node="durable-ledger"','data-node="worker-a"','data-node="worker-b"','data-node="target-a"','data-node="target-b"','data-node="integration-candidate"','data-node="stale-evidence"','data-node="reverify"','data-node="merge"','data-node="disconnect"','data-node="buffer-live"','data-node="retrieve"','data-node="reconcile"','data-node="continue"','data-node="observability"',
  'data-edge="context-a-ledger"','data-edge="ledger-context-b"','data-edge="ledger-worker-a"','data-edge="ledger-worker-b"','data-edge="worker-a-integration"','data-edge="worker-b-integration"','data-edge="target-a-b"','data-edge="target-b-integration"','data-edge="integration-invalidates"','data-edge="stale-reverify"','data-edge="reverify-merge"','data-edge="disconnect-buffer"','data-edge="buffer-retrieve"','data-edge="retrieve-reconcile"','data-edge="reconcile-continue"','data-edge="ledger-recovery"','data-edge="worker-a-observe"','data-edge="worker-b-observe"','data-edge="integration-observe"'
]) check(snippet.includes(token), `Visual: required topology token missing ${token}`);
for (const invariant of ['task_id · contract_version · target_sha','base=A · workspace=WA','base=A · workspace=WB','integrate(B, W1, W2)','dependiente → STALE','I9 ≠ W1 ≠ W2','Reconcile by ID','item_id · final state','sólo tras I9 verified']) check(snippet.includes(invariant), `Visual: durable-task invariant missing ${invariant}`);
check(mirror.trim() === '<!-- 5sigmas-canonical-mirror -->', 'EN: long-task visual mirror marker invalid');
check(i18n.source === 'snippets/articulos-tecnicos/coding-agent-long-task-state.html', 'EN: long-task visual i18n source path invalid');
const snippetBytes = Buffer.from(snippet, 'utf8');
const blobHeader = Buffer.from(`blob ${snippetBytes.length}\0`, 'utf8');
const snippetBlobSha = crypto.createHash('sha1').update(Buffer.concat([blobHeader, snippetBytes])).digest('hex');
check(i18n.source_blob_sha === snippetBlobSha, `EN: long-task visual source_blob_sha stale (${i18n.source_blob_sha} != ${snippetBlobSha})`);
for (const token of ['Durability · recovery · fan-in','TRANSIENT CONTEXT','DURABLE CONTROL','OWNERSHIP + PARALLEL WORKSPACES','RECOVERY + OBSERVABILITY','Root context t0','Durable task ledger','Worker A · API','Worker B · migration','Target B','Integrated candidate I9','dependent → STALE','Reverify I9','only after I9 is verified','New stream','Retrieve saved state','Reconcile by ID','Causal trace','Operating rule:']) check(snippet.includes(token) || Object.values(i18n.replacements).some((value) => String(value).includes(token)), `EN visual translation missing ${token}`);

const route = 'series/coding-agents-agent-harnesses/06-tareas-largas-memoria-subagentes-recuperacion-merge-observabilidad.md';
check(mkdocsEs.includes('Tareas largas, memoria y subagentes: ' + route), 'ES: Series 2 / chapter 2.6 navigation missing');
check(mkdocsEn.includes('Long-running tasks, memory and subagents: ' + route), 'EN: Series 2 / chapter 2.6 navigation missing');
check(manifest.includes(route), 'EN: chapter 2.6 manifest route missing');
check(manifest.includes('snippets/articulos-tecnicos/coding-agent-long-task-state.html'), 'EN: chapter 2.6 required snippet missing');

if (failures.length) {
  console.error(`Coding agent harness chapter 2.6 source gate failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Coding agent harness chapter 2.6 source/relationship gate PASS');
console.log(`ES bytes=${Buffer.byteLength(es)} EN bytes=${Buffer.byteLength(en)} visual_blob=${snippetBlobSha}`);