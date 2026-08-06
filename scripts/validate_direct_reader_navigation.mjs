import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const baseUrl = process.env.S5_PREVIEW_URL || 'http://127.0.0.1:8000';
const outputDir = 'artifacts/visual-review';

const expectPath = async (page, path) => {
  await page.waitForURL((url) => url.pathname === path, { timeout: 15_000 });
};

const assertNoHorizontalOverflow = async (page, label) => {
  const overflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth));
  if (overflow > 2) throw new Error(`${label} introduced ${overflow}px of horizontal overflow.`);
};

const assertCompactPresentationTitle = async (page) => {
  const title = page.locator('.md-content__inner > h1').first();
  await title.waitFor({ state: 'visible' });

  const metrics = await title.evaluate((node) => {
    const bounds = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return {
      left: bounds.left,
      right: bounds.right,
      width: bounds.width,
      height: bounds.height,
      fontSize: Number.parseFloat(style.fontSize),
      lineHeight: Number.parseFloat(style.lineHeight),
    };
  });
  const viewport = page.viewportSize();

  if (!viewport) throw new Error('Missing viewport while checking the mobile presentation title.');
  if (metrics.right > viewport.width - 8 || metrics.left < 0) {
    throw new Error(`Mobile presentation title escapes the reading column: ${JSON.stringify(metrics)}`);
  }
  if (metrics.height > 170 || metrics.fontSize > 52) {
    throw new Error(`Mobile presentation title is still oversized: ${JSON.stringify(metrics)}`);
  }
  await assertNoHorizontalOverflow(page, 'Mobile presentation');
};

const assertMaterialDrawerIsolation = async (page) => {
  const toggle = page.locator('label.md-header__button[for="__drawer"]');
  const drawerState = page.locator('input[data-md-toggle="drawer"]').first();
  const primaryNavigation = page.locator('.md-sidebar--primary').first();

  await toggle.waitFor({ state: 'visible' });
  await toggle.click();
  await page.waitForFunction(() => document.querySelector('input[data-md-toggle="drawer"]')?.checked === true);
  await primaryNavigation.waitFor({ state: 'visible' });

  const readerChrome = page.locator('.s5-reader-topbar:visible, .s5-reader-direct:visible');
  if (await readerChrome.count()) {
    throw new Error('Reader navigation is still rendered above Material’s navigation drawer.');
  }
  if (!await drawerState.isChecked()) {
    throw new Error('Material navigation drawer did not remain open during the visual check.');
  }
};

const assertGlobalDesktopHeader = async (page) => {
  const links = page.locator('.s5-reader-global-nav__link:visible');
  if (await links.count() < 5) {
    throw new Error('Desktop reader pages must preserve the global 5sigmas navigation inside the header.');
  }
  if (await page.locator('.s5-reader-topbar:visible').count()) {
    throw new Error('Desktop duplicates chapter navigation below the title even though the contextual rail is present.');
  }
};

const assertContextualDesktopRail = async (page) => {
  const library = page.locator('[data-s5-reader-direct]');
  const collections = library.locator('[data-s5-reader-collection]');
  const entries = library.locator('[data-s5-direct-entry]');
  const currentCollection = library.locator('[data-current-collection="true"]');
  const browse = library.locator('[data-s5-reader-open]');
  const search = library.locator('[data-s5-reader-direct-search]');

  await library.waitFor({ state: 'visible' });
  if (await collections.count() !== 7) {
    throw new Error('The full seven-collection catalogue must remain available in the DOM.');
  }
  if (await entries.count() < 30) {
    throw new Error('The reader no longer exposes the complete article catalogue.');
  }
  if (await library.locator('[data-s5-reader-collection]:visible').count() !== 1) {
    throw new Error('Desktop must show only the current collection in the persistent rail.');
  }
  if (await currentCollection.count() !== 1 || !await currentCollection.isVisible()) {
    throw new Error('The current collection is not the visible desktop collection.');
  }
  if (!await currentCollection.locator('a[aria-current="page"]').isVisible()) {
    throw new Error('The current page is not identified inside the contextual rail.');
  }
  if (!await browse.isVisible()) {
    throw new Error('Desktop must expose one progressive-disclosure entry to the complete library.');
  }
  if (await search.isVisible()) {
    throw new Error('The global search should live in the full library, not the persistent rail.');
  }

  const libraryBox = await library.boundingBox();
  const titleBox = await page.locator('article h1').boundingBox();
  if (!libraryBox || !titleBox || libraryBox.x + libraryBox.width >= titleBox.x - 24) {
    throw new Error(`Contextual rail is not positioned cleanly left of the article: ${JSON.stringify({ libraryBox, titleBox })}`);
  }

  await assertGlobalDesktopHeader(page);
  return { library, browse };
};

const openFullLibrary = async (page, trigger = null) => {
  const openButton = trigger || page.locator('.s5-reader-course');
  const dialog = page.locator('[data-s5-reader-library]');
  await openButton.click();
  await dialog.waitFor({ state: 'visible' });
  if (!await dialog.evaluate((node) => node.hasAttribute('open'))) {
    throw new Error('The complete library dialog did not open.');
  }
  return dialog;
};

