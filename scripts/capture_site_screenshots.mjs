import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = process.env.S5_PREVIEW_URL ?? 'http://127.0.0.1:8000';
const outputDir = process.env.S5_SCREENSHOT_DIR ?? 'artifacts/visual-review';

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

const desktop = { width: 1440, height: 1100 };
const mobile = { width: 390, height: 844 };
const articlePath = '/series/modelos-razonadores/03-test-time-compute/';

const captures = [
  { name: 'homepage-desktop', path: '/', viewport: desktop },
  { name: 'homepage-mobile', path: '/', viewport: mobile, mobile: true },
  { name: 'visuals-desktop', path: '/visuales/', viewport: desktop },
  { name: 'visuals-mobile', path: '/visuales/', viewport: mobile, mobile: true },
  { name: 'visuals-videos-desktop', path: '/visuales/', viewport: desktop, selector: '#videos' },
  { name: 'visuals-videos-mobile', path: '/visuales/', viewport: mobile, mobile: true, selector: '#videos' },
  { name: 'visuals-filtered-desktop', path: '/visuales/', viewport: desktop, selector: '.s5-library-head', filterTopic: 'infraestructura' },
  { name: 'visuals-filtered-mobile', path: '/visuales/', viewport: mobile, mobile: true, selector: '.s5-library-head', filterTopic: 'infraestructura' },
  { name: 'visuals-routes-desktop', path: '/visuales/', viewport: desktop, selector: '#rutas' },
  { name: 'visuals-routes-mobile', path: '/visuales/', viewport: mobile, mobile: true, selector: '#rutas' },
  { name: 'visuals-animations-desktop', path: '/visuales/', viewport: desktop, selector: '#animaciones' },
  { name: 'visuals-animations-mobile', path: '/visuales/', viewport: mobile, mobile: true, selector: '#animaciones' },
  { name: 'visuals-resume-mobile', path: '/visuales/', viewport: mobile, mobile: true, selector: '.s5-resume', seedResume: true },
  { name: 'article-desktop', path: articlePath, viewport: desktop },
  { name: 'article-mobile', path: articlePath, viewport: mobile, mobile: true },
  { name: 'reader-rail-desktop', path: articlePath, viewport: desktop, selector: '.s5-reader-shell' },
  { name: 'reader-rail-mobile', path: articlePath, viewport: mobile, mobile: true, selector: '.s5-reader-shell' },
  { name: 'reader-library-desktop', path: articlePath, viewport: desktop, openReader: true },
  { name: 'reader-library-mobile', path: articlePath, viewport: mobile, mobile: true, openReader: true },
  { name: 'reader-library-other-desktop', path: articlePath, viewport: desktop, openReader: true, selectSeries: 2 },
  { name: 'reader-library-other-mobile', path: articlePath, viewport: mobile, mobile: true, openReader: true, selectSeries: 2 },
  { name: 'reader-search-desktop', path: articlePath, viewport: desktop, openReader: true, readerSearch: 'multimodalidad' },
  { name: 'reader-search-mobile', path: articlePath, viewport: mobile, mobile: true, openReader: true, readerSearch: 'multimodalidad' },
  { name: 'reader-end-desktop', path: articlePath, viewport: desktop, selector: '.s5-reader-end' },
  { name: 'reader-end-mobile', path: articlePath, viewport: mobile, mobile: true, selector: '.s5-reader-end' },
  { name: 'series-desktop', path: '/series/', viewport: desktop },
  { name: 'series-mobile', path: '/series/', viewport: mobile, mobile: true },
];

