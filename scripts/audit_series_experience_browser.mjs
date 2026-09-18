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

const jobs = inventory.pages.flatMap(item =>
  [1440, 390].flatMap(width =>
    ['no-preference', 'reduce'].map(motion => ({ ...item, width, motion })),
  ),
);
const results = [];

async function launchAuditBrowser() {
  const requestedChannel = process.env.S5_BROWSER_CHANNEL || 'chrome';
  try {
    const browser = await chromium.launch({ headless: true, channel: requestedChannel });
    return {
      browser,
      runtime: {
        requested_channel: requestedChannel,
        actual_channel: requestedChannel,
        fallback: false,
        version: browser.version(),
      },
    };
  } catch (error) {
    throw new Error(
      `BROWSER_AUDIT_RUNTIME_UNAVAILABLE: full-catalogue playback audit requires the codec-capable ${requestedChannel} channel; refusing bundled-Chromium fallback that can misclassify H.264 product media. ${String(error)}`,
    );
  }
}

const { browser, runtime: browserRuntime } = await launchAuditBrowser();
console.log('BROWSER_AUDIT_RUNTIME ' + JSON.stringify(browserRuntime));
let next = 0;

const JOB_TIMEOUT_MS = Number(process.env.S5_BROWSER_JOB_TIMEOUT_MS || 25000);
const WORKER_COUNT = Number(process.env.S5_BROWSER_WORKERS || 2);
const CLOSE_TIMEOUT_MS = 4000;
const DOM_SUBPROBE_TIMEOUT_MS = Number(process.env.S5_DOM_SUBPROBE_TIMEOUT_MS || 5000);
if (!Number.isInteger(WORKER_COUNT) || WORKER_COUNT < 1 || WORKER_COUNT > 4) {
  throw new Error(`S5_BROWSER_WORKERS must be an integer between 1 and 4; got ${WORKER_COUNT}`);
}
if (!Number.isFinite(DOM_SUBPROBE_TIMEOUT_MS) || DOM_SUBPROBE_TIMEOUT_MS <= 0 || DOM_SUBPROBE_TIMEOUT_MS >= JOB_TIMEOUT_MS) {
  throw new Error(
    `S5_DOM_SUBPROBE_TIMEOUT_MS must be > 0 and < S5_BROWSER_JOB_TIMEOUT_MS; got ${DOM_SUBPROBE_TIMEOUT_MS}`,
  );
}

const classifyRequestFailure = ({ errorText, phase }) => {
  const aborted = /ERR_ABORTED/i.test(errorText || '');
  if (aborted && phase === 'teardown') {
    return { expected: true, classification: 'EXPECTED_CONTEXT_TEARDOWN_ABORT' };
  }
  if (aborted) {
    return { expected: false, classification: 'FATAL_UNPROVEN_PRE_TEARDOWN_ABORT' };
  }
  return { expected: false, classification: 'FATAL_NON_ABORT_REQUEST_FAILURE' };
};

const runRequestFailureClassifierMutations = () => {
  const fixtures = [
    ['pre-teardown media abort fails closed', { errorText: 'net::ERR_ABORTED', phase: 'lazy-traversal' }, false],
    ['interaction abort fails closed', { errorText: 'net::ERR_ABORTED', phase: 'interaction-playback' }, false],
    ['teardown abort is expected', { errorText: 'net::ERR_ABORTED', phase: 'teardown' }, true],
    ['non-abort teardown failure remains fatal', { errorText: 'net::ERR_FAILED', phase: 'teardown' }, false],
  ];
  for (const [name, event, expected] of fixtures) {
    const actual = classifyRequestFailure(event).expected;
    if (actual !== expected) {
      throw new Error(`Full-catalog request-failure mutation failed: ${name}; expected=${expected}; actual=${actual}`);
    }
  }
  return fixtures.length;
};

