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
    roots: ['.ctxmix', '.ragtrace', '.defsim'],
    screenshot: 'english-security-01-prompt-injection.png',
  },
  {
    slug: '02-jailbreaks',
    route: '/en/series/seguridad-ia/02-jailbreaks/',
    title: 'Chapter 2 — Jailbreaks',
    concepts: ['GCG', 'attack budget', 'N=1', 'Tool reachability', 'Constitutional Classifiers'],
    roots: ['.jbsearch', '.jbbudget', '.jbladder'],
    screenshot: 'english-security-02-jailbreaks.png',
  },
  {
    slug: '03-envenenamiento',
    route: '/en/series/seguridad-ia/03-envenenamiento/',
    title: 'Chapter 3 — Poisoning',
    concepts: ['60–89%', '84.2%', '50.3%', 'Sleeper Agents', 'Write → Retrieve → Execute → Forget'],
    roots: ['.memlife', '.memgov', '.memlayers', '.memprop'],
    screenshot: 'english-security-03-poisoning.png',
  },
  {
    slug: '04-red-teaming',
    route: '/en/series/seguridad-ia/04-red-teaming/',
    title: 'Chapter 4 — Red teaming',
    concepts: ['trajectory', 'Attack validity', 'Grader validity', 'Injection reached context', 'Recovery failed', 'release gate'],
    roots: ['.threatbuild', '.uplift3', '.causalrt', '.regloop'],
    screenshot: 'english-security-04-red-teaming.png',
  },
  {
    slug: '05-controles-produccion',
    route: '/en/series/seguridad-ia/05-controles-produccion/',
    title: 'Chapter 5 — Production controls',
    concepts: ['MCP', 'kill path', 'Blocking the response while allowing the action is not a mitigation.', 'release gate'],
    roots: ['.proddef', '.mcpbound', '.killpath', '.releasegate'],
    screenshot: 'english-security-05-production-controls.png',
  },
];

const forbidden = ['Capítulo ', 'Preguntas frecuentes', 'Prerrequisitos', 'Siguiente capítulo', 'Fuentes base'];
const failures = [];
const browser = await chromium.launch({ headless: true });
let totalVisuals = 0;
const fail = (chapter, message) => failures.push(`${chapter.route}: ${message}`);

const visible = async (locator) => locator.evaluate((node) => {
  const style = getComputedStyle(node);
  return style.display !== 'none' && style.visibility !== 'hidden' && node.getClientRects().length > 0;
});

async function assertRoots(page, chapter) {
  for (const selector of chapter.roots) {
    const matches = page.locator(selector);
    const count = await matches.count();
    if (count !== 1) {
      fail(chapter, `expected exactly one canonical ${selector}, found ${count}`);
      continue;
    }
    const root = matches.first();
    if (!await visible(root)) fail(chapter, `canonical ${selector} is not visible`);
    const box = await root.boundingBox();
    if (!box || box.width < 240 || box.height < 80) fail(chapter, `canonical ${selector} has invalid geometry ${JSON.stringify(box)}`);
  }
  return chapter.roots.reduce(async (sum, selector) => (await sum) + (await page.locator(selector).count() === 1 ? 1 : 0), Promise.resolve(0));
}

async function validatePromptInjection(page, chapter) {
  for (const selector of chapter.roots) {
    const root = page.locator(selector);
    if (await root.count() !== 1) continue;
    const buttons = root.locator('button:visible:not([disabled])');
    if (await buttons.count() === 0) fail(chapter, `${selector} exposes no interactive control`);
    for (let i = 0; i < await buttons.count(); i += 1) {
      const button = buttons.nth(i);
      const label = ((await button.textContent()) || '').trim() || await button.getAttribute('aria-label');
      if (!label) fail(chapter, `${selector} contains an unlabelled control`);
      await button.click();
      await page.waitForTimeout(60);
    }
  }
}

