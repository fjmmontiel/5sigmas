#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const [es, en, snippet, mirror, i18nRaw, mkdocsEs, mkdocsEn, manifestEn, seriesWorkflow] = await Promise.all([
  fs.readFile(path.resolve('docs/series/evaluating-ai-systems-production/01-que-evaluar-modelo-componente-sistema-workflow-trayectoria.md'), 'utf8'),
  fs.readFile(path.resolve('locales/en/series/evaluating-ai-systems-production/01-que-evaluar-modelo-componente-sistema-workflow-trayectoria.md'), 'utf8'),
  fs.readFile(path.resolve('docs/snippets/articulos-tecnicos/eval-boundary-system-workflow-trajectory.html'), 'utf8'),
  fs.readFile(path.resolve('locales/en/snippets/articulos-tecnicos/eval-boundary-system-workflow-trajectory.html'), 'utf8'),
  fs.readFile(path.resolve('locales/en/snippets/articulos-tecnicos/eval-boundary-system-workflow-trajectory.i18n.json'), 'utf8'),
  fs.readFile(path.resolve('mkdocs.yml'), 'utf8'),
  fs.readFile(path.resolve('mkdocs.en.yml'), 'utf8'),
  fs.readFile(path.resolve('locales/en/manifest.yml'), 'utf8'),
  fs.readFile(path.resolve('.github/workflows/series5-golden-review.yml'), 'utf8'),
]);

const i18n = JSON.parse(i18nRaw);
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const route = 'series/evaluating-ai-systems-production/01-que-evaluar-modelo-componente-sistema-workflow-trayectoria.md';
const visualPath = 'snippets/articulos-tecnicos/eval-boundary-system-workflow-trajectory.html';

check(mkdocsEs.includes('Evaluar sistemas de IA en producción:') && mkdocsEs.includes(`Qué evaluar: modelo, componente, sistema, workflow y trayectoria: ${route}`), 'ES: Series 5 / chapter 5.1 navigation missing');
check(mkdocsEn.includes('Evaluating AI Systems in Production:') && mkdocsEn.includes(`What to evaluate: model, component, system, workflow, and trajectory: ${route}`), 'EN: Series 5 / chapter 5.1 navigation missing');
check(manifestEn.includes(`  - ${route}`), 'EN: chapter 5.1 missing from published_routes manifest');
check(manifestEn.includes(`  - ${visualPath}`), 'EN: chapter 5.1 visual missing from required_snippets manifest');
check(seriesWorkflow.includes('node scripts/validate_ai_systems_eval_ch1_source.mjs'), 'CI: chapter 5.1 source gate missing from permanent Series 5 review');
check(seriesWorkflow.includes('node scripts/validate_ai_systems_eval_ch1_accessibility.mjs'), 'CI: chapter 5.1 browser/accessibility gate missing from permanent Series 5 review');

const primaryUrls = [
  'https://www.nist.gov/news-events/news/2026/07/announcing-nists-artificial-intelligence-technology-evaluation-aite',
  'https://www.nist.gov/artificial-intelligence/ai-research/tevv-athlon-framework-evaluating-ai-systems',
  'https://github.com/mlcommons/inference_policies/blob/master/inference_rules.adoc',
  'https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents',
  'https://openai.com/index/introducing-agentkit/',
  'https://evals.openai.com/',
  'https://deepmind.google/models/model-cards/gemini-3-5-flash/',
];
for (const url of primaryUrls) {
  check(es.includes(url), `ES: missing primary source ${url}`);
  check(en.includes(url), `EN: missing primary source ${url}`);
}

const esAnchors = [
  'La evaluación empieza definiendo el objeto, no la métrica',
  'Nivel 1 — Evaluar el modelo',
  'Nivel 2 — Evaluar un componente',
  'Nivel 3 — Evaluar el workflow',
  'Nivel 4 — Evaluar la trayectoria',
  'Resultado y trayectoria responden preguntas diferentes',
  'Nivel 5 — Evaluar el sistema',
  'La regla central: frontera estrecha para diagnosticar; frontera amplia para confirmar',
  'Atribución causal: cambiar una cosa y mantener el resto fijo',
  'El anti-patrón: una única «eval score» para todo',
  'El trial también es una unidad de evidencia',
  'Implicación de producción',
];
const enAnchors = [
  'Start by defining the object, not the metric',
  'Level 1 — Evaluate the model',
  'Level 2 — Evaluate a component',
  'Level 3 — Evaluate the workflow',
  'Level 4 — Evaluate the trajectory',
  'Outcome and trajectory answer different questions',
  'Level 5 — Evaluate the system',
  'The central rule: narrow to diagnose, broad to confirm',
  'Causal attribution means changing one thing at a time',
  'The anti-pattern: one “eval score” for everything',
  'A trial is also a unit of evidence',
  'Production implication',
];
for (const anchor of esAnchors) check(es.includes(anchor), `ES: missing concept ${anchor}`);
for (const anchor of enAnchors) check(en.includes(anchor), `EN: missing concept ${anchor}`);