const buildHostScrollPlan = ({ height, viewportHeight }) => {
  const documentHeight = Number(height);
  const viewport = Number(viewportHeight);
  if (!Number.isFinite(documentHeight) || documentHeight <= 0) {
    throw new Error(`Invalid document height for lazy traversal: ${height}`);
  }
  if (!Number.isFinite(viewport) || viewport <= 0) {
    throw new Error(`Invalid viewport height for lazy traversal: ${viewportHeight}`);
  }
  const step = Math.max(viewport, 400);
  const positions = [];
  for (let y = 0; y < documentHeight; y += step) positions.push(y);
  return { documentHeight, viewportHeight: viewport, step, positions };
};

const runHostScrollPlanMutations = () => {
  const fixtures = [
    {
      name: 'single viewport traverses from top once',
      input: { height: 844, viewportHeight: 844 },
      positions: [0],
    },
    {
      name: 'two mobile viewports traverse both regions',
      input: { height: 1688, viewportHeight: 844 },
      positions: [0, 844],
    },
    {
      name: 'small viewport retains 400px minimum step',
      input: { height: 801, viewportHeight: 300 },
      positions: [0, 400, 800],
    },
  ];
  for (const fixture of fixtures) {
    const actual = buildHostScrollPlan(fixture.input).positions;
    if (JSON.stringify(actual) !== JSON.stringify(fixture.positions)) {
      throw new Error(
        `Host scroll plan mutation failed: ${fixture.name}; expected=${JSON.stringify(fixture.positions)}; actual=${JSON.stringify(actual)}`,
      );
    }
  }
  for (const invalid of [
    { height: 0, viewportHeight: 844 },
    { height: 844, viewportHeight: 0 },
  ]) {
    let failedClosed = false;
    try {
      buildHostScrollPlan(invalid);
    } catch {
      failedClosed = true;
    }
    if (!failedClosed) {
      throw new Error(`Host scroll plan accepted invalid geometry: ${JSON.stringify(invalid)}`);
    }
  }
  return fixtures.length + 2;
};

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

class DomSubprobeTimeoutError extends Error {
  constructor(subprobe, timeoutMs, cause) {
    super(`DOM subprobe ${subprobe} exceeded ${timeoutMs} ms`);
    this.name = 'DomSubprobeTimeoutError';
    this.subprobe = subprobe;
    this.timeoutMs = timeoutMs;
    this.cause = cause;
  }
}

async function boundedDomSubprobe(subprobe, operation, timeoutMs = DOM_SUBPROBE_TIMEOUT_MS) {
  try {
    return await bounded(
      Promise.resolve().then(operation),
      timeoutMs,
      `DOM subprobe ${subprobe}`,
    );
  } catch (error) {
    if (/DOM subprobe .* exceeded \d+ ms/.test(String(error))) {
      throw new DomSubprobeTimeoutError(subprobe, timeoutMs, error);
    }
    throw error;
  }
}

async function runDomSubprobeMutations() {
  const fast = await boundedDomSubprobe('mutation-fast', () => Promise.resolve('ok'), 100);
  if (fast !== 'ok') throw new Error('DOM subprobe fast mutation did not resolve');

  let timedOut = false;
  try {
    await boundedDomSubprobe(
      'mutation-stalled',
      () => new Promise(resolve => setTimeout(() => resolve('late'), 30)),
      5,
    );
  } catch (error) {
    timedOut =
      error instanceof DomSubprobeTimeoutError &&
      error.subprobe === 'mutation-stalled' &&
      error.timeoutMs === 5;
  }
  if (!timedOut) {
    throw new Error('DOM subprobe stalled mutation did not fail closed with DOM_SUBPROBE_TIMEOUT semantics');
  }
  return 2;
}

const requestFailureMutationCount = runRequestFailureClassifierMutations();
const hostScrollPlanMutationCount = runHostScrollPlanMutations();
const domSubprobeMutationCount = await runDomSubprobeMutations();

async function boundedClose(context) {
  if (!context) return false;
  try {
    await bounded(context.close(), CLOSE_TIMEOUT_MS, 'browser context close');
    return false;
  } catch {
    return true;
  }
}

