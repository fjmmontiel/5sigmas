import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const baseUrl = process.env.S5_PREVIEW_URL || 'http://127.0.0.1:8000';
const outputDir = 'artifacts/visual-review';

const expectPath = async (page, path) => {
  await page.waitForURL((url) => url.pathname === path, { timeout: 15_000 });
};

const assertMobileDock = async (page) => {
  const topbar = page.locator('.s5-reader-topbar');
  const toggle = page.locator('[data-s5-reader-direct-open]');
  const localRail = page.locator('.s5-reader-rail');
  const content = page.locator('.md-content__inner');

  await toggle.waitFor({ state: 'visible' });

  if (await topbar.isVisible()) {
    throw new Error('The old full-width reader bar is still visible on mobile.');
  }
  if (await localRail.isVisible()) {
    throw new Error('The redundant horizontal chapter rail is still visible on mobile.');
  }
  if ((await toggle.locator('span').textContent())?.trim() !== 'Biblioteca') {
    throw new Error('The mobile trigger must represent the complete content library.');
  }

  const toggleBox = await toggle.boundingBox();
  if (!toggleBox || toggleBox.x > 1 || toggleBox.width > 36 || toggleBox.height > 116) {
    throw new Error(`Mobile library trigger is not a narrow left-edge tab: ${JSON.stringify(toggleBox)}`);
  }

  const paddingLeft = await content.evaluate((node) => Number.parseFloat(getComputedStyle(node).paddingLeft));
  if (paddingLeft < 34) {
    throw new Error(`Mobile article does not reserve the full library-tab gutter: ${paddingLeft}px`);
  }
};

const assertLibrary = async (page, { mobile = false } = {}) => {
  const library = page.locator('[data-s5-reader-direct]');
  const search = library.locator('[data-s5-reader-direct-search]');
  const collections = library.locator('[data-s5-reader-collection]');
  const links = library.locator('[data-s5-direct-entry]');
  const kinds = await collections.locator('header > span').allTextContents();

  if (await collections.count() !== 7) {
    throw new Error('Reader library must expose all 6 series plus technical notes simultaneously.');
  }
  if (kinds.filter((label) => label.trim() === 'Aprender').length !== 6) {
    throw new Error(`Reader library must expose six Aprender collections: ${JSON.stringify(kinds)}`);
  }
  if (kinds.filter((label) => label.trim() === 'Construir').length !== 1) {
    throw new Error(`Reader library must expose Construir separately: ${JSON.stringify(kinds)}`);
  }
  if (await links.count() < 30) {
    throw new Error('Reader library does not expose the complete article catalogue.');
  }
  if (await search.count() !== 1) {
    throw new Error('Reader library must provide one global search field.');
  }

  if (mobile) {
    const toggle = page.locator('[data-s5-reader-direct-open]');
    await toggle.waitFor({ state: 'visible' });
    await toggle.click();
    await library.waitFor({ state: 'visible' });
    if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
      throw new Error('Mobile reader drawer did not report its open state.');
    }
  } else {
    await library.waitFor({ state: 'visible' });
    const libraryBox = await library.boundingBox();
    const titleBox = await page.locator('article h1').boundingBox();
    if (!libraryBox || !titleBox || libraryBox.x + libraryBox.width >= titleBox.x - 8) {
      throw new Error(`Desktop reader library is not positioned cleanly left of the article: ${JSON.stringify({ libraryBox, titleBox })}`);
    }
  }

  return { library, search, collections, links };
};

const navigateDirectly = async (controls, page, path) => {
  const link = controls.library.locator(`a[href="${path}"]`);
  if (await link.count() !== 1) {
    throw new Error(`Global library must expose exactly one direct link to ${path}.`);
  }
  await link.click();
  await expectPath(page, path);
};

const assertGlobalSearch = async (controls, query, expectedPath) => {
  await controls.search.fill(query);
  const visibleLinks = controls.library.locator('[data-s5-direct-entry]:visible');
  if (await visibleLinks.count() === 0) {
    throw new Error(`Global search returned no results for ${query}.`);
  }
  if (await controls.library.locator(`a[href="${expectedPath}"]:visible`).count() !== 1) {
    throw new Error(`Global search did not expose ${expectedPath} for ${query}.`);
  }
  await controls.search.fill('');
};

const assertCollectionBoundary = async (page, { completionHref, label }) => {
  const nextArrow = page.locator('.s5-reader-topbar .s5-reader-arrow--next');
  if (!await nextArrow.evaluate((node) => node.classList.contains('is-disabled'))) {
    throw new Error(`${label} must not silently continue into a different collection.`);
  }

  const endLink = page.locator('.s5-reader-end__next');
  if (await endLink.getAttribute('href') !== completionHref) {
    throw new Error(`${label} completion must return to ${completionHref}.`);
  }
};

