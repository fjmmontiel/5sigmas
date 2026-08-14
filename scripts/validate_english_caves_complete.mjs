#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const chapters = [
  {
    route: '/en/series/from-cave-to-agi/03-aprender/',
    title: 'Chapter 3 — Learn',
    concepts: ['expert systems', 'backpropagation', 'AlexNet'],
    demos: ['03-simbolica','03-inviernos-ia','03-bucle-entrenamiento','03-problema-xor','03-nlp-pre-transformer'],
    screenshot: 'english-history-03-learn.png',
  },
  {
    route: '/en/series/from-cave-to-agi/04-escalar/',
    title: 'Chapter 4 — Scale',
    concepts: ['Transformer', 'scaling laws', 'foundation models'],
    demos: ['04-shock-2012','04-transformer-reutilizacion','04-escala-producto','04-leyes-escala','04-emergencia-capacidades','04-preentrenamiento-finetuning'],
    screenshot: 'english-history-04-scale.png',
  },
  {
    route: '/en/series/from-cave-to-agi/05-mas-alla/',
    title: 'Chapter 5 — Beyond the Transformer',
    concepts: ['search', 'memory', 'world models', 'robotics'],
    demos: ['05-agentes-convergencia','05-busqueda-solucion','05-memoria-tipos','05-arquitecturas-post-transformer','05-world-models-ecosystem','05-apuestas-capital','05-robotica-fundacional'],
    screenshot: 'english-history-05-beyond.png',
  },
];

const forbidden = ['Capítulo ', 'Siguiente capítulo', 'Anterior', 'Preguntas frecuentes', 'Fuentes base'];
const failures = [];
const browser = await chromium.launch({ headless: true });

try {
  for (const chapter of chapters) {
    for (const viewport of [
      { name: 'desktop', width: 1440, height: 1000 },
      { name: 'mobile', width: 390, height: 844 },
    ]) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      const response = await page.goto(`${base}${chapter.route}`, { waitUntil: 'networkidle' });
      if (!response?.ok()) failures.push(`${chapter.route}: HTTP ${response?.status() ?? 'no response'}`);

      const body = await page.locator('body').innerText();
      if (!body.includes(chapter.title)) failures.push(`${chapter.route}: missing English chapter title`);
      for (const concept of chapter.concepts) {
        if (!body.toLowerCase().includes(concept.toLowerCase())) failures.push(`${chapter.route}: missing core concept ${concept}`);
      }
      for (const token of forbidden) {
        if (body.includes(token)) failures.push(`${chapter.route}: Spanish leakage ${JSON.stringify(token)}`);
      }

      for (const demo of chapter.demos) {
        const selector = `[data-demo="${demo}"]`;
        if (await page.locator(selector).count() !== 1) failures.push(`${chapter.route}: missing ${selector}`);
      }

      const details = page.locator('[data-demo] details');
      if (await details.count() === 0) failures.push(`${chapter.route}: visuals expose no interactive disclosure`);
      else {
        const candidate = details.filter({ has: page.locator('summary') }).nth(Math.min(1, (await details.count()) - 1));
        const before = await candidate.getAttribute('open');
        await candidate.locator('summary').click();
        const after = await candidate.getAttribute('open');
        if (before === after) failures.push(`${chapter.route}: details interaction did not toggle`);
      }

      if (await page.locator('video[data-s5-inline-video-player]').count()) failures.push(`${chapter.route}: unexpected inherited Spanish video`);
      const [clientWidth, scrollWidth] = await page.evaluate(() => [document.documentElement.clientWidth, document.documentElement.scrollWidth]);
      if (scrollWidth > clientWidth + 2) failures.push(`${chapter.route}: ${viewport.name} horizontal overflow ${scrollWidth - clientWidth}px`);

      if (viewport.name === 'desktop') {
        await page.screenshot({ path: path.join(outDir, chapter.screenshot), fullPage: true, animations: 'disabled' });
      }
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
console.log('Complete English From the Caves to AGI QA passed: Chapters 3–5, 18 native visuals, interactions, no Spanish media inheritance, desktop/mobile clean.');
