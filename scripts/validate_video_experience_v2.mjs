import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const baseUrl = process.env.S5_PREVIEW_URL || 'http://127.0.0.1:8000';
const outputDir = 'artifacts/visual-review';
const watchPath = '/videos/series/modelos-razonadores/03-test-time-compute/';
const articlePath = '/series/modelos-razonadores/03-test-time-compute/';

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

async function validateHub(page, mobile) {
  await page.goto(`${baseUrl}/videos/`, { waitUntil: 'networkidle' });
  const root = page.locator('[data-s5-video-library]');
  await root.waitFor({ state: 'visible' });
  const catalog = await page.evaluate(async () => {
    const response = await fetch('/videos/catalog.json');
    if (!response.ok) throw new Error(`catalog.json ${response.status}`);
    return response.json();
  });
  const cards = root.locator('[data-s5-video-card]');
  if (await cards.count() !== catalog.count) {
    throw new Error(`Hub cards=${await cards.count()} catalog=${catalog.count}.`);
  }
  if (catalog.count < 40) throw new Error(`Unexpectedly small video catalog: ${catalog.count}.`);

  const sources = await root.locator('img').evaluateAll((nodes) => nodes.map((node) => node.currentSrc || node.src));
  for (const src of sources) {
    const response = await page.request.get(src);
    if (!response.ok()) throw new Error(`Poster unavailable: ${response.status()} ${src}`);
  }
  const firstPoster = root.locator('img:visible').first();
  await firstPoster.evaluate((node) => node.decode?.());
  const dims = await firstPoster.evaluate((node) => ({ width: node.naturalWidth, height: node.naturalHeight }));
  if (dims.width <= 0 || dims.height <= 0) throw new Error(`First visible poster did not decode: ${JSON.stringify(dims)}.`);

  const search = root.locator('[data-s5-video-search]');
  await search.fill('test time compute');
  const firstResult = root.locator('[data-s5-video-card]:visible .s5-video-card__poster').first();
  const resultPath = new URL(await firstResult.getAttribute('href'), baseUrl).pathname;
  if (resultPath !== watchPath) throw new Error(`Exact video search did not rank first: ${resultPath}.`);
  await search.fill('');

  const cardBoxes = await cards.evaluateAll((nodes) => nodes.slice(0, 2).map((node) => {
    const r = node.getBoundingClientRect();
    return { x: r.x, width: r.width };
  }));
  if (mobile && Math.abs(cardBoxes[0].x - cardBoxes[1].x) > 4) throw new Error('Mobile video hub is not single-column.');
  if (!mobile && cardBoxes[0].width < 300) throw new Error(`Desktop video cards too narrow: ${cardBoxes[0].width}px.`);
  await noOverflow(page, mobile ? 'Mobile video hub' : 'Desktop video hub');
  await screenshot(page, mobile ? 'video-library-mobile-v2' : 'video-library-desktop-v2');
}

async function validateWatch(page, mobile) {
  await page.goto(`${baseUrl}${watchPath}`, { waitUntil: 'networkidle' });
  const root = page.locator('[data-s5-video-watch]');
  const player = root.locator('[data-s5-watch-player]');
  await root.waitFor({ state: 'visible' });
  await player.waitFor({ state: 'visible' });
  const box = await player.boundingBox();
  const viewport = page.viewportSize();
  if (!box || !viewport) throw new Error('Watch player is not measurable.');
  if (!mobile && box.width < 900) throw new Error(`Desktop watch player too narrow: ${box.width}px.`);
  if (mobile && box.width < viewport.width - 36) throw new Error(`Mobile watch player too narrow: ${box.width}px.`);
  if (await root.locator('.s5-video-watch__snippet-grid > article').count() === 0) throw new Error('Watch page has no summary snippets.');
  if (await root.locator('.s5-video-watch__related-grid > article').count() !== 3) throw new Error('Watch page must expose three related videos.');

  const sourceCta = root.locator('.s5-video-watch__source > a');
  const cta = await sourceCta.evaluate((node) => {
    const style = getComputedStyle(node);
    const r = node.getBoundingClientRect();
    return { display: style.display, width: r.width, height: r.height, color: style.color, background: style.backgroundColor };
  });
  if (cta.display === 'none' || cta.width < 96 || cta.height < 36) throw new Error(`Source CTA collapsed: ${JSON.stringify(cta)}.`);
  const sourcePath = new URL(await sourceCta.getAttribute('href'), baseUrl).pathname;
  if (sourcePath !== articlePath) throw new Error(`Watch CTA points to ${sourcePath}.`);

  await noOverflow(page, mobile ? 'Mobile watch page' : 'Desktop watch page');
  await screenshot(page, mobile ? 'video-watch-mobile-v2' : 'video-watch-desktop-v2');
}

