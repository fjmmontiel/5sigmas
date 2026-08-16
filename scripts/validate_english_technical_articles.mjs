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
    title: 'Reactive and proactive agents in voice',
    concepts: ['ActivityGate', 'DeliveryEnvelope', 'speech_stop_to_acceptance_audio_ms', 'Pipecat', 'Twilio'],
    canonicalVoiceRp: true,
    demos: 7,
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
const voiceRpSelectors = ['.s5v-contract', '.s5v-window', '.s5v-clocks', '.s5v-gate', '.s5v-barge', '.s5v-batch', '.s5v-runtime'];
const failures = [];
const browser = await chromium.launch({ headless: true });
let totalVisuals = 0;

const visible = async (locator) => locator.evaluate((node) => {
  const style = getComputedStyle(node);
  return style.display !== 'none' && style.visibility !== 'hidden' && node.getClientRects().length > 0;
});

async function expectCount(page, route, selector, expected) {
  const count = await page.locator(selector).count();
  if (count !== expected) failures.push(`${route}: ${selector} expected ${expected}, found ${count}`);
}

async function expectBefore(page, route, beforeSelector, afterSelector) {
  const before = page.locator(beforeSelector).first();
  const after = page.locator(afterSelector).first();
  if (!(await before.count()) || !(await after.count())) {
    failures.push(`${route}: cannot resolve hook order ${beforeSelector} -> ${afterSelector}`);
    return;
  }
  const [a, b] = await Promise.all([before.elementHandle(), after.elementHandle()]);
  const ordered = await page.evaluate(([x, y]) => Boolean(x.compareDocumentPosition(y) & Node.DOCUMENT_POSITION_FOLLOWING), [a, b]);
  if (!ordered) failures.push(`${route}: wrong hook order ${beforeSelector} -> ${afterSelector}`);
}

async function validateVoiceRp(page, article, viewportName) {
  const body = await page.locator('body').innerText();
  const stale = [
    'Use a shared conversational blackboard',
    'The seam between reactive and proactive behaviour is the key contract',
    'Priority does not have to mean immediate interruption',
    'Frequently asked questions',
  ];
  for (const token of stale) if (body.includes(token)) failures.push(`${article.route}: English-only reauthoring remains ${JSON.stringify(token)}`);

  const canonicalAnchors = [
    'Four clocks have to be coordinated',
    'The first response accepts work',
    'The result goes through an ActivityGate',
    'Barge-in: cancel the voice, not the whole system',
    'Several tools should produce one final completion',
    'A single component controls the voice',
    'Technical completion creates a pending delivery. The conversation decides when it can be heard.',
  ];
  for (const token of canonicalAnchors) if (!body.includes(token)) failures.push(`${article.route}: missing canonical teaching anchor ${JSON.stringify(token)}`);

  if (await page.locator('[data-demo^="tech-02-"]').count()) failures.push(`${article.route}: legacy simplified tech-02 visual remains in article flow`);
  for (const selector of voiceRpSelectors) {
    const root = page.locator(selector);
    const count = await root.count();
    if (count !== 1) {
      failures.push(`${article.route}: expected one canonical ${selector}, found ${count}`);
      continue;
    }
    if (!await visible(root.first())) failures.push(`${article.route}: canonical ${selector} is not visible`);
    const box = await root.first().boundingBox();
    if (!box || box.width < 240 || box.height < 70) failures.push(`${article.route}: ${selector} has invalid ${viewportName} geometry ${JSON.stringify(box)}`);
    const overflow = await root.first().evaluate((node) => node.scrollWidth - node.clientWidth);
    if (overflow > 2) failures.push(`${article.route}: ${viewportName} ${selector} internal overflow ${overflow}px`);
  }

  await expectCount(page, article.route, '.s5v-contract [data-s5v-step]', 3);
  await expectCount(page, article.route, '.s5v-contract [data-s5v-copy]', 3);
  await expectCount(page, article.route, '.s5v-window [data-s5v-step]', 2);
  await expectCount(page, article.route, '.s5v-clocks .s5v-clocks__row', 4);
  await expectCount(page, article.route, '.s5v-gate [data-s5v-step]', 3);
  await expectCount(page, article.route, '.s5v-gate .s5v-gate__out', 3);
  await expectCount(page, article.route, '.s5v-barge [data-s5v-step]', 2);
  await expectCount(page, article.route, '.s5v-barge .s5v-barge__item', 3);
  await expectCount(page, article.route, '.s5v-barge [data-s5v-copy]', 2);
  await expectCount(page, article.route, '.s5v-batch .s5v-batch__tools span', 3);
  await expectCount(page, article.route, '.s5v-batch .s5v-batch__progress i', 3);
  await expectCount(page, article.route, '.s5v-runtime .s5v-runtime__lower > div', 2);

  for (const selector of ['.s5v-contract', '.s5v-window', '.s5v-gate', '.s5v-barge']) {
    const root = page.locator(selector).first();
    if (!(await root.count())) continue;
    const buttons = root.locator('[data-s5v-step]');
    const n = await buttons.count();
    if (n < 2) continue;
    await buttons.nth(n - 1).click();
    await page.waitForTimeout(80);
    const expected = await buttons.nth(n - 1).getAttribute('data-s5v-step');
    const actual = await root.getAttribute('data-step');
    if (actual !== expected) failures.push(`${article.route}: ${selector} interaction did not reach step ${expected}; got ${actual}`);
  }

  for (let index = 0; index < voiceRpSelectors.length - 1; index += 1) {
    await expectBefore(page, article.route, voiceRpSelectors[index], voiceRpSelectors[index + 1]);
  }
  await expectBefore(page, article.route, '.s5v-contract', '.md-content__inner > h2');

  return voiceRpSelectors.length;
}

