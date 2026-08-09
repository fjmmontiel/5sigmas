import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = process.env.S5_PREVIEW_URL ?? 'http://127.0.0.1:8000';
const outputDir = process.env.S5_SECURITY_SCREENSHOT_DIR ?? 'artifacts/visual-review/security';
await mkdir(outputDir, { recursive: true });

const routes = [
  { slug: '00-presentacion', path: '/series/seguridad-ia/00_presentacion_serie/', roots: ['.secpath'] },
  { slug: '01-prompt-injection', path: '/series/seguridad-ia/01-prompt-injection/', roots: ['.ctxmix', '.ragtrace', '.defsim'] },
  { slug: '02-jailbreaks', path: '/series/seguridad-ia/02-jailbreaks/', roots: ['.jbsearch', '.jbbudget', '.jbladder'] },
  { slug: '03-envenenamiento', path: '/series/seguridad-ia/03-envenenamiento/', roots: ['.memlife', '.memgov', '.memprop', '.memlayers'] },
  { slug: '04-red-teaming', path: '/series/seguridad-ia/04-red-teaming/', roots: ['.threatbuild', '.uplift3', '.causalrt', '.regloop'] },
  { slug: '05-controles-produccion', path: '/series/seguridad-ia/05-controles-produccion/', roots: ['.proddef', '.mcpbound', '.killpath', '.releasegate'] },
];

const viewports = [
  { name: 'desktop', viewport: { width: 1440, height: 1100 }, mobile: false },
  { name: 'mobile', viewport: { width: 390, height: 844 }, mobile: true },
];

const browser = await chromium.launch({ headless: true });
const report = [];

const visible = async (locator) => await locator.evaluate((node) => {
  const style = getComputedStyle(node);
  return style.display !== 'none' && style.visibility !== 'hidden' && node.getClientRects().length > 0;
});

async function exerciseVisual(page, selector) {
  const root = page.locator(selector).first();
  if (!await root.count()) throw new Error(`missing visual ${selector}`);
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
        if (message.type() === 'error') runtimeErrors.push(`console: ${message.text()}`);
      });

      const response = await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'networkidle', timeout: 30_000 });
      if (!response?.ok()) throw new Error(`${route.path} returned ${response?.status() ?? 'no response'}`);
      await page.evaluate(() => document.fonts.ready);

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
