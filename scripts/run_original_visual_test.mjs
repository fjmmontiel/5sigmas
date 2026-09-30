/**
 * Run an EXISTING reference-diagram validator through the visible reference tab.
 *
 * This is an explicit browser-navigation fixture, not a DOM visibility override:
 * the user-facing tab must be visible, clickable and selected, and its panel must
 * become visible before ANY unchanged original geometry/content assertion runs.
 * No assertion, motion setting, viewport, screenshot or error is intercepted.
 * The default guided view is tested independently by capture_series_ui_review.py.
 * Usage: NODE_OPTIONS=--import=./scripts/run_original_visual_test.mjs node scripts/<validator>.mjs
 */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const pages = new WeakSet();
const contexts = new WeakSet();
let opened = 0;
async function revealOriginal(page) {
  const tab = page.locator('[data-sx-guide] [data-sx-tab="original"]');
  if (!await tab.count()) return;
  assert.equal(await tab.count(), 1, 'Expected one unambiguous reference tab');
  await page.locator('[data-sx-guide][data-ready="true"]').waitFor({ state: 'visible' });
  assert(await tab.isVisible(), 'Reference tab must be visible to a reader');
  await tab.click();
  assert.equal(await tab.getAttribute('aria-selected'), 'true', 'Reference tab must activate');
  await page.locator('[data-sx-guide] [data-sx-panel="original"]').waitFor({ state: 'visible' });
  // These checks depend on layout. Wait for the next rendered frame after the
  // public tab handler's resize event; never change layout in the test fixture.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
  console.log('[reference-view] opened via visible tab:', new URL(page.url()).pathname);
  opened += 1;
}
function attachPage(page) {
  if (pages.has(page)) return page;
  pages.add(page);
  for (const method of ['goto', 'reload']) {
    const original = page[method].bind(page);
    page[method] = async (...arguments_) => {
      const response = await original(...arguments_);
      await revealOriginal(page);
      return response;
    };
  }
  return page;
}
function attachContext(context) {
  if (contexts.has(context)) return context;
  contexts.add(context);
  const newPage = context.newPage.bind(context);
  context.newPage = async (...arguments_) => attachPage(await newPage(...arguments_));
  return context;
}
const launch = chromium.launch.bind(chromium);
chromium.launch = async (...arguments_) => {
  const browser = await launch(...arguments_);
  const newPage = browser.newPage.bind(browser);
  const newContext = browser.newContext.bind(browser);
  browser.newPage = async (...options) => attachPage(await newPage(...options));
  browser.newContext = async (...options) => attachContext(await newContext(...options));
  return browser;
};
process.on('exit', () => console.log('[reference-view] real tab activations:', opened));
