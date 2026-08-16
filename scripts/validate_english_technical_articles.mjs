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
    title: 'Reactive and proactive agents and tool calls',
    concepts: ['RuntimeState', 'handle_background_completion', 'pending_updates', 'DLQ'],
    kind: 'async', demos: 4, media: 'reactive-proactive-agent-header-demo',
    screenshot: 'english-technical-01-async-tools.png',
  },
  {
    route: '/en/articulos-tecnicos/reactive-proactive-voice-agents/',
    title: 'Reactive and proactive agents in voice',
    concepts: ['ActivityGate', 'DeliveryEnvelope', 'speech_stop_to_acceptance_audio_ms', 'Pipecat', 'Twilio'],
    kind: 'voice-rp', demos: 7, media: null,
    screenshot: 'english-technical-02-reactive-proactive-voice.png',
  },
  {
    route: '/en/articulos-tecnicos/voice-agent-architectures/',
    title: 'Three architectures for voice agents',
    concepts: ['full cascade', 'half cascade', 'SpeechPlan', 'speech-to-speech'],
    kind: 'voice-arch', demos: 10, media: null,
    screenshot: 'english-technical-03-voice-architectures.png',
  },
];

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

async function validateRoots(page, route, selectors, viewportName, minHeight = 70) {
  for (const selector of selectors) {
    const root = page.locator(selector);
    const count = await root.count();
    if (count !== 1) {
      failures.push(`${route}: expected one canonical ${selector}, found ${count}`);
      continue;
    }
    if (!await visible(root.first())) failures.push(`${route}: canonical ${selector} is not visible`);
    const box = await root.first().boundingBox();
    if (!box || box.width < 240 || box.height < minHeight) failures.push(`${route}: ${selector} has invalid ${viewportName} geometry ${JSON.stringify(box)}`);
    const overflow = await root.first().evaluate((node) => node.scrollWidth - node.clientWidth);
    if (overflow > 2) failures.push(`${route}: ${viewportName} ${selector} internal overflow ${overflow}px`);
  }
}

async function validateHookSource(route, sourcePath, hooks) {
  const source = await fs.readFile(sourcePath, 'utf8');
  let previous = -1;
  for (const hook of hooks) {
    const index = source.indexOf(hook);
    if (index < 0) failures.push(`${route}: missing canonical source hook ${hook}`);
    if (index <= previous) failures.push(`${route}: source hook out of order ${hook}`);
    previous = index;
  }
}

async function clickLastStep(page, route, selector) {
  const root = page.locator(selector).first();
  if (!(await root.count())) return;
  const buttons = root.locator('[data-s5v-step]');
  const n = await buttons.count();
  if (n < 2) return;
  await buttons.nth(n - 1).click();
  await page.waitForTimeout(80);
  const expected = await buttons.nth(n - 1).getAttribute('data-s5v-step');
  const actual = await root.getAttribute('data-step');
  if (actual !== expected) failures.push(`${route}: ${selector} interaction did not reach step ${expected}; got ${actual}`);
}

async function validateAsync(page, article, viewportName) {
  const body = await page.locator('body').innerText();
  for (const token of [
    'Core idea:', 'Runtime rule:', 'Failure mode:',
    'Reactive acknowledgement and proactive completion are different events',
    'A tool result should become a delivery object',
    'One component should own conversational delivery',
    'Batch work should create one coherent completion',
  ]) if (body.includes(token)) failures.push(`${article.route}: English-only reauthoring remains ${JSON.stringify(token)}`);

  for (const token of [
    'Base repository:', 'The problem is not the tool, but time',
    'The first turn accepts work; it does not promise results',
    'Asynchronous work needs policy, not only background execution',
    'Completion returns when the batch can close',
    'A reasonable next step toward production', 'What the repository actually contributes',
  ]) if (!body.includes(token)) failures.push(`${article.route}: missing canonical teaching anchor ${JSON.stringify(token)}`);

  const hooks = ['async-tool-panorama.html', 'tool-lifecycle.html', 'target-architecture.html', 'runtime-conversational.html'];
  await validateHookSource(article.route, 'locales/en/articulos-tecnicos/proactive-reactive-agent-and-tool-calls.md', hooks);
  if (await page.locator('[data-demo^="tech-01-"]').count()) failures.push(`${article.route}: legacy simplified tech-01 visual remains`);

  const roots = [
    '.atcs-panorama',
    'section.atcs-wrap[aria-label="Lifecycle of an operation and pending updates"]',
    'section.atca-wrap[aria-label="Next step toward production for Reactive / Proactive Agent"]',
    'section.atcs-wrap[aria-label="Conversational runtime and deferred delivery"]',
  ];
  await validateRoots(page, article.route, roots, viewportName, 100);
  await expectCount(page, article.route, '.atcs-panorama-compact__section', 3);
  await expectCount(page, article.route, '.atcs-panorama-compact__legend span', 3);
  await expectCount(page, article.route, '.atcs-panorama svg.atcs-board', 1);
  await expectCount(page, article.route, 'section.atcs-wrap[aria-label="Lifecycle of an operation and pending updates"] svg.atcs-board', 1);
  await expectCount(page, article.route, 'section.atca-wrap[aria-label="Next step toward production for Reactive / Proactive Agent"] svg.atca-board', 1);
  await expectCount(page, article.route, 'section.atcs-wrap[aria-label="Conversational runtime and deferred delivery"] svg.atcs-board', 1);
  for (const token of [
    'Accepted', 'Registered', 'In progress', 'Retry', 'Completed', 'Delivered', 'Failed / exhausted',
    'Persistence and state', 'Delivery policy', 'Redis + Locks', 'Command Queue', 'Async Workers',
    'Completion Stream', 'DLQ / replay', 'Internal processing', 'Persistent state', 'Path A · visible turn',
    'Path B · async work', 'Deferred delivery',
  ]) if (!body.includes(token)) failures.push(`${article.route}: missing canonical visual evidence ${JSON.stringify(token)}`);
  for (let i = 0; i < roots.length - 1; i += 1) await expectBefore(page, article.route, roots[i], roots[i + 1]);
  return roots.length;
}

