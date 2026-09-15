import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = process.env.S5_PREVIEW_URL ?? 'http://127.0.0.1:8000';
const outputDir = process.env.S5_SECURITY_SCREENSHOT_DIR ?? 'artifacts/visual-review/security';
await mkdir(outputDir, { recursive: true });

const chapters = [
  { slug: '00-presentacion', source: '00_presentacion_serie', roots: ['.secpath'] },
  { slug: '01-prompt-injection', source: '01-prompt-injection', roots: ['.ctxmix', '.ragtrace', '.defsim'] },
  { slug: '02-jailbreaks', source: '02-jailbreaks', roots: ['.jbsearch', '.jbbudget', '.jbladder'] },
  { slug: '03-envenenamiento', source: '03-envenenamiento', roots: ['.memlife', '.memgov', '.memprop', '.memlayers'] },
  { slug: '04-red-teaming', source: '04-red-teaming', roots: ['.threatbuild', '.uplift3', '.causalrt', '.regloop'] },
  { slug: '05-controles-produccion', source: '05-controles-produccion', roots: ['.proddef', '.mcpbound', '.killpath', '.releasegate'] },
];

const routes = [];
for (const locale of ['es', 'en']) {
  const prefix = locale === 'en' ? '/en' : '';
  for (const chapter of chapters) {
    routes.push({
      ...chapter,
      locale,
      path: `${prefix}/series/seguridad-ia/${chapter.source}/`,
    });
  }
}
routes.push(
  { slug: 'topic-prompt-injection', locale: 'es', path: '/temas/prompt-injection/', roots: ['.ctxmix', '.ragtrace', '.defsim'] },
  { slug: 'topic-prompt-injection', locale: 'en', path: '/en/temas/prompt-injection/', roots: ['.ctxmix', '.ragtrace', '.defsim'] },
);

const viewports = [
  { name: 'desktop', viewport: { width: 1440, height: 1100 }, mobile: false },
  { name: 'mobile', viewport: { width: 390, height: 844 }, mobile: true },
];
const motionModes = [
  { name: 'normal', reducedMotion: 'no-preference' },
  { name: 'reduced', reducedMotion: 'reduce' },
];

const previewHost = (() => {
  try { return new URL(baseUrl).hostname; } catch { return ''; }
})();
const isLocalPreview = previewHost === '127.0.0.1' || previewHost === 'localhost';
const isPreviewOnlySitemapProbe = (url, type) => {
  if (!isLocalPreview || type !== 'xhr') return false;
  try {
    const parsed = new URL(url);
    return parsed.hostname === '5sigmas.com' && parsed.pathname.endsWith('/sitemap.xml');
  } catch { return false; }
};
const isGenericResourceConsoleError = (text) => (
  /^Failed to load resource: the server responded with a status of \d+/.test(text)
  || /^Failed to load resource: net::ERR_/.test(text)
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
      name: 'visual-interaction ERR_ABORTED remains fatal',
      event: { type: 'requestfailed', phase: 'visual-interaction', detail: 'net::ERR_ABORTED' },
      expected: false,
    },
    {
      name: 'full-page-scroll ERR_ABORTED remains fatal',
      event: { type: 'requestfailed', phase: 'full-page-scroll', detail: 'net::ERR_ABORTED' },
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
    throw new Error(`Security visual runtime classification mutation self-test failed: ${broken.map(item => item.name).join(', ')}`);
  }
}

runRuntimeMutationSelfTest();

const browser = await chromium.launch({ headless: true });
const report = [];
const failures = [];
const fail = (message) => failures.push(message);

