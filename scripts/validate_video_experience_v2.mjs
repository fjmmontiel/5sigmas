import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const baseUrl = (process.env.S5_PREVIEW_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const outputDir = process.env.S5_SCREENSHOT_DIR || 'artifacts/visual-review';
const changedFilesPath = process.env.S5_CHANGED_FILES_FILE || '';
const includePermanentCanaries = process.env.S5_FULL_VIDEO_CANARIES !== '0';

const permanentArticlePaths = [
  '/series/ia-pib-bienestar-energia/04-ia-pib-hoy/',
  '/series/ia-pib-bienestar-energia/02-ia-tecnologia-electrica/',
  '/series/ia-pib-bienestar-energia/03-pib-vs-bienestar/',
  '/series/multimodalidad-iag/02-alineamiento/',
  '/series/multimodalidad-iag/03-arquitecturas/',
  '/series/multimodalidad-iag/05-riesgos/',
  '/series/datacenters-espacio/02-energia-calor-conectividad/',
  '/series/datacenters-espacio/04-huella-real-datacenter/',
  '/series/modelos-razonadores/03-test-time-compute/',
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
  const targets = new Set(includePermanentCanaries ? permanentArticlePaths : [permanentArticlePaths.at(-1)]);
  if (changedFilesPath) {
    try {
      const changed = (await fs.readFile(changedFilesPath, 'utf8')).split(/\r?\n/).map((v) => v.trim()).filter(Boolean);
      for (const file of changed) {
        const article = articlePathFromMedia(file);
        if (article) targets.add(article);
      }
    } catch {
      // Permanent canaries still provide deterministic coverage.
    }
  }
  return [...targets];
}

async function settle(page) {
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
}

async function noOverflow(page, label) {
  const { client, scroll } = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  if (scroll > client + 2) throw new Error(`${label}: ${scroll - client}px horizontal overflow.`);
}

async function screenshot(page, name, fullPage = false) {
  await fs.mkdir(outputDir, { recursive: true });
  await page.screenshot({ path: `${outputDir}/${name}.png`, animations: 'disabled', fullPage });
}

async function validateHub(page, mobile) {
  const response = await page.goto(`${baseUrl}/videos/`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  if (!response?.ok()) throw new Error(`/videos/: ${response?.status() ?? 'no response'}`);
  await settle(page);
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
  const count = await images.count();
  for (let index = 0; index < Math.min(count, 12); index += 1) {
    const image = images.nth(index);
    await image.evaluate(async (node) => { if (node.decode) await node.decode(); });
    const dims = await image.evaluate((node) => ({ width: node.naturalWidth, height: node.naturalHeight }));
    if (dims.width <= 0 || dims.height <= 0) throw new Error(`Hub poster ${index + 1} did not decode.`);
  }

  const search = root.locator('[data-s5-video-search]');
  await search.fill('test time compute');
  const firstResult = root.locator('[data-s5-video-card]:visible .s5-video-card__poster').first();
  const resultPath = new URL(await firstResult.getAttribute('href'), baseUrl).pathname;
  if (resultPath !== '/videos/series/modelos-razonadores/03-test-time-compute/') {
    throw new Error(`Exact video search did not rank first: ${resultPath}.`);
  }
  await search.fill('');

  const cardBoxes = await cards.evaluateAll((nodes) => nodes.slice(0, 2).map((node) => {
    const r = node.getBoundingClientRect();
    return { x: r.x, width: r.width };
  }));
  if (mobile && cardBoxes.length > 1 && Math.abs(cardBoxes[0].x - cardBoxes[1].x) > 4) throw new Error('Mobile video hub is not single-column.');
  if (!mobile && cardBoxes[0]?.width < 300) throw new Error(`Desktop video cards too narrow: ${cardBoxes[0]?.width}px.`);
  await noOverflow(page, mobile ? 'Mobile video hub' : 'Desktop video hub');
  await screenshot(page, mobile ? 'video-library-mobile-v2' : 'video-library-desktop-v2');
}

async function validateWatch(page, articlePath, mobile) {
  const path = watchPath(articlePath);
  const response = await page.goto(`${baseUrl}${path}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  if (!response?.ok()) throw new Error(`${path}: ${response?.status() ?? 'no response'}`);
  await settle(page);
  const root = page.locator('[data-s5-video-watch]');
  const player = root.locator('[data-s5-watch-player]');
  await root.waitFor({ state: 'visible' });
  await player.waitFor({ state: 'visible' });
  const box = await player.boundingBox();
  const viewport = page.viewportSize();
  if (!box || !viewport) throw new Error(`${path}: watch player is not measurable.`);
  if (!mobile && box.width < 900) throw new Error(`${path}: desktop watch player too narrow: ${box.width}px.`);
  if (mobile && box.width < viewport.width - 36) throw new Error(`${path}: mobile watch player too narrow: ${box.width}px.`);
  if (await root.locator('.s5-video-watch__snippet-grid > article').count() === 0) throw new Error(`${path}: no summary snippets.`);
  if (await root.locator('.s5-video-watch__related-grid > article').count() !== 3) throw new Error(`${path}: expected exactly three related videos.`);

  const sourceCta = root.locator('.s5-video-watch__source > a');
  const cta = await sourceCta.evaluate((node) => {
    const style = getComputedStyle(node);
    const r = node.getBoundingClientRect();
    return { display: style.display, width: r.width, height: r.height };
  });
  if (cta.display === 'none' || cta.width < 96 || cta.height < 36) throw new Error(`${path}: source CTA collapsed: ${JSON.stringify(cta)}.`);
  const sourcePath = new URL(await sourceCta.getAttribute('href'), baseUrl).pathname;
  if (sourcePath !== articlePath) throw new Error(`${path}: CTA points to ${sourcePath}, expected ${articlePath}.`);

  const source = await player.locator('source').getAttribute('src');
  if (source) {
    const mediaUrl = new URL(source, page.url()).href;
    const range = await page.request.get(mediaUrl, { headers: { Range: 'bytes=0-1023', Origin: 'https://5sigmas.com' } });
    if (![200, 206].includes(range.status())) throw new Error(`${path}: watch video cannot be ranged: ${range.status()} ${mediaUrl}.`);
  }
  await noOverflow(page, `${mobile ? 'Mobile' : 'Desktop'} watch ${path}`);
}

async function validateArticle(page, articlePath, mobile) {
  const response = await page.goto(`${baseUrl}${articlePath}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  if (!response?.ok()) throw new Error(`${articlePath}: ${response?.status() ?? 'no response'}`);
  await settle(page);
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
  const mediaUrl = new URL(source, page.url()).href;
  const range = await page.request.get(mediaUrl, { headers: { Range: 'bytes=0-1023', Origin: 'https://5sigmas.com' } });
  if (![200, 206].includes(range.status())) throw new Error(`${articlePath}: video cannot be ranged: ${range.status()} ${mediaUrl}.`);

  const suffix = `${safe(articlePath)}__${mobile ? 'mobile' : 'desktop'}`;
  await screenshot(page, `video-lifecycle__${suffix}__poster`);
  const beforeWidth = posterBox.width;
  await poster.click();
  await player.waitFor({ state: 'visible' });
  await page.waitForFunction(() => {
    const video = document.querySelector('[data-s5-inline-video-player]');
    return Boolean(video && (!video.paused || video.currentTime > 0));
  }, { timeout: 10_000 });
  const playerBox = await player.boundingBox();
  if (!playerBox) throw new Error(`${articlePath}: inline player is not measurable after Play.`);
  if (Math.abs(playerBox.width - beforeWidth) > 4) throw new Error(`${articlePath}: player changed width after Play: ${beforeWidth}px → ${playerBox.width}px.`);
  await screenshot(page, `video-lifecycle__${suffix}__playing`);

  const linkedWatch = new URL(await page.locator('.s5-video-embed__watch a').getAttribute('href'), baseUrl).pathname;
  if (linkedWatch !== watchPath(articlePath)) throw new Error(`${articlePath}: watch link points to ${linkedWatch}.`);
  if (mobile && await page.locator('.s5-reader-topbar').count() !== 1) throw new Error(`${articlePath}: mobile article lost its sticky lesson navigator.`);
  await noOverflow(page, `${mobile ? 'Mobile' : 'Desktop'} article ${articlePath}`);
}

const targets = await readTargets();
const browser = await chromium.launch({ headless: true });
const report = { baseUrl, targets, desktop: [], mobile: [] };
try {
  for (const config of [
    { name: 'desktop', viewport: { width: 1440, height: 1000 }, mobile: false },
    { name: 'mobile', viewport: { width: 390, height: 844 }, mobile: true },
  ]) {
    const page = await browser.newPage({ viewport: config.viewport, isMobile: config.mobile, reducedMotion: 'reduce' });
    await validateHub(page, config.mobile);
    for (const articlePath of targets) {
      await validateArticle(page, articlePath, config.mobile);
      await validateWatch(page, articlePath, config.mobile);
      report[config.name].push(articlePath);
    }
    await page.close();
  }
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(`${outputDir}/video-experience-v2.json`, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Video experience v2 passed: ${targets.length} article/watch lifecycles on desktop + mobile, including ${permanentArticlePaths.length - 1} permanent P0 videos.`);
} finally {
  await browser.close();
}
