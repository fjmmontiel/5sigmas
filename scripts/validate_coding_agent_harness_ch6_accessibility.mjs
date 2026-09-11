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
  { locale:'es', route:'/series/coding-agents-agent-harnesses/06-tareas-largas-memoria-subagentes-recuperacion-merge-observabilidad/', requiredVisual:['Durabilidad · recovery · fan-in','CONTEXTO TRANSITORIO','CONTROL DURABLE','OWNERSHIP + WORKSPACES PARALELOS','FAN-IN · FRESHNESS · MERGE','RECOVERY + OBSERVABILIDAD','Contexto root t0','Ledger durable de tarea','Worker A · API','Worker B · migración','Target A','Target B','Candidato integrado I9','dependiente → STALE','Reverify I9','MERGE','Disconnect','Nuevo stream','Retrieve saved state','Reconcile by ID','Causal trace','Regla operativa'], forbidden:[] },
  { locale:'en', route:'/en/series/coding-agents-agent-harnesses/06-tareas-largas-memoria-subagentes-recuperacion-merge-observabilidad/', requiredVisual:['Durability · recovery · fan-in','TRANSIENT CONTEXT','DURABLE CONTROL','OWNERSHIP + PARALLEL WORKSPACES','FAN-IN · FRESHNESS · MERGE','RECOVERY + OBSERVABILITY','Root context t0','Durable task ledger','Worker A · API','Worker B · migration','Target A','Target B','Integrated candidate I9','dependent → STALE','Reverify I9','MERGE','Disconnect','New stream','Retrieve saved state','Reconcile by ID','Causal trace','Operating rule'], forbidden:['Topología de estado durable','La continuidad vive','CONTEXTO TRANSITORIO','CONTROL DURABLE','WORKSPACES PARALELOS','OBSERVABILIDAD','Contexto root','mensajes + tools','puede desaparecer','cambia contexto','continúa la tarea','Ledger durable','sobrevive al contexto','migración','fan-out por','main avanzó','Candidato integrado','nuevo SHA','dependiente','sólo tras','stream/UI cae','Nuevo stream','Leyenda del diagrama','estado / ejecución','invalidación de evidencia','reconciliación','Regla operativa','perder contexto o transporte'] },
];
const viewports = [{name:'desktop',width:1440,height:1000,hasTouch:false},{name:'mobile',width:390,height:844,hasTouch:true}];
async function box(locator){ const value=await locator.boundingBox(); return value?{x:value.x,y:value.y,width:value.width,height:value.height,right:value.x+value.width,bottom:value.y+value.height}:null; }
async function assertTables(page,testCase,viewport){ const tables=page.locator('main table'); check((await tables.count())>=2,`${testCase.route}: ${viewport.name} expected at least two teaching tables`); for(let i=0;i<await tables.count();i+=1){ const table=tables.nth(i); const state=await table.evaluate((node,args)=>{ const lastHeader=node.querySelector('thead th:last-child'); const tableBox=node.getBoundingClientRect(); if(!lastHeader)return{hasLastHeader:false}; if(args.viewportName!=='mobile'){ const lastBox=lastHeader.getBoundingClientRect(); return{hasLastHeader:true,desktopFits:tableBox.right<=window.innerWidth+1&&lastBox.right<=window.innerWidth+1}; } let scroller=node.parentElement; while(scroller&&scroller!==document.body){ const style=getComputedStyle(scroller); if(scroller.scrollWidth>scroller.clientWidth+1&&(style.overflowX==='auto'||style.overflowX==='scroll'))break; scroller=scroller.parentElement; } if(!scroller||scroller===document.body)return{hasLastHeader:true,hasScroller:false,tableWidth:tableBox.width}; const maxScroll=scroller.scrollWidth-scroller.clientWidth; scroller.scrollLeft=maxScroll; void scroller.offsetWidth; const scrollerBox=scroller.getBoundingClientRect(); const lastBox=lastHeader.getBoundingClientRect(); return{hasLastHeader:true,hasScroller:true,maxScroll,actualScroll:scroller.scrollLeft,lastColumnReachable:lastBox.left>=scrollerBox.left-2&&lastBox.right<=scrollerBox.right+2}; },{viewportName:viewport.name}); check(state.hasLastHeader===true,`${testCase.route}: ${viewport.name} table ${i+1} missing final header`); if(viewport.name==='desktop')check(state.desktopFits===true,`${testCase.route}: desktop table ${i+1} clipped (${JSON.stringify(state)})`); else if(state.hasScroller){ check(Number(state.maxScroll)>10&&Number(state.actualScroll)>10,`${testCase.route}: mobile table ${i+1} horizontal scroll inert (${JSON.stringify(state)})`); check(state.lastColumnReachable===true,`${testCase.route}: mobile table ${i+1} final column unreachable (${JSON.stringify(state)})`); } else check(Number(state.tableWidth)<=viewport.width+1,`${testCase.route}: mobile table ${i+1} clips without scroller (${JSON.stringify(state)})`); } }