const collectLayout = () => {
  const box = (selector) => {
    const node = document.querySelector(selector);
    if (!node) return null;
    const bounds = node.getBoundingClientRect();
    return {
      top: Math.round(bounds.top + window.scrollY),
      bottom: Math.round(bounds.bottom + window.scrollY),
      width: Math.round(bounds.width),
      height: Math.round(bounds.height),
    };
  };

  const brokenImages = [...document.images]
    .filter((image) => image.complete && image.naturalWidth === 0)
    .map((image) => image.currentSrc || image.src);

  return {
    viewport: { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight },
    document: { scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight },
    scrollY: Math.round(window.scrollY),
    brokenImages,
    visualHub: {
      intro: box('.s5-visual-hub__intro'),
      videos: box('#videos'),
      firstVideo: box('.s5-watch-feature video'),
      routes: box('#rutas'),
      animations: box('#animaciones'),
      videosCount: document.querySelectorAll('.s5-inline-video').length,
      lazyVideos: [...document.querySelectorAll('.s5-inline-video')].filter((video) => video.preload === 'none').length,
      visibleCards: [...document.querySelectorAll('.s5-watch-card')].filter((card) => !card.hidden).length,
      routeCards: document.querySelectorAll('.s5-route-card').length,
      routeSteps: document.querySelectorAll('.s5-route-card li').length,
      animationEntries: document.querySelectorAll('.s5-lab-map a').length,
    },
    reader: {
      h1: box('.md-content__inner h1'),
      shell: box('.s5-reader-shell'),
      topbar: box('.s5-reader-topbar'),
      rail: box('.s5-reader-rail'),
      railLinks: document.querySelectorAll('.s5-reader-rail a').length,
      currentRail: document.querySelectorAll('.s5-reader-rail a[aria-current="page"]').length,
      arrows: document.querySelectorAll('.s5-reader-arrow:not(.is-disabled)').length,
      mapOpen: document.querySelector('[data-s5-reader-library]')?.open ?? false,
      seriesTabs: document.querySelectorAll('[data-s5-series-tab]').length,
      panels: document.querySelectorAll('[data-s5-series-panel]').length,
      entries: document.querySelectorAll('[data-s5-reader-entry]').length,
      currentEntries: document.querySelectorAll('[data-s5-reader-entry][aria-current="page"]').length,
      directCollections: document.querySelectorAll('[data-s5-reader-collection]').length,
      visibleDirectCollections: [...document.querySelectorAll('[data-s5-reader-collection]')].filter((collection) => !collection.hidden).length,
      directEntries: document.querySelectorAll('[data-s5-direct-entry]').length,
      visibleDirectEntries: [...document.querySelectorAll('[data-s5-direct-entry]')].filter((entry) => !entry.hidden).length,
      currentDirectEntries: document.querySelectorAll('[data-s5-direct-entry][aria-current="page"]').length,
      directOpen: document.querySelector('[data-s5-reader-direct]')?.classList.contains('is-open') ?? false,
      end: box('.s5-reader-end'),
    },
  };
};

const validateVisualHub = async (page, viewport) => {
  const metrics = await page.evaluate(collectLayout);
  const { visualHub } = metrics;
  if (visualHub.videosCount !== 6) throw new Error(`expected 6 inline videos, found ${visualHub.videosCount}`);
  if (visualHub.lazyVideos !== 6) throw new Error(`expected all videos to preload none, found ${visualHub.lazyVideos}`);
  if (visualHub.routeCards !== 3 || visualHub.routeSteps !== 9) {
    throw new Error(`expected 3 guided routes and 9 steps, found ${visualHub.routeCards}/${visualHub.routeSteps}`);
  }
  if (visualHub.animationEntries !== 3) throw new Error(`expected 3 animation entries, found ${visualHub.animationEntries}`);

  const firstVideoOffset = visualHub.firstVideo.top - visualHub.videos.top;
  if (firstVideoOffset > 220) throw new Error(`first video starts ${firstVideoOffset}px after videos section`);
  if (viewport.width >= 1000 && visualHub.firstVideo.top > 650) {
    throw new Error(`desktop first video starts too low at ${visualHub.firstVideo.top}px`);
  }
  if (viewport.width < 800 && visualHub.firstVideo.top > 700) {
    throw new Error(`mobile first video starts too low at ${visualHub.firstVideo.top}px`);
  }

  const sources = await page.locator('.s5-inline-video source').evaluateAll((nodes) => nodes.map((node) => node.src));
  for (const source of sources) {
    const response = await page.request.head(source);
    if (!response.ok()) throw new Error(`video source returned ${response.status()}: ${source}`);
  }
};

const validateReaderNavigation = async (page) => {
  const metrics = await page.evaluate(collectLayout);
  const { reader } = metrics;
  if (reader.railLinks !== 6) throw new Error(`expected 6 current-series rail links, found ${reader.railLinks}`);
  if (reader.currentRail !== 1) throw new Error(`expected one current rail chapter, found ${reader.currentRail}`);
  if (reader.arrows !== 2) throw new Error(`expected usable previous and next actions, found ${reader.arrows}`);
  if (reader.seriesTabs !== 8 || reader.panels !== 8) {
    throw new Error(`expected 8 collections in the searchable map, found ${reader.seriesTabs}/${reader.panels}`);
  }
  if (reader.entries < 30 || reader.currentEntries !== 1) {
    throw new Error(`searchable map entries are incomplete: ${reader.entries}/${reader.currentEntries}`);
  }
  if (reader.directCollections !== 8 || reader.visibleDirectCollections !== 8) {
    throw new Error(`global library must expose all 8 collections simultaneously, found ${reader.directCollections}/${reader.visibleDirectCollections}`);
  }
  if (reader.directEntries < 30 || reader.currentDirectEntries !== 1) {
    throw new Error(`global library entries are incomplete: ${reader.directEntries}/${reader.currentDirectEntries}`);
  }
  if (!reader.end) throw new Error('expected end-of-article continuation block');
  const shellGap = reader.shell.top - reader.h1.bottom;
  if (shellGap > 42) throw new Error(`reader starts ${shellGap}px after h1`);
};

