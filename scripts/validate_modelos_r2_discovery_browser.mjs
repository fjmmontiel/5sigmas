import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE = process.env.S5_BASE_URL || 'http://127.0.0.1:8000';
const DISCOVERY_DIR = path.resolve('discovery/modelos-razonadores');
const FAILURES = [];

const fail = (label, detail) => FAILURES.push(`${label}: ${detail}`);
const localUrl = (absolute) => `${BASE}${new URL(absolute).pathname}`;
const near = (actual, expected, tolerance = 0.9) => Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance;

async function loadSources() {
  const names = (await fs.readdir(DISCOVERY_DIR)).filter((name) => /\.(es|en)\.json$/.test(name)).sort();
  const sources = [];
  for (const name of names) {
    sources.push(JSON.parse(await fs.readFile(path.join(DISCOVERY_DIR, name), 'utf8')));
  }
  if (sources.length !== 12) throw new Error(`Expected 12 Modelos R2 discovery sources, found ${sources.length}`);
  const byLocale = new Map();
  for (const source of sources) byLocale.set(source.locale, (byLocale.get(source.locale) || 0) + 1);
  if (byLocale.get('es') !== 6 || byLocale.get('en') !== 6) {
    throw new Error(`Expected 6 ES + 6 EN sources, found ${JSON.stringify(Object.fromEntries(byLocale))}`);
  }
  return sources;
}

async function waitForMetadata(page, label) {
  try {
    return await page.locator('[data-s5-watch-player]').evaluate((video) => new Promise((resolve, reject) => {
      const snapshot = () => ({
        readyState: video.readyState,
        duration: video.duration,
        currentTime: video.currentTime,
        paused: video.paused,
        error: video.error ? { code: video.error.code, message: video.error.message } : null,
      });
      if (video.readyState >= 1) return resolve(snapshot());
      const timeout = setTimeout(() => reject(new Error(`metadata timeout; ${JSON.stringify(snapshot())}`)), 12000);
      video.addEventListener('loadedmetadata', () => {
        clearTimeout(timeout);
        resolve(snapshot());
      }, { once: true });
      video.addEventListener('error', () => {
        clearTimeout(timeout);
        reject(new Error(`media error; ${JSON.stringify(snapshot())}`));
      }, { once: true });
      video.load();
    }));
  } catch (error) {
    fail(label, `native media metadata failed: ${error.message}`);
    return null;
  }
}