const browser=await chromium.launch({headless:true});
try {
  for(const testCase of cases){
    for(const viewport of viewports){
      const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},hasTouch:viewport.hasTouch,isMobile:viewport.hasTouch,reducedMotion:'reduce'});
      const page=await context.newPage();
      const runtimeErrors=[]; const consoleErrors=[];
      page.on('pageerror',(error)=>runtimeErrors.push(error.message));
      page.on('console',(message)=>{if(message.type()==='error')consoleErrors.push(message.text());});
      const response=await page.goto(`${base}${testCase.route}`,{waitUntil:'networkidle'});
      check(response?.ok(),`${testCase.route}: ${viewport.name} HTTP ${response?.status()??'no response'}`);
      const htmlLang=await page.locator('html').getAttribute('lang');
      check((htmlLang||'').toLowerCase().startsWith(testCase.locale),`${testCase.route}: ${viewport.name} wrong html lang ${htmlLang}`);
      check(((await page.locator('main h1').first().innerText()).trim()).length>=55,`${testCase.route}: ${viewport.name} missing article h1`);
      check(await page.evaluate(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches),`${testCase.route}: ${viewport.name} reduced-motion emulation inactive`);

      const visual=page.locator('.s5v-coding-agent-long-task-state');
      check((await visual.count())===1,`${testCase.route}: ${viewport.name} expected exactly one long-task topology`);
      if(await visual.count()){
        const label=(await visual.getAttribute('aria-label'))?.trim()||'';
        check(label.length>=55,`${testCase.route}: ${viewport.name} long-task topology missing meaningful aria-label`);
        const visualText=(await visual.innerText()).toLocaleLowerCase();
        for(const token of testCase.requiredVisual)check(visualText.includes(token.toLocaleLowerCase()),`${testCase.route}: ${viewport.name} visual missing ${JSON.stringify(token)}`);
        for(const token of testCase.forbidden)check(!visualText.includes(token.toLocaleLowerCase()),`${testCase.route}: ${viewport.name} untranslated visual token ${JSON.stringify(token)}`);
        check((await visual.locator('.s5v-arch-map__pipe').count())===0,`${testCase.route}: ${viewport.name} legacy card pipe returned`);
        check((await visual.locator('button').count())===0,`${testCase.route}: ${viewport.name} cosmetic controls returned`);
        const scroll=visual.locator('.s5v-long__scroll');
        check((await scroll.getAttribute('tabindex'))==='0',`${testCase.route}: ${viewport.name} topology scroller is not keyboard-focusable`);
        check((await scroll.getAttribute('role'))==='region',`${testCase.route}: ${viewport.name} topology scroller missing region role`);
        const scrollState=await scroll.evaluate((node,args)=>{ const style=getComputedStyle(node); const maxScroll=Math.max(0,node.scrollWidth-node.clientWidth); if(args.viewportName==='mobile')node.scrollLeft=maxScroll; void node.offsetWidth; return{overflowX:style.overflowX,clientWidth:node.clientWidth,scrollWidth:node.scrollWidth,maxScroll,after:node.scrollLeft}; },{viewportName:viewport.name});
        if(viewport.name==='mobile'){ check(scrollState.maxScroll>500,`${testCase.route}: mobile long-task topology collapsed instead of scrolling (${JSON.stringify(scrollState)})`); check(scrollState.after>450,`${testCase.route}: mobile scroll cannot reach integration/recovery outcomes (${JSON.stringify(scrollState)})`); await scroll.evaluate((node)=>{node.scrollLeft=0;}); }
        else check(scrollState.scrollWidth<=scrollState.clientWidth+4,`${testCase.route}: desktop long-task topology unexpectedly requires horizontal scrolling (${JSON.stringify(scrollState)})`);

        const contextZone=await box(visual.locator('[data-zone="context"]'));
        const durableZone=await box(visual.locator('[data-zone="durable"]'));
        const workersZone=await box(visual.locator('[data-zone="workers"]'));
        const integrationZone=await box(visual.locator('[data-zone="integration"]'));
        const recoveryZone=await box(visual.locator('[data-zone="recovery"]'));
        const contextA=await box(visual.locator('[data-node="context-a"]'));
        const contextB=await box(visual.locator('[data-node="context-b"]'));
        const ledger=await box(visual.locator('[data-node="durable-ledger"]'));
        const workerA=await box(visual.locator('[data-node="worker-a"]'));
        const workerB=await box(visual.locator('[data-node="worker-b"]'));
        const targetA=await box(visual.locator('[data-node="target-a"]'));
        const targetB=await box(visual.locator('[data-node="target-b"]'));
        const integrated=await box(visual.locator('[data-node="integration-candidate"]'));
        const stale=await box(visual.locator('[data-node="stale-evidence"]'));
        const reverify=await box(visual.locator('[data-node="reverify"]'));
        const merge=await box(visual.locator('[data-node="merge"]'));
        const disconnect=await box(visual.locator('[data-node="disconnect"]'));
        const retrieve=await box(visual.locator('[data-node="retrieve"]'));
        const reconcile=await box(visual.locator('[data-node="reconcile"]'));
        const cont=await box(visual.locator('[data-node="continue"]'));
        const observability=await box(visual.locator('[data-node="observability"]'));
        for(const [name,value] of Object.entries({contextZone,durableZone,workersZone,integrationZone,recoveryZone,contextA,contextB,ledger,workerA,workerB,targetA,targetB,integrated,stale,reverify,merge,disconnect,retrieve,reconcile,cont,observability}))check(Boolean(value),`${testCase.route}: ${viewport.name} missing geometry for ${name}`);
        if([contextZone,durableZone,workersZone,integrationZone,recoveryZone,contextA,contextB,ledger,workerA,workerB,targetA,targetB,integrated,stale,reverify,merge,disconnect,retrieve,reconcile,cont,observability].every(Boolean)){
          check(contextZone.right<durableZone.x&&durableZone.right<integrationZone.x,`${testCase.route}: ${viewport.name} context/durable/integration regions are not spatially distinct`);
          check(workersZone.y>contextZone.bottom-2&&workersZone.right<integrationZone.x+2,`${testCase.route}: ${viewport.name} worker region no longer represents a separate parallel fan-out domain`);
          check(recoveryZone.y>workersZone.bottom,`${testCase.route}: ${viewport.name} recovery lane is not visually downstream and separate`);
          check(contextA.x>=contextZone.x&&contextB.right<=contextZone.right+2,`${testCase.route}: ${viewport.name} context nodes escaped transient context zone`);
          check(ledger.x>=durableZone.x&&ledger.right<=durableZone.right+2,`${testCase.route}: ${viewport.name} durable ledger escaped durable control zone`);
          check(workerA.x>=workersZone.x&&workerB.right<=workersZone.right+2&&workerA.right<workerB.x,`${testCase.route}: ${viewport.name} workers lost independent workspace geometry`);
          check(targetA.x>=integrationZone.x&&targetB.right<=integrationZone.right+2&&targetA.right<targetB.x,`${testCase.route}: ${viewport.name} target A→B drift is not spatially encoded`);
          check(integrated.y>targetA.bottom&&integrated.y>targetB.bottom,`${testCase.route}: ${viewport.name} integrated candidate is not downstream of target state`);
          check(stale.y>integrated.bottom&&reverify.y>integrated.bottom&&stale.right<reverify.x,`${testCase.route}: ${viewport.name} stale evidence/reverify relationship collapsed`);
          check(merge.y>reverify.bottom,`${testCase.route}: ${viewport.name} merge no longer follows re-verification`);
          check(disconnect.x<retrieve.x&&retrieve.x<reconcile.x&&reconcile.x<cont.x&&cont.x<observability.x,`${testCase.route}: ${viewport.name} recovery/reconciliation order is not preserved`);
        }
        for(const edge of ['context-a-ledger','ledger-context-b','ledger-worker-a','ledger-worker-b','worker-a-integration','worker-b-integration','target-a-b','target-b-integration','integration-invalidates','stale-reverify','reverify-merge','disconnect-buffer','buffer-retrieve','retrieve-reconcile','reconcile-continue','ledger-recovery','worker-a-observe','worker-b-observe','integration-observe'])check((await visual.locator(`[data-edge="${edge}"]`).count())===1,`${testCase.route}: ${viewport.name} topology edge missing ${edge}`);
        await visual.screenshot({path:path.join(outDir,`coding-harness-ch6-${testCase.locale}-${viewport.name}-visual-start.png`),animations:'disabled'});
        if(viewport.name==='mobile'){ await scroll.evaluate((node)=>{node.scrollLeft=node.scrollWidth-node.clientWidth;}); await visual.screenshot({path:path.join(outDir,`coding-harness-ch6-${testCase.locale}-${viewport.name}-visual-end.png`),animations:'disabled'}); }
      }

      const overflow=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));
      check(overflow.scrollWidth<=overflow.clientWidth+1,`${testCase.route}: ${viewport.name} horizontal page overflow ${JSON.stringify(overflow)}`);
      await assertTables(page,testCase,viewport);
      const articleText=(await page.locator('main').innerText()).toLocaleLowerCase();
      for(const token of ['task_id','contract_version','target_sha','work_unit_id','base_sha','workspace_id','candidate_sha','required_actions','item_id','subagent_id','action_id','recovering','integrating','verifying','accepted','hand_back_to_human'])check(articleText.includes(token),`${testCase.route}: ${viewport.name} durable-task invariant missing ${token}`);
      check(articleText.includes('persisted state + observed external state'),`${testCase.route}: ${viewport.name} recovery reconciliation invariant missing`);
      check(articleText.includes('i9 = integrate(b, w1, w2, w3)'),`${testCase.route}: ${viewport.name} moving-target worked example missing`);
      for(const error of runtimeErrors)failures.push(`${testCase.route}: ${viewport.name} runtime error: ${error}`);
      for(const error of consoleErrors.filter((entry)=>!/favicon|Failed to load resource.*404/i.test(entry)))failures.push(`${testCase.route}: ${viewport.name} console error: ${error}`);
      await page.screenshot({path:path.join(outDir,`coding-harness-ch6-${testCase.locale}-${viewport.name}-page.png`),fullPage:true,animations:'disabled'});
      await context.close();
    }
  }
} finally { await browser.close(); }

if(failures.length){
  console.error(`Coding agent harness chapter 2.6 browser/accessibility QA failed (${failures.length}):`);
  for(const failure of failures)console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Coding agent harness chapter 2.6 browser/accessibility QA PASS: ES/EN localization, durable-state topology, context reset, subagent fan-out, target drift, evidence invalidation, recovery reconciliation, causal observability, reduced-motion, desktop/mobile geometry, table reachability, page overflow, runtime errors and screenshots are valid.');