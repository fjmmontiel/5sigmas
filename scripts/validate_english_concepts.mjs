#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const transformerVisuals = [
  { selector: '.tvb-wrap', source: 'docs/snippets/temas/transformer-block.html' },
  { selector: '.tqv-wrap', source: 'docs/snippets/temas/transformer-qkv.html' },
  { selector: '.tcm-wrap', source: 'docs/snippets/temas/transformer-causal-mask.html' },
];
const evaluationVisuals = [
  { selector: '.evo-wrap', source: 'docs/snippets/temas/evaluation-object.html' },
  { selector: '.evs-wrap', source: 'docs/snippets/temas/evaluation-stack.html' },
  { selector: '.evt-wrap', source: 'docs/snippets/temas/evaluation-system-trace.html' },
];
const concepts = [
  { route: '/en/temas/llms/', title: 'What is an LLM and how does it work?', terms: ['tokenization', 'pretraining', 'Parameters'] },
  { route: '/en/temas/transformer/', title: 'How the Transformer works', terms: ['Query', 'Key', 'Value', 'Multi-head attention'], visuals: transformerVisuals.map((item) => item.selector), visualGroup: 'transformer' },
  { route: '/en/temas/razonamiento/', title: 'Reasoning in LLMs', terms: ['Chain of thought', 'Test-time compute', 'verifier'] },
  { route: '/en/temas/evaluacion-modelos/', title: 'Evaluating AI models', terms: ['golden set', 'benchmark', 'LLM as a judge'], visuals: evaluationVisuals.map((item) => item.selector), visualGroup: 'evaluation' },
  { route: '/en/temas/agentes-ia/', title: 'What is an AI agent?', terms: ['tool calling', 'Operational state', 'least privilege'] },
  { route: '/en/temas/prompt-injection/', title: 'What is prompt injection?', terms: ['indirect prompt injection', 'least privilege', 'Authorize outside the prompt'] },
];

const forbidden = ['Preguntas frecuentes', 'Fuentes primarias', 'Dónde profundizar', 'La respuesta en 60 segundos'];
const transformerEnglishForbidden = [
  'ARQUITECTURA',
  'sin saltos',
  'máscara causal',
  'Durante el entrenamiento',
  'Mezclar valores',
  'Representación contextual',
];
const evaluationEnglishForbidden = [
  'OBJETO DE EVALUACIÓN',
  'La misma respuesta',
  'PILA DE EVALUACIÓN',
  'Datos de referencia',
  'DIAGNÓSTICO DE SISTEMAS',
  'No puntúes solo',
  'documento ausente',
  'acción equivocada',
  'PRINCIPIO',
];
const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
];
const failures = [];

