import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const baseUrl = process.env.S5_PREVIEW_URL || 'http://127.0.0.1:8000';
const outputDir = 'artifacts/visual-review';

const expectPath = async (page, path) => {
  await page.waitForURL((url) => url.pathname === path, { timeout: 15_000 });
};

const assertLibrary = async (page, { mobile = false } = {}) => {
  const library = page.locator('[data-s5-reader-direct]');
  const picker = library.locator('[data-s5-reader-series-picker]');
  const collections = library.locator('[data-s5-reader-collection]');
  const links = library.locator('[data-s5-reader-collection] a');

  if (await picker.locator('option').count() !== 7) {
    throw new Error('Reader library must expose all 6 series plus technical notes.');
  }
  if (await collections.count() !== 7) {
    throw new Error('Reader library must render one chapter panel per collection.');
  }
  if (await links.count() < 30) {
    throw new Error('Reader library does not expose the complete article catalogue.');
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

  return { library, picker };
};

const chooseCollection = async (controls, label) => {
  await controls.picker.selectOption({ label });
  const activeId = await controls.picker.inputValue();
  const panel = controls.library.locator(`[data-s5-reader-collection="${activeId}"]`);
  await panel.waitFor({ state: 'visible' });
  return panel;
};

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await desktop.goto(`${baseUrl}/series/modelos-razonadores/03-test-time-compute/`, { waitUntil: 'networkidle' });

  let controls = await assertLibrary(desktop);
  let panel = await chooseCollection(controls, 'De las cavernas a la AGI');
  await panel.locator('a[href="/series/from-cave-to-agi/00_presentacion_serie/"]').click();
  await expectPath(desktop, '/series/from-cave-to-agi/00_presentacion_serie/');

  controls = await assertLibrary(desktop);
  panel = await chooseCollection(controls, 'Multimodalidad en IA Generativa');
  await panel.locator('a[href="/series/multimodalidad-iag/03-arquitecturas/"]').click();
  await expectPath(desktop, '/series/multimodalidad-iag/03-arquitecturas/');

  controls = await assertLibrary(desktop);
  await desktop.evaluate(() => window.scrollTo(0, Math.min(1200, document.documentElement.scrollHeight - window.innerHeight)));
  await desktop.waitForTimeout(200);
  const desktopBox = await controls.library.boundingBox();
  if (!desktopBox || desktopBox.y < 130 || desktopBox.y > 155 || desktopBox.width < 175) {
    throw new Error(`Desktop reader library is not persistently usable: ${JSON.stringify(desktopBox)}`);
  }
  await desktop.screenshot({ path: `${outputDir}/reader-sidebar-desktop.png`, fullPage: false });

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await mobile.goto(`${baseUrl}/series/modelos-razonadores/03-test-time-compute/`, { waitUntil: 'networkidle' });

  controls = await assertLibrary(mobile, { mobile: true });
  panel = await chooseCollection(controls, 'IA, PIB, bienestar y energía');
  await mobile.waitForTimeout(100);
  const drawerBox = await controls.library.boundingBox();
  const horizontalScroll = await mobile.evaluate(() => window.scrollX || document.documentElement.scrollLeft || document.body.scrollLeft || 0);
  if (!drawerBox || drawerBox.x > 1 || drawerBox.width < 320) {
    throw new Error(`Mobile reader drawer is not fully usable: ${JSON.stringify(drawerBox)}`);
  }
  if (horizontalScroll !== 0) {
    throw new Error(`Mobile reader drawer shifted the page horizontally: ${horizontalScroll}px`);
  }
  await mobile.screenshot({ path: `${outputDir}/reader-sidebar-mobile.png`, fullPage: false });
} finally {
  await browser.close();
}
