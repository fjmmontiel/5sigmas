#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const cases = [
  {
    locale: 'es',
    route: '/series/context-engineering-memory-mcp/01-context-engineering-vs-prompt-engineering/',
    requiredVisual: [
      'Prompt ⊂ contexto', 'UNIVERSO DE INFORMACIÓN CANDIDATA', 'PROMPT ENGINEERING',
      'Instrucciones', 'Ejemplos', 'Historial de mensajes', 'Tools y contratos',
      'Retrieval / datos externos', 'Observaciones de runtime', 'Memoria / estado persistente',
      'CONTEXT ENGINEERING · CADA INFERENCIA', 'Seleccionar', 'CONTEXTO REAL Cₜ', 'Modelo',
      'ENTORNO / EFECTOS FUERA DEL CONTEXTO', 'Salida / tool call', 'Efecto real', 'Cₜ₊₁',
    ],
    forbidden: [],
  },
  {
    locale: 'en',
    route: '/en/series/context-engineering-memory-mcp/01-context-engineering-vs-prompt-engineering/',
    requiredVisual: [
      'Prompt ⊂ context', 'UNIVERSE OF CANDIDATE INFORMATION', 'PROMPT ENGINEERING',
      'Instructions', 'Examples', 'Message history', 'Tools and contracts',
      'Retrieval / external data', 'Runtime observations', 'Memory / persistent state',
      'CONTEXT ENGINEERING · EVERY INFERENCE', 'Select', 'ACTUAL CONTEXT Cₜ', 'Model',
      'ENVIRONMENT / EFFECTS OUTSIDE CONTEXT', 'Output / tool call', 'Real effect', 'Cₜ₊₁',
    ],
    forbidden: [
      'UNIVERSO DE INFORMACIÓN CANDIDATA', 'Instrucciones', 'Ejemplos', 'Historial de mensajes',
      'Tools y contratos', 'datos externos', 'Observaciones de runtime', 'Memoria / estado persistente',
      'Seleccionar', 'CONTEXTO REAL', 'ENTORNO / EFECTOS', 'Salida / tool call', 'Efecto real',
      'la observación se convierte',
    ],
  },
];

const viewports = [
  { name: 'desktop', width: 1440, height: 1000, hasTouch: false },
  { name: 'mobile', width: 390, height: 844, hasTouch: true },
];

