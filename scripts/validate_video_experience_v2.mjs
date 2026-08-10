import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const baseUrl = (process.env.S5_PREVIEW_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const outputDir = process.env.S5_SCREENSHOT_DIR || 'artifacts/visual-review';
const changedFilesPath = process.env.S5_CHANGED_FILES_FILE || '';
const includePermanentCanaries = process.env.S5_FULL_VIDEO_CANARIES !== '0';
const localPreview = /^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/i.test(baseUrl);
const canonicalPlaybackCanary = '/series/modelos-razonadores/03-test-time-compute/';

const permanentArticlePaths = [
  '/series/ia-pib-bienestar-energia/04-ia-pib-hoy/',
  '/series/ia-pib-bienestar-energia/02-ia-tecnologia-electrica/',
  '/series/ia-pib-bienestar-energia/03-pib-vs-bienestar/',
  '/series/multimodalidad-iag/02-alineamiento/',
  '/series/multimodalidad-iag/03-arquitecturas/',
  '/series/multimodalidad-iag/05-riesgos/',
  '/series/datacenters-espacio/02-energia-calor-conectividad/',
  '/series/datacenters-espacio/04-huella-real-datacenter/',
  canonicalPlaybackCanary,
];

function articlePathFromMedia(file) {
  const match = file.match(/^docs\/(series|articulos-tecnicos)\/(.+)\.(?:mp4|jpg|jpeg|png|webp)$/i);
  return match ? `/${match[1]}/${match[2]}/` : null;
}

function watchPath(articlePath) {
  return `/videos${articlePath}`;
}

function safe(value) {
  return value.replace(/^\//, '').replace(/\/$/, '').replace(/[^a-zA-Z0-9_-]+/g, '__') || 'home';
}

async function readTargets() {
  const targets = new Set(includePermanentCanaries ? permanentArticlePaths : [canonicalPlaybackCanary]);
  const changedTargets = new Set();
  if (changedFilesPath) {
    try {
      const changed = (await fs.readFile(changedFilesPath, 'utf8')).split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
      for (const file of changed) {
        const article = articlePathFromMedia(file);
        if (article) {
          targets.add(article);
          changedTargets.add(article);
        }
      }
    } catch {
      // Permanent canaries remain deterministic when no changed-file list exists.
    }
  }
  return { targets: [...targets], changedTargets };
}

async function settle(page) {
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  await page.waitForTimeout(60);
}

async function goto(page, pathname) {
  const response = await page.goto(`${baseUrl}${pathname}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  if (!response?.ok()) throw new Error(`${pathname}: ${response?.status() ?? 'no response'}`);
  await settle(page);
}

async function noOverflow(page, label) {
  const { client, scroll } = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  if (scroll > client + 2) throw new Error(`${label}: ${scroll - client}px horizontal overflow.`);
}

async function screenshot(page, name) {
  await fs.mkdir(outputDir, { recursive: true });
  await page.screenshot({ path: `${outputDir}/${name}.png`, animations: 'disabled' });
}

async function validateMediaTransport(page, mediaUrl, label) {
  if (localPreview) {
    const head = await page.request.head(mediaUrl);
    if (!head.ok()) throw new Error(`${label}: local media HEAD failed: ${head.status()} ${mediaUrl}.`);
    return { status: head.status(), mode: 'local-head' };
  }

  const range = await page.request.get(mediaUrl, {
    headers: {
      Range: 'bytes=0-1023',
      Origin: 'https://5sigmas.com',
      'Cache-Control': 'no-cache',
    },
  });
  if (range.status() !== 206) {
    throw new Error(`${label}: production media must honor byte ranges with 206, got ${range.status()} ${mediaUrl}.`);
  }
  const contentRange = range.headers()['content-range'] || '';
  if (!/^bytes\s+0-\d+\/\d+$/i.test(contentRange)) {
    throw new Error(`${label}: invalid Content-Range ${JSON.stringify(contentRange)} for ${mediaUrl}.`);
  }
  return { status: 206, mode: 'production-range', contentRange };
}

async function validateHub(page, mobile) {
  await goto(page, '/videos/');
  const root = page.locator('[data-s5-video-library]');
  await root.waitFor({ state: 'visible' });
  const catalog = await page.evaluate(async () => {
    const response = await fetch('/videos/catalog.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`catalog.json ${response.status}`);
    return response.json();
  });
  const cards = root.locator('[data-s5-video-card]');
  if (await cards.count() !== catalog.count) throw new Error(`Hub cards=${await cards.count()} catalog=${catalog.count}.`);
  if (catalog.count < 40) throw new Error(`Unexpectedly small video catalog: ${catalog.count}.`);

  const images = root.locator('img');
  const imageCount = await images.count();
  for (let index = 0; index < Math.min(imageCount, 12); index += 1) {
    const image = images.nth(index);
    await image.evaluate(async (node) => { if (node.decode) await node.decode(); });
    const dims = await image.evaluate((node) => ({ width: node.naturalWidth, height: node.naturalHeight }));
    if (dims.width <= 0 || dims.height <= 0) throw new Error(`Hub poster ${index + 1} did not decode.`);
  }

  const search = root.locator('[data-s5-video-search]');
  await search.fill('test time compute');
  const firstResult = root.locator('[data-s5-video-card]:visible .s5-video-card__poster').first();
  const resultPath = new URL(await firstResult.getAttribute('href'), baseUrl).pathname;
  if (resultPath !== `/videos${canonicalPlaybackCanary}`) {
    throw new Error(`Exact video search did not rank first: ${resultPath}.`);
  }
  await search.fill('');

  const cardBoxes = await cards.evaluateAll((nodes) => nodes.slice(0, 2).map((node) => {
    const rect = node.getBoundingClientRect();
    return { x: rect.x, width: rect.width };
  }));
  if (mobile && cardBoxes.length > 1 && Math.abs(cardBoxes[0].x - cardBoxes[1].x) > 4) {
    throw new Error('Mobile video hub is not single-column.');
  }
  if (!mobile && cardBoxes[0]?.width < 300) throw new Error(`Desktop video cards too narrow: ${cardBoxes[0]?.width}px.`);
  await noOverflow(page, mobile ? 'Mobile video hub' : 'Desktop video hub');
  await screenshot(page, mobile ? 'video-library-mobile-v2' : 'video-library-desktop-v2');
}

async function validateWatch(page, articlePath, mobile) {
  const pathname = watchPath(articlePath);
  await goto(page, pathname);
  const root = page.locator('[data-s5-video-watch]');
  const player = root.locator('[data-s5-watch-player]');
  await root.waitFor({ state: 'visible' });
  await player.waitFor({ state: 'visible' });
  const box = await player.boundingBox();
  const viewport = page.viewportSize();
  if (!box || !viewport) throw new Error(`${pathname}: watch player is not measurable.`);
  if (!mobile && box.width < 900) throw new Error(`${pathname}: desktop watch player too narrow: ${box.width}px.`);
  if (mobile && box.width < viewport.width - 36) throw new Error(`${pathname}: mobile watch player too narrow: ${box.width}px.`);
  if (await root.locator('.s5-video-watch__snippet-grid > article').count() === 0) throw new Error(`${pathname}: no summary snippets.`);
  if (await root.locator('.s5-video-watch__related-grid > article').count() !== 3) throw new Error(`${pathname}: expected exactly three related videos.`);

  const sourceCta = root.locator('.s5-video-watch__source > a');
  const cta = await sourceCta.evaluate((node) => {
    const style = getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    return { display: style.display, width: rect.width, height: rect.height };
  });
  if (cta.display === 'none' || cta.width < 96 || cta.height < 36) throw new Error(`${pathname}: source CTA collapsed: ${JSON.stringify(cta)}.`);
  const sourcePath = new URL(await sourceCta.getAttribute('href'), baseUrl).pathname;
  if (sourcePath !== articlePath) throw new Error(`${pathname}: CTA points to ${sourcePath}, expected ${articlePath}.`);

  const source = await player.locator('source').getAttribute('src');
  if (!source) throw new Error(`${pathname}: watch player has no source.`);
  await validateMediaTransport(page, new URL(source, page.url()).href, pathname);
  await noOverflow(page, `${mobile ? 'Mobile' : 'Desktop'} watch ${pathname}`);
}

async function validateArticle(page, articlePath, mobile, requirePlayback) {
  await goto(page, articlePath);
  const player = page.locator('[data-s5-inline-video-player]');
  const poster = page.locator('[data-s5-inline-video-start]');
  const h1 = page.locator('.md-content__inner h1');
  await poster.waitFor({ state: 'visible' });
  await player.waitFor({ state: 'attached' });

  if (await player.isVisible()) throw new Error(`${articlePath}: player must remain hidden behind the poster before Play.`);
  const h1Box = await h1.boundingBox();
  const posterBox = await poster.boundingBox();
  const viewport = page.viewportSize();
  if (!h1Box || !posterBox || !viewport) throw new Error(`${articlePath}: unable to measure inline poster.`);
  if (posterBox.y <= h1Box.y + h1Box.height) throw new Error(`${articlePath}: inline poster is not placed after the article title.`);
  if (!mobile && posterBox.width < 900) throw new Error(`${articlePath}: desktop inline poster too narrow: ${posterBox.width}px.`);
  if (mobile && posterBox.width < viewport.width * 0.88) throw new Error(`${articlePath}: mobile inline poster too narrow: ${posterBox.width}px.`);

  const image = poster.locator('img').first();
  if (await image.count()) {
    await image.evaluate(async (node) => { if (node.decode) await node.decode(); });
    const dims = await image.evaluate((node) => ({ width: node.naturalWidth, height: node.naturalHeight }));
    if (dims.width <= 0 || dims.height <= 0) throw new Error(`${articlePath}: poster image failed to decode.`);
  }

  const source = await player.locator('source').getAttribute('src');
  if (!source) throw new Error(`${articlePath}: inline player has no source.`);
  await validateMediaTransport(page, new URL(source, page.url()).href, articlePath);

  const suffix = `${safe(articlePath)}__${mobile ? 'mobile' : 'desktop'}`;
  await screenshot(page, `video-lifecycle__${suffix}__poster`);

  if (requirePlayback) {
    const beforeWidth = posterBox.width;
    await poster.click();
    await player.waitFor({ state: 'visible' });
    await page.waitForFunction(() => {
      const video = document.querySelector('[data-s5-inline-video-player]');
      return Boolean(video && (!video.paused || video.currentTime > 0));
    }, { timeout: 10_000 });
    const playerBox = await player.boundingBox();
    if (!playerBox) throw new Error(`${articlePath}: inline player is not measurable after Play.`);
    if (Math.abs(playerBox.width - beforeWidth) > 4) {
      throw new Error(`${articlePath}: player changed width after Play: ${beforeWidth}px → ${playerBox.width}px.`);
    }
    await screenshot(page, `video-lifecycle__${suffix}__playing`);
  }

  const linkedWatch = new URL(await page.locator('.s5-video-embed__watch a').getAttribute('href'), baseUrl).pathname;
  if (linkedWatch !== watchPath(articlePath)) throw new Error(`${articlePath}: watch link points to ${linkedWatch}.`);
  if (mobile && await page.locator('.s5-reader-topbar').count() !== 1) throw new Error(`${articlePath}: mobile article lost its sticky lesson navigator.`);
  await noOverflow(page, `${mobile ? 'Mobile' : 'Desktop'} article ${articlePath}`);
}

const { targets, changedTargets } = await readTargets();
const browser = await chromium.launch({ headless: true });
const report = { baseUrl, localPreview, targets, changedTargets: [...changedTargets], desktop: [], mobile: [], playback: [] };
try {
  for (const config of [
    { name: 'desktop', viewport: { width: 1440, height: 1000 }, mobile: false },
    { name: 'mobile', viewport: { width: 390, height: 844 }, mobile: true },
  ]) {
    const page = await browser.newPage({ viewport: config.viewport, isMobile: config.mobile, reducedMotion: 'reduce' });
    await validateHub(page, config.mobile);
    for (const articlePath of targets) {
      const requirePlayback = !localPreview || articlePath === canonicalPlaybackCanary || changedTargets.has(articlePath);
      await validateArticle(page, articlePath, config.mobile, requirePlayback);
      await validateWatch(page, articlePath, config.mobile);
      report[config.name].push(articlePath);
      if (requirePlayback) report.playback.push({ articlePath, viewport: config.name });
    }
    await page.close();
  }
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(`${outputDir}/video-experience-v2.json`, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Video experience v2 passed: ${targets.length} article/watch routes on desktop + mobile; playback proofs=${report.playback.length}; transport=${localPreview ? 'local HEAD + canary/changed playback' : 'strict 206 + exhaustive playback'}.`);
} finally {
  await browser.close();
}
