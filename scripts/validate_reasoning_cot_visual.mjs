#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const sourcePath = path.resolve('docs/snippets/temas/reasoning-chain-of-thought.html');
const mapPath = path.resolve('locales/en/snippets/temas/reasoning-chain-of-thought.i18n.json');
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
const include = '{{ include_html("snippets/temas/reasoning-chain-of-thought.html") }}';

check(spanishTopic.includes(include), 'Spanish reasoning hub: missing chain-of-thought visual include');
check(englishTopic.includes(include), 'English reasoning hub: missing chain-of-thought visual include');
check(!spanishTopic.includes('→ descomponer el problema'), 'Spanish reasoning hub: legacy chain-of-thought ASCII flow is still present');
check(!englishTopic.includes('→ decompose the problem'), 'English reasoning hub: legacy chain-of-thought ASCII flow is still present');
check(translation.source === 'snippets/temas/reasoning-chain-of-thought.html', 'English translation map: wrong canonical source');
check(translation.source_blob_sha === gitBlobSha(source), `English translation map: source_blob_sha drift (expected ${gitBlobSha(source)}, found ${translation.source_blob_sha})`);
check(source.includes('prefers-reduced-motion:reduce'), 'Chain-of-thought visual: missing reduced-motion contract');
check(source.includes('explicación visible ≠ traza causal'), 'Chain-of-thought visual: missing faithfulness caveat');
check(source.includes('https://arxiv.org/abs/2201.11903'), 'Chain-of-thought visual: missing Wei et al. primary source');
check(source.includes('https://arxiv.org/abs/2305.04388'), 'Chain-of-thought visual: missing Turpin et al. primary source');

const browser = await chromium.launch({ headless: true });
const cases = [
  {
    locale: 'es',
    route: '/temas/razonamiento/',
    anchors: ['CHAIN OF THOUGHT', 'PROBLEMA', '1 · DESCOMPONER', '24 × (10 + 7)', '4 · RESPONDER', 'UTILIDAD', 'RIESGO', 'FIDELIDAD', 'explicación visible ≠ traza causal'],
    forbidden: [],
  },
  {
    locale: 'en',
    route: '/en/temas/razonamiento/',
    anchors: ['CHAIN OF THOUGHT', 'PROBLEM', '1 · DECOMPOSE', '24 × (10 + 7)', '4 · ANSWER', 'UTILITY', 'RISK', 'FAITHFULNESS', 'visible explanation ≠ causal trace'],
    forbidden: ['Los pasos intermedios pueden ayudar', 'CoT hace explícita', 'PROBLEMA', 'DESCOMPONER', 'RESOLVER', 'COMBINAR', 'RESPONDER', 'UTILIDAD', 'RIESGO', 'FIDELIDAD', 'Fuentes primarias:'],
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

      const visual = page.locator('.rct-wrap');
      check((await visual.count()) === 1, `${testCase.route}: ${viewport.name} expected exactly one .rct-wrap`);
      if (await visual.count()) {
        const box = await visual.boundingBox();
        check(Boolean(box && box.width >= 250 && box.height >= 260), `${testCase.route}: ${viewport.name} invalid chain-of-thought geometry ${JSON.stringify(box)}`);
        const overflow = await visual.evaluate((node) => node.scrollWidth - node.clientWidth);
        check(overflow <= 2, `${testCase.route}: ${viewport.name} chain-of-thought internal overflow ${overflow}px`);
      }

      check((await page.locator('.rct-problem').count()) === 1, `${testCase.route}: ${viewport.name} expected one problem card`);
      check((await page.locator('.rct-step').count()) === 4, `${testCase.route}: ${viewport.name} expected four reasoning steps`);
      check((await page.locator('.rct-contract').count()) === 3, `${testCase.route}: ${viewport.name} expected three utility/risk/faithfulness contracts`);

      const body = await page.locator('body').innerText();
      for (const anchor of testCase.anchors) check(body.includes(anchor), `${testCase.route}: ${viewport.name} missing teaching anchor ${JSON.stringify(anchor)}`);
      for (const token of testCase.forbidden) check(!body.includes(token), `${testCase.route}: ${viewport.name} Spanish leakage ${JSON.stringify(token)}`);

      const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(pageOverflow <= 2, `${testCase.route}: ${viewport.name} horizontal page overflow ${pageOverflow}px`);
      for (const error of runtimeErrors) failures.push(`${testCase.route}: ${viewport.name} runtime error: ${error}`);

      await visual.screenshot({
        path: path.join(outDir, `reasoning-cot-${testCase.locale}-${viewport.name}.png`),
        animations: 'disabled',
      });
      await page.close();
    }

    const reduced = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await reduced.emulateMedia({ reducedMotion: 'reduce' });
    await reduced.goto(`${base}${testCase.route}`, { waitUntil: 'networkidle' });
    const firstStep = reduced.locator('.rct-step').first();
    await firstStep.hover();
    const reducedStyle = await firstStep.evaluate((node) => ({
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
  console.error('Reasoning chain-of-thought visual QA failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Reasoning chain-of-thought visual QA passed: ES/EN source parity, four-step teaching flow, utility/risk/faithfulness framing, desktop/mobile geometry, overflow, language integrity, screenshots and reduced-motion behavior are valid.');
