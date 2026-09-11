#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const [es, en, snippet, mirror, i18nRaw, mkdocsEs, mkdocsEn, manifest] = await Promise.all([
  fs.readFile(path.resolve('docs/series/coding-agents-agent-harnesses/03-specs-planificacion-task-decomposition-checkpoints.md'), 'utf8'),
  fs.readFile(path.resolve('locales/en/series/coding-agents-agent-harnesses/03-specs-planificacion-task-decomposition-checkpoints.md'), 'utf8'),
  fs.readFile(path.resolve('docs/snippets/articulos-tecnicos/coding-agent-task-contract.html'), 'utf8'),
  fs.readFile(path.resolve('locales/en/snippets/articulos-tecnicos/coding-agent-task-contract.html'), 'utf8'),
  fs.readFile(path.resolve('locales/en/snippets/articulos-tecnicos/coding-agent-task-contract.i18n.json'), 'utf8'),
  fs.readFile(path.resolve('mkdocs.yml'), 'utf8'),
  fs.readFile(path.resolve('mkdocs.en.yml'), 'utf8'),
  fs.readFile(path.resolve('locales/en/manifest.yml'), 'utf8'),
]);
const i18n = JSON.parse(i18nRaw);
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const primaryUrls = [
  'https://learn.chatgpt.com/docs/agent-configuration/agents-md',
  'https://github.com/openai/codex/blob/main/codex-rs/collaboration-mode-templates/templates/plan.md',
  'https://code.claude.com/docs/en/permission-modes',
  'https://code.claude.com/docs/en/checkpointing',
  'https://docs.github.com/en/copilot/how-tos/copilot-on-github/use-copilot-agents/kick-off-a-task',
  'https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-copilot-overview',
  'https://google-gemini.github.io/gemini-cli/docs/cli/checkpointing.html',
];
for (const url of primaryUrls) {
  check(es.includes(url), `ES: missing primary source ${url}`);
  check(en.includes(url), `EN: missing primary source ${url}`);
}

const esAnchors = [
  'La petición no es todavía el contrato',
  'Instrucciones persistentes y spec resuelven problemas diferentes',
  'Un plan es una hipótesis, no la autoridad de la tarea',
  'Replanificar no autoriza a redefinir éxito',
  'El contrato también puede quedarse obsoleto',
  'Task decomposition: una lista no es todavía un grafo',
  'Qué debe contener un nodo de trabajo',
  'Checkpoint no significa lo mismo en todos los harnesses',
  'Un checkpoint útil necesita identidad y límites',
  'Los checkpoints también necesitan invalidación',
  'Stop conditions: cuándo no seguir autónomamente',
  'Completion: terminar nodos no equivale a terminar la tarea',
  'Cómo encajan los siete objetos',
  'Qué deberías registrar en producción',
  'Implicación para producción',
];
const enAnchors = [
  'A request is not yet a contract',
  'Persistent instructions and a task spec solve different problems',
  'A plan is a hypothesis, not the authority for the task',
  'Replanning does not authorize redefining success',
  'The task contract can become stale too',
  'Task decomposition: a list is not yet a graph',
  'What a work node should carry',
  '“Checkpoint” does not mean the same thing in every harness',
  'A useful checkpoint needs identity and limits',
  'Checkpoints need invalidation rules too',
  'Stop conditions: when autonomy should stop',
  'Completion: finishing plan nodes is not finishing the task',
  'How the seven objects fit together',
  'What to record in production',
  'Production implication',
];
for (const anchor of esAnchors) check(es.includes(anchor), `ES: missing concept ${anchor}`);
for (const anchor of enAnchors) check(en.includes(anchor), `EN: missing concept ${anchor}`);

for (const text of [es, en]) {
  for (const token of [
    'task_id', 'contract_version', 'base_sha', 'integration_target', 'in_scope', 'out_of_scope',
    'acceptance', 'stop_if', 'plan_version', 'requirements_source', 'requirements_revision',
    'checkpoint_id', 'workspace_id', 'verification_head_sha', 'final_head_sha', 'cleanup_state',
  ]) check(text.toLowerCase().includes(token.toLowerCase()), `Missing task-contract token ${token}`);
}

check(es.includes('un ejemplo de contrato del harness, no un estándar'), 'ES: illustrative-format caveat missing');
check(en.includes('an illustrative harness contract, not an industry standard'), 'EN: illustrative-format caveat missing');
check(es.includes('la evidencia tiene dependencias'), 'ES: evidence dependency model missing');
check(en.includes('evidence has dependencies'), 'EN: evidence dependency model missing');
check(es.includes('ya no prueba continuidad causal'), 'ES: checkpoint continuity caveat missing');
check(en.includes('they no longer prove causal continuity'), 'EN: checkpoint continuity caveat missing');
check(es.includes('comentarios añadidos después') && es.includes('no ve automáticamente'), 'ES: requirements-snapshot caveat missing');
check(en.includes('later issue comments') && en.includes('does not automatically'), 'EN: requirements-snapshot caveat missing');
check(es.includes('antes de cada prompt del usuario') && es.includes('herramientas de edición de archivos'), 'ES: current Claude checkpoint capture semantics missing');
check(en.includes('before each user prompt') && en.includes('file-editing tools'), 'EN: current Claude checkpoint capture semantics missing');
check(es.includes('cambios producidos directamente por comandos Bash'), 'ES: Claude checkpoint scope limit missing');
check(en.includes('changes made through Bash commands'), 'EN: Claude checkpoint scope limit missing');
check(es.includes('shadow Git repository'), 'ES: Gemini checkpoint mechanism missing');
check(en.includes('shadow Git repository'), 'EN: Gemini checkpoint mechanism missing');
for (const text of [es, en]) {
  check(!/plan (?:is|es) (?:the |la )?(?:task )?(?:spec|contract|contrato)/i.test(text), 'Plan incorrectly equated with task contract');
  check(!/checkpoint (?:guarantees|garantiza) (?:recovery|recuperación|continuity|continuidad)/i.test(text), 'Checkpoint incorrectly asserted to guarantee recovery/continuity');
}
check(!/^\s*-\s+.+;\s*$/m.test(en), 'EN: semicolon-list anti-pattern detected');