const voiceRpSelectors = ['.s5v-contract', '.s5v-window', '.s5v-clocks', '.s5v-gate', '.s5v-barge', '.s5v-batch', '.s5v-runtime'];
async function validateVoiceRp(page, article, viewportName) {
  const body = await page.locator('body').innerText();
  for (const token of [
    'Use a shared conversational blackboard',
    'The seam between reactive and proactive behaviour is the key contract',
    'Priority does not have to mean immediate interruption', 'Frequently asked questions',
  ]) if (body.includes(token)) failures.push(`${article.route}: English-only reauthoring remains ${JSON.stringify(token)}`);
  for (const token of [
    'Four clocks have to be coordinated', 'The first response accepts work',
    'The result goes through an ActivityGate', 'Barge-in: cancel the voice, not the whole system',
    'Several tools should produce one final completion', 'A single component controls the voice',
    'Technical completion creates a pending delivery. The conversation decides when it can be heard.',
  ]) if (!body.includes(token)) failures.push(`${article.route}: missing canonical teaching anchor ${JSON.stringify(token)}`);

  if (await page.locator('[data-demo^="tech-02-"]').count()) failures.push(`${article.route}: legacy simplified tech-02 visual remains`);
  await validateRoots(page, article.route, voiceRpSelectors, viewportName);
  await expectCount(page, article.route, '.s5v-contract [data-s5v-step]', 3);
  await expectCount(page, article.route, '.s5v-contract [data-s5v-copy]', 3);
  await expectCount(page, article.route, '.s5v-window [data-s5v-step]', 2);
  await expectCount(page, article.route, '.s5v-clocks .s5v-clocks__row', 4);
  await expectCount(page, article.route, '.s5v-gate [data-s5v-step]', 3);
  await expectCount(page, article.route, '.s5v-gate .s5v-gate__out', 3);
  await expectCount(page, article.route, '.s5v-barge [data-s5v-step]', 2);
  await expectCount(page, article.route, '.s5v-barge .s5v-barge__item', 3);
  await expectCount(page, article.route, '.s5v-batch .s5v-batch__tools span', 3);
  await expectCount(page, article.route, '.s5v-batch .s5v-batch__progress i', 3);
  await expectCount(page, article.route, '.s5v-runtime .s5v-runtime__lower > div', 2);
  for (const selector of ['.s5v-contract', '.s5v-window', '.s5v-gate', '.s5v-barge']) await clickLastStep(page, article.route, selector);
  for (let i = 0; i < voiceRpSelectors.length - 1; i += 1) await expectBefore(page, article.route, voiceRpSelectors[i], voiceRpSelectors[i + 1]);
  return voiceRpSelectors.length;
}

