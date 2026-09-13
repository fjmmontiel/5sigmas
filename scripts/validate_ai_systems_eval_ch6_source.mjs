#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const read = (p) => fs.readFile(path.resolve(p), 'utf8');
const [es, en, visual, mirror, i18nRaw, mkEs, mkEn, manifest, workflow] = await Promise.all([
  read('docs/series/evaluating-ai-systems-production/06-observability-failure-taxonomies-production-eval-repair-feedback-loops.md'),
  read('locales/en/series/evaluating-ai-systems-production/06-observability-failure-taxonomies-production-eval-repair-feedback-loops.md'),
  read('docs/snippets/articulos-tecnicos/eval-production-feedback-loop.html'),
  read('locales/en/snippets/articulos-tecnicos/eval-production-feedback-loop.html'),
  read('locales/en/snippets/articulos-tecnicos/eval-production-feedback-loop.i18n.json'),
  read('mkdocs.yml'), read('mkdocs.en.yml'), read('locales/en/manifest.yml'), read('.github/workflows/series5-golden-review.yml'),
]);
const i18n = JSON.parse(i18nRaw);
const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); };
const route = 'series/evaluating-ai-systems-production/06-observability-failure-taxonomies-production-eval-repair-feedback-loops.md';
const visualPath = 'snippets/articulos-tecnicos/eval-production-feedback-loop.html';

check(mkEs.includes(route), 'ES: chapter 5.6 navigation missing');
check(mkEn.includes(route), 'EN: chapter 5.6 navigation missing');
check(manifest.includes(`  - ${route}`), 'EN: chapter 5.6 missing from published_routes');
check(manifest.includes(`  - ${visualPath}`), 'EN: chapter 5.6 visual missing from required_snippets');
check(manifest.includes('route_strategy: preserve-source-slugs'), 'EN: locale manifest must preserve canonical source slugs');
check(workflow.includes('validate_ai_systems_eval_ch6_source.mjs'), 'CI: 5.6 source gate missing from permanent review');
check(workflow.includes('validate_ai_systems_eval_ch6_accessibility.mjs'), 'CI: 5.6 accessibility gate missing from permanent review');

for (const url of [
  'https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents',
  'https://openai.github.io/openai-agents-python/tracing/',
  'https://opentelemetry.io/docs/specs/semconv/registry/attributes/gen-ai/',
  'https://opentelemetry.io/docs/specs/semconv/',
  'https://airc.nist.gov/airmf-resources/playbook/manage/',
  'https://airc.nist.gov/airmf-resources/playbook/measure/',
]) {
  check(es.includes(url), `ES: missing primary source ${url}`);
  check(en.includes(url), `EN: missing primary source ${url}`);
}

for (const [text, locale, anchors] of [
  [es, 'ES', [
    'Observabilidad y evaluación responden preguntas distintas',
    'Primero conserva una identidad reproducible del sistema',
    'Un trace útil preserva causalidad, no todos los bytes',
    'De la anomalía a una taxonomía de fallos',
    'Un incidente no es todavía un eval case',
    'Reproducibilidad decide qué tipo de gate necesitas',
    'No sobreajustes el regression suite a incidentes individuales',
    'El grader también puede ser el fallo',
    'Repair loop: prueba la causa, no sólo que desaparece el síntoma',
    'El loop necesita ownership y estado explícitos',
    'Producción no reemplaza el eval; el eval no reemplaza producción',
    'Regla de producción',
  ]],
  [en, 'EN', [
    'Observability and evaluation answer different questions',
    'Preserve a reproducible system identity first',
    'A useful trace preserves causality, not every byte',
    'From anomaly to failure taxonomy',
    'An incident is not an eval case yet',
    'Reproducibility decides which gate you need',
    'Do not overfit the regression suite to individual incidents',
    'The grader can also be the failure',
    'Repair loop: test the cause, not only the disappearance of the symptom',
    'The loop needs ownership and explicit states',
    'Production does not replace evals; evals do not replace production',
    'Production rule',
  ]],
]) for (const anchor of anchors) check(text.includes(anchor), `${locale}: missing concept ${anchor}`);

for (const [text, locale] of [[es, 'ES'], [en, 'EN']]) {
  for (const token of [
    'candidate_id', 'trace_id', 'INSUFFICIENT_EVIDENCE', 'DUPLICATE_MECHANISM',
    'GRADER_DEFECT', 'INSTRUMENTATION_DEFECT', 'VERIFIED_IN_PRODUCTION',
    'failure_family_rate', 'recurrence_after_fix', 'mean_time_to_verified_repair',
  ]) check(text.includes(token), `${locale}: missing operational token ${token}`);
  check(text.includes('symptom') && text.includes('cause'), `${locale}: symptom/cause separation missing`);
  check(text.includes('deduplic') || text.includes('deduplica'), `${locale}: mechanism deduplication missing`);
  check(text.includes('neighbor') && text.includes('hard negative'), `${locale}: neighbor/hard-negative protection missing`);
  check(text.includes('privacy') || text.includes('privacidad'), `${locale}: privacy boundary missing`);
  check(text.includes('verifier') && text.includes('version'), `${locale}: verifier-version provenance missing`);
  check(text.includes('instrumentation') || text.includes('instrumentación'), `${locale}: instrumentation-defect path missing`);
  check(text.includes('shadow') && text.includes('canary'), `${locale}: controlled release bridge to chapter 5.5 missing`);
}