async function checkCtxmix(page, root, route, mode, motion) {
  const context = `${route.locale}/${route.slug}/${mode.name}/${motion.name}`;
  const requiredNodes = [
    'policy-source', 'user-source', 'external-source', 'context',
    'model-proposal', 'authorization-gate', 'execution-result',
  ];
  for (const name of requiredNodes) {
    if (await root.locator(`[data-node="${name}"]`).count() !== 1) fail(`${context}: ctxmix missing data-node=${name}`);
  }

  const expectedTitle = route.locale === 'es'
    ? 'El modelo propone; el runtime decide qué puede ejecutarse'
    : 'The model proposes; the runtime decides what may execute';
  if (!(await root.innerText()).includes(expectedTitle)) fail(`${context}: ctxmix localized title missing`);

  const buttons = root.locator('[data-state-btn]');
  if (await buttons.count() !== 4) fail(`${context}: ctxmix requires four mechanism steps`);

  for (const state of ['1', '2', '3', '4']) {
    const button = root.locator(`[data-state-btn="${state}"]`);
    try {
      if (mode.mobile) await button.tap(); else await button.click();
      await page.waitForTimeout(motion.name === 'normal' ? 520 : 40);
    } catch (error) {
      fail(`${context}: cannot activate ctxmix state ${state}: ${error.message}`);
      continue;
    }
    const current = await root.getAttribute('data-state');
    if (current !== state) fail(`${context}: requested ctxmix state ${state}, got ${current}`);
    const pressed = await button.getAttribute('aria-pressed');
    if (pressed !== 'true') fail(`${context}: state ${state} does not expose aria-pressed=true`);

    if (state === '3') {
      const proposal = root.locator('[data-node="model-proposal"]');
      const text = await proposal.innerText();
      if (!text.includes('send_credentials')) fail(`${context}: state 3 does not expose the influenced tool proposal`);
      if (!await proposal.isVisible()) fail(`${context}: state 3 proposal is not visible`);
    }
    if (state === '4') {
      const gate = root.locator('[data-node="authorization-gate"]');
      const result = root.locator('[data-node="execution-result"]');
      if (!await gate.isVisible() || !await result.isVisible()) fail(`${context}: authorization/result must be visible in state 4`);
      const resultText = await result.innerText();
      const expected = route.locale === 'es' ? 'ACCIÓN DENEGADA' : 'ACTION DENIED';
      if (!resultText.includes(expected)) fail(`${context}: state 4 missing ${expected}`);
    }

    if (motion.name === 'normal') {
      await root.screenshot({ path: `${outputDir}/${route.locale}-${route.slug}-${mode.name}-ctxmix-state-${state}.png`, animations: 'allow' });
    }
  }

  const rootOverflow = await root.evaluate((node) => ({ scrollWidth: node.scrollWidth, clientWidth: node.clientWidth }));
  if (rootOverflow.scrollWidth > rootOverflow.clientWidth + 2) fail(`${context}: ctxmix horizontal overflow ${JSON.stringify(rootOverflow)}`);

  const meaningfulSizes = await root.locator('.ctxmix__source strong,.ctxmix__segment,.ctxmix__proposal-item,.ctxmix__check,.ctxmix__principle,.ctxmix__explain p').evaluateAll((nodes) => nodes.map((node) => ({
    text: (node.textContent || '').trim().slice(0, 80),
    px: Number.parseFloat(getComputedStyle(node).fontSize),
  })));
  for (const item of meaningfulSizes) {
    if (item.px < 11) fail(`${context}: ctxmix meaningful text below 11px (${item.px}px) ${JSON.stringify(item.text)}`);
  }

  const animated = await root.evaluate((node) => [node, ...node.querySelectorAll('*')].filter((el) => {
    const style = getComputedStyle(el);
    const durations = `${style.transitionDuration},${style.animationDuration}`.split(',').map((value) => Number.parseFloat(value) || 0);
    return durations.some((value) => value > 0);
  }).length);
  if (motion.name === 'normal' && animated === 0) fail(`${context}: normal-motion mechanism has no progressive transition`);
  if (motion.name === 'reduced' && animated !== 0) fail(`${context}: reduced-motion ctxmix still has ${animated} animated elements`);
}

