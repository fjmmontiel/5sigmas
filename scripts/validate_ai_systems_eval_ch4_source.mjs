#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const read = (p) => fs.readFile(path.resolve(p), 'utf8');
const [es, en, visual, mirror, i18nRaw, mkEs, mkEn, manifest, workflow] = await Promise.all([
  read('docs/series/evaluating-ai-systems-production/04-evaluacion-trayectorias-agentes-tools-exito-eficiencia-recuperacion-policy.md'),
  read('locales/en/series/evaluating-ai-systems-production/04-evaluacion-trayectorias-agentes-tools-exito-eficiencia-recuperacion-policy.md'),
  read('docs/snippets/articulos-tecnicos/eval-agent-tool-trajectory-success-recovery-policy.html'),
  read('locales/en/snippets/articulos-tecnicos/eval-agent-tool-trajectory-success-recovery-policy.html'),
  read('locales/en/snippets/articulos-tecnicos/eval-agent-tool-trajectory-success-recovery-policy.i18n.json'),
  read('mkdocs.yml'), read('mkdocs.en.yml'), read('locales/en/manifest.yml'), read('.github/workflows/series5-golden-review.yml'),
]);
const i18n = JSON.parse(i18nRaw);
const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); };
const route = 'series/evaluating-ai-systems-production/04-evaluacion-trayectorias-agentes-tools-exito-eficiencia-recuperacion-policy.md';
const visualPath = 'snippets/articulos-tecnicos/eval-agent-tool-trajectory-success-recovery-policy.html';

// Publication surfaces: keep the chapter fail-closed until it is wired into every canonical surface.
check(mkEs.includes(route), 'ES: chapter 5.4 navigation missing');
check(mkEn.includes(route), 'EN: chapter 5.4 navigation missing');
check(manifest.includes(`  - ${route}`), 'EN: chapter 5.4 missing from published_routes');
check(manifest.includes(`  - ${visualPath}`), 'EN: chapter 5.4 visual missing from required_snippets');
check(manifest.includes('route_strategy: preserve-source-slugs'), 'EN: locale manifest must preserve canonical source slugs');
check(workflow.includes('validate_ai_systems_eval_ch4_source.mjs'), 'CI: 5.4 source gate missing from permanent review');
check(workflow.includes('validate_ai_systems_eval_ch4_accessibility.mjs'), 'CI: 5.4 accessibility gate missing from permanent review');

for (const url of [
  'https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents',
  'https://openai.github.io/openai-agents-python/tracing/',
  'https://github.com/sierra-research/tau2-bench/blob/main/docs/evaluation.md',
  'https://arxiv.org/abs/2603.03116',
]) {
  check(es.includes(url), `ES: missing source ${url}`);
  check(en.includes(url), `EN: missing source ${url}`);
}

for (const [text, locale, anchors] of [
  [es, 'ES', [
    'Una trayectoria es una secuencia de transiciones, no una lista de tool names',
    'Empieza por el outcome: ¿la tarea terminó realmente resuelta?',
    'Policy compliance debe ser no compensatorio cuando la política es dura',
    'Recovery no es contar retries',
    'Stop conditions: acabar bien también significa saber parar',
    'Eficiencia: menos pasos no significa mejor agente',
    'No exijas la «golden trajectory» salvo que el camino sea el objeto de la tarea',
    'Tres familias de graders para una trayectoria',
    'Evita que el grader use el futuro para juzgar el pasado',
    'Diseña el release gate como capas, no como una media opaca',
    'Implicación de producción',
  ]],
  [en, 'EN', [
    'A trajectory is a sequence of transitions, not a list of tool names',
    'Start with the outcome: was the task actually solved?',
    'Hard policy compliance should be non-compensatory',
    'Recovery is not the same as counting retries',
    'Stop conditions: finishing well also means knowing when to stop',
    'Efficiency: fewer steps does not mean a better agent',
    'Do not require a "golden trajectory" unless the path is the task',
    'Three grader families for a trajectory',
    'Do not let the grader use the future to judge the past',
    'Build the release gate as layers, not an opaque average',
    'Production implication',
  ]],
]) for (const anchor of anchors) check(text.includes(anchor), `${locale}: missing concept ${anchor}`);

for (const [text, locale] of [[es, 'ES'], [en, 'EN']]) {
  for (const token of ['e_t =', '\\tau =', 'y(\\tau)', 'S_i =', 'G_i = H_i \\land S_i', 'R_{rec}', 'O_i =', 'C_{success}']) {
    check(text.includes(token), `${locale}: missing trajectory/evaluation token ${token}`);
  }
  for (const token of ['tool_name', 'preconditions observed', 'side_effect_status:', 'state_reconciled_before_retry:', 'post_success_actions', 'hard_policy_violation_rate', 'duplicate_side_effect_count', 'trace_id', 'retry lineage']) {
    check(text.includes(token), `${locale}: missing operational evidence ${token}`);
  }
  check(text.includes('RewardType.ACTION'), `${locale}: exact-path caveat lacks current tau evaluation example`);
  check(text.includes('unknown'), `${locale}: ambiguous-state/insufficient-evidence state missing`);
}

