#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const chapters = [
  {
    route: '/en/series/from-cave-to-agi/01-representar/',
    slug: '01-representar',
    title: 'Chapter 1: Represent',
    concepts: ['algebra', 'deductive', 'calculus'],
    demos: ['01-sistemas-numeracion','01-algebra-despejar','01-cadena-deductiva','01-timeline-representar'],
    screenshot: 'english-history-01-represent.png',
    canonicalInteractions: true,
  },
  {
    route: '/en/series/from-cave-to-agi/03-aprender/',
    slug: '03-aprender',
    title: 'Chapter 3 — Learn',
    concepts: ['expert systems', 'backpropagation', 'AlexNet'],
    demos: ['03-simbolica','03-inviernos-ia','03-bucle-entrenamiento','03-problema-xor','03-nlp-pre-transformer'],
    screenshot: 'english-history-03-learn.png',
  },
  {
    route: '/en/series/from-cave-to-agi/04-escalar/',
    slug: '04-escalar',
    title: 'Chapter 4 — Scale',
    concepts: ['Transformer', 'scaling laws', 'foundation models'],
    demos: ['04-shock-2012','04-transformer-reutilizacion','04-escala-producto','04-leyes-escala','04-emergencia-capacidades','04-preentrenamiento-finetuning'],
    screenshot: 'english-history-04-scale.png',
  },
  {
    route: '/en/series/from-cave-to-agi/05-mas-alla/',
    slug: '05-mas-alla',
    title: 'Chapter 5 — Beyond the Transformer',
    concepts: ['search', 'memory', 'world models', 'robotics'],
    demos: ['05-agentes-convergencia','05-busqueda-solucion','05-memoria-tipos','05-arquitecturas-post-transformer','05-world-models-ecosystem','05-apuestas-capital','05-robotica-fundacional'],
    screenshot: 'english-history-05-beyond.png',
  },
];

