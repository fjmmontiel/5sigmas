import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.S5_PREVIEW_URL || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/context-browser-milestone');
const timeoutMs = 10000;
const chapters = [
  '01-context-engineering-vs-prompt-engineering',
  '02-context-budgets-prioritisation-compaction-provenance',
  '03-memory-architectures-working-episodic-semantic-persistent-state',
  '04-retrieval-context-assembly-freshness-relevance-conflict-grounding',
  '05-mcp-hosts-clients-servers-tools-resources-prompts-lifecycle-trust-boundaries',
  '06-skills-plugins-subagents-hooks-context-isolation-evaluation',
];
const modes = [
  { name: 'desktop-normal', viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference', mobile: false },
  { name: 'mobile-normal', viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference', mobile: true },
  { name: 'desktop-reduced', viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', mobile: false },
  { name: 'mobile-reduced', viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', mobile: true },
];

function routes(locale, stem) {
  const prefix = locale === 'en' ? '/en' : '';
  return {
    article: `${prefix}/series/context-engineering-memory-mcp/${stem}/`,
    watch: `${prefix}/videos/series/context-engineering-memory-mcp/${stem}/`,
  };
}
function pathname(href, base) { return new URL(href, base).pathname; }
function attach(page) {
  const ev = { failures: [], consoleErrors: [], pageErrors: [], goodMedia: new Set() };
  page.on('response', r => { if (r.status() >= 200 && r.status() < 400 && /\.(mp4|webm|ogg)(\?|$)/i.test(r.url())) ev.goodMedia.add(r.url()); });
  page.on('requestfailed', r => ev.failures.push({ url: r.url(), failure: r.failure()?.errorText || 'unknown' }));
  page.on('console', m => { if (m.type() === 'error') ev.consoleErrors.push(m.text()); });
  page.on('pageerror', e => ev.pageErrors.push(String(e)));
  return ev;
}
function assertRuntime(ev, label) {
  const fatal = ev.failures.filter(x => !(x.failure.includes('ERR_ABORTED') && /\.(mp4|webm|ogg)(\?|$)/i.test(x.url) && ev.goodMedia.has(x.url)));
  if (fatal.length || ev.consoleErrors.length || ev.pageErrors.length) throw new Error(`${label}: runtime errors ${JSON.stringify({ fatal, consoleErrors: ev.consoleErrors, pageErrors: ev.pageErrors })}`);
}
async function assertPageBasics(page, locale, label) {
  const lang = (await page.locator('html').getAttribute('lang') || '').toLowerCase();
  if (!lang.startsWith(locale)) throw new Error(`${label}: html lang=${lang}`);
  const h1 = await page.locator('h1').evaluateAll(nodes => nodes.filter(n => {
    const r = n.getBoundingClientRect(); const s = getComputedStyle(n); return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
  }).map(n => (n.textContent || '').replace(/\s+/g, ' ').trim()));
  if (h1.length !== 1 || h1[0].length < 8) throw new Error(`${label}: expected one useful H1, got ${JSON.stringify(h1)}`);
  const metrics = await page.evaluate(() => ({ vw: document.documentElement.clientWidth, sw: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0), sx: window.scrollX }));
  if (metrics.sw - metrics.vw > 2 || metrics.sx !== 0) throw new Error(`${label}: horizontal overflow ${JSON.stringify(metrics)}`);
}
async function probeMedia(page, source, label) {
  if (!source) throw new Error(`${label}: media source missing`);
  const url = new URL(source, page.url()).href;
  const response = await page.request.get(url, { headers: { Range: 'bytes=0-2047' } });
  if (![200, 206].includes(response.status())) throw new Error(`${label}: media range status=${response.status()} ${url}`);
  return { url, status: response.status() };
}
async function exercise(video, label, { start = true } = {}) {
  return await video.evaluate(async (node, args) => {
    const deadline = args.timeoutMs;
    const wait = (pred, name) => new Promise((resolve, reject) => {
      const start = performance.now();
      const tick = () => { if (pred()) return resolve(); if (performance.now() - start > deadline) return reject(new Error(`timeout: ${name}`)); setTimeout(tick, 25); }; tick();
    });
    if (args.start) { try { await node.play(); } catch (_) {} await wait(() => !node.paused || node.currentTime > 0, 'playback start'); }
    await wait(() => Number.isFinite(node.duration) && node.duration > 0, 'duration');
    const duration = node.duration;
    node.pause();
    const seek = async target => { node.currentTime = target; await wait(() => !node.seeking && Math.abs(node.currentTime - target) <= 0.3, `seek ${target}`); return node.currentTime; };
    const middle = await seek(Math.min(duration * .5, Math.max(1, duration - 1)));
    const final = await seek(Math.max(0, duration - .35));
    return { duration, middle, final, paused: node.paused, readyState: node.readyState };
  }, { timeoutMs, start }).then(result => {
    if (!(result.duration >= 35 && result.duration <= 37) || result.middle < result.duration * .45 || result.final < result.duration - 1 || result.final <= result.middle || !result.paused || result.readyState < 2) {
      throw new Error(`${label}: invalid lifecycle ${JSON.stringify(result)}`);
    }
    return result;
  });
}

async function validateArticle(page, locale, stem, mode, ev) {
  const r = routes(locale, stem); const label = `${locale}/${stem}/${mode.name}/article`;
  await page.goto(`${baseUrl}${r.article}`, { waitUntil: 'networkidle' });
  await assertPageBasics(page, locale, label);
  const poster = page.locator('[data-s5-inline-video-start]'); const video = page.locator('[data-s5-inline-video-player]');
  await poster.waitFor({ state: 'visible' }); await video.waitFor({ state: 'attached' });
  if (await video.isVisible()) throw new Error(`${label}: player visible before explicit start`);
  const box = await poster.boundingBox(); if (!box || box.width < (mode.mobile ? 330 : 700)) throw new Error(`${label}: poster too small ${JSON.stringify(box)}`);
  const watchHref = await page.locator('.s5-video-embed__watch a').getAttribute('href');
  if (!watchHref || pathname(watchHref, page.url()) !== r.watch) throw new Error(`${label}: article→watch mismatch ${watchHref}`);
  const media = await probeMedia(page, await video.locator('source').getAttribute('src'), label);
  if (mode.mobile) await poster.tap(); else { await poster.focus(); await page.keyboard.press('Enter'); }
  await video.waitFor({ state: 'visible' }); const playback = await exercise(video, label, { start: true });
  await page.screenshot({ path: path.join(outDir, `${locale}-${stem}-${mode.name}.jpg`), fullPage: true, type: 'jpeg', quality: 72, animations: 'disabled' });
  assertRuntime(ev, label); return { media, playback };
}
async function validateWatch(page, locale, stem, mode, ev) {
  const r = routes(locale, stem); const label = `${locale}/${stem}/${mode.name}/watch`;
  await page.goto(`${baseUrl}${r.watch}`, { waitUntil: 'networkidle' }); await assertPageBasics(page, locale, label);
  const root = page.locator('[data-s5-video-watch]'); const video = root.locator('[data-s5-watch-player]');
  await root.waitFor({ state: 'visible' }); await video.waitFor({ state: 'visible' });
  const sourceHref = await root.locator('.s5-video-watch__source > a').getAttribute('href');
  if (!sourceHref || pathname(sourceHref, page.url()) !== r.article) throw new Error(`${label}: watch→article mismatch ${sourceHref}`);
  const media = await probeMedia(page, await video.locator('source').getAttribute('src'), label);
  const playback = await exercise(video, label, { start: true }); assertRuntime(ev, label); return { media, playback };
}

await fs.rm(outDir, { recursive: true, force: true }); await fs.mkdir(outDir, { recursive: true });
let browser; try { browser = await chromium.launch({ headless: true, channel: 'chrome' }); } catch (e) { throw new Error(`H264-capable Google Chrome required: ${e}`); }
const probe = await browser.newPage(); const codec = await probe.evaluate(() => { const v = document.createElement('video'); return { mp4: v.canPlayType('video/mp4'), avc: v.canPlayType('video/mp4; codecs="avc1.42E01E"') }; }); await probe.close();
if (!codec.mp4 || !codec.avc) { await browser.close(); throw new Error(`Chrome lacks MP4/AVC support ${JSON.stringify(codec)}`); }
const receipt = { series: 'context-engineering-memory-mcp', ownerVoiceAmendment: 5716685049, generatedAt: new Date().toISOString(), codec, contexts: [] };
try {
  for (const mode of modes) {
    const context = await browser.newContext({ viewport: mode.viewport, isMobile: mode.mobile, hasTouch: mode.mobile, reducedMotion: mode.reducedMotion });
    try {
      for (const locale of ['es', 'en']) for (const stem of chapters) {
        const articlePage = await context.newPage(); const ae = attach(articlePage); const article = await validateArticle(articlePage, locale, stem, mode, ae); await articlePage.close();
        const watchPage = await context.newPage(); const we = attach(watchPage); const watch = await validateWatch(watchPage, locale, stem, mode, we); await watchPage.close();
        receipt.contexts.push({ locale, stem, mode: mode.name, article, watch });
      }
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
receipt.routeLocaleRows = 12; receipt.articleContexts = 48; receipt.watchContexts = 48; receipt.result = 'PASS';
await fs.writeFile(path.join(outDir, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(`PASS Context article↔watch lifecycle: ${receipt.articleContexts} article + ${receipt.watchContexts} watch contexts`);
