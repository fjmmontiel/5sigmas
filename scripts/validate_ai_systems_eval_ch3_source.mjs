#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const read = (p) => fs.readFile(path.resolve(p), 'utf8');
const [es, en, visual, mirror, i18nRaw, mkEs, mkEn, manifest, workflow] = await Promise.all([
  read('docs/series/evaluating-ai-systems-production/03-llm-as-judge-evaluacion-humana-calibracion-sesgo-varianza-acuerdo.md'),
  read('locales/en/series/evaluating-ai-systems-production/03-llm-as-judge-evaluacion-humana-calibracion-sesgo-varianza-acuerdo.md'),
  read('docs/snippets/articulos-tecnicos/eval-judge-calibration-bias-agreement.html'),
  read('locales/en/snippets/articulos-tecnicos/eval-judge-calibration-bias-agreement.html'),
  read('locales/en/snippets/articulos-tecnicos/eval-judge-calibration-bias-agreement.i18n.json'),
  read('mkdocs.yml'), read('mkdocs.en.yml'), read('locales/en/manifest.yml'), read('.github/workflows/series5-golden-review.yml'),
]);
const i18n = JSON.parse(i18nRaw);
const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); };
const routeEs = 'series/evaluating-ai-systems-production/03-llm-as-judge-evaluacion-humana-calibracion-sesgo-varianza-acuerdo.md';
const routeEn = 'series/evaluating-ai-systems-production/03-llm-as-judge-evaluacion-humana-calibracion-sesgo-varianza-acuerdo.md';
const visualPath = 'snippets/articulos-tecnicos/eval-judge-calibration-bias-agreement.html';
const staleRouteEn = 'series/evaluating-ai-systems-production/03-llm-as-judge-human-evaluation-calibration-bias-variance-agreement.md';

// Publication surfaces: keep DRAFTING fail-closed until the chapter is wired everywhere.
check(mkEs.includes(routeEs), 'ES: chapter 5.3 navigation missing');
check(mkEn.includes(routeEn), 'EN: chapter 5.3 navigation missing');
check(manifest.includes(`  - ${routeEn}`), 'EN: chapter 5.3 missing from published_routes');
check(manifest.includes(`  - ${visualPath}`), 'EN: chapter 5.3 visual missing from required_snippets');
check(manifest.includes('route_strategy: preserve-source-slugs'), 'EN: locale manifest must preserve canonical source slugs');
check(routeEn === routeEs, 'EN: chapter 5.3 route must preserve canonical source slug');
check(!mkEn.includes(staleRouteEn), 'EN: stale native-English chapter route remains in navigation');
check(!manifest.includes(`  - ${staleRouteEn}`), 'EN: stale native-English chapter route remains in manifest');
check(workflow.includes('validate_ai_systems_eval_ch3_source.mjs'), 'CI: 5.3 source gate missing from permanent review');
check(workflow.includes('validate_ai_systems_eval_ch3_accessibility.mjs'), 'CI: 5.3 accessibility gate missing from permanent review');

for (const url of [
  'https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents',
  'https://platform.openai.com/docs/api-reference/graders',
  'https://arxiv.org/abs/2306.05685',
  'https://arxiv.org/abs/2406.07791',
  'https://doi.org/10.1177/001316446002000104',
]) {
  check(es.includes(url), `ES: missing source ${url}`);
  check(en.includes(url), `EN: missing source ${url}`);
}

for (const [text, locale, anchors] of [
  [es, 'ES', ['Primero define qué significa «calibrar»','Los humanos también necesitan un protocolo','Acuerdo observado: mide primero lo que realmente ocurrió',"Cohen's κ: corregir acuerdo esperado no crea una métrica universal",'Acuerdo con humanos no demuestra validez del criterio','Varianza: un solo juicio puede esconder inestabilidad','Position bias: el control mínimo es invertir el orden','Calibración práctica: no uses el holdout para escribir el prompt del juez','Un gate de aceptación del juez','Implicación de producción']],
  [en, 'EN', ['Define what "calibration" means first','Humans need a protocol too','Observed agreement: measure what actually happened first',"Cohen's κ: correcting expected agreement does not create a universal score",'Human agreement does not prove criterion validity','Variance: one judgment can hide instability','Position bias: the minimum control is to reverse the order','Practical calibration: do not use the holdout to write the judge prompt','A judge acceptance gate','Production implication']],
]) for (const a of anchors) check(text.includes(a), `${locale}: missing concept ${a}`);

for (const text of [es, en]) {
  for (const token of ['p_o =','\\kappa =','p_e','SC =','\\hat{\\sigma}^2_i','judge_revision fixed','rubric_revision fixed','validation_set_version:','position_randomization:','adjudication_status:']) check(text.includes(token), `Missing token ${token}`);
  check(text.includes('72') && text.includes('14') && text.includes('0.86') && text.includes('0.578'), 'Agreement/kappa arithmetic missing or drifted');
  check(text.includes('A/B') && text.includes('B/A'), 'Position-swap control missing');
  check(text.includes('unknown'), 'Insufficient-evidence escape hatch missing');
}

