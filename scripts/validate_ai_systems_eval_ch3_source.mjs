#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const [es, en, snippet, mirror, i18nRaw, mkdocsEs, mkdocsEn, manifestEn, seriesWorkflow] = await Promise.all([
  fs.readFile(path.resolve('docs/series/evaluating-ai-systems-production/03-llm-as-judge-evaluacion-humana-calibracion-sesgo-varianza-acuerdo.md'), 'utf8'),
  fs.readFile(path.resolve('locales/en/series/evaluating-ai-systems-production/03-llm-as-judge-human-evaluation-calibration-bias-variance-agreement.md'), 'utf8'),
  fs.readFile(path.resolve('docs/snippets/articulos-tecnicos/eval-judge-calibration-bias-agreement.html'), 'utf8'),
  fs.readFile(path.resolve('locales/en/snippets/articulos-tecnicos/eval-judge-calibration-bias-agreement.html'), 'utf8'),
  fs.readFile(path.resolve('locales/en/snippets/articulos-tecnicos/eval-judge-calibration-bias-agreement.i18n.json'), 'utf8'),
  fs.readFile(path.resolve('mkdocs.yml'), 'utf8'),
  fs.readFile(path.resolve('mkdocs.en.yml'), 'utf8'),
  fs.readFile(path.resolve('locales/en/manifest.yml'), 'utf8'),
  fs.readFile(path.resolve('.github/workflows/series5-golden-review.yml'), 'utf8'),
]);

const i18n = JSON.parse(i18nRaw);
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const routeEs = 'series/evaluating-ai-systems-production/03-llm-as-judge-evaluacion-humana-calibracion-sesgo-varianza-acuerdo.md';
const routeEn = 'series/evaluating-ai-systems-production/03-llm-as-judge-human-evaluation-calibration-bias-variance-agreement.md';
const visualPath = 'snippets/articulos-tecnicos/eval-judge-calibration-bias-agreement.html';

// Publication integration is intentionally fail-closed: a drafted chapter is not GOLDEN until every surface knows it.
check(mkdocsEs.includes('LLM-as-judge') && mkdocsEs.includes(routeEs), 'ES: Series 5 / chapter 5.3 navigation missing');
check(mkdocsEn.includes('LLM-as-a-judge') && mkdocsEn.includes(routeEn), 'EN: Series 5 / chapter 5.3 navigation missing');
check(manifestEn.includes(`  - ${routeEn}`), 'EN: chapter 5.3 missing from published_routes manifest');
check(manifestEn.includes(`  - ${visualPath}`), 'EN: chapter 5.3 visual missing from required_snippets manifest');
check(seriesWorkflow.includes('node scripts/validate_ai_systems_eval_ch3_source.mjs'), 'CI: chapter 5.3 source gate missing from permanent Series 5 review');
check(seriesWorkflow.includes('node scripts/validate_ai_systems_eval_ch3_accessibility.mjs'), 'CI: chapter 5.3 browser/accessibility gate missing from permanent Series 5 review');

const primaryUrls = [
  'https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents',
  'https://platform.openai.com/docs/api-reference/graders',
  'https://arxiv.org/abs/2306.05685',
  'https://arxiv.org/abs/2406.07791',
  'https://doi.org/10.1177/001316446002000104',
];
for (const url of primaryUrls) {
  check(es.includes(url), `ES: missing primary source ${url}`);
  check(en.includes(url), `EN: missing primary source ${url}`);
}

const esAnchors = [
  'Primero define qué significa «calibrar»',
  'Elige primero el tipo de grader más estrecho que resuelva la pregunta',
  'Los humanos también necesitan un protocolo',
  'Acuerdo observado: mide primero lo que realmente ocurrió',
  "Cohen's κ: corregir acuerdo esperado no crea una métrica universal",
  'Acuerdo con humanos no demuestra validez del criterio',
  'Varianza: un solo juicio puede esconder inestabilidad',
  'Position bias: el control mínimo es invertir el orden',
  'Verbosidad y estilo: controla contenido antes de atribuir el sesgo',
  'Self-preference y familia del juez: cruza generadores y jueces',
  'Calibración práctica: no uses el holdout para escribir el prompt del juez',
  'Un gate de aceptación del juez',
  'Implicación de producción',
];
const enAnchors = [
  'Define what "calibration" means first',
  'Choose the narrowest grader that answers the question',
  'Humans need a protocol too',
  'Observed agreement: measure what actually happened first',
  "Cohen's κ: correcting expected agreement does not create a universal score",
  'Human agreement does not prove criterion validity',
  'Variance: one judgment can hide instability',
  'Position bias: the minimum control is to reverse the order',
  'Verbosity and style: control content before calling it bias',
  'Self-preference and judge family: cross generators and judges',
  'Practical calibration: do not use the holdout to write the judge prompt',
  'A judge acceptance gate',
  'Production implication',
];
for (const anchor of esAnchors) check(es.includes(anchor), `ES: missing concept ${anchor}`);
for (const anchor of enAnchors) check(en.includes(anchor), `EN: missing concept ${anchor}`);

for (const text of [es, en]) {
  for (const token of ['p_o =', '\\kappa =', 'p_e', 'SC =', '\\hat{\\sigma}^2_i', 'judge_revision fixed', 'rubric_revision fixed', 'validation_set_version:', 'position_randomization:', 'adjudication_status:']) {
    check(text.includes(token), `Missing required judge-eval token ${token}`);
  }
  check(text.includes('72') && text.includes('14') && text.includes('0.86') && text.includes('0.578'), 'Agreement/kappa illustrative arithmetic drifted or disappeared');
  check(text.includes('A/B') && text.includes('B/A'), 'Position-swap probe missing');
  check(text.includes('unknown'), 'Insufficient-evidence label/escape hatch missing');
}

