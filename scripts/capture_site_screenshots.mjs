import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

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

const collectLayout = () => {
  const landing = document.querySelector('.s5-landing');
  const rect = (node) => {
    const bounds = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return {
      tag: node.tagName,
      className: node.className,
      display: style.display,
      position: style.position,
      width: Math.round(bounds.width),
      height: Math.round(bounds.height),
      left: Math.round(bounds.left),
      top: Math.round(bounds.top),
      scrollWidth: node.scrollWidth,
    };
  };

  return {
    viewport: { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight },
    document: { scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight },
    body: { scrollWidth: document.body.scrollWidth, display: getComputedStyle(document.body).display },
    landing: landing ? rect(landing) : null,
    landingChildren: landing ? [...landing.children].map(rect) : [],
    coverChildren: [...document.querySelectorAll('.s5-cover > *')].map(rect),
  };
};

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

    const layout = await page.evaluate(collectLayout);
    await writeFile(`${outputDir}/${capture.name}-layout.json`, JSON.stringify(layout, null, 2));
    console.log(`LAYOUT ${capture.name}: ${JSON.stringify(layout)}`);

    await page.screenshot({
      path: `${outputDir}/${capture.name}.png`,
      fullPage: true,
      animations: 'disabled',
    });

    const overflow = layout.document.scrollWidth - layout.viewport.width;
    if (overflow > 4) {
      throw new Error(`${capture.name} has ${overflow}px of horizontal overflow`);
    }

    await context.close();
  }
} finally {
  await browser.close();
}
