#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const sourcePath = path.resolve('docs/snippets/temas/evaluation-offline-online.html');
const englishPath = path.resolve('locales/en/snippets/temas/evaluation-offline-online.html');
const mapPath = path.resolve('locales/en/snippets/temas/evaluation-offline-online.i18n.json');
const spanishTopicPath = path.resolve('docs/temas/evaluacion-modelos.md');
const englishTopicPath = path.resolve('locales/en/temas/evaluacion-modelos.md');
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
const include = '{{ include_html("snippets/temas/evaluation-offline-online.html") }}';

check(spanishTopic.includes(include), 'Spanish evaluation hub: missing offline-online visual include');
check(englishTopic.includes(include), 'English evaluation hub: missing offline-online visual include');
check(!spanishTopic.includes('| Offline | Online |'), 'Spanish evaluation hub: legacy offline-online table still present');
check(!englishTopic.includes('| Offline | Online |'), 'English evaluation hub: legacy offline-online table still present');
check(englishSource.trim() === '<!-- 5sigmas-canonical-mirror -->', 'English offline-online snippet must use canonical mirror marker');
check(translation.source === 'snippets/temas/evaluation-offline-online.html', 'Offline-online translation map: wrong canonical source');
check(translation.source_blob_sha === gitBlobSha(source), `Offline-online translation map: source_blob_sha drift (expected ${gitBlobSha(source)}, found ${translation.source_blob_sha})`);
check(source.includes('prefers-reduced-motion:reduce'), 'Offline-online visual: missing reduced-motion contract');
check(source.includes('https://openai.com/index/gpt-4-research/'), 'Offline-online visual: missing OpenAI Evals primary reference');
check(source.includes('https://www.microsoft.com/en-us/research/publication/online-experimentation-at-microsoft/'), 'Offline-online visual: missing Microsoft controlled-experiment reference');
check(source.includes('https://www.microsoft.com/en-us/research/publication/principles-for-the-design-of-online-a-b-metrics/'), 'Offline-online visual: missing A/B metric-design reference');

let expectedEnglish = source;
const missingReplacements = [];
for (const [from, to] of Object.entries(translation.replacements || {}).sort((a, b) => b[0].length - a[0].length)) {
  if (!expectedEnglish.includes(from)) missingReplacements.push(from);
  expectedEnglish = expectedEnglish.replaceAll(from, to);
}
check(missingReplacements.length === 0, `Offline-online translation map has missing replacements: ${missingReplacements.slice(0, 3).join(' | ')}`);
for (const token of translation.forbidden_output_tokens || []) check(!expectedEnglish.includes(token), `Offline-online translated canonical still contains forbidden Spanish token ${JSON.stringify(token)}`);

const cases = [
  {
    locale: 'es', route: '/temas/evaluacion-modelos/',
    anchors: ['Una eval offline no es el resultado del usuario','Exactitud por intención','Éxito de tarea','Reformulación y abandono','Espera percibida y abandono','Incidentes, reversión y escalado','Coste por tarea completada','PROXY ≠ OUTCOME','SEGMENTA','GUARDRAILS'],
    forbidden: [],
  },
  {
    locale: 'en', route: '/en/temas/evaluacion-modelos/',
    anchors: ['An offline eval is not the user outcome','Accuracy by intent','Task success','Reformulation and abandonment','Perceived wait and abandonment','Incidents, rollback, and escalation','Cost per completed task','PROXY ≠ OUTCOME','SEGMENT','GUARDRAILS'],
    forbidden: ['Una eval offline','Exactitud por intención','Éxito de tarea','Reformulación y abandono','Espera percibida','Incidentes, reversión','Coste por tarea','Fuentes:'],
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
      const visual = page.locator('.eoo-wrap');
      check((await visual.count()) === 1, `${testCase.route}: ${viewport.name} expected exactly one .eoo-wrap`);
      if (await visual.count()) {
        const box = await visual.boundingBox();
        check(Boolean(box && box.width >= 250 && box.height >= 430), `${testCase.route}: ${viewport.name} invalid offline-online geometry ${JSON.stringify(box)}`);
        const overflow = await visual.evaluate((node) => node.scrollWidth - node.clientWidth);
        check(overflow <= 2, `${testCase.route}: ${viewport.name} offline-online internal overflow ${overflow}px`);
        const text = await visual.innerText();
        for (const anchor of testCase.anchors) check(text.includes(anchor), `${testCase.route}: ${viewport.name} missing teaching anchor ${JSON.stringify(anchor)}`);
        for (const token of testCase.forbidden) check(!text.includes(token), `${testCase.route}: ${viewport.name} Spanish leakage ${JSON.stringify(token)}`);
      }
      check((await page.locator('.eoo-row').count()) === 5, `${testCase.route}: ${viewport.name} expected 5 offline-online mappings`);
      check((await page.locator('.eoo-card--offline').count()) === 5, `${testCase.route}: ${viewport.name} expected 5 offline cards`);
      check((await page.locator('.eoo-bridge').count()) === 5, `${testCase.route}: ${viewport.name} expected 5 proxy bridges`);
      check((await page.locator('.eoo-card--online').count()) === 5, `${testCase.route}: ${viewport.name} expected 5 online cards`);
      check((await page.locator('.eoo-gate-step').count()) === 3, `${testCase.route}: ${viewport.name} expected 3 promotion/experiment/decision steps`);
      check((await page.locator('.eoo-contracts > div').count()) === 3, `${testCase.route}: ${viewport.name} expected 3 product-decision contracts`);
      const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(pageOverflow <= 2, `${testCase.route}: ${viewport.name} horizontal page overflow ${pageOverflow}px`);
      for (const error of runtimeErrors) failures.push(`${testCase.route}: ${viewport.name} runtime error: ${error}`);
      if (await visual.count()) {
        await page.locator('.md-header').evaluateAll((nodes) => nodes.forEach((node) => { node.style.visibility = 'hidden'; }));
        await visual.screenshot({ path: path.join(outDir, `evaluation-offline-online-${testCase.locale}-${viewport.name}.png`), animations: 'disabled' });
      }
      await page.close();
    }

    const reduced = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await reduced.emulateMedia({ reducedMotion: 'reduce' });
    await reduced.goto(`${base}${testCase.route}`, { waitUntil: 'networkidle' });
    const motion = await reduced.locator('.eoo-card').first().evaluate((node) => {
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
  console.error('Evaluation offline-online visual validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Evaluation offline-online visual validation passed: ES/EN mirror parity, 5 proxy-to-outcome mappings, gated rollout semantics, primary references, desktop/mobile geometry, overflow, language integrity, screenshots and reduced-motion behavior are valid.');
