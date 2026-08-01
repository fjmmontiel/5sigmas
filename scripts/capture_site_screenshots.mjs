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
  { name: 'homepage-why-desktop', path: '/', viewport: desktop, selector: '.s5-why' },
  { name: 'homepage-why-mobile', path: '/', viewport: mobile, mobile: true, selector: '.s5-why' },
  { name: 'visuals-desktop', path: '/visuales/', viewport: desktop },
  { name: 'visuals-mobile', path: '/visuales/', viewport: mobile, mobile: true },
  { name: 'visuals-videos-desktop', path: '/visuales/', viewport: desktop, selector: '#videos' },
  { name: 'visuals-videos-mobile', path: '/visuales/', viewport: mobile, mobile: true, selector: '#videos' },
  { name: 'visuals-library-desktop', path: '/visuales/', viewport: desktop, selector: '.s5-library-head' },
  { name: 'visuals-library-mobile', path: '/visuales/', viewport: mobile, mobile: true, selector: '.s5-library-head' },
  { name: 'visuals-filtered-desktop', path: '/visuales/', viewport: desktop, selector: '.s5-library-head', topic: 'infraestructura' },
  { name: 'visuals-filtered-mobile', path: '/visuales/', viewport: mobile, mobile: true, selector: '.s5-library-head', topic: 'infraestructura' },
  { name: 'visuals-routes-desktop', path: '/visuales/', viewport: desktop, selector: '#rutas' },
  { name: 'visuals-routes-mobile', path: '/visuales/', viewport: mobile, mobile: true, selector: '#rutas' },
  { name: 'visuals-animations-desktop', path: '/visuales/', viewport: desktop, selector: '#animaciones' },
  { name: 'visuals-animations-mobile', path: '/visuales/', viewport: mobile, mobile: true, selector: '#animaciones' },
  { name: 'visuals-resume-mobile', path: '/visuales/', viewport: mobile, mobile: true, selector: '.s5-resume', seedResume: true },
  { name: 'series-desktop', path: '/series/', viewport: desktop },
  { name: 'series-mobile', path: '/series/', viewport: mobile, mobile: true },
  { name: 'engineering-desktop', path: '/articulos-tecnicos/', viewport: desktop },
  { name: 'engineering-mobile', path: '/articulos-tecnicos/', viewport: mobile, mobile: true },
  { name: 'article-desktop', path: '/series/modelos-razonadores/03-test-time-compute/', viewport: desktop },
  { name: 'article-mobile', path: '/series/modelos-razonadores/03-test-time-compute/', viewport: mobile, mobile: true },
  { name: 'reader-library-desktop', path: '/series/modelos-razonadores/03-test-time-compute/', viewport: desktop, openReader: true },
  { name: 'reader-library-mobile', path: '/series/modelos-razonadores/03-test-time-compute/', viewport: mobile, mobile: true, openReader: true },
  { name: 'reader-search-desktop', path: '/series/modelos-razonadores/03-test-time-compute/', viewport: desktop, openReader: true, readerSearch: 'multimodalidad' },
  { name: 'reader-search-mobile', path: '/series/modelos-razonadores/03-test-time-compute/', viewport: mobile, mobile: true, openReader: true, readerSearch: 'multimodalidad' },
  { name: 'about-desktop', path: '/meta/about/', viewport: desktop },
  { name: 'upcoming-desktop', path: '/proximamente/', viewport: desktop },
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
    scrollY: Math.round(window.scrollY),
    landing: landing ? rect(landing) : null,
    landingChildren: landing ? [...landing.children].map(rect) : [],
    reader: {
      bars: document.querySelectorAll('[data-s5-reader-nav]').length,
      collections: document.querySelectorAll('[data-s5-reader-collection]').length,
      openCollections: document.querySelectorAll('[data-s5-reader-collection][open]:not([hidden])').length,
      visibleCollections: [...document.querySelectorAll('[data-s5-reader-collection]')].filter((node) => !node.hidden).length,
      current: document.querySelector('.s5-reader-current strong')?.textContent.trim() ?? null,
      dialogOpen: document.querySelector('[data-s5-reader-library]')?.open ?? false,
      search: document.querySelector('[data-s5-reader-search]')?.value ?? '',
    },
    visualHub: {
      videos: document.querySelectorAll('.s5-inline-video').length,
      lazyVideos: [...document.querySelectorAll('.s5-inline-video')].filter((video) => video.preload === 'none').length,
      visibleCards: [...document.querySelectorAll('.s5-watch-grid [data-s5-topic-card]')].filter((node) => !node.hidden).length,
      filters: document.querySelectorAll('[data-s5-topic]').length,
      routes: document.querySelectorAll('.s5-route-card').length,
      animationEntries: document.querySelectorAll('.s5-lab-map a').length,
      labFeatures: document.querySelectorAll('.s5-lab-feature, .s5-lab-drawer').length,
      resumeVisible: !document.querySelector('[data-s5-resume]')?.hidden,
    },
    readingAncestors,
    brokenImages,
  };
};

