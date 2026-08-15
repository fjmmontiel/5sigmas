#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
const englishOnlyPreview = (process.env.S5_LOCALE || '').trim().toLowerCase() === 'en';
await fs.mkdir(outDir, { recursive: true });

const transformerVisuals = [
  { selector: '.tvb-wrap', source: 'docs/snippets/temas/transformer-block.html' },
  { selector: '.tqv-wrap', source: 'docs/snippets/temas/transformer-qkv.html' },
  { selector: '.tcm-wrap', source: 'docs/snippets/temas/transformer-causal-mask.html' },
];
const reasoningVisuals = [
  { selector: '.rfl-wrap', source: 'docs/snippets/temas/reasoning-loop.html' },
  { selector: '.rsc-wrap', source: 'docs/snippets/temas/reasoning-self-consistency.html' },
  { selector: '.rtc-wrap', source: 'docs/snippets/temas/reasoning-test-time-compute.html' },
];
const evaluationVisuals = [
  { selector: '.evo-wrap', source: 'docs/snippets/temas/evaluation-object.html' },
  { selector: '.evs-wrap', source: 'docs/snippets/temas/evaluation-stack.html' },
  { selector: '.evt-wrap', source: 'docs/snippets/temas/evaluation-system-trace.html' },
];
const agentVisuals = [
  { selector: '.aix-loop', source: 'docs/snippets/agentes-ia/01-bucle-agente.html' },
  { selector: '.ags-wrap', source: 'docs/snippets/temas/agent-system-boundary.html' },
  { selector: '.agt-wrap', source: 'docs/snippets/temas/agent-tool-gate.html' },
];
const concepts = [
  { route: '/en/temas/llms/', title: 'What is an LLM and how does it work?', terms: ['tokenization', 'pretraining', 'Parameters'] },
  { route: '/en/temas/transformer/', title: 'How the Transformer works', terms: ['Query', 'Key', 'Value', 'Multi-head attention'], visuals: transformerVisuals.map((item) => item.selector), visualGroup: 'transformer' },
  { route: '/en/temas/razonamiento/', title: 'Reasoning in LLMs', terms: ['Chain of thought', 'Test-time compute', 'verifier'], visuals: reasoningVisuals.map((item) => item.selector), visualGroup: 'reasoning' },
  { route: '/en/temas/evaluacion-modelos/', title: 'Evaluating AI models', terms: ['golden set', 'benchmark', 'LLM as a judge'], visuals: evaluationVisuals.map((item) => item.selector), visualGroup: 'evaluation' },
  { route: '/en/temas/agentes-ia/', title: 'What is an AI agent?', terms: ['tool calling', 'Operational state', 'least privilege'], visuals: agentVisuals.map((item) => item.selector), visualGroup: 'agents' },
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
const reasoningEnglishForbidden = [
  'CÓMPUTO EN INFERENCIA',
  'Razonar no es escribir',
  'Estado intermedio',
  'EXPLORAR',
  'RESPUESTA FINAL',
  'TRAZA OPERACIONAL',
  'Una trayectoria puede equivocarse',
  'TRAYECTORIA A',
  'AGREGAR RESPUESTAS',
  'CUÁNDO AYUDA',
  'sesgo común',
  'El presupuesto de inferencia',
  'RUTA B · MEDIA',
  'BÚSQUEDA / TOOLS',
  'SEÑALES DE ROUTING',
  'No monotónico',
  'Fuente primaria:',
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
const agentsEnglishForbidden = [
  'Un agente es un bucle con permisos',
  'Observar',
  'Planear',
  'Actuar',
  'Verificar',
  'ARQUITECTURA DEL AGENTE',
  'El modelo decide',
  'Estado operativo',
  'FRONTERA DE AUTORIDAD',
  'Una tool call es una propuesta',
  'PROPUESTA DEL MODELO',
  'Permisos',
  'RESULTADO OBSERVABLE',
  'SIGUIENTE DECISIÓN',
];
const reasoningEnglishAnchors = ['INFERENCE COMPUTE', 'Intermediate state', 'OPERATIONAL TRACE', 'TRAJECTORY A', 'AGGREGATE ANSWERS', 'ROUTING SIGNALS', 'Not monotonic'];
const reasoningSpanishAnchors = ['CÓMPUTO EN INFERENCIA', 'Estado intermedio', 'TRAZA OPERACIONAL', 'TRAYECTORIA A', 'AGREGAR RESPUESTAS', 'SEÑALES DE ROUTING', 'No monotónico'];
const evaluationEnglishAnchors = ['Reference data', 'External benchmarks', 'Judge + humans', 'Online metrics', 'Answer + citations', 'Final answer'];
const evaluationSpanishAnchors = ['Datos de referencia', 'Benchmarks externos', 'Juez + humanos', 'Métricas online', 'Respuesta + citas', 'Respuesta final'];
const agentEnglishAnchors = ['An agent is a loop with permissions', 'AGENT ARCHITECTURE', 'Operational state', 'AUTHORITY BOUNDARY', 'Permissions', 'OBSERVABLE RESULT'];
const agentSpanishAnchors = ['Un agente es un bucle con permisos', 'ARQUITECTURA DEL AGENTE', 'Estado operativo', 'FRONTERA DE AUTORIDAD', 'Permisos', 'RESULTADO OBSERVABLE'];
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

async function checkReasoningDensity(page, route, viewport, anchors) {
  const expectedCounts = [
    ['.rfl-node', 5],
    ['.rsc-path', 4],
    ['.rsc-caveats > div', 3],
    ['.rtc-route', 3],
    ['.rtc-policy > div:not(.rtc-arrow)', 3],
  ];
  for (const [selector, expected] of expectedCounts) {
    const count = await page.locator(selector).count();
    if (count !== expected) failures.push(`${route}: ${viewport.name} expected ${expected} ${selector}, found ${count}`);
  }
  const body = await page.locator('body').innerText();
  for (const text of anchors) {
    if (!body.includes(text)) failures.push(`${route}: ${viewport.name} missing reasoning visual anchor ${JSON.stringify(text)}`);
  }
}

async function checkEvaluationDensity(page, route, viewport, anchors) {
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
  const body = await page.locator('body').innerText();
  for (const text of anchors) {
    if (!body.includes(text)) failures.push(`${route}: ${viewport.name} missing visual anchor ${JSON.stringify(text)}`);
  }
}

async function checkAgentDensity(page, route, viewport, anchors) {
  const expectedCounts = [
    ['.aix-node', 4],
    ['.ags-state-row > div', 2],
    ['.ags-footer > span', 7],
    ['.agt-checks > div', 4],
    ['.agt-outcomes > div', 2],
  ];
  for (const [selector, expected] of expectedCounts) {
    const count = await page.locator(selector).count();
    if (count !== expected) failures.push(`${route}: ${viewport.name} expected ${expected} ${selector}, found ${count}`);
  }
  const body = await page.locator('body').innerText();
  for (const text of anchors) {
    if (!body.includes(text)) failures.push(`${route}: ${viewport.name} missing agent visual anchor ${JSON.stringify(text)}`);
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
  'docs/temas/razonamiento.md',
  reasoningVisuals,
  ['Razonar no es escribir una explicación larga', 'Una trayectoria puede equivocarse', 'El presupuesto de inferencia debe aumentar'],
);
await validateSpanishVisualSources(
  'docs/temas/evaluacion-modelos.md',
  evaluationVisuals,
  ['La misma respuesta puede fallar en capas distintas', 'Datos de referencia', 'No puntúes solo la respuesta'],
);
await validateSpanishVisualSources(
  'docs/temas/agentes-ia.md',
  agentVisuals,
  ['Un agente es un bucle con permisos', 'ARQUITECTURA DEL AGENTE', 'FRONTERA DE AUTORIDAD'],
);
const browser = await chromium.launch({ headless: true });

try {
  if (!englishOnlyPreview) {
    for (const viewport of viewports) {
      const route = '/temas/razonamiento/';
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      const runtimeErrors = [];
      page.on('pageerror', (error) => runtimeErrors.push(`pageerror: ${error.message}`));
      const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
      if (!response?.ok()) failures.push(`${route}: HTTP ${response?.status() ?? 'no response'}`);
      const body = await page.locator('body').innerText();
      if (!body.includes('Razonamiento en LLMs')) failures.push(`${route}: missing Spanish title`);
      const htmlLang = await page.locator('html').getAttribute('lang');
      if (htmlLang !== 'es') failures.push(`${route}: html lang=${JSON.stringify(htmlLang)}`);
      await checkVisualContract(page, route, viewport, reasoningVisuals.map((item) => item.selector));
      await checkReasoningDensity(page, route, viewport, reasoningSpanishAnchors);
      await checkOverflow(page, route, viewport);
      for (const err of runtimeErrors) failures.push(`${route}: ${err}`);
      await page.screenshot({ path: path.join(outDir, `spanish-concept-reasoning-${viewport.name}.png`), fullPage: true, animations: 'disabled' });
      await page.close();
    }

    for (const viewport of viewports) {
      const route = '/temas/evaluacion-modelos/';
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      const runtimeErrors = [];
      page.on('pageerror', (error) => runtimeErrors.push(`pageerror: ${error.message}`));
      const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
      if (!response?.ok()) failures.push(`${route}: HTTP ${response?.status() ?? 'no response'}`);
      const body = await page.locator('body').innerText();
      if (!body.includes('Evaluación de modelos de IA')) failures.push(`${route}: missing Spanish title`);
      const htmlLang = await page.locator('html').getAttribute('lang');
      if (htmlLang !== 'es') failures.push(`${route}: html lang=${JSON.stringify(htmlLang)}`);
      await checkVisualContract(page, route, viewport, evaluationVisuals.map((item) => item.selector));
      await checkEvaluationDensity(page, route, viewport, evaluationSpanishAnchors);
      await checkOverflow(page, route, viewport);
      for (const err of runtimeErrors) failures.push(`${route}: ${err}`);
      await page.screenshot({ path: path.join(outDir, `spanish-concept-evaluation-${viewport.name}.png`), fullPage: true, animations: 'disabled' });
      await page.close();
    }

    for (const viewport of viewports) {
      const route = '/temas/agentes-ia/';
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      const runtimeErrors = [];
      page.on('pageerror', (error) => runtimeErrors.push(`pageerror: ${error.message}`));
      const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
      if (!response?.ok()) failures.push(`${route}: HTTP ${response?.status() ?? 'no response'}`);
      const body = await page.locator('body').innerText();
      if (!body.includes('Qué es un agente de IA')) failures.push(`${route}: missing Spanish title`);
      const htmlLang = await page.locator('html').getAttribute('lang');
      if (htmlLang !== 'es') failures.push(`${route}: html lang=${JSON.stringify(htmlLang)}`);
      await checkVisualContract(page, route, viewport, agentVisuals.map((item) => item.selector));
      await checkAgentDensity(page, route, viewport, agentSpanishAnchors);
      await checkOverflow(page, route, viewport);
      for (const err of runtimeErrors) failures.push(`${route}: ${err}`);
      await page.screenshot({ path: path.join(outDir, `spanish-concept-agents-${viewport.name}.png`), fullPage: true, animations: 'disabled' });
      await page.close();
    }
  }

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
        const localeForbidden = concept.visualGroup === 'transformer'
          ? transformerEnglishForbidden
          : concept.visualGroup === 'reasoning'
            ? reasoningEnglishForbidden
            : concept.visualGroup === 'evaluation'
              ? evaluationEnglishForbidden
              : agentsEnglishForbidden;
        for (const token of localeForbidden) if (body.includes(token)) failures.push(`${concept.route}: visual Spanish leakage ${JSON.stringify(token)}`);
        if (concept.visualGroup === 'reasoning') await checkReasoningDensity(page, concept.route, viewport, reasoningEnglishAnchors);
        if (concept.visualGroup === 'evaluation') await checkEvaluationDensity(page, concept.route, viewport, evaluationEnglishAnchors);
        if (concept.visualGroup === 'agents') await checkAgentDensity(page, concept.route, viewport, agentEnglishAnchors);
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
console.log(`Concept QA passed: ${englishOnlyPreview ? 'English-only preview' : 'combined ES/EN preview'} with reasoning, evaluation, Transformer and agent visual contracts, native localization, canonical URLs, and desktop/mobile overflow cleanliness.`);