const esPlain = es.replace(/\*\*/g, '');
const enPlain = en.replace(/\*\*/g, '');
check(esPlain.includes('no es automáticamente una probabilidad'), 'ES: ordinal score/probability caveat missing');
check(enPlain.includes('not automatically a probability'), 'EN: ordinal score/probability caveat missing');
check(esPlain.includes('No existe un threshold universal de κ'), 'ES: no-universal-threshold caveat missing');
check(enPlain.includes('There is no universal κ'), 'EN: no-universal-threshold caveat missing');
check(esPlain.includes('No significa que las preferencias sean correctas'), 'ES: swap consistency correctness caveat missing');
check(enPlain.includes('It does not mean the preferences are correct'), 'EN: swap consistency correctness caveat missing');
check(esPlain.includes('No al revés'), 'ES: construct-before-agreement ordering missing');
check(enPlain.includes('not the reverse'), 'EN: construct-before-agreement ordering missing');
check(!/^\s*-\s+.+;\s*$/m.test(en), 'EN: semicolon-list anti-pattern detected');

const forbidden = [
  /LLM(?:-| )as(?:-| )a(?:-| )judge[^\n]{0,120}(?:is|are) (?:ground truth|objective truth)/i,
  /human agreement[^\n]{0,100}(?:proves|guarantees) validity/i,
  /(?:kappa|κ)[^\n]{0,100}\b(?:is|equals|serves as)\b[^\n]{0,30}(?:a )?universal (?:threshold|score)/i,
  /(?:score|rating)[^\n]{0,60}\b(?:is|equals)\b (?:a )?probability/i,
  /strongest model[^\n]{0,100}(?:eliminates|removes) bias/i,
];
for (const pattern of forbidden) {
  check(!pattern.test(es), `ES: forbidden overclaim ${pattern}`);
  check(!pattern.test(en), `EN: forbidden overclaim ${pattern}`);
}

const visualInclude = '{{ include_html("snippets/articulos-tecnicos/eval-judge-calibration-bias-agreement.html") }}';
check(es.includes(visualInclude), 'ES: 5.3 visual include missing');
check(en.includes(visualInclude), 'EN: 5.3 visual include missing');
check(snippet.includes('GOLDEN_VISUAL_CONTRACT'), 'Visual: relationship-first contract marker missing');
check(snippet.includes('interaction="static:no-cosmetic-controls"'), 'Visual: cosmetic interaction must be rejected');
check(snippet.includes('mobile="horizontal-scroll-preserves-calibration-to-independent-judgments-to-bias-probes-to-diagnostics-to-scope-decision"'), 'Visual: mobile topology preservation contract missing');
check(!snippet.includes('data-s5v-stepper') && !snippet.includes('s5v__steps--tabs'), 'Visual regression: cosmetic tabs/stepper detected');
check(snippet.includes('data-boundary="judge-version"'), 'Visual: frozen judge-version boundary missing');
for (const node of ['construct', 'rubric', 'calibration', 'judge-version', 'validation-item', 'blind-randomize', 'human-raters', 'llm-repeats', 'human-raw', 'llm-raw', 'adjudication', 'position-swap', 'style-control', 'family-cross', 'diagnostics', 'scope-decision', 'automatic-judge', 'human-fallback']) {
  check(snippet.includes(`data-node="${node}"`), `Visual: missing mechanism node ${node}`);
}
for (const p of ['define', 'calibrate', 'freeze', 'present', 'human-lane', 'llm-lane', 'capture-human', 'capture-llm', 'adjudicate', 'probe-position', 'probe-style', 'probe-family', 'diagnose-human', 'diagnose-llm', 'diagnose-adjudicated', 'scope', 'accept', 'fallback']) {
  check(snippet.includes(`data-path="${p}"]`), `Visual: missing relationship path ${p}`);
}
check(snippet.includes('adjudica después'), 'Visual: raw independent judgments must precede adjudication');
check(snippet.includes('A/B ↔ B/A'), 'Visual: position-swap probe missing');
check(snippet.includes('ACCEPT') && snippet.includes('RESTRICT') && snippet.includes('REJECT'), 'Visual: scoped judge decision missing');

check(mirror.trim() === '<!-- 5sigmas-canonical-mirror -->', 'EN: visual canonical mirror marker invalid');
check(i18n.source === visualPath, 'EN: visual i18n source path invalid');
const snippetBytes = Buffer.from(snippet, 'utf8');
const blobHeader = Buffer.from(`blob ${snippetBytes.length}\0`, 'utf8');
const snippetBlobSha = crypto.createHash('sha1').update(Buffer.concat([blobHeader, snippetBytes])).digest('hex');
check(i18n.source_blob_sha === snippetBlobSha, `EN: visual source_blob_sha stale (${i18n.source_blob_sha} != ${snippetBlobSha})`);
const visualEnglishHas = (token) => snippet.includes(token) || Object.values(i18n.replacements).some((value) => String(value).includes(token));
for (const token of ['Calibrate before scaling', 'Product construct', 'Observable rubric', 'FROZEN IDENTITY', 'PRESERVE INDEPENDENT OBSERVATIONS', 'Raw human labels', 'Human adjudication', 'Position swap', 'TEST BIAS WITH CONTROLLED EXPERIMENTS', 'Diagnostics', 'Scope decision', 'Automatic judge', 'Human fallback']) {
  check(visualEnglishHas(token), `EN visual translation/native token missing ${token}`);
}

if (failures.length) {
  console.error(`AI systems evaluation chapter 5.3 source gate failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('AI systems evaluation chapter 5.3 source gate PASS');
console.log(`ES bytes=${Buffer.byteLength(es)} EN bytes=${Buffer.byteLength(en)} visual_blob=${snippetBlobSha}`);
