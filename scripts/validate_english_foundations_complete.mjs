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
    visuals: [],
    demoIds: [],
    audio: false,
    requireDetails: false,
    screenshot: 'english-foundations-00-introduction.png',
  },
  {
    route: '/en/series/fundamentos-ia-iag/01-que-es-ia/',
    title: 'Chapter 1 — What is AI?',
    media: '01-que-es-ia',
    concepts: ['Machine Learning', 'Deep Learning', 'MLOps'],
    visuals: [
      '[data-demo="ia_ml_dl"]',
      '[data-demo="tipos_aprendizaje"]',
      '[data-demo="ml:tree"]',
      '[data-demo="ml:nb"]',
      '[data-demo="ml:kmeans"]',
      '.nn3-root',
      '.mlops-walkthrough[data-mk="root"]',
    ],
    demoIds: [],
    audio: false,
    requireDetails: false,
    screenshot: 'english-foundations-01-ai.png',
  },
  {
    route: '/en/series/fundamentos-ia-iag/02-que-es-ia-generativa/',
    title: 'Chapter 2 — What is Generative AI?',
    media: '02-que-es-ia-generativa',
    concepts: ['embeddings', 'Transformer', 'foundation model', 'LLMOps'],
    demoIds: [
      'fnd-embeddings',
      'fnd-transformer',
      'fnd-scaling-curve',
      'fnd-gpt-scale',
      'fnd-llm-rag-agent',
      'fnd-llmops',
      'fnd-llmops-routes',
    ],
    audio: true,
    requireDetails: true,
    screenshot: 'english-foundations-02-genai.png',
  },
  {
    route: '/en/series/fundamentos-ia-iag/03-ia-vs-ia-generativa/',
    title: 'Chapter 3 — Classical AI vs Generative AI',
    media: '03-ia-vs-ia-generativa',
    concepts: ['determinism', 'evaluation', 'RAG', 'agent'],
    demoIds: [
      'fnd-five-differences',
      'fnd-tech-decision',
      'fnd-operational-matrix',
      'fnd-fraud-stack',
    ],
    audio: false,
    requireDetails: true,
    screenshot: 'english-foundations-03-comparison.png',
  },
  {
    route: '/en/series/fundamentos-ia-iag/04-agi/',
    title: 'Chapter 4 — AGI: Artificial General Intelligence',
    media: '04-agi',
    concepts: ['generality', 'alignment', 'task horizon', 'DeepMind'],
    demoIds: [
      'fnd-agi-levels',
      'fnd-current-capabilities',
      'fnd-agi-impact',
      'fnd-benchmark-evolution',
      'fnd-ai-vs-humans',
    ],
    audio: false,
    requireDetails: true,
    screenshot: 'english-foundations-04-agi.png',
  },
];

const canonicalInteractionContracts = {
  ia_ml_dl: {
    tabs: ['ia', 'ml', 'dl', 'gen'],
    panelSelector: '.ai-panel[data-panel]',
    itemSelector: '.ai-grid .ex',
    items: 24,
  },
  tipos_aprendizaje: {
    tabs: ['sup', 'unsup', 'self', 'rl'],
    panelSelector: '.ta-panel[data-panel]',
    itemSelector: '.learn-summary .learn-card',
    items: 16,
  },
};

const forbidden = [
  'Capítulo ',
  'Siguiente lectura',
  'Preguntas frecuentes',
  'Fuentes base',
  'Qué es IA',
];

const treeForbidden = [
  'Árboles de Decisión',
  'Guía rápida',
  'Primero preguntas',
  'Ingresos mensuales',
  'Ratio de deuda',
  'Mapa de cortes',
  'Cómo decide este caso',
  'En palabras sencillas',
  'Cómo leer el dibujo',
  'Diagrama de hojas',
  'sin entrenar',
  'pulsa Entrenar',
  'Aún no hay',
  'Resultado:',
];