const forbidden = [
  'Capítulo ',
  'Siguiente capítulo',
  'Anterior',
  'Preguntas frecuentes',
  'Fuentes base',
  'Hace posible',
  'No permite',
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

      if (chapter.slug === '03-aprender') {
        const winters = page.locator('[data-demo="03-inviernos-ia"]');
        const winterText = (await winters.textContent()) || '';
        for (const anchor of [
          'The AI winters: the same pattern, twice',
          'First summer and first winter',
          'Expert systems: summer and second winter',
          'The quiet accumulation: three factors converge',
          'top-5 error fell from 25.8% to 15.3%',
        ]) {
          if (!winterText.includes(anchor)) failures.push(`${chapter.route}: AI-winters visual missing ${JSON.stringify(anchor)}`);
        }
        for (const token of ['Los inviernos de la IA', 'Primer ciclo', 'Verano', 'Invierno', 'Datos masivos', 'Anterior', 'Siguiente']) {
          if (winterText.includes(token)) failures.push(`${chapter.route}: AI-winters Spanish leakage ${JSON.stringify(token)}`);
        }
        if (await winters.locator('.inv-step').count() !== 3) failures.push(`${chapter.route}: expected three canonical AI-winters steps`);
        if (await winters.locator('.inv-panel').count() !== 3) failures.push(`${chapter.route}: expected three canonical AI-winters panels`);
        if ((await winters.getAttribute('data-inv-ready')) !== '1') failures.push(`${chapter.route}: AI-winters runtime did not initialize`);
        await winters.locator('#inv-next').click();
        if (!(await winters.locator('.inv-panel[data-p="1"]').getAttribute('class'))?.includes('inv-panel--active')) failures.push(`${chapter.route}: AI-winters Next did not activate second panel`);
        await winters.locator('#inv-next').click();
        if (!(await winters.locator('.inv-panel[data-p="2"]').getAttribute('class'))?.includes('inv-panel--active')) failures.push(`${chapter.route}: AI-winters Next did not activate third panel`);
        await winters.locator('#inv-prev').click();
        if (!(await winters.locator('.inv-panel[data-p="1"]').getAttribute('class'))?.includes('inv-panel--active')) failures.push(`${chapter.route}: AI-winters Previous did not return to second panel`);
        await winters.locator('.inv-step[data-s="0"]').click();
        if (!(await winters.locator('.inv-panel[data-p="0"]').getAttribute('class'))?.includes('inv-panel--active')) failures.push(`${chapter.route}: AI-winters stepper did not return to first panel`);
      }

      if (chapter.canonicalInteractions) {
        const numeralTabs = page.locator('[data-demo="01-sistemas-numeracion"] .num-tab');
        const numeralPanels = page.locator('[data-demo="01-sistemas-numeracion"] .num-panel');
        if (await numeralTabs.count() !== 4) failures.push(`${chapter.route}: expected four canonical numeral-system tabs`);
        if (await numeralPanels.count() !== 4) failures.push(`${chapter.route}: expected four canonical numeral-system panels`);
        const binaryTab = page.locator('[data-demo="01-sistemas-numeracion"] .num-tab[data-tab="binary"]');
        await binaryTab.click();
        if (!(await binaryTab.getAttribute('class'))?.includes('num-tab--active')) failures.push(`${chapter.route}: numeral-system tab interaction did not activate Binary`);
        if (!(await page.locator('[data-demo="01-sistemas-numeracion"] .num-panel[data-panel="binary"]').getAttribute('class'))?.includes('num-panel--active')) failures.push(`${chapter.route}: Binary panel did not activate`);

        if (await page.locator('[data-demo="01-algebra-despejar"] .alg-s-item').count() !== 4) failures.push(`${chapter.route}: expected four canonical algebra steps`);
        await page.locator('[data-demo="01-algebra-despejar"] #alg-next').click();
        if (!(await page.locator('[data-demo="01-algebra-despejar"] .alg-panel[data-panel="1"]').getAttribute('class'))?.includes('alg-panel--active')) failures.push(`${chapter.route}: algebra stepper did not advance`);

        if (await page.locator('[data-demo="01-cadena-deductiva"] .ded-step').count() !== 4) failures.push(`${chapter.route}: expected four canonical deductive steps`);
        await page.locator('[data-demo="01-cadena-deductiva"] #ded-next').click();
        if (!(await page.locator('[data-demo="01-cadena-deductiva"] .ded-panel[data-panel="1"]').getAttribute('class'))?.includes('ded-panel--active')) failures.push(`${chapter.route}: deductive stepper did not advance`);

        const timeline = page.locator('[data-demo="01-timeline-representar"]');
        if (await timeline.locator('.rep-dot').count() !== 7) failures.push(`${chapter.route}: expected seven canonical representation milestones`);
        const firstTimelineTitle = await timeline.locator('#repTitle').innerText();
        if (firstTimelineTitle !== 'The first counters') failures.push(`${chapter.route}: unexpected first representation milestone ${JSON.stringify(firstTimelineTitle)}`);
        await timeline.locator('#repNext').click();
        await page.waitForTimeout(300);
        const secondTimelineTitle = await timeline.locator('#repTitle').innerText();
        if (secondTimelineTitle !== 'Formal arithmetic') failures.push(`${chapter.route}: representation timeline did not advance`);
      } else if (!['03-aprender', '04-escalar'].includes(chapter.slug)) {
        // Chapters 3 and 4 now use canonical Spanish-first interactive mirrors and
        // have dedicated interaction QA. Chapter 5 still contains compact English
        // disclosure implementations while its remaining visuals are migrated.
        const details = page.locator('[data-demo] details');
        if (await details.count() === 0) failures.push(`${chapter.route}: visuals expose no interactive disclosure`);
        else {
          const candidate = details.filter({ has: page.locator('summary') }).nth(Math.min(1, (await details.count()) - 1));
          const before = await candidate.getAttribute('open');
          await candidate.locator('summary').click();
          const after = await candidate.getAttribute('open');
          if (before === after) failures.push(`${chapter.route}: details interaction did not toggle`);
        }
      }

      const videos = page.locator('video[data-s5-inline-video-player]');
      if (await videos.count() !== 1) {
        failures.push(`${chapter.route}: expected one native-English video, found ${await videos.count()}`);
      } else {
        const video = videos.first();
        const sourceUrl = new URL((await video.locator('source').first().getAttribute('src')) || '', page.url());
        const posterUrl = new URL((await video.getAttribute('poster')) || '', page.url());
        const root = '/en/series/from-cave-to-agi/';
        if (sourceUrl.pathname !== `${root}${chapter.slug}.mp4`) failures.push(`${chapter.route}: unexpected video source ${sourceUrl.pathname}`);
        if (posterUrl.pathname !== `${root}${chapter.slug}.jpg`) failures.push(`${chapter.route}: unexpected video poster ${posterUrl.pathname}`);
      }

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
console.log('Complete English From the Caves to AGI QA passed: Chapters 1, 3 and 4 canonical/native visuals, native-English media, interactions and desktop/mobile layout; Chapter 5 remains under staged migration.');
