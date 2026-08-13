import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = process.env.S5_PREVIEW_URL ?? 'http://127.0.0.1:8000';
const outputDir = process.env.S5_SCREENSHOT_DIR ?? 'artifacts/visual-review';

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

const desktop = { width: 1440, height: 1100 };
const mobile = { width: 390, height: 844 };
const articlePath = '/series/modelos-razonadores/03-test-time-compute/';
const minimumCollections = 10;

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
  { name: 'reader-context-desktop', path: articlePath, viewport: desktop, selector: '.s5-reader-direct' },
  { name: 'reader-navigator-mobile', path: articlePath, viewport: mobile, mobile: true, selector: '.s5-reader-topbar' },
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
  const isVisible = (node) => {
    if (!node) return false;
    const style = getComputedStyle(node);
    return style.display !== 'none'
      && style.visibility !== 'hidden'
      && Number(style.opacity) !== 0
      && node.getClientRects().length > 0;
  };

  const box = (selector) => {
    const node = document.querySelector(selector);
    if (!isVisible(node)) return null;
    const bounds = node.getBoundingClientRect();
    return {
      left: Math.round(bounds.left),
      right: Math.round(bounds.right),
      top: Math.round(bounds.top + window.scrollY),
      bottom: Math.round(bounds.bottom + window.scrollY),
      width: Math.round(bounds.width),
      height: Math.round(bounds.height),
      position: getComputedStyle(node).position,
    };
  };

  const brokenImages = [...document.images]
    .filter((image) => image.complete && image.naturalWidth === 0)
    .map((image) => image.currentSrc || image.src);

  const directCollections = [...document.querySelectorAll('[data-s5-reader-collection]')];
  const directEntries = [...document.querySelectorAll('[data-s5-direct-entry]')];

  return {
    viewport: {
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
    },
    document: {
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
    },
    scrollY: Math.round(window.scrollY),
    brokenImages,
    visualHub: {
      intro: box('.s5-visual-hub__intro'),
      videos: box('#videos'),
      firstVideo: box('.s5-watch-feature video'),
      routes: box('#rutas'),
      animations: box('#animaciones'),
      videosCount: document.querySelectorAll('.s5-inline-video').length,
      lazyVideos: [...document.querySelectorAll('.s5-inline-video')]
        .filter((video) => video.preload === 'none').length,
      visibleCards: [...document.querySelectorAll('.s5-watch-card')]
        .filter((card) => !card.hidden && isVisible(card)).length,
      routeCards: document.querySelectorAll('.s5-route-card').length,
      routeSteps: document.querySelectorAll('.s5-route-card li').length,
      animationEntries: document.querySelectorAll('.s5-lab-map a').length,
    },
    reader: {
      context: box('.s5-reader-context'),
      h1: box('.md-content__inner h1'),
      content: box('.md-content'),
      topbar: box('.s5-reader-topbar'),
      direct: box('.s5-reader-direct'),
      globalTabs: document.querySelectorAll('.s5-reader-global-nav__link').length,
      visibleGlobalTabs: [...document.querySelectorAll('.s5-reader-global-nav__link')].filter(isVisible).length,
      breadcrumbsVisible: [...document.querySelectorAll('.md-path')].filter(isVisible).length,
      tagsVisible: [...document.querySelectorAll('.md-tags')].filter(isVisible).length,
      directToggleVisible: [...document.querySelectorAll('.s5-reader-direct-toggle')].filter(isVisible).length,
      railLinks: document.querySelectorAll('.s5-reader-rail a').length,
      currentRail: document.querySelectorAll('.s5-reader-rail a[aria-current="page"]').length,
      arrows: document.querySelectorAll('.s5-reader-arrow:not(.is-disabled)').length,
      mapOpen: document.querySelector('[data-s5-reader-library]')?.open ?? false,
      seriesTabs: document.querySelectorAll('[data-s5-series-tab]').length,
      panels: document.querySelectorAll('[data-s5-series-panel]').length,
      entries: document.querySelectorAll('[data-s5-reader-entry]').length,
      currentEntries: document.querySelectorAll('[data-s5-reader-entry][aria-current="page"]').length,
      directCollections: directCollections.length,
      visibleDirectCollections: directCollections.filter(isVisible).length,
      directEntries: directEntries.length,
      visibleDirectEntries: directEntries.filter(isVisible).length,
      currentDirectEntries: document.querySelectorAll('[data-s5-direct-entry][aria-current="page"]').length,
      end: box('.s5-reader-end'),
      oldReadingTimeBlocks: document.querySelectorAll('article blockquote').length
        ? [...document.querySelectorAll('article blockquote')]
          .filter((node) => /Tiempo de lectura/i.test(node.textContent || '')).length
        : 0,
    },
  };
};