const esPlain = es.replace(/\*\*/g, '');
const enPlain = en.replace(/\*\*/g, '');
check(esPlain.includes('Tener una trace no significa que la trayectoria sea correcta'), 'ES: trace != correctness caveat missing');
check(enPlain.includes('Having a trace does not make the trajectory correct'), 'EN: trace != correctness caveat missing');
check(esPlain.includes('menos pasos no significa mejor agente'), 'ES: fewer-steps anti-pattern caveat missing');
check(enPlain.includes('fewer steps does not mean a better agent'), 'EN: fewer-steps anti-pattern caveat missing');
check(esPlain.includes('No penalices una ruta válida') || visual.includes('No penalices una ruta válida'), 'ES: valid alternate trajectory caveat missing');
check(enPlain.includes('different path and still receive full credit'), 'EN: valid alternate trajectory caveat missing');
check(esPlain.includes('policy FAIL no se promedia con success') || visual.includes('policy FAIL no se promedia con success'), 'ES: non-compensatory policy rule missing');
check(enPlain.includes('A Layer 1 failure should not disappear'), 'EN: non-compensatory policy rule missing');
check(!/^\s*-\s+.+;\s*$/m.test(en), 'EN: semicolon-list anti-pattern detected');

for (const [pattern, label] of [
  [/\ba timeout\s+(?:always\s+)?means\s+(?:the operation\s+)?did not happen/i, 'timeout=no-side-effect'],
  [/(?:fewer|less) (?:steps|tool calls)[^\n]{0,60}(?:always|necessarily) (?:means?|is) better/i, 'fewer-steps=better'],
  [/(?:golden|reference) trajectory[^\n]{0,70}(?:is|equals) (?:the )?(?:only )?(?:correct|valid) path/i, 'reference-path=truth'],
  [/task success[^\n]{0,70}(?:proves|guarantees)[^\n]{0,30}policy compliance/i, 'success=compliance'],
]) {
  check(!pattern.test(es), `ES: forbidden overclaim ${label}`);
  check(!pattern.test(en), `EN: forbidden overclaim ${label}`);
}

const include = '{{ include_html("snippets/articulos-tecnicos/eval-agent-tool-trajectory-success-recovery-policy.html") }}';
check(es.includes(include) && en.includes(include), 'ES/EN: 5.4 visual include missing');
for (const token of [
  'GOLDEN_VISUAL_CONTRACT',
  'interaction="static:no-cosmetic-controls"',
  'mobile="horizontal-scroll-preserves-execution-loop-recovery-branches-parallel-verifiers-and-release-gate"',
  'data-boundary="side-effect-policy"',
  'policy FAIL no se promedia con success',
]) check(visual.includes(token), `Visual: missing contract token ${token}`);

for (const n of [
  'task-policy-state','observation','decision','policy-gate','tool-call','tool-result','policy-deny','state-update',
  'failure-classification','reconcile-state','retry-cancel-fallback','duplicate-hazard','stop-condition','outcome',
  'trajectory-events','trajectory-verifier','outcome-verifier','release-gate','release-pass','release-fail',
]) check(visual.includes(`data-node="${n}"`), `Visual: missing node ${n}`);

for (const p of [
  'start','observe-decide','authorize','call','result','deny','result-success','result-failure','classify-reconcile',
  'reconcile-decision','duplicate','retry-loop','state-loop','state-stop','stop-outcome','measure-trajectory',
  'trajectory-check','outcome-check','trajectory-gate','outcome-gate','gate-pass','gate-fail',
]) check(visual.includes(`data-path="${p}"`), `Visual: missing path ${p}`);

check(!visual.includes('data-s5v-stepper') && !visual.includes('s5v__steps--tabs'), 'Visual: cosmetic stepper/tabs detected');
check(mirror.trim() === '<!-- 5sigmas-canonical-mirror -->', 'EN: canonical mirror marker invalid');
check(i18n.source === visualPath, 'EN: i18n source path invalid');
const bytes = Buffer.from(visual, 'utf8');
const blobSha = crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes])).digest('hex');
check(i18n.source_blob_sha === blobSha, `EN: stale visual mirror (${i18n.source_blob_sha} != ${blobSha})`);
const englishHas = (token) => visual.includes(token) || Object.values(i18n.replacements).some(v => String(v).includes(token));
for (const token of [
  'OUTCOME ≠ TRAJECTORY','EXECUTION: EVERY TRANSITION LEAVES EVIDENCE','Observation','Decision','Precondition gate',
  'RECOVERY: TIMEOUT DOES NOT MEAN','Classify the failure','Reconcile state','Duplicate risk','Stop condition',
  'TWO EVIDENCE OBJECTS','Trajectory verifier','Outcome verifier','NON-COMPENSATORY',
]) check(englishHas(token), `EN visual token missing ${token}`);

if (failures.length) {
  console.error(`AI systems evaluation chapter 5.4 source gate failed (${failures.length}):`);
  failures.forEach(f => console.error(`- ${f}`));
  process.exit(1);
}
console.log('AI systems evaluation chapter 5.4 source gate PASS');
console.log(`ES bytes=${Buffer.byteLength(es)} EN bytes=${Buffer.byteLength(en)} visual_blob=${blobSha}`);