async function validateJailbreaks(page, chapter) {
  const search = page.locator('.jbsearch');
  if (await search.count() === 1) {
    if (await search.locator('.jbsearch__point').count() !== 12) fail(chapter, 'jailbreak search must expose 12 canonical candidate points');
    const step = search.locator('[data-step]');
    const reset = search.locator('[data-reset]');
    if (await step.count() !== 1 || await reset.count() !== 1) fail(chapter, 'jailbreak search must expose step and reset controls');
    else {
      await step.click();
      await step.click();
      await page.waitForTimeout(75);
      if (((await search.locator('[data-count]').textContent()) || '').trim() !== '2') fail(chapter, 'jailbreak search step control did not advance to attempt 2');
      if (await search.locator('.jbsearch__point.is-seen').count() !== 2) fail(chapter, 'jailbreak search did not expose two observed points after two steps');
      if (!((await search.locator('[data-path]').getAttribute('points')) || '').trim()) fail(chapter, 'jailbreak search trajectory remained empty after stepping');
      await reset.click();
      if (((await search.locator('[data-count]').textContent()) || '').trim() !== '0') fail(chapter, 'jailbreak search reset did not restore attempt 0');
    }
  }

  const budget = page.locator('.jbbudget');
  if (await budget.count() === 1) {
    if (await budget.locator('.jbbudget__candidate').count() !== 12) fail(chapter, 'attack-budget visual must expose 12 canonical candidate points');
    const range = budget.locator('input[type="range"]');
    const fixed = budget.locator('[data-mode="fixed"]');
    const adaptive = budget.locator('[data-mode="adaptive"]');
    if (await range.count() !== 1 || await fixed.count() !== 1 || await adaptive.count() !== 1) fail(chapter, 'attack-budget visual lost range/fixed/adaptive controls');
    else {
      await range.evaluate((node) => { node.value = '4'; node.dispatchEvent(new Event('input', { bubbles: true })); });
      await adaptive.click();
      await page.waitForTimeout(75);
      const n = ((await budget.locator('[data-n]').textContent()) || '').replace(/[^0-9]/g, '');
      if (n !== '1000') fail(chapter, 'attack-budget slider did not reach N=1000');
      if (await budget.getAttribute('data-mode') !== 'adaptive') fail(chapter, 'attack-budget adaptive mode did not activate');
      if (await budget.locator('.jbbudget__candidate.is-visible').count() !== 12) fail(chapter, 'N=1000 adaptive mode must expose all 12 conceptual points');
      if (!((await budget.locator('[data-adaptive-path]').getAttribute('points')) || '').trim()) fail(chapter, 'adaptive attack-budget path remained empty');
    }
  }

  const ladder = page.locator('.jbladder');
  if (await ladder.count() === 1) {
    const toggles = ladder.locator('[data-toggle]');
    if (await toggles.count() !== 3) fail(chapter, 'outcome ladder must expose three product-boundary toggles');
    if (await ladder.locator('[data-node]').count() !== 5) fail(chapter, 'outcome ladder must expose five causal nodes');
    for (const key of ['actionable', 'write', 'auth']) {
      const button = ladder.locator(`[data-toggle="${key}"]`);
      if (await button.count() !== 1) fail(chapter, `outcome ladder missing ${key} toggle`);
      else await button.click();
    }
    await page.waitForTimeout(75);
    if (await ladder.locator('[data-toggle][aria-pressed="true"]').count() !== 3) fail(chapter, 'outcome ladder toggles did not all activate');
    if (((await ladder.locator('[data-badge]').textContent()) || '').trim() !== 'EXTERNAL_EFFECT') fail(chapter, 'outcome ladder did not reach EXTERNAL_EFFECT');
    const effect = ladder.locator('[data-node="effect"]');
    if (await effect.count() !== 1 || await effect.getAttribute('data-reached') !== 'true' || await effect.getAttribute('data-terminal') !== 'true') fail(chapter, 'outcome ladder external-effect node was not reached as the terminal state');
  }
}

