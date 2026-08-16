#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const sourcePath = path.resolve('docs/snippets/temas/transformer-attention-cost.html');
const englishPath = path.resolve('locales/en/snippets/temas/transformer-attention-cost.html');
const mapPath = path.resolve('locales/en/snippets/temas/transformer-attention-cost.i18n.json');
const spanishTopicPath = path.resolve('docs/temas/transformer.md');
const englishTopicPath = path.resolve('locales/en/temas/transformer.md');
const failures = [];

function check(condition, message) { if (!condition) failures.push(message); }
function gitBlobSha(text) {
  const bytes = Buffer.from(text, 'utf8');
  return crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}

const [source, englishSource, mapRaw, spanishTopic, englishTopic] = await Promise.all([
  fs.readFile(sourcePath, 'utf8'), fs.readFile(englishPath, 'utf8'), fs.readFile(mapPath, 'utf8'),
  fs.readFile(spanishTopicPath, 'utf8'), fs.readFile(englishTopicPath, 'utf8'),
]);
const translation = JSON.parse(mapRaw);
const include = '{{ include_html("snippets/temas/transformer-attention-cost.html") }}';

check(spanishTopic.includes(include), 'Spanish Transformer hub: missing attention-cost visual include');
check(englishTopic.includes(include), 'English Transformer hub: missing attention-cost visual include');
check(englishSource.trim() === '<!-- 5sigmas-canonical-mirror -->', 'English attention-cost snippet must use canonical mirror marker');
check(translation.source === 'snippets/temas/transformer-attention-cost.html', 'Attention-cost translation map: wrong canonical source');
check(translation.source_blob_sha === gitBlobSha(source), `Attention-cost translation map: source_blob_sha drift (expected ${gitBlobSha(source)}, found ${translation.source_blob_sha})`);
check(source.includes('prefers-reduced-motion:reduce'), 'Attention-cost visual: missing reduced-motion contract');
check(source.includes('https://arxiv.org/abs/1706.03762'), 'Attention-cost visual: missing Transformer primary reference');
check(source.includes('https://arxiv.org/abs/2205.14135'), 'Attention-cost visual: missing FlashAttention primary reference');
check(source.includes('https://arxiv.org/abs/2312.00752'), 'Attention-cost visual: missing Mamba primary reference');
check(source.includes('n = 4') && source.includes('16 scores'), 'Attention-cost visual: missing n=4 → 16 exact scaling example');
check(source.includes('n = 8') && source.includes('64 scores'), 'Attention-cost visual: missing n=8 → 64 exact scaling example');
check(source.includes('2× tokens') && source.includes('4× scores'), 'Attention-cost visual: missing 2× tokens → 4× scores teaching contract');
check(source.includes('O(n²) NO DESCRIBE TODO EL MODELO'), 'Attention-cost visual: missing whole-model complexity caveat');

let expectedEnglish = source;
const missingReplacements = [];
for (const [from, to] of Object.entries(translation.replacements || {}).sort((a, b) => b[0].length - a[0].length)) {
  if (!expectedEnglish.includes(from)) missingReplacements.push(from);
  expectedEnglish = expectedEnglish.replaceAll(from, to);
}
check(missingReplacements.length === 0, `Attention-cost translation map has missing replacements: ${missingReplacements.slice(0, 3).join(' | ')}`);
for (const token of translation.forbidden_output_tokens || []) check(!expectedEnglish.includes(token), `Attention-cost translated canonical still contains forbidden Spanish token ${JSON.stringify(token)}`);

const cases = [
  {
    locale: 'es', route: '/temas/transformer/',
    anchors: ['La longitud crece linealmente','n × n','16 scores','64 scores','2× tokens','4× scores','INTERACCIÓN ALL-TO-ALL','FlashAttention · menos tráfico de memoria','O(n²) NO DESCRIBE TODO EL MODELO'],
    forbidden: [],
  },
  {
    locale: 'en', route: '/en/temas/transformer/',
    anchors: ['Sequence length grows linearly','n × n','16 scores','64 scores','2× tokens','4× scores','ALL-TO-ALL INTERACTION','FlashAttention · less memory traffic','O(n²) DOES NOT DESCRIBE THE WHOLE MODEL'],
    forbidden: ['La longitud crece','INTERACCIÓN ALL-TO-ALL','menos tráfico de memoria','OTROS BLOQUES','Qué crece con n','Fuentes primarias'],
  },
];
const viewports = [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'mobile', width: 390, height: 844 }];

