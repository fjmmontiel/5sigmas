#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const route = '/en/series/modelos-razonadores/04-latencia-streaming/';
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
      'Chapter 4 — Physical time: latency, streaming and human interaction',
      'around 20 seconds', '7–8 seconds',
      'Sol, Terra and Luna',
      '$2 per million input tokens', '$10 per million output tokens', 'August 31, 2026', '$3 and $15 respectively',
      'maximum budgets per session', 'percentiles (p95, p99)',
    ], `${viewport.name}: article`);

    const ttft = page.locator('[data-demo="04-ttft-streaming"]');
    if (await ttft.count() !== 1) {
      failures.push(`${viewport.name}: expected exactly one canonical TTFT visual`);
    } else {
      if (await ttft.locator('.tf-model').count() !== 2) failures.push(`${viewport.name}: TTFT visual lost canonical two-model comparison`);
      if (await ttft.locator('.tf-token').count() !== 7) failures.push(`${viewport.name}: TTFT visual lost canonical seven visible tokens`);
      if (await ttft.locator('.tf-key-item').count() !== 3) failures.push(`${viewport.name}: TTFT visual lost canonical three latency phases`);
      if (await ttft.locator('.tf-stream-model').count() !== 2) failures.push(`${viewport.name}: TTFT visual lost canonical two streaming modes`);
      if (await ttft.locator('.tf-stream-phase').count() !== 4) failures.push(`${viewport.name}: TTFT visual lost canonical four streaming phases`);
      if (await ttft.locator('.tf-trade-row').count() !== 3) failures.push(`${viewport.name}: TTFT visual lost canonical three reasoning budgets`);
      if (await ttft.locator('.tf-trade-bar-row').count() !== 6) failures.push(`${viewport.name}: TTFT visual lost canonical six tradeoff metrics`);
      const text = (await ttft.textContent()) || '';
      requireText(text, [
        'TTFT and total latency: two metrics, two perceptions', 'TTFT vs total latency', 'Streaming and perception',
        'The problem with reasoning models', 'Model A — low TTFT', '0.3s', '4.2s',
        'The user sees text within the first 300 ms', 'Model B — high TTFT', '3.5s', '4.4s',
        'Thinking... (hidden internal reasoning)', 'With visible CoT streaming (Claude 3.7, DeepSeek R1)',
        'Low budget', '52%', 'Medium budget', '78%', 'High budget', '91%',
      ], `${viewport.name}: TTFT visual`);
      forbidText(text, [
        'TTFT y latencia total', 'El problema con los razonadores', 'Modelo A — bajo TTFT', 'Modelo B — alto TTFT',
        'Pensando...', 'El streaming reduce la latencia percibida', 'Cadena de pensamiento', 'Budget bajo', 'Calidad',
      ], `${viewport.name}: TTFT visual`);
      await checkTabs(ttft, 3, viewport.name, 'TTFT visual');
      await checkOverflow(ttft, viewport.name, 'TTFT visual');
      await ttft.screenshot({ path: path.join(outDir, `english-reasoning-ch4-ttft-${viewport.name}.png`), animations: 'disabled' });
    }

    const routing = page.locator('[data-demo="04-routellm-decision"]');
    if (await routing.count() !== 1) {
      failures.push(`${viewport.name}: expected exactly one canonical RouteLLM visual`);
    } else {
      if (await routing.locator('.rl-eg').count() !== 3) failures.push(`${viewport.name}: RouteLLM lost three canonical query examples`);
      if (await routing.locator('.rl-dest').count() !== 3) failures.push(`${viewport.name}: RouteLLM lost three canonical destinations`);
      if (await routing.locator('.rl-stat-row').count() !== 9) failures.push(`${viewport.name}: RouteLLM lost nine destination metrics`);
      if (await routing.locator('.rl-tv-err').count() !== 2) failures.push(`${viewport.name}: RouteLLM lost two routing-error cases`);
      if (await routing.locator('.rl-impact-row').count() !== 3) failures.push(`${viewport.name}: RouteLLM lost three impact scenarios`);
      if (await routing.locator('.rl-impact-bar-row').count() !== 6) failures.push(`${viewport.name}: RouteLLM lost six cost/performance bars`);
      const text = (await routing.textContent()) || '';
      requireText(text, [
        'RouteLLM: route each query to the right model', 'Decision flow', 'The classifier', 'Cost impact',
        '~50 ms', '60–80%', 'What is 15% of 240?', 'Complexity score', 'Low complexity', 'Medium complexity', 'High complexity',
        'Fast model', 'Standard model', 'Reasoning model', '0.3s', '$0.15/M', '1.2s', '$2.5/M', '8–45s', '$15–60/M',
        'Type I error', 'Type II error', '85%', '95%', 'No routing — everything to the strong model',
        'With routing (conservative threshold)', 'With routing (aggressive threshold)',
      ], `${viewport.name}: RouteLLM visual`);
      forbidText(text, [
        'enrutar cada query', 'Flujo de decisión', 'El clasificador', 'Impacto en coste', 'Query de usuario',
        'Puntuación de complejidad', 'Complejidad baja', 'Modelo rápido', 'Modelo estándar', 'Modelo razonador',
        'Error tipo I', 'Error tipo II', 'Sin routing', 'Con routing',
      ], `${viewport.name}: RouteLLM visual`);
      await checkTabs(routing, 3, viewport.name, 'RouteLLM visual');
      await checkOverflow(routing, viewport.name, 'RouteLLM visual');
      await routing.screenshot({ path: path.join(outDir, `english-reasoning-ch4-routellm-${viewport.name}.png`), animations: 'disabled' });
    }

    const latency = page.locator('[data-demo="04-latencia-umbral"]');
    if (await latency.count() !== 1) {
      failures.push(`${viewport.name}: expected exactly one canonical latency/cost visual`);
    } else {
      if (await latency.locator('.lat-band').count() !== 4) failures.push(`${viewport.name}: latency visual lost four canonical threshold bands`);
      if (await latency.locator('.lat-seg').count() !== 3) failures.push(`${viewport.name}: latency visual lost three canonical latency segments`);
      if (await latency.locator('.lat-cost-card').count() !== 2) failures.push(`${viewport.name}: latency visual lost two canonical cost cards`);
      if (await latency.locator('.lat-cost-ex-row').count() !== 2) failures.push(`${viewport.name}: latency visual lost canonical input/output pricing rows`);
      if (await latency.locator('.lat-cost-impact-item').count() !== 2) failures.push(`${viewport.name}: latency visual lost canonical per-request variability examples`);
      const text = (await latency.textContent()) || '';
      requireText(text, [
        'Latency, cost and design for reasoning models', 'Latency thresholds', 'Variable cost',
        '< 0.1 s', 'Instantaneous', '0.1 – 1 s', 'Fluid', '1 – 10 s', 'Requires feedback', '> 10 s', 'TTC zone',
        'Real latency distribution · LLM + tools + RAG', '~20 s total', 'Reasoning · 7–8 s', 'API / tool calls · 6–7 s', 'RAG retrieval · 4–5 s',
        'Cost structure with extended reasoning', 'Billing for reasoning tokens', '$3 / M', '$15 / M',
        'Per-request variability', '500 reasoning tokens = 3× higher cost',
      ], `${viewport.name}: latency visual`);
      forbidText(text, [
        'Latencia, coste y diseño', 'Umbrales de latencia', 'Coste variable', 'Instantáneo', 'Fluido', 'Requiere feedback',
        'Zona TTC', 'Distribución real de latencia', 'Razonamiento · 7-8 s', 'Llamadas a APIs', 'Recuperación RAG',
        'Estructura de coste', 'Facturación de tokens', 'Variabilidad por consulta', 'Consulta compleja',
      ], `${viewport.name}: latency visual`);
      await checkTabs(latency, 2, viewport.name, 'latency visual');
      await checkOverflow(latency, viewport.name, 'latency visual');
      await latency.screenshot({ path: path.join(outDir, `english-reasoning-ch4-latency-${viewport.name}.png`), animations: 'disabled' });
    }

    const positions = await page.evaluate(() => {
      const bodyText = (document.querySelector('.md-content__inner') || document.body).innerText;
      return {
        ttftBefore: bodyText.indexOf('Optimizing one without the other'),
        ttft: bodyText.indexOf('TTFT and total latency: two metrics, two perceptions'),
        ttftAfter: bodyText.indexOf('Dynamic routing: RouteLLM'),
        routingBefore: bodyText.indexOf('which model to activate and how much reasoning budget'),
        routing: bodyText.indexOf('RouteLLM: route each query to the right model'),
        routingAfter: bodyText.indexOf('The current version of that pattern can be seen in GPT-5.6'),
        latencyBefore: bodyText.indexOf('a long wait followed by an error instead of an answer'),
        latency: bodyText.indexOf('Latency, cost and design for reasoning models'),
        latencyAfter: bodyText.indexOf('Design patterns for optimizing TTC in products'),
      };
    });
    if (!(positions.ttftBefore >= 0 && positions.ttft > positions.ttftBefore && positions.ttftAfter > positions.ttft)) failures.push(`${viewport.name}: TTFT visual moved away from its article hook`);
    if (!(positions.routingBefore >= 0 && positions.routing > positions.routingBefore && positions.routingAfter > positions.routing)) failures.push(`${viewport.name}: RouteLLM visual moved away from its article hook`);
    if (!(positions.latencyBefore >= 0 && positions.latency > positions.latencyBefore && positions.latencyAfter > positions.latency)) failures.push(`${viewport.name}: latency visual moved away from its article hook`);

    if (runtimeErrors.length) failures.push(`${viewport.name}: runtime errors: ${runtimeErrors.join(' | ')}`);
    await page.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error('English Reasoning Chapter 4 QA failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('English Reasoning Chapter 4 QA passed: article evidence plus all three canonical visuals are faithful, interactive, correctly placed and overflow-clean on desktop/mobile.');
