import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.S5_PREVIEW_URL ?? 'http://127.0.0.1:8000';
const outputDir = process.env.S5_SECURITY_TRACE_DIR ?? 'artifacts/security-requalification/trace-checkpoints';
const screenshotDir = path.join(outputDir, 'screenshots');
await mkdir(screenshotDir, { recursive: true });

const routes = [
  { locale: 'es', slug: '00-presentacion', path: '/series/seguridad-ia/00_presentacion_serie/', root: '.secpath', kind: 'secpath' },
  { locale: 'en', slug: '00-presentacion', path: '/en/series/seguridad-ia/00_presentacion_serie/', root: '.secpath', kind: 'secpath' },
  { locale: 'es', slug: '01-prompt-injection', path: '/series/seguridad-ia/01-prompt-injection/', root: '.ragtrace', kind: 'ragtrace' },
  { locale: 'en', slug: '01-prompt-injection', path: '/en/series/seguridad-ia/01-prompt-injection/', root: '.ragtrace', kind: 'ragtrace' },
];

const profiles = [
  { name: 'desktop-normal', viewport: { width: 1440, height: 1100 }, mobile: false, reducedMotion: 'no-preference' },
  { name: 'desktop-reduced', viewport: { width: 1440, height: 1100 }, mobile: false, reducedMotion: 'reduce' },
  { name: 'mobile-normal', viewport: { width: 390, height: 844 }, mobile: true, reducedMotion: 'no-preference' },
  { name: 'mobile-reduced', viewport: { width: 390, height: 844 }, mobile: true, reducedMotion: 'reduce' },
];

const failures = [];
const contexts = [];
const fail = (label, message) => failures.push(`${label}: ${message}`);
const sanitize = (value) => value.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');

const isGenericResourceConsoleError = (text) => (
  /^Failed to load resource: the server responded with a status of \d+/.test(text)
  || /^Failed to load resource: net::ERR_/.test(text)
);

const isExpectedTeardownCancellation = (event) => (
  event.type === 'requestfailed'
  && event.phase === 'teardown'
  && /ERR_ABORTED/i.test(event.errorText ?? '')
);

async function activate(locator, profile) {
  if (profile.mobile) await locator.tap();
  else await locator.click();
}

async function waitForStep(page, selector, expected, label) {
  try {
    await page.waitForFunction(
      ({ rootSelector, step }) => document.querySelector(rootSelector)?.dataset.step === String(step),
      { rootSelector: selector, step: expected },
      { timeout: 6000 },
    );
  } catch (error) {
    throw new Error(`${label} never reached data-step=${expected}: ${error.message}`);
  }
}

async function viewportEvidence(page, target, route, profile, checkpoint, root) {
  await target.scrollIntoViewIfNeeded();
  await page.waitForTimeout(40);
  const filename = `${route.locale}-${route.slug}-${profile.name}-${sanitize(checkpoint)}-viewport.jpg`;
  await page.screenshot({
    path: path.join(screenshotDir, filename),
    fullPage: false,
    type: 'jpeg',
    quality: 88,
    animations: 'allow',
  });

  const geometry = await page.evaluate(({ rootSelector, targetSelector }) => {
    const rootNode = document.querySelector(rootSelector);
    const targetNode = rootNode?.querySelector(targetSelector) ?? rootNode;
    const targetRect = targetNode?.getBoundingClientRect();
    const chrome = [...document.querySelectorAll('.md-header,.md-tabs,[data-md-component="header"]')]
      .map((element) => ({
        style: getComputedStyle(element),
        rect: element.getBoundingClientRect(),
      }))
      .filter(({ style, rect }) => ['fixed', 'sticky'].includes(style.position) && rect.height > 0 && rect.bottom > 0)
      .map(({ rect }) => ({ top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left }));
    const target = targetRect ? {
      top: targetRect.top,
      right: targetRect.right,
      bottom: targetRect.bottom,
      left: targetRect.left,
      width: targetRect.width,
      height: targetRect.height,
    } : null;
    const overlaps = target ? chrome.filter((rect) => !(
      target.right <= rect.left
      || target.left >= rect.right
      || target.bottom <= rect.top
      || target.top >= rect.bottom
    )) : [];
    return {
      mode: rootNode?.dataset.mode ?? null,
      step: rootNode?.dataset.step ?? null,
      target,
      stickyChrome: chrome,
      targetStickyOverlapCount: overlaps.length,
    };
  }, { rootSelector: route.root, targetSelector: await target.evaluate((node, rootSelector) => {
    const rootNode = document.querySelector(rootSelector);
    if (!rootNode || node === rootNode) return ':scope';
    if (node.classList.contains('secpath__stop')) return '.secpath__stop.is-active';
    if (node.classList.contains('ragtrace__ranking')) return '.ragtrace__ranking';
    if (node.classList.contains('ragtrace__ctx--retrieved')) return '.ragtrace__ctx--retrieved';
    if (node.classList.contains('ragtrace__proposal')) return '.ragtrace__proposal';
    return ':scope';
  }, route.root) });

  if (!geometry.target || geometry.target.width < 40 || geometry.target.height < 20) {
    throw new Error(`${checkpoint} target missing/invalid: ${JSON.stringify(geometry.target)}`);
  }
  if (geometry.targetStickyOverlapCount > 0) {
    throw new Error(`${checkpoint} semantic target is occluded by sticky chrome: ${JSON.stringify(geometry)}`);
  }

  return { checkpoint, screenshot: `screenshots/${filename}`, geometry };
}

