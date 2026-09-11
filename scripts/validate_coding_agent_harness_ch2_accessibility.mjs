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
    locale: 'es', route: '/series/coding-agents-agent-harnesses/02-contexto-workspace-sandboxing-aislamiento/',
    requiredVisual: ['Aislamiento en tres dimensiones','GIT COMPARTIDO','ESTADO MUTABLE','CAPACIDADES','INTEGRACIÓN','WORKTREE T1','WORKTREE T2','SANDBOX T1','SANDBOX T2','verification_head_sha','target cambia','sin namespace'], forbidden: [],
  },
  {
    locale: 'en', route: '/en/series/coding-agents-agent-harnesses/02-contexto-workspace-sandboxing-aislamiento/',
    requiredVisual: ['Isolation across three dimensions','SHARED GIT','MUTABLE STATE','CAPABILITIES','INTEGRATION','WORKTREE T1','WORKTREE T2','SANDBOX T1','SANDBOX T2','verification_head_sha','target changes','without namespace'],
    forbidden: ['Aislamiento en tres dimensiones','GIT COMPARTIDO','ESTADO MUTABLE','CAPACIDADES','INTEGRACIÓN','Proceso T1','Proceso T2','red cruza policy','sin namespace','nuevo estado exacto','evidencia que debe revalidarse'],
  },
];
const viewports = [
  { name: 'desktop', width: 1440, height: 1000, hasTouch: false },
  { name: 'mobile', width: 390, height: 844, hasTouch: true },
];

async function boxOf(root, selector) {
  const loc = root.locator(selector);
  if ((await loc.count()) !== 1) return null;
  return loc.boundingBox();
}
function centerX(box) { return box.x + box.width / 2; }
function centerY(box) { return box.y + box.height / 2; }

async function assertRelationshipGeometry(page, visual, testCase, viewport) {
  const scroll = visual.locator('.s5v-isolation__scroll');
  check((await scroll.count()) === 1, `${testCase.route}: ${viewport.name} missing dedicated visual scroller`);
  check((await scroll.getAttribute('tabindex')) === '0', `${testCase.route}: ${viewport.name} visual scroller not keyboard focusable`);

  const rail = await boxOf(visual, '[data-shared-rail="repository"]');
  const wt1 = await boxOf(visual, '[data-worktree="T1"]');
  const wt2 = await boxOf(visual, '[data-worktree="T2"]');
  const sb1 = await boxOf(visual, '[data-sandbox="T1"]');
  const sb2 = await boxOf(visual, '[data-sandbox="T2"]');
  const svc1 = await boxOf(visual, '[data-service="T1"]');
  const svc2 = await boxOf(visual, '[data-service="T2"]');
  const sharedRisk = await boxOf(visual, '[data-shared-risk="external-resource"]');
  const cand1 = await boxOf(visual, '[data-candidate="T1"]');
  const cand2 = await boxOf(visual, '[data-candidate="T2"]');
  const integration = await boxOf(visual, '[data-node="integration"]');
  const verify = await boxOf(visual, '[data-node="verification-head"]');
  const invalidate = await boxOf(visual, '[data-edge="evidence-invalidation"]');
  for (const [name, box] of Object.entries({rail,wt1,wt2,sb1,sb2,svc1,svc2,sharedRisk,cand1,cand2,integration,verify,invalidate})) {
    check(Boolean(box && box.width > 1 && box.height >= 0), `${testCase.route}: ${viewport.name} collapsed/missing geometry ${name} ${JSON.stringify(box)}`);
  }
  if (![rail,wt1,wt2,sb1,sb2,svc1,svc2,sharedRisk,cand1,cand2,integration,verify,invalidate].every(Boolean)) return;

  check(rail.x < centerX(wt1) && rail.x + rail.width > centerX(wt2), `${testCase.route}: ${viewport.name} shared Git rail does not span both worktrees`);
  check(wt1.x + wt1.width < wt2.x, `${testCase.route}: ${viewport.name} worktrees are not parallel/non-overlapping`);
  check(Math.abs(centerY(wt1) - centerY(wt2)) < 4, `${testCase.route}: ${viewport.name} worktrees do not share the mutable-state lane`);
  check(wt1.y + wt1.height < sb1.y && wt2.y + wt2.height < sb2.y, `${testCase.route}: ${viewport.name} worktree state and sandbox capability rows collapsed into one boundary`);
  check(Math.abs(centerX(wt1) - centerX(sb1)) < 45 && Math.abs(centerX(wt2) - centerX(sb2)) < 45, `${testCase.route}: ${viewport.name} sandbox policies no longer map to their task lanes`);
  check(svc1.x > sb1.x + sb1.width && svc2.x > sb2.x + sb2.width, `${testCase.route}: ${viewport.name} external services incorrectly rendered inside sandbox boundary`);
  check(sharedRisk.x > sb1.x + sb1.width && sharedRisk.x + sharedRisk.width < sb2.x, `${testCase.route}: ${viewport.name} shared external-resource risk is not visibly between task boundaries`);
  check(cand1.x < integration.x && cand2.x > integration.x + integration.width, `${testCase.route}: ${viewport.name} candidate paths do not converge from opposite sides`);
  check(integration.x + integration.width < verify.x, `${testCase.route}: ${viewport.name} verification is not downstream of integration`);
  check(invalidate.x < verify.x + verify.width && invalidate.x + invalidate.width > verify.x, `${testCase.route}: ${viewport.name} evidence invalidation loop is detached from verification`);

  const structuralEdges = ['repo-to-worktree-a','repo-to-worktree-b','t1-process-to-worktree','t2-process-to-worktree','t1-network','t2-network','t1-shared-resource','t2-shared-resource','t1-to-integration','t2-to-integration','integration-to-verification','evidence-invalidation'];
  for (const edge of structuralEdges) check((await visual.locator(`[data-edge="${edge}"]`).count()) === 1, `${testCase.route}: ${viewport.name} missing structural edge ${edge}`);

  const scrollState = await scroll.evaluate((node) => ({clientWidth:node.clientWidth,scrollWidth:node.scrollWidth,tabIndex:node.tabIndex}));
  if (viewport.name === 'mobile') {
    check(scrollState.scrollWidth > scrollState.clientWidth + 300, `${testCase.route}: mobile topology collapsed instead of remaining scrollable ${JSON.stringify(scrollState)}`);
    await scroll.screenshot({ path: path.join(outDir, `coding-harness-ch2-${testCase.locale}-mobile-visual-start.png`), animations: 'disabled' });
    await scroll.evaluate((node) => { node.scrollLeft = node.scrollWidth - node.clientWidth; });
    await page.waitForTimeout(80);
    const endState = await scroll.evaluate((node) => ({left:node.scrollLeft,max:node.scrollWidth-node.clientWidth}));
    check(endState.left >= endState.max - 3 && endState.max > 300, `${testCase.route}: mobile visual final region unreachable ${JSON.stringify(endState)}`);
    await scroll.screenshot({ path: path.join(outDir, `coding-harness-ch2-${testCase.locale}-mobile-visual-end.png`), animations: 'disabled' });
  } else {
    check(scrollState.scrollWidth <= scrollState.clientWidth + 4, `${testCase.route}: desktop unexpectedly requires horizontal scroll ${JSON.stringify(scrollState)}`);
    await visual.screenshot({ path: path.join(outDir, `coding-harness-ch2-${testCase.locale}-desktop-visual.png`), animations: 'disabled' });
  }
}

