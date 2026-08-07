import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const baseUrl = process.env.S5_PREVIEW_URL || 'http://127.0.0.1:8000';
const outputDir = 'artifacts/visual-review';
const sampleWatchPath = '/videos/series/modelos-razonadores/03-test-time-compute/';
const sampleMediaPath = '/series/modelos-razonadores/03-test-time-compute.mp4';

const assertNoHorizontalOverflow = async (page, label) => {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  if (dimensions.scroll > dimensions.viewport + 2) {
    throw new Error(`${label} introduces ${dimensions.scroll - dimensions.viewport}px of horizontal overflow.`);
  }
};

const loadAndAssertImages = async (page, rootSelector, label) => {
  const images = page.locator(`${rootSelector} img`);
  const count = await images.count();
  if (count === 0) throw new Error(`${label} contains no images to validate.`);

  for (let index = 0; index < count; index += 1) {
    const image = images.nth(index);
    await image.scrollIntoViewIfNeeded();
    await image.evaluate((node) => {
      if (node.loading === 'lazy') node.loading = 'eager';
    });
    await page.waitForFunction(
      ({ selector, index: imageIndex }) => {
        const nodes = document.querySelectorAll(selector);
        const node = nodes[imageIndex];
        return Boolean(node && node.complete && node.naturalWidth > 0 && node.naturalHeight > 0);
      },
      { selector: `${rootSelector} img`, index },
      { timeout: 15_000 },
    );
  }

  const broken = await images.evaluateAll((nodes) => nodes
    .map((node, index) => ({
      index,
      src: node.currentSrc || node.src,
      complete: node.complete,
      width: node.naturalWidth,
      height: node.naturalHeight,
    }))
    .filter((item) => !item.complete || item.width <= 0 || item.height <= 0));
  if (broken.length > 0) {
    throw new Error(`${label} contains broken images: ${JSON.stringify(broken)}.`);
  }

  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    if (document.body) document.body.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    window.dispatchEvent(new Event('scroll'));
  });
  await page.waitForFunction(() => window.scrollY < 2);
  await page.waitForTimeout(180);
};

const assertHub = async (page, { mobile = false } = {}) => {
  const library = page.locator('[data-s5-video-library]');
  const cards = library.locator('[data-s5-video-card]');
  const search = library.locator('[data-s5-video-search]');
  const catalogueCount = await page.evaluate(async () => {
    const response = await fetch('/videos/catalog.json');
    if (!response.ok) throw new Error(`catalog.json returned ${response.status}`);
    return (await response.json()).count;
  });

  await library.waitFor({ state: 'visible' });
  if (catalogueCount < 30) {
    throw new Error(`The video catalogue is unexpectedly small: ${catalogueCount}.`);
  }
  if (await cards.count() !== catalogueCount) {
    throw new Error(`The video hub exposes ${await cards.count()} cards for ${catalogueCount} catalogue entries.`);
  }
  if (await library.locator('[data-s5-video-filter]').count() < 5) {
    throw new Error('The video hub does not expose the expected topic filters.');
  }

  const firstCard = cards.first();
  const secondCard = cards.nth(1);
  const firstBox = await firstCard.boundingBox();
  const secondBox = await secondCard.boundingBox();
  if (!firstBox || !secondBox) throw new Error('Unable to measure the video cards.');
  if (mobile && Math.abs(firstBox.x - secondBox.x) > 4) {
    throw new Error('Mobile video cards are not arranged in one readable column.');
  }
  if (!mobile && firstBox.width < 300) {
    throw new Error(`Desktop video cards are too narrow: ${firstBox.width}px.`);
  }

  await search.fill('test time compute');
  const visibleAfterSearch = library.locator('[data-s5-video-card]:visible');
  const resultCount = await visibleAfterSearch.count();
  if (resultCount === 0) {
    throw new Error('Video search returned no results for Test-Time Compute.');
  }
  const resultPaths = await visibleAfterSearch
    .locator('.s5-video-card__poster')
    .evaluateAll((links) => links.map((link) => new URL(link.href).pathname));
  if (!resultPaths.includes(sampleWatchPath)) {
    throw new Error(`Video search omitted ${sampleWatchPath}: ${JSON.stringify(resultPaths)}.`);
  }
  if (resultPaths[0] !== sampleWatchPath) {
    throw new Error(`Exact-title video was not ranked first: ${JSON.stringify(resultPaths)}.`);
  }

  await search.fill('');
  const reasoningFilter = library.locator('[data-s5-video-filter="razonamiento"]');
  if (await reasoningFilter.count() !== 1) {
    throw new Error('The reasoning topic filter is missing.');
  }
  await reasoningFilter.click();
  const filteredCards = library.locator('[data-s5-video-card]:visible');
  if (await filteredCards.count() === 0) {
    throw new Error('The reasoning topic filter returned no videos.');
  }
  for (const topic of await filteredCards.evaluateAll((nodes) => nodes.map((node) => node.dataset.topic))) {
    if (topic !== 'razonamiento') throw new Error(`Reasoning filter exposed a ${topic} card.`);
  }

  await library.locator('[data-s5-video-filter="all"]').click();
  if (await library.locator('[data-s5-video-card]:visible').count() !== catalogueCount) {
    throw new Error('Resetting the video filters did not restore the complete catalogue.');
  }

  await loadAndAssertImages(
    page,
    '[data-s5-video-library]',
    mobile ? 'Mobile video hub' : 'Desktop video hub',
  );
  if (await library.locator('img').count() !== catalogueCount) {
    throw new Error(`The video hub exposes ${await library.locator('img').count()} poster images for ${catalogueCount} catalogue entries.`);
  }
  await assertNoHorizontalOverflow(page, mobile ? 'Mobile video hub' : 'Desktop video hub');
};