const esPlain = es.replace(/\*\*/g, '');
const enPlain = en.replace(/\*\*/g, '');
check(esPlain.includes('no es automáticamente una probabilidad'), 'ES: score/probability caveat missing');
check(enPlain.includes('not automatically a probability'), 'EN: score/probability caveat missing');
check(esPlain.includes('No existe un threshold universal de κ'), 'ES: universal-threshold caveat missing');
check(enPlain.includes('There is no universal κ'), 'EN: universal-threshold caveat missing');
check(esPlain.includes('No significa que las preferencias sean correctas'), 'ES: swap correctness caveat missing');
check(enPlain.includes('It does not mean the preferences are correct'), 'EN: swap correctness caveat missing');
check(!/^\s*-\s+.+;\s*$/m.test(en), 'EN: semicolon-list anti-pattern detected');

for (const [pattern, label] of [
  [/LLM(?:-| )as(?:-| )a(?:-| )judge[^\n]{0,100}\b(?:is|are)\b (?:ground truth|objective truth)/i,'judge=truth'],
  [/human agreement[^\n]{0,80}\b(?:proves|guarantees)\b validity/i,'agreement=validity'],
  [/(?:kappa|κ)[^\n]{0,80}\b(?:is|equals|serves as)\b[^\n]{0,25}(?:a )?universal (?:threshold|score)/i,'kappa universal'],
  [/(?:score|rating)[^\n]{0,50}\b(?:is|equals)\b (?:a )?probability/i,'score=probability'],
]) {
  check(!pattern.test(es), `ES: forbidden overclaim ${label}`);
  check(!pattern.test(en), `EN: forbidden overclaim ${label}`);
}

const include = '{{ include_html("snippets/articulos-tecnicos/eval-judge-calibration-bias-agreement.html") }}';
check(es.includes(include) && en.includes(include), 'ES/EN: 5.3 visual include missing');
for (const token of ['GOLDEN_VISUAL_CONTRACT','interaction="static:no-cosmetic-controls"','mobile="horizontal-scroll-preserves-calibration-to-independent-judgments-to-bias-probes-to-diagnostics-to-scope-decision"','data-boundary="judge-version"','A/B ↔ B/A','ACCEPT','RESTRICT','REJECT']) check(visual.includes(token), `Visual: missing contract token ${token}`);
for (const n of ['construct','rubric','calibration','judge-version','validation-item','blind-randomize','human-raters','llm-repeats','human-raw','llm-raw','adjudication','position-swap','style-control','family-cross','diagnostics','scope-decision','automatic-judge','human-fallback']) check(visual.includes(`data-node="${n}"`), `Visual: missing node ${n}`);
for (const p of ['define','calibrate','freeze','present','human-lane','llm-lane','capture-human','capture-llm','adjudicate','probe-position','probe-style','probe-family','diagnose-human','diagnose-llm','diagnose-adjudicated','scope','accept','fallback']) check(visual.includes(`data-path="${p}"`), `Visual: missing path ${p}`);
check(!visual.includes('data-s5v-stepper') && !visual.includes('s5v__steps--tabs'), 'Visual: cosmetic stepper/tabs detected');
check(visual.includes('adjudica después'), 'Visual: adjudication ordering caveat missing');

check(mirror.trim() === '<!-- 5sigmas-canonical-mirror -->', 'EN: canonical mirror marker invalid');
check(i18n.source === visualPath, 'EN: i18n source path invalid');
const bytes = Buffer.from(visual, 'utf8');
const blobSha = crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes])).digest('hex');
check(i18n.source_blob_sha === blobSha, `EN: stale visual mirror (${i18n.source_blob_sha} != ${blobSha})`);
const englishHas = (token) => visual.includes(token) || Object.values(i18n.replacements).some(v => String(v).includes(token));
for (const token of ['Calibrate before scaling','Product construct','Observable rubric','FROZEN IDENTITY','PRESERVE INDEPENDENT OBSERVATIONS','Raw human labels','Human adjudication','Position swap','TEST BIAS WITH CONTROLLED EXPERIMENTS','Diagnostics','Scope decision','Automatic judge','Human fallback']) check(englishHas(token), `EN visual token missing ${token}`);

if (failures.length) {
  console.error(`AI systems evaluation chapter 5.3 source gate failed (${failures.length}):`);
  failures.forEach(f => console.error(`- ${f}`));
  process.exit(1);
}
console.log('AI systems evaluation chapter 5.3 source gate PASS');
console.log(`ES bytes=${Buffer.byteLength(es)} EN bytes=${Buffer.byteLength(en)} visual_blob=${blobSha}`);
