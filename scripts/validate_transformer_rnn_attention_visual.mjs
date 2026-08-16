#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const sourcePath = path.resolve('docs/snippets/temas/transformer-rnn-vs-attention.html');
const englishPath = path.resolve('locales/en/snippets/temas/transformer-rnn-vs-attention.html');
const mapPath = path.resolve('locales/en/snippets/temas/transformer-rnn-vs-attention.i18n.json');
const spanishTopicPath = path.resolve('docs/temas/transformer.md');
const englishTopicPath = path.resolve('locales/en/temas/transformer.md');
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
const include = '{{ include_html("snippets/temas/transformer-rnn-vs-attention.html") }}';

check(spanishTopic.includes(include), 'Spanish Transformer hub: missing RNN-vs-attention visual include');
check(englishTopic.includes(include), 'English Transformer hub: missing RNN-vs-attention visual include');
check(!spanishTopic.includes('El Transformer ofrece dos ventajas principales:'), 'Spanish Transformer hub: legacy text-only RNN comparison still present');
check(!englishTopic.includes('The Transformer offers two main advantages:'), 'English Transformer hub: legacy text-only RNN comparison still present');
check(englishSource.trim() === '<!-- 5sigmas-canonical-mirror -->', 'English RNN-attention snippet must use canonical mirror marker');
check(translation.source === 'snippets/temas/transformer-rnn-vs-attention.html', 'RNN-attention translation map: wrong canonical source');
check(translation.source_blob_sha === gitBlobSha(source), `RNN-attention translation map: source_blob_sha drift (expected ${gitBlobSha(source)}, found ${translation.source_blob_sha})`);
check(source.includes('prefers-reduced-motion:reduce'), 'RNN-attention visual: missing reduced-motion contract');
check(source.includes('https://arxiv.org/abs/1706.03762'), 'RNN-attention visual: missing Attention Is All You Need primary reference');
check(source.includes('https://arxiv.org/abs/1409.3215'), 'RNN-attention visual: missing Seq2Seq primary reference');
check(source.includes('OPERACIONES SECUENCIALES / CAPA'), 'RNN-attention visual: missing sequential-operations comparison');
check(source.includes('CAMINO MÁXIMO ENTRE POSICIONES'), 'RNN-attention visual: missing path-length comparison');
check(source.includes('Un decoder autoregresivo sigue generando tokens nuevos secuencialmente'), 'RNN-attention visual: missing autoregressive-generation caveat');

let expectedEnglish = source;
const missingReplacements = [];
for (const [from, to] of Object.entries(translation.replacements || {}).sort((a, b) => b[0].length - a[0].length)) {
  if (!expectedEnglish.includes(from)) missingReplacements.push(from);
  expectedEnglish = expectedEnglish.replaceAll(from, to);
}
check(missingReplacements.length === 0, `RNN-attention translation map has missing replacements: ${missingReplacements.slice(0, 4).join(' | ')}`);
for (const token of translation.forbidden_output_tokens || []) {
  check(!expectedEnglish.includes(token), `RNN-attention translated canonical still contains forbidden Spanish token ${JSON.stringify(token)}`);
}

const cases = [
  {
    locale: 'es',
    route: '/temas/transformer/',
    anchors: [
      'Por qué la atención cambió la ruta entre posiciones',
      'DEPENDENCIA x₁ → h₄',
      'DEPENDENCIA x₁ ↔ y₄',
      'PARALELISMO',
      'CAMINO CORTO',
      'IMPORTANTE',
      'O(n)',
      'O(1)',
    ],
    forbidden: [],
  },
  {
    locale: 'en',
    route: '/en/temas/transformer/',
    anchors: [
      'Why attention changed the path between positions',
      'DEPENDENCY x₁ → h₄',
      'DEPENDENCY x₁ ↔ y₄',
      'PARALLELISM',
      'SHORT PATH',
      'IMPORTANT',
      'O(n)',
      'O(1)',
    ],
    forbidden: [
      'Por qué la atención',
      'el estado recorre',
      'CAMINO CORTO',
      'durante entrenamiento',
      'Fuentes primarias:',
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

      const visual = page.locator('.tra-wrap');
      check((await visual.count()) === 1, `${testCase.route}: ${viewport.name} expected exactly one .tra-wrap`);
      if (await visual.count()) {
        const box = await visual.boundingBox();
        check(Boolean(box && box.width >= 250 && box.height >= 430), `${testCase.route}: ${viewport.name} invalid RNN-attention geometry ${JSON.stringify(box)}`);
        const overflow = await visual.evaluate((node) => node.scrollWidth - node.clientWidth);
        check(overflow <= 2, `${testCase.route}: ${viewport.name} RNN-attention internal overflow ${overflow}px`);
        const text = await visual.innerText();
        for (const anchor of testCase.anchors) check(text.includes(anchor), `${testCase.route}: ${viewport.name} missing teaching anchor ${JSON.stringify(anchor)}`);
        for (const token of testCase.forbidden) check(!text.includes(token), `${testCase.route}: ${viewport.name} Spanish leakage ${JSON.stringify(token)}`);
      }

      check((await page.locator('.tra-lane').count()) === 2, `${testCase.route}: ${viewport.name} expected 2 comparison lanes`);
      check((await page.locator('.tra-state').count()) === 4, `${testCase.route}: ${viewport.name} expected 4 recurrent states`);
      check((await page.locator('.tra-inputs .tra-token').count()) === 4, `${testCase.route}: ${viewport.name} expected 4 attention inputs`);
      check((await page.locator('.tra-cell').count()) === 16, `${testCase.route}: ${viewport.name} expected a 4x4 attention matrix`);
      check((await page.locator('.tra-output').count()) === 4, `${testCase.route}: ${viewport.name} expected 4 attention outputs`);
      check((await page.locator('.tra-metrics > div').count()) === 4, `${testCase.route}: ${viewport.name} expected 4 complexity/path metrics`);
      check((await page.locator('.tra-contracts > div').count()) === 3, `${testCase.route}: ${viewport.name} expected 3 teaching contracts`);
      check((await page.locator('.tra-caveat').count()) === 1, `${testCase.route}: ${viewport.name} expected one autoregressive caveat`);

      const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(pageOverflow <= 2, `${testCase.route}: ${viewport.name} horizontal page overflow ${pageOverflow}px`);
      for (const error of runtimeErrors) failures.push(`${testCase.route}: ${viewport.name} runtime error: ${error}`);

      if (await visual.count()) {
        await page.locator('.md-header').evaluateAll((nodes) => nodes.forEach((node) => { node.style.visibility = 'hidden'; }));
        await visual.screenshot({
          path: path.join(outDir, `transformer-rnn-attention-${testCase.locale}-${viewport.name}.png`),
          animations: 'disabled',
        });
      }
      await page.close();
    }

    const reduced = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await reduced.emulateMedia({ reducedMotion: 'reduce' });
    await reduced.goto(`${base}${testCase.route}`, { waitUntil: 'networkidle' });
    const motion = await reduced.locator('.tra-lane').first().evaluate((node) => {
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
  console.error('Transformer RNN-vs-attention visual validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Transformer RNN-vs-attention visual validation passed: ES/EN mirror parity, recurrent-vs-attention geometry, O(n)/O(1) sequential/path contracts, autoregressive caveat, primary references, desktop/mobile overflow, language integrity, screenshots and reduced-motion behavior are valid.');
