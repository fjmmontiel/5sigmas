import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.S5_PREVIEW_URL || 'http://127.0.0.1:8000';
const siteDir = path.resolve(process.env.S5_SITE_DIR || 'site');
const outputDir = path.resolve('artifacts/visual-review/animation-density');
const highPriority = ['/series/seguridad-ia/', '/series/agentes-ia/'];

await fs.rm(outputDir, { recursive: true, force: true });
await fs.mkdir(outputDir, { recursive: true });

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}

const allHtml = (await walk(siteDir))
  .filter((file) => file.endsWith('index.html'))
  .filter((file) => file.includes(`${path.sep}series${path.sep}`) || file.includes(`${path.sep}articulos-tecnicos${path.sep}`));

function urlFromFile(file) {
  const rel = path.relative(siteDir, file).split(path.sep).join('/');
  return `/${rel.replace(/index\.html$/, '')}`;
}

function safeName(url) {
  return url.replace(/^\//, '').replace(/\/$/, '').replace(/[^a-zA-Z0-9_-]+/g, '__') || 'home';
}

async function inspectShell(shell) {
  return shell.evaluate((root) => {
    const visible = (node) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0.02 && rect.width > 0 && rect.height > 0;
    };
    const textLeaves = [...root.querySelectorAll('*')].filter((node) => {
      if (!visible(node)) return false;
      if (node.children.length) return false;
      return Boolean((node.textContent || '').trim());
    });
    const words = (root.innerText || '').trim().split(/\s+/).filter(Boolean);
    const fonts = textLeaves
      .map((node) => parseFloat(getComputedStyle(node).fontSize || '0'))
      .filter((value) => Number.isFinite(value) && value > 0);
    const rect = root.getBoundingClientRect();
    const controls = [...root.querySelectorAll('button,input,select,textarea,[role="tab"]')].filter(visible);
    return {
      words: words.length,
      textLeaves: textLeaves.length,
      minTextPx: fonts.length ? Math.min(...fonts) : null,
      width: rect.width,
      height: rect.height,
      controls: controls.length,
      buttons: [...root.querySelectorAll('button')].filter(visible).length,
      ranges: [...root.querySelectorAll('input[type="range"]')].filter(visible).length,
      tabs: [...root.querySelectorAll('[role="tab"],[data-tab]')].filter(visible).length,
    };
  });
}

async function exercise(shell) {
  const range = shell.locator('input[type="range"]:visible:not([disabled])').first();
  if (await range.count()) {
    const max = await range.getAttribute('max');
    if (max !== null) {
      await range.fill(max);
      await range.dispatchEvent('input');
      await range.dispatchEvent('change');
      await shell.page().waitForTimeout(100);
      return 'range-max';
    }
  }
  const buttons = shell.locator('button:visible:not([disabled])');
  const count = await buttons.count();
  if (count > 1) {
    const target = buttons.nth(Math.min(count - 1, 4));
    await target.click();
    await shell.page().waitForTimeout(120);
    return `button-${Math.min(count, 5)}`;
  }
  return null;
}

const browser = await chromium.launch({ headless: true });
const report = { pagesScanned: 0, animations: [], flags: [] };

try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  for (const file of allHtml) {
    const url = urlFromFile(file);
    const response = await desktop.goto(`${baseUrl}${url}`, { waitUntil: 'networkidle', timeout: 30_000 });
    if (!response?.ok()) continue;
    report.pagesScanned += 1;
    const shells = desktop.locator('.anim-brand-shell');
    const count = await shells.count();
    if (!count) continue;

    for (let index = 0; index < count; index += 1) {
      const shell = shells.nth(index);
      await shell.scrollIntoViewIfNeeded();
      const metrics = await inspectShell(shell);
      const id = `${safeName(url)}__${String(index + 1).padStart(2, '0')}`;
      await shell.screenshot({ path: path.join(outputDir, `${id}__desktop-default.png`), animations: 'disabled' });
      const state = await exercise(shell);
      if (state) {
        await shell.screenshot({ path: path.join(outputDir, `${id}__desktop-${state}.png`), animations: 'disabled' });
      }

      const flags = [];
      if (metrics.words > 65) flags.push(`dense-text:${metrics.words}`);
      if (metrics.textLeaves > 18) flags.push(`many-labels:${metrics.textLeaves}`);
      if (metrics.minTextPx !== null && metrics.minTextPx < 11) flags.push(`small-text:${metrics.minTextPx.toFixed(1)}px`);
      if (metrics.controls > 6) flags.push(`many-controls:${metrics.controls}`);
      if (metrics.height > 760) flags.push(`tall:${Math.round(metrics.height)}px`);
      if (metrics.width > 1320) flags.push(`wide:${Math.round(metrics.width)}px`);

      const entry = { url, index: index + 1, metrics, exercisedState: state, flags };
      report.animations.push(entry);
      if (flags.length) report.flags.push(entry);
    }
  }

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true });
  for (const entry of report.animations.filter((item) => highPriority.some((prefix) => item.url.startsWith(prefix)))) {
    await mobile.goto(`${baseUrl}${entry.url}`, { waitUntil: 'networkidle', timeout: 30_000 });
    const shell = mobile.locator('.anim-brand-shell').nth(entry.index - 1);
    if (!await shell.count()) continue;
    await shell.scrollIntoViewIfNeeded();
    await shell.screenshot({
      path: path.join(outputDir, `${safeName(entry.url)}__${String(entry.index).padStart(2, '0')}__mobile-default.png`),
      animations: 'disabled',
    });
  }
} finally {
  await browser.close();
}

await fs.writeFile(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`Reviewed ${report.animations.length} animations across ${report.pagesScanned} pages; ${report.flags.length} have density flags.`);
