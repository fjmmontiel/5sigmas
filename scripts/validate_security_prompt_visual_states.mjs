#!/usr/bin/env node
/**
 * Focused state/pixel evidence for Security 1.1 teaching visuals.
 *
 * This is an automated technical gate only. It captures meaningful mechanism
 * states for manual PIXEL_REVIEW/PEDAGOGY_REVIEW; it never declares either.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const out = path.resolve('artifacts/security-requalification/prompt-states');
await fs.mkdir(out, { recursive: true });

const routes = [
  { locale: 'es', route: '/series/seguridad-ia/01-prompt-injection/' },
  { locale: 'en', route: '/en/series/seguridad-ia/01-prompt-injection/' },
];
const widths = [1440, 390];
const motions = ['no-preference', 'reduce'];
const failures = [];
const evidence = [];
const check = (ok, message, detail = null) => { if (!ok) failures.push({ message, detail }); };
const overlap = (a, b, pad = 1) => Boolean(
  a && b
  && a.x < b.x + b.width - pad
  && a.x + a.width > b.x + pad
  && a.y < b.y + b.height - pad
  && a.y + a.height > b.y + pad
);

function isExpectedTeardownCancellation(event) {
  return event.type === 'requestfailed'
    && event.phase === 'teardown'
    && String(event.detail || '').includes('ERR_ABORTED');
}

function classifyRuntime(events) {
  return {
    unexpected: events.filter(event => !isExpectedTeardownCancellation(event)),
    expectedTeardownCancellations: events.filter(isExpectedTeardownCancellation),
  };
}

function runRuntimeMutationSelfTest() {
  const cases = [
    {
      name: 'teardown ERR_ABORTED is expected context cancellation',
      event: { type: 'requestfailed', phase: 'teardown', detail: 'net::ERR_ABORTED' },
      expected: true,
    },
    {
      name: 'interaction ERR_ABORTED remains fatal',
      event: { type: 'requestfailed', phase: 'ragtrace', detail: 'net::ERR_ABORTED' },
      expected: false,
    },
    {
      name: 'teardown non-abort request failure remains fatal',
      event: { type: 'requestfailed', phase: 'teardown', detail: 'net::ERR_FAILED' },
      expected: false,
    },
    {
      name: 'teardown pageerror remains fatal',
      event: { type: 'pageerror', phase: 'teardown', detail: 'late exception' },
      expected: false,
    },
    {
      name: 'teardown console error remains fatal',
      event: { type: 'console', phase: 'teardown', detail: 'late console error' },
      expected: false,
    },
    {
      name: 'teardown HTTP failure remains fatal',
      event: { type: 'http', phase: 'teardown', status: 500, url: 'https://example.invalid/fail' },
      expected: false,
    },
  ];
  const broken = cases.filter(item => isExpectedTeardownCancellation(item.event) !== item.expected);
  if (broken.length) {
    throw new Error(`Prompt-state runtime classification mutation self-test failed: ${broken.map(item => item.name).join(', ')}`);
  }
}

runRuntimeMutationSelfTest();

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

async function capture(locator, file) {
  await locator.scrollIntoViewIfNeeded();
  const placement = await locator.evaluate(async node => {
    const occluders = [...document.querySelectorAll('.md-header,.md-tabs,[data-md-component="header"]')]
      .map(el => ({ style: getComputedStyle(el), rect: el.getBoundingClientRect() }))
      .filter(({ style, rect }) => ['fixed', 'sticky'].includes(style.position) && rect.height > 0 && rect.bottom > 0 && rect.top <= 8);
    const safeTop = Math.max(0, ...occluders.map(({ rect }) => rect.bottom)) + 12;
    const before = node.getBoundingClientRect();
    const availableHeightBefore = Math.max(0, innerHeight - safeTop);
    const spareHeight = Math.max(0, availableHeightBefore - before.height);
    const placementInset = before.height <= availableHeightBefore + 1 ? Math.min(2, spareHeight / 2) : 0;
    const targetTop = safeTop + placementInset;
    const requestedScrollY = Math.max(0, window.scrollY + before.top - targetTop);
    if (before.top < targetTop) {
      const scrollingElement = document.scrollingElement || document.documentElement;
      scrollingElement.scrollTop = requestedScrollY;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }
    const after = node.getBoundingClientRect();
    const availableHeight = Math.max(0, innerHeight - safeTop);
    return {
      top: after.top,
      bottom: after.bottom,
      height: after.height,
      safeTop,
      viewportHeight: innerHeight,
      availableHeight,
      canFitBelowStickyChrome: after.height <= availableHeight + 1,
      spareHeight,
      placementInset,
      targetTop,
      requestedScrollY,
      actualScrollY: window.scrollY,
    };
  });
  check(
    !placement.canFitBelowStickyChrome || placement.top >= placement.safeTop - 1,
    `${file}: screenshot target that fits the viewport remains occluded by sticky navigation`,
    placement,
  );
  await locator.screenshot({
    path: path.join(out, file),
    animations: 'allow',
    style: '.md-header,.md-tabs,[data-md-component="header"] { visibility: hidden !important; }',
  });
}

async function assertReducedMotion(root, ctx) {
  const active = await root.evaluate(node => node.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length);
  check(active === 0, `${ctx}: animations still running under reduced motion`, { active });
}

async function assertShell(root, locale, ctx) {
  const shell = root.locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " anim-brand-shell ")][1]');
  check((await shell.count()) === 1, `${ctx}: visual is not wrapped by the canonical animation shell`);
  if (!(await shell.count())) return;
  const button = shell.locator('[data-anim-shell-open]').first();
  check((await button.count()) === 1, `${ctx}: fullscreen control missing from animation shell`);
  if (await button.count()) {
    const text = ((await button.innerText()) || '').trim().toLowerCase();
    const aria = ((await button.getAttribute('aria-label')) || '').trim().toLowerCase();
    if (locale === 'en') {
      check(text.includes('fullscreen') || aria.includes('fullscreen'), `${ctx}: English shell control is not localized`, { text, aria });
    } else {
      check(text.includes('pantalla completa') || aria.includes('pantalla completa'), `${ctx}: Spanish shell control is not localized`, { text, aria });
    }
  }
}

async function assertReadableText(root, selectors, ctx, minimumPx = 11) {
  const nodes = root.locator(selectors);
  const samples = await nodes.evaluateAll(items => items
    .filter(node => (node.textContent || '').trim().length > 0)
    .map(node => ({ text: (node.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 100), px: Number.parseFloat(getComputedStyle(node).fontSize) })));
  for (const sample of samples) {
    check(sample.px >= minimumPx, `${ctx}: meaningful text below ${minimumPx}px`, sample);
  }
}

async function inspectCtxmix(page, item, mobile, motion, stem, record) {
  const ctx = `${stem}/ctxmix`;
  const root = page.locator('.ctxmix').first();
  check((await root.count()) === 1, `${ctx}: visual missing`);
  if (!(await root.count())) return;
  await assertShell(root, item.locale, ctx);
  await assertReadableText(root, '.ctxmix__source-title,.ctxmix__source p,.ctxmix__segment,.ctxmix__proposal-item,.ctxmix__check,.ctxmix__verdict span,.ctxmix__principle,.ctxmix__explain p', ctx);

  for (const state of ['1', '2', '3', '4']) {
    await activate(root.locator(`[data-state-btn="${state}"]`), mobile);
    await page.waitForTimeout(motion === 'no-preference' ? 460 : 40);
    check((await root.getAttribute('data-state')) === state, `${ctx}: state ${state} did not activate`);
    if (state === '3') {
      check((await root.locator('[data-node="model-proposal"]').innerText()).includes('send_credentials'), `${ctx}: model-influence state does not expose the risky proposal`);
    }
    if (state === '4') {
      const result = await root.locator('[data-node="execution-result"]').innerText();
      const expected = item.locale === 'es' ? 'ACCIÓN DENEGADA' : 'ACTION DENIED';
      check(result.includes(expected), `${ctx}: authorization state missing ${expected}`);
    }
    await capture(root, `${stem}-ctxmix-state-${state}.png`);
  }
  if (motion === 'reduce') await assertReducedMotion(root, ctx);
  record.ctxmix = { states: ['1', '2', '3', '4'], screenshots: ['1', '2', '3', '4'] };
}

async function waitForStep(page, selector, step, timeout = 5000) {
  await page.waitForFunction(({ selector, step }) => document.querySelector(selector)?.dataset.step === String(step), { selector, step }, { timeout });
}

async function inspectRagtrace(page, item, mobile, motion, stem, record) {
  const ctx = `${stem}/ragtrace`;
  const root = page.locator('.ragtrace').first();
  check((await root.count()) === 1, `${ctx}: visual missing`);
  if (!(await root.count())) return;
  await assertShell(root, item.locale, ctx);
  await assertReadableText(root, '.ragtrace__query,.ragtrace__doc-title,.ragtrace__doc-note,.ragtrace__ctx,.ragtrace__proposal span,.ragtrace__status,.ragtrace__foot', ctx);

  const modeEvidence = [];
  let cleanProposal = '';
  let cleanRetrieved = '';
  for (const mode of ['clean', 'poisoned']) {
    await activate(root.locator(`[data-mode-btn="${mode}"]`), mobile);
    await page.waitForTimeout(40);
    check((await root.getAttribute('data-mode')) === mode, `${ctx}: ${mode} mode did not activate`);

    const expectedRows = mode === 'clean'
      ? ['runbook', 'tickets', 'wiki', 'poison']
      : ['poison', 'runbook', 'tickets', 'wiki'];
    const rankingSemantics = await root.locator('.ragtrace__ranking').evaluate(node => ({
      sequence: [...node.children].map(child => child.classList.contains('ragtrace__cut') ? 'CUT' : child.dataset.doc),
      ranks: [...node.querySelectorAll('.ragtrace__row')].map(row => ({
        doc: row.dataset.doc,
        rank: (row.querySelector('.ragtrace__rank')?.textContent || '').trim(),
        status: (row.querySelector('.ragtrace__selected')?.textContent || '').trim().toLowerCase(),
        statusAria: (row.querySelector('.ragtrace__selected')?.getAttribute('aria-label') || '').trim().toLowerCase(),
      })),
    }));
    const expectedSequence = [expectedRows[0], expectedRows[1], 'CUT', expectedRows[2], expectedRows[3]];
    check(
      JSON.stringify(rankingSemantics.sequence) === JSON.stringify(expectedSequence),
      `${ctx}: ${mode} DOM/accessibility sequence does not match the intended retrieval order`,
      { expectedSequence, actualSequence: rankingSemantics.sequence },
    );
    for (const [index, doc] of expectedRows.entries()) {
      const entry = rankingSemantics.ranks.find(candidate => candidate.doc === doc);
      check(entry?.rank === String(index + 1), `${ctx}: ${mode} ${doc} visible rank badge is stale`, { expected: String(index + 1), entry, rankingSemantics });
      const selected = index < 2;
      const expectedStatus = item.locale === 'es' ? (selected ? 'seleccionado' : 'fuera') : (selected ? 'selected' : 'outside');
      const expectedStatusAria = item.locale === 'es' ? (selected ? 'dentro del top-k' : 'fuera del top-k') : (selected ? 'inside top-k' : 'outside top-k');
      check(entry?.status === expectedStatus, `${ctx}: ${mode} ${doc} selection text disagrees with top-K membership`, { expectedStatus, entry });
      check(entry?.statusAria === expectedStatusAria, `${ctx}: ${mode} ${doc} accessible selection label disagrees with top-K membership`, { expectedStatusAria, entry });
    }

    const poison0 = await root.locator('[data-doc="poison"]').boundingBox();
    const cut0 = await root.locator('.ragtrace__cut').boundingBox();
    if (mode === 'clean') check(Boolean(poison0 && cut0 && poison0.y > cut0.y), `${ctx}: clean poisoned document should remain below top-K cut`, { poison0, cut0 });
    else check(Boolean(poison0 && cut0 && poison0.y < cut0.y), `${ctx}: optimized trigger should move poisoned document above top-K cut`, { poison0, cut0 });
    await capture(root, `${stem}-ragtrace-${mode}-step-0.png`);

    await activate(root.locator('[data-run]'), mobile);
    await waitForStep(page, '.ragtrace', 2);
    await capture(root, `${stem}-ragtrace-${mode}-step-2.png`);
    await waitForStep(page, '.ragtrace', 3);
    const retrieved = (await root.locator('[data-retrieved-copy]').innerText()).trim();
    const proposal = (await root.locator('[data-proposal-copy]').innerText()).trim();
    if (mode === 'clean') {
      check(!retrieved.toLowerCase().includes('envenenado') && !retrieved.toLowerCase().includes('poison'), `${ctx}: clean final context contains poisoned document`, { retrieved });
      cleanRetrieved = retrieved;
      cleanProposal = proposal;
    } else {
      const poisonWord = item.locale === 'es' ? 'envenenado' : 'poison';
      check(retrieved.toLowerCase().includes(poisonWord), `${ctx}: poisoned final context does not contain poisoned document`, { retrieved });
      const normalizedProposal = proposal.toLowerCase();
      const markers = item.locale === 'es'
        ? ['propuesta desviada', 'destino no solicitado']
        : ['drifted proposal', 'unrequested destination'];
      check(markers.every(marker => normalizedProposal.includes(marker)), `${ctx}: poisoned final proposal does not show a concrete downstream deviation`, { proposal, markers });
      check(Boolean(cleanProposal) && proposal !== cleanProposal, `${ctx}: poisoned proposal did not materially differ from clean proposal`, { cleanProposal, proposal });
      check(Boolean(cleanRetrieved) && retrieved !== cleanRetrieved, `${ctx}: poisoned retrieval did not materially differ from clean retrieval`, { cleanRetrieved, retrieved });
    }
    await capture(root, `${stem}-ragtrace-${mode}-step-3.png`);
    modeEvidence.push({ mode, expectedRows, rankingSemantics, retrieved, proposal });
  }
  if (motion === 'reduce') await assertReducedMotion(root, ctx);
  record.ragtrace = modeEvidence;
}

async function inspectDefsim(page, item, mobile, motion, stem, record) {
  const ctx = `${stem}/defsim`;
  const root = page.locator('.defsim').first();
  check((await root.count()) === 1, `${ctx}: visual missing`);
  if (!(await root.count())) return;
  await assertShell(root, item.locale, ctx);
  await assertReadableText(root, '.defsim__endpoint strong,.defsim__endpoint span,.defsim__gate-name,.defsim__gate-scope,.defsim__result strong,.defsim__result span,.defsim__legend div', ctx);

  const expectedStops = ['quarantine', 'schema', 'policy', 'human', 'none'];
  const gateOrder = ['quarantine', 'schema', 'policy', 'human'];
  const states = [];
  const assertNoTextCollisions = async label => {
    const inputTitle = await root.locator('.defsim__endpoint--input strong').boundingBox();
    const inputDetail = await root.locator('.defsim__endpoint--input span').boundingBox();
    const effectTitle = await root.locator('.defsim__endpoint--effect strong').boundingBox();
    const effectDetail = await root.locator('.defsim__endpoint--effect span').boundingBox();
    check(!overlap(inputTitle, inputDetail), `${ctx}/${label}: input title/detail overlap`, { inputTitle, inputDetail });
    check(!overlap(effectTitle, effectDetail), `${ctx}/${label}: effect title/detail overlap`, { effectTitle, effectDetail });
    for (const key of gateOrder) {
      const gate = root.locator(`[data-gate-node="${key}"]`);
      const name = await gate.locator('.defsim__gate-name').boundingBox();
      const scope = await gate.locator('.defsim__gate-scope').boundingBox();
      const badge = await gate.locator('.defsim__state').boundingBox();
      check(!overlap(name, scope), `${ctx}/${label}: ${key} name/scope overlap`, { name, scope });
      check(!overlap(name, badge), `${ctx}/${label}: ${key} name/state overlap`, { name, badge });
      check(!overlap(scope, badge), `${ctx}/${label}: ${key} scope/state overlap`, { scope, badge });
    }
    const resultTitle = await root.locator('[data-result-title]').boundingBox();
    const resultCopy = await root.locator('[data-result-copy]').boundingBox();
    check(!overlap(resultTitle, resultCopy), `${ctx}/${label}: result title/copy overlap`, { resultTitle, resultCopy });
  };

  check((await root.getAttribute('data-stop')) === 'quarantine', `${ctx}: initial stop should be quarantine`);
  await assertNoTextCollisions('all-on');
  await capture(root, `${stem}-defsim-all-on.png`);
  states.push({ disabled: [], stop: await root.getAttribute('data-stop') });

  for (let index = 0; index < gateOrder.length; index += 1) {
    const gate = gateOrder[index];
    await activate(root.locator(`[data-gate="${gate}"]`), mobile);
    await page.waitForTimeout(motion === 'no-preference' ? 520 : 40);
    const expected = expectedStops[index + 1];
    const actual = await root.getAttribute('data-stop');
    check(actual === expected, `${ctx}: after disabling ${gate}, expected stop=${expected}, got ${actual}`);
    await assertNoTextCollisions(`disabled-${gate}`);
    await capture(root, `${stem}-defsim-disabled-through-${gate}.png`);
    states.push({ disabled: gateOrder.slice(0, index + 1), stop: actual });
  }
  const finalTitle = (await root.locator('[data-result-title]').innerText()).trim();
  const effectWord = item.locale === 'es' ? 'efecto externo' : 'external effect';
  check(finalTitle.toLowerCase().includes(effectWord), `${ctx}: all-off state does not explain exposed external effect`, { finalTitle });
  if (motion === 'reduce') await assertReducedMotion(root, ctx);
  record.defsim = states;
}

const launched = await launchBrowser();
const browser = launched.browser;
try {
  for (const item of routes) {
    for (const width of widths) {
      for (const motion of motions) {
        const mobile = width === 390;
        const stem = `${item.locale}-${mobile ? 'mobile' : 'desktop'}-${motion === 'reduce' ? 'reduced' : 'normal'}`;
        const record = {
          locale: item.locale,
          route: item.route,
          width,
          motion,
          engine: launched.engine,
          chrome_launch_error: launched.chromeError || null,
          pixel_review: 'PENDING_MANUAL',
          pedagogy_review: 'PENDING_MANUAL',
        };
        const context = await browser.newContext({
          viewport: { width, height: mobile ? 844 : 1000 },
          isMobile: mobile,
          hasTouch: mobile,
          reducedMotion: motion,
          colorScheme: 'light',
        });
        const page = await context.newPage();
        const runtime = [];
        let phase = 'navigation';
        let seq = 0;
        let nextRequestId = 1;
        const requestIds = new WeakMap();
        const requestId = request => {
          if (!requestIds.has(request)) requestIds.set(request, nextRequestId++);
          return requestIds.get(request);
        };
        const pushRuntime = event => runtime.push({ seq: ++seq, phase, ...event });

        page.on('pageerror', error => pushRuntime({ type: 'pageerror', detail: String(error) }));
        page.on('console', message => {
          if (message.type() === 'error' && !/^Failed to load resource:/.test(message.text())) {
            pushRuntime({ type: 'console', detail: message.text() });
          }
        });
        page.on('requestfailed', request => {
          pushRuntime({
            type: 'requestfailed',
            requestId: requestId(request),
            resourceType: request.resourceType(),
            url: request.url(),
            detail: request.failure()?.errorText || '',
          });
        });
        page.on('response', response => {
          if (response.status() >= 400) {
            const request = response.request();
            pushRuntime({
              type: 'http',
              requestId: requestId(request),
              resourceType: request.resourceType(),
              status: response.status(),
              url: response.url(),
            });
          }
        });

        phase = 'navigation';
        const response = await page.goto(new URL(item.route, base).href, { waitUntil: 'domcontentloaded', timeout: 20000 });
        check(response?.ok(), `${stem}: page HTTP failed`, { status: response?.status() });
        await page.evaluate(async () => { await Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 1500))]); });
        phase = 'lazy-load';
        await page.evaluate(async () => {
          for (let y = 0; y < document.documentElement.scrollHeight; y += Math.max(innerHeight, 400)) {
            scrollTo(0, y);
            await new Promise(resolve => setTimeout(resolve, 20));
          }
          scrollTo(0, 0);
        });
        await page.waitForTimeout(120);

        const geometry = await page.evaluate(() => ({
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          lang: document.documentElement.lang,
        }));
        check(geometry.scrollWidth <= geometry.clientWidth + 1, `${stem}: global horizontal overflow`, geometry);
        check(geometry.lang.toLowerCase().startsWith(item.locale), `${stem}: wrong locale`, geometry);

        phase = 'ctxmix';
        await inspectCtxmix(page, item, mobile, motion, stem, record);
        phase = 'ragtrace';
        await inspectRagtrace(page, item, mobile, motion, stem, record);
        phase = 'defsim';
        await inspectDefsim(page, item, mobile, motion, stem, record);
        phase = 'settle';
        await page.waitForTimeout(150);
        phase = 'teardown';
        try {
          await context.close();
        } catch (error) {
          pushRuntime({ type: 'context-close', detail: String(error) });
        }

        const finalRuntime = runtime.map(event => ({ ...event }));
        const runtimeVerdict = classifyRuntime(finalRuntime);
        check(runtimeVerdict.unexpected.length === 0, `${stem}: persistent runtime/resource errors`, runtimeVerdict.unexpected);
        record.runtime = finalRuntime;
        record.runtime_unexpected = runtimeVerdict.unexpected;
        record.expected_teardown_cancellations = runtimeVerdict.expectedTeardownCancellations;
        record.verdict_basis = 'POST_CONTEXT_TEARDOWN';
        evidence.push(record);
      }
    }
  }
} finally {
  await browser.close();
}

await fs.writeFile(path.join(out, 'report.json'), JSON.stringify({ engine: launched.engine, chrome_launch_error: launched.chromeError || null, failures, evidence }, null, 2));
if (failures.length) {
  console.error(`Security Prompt Injection state gate FAILED (${failures.length}) using ${launched.engine}`);
  for (const failure of failures) console.error(`- ${failure.message}${failure.detail ? ` :: ${JSON.stringify(failure.detail)}` : ''}`);
  process.exit(1);
}
console.log(`Security Prompt Injection state gate technical PASS using ${launched.engine}; PIXEL_REVIEW and PEDAGOGY_REVIEW remain PENDING_MANUAL.`);