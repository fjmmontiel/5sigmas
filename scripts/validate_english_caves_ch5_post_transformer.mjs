#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const route = '/en/series/from-cave-to-agi/05-mas-alla/';
const failures = [];
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

const inspectVisualOverflow = async (visual) => visual.evaluate((root) => {
  const rootRect = root.getBoundingClientRect();
  const offenders = [...root.querySelectorAll('*')]
    .map((node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return {
        tag: node.tagName.toLowerCase(),
        id: node.id || '',
        className: typeof node.className === 'string' ? node.className.trim().replace(/\s+/g, '.') : '',
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        clientWidth: node.clientWidth,
        scrollWidth: node.scrollWidth,
        overflowX: style.overflowX,
      };
    })
    .filter((item) =>
      item.width > 0 &&
      item.height > 0 &&
      (
        item.right > rootRect.right + 2 ||
        item.left < rootRect.left - 2 ||
        (item.scrollWidth > item.clientWidth + 2 && !['auto', 'scroll'].includes(item.overflowX))
      )
    )
    .slice(0, 12);
  return { clientWidth: root.clientWidth, scrollWidth: root.scrollWidth, offenders };
});

try {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
    if (!response?.ok()) failures.push(`${viewport.name}: HTTP ${response?.status() ?? 'no response'}`);

    const visual = page.locator('[data-demo="05-arquitecturas-post-transformer"]');
    if (await visual.count() !== 1) {
      failures.push(`${viewport.name}: expected one canonical post-Transformer visual`);
    } else {
      const text = (await visual.textContent()) || '';
      for (const anchor of [
        'Beyond the Transformer: three problems, three responses',
        'Mamba / SSM',
        'Titans',
        'Continual learning',
        'TRANSFORMER LIMITATION',
        'NEW IDEA',
        'TRADEOFF',
        'O(N²)',
        '∇W',
        'Why it matters',
      ]) {
        if (!text.includes(anchor)) failures.push(`${viewport.name}: post-Transformer visual missing ${JSON.stringify(anchor)}`);
      }
      for (const token of [
        'Más allá del Transformer',
        'Aprendizaje continuo',
        'LIMITACIÓN DEL TRANSFORMER',
        'IDEA NUEVA',
        'La autoatención',
        'La memoria del Transformer',
        'Por qué importa',
      ]) {
        if (text.includes(token)) failures.push(`${viewport.name}: post-Transformer Spanish leakage ${JSON.stringify(token)}`);
      }
      if (await visual.locator('.pat-tab').count() !== 3) failures.push(`${viewport.name}: expected three canonical post-Transformer tabs`);
      if (await visual.locator('.pat-panel').count() !== 3) failures.push(`${viewport.name}: expected three canonical post-Transformer panels`);
      if (await visual.locator('.pat-card').count() !== 9) failures.push(`${viewport.name}: expected nine canonical problem/idea/tradeoff cards`);
      try {
        await page.waitForFunction(() => document.querySelector('[data-demo="05-arquitecturas-post-transformer"]')?.dataset?.patReady === '1', null, { timeout: 2500 });
      } catch {
        failures.push(`${viewport.name}: canonical post-Transformer runtime did not initialize`);
      }
      for (const key of ['titans', 'continuo', 'mamba']) {
        await visual.locator(`.pat-tab[data-tab="${key}"]`).click();
        if (!(await visual.locator(`.pat-panel[data-panel="${key}"]`).evaluate(el => el.classList.contains('pat-panel--active')))) {
          failures.push(`${viewport.name}: post-Transformer panel ${key} did not activate`);
        }
      }

      // This validator owns this visual. Whole-page overflow is enforced separately by
      // the full series/browser gates; zero-area hidden/SVG-definition descendants do
      // not create visible overflow and are excluded without relaxing rendered bounds.
      const overflow = await inspectVisualOverflow(visual);
      if (overflow.scrollWidth > overflow.clientWidth + 2 || overflow.offenders.length) {
        failures.push(`${viewport.name}: post-Transformer visual overflow; visual=${JSON.stringify(overflow)}`);
      }
    }

    if (viewport.name === 'desktop') {
      await page.screenshot({ path: path.join(outDir, 'english-history-05-canonical-post-transformer.png'), fullPage: true, animations: 'disabled' });
    }
    await page.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  for (const failure of [...new Set(failures)]) console.error(failure);
  process.exit(1);
}
console.log('English Chapter 5 post-Transformer visual QA passed: canonical structure, translations, interactions and visual-local overflow are preserved on desktop/mobile.');