async function validatePoisoning(page, chapter) {
  const lifecycle = page.locator('.memlife');
  if (await lifecycle.count() === 1) {
    for (const action of ['write', 'retrieve', 'revoke', 'invalidate', 'reset']) {
      if (await lifecycle.locator(`[data-action="${action}"]`).count() !== 1) fail(chapter, `persistence lifecycle missing ${action} action`);
    }
    await lifecycle.locator('[data-action="write"]').click();
    if (((await lifecycle.locator('[data-derived]').textContent()) || '').trim() !== '2') fail(chapter, 'persistence write did not create two derived representations');
    await lifecycle.locator('[data-action="retrieve"]').click();
    await page.waitForTimeout(60);
    if (!await lifecycle.locator('[data-badge]').evaluate((node) => node.classList.contains('is-danger'))) fail(chapter, 'future retrieval did not enter active-influence danger state');
    if (await lifecycle.locator('[data-token="decision"]').getAttribute('hidden') !== null) fail(chapter, 'future retrieval did not expose the decision path token');
    await lifecycle.locator('[data-action="revoke"]').click();
    if (await lifecycle.locator('[data-tombstone]').getAttribute('hidden') !== null) fail(chapter, 'origin revocation did not expose tombstone state');
    await lifecycle.locator('[data-action="invalidate"]').click();
    if (((await lifecycle.locator('[data-derived]').textContent()) || '').trim() !== '0') fail(chapter, 'derived invalidation did not clear derived representations');
    if (!await lifecycle.locator('[data-badge]').evaluate((node) => node.classList.contains('is-clean'))) fail(chapter, 'full invalidation did not reach clean revocation state');
  }

  const governance = page.locator('.memgov');
  if (await governance.count() === 1) {
    const checks = governance.locator('[data-check]');
    if (await checks.count() !== 3) fail(chapter, 'memory governance must expose three canonical guarantees');
    for (let i = 0; i < await checks.count(); i += 1) await checks.nth(i).click();
    await page.waitForTimeout(60);
    if (await governance.locator('[data-check][aria-pressed="true"]').count() !== 3) fail(chapter, 'memory governance checks did not all activate');
    if (!await governance.locator('[data-verdict]').evaluate((node) => node.classList.contains('is-safe'))) fail(chapter, 'memory governance did not reach bounded safe state');
  }

  const layers = page.locator('.memlayers');
  if (await layers.count() === 1) {
    if (await layers.locator('[data-scenario]').count() !== 2) fail(chapter, 'runtime-vs-weights visual must expose runtime and weights scenarios');
    const clearRuntime = layers.locator('[data-intervention="clear-runtime"]');
    const swapModel = layers.locator('[data-intervention="swap-model"]');
    if (await clearRuntime.count() !== 1 || await swapModel.count() !== 1) fail(chapter, 'runtime-vs-weights visual lost diagnostic interventions');
    else {
      await clearRuntime.click();
      await page.waitForTimeout(60);
      if (await layers.getAttribute('data-runtime') !== 'clean' || await layers.getAttribute('data-result') !== 'blocked') fail(chapter, 'clearing runtime did not cut the runtime causal path');
      const weights = layers.locator('[data-scenario="weights"]');
      await weights.click();
      await swapModel.click();
      await page.waitForTimeout(60);
      if (await layers.getAttribute('data-scenario') !== 'weights' || await layers.getAttribute('data-weights') !== 'clean' || await layers.getAttribute('data-result') !== 'blocked') fail(chapter, 'clean-model intervention did not cut the weights causal path');
    }
  }

  const propagation = page.locator('.memprop');
  if (await propagation.count() === 1) {
    if (await propagation.locator('[data-derived]').count() !== 4) fail(chapter, 'propagation map must expose four derived-state artifacts');
    for (const action of ['propagate', 'delete-origin', 'invalidate', 'reset']) {
      if (await propagation.locator(`[data-action="${action}"]`).count() !== 1) fail(chapter, `propagation map missing ${action} action`);
    }
    await propagation.locator('[data-action="propagate"]').click();
    if (await propagation.getAttribute('data-state') !== 'propagated') fail(chapter, 'propagation action did not enter propagated state');
    await propagation.locator('[data-action="delete-origin"]').click();
    if (await propagation.getAttribute('data-state') !== 'origin-deleted') fail(chapter, 'origin deletion did not expose residual-derived state');
    await propagation.locator('[data-action="invalidate"]').click();
    if (await propagation.getAttribute('data-state') !== 'invalidated') fail(chapter, 'lineage invalidation did not enter invalidated state');
  }
}