const assertCollectionContinuation = async (page, { nextHref, label }) => {
  const nextArrow = page.locator('.s5-reader-topbar .s5-reader-arrow--next');
  if (await nextArrow.evaluate((node) => node.classList.contains('is-disabled'))) {
    throw new Error(`${label} must continue inside the same collection.`);
  }
  if (await nextArrow.getAttribute('href') !== nextHref) {
    throw new Error(`${label} must continue to ${nextHref}.`);
  }
};

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await desktop.goto(`${baseUrl}/series/modelos-razonadores/03-test-time-compute/`, { waitUntil: 'networkidle' });

  let controls = await assertLibrary(desktop);
  await assertGlobalSearch(controls, 'datacenter espacial', '/series/datacenters-espacio/03-que-es-datacenter-espacio/');

  await navigateDirectly(controls, desktop, '/series/from-cave-to-agi/00_presentacion_serie/');
  controls = await assertLibrary(desktop);
  await navigateDirectly(controls, desktop, '/series/multimodalidad-iag/03-arquitecturas/');
  controls = await assertLibrary(desktop);
  await navigateDirectly(controls, desktop, '/articulos-tecnicos/proactive-reactive-agent-and-tool-calls/');
  controls = await assertLibrary(desktop);
  await navigateDirectly(controls, desktop, '/series/ia-pib-bienestar-energia/02-ia-tecnologia-electrica/');

  controls = await assertLibrary(desktop);
  await desktop.evaluate(() => window.scrollTo(0, Math.min(1200, document.documentElement.scrollHeight - window.innerHeight)));
  await desktop.waitForTimeout(200);
  const desktopBox = await controls.library.boundingBox();
  if (!desktopBox || desktopBox.y < 130 || desktopBox.y > 155 || desktopBox.width < 195) {
    throw new Error(`Desktop global library is not persistently usable: ${JSON.stringify(desktopBox)}`);
  }
  await desktop.screenshot({ path: `${outputDir}/reader-sidebar-desktop.png`, fullPage: false });

  await desktop.goto(`${baseUrl}/series/modelos-razonadores/05-riesgos/`, { waitUntil: 'networkidle' });
  await assertCollectionBoundary(desktop, { completionHref: '/series/', label: 'A completed series' });

  await desktop.goto(`${baseUrl}/articulos-tecnicos/proactive-reactive-agent-and-tool-calls/`, { waitUntil: 'networkidle' });
  await assertCollectionContinuation(desktop, {
    nextHref: '/articulos-tecnicos/reactive-proactive-voice-agents/',
    label: 'The technical collection',
  });

  await desktop.goto(`${baseUrl}/articulos-tecnicos/reactive-proactive-voice-agents/`, { waitUntil: 'networkidle' });
  await assertCollectionContinuation(desktop, {
    nextHref: '/articulos-tecnicos/voice-agent-architectures/',
    label: 'The technical collection',
  });

  await desktop.goto(`${baseUrl}/articulos-tecnicos/voice-agent-architectures/`, { waitUntil: 'networkidle' });
  await assertCollectionBoundary(desktop, { completionHref: '/articulos-tecnicos/', label: 'A completed technical collection' });

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await mobile.goto(`${baseUrl}/series/modelos-razonadores/03-test-time-compute/`, { waitUntil: 'networkidle' });
  await mobile.evaluate(() => window.scrollTo(0, Math.min(760, document.documentElement.scrollHeight - window.innerHeight)));
  await mobile.waitForTimeout(200);
  await assertMobileDock(mobile);
  await mobile.screenshot({ path: `${outputDir}/reader-mobile-left-dock.png`, fullPage: false });

  controls = await assertLibrary(mobile, { mobile: true });
  await assertGlobalSearch(controls, 'multimodal', '/series/multimodalidad-iag/02-alineamiento/');
  const drawerBox = await controls.library.boundingBox();
  const horizontalScroll = await mobile.evaluate(() => window.scrollX || document.documentElement.scrollLeft || document.body.scrollLeft || 0);
  if (!drawerBox || drawerBox.x > 1 || drawerBox.width < 350) {
    throw new Error(`Mobile global library is not fully usable: ${JSON.stringify(drawerBox)}`);
  }
  if (horizontalScroll !== 0) {
    throw new Error(`Mobile reader drawer shifted the page horizontally: ${horizontalScroll}px`);
  }

  await navigateDirectly(controls, mobile, '/series/datacenters-espacio/04-huella-real-datacenter/');
  await mobile.screenshot({ path: `${outputDir}/reader-sidebar-mobile.png`, fullPage: false });
} finally {
  await browser.close();
}
