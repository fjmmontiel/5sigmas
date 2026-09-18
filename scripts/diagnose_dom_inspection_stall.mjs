#!/usr/bin/env node
/** Focused diagnostic only. Does not certify browser, pixel, pedagogy, or GOLDEN. */
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const route = process.env.S5_DOM_STALL_ROUTE || '/en/series/coding-agents-agent-harnesses/01-que-es-agent-harness/';
const output = process.env.S5_DOM_STALL_REPORT || 'artifacts/dom-inspection-diagnostic.json';
const CONTEXT_BUDGET_MS = 25000;
const PROBE_BUDGET_MS = 5000;
const DOM_ANOMALY_MS = 1000;
const repetitions = Number(process.env.S5_DOM_STALL_REPETITIONS || 2);

const browser = await chromium.launch({ headless: true });
const baseJobs = [1440, 390].flatMap(width =>
  ['no-preference', 'reduce'].map(motion => ({ width, motion })),
);

function buildScrollPlan(height, viewportHeight) {
  const step = Math.max(viewportHeight, 400);
  const positions = [];
  for (let y = 0; y < height; y += step) positions.push(y);
  return positions;
}

async function bounded(promise, ms, label) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} exceeded ${ms} ms`)), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function runOne(job, mode, repetition) {
  const started = performance.now();
  let context;
  const result = {
    route,
    mode,
    repetition,
    width: job.width,
    motion: job.motion,
    context_budget_ms: CONTEXT_BUDGET_MS,
    probe_budget_ms: PROBE_BUDGET_MS,
    ok: false,
    error: null,
    phase_ms: {},
    probes: {},
  };

  try {
    await bounded((async () => {
      context = await browser.newContext({
        viewport: { width: job.width, height: job.width === 390 ? 844 : 1000 },
        isMobile: job.width === 390,
        hasTouch: job.width === 390,
        reducedMotion: job.motion,
      });
      const page = await context.newPage();
      page.setDefaultNavigationTimeout(20000);

      let mark = performance.now();
      const phase = name => {
        const now = performance.now();
        result.phase_ms[name] = Number((now - mark).toFixed(2));
        mark = now;
      };

      const response = await page.goto(new URL(route, base).href, {
        waitUntil: 'domcontentloaded',
        timeout: 20000,
      });
      if (!response?.ok()) throw new Error(`page HTTP ${response?.status()}`);
      phase('navigation');

      await Promise.race([
        page.evaluate(() => document.fonts.ready.then(() => true)),
        new Promise(resolve => setTimeout(resolve, 1500)),
      ]);
      phase('font_settle');

      const geometry = await page.evaluate(() => ({
        height: document.documentElement.scrollHeight,
        viewportHeight: innerHeight,
      }));
      for (const y of buildScrollPlan(geometry.height, geometry.viewportHeight)) {
        await page.evaluate(scrollY => window.scrollTo(0, scrollY), y);
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      phase('lazy_traversal');

      await new Promise(resolve => setTimeout(resolve, 180));
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => resolve(true))));
      phase('post_scroll_frame');

      const runProbe = async (name, callback) => {
        const probeStarted = performance.now();
        try {
          const value = await bounded(page.evaluate(callback), PROBE_BUDGET_MS, name);
          result.probes[name] = {
            ok: true,
            host_ms: Number((performance.now() - probeStarted).toFixed(2)),
            value,
          };
        } catch (error) {
          result.probes[name] = {
            ok: false,
            host_ms: Number((performance.now() - probeStarted).toFixed(2)),
            error: String(error),
          };
          throw new Error(`DOM subprobe ${name} failed: ${error}`);
        }
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => resolve(true))));
      };

      const domStarted = performance.now();
      await runProbe('text_scan', () => {
        const root = document.querySelector('article.md-content__inner') || document.querySelector('article');
        if (!root) return { missing_article: true };
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const parts = [];
        let nodes = 0;
        while (walker.nextNode()) {
          nodes += 1;
          const node = walker.currentNode;
          if (!node.parentElement?.closest('script,style,pre,code,math,annotation,mjx-container,.katex')) {
            parts.push(node.textContent || '');
          }
        }
        const prose = parts.join(' ');
        return {
          nodes,
          chars: prose.length,
          tex: (prose.match(/\\(?:frac|text|tau|pi|Delta|sum|prod|begin|end|lambda|mathbb|mathrm|mathbf|subseteq|land|min|max|mid|theta|sigma|alpha|beta)\b|\\[\[\]]|\$\$/g) || []).length,
        };
      });

      await runProbe('snippet_scan', () => {
        const root = document.querySelector('article.md-content__inner') || document.querySelector('article');
        if (!root) return { missing_article: true };
        const nodes = [...root.querySelectorAll('pre,code')];
        return {
          pre_code: nodes.length,
          escaped: nodes.some(node =>
            /include_html\(|<\s*(?:section|svg|style)\b[^\n]*(?:s5v|anim-|viewBox|data-anim)/i.test(node.textContent || ''),
          ),
        };
      });

      await runProbe('svg_label_geometry', () => {
        const root = document.querySelector('article.md-content__inner') || document.querySelector('article');
        if (!root) return { missing_article: true };
        const nodes = [...root.querySelectorAll('svg text')];
        let visible = 0;
        let minimumPx = null;
        for (const node of nodes) {
          const rect = node.getBoundingClientRect();
          const matrix = node.getScreenCTM();
          if (!rect.width || !rect.height || !matrix) continue;
          visible += 1;
          const px = parseFloat(getComputedStyle(node).fontSize) * Math.hypot(matrix.c, matrix.d);
          minimumPx = minimumPx === null ? px : Math.min(minimumPx, px);
        }
        return { total: nodes.length, visible, minimum_px: minimumPx };
      });

      await runProbe('pannable_geometry', () => {
        const root = document.querySelector('article.md-content__inner') || document.querySelector('article');
        if (!root) return { missing_article: true };
        const divs = [...root.querySelectorAll('div')];
        let candidates = 0;
        for (const node of divs) {
          const overflow = getComputedStyle(node).overflowX;
          if (['auto', 'scroll'].includes(overflow) && node.scrollWidth > node.clientWidth + 2 && node.querySelector('svg')) {
            candidates += 1;
          }
        }
        return { divs: divs.length, candidates };
      });

      await runProbe('document_geometry', () => ({
        scroll_width: document.documentElement.scrollWidth,
        client_width: document.documentElement.clientWidth,
      }));

      await runProbe('image_scan', () => {
        const root = document.querySelector('article.md-content__inner') || document.querySelector('article');
        if (!root) return { missing_article: true };
        const nodes = [...root.querySelectorAll('img')];
        return { total: nodes.length, broken: nodes.filter(image => image.complete && !image.naturalWidth).length };
      });

      await runProbe('animation_scan', () => {
        const root = document.querySelector('article.md-content__inner') || document.querySelector('article');
        if (!root) return { missing_article: true };
        return { count: root.getAnimations({ subtree: true }).length };
      });

      await runProbe('control_scan', () => {
        const root = document.querySelector('article.md-content__inner') || document.querySelector('article');
        if (!root) return { missing_article: true };
        return {
          count: root.querySelectorAll('.s5v button, .anim-brand-shell button, [role="tab"], input[type="range"]').length,
        };
      });

      result.phase_ms.dom_inspection_host = Number((performance.now() - domStarted).toFixed(2));
      result.ok = true;
    })(), CONTEXT_BUDGET_MS, `${mode} ${job.width} ${job.motion}`);
  } catch (error) {
    result.error = String(error);
  } finally {
    if (context) {
      try { await bounded(context.close(), 4000, 'context close'); } catch {}
    }
    result.total_ms = Number((performance.now() - started).toFixed(2));
  }
  return result;
}

async function runMode(mode, concurrency) {
  const jobs = [];
  for (let repetition = 1; repetition <= repetitions; repetition += 1) {
    for (const job of baseJobs) jobs.push({ ...job, repetition });
  }
  let cursor = 0;
  const out = [];
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (cursor < jobs.length) {
      const job = jobs[cursor++];
      out.push(await runOne(job, mode, job.repetition));
    }
  }));
  return out;
}

const serial = await runMode('serial', 1);
const parallel2 = await runMode('parallel2', 2);
await browser.close();

const results = [...serial, ...parallel2];
const anomalies = results.filter(result =>
  !result.ok ||
  (result.phase_ms.dom_inspection_host || 0) >= DOM_ANOMALY_MS ||
  Object.values(result.probes || {}).some(probe => !probe.ok || probe.host_ms >= DOM_ANOMALY_MS),
);
const report = {
  purpose: 'isolate full-catalog DOM-inspection stall without changing canonical 25s gate',
  route,
  repetitions,
  context_budget_ms: CONTEXT_BUDGET_MS,
  per_probe_budget_ms: PROBE_BUDGET_MS,
  diagnostic_anomaly_ms: DOM_ANOMALY_MS,
  contexts: results.length,
  serial_contexts: serial.length,
  parallel2_contexts: parallel2.length,
  anomalies: anomalies.length,
  results,
};
await fs.mkdir(output.split('/').slice(0, -1).join('/') || '.', { recursive: true });
await fs.writeFile(output, JSON.stringify(report, null, 2) + '\n');
console.log('DOM_INSPECTION_DIAGNOSTIC ' + JSON.stringify({
  route,
  contexts: results.length,
  anomalies: anomalies.length,
  max_dom_ms: Math.max(...results.map(result => result.phase_ms.dom_inspection_host || 0)),
}));
if (anomalies.length) process.exitCode = 1;
