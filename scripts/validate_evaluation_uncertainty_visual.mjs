#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const sourcePath = path.resolve('docs/snippets/temas/evaluation-uncertainty.html');
const englishPath = path.resolve('locales/en/snippets/temas/evaluation-uncertainty.html');
const mapPath = path.resolve('locales/en/snippets/temas/evaluation-uncertainty.i18n.json');
const spanishTopicPath = path.resolve('docs/temas/evaluacion-modelos.md');
const englishTopicPath = path.resolve('locales/en/temas/evaluacion-modelos.md');
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

function gitBlobSha(text) {
  const bytes = Buffer.from(text, 'utf8');
  return crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}

const [source, englishSource, mapRaw, spanishTopic, englishTopic] = await Promise.all([
  fs.readFile(sourcePath, 'utf8'),
  fs.readFile(englishPath, 'utf8'),
  fs.readFile(mapPath, 'utf8'),
  fs.readFile(spanishTopicPath, 'utf8'),
  fs.readFile(englishTopicPath, 'utf8'),
]);
const translation = JSON.parse(mapRaw);
const include = '{{ include_html("snippets/temas/evaluation-uncertainty.html") }}';

check(spanishTopic.includes(include), 'Spanish evaluation hub: missing uncertainty visual include');
check(englishTopic.includes(include), 'English evaluation hub: missing uncertainty visual include');
check(englishSource.trim() === '<!-- 5sigmas-canonical-mirror -->', 'English uncertainty snippet must opt into the SHA-pinned canonical mirror');
check(translation.source === 'snippets/temas/evaluation-uncertainty.html', 'Uncertainty translation map: wrong canonical source');
check(translation.source_blob_sha === gitBlobSha(source), `Uncertainty translation map: source_blob_sha drift (expected ${gitBlobSha(source)}, found ${translation.source_blob_sha})`);
check(source.includes('prefers-reduced-motion:reduce'), 'Evaluation uncertainty visual: missing reduced-motion contract');
check(source.includes('https://www.itl.nist.gov/div898/handbook/prc/section3/prc311.htm'), 'Evaluation uncertainty visual: missing NIST paired-observations reference');
check(source.includes('https://itl.nist.gov/div898/handbook/prc/section3/prc312.htm'), 'Evaluation uncertainty visual: missing NIST difference-interval reference');
check(source.includes('https://aclanthology.org/W04-3250/'), 'Evaluation uncertainty visual: missing Koehn NLP significance reference');
check(source.includes('https://doi.org/10.1080/00031305.2016.1154108'), 'Evaluation uncertainty visual: missing ASA practical-importance reference');
check(source.includes('Geometría ilustrativa · no representa resultados medidos.'), 'Evaluation uncertainty visual: illustrative geometry must be labelled as non-measured');

let expectedEnglish = source;
const missingReplacements = [];
for (const [from, to] of Object.entries(translation.replacements || {}).sort((a, b) => b[0].length - a[0].length)) {
  if (!expectedEnglish.includes(from)) missingReplacements.push(from);
  expectedEnglish = expectedEnglish.replaceAll(from, to);
}
check(missingReplacements.length === 0, `Uncertainty translation map has missing replacements: ${missingReplacements.slice(0, 3).join(' | ')}`);
for (const token of translation.forbidden_output_tokens || []) {
  check(!expectedEnglish.includes(token), `Uncertainty translated canonical still contains forbidden Spanish token ${JSON.stringify(token)}`);
}

const cases = [
  {
    locale: 'es',
    route: '/temas/evaluacion-modelos/',
    anchors: [
      'MISMO TEST → DIFERENCIAS PAREADAS → INCERTIDUMBRE → DECISIÓN',
      'Un punto estimado no es una conclusión',
      'EMPAREJA POR CASO',
      'AGREGA LAS DIFERENCIAS',
      'No resuelto por la muestra',
      'Diferencia estimada, impacto pequeño',
      'Diferencia compatible con valor práctico',
      'MUESTREO DE CASOS',
      'GENERACIÓN ESTOCÁSTICA',
      'Geometría ilustrativa · no representa resultados medidos.',
    ],
    forbidden: [],
  },
  {
    locale: 'en',
    route: '/en/temas/evaluacion-modelos/',
    anchors: [
      'SAME TEST → PAIRED DIFFERENCES → UNCERTAINTY → DECISION',
      'A point estimate is not a conclusion',
      'PAIR BY CASE',
      'AGGREGATE THE DIFFERENCES',
      'Unresolved by the sample',
      'Estimated difference, small impact',
      'Difference compatible with practical value',
      'CASE SAMPLING',
      'STOCHASTIC GENERATION',
      'Illustrative geometry · not measured results.',
    ],
    forbidden: [
      'DIFERENCIAS PAREADAS',
      'Un punto estimado',
      'EMPAREJA POR CASO',
      'AGREGA LAS DIFERENCIAS',
      'No resuelto por la muestra',
      'impacto pequeño',
      'valor práctico',
      'MUESTREO DE CASOS',
      'GENERACIÓN ESTOCÁSTICA',
      'Geometría ilustrativa',
      'Fuentes:',
    ],
  },
];
const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
];

