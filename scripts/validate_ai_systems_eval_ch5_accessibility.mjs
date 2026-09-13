#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const routes = {
  es: '/series/evaluating-ai-systems-production/05-online-evaluation-shadow-canary-ab-guardrails-regression-gates/',
  en: '/en/series/evaluating-ai-systems-production/05-online-evaluation-shadow-canary-ab-guardrails-regression-gates/',
};
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const containsBox = (outer, inner, tolerance = 3) => outer && inner
  && inner.x >= outer.x - tolerance
  && inner.y >= outer.y - tolerance
  && inner.x + inner.width <= outer.x + outer.width + tolerance
  && inner.y + inner.height <= outer.y + outer.height + tolerance;

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 1000, hasTouch: false },
    { name: 'mobile', width: 390, height: 844, hasTouch: true },
  ]) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      hasTouch: viewport.hasTouch,
      isMobile: viewport.hasTouch,
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();

    for (const [locale, route] of Object.entries(routes)) {
      const badResources = [];
      const runtimeErrors = [];
      const responseListener = (response) => {
        try {
          const url = new URL(response.url());
          const origin = new URL(base).origin;
          if (url.origin === origin && response.status() >= 400 && !/favicon/i.test(url.pathname)) badResources.push(`${response.status()} ${url.pathname}`);
        } catch {}
      };
      const errorListener = (error) => runtimeErrors.push(String(error));
      page.on('response', responseListener);
      page.on('pageerror', errorListener);
      const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
      page.off('response', responseListener);
      page.off('pageerror', errorListener);

      check(response?.ok(), `${locale}/${viewport.name}: HTTP ${response?.status() ?? 'no response'}`);
      check(badResources.length === 0, `${locale}/${viewport.name}: broken same-origin resources ${JSON.stringify(badResources)}`);
      check(runtimeErrors.length === 0, `${locale}/${viewport.name}: runtime errors ${JSON.stringify(runtimeErrors)}`);

      const visual = page.locator('.s5v-online-eval').first();
      check((await visual.count()) === 1, `${locale}/${viewport.name}: online-eval visual missing`);
      if (!(await visual.count())) continue;

      const htmlLang = (await page.locator('html').getAttribute('lang') || '').toLowerCase();
      check(htmlLang.startsWith(locale), `${locale}/${viewport.name}: wrong html lang ${htmlLang}`);

      const nativeEquations = page.locator('.s5-native-equation math');
      check((await nativeEquations.count()) === 3, `${locale}/${viewport.name}: expected 3 native MathML equations`);
      const articleText = await page.locator('main').innerText();
      check(!/\\(?:frac|mathbf|text|hat|land)\b/.test(articleText), `${locale}/${viewport.name}: raw TeX command leaked into rendered article`);

      const scroll = visual.locator('.oe-scroll');
      check((await scroll.getAttribute('tabindex')) === '0', `${locale}/${viewport.name}: topology scroller must be keyboard focusable`);
      check((await scroll.getAttribute('role')) === 'region', `${locale}/${viewport.name}: topology scroller must expose region role`);
      const aria = await scroll.getAttribute('aria-label');
      check(Boolean(aria && aria.length > 20), `${locale}/${viewport.name}: topology scroller lacks meaningful aria-label`);

      const pageOverflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      check(pageOverflow.scrollWidth <= pageOverflow.clientWidth + 1, `${locale}/${viewport.name}: page-level horizontal overflow ${JSON.stringify(pageOverflow)}`);
      const scrollerMetrics = await scroll.evaluate((node) => ({ scrollWidth: node.scrollWidth, clientWidth: node.clientWidth, overflowX: getComputedStyle(node).overflowX }));
      if (viewport.name === 'mobile') {
        check(scrollerMetrics.scrollWidth > scrollerMetrics.clientWidth + 300, `${locale}/mobile: online-eval topology should require intentional horizontal scroll ${JSON.stringify(scrollerMetrics)}`);
        check(['auto', 'scroll'].includes(scrollerMetrics.overflowX), `${locale}/mobile: scroller overflow-x is ${scrollerMetrics.overflowX}`);
      } else {
        check(scrollerMetrics.scrollWidth <= scrollerMetrics.clientWidth + 2, `${locale}/desktop: visual should fit without internal horizontal scroll ${JSON.stringify(scrollerMetrics)}`);
      }

      const boundary = (name) => visual.locator(`[data-boundary="${name}"]`).first();
      const node = (name) => visual.locator(`[data-node="${name}"]`).first();
      for (const name of ['shadow-boundary','canary-boundary','ab-boundary']) check((await boundary(name).count()) === 1, `${locale}/${viewport.name}: missing boundary ${name}`);
      for (const name of ['candidate','offline','shadow','canary','ab','rollout','shadow-question','canary-question','ab-question','hard-guardrails','release-gate','rollback','pause','promote']) {
        check((await node(name).count()) === 1, `${locale}/${viewport.name}: missing node ${name}`);
      }

      const candidateBox = await node('candidate').boundingBox();
      const offlineBox = await node('offline').boundingBox();
      const shadowBox = await node('shadow').boundingBox();
      const canaryBox = await node('canary').boundingBox();
      const abBox = await node('ab').boundingBox();
      const rolloutBox = await node('rollout').boundingBox();
      if (candidateBox && offlineBox && shadowBox && canaryBox && abBox && rolloutBox) {
        check(candidateBox.x + candidateBox.width < offlineBox.x, `${locale}/${viewport.name}: candidate identity must precede offline gate`);
        check(offlineBox.x + offlineBox.width < shadowBox.x, `${locale}/${viewport.name}: offline gate must precede shadow`);
        check(shadowBox.x + shadowBox.width < canaryBox.x, `${locale}/${viewport.name}: shadow must precede canary`);
        check(canaryBox.x + canaryBox.width < abBox.x, `${locale}/${viewport.name}: canary must precede randomized A/B branch`);
        check(abBox.x + abBox.width < rolloutBox.x, `${locale}/${viewport.name}: A/B node must remain distinct from rollout`);
      }
      check(containsBox(await boundary('shadow-boundary').boundingBox(), shadowBox), `${locale}/${viewport.name}: shadow node must stay inside no-response-authority boundary`);
      check(containsBox(await boundary('canary-boundary').boundingBox(), canaryBox), `${locale}/${viewport.name}: canary node must stay inside limited-real-exposure boundary`);
      check(containsBox(await boundary('ab-boundary').boundingBox(), abBox), `${locale}/${viewport.name}: A/B node must stay inside experimental-assignment boundary`);

      const shadowQ = await node('shadow-question').boundingBox();
      const canaryQ = await node('canary-question').boundingBox();
      const abQ = await node('ab-question').boundingBox();
      if (shadowBox && shadowQ) check(shadowQ.y > shadowBox.y + shadowBox.height, `${locale}/${viewport.name}: shadow evidence question must be below shadow stage`);
      if (canaryBox && canaryQ) check(canaryQ.y > canaryBox.y + canaryBox.height, `${locale}/${viewport.name}: canary safety question must be below canary stage`);
      if (abBox && abQ) check(abQ.y > abBox.y + abBox.height, `${locale}/${viewport.name}: causal-effect question must be below A/B stage`);
      if (shadowQ && canaryQ && abQ) {
        check(shadowQ.x + shadowQ.width < canaryQ.x, `${locale}/${viewport.name}: shadow/canary evidence questions must remain distinct`);
        check(canaryQ.x + canaryQ.width < abQ.x, `${locale}/${viewport.name}: canary/A-B evidence questions must remain distinct`);
      }

      const hardBox = await node('hard-guardrails').boundingBox();
      const gateBox = await node('release-gate').boundingBox();
      const rollbackBox = await node('rollback').boundingBox();
      const pauseBox = await node('pause').boundingBox();
      const promoteBox = await node('promote').boundingBox();
      if (hardBox && gateBox) check(hardBox.x + hardBox.width < gateBox.x, `${locale}/${viewport.name}: hard guardrails must feed release gate from a separate lane`);
      if (gateBox && rollbackBox && pauseBox && promoteBox) {
        check(gateBox.x + gateBox.width < rollbackBox.x, `${locale}/${viewport.name}: rollback decision must follow release gate`);
        check(gateBox.x + gateBox.width < pauseBox.x, `${locale}/${viewport.name}: pause decision must follow release gate`);
        check(gateBox.x + gateBox.width < promoteBox.x, `${locale}/${viewport.name}: promote decision must follow release gate`);
        check(rollbackBox.y + rollbackBox.height < pauseBox.y, `${locale}/${viewport.name}: rollback and pause states must remain visually distinct`);
        check(pauseBox.y + pauseBox.height < promoteBox.y, `${locale}/${viewport.name}: pause and promote states must remain visually distinct`);
      }

      const text = await visual.innerText();
      if (locale === 'es') {
        for (const token of ['EXPOSICIÓN ≠ CAUSALIDAD','Shadow','Canary','A/B randomizado','¿Cómo se comporta?','¿Es seguro ampliar?','¿Qué efecto causa?','Hard guardrails','Regression / release gate','evidencia inconclusa']) {
          check(text.includes(token), `ES/${viewport.name}: localized visual text missing ${token}`);
        }
      } else {
        for (const token of ['EXPOSURE ≠ CAUSALITY','Shadow','Canary','Randomized A/B','How does it behave?','Is it safe to expand?','What effect does it cause?','Hard guardrails','Regression / release gate','inconclusive evidence']) {
          check(text.includes(token), `EN/${viewport.name}: localized visual text missing ${token}`);
        }
        check(!text.includes('EXPOSICIÓN') && !text.includes('¿Cómo se comporta?') && !text.includes('evidencia inconclusa'), `${locale}/${viewport.name}: Spanish visual leakage detected`);
      }

      const motion = await visual.evaluate((root) => [root, ...root.querySelectorAll('*')].map((element) => {
        const style = getComputedStyle(element);
        return { animation: style.animationName, duration: style.animationDuration, transition: style.transitionDuration };
      }).filter((value) => value.animation !== 'none' && value.duration !== '0s'));
      check(motion.length === 0, `${locale}/${viewport.name}: visual should remain static under reduced motion ${JSON.stringify(motion.slice(0, 5))}`);

      const screenshotBase = `ai-systems-eval-ch5-${locale}-${viewport.name}`;
      await page.screenshot({ path: path.join(outDir, `${screenshotBase}-page.png`), fullPage: true, animations: 'disabled' });
      await visual.screenshot({ path: path.join(outDir, `${screenshotBase}-visual.png`), animations: 'disabled' });
      if (viewport.name === 'mobile') {
        await scroll.evaluate((node) => { node.scrollLeft = node.scrollWidth; });
        await page.waitForTimeout(100);
        const reachedEnd = await scroll.evaluate((node) => node.scrollLeft + node.clientWidth >= node.scrollWidth - 4);
        check(reachedEnd, `${locale}/mobile: final release-decision columns are not reachable by horizontal scrolling`);
        await visual.screenshot({ path: path.join(outDir, `${screenshotBase}-visual-end.png`), animations: 'disabled' });
      }

      await scroll.focus();
      check(await scroll.evaluate((node) => document.activeElement === node), `${locale}/${viewport.name}: topology scroller cannot receive keyboard focus`);
    }
    await context.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`AI systems evaluation chapter 5.5 browser/accessibility gate failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('AI systems evaluation chapter 5.5 browser/accessibility gate PASS: ES/EN shadow/canary/A-B boundaries, evidence questions, hard guardrails, release decisions, desktop/mobile topology, focus, reduced-motion and resource integrity are intact.');
