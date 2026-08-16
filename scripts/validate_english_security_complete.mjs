#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const outDir = path.resolve('artifacts/visual-review');
await fs.mkdir(outDir, { recursive: true });

const chapters = [
  {
    slug: '01-prompt-injection',
    route: '/en/series/seguridad-ia/01-prompt-injection/',
    title: 'Chapter 1 — Prompt injection',
    concepts: ['control', 'untrusted', 'authorization'],
    demos: 3,
    visualSelectors: ['.ctxmix', '.ragtrace', '.defsim'],
    screenshot: 'english-security-01-prompt-injection.png',
  },
  {
    slug: '02-jailbreaks',
    route: '/en/series/seguridad-ia/02-jailbreaks/',
    title: 'Chapter 2 — Jailbreaks',
    concepts: ['GCG', 'attack budget', 'N=1', 'Tool reachability', 'Constitutional Classifiers'],
    demos: 3,
    canonicalJailbreaks: true,
    screenshot: 'english-security-02-jailbreaks.png',
  },
  {
    slug: '03-envenenamiento',
    route: '/en/series/seguridad-ia/03-envenenamiento/',
    title: 'Chapter 3 — Poisoning',
    concepts: ['60–89%', '84.2%', '50.3%', 'Sleeper Agents', 'Write → Retrieve → Execute → Forget'],
    demos: 4,
    canonicalPoisoning: true,
    screenshot: 'english-security-03-poisoning.png',
  },
  {
    slug: '04-red-teaming',
    route: '/en/series/seguridad-ia/04-red-teaming/',
    title: 'Chapter 4 — Red teaming',
    concepts: ['trajectory', 'Attack validity', 'Grader validity', 'Injection reached context', 'Recovery failed', 'release gate'],
    demos: 4,
    canonicalRedTeam: true,
    screenshot: 'english-security-04-red-teaming.png',
  },
  { slug: '05-controles-produccion', route: '/en/series/seguridad-ia/05-controles-produccion/', title: 'Chapter 5 — Production controls', concepts: ['least privilege', 'MCP', 'kill path'], demos: 4, prefix: 'sec-05-', screenshot: 'english-security-05-production-controls.png' },
];

const forbidden = ['Capítulo ', 'Preguntas frecuentes', 'Prerrequisitos', 'Siguiente capítulo', 'Fuentes base'];
const failures = [];
const browser = await chromium.launch({ headless: true });
let totalVisuals = 0;

const isVisible = async (locator) => locator.evaluate((node) => {
  const style = getComputedStyle(node);
  return style.display !== 'none' && style.visibility !== 'hidden' && node.getClientRects().length > 0;
});

async function validatePromptInjectionVisuals(page, chapter) {
  let count = 0;
  for (const selector of chapter.visualSelectors) {
    const matches = page.locator(selector);
    const matchCount = await matches.count();
    if (matchCount !== 1) {
      failures.push(`${chapter.route}: expected exactly one ${selector}, found ${matchCount}`);
      continue;
    }
    const root = matches.first();
    if (!await isVisible(root)) failures.push(`${chapter.route}: ${selector} is not visible`);
    const box = await root.boundingBox();
    if (!box || box.width < 240 || box.height < 80) failures.push(`${chapter.route}: ${selector} has invalid geometry ${JSON.stringify(box)}`);

    const buttons = root.locator('button');
    const buttonCount = await buttons.count();
    if (buttonCount === 0) failures.push(`${chapter.route}: ${selector} exposes no interactive control`);
    for (let index = 0; index < buttonCount; index += 1) {
      const button = buttons.nth(index);
      if (!await button.isVisible() || await button.isDisabled()) continue;
      const label = ((await button.textContent()) || '').trim() || await button.getAttribute('aria-label');
      if (!label) failures.push(`${chapter.route}: ${selector} contains an unlabelled control`);
      await button.click();
      await page.waitForTimeout(75);
    }
    count += 1;
  }
  return count;
}

