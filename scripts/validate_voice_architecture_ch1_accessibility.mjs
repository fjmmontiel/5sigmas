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

const decisionSource = await fs.readFile(path.resolve('docs/snippets/articulos-tecnicos/voice-arch-decision.html'), 'utf8');
check(decisionSource.includes('GOLDEN_VISUAL_CONTRACT'), 'decision: missing GOLDEN_VISUAL_CONTRACT');
check(decisionSource.includes('x-position=continuidad acústica del camino principal'), 'decision: x-axis visual variable contract missing');
check(decisionSource.includes('y-position=fronteras textuales obligatorias y sustituibles'), 'decision: y-axis visual variable contract missing');
check(decisionSource.includes('vector direction=presión de diseño'), 'decision: design-pressure vector contract missing');
check(decisionSource.includes('target position=región favorecida'), 'decision: target-position contract missing');
check(!decisionSource.includes('s5v-decision__cards'), 'decision: legacy card-only decision visual returned');
check(!decisionSource.includes('s5v__steps--tabs'), 'decision: legacy tab styling returned');

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

function center(box) {
  return box ? { x: box.x + box.width / 2, y: box.y + box.height / 2 } : null;
}

function distance(a, b) {
  if (!a || !b) return 0;
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function horizontallyContained(inner, outer, tolerance = 2) {
  return Boolean(
    inner && outer &&
    inner.x >= outer.x - tolerance &&
    inner.x + inner.width <= outer.x + outer.width + tolerance
  );
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

      if (viewport.name === 'mobile' && await duplex.count()) {
        const rule = duplex.locator('.s5v__rule');
        check((await rule.count()) === 1, `${testCase.route}: mobile duplex missing coordination rule`);
        if (await rule.count()) {
          const ruleBox = await rule.boundingBox();
          const copyBox = await rule.locator('span').boundingBox();
          check(Boolean(ruleBox && ruleBox.height <= 180), `${testCase.route}: mobile duplex coordination rule collapsed vertically (${JSON.stringify(ruleBox)})`);
          check(Boolean(copyBox && copyBox.width >= 140), `${testCase.route}: mobile duplex coordination copy collapsed horizontally (${JSON.stringify(copyBox)})`);
          check(Boolean(copyBox && copyBox.height <= 135), `${testCase.route}: mobile duplex coordination copy wraps pathologically (${JSON.stringify(copyBox)})`);
        }
      }

      const decision = page.locator('.s5v-decision');
      if (await decision.count()) {
        const plot = decision.locator('.s5v-decision-map__plot');
        const scroller = decision.locator('.s5v-decision-map__scroller');
        const cascade = decision.locator('.s5v-decision-map__node--cascade');
        const half = decision.locator('.s5v-decision-map__node--half');
        const s2s = decision.locator('.s5v-decision-map__node--s2s');
        check((await plot.count()) === 1, `${testCase.route}: ${viewport.name} decision plot missing`);
        check((await cascade.count()) === 1 && (await half.count()) === 1 && (await s2s.count()) === 1, `${testCase.route}: ${viewport.name} decision architecture points missing`);
        if ((await cascade.count()) && (await half.count()) && (await s2s.count())) {
          const cBox = await cascade.boundingBox();
          const hBox = await half.boundingBox();
          const sBox = await s2s.boundingBox();
          const c = center(cBox);
          const h = center(hBox);
          const s = center(sBox);
          check(Boolean(c && h && s && c.x < h.x && h.x < s.x), `${testCase.route}: ${viewport.name} acoustic-continuity x-order collapsed (${JSON.stringify({ c, h, s })})`);
          check(Boolean(c && h && s && c.y < h.y && h.y < s.y), `${testCase.route}: ${viewport.name} text-boundary y-order collapsed (${JSON.stringify({ c, h, s })})`);
          if (viewport.name === 'mobile') {
            const scrollerBox = await scroller.boundingBox();
            check(horizontallyContained(cBox, scrollerBox), `${testCase.route}: mobile full-cascade region requires hidden horizontal reveal (${JSON.stringify({ cBox, scrollerBox })})`);
            check(horizontallyContained(hBox, scrollerBox), `${testCase.route}: mobile half-cascade region requires hidden horizontal reveal (${JSON.stringify({ hBox, scrollerBox })})`);
            check(horizontallyContained(sBox, scrollerBox), `${testCase.route}: mobile S2S region requires hidden horizontal reveal (${JSON.stringify({ sBox, scrollerBox })})`);
          }
        }
      }

      for (const [visualName, stepper] of visuals) {
        if (!(await stepper.count())) continue;
        const buttons = stepper.locator('button[data-s5v-step]');
        await assertStepperState(stepper, testCase.route, viewport.name, visualName, 1);
        const decisionTargets = [];

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

          if (visualName === 'decision') {
            const target = stepper.locator('.s5v-decision-map__target');
            const vector = stepper.locator('.s5v-decision-map__vector');
            check((await target.count()) === 1, `${testCase.route}: ${viewport.name} decision target missing at step ${step}`);
            check((await vector.count()) === 1, `${testCase.route}: ${viewport.name} decision vector missing at step ${step}`);
            if (await target.count()) {
              const targetBox = await target.boundingBox();
              decisionTargets.push(center(targetBox));
              if (viewport.name === 'mobile') {
                const scrollerBox = await stepper.locator('.s5v-decision-map__scroller').boundingBox();
                check(horizontallyContained(targetBox, scrollerBox), `${testCase.route}: mobile decision target ${step} is off-screen and requires manual reveal (${JSON.stringify({ targetBox, scrollerBox })})`);
              }
            }
          }

          await stepper.screenshot({
            path: path.join(outDir, `voice-architecture-ch1-${testCase.locale}-${viewport.name}-${visualName}-step-${step}.png`),
            animations: 'disabled',
          });
        }

        if (visualName === 'decision' && decisionTargets.length === 3) {
          const minimumMovement = viewport.name === 'mobile' ? 55 : 120;
          check(distance(decisionTargets[0], decisionTargets[1]) >= minimumMovement, `${testCase.route}: ${viewport.name} decision steps 1→2 do not change meaningful geometry (${distance(decisionTargets[0], decisionTargets[1]).toFixed(1)}px)`);
          check(distance(decisionTargets[1], decisionTargets[2]) >= minimumMovement, `${testCase.route}: ${viewport.name} decision steps 2→3 do not change meaningful geometry (${distance(decisionTargets[1], decisionTargets[2]).toFixed(1)}px)`);
          check(distance(decisionTargets[0], decisionTargets[2]) >= minimumMovement * 1.5, `${testCase.route}: ${viewport.name} decision endpoints are not structurally distinct (${distance(decisionTargets[0], decisionTargets[2]).toFixed(1)}px)`);
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

    const reducedDecision = reducedPage.locator('.s5v-decision');
    if (await reducedDecision.count()) {
      const target = reducedDecision.locator('.s5v-decision-map__target');
      const before = center(await target.boundingBox());
      await reducedDecision.locator('button[data-s5v-step="3"]').tap();
      const afterBox = await target.boundingBox();
      const after = center(afterBox);
      check(distance(before, after) >= 55, `${testCase.route}: decision relationship collapses under reduced-motion (${distance(before, after).toFixed(1)}px)`);
      const scrollerBox = await reducedDecision.locator('.s5v-decision-map__scroller').boundingBox();
      check(horizontallyContained(afterBox, scrollerBox), `${testCase.route}: reduced-motion mobile S2S target requires hidden horizontal reveal (${JSON.stringify({ afterBox, scrollerBox })})`);
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

console.log('Voice architecture chapter 1 accessibility/intermediate-state QA passed: keyboard/touch activation, ARIA state, relationship-first decision geometry, all mobile architecture regions and selected targets remain visible without manual horizontal reveal, meaningful state movement, reduced-motion behavior, mobile duplex coordination geometry and state screenshots are valid in ES/EN desktop/mobile.');