#!/usr/bin/env node
// Genuine production-origin, source-first browser verification and demonstration.
// No mock responses, invented routes, video compositing or LLM/provider credentials.
// The resulting MP4 is evidence of retrieval/navigation, NOT proof of actual
// 270M inference/WebGPU generation unless separate hardware tests exist.
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const origin = String(process.env.S5_SEARCH_ORIGIN || 'https://5sigmas.com').replace(/\/+$/, '');
if (new URL(origin).origin !== 'https://5sigmas.com') throw new Error('Production-origin only');
const out = path.resolve('artifacts/visual-review');
await fs.mkdir(out, { recursive: true });

function sourceLocale(url, locale) {
  const parsed = new URL(url, origin);
  return parsed.origin === new URL(origin).origin &&
    (locale === 'en' ? parsed.pathname.startsWith('/en/') : !parsed.pathname.startsWith('/en/'));
}

function candidates(graph, locale) {
  const hits = [];
  for (const item of graph.items || []) {
    if (!item || !sourceLocale(item.url, locale) || !Array.isArray(item.headings)) continue;
    for (const section of item.headings) {
      if (!section.id || !section.text || !section.excerpt || section.text.length < 15 || section.text.length > 95) continue;
      if (section.excerpt.length < 85 || section.excerpt.length > 1100) continue;
      if (!/^[a-z0-9_-]+$/i.test(section.id)) continue;
      const url = new URL(item.url);
      url.hash = section.id;
      hits.push({ text: section.text, url: url.href, title: item.title, excerpt: section.excerpt });
    }
  }
  // A technical, unambiguous heading makes a better factual demonstration.
  const preferred = hits.filter(x => /KV.cache|batch|inferen|latenc|razonam|reason|agent|prompt|modelo|model/i.test(x.text));
  return [...preferred, ...hits].slice(0, 90);
}

const browser = await chromium.launch({ headless: true });
const report = {
  origin, timestamp: new Date().toISOString(),
  proof: 'REAL_PUBLIC_SITE_AND_CANONICAL_SOURCE_FRAGMENTS',
  video_claim: 'Bilingual source retrieval and direct fragment navigation only',
  locales: [], failures: [],
};

let pathToWebm = null;
try {
  const context = await browser.newContext({
    viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1,
    recordVideo: { dir: out, size: { width: 1080, height: 1350 } },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.stack || e.message));
  for (const locale of ['es', 'en']) {
    const route = locale === 'en' ? '/en/buscar/' : '/buscar/';
    const graphPath = locale === 'en' ? '/en/agent/knowledge.json' : '/agent/knowledge.json';
    const graphResponse = await page.request.get(origin + graphPath, { timeout: 45000 });
    if (!graphResponse.ok()) throw new Error(graphPath + ' HTTP ' + graphResponse.status());
    const graph = await graphResponse.json();
    if (graph.schema_version !== 2 || graph.locale !== locale || !Array.isArray(graph.items)) {
      throw new Error(graphPath + ' has invalid knowledge graph schema/locale');
    }
    const sourceSections = candidates(graph, locale);
    if (sourceSections.length < 3) throw new Error(locale + ' lacks sufficiently described source section fragments');

    const pageResponse = await page.goto(origin + route, { waitUntil: 'domcontentloaded', timeout: 60000 });
    if (!pageResponse || pageResponse.status() !== 200) {
      throw new Error(route + ' is not HTTP 200 in production');
    }
    if (await page.locator('#s5-semantic-search').count() !== 1) {
      throw new Error(route + ' does not contain the native search UI');
    }
    await page.waitForFunction(() => {
      const button = document.querySelector('#s5-semantic-search [data-action=search]');
      return button && !button.disabled;
    }, null, { timeout: 45000 });

    const search = page.locator('#s5-search-question');
    let matched = null, resultLinks = [];
    for (const target of sourceSections.slice(0, 9)) {
      await search.fill(target.text);
      await page.locator('[data-action=search]').click();
      await page.waitForFunction(() => document.querySelectorAll('.s5-search-card a.s5-search-link').length > 0,
        null, { timeout: 45000 });
      resultLinks = await page.locator('.s5-search-card a.s5-search-link').evaluateAll(links => links.map(a => a.href));
      if (resultLinks.every(link => sourceLocale(link, locale))) {
        matched = resultLinks.find(link => link.includes('#') && sourceLocale(link, locale));
      }
      if (matched) break;
      // First-device model query may still be loading. The immediate source
      // cards are enough for the source-only claim; avoid duplicate submits.
      if (await page.locator('[data-action=search]').isDisabled()) {
        await page.waitForFunction(() => !document.querySelector('[data-action=search]').disabled,
          null, { timeout: 150000 });
      }
    }
    if (!matched) throw new Error(route + ' never returned an exact linked heading fragment');
    const relevant = new URL(matched);
    if (!sourceLocale(matched, locale)) throw new Error('Cross-language result link ' + matched);
    if (resultLinks.some(link => !sourceLocale(link, locale))) throw new Error('Mixed-language search results');
    report.locales.push({ locale, route, source_sections: sourceSections.length,
      result_count: resultLinks.length, selected_url: matched, query: await search.inputValue() });

    await page.waitForTimeout(1750);
    const linked = await page.goto(matched, { waitUntil: 'domcontentloaded', timeout: 60000 });
    if (!linked || linked.status() !== 200) throw new Error('Source deep link not HTTP 200: ' + matched);
    const deepId = decodeURIComponent(relevant.hash.slice(1));
    const exists = await page.evaluate((id) => Boolean(document.getElementById(id)), deepId);
    if (!exists) throw new Error('Linked heading missing in rendered source page: ' + matched);
    report.locales[report.locales.length - 1].rendered_heading_exists = true;
    await page.waitForTimeout(1650);
    console.log('LIVE_SEARCH_PASS ' + JSON.stringify(report.locales[report.locales.length - 1]));
  }

  // The full UI is source-first and no arbitrary browser errors should arise.
  if (pageErrors.length) throw new Error('Production page errors: ' + pageErrors.join(' | ').slice(0, 2000));
  pathToWebm = await page.video().path();
  await context.close();
} finally {
  await browser.close();
}
if (!pathToWebm) throw new Error('Playwright did not record a genuine production browser video');

const videoMp4 = path.join(out, '5sigmas-search-es-en-production.mp4');
const cmd = spawnSync('ffmpeg', [
  '-hide_banner','-loglevel','error','-y','-i',pathToWebm,'-an',
  '-c:v','libx264','-preset','medium','-crf','21','-pix_fmt','yuv420p',
  '-movflags','+faststart',videoMp4,
], { encoding: 'utf8', timeout: 180000 });
if (cmd.status !== 0) throw new Error('FFmpeg MP4 encoding failure: ' + cmd.stderr);
const stat = await fs.stat(videoMp4);
if (stat.size < 150000 || stat.size > 195 * 1024 * 1024) throw new Error('MP4 size unexpected: ' + stat.size);
report.recording = { path: videoMp4, bytes: stat.size, format: 'MP4 H264', source: 'REAL_LIVE_BROWSER_NO_MOCKS' };
await fs.writeFile(path.join(out, '5sigmas-search-es-en-production.json'),
  JSON.stringify(report, null, 2) + '\n');
console.log('REAL_PRODUCTION_DEMO_PASS ' + JSON.stringify(report));
