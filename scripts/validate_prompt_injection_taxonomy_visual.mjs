#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const sourcePath = path.resolve('docs/snippets/temas/prompt-injection-taxonomy.html');
const englishPath = path.resolve('locales/en/snippets/temas/prompt-injection-taxonomy.html');
const mapPath = path.resolve('locales/en/snippets/temas/prompt-injection-taxonomy.i18n.json');
const spanishTopicPath = path.resolve('docs/temas/prompt-injection.md');
const englishTopicPath = path.resolve('locales/en/temas/prompt-injection.md');
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
const include = '{{ include_html("snippets/temas/prompt-injection-taxonomy.html") }}';
const oldSpanishTable = '| **Jailbreak** | ¿Puede una variación de la petición superar una restricción del modelo? |';
const oldEnglishTable = '| **Jailbreak** | Can a variation of the request bypass a model restriction? |';

check(spanishTopic.includes(include), 'Spanish prompt-injection hub: missing taxonomy visual include');
check(englishTopic.includes(include), 'English prompt-injection hub: missing taxonomy visual include');
check(!spanishTopic.includes(oldSpanishTable), 'Spanish prompt-injection hub: legacy risk table still present');
check(!englishTopic.includes(oldEnglishTable), 'English prompt-injection hub: legacy risk table still present');
check(englishSource.trim() === '<!-- 5sigmas-canonical-mirror -->', 'English prompt-injection taxonomy snippet must opt into the SHA-pinned canonical mirror');
check(translation.source === 'snippets/temas/prompt-injection-taxonomy.html', 'Prompt-injection taxonomy translation map: wrong canonical source');
check(translation.source_blob_sha === gitBlobSha(source), `Prompt-injection taxonomy translation map: source_blob_sha drift (expected ${gitBlobSha(source)}, found ${translation.source_blob_sha})`);
check(source.includes('prefers-reduced-motion:reduce'), 'Prompt-injection taxonomy visual: missing reduced-motion contract');
check(source.includes('https://arxiv.org/abs/2302.12173'), 'Prompt-injection taxonomy visual: missing Greshake indirect-injection reference');
check(source.includes('https://arxiv.org/abs/2307.15043'), 'Prompt-injection taxonomy visual: missing Zou jailbreak reference');
check(source.includes('https://openai.com/index/designing-agents-to-resist-prompt-injection/'), 'Prompt-injection taxonomy visual: missing OpenAI prompt-injection reference');

let expectedEnglish = source;
const missingReplacements = [];
for (const [from, to] of Object.entries(translation.replacements || {}).sort((a, b) => b[0].length - a[0].length)) {
  if (!expectedEnglish.includes(from)) missingReplacements.push(from);
  expectedEnglish = expectedEnglish.replaceAll(from, to);
}
check(missingReplacements.length === 0, `Prompt-injection taxonomy translation map has missing replacements: ${missingReplacements.slice(0, 3).join(' | ')}`);
for (const token of translation.forbidden_output_tokens || []) {
  check(!expectedEnglish.includes(token), `Prompt-injection taxonomy translated canonical still contains forbidden Spanish token ${JSON.stringify(token)}`);
}

