#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const cycleSourcePath = path.resolve('docs/snippets/temas/evaluation-cycle.html');
const cycleMapPath = path.resolve('locales/en/snippets/temas/evaluation-cycle.i18n.json');
const referenceSourcePath = path.resolve('docs/snippets/temas/evaluation-reference-set.html');
const referenceMapPath = path.resolve('locales/en/snippets/temas/evaluation-reference-set.i18n.json');
const judgeSourcePath = path.resolve('docs/snippets/temas/evaluation-judge-calibration.html');
const judgeMapPath = path.resolve('locales/en/snippets/temas/evaluation-judge-calibration.i18n.json');
const spanishTopicPath = path.resolve('docs/temas/evaluacion-modelos.md');
const englishTopicPath = path.resolve('locales/en/temas/evaluacion-modelos.md');
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

function gitBlobSha(text) {
  const bytes = Buffer.from(text, 'utf8');
  return crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}

const [cycleSource, cycleMapRaw, referenceSource, referenceMapRaw, judgeSource, judgeMapRaw, spanishTopic, englishTopic] = await Promise.all([
  fs.readFile(cycleSourcePath, 'utf8'),
  fs.readFile(cycleMapPath, 'utf8'),
  fs.readFile(referenceSourcePath, 'utf8'),
  fs.readFile(referenceMapPath, 'utf8'),
  fs.readFile(judgeSourcePath, 'utf8'),
  fs.readFile(judgeMapPath, 'utf8'),
  fs.readFile(spanishTopicPath, 'utf8'),
  fs.readFile(englishTopicPath, 'utf8'),
]);
const cycleTranslation = JSON.parse(cycleMapRaw);
const referenceTranslation = JSON.parse(referenceMapRaw);
const judgeTranslation = JSON.parse(judgeMapRaw);
const cycleInclude = '{{ include_html("snippets/temas/evaluation-cycle.html") }}';
const referenceInclude = '{{ include_html("snippets/temas/evaluation-reference-set.html") }}';
const judgeInclude = '{{ include_html("snippets/temas/evaluation-judge-calibration.html") }}';

check(spanishTopic.includes(cycleInclude), 'Spanish evaluation hub: missing evaluation-cycle include');
check(englishTopic.includes(cycleInclude), 'English evaluation hub: missing evaluation-cycle include');
check(spanishTopic.includes(referenceInclude), 'Spanish evaluation hub: missing evaluation-reference-set include');
check(englishTopic.includes(referenceInclude), 'English evaluation hub: missing evaluation-reference-set include');
check(spanishTopic.includes(judgeInclude), 'Spanish evaluation hub: missing evaluation-judge-calibration include');
check(englishTopic.includes(judgeInclude), 'English evaluation hub: missing evaluation-judge-calibration include');
check(!spanishTopic.includes('→ añadir caso y criterio'), 'Spanish evaluation hub: legacy ASCII evaluation cycle is still present');
check(!englishTopic.includes('→ add a case and criterion'), 'English evaluation hub: legacy ASCII evaluation cycle is still present');
check(!spanishTopic.includes('Un centenar de casos bien elegidos'), 'Spanish evaluation hub: unsourced hundred-case heuristic is still present');
check(!englishTopic.includes('A hundred carefully chosen cases'), 'English evaluation hub: unsourced hundred-case heuristic is still present');
check(cycleTranslation.source === 'snippets/temas/evaluation-cycle.html', 'English evaluation-cycle translation map: wrong canonical source');
check(cycleTranslation.source_blob_sha === gitBlobSha(cycleSource), `English evaluation-cycle translation map: source_blob_sha drift (expected ${gitBlobSha(cycleSource)}, found ${cycleTranslation.source_blob_sha})`);
check(referenceTranslation.source === 'snippets/temas/evaluation-reference-set.html', 'English reference-set translation map: wrong canonical source');
check(referenceTranslation.source_blob_sha === gitBlobSha(referenceSource), `English reference-set translation map: source_blob_sha drift (expected ${gitBlobSha(referenceSource)}, found ${referenceTranslation.source_blob_sha})`);
check(judgeTranslation.source === 'snippets/temas/evaluation-judge-calibration.html', 'English judge-calibration translation map: wrong canonical source');
check(judgeTranslation.source_blob_sha === gitBlobSha(judgeSource), `English judge-calibration translation map: source_blob_sha drift (expected ${gitBlobSha(judgeSource)}, found ${judgeTranslation.source_blob_sha})`);
check(cycleSource.includes('prefers-reduced-motion:reduce'), 'Evaluation cycle visual: missing reduced-motion contract');
check(cycleSource.includes('evc-mobile-return'), 'Evaluation cycle visual: missing explicit mobile loop-return affordance');
check(referenceSource.includes('prefers-reduced-motion:reduce'), 'Evaluation reference-set visual: missing reduced-motion contract');
check(referenceSource.includes('https://arxiv.org/abs/2211.09110'), 'Evaluation reference-set visual: missing HELM primary reference');
check(referenceSource.includes('https://platform.openai.com/docs/api-reference/evals'), 'Evaluation reference-set visual: missing OpenAI Evals primary reference');
check(judgeSource.includes('prefers-reduced-motion:reduce'), 'Evaluation judge-calibration visual: missing reduced-motion contract');
check(judgeSource.includes('https://arxiv.org/abs/2306.05685'), 'Evaluation judge-calibration visual: missing LLM-as-a-Judge primary reference');

