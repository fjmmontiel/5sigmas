#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const read = (p) => fs.readFile(path.resolve(p), 'utf8');
const [es, en, visual, mirror, i18nRaw, mkEs, mkEn, manifest, workflow] = await Promise.all([
  read('docs/series/evaluating-ai-systems-production/05-online-evaluation-shadow-canary-ab-guardrails-regression-gates.md'),
  read('locales/en/series/evaluating-ai-systems-production/05-online-evaluation-shadow-canary-ab-guardrails-regression-gates.md'),
  read('docs/snippets/articulos-tecnicos/eval-online-shadow-canary-ab-regression-gates.html'),
  read('locales/en/snippets/articulos-tecnicos/eval-online-shadow-canary-ab-regression-gates.html'),
  read('locales/en/snippets/articulos-tecnicos/eval-online-shadow-canary-ab-regression-gates.i18n.json'),
  read('mkdocs.yml'), read('mkdocs.en.yml'), read('locales/en/manifest.yml'), read('.github/workflows/series5-golden-review.yml'),
]);
const i18n = JSON.parse(i18nRaw);
const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); };
const route = 'series/evaluating-ai-systems-production/05-online-evaluation-shadow-canary-ab-guardrails-regression-gates.md';
const visualPath = 'snippets/articulos-tecnicos/eval-online-shadow-canary-ab-regression-gates.html';

// Publication surfaces are deliberately fail-closed until the chapter is wired everywhere.
check(mkEs.includes(route), 'ES: chapter 5.5 navigation missing');
check(mkEn.includes(route), 'EN: chapter 5.5 navigation missing');
check(manifest.includes(`  - ${route}`), 'EN: chapter 5.5 missing from published_routes');
check(manifest.includes(`  - ${visualPath}`), 'EN: chapter 5.5 visual missing from required_snippets');
check(manifest.includes('route_strategy: preserve-source-slugs'), 'EN: locale manifest must preserve canonical source slugs');
check(workflow.includes('validate_ai_systems_eval_ch5_source.mjs'), 'CI: 5.5 source gate missing from permanent review');
check(workflow.includes('validate_ai_systems_eval_ch5_accessibility.mjs'), 'CI: 5.5 accessibility gate missing from permanent review');

for (const url of [
  'https://istio.io/latest/docs/tasks/traffic-management/mirroring/',
  'https://argo-rollouts.readthedocs.io/en/stable/features/canary/',
  'https://argo-rollouts.readthedocs.io/en/stable/features/analysis/',
  'https://www.microsoft.com/en-us/research/publication/online-experimentation-at-microsoft/',
  'https://www.microsoft.com/en-us/research/publication/the-anatomy-of-a-large-scale-experimentation-platform/',
  'https://www.microsoft.com/en-us/research/publication/diagnosing-sample-ratio-mismatch-in-online-controlled-experiments-a-taxonomy-and-rules-of-thumb-for-practitioners/',
]) {
  check(es.includes(url), `ES: missing primary source ${url}`);
  check(en.includes(url), `EN: missing primary source ${url}`);
}

for (const [text, locale, anchors] of [
  [es, 'ES', [
    'Antes de exponer tráfico, fija la unidad de cambio',
    'Shadow: primero observa el candidato sin darle autoridad sobre la respuesta',
    'Un shadow no mide impacto real sobre el usuario',
    'El peligro de los side effects',
    'Canary: expón poco tráfico real para descubrir riesgo antes de ampliar',
    'Canary no significa A/B',
    'Predeclara abort conditions',
    'A/B: randomiza cuando quieres estimar efecto causal',
    'Antes de leer el efecto, comprueba que el experimento es confiable',
    'Guardrail metrics no son métricas secundarias decorativas',
    'Regression gate: combina evidencia, no promedies riesgos incompatibles',
    'Registra el contrato de cada online eval',
    'Regla de producción',
  ]],
  [en, 'EN', [
    'Before exposing traffic, define the unit of change',
    'Shadow: observe the candidate before giving it authority over the response',
    'Shadowing does not measure real user impact',
    'The side-effect trap',
    'Canary: expose a little real traffic to discover risk before expanding',
    'Canary does not mean A/B',
    'Declare abort conditions before rollout',
    'A/B: randomize when you need causal effect',
    'Validate experiment health before reading treatment effect',
    'Guardrail metrics are not decorative secondary metrics',
    'Regression gate: compose evidence without averaging incompatible risks',
    'Record the contract for every online eval',
    'Production rule',
  ]],
]) for (const anchor of anchors) check(text.includes(anchor), `${locale}: missing concept ${anchor}`);

