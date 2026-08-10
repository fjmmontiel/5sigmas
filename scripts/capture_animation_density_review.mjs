import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = (process.env.S5_PREVIEW_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const siteDir = path.resolve(process.env.S5_SITE_DIR || 'site');
const docsDir = path.resolve('docs');
const outputDir = path.resolve(process.env.S5_ANIMATION_DENSITY_DIR || 'artifacts/visual-review/animation-density');
const changedFilesPath = process.env.S5_CHANGED_FILES_FILE || '';
const highPriority = ['/series/seguridad-ia/', '/series/agentes-ia/'];
const maxDesktopCaptures = 32;
const globalVisualPrefixes = ['docs/stylesheets/', 'docs/assets/stylesheets/', 'docs/assets/javascripts/animation-shell.js', 'hooks/', 'overrides/'];
const globalVisualFiles = new Set(['main.py', 'mkdocs.yml']);
const baselineUrls = [
  '/series/seguridad-ia/01-prompt-injection/',
  '/series/agentes-ia/01-que-es-un-agente/',
  '/series/fundamentos-ia-iag/04-agi/',
  '/series/ia-pib-bienestar-energia/02-ia-tecnologia-electrica/',
  '/series/multimodalidad-iag/03-arquitecturas/',
  '/series/modelos-razonadores/03-test-time-compute/',
  '/series/datacenters-espacio/02-energia-calor-conectividad/',
];

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

function urlFromSiteFile(file) {
  const rel = path.relative(siteDir, file).split(path.sep).join('/');
  return `/${rel.replace(/index\.html$/, '')}`;
}

function urlFromSourceMarkdown(file) {
  const rel = file.replace(/^docs\//, '').replace(/\.md$/, '');
  if (!rel.startsWith('series/') && !rel.startsWith('articulos-tecnicos/')) return null;
  if (rel.endsWith('/index')) return `/${rel.slice(0, -'/index'.length)}/`;
  return `/${rel}/`;
}

function safeName(url) {
  return url.replace(/^\//, '').replace(/\/$/, '').replace(/[^a-zA-Z0-9_-]+/g, '__') || 'home';
}

async function allPublicUrls() {
  const files = (await walk(siteDir))
    .filter((file) => file.endsWith('index.html'))
    .filter((file) => file.includes(`${path.sep}series${path.sep}`) || file.includes(`${path.sep}articulos-tecnicos${path.sep}`));
  return files.map(urlFromSiteFile).sort();
}

async function affectedUrls() {
  if (!changedFilesPath) return allPublicUrls();
  let changed = [];
  try {
    changed = (await fs.readFile(changedFilesPath, 'utf8')).split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  } catch {
    return allPublicUrls();
  }
  const urls = new Set();
  for (const file of changed) {
    if (/^docs\/(series|articulos-tecnicos)\/.*\.md$/.test(file)) {
      const url = urlFromSourceMarkdown(file);
      if (url) urls.add(url);
    }
  }
  const changedSnippets = changed.filter((file) => /^docs\/snippets\/.*\.html$/.test(file)).map((file) => file.replace(/^docs\//, ''));
  if (changedSnippets.length) {
    const sourceMarkdown = (await walk(docsDir)).filter((file) => file.endsWith('.md'));
    for (const source of sourceMarkdown) {
      const text = await fs.readFile(source, 'utf8');
      if (!changedSnippets.some((snippet) => text.includes(snippet))) continue;
      const repoPath = path.relative(process.cwd(), source).split(path.sep).join('/');
      const url = urlFromSourceMarkdown(repoPath);
      if (url) urls.add(url);
    }
  }
  const globalVisualChange = changed.some((file) => globalVisualFiles.has(file) || globalVisualPrefixes.some((prefix) => file.startsWith(prefix)));
  if (globalVisualChange) baselineUrls.forEach((url) => urls.add(url));
  if (!urls.size) baselineUrls.slice(0, 3).forEach((url) => urls.add(url));
  return [...urls].sort();
}

async function openPage(page, url) {
  const response = await page.goto(`${baseUrl}${url}`, { waitUntil: 'load', timeout: 30_000 });
  if (!response?.ok()) return response;
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(40);
  return response;
}

async function inspectShell(shell) {
  return shell.evaluate((root) => {
    const visible = (node) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0.02 && rect.width > 0 && rect.height > 0;
    };
    const demoRoot = root.matches('[data-demo]') ? root : root.querySelector('[data-demo]');
    const contentRoot = demoRoot || root;
    const textLeaves = [...contentRoot.querySelectorAll('*')].filter((node) => visible(node) && node.children.length === 0 && Boolean((node.textContent || '').trim()));
    const words = (contentRoot.innerText || '').trim().split(/\s+/).filter(Boolean);
    const fonts = textLeaves.map((node) => parseFloat(getComputedStyle(node).fontSize || '0')).filter((value) => Number.isFinite(value) && value > 0);
    const rect = root.getBoundingClientRect();
    const controls = [...contentRoot.querySelectorAll('button,input,select,textarea,[role="tab"]')].filter(visible);
    return {
      demo: demoRoot?.getAttribute('data-demo') || null,
      words: words.length,
      textLeaves: textLeaves.length,
      minTextPx: fonts.length ? Math.min(...fonts) : null,
      width: rect.width,
      height: rect.height,
      controls: controls.length,
      fullscreenOff: demoRoot?.getAttribute('data-anim-fullscreen') === 'off',
    };
  });
}

function flagsFor(metrics) {
  const flags = [];
  if (metrics.words > 180) flags.push(`dense-text:${metrics.words}`);
  if (metrics.textLeaves > 32) flags.push(`many-labels:${metrics.textLeaves}`);
  if (metrics.minTextPx !== null && metrics.minTextPx < 10.5) flags.push(`small-text:${metrics.minTextPx.toFixed(1)}px`);
  if (metrics.controls > 6) flags.push(`many-controls:${metrics.controls}`);
  if (metrics.height > 1050) flags.push(`tall:${Math.round(metrics.height)}px`);
  if (metrics.width > 1320) flags.push(`wide:${Math.round(metrics.width)}px`);
  return flags;
}

function severity(metrics) {
  return Math.max(0, (metrics.words - 180) / 90)
    + Math.max(0, (metrics.textLeaves - 32) / 16)
    + Math.max(0, (10.5 - (metrics.minTextPx ?? 10.5)) / 2)
    + Math.max(0, (metrics.controls - 6) / 4)
    + Math.max(0, (metrics.height - 1050) / 600);
}

const urlsToScan = await affectedUrls();
const browser = await chromium.launch({ headless: true });
const report = { mode: changedFilesPath ? 'affected-pages' : 'full', thresholds: { words: 180, textLeaves: 32, minTextPx: 10.5, controls: 6, height: 1050 }, pagesRequested: urlsToScan, pagesScanned: 0, animations: [], flags: [], captures: [] };
try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  for (const url of urlsToScan) {
    const response = await openPage(desktop, url);
    if (!response?.ok()) continue;
    report.pagesScanned += 1;
    const shells = desktop.locator('.anim-brand-shell');
    const count = await shells.count();
    for (let index = 0; index < count; index += 1) {
      const metrics = await inspectShell(shells.nth(index));
      const flags = flagsFor(metrics);
      const entry = { url, index: index + 1, metrics, flags, severity: severity(metrics) };
      report.animations.push(entry);
      if (flags.length) report.flags.push(entry);
    }
  }

  const ranked = [...report.flags].sort((a, b) => b.severity - a.severity).slice(0, maxDesktopCaptures);
  for (const entry of ranked) {
    const response = await openPage(desktop, entry.url);
    if (!response?.ok()) continue;
    const shell = desktop.locator('.anim-brand-shell').nth(entry.index - 1);
    if (!await shell.count()) continue;
    await shell.scrollIntoViewIfNeeded();
    const id = `${safeName(entry.url)}__${String(entry.index).padStart(2, '0')}`;
    await shell.screenshot({ path: path.join(outputDir, `${id}__desktop-default.png`), animations: 'disabled' });
    report.captures.push({ url: entry.url, index: entry.index, viewport: 'desktop' });
  }

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, reducedMotion: 'reduce' });
  for (const entry of report.flags.filter((item) => highPriority.some((prefix) => item.url.startsWith(prefix)))) {
    const response = await openPage(mobile, entry.url);
    if (!response?.ok()) continue;
    const shell = mobile.locator('.anim-brand-shell').nth(entry.index - 1);
    if (!await shell.count()) continue;
    await shell.scrollIntoViewIfNeeded();
    await shell.screenshot({ path: path.join(outputDir, `${safeName(entry.url)}__${String(entry.index).padStart(2, '0')}__mobile-default.png`), animations: 'disabled' });
  }
} finally {
  await browser.close();
}
await fs.writeFile(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`Animation density ${report.mode}: ${report.animations.length} shells, ${report.flags.length} review candidates across ${report.pagesScanned}/${urlsToScan.length} pages.`);
