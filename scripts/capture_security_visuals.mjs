import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = process.env.S5_PREVIEW_URL ?? 'http://127.0.0.1:8000';
const outputDir = process.env.S5_SECURITY_SCREENSHOT_DIR ?? 'artifacts/visual-review/security';
await mkdir(outputDir, { recursive: true });

const routes = [
  { slug: '00-presentacion', path: '/series/seguridad-ia/00_presentacion_serie/', roots: ['.secpath'] },
  { slug: '01-prompt-injection', path: '/series/seguridad-ia/01-prompt-injection/', roots: ['.ctxmix', '.ragtrace', '.defsim'] },
  { slug: 'topic-prompt-injection-es', path: '/temas/prompt-injection/', lang: 'es', roots: ['.ctxmix', '.ragtrace', '.defsim'], expectText: ['La frontera se pierde dentro del contexto', 'La barrera real está antes del modelo', 'No necesitas que todas las capas sean perfectas'], forbidText: ['The boundary disappears inside the context', 'The first real barrier is retrieval', 'You do not need every layer to be perfect'] },
  { slug: 'topic-prompt-injection-en', path: '/en/temas/prompt-injection/', lang: 'en', roots: ['.ctxmix', '.ragtrace', '.defsim'], expectText: ['The boundary disappears inside the context', 'The first real barrier is retrieval', 'You do not need every layer to be perfect'], forbidText: ['La frontera se pierde dentro del contexto', 'La barrera real está antes del modelo', 'No necesitas que todas las capas sean perfectas'] },
  { slug: '02-jailbreaks', path: '/series/seguridad-ia/02-jailbreaks/', roots: ['.jbsearch', '.jbbudget', '.jbladder'] },
  { slug: '03-envenenamiento', path: '/series/seguridad-ia/03-envenenamiento/', roots: ['.memlife', '.memgov', '.memprop', '.memlayers'] },
  { slug: '04-red-teaming', path: '/series/seguridad-ia/04-red-teaming/', roots: ['.threatbuild', '.uplift3', '.causalrt', '.regloop'] },
  { slug: '05-controles-produccion', path: '/series/seguridad-ia/05-controles-produccion/', roots: ['.proddef', '.mcpbound', '.killpath', '.releasegate'] },
];

const viewports = [
  { name: 'desktop', viewport: { width: 1440, height: 1100 }, mobile: false },
  { name: 'mobile', viewport: { width: 390, height: 844 }, mobile: true },
];

const isTransientExternalFontUrl = (url) => {
  if (!url) return false;
  try {
    return new URL(url).hostname === 'fonts.gstatic.com';
  } catch {
    return false;
  }
};

const isTransientExternalFontFailure = (url, resourceType) => (
  resourceType === 'font' && isTransientExternalFontUrl(url)
);

// Chromium emits a second, URL-less console error for failed resources. HTTP and
// request failures are audited separately below with the exact URL, status and type,
// so retaining this duplicate would turn an allowed third-party font failure into a
// false positive while adding no coverage for first-party resources.
const isGenericResourceConsoleError = (text) => (
  /^Failed to load resource: the server responded with a status of \d+/.test(text)
  || /^Failed to load resource: net::ERR_/.test(text)
);

const browser = await chromium.launch({ headless: true });
const report = [];

const visible = async (locator) => await locator.evaluate((node) => {
  const style = getComputedStyle(node);
  return style.display !== 'none' && style.visibility !== 'hidden' && node.getClientRects().length > 0;
});

async function exerciseVisual(page, selector) {
  const matches = page.locator(selector);
  const matchCount = await matches.count();
  if (matchCount !== 1) throw new Error(`expected exactly one ${selector}, found ${matchCount}`);
  const root = matches.first();
  if (!await visible(root)) throw new Error(`visual ${selector} is not visible`);

  const box = await root.boundingBox();
  if (!box || box.width < 240 || box.height < 80) {
    throw new Error(`visual ${selector} has invalid bounds ${JSON.stringify(box)}`);
  }

  const diagnostics = await root.evaluate((node) => {
    const styleNode = node.querySelector('style');
    let cssRules = [];
    try {
      cssRules = styleNode?.sheet ? [...styleNode.sheet.cssRules].map((rule) => rule.cssText.slice(0, 180)) : [];
    } catch (error) {
      cssRules = [`CSSOM_ERROR: ${error.message}`];
    }
    const descendants = [...node.querySelectorAll('[class]')].slice(0, 24).map((child) => {
      const style = getComputedStyle(child);
      const bounds = child.getBoundingClientRect();
      return {
        className: child.className,
        display: style.display,
        position: style.position,
        gridTemplateColumns: style.gridTemplateColumns,
        flexDirection: style.flexDirection,
        width: Math.round(bounds.width),
        height: Math.round(bounds.height),
      };
    });
    return { cssRuleCount: cssRules.length, cssRules, descendants };
  });

  const buttons = root.locator('button');
  const count = await buttons.count();
  for (let index = 0; index < count; index += 1) {
    const button = buttons.nth(index);
    if (!await button.isVisible() || await button.isDisabled()) continue;
    await button.click();
    await page.waitForTimeout(90);
  }

  const pressed = await root.locator('button[aria-pressed]').count();
  const labels = await root.locator('button').evaluateAll((nodes) => nodes.map((node) => ({
    text: (node.textContent || '').trim(),
    aria: node.getAttribute('aria-label'),
  })));
  for (const item of labels) {
    if (!item.text && !item.aria) throw new Error(`unlabelled control inside ${selector}`);
  }

  return {
    selector,
    buttons: count,
    ariaPressedControls: pressed,
    width: Math.round(box.width),
    height: Math.round(box.height),
    diagnostics,
  };
}