for (const [text, locale] of [[es, 'ES'], [en, 'EN']]) {
  for (const eq of ['shadow-disagreement','ab-difference','online-release-gate']) {
    check(text.includes(`data-equation=\"${eq}\"`), `${locale}: missing native equation ${eq}`);
  }
  check((text.match(/class=\"s5-native-equation\"/g) || []).length === 3, `${locale}: expected 3 native display equations`);
  check((text.match(/<math xmlns=\"http:\/\/www\.w3\.org\/1998\/Math\/MathML\" display=\"block\">/g) || []).length === 3, `${locale}: native MathML equation count drift`);
  check(!/\\\\[[\s\S]*?\\\\]/.test(text), `${locale}: raw display TeX has no active renderer on this site`);
  check(text.includes('candidate_id'), `${locale}: candidate identity contract missing`);
  check(text.includes('side-effect') || text.includes('side effect'), `${locale}: side-effect boundary missing`);
  check(text.includes('Sample Ratio Mismatch') && text.includes('SRM'), `${locale}: SRM trustworthiness check missing`);
  check(text.includes('assignment unit'), `${locale}: assignment unit missing`);
  check(text.includes('abort') && text.includes('PAUSE') && text.includes('PROMOTE'), `${locale}: rollout decision states incomplete`);
}

const esPlain = es.replace(/\*\*/g, '');
const enPlain = en.replace(/\*\*/g, '');
check(esPlain.includes('Un shadow no mide impacto real sobre el usuario'), 'ES: shadow != user-impact caveat missing');
check(enPlain.includes('Shadowing does not measure real user impact'), 'EN: shadow != user-impact caveat missing');
check(esPlain.includes('Canary no significa A/B'), 'ES: canary != A/B boundary missing');
check(enPlain.includes('Canary does not mean A/B'), 'EN: canary != A/B boundary missing');
check(esPlain.includes('no es automáticamente un experimento causal') || esPlain.includes('no es automáticamente un experimento causal'), 'ES: canary causal caveat missing');
check(enPlain.includes('not automatically a causal experiment'), 'EN: canary causal caveat missing');
check(esPlain.includes('Un SRM sin explicación es un problema de trustworthiness'), 'ES: SRM fail-closed rule missing');
check(enPlain.includes('An unexplained SRM is a trustworthiness problem'), 'EN: SRM fail-closed rule missing');
check(esPlain.includes('no debe compensarse con lift de producto'), 'ES: hard-guardrail non-compensation missing');
check(enPlain.includes('product lift must not compensate'), 'EN: hard-guardrail non-compensation missing');
check(!/^\s*-\s+.+;\s*$/m.test(en), 'EN: semicolon-list anti-pattern detected');

for (const [pattern, label] of [
  [/shadow[^\n]{0,80}(?:proves|guarantees)[^\n]{0,40}(?:user|product) (?:lift|improvement|impact)/i, 'shadow=user-impact'],
  [/canary[^\n]{0,80}(?:proves|establishes|guarantees)[^\n]{0,35}(?:causal|lift)/i, 'canary=causal'],
  [/(?:statistically )?significant[^\n]{0,80}(?:means|proves|guarantees)[^\n]{0,30}(?:safe|ship|promote)/i, 'significance=safety'],
  [/rollout controller[^\n]{0,80}(?:proves|validates)[^\n]{0,40}(?:product|hypothesis|value)/i, 'controller=product-validation'],
  [/(?:1%|5%|10%)[^\n]{0,40}(?:universal|always safe|guarantees safety)/i, 'universal-canary-percentage'],
]) {
  check(!pattern.test(es), `ES: forbidden overclaim ${label}`);
  check(!pattern.test(en), `EN: forbidden overclaim ${label}`);
}

const include = '{{ include_html("snippets/articulos-tecnicos/eval-online-shadow-canary-ab-regression-gates.html") }}';
check(es.includes(include) && en.includes(include), 'ES/EN: 5.5 visual include missing');
for (const token of [
  'GOLDEN_VISUAL_CONTRACT',
  'interaction="static:no-cosmetic-controls"',
  'mobile="horizontal-scroll-preserves-stage-order-evidence-lanes-and-release-decisions"',
  'data-boundary="shadow-boundary"',
  'data-boundary="canary-boundary"',
  'data-boundary="ab-boundary"',
]) check(visual.includes(token), `Visual: missing contract token ${token}`);
for (const n of ['candidate','offline','shadow','canary','ab','rollout','shadow-question','canary-question','ab-question','hard-guardrails','release-gate','rollback','pause','promote']) {
  check(visual.includes(`data-node="${n}"`), `Visual: missing node ${n}`);
}
check(!visual.includes('data-s5v-stepper') && !visual.includes('s5v__steps--tabs'), 'Visual: cosmetic stepper/tabs detected');
check(mirror.trim() === '<!-- 5sigmas-canonical-mirror -->', 'EN: canonical mirror marker invalid');
check(i18n.source === visualPath, 'EN: i18n source path invalid');
const bytes = Buffer.from(visual, 'utf8');
const blobSha = crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes])).digest('hex');
check(i18n.source_blob_sha === blobSha, `EN: stale visual mirror (${i18n.source_blob_sha} != ${blobSha})`);
const englishHas = (token) => visual.includes(token) || Object.values(i18n.replacements).some(v => String(v).includes(token));
for (const token of ['EXPOSURE ≠ CAUSALITY','NO RESPONSE AUTHORITY','LIMITED REAL EXPOSURE','EXPERIMENTAL ASSIGNMENT','How does it behave?','Is it safe to expand?','What effect does it cause?','inconclusive evidence']) {
  check(englishHas(token), `EN visual token missing ${token}`);
}

if (failures.length) {
  console.error(`AI systems evaluation chapter 5.5 source gate failed (${failures.length}):`);
  failures.forEach(f => console.error(`- ${f}`));
  process.exit(1);
}
console.log('AI systems evaluation chapter 5.5 source gate PASS');
console.log(`ES bytes=${Buffer.byteLength(es)} EN bytes=${Buffer.byteLength(en)} visual_blob=${blobSha}`);
