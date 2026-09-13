#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const routes = {
  es: '/series/evaluating-ai-systems-production/04-evaluacion-trayectorias-agentes-tools-exito-eficiencia-recuperacion-policy/',
  en: '/en/series/evaluating-ai-systems-production/04-evaluacion-trayectorias-agentes-tools-exito-eficiencia-recuperacion-policy/',
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

      const visual = page.locator('.s5v-agent-trajectory').first();
      check((await visual.count()) === 1, `${locale}/${viewport.name}: trajectory visual missing`);
      if (!(await visual.count())) continue;

      const htmlLang = (await page.locator('html').getAttribute('lang') || '').toLowerCase();
      check(htmlLang.startsWith(locale), `${locale}/${viewport.name}: wrong html lang ${htmlLang}`);

      const nativeEquations = page.locator('.s5-native-equation math');
      check((await nativeEquations.count()) === 8, `${locale}/${viewport.name}: expected 8 native MathML equations`);
      const articleText = await page.locator('main').innerText();
      check(!/\\(?:frac|mathbf|text|ldots|land|tau)\b/.test(articleText), `${locale}/${viewport.name}: raw TeX command leaked into rendered article`);

      const scroll = visual.locator('.at-scroll');
      check((await scroll.getAttribute('tabindex')) === '0', `${locale}/${viewport.name}: topology scroller must be keyboard focusable`);
      check((await scroll.getAttribute('role')) === 'region', `${locale}/${viewport.name}: topology scroller must expose region role`);
      const aria = await scroll.getAttribute('aria-label');
      check(Boolean(aria && aria.length > 20), `${locale}/${viewport.name}: topology scroller lacks meaningful aria-label`);

      const pageOverflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      check(pageOverflow.scrollWidth <= pageOverflow.clientWidth + 1, `${locale}/${viewport.name}: page-level horizontal overflow ${JSON.stringify(pageOverflow)}`);
      const scrollerMetrics = await scroll.evaluate((node) => ({ scrollWidth: node.scrollWidth, clientWidth: node.clientWidth, overflowX: getComputedStyle(node).overflowX }));
      if (viewport.name === 'mobile') {
        check(scrollerMetrics.scrollWidth > scrollerMetrics.clientWidth + 300, `${locale}/mobile: trajectory topology should require intentional horizontal scroll ${JSON.stringify(scrollerMetrics)}`);
        check(['auto', 'scroll'].includes(scrollerMetrics.overflowX), `${locale}/mobile: scroller overflow-x is ${scrollerMetrics.overflowX}`);
      } else {
        check(scrollerMetrics.scrollWidth <= scrollerMetrics.clientWidth + 2, `${locale}/desktop: visual should fit without internal horizontal scroll ${JSON.stringify(scrollerMetrics)}`);
      }

      const boundary = (name) => visual.locator(`[data-boundary="${name}"]`).first();
      const node = (name) => visual.locator(`[data-node="${name}"]`).first();
      check((await boundary('side-effect-policy').count()) === 1, `${locale}/${viewport.name}: side-effect authorization boundary missing`);
      for (const name of [
        'task-policy-state','observation','decision','policy-gate','tool-call','tool-result','policy-deny','state-update',
        'failure-classification','reconcile-state','retry-cancel-fallback','duplicate-hazard','stop-condition','outcome',
        'trajectory-events','trajectory-verifier','outcome-verifier','release-gate','release-pass','release-fail',
      ]) check((await node(name).count()) === 1, `${locale}/${viewport.name}: missing node ${name}`);

      for (const p of [
        'start','observe-decide','authorize','call','result','deny','result-success','result-failure','classify-reconcile',
        'reconcile-decision','duplicate','retry-loop','state-loop','state-stop','stop-outcome','measure-trajectory',
        'trajectory-check','outcome-check','trajectory-gate','outcome-gate','gate-pass','gate-fail',
      ]) check((await visual.locator(`[data-path="${p}"]`).count()) === 1, `${locale}/${viewport.name}: missing relationship path ${p}`);

      const startBox = await node('task-policy-state').boundingBox();
      const observationBox = await node('observation').boundingBox();
      const decisionBox = await node('decision').boundingBox();
      const policyBox = await node('policy-gate').boundingBox();
      const toolBox = await node('tool-call').boundingBox();
      const resultBox = await node('tool-result').boundingBox();
      if (startBox && observationBox && decisionBox && policyBox && toolBox && resultBox) {
        check(startBox.x + startBox.width < observationBox.x, `${locale}/${viewport.name}: task/policy/state must precede observation`);
        check(observationBox.x + observationBox.width < decisionBox.x, `${locale}/${viewport.name}: observation must precede decision`);
        check(decisionBox.x + decisionBox.width < policyBox.x, `${locale}/${viewport.name}: decision must precede precondition gate`);
        check(policyBox.x + policyBox.width < toolBox.x, `${locale}/${viewport.name}: policy gate must precede tool call`);
        check(toolBox.x + toolBox.width < resultBox.x, `${locale}/${viewport.name}: tool call must precede tool result`);
      }

      const sideEffectBoundary = await boundary('side-effect-policy').boundingBox();
      check(containsBox(sideEffectBoundary, await node('policy-gate').boundingBox()), `${locale}/${viewport.name}: policy gate must be inside side-effect boundary`);
      check(containsBox(sideEffectBoundary, await node('tool-call').boundingBox()), `${locale}/${viewport.name}: tool call must be inside side-effect boundary`);
      check(containsBox(sideEffectBoundary, await node('tool-result').boundingBox()), `${locale}/${viewport.name}: tool result must be inside side-effect boundary`);

      const failBox = await node('failure-classification').boundingBox();
      const reconcileBox = await node('reconcile-state').boundingBox();
      const recoveryBox = await node('retry-cancel-fallback').boundingBox();
      const duplicateBox = await node('duplicate-hazard').boundingBox();
      if (failBox && reconcileBox && recoveryBox && duplicateBox) {
        check(failBox.x + failBox.width < reconcileBox.x, `${locale}/${viewport.name}: failure classification must precede reconciliation`);
        check(recoveryBox.y > reconcileBox.y + reconcileBox.height, `${locale}/${viewport.name}: retry/cancel/fallback must follow reconciliation`);
        check(duplicateBox.x + duplicateBox.width < recoveryBox.x, `${locale}/${viewport.name}: duplicate-side-effect hazard must remain distinct from recovery decision`);
      }

      const stopBox = await node('stop-condition').boundingBox();
      const outcomeBox = await node('outcome').boundingBox();
      if (stopBox && outcomeBox) check(outcomeBox.x + outcomeBox.width < stopBox.x, `${locale}/${viewport.name}: outcome and stop-condition nodes must stay visually distinct`);

      const trajVerifierBox = await node('trajectory-verifier').boundingBox();
      const outcomeVerifierBox = await node('outcome-verifier').boundingBox();
      const releaseBox = await node('release-gate').boundingBox();
      const passBox = await node('release-pass').boundingBox();
      const releaseFailBox = await node('release-fail').boundingBox();
      if (trajVerifierBox && outcomeVerifierBox && releaseBox) {
        check(trajVerifierBox.y + trajVerifierBox.height < outcomeVerifierBox.y, `${locale}/${viewport.name}: trajectory and outcome verifiers must remain separate evidence lanes`);
        check(trajVerifierBox.x + trajVerifierBox.width < releaseBox.x, `${locale}/${viewport.name}: trajectory verifier must precede release gate`);
        check(outcomeVerifierBox.x + outcomeVerifierBox.width < releaseBox.x, `${locale}/${viewport.name}: outcome verifier must precede release gate`);
      }
      if (releaseBox && passBox && releaseFailBox) {
        check(releaseBox.x + releaseBox.width < passBox.x, `${locale}/${viewport.name}: PASS must follow release gate`);
        check(releaseBox.x + releaseBox.width < releaseFailBox.x, `${locale}/${viewport.name}: FAIL must follow release gate`);
        check(passBox.y + passBox.height < releaseFailBox.y, `${locale}/${viewport.name}: pass/fail outcomes must remain visually distinct`);
      }

      const text = await visual.innerText();
      if (locale === 'es') {
        for (const token of ['RESULTADO ≠ TRAYECTORIA','Observación','Decisión','Gate de precondiciones','Clasifica el fallo','Reconciliar estado','Riesgo de duplicado','Stop condition','Verificador de trayectoria','Verificador de outcome','Release gate']) {
          check(text.includes(token), `ES/${viewport.name}: localized visual text missing ${token}`);
        }
      } else {
        for (const token of ['OUTCOME ≠ TRAJECTORY','Observation','Decision','Precondition gate','Classify the failure','Reconcile state','Duplicate risk','Stop condition','Trajectory verifier','Outcome verifier','Release gate']) {
          check(text.includes(token), `EN/${viewport.name}: localized visual text missing ${token}`);
        }
        check(!text.includes('Observación') && !text.includes('Gate de precondiciones') && !text.includes('Clasifica el fallo') && !text.includes('Riesgo de duplicado'), `${locale}/${viewport.name}: Spanish visual leakage detected`);
      }

      const motion = await visual.evaluate((root) => [root, ...root.querySelectorAll('*')].map((element) => {
        const style = getComputedStyle(element);
        return { animation: style.animationName, duration: style.animationDuration, transition: style.transitionDuration };
      }).filter((value) => value.animation !== 'none' && value.duration !== '0s'));
      check(motion.length === 0, `${locale}/${viewport.name}: visual should remain static under reduced motion ${JSON.stringify(motion.slice(0, 5))}`);

      const screenshotBase = `ai-systems-eval-ch4-${locale}-${viewport.name}`;
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
  console.error(`AI systems evaluation chapter 5.4 browser/accessibility gate failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('AI systems evaluation chapter 5.4 browser/accessibility gate PASS: ES/EN execution loop, authorization boundary, recovery branch, separate trajectory/outcome evidence, non-compensatory release gate, desktop/mobile topology, focus, reduced-motion and resource integrity are intact.');