async function validateArticle(page, mobile) {
  await page.goto(`${baseUrl}${articlePath}`, { waitUntil: 'networkidle' });
  const player = page.locator('[data-s5-inline-video-player]');
  const poster = page.locator('[data-s5-inline-video-start]');
  const h1 = page.locator('.md-content__inner h1');
  await poster.waitFor({ state: 'visible' });
  await player.waitFor({ state: 'attached' });

  if (await player.isVisible()) throw new Error('Inline player should remain hidden behind the poster before Play.');
  const h1Box = await h1.boundingBox();
  const posterBox = await poster.boundingBox();
  const viewport = page.viewportSize();
  if (!h1Box || !posterBox || !viewport) throw new Error('Unable to measure inline poster.');
  if (posterBox.y <= h1Box.y + h1Box.height) throw new Error('Inline poster is not placed after the article title.');
  if (!mobile && posterBox.width < 900) throw new Error(`Desktop inline poster too narrow: ${posterBox.width}px.`);
  if (mobile && posterBox.width < viewport.width * 0.88) throw new Error(`Mobile inline poster too narrow: ${posterBox.width}px.`);

  const source = await player.locator('source').getAttribute('src');
  const mediaUrl = new URL(source, page.url()).href;
  const range = await page.request.get(mediaUrl, { headers: { Range: 'bytes=0-1023' } });
  if (![200, 206].includes(range.status())) throw new Error(`Inline video cannot be ranged: ${range.status()} ${mediaUrl}.`);

  const beforeWidth = posterBox.width;
  await poster.click();
  await player.waitFor({ state: 'visible' });
  await page.waitForFunction(() => {
    const video = document.querySelector('[data-s5-inline-video-player]');
    return Boolean(video && (!video.paused || video.currentTime > 0));
  }, { timeout: 10_000 });
  const playerBox = await player.boundingBox();
  if (!playerBox) throw new Error('Inline player is not measurable after Play.');
  if (Math.abs(playerBox.width - beforeWidth) > 4) {
    throw new Error(`Inline player changed width after Play: ${beforeWidth}px → ${playerBox.width}px.`);
  }

  const linkedWatch = new URL(await page.locator('.s5-video-embed__watch a').getAttribute('href'), baseUrl).pathname;
  if (linkedWatch !== watchPath) throw new Error(`Article watch link points to ${linkedWatch}.`);
  if (mobile && await page.locator('.s5-reader-topbar').count() !== 1) throw new Error('Mobile article lost its sticky lesson navigator.');
  await noOverflow(page, mobile ? 'Mobile article video' : 'Desktop article video');
  await screenshot(page, mobile ? 'article-inline-video-mobile-v2' : 'article-inline-video-desktop-v2');
}

const browser = await chromium.launch({ headless: true });
try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await validateHub(desktop, false);
  await validateWatch(desktop, false);
  await validateArticle(desktop, false);

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  await validateHub(mobile, true);
  await validateWatch(mobile, true);
  await validateArticle(mobile, true);
  console.log('Video experience v2 passed: hub + watch + poster-to-player lifecycle on desktop/mobile.');
} finally {
  await browser.close();
}