const chapterOneForbidden = [
  'Demostración de bayes ingenuo',
  'Clasificación con Naive Bayes',
  'La predicción sale de juntar pistas sencillas',
  'Empieza con un ejemplo',
  'O escribe tu propio mensaje',
  'Elige el nivel de detalle',
  'Pocos grupos',
  'Los grupos se recolocan',
  'Cómo aprende una red neuronal',
  'MLOps en una mirada',
  'Entrenar no basta',
  'Qué sale de este paso',
];

const failures = [];
const browser = await chromium.launch({ headless: true });

async function validateCanonicalTabs(page, entry) {
  for (const [demo, contract] of Object.entries(canonicalInteractionContracts)) {
    const root = page.locator(`[data-demo="${demo}"]`);
    if (await root.count() !== 1) continue;
    if (!(await root.first().getAttribute('data-anim-tabs')) && !(await root.first().getAttribute('data-default'))) {
      failures.push(`${entry.route}: ${demo} lost its canonical tab interaction contract`);
    }
    const actualTabs = await root.locator('[data-role="tab"][data-tab]').evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('data-tab')),
    );
    if (JSON.stringify(actualTabs) !== JSON.stringify(contract.tabs)) {
      failures.push(`${entry.route}: ${demo} tab sequence changed: ${JSON.stringify(actualTabs)}`);
    }
    const panels = await root.locator(contract.panelSelector).count();
    if (panels !== contract.tabs.length) {
      failures.push(`${entry.route}: ${demo} expected ${contract.tabs.length} canonical panels, found ${panels}`);
    }
    const items = await root.locator(contract.itemSelector).count();
    if (items !== contract.items) {
      failures.push(`${entry.route}: ${demo} expected canonical density ${contract.items}, found ${items}`);
    }
    for (const tab of contract.tabs) {
      await root.locator(`[data-role="tab"][data-tab="${tab}"]`).click();
      const visiblePanels = await root.locator(`${contract.panelSelector}:visible`).count();
      if (visiblePanels !== 1) {
        failures.push(`${entry.route}: ${demo} tab ${tab} exposes ${visiblePanels} visible panels`);
      }
    }
  }
}

async function validateDecisionTree(page, entry) {
  const tree = page.locator('[data-demo="ml:tree"]');
  if (await tree.count() !== 1) return;
  const host = page.locator('.ml-tabs:has([data-demo="ml:tree"])').first();
  if (await host.count() !== 1) {
    failures.push(`${entry.route}: canonical decision-tree host missing`);
    return;
  }
  if ((await host.getAttribute('data-default')) !== 'tree') {
    failures.push(`${entry.route}: decision-tree canonical default tab changed`);
  }
  if (await host.locator('[data-role="tab"][data-tab="tree"]').count() !== 1) {
    failures.push(`${entry.route}: decision-tree canonical tab contract missing`);
  }
  if (await host.locator('.ml-scene-pill').count() !== 2) {
    failures.push(`${entry.route}: decision-tree canonical reading-guide density changed`);
  }
  if (await tree.locator('canvas[data-canvas="plot"]').count() !== 1 || await tree.locator('canvas[data-canvas="aux"]').count() !== 1) {
    failures.push(`${entry.route}: decision-tree must preserve both canonical canvases`);
  }
  if (await tree.locator('input[type="range"]').count() !== 2 || await tree.locator('input[type="number"]').count() !== 2) {
    failures.push(`${entry.route}: decision-tree canonical loan controls changed`);
  }
  const treeText = await host.innerText();
  const lowerTreeText = treeText.toLowerCase();
  for (const required of [
    'Decision Trees',
    'Monthly income (€)',
    'Debt ratio (%)',
    'How this case is decided',
    'In plain language',
    'How to read the visual',
    'Leaf diagram',
  ]) {
    if (!lowerTreeText.includes(required.toLowerCase())) {
      failures.push(`${entry.route}: decision-tree missing English canonical copy ${JSON.stringify(required)}`);
    }
  }
  for (const token of treeForbidden) {
    if (treeText.includes(token)) failures.push(`${entry.route}: decision-tree Spanish leakage ${JSON.stringify(token)}`);
  }

  const train = tree.locator('[data-btn="toggle"]');
  if (await train.count() !== 1) {
    failures.push(`${entry.route}: decision-tree Train control missing`);
    return;
  }
  if ((await train.innerText()).trim() !== 'Train') {
    failures.push(`${entry.route}: decision-tree initial control is not Train`);
  }
  await train.click();
  try {
    await page.waitForFunction(() => {
      const button = document.querySelector('[data-demo="ml:tree"] [data-btn="toggle"]');
      return button && /Trained/.test(button.textContent || '');
    }, null, { timeout: 7000 });
  } catch {
    failures.push(`${entry.route}: decision-tree training did not reach canonical trained state`);
  }
  const trainedText = await host.innerText();
  if (!trainedText.includes('Result:')) failures.push(`${entry.route}: decision-tree trained result is missing`);
  if (!trainedText.toLowerCase().includes('leaf diagram')) failures.push(`${entry.route}: decision-tree trained leaf diagram disappeared`);
  for (const token of treeForbidden) {
    if (trainedText.includes(token)) failures.push(`${entry.route}: decision-tree Spanish leakage after training ${JSON.stringify(token)}`);
  }
}