async function inspectInlineVideo(page, job, errors) {
  const video = page.locator('article [data-s5-inline-video-player]').first();
  if (!(await video.count())) return null;

  const root = page.locator('article [data-s5-inline-video]').first();
  const poster = root.locator('[data-s5-inline-video-start]').first();
  const source = video.locator('source').first();
  const lifecycle = {
    poster_present: (await poster.count()) === 1,
    poster_initially_visible: false,
    player_initially_hidden: false,
    activation: job.width === 390 ? 'tap' : 'click',
    range_status: null,
    duration: null,
    videoWidth: null,
    videoHeight: null,
    play_started: false,
    seeked: false,
    paused_after: false,
  };

  try {
    await video.evaluate(node => {
      node.muted = true;
      node.volume = 0;
    });

    const sourceValue = await source.getAttribute('src');
    if (!sourceValue) {
      errors.push({ code: 'VIDEO_SOURCE_MISSING' });
    } else {
      const mediaUrl = new URL(sourceValue, page.url()).href;
      const range = await page.request.get(mediaUrl, {
        headers: { Range: 'bytes=0-1023' },
        timeout: 8000,
      });
      lifecycle.range_status = range.status();
      if (![200, 206].includes(range.status())) {
        errors.push({
          code: 'VIDEO_RANGE_ERROR',
          status: range.status(),
          url: mediaUrl,
        });
      }
    }

    if (!(await poster.count())) {
      errors.push({ code: 'VIDEO_POSTER_CONTROL_MISSING' });
      return lifecycle;
    }

    await poster.waitFor({ state: 'visible', timeout: 5000 });
    lifecycle.poster_initially_visible = true;
    lifecycle.player_initially_hidden = !(await video.isVisible());
    if (!lifecycle.player_initially_hidden) {
      errors.push({ code: 'VIDEO_PLAYER_VISIBLE_BEFORE_ACTIVATION' });
    }

    await poster.scrollIntoViewIfNeeded();
    if (job.width === 390) await poster.tap({ timeout: 5000 });
    else await poster.click({ timeout: 5000 });
    await video.waitFor({ state: 'visible', timeout: 5000 });

    await page.waitForFunction(() => {
      const node = document.querySelector('article [data-s5-inline-video-player]');
      return Boolean(node && node.readyState >= 1 && (!node.paused || node.currentTime > 0));
    }, { timeout: 8000 });
    lifecycle.play_started = true;

    const media = await video.evaluate(async node => {
      const duration = Number(node.duration);
      const before = Number(node.currentTime);
      node.pause();
      let seeked = false;
      if (Number.isFinite(duration) && duration > 1) {
        const target = Math.min(Math.max(0.25, duration * 0.25), duration - 0.25);
        if (Math.abs(target - before) > 0.05) {
          await Promise.race([
            new Promise(resolve => {
              node.addEventListener('seeked', () => resolve(), { once: true });
              node.currentTime = target;
            }),
            new Promise(resolve => setTimeout(resolve, 3000)),
          ]);
          seeked = Math.abs(Number(node.currentTime) - target) < 0.5;
        } else {
          seeked = true;
        }
      }
      return {
        duration,
        currentTime: Number(node.currentTime),
        paused: node.paused,
        videoWidth: node.videoWidth,
        videoHeight: node.videoHeight,
        readyState: node.readyState,
        seeked,
      };
    });

    lifecycle.duration = media.duration;
    lifecycle.videoWidth = media.videoWidth;
    lifecycle.videoHeight = media.videoHeight;
    lifecycle.seeked = media.seeked;
    lifecycle.paused_after = media.paused;

    if (
      !Number.isFinite(media.duration) ||
      media.duration <= 0 ||
      media.videoWidth <= 0 ||
      media.videoHeight <= 0
    ) {
      errors.push({ code: 'VIDEO_METADATA_INVALID', media });
    }
    if (!media.paused) errors.push({ code: 'VIDEO_PAUSE_FAILED' });
    if (media.duration > 1 && !media.seeked) errors.push({ code: 'VIDEO_SEEK_FAILED' });
  } catch (error) {
    errors.push({ code: 'VIDEO_PLAYBACK_ERROR', detail: String(error) });
  }
  return lifecycle;
}

