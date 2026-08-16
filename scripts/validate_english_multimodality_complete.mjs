#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const pages = [
  {
    route: '/en/series/multimodalidad-iag/00_presentacion_serie/',
    title: 'Multimodality in Generative AI',
    concepts: ['Alignment', 'Architectures', 'Evaluation', 'Risks'],
    demos: 0,
    prefix: null,
    media: '00_presentacion_serie',
    screenshot: 'english-multimodality-00-introduction.png',
  },
  {
    route: '/en/series/multimodalidad-iag/01-el-problema/',
    title: 'Chapter 1 — The real problem: integrating different modalities without reducing them too early',
    concepts: ['perception', 'alignment', 'grounding', 'modality collapse'],
    demos: 3,
    prefix: 'mm-01-',
    media: '01-el-problema',
    screenshot: 'english-multimodality-01-problem.png',
  },
  {
    route: '/en/series/multimodalidad-iag/02-alineamiento/',
    title: 'Chapter 2 — Alignment: from pairs to interactions',
    concepts: ['contrastive learning', 'ImageBind', 'instruction', 'data quality'],
    demos: 4,
    prefix: 'mm-02-',
    media: '02-alineamiento',
    screenshot: 'english-multimodality-02-alignment.png',
  },
  {
    route: '/en/series/multimodalidad-iag/03-arquitecturas/',
    title: 'Chapter 3 — Architectures: shared spaces, connectors and omni models',
    concepts: ['cross-attention', 'tokenization', 'streaming', 'latency'],
    demos: 5,
    prefix: 'mm-03-',
    media: '03-arquitecturas',
    screenshot: 'english-multimodality-03-architectures.png',
  },
  {
    route: '/en/series/multimodalidad-iag/04-evaluacion/',
    title: 'Chapter 4 — Evaluation: measuring without fooling ourselves',
    concepts: ['grounding', 'contamination', 'language bias', 'HallusionBench'],
    demos: 7,
    prefix: 'mm-04-',
    media: '04-evaluacion',
    screenshot: 'english-multimodality-04-evaluation.png',
  },
  {
    route: '/en/series/multimodalidad-iag/05-riesgos/',
    title: 'Chapter 5 — Risks: when perception becomes part of the attack surface',
    concepts: ['untrusted', 'authorization', 'provenance', 'human approval'],
    demos: 8,
    prefix: 'mm-05-',
    media: '05-riesgos',
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

async function assertTabInteraction(root, tabSelector, panelSelector, targetIndex, label, route) {
  const tabs = root.locator(tabSelector);
  const panels = root.locator(panelSelector);
  const targetTab = tabs.nth(targetIndex);
  const targetPanel = panels.nth(targetIndex);
  await targetTab.click();
  if (!(await targetTab.evaluate((node) => node.classList.contains('active')))) {
    failures.push(`${route}: ${label} tab did not become active`);
  }
  if (!(await targetPanel.isVisible())) failures.push(`${route}: ${label} target panel did not become visible`);
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
      if (!body.includes(entry.title)) failures.push(`${entry.route}: missing English page title`);
      for (const concept of entry.concepts) {
        if (!body.toLowerCase().includes(concept.toLowerCase())) failures.push(`${entry.route}: missing core concept ${concept}`);
      }
      for (const token of forbidden) {
        if (body.includes(token)) failures.push(`${entry.route}: Spanish leakage ${JSON.stringify(token)}`);
      }

      const demoValues = await page.locator('[data-demo]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-demo')));
      if (demoValues.length !== entry.demos) {
        failures.push(`${entry.route}: expected ${entry.demos} teaching visuals, found ${demoValues.length}`);
      }
      if (new Set(demoValues).size !== demoValues.length) failures.push(`${entry.route}: duplicate data-demo visual identifiers`);
      if (entry.prefix) {
        for (const demo of demoValues) {
          const canonicalChapter3Tradeoffs = entry.route.endsWith('/03-arquitecturas/') && demo === '03-tradeoffs';
          if (!demo?.startsWith(entry.prefix) && !canonicalChapter3Tradeoffs) {
            failures.push(`${entry.route}: unexpected visual identifier ${JSON.stringify(demo)}`);
          }
        }
      }
      if (viewport.name === 'desktop') totalVisuals += demoValues.length;

      if (entry.route.endsWith('/01-el-problema/')) {
        const commonSpace = page.locator('[data-demo="mm-01-common-space"]');
        if (await commonSpace.count() !== 1) {
          failures.push(`${entry.route}: missing canonical common-space visual`);
        } else {
          if (await commonSpace.locator('.ec-tab').count() !== 3) failures.push(`${entry.route}: common-space visual lost its three canonical tabs`);
          if (await commonSpace.locator('.ec-panel').count() !== 3) failures.push(`${entry.route}: common-space visual lost its three canonical panels`);
          if (await commonSpace.locator('.ec-lv').count() !== 3) failures.push(`${entry.route}: common-space visual lost its three integration levels`);
          if (await commonSpace.locator('.ec-cap').count() !== 5) failures.push(`${entry.route}: common-space visual lost its five capability cards`);
          if (await commonSpace.locator('.ec-diff').count() !== 4) failures.push(`${entry.route}: common-space visual lost its four structural difficulties`);
          const commonSpaceText = (await commonSpace.textContent()) || '';
          for (const token of ['The three levels', 'Five capabilities', 'Why it remains difficult', 'Translation', 'Alignment', 'Operational co-presence', 'Perceive', 'Reason', 'Generate', 'Act', 'Granularity', 'Temporality', 'Grounding', 'Asymmetry']) {
            if (!commonSpaceText.includes(token)) failures.push(`${entry.route}: common-space visual missing ${JSON.stringify(token)}`);
          }
          await assertTabInteraction(commonSpace, '.ec-tab', '.ec-panel', 2, 'common-space difficulty', entry.route);
        }
      }

      if (entry.route.endsWith('/03-arquitecturas/')) {
        const tradeoffs = page.locator('[data-demo="03-tradeoffs"]');
        if (await tradeoffs.count() !== 1) {
          failures.push(`${entry.route}: missing canonical four-family trade-off visual`);
        } else {
          if (await tradeoffs.locator('.trd-hdr').count() !== 5) failures.push(`${entry.route}: trade-off visual lost architecture headers`);
          if (await tradeoffs.locator('.trd-rl').count() !== 6) failures.push(`${entry.route}: trade-off visual lost six metric rows`);
          if (await tradeoffs.locator('.trd-cell').count() !== 24) failures.push(`${entry.route}: trade-off visual lost 24 architecture/metric cells`);
          const tradeoffText = await tradeoffs.innerText();
          for (const token of ['Training cost', 'Visual reasoning quality', 'Inference latency', 'Accessibility for teams', 'Multimodal generation', 'First-response latency', 'Omni / streaming']) {
            if (!tradeoffText.includes(token)) failures.push(`${entry.route}: trade-off visual missing ${JSON.stringify(token)}`);
          }
          if (viewport.name === 'mobile') {
            const [clientWidth, scrollWidth] = await tradeoffs.locator('.trd-grid').evaluate((node) => [node.clientWidth, node.scrollWidth]);
            if (scrollWidth <= clientWidth) failures.push(`${entry.route}: mobile trade-off matrix should retain all four families via contained horizontal scrolling`);
          }
        }

        const discrete = page.locator('[data-demo="mm-03-discrete-tokens"]');
        if (await discrete.count() !== 1) {
          failures.push(`${entry.route}: missing canonical VQ-VAE/MoE discrete-token visual`);
        } else {
          if (await discrete.locator('.tkd-tab').count() !== 2) failures.push(`${entry.route}: discrete-token visual lost its two canonical tabs`);
          if (await discrete.locator('.tkd-panel').count() !== 2) failures.push(`${entry.route}: discrete-token visual lost its two canonical panels`);
          if (await discrete.locator('.tkd-vq-step').count() !== 4) failures.push(`${entry.route}: VQ-VAE pipeline lost one of four canonical stages`);
          if (await discrete.locator('.tkd-moe-expert').count() !== 4) failures.push(`${entry.route}: MoE panel lost one of four canonical experts`);
          if (await discrete.locator('.tkd-moe-stat').count() !== 3) failures.push(`${entry.route}: MoE panel lost canonical statistics`);
          const discreteText = (await discrete.textContent()) || '';
          for (const token of ['Native tokenization in practice', 'Nearest-neighbor lookup', 'Mixed input sequence', 'Router (lightweight network)', '2 / 8', '~25%', '1M tokens']) {
            if (!discreteText.includes(token)) failures.push(`${entry.route}: discrete-token visual missing ${JSON.stringify(token)}`);
          }
          await assertTabInteraction(discrete, '.tkd-tab', '.tkd-panel', 1, 'discrete-token MoE', entry.route);
        }

        const families = page.locator('[data-demo="mm-03-families"]');
        if (await families.count() !== 1) {
          failures.push(`${entry.route}: missing canonical four-family architecture visual`);
        } else {
          if (await families.locator('.arc-tab').count() !== 4) failures.push(`${entry.route}: architecture-family visual lost its four canonical tabs`);
          if (await families.locator('.arc-panel').count() !== 4) failures.push(`${entry.route}: architecture-family visual lost its four canonical panels`);
          const familyText = (await families.textContent()) || '';
          for (const token of ['Encoder + connector + LLM', 'Cross-attention fusion', 'Native tokenization', 'Omni and streaming models', 'GPT-4o', 'Gemini 2.5 Native Audio', 'Qwen2.5-Omni']) {
            if (!familyText.includes(token)) failures.push(`${entry.route}: architecture-family visual missing ${JSON.stringify(token)}`);
          }
          await assertTabInteraction(families, '.arc-tab', '.arc-panel', 3, 'omni/streaming architecture', entry.route);
        }
      }

      if (entry.route.endsWith('/04-evaluacion/')) {
        const grounding = page.locator('[data-demo="mm-04-grounding"]');
        if (await grounding.count() !== 1) {
          failures.push(`${entry.route}: missing canonical grounding visual`);
        } else {
          if (await grounding.locator('.grn-tab').count() !== 3) failures.push(`${entry.route}: grounding visual lost its three canonical tabs`);
          if (await grounding.locator('.grn-panel').count() !== 3) failures.push(`${entry.route}: grounding visual lost its three canonical panels`);
          if (await grounding.locator('.grn-col').count() !== 2) failures.push(`${entry.route}: grounding visual lost grounded-vs-prior comparison`);
          if (await grounding.locator('.grn-scenario').count() !== 2) failures.push(`${entry.route}: grounding visual lost visible/invisible failure scenarios`);
          if (await grounding.locator('.grn-principle').count() !== 3) failures.push(`${entry.route}: grounding visual lost benchmark-design principles`);
          if (await grounding.locator('.grn-bench').count() !== 2) failures.push(`${entry.route}: grounding visual lost benchmark examples`);
          const groundingText = (await grounding.textContent()) || '';
          for (const token of ['What grounding is', 'When it fails silently', 'What good benchmarks do', 'Invisible failure', 'The solution: designed counterexamples', 'MMStar', 'SEEDBench']) {
            if (!groundingText.includes(token)) failures.push(`${entry.route}: grounding visual missing ${JSON.stringify(token)}`);
          }
          await assertTabInteraction(grounding, '.grn-tab', '.grn-panel', 2, 'grounding benchmark-design', entry.route);
        }
      }

      // Chapters 1, 3 and 4 now use canonical tab/panel interactions that are
      // validated explicitly above and in chapter-specific QA. Do not require
      // obsolete <details> disclosures merely because older English redesigns used them.
      if (entry.demos && !entry.route.endsWith('/01-el-problema/') && !entry.route.endsWith('/03-arquitecturas/') && !entry.route.endsWith('/04-evaluacion/')) {
        const details = page.locator('[data-demo] details');
        if (await details.count() === 0) {
          failures.push(`${entry.route}: visuals expose no interactive disclosure`);
        } else {
          const candidate = details.first();
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
        const sourceUrl = new URL((await video.locator('source').first().getAttribute('src')) || '', page.url());
        const posterUrl = new URL((await video.getAttribute('poster')) || '', page.url());
        const expectedRoot = '/en/series/multimodalidad-iag/';
        if (!sourceUrl.pathname.startsWith(expectedRoot) || !sourceUrl.pathname.endsWith(`/${entry.media}.mp4`)) {
          failures.push(`${entry.route}: native video resolves outside English Multimodality media: ${sourceUrl.pathname}`);
        }
        if (!posterUrl.pathname.startsWith(expectedRoot) || !posterUrl.pathname.endsWith(`/${entry.media}.jpg`)) {
          failures.push(`${entry.route}: native poster resolves outside English Multimodality media: ${posterUrl.pathname}`);
        }
      }
      if (await page.locator('audio').count()) failures.push(`${entry.route}: unexpected inherited Spanish audio`);

      const [clientWidth, scrollWidth] = await page.evaluate(() => [document.documentElement.clientWidth, document.documentElement.scrollWidth]);
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

if (totalVisuals !== 27) failures.push(`Multimodality series: expected 27 native English visuals, found ${totalVisuals}`);

if (failures.length) {
  for (const failure of [...new Set(failures)]) console.error(failure);
  process.exit(1);
}

console.log('Complete English Multimodality QA passed: introduction + Chapters 1–5, 27 unique native visuals, canonical Chapter 1 common-space interaction, canonical Chapter 3 trade-off/VQ-VAE-MoE/four-family interactions, canonical Chapter 4 grounding interaction, six native-English MP4/poster pairs, no Spanish media inheritance, desktop/mobile clean.');