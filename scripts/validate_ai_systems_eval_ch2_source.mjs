#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const [es, en, snippet, mirror, i18nRaw, mkdocsEs, mkdocsEn, manifestEn, seriesWorkflow] = await Promise.all([
  fs.readFile(path.resolve('docs/series/evaluating-ai-systems-production/02-offline-eval-sets-curation-hard-negatives-contamination-versioning.md'), 'utf8'),
  fs.readFile(path.resolve('locales/en/series/evaluating-ai-systems-production/02-offline-eval-sets-curation-hard-negatives-contamination-versioning.md'), 'utf8'),
  fs.readFile(path.resolve('docs/snippets/articulos-tecnicos/eval-dataset-lifecycle-hard-negatives-contamination.html'), 'utf8'),
  fs.readFile(path.resolve('locales/en/snippets/articulos-tecnicos/eval-dataset-lifecycle-hard-negatives-contamination.html'), 'utf8'),
  fs.readFile(path.resolve('locales/en/snippets/articulos-tecnicos/eval-dataset-lifecycle-hard-negatives-contamination.i18n.json'), 'utf8'),
  fs.readFile(path.resolve('mkdocs.yml'), 'utf8'),
  fs.readFile(path.resolve('mkdocs.en.yml'), 'utf8'),
  fs.readFile(path.resolve('locales/en/manifest.yml'), 'utf8'),
  fs.readFile(path.resolve('.github/workflows/series5-golden-review.yml'), 'utf8'),
]);

const i18n = JSON.parse(i18nRaw);
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const route = 'series/evaluating-ai-systems-production/02-offline-eval-sets-curation-hard-negatives-contamination-versioning.md';
const visualPath = 'snippets/articulos-tecnicos/eval-dataset-lifecycle-hard-negatives-contamination.html';

check(mkdocsEs.includes('Evaluar sistemas de IA en producción:') && mkdocsEs.includes('Offline eval sets: curación, hard negatives, contaminación y versionado') && mkdocsEs.includes(route), 'ES: Series 5 / chapter 5.2 navigation missing');
check(mkdocsEn.includes('Evaluating AI Systems in Production:') && mkdocsEn.includes('Offline eval sets: curation, hard negatives, contamination, and versioning') && mkdocsEn.includes(route), 'EN: Series 5 / chapter 5.2 navigation missing');
check(manifestEn.includes(`  - ${route}`), 'EN: chapter 5.2 missing from published_routes manifest');
check(manifestEn.includes(`  - ${visualPath}`), 'EN: chapter 5.2 visual missing from required_snippets manifest');
check(seriesWorkflow.includes('node scripts/validate_ai_systems_eval_ch2_source.mjs'), 'CI: chapter 5.2 source gate missing from permanent Series 5 review');
check(seriesWorkflow.includes('node scripts/validate_ai_systems_eval_ch2_accessibility.mjs'), 'CI: chapter 5.2 browser/accessibility gate missing from permanent Series 5 review');

const primaryUrls = [
  'https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents',
  'https://www.nist.gov/news-events/news/2026/07/announcing-nists-artificial-intelligence-technology-evaluation-aite',
  'https://aclanthology.org/2021.naacl-main.324/',
  'https://aclanthology.org/2020.acl-main.441/',
  'https://github.com/LiveBench/LiveBench',
  'https://huggingface.co/docs/datasets/main/loading',
  'https://huggingface.co/docs/datasets/main/about_cache',
  'https://cdn.openai.com/papers/gpt-4.pdf',
];
for (const url of primaryUrls) {
  check(es.includes(url), `ES: missing primary source ${url}`);
  check(en.includes(url), `EN: missing primary source ${url}`);
}