async function rawContractChecks(request, source) {
  const label = source.id;
  const watch = await request.get(localUrl(source.watch_url));
  if (!watch.ok()) {
    fail(label, `watch HTTP ${watch.status()}`);
    return;
  }
  const watchHtml = await watch.text();
  if (!watchHtml.includes('id="video-transcript"')) fail(label, 'transcript missing from crawlable watch HTML');
  if (!watchHtml.includes('data-s5-video-seek=')) fail(label, 'chapter links missing from crawlable watch HTML');
  if (!watchHtml.includes('data-s5-visual-text-track')) fail(label, 'visual-text track missing from watch HTML');
  if (!watchHtml.includes('"@type":"Clip"')) fail(label, 'Clip structured data missing from watch HTML');
  if (watchHtml.includes('"@type":"SeekToAction"')) fail(label, 'legacy SeekToAction remained after curated Clip binding');
  if (/name=["']robots["'][^>]+noindex/i.test(watchHtml)) fail(label, 'watch page contains noindex');

  const article = await request.get(localUrl(source.article_url));
  if (!article.ok()) fail(label, `article HTTP ${article.status()}`);
  else {
    const articleHtml = await article.text();
    const watchPath = new URL(source.watch_url).pathname;
    if (!articleHtml.includes(watchPath)) fail(label, 'article does not link back to watch page');
    if (!articleHtml.includes('data-s5-visual-text-track')) fail(label, 'article embed missing visual-text track');
  }

  const vtt = await request.get(localUrl(source.vtt_url));
  if (!vtt.ok()) fail(label, `VTT HTTP ${vtt.status()}`);
  else {
    const text = await vtt.text();
    if (!text.startsWith('WEBVTT')) fail(label, 'VTT header missing');
    if (!text.includes(source.video_sha256)) fail(label, 'VTT not bound to exact video SHA-256');
  }

  const sitemapPath = source.locale === 'en' ? '/en/video-sitemap.xml' : '/video-sitemap.xml';
  const sitemap = await request.get(`${BASE}${sitemapPath}`);
  if (!sitemap.ok()) fail(label, `${sitemapPath} HTTP ${sitemap.status()}`);
  else {
    const text = await sitemap.text();
    const watchPath = new URL(source.watch_url).pathname;
    const videoPath = new URL(source.video_url).pathname;
    if (!text.includes(watchPath)) fail(label, 'watch route missing from video sitemap');
    if (!text.includes(videoPath)) fail(label, 'exact video route missing from video sitemap');
  }
}

async function interactiveChecks(context, source) {
  const label = source.id;
  const page = await context.newPage();
  const watchPath = new URL(source.watch_url).pathname;
  try {
    const response = await page.goto(`${BASE}${watchPath}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    if (!response?.ok()) {
      fail(label, `browser watch navigation HTTP ${response?.status() ?? 'none'}`);
      return;
    }
    const player = page.locator('[data-s5-watch-player]');
    if (await player.count() !== 1) {
      fail(label, 'expected exactly one watch player');
      return;
    }
    const meta = await waitForMetadata(page, label);
    if (!meta) return;
    if (meta.error) fail(label, `native media error ${JSON.stringify(meta.error)}`);
    const expectedDuration = source.duration_ms / 1000;
    if (!near(meta.duration, expectedDuration, 0.35)) {
      fail(label, `duration ${meta.duration} != ${expectedDuration}`);
    }

    const sourcePath = await player.locator('source[type="video/mp4"]').getAttribute('src');
    if (!sourcePath || !sourcePath.includes(new URL(source.video_url).pathname)) fail(label, 'player MP4 path diverges from exact source');

    const links = page.locator('[data-s5-video-seek]');
    if (await links.count() !== source.chapters.length) {
      fail(label, `chapter link count ${(await links.count())} != ${source.chapters.length}`);
      return;
    }
    const transcript = page.locator('#video-transcript');
    if (await transcript.count() !== 1 || !(await transcript.isVisible())) fail(label, 'visible transcript missing');
    else if (!((await transcript.innerText()).includes(source.chapters[0].cues[0].text))) fail(label, 'transcript does not contain first authored cue');

    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
    let videoObject = null;
    for (const raw of schemas) {
      try {
        const data = JSON.parse(raw);
        if (data && data['@type'] === 'VideoObject') {
          videoObject = data;
          break;
        }
      } catch { /* another schema block may be irrelevant */ }
    }
    if (!videoObject) fail(label, 'VideoObject missing in rendered DOM');
    else {
      if (videoObject.name !== source.title) fail(label, 'VideoObject name diverges from discovery source');
      if (videoObject.description !== source.description) fail(label, 'VideoObject description diverges from discovery source');
      if (!Array.isArray(videoObject.hasPart) || videoObject.hasPart.length !== source.chapters.length) fail(label, 'Clip count diverges from chapters');
      if (Array.isArray(videoObject.hasPart) && videoObject.hasPart.some((clip) => clip['@type'] !== 'Clip' || !String(clip.url || '').includes('?t='))) {
        fail(label, 'Clip temporal URL contract invalid');
      }
    }

    if (source.chapters.length > 1) {
      const target = source.chapters[1].start_ms / 1000;
      const link = links.nth(1);
      await link.click();
      try {
        await page.waitForFunction((seconds) => {
          const video = document.querySelector('[data-s5-watch-player]');
          return video && Number.isFinite(video.currentTime) && Math.abs(video.currentTime - seconds) < 1.2;
        }, target, { timeout: 5000 });
      } catch {
        fail(label, `click→seek did not reach ${target}s`);
      }
      const t = new URL(page.url()).searchParams.get('t');
      if (t !== String(target)) fail(label, `chapter URL did not persist ?t=${target}; got ${t}`);

      const playback = await player.evaluate(async (video) => {
        video.pause();
        const pausedAfterPause = video.paused;
        let playOk = false;
        try {
          await video.play();
          await new Promise((resolve) => setTimeout(resolve, 120));
          playOk = !video.paused && !video.error;
        } catch {
          playOk = false;
        }
        video.pause();
        return { pausedAfterPause, playOk, error: video.error?.code ?? null };
      });
      if (!playback.pausedAfterPause || !playback.playOk || playback.error) fail(label, `pause/replay failed ${JSON.stringify(playback)}`);

      await page.goto(`${BASE}${watchPath}?t=${target}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      const deepMeta = await waitForMetadata(page, `${label} deep-link`);
      if (deepMeta && !near(deepMeta.currentTime, target, 1.2)) fail(label, `deep-link currentTime ${deepMeta.currentTime} != ${target}`);

      if (source.chapters.length > 2) {
        const keyboardTarget = source.chapters[2].start_ms / 1000;
        const keyboardLink = page.locator('[data-s5-video-seek]').nth(2);
        await keyboardLink.focus();
        await keyboardLink.press('Enter');
        try {
          await page.waitForFunction((seconds) => {
            const video = document.querySelector('[data-s5-watch-player]');
            return video && Math.abs(video.currentTime - seconds) < 1.2;
          }, keyboardTarget, { timeout: 5000 });
        } catch {
          fail(label, `keyboard Enter did not seek to ${keyboardTarget}s`);
        }
      }
    }
  } catch (error) {
    fail(label, error.stack || error.message);
  } finally {
    await page.close();
  }
}

async function mobileReducedMotionChecks(browser, source) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: 'reduce',
  });
  await context.addInitScript(() => {
    window.__s5ScrollBehaviors = [];
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function wrapped(options) {
      window.__s5ScrollBehaviors.push(options && typeof options === 'object' ? options.behavior : null);
      return original.call(this, options);
    };
  });
  const page = await context.newPage();
  const label = `${source.id} mobile`;
  try {
    await page.goto(localUrl(source.watch_url), { waitUntil: 'domcontentloaded', timeout: 20000 });
    const meta = await waitForMetadata(page, label);
    if (!meta) return;
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 2) fail(label, `horizontal overflow ${overflow}px at 390px`);
    const links = page.locator('[data-s5-video-seek]');
    if (await links.count() < 2) {
      fail(label, 'no secondary chapter to test touch seek');
      return;
    }
    const target = source.chapters[1].start_ms / 1000;
    await links.nth(1).tap();
    try {
      await page.waitForFunction((seconds) => {
        const video = document.querySelector('[data-s5-watch-player]');
        return video && Math.abs(video.currentTime - seconds) < 1.2;
      }, target, { timeout: 5000 });
    } catch {
      fail(label, `touch tap did not seek to ${target}s`);
    }
    const behaviors = await page.evaluate(() => window.__s5ScrollBehaviors || []);
    if (!behaviors.includes('auto')) fail(label, `reduced-motion seek did not use auto scroll: ${JSON.stringify(behaviors)}`);
  } catch (error) {
    fail(label, error.stack || error.message);
  } finally {
    await page.close();
    await context.close();
  }
}

const sources = await loadSources();
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  for (const source of sources) {
    await rawContractChecks(context.request, source);
    await interactiveChecks(context, source);
  }
  await context.close();

  for (const locale of ['es', 'en']) {
    const source = sources.find((item) => item.locale === locale && item.id.includes('intro'));
    if (!source) fail(locale, 'intro source missing for mobile/reduced-motion gate');
    else await mobileReducedMotionChecks(browser, source);
  }
} finally {
  await browser.close();
}

if (FAILURES.length) {
  console.error(`Modelos R2 discovery browser gate failed (${FAILURES.length}):`);
  for (const failure of FAILURES) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`PASS: ${sources.length}/12 Modelos R2 discovery surfaces + ES/EN mobile reduced-motion playback.`);
