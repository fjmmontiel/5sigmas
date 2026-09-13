#!/usr/bin/env node
/** Diagnostic, not a GOLDEN or pedagogy certificate. No publishing actions. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const reportPath = process.env.S5_EXPERIENCE_REPORT || 'artifacts/series-experience/report.json';
const output = 'artifacts/series-experience';
const inventory = JSON.parse(await fs.readFile(reportPath, 'utf8'));
if (!Array.isArray(inventory.pages) || !inventory.pages.length) throw new Error('No independent route inventory');
await fs.mkdir(output, { recursive: true });
const jobs = inventory.pages.flatMap(item => [1440, 390].flatMap(width => ['no-preference', 'reduce'].map(motion => ({ ...item, width, motion }))));
const results = [];
const browser = await chromium.launch({ headless: true });
let next = 0;

async function inspect(job) {
  const context = await browser.newContext({ viewport: { width: job.width, height: job.width === 390 ? 844 : 1000 }, isMobile: job.width === 390, hasTouch: job.width === 390, reducedMotion: job.motion });
  const page = await context.newPage();
  const errors = [];
  const result = { route: job.route, locale: job.locale, width: job.width, motion: job.motion, errors, pixel_review: 'PENDING', pedagogy_review: 'PENDING', interaction_review: 'NOT_RUN', playback_review: 'NOT_RUN' };
  // Deliberately retain listeners until the page closes, including lazy loads.
  page.on('pageerror', error => errors.push({ code: 'RUNTIME_ERROR', detail: String(error) }));
  page.on('response', response => { if (response.status() >= 400) errors.push({ code: 'HTTP_RESOURCE_ERROR', status: response.status(), url: response.url() }); });
  page.on('requestfailed', request => { if (!String(request.failure()?.errorText).includes('ERR_ABORTED')) errors.push({ code: 'REQUEST_FAILED', url: request.url(), detail: request.failure()?.errorText }); });
  try {
    const response = await page.goto(new URL(job.route, base).href, { waitUntil: 'domcontentloaded', timeout: 45000 });
    if (!response?.ok()) errors.push({ code: 'PAGE_HTTP_ERROR', status: response?.status() });
    await page.evaluate(async () => { await Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 1500))]); });
    // Traverse the complete page to exercise lazy loading, not only its hero.
    await page.evaluate(async () => {
      const height = document.documentElement.scrollHeight;
      for (let y = 0; y < height; y += innerHeight) { scrollTo(0, y); await new Promise(resolve => setTimeout(resolve, 25)); }
      scrollTo(0, 0);
    });
    await page.waitForTimeout(300);
    result.dom = await page.evaluate(() => {
      const root = document.querySelector('article.md-content__inner') || document.querySelector('article');
      if (!root) return { missing_article: true };
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const parts = [];
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (!node.parentElement?.closest('script,style,pre,code,math,annotation,mjx-container,.katex')) parts.push(node.textContent || '');
      }
      const prose = parts.join(' ');
      const tex = prose.match(/\\(?:frac|text|tau|pi|Delta|sum|prod|begin|end|lambda|mathbb|mathrm|mathbf|subseteq|land|min|max|mid|theta|sigma|alpha|beta)\b|\\[\[\]]|\$\$/g) || [];
      const escapedSnippet = [...root.querySelectorAll('pre,code')].some(node => /include_html\(|<\s*(?:section|svg|style)\b[^\n]*(?:s5v|anim-|viewBox|data-anim)/i.test(node.textContent || ''));
      const visualLabels = [...root.querySelectorAll('svg text')].flatMap(node => {
        const rect = node.getBoundingClientRect();
        const matrix = node.getScreenCTM();
        if (!rect.width || !rect.height || !matrix) return [];
        return [{ label: node.textContent?.trim().slice(0, 100), px: Number((parseFloat(getComputedStyle(node).fontSize) * Math.hypot(matrix.c, matrix.d)).toFixed(2)) }];
      });
      const pannable = [...root.querySelectorAll('div')].filter(node => ['auto', 'scroll'].includes(getComputedStyle(node).overflowX) && node.scrollWidth > node.clientWidth + 2 && node.querySelector('svg')).map(node => ({ class: node.className, viewport: node.clientWidth, content: node.scrollWidth }));
      return {
        lang: document.documentElement.lang,
        video_count: root.querySelectorAll('video').length,
        native_math_count: root.querySelectorAll('math').length,
        raw_tex_markers: [...new Set(tex)],
        escaped_snippet: escapedSnippet || /\{\{\s*include_html/.test(prose),
        page_overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        broken_images: [...root.querySelectorAll('img')].filter(image => image.complete && !image.naturalWidth).map(image => image.currentSrc || image.src),
        label_review_candidates: visualLabels.filter(label => label.px < 12),
        minimum_svg_label_px: visualLabels.length ? Math.min(...visualLabels.map(label => label.px)) : null,
        pannable_visuals: pannable,
        animation_count: root.getAnimations({ subtree: true }).length,
        visual_control_count: root.querySelectorAll('.s5v button, .anim-brand-shell button, [role="tab"], input[type="range"]').length,
      };
    });
    if (result.dom.missing_article) errors.push({ code: 'ARTICLE_MISSING' });
    else {
      if (!result.dom.lang.toLowerCase().startsWith(job.locale)) errors.push({ code: 'LOCALE_WRONG' });
      if (!result.dom.video_count) errors.push({ code: 'VIDEO_NOT_RENDERED' });
      if (result.dom.raw_tex_markers.length) errors.push({ code: 'RAW_TEX_VISIBLE', markers: result.dom.raw_tex_markers });
      if (result.dom.escaped_snippet) errors.push({ code: 'SNIPPET_OR_MACRO_VISIBLE_AS_TEXT' });
      if (result.dom.page_overflow) errors.push({ code: 'PAGE_OVERFLOW' });
      if (result.dom.broken_images.length) errors.push({ code: 'BROKEN_IMAGES', urls: result.dom.broken_images });
      // Font size and internal scroll are REVIEW candidates, not automated aesthetics verdicts.
    }
    // Bounded evidence sample; never pretend these are full-catalogue pixel reviews.
    if (job.motion === 'no-preference' && /\/(?:01-prompt-injection|01-que-evaluar-modelo-componente-sistema-workflow-trayectoria)\/$/.test(job.route)) {
      const stem = `${job.locale}-${job.width}-${job.route.split('/').filter(Boolean).at(-1)}`;
      await page.screenshot({ path: path.join(output, `${stem}-viewport.png`) });
      const visual = page.locator('article .anim-brand-shell, article .s5v').first();
      if (await visual.count()) { await visual.scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(output, `${stem}-visual-viewport.png`) }); }
    }
  } catch (error) { errors.push({ code: 'BROWSER_AUDIT_ERROR', detail: String(error) }); }
  finally { await context.close(); }
  return result;
}

try {
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (next < jobs.length) {
      const job = jobs[next++];
      const result = await inspect(job);
      results.push(result);
      console.log(`${job.locale} ${job.width} ${job.motion} ${job.route} => ${[...new Set(result.errors.map(error => error.code))].join(',') || 'TECHNICAL_ONLY'}`);
    }
  }));
} finally { await browser.close(); }
results.sort((a,b) => a.route.localeCompare(b.route) || a.width-b.width || a.motion.localeCompare(b.motion));
const counts = {};
for (const result of results) for (const code of new Set(result.errors.map(error => error.code))) counts[code] = (counts[code] || 0) + 1;
const report = { scope: inventory.scope, contexts: results.length, expected_contexts: jobs.length, findings: counts, golden: 'NOT_CERTIFIED', pixel_review: 'PENDING', pedagogy_review: 'PENDING', interaction_review: 'NOT_RUN', playback_review: 'NOT_RUN', results };
await fs.writeFile(path.join(output, 'browser-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log('BROWSER_DIAGNOSTIC_SUMMARY ' + JSON.stringify({ ...report, results: undefined }));
if (Object.keys(counts).length || results.length !== jobs.length) process.exitCode = 1;