async function assertTables(page, testCase, viewport) {
  const tables = page.locator('main table');
  check((await tables.count()) >= 2, `${testCase.route}: ${viewport.name} expected at least two teaching tables`);
  for (let index = 0; index < await tables.count(); index += 1) {
    const table = tables.nth(index);
    const state = await table.evaluate((node, args) => {
      const lastHeader = node.querySelector('thead th:last-child');
      const tableBox = node.getBoundingClientRect();
      if (!lastHeader) return {hasLastHeader:false};
      if (args.viewportName !== 'mobile') {
        const lastBox = lastHeader.getBoundingClientRect();
        return {hasLastHeader:true,desktopFits:tableBox.right <= window.innerWidth + 1 && lastBox.right <= window.innerWidth + 1};
      }
      let scroller=node.parentElement;
      while(scroller && scroller!==document.body){const style=getComputedStyle(scroller);if(scroller.scrollWidth>scroller.clientWidth+1&&(style.overflowX==='auto'||style.overflowX==='scroll'))break;scroller=scroller.parentElement;}
      if(!scroller||scroller===document.body)return{hasLastHeader:true,hasScroller:false,tableWidth:tableBox.width};
      const maxScroll=scroller.scrollWidth-scroller.clientWidth;scroller.scrollLeft=maxScroll;void scroller.offsetWidth;
      const sb=scroller.getBoundingClientRect(),lb=lastHeader.getBoundingClientRect();
      return{hasLastHeader:true,hasScroller:true,maxScroll,actualScroll:scroller.scrollLeft,lastColumnReachable:lb.left>=sb.left-2&&lb.right<=sb.right+2};
    }, {viewportName:viewport.name});
    check(state.hasLastHeader===true, `${testCase.route}: ${viewport.name} table ${index+1} missing last header`);
    if(viewport.name==='desktop') check(state.desktopFits===true, `${testCase.route}: desktop table ${index+1} clipped ${JSON.stringify(state)}`);
    else if(state.hasScroller){check(Number(state.maxScroll)>10&&Number(state.actualScroll)>10,`${testCase.route}: mobile table ${index+1} inert scroll ${JSON.stringify(state)}`);check(state.lastColumnReachable===true,`${testCase.route}: mobile table ${index+1} final column unreachable ${JSON.stringify(state)}`);}
    else check(Number(state.tableWidth)<=viewport.width+1,`${testCase.route}: mobile table ${index+1} clips without scroller ${JSON.stringify(state)}`);
  }
}