for (const text of [es, en]) {
  for (const token of ['S(x, e; M, C, \\pi)', 'B_{diagnostic}', '\\Delta_{model\\mid harness}', 'Recall@k', 'trajectory', 'outcome', 'workflow', 'System Under Test']) {
    check(text.includes(token), `Missing required evaluation token ${token}`);
  }
  check(text.includes('task_id / dataset_version'), 'Reproducibility record must include task/dataset version');
  check(text.includes('graders + versions'), 'Reproducibility record must include grader versions');
  check(text.includes('trajectory reference'), 'Reproducibility record must retain trajectory evidence');
  check(text.includes('outcome/state checks'), 'Reproducibility record must retain outcome/state checks');
}

check(es.includes('workflow describe las reglas o política') && es.includes('trayectoria') && es.includes('camino concreto'), 'ES: workflow-versus-trajectory distinction missing');
check(en.includes('workflow describes the rules or policy') && en.includes('trajectory') && en.includes('path that actually occurred'), 'EN: workflow-versus-trajectory distinction missing');
check(es.includes('una trayectoria «bonita» no demuestra éxito'), 'ES: trajectory cannot substitute for outcome caveat missing');
check(en.includes('a clean-looking trajectory does not prove success'), 'EN: trajectory cannot substitute for outcome caveat missing');
check(es.includes('el resultado no describe automáticamente el producto'), 'ES: model-eval/product boundary caveat missing');
check(en.includes('that result does not automatically describe the product'), 'EN: model-eval/product boundary caveat missing');
check(es.includes('una mejora del **stack comparado**, no una estimación del efecto causal del modelo'), 'ES: confounded stack comparison caveat missing');
check(en.includes('an improvement of the **compared stack**, not a causal estimate of the model contribution'), 'EN: confounded stack comparison caveat missing');
check(!/^\s*-\s+.+;\s*$/m.test(en), 'EN: semicolon-list anti-pattern detected');

const forbidden = [
  /trajectory\s*=\s*workflow/i,
  /model eval (?:proves|demonstrates) (?:the )?product/i,
  /Recall@k[^\n]{0,80}(?:proves|guarantees) (?:end-to-end|system)/i,
];
for (const pattern of forbidden) check(!pattern.test(en), `EN: forbidden overclaim ${pattern}`);

const visualInclude = '{{ include_html("snippets/articulos-tecnicos/eval-boundary-system-workflow-trajectory.html") }}';
check(es.includes(visualInclude), 'ES: 5.1 visual include missing');
check(en.includes(visualInclude), 'EN: 5.1 visual include missing');
check(snippet.includes('GOLDEN_VISUAL_CONTRACT'), 'Visual: relationship-first contract marker missing');
check(snippet.includes('interaction="static:no-cosmetic-controls"'), 'Visual: cosmetic interaction must be rejected');
check(snippet.includes('mobile="horizontal-scroll-preserves-nested-boundaries-trajectory-outcome-and-diagnostic-confirmation-arrows"'), 'Visual: mobile topology preservation contract missing');
check(!snippet.includes('data-s5v-stepper') && !snippet.includes('s5v__steps--tabs'), 'Visual regression: cosmetic tabs/stepper detected');
for (const boundary of ['system', 'workflow', 'component']) {
  check(snippet.includes(`data-boundary="${boundary}"`), `Visual: missing semantic boundary ${boundary}`);
}
for (const node of ['change', 'question', 'task', 'environment', 'retriever', 'model', 'guardrail', 'tools', 'policy', 'outcome', 'diagnose', 'confirm']) {
  check(snippet.includes(`data-node="${node}"`), `Visual: missing mechanism node ${node}`);
}
check(snippet.includes('data-path="trajectory"'), 'Visual: realized trajectory path missing');
check(snippet.includes('Diagnosticar → hacia dentro') && snippet.includes('Confirmar → hacia fuera'), 'Visual: diagnose-narrow / confirm-broad relationship missing');
check(snippet.includes('Trayectoria = evidencia de una ejecución; outcome ≠ trayectoria'), 'Visual: trajectory/outcome distinction missing');

check(mirror.trim() === '<!-- 5sigmas-canonical-mirror -->', 'EN: visual canonical mirror marker invalid');
check(i18n.source === visualPath, 'EN: visual i18n source path invalid');
const snippetBytes = Buffer.from(snippet, 'utf8');
const blobHeader = Buffer.from(`blob ${snippetBytes.length}\0`, 'utf8');
const snippetBlobSha = crypto.createHash('sha1').update(Buffer.concat([blobHeader, snippetBytes])).digest('hex');
check(i18n.source_blob_sha === snippetBlobSha, `EN: visual source_blob_sha stale (${i18n.source_blob_sha} != ${snippetBlobSha})`);
for (const token of ['Set the boundary first', 'DIAGNOSTIC BOUNDARY', 'PRODUCT BOUNDARY', 'POLICY / ORCHESTRATION', 'trajectory realized in this trial', 'Outcome + final state', 'Diagnose → move inward', 'Confirm → move outward', 'outcome ≠ trajectory']) {
  check(Object.values(i18n.replacements).some((value) => String(value).includes(token)), `EN visual translation missing ${token}`);
}

if (failures.length) {
  console.error(`AI systems evaluation chapter 5.1 source gate failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('AI systems evaluation chapter 5.1 source gate PASS');
console.log(`ES bytes=${Buffer.byteLength(es)} EN bytes=${Buffer.byteLength(en)} visual_blob=${snippetBlobSha}`);