async function captureSecpath(page, root, route, profile, label) {
  const evidence = [];
  const bounded = root.locator('[data-mode-btn="bounded"]');
  const unbounded = root.locator('[data-mode-btn="unbounded"]');
  const play = root.locator('[data-action="play"]');

  await activate(bounded, profile);
  await activate(play, profile);
  await waitForStep(page, route.root, 1, label);
  evidence.push(await viewportEvidence(page, root.locator('.secpath__stop.is-active'), route, profile, 'bounded-start-step-1', root));
  await waitForStep(page, route.root, 3, label);
  evidence.push(await viewportEvidence(page, root.locator('.secpath__stop.is-active'), route, profile, 'bounded-intermediate-step-3', root));
  await waitForStep(page, route.root, 5, label);
  evidence.push(await viewportEvidence(page, root.locator('.secpath__stop.is-active'), route, profile, 'bounded-final-step-5', root));

  await activate(unbounded, profile);
  await activate(play, profile);
  await waitForStep(page, route.root, 6, label);
  evidence.push(await viewportEvidence(page, root.locator('.secpath__stop.is-active'), route, profile, 'unbounded-final-step-6', root));
  return evidence;
}

async function captureRagtrace(page, root, route, profile, label) {
  const evidence = [];
  const poisoned = root.locator('[data-mode-btn="poisoned"]');
  const clean = root.locator('[data-mode-btn="clean"]');
  const run = root.locator('[data-run]');

  await activate(poisoned, profile);
  await activate(run, profile);
  await waitForStep(page, route.root, 1, label);
  evidence.push(await viewportEvidence(page, root.locator('.ragtrace__ranking'), route, profile, 'poisoned-start-step-1-ranking', root));
  await waitForStep(page, route.root, 2, label);
  evidence.push(await viewportEvidence(page, root.locator('.ragtrace__ctx--retrieved'), route, profile, 'poisoned-intermediate-step-2-context', root));
  await waitForStep(page, route.root, 3, label);
  evidence.push(await viewportEvidence(page, root.locator('.ragtrace__proposal'), route, profile, 'poisoned-final-step-3-proposal', root));

  await activate(clean, profile);
  await activate(run, profile);
  await waitForStep(page, route.root, 3, label);
  evidence.push(await viewportEvidence(page, root.locator('.ragtrace__proposal'), route, profile, 'clean-final-step-3-proposal', root));
  return evidence;
}