async function validateNaiveBayes(page, entry) {
  const demo = page.locator('[data-demo="ml:nb"]');
  if (await demo.count() !== 1) return;
  const host = page.locator('.ml-tabs:has([data-demo="ml:nb"])').first();
  if (await host.count() !== 1) {
    failures.push(`${entry.route}: canonical Naive Bayes host missing`);
    return;
  }
  if ((await host.getAttribute('data-default')) !== 'nb') failures.push(`${entry.route}: Naive Bayes canonical default changed`);
  if (await host.locator('.ml-scene-pill').count() !== 2) failures.push(`${entry.route}: Naive Bayes reading-guide density changed`);
  if (await demo.locator('canvas[data-canvas="plot"]').count() !== 1) failures.push(`${entry.route}: Naive Bayes canonical plot canvas missing`);
  if (await demo.locator('[data-example]').count() !== 3) failures.push(`${entry.route}: Naive Bayes guided examples changed`);
  if (await demo.locator('input[data-input="msg"]').count() !== 1) failures.push(`${entry.route}: Naive Bayes custom-message input missing`);
  const text = await host.innerText();
  for (const required of ['Classification with Naive Bayes', 'Start with an example', 'Or write your own message.', 'What is happening now']) {
    if (!text.includes(required)) failures.push(`${entry.route}: Naive Bayes missing English canonical copy ${JSON.stringify(required)}`);
  }
  const train = demo.locator('[data-btn="train"]');
  if (await train.count() !== 1 || (await train.innerText()).trim() !== 'Train') {
    failures.push(`${entry.route}: Naive Bayes Train control missing or mistranslated`);
    return;
  }
  await train.click();
  try {
    await page.waitForFunction(() => {
      const status = document.querySelector('[data-demo="ml:nb"] [data-pill="status"]');
      return status && /trained/i.test(status.textContent || '');
    }, null, { timeout: 7000 });
  } catch {
    failures.push(`${entry.route}: Naive Bayes training did not reach canonical trained state`);
  }
}

