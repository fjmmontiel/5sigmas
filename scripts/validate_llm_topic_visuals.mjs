#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const failures = [];
const visuals = [
  {
    selector: '.ltp-wrap',
    source: 'docs/snippets/temas/llm-token-pipeline.html',
    mirror: 'locales/en/snippets/temas/llm-token-pipeline.html',
    map: 'locales/en/snippets/temas/llm-token-pipeline.i18n.json',
    countSelector: '.ltp-card',
    count: 5,
  },
  {
    selector: '.ltk-wrap',
    source: 'docs/snippets/temas/llm-tokenization.html',
    mirror: 'locales/en/snippets/temas/llm-tokenization.html',
    map: 'locales/en/snippets/temas/llm-tokenization.i18n.json',
    countSelector: '.ltk-stage',
    count: 3,
  },
  {
    selector: '.lcr-wrap',
    source: 'docs/snippets/temas/llm-contextual-representation.html',
    mirror: 'locales/en/snippets/temas/llm-contextual-representation.html',
    map: 'locales/en/snippets/temas/llm-contextual-representation.i18n.json',
    countSelector: '.lcr-stage',
    count: 6,
  },
  {
    selector: '.lnt-wrap',
    source: 'docs/snippets/temas/llm-next-token.html',
    mirror: 'locales/en/snippets/temas/llm-next-token.html',
    map: 'locales/en/snippets/temas/llm-next-token.i18n.json',
    countSelector: '.lnt-row',
    count: 3,
  },
  {
    selector: '.las-wrap',
    source: 'docs/snippets/temas/llm-adaptation-stages.html',
    mirror: 'locales/en/snippets/temas/llm-adaptation-stages.html',
    map: 'locales/en/snippets/temas/llm-adaptation-stages.i18n.json',
    countSelector: '.las-stage',
    count: 3,
  },
];

const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
];

function gitBlobSha(text) {
  const body = Buffer.from(text, 'utf8');
  return crypto.createHash('sha1').update(Buffer.from(`blob ${body.length}\0`)).update(body).digest('hex');
}

async function validateSourceContracts() {
  const spanishTopic = await fs.readFile('docs/temas/llms.md', 'utf8');
  const englishTopic = await fs.readFile('locales/en/temas/llms.md', 'utf8');

  for (const visual of visuals) {
    const includePath = visual.source.replace(/^docs\//, '');
    const include = `{{ include_html(\"${includePath}\") }}`;
    if (!spanishTopic.includes(include)) failures.push(`docs/temas/llms.md missing ${include}`);
    if (!englishTopic.includes(include)) failures.push(`locales/en/temas/llms.md missing ${include}`);

    const source = await fs.readFile(visual.source, 'utf8');
    if (!source.includes(visual.selector.slice(1))) failures.push(`${visual.source} missing root ${visual.selector}`);

    const mirror = (await fs.readFile(visual.mirror, 'utf8')).trim();
    if (mirror !== '<!-- 5sigmas-canonical-mirror -->') failures.push(`${visual.mirror} is not a canonical mirror marker`);

    const map = JSON.parse(await fs.readFile(visual.map, 'utf8'));
    if (map.source !== includePath) failures.push(`${visual.map} source=${JSON.stringify(map.source)} expected ${JSON.stringify(includePath)}`);
    const actualSha = gitBlobSha(source);
    if (map.source_blob_sha !== actualSha) failures.push(`${visual.map} source_blob_sha=${map.source_blob_sha} expected ${actualSha}`);
  }
}

async function checkTokenizationDensity(page, route, locale, viewport) {
  const expectedCounts = [
    ['.ltk-stage', 3],
    ['.ltk-tokenizer', 2],
    ['.ltk-contract', 3],
    ['.ltk-ids b', 4],
    ['.ltk-pieces--a b', 2],
    ['.ltk-pieces--b b', 4],
  ];
  for (const [selector, expected] of expectedCounts) {
    const count = await page.locator(selector).count();
    if (count !== expected) failures.push(`${route}: ${viewport.name} expected ${expected} ${selector}, found ${count}`);
  }

  const expected = locale === 'es'
    ? {
        source: ['“arquitectura neuronal”', '“arquitectura neuronal”'],
        a: ['▁arquitectura', '▁neuronal'],
        b: ['▁arqui', 'tectura', '▁neuro', 'nal'],
      }
    : {
        source: ['“neural architecture”', '“neural architecture”'],
        a: ['▁neural', '▁architecture'],
        b: ['▁neu', 'ral', '▁archi', 'tecture'],
      };

  const actualSource = await page.locator('.ltk-source').allTextContents();
  const actualA = await page.locator('.ltk-pieces--a b').allTextContents();
  const actualB = await page.locator('.ltk-pieces--b b').allTextContents();
  for (const [label, actual, wanted] of [
    ['comparison source', actualSource, expected.source],
    ['tokenizer A pieces', actualA, expected.a],
    ['tokenizer B pieces', actualB, expected.b],
  ]) {
    if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
      failures.push(`${route}: ${viewport.name} ${label}=${JSON.stringify(actual)} expected ${JSON.stringify(wanted)}`);
    }
  }
}