const esAnchors = [
  'El objeto correcto: una versión del eval, no «el dataset»',
  'Empieza por una hipótesis de cobertura',
  'Qué es un hard negative útil',
  'El anti-patrón: generar hard negatives sólo contra el modelo actual',
  'Cuatro tipos de contaminación que no debemos mezclar',
  'Un scanner de duplicados no certifica ausencia de contaminación',
  'Splits que preservan la unidad causal',
  'Dev, regression bank y holdout cumplen funciones diferentes',
  'Un cuarto banco puede ser útil: challenge rotatorio',
  'Versionar significa poder reconstruir el resultado',
  'No reetiquetes el pasado en silencio',
  'Implicación de producción',
];
const enAnchors = [
  'The object is an eval release, not "the dataset"',
  'Start with a coverage hypothesis',
  'What makes a useful hard negative',
  'The anti-pattern: generating every hard case against the current model',
  'Four contamination problems that should not share one label',
  'A duplicate scanner cannot certify the absence of contamination',
  'Split on the unit that can carry leakage',
  'Dev, regression, and holdout banks serve different jobs',
  'A fourth bank can help: a rotating challenge set',
  'Versioning means being able to reconstruct the result',
  'Do not silently relabel history',
  'Production implication',
];
for (const anchor of esAnchors) check(es.includes(anchor), `ES: missing concept ${anchor}`);
for (const anchor of enAnchors) check(en.includes(anchor), `EN: missing concept ${anchor}`);

for (const text of [es, en]) {
  for (const token of ['D_v =', 'PC =', 'O_{\\tau}', 'H_v = SHA256', 'dataset_version: 3.2.0', 'manifest_sha256:', 'hardness_source:', 'split_unit:', 'frozen release holdout', 'rotating challenge bank']) {
    check(text.includes(token), `Missing required dataset-eval token ${token}`);
  }
  check(text.includes('29') && text.includes('31'), 'Hard-pair example must retain both sides of the decision boundary');
  check(text.includes('source_snapshot'), 'Reproducibility record must retain source snapshot/cutoff identity');
  check(text.includes('labeling_guidelines'), 'Reproducibility record must retain labeling-guideline identity');
  check(text.includes('transform_pipeline'), 'Reproducibility record must retain transform-pipeline identity');
}

const esPlain = es.replace(/\*\*/g, '');
const enPlain = en.replace(/\*\*/g, '');
check(esPlain.includes('política de muestreo forma parte de la métrica'), 'ES: sampling-policy/metric boundary missing');
check(enPlain.includes('sampling policy is part of the metric'), 'EN: sampling-policy/metric boundary missing');
check(esPlain.includes('no es una prueba de «dataset limpio»'), 'ES: overlap scan must not certify cleanliness');
check(enPlain.includes('not proof of a "clean dataset"'), 'EN: overlap scan must not certify cleanliness');
check(esPlain.includes('Un holdout que todo el equipo inspecciona a diario deja de actuar como holdout'), 'ES: development-leakage caveat missing');
check(enPlain.includes('A holdout that the whole team reads every day no longer acts as a holdout'), 'EN: development-leakage caveat missing');
check(esPlain.includes('la fecha de snapshot es parte del caso') || esPlain.includes('La fecha de snapshot es parte del caso'), 'ES: temporal leakage snapshot requirement missing');
check(enPlain.includes('The snapshot date is part of the case'), 'EN: temporal leakage snapshot requirement missing');
check(esPlain.includes('no demuestra por sí solo mayor éxito del sistema') || esPlain.includes('No'), 'ES: local/e2e distinction unexpectedly missing');
check(enPlain.includes('does not replace overall accuracy'), 'EN: hard-pair metric scope caveat missing');
check(!/^\s*-\s+.+;\s*$/m.test(en), 'EN: semicolon-list anti-pattern detected');

const forbiddenEn = [
  /overlap scanner (?:proves|guarantees) (?:no|the absence of) contamination/i,
  /fresh (?:data|questions) (?:proves|guarantees) contamination[- ]free/i,
  /hard negative[^\n]{0,100}(?:is simply|means) (?:a )?difficult example/i,
  /holdout[^\n]{0,100}(?:can|should) be used for every iteration/i,
];
for (const pattern of forbiddenEn) check(!pattern.test(en), `EN: forbidden overclaim ${pattern}`);

