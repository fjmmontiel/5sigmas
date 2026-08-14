#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const chapters = [
  {
    route: '/en/series/multimodalidad-iag/01-el-problema/',
    title: 'Chapter 1 — The real problem: integrating different modalities without reducing them too early',
    concepts: ['perception', 'alignment', 'grounding', 'modality collapse'],
    demos: 3,
    prefix: 'mm-01-',
    screenshot: 'english-multimodality-01-problem.png',
  },
  {
    route: '/en/series/multimodalidad-iag/02-alineamiento/',
    title: 'Chapter 2 — Alignment: from pairs to interactions',
    concepts: ['contrastive learning', 'ImageBind', 'instruction', 'data quality'],
    demos: 4,
    prefix: 'mm-02-',
    screenshot: 'english-multimodality-02-alignment.png',
  },
  {
    route: '/en/series/multimodalidad-iag/03-arquitecturas/',
    title: 'Chapter 3 — Architectures: shared spaces, connectors and omni models',
    concepts: ['cross-attention', 'tokenization', 'streaming', 'latency'],
    demos: 5,
    prefix: 'mm-03-',
    screenshot: 'english-multimodality-03-architectures.png',
  },
  {
    route: '/en/series/multimodalidad-iag/04-evaluacion/',
    title: 'Chapter 4 — Evaluation: measuring without fooling ourselves',
    concepts: ['grounding', 'contamination', 'language priors', 'HallusionBench'],
    demos: 7,
    prefix: 'mm-04-',
    screenshot: 'english-multimodality-04-evaluation.png',
  },
  {
    route: '/en/series/multimodalidad-iag/05-riesgos/',
    title: 'Chapter 5 — Risks: when perception becomes part of the attack surface',
    concepts: ['untrusted', 'authorization', 'provenance', 'human approval'],
    demos: 8,
    prefix: 'mm-05-',
    screenshot: 'english-multimodality-05-risks.png',
  },
];

const forbidden = [
  'Capítulo ',
  'Siguiente capítulo',
  'Preguntas frecuentes',
  'Fuentes base',
  'Idea clave',
];

const failures = [];
const browser = await chromium.launch({ headless: true });
let totalVisuals = 0;

try {
  for (const chapter of chapters) {
    for (const viewport of [
      { name: 'desktop', width: 1440, height: 1000 },
      { name: 'mobile', width: 390, height: 844 },
    ]) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      const runtimeErrors = [];
      page.on('pageerror', (error) => runtimeErrors.push(`pageerror: ${error.message}`));

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

      const demoValues = await page.locator('[data-demo]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-demo')));
      if (demoValues.length !== chapter.demos) {
        failures.push(`${chapter.route}: expected ${chapter.demos} teaching visuals, found ${demoValues.length}`);
      }
      if (new Set(demoValues).size !== demoValues.length) failures.push(`${chapter.route}: duplicate data-demo visual identifiers`);
      for (const demo of demoValues) {
        if (!demo?.startsWith(chapter.prefix)) failures.push(`${chapter.route}: unexpected visual identifier ${JSON.stringify(demo)}`);
      }
      if (viewport.name === 'desktop') totalVisuals += demoValues.length;

      const details = page.locator('[data-demo] details');
      if (await details.count() === 0) {
        failures.push(`${chapter.route}: visuals expose no interactive disclosure`);
      } else {
        const candidate = details.first();
        const before = await candidate.getAttribute('open');
        await candidate.locator('summary').click();
        const after = await candidate.getAttribute('open');
        if (before === after) failures.push(`${chapter.route}: details interaction did not toggle`);
      }

      if (await page.locator('video[data-s5-inline-video-player]').count()) failures.push(`${chapter.route}: unexpected inherited Spanish video`);
      if (await page.locator('audio').count()) failures.push(`${chapter.route}: unexpected inherited Spanish audio`);

      const [clientWidth, scrollWidth] = await page.evaluate(() => [document.documentElement.clientWidth, document.documentElement.scrollWidth]);
      if (scrollWidth > clientWidth + 2) failures.push(`${chapter.route}: ${viewport.name} horizontal overflow ${scrollWidth - clientWidth}px`);
      for (const runtimeError of runtimeErrors) failures.push(`${chapter.route}: ${runtimeError}`);

      if (viewport.name === 'desktop') {
        await page.screenshot({
          path: path.join(outDir, chapter.screenshot),
          fullPage: true,
          animations: 'disabled',
        });
      }
      await page.close();
    }
  }
} finally {
  await browser.close();
}

if (totalVisuals !== 27) failures.push(`Multimodality series: expected 27 native English visuals, found ${totalVisuals}`);

if (failures.length) {
  for (const failure of [...new Set(failures)]) console.error(failure);
  process.exit(1);
}

console.log('Complete English Multimodality QA passed: Chapters 1–5, 27 unique native visuals, interactions, no Spanish media inheritance, desktop/mobile clean.');