try {
  for (const route of routes) {
    for (const mode of viewports) {
      const context = await browser.newContext({
        viewport: mode.viewport,
        isMobile: mode.mobile,
        deviceScaleFactor: 1,
        colorScheme: 'light',
        reducedMotion: 'no-preference',
      });
      const page = await context.newPage();
      const runtimeErrors = [];
      page.on('pageerror', (error) => runtimeErrors.push(`pageerror: ${error.message}`));
      page.on('console', (message) => {
        if (message.type() !== 'error') return;
        const text = message.text();
        if (isGenericResourceConsoleError(text)) return;
        const location = message.location();
        if (isTransientExternalFontUrl(location?.url)) return;
        const where = location?.url
          ? ` @ ${location.url}${Number.isInteger(location.lineNumber) ? `:${location.lineNumber}:${location.columnNumber}` : ''}`
          : '';
        runtimeErrors.push(`console: ${text}${where}`);
      });
      page.on('response', (response) => {
        if (response.status() < 400) return;
        const request = response.request();
        if (isTransientExternalFontFailure(response.url(), request.resourceType())) return;
        runtimeErrors.push(`http ${response.status()}: ${response.url()} [type=${request.resourceType()}]`);
      });
      page.on('requestfailed', (request) => {
        if (isTransientExternalFontFailure(request.url(), request.resourceType())) return;
        runtimeErrors.push(
          `request failed: ${request.url()} (${request.failure()?.errorText ?? 'unknown error'}) [type=${request.resourceType()}]`,
        );
      });

      const response = await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'networkidle', timeout: 30_000 });
      if (!response?.ok()) throw new Error(`${route.path} returned ${response?.status() ?? 'no response'}`);
      await page.evaluate(() => document.fonts.ready);

      if (route.lang) {
        const htmlLang = await page.locator('html').getAttribute('lang');
        if (htmlLang !== route.lang) throw new Error(`${route.path} html lang=${JSON.stringify(htmlLang)} expected ${route.lang}`);
      }
      const body = await page.locator('body').innerText();
      for (const expected of route.expectText ?? []) {
        if (!body.includes(expected)) throw new Error(`${route.path} missing visual teaching anchor ${JSON.stringify(expected)}`);
      }
      for (const forbidden of route.forbidText ?? []) {
        if (body.includes(forbidden)) throw new Error(`${route.path} locale leakage ${JSON.stringify(forbidden)}`);
      }

      const initial = await page.evaluate(() => ({
        viewportWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        brokenImages: [...document.images].filter((img) => img.complete && img.naturalWidth === 0).map((img) => img.currentSrc || img.src),
      }));
      if (initial.scrollWidth - initial.viewportWidth > 4) {
        throw new Error(`${route.slug}/${mode.name} has ${initial.scrollWidth - initial.viewportWidth}px horizontal overflow`);
      }
      if (initial.brokenImages.length) {
        throw new Error(`${route.slug}/${mode.name} has broken images: ${initial.brokenImages.join(', ')}`);
      }

      const visualMetrics = [];
      for (const selector of route.roots) visualMetrics.push(await exerciseVisual(page, selector));
      await page.waitForTimeout(350);

      const after = await page.evaluate(() => ({
        viewportWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
      }));
      if (after.scrollWidth - after.viewportWidth > 4) {
        throw new Error(`${route.slug}/${mode.name} develops ${after.scrollWidth - after.viewportWidth}px overflow after interaction`);
      }
      if (runtimeErrors.length) {
        throw new Error(`${route.slug}/${mode.name} emitted browser errors:\n${runtimeErrors.join('\n')}`);
      }

      const stem = `${route.slug}-${mode.name}`;
      await page.screenshot({ path: `${outputDir}/${stem}-full.png`, fullPage: true, animations: 'disabled' });
      for (const selector of route.roots) {
        const safeName = selector.replace(/^[.#]/, '').replace(/[^a-z0-9-]+/gi, '-');
        const root = page.locator(selector).first();
        await root.screenshot({ path: `${outputDir}/${stem}-${safeName}.png`, animations: 'disabled' });
      }
      const entry = { route: route.path, viewport: mode.name, initial, after, visuals: visualMetrics };
      report.push(entry);
      await writeFile(`${outputDir}/${stem}.json`, JSON.stringify(entry, null, 2));
      await context.close();
    }
  }
  await writeFile(`${outputDir}/report.json`, JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