let browser;
let browserVersion = null;
try {
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  browserVersion = browser.version();

  for (const route of routes) {
    for (const profile of profiles) {
      const label = `${route.locale}/${route.slug}/${route.kind}/${profile.name}`;
      const context = await browser.newContext({
        viewport: profile.viewport,
        isMobile: profile.mobile,
        hasTouch: profile.mobile,
        reducedMotion: profile.reducedMotion,
        deviceScaleFactor: 1,
        colorScheme: 'light',
      });
      const page = await context.newPage();
      const runtimeEvents = [];
      let phase = 'navigation';
      let seq = 0;
      const pushRuntime = (event) => runtimeEvents.push({ seq: ++seq, phase, ...event });

      page.on('pageerror', (error) => pushRuntime({ type: 'pageerror', detail: String(error) }));
      page.on('console', (message) => {
        if (message.type() !== 'error') return;
        const text = message.text();
        if (isGenericResourceConsoleError(text)) return;
        pushRuntime({ type: 'console', detail: text, location: message.location() });
      });
      page.on('response', (response) => {
        if (response.status() >= 400) pushRuntime({ type: 'http', status: response.status(), url: response.url() });
      });
      page.on('requestfailed', (request) => pushRuntime({
        type: 'requestfailed',
        resourceType: request.resourceType(),
        url: request.url(),
        errorText: request.failure()?.errorText ?? 'unknown',
      }));

      let checkpoints = [];
      let executionError = null;
      try {
        phase = 'navigation';
        const response = await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'networkidle', timeout: 30_000 });
        if (!response?.ok()) throw new Error(`HTTP ${response?.status() ?? 'no response'}`);
        await page.evaluate(() => document.fonts.ready);
        const root = page.locator(route.root);
        if (await root.count() !== 1 || !await root.isVisible()) throw new Error(`expected one visible ${route.root}`);

        phase = 'semantic-checkpoints';
        checkpoints = route.kind === 'secpath'
          ? await captureSecpath(page, root, route, profile, label)
          : await captureRagtrace(page, root, route, profile, label);
      } catch (error) {
        executionError = error.message;
        fail(label, `semantic checkpoint capture failed: ${error.message}`);
      }

      phase = 'teardown';
      try {
        await context.close();
      } catch (error) {
        pushRuntime({ type: 'context-close', detail: String(error) });
      }
      const runtimeUnexpected = runtimeEvents.filter((event) => !isExpectedTeardownCancellation(event));
      if (runtimeUnexpected.length) fail(label, `runtime/resource errors ${JSON.stringify(runtimeUnexpected)}`);

      contexts.push({
        route: route.path,
        locale: route.locale,
        article: route.slug,
        visual: route.kind,
        profile: profile.name,
        viewport: profile.viewport,
        reducedMotion: profile.reducedMotion,
        hasTouch: profile.mobile,
        executionError,
        checkpoints,
        runtimeEvents,
        runtimeUnexpected,
        verdictBasis: 'POST_CONTEXT_TEARDOWN',
      });
    }
  }
} finally {
  if (browser) await browser.close();
}

if (contexts.length !== routes.length * profiles.length) {
  failures.push(`Expected ${routes.length * profiles.length} contexts, observed ${contexts.length}`);
}

const report = {
  schema_version: 1,
  scope: 'security-00-01-semantic-trace-checkpoints',
  golden: false,
  browser: { channel: 'chrome', version: browserVersion },
  expected_contexts: routes.length * profiles.length,
  observed_contexts: contexts.length,
  expected_checkpoint_model: {
    secpath: ['bounded-start-step-1', 'bounded-intermediate-step-3', 'bounded-final-step-5', 'unbounded-final-step-6'],
    ragtrace: ['poisoned-start-step-1-ranking', 'poisoned-intermediate-step-2-context', 'poisoned-final-step-3-proposal', 'clean-final-step-3-proposal'],
  },
  pixel_review: 'REQUIRES_MANUAL_INSPECTION_OF_REAL_VIEWPORT_SCREENSHOTS_WITH_STICKY_CHROME_VISIBLE',
  pedagogy_review: 'REQUIRES_MANUAL_EDITORIAL_REVIEW_OF_SEMANTIC_START_INTERMEDIATE_FINAL_STATES',
  failures,
  contexts,
};
await writeFile(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));

if (failures.length) {
  console.error(`Security semantic trace checkpoint capture failed (${failures.length})`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}
console.log(`Security semantic trace checkpoint capture PASS technically: ${contexts.length} contexts; manual pixel/pedagogy review remains fail-closed.`);
