#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const routes = {
  es: '/series/evaluating-ai-systems-production/06-observability-failure-taxonomies-production-eval-repair-feedback-loops/',
  en: '/en/series/evaluating-ai-systems-production/06-observability-failure-taxonomies-production-eval-repair-feedback-loops/',
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

      const visual = page.locator('.s5v-eval-feedback').first();
      check((await visual.count()) === 1, `${locale}/${viewport.name}: production-feedback visual missing`);
      if (!(await visual.count())) continue;

      const htmlLang = (await page.locator('html').getAttribute('lang') || '').toLowerCase();
      check(htmlLang.startsWith(locale), `${locale}/${viewport.name}: wrong html lang ${htmlLang}`);
      const articleText = await page.locator('main').innerText();
      check(!/\\(?:frac|mathbf|text|hat|land)\b/.test(articleText), `${locale}/${viewport.name}: raw TeX command leaked into rendered article`);

      const scroll = visual.locator('.fb-scroll');
      check((await scroll.getAttribute('tabindex')) === '0', `${locale}/${viewport.name}: topology scroller must be keyboard focusable`);
      check((await scroll.getAttribute('role')) === 'region', `${locale}/${viewport.name}: topology scroller must expose region role`);
      const aria = await scroll.getAttribute('aria-label');
      check(Boolean(aria && aria.length > 25), `${locale}/${viewport.name}: topology scroller lacks meaningful aria-label`);

      const pageOverflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      check(pageOverflow.scrollWidth <= pageOverflow.clientWidth + 1, `${locale}/${viewport.name}: page-level horizontal overflow ${JSON.stringify(pageOverflow)}`);
      const scrollerMetrics = await scroll.evaluate((node) => ({ scrollWidth: node.scrollWidth, clientWidth: node.clientWidth, overflowX: getComputedStyle(node).overflowX }));
      if (viewport.name === 'mobile') {
        check(scrollerMetrics.scrollWidth > scrollerMetrics.clientWidth + 350, `${locale}/mobile: feedback topology should require intentional horizontal scroll ${JSON.stringify(scrollerMetrics)}`);
        check(['auto', 'scroll'].includes(scrollerMetrics.overflowX), `${locale}/mobile: scroller overflow-x is ${scrollerMetrics.overflowX}`);
      } else {
        check(scrollerMetrics.scrollWidth <= scrollerMetrics.clientWidth + 2, `${locale}/desktop: visual should fit without internal horizontal scroll ${JSON.stringify(scrollerMetrics)}`);
      }

      const boundary = (name) => visual.locator(`[data-boundary="${name}"]`).first();
      const node = (name) => visual.locator(`[data-node="${name}"]`).first();
      for (const name of ['observation-boundary','diagnosis-boundary','eval-boundary','evidence-boundary']) check((await boundary(name).count()) === 1, `${locale}/${viewport.name}: missing boundary ${name}`);
      for (const name of ['signals','reconstruct','instrumentation','taxonomy','sufficiency','redact','dedupe','versioned-eval','repair','regression','controlled-release','deploy','verify-production','receipt','eval-receipt','release-receipt']) {
        check((await node(name).count()) === 1, `${locale}/${viewport.name}: missing node ${name}`);
      }

      const signals = await node('signals').boundingBox();
      const reconstruct = await node('reconstruct').boundingBox();
      const taxonomy = await node('taxonomy').boundingBox();
      const sufficiency = await node('sufficiency').boundingBox();
      const redact = await node('redact').boundingBox();
      const dedupe = await node('dedupe').boundingBox();
      const versionedEval = await node('versioned-eval').boundingBox();
      check(containsBox(await boundary('observation-boundary').boundingBox(), signals), `${locale}/${viewport.name}: signals must remain inside observation boundary`);
      check(containsBox(await boundary('observation-boundary').boundingBox(), reconstruct), `${locale}/${viewport.name}: reconstruction must remain inside observation boundary`);
      check(containsBox(await boundary('diagnosis-boundary').boundingBox(), taxonomy), `${locale}/${viewport.name}: taxonomy must remain inside diagnosis boundary`);
      check(containsBox(await boundary('diagnosis-boundary').boundingBox(), sufficiency), `${locale}/${viewport.name}: sufficiency decision must remain inside diagnosis boundary`);
      check(containsBox(await boundary('eval-boundary').boundingBox(), redact), `${locale}/${viewport.name}: redaction/minimization must remain inside eval boundary`);
      check(containsBox(await boundary('eval-boundary').boundingBox(), dedupe), `${locale}/${viewport.name}: dedupe/generalization must remain inside eval boundary`);
      check(containsBox(await boundary('eval-boundary').boundingBox(), versionedEval), `${locale}/${viewport.name}: versioned eval must remain inside eval boundary`);
      if (signals && reconstruct && taxonomy && redact && dedupe && versionedEval) {
        check(signals.x + signals.width < reconstruct.x, `${locale}/${viewport.name}: live signal must precede reconstruction`);
        check(reconstruct.x + reconstruct.width < taxonomy.x, `${locale}/${viewport.name}: reconstruction must precede taxonomy`);
        check(taxonomy.x + taxonomy.width < redact.x, `${locale}/${viewport.name}: diagnosis must precede eval construction`);
        check(redact.x + redact.width < dedupe.x, `${locale}/${viewport.name}: privacy-safe minimal reproduction must precede generalization`);
        check(dedupe.x + dedupe.width < versionedEval.x, `${locale}/${viewport.name}: generalization must precede versioned eval`);
      }

      const repair = await node('repair').boundingBox();
      const regression = await node('regression').boundingBox();
      const controlled = await node('controlled-release').boundingBox();
      const deploy = await node('deploy').boundingBox();
      const verify = await node('verify-production').boundingBox();
      if (repair && regression && controlled && deploy && verify) {
        check(repair.x + repair.width < regression.x, `${locale}/${viewport.name}: repair must precede regression gate`);
        check(regression.x + regression.width < controlled.x, `${locale}/${viewport.name}: regression gate must precede controlled release`);
        check(controlled.x + controlled.width < deploy.x, `${locale}/${viewport.name}: shadow/canary must precede deploy`);
        check(deploy.x + deploy.width < verify.x, `${locale}/${viewport.name}: deploy must precede production verification`);
      }
      if (versionedEval && repair) check(repair.y > versionedEval.y + versionedEval.height, `${locale}/${viewport.name}: repair lane must follow eval construction vertically`);

      const receipt = await node('receipt').boundingBox();
      const evalReceipt = await node('eval-receipt').boundingBox();
      const releaseReceipt = await node('release-receipt').boundingBox();
      const evidenceBoundary = await boundary('evidence-boundary').boundingBox();
      for (const [label, box] of [['failure receipt', receipt], ['eval receipt', evalReceipt], ['release receipt', releaseReceipt]]) {
        check(containsBox(evidenceBoundary, box), `${locale}/${viewport.name}: ${label} must stay inside provenance boundary`);
      }
      if (receipt && evalReceipt && releaseReceipt) {
        check(receipt.x + receipt.width < evalReceipt.x, `${locale}/${viewport.name}: failure provenance must remain distinct from eval provenance`);
        check(evalReceipt.x + evalReceipt.width < releaseReceipt.x, `${locale}/${viewport.name}: eval provenance must remain distinct from release provenance`);
      }

      const text = await visual.innerText();
      if (locale === 'es') {
        for (const token of ['TELEMETRÍA ≠ VEREDICTO','OBSERVACIÓN — QUÉ OCURRIÓ','DIAGNÓSTICO — SÍNTOMA ≠ CAUSA','INCIDENTE ≠ TEST','¿Evidencia suficiente?','Mejorar instrumentación','Eval versionado','PASS ≠ LOOP CERRADO','Verificar producción']) {
          check(text.includes(token), `ES/${viewport.name}: localized visual text missing ${token}`);
        }
      } else {
        for (const token of ['TELEMETRY ≠ VERDICT','OBSERVATION — WHAT HAPPENED','DIAGNOSIS — SYMPTOM ≠ CAUSE','INCIDENT ≠ TEST','Enough evidence?','Improve instrumentation','Versioned eval','PASS ≠ CLOSED LOOP','Verify production']) {
          check(text.includes(token), `EN/${viewport.name}: localized visual text missing ${token}`);
        }
        check(!text.includes('TELEMETRÍA') && !text.includes('¿Evidencia suficiente?') && !text.includes('Verificar producción'), `${locale}/${viewport.name}: Spanish visual leakage detected`);
      }

      const motion = await visual.evaluate((root) => [root, ...root.querySelectorAll('*')].map((element) => {
        const style = getComputedStyle(element);
        return { animation: style.animationName, duration: style.animationDuration, transition: style.transitionDuration };
      }).filter((value) => value.animation !== 'none' && value.duration !== '0s'));
      check(motion.length === 0, `${locale}/${viewport.name}: visual should remain static under reduced motion ${JSON.stringify(motion.slice(0, 5))}`);

      const screenshotBase = `ai-systems-eval-ch6-${locale}-${viewport.name}`;
      await page.screenshot({ path: path.join(outDir, `${screenshotBase}-page.png`), fullPage: true, animations: 'disabled' });
      await visual.screenshot({ path: path.join(outDir, `${screenshotBase}-visual.png`), animations: 'disabled' });
      if (viewport.name === 'mobile') {
        await scroll.evaluate((node) => { node.scrollLeft = node.scrollWidth; });
        await page.waitForTimeout(100);
        const reachedEnd = await scroll.evaluate((node) => node.scrollLeft + node.clientWidth >= node.scrollWidth - 4);
        check(reachedEnd, `${locale}/mobile: final production-verification/provenance columns are not reachable by horizontal scrolling`);
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
  console.error(`AI systems evaluation chapter 5.6 browser/accessibility gate failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('AI systems evaluation chapter 5.6 browser/accessibility gate PASS: ES/EN observation/diagnosis/eval/release boundaries, insufficient-evidence loop, provenance, controlled release, production verification, desktop/mobile topology, focus, reduced-motion and resource integrity are intact.');
