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

  // Validate every poster as a network resource. Forcing all lazy/off-screen images
  // through browser decode is flaky and does not test anything stronger: Chromium is
  // allowed to defer those decodes indefinitely. The HTTP response is the contract
  // for off-screen posters; visible posters additionally need decoded dimensions.
  const sources = await images.evaluateAll((nodes) => nodes.map((node) => node.currentSrc || node.src));
  const failures = [];
  for (const src of sources) {
    const response = await page.request.get(src);
    const contentType = response.headers()['content-type'] || '';
    if (!response.ok() || !contentType.toLowerCase().startsWith('image/')) {
      failures.push({ src, status: response.status(), contentType });
    }
  }
  if (failures.length > 0) {
    throw new Error(`${label} contains unavailable poster resources: ${JSON.stringify(failures)}.`);
  }

  const visibleImages = page.locator(`${rootSelector} img:visible`);
  const visibleCount = await visibleImages.count();
  for (let index = 0; index < visibleCount; index += 1) {
    const image = visibleImages.nth(index);
    await image.scrollIntoViewIfNeeded();
    await image.evaluate((node) => {
      if (node.loading === 'lazy') node.loading = 'eager';
    });
    await image.evaluate((node) => node.decode?.().catch(() => {}));
  }

  const brokenVisible = await visibleImages.evaluateAll((nodes) => nodes
    .map((node, index) => ({
      index,
      src: node.currentSrc || node.src,
      complete: node.complete,
      width: node.naturalWidth,
      height: node.naturalHeight,
    }))
    .filter((item) => !item.complete || item.width <= 0 || item.height <= 0));
  if (brokenVisible.length > 0) {
    throw new Error(`${label} contains broken visible images: ${JSON.stringify(brokenVisible)}.`);
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
    const contrast = (foreground, background) => {
      const fg = luminance(foreground);
      const bg = luminance(background);
      return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
    };
    const foreground = parseRgb(style.color);
    const background = parseRgb(style.backgroundColor);
    return {
      color: style.color,
      backgroundColor: style.backgroundColor,
      contrast: foreground && background ? contrast(foreground, background) : null,
      display: style.display,
      width: node.getBoundingClientRect().width,
    };
  });
  if (ctaState.display === 'none' || ctaState.width < 180) {
    throw new Error(`The watch source CTA is not usable: ${JSON.stringify(ctaState)}.`);
  }
  if (ctaState.contrast !== null && ctaState.contrast < 4.5) {
    throw new Error(`The watch source CTA contrast is too low: ${JSON.stringify(ctaState)}.`);
  }

  await loadAndAssertImages(
    page,
    '[data-s5-video-watch]',
    mobile ? 'Mobile watch page' : 'Desktop watch page',
  );
  await assertNoHorizontalOverflow(page, mobile ? 'Mobile watch page' : 'Desktop watch page');
};

const assertArticle = async (page, { mobile = false } = {}) => {
  const player = page.locator('[data-s5-inline-video-player]');
  const poster = page.locator('[data-s5-inline-video-start]');
  const watchLink = page.locator('.s5-video-embed__watch a');
  const content = page.locator('article');
  const topbar = page.locator('.s5-reader-topbar');
  const h1 = page.locator('.md-content__inner h1');

  await content.waitFor({ state: 'visible' });
  await player.waitFor({ state: 'visible' });
  if (await poster.count() !== 1) {
    throw new Error(`The article should expose one inline poster button, found ${await poster.count()}.`);
  }

  const h1Box = await h1.boundingBox();
  const playerBox = await player.boundingBox();
  if (!h1Box || !playerBox) throw new Error('Unable to measure the article heading or inline player.');
  if (playerBox.y <= h1Box.y + h1Box.height) {
    throw new Error('The inline video is not positioned after the article title.');
  }
  if (!mobile && playerBox.width < 900) {
    throw new Error(`The desktop inline video is too narrow: ${playerBox.width}px.`);
  }
  if (mobile) {
    const viewport = page.viewportSize();
    if (!viewport) throw new Error('Missing mobile viewport.');
    if (playerBox.width < viewport.width - 36) {
      throw new Error(`The mobile inline video does not use the available width: ${playerBox.width}px.`);
    }
    if (await topbar.count() !== 1) {
      throw new Error(`The mobile article should keep one sticky lesson navigator, found ${await topbar.count()}.`);
    }
  }

  const source = await player.locator('source').getAttribute('src');
  const mediaUrl = new URL(source, baseUrl).href;
  const rangeResponse = await page.request.get(mediaUrl, {
    headers: { Range: 'bytes=0-1023' },
  });
  if (![200, 206].includes(rangeResponse.status())) {
    throw new Error(`Inline video source does not support playback: ${rangeResponse.status()} ${mediaUrl}.`);
  }
  if (rangeResponse.status() === 206) {
    const contentRange = rangeResponse.headers()['content-range'] || '';
    if (!contentRange.startsWith('bytes 0-')) {
      throw new Error(`Unexpected content-range for ${mediaUrl}: ${contentRange}.`);
    }
  }

  await poster.click();
  await page.waitForFunction(() => {
    const video = document.querySelector('[data-s5-inline-video-player]');
    return Boolean(video && (!video.paused || video.currentTime > 0));
  }, { timeout: 10_000 });

  const watchHref = await watchLink.getAttribute('href');
  const watchPath = new URL(watchHref, baseUrl).pathname;
  if (watchPath !== sampleWatchPath) {
    throw new Error(`Inline watch link points to ${watchPath} instead of ${sampleWatchPath}.`);
  }
  await assertNoHorizontalOverflow(page, mobile ? 'Mobile article video' : 'Desktop article video');
};

const screenshot = async (page, name, fullPage = false) => {
  await fs.mkdir(outputDir, { recursive: true });
  await page.screenshot({
    path: `${outputDir}/${name}.png`,
    fullPage,
    animations: 'disabled',
  });
};

const browser = await chromium.launch({ headless: true });
try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await desktop.goto(`${baseUrl}/videos/`, { waitUntil: 'networkidle' });
  await assertHub(desktop);
  await screenshot(desktop, 'video-library-desktop');

  await desktop.goto(`${baseUrl}${sampleWatchPath}`, { waitUntil: 'networkidle' });
  await assertWatchPage(desktop);
  await screenshot(desktop, 'video-watch-desktop');

  await desktop.goto(`${baseUrl}/series/modelos-razonadores/03-test-time-compute/`, { waitUntil: 'networkidle' });
  await assertArticle(desktop);
  await screenshot(desktop, 'article-inline-video-desktop');

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  await mobile.goto(`${baseUrl}/videos/`, { waitUntil: 'networkidle' });
  await assertHub(mobile, { mobile: true });
  await screenshot(mobile, 'video-library-mobile');

  await mobile.goto(`${baseUrl}${sampleWatchPath}`, { waitUntil: 'networkidle' });
  await assertWatchPage(mobile, { mobile: true });
  await screenshot(mobile, 'video-watch-mobile');

  await mobile.goto(`${baseUrl}/series/modelos-razonadores/03-test-time-compute/`, { waitUntil: 'networkidle' });
  await assertArticle(mobile, { mobile: true });
  await screenshot(mobile, 'article-inline-video-mobile');
} finally {
  await browser.close();
}