try {
  const hub = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const hubResponse = await hub.goto(`${base}/en/articulos-tecnicos/`, { waitUntil: 'networkidle' });
  if (!hubResponse?.ok()) failures.push(`/en/articulos-tecnicos/: HTTP ${hubResponse?.status() ?? 'no response'}`);
  const hubBody = await hub.locator('body').innerText();
  if (!hubBody.includes('Technical Articles')) failures.push('/en/articulos-tecnicos/: missing English hub title');
  for (const article of articles) {
    const hasRouteLink = await hub.locator('a').evaluateAll(
      (nodes, route) => nodes.some((node) => {
        try {
          return new URL(node.href).pathname === route;
        } catch {
          return false;
        }
      }),
      article.route,
    );
    if (!hasRouteLink && !hubBody.includes(article.title.split(' — ')[0])) failures.push(`/en/articulos-tecnicos/: missing link/text for ${article.route}`);
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

      let demoCount = 0;
      if (article.canonicalVoiceRp) {
        demoCount = await validateVoiceRp(page, article, viewport.name);
      } else {
        const demos = await page.locator('[data-demo^="tech-"]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-demo')));
        if (demos.length !== article.demos) failures.push(`${article.route}: expected ${article.demos} visuals, found ${demos.length}`);
        if (new Set(demos).size !== demos.length) failures.push(`${article.route}: duplicate visual ids`);
        for (const demo of demos) if (!demo?.startsWith(article.prefix)) failures.push(`${article.route}: unexpected visual id ${JSON.stringify(demo)}`);
        demoCount = demos.length;

        const details = page.locator('[data-demo^="tech-"] details');
        if (await details.count() === 0) failures.push(`${article.route}: no interactive visual disclosure`);
        else {
          const candidate = details.first();
          const before = await candidate.getAttribute('open');
          await candidate.locator('summary').click();
          const after = await candidate.getAttribute('open');
          if (before === after) failures.push(`${article.route}: details interaction did not toggle`);
        }
      }
      if (viewport.name === 'desktop') totalVisuals += demoCount;

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
console.log('Complete English Technical Articles QA passed: hub + 3 articles, 21 visuals, canonical reactive-proactive voice parity, native-English media, desktop/mobile clean.');