async function validateRedTeam(page, chapter) {
  const threat = page.locator('.threatbuild');
  if (await threat.count() === 1) {
    const selects = threat.locator('select[data-group]');
    if (await selects.count() !== 4) fail(chapter, 'threat-model visual must expose four experiment controls');
    const permissions = threat.locator('select[data-group="permissions"]');
    const success = threat.locator('select[data-group="success"]');
    if (await permissions.count() === 1 && await success.count() === 1) {
      await permissions.selectOption('bounded write');
      await success.selectOption('external effect');
      await page.waitForTimeout(60);
      if (!await threat.locator('[data-warning]').evaluate((node) => node.classList.contains('is-ready'))) fail(chapter, 'threat-model interaction did not reach end-to-end state');
    }
  }

  const uplift = page.locator('.uplift3');
  if (await uplift.count() === 1) {
    if (await uplift.locator('[data-focus]').count() !== 4) fail(chapter, 'uplift visual must expose four focus controls');
    if (await uplift.locator('[data-card]').count() !== 3) fail(chapter, 'uplift visual must expose three experiment cards');
    const product = uplift.locator('[data-focus="system"]');
    if (await product.count() === 1) {
      await product.click();
      await page.waitForTimeout(60);
      if (await product.getAttribute('aria-pressed') !== 'true' || !await uplift.locator('[data-card="system"]').evaluate((node) => node.classList.contains('is-focus'))) fail(chapter, 'uplift product focus did not activate');
    }
  }

  const causal = page.locator('.causalrt');
  if (await causal.count() === 1) {
    if (await causal.locator('.causalrt__step').count() !== 6) fail(chapter, 'causal chain must expose six stages');
    if (await causal.locator('[data-stop]').count() !== 5) fail(chapter, 'causal chain must expose five stop conditions');
    const authorization = causal.locator('[data-stop="policy"]');
    if (await authorization.count() === 1) {
      await authorization.click();
      await page.waitForTimeout(60);
      if (await authorization.getAttribute('aria-pressed') !== 'true') fail(chapter, 'causal-chain authorization stop did not activate');
      if (!((await causal.locator('[data-result]').innerText()) || '').toLowerCase().includes('authorization')) fail(chapter, 'causal chain did not localize the authorization stop result');
    }
  }

  const regression = page.locator('.regloop');
  if (await regression.count() === 1) {
    if (await regression.locator('[data-toggle]').count() !== 3) fail(chapter, 'regression gate must expose fixture/blocked/legit controls');
    if (await regression.locator('[data-node]').count() !== 7) fail(chapter, 'regression gate must expose the seven canonical path/outcome nodes');
    const outcome = regression.locator('[data-outcome]');
    if (await outcome.getAttribute('data-release') !== 'HOLD') fail(chapter, 'regression gate must initially HOLD while attack persists');
    const blocked = regression.locator('[data-toggle="blocked"]');
    const legit = regression.locator('[data-toggle="legit"]');
    await blocked.click();
    await page.waitForTimeout(60);
    if (await outcome.getAttribute('data-release') !== 'DEPLOY' || ((await regression.locator('[data-badge]').textContent()) || '').trim() !== 'DEPLOY') fail(chapter, 'regression gate did not reach DEPLOY after attack path was cut with legitimate behavior preserved');
    await legit.click();
    await page.waitForTimeout(60);
    if (await outcome.getAttribute('data-release') !== 'HOLD') fail(chapter, 'regression gate did not return to HOLD when legitimate behavior regressed');
  }
}