const browser = await chromium.launch({ headless: true });
try {
  for (const testCase of cases) {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      const runtimeErrors = [];
      page.on('pageerror', (error) => runtimeErrors.push(error.message));
      const response = await page.goto(`${base}${testCase.route}`, { waitUntil: 'networkidle' });
      check(response?.ok(), `${testCase.route}: ${viewport.name} HTTP ${response?.status() ?? 'no response'}`);
      const visual = page.locator('.tac-wrap');
      check((await visual.count()) === 1, `${testCase.route}: ${viewport.name} expected exactly one .tac-wrap`);
      if (await visual.count()) {
        const box = await visual.boundingBox();
        check(Boolean(box && box.width >= 250 && box.height >= 500), `${testCase.route}: ${viewport.name} invalid attention-cost geometry ${JSON.stringify(box)}`);
        const overflow = await visual.evaluate((node) => node.scrollWidth - node.clientWidth);
        check(overflow <= 2, `${testCase.route}: ${viewport.name} attention-cost internal overflow ${overflow}px`);
        const text = await visual.innerText();
        for (const anchor of testCase.anchors) check(text.includes(anchor), `${testCase.route}: ${viewport.name} missing teaching anchor ${JSON.stringify(anchor)}`);
        for (const token of testCase.forbidden) check(!text.includes(token), `${testCase.route}: ${viewport.name} Spanish leakage ${JSON.stringify(token)}`);
      }
      check((await page.locator('.tac-tensor').count()) === 4, `${testCase.route}: ${viewport.name} expected 4 tensor stages`);
      check((await page.locator('.tac-scale-card').count()) === 2, `${testCase.route}: ${viewport.name} expected 2 scaling examples`);
      check((await page.locator('.tac-cost').count()) === 3, `${testCase.route}: ${viewport.name} expected 3 cost-boundary cards`);
      check((await page.locator('.tac-design-grid > div').count()) === 3, `${testCase.route}: ${viewport.name} expected 3 design-space routes`);
      check((await page.locator('.tac-contracts > div').count()) === 3, `${testCase.route}: ${viewport.name} expected 3 teaching contracts`);
      const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(pageOverflow <= 2, `${testCase.route}: ${viewport.name} horizontal page overflow ${pageOverflow}px`);
      for (const error of runtimeErrors) failures.push(`${testCase.route}: ${viewport.name} runtime error: ${error}`);
      if (await visual.count()) {
        await page.locator('.md-header').evaluateAll((nodes) => nodes.forEach((node) => { node.style.visibility = 'hidden'; }));
        await visual.screenshot({ path: path.join(outDir, `transformer-attention-cost-${testCase.locale}-${viewport.name}.png`), animations: 'disabled' });
      }
      await page.close();
    }

    const reduced = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await reduced.emulateMedia({ reducedMotion: 'reduce' });
    await reduced.goto(`${base}${testCase.route}`, { waitUntil: 'networkidle' });
    const motion = await reduced.locator('.tac-cost').first().evaluate((node) => {
      const style = getComputedStyle(node);
      return { animation: style.animationDuration, transition: style.transitionDuration, scrollBehavior: style.scrollBehavior };
    });
    check(motion.animation === '0s', `${testCase.route}: reduced-motion animation should be 0s, got ${motion.animation}`);
    check(motion.transition.split(',').every((value) => value.trim() === '0s'), `${testCase.route}: reduced-motion transition should be 0s, got ${motion.transition}`);
    check(motion.scrollBehavior === 'auto', `${testCase.route}: reduced-motion scroll behavior should be auto, got ${motion.scrollBehavior}`);
    await reduced.close();
  }
} finally { await browser.close(); }

if (failures.length) {
  console.error('Transformer attention-cost visual validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Transformer attention-cost visual validation passed: ES/EN mirror parity, exact n×n scaling examples, complexity caveats, primary references, desktop/mobile geometry, overflow, language integrity, screenshots and reduced-motion behavior are valid.');