const validateVisualHub = async (page) => {
  const videos = await page.locator('.s5-inline-video').count();
  if (videos !== 6) throw new Error(`visual hub expected 6 inline videos, found ${videos}`);

  const lazyVideos = await page.locator('.s5-inline-video[preload="none"]').count();
  if (lazyVideos !== videos) throw new Error(`visual hub expected all ${videos} videos to preload none, found ${lazyVideos}`);

  const animationEntries = await page.locator('.s5-lab-map a').count();
  if (animationEntries !== 3) throw new Error(`visual hub expected 3 animation entries, found ${animationEntries}`);

  const filters = await page.locator('[data-s5-topic]').count();
  if (filters !== 4) throw new Error(`visual hub expected 4 discovery filters, found ${filters}`);

  const routes = await page.locator('.s5-route-card').count();
  if (routes !== 3) throw new Error(`visual hub expected 3 guided routes, found ${routes}`);

  const routeSteps = await page.locator('.s5-route-card').evaluateAll((cards) => cards.map((card) => card.querySelectorAll('ol a').length));
  if (routeSteps.some((count) => count !== 3)) throw new Error(`each guided route must contain 3 steps: ${routeSteps.join(', ')}`);

  const resume = await page.locator('[data-s5-resume]').count();
  if (resume !== 1) throw new Error(`visual hub expected one resume surface, found ${resume}`);

  await page.locator('[data-s5-topic="infraestructura"]').click();
  const visibleInfrastructure = await page.locator('.s5-watch-grid [data-s5-topic-card]:visible').count();
  if (visibleInfrastructure !== 2) throw new Error(`infrastructure filter expected 2 cards, found ${visibleInfrastructure}`);
  await page.locator('[data-s5-topic="all"]').click();

  const sources = await page.locator('.s5-inline-video source').evaluateAll((nodes) => nodes.map((node) => node.src));
  for (const source of sources) {
    const response = await page.request.head(source);
    if (!response.ok()) throw new Error(`inline video source returned ${response.status()}: ${source}`);
  }
};

const validateReaderNavigation = async (page) => {
  const bars = await page.locator('[data-s5-reader-nav]').count();
  if (bars !== 1) throw new Error(`reader navigation expected 1 bar, found ${bars}`);

  const collections = await page.locator('[data-s5-reader-collection]').count();
  if (collections !== 7) throw new Error(`reader navigation expected 6 series plus technical notes, found ${collections}`);

  const links = await page.locator('[data-s5-reader-entry]').count();
  if (links < 30) throw new Error(`reader navigation expected at least 30 navigable contents, found ${links}`);

  const current = await page.locator('[data-s5-reader-entry][aria-current="page"]').count();
  if (current !== 1) throw new Error(`reader navigation expected one current page, found ${current}`);

  const currentCollections = await page.locator('[data-s5-reader-collection].is-current[open]').count();
  if (currentCollections !== 1) throw new Error(`reader navigation expected one open current collection, found ${currentCollections}`);

  const initiallyOpen = await page.locator('[data-s5-reader-collection][open]').count();
  if (initiallyOpen !== 1) throw new Error(`reader navigation should progressively disclose one collection, found ${initiallyOpen} open`);

  const search = await page.locator('[data-s5-reader-search]').count();
  if (search !== 1) throw new Error(`reader navigation expected one search field, found ${search}`);
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

    if (capture.seedResume) {
      await page.addInitScript(() => {
        localStorage.setItem('s5:visual-progress:v1', JSON.stringify({
          id: 'test-time-compute',
          title: 'Test-time compute',
          chapter: '/series/modelos-razonadores/03-test-time-compute/',
          currentTime: 37,
          duration: 89,
          updatedAt: Date.now(),
        }));
      });
    }

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

    if (capture.path === '/visuales/') await validateVisualHub(page);
    if (capture.path.includes('/series/modelos-razonadores/03-test-time-compute/')) await validateReaderNavigation(page);

    if (capture.forcedScheme) {
      await page.evaluate((scheme) => {
        document.body.setAttribute('data-md-color-scheme', scheme);
      }, capture.forcedScheme);
      await page.waitForTimeout(50);
    }

    if (capture.topic) {
      await page.locator(`[data-s5-topic="${capture.topic}"]`).click();
      await page.waitForTimeout(80);
    }

    if (capture.openReader) {
      await page.locator('[data-s5-reader-open]').click();
      await page.locator('[data-s5-reader-library][open]').waitFor();
      if (capture.readerSearch) {
        await page.locator('[data-s5-reader-search]').fill(capture.readerSearch);
      }
      await page.waitForTimeout(120);
    } else if (capture.selector) {
      const target = page.locator(capture.selector).first();
      if ((await target.count()) === 0) {
        throw new Error(`${capture.name} could not find ${capture.selector}`);
      }
      await target.evaluate((node) => {
        const headerOffset = window.innerWidth <= 800 ? 72 : 118;
        const top = node.getBoundingClientRect().top + window.scrollY - headerOffset;
        window.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
      });
      await page.waitForTimeout(100);
    } else {
      await page.evaluate(() => window.scrollTo(0, 0));
    }

    const layout = await page.evaluate(collectLayout);
    await writeFile(`${outputDir}/${capture.name}-layout.json`, JSON.stringify(layout, null, 2));
    console.log(`LAYOUT ${capture.name}: ${JSON.stringify(layout)}`);

    await page.screenshot({
      path: `${outputDir}/${capture.name}.png`,
      fullPage: false,
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
    if (capture.seedResume && !layout.visualHub.resumeVisible) {
      throw new Error(`${capture.name} did not expose the saved learning progress`);
    }
    if (capture.topic === 'infraestructura' && layout.visualHub.visibleCards !== 2) {
      throw new Error(`${capture.name} expected 2 filtered cards, found ${layout.visualHub.visibleCards}`);
    }
    if (capture.readerSearch && layout.reader.visibleCollections !== 1) {
      throw new Error(`${capture.name} expected one matching collection, found ${layout.reader.visibleCollections}`);
    }
    if (runtimeErrors.length > 0) {
      throw new Error(`${capture.name} emitted browser errors:\n${runtimeErrors.join('\n')}`);
    }

    await context.close();
  }
} finally {
  await browser.close();
}
