#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const route = '/en/series/ia-pib-bienestar-energia/02-ia-tecnologia-electrica/';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });
const failures = [];

function requireText(text, tokens, prefix) {
  for (const token of tokens) if (!text.includes(token)) failures.push(`${prefix}: missing ${JSON.stringify(token)}`);
}
function forbidText(text, tokens, prefix) {
  for (const token of tokens) if (text.includes(token)) failures.push(`${prefix}: unexpected ${JSON.stringify(token)}`);
}

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

    const visual = page.locator('[data-demo="02-cuellos-botella"]');
    if (await visual.count() !== 1) {
      failures.push(`${viewport.name}: expected exactly one canonical bottlenecks visual`);
    } else {
      if (await visual.locator('.cue-item').count() !== 5) failures.push(`${viewport.name}: expected five canonical bottleneck cards`);
      if (await visual.locator('.cue-item-badge').count() !== 5) failures.push(`${viewport.name}: expected five canonical bottleneck badges`);
      if (await visual.locator('.cue-detail').count() !== 5) failures.push(`${viewport.name}: expected five canonical bottleneck details`);
      if (await visual.locator('[data-tab]').count() !== 0) failures.push(`${viewport.name}: bottlenecks visual contains invented interaction`);

      const text = (await visual.textContent()) || '';
      requireText(text, [
        'Five bottlenecks to AI expansion',
        'AI does not scale on money alone.',
        'Energy', 'Critical today', 'Power grids do not have spare capacity available in the short term in many regions.',
        'Chips', 'Latest-generation GPUs and TPUs are produced in only a small number of factories worldwide.',
        'Water', 'Growing', 'Data-center cooling consumes water.',
        'Talent', 'Talent scarcity limits development speed independently of the infrastructure available.',
        'Regulation', 'Variable', 'The European AI Act, chip-export restrictions and digital-sovereignty debates all shape investment decisions.',
      ], `${viewport.name}: bottlenecks visual`);
      forbidText(text, [
        'Cinco cuellos de botella', 'La IA no escala solo con dinero', 'Energía', 'Crítico hoy',
        'Las redes eléctricas no tienen capacidad', 'Agua', 'Creciente', 'Talento', 'Regulación', 'AI Act europeo',
      ], `${viewport.name}: bottlenecks visual`);

      const [clientWidth, scrollWidth] = await visual.evaluate((node) => [node.clientWidth, node.scrollWidth]);
      if (scrollWidth > clientWidth + 2) failures.push(`${viewport.name}: bottlenecks visual internal overflow ${scrollWidth - clientWidth}px`);

      const positions = await page.evaluate(() => {
        const text = (document.querySelector('.md-content__inner') || document.body).innerText;
        return {
          before: text.indexOf('Five bottlenecks determine how quickly it can actually grow.'),
          visual: text.indexOf('Five bottlenecks to AI expansion'),
          after: text.indexOf('Electricity'),
        };
      });
      if (!(positions.before >= 0 && positions.visual > positions.before && positions.after > positions.visual)) {
        failures.push(`${viewport.name}: bottlenecks visual moved away from canonical article hook`);
      }

      await visual.screenshot({
        path: path.join(outDir, `english-energy-ch2-bottlenecks-${viewport.name}.png`),
        animations: 'disabled',
      });
    }

    if (runtimeErrors.length) failures.push(`${viewport.name}: runtime errors: ${runtimeErrors.join(' | ')}`);
    await page.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error('English Energy Chapter 2 bottlenecks QA failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('English Energy Chapter 2 bottlenecks QA passed: canonical five-bottleneck structure, copy, hook placement and responsive overflow are faithful.');