async function validateJailbreakVisuals(page, chapter) {
  const selectors = ['.jbsearch', '.jbbudget', '.jbladder'];
  for (const selector of selectors) {
    const matches = page.locator(selector);
    const count = await matches.count();
    if (count !== 1) {
      failures.push(`${chapter.route}: expected exactly one canonical ${selector}, found ${count}`);
      continue;
    }
    const root = matches.first();
    if (!await isVisible(root)) failures.push(`${chapter.route}: canonical ${selector} is not visible`);
    const box = await root.boundingBox();
    if (!box || box.width < 240 || box.height < 150) failures.push(`${chapter.route}: canonical ${selector} has invalid geometry ${JSON.stringify(box)}`);
  }

  const search = page.locator('.jbsearch');
  if (await search.count() === 1) {
    if (await search.locator('.jbsearch__attempt').count() !== 12) failures.push(`${chapter.route}: jailbreak search must expose 12 attempt markers`);
    const run = search.locator('[data-run]');
    if (await run.count() !== 1) failures.push(`${chapter.route}: jailbreak search is missing its run control`);
    else {
      await run.click();
      await page.waitForTimeout(320);
      const observed = Number((await search.locator('[data-count]').textContent()) || '0');
      if (observed < 1) failures.push(`${chapter.route}: jailbreak search interaction did not advance attempts`);
    }
  }

  const budget = page.locator('.jbbudget');
  if (await budget.count() === 1) {
    if (await budget.locator('.jbbudget__dot').count() !== 80) failures.push(`${chapter.route}: attack-budget visual must expose 80 conceptual search points`);
    const range = budget.locator('input[type="range"]');
    if (await range.count() !== 1) failures.push(`${chapter.route}: attack-budget visual is missing its attempt slider`);
    else {
      await range.evaluate((node) => { node.value = '4'; node.dispatchEvent(new Event('input', { bubbles: true })); });
      await budget.locator('[data-mode="adaptive"]').click();
      await page.waitForTimeout(75);
      const n = ((await budget.locator('[data-n]').textContent()) || '').replace(/[^0-9]/g, '');
      if (n !== '1000') failures.push(`${chapter.route}: attack-budget slider did not reach N=1000`);
      if (await budget.locator('.jbbudget__dot.is-feedback').count() === 0) failures.push(`${chapter.route}: adaptive attack-budget mode exposes no feedback points`);
    }
  }

  const ladder = page.locator('.jbladder');
  if (await ladder.count() === 1) {
    const steps = ladder.locator('[data-step]');
    if (await steps.count() !== 4) failures.push(`${chapter.route}: outcome ladder must expose four distinct levels`);
    const execution = ladder.locator('[data-step="execution"]');
    if (await execution.count() !== 1) failures.push(`${chapter.route}: outcome ladder is missing execution level`);
    else {
      await execution.click();
      await page.waitForTimeout(75);
      if (await execution.getAttribute('aria-pressed') !== 'true') failures.push(`${chapter.route}: outcome ladder execution interaction did not activate`);
      const detail = ((await ladder.locator('.jbladder__detail').innerText()) || '').toLowerCase();
      if (!detail.includes('external effect') || !detail.includes('runtime')) failures.push(`${chapter.route}: outcome ladder execution detail lost canonical consequence/runtime explanation`);
    }
  }

  return selectors.reduce(async (promise, selector) => (await promise) + (await page.locator(selector).count() === 1 ? 1 : 0), Promise.resolve(0));
}