const validateVisualHub = async (page, viewport) => {
  const metrics = await page.evaluate(collectLayout);
  const { visualHub } = metrics;

  if (visualHub.videosCount !== 6) {
    throw new Error(`expected 6 inline videos, found ${visualHub.videosCount}`);
  }
  if (visualHub.lazyVideos !== 6) {
    throw new Error(`expected all videos to preload none, found ${visualHub.lazyVideos}`);
  }
  if (visualHub.routeCards !== 3 || visualHub.routeSteps !== 9) {
    throw new Error(`expected 3 guided routes and 9 steps, found ${visualHub.routeCards}/${visualHub.routeSteps}`);
  }
  if (visualHub.animationEntries !== 3) {
    throw new Error(`expected 3 animation entries, found ${visualHub.animationEntries}`);
  }

  const firstVideoOffset = visualHub.firstVideo.top - visualHub.videos.top;
  if (firstVideoOffset > 220) {
    throw new Error(`first video starts ${firstVideoOffset}px after videos section`);
  }
  if (viewport.width >= 1000 && visualHub.firstVideo.top > 650) {
    throw new Error(`desktop first video starts too low at ${visualHub.firstVideo.top}px`);
  }
  if (viewport.width < 800 && visualHub.firstVideo.top > 700) {
    throw new Error(`mobile first video starts too low at ${visualHub.firstVideo.top}px`);
  }

  const sources = await page.locator('.s5-inline-video source')
    .evaluateAll((nodes) => nodes.map((node) => node.src));
  for (const source of sources) {
    const response = await page.request.head(source);
    if (!response.ok()) {
      throw new Error(`video source returned ${response.status()}: ${source}`);
    }
  }
};

const validateReader = async (page, viewport) => {
  const metrics = await page.evaluate(collectLayout);
  const { reader } = metrics;
  const desktopReader = viewport.width >= 1320;

  if (!reader.context || !reader.h1 || !reader.content || !reader.end) {
    throw new Error('reader is missing its contextual header, title, content or continuation block');
  }
  if (reader.railLinks !== 6 || reader.currentRail !== 1) {
    throw new Error(`expected 6 local chapters and one current chapter, found ${reader.railLinks}/${reader.currentRail}`);
  }
  if (reader.arrows !== 2) {
    throw new Error(`expected usable previous and next actions, found ${reader.arrows}`);
  }
  if (reader.seriesTabs < minimumCollections || reader.seriesTabs !== reader.panels) {
    throw new Error(`reader collection library is incomplete or inconsistent: ${reader.seriesTabs} tabs / ${reader.panels} panels`);
  }
  if (reader.entries < 30 || reader.currentEntries !== 1) {
    throw new Error(`searchable library entries are incomplete: ${reader.entries}/${reader.currentEntries}`);
  }
  if (reader.directCollections !== reader.seriesTabs || reader.directEntries < 30 || reader.currentDirectEntries !== 1) {
    throw new Error(`contextual library DOM is incomplete: ${reader.directCollections} collections vs ${reader.seriesTabs} tabs; ${reader.directEntries}/${reader.currentDirectEntries} entries`);
  }
  if (reader.breadcrumbsVisible || reader.tagsVisible || reader.directToggleVisible) {
    throw new Error('reader exposes duplicated breadcrumbs, tags or the legacy Biblioteca tab');
  }
  if (reader.oldReadingTimeBlocks) {
    throw new Error('reader still exposes the legacy oversized reading-time block');
  }

  if (desktopReader) {
    if (!reader.direct || reader.visibleDirectCollections !== 1) {
      throw new Error(`desktop contextual rail is incomplete: ${JSON.stringify(reader.direct)}/${reader.visibleDirectCollections}`);
    }
    if (reader.topbar) {
      throw new Error('desktop duplicates local navigation below the title');
    }
    if (reader.visibleGlobalTabs < 5) {
      throw new Error(`desktop global header exposes only ${reader.visibleGlobalTabs} navigation links`);
    }
    if (reader.content.left - reader.direct.right < 28) {
      throw new Error(`desktop rail and article are too close: ${reader.content.left - reader.direct.right}px`);
    }
  } else {
    if (reader.direct || reader.visibleDirectCollections !== 0) {
      throw new Error('compact reader still exposes the persistent desktop library');
    }
    if (!reader.topbar || reader.topbar.position !== 'sticky' || reader.topbar.height > 54) {
      throw new Error(`compact lesson navigator is invalid: ${JSON.stringify(reader.topbar)}`);
    }
  }
};

