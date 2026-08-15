#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const articles = [
  {
    route: '/en/articulos-tecnicos/proactive-reactive-agent-and-tool-calls/',
    title: 'Proactive and reactive agents and tool calls',
    concepts: ['idempotency', 'DeliveryEnvelope', 'durable'],
    prefix: 'tech-01-', demos: 4,
    media: 'reactive-proactive-agent-header-demo',
    screenshot: 'english-technical-01-async-tools.png',
  },
  {
    route: '/en/articulos-tecnicos/reactive-proactive-voice-agents/',
    title: 'Reactive–proactive voice agents',
    concepts: ['barge-in', 'heard-state', 'delivery window'],
    prefix: 'tech-02-', demos: 7,
    media: null,
    screenshot: 'english-technical-02-reactive-proactive-voice.png',
  },
  {
    route: '/en/articulos-tecnicos/voice-agent-architectures/',
    title: 'Three architectures for voice agents',
    concepts: ['full cascade', 'half cascade', 'SpeechPlan', 'speech-to-speech'],
    prefix: 'tech-03-', demos: 10,
    media: null,
    screenshot: 'english-technical-03-voice-architectures.png',
  },
];

const forbidden = ['Preguntas frecuentes', 'Fuentes base', 'Artículo técnico', 'Siguiente artículo'];
const failures = [];
const browser = await chromium.launch({ headless: true });
let totalVisuals = 0;

try {
  const hub = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const hubResponse = await hub.goto(`${base}/en/articulos-tecnicos/`, { waitUntil: 'networkidle' });
  if (!hubResponse?.ok()) failures.push(`/en/articulos-tecnicos/: HTTP ${hubResponse?.status() ?? 'no response'}`);
  const hubBody = await hub.locator('body').innerText();
  if (!hubBody.includes('Technical Articles')) failures.push('/en/articulos-tecnicos/: missing English hub title');
  for (const article of articles) {
    const relative = article.route.replace('/en/', '/');
    const linkCount = await hub.locator(`a[href$="${relative}"]`).count();
    if (!linkCount && !hubBody.includes(article.title.split(' — ')[0])) failures.push(`/en/articulos-tecnicos/: missing link/text for ${article.route}`);
  }
  await hub.close();

  for (const article of articles) {
    for (const viewport of [
      { name: 'desktop', width: 1440, height: 1000 },
      { name: 'mobile', width: 390, height: 844 },
    ]) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      const runtimeErrors = [];
      page.on('pageerror', (error) => runtimeErrors.push(`pageerror: ${error.message}`));
      const response = await page.goto(`${base}${article.route}`, { waitUntil: 'networkidle' });
      if (!response?.ok()) failures.push(`${article.route}: HTTP ${response?.status() ?? 'no response'}`);

      const body = await page.locator('body').innerText();
      if (!body.includes(article.title)) failures.push(`${article.route}: missing English article title`);
      for (const concept of article.concepts) {
        if (!body.toLowerCase().includes(concept.toLowerCase())) failures.push(`${article.route}: missing core concept ${concept}`);
      }
      for (const token of forbidden) if (body.includes(token)) failures.push(`${article.route}: Spanish leakage ${JSON.stringify(token)}`);

      const demos = await page.locator('[data-demo^="tech-"]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-demo')));
      if (demos.length !== article.demos) failures.push(`${article.route}: expected ${article.demos} visuals, found ${demos.length}`);
      if (new Set(demos).size !== demos.length) failures.push(`${article.route}: duplicate visual ids`);
      for (const demo of demos) if (!demo?.startsWith(article.prefix)) failures.push(`${article.route}: unexpected visual id ${JSON.stringify(demo)}`);
      if (viewport.name === 'desktop') totalVisuals += demos.length;

      const details = page.locator('[data-demo^="tech-"] details');
      if (await details.count() === 0) failures.push(`${article.route}: no interactive visual disclosure`);
      else {
        const candidate = details.first();
        const before = await candidate.getAttribute('open');
        await candidate.locator('summary').click();
        const after = await candidate.getAttribute('open');
        if (before === after) failures.push(`${article.route}: details interaction did not toggle`);
      }

      const videos = page.locator('video[data-s5-inline-video-player]');
      const videoCount = await videos.count();
      if (article.media) {
        if (videoCount !== 1) failures.push(`${article.route}: expected one native-English video, found ${videoCount}`);
        else {
          const video = videos.first();
          const sourceUrl = new URL((await video.locator('source').first().getAttribute('src')) || '', page.url());
          const posterUrl = new URL((await video.getAttribute('poster')) || '', page.url());
          const root = '/en/articulos-tecnicos/';
          if (sourceUrl.pathname !== `${root}${article.media}.mp4`) failures.push(`${article.route}: video escaped native English media: ${sourceUrl.pathname}`);
          if (posterUrl.pathname !== `${root}${article.media}.jpg`) failures.push(`${article.route}: poster escaped native English media: ${posterUrl.pathname}`);
        }
      } else if (videoCount) {
        failures.push(`${article.route}: unexpected inherited or undeclared video`);
      }
      if (await page.locator('audio').count()) failures.push(`${article.route}: unexpected inherited Spanish audio`);
      const [clientWidth, scrollWidth] = await page.evaluate(() => [document.documentElement.clientWidth, document.documentElement.scrollWidth]);
      if (scrollWidth > clientWidth + 2) failures.push(`${article.route}: ${viewport.name} horizontal overflow ${scrollWidth - clientWidth}px`);
      for (const err of runtimeErrors) failures.push(`${article.route}: ${err}`);

      if (viewport.name === 'desktop') await page.screenshot({ path: path.join(outDir, article.screenshot), fullPage: true, animations: 'disabled' });
      await page.close();
    }
  }
} finally {
  await browser.close();
}

if (totalVisuals !== 21) failures.push(`Technical Articles: expected 21 native English visuals, found ${totalVisuals}`);
if (failures.length) {
  for (const failure of [...new Set(failures)]) console.error(failure);
  process.exit(1);
}
console.log('Complete English Technical Articles QA passed: hub + 3 articles, 21 visuals, exact native-English header media where canonical, no Spanish media inheritance, desktop/mobile clean.');
