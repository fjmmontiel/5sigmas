import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = process.env.S5_PREVIEW_URL ?? 'http://127.0.0.1:8000';
const outputDir = process.env.S5_SCREENSHOT_DIR ?? 'artifacts/visual-review';

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });

const desktop = { width: 1440, height: 1100 };
const mobile = { width: 390, height: 844 };

const captures = [
  { name: 'homepage-desktop', path: '/', viewport: desktop },
  { name: 'homepage-mobile', path: '/', viewport: mobile, mobile: true },
  { name: 'homepage-dark', path: '/', viewport: desktop, colorScheme: 'dark', forcedScheme: 'slate' },
  { name: 'series-desktop', path: '/series/', viewport: desktop },
  { name: 'series-mobile', path: '/series/', viewport: mobile, mobile: true },
  { name: 'engineering-desktop', path: '/articulos-tecnicos/', viewport: desktop },
  { name: 'engineering-mobile', path: '/articulos-tecnicos/', viewport: mobile, mobile: true },
  { name: 'article-desktop', path: '/series/modelos-razonadores/03-test-time-compute/', viewport: desktop },
  { name: 'article-mobile', path: '/series/modelos-razonadores/03-test-time-compute/', viewport: mobile, mobile: true },
  { name: 'about-desktop', path: '/meta/about/', viewport: desktop },
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

  const readingLeaf = [...document.querySelectorAll('body *')].find(
    (node) => node.children.length === 0 && node.textContent.includes('Tiempo de lectura'),
  );
  const readingAncestors = [];
  let current = readingLeaf;
  for (let depth = 0; current && depth < 5; depth += 1, current = current.parentElement) {
    readingAncestors.push({
      ...rect(current),
      text: current.textContent.trim().replace(/\s+/g, ' ').slice(0, 160),
    });
  }

  const brokenImages = [...document.images]
    .filter((image) => image.complete && image.naturalWidth === 0)
    .map((image) => image.currentSrc || image.src);

  return {
    viewport: { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight },
    document: { scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight },
    body: {
      scrollWidth: document.body.scrollWidth,
      display: getComputedStyle(document.body).display,
      scheme: document.body.getAttribute('data-md-color-scheme'),
    },
    landing: landing ? rect(landing) : null,
    landingChildren: landing ? [...landing.children].map(rect) : [],
    coverChildren: [...document.querySelectorAll('.s5-cover > *')].map(rect),
    readingAncestors,
    brokenImages,
  };
};

try {
  for (const capture of captures) {
    const context = await browser.newContext({
      viewport: capture.viewport,
      deviceScaleFactor: 1,
      isMobile: capture.mobile ?? false,
      colorScheme: capture.colorScheme ?? 'light',
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    const runtimeErrors = [];

    page.on('pageerror', (error) => runtimeErrors.push(`pageerror: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error') runtimeErrors.push(`console: ${message.text()}`);
    });

    const response = await page.goto(`${baseUrl}${capture.path}`, {
      waitUntil: 'networkidle',
      timeout: 30_000,
    });
    if (!response?.ok()) {
      throw new Error(`${capture.path} returned ${response?.status() ?? 'no response'}`);
    }

    if (capture.forcedScheme) {
      await page.evaluate((scheme) => {
        document.body.setAttribute('data-md-color-scheme', scheme);
      }, capture.forcedScheme);
      await page.waitForTimeout(50);
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
    if (layout.brokenImages.length > 0) {
      throw new Error(`${capture.name} has broken images: ${layout.brokenImages.join(', ')}`);
    }
    if (capture.forcedScheme && layout.body.scheme !== capture.forcedScheme) {
      throw new Error(`${capture.name} did not apply ${capture.forcedScheme} theme`);
    }
    if (runtimeErrors.length > 0) {
      throw new Error(`${capture.name} emitted browser errors:\n${runtimeErrors.join('\n')}`);
    }

    await context.close();
  }
} finally {
  await browser.close();
}