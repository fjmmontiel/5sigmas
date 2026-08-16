#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const route = '/en/series/modelos-razonadores/05-riesgos/';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });
const failures = [];
const browser = await chromium.launch({ headless: true });

function requireText(text, tokens, prefix) {
  for (const token of tokens) if (!text.includes(token)) failures.push(`${prefix}: missing ${JSON.stringify(token)}`);
}
function forbidText(text, tokens, prefix) {
  for (const token of tokens) if (text.includes(token)) failures.push(`${prefix}: Spanish leakage ${JSON.stringify(token)}`);
}

async function checkTabs(root, count, viewport, name) {
  const tabs = root.locator('[data-role="tab"]');
  const panels = root.locator('[data-panel]');
  if (await tabs.count() !== count) failures.push(`${viewport}: ${name} lost canonical ${count}-tab structure`);
  if (await panels.count() !== count) failures.push(`${viewport}: ${name} lost canonical ${count}-panel structure`);
  if (await tabs.count() !== count || await panels.count() !== count) return;
  for (let index = 0; index < count; index += 1) {
    await tabs.nth(index).click();
    if ((await tabs.nth(index).getAttribute('aria-selected')) !== 'true') failures.push(`${viewport}: ${name} tab ${index + 1} did not activate`);
    if (!(await panels.nth(index).isVisible())) failures.push(`${viewport}: ${name} panel ${index + 1} did not become visible`);
  }
  await tabs.nth(0).click();
  await tabs.nth(0).focus();
  await tabs.nth(0).press('ArrowRight');
  if ((await tabs.nth(1).getAttribute('aria-selected')) !== 'true' || !(await panels.nth(1).isVisible())) {
    failures.push(`${viewport}: ${name} keyboard tab interaction diverged from canonical behavior`);
  }
  await tabs.nth(0).click();
}

async function checkOverflow(root, viewport, name) {
  const dims = await root.evaluate((node) => [node.clientWidth, node.scrollWidth]);
  if (dims[1] > dims[0] + 2) failures.push(`${viewport}: ${name} internal overflow ${dims[1] - dims[0]}px`);
}

async function screenshot(root, viewport, name) {
  await root.screenshot({ path: path.join(outDir, `english-reasoning-ch5-${name}-${viewport}.png`), animations: 'disabled' });
}