const cases = [
  {
    locale: 'es',
    route: '/temas/prompt-injection/',
    anchors: [
      'MISMO FORMATO DE TEXTO · DISTINTO CONTRATO DE SEGURIDAD',
      'Jailbreak, inyección directa e indirecta no atacan exactamente lo mismo',
      'JAILBREAK',
      'INYECCIÓN DIRECTA',
      'INYECCIÓN INDIRECTA',
      'OBJETIVO ATACADO',
      'CONTROL CLAVE',
      'RELACIÓN',
      'SOLAPAMIENTO',
      'EVALUACIÓN',
    ],
    forbidden: [],
  },
  {
    locale: 'en',
    route: '/en/temas/prompt-injection/',
    anchors: [
      'SAME TEXT FORMAT · DIFFERENT SECURITY CONTRACT',
      'Jailbreak, direct injection and indirect injection do not attack exactly the same thing',
      'JAILBREAK',
      'DIRECT INJECTION',
      'INDIRECT INJECTION',
      'TARGET',
      'KEY CONTROL',
      'RELATIONSHIP',
      'OVERLAP',
      'EVALUATION',
    ],
    forbidden: [
      'MISMO FORMATO DE TEXTO',
      'inyección directa',
      'inyección indirecta',
      'OBJETIVO ATACADO',
      'CONTROL CLAVE',
      'RELACIÓN',
      'SOLAPAMIENTO',
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

      const visual = page.locator('.pit-wrap');
      check((await visual.count()) === 1, `${testCase.route}: ${viewport.name} expected exactly one .pit-wrap`);
      if (await visual.count()) {
        const box = await visual.boundingBox();
        check(Boolean(box && box.width >= 250 && box.height >= 520), `${testCase.route}: ${viewport.name} invalid taxonomy geometry ${JSON.stringify(box)}`);
        const overflow = await visual.evaluate((node) => node.scrollWidth - node.clientWidth);
        check(overflow <= 2, `${testCase.route}: ${viewport.name} taxonomy internal overflow ${overflow}px`);
        const text = await visual.innerText();
        for (const anchor of testCase.anchors) check(text.includes(anchor), `${testCase.route}: ${viewport.name} missing taxonomy teaching anchor ${JSON.stringify(anchor)}`);
        for (const token of testCase.forbidden) check(!text.includes(token), `${testCase.route}: ${viewport.name} taxonomy Spanish leakage ${JSON.stringify(token)}`);
      }

      check((await page.locator('.pit-card').count()) === 3, `${testCase.route}: ${viewport.name} expected 3 risk cards`);
      check((await page.locator('.pit-flow').count()) === 3, `${testCase.route}: ${viewport.name} expected 3 attack-entry flows`);
      check((await page.locator('.pit-row').count()) === 9, `${testCase.route}: ${viewport.name} expected 9 entry/target/control rows`);
      check((await page.locator('.pit-note').count()) === 3, `${testCase.route}: ${viewport.name} expected 3 distinction notes`);
      check((await page.locator('.pit-contracts > div').count()) === 3, `${testCase.route}: ${viewport.name} expected 3 teaching contracts`);

      const flowLines = await page.locator('.pit-flow b').evaluateAll((nodes) => nodes.map((node) => {
        const style = getComputedStyle(node);
        const lineHeight = Number.parseFloat(style.lineHeight);
        const innerHeight = node.clientHeight - Number.parseFloat(style.paddingTop) - Number.parseFloat(style.paddingBottom);
        return { text: node.textContent?.trim() || '', lines: innerHeight / lineHeight };
      }));
      for (const flow of flowLines) {
        check(flow.lines <= 2.25, `${testCase.route}: ${viewport.name} flow label wraps beyond two lines: ${JSON.stringify(flow)}`);
      }

      const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(pageOverflow <= 2, `${testCase.route}: ${viewport.name} horizontal page overflow ${pageOverflow}px`);
      for (const error of runtimeErrors) failures.push(`${testCase.route}: ${viewport.name} runtime error: ${error}`);

      if (await visual.count()) {
        // The site header is intentionally sticky; hide only site chrome for the isolated
        // review artifact so a stitched mobile element screenshot cannot obscure the visual.
        await page.addStyleTag({ content: '.md-header,.md-tabs{visibility:hidden!important}' });
        await visual.screenshot({
          path: path.join(outDir, `prompt-injection-taxonomy-${testCase.locale}-${viewport.name}.png`),
          animations: 'disabled',
        });
      }
      await page.close();
    }

    const reduced = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await reduced.emulateMedia({ reducedMotion: 'reduce' });
    await reduced.goto(`${base}${testCase.route}`, { waitUntil: 'networkidle' });
    const motion = await reduced.locator('.pit-card').first().evaluate((node) => {
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
  console.error('Prompt-injection taxonomy visual validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Prompt-injection taxonomy visual validation passed: ES/EN mirror parity, three-risk semantics, desktop/mobile geometry, flow-label legibility, overflow, language integrity, screenshots and reduced-motion behavior are valid.');
