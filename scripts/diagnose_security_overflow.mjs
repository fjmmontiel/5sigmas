import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.S5_PREVIEW_URL ?? 'http://127.0.0.1:8000';
const outputDir = process.env.S5_SECURITY_OVERFLOW_DIR ?? 'artifacts/security-requalification/overflow-diagnostic';
await mkdir(outputDir, { recursive: true });

const route = '/en/series/seguridad-ia/00_presentacion_serie/';
const viewport = { width: 1440, height: 1100 };
const failures = [];
const checkpoints = [];

function classifyRuntime(events) {
  return events.filter((event) => !(
    event.type === 'requestfailed'
    && event.phase === 'teardown'
    && /ERR_ABORTED/i.test(event.errorText ?? '')
  ));
}

async function layoutSnapshot(page, checkpoint) {
  const snapshot = await page.evaluate((checkpointName) => {
    const doc = document.documentElement;
    const body = document.body;
    const viewportWidth = doc.clientWidth;
    const describe = (node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return {
        tag: node.tagName?.toLowerCase() ?? null,
        id: node.id || null,
        className: typeof node.className === 'string' ? node.className.slice(0, 240) : null,
        role: node.getAttribute?.('role') ?? null,
        ariaLabel: node.getAttribute?.('aria-label') ?? null,
        rect: {
          left: Number(rect.left.toFixed(2)),
          right: Number(rect.right.toFixed(2)),
          top: Number(rect.top.toFixed(2)),
          bottom: Number(rect.bottom.toFixed(2)),
          width: Number(rect.width.toFixed(2)),
          height: Number(rect.height.toFixed(2)),
        },
        position: style.position,
        display: style.display,
        visibility: style.visibility,
        overflowX: style.overflowX,
        whiteSpace: style.whiteSpace,
        width: style.width,
        minWidth: style.minWidth,
        maxWidth: style.maxWidth,
        transform: style.transform,
        translate: style.translate,
        marginLeft: style.marginLeft,
        marginRight: style.marginRight,
        text: (node.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 180),
        clientWidth: node.clientWidth,
        scrollWidth: node.scrollWidth,
      };
    };

    const all = [...document.querySelectorAll('*')];
    const visible = all.filter((node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && rect.width > 0
        && rect.height > 0;
    });
    const overflowers = visible
      .filter((node) => {
        const rect = node.getBoundingClientRect();
        return rect.right > viewportWidth + 4 || rect.left < -4;
      })
      .map(describe)
      .sort((a, b) => Math.max(b.rect.right - viewportWidth, -b.rect.left) - Math.max(a.rect.right - viewportWidth, -a.rect.left));
    const internalOverflow = visible
      .filter((node) => node.scrollWidth > node.clientWidth + 4)
      .map(describe)
      .sort((a, b) => (b.scrollWidth - b.clientWidth) - (a.scrollWidth - a.clientWidth))
      .slice(0, 60);
    const wideViewportUnits = visible
      .filter((node) => {
        const style = getComputedStyle(node);
        return style.width.includes('px') && node.getBoundingClientRect().width >= window.innerWidth - 1;
      })
      .map(describe)
      .slice(0, 60);

    return {
      checkpoint: checkpointName,
      windowInnerWidth: window.innerWidth,
      windowOuterWidth: window.outerWidth,
      devicePixelRatio: window.devicePixelRatio,
      documentClientWidth: doc.clientWidth,
      documentScrollWidth: doc.scrollWidth,
      bodyClientWidth: body?.clientWidth ?? null,
      bodyScrollWidth: body?.scrollWidth ?? null,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      overflowers,
      internalOverflow,
      wideViewportUnits,
    };
  }, checkpoint);
  checkpoints.push(snapshot);
  return snapshot;
}

let browser;
let context;
const runtimeEvents = [];
let phase = 'launch';
try {
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  context = await browser.newContext({
    viewport,
    reducedMotion: 'no-preference',
    colorScheme: 'light',
  });
  const page = await context.newPage();
  let seq = 0;
  const pushRuntime = (event) => runtimeEvents.push({ seq: ++seq, phase, ...event });
  page.on('pageerror', (error) => pushRuntime({ type: 'pageerror', detail: String(error) }));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (/^Failed to load resource:/.test(text)) return;
    pushRuntime({ type: 'console', detail: text, location: message.location() });
  });
  page.on('requestfailed', (request) => pushRuntime({
    type: 'requestfailed',
    resourceType: request.resourceType(),
    url: request.url(),
    errorText: request.failure()?.errorText ?? 'unknown',
  }));
  page.on('response', (response) => {
    if (response.status() >= 400) pushRuntime({ type: 'http', status: response.status(), url: response.url() });
  });

  phase = 'navigation';
  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle', timeout: 30_000 });
  if (!response?.ok()) throw new Error(`HTTP ${response?.status() ?? 'no response'}`);
  await page.evaluate(() => document.fonts.ready);
  await layoutSnapshot(page, 'after-navigation');

  const root = page.locator('.secpath');
  if (await root.count() !== 1 || !await root.isVisible()) throw new Error('Expected one visible .secpath');

  phase = 'root-initial-scroll';
  await root.scrollIntoViewIfNeeded();
  await page.waitForTimeout(180);
  await layoutSnapshot(page, 'after-root-scroll');

  const buttons = root.locator('button:visible:not([disabled])');
  const buttonCount = await buttons.count();
  for (let index = 0; index < buttonCount; index += 1) {
    phase = `control-${index + 1}`;
    const button = buttons.nth(index);
    const label = (((await button.innerText()) || '').trim() || await button.getAttribute('aria-label') || `control-${index + 1}`).slice(0, 80);
    await button.click();
    await page.waitForTimeout(180);
    await root.scrollIntoViewIfNeeded();
    await layoutSnapshot(page, `after-control-${index + 1}-${label}`);
  }

  phase = 'full-page-scroll';
  await page.evaluate(async () => {
    const step = Math.max(280, innerHeight * 0.7);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
    scrollTo(0, document.documentElement.scrollHeight);
  });
  await page.waitForTimeout(300);
  const finalLayout = await layoutSnapshot(page, 'after-full-page-scroll');

  if (finalLayout.documentScrollWidth > finalLayout.documentClientWidth + 4) {
    failures.push(`Overflow remains: ${finalLayout.documentClientWidth} -> ${finalLayout.documentScrollWidth}`);
  }

  phase = 'teardown';
  await context.close();
  context = null;
} catch (error) {
  failures.push(error.message);
} finally {
  if (context) {
    phase = 'teardown';
    try { await context.close(); } catch (error) { runtimeEvents.push({ type: 'context-close', phase, detail: String(error) }); }
  }
  if (browser) await browser.close();
}

const runtimeUnexpected = classifyRuntime(runtimeEvents);
if (runtimeUnexpected.length) failures.push(`runtime/resource errors: ${JSON.stringify(runtimeUnexpected)}`);
const report = {
  schema_version: 1,
  scope: 'security-en-presentation-desktop-normal-overflow-diagnostic',
  route,
  viewport,
  browser_channel: 'chrome',
  golden: false,
  failures,
  runtimeEvents,
  runtimeUnexpected,
  checkpoints,
};
await writeFile(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ failures, checkpoints: checkpoints.map((row) => ({ checkpoint: row.checkpoint, documentClientWidth: row.documentClientWidth, documentScrollWidth: row.documentScrollWidth, overflowers: row.overflowers.length })) }));
if (failures.length) process.exit(1);
