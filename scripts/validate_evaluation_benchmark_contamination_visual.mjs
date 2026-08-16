#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const sourcePath = path.resolve('docs/snippets/temas/evaluation-benchmark-contamination.html');
const englishPath = path.resolve('locales/en/snippets/temas/evaluation-benchmark-contamination.html');
const mapPath = path.resolve('locales/en/snippets/temas/evaluation-benchmark-contamination.i18n.json');
const spanishTopicPath = path.resolve('docs/temas/evaluacion-modelos.md');
const englishTopicPath = path.resolve('locales/en/temas/evaluacion-modelos.md');
const failures = [];

function check(condition, message) { if (!condition) failures.push(message); }
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
const include = '{{ include_html("snippets/temas/evaluation-benchmark-contamination.html") }}';

check(spanishTopic.includes(include), 'Spanish evaluation hub: missing benchmark-contamination visual include');
check(englishTopic.includes(include), 'English evaluation hub: missing benchmark-contamination visual include');
check(!spanishTopic.includes('Las defensas incluyen:'), 'Spanish evaluation hub: legacy contamination defence list still present');
check(!englishTopic.includes('Defences include:'), 'English evaluation hub: legacy contamination defence list still present');
check(englishSource.trim() === '<!-- 5sigmas-canonical-mirror -->', 'English benchmark-contamination snippet must use canonical mirror marker');
check(translation.source === 'snippets/temas/evaluation-benchmark-contamination.html', 'Benchmark-contamination translation map: wrong canonical source');
check(translation.source_blob_sha === gitBlobSha(source), `Benchmark-contamination translation map: source_blob_sha drift (expected ${gitBlobSha(source)}, found ${translation.source_blob_sha})`);
check(source.includes('prefers-reduced-motion:reduce'), 'Benchmark-contamination visual: missing reduced-motion contract');
check(source.includes('https://arxiv.org/abs/2310.18018'), 'Benchmark-contamination visual: missing contamination-measurement primary reference');
check(source.includes('https://arxiv.org/abs/2403.07974'), 'Benchmark-contamination visual: missing LiveCodeBench primary reference');
check(source.includes('https://arxiv.org/abs/2312.10523'), 'Benchmark-contamination visual: missing PALOMA primary reference');

let expectedEnglish = source;
const missingReplacements = [];
for (const [from, to] of Object.entries(translation.replacements || {}).sort((a, b) => b[0].length - a[0].length)) {
  if (!expectedEnglish.includes(from)) missingReplacements.push(from);
  expectedEnglish = expectedEnglish.replaceAll(from, to);
}
check(missingReplacements.length === 0, `Benchmark-contamination translation map has missing replacements: ${missingReplacements.slice(0, 3).join(' | ')}`);
for (const token of translation.forbidden_output_tokens || []) {
  check(!expectedEnglish.includes(token), `Benchmark-contamination translated canonical still contains forbidden Spanish token ${JSON.stringify(token)}`);
}