const browser = await chromium.launch({ headless: true });
try {
  for (const testCase of cases) {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      const runtimeErrors = [];
      page.on('pageerror', (error) => runtimeErrors.push(error.message));
      const response = await page.goto(`${base}${testCase.route}`, { waitUntil: 'networkidle' });
      check(response?.ok(), `${testCase.route}: ${viewport.name} HTTP ${response?.status() ?? 'no response'}`);

      const visual = page.locator('.eus-wrap');
      check((await visual.count()) === 1, `${testCase.route}: ${viewport.name} expected exactly one .eus-wrap`);
      if (await visual.count()) {
        const box = await visual.boundingBox();
        check(Boolean(box && box.width >= 250 && box.height >= 500), `${testCase.route}: ${viewport.name} invalid uncertainty geometry ${JSON.stringify(box)}`);
        const overflow = await visual.evaluate((node) => node.scrollWidth - node.clientWidth);
        check(overflow <= 2, `${testCase.route}: ${viewport.name} uncertainty internal overflow ${overflow}px`);
        const text = await visual.innerText();
        for (const anchor of testCase.anchors) check(text.includes(anchor), `${testCase.route}: ${viewport.name} missing uncertainty teaching anchor ${JSON.stringify(anchor)}`);
        for (const token of testCase.forbidden) check(!text.includes(token), `${testCase.route}: ${viewport.name} uncertainty Spanish leakage ${JSON.stringify(token)}`);
      }

      check((await page.locator('.eus-pair-row').count()) === 4, `${testCase.route}: ${viewport.name} expected paired table header + 3 rows`);
      check((await page.locator('.eus-formula').count()) === 2, `${testCase.route}: ${viewport.name} expected 2 paired estimators`);
      check((await page.locator('.eus-interval-row').count()) === 3, `${testCase.route}: ${viewport.name} expected 3 uncertainty outcomes`);
      check((await page.locator('.eus-zero').count()) === 3, `${testCase.route}: ${viewport.name} expected 3 zero-reference lines`);
      check((await page.locator('.eus-threshold').count()) === 6, `${testCase.route}: ${viewport.name} expected 6 practical-threshold lines`);
      check((await page.locator('.eus-ci').count()) === 3, `${testCase.route}: ${viewport.name} expected 3 illustrative intervals`);
      check((await page.locator('.eus-variance-card').count()) === 2, `${testCase.route}: ${viewport.name} expected case-sampling and stochastic-generation variance cards`);
      check((await page.locator('.eus-contracts > div').count()) === 3, `${testCase.route}: ${viewport.name} expected 3 uncertainty decision contracts`);

      const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(pageOverflow <= 2, `${testCase.route}: ${viewport.name} horizontal page overflow ${pageOverflow}px`);
      for (const error of runtimeErrors) failures.push(`${testCase.route}: ${viewport.name} runtime error: ${error}`);

      if (await visual.count()) {
        await visual.screenshot({
          path: path.join(outDir, `evaluation-uncertainty-${testCase.locale}-${viewport.name}.png`),
          animations: 'disabled',
        });
      }
      await page.close();
    }

    const reduced = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await reduced.emulateMedia({ reducedMotion: 'reduce' });
    await reduced.goto(`${base}${testCase.route}`, { waitUntil: 'networkidle' });
    const motion = await reduced.locator('.eus-interval-row').first().evaluate((node) => {
      const style = getComputedStyle(node);
      return { animation: style.animationDuration, transition: style.transitionDuration, scrollBehavior: style.scrollBehavior };
    });
    check(motion.animation === '0s', `${testCase.route}: reduced-motion animation duration should be 0s, got ${motion.animation}`);
    check(motion.transition.split(',').every((value) => value.trim() === '0s'), `${testCase.route}: reduced-motion transition duration should be 0s, got ${motion.transition}`);
    check(motion.scrollBehavior === 'auto', `${testCase.route}: reduced-motion scroll behavior should be auto, got ${motion.scrollBehavior}`);
    await reduced.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error('Evaluation uncertainty visual validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Evaluation uncertainty visual validation passed: ES/EN mirror parity, paired-case design, effect/interval/practical-threshold semantics, variance-source separation, desktop/mobile geometry, overflow, language integrity, screenshots and reduced-motion behavior are valid.');
