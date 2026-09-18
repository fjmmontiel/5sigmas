#!/usr/bin/env node
/**
 * Focused real-browser gate for Security02-05.
 *
 * This gate executes the current relationship-first teaching mechanisms in
 * ES/EN at desktop/mobile and normal/reduced motion, using keyboard on desktop
 * and real touch on mobile. It records screenshots and machine-readable state
 * evidence. It proves browser interaction/accessibility/runtime behavior only;
 * PIXEL_REVIEW and PEDAGOGY_REVIEW remain manual inspections of these exact
 * screenshots and must never be inferred from this script alone.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const out = path.resolve('artifacts/security-requalification/security-02-05-browser');
const shots = path.join(out, 'screenshots');
await fs.mkdir(shots, { recursive: true });

const routes = [
  { chapter: '02', locale: 'es', route: '/series/seguridad-ia/02-jailbreaks/', target: '.jbladder' },
  { chapter: '02', locale: 'en', route: '/en/series/seguridad-ia/02-jailbreaks/', target: '.jbladder' },
  { chapter: '03', locale: 'es', route: '/series/seguridad-ia/03-envenenamiento/', target: '.memlayers,.memprop' },
  { chapter: '03', locale: 'en', route: '/en/series/seguridad-ia/03-envenenamiento/', target: '.memlayers,.memprop' },
  { chapter: '04', locale: 'es', route: '/series/seguridad-ia/04-red-teaming/', target: '.regloop' },
  { chapter: '04', locale: 'en', route: '/en/series/seguridad-ia/04-red-teaming/', target: '.regloop' },
  { chapter: '05', locale: 'es', route: '/series/seguridad-ia/05-controles-produccion/', target: '.releasegate' },
  { chapter: '05', locale: 'en', route: '/en/series/seguridad-ia/05-controles-produccion/', target: '.releasegate' },
];
const contexts = [
  { name: 'desktop-normal', width: 1440, height: 1000, mobile: false, reducedMotion: 'no-preference' },
  { name: 'desktop-reduced', width: 1440, height: 1000, mobile: false, reducedMotion: 'reduce' },
  { name: 'mobile-normal', width: 390, height: 844, mobile: true, reducedMotion: 'no-preference' },
  { name: 'mobile-reduced', width: 390, height: 844, mobile: true, reducedMotion: 'reduce' },
];

const failures = [];
const records = [];
const check = (ok, message, detail = null) => { if (!ok) failures.push({ message, detail }); };

function safeName(value) { return value.replace(/[^a-zA-Z0-9_-]+/g, '-'); }
async function activate(locator, mobile, keyboard = false) {
  await locator.scrollIntoViewIfNeeded();
  if (keyboard) {
    await locator.focus();
    await locator.press('Enter');
  } else if (mobile) {
    await locator.tap({ timeout: 5000 });
  } else {
    await locator.click({ timeout: 5000 });
  }
}
async function stateOf(locator) {
  return locator.evaluate(node => ({
    text: (node.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 500),
    ariaPressed: node.getAttribute('aria-pressed'),
    dataset: { ...node.dataset },
    hidden: Boolean(node.hidden),
    className: typeof node.className === 'string' ? node.className : node.getAttribute('class'),
  }));
}
async function focusEvidence(locator) {
  await locator.focus();
  return locator.evaluate(node => {
    const style = getComputedStyle(node);
    return {
      isActive: document.activeElement === node,
      focusVisible: node.matches(':focus-visible'),
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      boxShadow: style.boxShadow,
    };
  });
}
async function screenshot(locator, name) {
  await locator.scrollIntoViewIfNeeded();
  const file = path.join(shots, `${safeName(name)}.png`);
  await locator.screenshot({ path: file });
  return path.relative(process.cwd(), file);
}

async function inspect02(page, ctx, rec) {
  const root = page.locator('.jbladder').first();
  check(await root.count() === 1, `${ctx}: Security02 outcome model missing`);
  if (!await root.count()) return;
  rec.screenshots.push(await screenshot(root, `${ctx}-outcome-start`));
  const toggles = {
    actionable: root.locator('[data-toggle="actionable"]'),
    write: root.locator('[data-toggle="write"]'),
    auth: root.locator('[data-toggle="auth"]'),
  };
  const focus = await focusEvidence(toggles.actionable);
  rec.focus.push({ root: 'jbladder', ...focus });
  check(focus.isActive && (focus.focusVisible || focus.outlineStyle !== 'none' || focus.boxShadow !== 'none'), `${ctx}: Security02 first control lacks visible keyboard focus`, focus);
  const badge = root.locator('[data-badge]');
  const route = root.locator('[data-route]');
  const initialBadge = (await badge.textContent() || '').trim();
  const initialPoints = await route.getAttribute('points');
  check(initialBadge === 'TEXT_ONLY', `${ctx}: Security02 initial terminal is not TEXT_ONLY`, { initialBadge });
  await activate(toggles.actionable, rec.mobile, !rec.mobile);
  check(await toggles.actionable.getAttribute('aria-pressed') === 'true', `${ctx}: Security02 actionable toggle did not activate`);
  check((await badge.textContent() || '').trim() === 'READ_ONLY_BOUNDARY', `${ctx}: Security02 did not reach read-only boundary`);
  await activate(toggles.write, rec.mobile);
  check((await badge.textContent() || '').trim() === 'AUTH_BLOCKED', `${ctx}: Security02 did not reach authorization boundary`);
  await activate(toggles.auth, rec.mobile);
  check((await badge.textContent() || '').trim() === 'EXTERNAL_EFFECT', `${ctx}: Security02 complete trajectory did not reach external effect`);
  const finalPoints = await route.getAttribute('points');
  check(Boolean(finalPoints && finalPoints !== initialPoints && finalPoints.trim().split(/\s+/).length >= 5), `${ctx}: Security02 route geometry did not materially extend`, { initialPoints, finalPoints });
  rec.states.push({ mechanism: 'outcome-reachability', initialBadge, initialPoints, finalBadge: (await badge.textContent() || '').trim(), finalPoints });
  rec.screenshots.push(await screenshot(root, `${ctx}-outcome-external-effect`));
}

async function inspect03(page, ctx, rec) {
  const runtime = page.locator('.memlayers').first();
  check(await runtime.count() === 1, `${ctx}: Security03 runtime-vs-weights model missing`);
  if (await runtime.count()) {
    rec.screenshots.push(await screenshot(runtime, `${ctx}-runtime-start`));
    const runtimeScenario = runtime.locator('[data-scenario="runtime"]');
    const weightsScenario = runtime.locator('[data-scenario="weights"]');
    const focus = await focusEvidence(runtimeScenario);
    rec.focus.push({ root: 'memlayers', ...focus });
    check(focus.isActive && (focus.focusVisible || focus.outlineStyle !== 'none' || focus.boxShadow !== 'none'), `${ctx}: Security03 runtime scenario lacks visible focus`, focus);
    await activate(runtime.locator('[data-intervention="clear-runtime"]'), rec.mobile, !rec.mobile);
    check(await runtime.getAttribute('data-result') === 'blocked', `${ctx}: clearing runtime did not cut runtime causal path`, await stateOf(runtime));
    await activate(weightsScenario, rec.mobile);
    check(await runtime.getAttribute('data-result') === 'risk', `${ctx}: weights scenario did not restore sleeper causal path`, await stateOf(runtime));
    await activate(runtime.locator('[data-intervention="swap-model"]'), rec.mobile);
    check(await runtime.getAttribute('data-result') === 'blocked', `${ctx}: swapping model did not cut weights causal path`, await stateOf(runtime));
    rec.states.push({ mechanism: 'runtime-vs-weights', final: await stateOf(runtime) });
    rec.screenshots.push(await screenshot(runtime, `${ctx}-runtime-path-cut`));
  }

  const prop = page.locator('.memprop').first();
  check(await prop.count() === 1, `${ctx}: Security03 propagation model missing`);
  if (await prop.count()) {
    rec.screenshots.push(await screenshot(prop, `${ctx}-propagation-start`));
    const propagate = prop.locator('[data-action="propagate"]');
    const focus = await focusEvidence(propagate);
    rec.focus.push({ root: 'memprop', ...focus });
    check(focus.isActive && (focus.focusVisible || focus.outlineStyle !== 'none' || focus.boxShadow !== 'none'), `${ctx}: Security03 propagation control lacks visible focus`, focus);
    await activate(propagate, rec.mobile, !rec.mobile);
    check(await prop.getAttribute('data-state') === 'propagated', `${ctx}: Security03 propagation state did not become propagated`);
    await activate(prop.locator('[data-action="delete-origin"]'), rec.mobile);
    check(await prop.getAttribute('data-state') === 'origin-deleted', `${ctx}: deleting Security03 origin did not expose residual derivative state`);
    check((await prop.locator('[data-result]').textContent() || '').includes(rec.locale === 'es' ? 'DERIVADO' : 'DERIVATIVE'), `${ctx}: Security03 residual derivative reachability not visible after origin deletion`);
    await activate(prop.locator('[data-action="invalidate"]'), rec.mobile);
    check(await prop.getAttribute('data-state') === 'invalidated', `${ctx}: Security03 lineage invalidation did not cut derivatives`);
    rec.states.push({ mechanism: 'propagation-lineage', final: await stateOf(prop) });
    rec.screenshots.push(await screenshot(prop, `${ctx}-propagation-invalidated`));
  }
}

async function inspect04(page, ctx, rec) {
  const root = page.locator('.regloop').first();
  check(await root.count() === 1, `${ctx}: Security04 regression-loop model missing`);
  if (!await root.count()) return;
  rec.screenshots.push(await screenshot(root, `${ctx}-regression-start`));
  const blocked = root.locator('[data-toggle="blocked"]');
  const legit = root.locator('[data-toggle="legit"]');
  const focus = await focusEvidence(blocked);
  rec.focus.push({ root: 'regloop', ...focus });
  check(focus.isActive && (focus.focusVisible || focus.outlineStyle !== 'none' || focus.boxShadow !== 'none'), `${ctx}: Security04 mitigation control lacks visible focus`, focus);
  check(await root.locator('[data-outcome]').getAttribute('data-release') === 'HOLD', `${ctx}: Security04 initial release should HOLD`);
  await activate(blocked, rec.mobile, !rec.mobile);
  check(await root.locator('[data-outcome]').getAttribute('data-release') === 'DEPLOY', `${ctx}: Security04 valid mitigation + legit path did not reach DEPLOY`);
  const routeDeploy = await root.locator('[data-route]').getAttribute('points');
  await activate(legit, rec.mobile);
  check(await root.locator('[data-outcome]').getAttribute('data-release') === 'HOLD', `${ctx}: Security04 legitimate regression did not return gate to HOLD`);
  const mobileGate = root.locator('[data-mobile="gate"]');
  if (rec.mobile) check((await mobileGate.textContent() || '').includes('HOLD'), `${ctx}: Security04 mobile gate did not expose HOLD state`);
  rec.states.push({ mechanism: 'regression-release-gate', routeDeploy, final: await stateOf(root.locator('[data-outcome]')) });
  rec.screenshots.push(await screenshot(root, `${ctx}-regression-legit-hold`));
}

async function inspect05(page, ctx, rec) {
  const root = page.locator('.releasegate').first();
  check(await root.count() === 1, `${ctx}: Security05 release-gate model missing`);
  if (!await root.count()) return;
  rec.screenshots.push(await screenshot(root, `${ctx}-release-start`));
  const authority = root.locator('[data-mode="authority"]');
  const focus = await focusEvidence(authority);
  rec.focus.push({ root: 'releasegate', ...focus });
  check(focus.isActive && (focus.focusVisible || focus.outlineStyle !== 'none' || focus.boxShadow !== 'none'), `${ctx}: Security05 scenario control lacks visible focus`, focus);
  check(await root.locator('[data-output="deploy"]').isVisible(), `${ctx}: Security05 valid evidence should expose DEPLOY route`);
  check(!(await root.locator('[data-output="hold"]').isVisible()), `${ctx}: Security05 HOLD route visible in valid state`);
  await activate(authority, rec.mobile, !rec.mobile);
  check(!(await root.locator('[data-output="deploy"]').isVisible()) && await root.locator('[data-output="hold"]').isVisible(), `${ctx}: Security05 stale authority did not topologically switch DEPLOY→HOLD`);
  for (const mode of ['state', 'recovery']) {
    await activate(root.locator(`[data-mode="${mode}"]`), rec.mobile);
    check((await root.locator('[data-decision]').textContent() || '').trim() === 'HOLD', `${ctx}: Security05 ${mode} failure did not HOLD release`);
  }
  await activate(root.locator('[data-mode="pass"]'), rec.mobile);
  check((await root.locator('[data-decision]').textContent() || '').trim() === 'DEPLOY', `${ctx}: Security05 restored evidence did not return to DEPLOY`);
  rec.states.push({ mechanism: 'evidence-bound-release-gate', final: await stateOf(root.locator('[data-decision]')) });
  rec.screenshots.push(await screenshot(root, `${ctx}-release-restored`));
}

async function genericInteractionSweep(page, ctx, rec) {
  const roots = page.locator('article [data-anim-fullscreen="on"]');
  const count = await roots.count();
  rec.visualRootCount = count;
  check(count > 0, `${ctx}: no teaching visual roots found`);
  for (let i = 0; i < count; i++) {
    const root = roots.nth(i);
    const buttons = root.locator('button:visible');
    const n = await buttons.count();
    for (let j = 0; j < n; j++) {
      const button = buttons.nth(j);
      try {
        await activate(button, rec.mobile, false);
        await page.waitForTimeout(20);
      } catch (error) {
        failures.push({ message: `${ctx}: generic interaction failed root=${i} button=${j}`, detail: String(error) });
      }
    }
  }
}

async function inspectRoute(browser, item, spec) {
  const context = await browser.newContext({
    viewport: { width: spec.width, height: spec.height },
    hasTouch: spec.mobile,
    isMobile: spec.mobile,
    reducedMotion: spec.reducedMotion,
    colorScheme: 'light',
  });
  const page = await context.newPage();
  const ctx = `${item.locale}/security${item.chapter}/${spec.name}`;
  const rec = { ...item, context: spec.name, mobile: spec.mobile, motion: spec.reducedMotion, screenshots: [], states: [], focus: [], runtimeEvents: [] };
  let phase = 'init';
  page.on('pageerror', error => rec.runtimeEvents.push({ type: 'pageerror', phase, detail: String(error) }));
  page.on('console', msg => { if (msg.type() === 'error') rec.runtimeEvents.push({ type: 'console', phase, detail: msg.text() }); });
  page.on('requestfailed', request => rec.runtimeEvents.push({ type: 'requestfailed', phase, url: request.url(), detail: request.failure()?.errorText || 'unknown' }));
  page.on('response', response => { if (response.status() >= 400) rec.runtimeEvents.push({ type: 'http', phase, status: response.status(), url: response.url() }); });
  try {
    phase = 'navigation';
    const response = await page.goto(new URL(item.route, base).href, { waitUntil: 'networkidle', timeout: 20000 });
    check(Boolean(response && response.ok()), `${ctx}: page navigation failed`, { status: response?.status() });
    phase = 'layout';
    const geometry = await page.evaluate(() => ({
      viewport: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      texLeak: /\\\\\(|\\\\\[|\\begin\{|\\frac\{/.test(document.querySelector('article')?.innerText || ''),
    }));
    rec.geometry = geometry;
    check(geometry.scrollWidth <= geometry.viewport + 2 && geometry.bodyWidth <= geometry.viewport + 2, `${ctx}: page-level horizontal overflow`, geometry);
    check(!geometry.texLeak, `${ctx}: possible raw TeX leaked into rendered article`, geometry);
    phase = 'targeted-interaction';
    if (item.chapter === '02') await inspect02(page, ctx, rec);
    if (item.chapter === '03') await inspect03(page, ctx, rec);
    if (item.chapter === '04') await inspect04(page, ctx, rec);
    if (item.chapter === '05') await inspect05(page, ctx, rec);
    phase = 'generic-interaction';
    await genericInteractionSweep(page, ctx, rec);
    phase = 'steady';
    const postGeometry = await page.evaluate(() => ({ viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth }));
    rec.postGeometry = postGeometry;
    check(postGeometry.scrollWidth <= postGeometry.viewport + 2 && postGeometry.bodyWidth <= postGeometry.viewport + 2, `${ctx}: interaction introduced page-level overflow`, postGeometry);
  } catch (error) {
    failures.push({ message: `${ctx}: browser inspection exception`, detail: String(error?.stack || error) });
  }
  phase = 'teardown';
  await page.waitForTimeout(100);
  const fatalRuntime = rec.runtimeEvents.filter(event => !(event.type === 'requestfailed' && event.phase === 'teardown' && String(event.detail).includes('ERR_ABORTED')));
  check(fatalRuntime.length === 0, `${ctx}: runtime/resource errors observed through teardown`, fatalRuntime);
  records.push(rec);
  await context.close();
}

let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
} catch {
  browser = await chromium.launch({ headless: true });
}

for (const item of routes) {
  for (const spec of contexts) await inspectRoute(browser, item, spec);
}
await browser.close();

const report = {
  generated_at: new Date().toISOString(),
  contract: 'Security02-05 real browser interaction evidence; manual PIXEL/PEDAGOGY review still required',
  contexts: records.length,
  failures,
  records,
};
await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
console.log(`SECURITY02_05_BROWSER contexts=${records.length} failures=${failures.length}`);
if (failures.length) {
  for (const failure of failures) console.error('FAIL', failure.message, failure.detail || '');
  process.exit(1);
}
console.log('PASS Security02-05 real browser interaction, keyboard/touch, normal/reduced technical gate. PIXEL/PEDAGOGY remain manual.');
