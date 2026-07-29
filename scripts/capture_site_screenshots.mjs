import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const baseUrl = process.env.S5_PREVIEW_URL ?? 'http://127.0.0.1:8000';
const outputDir = process.env.S5_SCREENSHOT_DIR ?? 'artifacts/visual-review';

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });

const captures = [
  { name: 'homepage-desktop', path: '/', viewport: { width: 1440, height: 1100 } },
  { name: 'homepage-mobile', path: '/', viewport: { width: 390, height: 844 }, mobile: true },
  { name: 'series-desktop', path: '/series/', viewport: { width: 1440, height: 1100 } },
  { name: 'engineering-desktop', path: '/articulos-tecnicos/', viewport: { width: 1440, height: 1100 } },
  { name: 'article-desktop', path: '/series/modelos-razonadores/03-test-time-compute/', viewport: { width: 1440, height: 1100 } },
];

try {
  for (const capture of captures) {
    const context = await browser.newContext({
      viewport: capture.viewport,
      deviceScaleFactor: 1,
      isMobile: capture.mobile ?? false,
      colorScheme: 'light',
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    const response = await page.goto(`${baseUrl}${capture.path}`, {
      waitUntil: 'networkidle',
      timeout: 30_000,
    });
    if (!response?.ok()) {
      throw new Error(`${capture.path} returned ${response?.status() ?? 'no response'}`);
    }
    await page.screenshot({
      path: `${outputDir}/${capture.name}.png`,
      fullPage: true,
      animations: 'disabled',
    });
    await context.close();
  }
} finally {
  await browser.close();
}
