import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.S5_PREVIEW_URL || 'http://127.0.0.1:8000';
const outputDir = process.env.S5_SECURITY_WATCH_SUMMARY_DIR || 'artifacts/security-requalification/watch-summary';

const targets = [
  {
    locale: 'es',
    route: '/videos/series/seguridad-ia/00_presentacion_serie/',
    expectedSummary: 'Cómo una entrada no confiable puede influir en un sistema con IA y qué fronteras de autorización limitan que esa influencia se convierta en una acción.',
    expectedTakeaways: [
      '1. Una orden escondida en un documento puede cambiar lo que hace el sistema',
      '2. Pedir al modelo que ignore sus límites',
      '3. Guardar una señal peligrosa dentro del sistema',
    ],
    requiredUi: ['Resumen del vídeo', 'Leer el artículo →', 'Vídeos relacionados'],
    forbiddenUi: ['Video summary', 'Read the article →', 'Related videos'],
  },
  {
    locale: 'en',
    route: '/en/videos/series/seguridad-ia/00_presentacion_serie/',
    expectedSummary: 'How untrusted input can influence an AI system and which authorization boundaries limit whether that influence becomes an action.',
    expectedTakeaways: [
      '1. An instruction hidden in a document can change what the system does',
      '2. Asking the model to ignore its limits',
      '3. Keeping a dangerous signal inside the system',
    ],
    requiredUi: ['Video summary', 'Read the article →', 'Related videos'],
    forbiddenUi: ['Resumen del vídeo', 'Leer el artículo →', 'Vídeos relacionados'],
  },
];