async function validatePoisoningVisuals(page, chapter) {
  const selectors = ['.memlife', '.memgov', '.memlayers', '.memprop'];
  for (const selector of selectors) {
    const matches = page.locator(selector);
    const count = await matches.count();
    if (count !== 1) {
      failures.push(`${chapter.route}: expected exactly one canonical ${selector}, found ${count}`);
      continue;
    }
    const root = matches.first();
    if (!await isVisible(root)) failures.push(`${chapter.route}: canonical ${selector} is not visible`);
    const box = await root.boundingBox();
    if (!box || box.width < 240 || box.height < 120) failures.push(`${chapter.route}: canonical ${selector} has invalid geometry ${JSON.stringify(box)}`);
  }

  const lifecycle = page.locator('.memlife');
  if (await lifecycle.count() === 1) {
    if (await lifecycle.locator('.memlife__step').count() !== 6) failures.push(`${chapter.route}: persistence lifecycle must expose six canonical stages`);
    const labels = ((await lifecycle.innerText()) || '').toLowerCase();
    for (const token of ['write', 'sleep', 'retrieve', 'influence', 'execute', 'forget']) {
      if (!labels.includes(token)) failures.push(`${chapter.route}: persistence lifecycle missing ${token}`);
    }
    const run = lifecycle.locator('[data-run]');
    if (await run.count() !== 1) failures.push(`${chapter.route}: persistence lifecycle is missing its play control`);
    else {
      await run.click();
      await page.waitForTimeout(850);
      const step = Number(await lifecycle.getAttribute('data-step'));
      if (!Number.isFinite(step) || step < 1) failures.push(`${chapter.route}: persistence lifecycle interaction did not advance`);
      const trace = ((await lifecycle.locator('[data-trace]').innerText()) || '').toLowerCase();
      if (!trace.includes('write')) failures.push(`${chapter.route}: persistence lifecycle trace did not localize the Write stage`);
    }
  }

  const governance = page.locator('.memgov');
  if (await governance.count() === 1) {
    const checks = governance.locator('[data-check]');
    if (await checks.count() !== 3) failures.push(`${chapter.route}: memory governance must expose three canonical guarantees`);
    for (let index = 0; index < await checks.count(); index += 1) await checks.nth(index).click();
    await page.waitForTimeout(75);
    if (await governance.locator('[data-check][aria-pressed="true"]').count() !== 3) failures.push(`${chapter.route}: memory governance toggles did not all activate`);
    const verdict = governance.locator('[data-verdict]');
    if (!await verdict.evaluate((node) => node.classList.contains('is-safe'))) failures.push(`${chapter.route}: memory governance did not reach bounded-persistence state`);
    if (!((await verdict.innerText()) || '').includes('Bounded persistence')) failures.push(`${chapter.route}: memory governance safe verdict was not localized`);
  }

  const layers = page.locator('.memlayers');
  if (await layers.count() === 1) {
    if (await layers.locator('[data-focus]').count() !== 3) failures.push(`${chapter.route}: runtime-vs-weights visual must expose compare/runtime/weights controls`);
    const weights = layers.locator('[data-focus="weights"]');
    if (await weights.count() !== 1) failures.push(`${chapter.route}: runtime-vs-weights visual is missing weights focus`);
    else {
      await weights.click();
      await page.waitForTimeout(75);
      if (await layers.getAttribute('data-focus') !== 'weights') failures.push(`${chapter.route}: runtime-vs-weights focus interaction did not switch to weights`);
      if (await weights.getAttribute('aria-pressed') !== 'true') failures.push(`${chapter.route}: runtime-vs-weights weights control did not become active`);
    }
  }

  const propagation = page.locator('.memprop');
  if (await propagation.count() === 1) {
    if (await propagation.locator('.memprop__node').count() !== 5) failures.push(`${chapter.route}: propagation map must expose five derived-state nodes`);
    const propagate = propagation.locator('[data-action="propagate"]');
    const revoke = propagation.locator('[data-action="revoke"]');
    if (await propagate.count() !== 1 || await revoke.count() !== 1) failures.push(`${chapter.route}: propagation map is missing propagate/revoke controls`);
    else {
      await propagate.click();
      await page.waitForTimeout(75);
      if (!await propagation.evaluate((node) => node.classList.contains('is-propagated'))) failures.push(`${chapter.route}: propagation action did not mark derived state`);
      await revoke.click();
      await page.waitForTimeout(75);
      if (!await propagation.evaluate((node) => node.classList.contains('is-revoking'))) failures.push(`${chapter.route}: revocation action did not enter partial-revocation state`);
      const note = ((await propagation.locator('[data-note]').innerText()) || '').toLowerCase();
      if (!note.includes('partial revocation') || !note.includes('does not prove forgetting')) failures.push(`${chapter.route}: propagation revocation note lost canonical semantics`);
    }
  }

  return selectors.reduce(async (promise, selector) => (await promise) + (await page.locator(selector).count() === 1 ? 1 : 0), Promise.resolve(0));
}