async function validateProductionControls(page, chapter) {
  const defense = page.locator('.proddef');
  if (await defense.count() === 1) {
    if (await defense.locator('.proddef__cell').count() !== 9) fail(chapter, 'defense-depth matrix must expose nine permission cells');
    const toggle = defense.locator('[data-toggle]');
    if (await toggle.count() !== 1) fail(chapter, 'defense-depth visual is missing privilege toggle');
    else {
      await toggle.click();
      await page.waitForTimeout(60);
      if (!await defense.evaluate((node) => node.classList.contains('is-risk'))) fail(chapter, 'privilege escalation did not enter risk state');
      if (((await defense.locator('.proddef__cell').nth(2).textContent()) || '').trim() !== 'deploy') fail(chapter, 'privilege escalation did not expose production deploy authority');
    }
  }

  const mcp = page.locator('.mcpbound');
  if (await mcp.count() === 1) {
    const controls = mcp.locator('[data-control]');
    if (await controls.count() !== 3) fail(chapter, 'MCP boundary must expose three canonical controls');
    for (let i = 0; i < await controls.count(); i += 1) await controls.nth(i).click();
    await page.waitForTimeout(60);
    if (await mcp.locator('[data-control][aria-pressed="true"]').count() !== 3) fail(chapter, 'MCP boundary controls did not all activate');
    if (!await mcp.locator('[data-result]').evaluate((node) => node.classList.contains('is-safe'))) fail(chapter, 'MCP boundary did not reach explicit safe-boundary state');
  }

  const kill = page.locator('.killpath');
  if (await kill.count() === 1) {
    if (await kill.locator('.killpath__stage').count() !== 5) fail(chapter, 'kill path must expose five execution stages');
    if (await kill.locator('[data-kill]').count() !== 4) fail(chapter, 'kill path must expose four external stop controls');
    const start = kill.locator('[data-start]');
    const revoke = kill.locator('[data-kill="credential"]');
    if (await start.count() === 1 && await revoke.count() === 1) {
      await start.click();
      await page.waitForTimeout(60);
      if (await revoke.isDisabled()) fail(chapter, 'kill-path external controls did not enable after start');
      await revoke.click();
      await page.waitForTimeout(60);
      if (!await kill.locator('[data-result]').evaluate((node) => node.classList.contains('is-killed'))) fail(chapter, 'credential revocation did not terminate the kill path');
    }
  }

  const release = page.locator('.releasegate');
  if (await release.count() === 1) {
    const modes = release.locator('[data-mode]');
    const names = await modes.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-mode')));
    const canonical = ['pass', 'authority', 'state', 'recovery'];
    if (names.length !== 4 || new Set(names).size !== 4 || canonical.some((name) => !names.includes(name))) fail(chapter, 'release gate must expose pass/authority/state/recovery scenarios');
    const deploy = release.locator('[data-output="deploy"]');
    const hold = release.locator('[data-output="hold"]');
    if (await deploy.count() !== 1 || await hold.count() !== 1) fail(chapter, 'release gate must expose explicit DEPLOY and HOLD output paths');
    else {
      const assertDecision = async (badge, decision, deployExpected) => {
        if (((await release.locator('[data-badge]').textContent()) || '').trim() !== badge) fail(chapter, `release gate expected ${badge} badge`);
        if (((await release.locator('[data-decision]').textContent()) || '').trim() !== decision) fail(chapter, `release gate expected ${decision} decision`);
        const deployHidden = await deploy.getAttribute('hidden') !== null;
        const holdHidden = await hold.getAttribute('hidden') !== null;
        if (deployExpected && (deployHidden || !holdHidden)) fail(chapter, 'PASS state must expose DEPLOY and hide HOLD');
        if (!deployExpected && (!deployHidden || holdHidden)) fail(chapter, 'blocked state must hide DEPLOY and expose HOLD');
      };
      await assertDecision('PASS', 'DEPLOY', true);
      if (!((await release.locator('[data-title]').innerText()) || '').toLowerCase().includes('three evidence streams')) fail(chapter, 'release-gate PASS title lost canonical evidence semantics');
      if (!((await release.locator('[data-artifact]').innerText()) || '').toLowerCase().includes('3/3 current')) fail(chapter, 'release-gate PASS artifact lost 3/3-current evidence');
      for (const mode of ['authority', 'state', 'recovery']) {
        const button = release.locator(`[data-mode="${mode}"]`);
        await button.click();
        await page.waitForTimeout(60);
        if (await button.getAttribute('aria-pressed') !== 'true') fail(chapter, `release-gate ${mode} scenario did not activate`);
        await assertDecision('BLOCKED', 'HOLD', false);
        const artifact = ((await release.locator('[data-artifact]').innerText()) || '').trim();
        const failure = ((await release.locator('[data-failure]').innerText()) || '').trim();
        if (!artifact || !failure || failure === 'None') fail(chapter, `release-gate ${mode} scenario lost reproducible artifact/failure evidence`);
      }
      await release.locator('[data-mode="pass"]').click();
      await page.waitForTimeout(60);
      await assertDecision('PASS', 'DEPLOY', true);
    }
  }
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
      if (!response?.ok()) fail(chapter, `HTTP ${response?.status() ?? 'no response'}`);

      const body = await page.locator('body').innerText();
      if (!body.includes(chapter.title)) fail(chapter, 'missing English chapter title');
      for (const concept of chapter.concepts) if (!body.toLowerCase().includes(concept.toLowerCase())) fail(chapter, `missing core concept ${concept}`);
      for (const token of forbidden) if (body.includes(token)) fail(chapter, `Spanish leakage ${JSON.stringify(token)}`);
      if (['02-jailbreaks', '03-envenenamiento', '04-red-teaming', '05-controles-produccion'].includes(chapter.slug) && body.includes('Frequently asked questions')) fail(chapter, 'English-only FAQ section drifted back into the canonical article');

      const visualCount = await assertRoots(page, chapter);
      if (visualCount !== chapter.roots.length) fail(chapter, `expected ${chapter.roots.length} teaching visuals, found ${visualCount}`);
      if (viewport.name === 'desktop') totalVisuals += visualCount;

      if (chapter.slug === '01-prompt-injection') await validatePromptInjection(page, chapter);
      if (chapter.slug === '02-jailbreaks') await validateJailbreaks(page, chapter);
      if (chapter.slug === '03-envenenamiento') await validatePoisoning(page, chapter);
      if (chapter.slug === '04-red-teaming') await validateRedTeam(page, chapter);
      if (chapter.slug === '05-controles-produccion') await validateProductionControls(page, chapter);

      const videos = page.locator('video[data-s5-inline-video-player]');
      const videoCount = await videos.count();
      if (videoCount !== 1) fail(chapter, `expected one native-English video, found ${videoCount}`);
      else {
        const video = videos.first();
        const sourceUrl = new URL((await video.locator('source').first().getAttribute('src')) || '', page.url());
        const posterUrl = new URL((await video.getAttribute('poster')) || '', page.url());
        const root = '/en/series/seguridad-ia/';
        if (sourceUrl.pathname !== `${root}${chapter.slug}.mp4`) fail(chapter, `video escaped native English media: ${sourceUrl.pathname}`);
        if (posterUrl.pathname !== `${root}${chapter.slug}.jpg`) fail(chapter, `poster escaped native English media: ${posterUrl.pathname}`);
      }
      if (await page.locator('audio').count()) fail(chapter, 'unexpected inherited Spanish audio');

      const [clientWidth, scrollWidth] = await page.evaluate(() => [document.documentElement.clientWidth, document.documentElement.scrollWidth]);
      if (scrollWidth > clientWidth + 2) fail(chapter, `${viewport.name} horizontal overflow ${scrollWidth - clientWidth}px`);
      for (const runtimeError of runtimeErrors) fail(chapter, runtimeError);

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
console.log('Complete English AI Security QA passed: Chapters 1–5, 18 canonical defensive visuals, current jailbreak/persistence/red-team/production-control interactions, exact native-English video/poster pairs, desktop/mobile clean.');