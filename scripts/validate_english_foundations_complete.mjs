#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const pages = [
  {
    route: '/en/series/fundamentos-ia-iag/00_presentacion_serie/',
    title: 'AI and Generative AI Foundations',
    media: '00_presentacion_serie',
    concepts: ['What is AI?', 'Generative AI', 'AGI'],
    demos: [],
    audio: false,
    screenshot: 'english-foundations-00-introduction.png',
  },
  {
    route: '/en/series/fundamentos-ia-iag/01-que-es-ia/',
    title: 'Chapter 1 — What is AI?',
    media: '01-que-es-ia',
    concepts: ['Machine Learning', 'Deep Learning', 'MLOps'],
    demos: [
      'ia_ml_dl',
      'tipos_aprendizaje',
      'fnd-decision-tree',
      'fnd-naive-bayes',
      'fnd-kmeans',
      'fnd-neural-network',
      'fnd-mlops-cycle',
    ],
    audio: false,
    screenshot: 'english-foundations-01-ai.png',
  },
  {
    route: '/en/series/fundamentos-ia-iag/02-que-es-ia-generativa/',
    title: 'Chapter 2 — What is Generative AI?',
    media: '02-que-es-ia-generativa',
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
    audio: true,
    screenshot: 'english-foundations-02-genai.png',
  },
  {
    route: '/en/series/fundamentos-ia-iag/03-ia-vs-ia-generativa/',
    title: 'Chapter 3 — Classical AI vs Generative AI',
    media: '03-ia-vs-ia-generativa',
    concepts: ['determinism', 'evaluation', 'RAG', 'agent'],
    demos: [
      'fnd-five-differences',
      'fnd-tech-decision',
      'fnd-operational-matrix',
      'fnd-fraud-stack',
    ],
    audio: false,
    screenshot: 'english-foundations-03-comparison.png',
  },
  {
    route: '/en/series/fundamentos-ia-iag/04-agi/',
    title: 'Chapter 4 — AGI: Artificial General Intelligence',
    media: '04-agi',
    concepts: ['generality', 'alignment', 'task horizon', 'DeepMind'],
    demos: [
      'fnd-agi-levels',
      'fnd-current-capabilities',
      'fnd-agi-impact',
      'fnd-benchmark-evolution',
      'fnd-ai-vs-humans',
    ],
    audio: false,
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
  for (const entry of pages) {
    for (const viewport of [
      { name: 'desktop', width: 1440, height: 1000 },
      { name: 'mobile', width: 390, height: 844 },
    ]) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      const runtimeErrors = [];
      page.on('pageerror', (error) => runtimeErrors.push(`pageerror: ${error.message}`));

      const response = await page.goto(`${base}${entry.route}`, { waitUntil: 'networkidle' });
      if (!response?.ok()) failures.push(`${entry.route}: HTTP ${response?.status() ?? 'no response'}`);

      const body = await page.locator('body').innerText();
      const lowerBody = body.toLowerCase();
      if (!body.includes(entry.title)) failures.push(`${entry.route}: missing English page title`);
      for (const concept of entry.concepts) {
        if (!lowerBody.includes(concept.toLowerCase())) {
          failures.push(`${entry.route}: missing core concept ${concept}`);
        }
      }
      for (const token of forbidden) {
        if (body.includes(token)) failures.push(`${entry.route}: Spanish leakage ${JSON.stringify(token)}`);
      }

      for (const demo of entry.demos) {
        const selector = `[data-demo="${demo}"]`;
        if (await page.locator(selector).count() !== 1) failures.push(`${entry.route}: missing ${selector}`);
      }

      const demos = page.locator('[data-demo]');
      if (await demos.count() !== entry.demos.length) {
        failures.push(`${entry.route}: expected ${entry.demos.length} teaching visuals, found ${await demos.count()}`);
      }

      if (entry.demos.length) {
        const details = page.locator('[data-demo] details');
        if (await details.count() === 0) {
          failures.push(`${entry.route}: visuals expose no interactive disclosure`);
        } else {
          const candidate = details.nth(Math.min(1, (await details.count()) - 1));
          const before = await candidate.getAttribute('open');
          await candidate.locator('summary').click();
          const after = await candidate.getAttribute('open');
          if (before === after) failures.push(`${entry.route}: details interaction did not toggle`);
        }
      }

      const videos = page.locator('video[data-s5-inline-video-player]');
      const videoCount = await videos.count();
      if (videoCount !== 1) {
        failures.push(`${entry.route}: expected one native English inline video, found ${videoCount}`);
      } else {
        const video = videos.first();
        const source = video.locator('source').first();
        const sourceUrl = new URL((await source.getAttribute('src')) || '', page.url());
        const posterUrl = new URL((await video.getAttribute('poster')) || '', page.url());
        const expectedRoot = '/en/series/fundamentos-ia-iag/';
        if (!sourceUrl.pathname.startsWith(expectedRoot) || !sourceUrl.pathname.endsWith(`/${entry.media}.mp4`)) {
          failures.push(`${entry.route}: native video resolves outside English Foundations media: ${sourceUrl.pathname}`);
        }
        if (!posterUrl.pathname.startsWith(expectedRoot) || !posterUrl.pathname.endsWith(`/${entry.media}.jpg`)) {
          failures.push(`${entry.route}: native poster resolves outside English Foundations media: ${posterUrl.pathname}`);
        }
      }

      const audio = page.locator('audio[data-audio-role="podcast"]');
      const audioCount = await audio.count();
      if (audioCount !== (entry.audio ? 1 : 0)) {
        failures.push(`${entry.route}: expected ${entry.audio ? 'one' : 'zero'} native English article-audio player, found ${audioCount}`);
      }
      if (entry.audio && audioCount === 1) {
        // innerText reflects CSS text-transform (the eyebrow renders uppercase),
        // so validate semantic copy case-insensitively rather than weakening the
        // locale contract to a presentation-specific casing.
        if (!lowerBody.includes('article audio') || !lowerBody.includes('listen to this article')) {
          failures.push(`${entry.route}: missing English article-audio UI copy`);
        }
        if (lowerBody.includes('audio local') || lowerBody.includes('escucha el artículo')) {
          failures.push(`${entry.route}: Spanish article-audio UI leaked into English`);
        }
        const source = audio.first().locator('source').first();
        const sourceUrl = new URL((await source.getAttribute('src')) || '', page.url());
        const expectedAudio = '/en/series/fundamentos-ia-iag/02-que-es-ia-generativa.podcast.m4a';
        if (sourceUrl.pathname !== expectedAudio) {
          failures.push(`${entry.route}: native article audio resolved to ${sourceUrl.pathname}, expected ${expectedAudio}`);
        } else {
          const audioResponse = await page.request.head(sourceUrl.href);
          if (!audioResponse.ok()) failures.push(`${entry.route}: native article audio HTTP ${audioResponse.status()}`);
          const contentType = (audioResponse.headers()['content-type'] || '').toLowerCase();
          if (contentType && !contentType.includes('audio') && !contentType.includes('mp4')) {
            failures.push(`${entry.route}: unexpected native article-audio content type ${contentType}`);
          }
        }
      }

      const [clientWidth, scrollWidth] = await page.evaluate(() => [
        document.documentElement.clientWidth,
        document.documentElement.scrollWidth,
      ]);
      if (scrollWidth > clientWidth + 2) {
        failures.push(`${entry.route}: ${viewport.name} horizontal overflow ${scrollWidth - clientWidth}px`);
      }
      for (const runtimeError of runtimeErrors) failures.push(`${entry.route}: ${runtimeError}`);

      if (viewport.name === 'desktop') {
        await page.screenshot({
          path: path.join(outDir, entry.screenshot),
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

console.log('Complete English Foundations QA passed: introduction + Chapters 1–4, 23 native visuals, native-English MP4/poster pairs, canonical native article audio, interactions, and clean desktop/mobile layouts.');