const esPlain = es.replace(/\*\*/g, '');
const enPlain = en.replace(/\*\*/g, '');
check(esPlain.includes('telemetry → hipótesis; reproducción + criterio → evidencia de eval'), 'ES: telemetry != verdict rule missing');
check(enPlain.includes('telemetry → hypothesis; reproduction + criterion → eval evidence'), 'EN: telemetry != verdict rule missing');
check(esPlain.includes('Observabilidad no autoriza copiar conversaciones de producción al eval set'), 'ES: production-data privacy rule missing');
check(enPlain.includes('Observability does not authorize copying production conversations into an eval set'), 'EN: production-data privacy rule missing');
check(esPlain.includes('Un incidente no es todavía un eval case'), 'ES: incident != test boundary missing');
check(enPlain.includes('An incident is not an eval case yet'), 'EN: incident != test boundary missing');
check(esPlain.includes('Una modificación del grader es una modificación del oracle'), 'ES: grader/oracle change rule missing');
check(enPlain.includes('Changing a grader changes the oracle'), 'EN: grader/oracle change rule missing');
check(esPlain.includes('REGRESSION_PASS` no equivale a `VERIFIED_IN_PRODUCTION'), 'ES: regression pass != live verification rule missing');
check(enPlain.includes('`REGRESSION_PASS` is not `VERIFIED_IN_PRODUCTION`'), 'EN: regression pass != live verification rule missing');
check(!/^\s*-\s+.+;\s*$/m.test(en), 'EN: semicolon-list anti-pattern detected');

for (const [pattern, label] of [
  [/(?:telemetry|trace|metric)[^\n]{0,80}(?:equals|proves|is(?!\s+(?:not|never)))[^\n]{0,40}(?:correctness|quality|root cause|eval verdict)/i, 'telemetry=verdict'],
  [/(?:incident|ticket)[^\n]{0,80}(?:must|should always)[^\n]{0,25}(?:become|turn into)[^\n]{0,25}(?:eval|test)/i, 'incident=mandatory-test'],
  [/passing (?:the )?(?:test|eval)[^\n]{0,80}(?:proves|guarantees)[^\n]{0,35}(?:root cause|fixed in production)/i, 'pass=root-cause/live-proof'],
  [/(?:trace all|record all|log all)[^\n]{0,80}(?:safe|best|always)/i, 'log-everything'],
  [/(?:OpenTelemetry|OpenAI Agents SDK)[^\n]{0,100}(?:guarantees|proves)[^\n]{0,40}(?:correctness|reliability|safety)/i, 'tooling=correctness'],
]) {
  check(!pattern.test(es), `ES: forbidden overclaim ${label}`);
  check(!pattern.test(en), `EN: forbidden overclaim ${label}`);
}

const include = '{{ include_html("snippets/articulos-tecnicos/eval-production-feedback-loop.html") }}';
check(es.includes(include) && en.includes(include), 'ES/EN: 5.6 visual include missing');
for (const token of [
  'GOLDEN_VISUAL_CONTRACT',
  'interaction="static:no-cosmetic-controls"',
  'mobile="horizontal-scroll-preserves-observation-diagnosis-eval-release-and-closed-loop-order"',
  'data-boundary="observation-boundary"',
  'data-boundary="diagnosis-boundary"',
  'data-boundary="eval-boundary"',
  'data-boundary="evidence-boundary"',
]) check(visual.includes(token), `Visual: missing contract token ${token}`);
for (const n of ['signals','reconstruct','instrumentation','taxonomy','sufficiency','redact','dedupe','versioned-eval','repair','regression','controlled-release','deploy','verify-production','receipt','eval-receipt','release-receipt']) {
  check(visual.includes(`data-node="${n}"`), `Visual: missing node ${n}`);
}
check(!visual.includes('data-s5v-stepper') && !visual.includes('s5v__steps--tabs'), 'Visual: cosmetic stepper/tabs detected');
check(mirror.trim() === '<!-- 5sigmas-canonical-mirror -->', 'EN: canonical mirror marker invalid');
check(i18n.source === visualPath, 'EN: i18n source path invalid');
const bytes = Buffer.from(visual, 'utf8');
const blobSha = crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes])).digest('hex');
check(i18n.source_blob_sha === blobSha, `EN: stale visual mirror (${i18n.source_blob_sha} != ${blobSha})`);
const englishHas = (token) => visual.includes(token) || Object.values(i18n.replacements).some(v => String(v).includes(token));
for (const token of ['TELEMETRY ≠ VERDICT','OBSERVATION — WHAT HAPPENED','DIAGNOSIS — SYMPTOM ≠ CAUSE','EVAL — INCIDENT ≠ TEST','Enough evidence?','Improve instrumentation','Versioned eval','Verify production','PASS ≠ CLOSED LOOP']) {
  check(englishHas(token), `EN visual token missing ${token}`);
}

if (failures.length) {
  console.error(`AI systems evaluation chapter 5.6 source gate failed (${failures.length}):`);
  failures.forEach(f => console.error(`- ${f}`));
  process.exit(1);
}
console.log('AI systems evaluation chapter 5.6 source gate PASS');
console.log(`ES bytes=${Buffer.byteLength(es)} EN bytes=${Buffer.byteLength(en)} visual_blob=${blobSha}`);
