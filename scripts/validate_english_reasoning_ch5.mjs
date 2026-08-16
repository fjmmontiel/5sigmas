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
      await overthinking.screenshot({ path: path.join(outDir, `english-reasoning-ch5-overthinking-${viewport.name}.png`), animations: 'disabled' });
    }

    if (await page.locator('[data-demo="05-specification-gaming"]').count() !== 0) {
      failures.push(`${viewport.name}: English article still contains an extra specification-gaming visual absent from the canonical Spanish article flow`);
    }

    const positions = await page.evaluate(() => {
      const bodyText = (document.querySelector('.md-content__inner') || document.body).innerText;
      return {
        before: bodyText.indexOf('The system should decide how much to think before it starts'),
        visual: bodyText.indexOf('There is an optimal reasoning-token budget.'),
        after: bodyText.indexOf('Quality vs cost vs latency in a real product'),
      };
    });
    if (!(positions.before >= 0 && positions.visual > positions.before && positions.after > positions.visual)) {
      failures.push(`${viewport.name}: overthinking visual moved away from its canonical article hook`);
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
console.log('English Reasoning Chapter 5 QA passed: canonical article evidence and the overthinking visual are faithful, interactive, correctly placed and overflow-clean on desktop/mobile.');