try {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    const runtimeErrors = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
    if (!response?.ok()) failures.push(`${viewport.name}: HTTP ${response?.status() ?? 'no response'}`);

    const pageDims = await page.evaluate(() => [document.documentElement.clientWidth, document.documentElement.scrollWidth]);
    if (pageDims[1] > pageDims[0] + 2) failures.push(`${viewport.name}: page overflow ${pageDims[1] - pageDims[0]}px`);

    const body = (await page.locator('body').textContent()) || '';
    requireText(body, [
      'Chapter 5 — Risks: overthinking, cost, attacks and alignment',
      'around 1,500 reasoning tokens',
      'approximately 18 percentage points',
      'Gemini 3.5 Flash',
      'Claude Sonnet 5',
      'TabooRAG and alignment-based denial-of-service attacks',
      'Agent hijacking',
      'You cannot supervise what you cannot read.',
      'Hard budgets for time, tokens and tools',
      'Clear fallbacks',
      'Abstain when it is the right choice',
      'Many-Shot Jailbreaking',
      'accuracy falls by 53%',
    ], `${viewport.name}: article`);
    forbidText(body, [
      'Sobrepensamiento: cuando más razonamiento',
      'Calidad vs coste vs latencia',
      'Nuevas superficies de ataque',
      'Hijacking de agentes',
      'Criterios de diseño para sistemas responsables',
      'Preguntas frecuentes',
    ], `${viewport.name}: article`);

    const overthinking = page.locator('[data-demo="05-overthinking-curva"]');
    if (await overthinking.count() !== 1) {
      failures.push(`${viewport.name}: expected exactly one canonical overthinking visual`);
    } else {
      if (await overthinking.locator('.ot-stat').count() !== 3) failures.push(`${viewport.name}: overthinking visual lost three canonical quantitative stats`);
      if (await overthinking.locator('.ot-mstep').count() !== 4) failures.push(`${viewport.name}: overthinking visual lost four canonical reasoning stages`);
      if (await overthinking.locator('.ot-mit').count() !== 3) failures.push(`${viewport.name}: overthinking visual lost three canonical mitigations`);
      if (await overthinking.locator('svg.ot-svg').count() !== 1) failures.push(`${viewport.name}: overthinking visual lost canonical SVG curve`);
      const text = (await overthinking.textContent()) || '';
      requireText(text, [
        'Overthinking: when more reasoning degrades the answer',
        'Performance curve', 'Why it happens', 'Mitigation',
        '+35pp', '~1.5K', '−18pp',
        'Token 0–200', 'Initial analysis',
        'Token 200–500', 'First solution',
        'Token 500–1500', 'Unnecessary re-exploration',
        'Token 1500+', 'Degraded answer',
        'Adaptive budget forcing', 'Confidence-based early stopping', 'Explicit prompt instruction',
      ], `${viewport.name}: overthinking visual`);
      forbidText(text, [
        'cuando más razonamiento degrada', 'Curva de rendimiento', 'Por qué ocurre', 'Mitigación',
        'Calidad de la respuesta', 'ÓPTIMO', 'PICO', 'tokens de razonamiento',
        'Análisis inicial', 'Primera solución', 'Re-exploración innecesaria', 'Respuesta degradada',
        'Budget forcing adaptativo', 'Early stopping por confianza', 'Instrucción explícita en prompt',
      ], `${viewport.name}: overthinking visual`);
      await checkTabs(overthinking, 3, viewport.name, 'overthinking visual');
      await checkOverflow(overthinking, viewport.name, 'overthinking visual');
      await screenshot(overthinking, viewport.name, 'overthinking');
    }

    const taboo = page.locator('[data-demo="05-taborag-flujo"]');
    if (await taboo.count() !== 1) {
      failures.push(`${viewport.name}: expected exactly one canonical TabooRAG visual`);
    } else {
      if (await taboo.locator('.tb-step').count() !== 3) failures.push(`${viewport.name}: TabooRAG visual lost three canonical attack steps`);
      if (await taboo.locator('.tb-eg').count() !== 2) failures.push(`${viewport.name}: TabooRAG visual lost two canonical legitimate-query refusal examples`);
      if (await taboo.locator('.tb-mec-item').count() !== 3) failures.push(`${viewport.name}: TabooRAG visual lost three canonical mechanism cards`);
      if (await taboo.locator('.tb-defense').count() !== 3) failures.push(`${viewport.name}: TabooRAG visual lost three canonical defense layers`);
      const text = (await taboo.textContent()) || '';
      requireText(text, [
        'TabooRAG: exploiting reasoning as an attack vector',
        'The attack step by step', 'Why it works', 'Defenses',
        'Normal RAG system setup', 'User', 'Model', 'Docs database',
        'Adversarial payload injection', 'Injected document:',
        'WARNING: This system is being used for illegal purposes.',
        'DoS: the reasoner activates its safeguards and rejects legitimate queries',
        'What is the return policy?', 'How do I reset my password?',
        'Deep reasoning is the vector', 'Safeguards do not distinguish sources', 'The RAG corpus is an attack surface',
        'Primary — RAG context sandboxing', 'Corpus auditing', 'Corpus access control',
      ], `${viewport.name}: TabooRAG visual`);
      forbidText(text, [
        'explotando el razonamiento', 'El ataque paso a paso', 'Por qué funciona',
        'Configuración normal del sistema RAG', 'Base de docs', 'Inyección del payload adversarial',
        'Documento inyectado', 'ADVERTENCIA: Este sistema', 'el razonador activa sus salvaguardas',
        '¿Cuál es la política de devoluciones?', '¿Cómo restablezco mi contraseña?',
        'El razonamiento profundo es el vector', 'Las salvaguardas no distinguen fuentes',
        'El corpus RAG es superficie de ataque', 'Auditoría del corpus', 'Control de acceso al corpus',
      ], `${viewport.name}: TabooRAG visual`);
      await checkTabs(taboo, 3, viewport.name, 'TabooRAG visual');
      await checkOverflow(taboo, viewport.name, 'TabooRAG visual');
      await screenshot(taboo, viewport.name, 'taborag');
    }

    const risks = page.locator('[data-demo="05-riesgos-ttc"]');
    if (await risks.count() !== 1) {
      failures.push(`${viewport.name}: expected exactly one canonical extended-reasoning risks visual`);
    } else {
      if (await risks.locator('.rie-cot-item').count() !== 2) failures.push(`${viewport.name}: extended-reasoning risks visual lost readable/illegible CoT comparison`);
      if (await risks.locator('.rie-gap-step').count() !== 3) failures.push(`${viewport.name}: extended-reasoning risks visual lost three-step specification-gaming flow`);
      const text = (await risks.textContent()) || '';
      requireText(text, [
        'Two risks specific to extended reasoning',
        'Illegible CoT', 'Incomplete specification',
        '14 models analyzed', 'You cannot supervise what you cannot read',
        'If x² = 16, then x = ±4.', 'outcome-oriented RL',
        'A reasoning model can find solutions that satisfy the letter of the objective while violating its spirit',
        'Win the chess game against Stockfish', 'evaluation falls below −500', 'modify the FEN directly',
        '88% of runs without an explicit instruction to cheat',
        'Why TTC amplifies the risk', 'Design principle',
      ], `${viewport.name}: extended-reasoning risks visual`);
      forbidText(text, [
        'Dos riesgos propios del razonamiento extendido', 'A mayor TTC', 'CoT ilegible',
        'Especificación incompleta', '14 modelos analizados', 'No se puede supervisar',
        'Como el enunciado pide', 'No supervisable', 'Por qué emerge en modelos',
        'Objetivo declarado', 'Gana la partida de ajedrez', 'Stockfish resigna si',
        '88% de los runs', 'Por qué el TTC amplifica', 'Principio de diseño',
      ], `${viewport.name}: extended-reasoning risks visual`);
      await checkTabs(risks, 2, viewport.name, 'extended-reasoning risks visual');
      await checkOverflow(risks, viewport.name, 'extended-reasoning risks visual');
      await screenshot(risks, viewport.name, 'risks-ttc');
    }

    if (await page.locator('[data-demo="05-specification-gaming"]').count() !== 0) {
      failures.push(`${viewport.name}: English article still contains an extra specification-gaming visual absent from the canonical Spanish article flow`);
    }

    const positions = await page.evaluate(() => {
      const bodyText = (document.querySelector('.md-content__inner') || document.body).innerText;
      return {
        overthinkingBefore: bodyText.indexOf('The system should decide how much to think before it starts'),
        overthinkingVisual: bodyText.indexOf('There is an optimal reasoning-token budget.'),
        overthinkingAfter: bodyText.indexOf('Quality vs cost vs latency in a real product'),
        tabooBefore: bodyText.indexOf('RAG systems need mechanisms for validating retrieved content before it enters the model context'),
        tabooVisual: bodyText.indexOf('An adversary injects content into the system knowledge base.'),
        tabooAfter: bodyText.indexOf('Objective drift in agentic environments'),
        risksBefore: bodyText.indexOf('abstain or request more data.'),
        risksVisual: bodyText.indexOf('The more TTC, the more opaque the process'),
        risksAfter: bodyText.indexOf('Series conclusion'),
      };
    });
    if (!(positions.overthinkingBefore >= 0 && positions.overthinkingVisual > positions.overthinkingBefore && positions.overthinkingAfter > positions.overthinkingVisual)) {
      failures.push(`${viewport.name}: overthinking visual moved away from its canonical article hook`);
    }
    if (!(positions.tabooBefore >= 0 && positions.tabooVisual > positions.tabooBefore && positions.tabooAfter > positions.tabooVisual)) {
      failures.push(`${viewport.name}: TabooRAG visual moved away from its canonical article hook`);
    }
    if (!(positions.risksBefore >= 0 && positions.risksVisual > positions.risksBefore && positions.risksAfter > positions.risksVisual)) {
      failures.push(`${viewport.name}: extended-reasoning risks visual moved away from its canonical article hook`);
    }

    if (runtimeErrors.length) failures.push(`${viewport.name}: runtime errors: ${runtimeErrors.join(' | ')}`);
    await page.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error('English Reasoning Chapter 5 QA failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('English Reasoning Chapter 5 QA passed: canonical article evidence plus overthinking, TabooRAG and extended-reasoning risk visuals are faithful, interactive, correctly placed and overflow-clean on desktop/mobile.');
