import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const baseUrl = process.env.S5_PREVIEW_URL || 'http://127.0.0.1:8000';
const outputDir = 'artifacts/visual-review';

const expectPath = async (page, path) => {
  await page.waitForURL((url) => url.pathname === path, { timeout: 15_000 });
};

const assertDirectNavigation = async (page) => {
  const direct = page.locator('[data-s5-reader-direct]');
  await direct.waitFor({ state: 'visible' });

  const series = direct.locator('[data-s5-reader-jump="series"]');
  const content = direct.locator('[data-s5-reader-jump="content"]');
  if (await series.locator('option').count() !== 7) {
    throw new Error('Direct series selector must expose all 6 series plus technical notes.');
  }
  if (await content.locator('optgroup').count() !== 7) {
    throw new Error('Direct content selector must group every collection.');
  }
  if (await content.locator('option').count() < 30) {
    throw new Error('Direct content selector does not expose the complete article library.');
  }

  return { direct, series, content };
};

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await desktop.goto(`${baseUrl}/series/modelos-razonadores/03-test-time-compute/`, { waitUntil: 'networkidle' });

  let controls = await assertDirectNavigation(desktop);
  await controls.series.selectOption('/series/from-cave-to-agi/00_presentacion_serie/');
  await expectPath(desktop, '/series/from-cave-to-agi/00_presentacion_serie/');

  controls = await assertDirectNavigation(desktop);
  await controls.content.selectOption('/series/multimodalidad-iag/03-arquitecturas/');
  await expectPath(desktop, '/series/multimodalidad-iag/03-arquitecturas/');

  controls = await assertDirectNavigation(desktop);
  await desktop.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await desktop.waitForTimeout(250);
  const desktopBox = await controls.direct.boundingBox();
  if (!desktopBox || desktopBox.y < 160 || desktopBox.y > 190) {
    throw new Error(`Direct navigation is not persistently stacked below the desktop reader bar: ${desktopBox?.y}`);
  }
  await desktop.screenshot({ path: `${outputDir}/reader-direct-desktop.png`, fullPage: false });

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await mobile.goto(`${baseUrl}/series/modelos-razonadores/03-test-time-compute/`, { waitUntil: 'networkidle' });
  controls = await assertDirectNavigation(mobile);
  await mobile.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await mobile.waitForTimeout(250);
  const mobileBox = await controls.direct.boundingBox();
  if (!mobileBox || mobileBox.y < 105 || mobileBox.y > 135) {
    throw new Error(`Direct navigation is not persistently stacked below the mobile reader bar: ${mobileBox?.y}`);
  }
  await mobile.screenshot({ path: `${outputDir}/reader-direct-mobile.png`, fullPage: false });
} finally {
  await browser.close();
}
