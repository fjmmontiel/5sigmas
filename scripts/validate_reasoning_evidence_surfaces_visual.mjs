#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const sourcePath = path.resolve('docs/snippets/temas/reasoning-evidence-surfaces.html');
const mapPath = path.resolve('locales/en/snippets/temas/reasoning-evidence-surfaces.i18n.json');
const spanishTopicPath = path.resolve('docs/temas/razonamiento.md');
const englishTopicPath = path.resolve('locales/en/temas/razonamiento.md');
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

function gitBlobSha(text) {
  const bytes = Buffer.from(text, 'utf8');
  return crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}

const [source, mapRaw, spanishTopic, englishTopic] = await Promise.all([
  fs.readFile(sourcePath, 'utf8'),
  fs.readFile(mapPath, 'utf8'),
  fs.readFile(spanishTopicPath, 'utf8'),
  fs.readFile(englishTopicPath, 'utf8'),
]);
const translation = JSON.parse(mapRaw);
const include = '{{ include_html("snippets/temas/reasoning-evidence-surfaces.html") }}';

check(spanishTopic.includes(include), 'Spanish reasoning hub: missing evidence-surfaces visual include');
check(englishTopic.includes(include), 'English reasoning hub: missing evidence-surfaces visual include');
check(!spanishTopic.includes('1. **Cómputo interno:**'), 'Spanish reasoning hub: legacy three-item text list still present');
check(!englishTopic.includes('1. **Internal computation:**'), 'English reasoning hub: legacy three-item text list still present');
check(translation.source === 'snippets/temas/reasoning-evidence-surfaces.html', 'English translation map: wrong canonical source');
check(translation.source_blob_sha === gitBlobSha(source), `English translation map: source_blob_sha drift (expected ${gitBlobSha(source)}, found ${translation.source_blob_sha})`);
check(source.includes('https://arxiv.org/abs/2305.04388'), 'Evidence-surfaces visual: missing Turpin et al. primary source');
check(source.includes('https://openai.com/index/evaluating-chain-of-thought-monitorability/'), 'Evidence-surfaces visual: missing OpenAI CoT monitorability source');
check(source.includes('https://openai.github.io/openai-agents-python/ref/tracing/'), 'Evidence-surfaces visual: missing Agents SDK tracing documentation');
check(source.includes('prefers-reduced-motion:reduce'), 'Evidence-surfaces visual: missing reduced-motion contract');

const browser = await chromium.launch({ headless: true });
const cases = [
  {
    locale: 'es',
    route: '/temas/razonamiento/',
    anchors: [
      'TRES SUPERFICIES · TRES CONTRATOS DE EVIDENCIA',
      'Pensamiento, explicación y traza operacional no son lo mismo',
      'CÓMPUTO INTERNO / CoT',
      'JUSTIFICACIÓN AL USUARIO',
      'TRAZA OPERACIONAL',
      '¿POR QUÉ AFIRMAS X?',
      '¿QUÉ ACCIÓN OCURRIÓ?',
      '¿QUÉ RAZONAMIENTO USÓ?',
      'La transparencia útil no consiste en volcar más texto.',
    ],
    forbidden: [],
  },
  {
    locale: 'en',
    route: '/en/temas/razonamiento/',
    anchors: [
      'THREE SURFACES · THREE EVIDENCE CONTRACTS',
      'Reasoning, explanation and operational trace are not the same thing',
      'INTERNAL COMPUTE / CoT',
      'USER-FACING JUSTIFICATION',
      'OPERATIONAL TRACE',
      'WHY DO YOU CLAIM X?',
      'WHICH ACTION HAPPENED?',
      'WHICH REASONING DID IT USE?',
      'Useful transparency is not about dumping more text.',
    ],
    forbidden: [
      'TRES SUPERFICIES',
      'Pensamiento, explicación',
      'Una interfaz auditable',
      'CÓMPUTO INTERNO',
      'JUSTIFICACIÓN AL USUARIO',
      'TRAZA OPERACIONAL',
      '¿POR QUÉ AFIRMAS X?',
      '¿QUÉ ACCIÓN OCURRIÓ?',
      '¿QUÉ RAZONAMIENTO USÓ?',
      'Fuentes primarias / oficiales:',
    ],
  },
];

