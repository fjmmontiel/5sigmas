import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.S5_PREVIEW_URL ?? 'http://127.0.0.1:8000';
const outputDir = process.env.S5_SECURITY_OVERFLOW_DIR ?? 'artifacts/security-requalification/overflow-diagnostic';
const screenshotDir = path.join(outputDir, 'screenshots');
await mkdir(screenshotDir, { recursive: true });

const route = '/en/series/seguridad-ia/00_presentacion_serie/';
const viewport = { width: 1440, height: 1100 };
const stickyStyle = '.md-header,.md-tabs,[data-md-component="header"] { visibility: hidden !important; }';
const snapshots = [];
const failures = [];

const roundRect = (rect) => rect ? ({
  x: Math.round(rect.x * 100) / 100,
  y: Math.round(rect.y * 100) / 100,
  top: Math.round(rect.top * 100) / 100,
  right: Math.round(rect.right * 100) / 100,
  bottom: Math.round(rect.bottom * 100) / 100,
  left: Math.round(rect.left * 100) / 100,
  width: Math.round(rect.width * 100) / 100,
  height: Math.round(rect.height * 100) / 100,
}) : null;

async function snapshot(page, stage) {
  const data = await page.evaluate((stageName) => {
    const html = document.documentElement;
    const body = document.body;
    const viewportWidth = html.clientWidth;
    const describe = (node) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return {
        tag: node.tagName.toLowerCase(),
        id: node.id || null,
        className: typeof node.className === 'string' ? node.className.slice(0, 240) : null,
        role: node.getAttribute('role'),
        position: style.position,
        display: style.display,
        visibility: style.visibility,
        overflowX: style.overflowX,
        width: style.width,
        minWidth: style.minWidth,
        maxWidth: style.maxWidth,
        transform: style.transform,
        marginLeft: style.marginLeft,
        marginRight: style.marginRight,
        rect: {
          x: rect.x, y: rect.y, top: rect.top, right: rect.right,
          bottom: rect.bottom, left: rect.left, width: rect.width, height: rect.height,
        },
        text: (node.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120),
      };
    };
    const all = [...document.querySelectorAll('body *')];
    const horizontalCulprits = all
      .filter((node) => {
        const style = getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        const rect = node.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && (rect.right > viewportWidth + 4 || rect.left < -4);
      })
      .map(describe)
      .sort((a, b) => Math.max(b.rect.right - viewportWidth, -b.rect.left) - Math.max(a.rect.right - viewportWidth, -a.rect.left))
      .slice(0, 40);
    const viewportUnitCandidates = all
      .filter((node) => {
        const style = getComputedStyle(node);
        const width = style.width || '';
        return width.endsWith('px') && node.getBoundingClientRect().width > viewportWidth;
      })
      .map(describe)
      .slice(0, 40);
    const active = document.activeElement && document.activeElement !== body ? describe(document.activeElement) : null;
    return {
      stage: stageName,
      innerWidth,
      outerWidth,
      devicePixelRatio,
      scrollX,
      scrollY,
      html: { clientWidth: html.clientWidth, scrollWidth: html.scrollWidth, offsetWidth: html.offsetWidth, clientHeight: html.clientHeight, scrollHeight: html.scrollHeight },
      body: { clientWidth: body.clientWidth, scrollWidth: body.scrollWidth, offsetWidth: body.offsetWidth, clientHeight: body.clientHeight, scrollHeight: body.scrollHeight },
      active,
      horizontalCulprits,
      viewportUnitCandidates,
    };
  }, stage);
  for (const row of data.horizontalCulprits) row.rect = roundRect(row.rect);
  for (const row of data.viewportUnitCandidates) row.rect = roundRect(row.rect);
  if (data.active?.rect) data.active.rect = roundRect(data.active.rect);
  snapshots.push(data);
  return data;
}

async function isolatedCapture(root, page, stage) {
  await root.scrollIntoViewIfNeeded();
  await page.waitForTimeout(50);
  await root.screenshot({
    path: path.join(screenshotDir, `${stage}.jpg`),
    type: 'jpeg',
    quality: 82,
    animations: 'allow',
    style: stickyStyle,
  });
}

let browser;
try {
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const context = await browser.newContext({ viewport, reducedMotion: 'no-preference', deviceScaleFactor: 1, colorScheme: 'light' });
  const page = await context.newPage();
  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle', timeout: 30_000 });
  if (!response?.ok()) throw new Error(`HTTP ${response?.status() ?? 'no response'}`);
  await page.evaluate(() => document.fonts.ready);
  const root = page.locator('.secpath');
  if (await root.count() !== 1 || !await root.isVisible()) throw new Error('expected one visible .secpath');

  await snapshot(page, '00-after-navigation');
  await isolatedCapture(root, page, '01-isolated-initial');
  await snapshot(page, '01-after-isolated-initial');

  const controls = [
    ['trace', '[data-action="play"]'],
    ['reset', '[data-action="reset"]'],
    ['broad', '[data-mode-btn="unbounded"]'],
    ['bounded', '[data-mode-btn="bounded"]'],
  ];
  let index = 2;
  for (const [name, selector] of controls) {
    const button = root.locator(selector);
    await button.click();
    await page.waitForTimeout(180);
    const prefix = String(index).padStart(2, '0');
    await snapshot(page, `${prefix}-after-${name}-click`);
    await isolatedCapture(root, page, `${prefix}-${name}-isolated`);
    await snapshot(page, `${prefix}-after-${name}-isolated`);
    index += 1;
  }

  await page.evaluate(async () => {
    const step = Math.max(280, innerHeight * 0.7);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
    scrollTo(0, document.documentElement.scrollHeight);
  });
  await page.waitForTimeout(300);
  const final = await snapshot(page, '90-after-full-page-scroll');

  if (final.html.scrollWidth > final.html.clientWidth + 4 && !final.horizontalCulprits.length) {
    failures.push('Overflow is present but no ordinary element bounding box crosses the viewport; inspect pseudo/fixed/scrollbar geometry next.');
  }
  await context.close();
} catch (error) {
  failures.push(error.message);
} finally {
  if (browser) await browser.close();
}

const firstOverflow = snapshots.find((row) => row.html.scrollWidth > row.html.clientWidth + 4) ?? null;
const report = {
  schema_version: 1,
  scope: 'security-en-presentation-desktop-normal-overflow-transition',
  golden: false,
  route,
  viewport,
  threshold_px: 4,
  first_overflow_stage: firstOverflow?.stage ?? null,
  final_scroll_width: snapshots.at(-1)?.html?.scrollWidth ?? null,
  final_client_width: snapshots.at(-1)?.html?.clientWidth ?? null,
  snapshots,
  failures,
};
await writeFile(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
if (failures.length) {
  console.error(`Security overflow diagnostic completed with ${failures.length} diagnostic warning/failure(s).`);
  for (const item of failures) console.error(`- ${item}`);
} else {
  console.log(`Security overflow diagnostic captured ${snapshots.length} stages; first overflow: ${report.first_overflow_stage ?? 'none'}.`);
}
