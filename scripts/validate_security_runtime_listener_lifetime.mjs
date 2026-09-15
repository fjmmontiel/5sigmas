#!/usr/bin/env node
/**
 * Security 00/1.1 runtime/resource listener lifetime gate.
 *
 * The focused requalification gates keep page/resource listeners attached while
 * exercising interactions and media. This gate adds one independent conjunctive
 * proof that the verdict is computed only after browser-context teardown, so
 * late lazy-media/navigation/teardown events cannot appear in retained evidence
 * after a PASS was already decided.
 *
 * Technical gate only: it never certifies PIXEL_REVIEW or PEDAGOGY_REVIEW.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const out = path.resolve('artifacts/security-requalification/runtime-listener-lifetime');
await fs.mkdir(out, { recursive: true });

function finalRuntimeFailures(beforeClose, afterClose) {
  // The pre-close snapshot is diagnostic only. The gate verdict must use the
  // post-close snapshot because teardown can append late events.
  return afterClose.length ? [...afterClose] : [];
}

function runSelfTest() {
  const before = [];
  const after = [{ type: 'requestfailed', url: 'https://example.invalid/lazy', detail: 'synthetic teardown failure' }];
  if (finalRuntimeFailures(before, after).length !== 1) {
    throw new Error('teardown mutation escaped: a late runtime failure was not caught');
  }
  if (finalRuntimeFailures([], []).length !== 0) {
    throw new Error('clean teardown fixture was rejected');
  }
  console.log('Security runtime-listener lifetime mutation fixtures PASS: post-teardown evidence controls the verdict.');
}

if (process.argv.includes('--self-test')) {
  runSelfTest();
  process.exit(0);
}

const routes = [
  { locale: 'es', kind: 'presentation', route: '/series/seguridad-ia/00_presentacion_serie/' },
  { locale: 'en', kind: 'presentation', route: '/en/series/seguridad-ia/00_presentacion_serie/' },
  { locale: 'es', kind: 'prompt', route: '/series/seguridad-ia/01-prompt-injection/' },
  { locale: 'en', kind: 'prompt', route: '/en/series/seguridad-ia/01-prompt-injection/' },
];

const failures = [];
const evidence = [];
const fail = (context, reason, detail = null) => failures.push({ context, reason, detail });

async function launchBrowser() {
  try {
    return { browser: await chromium.launch({ channel: 'chrome', headless: true }), engine: 'google-chrome' };
  } catch (chromeError) {
    return {
      browser: await chromium.launch({ headless: true }),
      engine: 'playwright-chromium',
      chromeError: String(chromeError),
    };
  }
}

async function activate(locator, mobile) {
  await locator.scrollIntoViewIfNeeded();
  if (mobile) await locator.tap({ timeout: 5000 });
  else await locator.click({ timeout: 5000 });
}

async function waitForStep(page, selector, step, timeout = 6000) {
  await page.waitForFunction(
    ({ selector, step }) => document.querySelector(selector)?.dataset.step === String(step),
    { selector, step },
    { timeout },
  );
}

async function exercisePresentation(page, mobile, contextLabel, record) {
  const root = page.locator('.secpath').first();
  if (!(await root.count())) {
    fail(contextLabel, 'presentation-mechanism-missing');
    return;
  }

  const unbounded = root.locator('[data-mode-btn="unbounded"]').first();
  const play = root.locator('[data-action="play"]').first();
  if (!(await unbounded.count()) || !(await play.count())) {
    fail(contextLabel, 'presentation-controls-missing');
    return;
  }
  await activate(unbounded, mobile);
  if ((await root.getAttribute('data-mode')) !== 'unbounded') {
    fail(contextLabel, 'presentation-unbounded-mode-did-not-activate');
  }
  await activate(play, mobile);
  try {
    await page.waitForFunction(() => document.querySelector('.secpath')?.dataset.step === '6', { timeout: 6500 });
  } catch (error) {
    fail(contextLabel, 'presentation-trajectory-did-not-reach-final-state', String(error));
  }
  record.presentation = {
    mode: await root.getAttribute('data-mode'),
    step: await root.getAttribute('data-step'),
  };
}

async function exercisePrompt(page, mobile, contextLabel, record) {
  const ctxmix = page.locator('.ctxmix').first();
  const rag = page.locator('.ragtrace').first();
  const defsim = page.locator('.defsim').first();
  if (!(await ctxmix.count()) || !(await rag.count()) || !(await defsim.count())) {
    fail(contextLabel, 'prompt-mechanism-missing', {
      ctxmix: await ctxmix.count(),
      rag: await rag.count(),
      defsim: await defsim.count(),
    });
    return;
  }

  const ctxStates = [];
  for (const state of ['1', '2', '3', '4']) {
    const button = ctxmix.locator(`[data-state-btn="${state}"]`).first();
    if (!(await button.count())) {
      fail(contextLabel, `ctxmix-state-${state}-control-missing`);
      continue;
    }
    await activate(button, mobile);
    await page.waitForTimeout(60);
    const actual = await ctxmix.getAttribute('data-state');
    ctxStates.push(actual);
    if (actual !== state) fail(contextLabel, `ctxmix-state-${state}-did-not-activate`, { actual });
  }

  const ragModes = [];
  for (const mode of ['clean', 'poisoned']) {
    const modeButton = rag.locator(`[data-mode-btn="${mode}"]`).first();
    const run = rag.locator('[data-run]').first();
    if (!(await modeButton.count()) || !(await run.count())) {
      fail(contextLabel, `rag-${mode}-controls-missing`);
      continue;
    }
    await activate(modeButton, mobile);
    await page.waitForTimeout(50);
    if ((await rag.getAttribute('data-mode')) !== mode) {
      fail(contextLabel, `rag-${mode}-mode-did-not-activate`);
    }
    await activate(run, mobile);
    try {
      await waitForStep(page, '.ragtrace', 2);
      await waitForStep(page, '.ragtrace', 3);
    } catch (error) {
      fail(contextLabel, `rag-${mode}-did-not-reach-final-state`, String(error));
    }
    ragModes.push({ mode, step: await rag.getAttribute('data-step') });
  }

  const disabledGates = [];
  const gates = defsim.locator('[data-gate]');
  const gateCount = await gates.count();
  if (gateCount < 4) fail(contextLabel, 'defense-gates-missing', { gateCount });
  for (let index = 0; index < gateCount; index += 1) {
    const gate = gates.nth(index);
    const key = await gate.getAttribute('data-gate');
    await activate(gate, mobile);
    await page.waitForTimeout(60);
    disabledGates.push(key);
  }

  record.prompt = {
    ctxmix_states: ctxStates,
    rag_modes: ragModes,
    disabled_defense_gates: disabledGates,
    final_defense_stop: await defsim.getAttribute('data-stop'),
  };
}

async function exerciseInlineVideo(page, mobile, contextLabel, record) {
  const root = page.locator('article [data-s5-inline-video]').first();
  const poster = root.locator('[data-s5-inline-video-start]').first();
  const video = root.locator('[data-s5-inline-video-player]').first();
  if (!(await root.count()) || !(await poster.count()) || !(await video.count())) {
    fail(contextLabel, 'inline-video-surface-missing');
    return;
  }

  await activate(poster, mobile);
  try {
    await video.waitFor({ state: 'visible', timeout: 5000 });
  } catch (error) {
    fail(contextLabel, 'inline-video-not-visible-after-activation', String(error));
    return;
  }

  const media = await video.evaluate(async (node) => {
    node.muted = true;
    node.volume = 0;
    if (node.readyState < 1) {
      await Promise.race([
        new Promise(resolve => node.addEventListener('loadedmetadata', resolve, { once: true })),
        new Promise(resolve => setTimeout(resolve, 3000)),
      ]);
    }
    const playPromise = node.play();
    if (playPromise && typeof playPromise.catch === 'function') await playPromise.catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 180));
    node.pause();
    const duration = Number(node.duration);
    let seekTarget = null;
    if (Number.isFinite(duration) && duration > 1) {
      seekTarget = Math.min(Math.max(0.5, duration * 0.2), duration - 0.5);
      await Promise.race([
        new Promise(resolve => {
          node.addEventListener('seeked', resolve, { once: true });
          node.currentTime = seekTarget;
        }),
        new Promise(resolve => setTimeout(resolve, 2500)),
      ]);
    }
    return {
      readyState: node.readyState,
      networkState: node.networkState,
      duration,
      currentTime: Number(node.currentTime),
      paused: node.paused,
      seekTarget,
    };
  });

  record.video = media;
  if (!(Number.isFinite(media.duration) && media.duration > 1)) {
    fail(contextLabel, 'inline-video-duration-invalid', media);
  }
  if (media.seekTarget !== null && Math.abs(media.currentTime - media.seekTarget) > 1.0) {
    fail(contextLabel, 'inline-video-seek-did-not-settle', media);
  }
}

const launched = await launchBrowser();
try {
  for (const item of routes) {
    for (const width of [1440, 390]) {
      for (const motion of ['no-preference', 'reduce']) {
        const mobile = width === 390;
        const label = `${item.locale}/${item.kind}/${mobile ? 'mobile' : 'desktop'}/${motion}`;
        const record = {
          ...item,
          width,
          motion,
          mobile,
          engine: launched.engine,
          chrome_launch_error: launched.chromeError || null,
          verdict_basis: 'POST_CONTEXT_TEARDOWN',
        };
        const runtime = [];
        let context = null;

        try {
          context = await launched.browser.newContext({
            viewport: { width, height: mobile ? 844 : 1000 },
            isMobile: mobile,
            hasTouch: mobile,
            reducedMotion: motion,
          });
          const page = await context.newPage();
          page.on('pageerror', error => runtime.push({ type: 'pageerror', detail: String(error) }));
          page.on('console', message => {
            if (message.type() === 'error') runtime.push({ type: 'console', detail: message.text() });
          });
          page.on('requestfailed', request => {
            const detail = request.failure()?.errorText || '';
            // Context teardown intentionally aborts active streaming requests; all
            // other failures remain fatal and are evaluated after close.
            if (!detail.includes('ERR_ABORTED')) runtime.push({ type: 'requestfailed', url: request.url(), detail });
          });
          page.on('response', response => {
            if (response.status() >= 400) runtime.push({ type: 'http', status: response.status(), url: response.url() });
          });

          const response = await page.goto(new URL(item.route, base).href, { waitUntil: 'networkidle', timeout: 20000 });
          if (!response?.ok()) fail(label, 'page-http-failed', { status: response?.status() });
          await page.evaluate(async () => {
            await Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 1500))]);
            for (let y = 0; y < document.documentElement.scrollHeight; y += Math.max(innerHeight, 400)) {
              scrollTo(0, y);
              await new Promise(resolve => setTimeout(resolve, 20));
            }
            scrollTo(0, 0);
          });

          if (item.kind === 'presentation') await exercisePresentation(page, mobile, label, record);
          else await exercisePrompt(page, mobile, label, record);
          await exerciseInlineVideo(page, mobile, label, record);

          await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});
          await page.waitForTimeout(150);
          record.runtime_before_teardown = [...runtime];
        } catch (error) {
          record.unhandled_error = { name: error?.name || 'Error', message: String(error?.message || error) };
          fail(label, 'unhandled-runtime-lifetime-exception', record.unhandled_error);
        } finally {
          if (context) {
            try {
              await context.close();
            } catch (error) {
              const detail = { name: error?.name || 'Error', message: String(error?.message || error) };
              record.context_close_error = detail;
              fail(label, 'browser-context-close-failed', detail);
            }
          }

          const finalRuntime = [...runtime];
          record.runtime_after_teardown = finalRuntime;
          const late = finalRuntime.slice((record.runtime_before_teardown || []).length);
          record.teardown_appended_runtime = late;
          const runtimeFailures = finalRuntimeFailures(record.runtime_before_teardown || [], finalRuntime);
          if (runtimeFailures.length) {
            fail(label, 'runtime-resource-errors-present-after-context-teardown', runtimeFailures);
          }
          evidence.push(record);
        }
      }
    }
  }
} finally {
  await launched.browser.close();
}

const report = {
  engine: launched.engine,
  chrome_launch_error: launched.chromeError || null,
  verdict_basis: 'POST_CONTEXT_TEARDOWN',
  contexts_expected: 16,
  contexts_observed: evidence.length,
  failures,
  evidence,
};
await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2));

if (evidence.length !== 16) {
  console.error(`Security runtime-listener lifetime gate FAILED: expected 16 contexts, observed ${evidence.length}`);
  process.exit(1);
}
if (failures.length) {
  console.error(`Security runtime-listener lifetime gate FAILED (${failures.length}) using ${launched.engine}`);
  for (const item of failures) console.error(`- ${item.context}: ${item.reason}${item.detail ? ` :: ${JSON.stringify(item.detail)}` : ''}`);
  process.exit(1);
}
console.log(`Security runtime-listener lifetime PASS using ${launched.engine}: 16 ES/EN Security 00/1.1 desktop/mobile normal/reduced contexts exercised teaching interactions plus lazy media playback, and the verdict used the final retained runtime/resource arrays only after context teardown. PIXEL_REVIEW/PEDAGOGY_REVIEW remain editorial.`);