const visualInclude = '{{ include_html("snippets/articulos-tecnicos/coding-agent-task-contract.html") }}';
check(es.includes(visualInclude), 'ES: task-contract visual include missing');
check(en.includes(visualInclude), 'EN: task-contract visual include missing');

// Relationship-first visual contract: fail closed against the retired linear card-pipe primitive.
check(snippet.includes('GOLDEN_VISUAL_CONTRACT'), 'Visual: GOLDEN_VISUAL_CONTRACT missing');
for (const key of ['learning-objective=', 'mechanism=', 'visual-variables=', 'why-visual=', 'relationship=', 'interaction="static:no-cosmetic-controls"', 'mobile=']) {
  check(snippet.includes(key), `Visual: contract field missing ${key}`);
}
check(!snippet.includes('s5v-arch-map__pipe'), 'Visual: legacy linear card pipe returned');
check(!snippet.includes('data-s5v-stepper') && !snippet.includes('s5v__steps--tabs'), 'Visual: cosmetic stepper/tabs returned');
for (const token of [
  'data-contract="v1-replan"', 'data-plan="v1"', 'data-observation="invalid-assumption"', 'data-edge="replan-loop"', 'data-plan="v2"',
  'data-authority="product-decision"', 'data-contract="v2"', 'data-graph="v1"', 'data-edge="contract-v2-to-c"',
  'data-edge="amendment-invalidates-evidence"', 'data-evidence="stale-v1"', 'data-evidence="reverified-v2"',
]) check(snippet.includes(token), `Visual: relationship node/edge missing ${token}`);
check(snippet.includes('contract_version=1') && snippet.includes('contract_version=2'), 'Visual: contract-version transition missing');
check(snippet.includes('candidate_sha=C1') && snippet.includes('candidate_sha=C2'), 'Visual: candidate-bound evidence identity missing');
check(snippet.includes('overflow-x:auto') && snippet.includes('tabindex="0"'), 'Visual: mobile topology-preserving focusable scroller missing');
check(snippet.includes('tc-edge--dependency') && snippet.includes('tc-edge--replan') && snippet.includes('tc-edge--invalidate'), 'Visual: dependency/replan/invalidation geometry semantics missing');

check(mirror.trim() === '<!-- 5sigmas-canonical-mirror -->', 'EN: task-contract visual mirror marker invalid');
check(i18n.source === 'snippets/articulos-tecnicos/coding-agent-task-contract.html', 'EN: task-contract visual i18n source path invalid');
const snippetBytes = Buffer.from(snippet, 'utf8');
const blobHeader = Buffer.from(`blob ${snippetBytes.length}\0`, 'utf8');
const snippetBlobSha = crypto.createHash('sha1').update(Buffer.concat([blobHeader, snippetBytes])).digest('hex');
check(i18n.source_blob_sha === snippetBlobSha, `EN: task-contract visual source_blob_sha stale (${i18n.source_blob_sha} != ${snippetBlobSha})`);
for (const token of [
  'Stable contract · revisable strategy', 'Replanning and amending do not invalidate the same things', 'AUTHORITY · WHAT SUCCESS MEANS',
  'STRATEGY · DEPENDENCIES', 'EVIDENCE · FRESHNESS', 'Contract v1 remains fixed', 'replan · contract unchanged',
  'EXTERNAL AUTHORITY', 'Contract v2', 'propagates invalidation', 'STALE for acceptance v2', 'Reverify v2',
]) check(Object.values(i18n.replacements).some((value) => String(value).includes(token)), `EN visual translation missing ${token}`);

const route = 'series/coding-agents-agent-harnesses/03-specs-planificacion-task-decomposition-checkpoints.md';
check(mkdocsEs.includes('Specs, planificación y checkpoints: ' + route), 'ES: Series 2 / chapter 2.3 navigation missing');
check(mkdocsEn.includes('Specs, planning and checkpoints: ' + route), 'EN: Series 2 / chapter 2.3 navigation missing');
check(manifest.includes(route), 'EN: chapter 2.3 manifest route missing');
check(manifest.includes('snippets/articulos-tecnicos/coding-agent-task-contract.html'), 'EN: chapter 2.3 required snippet missing');

if (failures.length) {
  console.error(`Coding agent harness chapter 2.3 source gate failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Coding agent harness chapter 2.3 source + relationship-first visual gate PASS');
console.log(`ES bytes=${Buffer.byteLength(es)} EN bytes=${Buffer.byteLength(en)} visual_blob=${snippetBlobSha}`);