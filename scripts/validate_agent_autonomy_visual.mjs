#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const sourcePath = path.resolve('docs/snippets/temas/agent-autonomy-spectrum.html');
const englishPath = path.resolve('locales/en/snippets/temas/agent-autonomy-spectrum.html');
const mapPath = path.resolve('locales/en/snippets/temas/agent-autonomy-spectrum.i18n.json');
const spanishTopicPath = path.resolve('docs/temas/agentes-ia.md');
const englishTopicPath = path.resolve('locales/en/temas/agentes-ia.md');
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
const include = '{{ include_html("snippets/temas/agent-autonomy-spectrum.html") }}';
const oldSpanishTable = '| **Chatbot** | Flujo conversacional | Normalmente no | Responder una pregunta |';
const oldEnglishTable = '| **Chatbot** | Conversational flow | Usually no | Answer a question |';

check(spanishTopic.includes(include), 'Spanish agents hub: missing autonomy-spectrum visual include');
check(englishTopic.includes(include), 'English agents hub: missing autonomy-spectrum visual include');
check(!spanishTopic.includes(oldSpanishTable), 'Spanish agents hub: legacy comparison table still present');
check(!englishTopic.includes(oldEnglishTable), 'English agents hub: legacy comparison table still present');
check(englishSource.trim() === '<!-- 5sigmas-canonical-mirror -->', 'English agent autonomy snippet must opt into the SHA-pinned canonical mirror');
check(translation.source === 'snippets/temas/agent-autonomy-spectrum.html', 'Agent autonomy translation map: wrong canonical source');
check(translation.source_blob_sha === gitBlobSha(source), `Agent autonomy translation map: source_blob_sha drift (expected ${gitBlobSha(source)}, found ${translation.source_blob_sha})`);
check(source.includes('prefers-reduced-motion:reduce'), 'Agent autonomy visual: missing reduced-motion contract');
check(source.includes('https://www.anthropic.com/research/trustworthy-agents'), 'Agent autonomy visual: missing Anthropic primary reference');
check(source.includes('https://openai.github.io/openai-agents-python/multi_agent/'), 'Agent autonomy visual: missing OpenAI orchestration primary reference');
check(source.includes('https://openai.github.io/openai-agents-python/running_agents/'), 'Agent autonomy visual: missing OpenAI agent-loop primary reference');

let expectedEnglish = source;
const missingReplacements = [];
for (const [from, to] of Object.entries(translation.replacements || {}).sort((a, b) => b[0].length - a[0].length)) {
  if (!expectedEnglish.includes(from)) missingReplacements.push(from);
  expectedEnglish = expectedEnglish.replaceAll(from, to);
}
check(missingReplacements.length === 0, `Agent autonomy translation map has missing replacements: ${missingReplacements.slice(0, 3).join(' | ')}`);
for (const token of translation.forbidden_output_tokens || []) {
  check(!expectedEnglish.includes(token), `Agent autonomy translated canonical still contains forbidden Spanish token ${JSON.stringify(token)}`);
}

const cases = [
  {
    locale: 'es',
    route: '/temas/agentes-ia/',
    anchors: [
      'CUATRO PATRONES · QUIÉN DECIDE · QUIÉN EJECUTA',
      'La diferencia está en quién decide el siguiente paso y quién puede ejecutar',
      'RECORRIDO FIJADO EN CÓDIGO',
      'SECUENCIA DECIDIDA EN RUNTIME',
      'CHATBOT',
      'WORKFLOW',
      'COPILOTO',
      'AGENTE ACOTADO',
      'NO ES UN RANKING',
      'SEÑAL DE AGENCIA',
      'SEÑAL DE SEGURIDAD',
    ],
    forbidden: [],
  },
  {
    locale: 'en',
    route: '/en/temas/agentes-ia/',
    anchors: [
      'FOUR PATTERNS · WHO DECIDES · WHO EXECUTES',
      'The difference is who chooses the next step and who can execute it',
      'PATH FIXED IN CODE',
      'SEQUENCE DECIDED AT RUNTIME',
      'CHATBOT',
      'WORKFLOW',
      'COPILOT',
      'BOUNDED AGENT',
      'NOT A RANKING',
      'AGENCY SIGNAL',
      'SAFETY SIGNAL',
    ],
    forbidden: [
      'CUATRO PATRONES',
      'La diferencia está en quién decide',
      'RECORRIDO FIJADO EN CÓDIGO',
      'SECUENCIA DECIDIDA EN RUNTIME',
      'COPILOTO',
      'AGENTE ACOTADO',
      'QUIÉN ELIGE EL SIGUIENTE PASO',
      'EFECTO EXTERNO',
      'NO ES UN RANKING',
      'SEÑAL DE AGENCIA',
      'SEÑAL DE SEGURIDAD',
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

      const visual = page.locator('.aas-wrap');
      check((await visual.count()) === 1, `${testCase.route}: ${viewport.name} expected exactly one .aas-wrap`);
      if (await visual.count()) {
        const box = await visual.boundingBox();
        check(Boolean(box && box.width >= 250 && box.height >= 450), `${testCase.route}: ${viewport.name} invalid autonomy-spectrum geometry ${JSON.stringify(box)}`);
        const overflow = await visual.evaluate((node) => node.scrollWidth - node.clientWidth);
        check(overflow <= 2, `${testCase.route}: ${viewport.name} autonomy-spectrum internal overflow ${overflow}px`);
        const text = await visual.innerText();
        for (const anchor of testCase.anchors) check(text.includes(anchor), `${testCase.route}: ${viewport.name} missing agent-autonomy teaching anchor ${JSON.stringify(anchor)}`);
        for (const token of testCase.forbidden) check(!text.includes(token), `${testCase.route}: ${viewport.name} agent-autonomy Spanish leakage ${JSON.stringify(token)}`);
      }

      check((await page.locator('.aas-card').count()) === 4, `${testCase.route}: ${viewport.name} expected 4 system cards`);
      check((await page.locator('.aas-card-head').count()) === 4, `${testCase.route}: ${viewport.name} expected 4 card headers`);
      check((await page.locator('.aas-flow').count()) === 4, `${testCase.route}: ${viewport.name} expected 4 control-flow lanes`);
      check((await page.locator('.aas-row').count()) === 8, `${testCase.route}: ${viewport.name} expected 8 controller/effect rows`);
      check((await page.locator('.aas-gate').count()) === 4, `${testCase.route}: ${viewport.name} expected 4 authority notes`);
      check((await page.locator('.aas-contracts > div').count()) === 3, `${testCase.route}: ${viewport.name} expected 3 teaching contracts`);

      const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(pageOverflow <= 2, `${testCase.route}: ${viewport.name} horizontal page overflow ${pageOverflow}px`);
      for (const error of runtimeErrors) failures.push(`${testCase.route}: ${viewport.name} runtime error: ${error}`);

      if (await visual.count()) {
        await visual.screenshot({
          path: path.join(outDir, `agent-autonomy-${testCase.locale}-${viewport.name}.png`),
          animations: 'disabled',
        });
      }
      await page.close();
    }

    const reduced = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await reduced.emulateMedia({ reducedMotion: 'reduce' });
    await reduced.goto(`${base}${testCase.route}`, { waitUntil: 'networkidle' });
    const motion = await reduced.locator('.aas-card').first().evaluate((node) => {
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
  console.error('Agent autonomy visual validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Agent autonomy visual validation passed: ES/EN mirror parity, four-system control/authority semantics, desktop/mobile geometry, overflow, language integrity, screenshots and reduced-motion behavior are valid.');
