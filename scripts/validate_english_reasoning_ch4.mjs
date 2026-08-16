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

    const root = page.locator('[data-demo="04-ttft-streaming"]');
    if (await root.count() !== 1) {
      failures.push(`${viewport.name}: expected exactly one canonical TTFT visual`);
    } else {
      if (await root.locator('[data-role="tab"]').count() !== 3) failures.push(`${viewport.name}: TTFT visual lost one of three canonical tabs`);
      if (await root.locator('[data-panel]').count() !== 3) failures.push(`${viewport.name}: TTFT visual lost one of three canonical panels`);
      if (await root.locator('.tf-model').count() !== 2) failures.push(`${viewport.name}: comparison panel lost canonical two-model comparison`);
      if (await root.locator('.tf-token').count() !== 7) failures.push(`${viewport.name}: low-TTFT model lost canonical seven visible tokens`);
      if (await root.locator('.tf-key-item').count() !== 3) failures.push(`${viewport.name}: comparison legend lost canonical three latency phases`);
      if (await root.locator('.tf-stream-model').count() !== 2) failures.push(`${viewport.name}: streaming panel lost canonical two-mode comparison`);
      if (await root.locator('.tf-stream-phase').count() !== 4) failures.push(`${viewport.name}: streaming panel lost canonical four phases`);
      if (await root.locator('.tf-trade-row').count() !== 3) failures.push(`${viewport.name}: reasoning tradeoff lost canonical three budgets`);
      if (await root.locator('.tf-trade-bar-row').count() !== 6) failures.push(`${viewport.name}: reasoning tradeoff lost canonical six metric rows`);

      const text = (await root.textContent()) || '';
      for (const token of [
        'TTFT and total latency: two metrics, two perceptions', 'TTFT vs total latency', 'Streaming and perception',
        'The problem with reasoning models', 'Model A — low TTFT', '0.3s', '4.2s',
        'The user sees text within the first 300 ms', 'Model B — high TTFT', '3.5s', '4.4s',
        'Thinking... (hidden internal reasoning)', 'Wait (before first token)', 'Internal reasoning (hidden CoT)',
        'Visible response generation', 'With visible CoT streaming (Claude 3.7, DeepSeek R1)',
        'Chain of thought (visible, streamed)', 'Without streaming (hidden CoT, complete answer all at once)',
        'Low budget', '0.4s', '52%', 'Medium budget', '2.1s', '78%', 'High budget', '8.5s', '91%',
      ]) if (!text.includes(token)) failures.push(`${viewport.name}: TTFT visual missing ${JSON.stringify(token)}`);

      for (const token of [
        'TTFT y latencia total', 'El problema con los razonadores', 'Dos modelos, misma respuesta completa',
        'Modelo A — bajo TTFT', 'El usuario ve texto', 'Modelo B — alto TTFT', 'Pensando...',
        'pantalla en blanco', 'Espera (pre-primer token)', 'Razonamiento interno', 'Generación de respuesta visible',
        'El streaming reduce la latencia percibida', 'Cadena de pensamiento', 'Sin streaming',
        'Procesamiento interno', 'Respuesta completa', 'Los modelos razonadores tienen un conflicto',
        'Budget bajo', 'Calidad', 'Budget medio', 'Budget alto',
      ]) if (text.includes(token)) failures.push(`${viewport.name}: TTFT visual Spanish leakage ${JSON.stringify(token)}`);

      const tabs = root.locator('[data-role="tab"]');
      const panels = root.locator('[data-panel]');
      for (let index = 0; index < 3; index += 1) {
        await tabs.nth(index).click();
        if ((await tabs.nth(index).getAttribute('aria-selected')) !== 'true') failures.push(`${viewport.name}: TTFT tab ${index + 1} did not activate`);
        if (!(await panels.nth(index).isVisible())) failures.push(`${viewport.name}: TTFT panel ${index + 1} did not become visible`);
      }
      await tabs.nth(0).click();
      await tabs.nth(0).focus();
      await tabs.nth(0).press('ArrowRight');
      if ((await tabs.nth(1).getAttribute('aria-selected')) !== 'true' || !(await panels.nth(1).isVisible())) {
        failures.push(`${viewport.name}: TTFT keyboard tab interaction diverged from canonical behavior`);
      }

      const positions = await page.evaluate(() => {
        const bodyText = (document.querySelector('.md-content__inner') || document.body).innerText;
        return {
          before: bodyText.indexOf('Optimizing one and ignoring the other'),
          visual: bodyText.indexOf('TTFT and total latency: two metrics, two perceptions'),
          after: bodyText.indexOf('Dynamic routing: RouteLLM'),
        };
      });
      if (!(positions.before >= 0 && positions.visual > positions.before && positions.after > positions.visual)) failures.push(`${viewport.name}: TTFT visual moved away from its article hook`);

      const dims = await root.evaluate((node) => [node.clientWidth, node.scrollWidth]);
      if (dims[1] > dims[0] + 2) failures.push(`${viewport.name}: TTFT visual internal overflow ${dims[1] - dims[0]}px`);
      await tabs.nth(0).click();
      await root.screenshot({ path: path.join(outDir, `english-reasoning-ch4-ttft-${viewport.name}.png`), animations: 'disabled' });
    }

    const body = (await page.locator('body').textContent()) || '';
    if (!body.includes('Chapter 4 — Physical time: latency, streaming and human interaction')) failures.push(`${viewport.name}: canonical English Chapter 4 title missing`);
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
console.log('English Reasoning Chapter 4 QA passed: canonical TTFT visual preserved, localized, interactive, correctly placed and overflow-clean on desktop/mobile.');
