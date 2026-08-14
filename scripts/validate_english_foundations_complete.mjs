#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const chapters = [
  {
    route: '/en/series/fundamentos-ia-iag/01-que-es-ia/',
    title: 'Chapter 1 — What is AI?',
    concepts: ['Machine Learning', 'Deep Learning', 'MLOps'],
    demos: [
      'fnd-ia-ml-dl',
      'fnd-learning-types',
      'fnd-decision-tree',
      'fnd-naive-bayes',
      'fnd-kmeans',
      'fnd-neural-network',
      'fnd-mlops-cycle',
    ],
    screenshot: 'english-foundations-01-ai.png',
  },
  {
    route: '/en/series/fundamentos-ia-iag/02-que-es-ia-generativa/',
    title: 'Chapter 2 — What is Generative AI?',
    concepts: ['embeddings', 'Transformer', 'foundation model', 'LLMOps'],
    demos: [
      'fnd-embeddings',
      'fnd-transformer',
      'fnd-scaling-curve',
      'fnd-gpt-scale',
      'fnd-llm-rag-agent',
      'fnd-llmops',
      'fnd-llmops-routes',
    ],
    screenshot: 'english-foundations-02-genai.png',
  },
  {
    route: '/en/series/fundamentos-ia-iag/03-ia-vs-ia-generativa/',
    title: 'Chapter 3 — Classical AI vs Generative AI',
    concepts: ['determinism', 'evaluation', 'RAG', 'agent'],
    demos: [
      'fnd-five-differences',
      'fnd-tech-decision',
      'fnd-operational-matrix',
      'fnd-fraud-stack',
    ],
    screenshot: 'english-foundations-03-comparison.png',
  },
  {
    route: '/en/series/fundamentos-ia-iag/04-agi/',
    title: 'Chapter 4 — AGI: Artificial General Intelligence',
    concepts: ['generality', 'alignment', 'task horizon', 'DeepMind'],
    demos: [
      'fnd-agi-levels',
      'fnd-current-capabilities',
      'fnd-agi-impact',
      'fnd-benchmark-evolution',
      'fnd-ai-vs-humans',
    ],
    screenshot: 'english-foundations-04-agi.png',
  },
];

const forbidden = [
  'Capítulo ',
  'Siguiente lectura',
  'Preguntas frecuentes',
  'Fuentes base',
  'Qué es IA',
];
const failures = [];
const browser = await chromium.launch({ headless: true });

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
        if (!body.toLowerCase().includes(concept.toLowerCase())) {
          failures.push(`${chapter.route}: missing core concept ${concept}`);
        }
      }
      for (const token of forbidden) {
        if (body.includes(token)) failures.push(`${chapter.route}: Spanish leakage ${JSON.stringify(token)}`);
      }

      for (const demo of chapter.demos) {
        const selector = `[data-demo="${demo}"]`;
        if (await page.locator(selector).count() !== 1) failures.push(`${chapter.route}: missing ${selector}`);
      }

      const demos = page.locator('[data-demo]');
      if (await demos.count() !== chapter.demos.length) {
        failures.push(`${chapter.route}: expected ${chapter.demos.length} teaching visuals, found ${await demos.count()}`);
      }

      const details = page.locator('[data-demo] details');
      if (await details.count() === 0) {
        failures.push(`${chapter.route}: visuals expose no interactive disclosure`);
      } else {
        const candidate = details.nth(Math.min(1, (await details.count()) - 1));
        const before = await candidate.getAttribute('open');
        await candidate.locator('summary').click();
        const after = await candidate.getAttribute('open');
        if (before === after) failures.push(`${chapter.route}: details interaction did not toggle`);
      }

      if (await page.locator('video[data-s5-inline-video-player]').count()) {
        failures.push(`${chapter.route}: unexpected inherited Spanish video`);
      }

      const [clientWidth, scrollWidth] = await page.evaluate(() => [
        document.documentElement.clientWidth,
        document.documentElement.scrollWidth,
      ]);
      if (scrollWidth > clientWidth + 2) {
        failures.push(`${chapter.route}: ${viewport.name} horizontal overflow ${scrollWidth - clientWidth}px`);
      }
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

if (failures.length) {
  for (const failure of [...new Set(failures)]) console.error(failure);
  process.exit(1);
}

console.log('Complete English Foundations QA passed: Chapters 1–4, 23 native visuals, interactions, no Spanish media inheritance, desktop/mobile clean.');