const browser = await chromium.launch({ headless: true });
try {
  for (const testCase of cases) {
    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        hasTouch: viewport.hasTouch,
        isMobile: viewport.hasTouch,
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      const runtimeErrors = [];
      const consoleErrors = [];
      page.on('pageerror', (error) => runtimeErrors.push(error.message));
      page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });

      const response = await page.goto(`${base}${testCase.route}`, { waitUntil: 'networkidle' });
      check(response?.ok(), `${testCase.route}: ${viewport.name} HTTP ${response?.status() ?? 'no response'}`);
      const htmlLang = await page.locator('html').getAttribute('lang');
      check((htmlLang || '').toLowerCase().startsWith(testCase.locale), `${testCase.route}: ${viewport.name} wrong html lang ${htmlLang}`);
      check(((await page.locator('main h1').first().innerText()).trim()).length >= 35, `${testCase.route}: ${viewport.name} missing article h1`);
      check(await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches), `${testCase.route}: ${viewport.name} reduced-motion emulation inactive`);

      const visual = page.locator('.s5v-context-assembly');
      check((await visual.count()) === 1, `${testCase.route}: ${viewport.name} expected exactly one context-assembly visual`);
      if (await visual.count()) {
        const label = (await visual.getAttribute('aria-label'))?.trim() || '';
        check(label.length >= 35, `${testCase.route}: ${viewport.name} visual missing meaningful aria-label`);
        const visualText = await visual.innerText();
        const normalized = visualText.toLocaleLowerCase();
        for (const token of testCase.requiredVisual) check(normalized.includes(token.toLocaleLowerCase()), `${testCase.route}: ${viewport.name} visual missing ${JSON.stringify(token)}`);
        for (const token of testCase.forbidden) check(!normalized.includes(token.toLocaleLowerCase()), `${testCase.route}: ${viewport.name} untranslated visual token ${JSON.stringify(token)}`);

        check((await visual.locator('.s5v-arch-map__pipe').count()) === 0, `${testCase.route}: ${viewport.name} obsolete linear pipe rendered`);
        check((await visual.locator('.s5v__steps--tabs').count()) === 0, `${testCase.route}: ${viewport.name} cosmetic tabs rendered`);
        check((await visual.locator('[data-s5v-stepper]').count()) === 0, `${testCase.route}: ${viewport.name} cosmetic stepper rendered`);

        const visualBox = await visual.boundingBox();
        check(Boolean(visualBox && visualBox.width <= viewport.width + 1), `${testCase.route}: ${viewport.name} visual root exceeds viewport (${JSON.stringify(visualBox)})`);

        const geometry = await visual.evaluate((root) => {
          const box = (selector) => {
            const node = root.querySelector(selector);
            if (!node) return null;
            const r = node.getBoundingClientRect();
            return { left:r.left, right:r.right, top:r.top, bottom:r.bottom, width:r.width, height:r.height, cx:r.left+r.width/2, cy:r.top+r.height/2 };
          };
          const sources = ['instructions','examples','history','tools','retrieval','observations','memory'];
          return {
            candidateBoundary: box('[data-boundary="candidate-universe"]'),
            promptBoundary: box('[data-boundary="prompt-engineering"]'),
            contextBoundary: box('[data-boundary="context-engineering"]'),
            environmentBoundary: box('[data-boundary="environment-effects"]'),
            sources: Object.fromEntries(sources.map((name) => [name, box(`[data-source="${name}"]`)])),
            assembler: box('[data-node="assembler"]'),
            inferenceContext: box('[data-node="inference-context"]'),
            model: box('[data-node="model"]'),
            action: box('[data-node="action"]'),
            environment: box('[data-node="environment"]'),
            feedback: box('[data-edge="feedback"]'),
            instructionsEdge: box('[data-edge="instructions-to-assembler"]'),
            examplesEdge: box('[data-edge="examples-to-assembler"]'),
            observationsEdge: box('[data-edge="observations-to-assembler"]'),
          };
        });

        for (const [name, box] of Object.entries({
          candidateBoundary: geometry.candidateBoundary,
          promptBoundary: geometry.promptBoundary,
          contextBoundary: geometry.contextBoundary,
          environmentBoundary: geometry.environmentBoundary,
          assembler: geometry.assembler,
          inferenceContext: geometry.inferenceContext,
          model: geometry.model,
          action: geometry.action,
          environment: geometry.environment,
          feedback: geometry.feedback,
          instructionsEdge: geometry.instructionsEdge,
          examplesEdge: geometry.examplesEdge,
          observationsEdge: geometry.observationsEdge,
        })) check(Boolean(box && box.width >= 0 && box.height >= 0), `${testCase.route}: ${viewport.name} missing relationship geometry ${name}`);
        for (const [name, box] of Object.entries(geometry.sources)) check(Boolean(box && box.width > 20 && box.height > 20), `${testCase.route}: ${viewport.name} missing source geometry ${name}`);

        const contains = (outer, inner, pad = 2) => Boolean(outer && inner && inner.left >= outer.left - pad && inner.right <= outer.right + pad && inner.top >= outer.top - pad && inner.bottom <= outer.bottom + pad);
        if (geometry.candidateBoundary) {
          for (const [name, box] of Object.entries(geometry.sources)) check(contains(geometry.candidateBoundary, box, 4), `${testCase.route}: ${viewport.name} source ${name} escaped candidate-information boundary`);
        }
        check(contains(geometry.promptBoundary, geometry.sources.instructions, 4), `${testCase.route}: ${viewport.name} instructions not inside prompt-engineering subset`);
        check(contains(geometry.promptBoundary, geometry.sources.examples, 4), `${testCase.route}: ${viewport.name} examples not inside prompt-engineering subset`);
        for (const name of ['history','tools','retrieval','observations','memory']) {
          const box = geometry.sources[name];
          if (geometry.promptBoundary && box) check(box.top > geometry.promptBoundary.bottom + 15, `${testCase.route}: ${viewport.name} ${name} visually collapsed into prompt-engineering subset`);
        }
        if (geometry.assembler && geometry.inferenceContext && geometry.model) {
          check(geometry.assembler.cx < geometry.inferenceContext.cx - 120, `${testCase.route}: ${viewport.name} assembler→context direction collapsed (${JSON.stringify(geometry)})`);
          check(geometry.inferenceContext.cx < geometry.model.cx - 100, `${testCase.route}: ${viewport.name} context→model inference boundary collapsed (${JSON.stringify(geometry)})`);
        }
        if (geometry.sources.history && geometry.assembler) {
          for (const [name, box] of Object.entries(geometry.sources)) check(box.right < geometry.assembler.cx - 35, `${testCase.route}: ${viewport.name} source ${name} no longer visibly converges from candidate side`);
        }
        if (geometry.model && geometry.action && geometry.environment) {
          check(geometry.action.cy > geometry.model.cy + 120, `${testCase.route}: ${viewport.name} model output no longer visibly crosses toward external effects`);
          check(geometry.environment.cx > geometry.action.cx + 120, `${testCase.route}: ${viewport.name} action→effect direction collapsed`);
          check(contains(geometry.environmentBoundary, geometry.action, 5) && contains(geometry.environmentBoundary, geometry.environment, 5), `${testCase.route}: ${viewport.name} external action/effect nodes escaped environment boundary`);
        }
        if (geometry.feedback && geometry.sources.observations && geometry.environment) {
          check(geometry.feedback.height > 55 && geometry.feedback.width > 450, `${testCase.route}: ${viewport.name} feedback loop collapsed into cosmetic connector (${JSON.stringify(geometry.feedback)})`);
          check(geometry.feedback.left <= geometry.sources.observations.cx + 15 && geometry.feedback.right >= geometry.environment.cx - 15, `${testCase.route}: ${viewport.name} feedback no longer spans effect→next-turn candidate relationship`);
        }
        if (geometry.instructionsEdge && geometry.examplesEdge) {
          check(geometry.instructionsEdge.width > 230, `${testCase.route}: ${viewport.name} instructions lane is not visibly connected to assembler`);
          check(geometry.examplesEdge.width > 100, `${testCase.route}: ${viewport.name} examples lane is not visibly connected to assembler`);
        }

        const scroller = visual.locator('.s5v-context-assembly__scroll');
        check((await scroller.count()) === 1, `${testCase.route}: ${viewport.name} topology-preserving scroll region missing`);
        if (await scroller.count()) {
          check((await scroller.getAttribute('tabindex')) === '0', `${testCase.route}: ${viewport.name} scroll region is not keyboard focusable`);
          const scrollState = await scroller.evaluate((node) => {
            const maxScroll = node.scrollWidth - node.clientWidth;
            node.scrollLeft = maxScroll;
            void node.offsetWidth;
            return { maxScroll, actualScroll: node.scrollLeft, clientWidth: node.clientWidth, scrollWidth: node.scrollWidth };
          });
          if (viewport.name === 'mobile') {
            check(scrollState.maxScroll > 300 && scrollState.actualScroll > 300, `${testCase.route}: mobile relationship canvas did not preserve topology through horizontal scroll (${JSON.stringify(scrollState)})`);
            await scroller.screenshot({ path: path.join(outDir, `context-engineering-ch1-${testCase.locale}-mobile-visual-end.png`), animations: 'disabled' });
          } else {
            check(scrollState.scrollWidth >= 1000, `${testCase.route}: desktop relationship canvas collapsed unexpectedly (${JSON.stringify(scrollState)})`);
          }
          await scroller.evaluate((node) => { node.scrollLeft = 0; });
        }
        await visual.screenshot({ path: path.join(outDir, `context-engineering-ch1-${testCase.locale}-${viewport.name}-visual.png`), animations: 'disabled' });
      }

      const articleText = (await page.locator('main').innerText()).toLocaleLowerCase();
      check(articleText.includes('c_t') || articleText.includes('cₜ'), `${testCase.route}: ${viewport.name} rendered context notation missing`);
      check(articleText.includes('prompt engineering') && articleText.includes('context engineering'), `${testCase.route}: ${viewport.name} core distinction missing`);

      const overflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      check(overflow.scrollWidth <= overflow.clientWidth + 1, `${testCase.route}: ${viewport.name} horizontal page overflow ${JSON.stringify(overflow)}`);

      for (const error of runtimeErrors) failures.push(`${testCase.route}: ${viewport.name} runtime error: ${error}`);
      for (const error of consoleErrors.filter((entry) => !/favicon|Failed to load resource.*404/i.test(entry))) failures.push(`${testCase.route}: ${viewport.name} console error: ${error}`);
      await page.screenshot({ path: path.join(outDir, `context-engineering-ch1-${testCase.locale}-${viewport.name}-page.png`), fullPage: true, animations: 'disabled' });
      await context.close();
    }
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`Context engineering chapter 3.1 browser/accessibility QA failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Context engineering chapter 3.1 browser/accessibility QA PASS: ES/EN language, prompt⊂context geometry, seven-source convergence, inference boundary, effect/feedback loop, topology-preserving mobile scroll, reduced-motion, overflow, runtime errors and review screenshots are valid.');
