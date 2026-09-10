#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const [es, en, snippet, mirror, i18nRaw, mkdocsEs, mkdocsEn, manifest] = await Promise.all([
  fs.readFile(path.resolve('docs/series/coding-agents-agent-harnesses/05-tests-verifiers-review-diffs-stop-conditions-evaluacion.md'), 'utf8'),
  fs.readFile(path.resolve('locales/en/series/coding-agents-agent-harnesses/05-tests-verifiers-review-diffs-stop-conditions-evaluacion.md'), 'utf8'),
  fs.readFile(path.resolve('docs/snippets/articulos-tecnicos/coding-agent-verification-stack.html'), 'utf8'),
  fs.readFile(path.resolve('locales/en/snippets/articulos-tecnicos/coding-agent-verification-stack.html'), 'utf8'),
  fs.readFile(path.resolve('locales/en/snippets/articulos-tecnicos/coding-agent-verification-stack.i18n.json'), 'utf8'),
  fs.readFile(path.resolve('mkdocs.yml'), 'utf8'),
  fs.readFile(path.resolve('mkdocs.en.yml'), 'utf8'),
  fs.readFile(path.resolve('locales/en/manifest.yml'), 'utf8'),
]);
const i18n = JSON.parse(i18nRaw);
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const primaryUrls = [
  'https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents',
  'https://docs.github.com/en/copilot/how-tos/copilot-on-github/use-copilot-agents/copilot-code-review',
  'https://docs.github.com/en/copilot/how-tos/copilot-on-github/use-copilot-agents/review-copilot-output',
  'https://github.com/SWE-bench/SWE-bench/blob/main/docs/reference/harness.md',
  'https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/',
  'https://openai.com/index/separating-signal-from-noise-coding-evaluations/',
];
for (const url of primaryUrls) {
  check(es.includes(url), `ES: missing primary source ${url}`);
  check(en.includes(url), `EN: missing primary source ${url}`);
}

const esAnchors = [
  'Test, verifier, reviewer y stop condition no son sinónimos',
  '«Los tests pasan» sólo tiene significado respecto a un contrato',
  'El resultado importa más que una trayectoria ritual',
  'Los verifiers deben observar el efecto real',
  'La evidencia debe estar ligada al candidato exacto',
  'No todo cambio obliga a repetir absolutamente todo',
  'Los tests también son parte del diff y pueden estar equivocados',
  'Diff review cubre preguntas que una suite puede no codificar',
  'Un model reviewer es evidencia probabilística, no un oracle',
  'La revisión también envejece',
  'Stop condition no significa success condition',
  'Un success gate puede expresarse explícitamente',
  'Stop conditions de fallo también protegen calidad y coste',
  'El entorno de evaluación forma parte del resultado',
  'Evaluar un coding agent exige evaluar modelo + harness + tarea + grader',
  'Un benchmark verde también puede medir mal',
  'Una ejecución no estima fiabilidad',
  'Capability eval y regression gate tienen objetivos distintos',
  'Caso trabajado: cerrar correctamente `--json`',
  'Qué debería guardar el harness para poder explicar un cierre',
  'Trade-off: cobertura, latencia y coste de verificación',
  'Implicación de producción: «done» debe ser un estado derivado',
];
const enAnchors = [
  'Tests, verifiers, reviewers, and stop conditions are different objects',
  '“The tests pass” only means something relative to a contract',
  'The outcome matters more than a ritualized trajectory',
  'Verifiers should observe the real effect',
  'Evidence must be bound to the exact candidate',
  'Not every change requires rerunning absolutely everything',
  'Tests are also part of the diff, and they can be wrong',
  'Diff review covers questions a suite may never encode',
  'A model reviewer is probabilistic evidence, not an oracle',
  'Reviews become stale too',
  'A stop condition is not the same as a success condition',
  'A success gate can be made explicit',
  'Failure stop conditions protect quality and cost as well',
  'The evaluation environment is part of the result',
  'Evaluating a coding agent means evaluating model + harness + task + grader',
  'A green benchmark can still measure the wrong thing',
  'One run does not estimate reliability',
  'Capability evals and regression gates answer different questions',
  'Worked example: closing the `--json` task correctly',
  'What the harness should store to explain closure',
  'Trade-off: verification coverage, latency, and cost',
  'Production implication: “done” should be a derived state',
];
for (const anchor of esAnchors) check(es.includes(anchor), `ES: missing concept ${anchor}`);
for (const anchor of enAnchors) check(en.includes(anchor), `EN: missing concept ${anchor}`);

for (const text of [es, en]) {
  for (const token of [
    'candidate_sha', 'contract_version', 'environment_fingerprint', 'verifier_version',
    'required_checks', 'diff_review', 'test_oracle_changed', 'all_evidence_matches_candidate',
    'stop_reason', 'ACCEPTED', 'REWORK_REQUIRED', 'HAND_BACK_TO_HUMAN',
    'BLOCKED_BY_AUTHORITY', 'ENVIRONMENT_FAILURE', 'BUDGET_EXHAUSTED', 'NO_PROGRESS',
    'agent_says_done', 'pass@k', 'pass^k',
  ]) check(text.includes(token), `Missing verification/eval contract token ${token}`);
  for (const symbol of ['C(h)', 'V(h)', 'D(h)', 'P(h)', 'F(h)']) {
    check(text.includes(symbol), `Missing acceptance predicate term ${symbol}`);
  }
}