const cases = [
  {
    locale: 'es', route: '/temas/evaluacion-modelos/',
    anchors: ['Un benchmark pierde fuerza como prueba','Casos fijos y comparables','El test toca entrenamiento o tuning','¿capacidad, exposición o ambas?','CONTAMINACIÓN','SATURACIÓN / SOBREOPTIMIZACIÓN','PÚBLICO ≠ LIMPIO','SCORE ≠ GENERALIZACIÓN','RENUEVA + VERIFICA'],
    forbidden: [],
  },
  {
    locale: 'en', route: '/en/temas/evaluacion-modelos/',
    anchors: ['A benchmark loses strength as a test','Fixed, comparable cases','The test reaches training or tuning','capability, exposure, or both?','CONTAMINATION','SATURATION / OVER-OPTIMIZATION','PUBLIC ≠ CLEAN','SCORE ≠ GENERALIZATION','REFRESH + VERIFY'],
    forbidden: ['TEST PÚBLICO','EXPOSICIÓN','PUNTUACIÓN','EVIDENCIA NUEVA','CONTAMINACIÓN','SOBREOPTIMIZACIÓN','casos privados','evaluación dinámica','Fuentes primarias:'],
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
      const visual = page.locator('.ebc-wrap');
      check((await visual.count()) === 1, `${testCase.route}: ${viewport.name} expected exactly one .ebc-wrap`);
      if (await visual.count()) {
        const box = await visual.boundingBox();
        check(Boolean(box && box.width >= 250 && box.height >= 430), `${testCase.route}: ${viewport.name} invalid benchmark-contamination geometry ${JSON.stringify(box)}`);
        const overflow = await visual.evaluate((node) => node.scrollWidth - node.clientWidth);
        check(overflow <= 2, `${testCase.route}: ${viewport.name} benchmark-contamination internal overflow ${overflow}px`);
        const text = await visual.innerText();
        for (const anchor of testCase.anchors) check(text.includes(anchor), `${testCase.route}: ${viewport.name} missing teaching anchor ${JSON.stringify(anchor)}`);
        for (const token of testCase.forbidden) check(!text.includes(token), `${testCase.route}: ${viewport.name} Spanish leakage ${JSON.stringify(token)}`);
      }
      check((await page.locator('.ebc-stage').count()) === 4, `${testCase.route}: ${viewport.name} expected 4 causal stages`);
      check((await page.locator('.ebc-lane').count()) === 2, `${testCase.route}: ${viewport.name} expected contamination and saturation lanes`);
      check((await page.locator('.ebc-defenses span').count()) === 4, `${testCase.route}: ${viewport.name} expected 4 evidence-refresh controls`);
      check((await page.locator('.ebc-contracts > div').count()) === 3, `${testCase.route}: ${viewport.name} expected 3 teaching contracts`);
      const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(pageOverflow <= 2, `${testCase.route}: ${viewport.name} horizontal page overflow ${pageOverflow}px`);
      for (const error of runtimeErrors) failures.push(`${testCase.route}: ${viewport.name} runtime error: ${error}`);
      if (await visual.count()) {
        await page.evaluate(() => {
          const target = document.querySelector('.ebc-wrap');
          if (!target) return;
          for (const node of document.querySelectorAll('body *')) {
            if (node === target || target.contains(node) || node.contains(target)) continue;
            const style = getComputedStyle(node);
            if (style.position === 'fixed' || style.position === 'sticky') node.style.visibility = 'hidden';
          }
        });
        await visual.screenshot({ path: path.join(outDir, `evaluation-benchmark-contamination-${testCase.locale}-${viewport.name}.png`), animations: 'disabled' });
      }
      await page.close();
    }

    const reduced = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await reduced.emulateMedia({ reducedMotion: 'reduce' });
    await reduced.goto(`${base}${testCase.route}`, { waitUntil: 'networkidle' });
    const motion = await reduced.locator('.ebc-stage').first().evaluate((node) => {
      const style = getComputedStyle(node);
      return { animation: style.animationDuration, transition: style.transitionDuration, scrollBehavior: style.scrollBehavior };
    });
    check(motion.animation === '0s', `${testCase.route}: reduced-motion animation should be 0s, got ${motion.animation}`);
    check(motion.transition.split(',').every((value) => value.trim() === '0s'), `${testCase.route}: reduced-motion transition should be 0s, got ${motion.transition}`);
    check(motion.scrollBehavior === 'auto', `${testCase.route}: reduced-motion scroll behavior should be auto, got ${motion.scrollBehavior}`);
    await reduced.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error('Evaluation benchmark-contamination visual validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Evaluation benchmark-contamination visual validation passed: ES/EN mirror parity, contamination-vs-saturation semantics, refreshed-evidence controls, primary references, desktop/mobile geometry, overflow, language integrity, screenshots and reduced-motion behavior are valid.');