const browser = await chromium.launch({ headless: true });
const cases = [
  {
    locale: 'es',
    route: '/temas/evaluacion-modelos/',
    cycleAnchors: ['BUCLE OPERATIVO', 'Incidente o necesidad', 'Mide el sistema actual', 'Modelo / prompt / sistema', 'Rollout limitado', 'Observa el producto', 'Fallo nuevo → caso permanente', 'CIERRA EL BUCLE'],
    referenceAnchors: ['COBERTURA → CASOS → REGRESIONES', 'Un dataset de referencia útil representa fallos', 'TAXONOMÍA', 'COBERTURA', 'CASO REPRODUCIBLE', 'INCIDENTE REAL', 'VERSIÓN N+1'],
    judgeAnchors: ['JUEZ AUTOMÁTICO → CALIBRACIÓN → GATE', 'REFERENCIA HUMANA', 'JUEZ CANDIDATO', 'CALIBRACIÓN', 'acuerdo estable', 'sesgo sistemático', 'evaluación automática', 'revisión humana'],
    mobileReturn: 'VUELVE A SEÑAL',
    referenceForbidden: [],
    judgeForbidden: [],
  },
  {
    locale: 'en',
    route: '/en/temas/evaluacion-modelos/',
    cycleAnchors: ['OPERATIONAL LOOP', 'Incident or need', 'Measure the current system', 'Model / prompt / system', 'Limited rollout', 'Observe the product', 'New failure → permanent case', 'CLOSE THE LOOP'],
    referenceAnchors: ['COVERAGE → CASES → REGRESSIONS', 'A useful reference set represents failure modes', 'TAXONOMY', 'COVERAGE', 'REPRODUCIBLE CASE', 'REAL INCIDENT', 'VERSION N+1'],
    judgeAnchors: ['AUTOMATED JUDGE → CALIBRATION → GATE', 'HUMAN REFERENCE', 'CANDIDATE JUDGE', 'CALIBRATION', 'stable agreement', 'systematic bias', 'automated evaluation', 'human review'],
    mobileReturn: 'BACK TO SIGNAL',
    referenceForbidden: ['COBERTURA → CASOS', 'dataset de referencia útil', 'TAXONOMÍA', 'Haz visibles los huecos', 'CASO REPRODUCIBLE', 'INCIDENTE REAL', 'el fallo ya no se olvida', 'Fuentes primarias:'],
    judgeForbidden: ['JUEZ AUTOMÁTICO', 'CALIBRACIÓN', 'REFERENCIA HUMANA', 'JUEZ CANDIDATO', 'acuerdo estable', 'sesgo sistemático', 'evaluación automática', 'revisión humana', 'Fuente primaria:'],
  },
];
const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
];

