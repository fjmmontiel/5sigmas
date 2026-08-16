#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const sourcePath = path.resolve('docs/snippets/temas/evaluation-cycle.html');
const mapPath = path.resolve('locales/en/snippets/temas/evaluation-cycle.i18n.json');
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

const [source, mapRaw, spanishTopic, englishTopic] = await Promise.all([
  fs.readFile(sourcePath, 'utf8'),
  fs.readFile(mapPath, 'utf8'),
  fs.readFile(spanishTopicPath, 'utf8'),
  fs.readFile(englishTopicPath, 'utf8'),
]);
const translation = JSON.parse(mapRaw);
const include = '{{ include_html("snippets/temas/evaluation-cycle.html") }}';

check(spanishTopic.includes(include), 'Spanish evaluation hub: missing evaluation-cycle include');
check(englishTopic.includes(include), 'English evaluation hub: missing evaluation-cycle include');
check(!spanishTopic.includes('→ añadir caso y criterio'), 'Spanish evaluation hub: legacy ASCII evaluation cycle is still present');
check(!englishTopic.includes('→ add a case and criterion'), 'English evaluation hub: legacy ASCII evaluation cycle is still present');
check(translation.source === 'snippets/temas/evaluation-cycle.html', 'English translation map: wrong canonical source');
check(translation.source_blob_sha === gitBlobSha(source), `English translation map: source_blob_sha drift (expected ${gitBlobSha(source)}, found ${translation.source_blob_sha})`);
check(source.includes('prefers-reduced-motion:reduce'), 'Evaluation cycle visual: missing reduced-motion contract');

const browser = await chromium.launch({ headless: true });
const cases = [
  {
    locale: 'es',
    route: '/temas/evaluacion-modelos/',
    anchors: ['BUCLE OPERATIVO', 'Incidente o necesidad', 'Mide el sistema actual', 'Modelo / prompt / sistema', 'Prueba limitada', 'Observa el producto', 'Fallo nuevo → caso permanente', 'CIERRA EL BUCLE'],
    forbidden: [],
  },
  {
    locale: 'en',
    route: '/en/temas/evaluacion-modelos/',
    anchors: ['OPERATIONAL LOOP', 'Incident or need', 'Measure the current system', 'Model / prompt / system', 'Limited rollout', 'Observe the product', 'New failure → permanent case', 'CLOSE THE LOOP'],
    forbidden: ['BUCLE OPERATIVO', 'Incidente o necesidad', 'Mide el sistema actual', 'Prueba limitada', 'Observa el producto', 'REGRESIÓN', 'CIERRA EL BUCLE'],
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

      const visual = page.locator('.evc-wrap');
      check((await visual.count()) === 1, `${testCase.route}: ${viewport.name} expected exactly one .evc-wrap`);
      if (await visual.count()) {
        const box = await visual.boundingBox();
        check(Boolean(box && box.width >= 250 && box.height >= 300), `${testCase.route}: ${viewport.name} invalid evaluation-cycle geometry ${JSON.stringify(box)}`);
        const overflow = await visual.evaluate((node) => node.scrollWidth - node.clientWidth);
        check(overflow <= 2, `${testCase.route}: ${viewport.name} evaluation-cycle internal overflow ${overflow}px`);
      }

      check((await page.locator('.evc-stage').count()) === 6, `${testCase.route}: ${viewport.name} expected 6 evaluation-cycle stages`);
      check((await page.locator('.evc-context-item').count()) === 2, `${testCase.route}: ${viewport.name} expected 2 offline/online context bands`);
      check((await page.locator('.evc-feedback').count()) === 1, `${testCase.route}: ${viewport.name} expected one loop-closing feedback band`);
      check((await page.locator('.evc-tags span').count()) === 18, `${testCase.route}: ${viewport.name} expected 18 stage evidence tags`);

      const body = await page.locator('body').innerText();
      for (const anchor of testCase.anchors) check(body.includes(anchor), `${testCase.route}: ${viewport.name} missing teaching anchor ${JSON.stringify(anchor)}`);
      for (const token of testCase.forbidden) check(!body.includes(token), `${testCase.route}: ${viewport.name} Spanish leakage ${JSON.stringify(token)}`);

      const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(pageOverflow <= 2, `${testCase.route}: ${viewport.name} horizontal page overflow ${pageOverflow}px`);
      for (const error of runtimeErrors) failures.push(`${testCase.route}: ${viewport.name} runtime error: ${error}`);

      await visual.screenshot({
        path: path.join(outDir, `evaluation-cycle-${testCase.locale}-${viewport.name}.png`),
        animations: 'disabled',
      });
      await page.close();
    }

    const reduced = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await reduced.emulateMedia({ reducedMotion: 'reduce' });
    await reduced.goto(`${base}${testCase.route}`, { waitUntil: 'networkidle' });
    const firstStage = reduced.locator('.evc-stage').first();
    await firstStage.hover();
    const reducedStyle = await firstStage.evaluate((node) => ({
      transitionDuration: getComputedStyle(node).transitionDuration,
      transform: getComputedStyle(node).transform,
    }));
    check(reducedStyle.transitionDuration.split(',').every((value) => value.trim() === '0s'), `${testCase.route}: reduced-motion transition remains active (${reducedStyle.transitionDuration})`);
    check(reducedStyle.transform === 'none', `${testCase.route}: reduced-motion hover transform remains active (${reducedStyle.transform})`);
    await reduced.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error('Evaluation-cycle visual QA failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Evaluation-cycle visual QA passed: ES/EN source parity, six-stage loop, desktop/mobile geometry, overflow, language integrity, screenshots and reduced-motion behavior are valid.');
