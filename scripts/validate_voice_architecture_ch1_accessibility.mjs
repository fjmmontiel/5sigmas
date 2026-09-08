#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const failures = [];
function check(condition, message) {
  if (!condition) failures.push(message);
}

const cases = [
  {
    locale: 'es',
    route: '/series/agentes-voz-tiempo-real/01-arquitecturas-de-voz/',
  },
  {
    locale: 'en',
    route: '/en/series/agentes-voz-tiempo-real/01-arquitecturas-de-voz/',
  },
];
const viewports = [
  { name: 'desktop', width: 1440, height: 1000, hasTouch: false },
  { name: 'mobile', width: 390, height: 844, hasTouch: true },
];

async function assertStepperState(stepper, route, viewportName, visualName, step) {
  const buttons = stepper.locator('button[data-s5v-step]');
  check((await buttons.count()) === 3, `${route}: ${viewportName} ${visualName} expected three step buttons`);
  check((await stepper.getAttribute('data-step')) === String(step), `${route}: ${viewportName} ${visualName} did not expose data-step=${step}`);

  for (let index = 0; index < await buttons.count(); index += 1) {
    const button = buttons.nth(index);
    const expected = index + 1 === step;
    check((await button.getAttribute('aria-pressed')) === (expected ? 'true' : 'false'), `${route}: ${viewportName} ${visualName} step ${index + 1} aria-pressed drift`);
    check((await button.getAttribute('aria-current')) === (expected ? 'step' : null), `${route}: ${viewportName} ${visualName} step ${index + 1} aria-current drift`);
  }
}

const browser = await chromium.launch({ headless: true });
try {
  for (const testCase of cases) {
    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        hasTouch: viewport.hasTouch,
        isMobile: viewport.hasTouch,
      });
      const page = await context.newPage();
      const runtimeErrors = [];
      page.on('pageerror', (error) => runtimeErrors.push(error.message));

      const response = await page.goto(`${base}${testCase.route}`, { waitUntil: 'networkidle' });
      check(response?.ok(), `${testCase.route}: ${viewport.name} HTTP ${response?.status() ?? 'no response'}`);

      const visuals = [
        ['map', page.locator('.s5v-arch-map')],
        ['decision', page.locator('.s5v-decision')],
      ];
      const duplex = page.locator('.s5v-duplex');

      for (const [visualName, visual] of [...visuals, ['duplex', duplex]]) {
        check((await visual.count()) === 1, `${testCase.route}: ${viewport.name} expected exactly one ${visualName} visual`);
        if (!(await visual.count())) continue;
        const label = (await visual.getAttribute('aria-label'))?.trim() || '';
        check(label.length >= 12, `${testCase.route}: ${viewport.name} ${visualName} missing meaningful aria-label`);
      }

      for (const [visualName, stepper] of visuals) {
        if (!(await stepper.count())) continue;
        const buttons = stepper.locator('button[data-s5v-step]');
        await assertStepperState(stepper, testCase.route, viewport.name, visualName, 1);

        for (const step of [1, 2, 3]) {
          const button = buttons.nth(step - 1);
          if (viewport.hasTouch) {
            await button.tap();
          } else {
            await button.focus();
            const focused = await button.evaluate((node) => document.activeElement === node);
            check(focused, `${testCase.route}: ${viewport.name} ${visualName} step ${step} cannot receive keyboard focus`);
            await button.press('Enter');
          }

          await assertStepperState(stepper, testCase.route, viewport.name, visualName, step);
          await stepper.screenshot({
            path: path.join(outDir, `voice-architecture-ch1-${testCase.locale}-${viewport.name}-${visualName}-step-${step}.png`),
            animations: 'disabled',
          });
        }
      }

      for (const error of runtimeErrors) failures.push(`${testCase.route}: ${viewport.name} runtime error: ${error}`);
      await context.close();
    }

    const reducedContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: 'reduce',
      hasTouch: true,
      isMobile: true,
    });
    const reducedPage = await reducedContext.newPage();
    await reducedPage.goto(`${base}${testCase.route}`, { waitUntil: 'networkidle' });

    const reducedMotionActive = await reducedPage.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    check(reducedMotionActive, `${testCase.route}: reduced-motion emulation did not activate`);

    for (const selector of ['.s5v-arch-map', '.s5v-decision']) {
      const button = reducedPage.locator(`${selector} button[data-s5v-step="2"]`);
      if (!(await button.count())) continue;
      await button.hover();
      const transitionDurations = await button.evaluate((node) => getComputedStyle(node).transitionDuration.split(',').map((value) => value.trim()));
      check(transitionDurations.every((value) => value === '0s'), `${testCase.route}: ${selector} keeps motion transitions under prefers-reduced-motion (${transitionDurations.join(', ')})`);
      await button.tap();
      check((await reducedPage.locator(selector).getAttribute('data-step')) === '2', `${testCase.route}: ${selector} interaction breaks under prefers-reduced-motion`);
    }

    if (await reducedPage.locator('.s5v-duplex').count()) {
      const longRunningAnimations = await reducedPage.locator('.s5v-duplex').evaluate((root) => {
        const offenders = [];
        for (const node of [root, ...root.querySelectorAll('*')]) {
          const style = getComputedStyle(node);
          const durations = style.animationDuration.split(',').map((value) => value.trim());
          const iterations = style.animationIterationCount.split(',').map((value) => value.trim());
          durations.forEach((duration, index) => {
            const seconds = duration.endsWith('ms') ? Number.parseFloat(duration) / 1000 : Number.parseFloat(duration);
            const iteration = iterations[index] ?? iterations[0] ?? '1';
            if (Number.isFinite(seconds) && seconds > 0.02 && iteration !== '1') offenders.push(`${node.className || node.tagName}:${duration}:${iteration}`);
          });
        }
        return offenders;
      });
      check(longRunningAnimations.length === 0, `${testCase.route}: duplex keeps long-running animation under prefers-reduced-motion (${longRunningAnimations.join('; ')})`);
    }

    await reducedContext.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error('Voice architecture chapter 1 accessibility/intermediate-state QA failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Voice architecture chapter 1 accessibility/intermediate-state QA passed: keyboard/touch activation, ARIA state, all interactive states, reduced-motion behavior and state screenshots are valid in ES/EN desktop/mobile.');
