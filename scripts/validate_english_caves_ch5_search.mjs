#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import './validate_english_caves_ch5_post_transformer.mjs';

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

    const visual = page.locator('[data-demo="05-busqueda-solucion"]');
    if (await visual.count() !== 1) {
      failures.push(`${viewport.name}: expected one canonical solution-search visual`);
    } else {
      const text = (await visual.textContent()) || '';
      for (const anchor of [
        'From next-token prediction to search over the solution space',
        'One step vs search',
        'Genealogy 2016–2025',
        'DIRECT PREDICTION',
        'WITH SEARCH',
        'AlphaGo',
        'AlphaZero',
        'ReAct',
        'AlphaProof',
        'AlphaEvolve',
      ]) {
        if (!text.includes(anchor)) failures.push(`${viewport.name}: solution-search visual missing ${JSON.stringify(anchor)}`);
      }
      for (const token of ['Del siguiente token', 'Un paso vs búsqueda', 'Genealogía', 'PREDICCIÓN DIRECTA', 'CON BÚSQUEDA', 'Problema', 'Respuesta', 'Redes neuronales', 'La intuición central']) {
        if (text.includes(token)) failures.push(`${viewport.name}: solution-search Spanish leakage ${JSON.stringify(token)}`);
      }
      if (await visual.locator('.srch-tab').count() !== 2) failures.push(`${viewport.name}: expected two canonical search tabs`);
      if (await visual.locator('.srch-panel').count() !== 2) failures.push(`${viewport.name}: expected two canonical search panels`);
      if (await visual.locator('.srch-side').count() !== 2) failures.push(`${viewport.name}: expected direct/search bifold`);
      if (await visual.locator('.srch-tl-item').count() !== 5) failures.push(`${viewport.name}: expected five genealogy milestones`);
      try {
        await page.waitForFunction(() => document.querySelector('[data-demo="05-busqueda-solucion"]')?.dataset?.srchReady === '1', null, { timeout: 2500 });
      } catch {
        failures.push(`${viewport.name}: canonical solution-search runtime did not initialize`);
      }
      await visual.locator('.srch-tab[data-stab="genealogy"]').click();
      if (!(await visual.locator('[data-spanel="genealogy"]').evaluate(el => el.classList.contains('srch-panel--active')))) {
        failures.push(`${viewport.name}: genealogy panel did not activate`);
      }
      await visual.locator('.srch-tab[data-stab="contrast"]').click();
      if (!(await visual.locator('[data-spanel="contrast"]').evaluate(el => el.classList.contains('srch-panel--active')))) {
        failures.push(`${viewport.name}: contrast panel did not reactivate`);
      }

      // This validator owns this visual. Whole-page overflow remains enforced by the
      // dedicated series/browser gates. SVG geometry is bounded with rendered boxes;
      // scrollWidth/clientWidth is only meaningful for HTML layout boxes.
      const overflow = await inspectVisualOverflow(visual);
      if (overflow.scrollWidth > overflow.clientWidth + 2 || overflow.offenders.length) {
        failures.push(`${viewport.name}: solution-search visual overflow; visual=${JSON.stringify(overflow)}`);
      }
    }

    if (viewport.name === 'desktop') {
      await page.screenshot({ path: path.join(outDir, 'english-history-05-canonical-search.png'), fullPage: true, animations: 'disabled' });
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
console.log('English Chapter 5 solution-search visual QA passed: canonical structure, translations, interactions and visual-local overflow are preserved on desktop/mobile.');
