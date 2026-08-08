import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const baseUrl = process.env.S5_PREVIEW_URL || 'http://127.0.0.1:8000';
const outputDir = 'artifacts/visual-review';

const assertNoHorizontalOverflow = async (page, label) => {
  const state = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  if (state.scrollWidth > state.clientWidth + 2) {
    throw new Error(`${label} introduces ${state.scrollWidth - state.clientWidth}px of horizontal overflow: ${JSON.stringify(state)}.`);
  }
};

const waitForStableBox = async (locator, { timeout = 4000, tolerance = 1 } = {}) => {
  const started = Date.now();
  let previous = null;
  let stableFrames = 0;
  while (Date.now() - started < timeout) {
    const current = await locator.boundingBox();
    if (current && previous) {
      const delta = Math.max(
        Math.abs(current.x - previous.x),
        Math.abs(current.y - previous.y),
        Math.abs(current.width - previous.width),
        Math.abs(current.height - previous.height),
      );
      stableFrames = delta <= tolerance ? stableFrames + 1 : 0;
      if (stableFrames >= 3) return current;
    }
    previous = current;
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  throw new Error(`Element did not reach stable geometry: ${JSON.stringify(previous)}.`);
};

const validateMaterialDrawer = async (browser) => {
  const page = await browser.newPage({ viewport: { width: 900, height: 844 }, deviceScaleFactor: 1 });
  await page.goto(`${baseUrl}/series/from-cave-to-agi/00_presentacion_serie/`, { waitUntil: 'networkidle' });

  const toggle = page.locator('label.md-header__button[for="__drawer"]');
  const drawerState = page.locator('input[data-md-toggle="drawer"]').first();
  const primary = page.locator('.md-sidebar--primary').first();
  const scrollwrap = primary.locator('.md-sidebar__scrollwrap').first();

  await toggle.waitFor({ state: 'visible' });
  await toggle.click();
  await page.waitForFunction(() => document.querySelector('input[data-md-toggle="drawer"]')?.checked === true);
  await primary.waitFor({ state: 'visible' });

  const primaryBox = await waitForStableBox(primary);
  const scrollBox = await waitForStableBox(scrollwrap);
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Missing tablet viewport.');

  if (primaryBox.x < -2 || primaryBox.width < 220 || primaryBox.x + primaryBox.width < 220) {
    throw new Error(`Material drawer remains clipped after its transition: ${JSON.stringify({ primaryBox, scrollBox })}.`);
  }
  if (scrollBox.width < 210 || scrollBox.x < -2 || scrollBox.x + scrollBox.width > viewport.width + 2) {
    throw new Error(`Material drawer content is not fully usable: ${JSON.stringify({ primaryBox, scrollBox, viewport })}.`);
  }
  if (await page.locator('.s5-reader-topbar:visible, .s5-reader-direct:visible').count()) {
    throw new Error('Custom reader chrome is still rendered above the Material drawer.');
  }

  await page.screenshot({ path: `${outputDir}/responsive-material-drawer-tablet.png`, fullPage: false });
  await page.close();
};

const validateReaderLibrary = async (browser) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await page.goto(`${baseUrl}/series/modelos-razonadores/03-test-time-compute/`, { waitUntil: 'networkidle' });

  const trigger = page.locator('.s5-reader-course');
  const dialog = page.locator('[data-s5-reader-library]');
  await trigger.click();
  await dialog.waitFor({ state: 'visible' });
  await page.waitForTimeout(120);

  const list = dialog.locator('.s5-reader-series-list');
  const selected = dialog.locator('[data-s5-series-tab][aria-selected="true"]');
  const listBox = await list.boundingBox();
  const selectedBox = await selected.boundingBox();
  const state = await list.evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      clientWidth: node.clientWidth,
      scrollWidth: node.scrollWidth,
      scrollLeft: node.scrollLeft,
      paddingLeft: Number.parseFloat(style.paddingLeft),
      paddingRight: Number.parseFloat(style.paddingRight),
      scrollSnapType: style.scrollSnapType,
    };
  });

  if (!listBox || !selectedBox) throw new Error('Unable to measure the mobile reader library.');
  if (state.scrollWidth <= state.clientWidth) throw new Error(`Reader collection strip is unexpectedly not scrollable: ${JSON.stringify(state)}.`);
  if (state.paddingLeft < 10 || state.paddingRight < 10 || !state.scrollSnapType.includes('x')) {
    throw new Error(`Reader collection strip lacks deliberate horizontal affordance: ${JSON.stringify(state)}.`);
  }
  if (selectedBox.x < listBox.x + 8 || selectedBox.x + selectedBox.width > listBox.x + listBox.width - 8) {
    throw new Error(`Selected reader collection is clipped on mobile: ${JSON.stringify({ listBox, selectedBox, state })}.`);
  }

  await assertNoHorizontalOverflow(page, 'Mobile reader library');
  await page.screenshot({ path: `${outputDir}/responsive-reader-library-mobile.png`, fullPage: false });
  await page.close();
};