const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
];

try {
  for (const testCase of cases) {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      const runtimeErrors = [];
      page.on('pageerror', (error) => runtimeErrors.push(error.message));
      const response = await page.goto(`${base}${testCase.route}`, { waitUntil: 'networkidle' });
      check(response?.ok(), `${testCase.route}: ${viewport.name} HTTP ${response?.status() ?? 'no response'}`);

      const visual = page.locator('.res-wrap');
      check((await visual.count()) === 1, `${testCase.route}: ${viewport.name} expected exactly one .res-wrap`);
      if (await visual.count()) {
        const box = await visual.boundingBox();
        check(Boolean(box && box.width >= 250 && box.height >= 500), `${testCase.route}: ${viewport.name} invalid evidence-surfaces geometry ${JSON.stringify(box)}`);
        const overflow = await visual.evaluate((node) => node.scrollWidth - node.clientWidth);
        check(overflow <= 2, `${testCase.route}: ${viewport.name} evidence-surfaces internal overflow ${overflow}px`);
      }

      check((await page.locator('.res-node').count()) === 3, `${testCase.route}: ${viewport.name} expected three spine nodes`);
      check((await page.locator('.res-card').count()) === 3, `${testCase.route}: ${viewport.name} expected three evidence cards`);
      check((await page.locator('.res-evidence > div').count()) === 3, `${testCase.route}: ${viewport.name} expected three user-facing evidence elements`);
      check((await page.locator('.res-questions > div').count()) === 3, `${testCase.route}: ${viewport.name} expected three evidence-routing questions`);
      check((await page.locator('.res-mini-flow').count()) === 2, `${testCase.route}: ${viewport.name} expected two causal mini-flows`);

      const body = await page.locator('body').innerText();
      for (const anchor of testCase.anchors) check(body.includes(anchor), `${testCase.route}: ${viewport.name} missing teaching anchor ${JSON.stringify(anchor)}`);
      for (const token of testCase.forbidden) check(!body.includes(token), `${testCase.route}: ${viewport.name} Spanish leakage ${JSON.stringify(token)}`);

      const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(pageOverflow <= 2, `${testCase.route}: ${viewport.name} horizontal page overflow ${pageOverflow}px`);
      for (const error of runtimeErrors) failures.push(`${testCase.route}: ${viewport.name} runtime error: ${error}`);

      await visual.screenshot({
        path: path.join(outDir, `reasoning-evidence-surfaces-${testCase.locale}-${viewport.name}.png`),
        animations: 'disabled',
      });
      await page.screenshot({
        path: path.join(outDir, `reasoning-evidence-surfaces-page-${testCase.locale}-${viewport.name}.png`),
        fullPage: true,
        animations: 'disabled',
      });
      await page.close();
    }

    const reduced = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await reduced.emulateMedia({ reducedMotion: 'reduce' });
    await reduced.goto(`${base}${testCase.route}`, { waitUntil: 'networkidle' });
    const reducedStyle = await reduced.locator('.res-card').first().evaluate((node) => ({
      transitionDuration: getComputedStyle(node).transitionDuration,
      animationName: getComputedStyle(node).animationName,
    }));
    check(reducedStyle.transitionDuration.split(',').every((value) => value.trim() === '0s'), `${testCase.route}: reduced-motion transition remains active (${reducedStyle.transitionDuration})`);
    check(reducedStyle.animationName === 'none', `${testCase.route}: reduced-motion animation remains active (${reducedStyle.animationName})`);
    await reduced.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error('Reasoning evidence-surfaces visual QA failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Reasoning evidence-surfaces visual QA passed: ES/EN canonical mirror, three evidence surfaces, primary references, desktop/mobile geometry, full-page screenshots, overflow, language integrity and reduced-motion behavior are valid.');