const assertFullLibrary = async (page, dialog) => {
  const tabs = dialog.locator('[data-s5-series-tab]');
  const entries = dialog.locator('[data-s5-reader-entry]');
  const search = dialog.locator('[data-s5-reader-search]');

  if (await tabs.count() !== 7) {
    throw new Error('The complete library must expose six learning series plus technical notes.');
  }
  if (await entries.count() < 30) {
    throw new Error('The complete library is missing chapters or technical notes.');
  }
  if (!await search.isVisible()) {
    throw new Error('The complete library must retain global search.');
  }
  return { tabs, entries, search };
};

const searchAndNavigate = async (page, dialog, query, expectedPath) => {
  const controls = await assertFullLibrary(page, dialog);
  await controls.search.fill(query);
  const expected = dialog.locator(`a[href="${expectedPath}"]:visible`);
  await expected.waitFor({ state: 'visible' });
  await expected.click();
  await expectPath(page, expectedPath);
};

const assertCompactMobileReader = async (page) => {
  const topbar = page.locator('.s5-reader-topbar');
  const directLibrary = page.locator('.s5-reader-direct');
  const directToggle = page.locator('.s5-reader-direct-toggle');
  const localRail = page.locator('.s5-reader-rail');

  await topbar.waitFor({ state: 'visible' });
  if (await directLibrary.isVisible() || await directToggle.isVisible() || await localRail.isVisible()) {
    throw new Error('Mobile still exposes duplicate reader navigation layers.');
  }

  const topbarBox = await topbar.boundingBox();
  if (!topbarBox || topbarBox.height > 54 || topbarBox.x < 8 || topbarBox.x + topbarBox.width > 382) {
    throw new Error(`Mobile lesson navigator is not compact: ${JSON.stringify(topbarBox)}`);
  }
  if ((await topbar.evaluate((node) => getComputedStyle(node).position)) !== 'sticky') {
    throw new Error('Mobile lesson navigator must remain sticky while reading.');
  }
  await assertNoHorizontalOverflow(page, 'Mobile reader');
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

  let contextual = await assertContextualDesktopRail(desktop);
  let dialog = await openFullLibrary(desktop, contextual.browse);
  await searchAndNavigate(desktop, dialog, 'datacenter espacial', '/series/datacenters-espacio/03-que-es-datacenter-espacio/');

  contextual = await assertContextualDesktopRail(desktop);
  dialog = await openFullLibrary(desktop, contextual.browse);
  await searchAndNavigate(desktop, dialog, 'arquitecturas multimodalidad', '/series/multimodalidad-iag/03-arquitecturas/');

  contextual = await assertContextualDesktopRail(desktop);
  dialog = await openFullLibrary(desktop, contextual.browse);
  await searchAndNavigate(desktop, dialog, 'agente reactivo tool calls', '/articulos-tecnicos/proactive-reactive-agent-and-tool-calls/');

  contextual = await assertContextualDesktopRail(desktop);
  await desktop.evaluate(() => window.scrollTo(0, Math.min(1200, document.documentElement.scrollHeight - window.innerHeight)));
  await desktop.waitForTimeout(200);
  const desktopBox = await contextual.library.boundingBox();
  if (!desktopBox || desktopBox.y < 60 || desktopBox.y > 90 || desktopBox.width < 190) {
    throw new Error(`Desktop contextual rail is not persistently usable: ${JSON.stringify(desktopBox)}`);
  }
  await desktop.screenshot({ path: `${outputDir}/reader-contextual-desktop.png`, fullPage: false });

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
  await assertCompactMobileReader(mobile);

  dialog = await openFullLibrary(mobile);
  await searchAndNavigate(mobile, dialog, 'multimodal', '/series/multimodalidad-iag/02-alineamiento/');
  await assertCompactMobileReader(mobile);
  await mobile.screenshot({ path: `${outputDir}/reader-compact-mobile.png`, fullPage: false });

  const narrowMobile = await browser.newPage({ viewport: { width: 360, height: 800 }, deviceScaleFactor: 1 });
  await narrowMobile.goto(`${baseUrl}/series/from-cave-to-agi/00_presentacion_serie/`, { waitUntil: 'networkidle' });
  await assertCompactMobileReader(narrowMobile);
  await assertCompactPresentationTitle(narrowMobile);
  await narrowMobile.screenshot({ path: `${outputDir}/reader-presentation-narrow-mobile.png`, fullPage: false });

  const tabletDrawer = await browser.newPage({ viewport: { width: 900, height: 844 }, deviceScaleFactor: 1 });
  await tabletDrawer.goto(`${baseUrl}/series/from-cave-to-agi/00_presentacion_serie/`, { waitUntil: 'networkidle' });
  if (!await tabletDrawer.locator('.s5-reader-topbar').isVisible()) {
    throw new Error('Tablet regression setup requires the compact reader topbar to be visible.');
  }
  await assertMaterialDrawerIsolation(tabletDrawer);
  await tabletDrawer.screenshot({ path: `${outputDir}/reader-material-drawer-tablet.png`, fullPage: false });
} finally {
  await browser.close();
}