try {
  for (const testCase of cases) {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      const runtimeErrors = [];
      page.on('pageerror', (error) => runtimeErrors.push(error.message));
      const response = await page.goto(`${base}${testCase.route}`, { waitUntil: 'networkidle' });
      check(response?.ok(), `${testCase.route}: ${viewport.name} HTTP ${response?.status() ?? 'no response'}`);

      const cycleVisual = page.locator('.evc-wrap');
      check((await cycleVisual.count()) === 1, `${testCase.route}: ${viewport.name} expected exactly one .evc-wrap`);
      if (await cycleVisual.count()) {
        const box = await cycleVisual.boundingBox();
        check(Boolean(box && box.width >= 250 && box.height >= 300), `${testCase.route}: ${viewport.name} invalid evaluation-cycle geometry ${JSON.stringify(box)}`);
        const overflow = await cycleVisual.evaluate((node) => node.scrollWidth - node.clientWidth);
        check(overflow <= 2, `${testCase.route}: ${viewport.name} evaluation-cycle internal overflow ${overflow}px`);
      }

      check((await page.locator('.evc-stage').count()) === 6, `${testCase.route}: ${viewport.name} expected 6 evaluation-cycle stages`);
      check((await page.locator('.evc-context-item').count()) === 2, `${testCase.route}: ${viewport.name} expected 2 offline/online context bands`);
      check((await page.locator('.evc-feedback').count()) === 1, `${testCase.route}: ${viewport.name} expected one loop-closing feedback band`);
      check((await page.locator('.evc-tags span').count()) === 18, `${testCase.route}: ${viewport.name} expected 18 stage evidence tags`);

      const mobileReturn = page.locator('.evc-mobile-return');
      check((await mobileReturn.count()) === 1, `${testCase.route}: ${viewport.name} expected one mobile loop-return affordance`);
      if (await mobileReturn.count()) {
        const visible = await mobileReturn.isVisible();
        if (viewport.name === 'mobile') {
          check(visible, `${testCase.route}: mobile loop-return affordance must be visible`);
          if (visible) {
            const returnText = await mobileReturn.innerText();
            check(returnText.includes(testCase.mobileReturn), `${testCase.route}: mobile loop-return label should contain ${JSON.stringify(testCase.mobileReturn)}, got ${JSON.stringify(returnText)}`);
            const returnBox = await mobileReturn.boundingBox();
            check(Boolean(returnBox && returnBox.height >= 20 && returnBox.width >= 100), `${testCase.route}: invalid mobile loop-return geometry ${JSON.stringify(returnBox)}`);
          }
        } else {
          check(!visible, `${testCase.route}: desktop should use the spatial up-arrow, not the mobile loop-return label`);
        }
      }

      const referenceVisual = page.locator('.evr-wrap');
      check((await referenceVisual.count()) === 1, `${testCase.route}: ${viewport.name} expected exactly one .evr-wrap`);
      if (await referenceVisual.count()) {
        const box = await referenceVisual.boundingBox();
        check(Boolean(box && box.width >= 250 && box.height >= 420), `${testCase.route}: ${viewport.name} invalid evaluation-reference-set geometry ${JSON.stringify(box)}`);
        const overflow = await referenceVisual.evaluate((node) => node.scrollWidth - node.clientWidth);
        check(overflow <= 2, `${testCase.route}: ${viewport.name} evaluation-reference-set internal overflow ${overflow}px`);
        const referenceText = await referenceVisual.innerText();
        for (const anchor of testCase.referenceAnchors) check(referenceText.includes(anchor), `${testCase.route}: ${viewport.name} missing reference-set teaching anchor ${JSON.stringify(anchor)}`);
        for (const token of testCase.referenceForbidden) check(!referenceText.includes(token), `${testCase.route}: ${viewport.name} reference-set Spanish leakage ${JSON.stringify(token)}`);
      }

      check((await page.locator('.evr-axis').count()) === 3, `${testCase.route}: ${viewport.name} expected 3 taxonomy axes`);
      check((await page.locator('.evr-axis span').count()) === 9, `${testCase.route}: ${viewport.name} expected 9 taxonomy example tags`);
      check((await page.locator('.evr-row-label').count()) === 4, `${testCase.route}: ${viewport.name} expected 4 coverage matrix rows`);
      check((await page.locator('.evr-cell').count()) === 16, `${testCase.route}: ${viewport.name} expected 16 coverage matrix cells`);
      check((await page.locator('.evr-cell--gap').count()) === 5, `${testCase.route}: ${viewport.name} expected 5 illustrative coverage gaps`);
      check((await page.locator('.evr-case-field').count()) === 6, `${testCase.route}: ${viewport.name} expected 6 reproducible-case fields`);
      check((await page.locator('.evr-feedback-step').count()) === 3, `${testCase.route}: ${viewport.name} expected 3 incident→regression feedback stages`);
      check((await page.locator('.evr-contracts > div').count()) === 3, `${testCase.route}: ${viewport.name} expected 3 reference-set teaching contracts`);

      const judgeVisual = page.locator('.ejc-wrap');
      check((await judgeVisual.count()) === 1, `${testCase.route}: ${viewport.name} expected exactly one .ejc-wrap`);
      if (await judgeVisual.count()) {
        const box = await judgeVisual.boundingBox();
        check(Boolean(box && box.width >= 250 && box.height >= 300), `${testCase.route}: ${viewport.name} invalid judge-calibration geometry ${JSON.stringify(box)}`);
        const overflow = await judgeVisual.evaluate((node) => node.scrollWidth - node.clientWidth);
        check(overflow <= 2, `${testCase.route}: ${viewport.name} judge-calibration internal overflow ${overflow}px`);
        const judgeText = await judgeVisual.innerText();
        for (const anchor of testCase.judgeAnchors) check(judgeText.includes(anchor), `${testCase.route}: ${viewport.name} missing judge-calibration teaching anchor ${JSON.stringify(anchor)}`);
        for (const token of testCase.judgeForbidden) check(!judgeText.includes(token), `${testCase.route}: ${viewport.name} judge-calibration Spanish leakage ${JSON.stringify(token)}`);
      }

      check((await page.locator('.ejc-card').count()) === 4, `${testCase.route}: ${viewport.name} expected 4 judge-calibration stages`);
      check((await page.locator('.ejc-segments > div').count()) === 3, `${testCase.route}: ${viewport.name} expected 3 calibration segments`);
      check((await page.locator('.ejc-biases span').count()) === 3, `${testCase.route}: ${viewport.name} expected 3 judge-bias probes`);
      check((await page.locator('.ejc-route').count()) === 2, `${testCase.route}: ${viewport.name} expected 2 judge gate routes`);
      check((await page.locator('.ejc-contracts > div').count()) === 3, `${testCase.route}: ${viewport.name} expected 3 judge-calibration teaching contracts`);

      const body = await page.locator('body').innerText();
      for (const anchor of testCase.cycleAnchors) check(body.includes(anchor), `${testCase.route}: ${viewport.name} missing cycle teaching anchor ${JSON.stringify(anchor)}`);

      const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(pageOverflow <= 2, `${testCase.route}: ${viewport.name} horizontal page overflow ${pageOverflow}px`);
      for (const error of runtimeErrors) failures.push(`${testCase.route}: ${viewport.name} runtime error: ${error}`);

      if (await cycleVisual.count()) {
        await cycleVisual.screenshot({
          path: path.join(outDir, `evaluation-cycle-${testCase.locale}-${viewport.name}.png`),
          animations: 'disabled',
        });
      }
      if (await referenceVisual.count()) {
        await referenceVisual.screenshot({
          path: path.join(outDir, `evaluation-reference-set-${testCase.locale}-${viewport.name}.png`),
          animations: 'disabled',
        });
      }
      if (await judgeVisual.count()) {
        await judgeVisual.screenshot({
          path: path.join(outDir, `evaluation-judge-calibration-${testCase.locale}-${viewport.name}.png`),
          animations: 'disabled',
        });
      }
      await page.close();
    }

    const reduced = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await reduced.emulateMedia({ reducedMotion: 'reduce' });
    await reduced.goto(`${base}${testCase.route}`, { waitUntil: 'networkidle' });
    const firstStage = reduced.locator('.evc-stage').first();
    await firstStage.hover();
    const reducedStyle = await firstStage.evaluate((node) => ({
      transitionDuration: getComputedStyle(node).transitionDuration,
      transform: getComputedStyle(node).transform,
    }));
    check(reducedStyle.transitionDuration.split(',').every((value) => value.trim() === '0s'), `${testCase.route}: reduced-motion transition remains active (${reducedStyle.transitionDuration})`);
    check(reducedStyle.transform === 'none', `${testCase.route}: reduced-motion hover transform remains active (${reducedStyle.transform})`);
    const referenceReduced = reduced.locator('.evr-wrap').first();
    if (await referenceReduced.count()) {
      const refReducedStyle = await referenceReduced.evaluate((node) => ({
        animationDuration: getComputedStyle(node).animationDuration,
        scrollBehavior: getComputedStyle(node).scrollBehavior,
      }));
      check(refReducedStyle.animationDuration === '0s', `${testCase.route}: reference-set reduced-motion animation remains active (${refReducedStyle.animationDuration})`);
      check(refReducedStyle.scrollBehavior === 'auto', `${testCase.route}: reference-set reduced-motion scroll behavior should be auto (${refReducedStyle.scrollBehavior})`);
    }
    const judgeReduced = reduced.locator('.ejc-wrap').first();
    if (await judgeReduced.count()) {
      const judgeReducedStyle = await judgeReduced.evaluate((node) => ({
        animationDuration: getComputedStyle(node).animationDuration,
        scrollBehavior: getComputedStyle(node).scrollBehavior,
      }));
      check(judgeReducedStyle.animationDuration === '0s', `${testCase.route}: judge-calibration reduced-motion animation remains active (${judgeReducedStyle.animationDuration})`);
      check(judgeReducedStyle.scrollBehavior === 'auto', `${testCase.route}: judge-calibration reduced-motion scroll behavior should be auto (${judgeReducedStyle.scrollBehavior})`);
    }
    await reduced.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error('Evaluation topic visual QA failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Evaluation topic visual QA passed: ES/EN source parity, reference-set taxonomy/coverage/case/regression contracts, judge calibration/gating contracts, six-stage operational loop, desktop/mobile geometry, overflow, language integrity, screenshots and reduced-motion behavior are valid.');