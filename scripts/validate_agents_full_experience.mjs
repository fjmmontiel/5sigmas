#!/usr/bin/env node
/**
 * Focused Agents full-page browser evidence.
 * Technical browser gate only: screenshots are evidence for a separate manual PIXEL/PEDAGOGY review.
 * VOICE is deliberately out of scope under owner amendment 5716685049.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const output = process.env.S5_AGENTS_EXPERIENCE_DIR || 'artifacts/agents-experience';
const routes = [
  ['00_presentacion_serie', '/series/agentes-ia/00_presentacion_serie/', '/en/series/agentes-ia/00_presentacion_serie/'],
  ['01-que-es-un-agente', '/series/agentes-ia/01-que-es-un-agente/', '/en/series/agentes-ia/01-que-es-un-agente/'],
  ['02-anatomia-de-un-agente', '/series/agentes-ia/02-anatomia-de-un-agente/', '/en/series/agentes-ia/02-anatomia-de-un-agente/'],
  ['03-como-evaluar-un-agente', '/series/agentes-ia/03-como-evaluar-un-agente/', '/en/series/agentes-ia/03-como-evaluar-un-agente/'],
  ['04-seguridad-agentes', '/series/agentes-ia/04-seguridad-agentes/', '/en/series/agentes-ia/04-seguridad-agentes/'],
  ['05-de-la-demo-a-produccion', '/series/agentes-ia/05-de-la-demo-a-produccion/', '/en/series/agentes-ia/05-de-la-demo-a-produccion/'],
];
const jobs = routes.flatMap(([slug, es, en]) => [
  { slug, locale: 'es', route: es },
  { slug, locale: 'en', route: en },
]).flatMap(item => [1440, 390].flatMap(width => ['no-preference', 'reduce'].map(motion => ({ ...item, width, motion }))));

if (jobs.length !== 48) throw new Error(`Agents experience plan must contain 48 route×viewport×motion contexts; got ${jobs.length}`);
await fs.mkdir(output, { recursive: true });

function classifyRequestFailure({ errorText, phase, resourceType, priorSuccessfulResponse }) {
  const aborted = /ERR_ABORTED/i.test(errorText || '');
  const media = resourceType === 'media';
  if (aborted && phase === 'teardown') return { fatal: false, classification: 'EXPECTED_CONTEXT_TEARDOWN_ABORT' };
  if (aborted && media && priorSuccessfulResponse) return { fatal: false, classification: 'CAUSALLY_PROVEN_MEDIA_ABORT_AFTER_200_206' };
  if (aborted) return { fatal: true, classification: 'FATAL_UNPROVEN_PRE_TEARDOWN_ABORT' };
  return { fatal: true, classification: 'FATAL_NON_ABORT_REQUEST_FAILURE' };
}

function runClassifierMutations() {
  const fixtures = [
    [{ errorText: 'net::ERR_ABORTED', phase: 'teardown', resourceType: 'media', priorSuccessfulResponse: false }, false],
    [{ errorText: 'net::ERR_ABORTED', phase: 'lazy', resourceType: 'media', priorSuccessfulResponse: true }, false],
    [{ errorText: 'net::ERR_ABORTED', phase: 'lazy', resourceType: 'media', priorSuccessfulResponse: false }, true],
    [{ errorText: 'net::ERR_ABORTED', phase: 'interaction', resourceType: 'script', priorSuccessfulResponse: true }, true],
    [{ errorText: 'net::ERR_FAILED', phase: 'teardown', resourceType: 'media', priorSuccessfulResponse: true }, true],
  ];
  for (const [event, expectedFatal] of fixtures) {
    const actual = classifyRequestFailure(event).fatal;
    if (actual !== expectedFatal) throw new Error(`Request classifier mutation failed: ${JSON.stringify(event)}`);
  }
  return fixtures.length;
}
const mutationFixtures = runClassifierMutations();

function safeName(job) {
  return `${job.slug}-${job.locale}-${job.width}-${job.motion === 'reduce' ? 'reduced' : 'normal'}`;
}

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true, channel: process.env.S5_BROWSER_CHANNEL || 'chrome' });
  } catch (error) {
    throw new Error(`Codec-capable Chrome is required for Agents H.264 playback; refusing fallback. ${String(error)}`);
  }
}

const browser = await launchBrowser();
const results = [];

for (const job of jobs) {
  let context;
  let phase = 'navigation';
  const errors = [];
  const expectedAborts = [];
  const successfulResponses = new Map();
  const name = safeName(job);
  const result = {
    ...job,
    name,
    errors,
    expected_request_aborts: expectedAborts,
    h1: null,
    document_scroll_width: null,
    viewport_width: job.width,
    keyboard_focus: null,
    mobile_touch: job.width === 390 ? null : 'NOT_APPLICABLE',
    video: null,
    screenshot_start: null,
    screenshot_final: null,
    pixel_review: 'MANUAL_REQUIRED',
    pedagogy_review: 'MANUAL_REQUIRED',
  };
  try {
    context = await browser.newContext({
      viewport: { width: job.width, height: job.width === 390 ? 844 : 1000 },
      isMobile: job.width === 390,
      hasTouch: job.width === 390,
      reducedMotion: job.motion,
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    page.setDefaultNavigationTimeout(20000);

    page.on('pageerror', error => errors.push({ code: 'RUNTIME_ERROR', phase, detail: String(error) }));
    page.on('console', message => {
      if (message.type() === 'error') errors.push({ code: 'CONSOLE_ERROR', phase, detail: message.text() });
    });
    page.on('response', response => {
      const status = response.status();
      if ([200, 206].includes(status)) successfulResponses.set(response.url(), { status, phase, at: Date.now() });
      if (status >= 400) errors.push({ code: 'HTTP_RESOURCE_ERROR', phase, status, url: response.url() });
    });
    page.on('requestfailed', request => {
      const failure = request.failure()?.errorText || '';
      const prior = successfulResponses.get(request.url());
      const verdict = classifyRequestFailure({
        errorText: failure,
        phase,
        resourceType: request.resourceType(),
        priorSuccessfulResponse: Boolean(prior),
      });
      const evidence = { url: request.url(), detail: failure, phase, resourceType: request.resourceType(), prior_success: prior || null, classification: verdict.classification };
      if (verdict.fatal) errors.push({ code: 'REQUEST_FAILED', ...evidence });
      else expectedAborts.push(evidence);
    });

    await page.goto(new URL(job.route, base).href, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    const article = page.locator('article').first();
    await article.waitFor({ state: 'visible' });
    const h1 = article.locator('h1').first();
    result.h1 = (await h1.textContent() || '').trim();
    if (!result.h1) errors.push({ code: 'H1_MISSING_OR_EMPTY' });

    phase = 'lazy-traversal';
    const docHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const step = job.width === 390 ? 720 : 900;
    for (let y = 0; y < docHeight; y += step) {
      await page.evaluate(pos => window.scrollTo({ top: pos, behavior: 'instant' }), y);
      await page.waitForTimeout(35);
    }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));

    const geometry = await page.evaluate(() => {
      const root = document.documentElement;
      const body = document.body;
      const article = document.querySelector('article');
      const visible = node => {
        if (!node) return false;
        const s = getComputedStyle(node);
        return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) !== 0 && node.getClientRects().length > 0;
      };
      const bad = [];
      for (const node of article?.querySelectorAll('*') || []) {
        if (!visible(node)) continue;
        const rect = node.getBoundingClientRect();
        if (rect.width <= 1 || rect.height <= 1) continue;
        if (rect.left < -2 || rect.right > root.clientWidth + 2) {
          let current = node;
          let intentionallyScrollable = false;
          while (current && current !== article) {
            const style = getComputedStyle(current);
            if (['auto', 'scroll'].includes(style.overflowX)) { intentionallyScrollable = true; break; }
            current = current.parentElement;
          }
          if (!intentionallyScrollable) bad.push({ tag: node.tagName, className: String(node.className || '').slice(0, 120), left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) });
        }
      }
      return {
        viewport: root.clientWidth,
        scrollWidth: Math.max(root.scrollWidth, body?.scrollWidth || 0),
        articleWidth: article?.getBoundingClientRect().width || 0,
        horizontalOverflow: Math.max(root.scrollWidth, body?.scrollWidth || 0) > root.clientWidth + 2,
        overflowingNodes: bad.slice(0, 20),
      };
    });
    result.document_scroll_width = geometry.scrollWidth;
    result.geometry = geometry;
    if (geometry.horizontalOverflow) errors.push({ code: 'DOCUMENT_HORIZONTAL_OVERFLOW', geometry });
    if (geometry.overflowingNodes.length) errors.push({ code: 'UNCONTAINED_ARTICLE_OVERFLOW', nodes: geometry.overflowingNodes });

    phase = 'pixel-start';
    const startPath = path.join(output, `${name}-start.jpg`);
    await page.screenshot({ path: startPath, fullPage: true, type: 'jpeg', quality: 62 });
    result.screenshot_start = startPath;

    phase = 'keyboard-focus';
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    let focusEvidence = null;
    for (let i = 0; i < 32; i++) {
      await page.keyboard.press('Tab');
      focusEvidence = await page.evaluate(() => {
        const node = document.activeElement;
        if (!node || node === document.body || node === document.documentElement) return null;
        const r = node.getBoundingClientRect();
        const s = getComputedStyle(node);
        return {
          tag: node.tagName,
          text: (node.getAttribute('aria-label') || node.textContent || '').trim().slice(0, 100),
          visible: r.width > 0 && r.height > 0 && r.bottom >= 0 && r.top <= innerHeight,
          outline: `${s.outlineStyle} ${s.outlineWidth}`,
          boxShadow: s.boxShadow,
        };
      });
      if (focusEvidence?.visible) break;
    }
    result.keyboard_focus = focusEvidence;
    if (!focusEvidence?.visible) errors.push({ code: 'KEYBOARD_FOCUS_NOT_OBSERVED' });

    phase = 'interaction-playback';
    const video = article.locator('[data-s5-inline-video-player]').first();
    const start = article.locator('[data-s5-inline-video-start]').first();
    if (!(await video.count()) || !(await start.count())) {
      errors.push({ code: 'REQUIRED_INLINE_VIDEO_UI_MISSING' });
    } else {
      const source = video.locator('source').first();
      const src = await source.getAttribute('src');
      if (!src) errors.push({ code: 'VIDEO_SOURCE_MISSING' });
      else {
        const mediaUrl = new URL(src, page.url()).href;
        const range = await page.request.get(mediaUrl, { headers: { Range: 'bytes=0-1023' }, timeout: 8000 });
        if (![200, 206].includes(range.status())) errors.push({ code: 'VIDEO_RANGE_ERROR', status: range.status(), url: mediaUrl });
        else successfulResponses.set(mediaUrl, { status: range.status(), phase: 'interaction-preflight-range', at: Date.now() });
      }
      await start.scrollIntoViewIfNeeded();
      if (job.width === 390) {
        await start.tap();
        result.mobile_touch = 'PASS_VIDEO_START_TAP';
      } else {
        await start.click();
      }
      await video.waitFor({ state: 'visible' });
      const media = await video.evaluate(async node => {
        node.muted = true; node.volume = 0;
        await node.play().catch(() => {});
        const deadline = Date.now() + 7000;
        while (node.readyState < 1 && Date.now() < deadline) await new Promise(r => setTimeout(r, 50));
        const duration = Number(node.duration);
        let seeked = false;
        if (Number.isFinite(duration) && duration > 1) {
          node.pause();
          const target = Math.min(Math.max(.25, duration * .2), duration - .25);
          await new Promise(resolve => {
            const timer = setTimeout(resolve, 2500);
            node.addEventListener('seeked', () => { clearTimeout(timer); resolve(); }, { once: true });
            node.currentTime = target;
          });
          seeked = Math.abs(Number(node.currentTime) - target) < .75;
        }
        node.pause();
        return { duration, width: node.videoWidth, height: node.videoHeight, readyState: node.readyState, paused: node.paused, seeked };
      });
      result.video = media;
      if (!Number.isFinite(media.duration) || media.duration <= 0 || media.width <= 0 || media.height <= 0) errors.push({ code: 'VIDEO_METADATA_INVALID', media });
      if (!media.paused) errors.push({ code: 'VIDEO_PAUSE_FAILED' });
      if (media.duration > 1 && !media.seeked) errors.push({ code: 'VIDEO_SEEK_FAILED' });
    }

    const safeButtons = article.locator('button:not([data-s5-inline-video-start]):not([type="submit"]), [role="button"]:not([data-s5-inline-video-start])');
    const count = await safeButtons.count();
    for (let i = 0; i < Math.min(count, 4); i++) {
      const control = safeButtons.nth(i);
      if (!(await control.isVisible())) continue;
      try {
        await control.scrollIntoViewIfNeeded();
        if (job.width === 390) await control.tap({ timeout: 2500 });
        else await control.click({ timeout: 2500 });
        await page.waitForTimeout(80);
      } catch (error) {
        errors.push({ code: 'ARTICLE_CONTROL_INTERACTION_FAILED', index: i, detail: String(error) });
      }
    }

    phase = 'pixel-final';
    const finalPath = path.join(output, `${name}-final.jpg`);
    await page.screenshot({ path: finalPath, fullPage: true, type: 'jpeg', quality: 62 });
    result.screenshot_final = finalPath;

    if (job.width === 390 && result.mobile_touch !== 'PASS_VIDEO_START_TAP') errors.push({ code: 'MOBILE_TOUCH_NOT_PROVEN' });
  } catch (error) {
    errors.push({ code: 'CONTEXT_FATAL', phase, detail: String(error) });
  } finally {
    phase = 'teardown';
    if (context) await context.close().catch(error => errors.push({ code: 'CONTEXT_TEARDOWN_ERROR', detail: String(error) }));
  }
  result.pass = errors.length === 0;
  results.push(result);
  console.log(`AGENTS_EXPERIENCE ${name} ${result.pass ? 'PASS' : 'FAIL'} errors=${errors.length}`);
}

await browser.close();
const report = {
  contract: 'AGENTS_FULL_INTERACTION_LIFECYCLE_PIXEL_EVIDENCE_V1',
  series: 'agentes-ia',
  voice_enhancement: 'DEFERRED_OWNER_LOCAL',
  contexts: results.length,
  passing: results.filter(x => x.pass).length,
  failing: results.filter(x => !x.pass).length,
  mutation_fixtures: mutationFixtures,
  BROWSER_PASS: results.every(x => x.pass),
  PIXEL_REVIEW: 'MANUAL_REQUIRED_FROM_EXACT_SCREENSHOTS',
  PEDAGOGY_REVIEW: 'MANUAL_REQUIRED_FROM_EXACT_ARTICLE_AND_SCREENSHOTS',
  results,
};
await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ contexts: report.contexts, passing: report.passing, failing: report.failing, BROWSER_PASS: report.BROWSER_PASS, VOICE_ENHANCEMENT: report.voice_enhancement }));
if (!report.BROWSER_PASS) process.exitCode = 1;
