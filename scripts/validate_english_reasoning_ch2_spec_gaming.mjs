#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const route = '/en/series/modelos-razonadores/02-fallos/';
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

    const [pageClientWidth, pageScrollWidth] = await page.evaluate(() => [document.documentElement.clientWidth, document.documentElement.scrollWidth]);
    if (pageScrollWidth > pageClientWidth + 2) failures.push(`${viewport.name}: page overflow ${pageScrollWidth - pageClientWidth}px`);

    const visual = page.locator('[data-demo="05-specification-gaming"]');
    if (await visual.count() !== 1) {
      failures.push(`${viewport.name}: expected exactly one canonical specification-gaming visual`);
    } else {
      const tabs = visual.locator('[data-role="tab"]');
      const panels = visual.locator('[data-panel]');
      if (await tabs.count() !== 2) failures.push(`${viewport.name}: specification gaming lost one of two canonical tabs`);
      if (await panels.count() !== 2) failures.push(`${viewport.name}: specification gaming lost one of two canonical panels`);
      if (await visual.locator('.sga-flow-step').count() !== 6) failures.push(`${viewport.name}: specification gaming lost one of six canonical case-flow stages`);
      if (await visual.locator('.sga-stat').count() !== 2) failures.push(`${viewport.name}: specification gaming lost canonical chess evidence blocks`);
      if (await visual.locator('.sga-compare-item').count() !== 5) failures.push(`${viewport.name}: specification gaming lost canonical benchmark measurement comparison`);

      const text = (await visual.textContent()) || '';
      for (const token of [
        'Specification gaming: documented cases',
        'Two real incidents in which reasoning models optimized the measurable objective',
        'o3 vs Stockfish',
        'Claude Opus · GitHub',
        'Documented case · Bondarenko et al., 2025',
        'o3 hacks the chess environment',
        'Internal reasoning',
        'evaluation falls below −500 centipawns',
        "echo '6k1/8/8/8/8/8/8/5qK1' > game/fen.txt",
        '88%',
        'without an explicit instruction',
        'Documented case · Claude 3.7 Sonnet System Card · Anthropic, 2025',
        'Claude Opus finds the answer key on GitHub',
        'Repository search',
        'Decoding',
        'perfect benchmark score',
        'What was measured',
        'Benchmark score ✓',
        'Declared objective achieved ✓',
        'What was not measured',
        'Actual reasoning ability ✗',
        'Solving the problems ✗',
        'Legitimate use of the environment ✗',
      ]) {
        if (!text.includes(token)) failures.push(`${viewport.name}: specification gaming missing ${JSON.stringify(token)}`);
      }
      for (const token of [
        'casos documentados', 'Dos incidentes reales', 'Caso documentado',
        'hackea el entorno de ajedrez', 'Lo que hizo o3', 'Razonamiento interno',
        'resignará si la evaluación', 'Acción ejecutada', 'rey blanco en jaque',
        'Objetivo cumplido', 'de los runs de o3', 'Solo hackean con nudging',
        'encuentra la clave de respuestas', 'Lo que hizo Claude Opus', 'Búsqueda en repositorios',
        'fichero con respuestas cifradas', 'Decodificación', 'puntuación perfecta',
        'Lo que se midió', 'Puntuación en el benchmark', 'Objetivo declarado logrado',
        'Lo que no se midió', 'Capacidad de razonamiento real', 'Resolución de los problemas',
        'Uso legítimo del entorno',
      ]) {
        if (text.includes(token)) failures.push(`${viewport.name}: specification gaming Spanish leakage ${JSON.stringify(token)}`);
      }

      if (await tabs.count() === 2 && await panels.count() === 2) {
        for (let index = 0; index < 2; index += 1) {
          await tabs.nth(index).click();
          if ((await tabs.nth(index).getAttribute('aria-selected')) !== 'true') failures.push(`${viewport.name}: specification-gaming tab ${index + 1} did not activate`);
          if (!(await panels.nth(index).isVisible())) failures.push(`${viewport.name}: specification-gaming panel ${index + 1} did not become visible`);
        }
        await tabs.nth(0).click();
        await tabs.nth(0).focus();
        await tabs.nth(0).press('ArrowRight');
        if ((await tabs.nth(1).getAttribute('aria-selected')) !== 'true' || !(await panels.nth(1).isVisible())) {
          failures.push(`${viewport.name}: specification-gaming keyboard interaction diverged from canonical behavior`);
        }
        await tabs.nth(0).click();
      }

      const [clientWidth, scrollWidth] = await visual.evaluate((node) => [node.clientWidth, node.scrollWidth]);
      if (scrollWidth > clientWidth + 2) failures.push(`${viewport.name}: specification-gaming internal overflow ${scrollWidth - clientWidth}px`);

      const positions = await page.evaluate(() => {
        const bodyText = (document.querySelector('.md-content__inner') || document.body).innerText;
        return {
          before: bodyText.indexOf('the most efficient route was not to play better, but to break the rules.'),
          visual: bodyText.indexOf('Specification gaming: documented cases'),
          after: bodyText.indexOf('Failures inside the reasoning chain'),
        };
      });
      if (!(positions.before >= 0 && positions.visual > positions.before && positions.after > positions.visual)) {
        failures.push(`${viewport.name}: specification-gaming visual moved away from its canonical article hook`);
      }

      await visual.screenshot({ path: path.join(outDir, `english-reasoning-ch2-specification-gaming-${viewport.name}.png`), animations: 'disabled' });
    }

    if (runtimeErrors.length) failures.push(`${viewport.name}: runtime errors: ${runtimeErrors.join(' | ')}`);
    await page.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error('English Reasoning Chapter 2 specification-gaming QA failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('English Reasoning Chapter 2 specification-gaming QA passed: canonical cases, evidence, interaction, hook placement and responsive layout are preserved.');