async function exerciseGenericVisual(page, selector, route, mode, motion) {
  const context = `${route.locale}/${route.slug}/${mode.name}/${motion.name}`;
  const matches = page.locator(selector);
  const count = await matches.count();
  if (count !== 1) {
    fail(`${context}: expected exactly one ${selector}, found ${count}`);
    return null;
  }
  const root = matches.first();
  if (!await root.isVisible()) {
    fail(`${context}: visual ${selector} is not visible`);
    return null;
  }
  const box = await root.boundingBox();
  if (!box || box.width < 240 || box.height < 80) fail(`${context}: visual ${selector} invalid bounds ${JSON.stringify(box)}`);

  if (selector === '.ctxmix') await checkCtxmix(page, root, route, mode, motion);
  else {
    const buttons = root.locator('button:visible:not([disabled])');
    for (let index = 0; index < await buttons.count(); index += 1) {
      const button = buttons.nth(index);
      const label = ((await button.innerText()) || '').trim() || await button.getAttribute('aria-label');
      if (!label) fail(`${context}: unlabelled control inside ${selector}`);
      try {
        if (mode.mobile) await button.tap(); else await button.click();
        await page.waitForTimeout(motion.name === 'normal' ? 120 : 30);
      } catch (error) {
        fail(`${context}: ${selector} control ${index} cannot be activated: ${error.message}`);
      }
    }
  }

  return { selector, width: Math.round(box?.width ?? 0), height: Math.round(box?.height ?? 0) };
}

