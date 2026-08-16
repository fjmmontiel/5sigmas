#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const sourcePath = path.resolve('docs/snippets/temas/evaluation-verifier-routing.html');
const englishPath = path.resolve('locales/en/snippets/temas/evaluation-verifier-routing.html');
const mapPath = path.resolve('locales/en/snippets/temas/evaluation-verifier-routing.i18n.json');
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
const include = '{{ include_html("snippets/temas/evaluation-verifier-routing.html") }}';

check(spanishTopic.includes(include), 'Spanish evaluation hub: missing verifier-routing visual include');
check(englishTopic.includes(include), 'English evaluation hub: missing verifier-routing visual include');
check(englishSource.trim() === '<!-- 5sigmas-canonical-mirror -->', 'English verifier-routing snippet must opt into the SHA-pinned canonical mirror');
check(translation.source === 'snippets/temas/evaluation-verifier-routing.html', 'Verifier-routing translation map: wrong canonical source');
check(translation.source_blob_sha === gitBlobSha(source), `Verifier-routing translation map: source_blob_sha drift (expected ${gitBlobSha(source)}, found ${translation.source_blob_sha})`);
check(source.includes('prefers-reduced-motion:reduce'), 'Verifier-routing visual: missing reduced-motion contract');
check(source.includes('https://arxiv.org/abs/2403.07974'), 'Verifier-routing visual: missing LiveCodeBench primary reference');
check(source.includes('https://platform.openai.com/docs/api-reference/graders'), 'Verifier-routing visual: missing OpenAI Graders primary reference');
check(source.includes('https://arxiv.org/abs/2306.05685'), 'Verifier-routing visual: missing LLM-as-a-Judge primary reference');

let expectedEnglish = source;
const missingReplacements = [];
for (const [from, to] of Object.entries(translation.replacements || {}).sort((a, b) => b[0].length - a[0].length)) {
  if (!expectedEnglish.includes(from)) missingReplacements.push(from);
  expectedEnglish = expectedEnglish.replaceAll(from, to);
}
check(missingReplacements.length === 0, `Verifier-routing translation map has missing replacements: ${missingReplacements.slice(0, 3).join(' | ')}`);
for (const token of translation.forbidden_output_tokens || []) {
  check(!expectedEnglish.includes(token), `Verifier-routing translated canonical still contains forbidden Spanish token ${JSON.stringify(token)}`);
}

const cases = [
  {
    locale: 'es',
    route: '/temas/evaluacion-modelos/',
    anchors: ['SEÑAL → VERIFICADOR → DECISIÓN', 'Comparador determinista', 'Ejecuta y observa', 'Rúbrica + referencia humana', 'MISMO CASO, VARIAS SEÑALES', 'VERIFICA ABAJO', 'ESCALA DESPUÉS'],
    forbidden: [],
  },
  {
    locale: 'en',
    route: '/en/temas/evaluacion-modelos/',
    anchors: ['SIGNAL → VERIFIER → DECISION', 'Deterministic checker', 'Run and inspect', 'Rubric + human reference', 'SAME CASE, MULTIPLE SIGNALS', 'VERIFY AT THE SOURCE', 'SCALE AFTERWARD'],
    forbidden: ['Comparador determinista', 'Ejecuta y observa', 'Rúbrica + referencia humana', 'MISMO CASO', 'VERIFICA ABAJO', 'ESCALA DESPUÉS', 'Fuentes primarias:'],
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

      const visual = page.locator('.evd-wrap');
      check((await visual.count()) === 1, `${testCase.route}: ${viewport.name} expected exactly one .evd-wrap`);
      if (await visual.count()) {
        const box = await visual.boundingBox();
        check(Boolean(box && box.width >= 250 && box.height >= 420), `${testCase.route}: ${viewport.name} invalid verifier-routing geometry ${JSON.stringify(box)}`);
        const overflow = await visual.evaluate((node) => node.scrollWidth - node.clientWidth);
        check(overflow <= 2, `${testCase.route}: ${viewport.name} verifier-routing internal overflow ${overflow}px`);
        const text = await visual.innerText();
        for (const anchor of testCase.anchors) check(text.includes(anchor), `${testCase.route}: ${viewport.name} missing verifier-routing teaching anchor ${JSON.stringify(anchor)}`);
        for (const token of testCase.forbidden) check(!text.includes(token), `${testCase.route}: ${viewport.name} verifier-routing Spanish leakage ${JSON.stringify(token)}`);
      }

      check((await page.locator('.evd-card').count()) === 3, `${testCase.route}: ${viewport.name} expected 3 verifier routes`);
      check((await page.locator('.evd-question-chips b').count()) === 5, `${testCase.route}: ${viewport.name} expected 5 observable-signal chips`);
      check((await page.locator('.evd-mini-flow').count()) === 3, `${testCase.route}: ${viewport.name} expected 3 route mini-flows`);
      check((await page.locator('.evd-scale').count()) === 1, `${testCase.route}: ${viewport.name} expected one calibrated-judge escalation band`);
      check((await page.locator('.evd-case-grid > div').count()) === 4, `${testCase.route}: ${viewport.name} expected 4 signals in combined example`);
      check((await page.locator('.evd-contracts > div').count()) === 3, `${testCase.route}: ${viewport.name} expected 3 verifier-routing teaching contracts`);

      const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(pageOverflow <= 2, `${testCase.route}: ${viewport.name} horizontal page overflow ${pageOverflow}px`);
      for (const error of runtimeErrors) failures.push(`${testCase.route}: ${viewport.name} runtime error: ${error}`);

      if (await visual.count()) {
        await visual.screenshot({
          path: path.join(outDir, `evaluation-verifier-routing-${testCase.locale}-${viewport.name}.png`),
          animations: 'disabled',
        });
      }
      await page.close();
    }

    const reduced = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await reduced.emulateMedia({ reducedMotion: 'reduce' });
    await reduced.goto(`${base}${testCase.route}`, { waitUntil: 'networkidle' });
    const motion = await reduced.locator('.evd-wrap').evaluate((node) => {
      const style = getComputedStyle(node);
      const child = node.querySelector('*');
      const childStyle = child ? getComputedStyle(child) : style;
      return { animation: childStyle.animationDuration, transition: childStyle.transitionDuration };
    });
    check(motion.animation === '0s', `${testCase.route}: reduced-motion animation duration should be 0s, got ${motion.animation}`);
    check(motion.transition === '0s', `${testCase.route}: reduced-motion transition duration should be 0s, got ${motion.transition}`);
    await reduced.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error('Evaluation verifier-routing visual validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Evaluation verifier-routing visual validation passed.');