async function validateCanonicalCausalVisual(page, chapter) {
  const causal = page.locator('.causalrt');
  const count = await causal.count();
  if (count !== 1) {
    failures.push(`${chapter.route}: expected exactly one canonical .causalrt visual, found ${count}`);
    return count;
  }

  const root = causal.first();
  if (!await isVisible(root)) failures.push(`${chapter.route}: canonical .causalrt is not visible`);
  const box = await root.boundingBox();
  if (!box || box.width < 240 || box.height < 180) failures.push(`${chapter.route}: canonical .causalrt has invalid geometry ${JSON.stringify(box)}`);

  const steps = root.locator('.causalrt__step');
  if (await steps.count() !== 6) failures.push(`${chapter.route}: canonical .causalrt must expose six causal stages`);
  const controls = root.locator('[data-stop]');
  if (await controls.count() !== 5) failures.push(`${chapter.route}: canonical .causalrt must expose five stop conditions`);

  const authorization = root.locator('[data-stop="policy"]');
  if (await authorization.count() !== 1) failures.push(`${chapter.route}: canonical .causalrt is missing authorization control`);
  else {
    await authorization.click();
    await page.waitForTimeout(100);
    if (await authorization.getAttribute('aria-pressed') !== 'true') failures.push(`${chapter.route}: canonical .causalrt authorization control did not activate`);
    const result = ((await root.locator('[data-result]').innerText()) || '').toLowerCase();
    if (!result.includes('authorization')) failures.push(`${chapter.route}: canonical .causalrt did not localize the authorization result`);
  }
  return 1;
}