async function validateKMeans(page, entry) {
  const demo = page.locator('[data-demo="ml:kmeans"]');
  if (await demo.count() !== 1) return;
  const host = page.locator('.ml-tabs:has([data-demo="ml:kmeans"])').first();
  if (await host.count() !== 1) {
    failures.push(`${entry.route}: canonical k-means host missing`);
    return;
  }
  if ((await host.getAttribute('data-default')) !== 'kmeans') failures.push(`${entry.route}: k-means canonical default changed`);
  if (await host.locator('.ml-scene-pill').count() !== 2) failures.push(`${entry.route}: k-means reading-guide density changed`);
  if (await demo.locator('canvas[data-canvas="plot"]').count() !== 1) failures.push(`${entry.route}: k-means canonical plot canvas missing`);
  const scenarios = demo.locator('[data-scenario]');
  if (await scenarios.count() !== 3) failures.push(`${entry.route}: k-means canonical scenario controls changed`);
  const text = await host.innerText();
  for (const required of ['Clustering Algorithms', 'Choose the level of detail', 'Fewer groups', 'Balanced', 'More detail']) {
    if (!text.includes(required)) failures.push(`${entry.route}: k-means missing English canonical copy ${JSON.stringify(required)}`);
  }
  if (await scenarios.count() === 3) {
    await scenarios.first().click();
    if ((await scenarios.first().getAttribute('aria-pressed')) !== 'true') failures.push(`${entry.route}: k-means scenario interaction failed`);
  }
  const train = demo.locator('[data-btn="train"]');
  if (await train.count() !== 1 || (await train.innerText()).trim() !== 'Train') {
    failures.push(`${entry.route}: k-means Train control missing or mistranslated`);
    return;
  }
  await train.click();
  try {
    await page.waitForFunction(() => {
      const status = document.querySelector('[data-demo="ml:kmeans"] [data-pill="status"]');
      return status && /(clustering ready|trained)/i.test(status.textContent || '');
    }, null, { timeout: 9000 });
  } catch {
    failures.push(`${entry.route}: k-means training did not reach canonical completed state`);
  }
}

async function validateNeuralNetwork(page, entry) {
  const root = page.locator('.nn3-root');
  if (await root.count() !== 1) return;
  if ((await root.getAttribute('data-default')) !== 'linear' || !(await root.getAttribute('data-anim-tabs'))) {
    failures.push(`${entry.route}: neural-network canonical tab contract changed`);
  }
  const tabs = await root.locator('[data-role="tab"][data-tab]').evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-tab')));
  if (JSON.stringify(tabs) !== JSON.stringify(['linear', 'sine', 'complex'])) {
    failures.push(`${entry.route}: neural-network tab sequence changed: ${JSON.stringify(tabs)}`);
  }
  if (await root.locator('.nn3-panel[data-panel]').count() !== 3) failures.push(`${entry.route}: neural-network canonical panels changed`);
  if (await root.locator('svg.nn3-chart[data-chart]').count() !== 3) failures.push(`${entry.route}: neural-network canonical training charts changed`);
  if (await root.locator('.nn3-train-btn').count() !== 3) failures.push(`${entry.route}: neural-network Train controls changed`);
  if (await root.locator('.nn3-card').count() !== 6) failures.push(`${entry.route}: neural-network information density changed`);
  for (const tab of ['linear', 'sine', 'complex']) {
    await root.locator(`[data-role="tab"][data-tab="${tab}"]`).click();
    if (await root.locator('.nn3-panel[data-panel]:visible').count() !== 1) failures.push(`${entry.route}: neural-network tab ${tab} exposes the wrong panel count`);
  }
  await root.locator('[data-role="tab"][data-tab="linear"]').click();
  const train = root.locator('.nn3-train-btn[data-chart="linear"]');
  if ((await train.innerText()).trim() !== '▶ Train') failures.push(`${entry.route}: neural-network linear Train control mistranslated`);
  await train.click();
  try {
    await page.waitForFunction(() => {
      const button = document.querySelector('.nn3-root .nn3-train-btn[data-chart="linear"]');
      return button && /Reset/.test(button.textContent || '');
    }, null, { timeout: 7000 });
  } catch {
    failures.push(`${entry.route}: neural-network training did not complete`);
  }
  const text = await root.innerText();
  for (const required of ['A single neuron learns linear relationships', 'A hidden layer makes it possible to learn curves', 'More layers = increasingly complex patterns', 'Epoch', 'Loss']) {
    if (!text.includes(required)) failures.push(`${entry.route}: neural-network missing English canonical copy ${JSON.stringify(required)}`);
  }
}