const validateVideoFilters = async (browser) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await page.goto(`${baseUrl}/videos/`, { waitUntil: 'networkidle' });

  const filters = page.locator('.s5-video-library__filters');
  const buttons = filters.locator('[data-s5-video-filter]');
  await filters.waitFor({ state: 'visible' });
  const state = await filters.evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      clientWidth: node.clientWidth,
      scrollWidth: node.scrollWidth,
      paddingRight: Number.parseFloat(style.paddingRight),
      scrollSnapType: style.scrollSnapType,
      maskImage: style.maskImage || style.webkitMaskImage || '',
    };
  });
  if (state.scrollWidth <= state.clientWidth) throw new Error(`Video filters are unexpectedly not scrollable: ${JSON.stringify(state)}.`);
  if (state.paddingRight < 20 || !state.scrollSnapType.includes('x') || !state.maskImage || state.maskImage === 'none') {
    throw new Error(`Video filters lack an explicit mobile overflow affordance: ${JSON.stringify(state)}.`);
  }

  const last = buttons.last();
  await last.click();
  await page.waitForTimeout(120);
  const filtersBox = await filters.boundingBox();
  const lastBox = await last.boundingBox();
  if (!filtersBox || !lastBox) throw new Error('Unable to measure the selected video filter.');
  if (lastBox.x < filtersBox.x - 2 || lastBox.x + lastBox.width > filtersBox.x + filtersBox.width - 10) {
    throw new Error(`Selected video filter remains clipped after interaction: ${JSON.stringify({ filtersBox, lastBox })}.`);
  }

  await assertNoHorizontalOverflow(page, 'Mobile video filters');
  await page.screenshot({ path: `${outputDir}/responsive-video-filters-mobile.png`, fullPage: false });
  await page.close();
};

const validateInlineVideo = async (browser) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await page.goto(`${baseUrl}/series/modelos-razonadores/03-test-time-compute/`, { waitUntil: 'networkidle' });

  const root = page.locator('[data-s5-inline-video]').first();
  const player = root.locator('[data-s5-inline-video-player]');
  const start = root.locator('[data-s5-inline-video-start]');
  const poster = start.locator('img');
  await root.waitFor({ state: 'visible' });
  await start.waitFor({ state: 'visible' });
  await page.waitForFunction(() => {
    const image = document.querySelector('[data-s5-inline-video-start] img');
    return Boolean(image && image.complete && image.naturalWidth > 0 && image.naturalHeight > 0);
  });

  const before = await player.evaluate((node) => ({
    visibility: getComputedStyle(node).visibility,
    controls: node.controls,
    preload: node.preload,
  }));
  const posterState = await poster.evaluate((node) => ({ width: node.naturalWidth, height: node.naturalHeight }));
  if (before.visibility !== 'hidden' || before.controls || before.preload !== 'none') {
    throw new Error(`Inline video exposes native chrome before interaction: ${JSON.stringify(before)}.`);
  }
  if (posterState.width <= 0 || posterState.height <= 0) {
    throw new Error(`Inline poster did not decode: ${JSON.stringify(posterState)}.`);
  }

  await assertNoHorizontalOverflow(page, 'Inline video poster');
  await page.screenshot({ path: `${outputDir}/responsive-inline-video-poster-mobile.png`, fullPage: false });

  await start.click();
  await page.waitForFunction(() => document.querySelector('[data-s5-inline-video]')?.classList.contains('is-playing'));
  const after = await player.evaluate((node) => ({ visibility: getComputedStyle(node).visibility, controls: node.controls }));
  if (after.visibility !== 'visible' || !after.controls || await start.isVisible()) {
    throw new Error(`Inline video did not transition to native playback after user intent: ${JSON.stringify(after)}.`);
  }

  await page.close();
};

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  await validateMaterialDrawer(browser);
  await validateReaderLibrary(browser);
  await validateVideoFilters(browser);
  await validateInlineVideo(browser);
} finally {
  await browser.close();
}
