#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const routes = {
  es: '/series/evaluating-ai-systems-production/02-offline-eval-sets-curation-hard-negatives-contamination-versioning/',
  en: '/en/series/evaluating-ai-systems-production/02-offline-eval-sets-curation-hard-negatives-contamination-versioning/',
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

      const visual = page.locator('.s5v-eval-dataset').first();
      check((await visual.count()) === 1, `${locale}/${viewport.name}: dataset-lifecycle visual missing`);
      if (!(await visual.count())) continue;

      const htmlLang = (await page.locator('html').getAttribute('lang') || '').toLowerCase();
      check(htmlLang.startsWith(locale), `${locale}/${viewport.name}: wrong html lang ${htmlLang}`);

      const scroll = visual.locator('.s5v-eval-dataset__scroll');
      check((await scroll.getAttribute('tabindex')) === '0', `${locale}/${viewport.name}: topology scroller must be keyboard focusable`);
      check((await scroll.getAttribute('role')) === 'region', `${locale}/${viewport.name}: topology scroller must expose region role`);
      const aria = await scroll.getAttribute('aria-label');
      check(Boolean(aria && aria.length > 20), `${locale}/${viewport.name}: topology scroller lacks meaningful aria-label`);

      const pageOverflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      check(pageOverflow.scrollWidth <= pageOverflow.clientWidth + 1, `${locale}/${viewport.name}: page-level horizontal overflow ${JSON.stringify(pageOverflow)}`);
      const scrollerMetrics = await scroll.evaluate((node) => ({ scrollWidth: node.scrollWidth, clientWidth: node.clientWidth, overflowX: getComputedStyle(node).overflowX }));
      if (viewport.name === 'mobile') {
        check(scrollerMetrics.scrollWidth > scrollerMetrics.clientWidth + 300, `${locale}/mobile: lifecycle topology should require intentional horizontal scroll ${JSON.stringify(scrollerMetrics)}`);
        check(['auto', 'scroll'].includes(scrollerMetrics.overflowX), `${locale}/mobile: scroller overflow-x is ${scrollerMetrics.overflowX}`);
      } else {
        check(scrollerMetrics.scrollWidth <= scrollerMetrics.clientWidth + 2, `${locale}/desktop: visual should fit without internal horizontal scroll ${JSON.stringify(scrollerMetrics)}`);
      }

      const boundary = (name) => visual.locator(`[data-boundary="${name}"]`).first();
      const node = (name) => visual.locator(`[data-node="${name}"]`).first();
      for (const name of ['release']) check((await boundary(name).count()) === 1, `${locale}/${viewport.name}: missing boundary ${name}`);
      for (const name of ['source', 'provenance', 'group', 'dev', 'regression', 'holdout', 'challenge', 'manifest', 'hard-context', 'hard-positive', 'hard-negative', 'pair-check', 'training-exposure', 'cross-split', 'development-leakage', 'temporal-leakage', 'scanner', 'production-failure', 'next-version']) {
        check((await node(name).count()) === 1, `${locale}/${viewport.name}: missing node ${name}`);
      }
      for (const p of ['admission', 'split', 'freeze', 'hard-pair', 'risk-training', 'risk-cross-split', 'risk-development', 'risk-temporal', 'next-version']) {
        check((await visual.locator(`[data-path="${p}"]`).count()) === 1, `${locale}/${viewport.name}: missing relationship path ${p}`);
      }

      const sourceBox = await node('source').boundingBox();
      const provenanceBox = await node('provenance').boundingBox();
      const groupBox = await node('group').boundingBox();
      if (sourceBox && provenanceBox && groupBox) {
        check(sourceBox.x + sourceBox.width < provenanceBox.x, `${locale}/${viewport.name}: source must precede provenance`);
        check(provenanceBox.x + provenanceBox.width < groupBox.x, `${locale}/${viewport.name}: provenance must precede grouping`);
      }

      const releaseBox = await boundary('release').boundingBox();
      for (const name of ['dev', 'regression', 'holdout', 'challenge', 'manifest']) {
        check(containsBox(releaseBox, await node(name).boundingBox()), `${locale}/${viewport.name}: ${name} must remain inside frozen release boundary`);
      }

      const devBox = await node('dev').boundingBox();
      const holdoutBox = await node('holdout').boundingBox();
      const regressionBox = await node('regression').boundingBox();
      const challengeBox = await node('challenge').boundingBox();
      if (devBox && holdoutBox) check(devBox.y + devBox.height < holdoutBox.y, `${locale}/${viewport.name}: dev and holdout roles must remain visually separated`);
      if (regressionBox && challengeBox) check(regressionBox.y + regressionBox.height < challengeBox.y, `${locale}/${viewport.name}: regression and challenge roles must remain visually separated`);

      const hardContextBox = await node('hard-context').boundingBox();
      const hardPositiveBox = await node('hard-positive').boundingBox();
      const hardNegativeBox = await node('hard-negative').boundingBox();
      const pairCheckBox = await node('pair-check').boundingBox();
      if (hardContextBox && hardPositiveBox && hardNegativeBox && pairCheckBox) {
        check(hardContextBox.x + hardContextBox.width < hardPositiveBox.x, `${locale}/${viewport.name}: hard pair must branch after shared context`);
        check(Math.abs(hardPositiveBox.x - hardNegativeBox.x) <= 3, `${locale}/${viewport.name}: hard pair sides must share a common horizontal origin`);
        check(hardPositiveBox.y + hardPositiveBox.height < hardNegativeBox.y, `${locale}/${viewport.name}: hard pair sides must remain distinct`);
        check(hardPositiveBox.x + hardPositiveBox.width < pairCheckBox.x, `${locale}/${viewport.name}: pair check must follow both pair members`);
      }

      const trainingBox = await node('training-exposure').boundingBox();
      const crossSplitBox = await node('cross-split').boundingBox();
      const developmentBox = await node('development-leakage').boundingBox();
      const temporalBox = await node('temporal-leakage').boundingBox();
      const scannerBox = await node('scanner').boundingBox();
      if (trainingBox && developmentBox) check(trainingBox.y + trainingBox.height < developmentBox.y, `${locale}/${viewport.name}: training exposure and development leakage must remain separate channels`);
      if (crossSplitBox && temporalBox) check(crossSplitBox.y + crossSplitBox.height < temporalBox.y, `${locale}/${viewport.name}: cross-split and temporal leakage must remain separate channels`);
      if (scannerBox && developmentBox && temporalBox) check(scannerBox.y > Math.max(developmentBox.y + developmentBox.height, temporalBox.y + temporalBox.height), `${locale}/${viewport.name}: scanner caveat must sit after leakage channels`);

      const productionBox = await node('production-failure').boundingBox();
      const nextVersionBox = await node('next-version').boundingBox();
      if (productionBox && nextVersionBox && scannerBox) {
        check(productionBox.y > scannerBox.y + scannerBox.height, `${locale}/${viewport.name}: next-version loop must be visually separated from current release risk audit`);
        check(productionBox.x + productionBox.width < nextVersionBox.x, `${locale}/${viewport.name}: production failure must feed the next version`);
      }

      const text = await visual.innerText();
      if (locale === 'es') {
        for (const token of ['Congela lo que comparas', 'Holdout / release', 'Challenge rotatorio', '29 días → allow', '31 días → deny', 'Exposición de training', 'Leakage de desarrollo', 'Overlap scanner = detector de candidatos, no certificado de limpieza', 'Siguiente versión D(v+1)']) {
          check(text.includes(token), `ES/${viewport.name}: localized visual text missing ${token}`);
        }
      } else {
        for (const token of ['Freeze what you compare', 'Holdout / release', 'Rotating challenge', '29 days → allow', '31 days → deny', 'Training exposure', 'Development leakage', 'Overlap scanner = candidate detector, not a cleanliness certificate', 'Next version D(v+1)']) {
          check(text.includes(token), `EN/${viewport.name}: localized visual text missing ${token}`);
        }
        check(!text.includes('Congela lo que comparas') && !text.includes('Exposición de training') && !text.includes('Siguiente versión'), `EN/${viewport.name}: Spanish visual leakage detected`);
      }

      const motion = await visual.evaluate((root) => [root, ...root.querySelectorAll('*')].map((element) => {
        const style = getComputedStyle(element);
        return { animation: style.animationName, duration: style.animationDuration, transition: style.transitionDuration };
      }).filter((value) => value.animation !== 'none' && value.duration !== '0s'));
      check(motion.length === 0, `${locale}/${viewport.name}: visual should remain static under reduced motion ${JSON.stringify(motion.slice(0, 5))}`);

      await scroll.focus();
      check(await scroll.evaluate((node) => document.activeElement === node), `${locale}/${viewport.name}: topology scroller cannot receive keyboard focus`);

      const screenshotBase = `ai-systems-eval-ch2-${locale}-${viewport.name}`;
      await page.screenshot({ path: path.join(outDir, `${screenshotBase}-page.png`), fullPage: true, animations: 'disabled' });
      await visual.screenshot({ path: path.join(outDir, `${screenshotBase}-visual.png`), animations: 'disabled' });
      if (viewport.name === 'mobile') {
        await scroll.evaluate((node) => { node.scrollLeft = node.scrollWidth; });
        await page.waitForTimeout(100);
        const reachedEnd = await scroll.evaluate((node) => node.scrollLeft + node.clientWidth >= node.scrollWidth - 4);
        check(reachedEnd, `${locale}/mobile: final columns are not reachable by horizontal scrolling`);
        await visual.screenshot({ path: path.join(outDir, `${screenshotBase}-visual-end.png`), animations: 'disabled' });
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`AI systems evaluation chapter 5.2 browser/accessibility gate failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('AI systems evaluation chapter 5.2 browser/accessibility gate PASS: ES/EN provenance-to-release flow, bank roles, hard pair, four leakage channels, version boundary, next-version loop, desktop/mobile topology, focus, reduced-motion and resource integrity are intact.');