const openReaderSurface = async (page) => {
  const courseButton = page.locator('.s5-reader-course[data-s5-reader-open]');
  if (await courseButton.isVisible()) {
    await courseButton.click();
    await page.locator('[data-s5-reader-library][open]').waitFor();
    return 'map';
  }

  const drawerToggle = page.locator('[data-s5-reader-direct-open]');
  await drawerToggle.click();
  await page.locator('[data-s5-reader-direct].is-open').waitFor();
  return 'library';
};

const focusCollection = async (page, index) => {
  const dialog = page.locator('[data-s5-reader-library][open]');
  if (await dialog.count()) {
    const tab = dialog.locator('[data-s5-series-tab]').nth(index);
    const expected = await tab.getAttribute('data-s5-series-tab');
    await tab.click();
    await dialog.locator(`[data-s5-series-panel="${expected}"]:not([hidden])`).waitFor();
    return;
  }

  const collection = page.locator('[data-s5-reader-direct].is-open [data-s5-reader-collection]').nth(index);
  await collection.scrollIntoViewIfNeeded();
  await collection.waitFor({ state: 'visible' });
};

const searchReader = async (page, query) => {
  const dialogSearch = page.locator('[data-s5-reader-library][open] [data-s5-reader-search]');
  if (await dialogSearch.count()) {
    await dialogSearch.fill(query);
    await page.waitForTimeout(80);
    const selected = await page.locator('[data-s5-reader-library][open] [data-s5-series-tab][aria-selected="true"]').innerText();
    if (!selected.toLowerCase().includes(query.toLowerCase())) {
      throw new Error(`reader map selected unexpected collection: ${selected}`);
    }
    return;
  }

  const directSearch = page.locator('[data-s5-reader-direct].is-open [data-s5-reader-direct-search]');
  await directSearch.fill(query);
  await page.waitForTimeout(80);
  const visibleCollections = page.locator('[data-s5-reader-direct].is-open [data-s5-reader-collection]:not([hidden])');
  if (await visibleCollections.count() !== 1) {
    throw new Error(`global library search expected one matching collection, found ${await visibleCollections.count()}`);
  }
  const label = await visibleCollections.first().innerText();
  if (!label.toLowerCase().includes(query.toLowerCase())) {
    throw new Error(`global library search returned unexpected collection: ${label}`);
  }
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

    const response = await page.goto(`${baseUrl}${capture.path}`, { waitUntil: 'networkidle', timeout: 30_000 });
    if (!response?.ok()) throw new Error(`${capture.path} returned ${response?.status() ?? 'no response'}`);

    if (capture.path === '/visuales/') await validateVisualHub(page, capture.viewport);
    if (capture.path === articlePath) await validateReaderNavigation(page);

    if (capture.filterTopic) {
      await page.locator(`[data-s5-topic="${capture.filterTopic}"]`).click();
      const visible = await page.locator('.s5-watch-card:not([hidden])').count();
      if (visible !== 2) throw new Error(`infrastructure filter expected 2 cards, found ${visible}`);
    }

    if (capture.openReader) {
      await openReaderSurface(page);
    }

    if (capture.selectSeries !== undefined) {
      await focusCollection(page, capture.selectSeries);
    }

    if (capture.readerSearch) {
      await searchReader(page, capture.readerSearch);
    }

    if (capture.selector && !capture.openReader) {
      const target = page.locator(capture.selector).first();
      if ((await target.count()) === 0) throw new Error(`${capture.name} could not find ${capture.selector}`);
      await target.evaluate((node) => {
        const offset = window.innerWidth <= 800 ? 68 : 116;
        const top = node.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
      });
      await page.waitForTimeout(80);
    } else if (!capture.openReader) {
      await page.evaluate(() => window.scrollTo(0, 0));
    }

    const layout = await page.evaluate(collectLayout);
    await writeFile(`${outputDir}/${capture.name}-layout.json`, JSON.stringify(layout, null, 2));

    await page.screenshot({
      path: `${outputDir}/${capture.name}.png`,
      fullPage: false,
      animations: 'disabled',
    });

    const overflow = layout.document.scrollWidth - layout.viewport.width;
    if (overflow > 4) throw new Error(`${capture.name} has ${overflow}px horizontal overflow`);
    if (layout.brokenImages.length > 0) throw new Error(`${capture.name} has broken images: ${layout.brokenImages.join(', ')}`);
    if (runtimeErrors.length > 0) throw new Error(`${capture.name} emitted browser errors:\n${runtimeErrors.join('\n')}`);

    await context.close();
  }
} finally {
  await browser.close();
}
