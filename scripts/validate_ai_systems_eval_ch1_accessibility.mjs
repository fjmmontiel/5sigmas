#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const routes = {
  es: '/series/evaluating-ai-systems-production/01-que-evaluar-modelo-componente-sistema-workflow-trayectoria/',
  en: '/en/series/evaluating-ai-systems-production/01-que-evaluar-modelo-componente-sistema-workflow-trayectoria/',
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

      const visual = page.locator('.s5v-eval-boundary').first();
      check((await visual.count()) === 1, `${locale}/${viewport.name}: evaluation-boundary visual missing`);
      if (!(await visual.count())) continue;

      const htmlLang = (await page.locator('html').getAttribute('lang') || '').toLowerCase();
      check(htmlLang.startsWith(locale), `${locale}/${viewport.name}: wrong html lang ${htmlLang}`);

      const scroll = visual.locator('.s5v-eval-boundary__scroll');
      check((await scroll.getAttribute('tabindex')) === '0', `${locale}/${viewport.name}: topology scroller must be keyboard focusable`);
      check((await scroll.getAttribute('role')) === 'region', `${locale}/${viewport.name}: topology scroller must expose region role`);
      const aria = await scroll.getAttribute('aria-label');
      check(Boolean(aria && aria.length > 20), `${locale}/${viewport.name}: topology scroller lacks meaningful aria-label`);

      const pageOverflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      check(pageOverflow.scrollWidth <= pageOverflow.clientWidth + 1, `${locale}/${viewport.name}: page-level horizontal overflow ${JSON.stringify(pageOverflow)}`);
      const scrollerMetrics = await scroll.evaluate((node) => ({ scrollWidth: node.scrollWidth, clientWidth: node.clientWidth, overflowX: getComputedStyle(node).overflowX }));
      if (viewport.name === 'mobile') {
        check(scrollerMetrics.scrollWidth > scrollerMetrics.clientWidth + 200, `${locale}/mobile: relationship topology should require intentional horizontal scroll ${JSON.stringify(scrollerMetrics)}`);
        check(['auto', 'scroll'].includes(scrollerMetrics.overflowX), `${locale}/mobile: scroller overflow-x is ${scrollerMetrics.overflowX}`);
      } else {
        check(scrollerMetrics.scrollWidth <= scrollerMetrics.clientWidth + 2, `${locale}/desktop: visual should fit without internal horizontal scroll ${JSON.stringify(scrollerMetrics)}`);
      }

      const boundary = (name) => visual.locator(`[data-boundary="${name}"]`).first();
      const node = (name) => visual.locator(`[data-node="${name}"]`).first();
      for (const name of ['system', 'workflow', 'component']) check((await boundary(name).count()) === 1, `${locale}/${viewport.name}: missing boundary ${name}`);
      for (const name of ['change', 'question', 'task', 'environment', 'retriever', 'model', 'guardrail', 'tools', 'policy', 'outcome', 'diagnose', 'confirm']) check((await node(name).count()) === 1, `${locale}/${viewport.name}: missing node ${name}`);
      check((await visual.locator('[data-path="trajectory"]').count()) === 1, `${locale}/${viewport.name}: realized trajectory path missing`);

      const systemBox = await boundary('system').boundingBox();
      const workflowBox = await boundary('workflow').boundingBox();
      const componentBox = await boundary('component').boundingBox();
      const modelBox = await node('model').boundingBox();
      const retrieverBox = await node('retriever').boundingBox();
      const environmentBox = await node('environment').boundingBox();
      const outcomeBox = await node('outcome').boundingBox();
      check(containsBox(systemBox, workflowBox), `${locale}/${viewport.name}: workflow boundary must remain inside system boundary`);
      check(containsBox(workflowBox, componentBox), `${locale}/${viewport.name}: component boundary must remain inside workflow boundary`);
      check(containsBox(componentBox, modelBox), `${locale}/${viewport.name}: model must remain inside component boundary`);
      check(containsBox(componentBox, retrieverBox), `${locale}/${viewport.name}: retriever must remain inside component boundary`);
      check(containsBox(systemBox, environmentBox), `${locale}/${viewport.name}: environment must remain inside system boundary`);
      check(containsBox(systemBox, outcomeBox), `${locale}/${viewport.name}: outcome must remain inside system boundary`);
      if (workflowBox && outcomeBox) check(outcomeBox.y >= workflowBox.y + workflowBox.height - 3, `${locale}/${viewport.name}: outcome must remain visually separate from workflow policy boundary`);

      const diagnoseBox = await node('diagnose').boundingBox();
      const confirmBox = await node('confirm').boundingBox();
      if (diagnoseBox && confirmBox) check(diagnoseBox.x + diagnoseBox.width < confirmBox.x, `${locale}/${viewport.name}: diagnose/confirm movements must remain distinct`);

      const text = await visual.innerText();
      if (locale === 'es') {
        for (const token of ['Diagnosticar → hacia dentro', 'Confirmar → hacia fuera', 'Trayectoria = evidencia de una ejecución', 'Outcome + estado final']) check(text.includes(token), `ES/${viewport.name}: localized visual text missing ${token}`);
      } else {
        for (const token of ['Diagnose → move inward', 'Confirm → move outward', 'Trajectory = evidence of one execution', 'Outcome + final state']) check(text.includes(token), `EN/${viewport.name}: localized visual text missing ${token}`);
        check(!text.includes('Diagnosticar → hacia dentro') && !text.includes('Trayectoria = evidencia'), `EN/${viewport.name}: Spanish visual leakage detected`);
      }

      const motion = await visual.evaluate((root) => [root, ...root.querySelectorAll('*')].map((element) => {
        const style = getComputedStyle(element);
        return { animation: style.animationName, duration: style.animationDuration, transition: style.transitionDuration };
      }).filter((value) => value.animation !== 'none' && value.duration !== '0s'));
      check(motion.length === 0, `${locale}/${viewport.name}: visual should remain static under reduced motion ${JSON.stringify(motion.slice(0, 5))}`);

      await scroll.focus();
      check(await scroll.evaluate((node) => document.activeElement === node), `${locale}/${viewport.name}: topology scroller cannot receive keyboard focus`);

      const screenshotBase = `ai-systems-eval-ch1-${locale}-${viewport.name}`;
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
  console.error(`AI systems evaluation chapter 5.1 browser/accessibility gate failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('AI systems evaluation chapter 5.1 browser/accessibility gate PASS: ES/EN nested boundaries, realized trajectory, outcome separation, diagnose/confirm directions, desktop/mobile topology, focus, reduced-motion and resource integrity are intact.');