async function validateMLOps(page, entry) {
  const root = page.locator('.mlops-walkthrough[data-mk="root"]');
  if (await root.count() !== 1) return;
  if ((await root.getAttribute('data-default')) !== 'datos') failures.push(`${entry.route}: MLOps canonical default changed`);
  if (await root.locator('.mlops-summary-pill').count() !== 2) failures.push(`${entry.route}: MLOps reading-guide density changed`);
  const steps = root.locator('.mlops-step[data-step]');
  if (await steps.count() !== 8) failures.push(`${entry.route}: MLOps canonical 8-step flow changed`);
  if (await root.locator('svg [data-node]').count() !== 8) failures.push(`${entry.route}: MLOps canonical orbit stations changed`);
  const text = await root.innerText();
  for (const required of ['MLOps at a glance', 'Training is not enough: you need the full lifecycle.', 'Data', 'Prepare', 'Train', 'Evaluate', 'Version', 'Deploy', 'Monitor', 'Feedback']) {
    if (!text.includes(required)) failures.push(`${entry.route}: MLOps missing English canonical copy ${JSON.stringify(required)}`);
  }
  const deploy = root.locator('[data-step="desplegar"]');
  if (await deploy.count() === 1) {
    await deploy.click();
    if ((await root.getAttribute('data-active')) !== 'desplegar') failures.push(`${entry.route}: MLOps step interaction failed`);
    const panelText = await root.locator('[data-mk="panel"]').innerText();
    if (!panelText.includes('6) Deploy — put it to work')) failures.push(`${entry.route}: MLOps deploy panel did not preserve canonical content`);
  }
}

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
        if (!lowerBody.includes(concept.toLowerCase())) failures.push(`${entry.route}: missing core concept ${concept}`);
      }
      for (const token of forbidden) {
        if (body.includes(token)) failures.push(`${entry.route}: Spanish leakage ${JSON.stringify(token)}`);
      }
      if (entry.route.includes('/01-que-es-ia/')) {
        for (const token of chapterOneForbidden) {
          if (body.includes(token)) failures.push(`${entry.route}: Chapter 1 Spanish leakage ${JSON.stringify(token)}`);
        }
      }

      if (entry.visuals) {
        for (const selector of entry.visuals) {
          if (await page.locator(selector).count() !== 1) failures.push(`${entry.route}: expected one canonical teaching visual ${selector}`);
        }
      } else {
        for (const demo of entry.demoIds) {
          const selector = `[data-demo="${demo}"]`;
          if (await page.locator(selector).count() !== 1) failures.push(`${entry.route}: missing ${selector}`);
        }
        const demos = page.locator('[data-demo]');
        if (await demos.count() !== entry.demoIds.length) {
          failures.push(`${entry.route}: expected ${entry.demoIds.length} teaching visuals, found ${await demos.count()}`);
        }
      }

      await validateCanonicalTabs(page, entry);
      await validateDecisionTree(page, entry);
      await validateNaiveBayes(page, entry);
      await validateKMeans(page, entry);
      await validateNeuralNetwork(page, entry);
      await validateMLOps(page, entry);

      if (entry.requireDetails) {
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
      if (scrollWidth > clientWidth + 2) failures.push(`${entry.route}: ${viewport.name} horizontal overflow ${scrollWidth - clientWidth}px`);
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

console.log('Complete English Foundations QA passed: introduction + Chapters 1–4, 23 canonical teaching visuals, native-English media, canonical interaction density including Decision Tree, Naive Bayes, k-means, neural-network training and the 8-step MLOps walkthrough, plus clean desktop/mobile layouts.');