async function inspect(job) {
  let context;
  let phase = 'navigation';
  let phaseStartedAtMs = performance.now();
  const phaseTimingMs = {};
  const transitionPhase = nextPhase => {
    const now = performance.now();
    phaseTimingMs[phase] = Number(((phaseTimingMs[phase] || 0) + (now - phaseStartedAtMs)).toFixed(2));
    phase = nextPhase;
    phaseStartedAtMs = now;
  };
  const errors = [];
  const expectedRequestAborts = [];
  const result = {
    route: job.route,
    locale: job.locale,
    width: job.width,
    motion: job.motion,
    errors,
    expected_request_aborts: expectedRequestAborts,
    phase_timing_ms: phaseTimingMs,
    dom_subprobes: {},
    pixel_review: 'PENDING',
    pedagogy_review: 'PENDING',
    interaction_review: 'NOT_RUN',
    playback_review: 'NOT_RUN',
  };

  try {
    context = await browser.newContext({
      viewport: { width: job.width, height: job.width === 390 ? 844 : 1000 },
      isMobile: job.width === 390,
      hasTouch: job.width === 390,
      reducedMotion: job.motion,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    page.setDefaultNavigationTimeout(20000);

    // Retain listeners for the entire context: navigation, lazy loading, controls, media and teardown.
    page.on('pageerror', error =>
      errors.push({ code: 'RUNTIME_ERROR', phase, detail: String(error) }),
    );
    page.on('response', response => {
      if (response.status() >= 400) {
        errors.push({
          code: 'HTTP_RESOURCE_ERROR',
          phase,
          status: response.status(),
          url: response.url(),
        });
      }
    });
    page.on('requestfailed', request => {
      const detail = request.failure()?.errorText || '';
      const verdict = classifyRequestFailure({ errorText: detail, phase });
      const evidence = {
        url: request.url(),
        detail,
        phase,
        resourceType: request.resourceType(),
        navigation: request.isNavigationRequest(),
        classification: verdict.classification,
      };
      if (verdict.expected) {
        expectedRequestAborts.push(evidence);
        return;
      }
      errors.push({ code: 'REQUEST_FAILED', ...evidence });
    });

    const runDomProbe = async (name, callback) => {
      const started = performance.now();
      try {
        const value = await boundedDomSubprobe(name, () => page.evaluate(callback));
        result.dom_subprobes[name] = {
          ok: true,
          host_ms: Number((performance.now() - started).toFixed(2)),
        };
        return value;
      } catch (error) {
        result.dom_subprobes[name] = {
          ok: false,
          host_ms: Number((performance.now() - started).toFixed(2)),
          error: String(error),
        };
        throw error;
      }
    };

    await bounded((async () => {
      const response = await page.goto(new URL(job.route, base).href, {
        waitUntil: 'domcontentloaded',
        timeout: 20000,
      });
      if (!response?.ok()) errors.push({ code: 'PAGE_HTTP_ERROR', status: response?.status() });

      transitionPhase('font-settle');
      await Promise.race([
        page.evaluate(() => document.fonts.ready.then(() => true)),
        new Promise(resolve => setTimeout(resolve, 1500)),
      ]);

      transitionPhase('lazy-traversal');
      const geometry = await page.evaluate(() => ({
        height: document.documentElement.scrollHeight,
        viewportHeight: innerHeight,
      }));
      const scrollPlan = buildHostScrollPlan(geometry);
      result.lazy_traversal = {
        document_height: scrollPlan.documentHeight,
        viewport_height: scrollPlan.viewportHeight,
        step: scrollPlan.step,
        steps: scrollPlan.positions.length,
        dwell_ms: 20,
        timer_owner: 'host',
      };
      // Exercise the complete page from the host process. Avoid renderer-side timer
      // throttling while preserving the same viewport-sized lazy-load traversal.
      for (const y of scrollPlan.positions) {
        await page.evaluate(scrollY => window.scrollTo(0, scrollY), y);
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      await page.evaluate(() => window.scrollTo(0, 0));

      transitionPhase('post-scroll-settle');
      await new Promise(resolve => setTimeout(resolve, 180));

      transitionPhase('dom-inspection');
      const rootSummary = await runDomProbe('root-summary', () => {
        const root = document.querySelector('article.md-content__inner') || document.querySelector('article');
        if (!root) return { missing_article: true };
        return {
          missing_article: false,
          lang: document.documentElement.lang,
          video_count: root.querySelectorAll('video').length,
          native_math_count: root.querySelectorAll('math').length,
          page_overflow:
            document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        };
      });

      if (rootSummary.missing_article) {
        result.dom = { missing_article: true };
      } else {
        const textScan = await runDomProbe('text-scan', () => {
          const root = document.querySelector('article.md-content__inner') || document.querySelector('article');
          if (!root) return { missing_article: true, raw_tex_markers: [], include_html_visible: false };
          const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
          const parts = [];
          while (walker.nextNode()) {
            const node = walker.currentNode;
            if (!node.parentElement?.closest('script,style,pre,code,math,annotation,mjx-container,.katex')) {
              parts.push(node.textContent || '');
            }
          }
          const prose = parts.join(' ');
          const tex = prose.match(
            /\\(?:frac|text|tau|pi|Delta|sum|prod|begin|end|lambda|mathbb|mathrm|mathbf|subseteq|land|min|max|mid|theta|sigma|alpha|beta)\b|\\[\[\]]|\$\$/g,
          ) || [];
          return {
            missing_article: false,
            raw_tex_markers: [...new Set(tex)],
            include_html_visible: /\{\{\s*include_html/.test(prose),
          };
        });

        const snippetScan = await runDomProbe('snippet-scan', () => {
          const root = document.querySelector('article.md-content__inner') || document.querySelector('article');
          if (!root) return { escaped_pre_code: false };
          return {
            escaped_pre_code: [...root.querySelectorAll('pre,code')].some(node =>
              /include_html\(|<\s*(?:section|svg|style)\b[^\n]*(?:s5v|anim-|viewBox|data-anim)/i.test(node.textContent || ''),
            ),
          };
        });

        const svgLabelGeometry = await runDomProbe('svg-label-geometry', () => {
          const root = document.querySelector('article.md-content__inner') || document.querySelector('article');
          if (!root) return { labels: [] };
          const labels = [...root.querySelectorAll('svg text')].flatMap(node => {
            const rect = node.getBoundingClientRect();
            const matrix = node.getScreenCTM();
            if (!rect.width || !rect.height || !matrix) return [];
            return [{
              label: node.textContent?.trim().slice(0, 100),
              px: Number((parseFloat(getComputedStyle(node).fontSize) * Math.hypot(matrix.c, matrix.d)).toFixed(2)),
            }];
          });
          return { labels };
        });

        const pannableGeometry = await runDomProbe('pannable-geometry', () => {
          const root = document.querySelector('article.md-content__inner') || document.querySelector('article');
          if (!root) return { pannable_visuals: [] };
          const pannable = [...root.querySelectorAll('div')]
            .filter(node => {
              const overflow = getComputedStyle(node).overflowX;
              return (
                ['auto', 'scroll'].includes(overflow) &&
                node.scrollWidth > node.clientWidth + 2 &&
                node.querySelector('svg')
              );
            })
            .map(node => ({
              class: String(node.className || ''),
              viewport: node.clientWidth,
              content: node.scrollWidth,
            }));
          return { pannable_visuals: pannable };
        });

        const imageScan = await runDomProbe('image-scan', () => {
          const root = document.querySelector('article.md-content__inner') || document.querySelector('article');
          if (!root) return { broken_images: [] };
          return {
            broken_images: [...root.querySelectorAll('img')]
              .filter(image => image.complete && !image.naturalWidth)
              .map(image => image.currentSrc || image.src),
          };
        });

        const animationScan = await runDomProbe('animation-scan', () => {
          const root = document.querySelector('article.md-content__inner') || document.querySelector('article');
          if (!root) return { animation_count: 0 };
          return { animation_count: root.getAnimations({ subtree: true }).length };
        });

        const controlScan = await runDomProbe('control-scan', () => {
          const root = document.querySelector('article.md-content__inner') || document.querySelector('article');
          if (!root) return { visual_control_count: 0 };
          return {
            visual_control_count: root.querySelectorAll(
              '.s5v button, .anim-brand-shell button, [role="tab"], input[type="range"]',
            ).length,
          };
        });

        const visualLabels = svgLabelGeometry.labels || [];
        result.dom = {
          ...rootSummary,
          raw_tex_markers: textScan.raw_tex_markers || [],
          escaped_snippet: Boolean(textScan.include_html_visible || snippetScan.escaped_pre_code),
          broken_images: imageScan.broken_images || [],
          label_review_candidates: visualLabels.filter(label => label.px < 12),
          minimum_svg_label_px: visualLabels.length
            ? Math.min(...visualLabels.map(label => label.px))
            : null,
          pannable_visuals: pannableGeometry.pannable_visuals || [],
          animation_count: animationScan.animation_count || 0,
          visual_control_count: controlScan.visual_control_count || 0,
        };
      }

      if (result.dom.missing_article) {
        errors.push({ code: 'ARTICLE_MISSING' });
      } else {
        if (!result.dom.lang.toLowerCase().startsWith(job.locale)) {
          errors.push({ code: 'LOCALE_WRONG' });
        }
        if (!result.dom.video_count) errors.push({ code: 'VIDEO_NOT_RENDERED' });
        if (result.dom.raw_tex_markers.length) {
          errors.push({
            code: 'RAW_TEX_VISIBLE',
            markers: result.dom.raw_tex_markers,
          });
        }
        if (result.dom.escaped_snippet) {
          errors.push({ code: 'SNIPPET_OR_MACRO_VISIBLE_AS_TEXT' });
        }
        if (result.dom.page_overflow) errors.push({ code: 'PAGE_OVERFLOW' });
        if (result.dom.broken_images.length) {
          errors.push({
            code: 'BROKEN_IMAGES',
            urls: result.dom.broken_images,
          });
        }
        // Font size and internal scroll are review candidates, never automatic aesthetics PASS.
      }

      if (result.dom?.video_count) {
        transitionPhase('interaction-playback');
        result.media = await inspectInlineVideo(page, job, errors);
        result.playback_review = 'AUTOMATED_TECHNICAL_ONLY';
      }

      // Bounded evidence sample; never pretend these are pixel/pedagogy approvals.
      const sample =
        /\/seguridad-ia\/(?:00_presentacion_serie|01-prompt-injection)\/$/.test(job.route) ||
        /\/evaluating-ai-systems-production\/01-que-evaluar-modelo-componente-sistema-workflow-trayectoria\/$/.test(job.route);
      if (sample) {
        transitionPhase('pixel-capture');
        const stem = `${job.locale}-${job.width}-${job.motion}-${job.route
          .split('/')
          .filter(Boolean)
          .at(-1)}`;
        await page.screenshot({
          path: path.join(output, `${stem}-full.png`),
          fullPage: true,
          animations: job.motion === 'reduce' ? 'disabled' : 'allow',
        });
        const visual = page.locator('article .anim-brand-shell, article .s5v').first();
        if (await visual.count()) {
          await visual.scrollIntoViewIfNeeded();
          await page.screenshot({
            path: path.join(output, `${stem}-visual-viewport.png`),
            animations: job.motion === 'reduce' ? 'disabled' : 'allow',
          });
        }
      }
      transitionPhase('settle');
      await new Promise(resolve => setTimeout(resolve, 100));
    })(), JOB_TIMEOUT_MS, `${job.locale} ${job.width} ${job.motion} ${job.route}`);
  } catch (error) {
    if (error instanceof DomSubprobeTimeoutError) {
      errors.push({
        code: 'DOM_SUBPROBE_TIMEOUT',
        phase,
        subprobe: error.subprobe,
        timeout_ms: error.timeoutMs,
        detail: String(error),
      });
    } else {
      const code = /exceeded \d+ ms/.test(String(error))
        ? 'BROWSER_CONTEXT_TIMEOUT'
        : 'BROWSER_AUDIT_ERROR';
      errors.push({ code, phase, detail: String(error) });
    }
  } finally {
    transitionPhase('teardown');
    if (await boundedClose(context)) {
      errors.push({
        code: 'BROWSER_CONTEXT_CLOSE_TIMEOUT',
        detail: `context close exceeded ${CLOSE_TIMEOUT_MS} ms`,
      });
    }
    transitionPhase('complete');
  }
  return result;
}

try {
  await Promise.all(
    Array.from({ length: WORKER_COUNT }, async () => {
      while (next < jobs.length) {
        const job = jobs[next++];
        const result = await inspect(job);
        results.push(result);
        console.log(
          `${job.locale} ${job.width} ${job.motion} ${job.route} => ${
            [...new Set(result.errors.map(error => error.code))].join(',') || 'TECHNICAL_ONLY'
          }`,
        );
      }
    }),
  );
} finally {
  await boundedClose({ close: () => browser.close() });
}

results.sort(
  (a, b) =>
    a.route.localeCompare(b.route) ||
    a.width - b.width ||
    a.motion.localeCompare(b.motion),
);
const counts = {};
let expectedAbortCount = 0;
for (const result of results) {
  expectedAbortCount += result.expected_request_aborts?.length || 0;
  for (const code of new Set(result.errors.map(error => error.code))) {
    counts[code] = (counts[code] || 0) + 1;
  }
}
const report = {
  scope: inventory.scope,
  contexts: results.length,
  expected_contexts: jobs.length,
  browser_runtime: browserRuntime,
  worker_count: WORKER_COUNT,
  context_timeout_ms: JOB_TIMEOUT_MS,
  dom_subprobe_timeout_ms: DOM_SUBPROBE_TIMEOUT_MS,
  findings: counts,
  request_failure_policy: 'FAIL_CLOSED_FOR_ALL_PRE_TEARDOWN_FAILURES; ONLY_CONTEXT_TEARDOWN_ERR_ABORTED_IS_EXPECTED',
  request_failure_mutation_count: requestFailureMutationCount,
  host_scroll_plan_mutation_count: hostScrollPlanMutationCount,
  dom_subprobe_mutation_count: domSubprobeMutationCount,
  dom_subprobe_policy: 'NAMED_FAIL_CLOSED_SUBPROBES; NO_RETRY; GLOBAL_CONTEXT_BUDGET_UNCHANGED',
  lazy_traversal_timer_owner: 'host',
  expected_teardown_abort_count: expectedAbortCount,
  golden: 'NOT_CERTIFIED',
  pixel_review: 'PENDING',
  pedagogy_review: 'PENDING',
  interaction_review: 'AUTOMATED_CONTROLS_ONLY',
  playback_review: 'AUTOMATED_TECHNICAL_ONLY',
  results,
};
await fs.writeFile(
  path.join(output, 'browser-report.json'),
  JSON.stringify(report, null, 2) + '\n',
);
console.log('BROWSER_DIAGNOSTIC_SUMMARY ' + JSON.stringify({ ...report, results: undefined }));
if (Object.keys(counts).length || results.length !== jobs.length) {
  process.exitCode = 1;
}
