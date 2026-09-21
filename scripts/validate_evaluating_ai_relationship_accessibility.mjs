#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const chapters = [
  {
    id: '01', slug: '01-que-evaluar-modelo-componente-sistema-workflow-trayectoria', section: '.s5v-eval-boundary', scroller: '.s5v-eval-boundary__scroll',
    nodes: ['change', 'question', 'retriever', 'model', 'outcome', 'diagnose', 'confirm'], boundaries: ['system', 'workflow', 'component'],
    relationships: ['change->diagnostic-boundary', 'boundary->diagnose', 'trial->trajectory->outcome', 'outcome->confirm'],
    sentinels: { es: 'Diagnostica hacia dentro', en: 'Diagnose inward' },
  },
  {
    id: '02', slug: '02-offline-eval-sets-curation-hard-negatives-contamination-versioning', section: '.s5v-eval-dataset', scroller: '.s5v-eval-dataset__scroll',
    nodes: ['source', 'provenance', 'group', 'dev', 'regression', 'holdout', 'challenge'], boundaries: ['release'],
    relationships: ['sources->provenance->grouping', 'grouping->banks', 'banks->release', 'hard-pair->boundary', 'leakage->trust', 'production-failure->next-version'],
    sentinels: { es: 'Admisión', en: 'Admission' },
  },
  {
    id: '03', slug: '03-llm-as-judge-evaluacion-humana-calibracion-sesgo-varianza-acuerdo', section: '.s5v-judge-calibration', scroller: '.jc-scroll',
    nodes: ['construct', 'rubric', 'calibration', 'judge-version', 'validation-item', 'human-raters', 'llm-repeats'], boundaries: ['judge-version'],
    relationships: ['construct->rubric->calibration->judge', 'item->blind->independent-ratings', 'probes->llm', 'labels->diagnostics', 'diagnostics->scope'],
    sentinels: { es: 'Define y congela', en: 'Define and freeze' },
  },
  {
    id: '04', slug: '04-evaluacion-trayectorias-agentes-tools-exito-eficiencia-recuperacion-policy', section: '.s5v-agent-trajectory', scroller: '.at-scroll',
    nodes: ['task-policy-state', 'observation', 'decision', 'policy-gate', 'tool-call', 'tool-result', 'policy-deny'], boundaries: ['side-effect-policy'],
    relationships: ['task->observation->decision', 'decision->policy-gate', 'tool-result->state-or-failure', 'failure->recovery', 'state->stop->outcome', 'trajectory+outcome->release'],
    sentinels: { es: 'Antes del side effect', en: 'Before the side effect' },
  },
  {
    id: '05', slug: '05-online-evaluation-shadow-canary-ab-guardrails-regression-gates', section: '.s5v-online-eval', scroller: '.oe-scroll',
    nodes: ['candidate', 'offline', 'shadow', 'canary', 'ab', 'rollout', 'release-gate', 'rollback', 'pause', 'promote'], boundaries: ['shadow-boundary', 'canary-boundary', 'ab-boundary'],
    relationships: ['candidate->offline->shadow', 'shadow->canary', 'canary->ab->rollout', 'evidence+guardrails->gate', 'gate->decision'],
    sentinels: { es: 'Exposición real limitada', en: 'Limited real exposure' },
  },
  {
    id: '06', slug: '06-observability-failure-taxonomies-production-eval-repair-feedback-loops', section: '.s5v-eval-feedback', scroller: '.fb-scroll',
    nodes: ['signals', 'reconstruct', 'instrumentation', 'taxonomy', 'sufficiency', 'redact', 'dedupe', 'versioned-eval', 'repair', 'regression', 'controlled-release', 'deploy', 'verify-production'],
    boundaries: ['observation-boundary', 'diagnosis-boundary', 'eval-boundary', 'evidence-boundary'],
    relationships: ['signals->reconstruct->taxonomy', 'insufficient->instrumentation->signals', 'reproducible->eval', 'eval->repair->release', 'deploy->verify->signals', 'failure+eval+release->receipts'],
    sentinels: { es: 'Observa y diagnostica', en: 'Observe and diagnose' },
  },
];

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const locales = ['es', 'en'];
const viewports = [
  { name: 'desktop', width: 1440, height: 1000, hasTouch: false },
  { name: 'mobile', width: 390, height: 844, hasTouch: true },
];
const motionModes = [
  { name: 'normal', value: 'no-preference' },
  { name: 'reduced', value: 'reduce' },
];

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) {
    for (const motion of motionModes) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        hasTouch: viewport.hasTouch,
        isMobile: viewport.hasTouch,
        reducedMotion: motion.value,
      });
      for (const locale of locales) {
        for (const chapter of chapters) {
          const route = `${locale === 'en' ? '/en' : ''}/series/evaluating-ai-systems-production/${chapter.slug}/`;
          const page = await context.newPage();
          const badResources = [];
          const runtimeErrors = [];

          // Listeners stay attached for the complete route lifecycle: navigation,
          // layout/relationship checks, screenshot, touch and teardown.
          page.on('response', (response) => {
            try {
              const url = new URL(response.url());
              const origin = new URL(base).origin;
              if (url.origin === origin && response.status() >= 400 && !/favicon/i.test(url.pathname)) {
                badResources.push(`${response.status()} ${url.pathname}`);
              }
            } catch {}
          });
          page.on('pageerror', (error) => runtimeErrors.push(String(error)));

          const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
          check(response?.ok(), `${chapter.id}/${locale}/${viewport.name}/${motion.name}: HTTP ${response?.status() ?? 'none'}`);

          const visual = page.locator(chapter.section).first();
          check((await visual.count()) === 1, `${chapter.id}/${locale}/${viewport.name}/${motion.name}: visual ${chapter.section} missing`);
          if (!(await visual.count())) {
            await page.close();
            continue;
          }

          const htmlLang = (await page.locator('html').getAttribute('lang') || '').toLowerCase();
          check(htmlLang.startsWith(locale), `${chapter.id}/${locale}/${viewport.name}/${motion.name}: html lang=${htmlLang}`);
          const pageOverflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
          check(pageOverflow.scrollWidth <= pageOverflow.clientWidth + 1, `${chapter.id}/${locale}/${viewport.name}/${motion.name}: page-level horizontal overflow ${JSON.stringify(pageOverflow)}`);

          const projection = visual.locator('.s5v-mobile-native[data-mobile-native="true"]').first();
          const scroller = visual.locator(chapter.scroller).first();
          check((await scroller.count()) === 1, `${chapter.id}/${locale}/${viewport.name}/${motion.name}: legacy detail scroller missing`);

          if (viewport.name === 'mobile') {
            check((await projection.count()) === 1, `${chapter.id}/${locale}/mobile/${motion.name}: native projection missing`);
            if (await projection.count()) {
              const projectionBox = await projection.boundingBox();
              check(Boolean(projectionBox), `${chapter.id}/${locale}/mobile/${motion.name}: native projection not visible`);
              if (projectionBox) {
                check(projectionBox.x >= -1 && projectionBox.x + projectionBox.width <= viewport.width + 1,
                  `${chapter.id}/${locale}/mobile/${motion.name}: native projection escapes viewport ${JSON.stringify(projectionBox)}`);
              }
              const projectionDisplay = await projection.evaluate((node) => getComputedStyle(node).display);
              check(projectionDisplay !== 'none', `${chapter.id}/${locale}/mobile/${motion.name}: native projection display:none`);
              const text = await projection.innerText();
              check(text.includes(chapter.sentinels[locale]), `${chapter.id}/${locale}/mobile/${motion.name}: localized semantic sentinel missing`);

              for (const relationship of chapter.relationships) {
                const rel = projection.locator(`[data-mobile-relationship="${relationship}"]`).first();
                check((await rel.count()) === 1, `${chapter.id}/${locale}/mobile/${motion.name}: relationship ${relationship} missing`);
              }
              const fontSizes = await projection.locator('[data-mobile-relationship]').evaluateAll((nodes) => nodes.map((node) => parseFloat(getComputedStyle(node).fontSize)));
              check(fontSizes.length === chapter.relationships.length, `${chapter.id}/${locale}/mobile/${motion.name}: relationship count ${fontSizes.length} != ${chapter.relationships.length}`);
              check(fontSizes.every((size) => Number.isFinite(size) && size >= 14), `${chapter.id}/${locale}/mobile/${motion.name}: text below 14px ${JSON.stringify(fontSizes)}`);

              // Real touch event against the actual mobile teaching surface. It
              // is static by design, so reachability does not depend on scrollLeft.
              await projection.tap({ position: { x: 8, y: 8 } });
              const afterTapOverflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
              check(afterTapOverflow.scrollWidth <= afterTapOverflow.clientWidth + 1, `${chapter.id}/${locale}/mobile/${motion.name}: touch introduced page overflow`);
            }
            if (await scroller.count()) {
              const scrollerDisplay = await scroller.evaluate((node) => getComputedStyle(node).display);
              check(scrollerDisplay === 'none', `${chapter.id}/${locale}/mobile/${motion.name}: giant desktop detail canvas remains primary (${scrollerDisplay})`);
            }
          } else {
            if (await projection.count()) {
              const projectionDisplay = await projection.evaluate((node) => getComputedStyle(node).display);
              check(projectionDisplay === 'none', `${chapter.id}/${locale}/desktop/${motion.name}: mobile projection should not replace desktop detail`);
            }
            if (await scroller.count()) {
              const scrollerDisplay = await scroller.evaluate((node) => getComputedStyle(node).display);
              check(scrollerDisplay !== 'none', `${chapter.id}/${locale}/desktop/${motion.name}: desktop detail canvas hidden`);
              const metrics = await scroller.evaluate((node) => ({ scrollWidth: node.scrollWidth, clientWidth: node.clientWidth, overflowX: getComputedStyle(node).overflowX }));
              check(metrics.scrollWidth <= metrics.clientWidth + 2, `${chapter.id}/${locale}/desktop/${motion.name}: desktop detail unexpectedly requires horizontal scroll ${JSON.stringify(metrics)}`);
            }
            for (const name of chapter.nodes) {
              const item = visual.locator(`[data-node="${name}"]`).first();
              check((await item.count()) === 1, `${chapter.id}/${locale}/desktop/${motion.name}: node ${name} missing`);
              if (await item.count()) check(Boolean(await item.boundingBox()), `${chapter.id}/${locale}/desktop/${motion.name}: node ${name} not visible`);
            }
            for (const name of chapter.boundaries) {
              const item = visual.locator(`[data-boundary="${name}"]`).first();
              check((await item.count()) === 1, `${chapter.id}/${locale}/desktop/${motion.name}: boundary ${name} missing`);
              if (await item.count()) check(Boolean(await item.boundingBox()), `${chapter.id}/${locale}/desktop/${motion.name}: boundary ${name} not visible`);
            }
          }

          if (motion.name === 'reduced') {
            const moving = await visual.evaluate((root) => [root, ...root.querySelectorAll('*')].map((element) => {
              const style = getComputedStyle(element);
              return { animation: style.animationName, duration: style.animationDuration, transition: style.transitionDuration };
            }).filter((value) => value.animation !== 'none' && value.duration !== '0s'));
            check(moving.length === 0, `${chapter.id}/${locale}/${viewport.name}/reduced: active animation remains ${JSON.stringify(moving.slice(0, 4))}`);
          }

          const target = viewport.name === 'mobile' ? projection : visual;
          if (await target.count()) {
            await target.screenshot({
              path: path.join(outDir, `ai-systems-eval-${chapter.id}-${locale}-${viewport.name}-${motion.name}.png`),
              animations: 'disabled',
            });
          }

          // Resource/runtime checks are intentionally evaluated after all
          // interactions and screenshots, immediately before teardown.
          check(badResources.length === 0, `${chapter.id}/${locale}/${viewport.name}/${motion.name}: broken same-origin resources ${JSON.stringify(badResources)}`);
          check(runtimeErrors.length === 0, `${chapter.id}/${locale}/${viewport.name}/${motion.name}: runtime errors ${JSON.stringify(runtimeErrors)}`);
          await page.close();
        }
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`Evaluating AI Systems native relationship/accessibility gate failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Evaluating AI Systems native relationship/accessibility gate PASS: 6 chapters × ES/EN × desktop/mobile × normal/reduced; desktop topology preserved, native ~390px relationships legible, giant canvas hidden on mobile, touch exercised, listeners persisted through teardown, and resources/runtime stayed clean.');