check(es.includes('84cd120 → NOT YET VERIFIED'), 'ES: candidate-change invalidation example missing');
check(en.includes('84cd120 → NOT YET VERIFIED'), 'EN: candidate-change invalidation example missing');
check(es.includes('verification_result sin candidate identity = evidencia incompleta'), 'ES: candidate-bound evidence invariant missing');
check(en.includes('verification_result without candidate identity = incomplete evidence'), 'EN: candidate-bound evidence invariant missing');
check(es.includes('el benchmark también necesita evaluación'), 'ES: benchmark-audit boundary missing');
check(en.includes('the benchmark also needs evaluation'), 'EN: benchmark-audit boundary missing');
check(es.includes('Ese ~30% es el resultado de esa auditoría concreta'), 'ES: SWE-Bench Pro 30% contextualization missing');
check(en.includes('That ~30% is the result of that specific audit'), 'EN: SWE-Bench Pro 30% contextualization missing');
check(es.includes('bajo trials independientes e idénticamente distribuidos'), 'ES: pass@k independence assumption missing');
check(en.includes('assuming independent and identically distributed trials'), 'EN: pass@k independence assumption missing');
check(es.includes('BLOCKED/UNVERIFIED') && es.includes('no `PASS`'), 'ES: unavailable mandatory verifier fail-closed rule missing');
check(en.includes('BLOCKED/UNVERIFIED') && en.includes('not `PASS`'), 'EN: unavailable mandatory verifier fail-closed rule missing');
check(!/^\s*-\s+.+;\s*$/m.test(en), 'EN: semicolon-list anti-pattern detected');

for (const text of [es, en]) {
  check(!/(?:tests? pass|tests? pasan).*(?:therefore|por tanto|therefore proves|demuestra).*(?:task|tarea).*(?:complete|terminada)/i.test(text), 'Tests incorrectly framed as sufficient proof of completion');
  check(!/(?:reviewer|grader).*(?:ground truth|oracle).*(?:is|es)/i.test(text), 'Reviewer/grader incorrectly framed as ground truth');
  check(!/(?:benchmark score|puntuación.*benchmark).*(?:model alone|modelo en vacío)/i.test(text), 'Benchmark incorrectly framed as model-only measurement');
}

const visualInclude = '{{ include_html("snippets/articulos-tecnicos/coding-agent-verification-stack.html") }}';
check(es.includes(visualInclude), 'ES: verification-stack visual include missing');
check(en.includes(visualInclude), 'EN: verification-stack visual include missing');
for (const token of ['Candidato', 'Checks deterministas', 'Diff review', 'Juicio adicional', 'Freshness gate', 'Decisión']) {
  check(snippet.includes(token), `Visual: verification stage missing ${token}`);
}
check(snippet.includes('cualquier cambio posterior al candidato invalida la evidencia'), 'Visual: evidence invalidation rule missing');
check(mirror.trim() === '<!-- 5sigmas-canonical-mirror -->', 'EN: verification-stack visual mirror marker invalid');
check(i18n.source === 'snippets/articulos-tecnicos/coding-agent-verification-stack.html', 'EN: verification-stack visual i18n source path invalid');
const snippetBytes = Buffer.from(snippet, 'utf8');
const blobHeader = Buffer.from(`blob ${snippetBytes.length}\0`, 'utf8');
const snippetBlobSha = crypto.createHash('sha1').update(Buffer.concat([blobHeader, snippetBytes])).digest('hex');
check(i18n.source_blob_sha === snippetBlobSha, `EN: verification-stack visual source_blob_sha stale (${i18n.source_blob_sha} != ${snippetBlobSha})`);
for (const token of ['Verification · review · stop', '“Done” requires evidence', 'Candidate', 'Deterministic checks', 'Diff review', 'Additional judgment', 'Freshness gate', 'Decision', 'Closure rule']) {
  check(snippet.includes(token) || Object.values(i18n.replacements).some((value) => String(value).includes(token)), `EN visual translation missing ${token}`);
}

const route = 'series/coding-agents-agent-harnesses/05-tests-verifiers-review-diffs-stop-conditions-evaluacion.md';
check(mkdocsEs.includes('Tests, verifiers y evaluación de tareas: ' + route), 'ES: Series 2 / chapter 2.5 navigation missing');
check(mkdocsEn.includes('Tests, verifiers and task evaluation: ' + route), 'EN: Series 2 / chapter 2.5 navigation missing');
check(manifest.includes(route), 'EN: chapter 2.5 manifest route missing');
check(manifest.includes('snippets/articulos-tecnicos/coding-agent-verification-stack.html'), 'EN: chapter 2.5 required snippet missing');

if (failures.length) {
  console.error(`Coding agent harness chapter 2.5 source gate failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Coding agent harness chapter 2.5 source gate PASS');
console.log(`ES bytes=${Buffer.byteLength(es)} EN bytes=${Buffer.byteLength(en)}`);