const assertWatchPage = async (page, { mobile = false } = {}) => {
  const watch = page.locator('[data-s5-video-watch]');
  const player = watch.locator('[data-s5-watch-player]');
  const snippets = watch.locator('.s5-video-watch__snippet-grid > article');
  const related = watch.locator('.s5-video-watch__related-grid > article');
  const articleLink = watch.locator('.s5-video-watch__source > a');

  await watch.waitFor({ state: 'visible' });
  await player.waitFor({ state: 'visible' });
  const playerBox = await player.boundingBox();
  const summaryBox = await watch.locator('.s5-video-watch__summary').boundingBox();
  const viewport = page.viewportSize();
  if (!playerBox || !summaryBox || !viewport) throw new Error('Unable to measure the watch page.');
  if (playerBox.y >= summaryBox.y) {
    throw new Error('The video player is not positioned before the summary.');
  }
  if (!mobile && playerBox.width < 900) {
    throw new Error(`The desktop watch player is too narrow: ${playerBox.width}px.`);
  }
  if (mobile && playerBox.width < viewport.width - 36) {
    throw new Error(`The mobile watch player does not use the available width: ${playerBox.width}px.`);
  }
  if (await snippets.count() === 0) {
    throw new Error('The watch page has no summary snippets.');
  }
  if (await related.count() !== 3) {
    throw new Error(`The watch page should expose three related videos, found ${await related.count()}.`);
  }

  const articleHref = await articleLink.getAttribute('href');
  const articlePath = new URL(articleHref, baseUrl).pathname;
  if (articlePath !== '/series/modelos-razonadores/03-test-time-compute/') {
    throw new Error(`The watch page does not return to its source article: ${articleHref}.`);
  }

  const ctaState = await articleLink.evaluate((node) => {
    const style = getComputedStyle(node);
    const parseRgb = (value) => {
      const values = value.match(/[\d.]+/g)?.slice(0, 3).map(Number) || [];
      return values.length === 3 ? values : null;
    };
    const luminance = (rgb) => {
      const channels = rgb.map((value) => {
        const channel = value / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
    };
    const foreground = parseRgb(style.color);
    const background = parseRgb(style.backgroundColor);
    let contrast = 0;
    if (foreground && background) {
      const light = Math.max(luminance(foreground), luminance(background));
      const dark = Math.min(luminance(foreground), luminance(background));
      contrast = (light + 0.05) / (dark + 0.05);
    }
    const rect = node.getBoundingClientRect();
    return {
      text: node.textContent.trim(),
      color: style.color,
      background: style.backgroundColor,
      contrast,
      width: rect.width,
      height: rect.height,
    };
  });
  if (ctaState.text !== 'Leer el artículo →') {
    throw new Error(`The source CTA lost its visible label: ${JSON.stringify(ctaState)}.`);
  }
  if (ctaState.contrast < 4.5 || ctaState.width < 90 || ctaState.height < 40) {
    throw new Error(`The source CTA is not visually legible: ${JSON.stringify(ctaState)}.`);
  }

  const mediaHref = await player.locator('source').getAttribute('src');
  const mediaPath = new URL(mediaHref, baseUrl).pathname;
  if (mediaPath !== sampleMediaPath) {
    throw new Error(`The watch player points to the wrong media path: ${mediaHref}.`);
  }
  const mediaResponse = await page.request.head(`${baseUrl}${mediaPath}`);
  if (!mediaResponse.ok()) {
    throw new Error(`The watch media returned ${mediaResponse.status()}: ${mediaPath}.`);
  }

  // The production hosts (GitHub Pages and R2) support byte-range media requests,
  // while Python's preview server is not a reliable media decoder/range server.
  // Exercise the real runtime listener by providing deterministic metadata and
  // dispatching the same loadedmetadata event a browser emits after decoding it.
  await page.waitForFunction(() => document.querySelector('[data-s5-video-watch]')?.dataset.s5VideoWatchReady === 'true');
  await player.evaluate((node) => {
    let currentTime = 0;
    Object.defineProperty(node, 'readyState', { configurable: true, get: () => 1 });
    Object.defineProperty(node, 'duration', { configurable: true, get: () => 60 });
    Object.defineProperty(node, 'currentTime', {
      configurable: true,
      get: () => currentTime,
      set: (value) => { currentTime = Number(value); },
    });
    node.dispatchEvent(new Event('loadedmetadata'));
  });
  const currentTime = await player.evaluate((node) => Number(node.currentTime || 0));
  if (currentTime < 4.5 || currentTime > 6.5) {
    throw new Error(`The ?t=5 deep-link runtime did not seek the player: ${currentTime}.`);
  }

  await loadAndAssertImages(
    page,
    '[data-s5-video-watch]',
    mobile ? 'Mobile watch page' : 'Desktop watch page',
  );
  await assertNoHorizontalOverflow(page, mobile ? 'Mobile watch page' : 'Desktop watch page');
};

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  const desktopHub = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await desktopHub.goto(`${baseUrl}/videos/`, { waitUntil: 'networkidle' });
  await assertHub(desktopHub);
  await desktopHub.screenshot({ path: `${outputDir}/video-library-desktop.png`, fullPage: true });

  const mobileHub = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await mobileHub.goto(`${baseUrl}/videos/`, { waitUntil: 'networkidle' });
  await assertHub(mobileHub, { mobile: true });
  await mobileHub.screenshot({ path: `${outputDir}/video-library-mobile.png`, fullPage: true });

  const desktopWatch = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await desktopWatch.goto(`${baseUrl}${sampleWatchPath}?t=5`, { waitUntil: 'networkidle' });
  await assertWatchPage(desktopWatch);
  await desktopWatch.screenshot({ path: `${outputDir}/video-watch-desktop.png`, fullPage: true });

  const mobileWatch = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await mobileWatch.goto(`${baseUrl}${sampleWatchPath}?t=5`, { waitUntil: 'networkidle' });
  await assertWatchPage(mobileWatch, { mobile: true });
  await mobileWatch.screenshot({ path: `${outputDir}/video-watch-mobile.png`, fullPage: true });
} finally {
  await browser.close();
}