async function validateRedTeamVisuals(page, chapter) {
  const selectors = ['.threatbuild', '.uplift3', '.causalrt', '.regloop'];
  for (const selector of selectors) {
    const matches = page.locator(selector);
    const count = await matches.count();
    if (count !== 1) {
      failures.push(`${chapter.route}: expected exactly one canonical ${selector}, found ${count}`);
      continue;
    }
    const root = matches.first();
    if (!await isVisible(root)) failures.push(`${chapter.route}: canonical ${selector} is not visible`);
    const box = await root.boundingBox();
    if (!box || box.width < 240 || box.height < 120) failures.push(`${chapter.route}: canonical ${selector} has invalid geometry ${JSON.stringify(box)}`);
  }

  const threat = page.locator('.threatbuild');
  if (await threat.count() === 1) {
    const selects = threat.locator('select[data-group]');
    if (await selects.count() !== 4) failures.push(`${chapter.route}: threat-model visual must expose four experiment controls`);
    const permissions = threat.locator('select[data-group="permissions"]');
    const success = threat.locator('select[data-group="success"]');
    if (await permissions.count() !== 1 || await success.count() !== 1) {
      failures.push(`${chapter.route}: threat-model visual lost permission/success controls`);
    } else {
      await permissions.selectOption('bounded write');
      await success.selectOption('external effect');
      await page.waitForTimeout(75);
      const warning = threat.locator('[data-warning]');
      if (!await warning.evaluate((node) => node.classList.contains('is-ready'))) failures.push(`${chapter.route}: threat-model interaction did not reach end-to-end state`);
      if (!((await warning.innerText()) || '').includes('End-to-end threat model')) failures.push(`${chapter.route}: threat-model end-to-end verdict was not localized`);
      const summary = ((await threat.locator('[data-summary]').innerText()) || '').toLowerCase();
      if (!summary.includes('bounded write') || !summary.includes('external effect')) failures.push(`${chapter.route}: threat-model dynamic summary lost selected experiment semantics`);
    }
  }

  const uplift = page.locator('.uplift3');
  if (await uplift.count() === 1) {
    if (await uplift.locator('[data-focus]').count() !== 4) failures.push(`${chapter.route}: uplift visual must expose model/human/product/compare controls`);
    if (await uplift.locator('[data-card]').count() !== 3) failures.push(`${chapter.route}: uplift visual must expose three experiment cards`);
    const product = uplift.locator('[data-focus="system"]');
    if (await product.count() !== 1) failures.push(`${chapter.route}: uplift visual is missing product focus`);
    else {
      await product.click();
      await page.waitForTimeout(75);
      if (await product.getAttribute('aria-pressed') !== 'true') failures.push(`${chapter.route}: uplift product focus did not activate`);
      if (!await uplift.locator('[data-card="system"]').evaluate((node) => node.classList.contains('is-focus'))) failures.push(`${chapter.route}: uplift product card did not become focused`);
      const take = ((await uplift.locator('[data-take]').innerText()) || '').toLowerCase();
      if (!take.includes('product') || !take.includes('real effect')) failures.push(`${chapter.route}: uplift product takeaway lost canonical execution semantics`);
    }
  }

  await validateCanonicalCausalVisual(page, chapter);

  const regression = page.locator('.regloop');
  if (await regression.count() === 1) {
    if (await regression.locator('.regloop__step').count() !== 5) failures.push(`${chapter.route}: regression visual must expose five canonical stages`);
    const run = regression.locator('[data-run]');
    if (await run.count() !== 1) failures.push(`${chapter.route}: regression visual is missing its run control`);
    else {
      await run.click();
      await page.waitForTimeout(750);
      if (await regression.locator('.regloop__step.is-active').count() !== 1) failures.push(`${chapter.route}: regression-cycle interaction did not activate a stage`);
      const copy = ((await regression.locator('[data-copy]').innerText()) || '').toLowerCase();
      if (!copy.includes('finding') || !copy.includes('trajectory')) failures.push(`${chapter.route}: regression-cycle runtime copy was not localized`);
    }
  }

  return selectors.reduce(async (promise, selector) => (await promise) + (await page.locator(selector).count() === 1 ? 1 : 0), Promise.resolve(0));
}

async function validateLegacySecurityVisuals(page, chapter) {
  const demoValues = await page.locator('[data-demo^="sec-"]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-demo')));
  if (demoValues.length !== chapter.demos) failures.push(`${chapter.route}: expected ${chapter.demos} legacy teaching visuals, found ${demoValues.length}`);
  if (new Set(demoValues).size !== demoValues.length) failures.push(`${chapter.route}: duplicate data-demo visual identifiers`);
  for (const demo of demoValues) if (!demo?.startsWith(chapter.prefix)) failures.push(`${chapter.route}: unexpected visual identifier ${JSON.stringify(demo)}`);

  const details = page.locator('[data-demo^="sec-"] details');
  if (await details.count() === 0) failures.push(`${chapter.route}: visuals expose no interactive disclosure`);
  else {
    const candidate = details.first();
    const before = await candidate.getAttribute('open');
    await candidate.locator('summary').click();
    const after = await candidate.getAttribute('open');
    if (before === after) failures.push(`${chapter.route}: details interaction did not toggle`);
  }
  return demoValues.length;
}