const voiceArchSelectors = [
  '.s5v-arch-map', '.s5v-cascade', '.s5v-prosody-loss', '.s5v-half', '.s5v-speech-plan',
  '.s5v-duplex', '.s5v-latency', '.s5v-decision', '.s5v-surface', '.s5v-voice-prompt',
];
async function validateVoiceArch(page, article, viewportName) {
  const body = await page.locator('body').innerText();
  for (const token of [
    'Frequently asked questions',
    'Full duplex is a runtime problem as well as a model feature',
    'Tool calling should remain a first-class observable event',
    'The cleanest comparison starts by separating the modality path from the business/runtime path',
    'ToolOperation',
  ]) if (body.includes(token)) failures.push(`${article.route}: English-only reauthoring remains ${JSON.stringify(token)}`);

  for (const token of [
    'To compare the options properly, I separate four axes:',
    'Latency is not only a sum', 'Too many components share state', 'Streaming needs a good chunker',
    'Measure more than the first audio', 'Hot take: S2S in front, heavy reasoning behind',
    'One harness for all three architectures',
    'A fast S2S surface for the conversation, a heavier cognitive plane for the work, and a persistent contract that keeps them synchronized.',
  ]) if (!body.includes(token)) failures.push(`${article.route}: missing canonical teaching anchor ${JSON.stringify(token)}`);

  const hooks = [
    'voice-arch-map.html', 'voice-arch-cascade.html', 'voice-arch-prosody-loss.html', 'voice-arch-half.html',
    'voice-arch-speech-plan.html', 'voice-arch-duplex.html', 'voice-arch-latency.html', 'voice-arch-decision.html',
    'voice-arch-surface.html', 'voice-arch-voice-prompt.html',
  ];
  await validateHookSource(article.route, 'locales/en/articulos-tecnicos/voice-agent-architectures.md', hooks);
  if (await page.locator('[data-demo^="tech-03-"]').count()) failures.push(`${article.route}: legacy simplified tech-03 visual remains`);
  await validateRoots(page, article.route, voiceArchSelectors, viewportName);

  await expectCount(page, article.route, '.s5v-arch-map [data-s5v-step]', 3);
  await expectCount(page, article.route, '.s5v-arch-map [data-panel]', 3);
  await expectCount(page, article.route, '.s5v-cascade [data-at]', 5);
  await expectCount(page, article.route, '.s5v-prosody-loss [data-s5v-step]', 2);
  await expectCount(page, article.route, '.s5v-prosody-loss .s5v-prosody-loss__features span', 4);
  await expectCount(page, article.route, '.s5v-half .s5v-half__pipe > span', 5);
  await expectCount(page, article.route, '.s5v-speech-plan input[data-s5v-var]', 3);
  await expectCount(page, article.route, '.s5v-duplex .s5v-duplex__timeline > div', 2);
  await expectCount(page, article.route, '.s5v-latency .s5v-latency__rows > div', 3);
  await expectCount(page, article.route, '.s5v-latency .s5v-latency__legend span', 5);
  await expectCount(page, article.route, '.s5v-decision [data-s5v-step]', 3);
  await expectCount(page, article.route, '.s5v-decision .s5v-decision__cards > div', 3);
  await expectCount(page, article.route, '.s5v-surface .s5v-surface__envelopes span', 2);
  await expectCount(page, article.route, '.s5v-surface .s5v-surface__bottom > div', 2);
  await expectCount(page, article.route, '.s5v-voice-prompt .s5v-voice-prompt__samples span', 3);

  for (const selector of ['.s5v-arch-map', '.s5v-prosody-loss', '.s5v-decision']) await clickLastStep(page, article.route, selector);
  const pace = page.locator('.s5v-speech-plan input[data-s5v-var="pace"]').first();
  if (await pace.count()) {
    await pace.evaluate((node) => {
      node.value = '100';
      node.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(40);
    const output = (await pace.locator('xpath=..').locator('output').innerText()).trim();
    if (output !== '1.00×') failures.push(`${article.route}: SpeechPlan pace interaction expected 1.00×, got ${JSON.stringify(output)}`);
  }

  for (let i = 0; i < voiceArchSelectors.length - 1; i += 1) await expectBefore(page, article.route, voiceArchSelectors[i], voiceArchSelectors[i + 1]);
  return voiceArchSelectors.length;
}

try {
  const hub = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const hubResponse = await hub.goto(`${base}/en/articulos-tecnicos/`, { waitUntil: 'networkidle' });
  if (!hubResponse?.ok()) failures.push(`/en/articulos-tecnicos/: HTTP ${hubResponse?.status() ?? 'no response'}`);
  const hubBody = await hub.locator('body').innerText();
  if (!hubBody.includes('Technical Articles')) failures.push('/en/articulos-tecnicos/: missing English hub title');
  for (const article of articles) {
    const hasRouteLink = await hub.locator('a').evaluateAll((nodes, route) => nodes.some((node) => {
      try { return new URL(node.href).pathname === route; } catch { return false; }
    }), article.route);
    if (!hasRouteLink && !hubBody.includes(article.title)) failures.push(`/en/articulos-tecnicos/: missing link/text for ${article.route}`);
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
      for (const concept of article.concepts) if (!body.toLowerCase().includes(concept.toLowerCase())) failures.push(`${article.route}: missing core concept ${concept}`);
      for (const token of ['Preguntas frecuentes', 'Fuentes base', 'Artículo técnico', 'Siguiente artículo']) if (body.includes(token)) failures.push(`${article.route}: Spanish leakage ${JSON.stringify(token)}`);

      let demoCount = 0;
      if (article.kind === 'async') demoCount = await validateAsync(page, article, viewport.name);
      else if (article.kind === 'voice-rp') demoCount = await validateVoiceRp(page, article, viewport.name);
      else demoCount = await validateVoiceArch(page, article, viewport.name);
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
      } else if (videoCount) failures.push(`${article.route}: unexpected inherited or undeclared video`);
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

if (totalVisuals !== 21) failures.push(`Technical Articles: expected 21 canonical English visuals, found ${totalVisuals}`);
if (failures.length) {
  for (const failure of [...new Set(failures)]) console.error(failure);
  process.exit(1);
}
console.log('Complete English Technical Articles QA passed: hub + 3 faithful articles, 21 canonical visuals, native media, interaction, and desktop/mobile rendering clean.');
