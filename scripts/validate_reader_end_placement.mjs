import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const baseUrl = process.env.S5_PREVIEW_URL || 'http://127.0.0.1:8000';
const outputDir = process.env.S5_SCREENSHOT_DIR || 'artifacts/visual-review';
const pagePath = '/series/ia-pib-bienestar-energia/02-ia-tecnologia-electrica/';

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
  });

  const response = await page.goto(`${baseUrl}${pagePath}`, {
    waitUntil: 'networkidle',
    timeout: 30_000,
  });
  if (!response?.ok()) {
    throw new Error(`${pagePath} returned ${response?.status() ?? 'no response'}`);
  }

  const placement = await page.evaluate(() => {
    const content = document.querySelector('article.md-content__inner');
    const continuation = document.querySelector('.s5-reader-end');
    const animation = document.querySelector('.sea2-card');
    return {
      contentFound: Boolean(content),
      continuationFound: Boolean(continuation),
      animationFound: Boolean(animation),
      directChildOfPage: continuation?.parentElement === content,
      nestedInsideAnimation: Boolean(animation?.contains(continuation)),
    };
  });

  if (!placement.contentFound || !placement.continuationFound || !placement.animationFound) {
    throw new Error(`reader placement fixture is incomplete: ${JSON.stringify(placement)}`);
  }
  if (!placement.directChildOfPage || placement.nestedInsideAnimation) {
    throw new Error(`reader continuation leaked into the animation: ${JSON.stringify(placement)}`);
  }

  const continuation = page.locator('.s5-reader-end');
  await continuation.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `${outputDir}/reader-end-after-animation-mobile.png`,
    fullPage: false,
    animations: 'disabled',
  });
} finally {
  await browser.close();
}