async function checkPage(browser, route, locale, viewport) {
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
  const runtimeErrors = [];
  page.on('pageerror', (error) => runtimeErrors.push(`pageerror: ${error.message}`));
  const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
  if (!response?.ok()) failures.push(`${route}: HTTP ${response?.status() ?? 'no response'}`);

  const lang = await page.locator('html').getAttribute('lang');
  if (lang !== locale) failures.push(`${route}: html lang=${JSON.stringify(lang)} expected ${locale}`);

  const body = await page.locator('body').innerText();
  const anchors = locale === 'es'
    ? [
        'DEL TEXTO A LA PREDICCIÓN',
        'TOKENIZACIÓN · TEXTO → UNIDADES DISCRETAS',
        'LOS IDs NO SON UNIVERSALES',
        'las segmentaciones de este diagrama son pedagógicas',
        'REPRESENTACIÓN CONTEXTUAL',
        'OBJETIVO AUTORREGRESIVO',
        'DEL MODELO BASE AL ASISTENTE',
        'probabilidad sobre el vocabulario',
        'El embedding de token es el punto de partida',
        'Optimizar probabilidad de continuación',
      ]
    : [
        'FROM TEXT TO PREDICTION',
        'TOKENIZATION · TEXT → DISCRETE UNITS',
        'IDs ARE NOT UNIVERSAL',
        'the segmentations in this diagram are pedagogical',
        'CONTEXTUAL REPRESENTATION',
        'AUTOREGRESSIVE OBJECTIVE',
        'FROM BASE MODEL TO ASSISTANT',
        'probability over the vocabulary',
        'The token embedding is the starting point',
        'Optimizing continuation probability',
      ];
  for (const anchor of anchors) if (!body.includes(anchor)) failures.push(`${route}: ${viewport.name} missing anchor ${JSON.stringify(anchor)}`);

  if (locale === 'en') {
    for (const token of [
      'DEL TEXTO A LA PREDICCIÓN',
      'TOKENIZACIÓN',
      'VOCABULARIOS DISTINTOS',
      'TOKENIZADOR A',
      'LOS IDs NO SON UNIVERSALES',
      'REPRESENTACIÓN CONTEXTUAL',
      'IDENTIDAD DEL TOKEN',
      'CONTEXTO A',
      'Lectura correcta',
      'OBJETIVO AUTORREGRESIVO',
      'DEL MODELO BASE AL ASISTENTE',
      'Fuentes primarias:',
      'Fuente primaria:',
    ]) {
      if (body.includes(token)) failures.push(`${route}: ${viewport.name} Spanish leakage ${JSON.stringify(token)}`);
    }
  }

  for (const visual of visuals) {
    const locator = page.locator(visual.selector);
    const count = await locator.count();
    if (count !== 1) {
      failures.push(`${route}: ${viewport.name} expected one ${visual.selector}, found ${count}`);
      continue;
    }
    const box = await locator.boundingBox();
    if (!box || box.width < 250 || box.height < 150) failures.push(`${route}: ${viewport.name} ${visual.selector} invalid geometry ${JSON.stringify(box)}`);
    const overflow = await locator.evaluate((node) => node.scrollWidth - node.clientWidth);
    if (overflow > 2) failures.push(`${route}: ${viewport.name} ${visual.selector} internal overflow ${overflow}px`);

    const density = await page.locator(visual.countSelector).count();
    if (density !== visual.count) failures.push(`${route}: ${viewport.name} expected ${visual.count} ${visual.countSelector}, found ${density}`);

    await locator.screenshot({ path: path.join(outDir, `concept-llm-${locale}-${viewport.name}-${visual.selector.slice(1)}.png`), animations: 'disabled' });
  }

  await checkTokenizationDensity(page, route, locale, viewport);

  const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (pageOverflow > 2) failures.push(`${route}: ${viewport.name} page overflow ${pageOverflow}px`);
  for (const error of runtimeErrors) failures.push(`${route}: ${viewport.name} ${error}`);

  await page.screenshot({ path: path.join(outDir, `concept-llm-${locale}-${viewport.name}-full.png`), fullPage: true, animations: 'disabled' });
  await page.close();
}

await validateSourceContracts();
const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) {
    await checkPage(browser, '/temas/llms/', 'es', viewport);
    await checkPage(browser, '/en/temas/llms/', 'en', viewport);
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error('LLM topic visual QA failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('LLM topic visual QA passed.');
