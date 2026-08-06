import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const baseUrl = process.env.S5_PREVIEW_URL || 'http://127.0.0.1:8000';
const outputDir = 'artifacts/visual-review';
const sampleWatchPath = '/videos/series/modelos-razonadores/03-test-time-compute/';

const assertNoHorizontalOverflow = async (page, label) => {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  if (dimensions.scroll > dimensions.viewport + 2) {
    throw new Error(`${label} introduces ${dimensions.scroll - dimensions.viewport}px of horizontal overflow.`);
  }
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
  if (await visibleAfterSearch.count() !== 1) {
    throw new Error(`Video search should return one Test-Time Compute card, found ${await visibleAfterSearch.count()}.`);
  }
  if (!/test-time compute/i.test(await visibleAfterSearch.first().innerText())) {
    throw new Error('Video search returned the wrong card.');
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
  if (await articleLink.getAttribute('href') !== '/series/modelos-razonadores/03-test-time-compute/') {
    throw new Error('The watch page does not return to its source article.');
  }

  await page.waitForFunction(() => {
    const video = document.querySelector('[data-s5-watch-player]');
    return video && video.readyState >= 1;
  }, null, { timeout: 15_000 });
  const currentTime = await player.evaluate((node) => node.currentTime);
  if (currentTime < 4.5 || currentTime > 6.5) {
    throw new Error(`The ?t=5 deep link did not seek the player: ${currentTime}.`);
  }
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