const profiles = [
  { name: 'desktop', viewport: { width: 1440, height: 1000 }, isMobile: false, hasTouch: false },
  { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
];

const motions = [
  { name: 'normal', value: 'no-preference' },
  { name: 'reduced', value: 'reduce' },
];

const compact = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const isExpectedMediaAbort = (url, errorText = '') => /\.(mp4|webm)(?:\?|$)/i.test(url) && /ERR_ABORTED|NS_BINDING_ABORTED/i.test(errorText);

await fs.mkdir(path.join(outputDir, 'screenshots'), { recursive: true });

const browser = await chromium.launch({ headless: true });
const contexts = [];
const failures = [];

for (const target of targets) {
  for (const profile of profiles) {
    for (const motion of motions) {
      const label = `${target.locale}-${profile.name}-${motion.name}`;
      const runtimeUnexpected = [];
      const context = await browser.newContext({
        viewport: profile.viewport,
        isMobile: profile.isMobile,
        hasTouch: profile.hasTouch,
        deviceScaleFactor: 1,
      });
      const page = await context.newPage();
      await page.emulateMedia({ reducedMotion: motion.value });

      page.on('console', (message) => {
        if (message.type() === 'error') {
          runtimeUnexpected.push({ type: 'console', text: message.text() });
        }
      });
      page.on('pageerror', (error) => {
        runtimeUnexpected.push({ type: 'pageerror', text: error.message });
      });
      page.on('requestfailed', (request) => {
        const errorText = request.failure()?.errorText || '';
        if (!isExpectedMediaAbort(request.url(), errorText)) {
          runtimeUnexpected.push({ type: 'requestfailed', url: request.url(), errorText });
        }
      });
      page.on('response', (response) => {
        if (response.status() >= 400) {
          runtimeUnexpected.push({ type: 'http', url: response.url(), status: response.status() });
        }
      });

      const url = new URL(target.route, baseUrl).toString();
      let summaryText = '';
      let takeawayTitles = [];
      let fullPageScreenshot = '';
      let headerScreenshot = '';
      let summaryScreenshot = '';
      let dimensions = null;
      let uiText = '';
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        const watch = page.locator('[data-s5-video-watch]');
        const header = watch.locator('.s5-video-watch__header');
        const summaryDescription = header.locator(':scope > p');
        const takeawaySection = watch.locator('.s5-video-watch__summary');
        await watch.waitFor({ state: 'visible', timeout: 15_000 });
        await summaryDescription.waitFor({ state: 'visible', timeout: 15_000 });
        await takeawaySection.waitFor({ state: 'visible', timeout: 15_000 });
        await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});

        await page.evaluate(async () => {
          document.documentElement.style.scrollBehavior = 'auto';
          if (document.body) document.body.style.scrollBehavior = 'auto';
          const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
          for (const y of [0, maxY * 0.33, maxY * 0.66, maxY]) {
            window.scrollTo(0, y);
            window.dispatchEvent(new Event('scroll'));
            await new Promise((resolve) => setTimeout(resolve, 90));
          }
          window.scrollTo(0, 0);
          window.dispatchEvent(new Event('scroll'));
        });
        await page.waitForTimeout(250);

        summaryText = compact(await summaryDescription.textContent());
        takeawayTitles = (await takeawaySection.locator('article h2').allTextContents()).map(compact);
        uiText = compact(await watch.textContent());
        dimensions = await page.evaluate(() => ({
          viewportWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          scrollHeight: document.documentElement.scrollHeight,
        }));

        if (summaryText !== target.expectedSummary) {
          failures.push(`${label}: locale-native header summary mismatch; expected=${JSON.stringify(target.expectedSummary)} got=${JSON.stringify(summaryText)}`);
        }
        if (JSON.stringify(takeawayTitles) !== JSON.stringify(target.expectedTakeaways)) {
          failures.push(`${label}: pedagogical takeaway sequence mismatch; expected=${JSON.stringify(target.expectedTakeaways)} got=${JSON.stringify(takeawayTitles)}`);
        }
        for (const required of target.requiredUi) {
          if (!uiText.includes(required)) failures.push(`${label}: required UI missing: ${required}`);
        }
        for (const forbidden of target.forbiddenUi) {
          if (uiText.includes(forbidden)) failures.push(`${label}: wrong-locale UI leaked: ${forbidden}`);
        }
        if (dimensions.scrollWidth > dimensions.viewportWidth + 2) {
          failures.push(`${label}: global horizontal overflow ${dimensions.scrollWidth - dimensions.viewportWidth}px`);
        }

        fullPageScreenshot = path.join(outputDir, 'screenshots', `${label}-full.jpg`);
        headerScreenshot = path.join(outputDir, 'screenshots', `${label}-header.jpg`);
        summaryScreenshot = path.join(outputDir, 'screenshots', `${label}-takeaways.jpg`);
        await page.screenshot({ path: fullPageScreenshot, fullPage: true, type: 'jpeg', quality: 88 });
        await header.screenshot({ path: headerScreenshot, type: 'jpeg', quality: 94 });
        await takeawaySection.screenshot({ path: summaryScreenshot, type: 'jpeg', quality: 94 });
        await page.waitForTimeout(180);
      } catch (error) {
        failures.push(`${label}: ${error?.stack || error}`);
      }

      if (runtimeUnexpected.length > 0) {
        failures.push(`${label}: unexpected runtime/resource events ${JSON.stringify(runtimeUnexpected)}`);
      }

      contexts.push({
        label,
        locale: target.locale,
        route: target.route,
        profile: profile.name,
        motion: motion.name,
        viewport: profile.viewport,
        summaryText,
        expectedSummary: target.expectedSummary,
        takeawayTitles,
        expectedTakeaways: target.expectedTakeaways,
        dimensions,
        runtimeUnexpected,
        fullPageScreenshot,
        headerScreenshot,
        summaryScreenshot,
        verdictBasis: 'PRE_CONTEXT_TEARDOWN_AND_RETAINED_PIXEL_EVIDENCE',
      });
      await context.close();
    }
  }
}

await browser.close();

const report = {
  schema_version: 2,
  scope: 'security00_watch_summary_exact_head_pixel_evidence',
  expected_contexts: targets.length * profiles.length * motions.length,
  contexts_observed: contexts.length,
  locales: targets.map((target) => target.locale),
  profiles: profiles.map((profile) => profile.name),
  motions: motions.map((motion) => motion.name),
  contexts,
  failures,
  golden: false,
  media_pass: false,
  media_audio_evidence: false,
  pixel_review: 'PENDING_MANUAL_INSPECTION_OF_RETAINED_WATCH_PAGE_PIXELS',
  pedagogy_review: 'PENDING_MANUAL_EDITORIAL_REVIEW_OF_SUMMARY_MECHANISM_AND_ES_EN_EQUIVALENCE',
};

await fs.writeFile(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  scope: report.scope,
  expected_contexts: report.expected_contexts,
  contexts_observed: report.contexts_observed,
  failure_count: failures.length,
  golden: false,
  media_pass: false,
  pixel_review: report.pixel_review,
  pedagogy_review: report.pedagogy_review,
}, null, 2));

if (contexts.length !== report.expected_contexts || failures.length > 0) process.exit(1);