async function validateSpanishVisualSources(topicRel, visuals, expectedLabels) {
  const topicPath = path.resolve(topicRel);
  const topic = await fs.readFile(topicPath, 'utf8');
  for (const visual of visuals) {
    const rel = visual.source.replace(/^docs\//, '');
    const include = `{{ include_html(\"${rel}\") }}`;
    if (!topic.includes(include)) failures.push(`${topicRel}: missing canonical include ${include}`);

    const source = await fs.readFile(path.resolve(visual.source), 'utf8');
    if (!source.includes(visual.selector.slice(1))) failures.push(`${visual.source}: missing visual root ${visual.selector}`);
  }

  for (const expected of expectedLabels) {
    const found = await Promise.all(visuals.map(async (visual) => (await fs.readFile(path.resolve(visual.source), 'utf8')).includes(expected)));
    if (!found.some(Boolean)) failures.push(`${topicRel}: missing Spanish visual teaching label ${JSON.stringify(expected)}`);
  }
}

async function checkVisualContract(page, route, viewport, selectors) {
  for (const selector of selectors) {
    const count = await page.locator(selector).count();
    if (count !== 1) failures.push(`${route}: ${viewport.name} expected exactly one ${selector}, found ${count}`);
    if (count === 1) {
      const box = await page.locator(selector).boundingBox();
      if (!box || box.width < 250 || box.height < 120) failures.push(`${route}: ${viewport.name} ${selector} has invalid geometry ${JSON.stringify(box)}`);
      const overflow = await page.locator(selector).evaluate((node) => node.scrollWidth - node.clientWidth);
      if (overflow > 2) failures.push(`${route}: ${viewport.name} ${selector} internal overflow ${overflow}px`);
    }
  }
}

async function checkEvaluationDensity(page, route, viewport) {
  const expectedCounts = [
    ['.evo-level', 4],
    ['.evs-stage', 6],
    ['.evt-lane', 2],
    ['.evt-step', 12],
  ];
  for (const [selector, expected] of expectedCounts) {
    const count = await page.locator(selector).count();
    if (count !== expected) failures.push(`${route}: ${viewport.name} expected ${expected} ${selector}, found ${count}`);
  }
  for (const text of ['Reference data', 'External benchmarks', 'Judge + humans', 'Online metrics', 'Answer + citations', 'Final answer']) {
    if (!(await page.locator('body').innerText()).includes(text)) failures.push(`${route}: ${viewport.name} missing visual anchor ${JSON.stringify(text)}`);
  }
}

async function checkOverflow(page, route, viewport) {
  const [clientWidth, scrollWidth] = await page.evaluate(() => [document.documentElement.clientWidth, document.documentElement.scrollWidth]);
  if (scrollWidth > clientWidth + 2) failures.push(`${route}: ${viewport.name} horizontal overflow ${scrollWidth - clientWidth}px`);
}

await validateSpanishVisualSources(
  'docs/temas/transformer.md',
  transformerVisuals,
  ['La ecuación de atención convertida en flujo', 'Máscara causal', 'Representación contextual'],
);
await validateSpanishVisualSources(
  'docs/temas/evaluacion-modelos.md',
  evaluationVisuals,
  ['La misma respuesta puede fallar en capas distintas', 'Datos de referencia', 'No puntúes solo la respuesta'],
);
const browser = await chromium.launch({ headless: true });

try {
  const hub = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const hubResponse = await hub.goto(`${base}/en/temas/`, { waitUntil: 'networkidle' });
  if (!hubResponse?.ok()) failures.push(`/en/temas/: HTTP ${hubResponse?.status() ?? 'no response'}`);
  const hubBody = await hub.locator('body').innerText();
  if (!hubBody.includes('A direct entry point to the ideas behind modern AI.')) failures.push('/en/temas/: missing native English hub heading');
  for (const concept of concepts) {
    const relative = concept.route.replace('/en/', '/');
    const links = await hub.locator(`a[href$="${relative}"]`).count();
    if (!links) failures.push(`/en/temas/: missing link to ${concept.route}`);
  }
  await checkOverflow(hub, '/en/temas/', { name: 'desktop' });
  await hub.screenshot({ path: path.join(outDir, 'english-concepts-hub.png'), fullPage: true, animations: 'disabled' });
  await hub.close();

  for (const concept of concepts) {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      const runtimeErrors = [];
      page.on('pageerror', (error) => runtimeErrors.push(`pageerror: ${error.message}`));
      const response = await page.goto(`${base}${concept.route}`, { waitUntil: 'networkidle' });
      if (!response?.ok()) failures.push(`${concept.route}: HTTP ${response?.status() ?? 'no response'}`);

      const body = await page.locator('body').innerText();
      if (!body.includes(concept.title)) failures.push(`${concept.route}: missing English title`);
      for (const term of concept.terms) if (!body.toLowerCase().includes(term.toLowerCase())) failures.push(`${concept.route}: missing core concept ${JSON.stringify(term)}`);
      for (const token of forbidden) if (body.includes(token)) failures.push(`${concept.route}: Spanish leakage ${JSON.stringify(token)}`);

      const htmlLang = await page.locator('html').getAttribute('lang');
      if (htmlLang !== 'en') failures.push(`${concept.route}: html lang=${JSON.stringify(htmlLang)}`);
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      const expectedCanonical = `https://5sigmas.com${concept.route}`;
      if (canonical !== expectedCanonical) failures.push(`${concept.route}: canonical ${JSON.stringify(canonical)} != ${expectedCanonical}`);
      if (await page.locator('video[data-s5-inline-video-player], audio').count()) failures.push(`${concept.route}: unexpected inherited Spanish media`);

      if (concept.visuals) {
        await checkVisualContract(page, concept.route, viewport, concept.visuals);
        const localeForbidden = concept.visualGroup === 'transformer' ? transformerEnglishForbidden : evaluationEnglishForbidden;
        for (const token of localeForbidden) if (body.includes(token)) failures.push(`${concept.route}: visual Spanish leakage ${JSON.stringify(token)}`);
        if (concept.visualGroup === 'evaluation') await checkEvaluationDensity(page, concept.route, viewport);
        await page.screenshot({ path: path.join(outDir, `english-concept-${concept.visualGroup}-${viewport.name}.png`), fullPage: true, animations: 'disabled' });
      }

      await checkOverflow(page, concept.route, viewport);
      for (const err of runtimeErrors) failures.push(`${concept.route}: ${err}`);
      await page.close();
    }
  }
} finally {
  await browser.close();
}

if (failures.length) {
  for (const failure of [...new Set(failures)]) console.error(failure);
  process.exit(1);
}
console.log('Concept QA passed: canonical English hub + six English topic routes, Transformer and evaluation ES source contracts + EN rendered visual contracts, native localization, canonical URLs, and desktop/mobile overflow cleanliness.');