const visualInclude = '{{ include_html("snippets/articulos-tecnicos/eval-dataset-lifecycle-hard-negatives-contamination.html") }}';
check(es.includes(visualInclude), 'ES: 5.2 visual include missing');
check(en.includes(visualInclude), 'EN: 5.2 visual include missing');
check(snippet.includes('GOLDEN_VISUAL_CONTRACT'), 'Visual: relationship-first contract marker missing');
check(snippet.includes('interaction="static:no-cosmetic-controls"'), 'Visual: cosmetic interaction must be rejected');
check(snippet.includes('mobile="horizontal-scroll-preserves-source-to-release-lifecycle-hard-pair-risk-channels-and-next-version-loop"'), 'Visual: mobile topology preservation contract missing');
check(!snippet.includes('data-s5v-stepper') && !snippet.includes('s5v__steps--tabs'), 'Visual regression: cosmetic tabs/stepper detected');
check(snippet.includes('data-boundary="release"'), 'Visual: frozen release boundary missing');
for (const node of ['source', 'provenance', 'group', 'dev', 'regression', 'holdout', 'challenge', 'manifest', 'hard-context', 'hard-positive', 'hard-negative', 'pair-check', 'training-exposure', 'cross-split', 'development-leakage', 'temporal-leakage', 'scanner', 'production-failure', 'next-version']) {
  check(snippet.includes(`data-node="${node}"`), `Visual: missing mechanism node ${node}`);
}
for (const p of ['admission', 'split', 'freeze', 'hard-pair', 'risk-training', 'risk-cross-split', 'risk-development', 'risk-temporal', 'next-version']) {
  check(snippet.includes(`data-path="${p}"`), `Visual: missing relationship path ${p}`);
}
check(snippet.includes('si optimizas aquí, deja de ser holdout'), 'Visual: development leakage must visibly invalidate holdout status');
check(snippet.includes('Overlap scanner = detector de candidatos, no certificado de limpieza'), 'Visual: overlap scanner scope caveat missing');
check(snippet.includes('no muta D(v) en silencio'), 'Visual: next-version flow must not silently mutate current release');

check(mirror.trim() === '<!-- 5sigmas-canonical-mirror -->', 'EN: visual canonical mirror marker invalid');
check(i18n.source === visualPath, 'EN: visual i18n source path invalid');
const snippetBytes = Buffer.from(snippet, 'utf8');
const blobHeader = Buffer.from(`blob ${snippetBytes.length}\0`, 'utf8');
const snippetBlobSha = crypto.createHash('sha1').update(Buffer.concat([blobHeader, snippetBytes])).digest('hex');
check(i18n.source_blob_sha === snippetBlobSha, `EN: visual source_blob_sha stale (${i18n.source_blob_sha} != ${snippetBlobSha})`);
for (const token of ['Freeze what you compare', 'ADMISSION AND SPLIT', 'FROZEN IDENTITY FOR COMPARISON', 'Holdout / release', 'Rotating challenge', 'HARD PAIR', 'Training exposure', 'Cross-split leakage', 'Development leakage', 'Temporal leakage', 'not a cleanliness certificate', 'Next version D(v+1)', 'does not silently mutate D(v)']) {
  check(Object.values(i18n.replacements).some((value) => String(value).includes(token)), `EN visual translation missing ${token}`);
}

if (failures.length) {
  console.error(`AI systems evaluation chapter 5.2 source gate failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('AI systems evaluation chapter 5.2 source gate PASS');
console.log(`ES bytes=${Buffer.byteLength(es)} EN bytes=${Buffer.byteLength(en)} visual_blob=${snippetBlobSha}`);