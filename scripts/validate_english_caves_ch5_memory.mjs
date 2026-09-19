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
        isHtml: node instanceof HTMLElement,
      };
    })
    .filter((item) =>
      item.width > 0 &&
      item.height > 0 &&
      (
        item.right > rootRect.right + 2 ||
        item.left < rootRect.left - 2 ||
        (
          item.isHtml &&
          item.scrollWidth > item.clientWidth + 2 &&
          !['auto', 'scroll'].includes(item.overflowX)
        )
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

    const visual = page.locator('[data-demo="05-memoria-tipos"]');
    if (await visual.count() !== 1) {
      failures.push(`${viewport.name}: expected one canonical memory visual`);
    } else {
      const text = (await visual.textContent()) || '';
      for (const anchor of [
        'Three types of memory, three different mechanisms',
        'Immediate context',
        'External memory',
        'Parametric memory',
        'Context window (e.g. 128K tokens)',
        'Vector database / RAG',
        'Model weights (fixed during inference)',
        'The most common mistake',
      ]) {
        if (!text.includes(anchor)) failures.push(`${viewport.name}: memory visual missing ${JSON.stringify(anchor)}`);
      }
      for (const token of ['Tres tipos de memoria', 'Contexto inmediato', 'Memoria externa', 'Memoria paramétrica', 'Ventana de contexto', 'Base vectorial', 'Pesos del modelo', 'El error más común']) {
        if (text.includes(token)) failures.push(`${viewport.name}: memory visual Spanish leakage ${JSON.stringify(token)}`);
      }
      if (await visual.locator('.mem-tab').count() !== 3) failures.push(`${viewport.name}: expected three canonical memory tabs`);
      if (await visual.locator('.mem-panel').count() !== 3) failures.push(`${viewport.name}: expected three canonical memory panels`);
      if (await visual.locator('.mem-ctx-seg').count() !== 4) failures.push(`${viewport.name}: expected four context-window segments`);
      if (await visual.locator('.mem-param-node').count() !== 9) failures.push(`${viewport.name}: expected nine parametric-memory nodes`);
      try {
        await page.waitForFunction(() => document.querySelector('[data-demo="05-memoria-tipos"]')?.dataset?.memReady === '1', null, { timeout: 2500 });
      } catch {
        failures.push(`${viewport.name}: canonical memory runtime did not initialize`);
      }
      for (const key of ['ext', 'param', 'ctx']) {
        await visual.locator(`.mem-tab[data-mtab="${key}"]`).click();
        if (!(await visual.locator(`[data-mpanel="${key}"]`).evaluate(el => el.classList.contains('mem-panel--active')))) {
          failures.push(`${viewport.name}: memory panel ${key} did not activate`);
        }
      }

      // This validator owns this visual. Whole-page overflow remains enforced by the
      // dedicated series/browser gates. SVG geometry is bounded with rendered boxes;
      // scrollWidth/clientWidth is only meaningful for HTML layout boxes.
      const overflow = await inspectVisualOverflow(visual);
      if (overflow.scrollWidth > overflow.clientWidth + 2 || overflow.offenders.length) {
        failures.push(`${viewport.name}: memory visual overflow; visual=${JSON.stringify(overflow)}`);
      }
    }

    if (viewport.name === 'desktop') {
      await page.screenshot({ path: path.join(outDir, 'english-history-05-canonical-memory.png'), fullPage: true, animations: 'disabled' });
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
console.log('English Chapter 5 memory visual QA passed: canonical structure, translations, interactions and visual-local overflow are preserved on desktop/mobile.');
