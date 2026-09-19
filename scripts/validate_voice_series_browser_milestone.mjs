import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.S5_PREVIEW_URL || 'http://127.0.0.1:8000';
const outputDir = path.resolve('artifacts/voice-browser-milestone');

const chapters = [
  '01-arquitecturas-de-voz',
  '02-turn-taking',
  '03-presupuesto-latencia',
  '04-tools-estado-acciones-asincronas',
  '05-webrtc-sip-telefonia-red',
  '06-evaluacion-observabilidad-reliability',
];

const modes = [
  { name: 'desktop-normal', viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference', mobile: false },
  { name: 'mobile-normal', viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference', mobile: true },
  { name: 'desktop-reduced', viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', mobile: false },
  { name: 'mobile-reduced', viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', mobile: true },
];

function routes(locale, stem) {
  const prefix = locale === 'en' ? '/en' : '';
  return {
    article: `${prefix}/series/agentes-voz-tiempo-real/${stem}/`,
    watch: `${prefix}/videos/series/agentes-voz-tiempo-real/${stem}/`,
  };
}

function pathOf(href, pageUrl) {
  return new URL(href, pageUrl).pathname;
}

async function assertNoHorizontalOverflow(page, label) {
  const metrics = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    html: document.documentElement.scrollWidth,
    body: document.body?.scrollWidth || 0,
    scrollX: window.scrollX,
  }));
  const overflow = Math.max(metrics.html, metrics.body) - metrics.viewport;
  if (overflow > 2 || metrics.scrollX !== 0) {
    throw new Error(`${label}: horizontal overflow ${overflow}px ${JSON.stringify(metrics)}`);
  }
}

async function assertOneUsefulH1(page, label) {
  const values = await page.locator('h1').evaluateAll((nodes) => nodes
    .filter((node) => {
      const r = node.getBoundingClientRect();
      const s = getComputedStyle(node);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    })
    .map((node) => (node.textContent || '').replace(/\s+/g, ' ').trim()));
  if (values.length !== 1 || values[0].length < 8) {
    throw new Error(`${label}: expected one useful visible H1, got ${JSON.stringify(values)}`);
  }
}

function attachRuntimeEvidence(page) {
  const evidence = {
    responses: new Map(),
    failures: [],
    consoleErrors: [],
    pageErrors: [],
  };
  page.on('response', (response) => {
    const status = response.status();
    if (status >= 200 && status < 400) evidence.responses.set(response.url(), status);
  });
  page.on('requestfailed', (request) => {
    evidence.failures.push({ url: request.url(), failure: request.failure()?.errorText || 'unknown' });
  });
  page.on('console', (message) => {
    if (message.type() === 'error') evidence.consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => evidence.pageErrors.push(String(error)));
  return evidence;
}

function isMediaUrl(url) {
  return /\.(?:mp4|webm|ogg)(?:$|\?)/i.test(url);
}

function assertRuntimeEvidence(evidence, label) {
  const fatalFailures = evidence.failures.filter(({ url, failure }) => {
    if (failure.includes('ERR_ABORTED') && isMediaUrl(url) && evidence.responses.has(url)) return false;
    return true;
  });
  if (fatalFailures.length) throw new Error(`${label}: request failures ${JSON.stringify(fatalFailures.slice(0, 8))}`);
  if (evidence.pageErrors.length) throw new Error(`${label}: page errors ${JSON.stringify(evidence.pageErrors.slice(0, 8))}`);
  if (evidence.consoleErrors.length) throw new Error(`${label}: console errors ${JSON.stringify(evidence.consoleErrors.slice(0, 8))}`);
}

async function assertLang(page, locale, label) {
  const lang = (await page.locator('html').getAttribute('lang') || '').toLowerCase();
  if (!lang.startsWith(locale)) throw new Error(`${label}: html lang=${lang}, expected ${locale}`);
}

async function validateArticle(page, locale, stem, mode, evidence) {
  const { article, watch } = routes(locale, stem);
  const label = `${locale}/${stem}/${mode.name}/article`;
  await page.goto(`${baseUrl}${article}`, { waitUntil: 'networkidle' });
  await assertLang(page, locale, label);
  await assertOneUsefulH1(page, label);
  await assertNoHorizontalOverflow(page, label);

  const poster = page.locator('[data-s5-inline-video-start]');
  const video = page.locator('[data-s5-inline-video-player]');
  await poster.waitFor({ state: 'visible' });
  await video.waitFor({ state: 'attached' });
  if (await video.isVisible()) throw new Error(`${label}: player visible before explicit start`);

  const posterBox = await poster.boundingBox();
  if (!posterBox || posterBox.width < (mode.mobile ? 330 : 700)) {
    throw new Error(`${label}: poster too small ${JSON.stringify(posterBox)}`);
  }

  await poster.focus();
  if (!await poster.evaluate((node) => document.activeElement === node)) {
    throw new Error(`${label}: poster control cannot receive focus`);
  }

  const source = await video.locator('source').getAttribute('src');
  if (!source) throw new Error(`${label}: video source missing`);
  const mediaUrl = new URL(source, page.url()).href;
  const range = await page.request.get(mediaUrl, { headers: { Range: 'bytes=0-2047' } });
  if (![200, 206].includes(range.status())) throw new Error(`${label}: range request ${range.status()} ${mediaUrl}`);

  const watchHref = await page.locator('.s5-video-embed__watch a').getAttribute('href');
  if (!watchHref || pathOf(watchHref, page.url()) !== watch) {
    throw new Error(`${label}: article→watch mismatch ${watchHref} expected ${watch}`);
  }

  if (mode.mobile) await poster.tap();
  else await page.keyboard.press('Enter');
  await video.waitFor({ state: 'visible' });
  await page.waitForFunction(() => {
    const node = document.querySelector('[data-s5-inline-video-player]');
    return Boolean(node && (!node.paused || node.currentTime > 0));
  }, null, { timeout: 10000 });

  const playback = await video.evaluate(async (node) => {
    if (!Number.isFinite(node.duration) || node.duration <= 0) {
      await new Promise((resolve) => node.addEventListener('loadedmetadata', resolve, { once: true }));
    }
    const duration = node.duration;
    node.currentTime = Math.min(duration * 0.5, Math.max(1, duration - 1));
    await new Promise((resolve) => node.addEventListener('seeked', resolve, { once: true }));
    const middle = node.currentTime;
    node.currentTime = Math.max(0, duration - 0.35);
    await new Promise((resolve) => node.addEventListener('seeked', resolve, { once: true }));
    return { duration, middle, final: node.currentTime, paused: node.paused, readyState: node.readyState };
  });
  if (!(playback.duration >= 35 && playback.duration <= 37) || playback.middle <= 0 || playback.final <= playback.middle || playback.readyState < 2) {
    throw new Error(`${label}: invalid start/intermediate/final playback evidence ${JSON.stringify(playback)}`);
  }

  await assertNoHorizontalOverflow(page, `${label}/playing`);
  await page.screenshot({
    path: path.join(outputDir, `${locale}-${stem}-${mode.name}.jpg`),
    fullPage: true,
    type: 'jpeg',
    quality: 72,
    animations: 'disabled',
  });
  assertRuntimeEvidence(evidence, label);
  return { article, watch, playback, mediaStatus: range.status(), screenshot: `${locale}-${stem}-${mode.name}.jpg` };
}

async function validateWatch(page, locale, stem, mode, evidence) {
  const { article, watch } = routes(locale, stem);
  const label = `${locale}/${stem}/${mode.name}/watch`;
  await page.goto(`${baseUrl}${watch}`, { waitUntil: 'networkidle' });
  await assertLang(page, locale, label);
  await assertOneUsefulH1(page, label);
  await assertNoHorizontalOverflow(page, label);

  const root = page.locator('[data-s5-video-watch]');
  const video = root.locator('[data-s5-watch-player]');
  await root.waitFor({ state: 'visible' });
  await video.waitFor({ state: 'visible' });

  const sourceHref = await root.locator('.s5-video-watch__source > a').getAttribute('href');
  if (!sourceHref || pathOf(sourceHref, page.url()) !== article) {
    throw new Error(`${label}: watch→article mismatch ${sourceHref} expected ${article}`);
  }

  const source = await video.locator('source').getAttribute('src');
  if (!source) throw new Error(`${label}: watch video source missing`);
  const mediaUrl = new URL(source, page.url()).href;
  const range = await page.request.get(mediaUrl, { headers: { Range: 'bytes=0-2047' } });
  if (![200, 206].includes(range.status())) throw new Error(`${label}: range request ${range.status()} ${mediaUrl}`);

  const playback = await video.evaluate(async (node) => {
    try { await node.play(); } catch (_) {}
    const started = !node.paused || node.currentTime > 0;
    if (!Number.isFinite(node.duration) || node.duration <= 0) {
      await new Promise((resolve) => node.addEventListener('loadedmetadata', resolve, { once: true }));
    }
    const duration = node.duration;
    node.currentTime = Math.min(duration * 0.5, Math.max(1, duration - 1));
    await new Promise((resolve) => node.addEventListener('seeked', resolve, { once: true }));
    const middle = node.currentTime;
    node.currentTime = Math.max(0, duration - 0.35);
    await new Promise((resolve) => node.addEventListener('seeked', resolve, { once: true }));
    return { started, duration, middle, final: node.currentTime, readyState: node.readyState };
  });
  if (!playback.started || !(playback.duration >= 35 && playback.duration <= 37) || playback.middle <= 0 || playback.final <= playback.middle || playback.readyState < 2) {
    throw new Error(`${label}: invalid watch lifecycle evidence ${JSON.stringify(playback)}`);
  }

  assertRuntimeEvidence(evidence, label);
  return { watch, article, playback, mediaStatus: range.status() };
}

await fs.rm(outputDir, { recursive: true, force: true });
await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const receipt = {
  generatedAt: new Date().toISOString(),
  series: 'agentes-voz-tiempo-real',
  ownerVoiceAmendment: 5716685049,
  ownerIndexabilityAmendment: 5727362172,
  pages: [],
};

try {
  for (const mode of modes) {
    const context = await browser.newContext({
      viewport: mode.viewport,
      isMobile: mode.mobile,
      hasTouch: mode.mobile,
      reducedMotion: mode.reducedMotion,
    });
    for (const locale of ['es', 'en']) {
      for (const stem of chapters) {
        const articlePage = await context.newPage();
        const articleEvidence = attachRuntimeEvidence(articlePage);
        const article = await validateArticle(articlePage, locale, stem, mode, articleEvidence);
        await articlePage.close();

        const watchPage = await context.newPage();
        const watchEvidence = attachRuntimeEvidence(watchPage);
        const watch = await validateWatch(watchPage, locale, stem, mode, watchEvidence);
        await watchPage.close();

        receipt.pages.push({ locale, stem, mode: mode.name, article, watch });
      }
    }
    await context.close();
  }
  receipt.articleContexts = 48;
  receipt.watchContexts = 48;
  receipt.fullPageScreenshots = 48;
  receipt.result = 'PASS';
  await fs.writeFile(path.join(outputDir, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({ result: receipt.result, articleContexts: 48, watchContexts: 48, fullPageScreenshots: 48 }));
} finally {
  await browser.close();
}