const openReaderSurface = async (page) => {
  const trigger = page.locator('[data-s5-reader-open]:visible').first();
  if (!await trigger.count()) throw new Error('could not find a visible full-library trigger');
  await trigger.click();
  await page.locator('[data-s5-reader-library][open]').waitFor();
};

const focusCollection = async (page, index) => {
  const dialog = page.locator('[data-s5-reader-library][open]');
  const tab = dialog.locator('[data-s5-series-tab]').nth(index);
  const expected = await tab.getAttribute('data-s5-series-tab');
  await tab.click();
  await dialog.locator(`[data-s5-series-panel="${expected}"]:not([hidden])`).waitFor();
};

const searchReader = async (page, query) => {
  const dialog = page.locator('[data-s5-reader-library][open]');
  const search = dialog.locator('[data-s5-reader-search]');
  await search.fill(query);
  await page.waitForTimeout(100);

  const selected = dialog.locator('[data-s5-series-tab][aria-selected="true"]');
  if (!await selected.isVisible()) {
    throw new Error('reader search did not select a matching collection');
  }
  const visibleEntries = dialog.locator('[data-s5-reader-entry]:visible');
  if (await visibleEntries.count() === 0) {
    throw new Error(`reader search returned no entries for ${query}`);
  }
};

const scrollToTarget = async (page, selector) => {
  const target = page.locator(selector).first();
  if (!await target.count()) throw new Error(`could not find ${selector}`);

  await target.evaluate((node) => {
    const style = getComputedStyle(node);
    if (style.position === 'fixed' || style.position === 'sticky') return;
    const offset = window.innerWidth <= 800 ? 68 : 76;
    const top = node.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
  });
  await page.waitForTimeout(100);
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
      if (message.type() !== 'error') return;
      const location = message.location();
      const where = location?.url
        ? ` @ ${location.url}${Number.isInteger(location.lineNumber) ? `:${location.lineNumber}:${location.columnNumber}` : ''}`
        : '';
      runtimeErrors.push(`console: ${message.text()}${where}`);
    });
    page.on('response', (response) => {
      if (response.status() >= 400) runtimeErrors.push(`http ${response.status()}: ${response.url()}`);
    });
    page.on('requestfailed', (request) => {
      runtimeErrors.push(`requestfailed: ${request.url()} (${request.failure()?.errorText || 'unknown error'})`);
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

    const response = await page.goto(`${baseUrl}${capture.path}`, {
      waitUntil: 'networkidle',
      timeout: 30_000,
    });
    if (!response?.ok()) {
      throw new Error(`${capture.path} returned ${response?.status() ?? 'no response'}`);
    }

    await page.evaluate(() => document.fonts.ready);

    if (capture.path === articlePath) await validateReader(page, capture.viewport);
    if (capture.path === '/visuales/') await validateVisualHub(page, capture.viewport);

    if (capture.filterTopic) {
      await page.locator(`[data-s5-topic="${capture.filterTopic}"]`).click();
      const visible = await page.locator('.s5-watch-card:not([hidden])').count();
      if (visible !== 2) {
        throw new Error(`infrastructure filter expected 2 cards, found ${visible}`);
      }
    }

    if (capture.openReader) await openReaderSurface(page);
    if (capture.selectSeries !== undefined) await focusCollection(page, capture.selectSeries);
    if (capture.readerSearch) await searchReader(page, capture.readerSearch);

    if (capture.selector && !capture.openReader) {
      await scrollToTarget(page, capture.selector);
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
    if (overflow > 4) {
      throw new Error(`${capture.name} has ${overflow}px horizontal overflow`);
    }
    if (layout.brokenImages.length > 0) {
      throw new Error(`${capture.name} has broken images: ${layout.brokenImages.join(', ')}`);
    }
    if (runtimeErrors.length > 0) {
      throw new Error(`${capture.name} emitted browser errors:\n${runtimeErrors.join('\n')}`);
    }

    await context.close();
  }
} finally {
  await browser.close();
}