try {
  for (const route of routes) {
    for (const mode of viewports) {
      for (const motion of motionModes) {
        const context = await browser.newContext({
          viewport: mode.viewport,
          isMobile: mode.mobile,
          hasTouch: mode.mobile,
          deviceScaleFactor: 1,
          colorScheme: 'light',
          reducedMotion: motion.reducedMotion,
        });
        const page = await context.newPage();
        const runtimeEvents = [];
        let phase = 'navigation';
        let seq = 0;
        let nextRequestId = 1;
        const requestIds = new WeakMap();
        const requestId = request => {
          if (!requestIds.has(request)) requestIds.set(request, nextRequestId++);
          return requestIds.get(request);
        };
        const pushRuntime = event => runtimeEvents.push({ seq: ++seq, phase, ...event });

        page.on('pageerror', (error) => pushRuntime({ type: 'pageerror', detail: String(error) }));
        page.on('console', (message) => {
          if (message.type() !== 'error') return;
          const text = message.text();
          if (isGenericResourceConsoleError(text)) return;
          const location = message.location();
          const where = location?.url ? ` @ ${location.url}:${location.lineNumber ?? 0}:${location.columnNumber ?? 0}` : '';
          pushRuntime({ type: 'console', detail: `${text}${where}` });
        });
        page.on('response', (response) => {
          if (response.status() < 400) return;
          const request = response.request();
          if (isPreviewOnlySitemapProbe(response.url(), request.resourceType())) return;
          pushRuntime({
            type: 'http',
            requestId: requestId(request),
            resourceType: request.resourceType(),
            status: response.status(),
            url: response.url(),
          });
        });
        page.on('requestfailed', (request) => {
          if (isPreviewOnlySitemapProbe(request.url(), request.resourceType())) return;
          pushRuntime({
            type: 'requestfailed',
            requestId: requestId(request),
            resourceType: request.resourceType(),
            url: request.url(),
            detail: request.failure()?.errorText ?? 'unknown',
          });
        });

        const runLabel = `${route.locale}/${route.slug}/${mode.name}/${motion.name}`;
        let response;
        let navigationError = null;
        try {
          phase = 'navigation';
          response = await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'networkidle', timeout: 30_000 });
        } catch (error) {
          navigationError = error.message;
          fail(`${runLabel}: navigation failed: ${error.message}`);
        }

        if (navigationError) {
          phase = 'teardown';
          try {
            await context.close();
          } catch (error) {
            pushRuntime({ type: 'context-close', detail: String(error) });
          }
          const finalRuntime = runtimeEvents.map(event => ({ ...event }));
          const runtimeVerdict = classifyRuntime(finalRuntime);
          if (runtimeVerdict.unexpected.length) fail(`${runLabel}: browser errors after navigation failure: ${JSON.stringify(runtimeVerdict.unexpected)}`);
          report.push({
            route: route.path,
            locale: route.locale,
            viewport: mode.name,
            motion: motion.name,
            navigationError,
            runtimeEvents: finalRuntime,
            runtimeUnexpected: runtimeVerdict.unexpected,
            expectedTeardownCancellations: runtimeVerdict.expectedTeardownCancellations,
            verdictBasis: 'POST_CONTEXT_TEARDOWN',
          });
          continue;
        }

        if (!response?.ok()) fail(`${runLabel}: HTTP ${response?.status() ?? 'no response'}`);
        phase = 'font-settle';
        await page.evaluate(() => document.fonts.ready);
        const htmlLang = (await page.locator('html').getAttribute('lang') || '').toLowerCase();
        if (!htmlLang.startsWith(route.locale)) fail(`${runLabel}: html lang=${JSON.stringify(htmlLang)}`);

        phase = 'initial-layout';
        const initial = await page.evaluate(() => ({
          viewportWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          scrollHeight: document.documentElement.scrollHeight,
          brokenImages: [...document.images].filter((img) => img.complete && img.naturalWidth === 0).map((img) => img.currentSrc || img.src),
        }));
        if (initial.scrollWidth > initial.viewportWidth + 4) fail(`${runLabel}: page horizontal overflow ${JSON.stringify(initial)}`);
        if (initial.brokenImages.length) fail(`${runLabel}: broken images ${initial.brokenImages.join(', ')}`);

        phase = 'visual-interaction';
        const visuals = [];
        for (const selector of route.roots) {
          const result = await exerciseGenericVisual(page, selector, route, mode, motion);
          if (result) visuals.push(result);
        }

        phase = 'full-page-scroll';
        await page.evaluate(async () => {
          for (let y = 0; y < document.documentElement.scrollHeight; y += Math.max(280, innerHeight * .7)) {
            scrollTo(0, y);
            await new Promise((resolve) => setTimeout(resolve, 25));
          }
          scrollTo(0, document.documentElement.scrollHeight);
        });
        await page.waitForTimeout(250);

        phase = 'post-interaction-layout';
        const after = await page.evaluate(() => ({
          viewportWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          scrollHeight: document.documentElement.scrollHeight,
          brokenImages: [...document.images].filter((img) => img.complete && img.naturalWidth === 0).map((img) => img.currentSrc || img.src),
        }));
        if (after.scrollWidth > after.viewportWidth + 4) fail(`${runLabel}: overflow after full-page interaction ${JSON.stringify(after)}`);
        if (after.brokenImages.length) fail(`${runLabel}: broken images after scroll ${after.brokenImages.join(', ')}`);

        if (motion.name === 'normal') {
          phase = 'screenshot';
          await page.screenshot({ path: `${outputDir}/${route.locale}-${route.slug}-${mode.name}-full.png`, fullPage: true, animations: 'allow' });
        }

        phase = 'settle';
        await page.waitForTimeout(150);
        phase = 'teardown';
        try {
          await context.close();
        } catch (error) {
          pushRuntime({ type: 'context-close', detail: String(error) });
        }

        const finalRuntime = runtimeEvents.map(event => ({ ...event }));
        const runtimeVerdict = classifyRuntime(finalRuntime);
        if (runtimeVerdict.unexpected.length) {
          fail(`${runLabel}: browser errors: ${JSON.stringify(runtimeVerdict.unexpected)}`);
        }

        report.push({
          route: route.path,
          locale: route.locale,
          viewport: mode.name,
          motion: motion.name,
          initial,
          after,
          visuals,
          runtimeEvents: finalRuntime,
          runtimeUnexpected: runtimeVerdict.unexpected,
          expectedTeardownCancellations: runtimeVerdict.expectedTeardownCancellations,
          verdictBasis: 'POST_CONTEXT_TEARDOWN',
        });
      }
    }
  }
} finally {
  await browser.close();
}

await writeFile(`${outputDir}/report.json`, JSON.stringify({ report, failures }, null, 2));
if (failures.length) {
  console.error(`Seguridad visual QA failed (${failures.length})`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}
console.log(`Seguridad visual QA PASS: ${routes.length} ES/EN routes × desktop/mobile × normal/reduced motion, with real touch on mobile and prompt-injection influence/authorization states.`);