const browser = await chromium.launch({headless:true});
try {
  for (const testCase of cases) for (const viewport of viewports) {
    const context = await browser.newContext({viewport:{width:viewport.width,height:viewport.height},hasTouch:viewport.hasTouch,isMobile:viewport.hasTouch,reducedMotion:'reduce'});
    const page = await context.newPage();
    const runtimeErrors=[]; const consoleErrors=[];
    page.on('pageerror',e=>runtimeErrors.push(e.message)); page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
    const response=await page.goto(`${base}${testCase.route}`,{waitUntil:'networkidle'});
    check(response?.ok(),`${testCase.route}: ${viewport.name} HTTP ${response?.status()??'no response'}`);
    const htmlLang=await page.locator('html').getAttribute('lang');
    check((htmlLang||'').toLowerCase().startsWith(testCase.locale),`${testCase.route}: ${viewport.name} wrong html lang ${htmlLang}`);
    check(((await page.locator('main h1').first().innerText()).trim()).length>=45,`${testCase.route}: ${viewport.name} missing article h1`);
    check(await page.evaluate(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches),`${testCase.route}: ${viewport.name} reduced-motion emulation inactive`);

    const visual=page.locator('.s5v-coding-agent-isolation');
    check((await visual.count())===1,`${testCase.route}: ${viewport.name} expected exactly one isolation visual`);
    if(await visual.count()){
      const label=(await visual.getAttribute('aria-label'))?.trim()||''; check(label.length>=25,`${testCase.route}: ${viewport.name} visual missing meaningful aria-label`);
      const visualText=(await visual.innerText()).toLocaleLowerCase();
      for(const token of testCase.requiredVisual)check(visualText.includes(token.toLocaleLowerCase()),`${testCase.route}: ${viewport.name} visual missing ${JSON.stringify(token)}`);
      for(const token of testCase.forbidden)check(!visualText.includes(token.toLocaleLowerCase()),`${testCase.route}: ${viewport.name} untranslated visual token ${JSON.stringify(token)}`);
      check((await visual.locator('button').count())===0,`${testCase.route}: ${viewport.name} cosmetic interaction controls reintroduced`);
      check((await visual.locator('.s5v-arch-map__pipe').count())===0,`${testCase.route}: ${viewport.name} legacy linear card pipe reintroduced`);
      const visualBox=await visual.boundingBox(); check(Boolean(visualBox&&visualBox.width<=viewport.width+1),`${testCase.route}: ${viewport.name} visual exceeds viewport ${JSON.stringify(visualBox)}`);
      await assertRelationshipGeometry(page,visual,testCase,viewport);
    }
    const overflow=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));
    check(overflow.scrollWidth<=overflow.clientWidth+1,`${testCase.route}: ${viewport.name} horizontal page overflow ${JSON.stringify(overflow)}`);
    await assertTables(page,testCase,viewport);
    const articleText=(await page.locator('main').innerText()).toLocaleLowerCase();
    for(const token of ['verification_head_sha','cleanup_state','base_sha'])check(articleText.includes(token),`${testCase.route}: ${viewport.name} production invariant missing ${token}`);
    for(const error of runtimeErrors)failures.push(`${testCase.route}: ${viewport.name} runtime error: ${error}`);
    for(const error of consoleErrors.filter(entry=>!/favicon|Failed to load resource.*404/i.test(entry)))failures.push(`${testCase.route}: ${viewport.name} console error: ${error}`);
    await page.screenshot({path:path.join(outDir,`coding-harness-ch2-${testCase.locale}-${viewport.name}-page.png`),fullPage:true,animations:'disabled'});
    await context.close();
  }
} finally { await browser.close(); }

if(failures.length){console.error(`Coding agent harness chapter 2.2 browser/accessibility QA failed (${failures.length}):`);for(const failure of failures)console.error(`- ${failure}`);process.exit(1);}
console.log('Coding agent harness chapter 2.2 browser/accessibility QA PASS: ES/EN localization, orthogonal relationship geometry, shared-resource risk, integration convergence, evidence invalidation, reduced-motion, desktop/mobile reachability, tables, overflow and runtime checks are valid.');
