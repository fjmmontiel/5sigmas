#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const routes = {
  es: '/series/evaluating-ai-systems-production/03-llm-as-judge-evaluacion-humana-calibracion-sesgo-varianza-acuerdo/',
  en: '/en/series/evaluating-ai-systems-production/03-llm-as-judge-human-evaluation-calibration-bias-variance-agreement/',
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

      const visual = page.locator('.s5v-judge-calibration').first();
      check((await visual.count()) === 1, `${locale}/${viewport.name}: judge-calibration visual missing`);
      if (!(await visual.count())) continue;

      const htmlLang = (await page.locator('html').getAttribute('lang') || '').toLowerCase();
      check(htmlLang.startsWith(locale), `${locale}/${viewport.name}: wrong html lang ${htmlLang}`);

      const scroll = visual.locator('.jc-scroll');
      check((await scroll.getAttribute('tabindex')) === '0', `${locale}/${viewport.name}: topology scroller must be keyboard focusable`);
      check((await scroll.getAttribute('role')) === 'region', `${locale}/${viewport.name}: topology scroller must expose region role`);
      const aria = await scroll.getAttribute('aria-label');
      check(Boolean(aria && aria.length > 20), `${locale}/${viewport.name}: topology scroller lacks meaningful aria-label`);

      const pageOverflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      check(pageOverflow.scrollWidth <= pageOverflow.clientWidth + 1, `${locale}/${viewport.name}: page-level horizontal overflow ${JSON.stringify(pageOverflow)}`);
      const scrollerMetrics = await scroll.evaluate((node) => ({ scrollWidth: node.scrollWidth, clientWidth: node.clientWidth, overflowX: getComputedStyle(node).overflowX }));
      if (viewport.name === 'mobile') {
        check(scrollerMetrics.scrollWidth > scrollerMetrics.clientWidth + 300, `${locale}/mobile: judge topology should require intentional horizontal scroll ${JSON.stringify(scrollerMetrics)}`);
        check(['auto', 'scroll'].includes(scrollerMetrics.overflowX), `${locale}/mobile: scroller overflow-x is ${scrollerMetrics.overflowX}`);
      } else {
        check(scrollerMetrics.scrollWidth <= scrollerMetrics.clientWidth + 2, `${locale}/desktop: visual should fit without internal horizontal scroll ${JSON.stringify(scrollerMetrics)}`);
      }

      const boundary = (name) => visual.locator(`[data-boundary="${name}"]`).first();
      const node = (name) => visual.locator(`[data-node="${name}"]`).first();
      check((await boundary('judge-version').count()) === 1, `${locale}/${viewport.name}: frozen judge-version boundary missing`);
      for (const name of ['construct', 'rubric', 'calibration', 'judge-version', 'validation-item', 'blind-randomize', 'human-raters', 'llm-repeats', 'human-raw', 'llm-raw', 'adjudication', 'position-swap', 'style-control', 'family-cross', 'diagnostics', 'scope-decision', 'automatic-judge', 'human-fallback']) {
        check((await node(name).count()) === 1, `${locale}/${viewport.name}: missing node ${name}`);
      }
      for (const p of ['define', 'calibrate', 'freeze', 'present', 'human-lane', 'llm-lane', 'capture-human', 'capture-llm', 'adjudicate', 'probe-position', 'probe-style', 'probe-family', 'diagnose-human', 'diagnose-llm', 'diagnose-adjudicated', 'scope', 'accept', 'fallback']) {
        check((await visual.locator(`[data-path="${p}"]`).count()) === 1, `${locale}/${viewport.name}: missing relationship path ${p}`);
      }

      const constructBox = await node('construct').boundingBox();
      const rubricBox = await node('rubric').boundingBox();
      const calibrationBox = await node('calibration').boundingBox();
      if (constructBox && rubricBox && calibrationBox) {
        check(constructBox.x + constructBox.width < rubricBox.x, `${locale}/${viewport.name}: product construct must precede rubric`);
        check(rubricBox.x + rubricBox.width < calibrationBox.x, `${locale}/${viewport.name}: rubric must precede calibration bank`);
      }

      const judgeBoundary = await boundary('judge-version').boundingBox();
      check(containsBox(judgeBoundary, await node('judge-version').boundingBox()), `${locale}/${viewport.name}: judge identity must remain inside frozen version boundary`);

      const validationBox = await node('validation-item').boundingBox();
      const blindBox = await node('blind-randomize').boundingBox();
      if (validationBox && blindBox) check(validationBox.x + validationBox.width < blindBox.x, `${locale}/${viewport.name}: validation item must precede blind/randomized presentation`);

      const humanRatersBox = await node('human-raters').boundingBox();
      const llmRepeatsBox = await node('llm-repeats').boundingBox();
      const humanRawBox = await node('human-raw').boundingBox();
      const llmRawBox = await node('llm-raw').boundingBox();
      const adjudicationBox = await node('adjudication').boundingBox();
      if (humanRatersBox && llmRepeatsBox) check(humanRatersBox.y + humanRatersBox.height < llmRepeatsBox.y, `${locale}/${viewport.name}: human and LLM observation lanes must remain visually distinct`);
      if (humanRatersBox && humanRawBox) check(humanRatersBox.x + humanRatersBox.width < humanRawBox.x, `${locale}/${viewport.name}: raw human labels must follow independent raters`);
      if (llmRepeatsBox && llmRawBox) check(llmRepeatsBox.x + llmRepeatsBox.width < llmRawBox.x, `${locale}/${viewport.name}: raw LLM labels must follow repeated judging`);
      if (humanRawBox && adjudicationBox) check(humanRawBox.x + humanRawBox.width < adjudicationBox.x, `${locale}/${viewport.name}: adjudication must occur after raw human judgments are captured`);

      const positionBox = await node('position-swap').boundingBox();
      const styleBox = await node('style-control').boundingBox();
      const familyBox = await node('family-cross').boundingBox();
      if (positionBox && styleBox && familyBox) {
        check(positionBox.x + positionBox.width < styleBox.x, `${locale}/${viewport.name}: position and style probes must remain distinct`);
        check(styleBox.x + styleBox.width < familyBox.x, `${locale}/${viewport.name}: style and family probes must remain distinct`);
      }

      const diagnosticsBox = await node('diagnostics').boundingBox();
      const scopeBox = await node('scope-decision').boundingBox();
      if (diagnosticsBox && scopeBox) check(diagnosticsBox.x + diagnosticsBox.width < scopeBox.x, `${locale}/${viewport.name}: diagnostics must precede scope decision`);
      const autoBox = await node('automatic-judge').boundingBox();
      const fallbackBox = await node('human-fallback').boundingBox();
      if (scopeBox && autoBox && fallbackBox) {
        check(autoBox.y > scopeBox.y + scopeBox.height, `${locale}/${viewport.name}: automatic judge must only appear after scope decision`);
        check(fallbackBox.y > scopeBox.y + scopeBox.height, `${locale}/${viewport.name}: human fallback must only appear after scope decision`);
        check(autoBox.x + autoBox.width < fallbackBox.x, `${locale}/${viewport.name}: automatic path and human fallback must remain distinct`);
      }

      const text = await visual.innerText();
      if (locale === 'es') {
        for (const token of ['CALIBRA ANTES DE ESCALAR', 'Constructo de producto', 'Rúbrica observable', 'Labels humanos brutos', 'Adjudicación humana', 'Position swap', 'Diagnósticos', 'Decisión de alcance', 'Judge automático', 'Human fallback']) {
          check(text.includes(token), `ES/${viewport.name}: localized visual text missing ${token}`);
        }
      } else {
        for (const token of ['CALIBRATE BEFORE SCALING', 'Product construct', 'Observable rubric', 'Raw human labels', 'Human adjudication', 'Position swap', 'Diagnostics', 'Scope decision', 'Automatic judge', 'Human fallback']) {
          check(text.includes(token), `EN/${viewport.name}: localized visual text missing ${token}`);
        }
        check(!text.includes('Constructo de producto') && !text.includes('Rúbrica observable') && !text.includes('Adjudicación humana'), `EN/${viewport.name}: Spanish visual leakage detected`);
      }

      const motion = await visual.evaluate((root) => [root, ...root.querySelectorAll('*')].map((element) => {
        const style = getComputedStyle(element);
        return { animation: style.animationName, duration: style.animationDuration, transition: style.transitionDuration };
      }).filter((value) => value.animation !== 'none' && value.duration !== '0s'));
      check(motion.length === 0, `${locale}/${viewport.name}: visual should remain static under reduced motion ${JSON.stringify(motion.slice(0, 5))}`);

      const screenshotBase = `ai-systems-eval-ch3-${locale}-${viewport.name}`;
      await page.screenshot({ path: path.join(outDir, `${screenshotBase}-page.png`), fullPage: true, animations: 'disabled' });
      await visual.screenshot({ path: path.join(outDir, `${screenshotBase}-visual.png`), animations: 'disabled' });
      if (viewport.name === 'mobile') {
        await scroll.evaluate((node) => { node.scrollLeft = node.scrollWidth; });
        await page.waitForTimeout(100);
        const reachedEnd = await scroll.evaluate((node) => node.scrollLeft + node.clientWidth >= node.scrollWidth - 4);
        check(reachedEnd, `${locale}/mobile: final columns are not reachable by horizontal scrolling`);
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
  console.error(`AI systems evaluation chapter 5.3 browser/accessibility gate failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('AI systems evaluation chapter 5.3 browser/accessibility gate PASS: ES/EN calibration flow, frozen judge identity, independent human/LLM observation lanes, bias probes, diagnostics, scoped automation/fallback, desktop/mobile topology, focus, reduced-motion and resource integrity are intact.');