try {
  for (const chapter of chapters) {
    for (const viewport of [
      { name: 'desktop', width: 1440, height: 1000 },
      { name: 'mobile', width: 390, height: 844 },
    ]) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      const runtimeErrors = [];
      page.on('pageerror', (error) => runtimeErrors.push(`pageerror: ${error.message}`));
      const response = await page.goto(`${base}${chapter.route}`, { waitUntil: 'networkidle' });
      if (!response?.ok()) failures.push(`${chapter.route}: HTTP ${response?.status() ?? 'no response'}`);

      const body = await page.locator('body').innerText();
      if (!body.includes(chapter.title)) failures.push(`${chapter.route}: missing English chapter title`);
      for (const concept of chapter.concepts) if (!body.toLowerCase().includes(concept.toLowerCase())) failures.push(`${chapter.route}: missing core concept ${concept}`);
      for (const token of forbidden) if (body.includes(token)) failures.push(`${chapter.route}: Spanish leakage ${JSON.stringify(token)}`);
      if (['02-jailbreaks', '03-envenenamiento', '04-red-teaming'].includes(chapter.slug) && body.includes('Frequently asked questions')) failures.push(`${chapter.route}: English-only FAQ section drifted back into the canonical article`);

      const visualCount = chapter.visualSelectors
        ? await validatePromptInjectionVisuals(page, chapter)
        : chapter.canonicalJailbreaks
          ? await validateJailbreakVisuals(page, chapter)
          : chapter.canonicalPoisoning
            ? await validatePoisoningVisuals(page, chapter)
            : chapter.canonicalRedTeam
              ? await validateRedTeamVisuals(page, chapter)
              : await validateLegacySecurityVisuals(page, chapter);
      if (visualCount !== chapter.demos) failures.push(`${chapter.route}: expected ${chapter.demos} teaching visuals, found ${visualCount}`);
      if (viewport.name === 'desktop') totalVisuals += visualCount;

      const videos = page.locator('video[data-s5-inline-video-player]');
      const videoCount = await videos.count();
      if (videoCount !== 1) failures.push(`${chapter.route}: expected one native-English video, found ${videoCount}`);
      else {
        const video = videos.first();
        const sourceUrl = new URL((await video.locator('source').first().getAttribute('src')) || '', page.url());
        const posterUrl = new URL((await video.getAttribute('poster')) || '', page.url());
        const root = '/en/series/seguridad-ia/';
        if (sourceUrl.pathname !== `${root}${chapter.slug}.mp4`) failures.push(`${chapter.route}: video escaped native English media: ${sourceUrl.pathname}`);
        if (posterUrl.pathname !== `${root}${chapter.slug}.jpg`) failures.push(`${chapter.route}: poster escaped native English media: ${posterUrl.pathname}`);
      }
      if (await page.locator('audio').count()) failures.push(`${chapter.route}: unexpected inherited Spanish audio`);

      const [clientWidth, scrollWidth] = await page.evaluate(() => [document.documentElement.clientWidth, document.documentElement.scrollWidth]);
      if (scrollWidth > clientWidth + 2) failures.push(`${chapter.route}: ${viewport.name} horizontal overflow ${scrollWidth - clientWidth}px`);
      for (const runtimeError of runtimeErrors) failures.push(`${chapter.route}: ${runtimeError}`);

      if (viewport.name === 'desktop') await page.screenshot({ path: path.join(outDir, chapter.screenshot), fullPage: true, animations: 'disabled' });
      await page.close();
    }
  }
} finally {
  await browser.close();
}

if (totalVisuals !== 18) failures.push(`AI Security series: expected 18 native English visuals, found ${totalVisuals}`);
if (failures.length) {
  for (const failure of [...new Set(failures)]) console.error(failure);
  process.exit(1);
}
console.log('Complete English AI Security QA passed: Chapters 1–5, 18 unique defensive visuals, canonical Chapter 2 jailbreak search/budget/outcome interactions, canonical Chapter 3 persistence/governance/runtime-vs-weights/propagation interactions, canonical Chapter 4 threat-model/uplift/causal-chain/regression interactions, exact native-English video/poster pairs, desktop/mobile clean.');
