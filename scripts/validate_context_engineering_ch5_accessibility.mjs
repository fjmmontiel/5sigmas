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
    locale:'es',
    route:'/series/context-engineering-memory-mcp/05-mcp-hosts-clients-servers-tools-resources-prompts-lifecycle-trust-boundaries/',
    required:['MCP ≠ confianza implícita','HOST · ORQUESTACIÓN + POLÍTICA','USUARIO','MODELO','POLÍTICA DEL HOST','CLIENT A','1:1 con server A','CLIENT B','1:1 con server B','SERVER A · LOCAL / STDIO','RESOURCES','SERVER B · REMOTO / HTTP','AUTH MCP','OTRA FRONTERA · SISTEMA DOWNSTREAM','AUTH DOWNSTREAM','token propio · no passthrough','EFECTO EXTERNO','2026-07-28: versión + capabilities por request','≤ 2025-11-25: initialize · legacy'],
    forbidden:['MCP ≠ implicit trust','HOST POLICY','REMOTE / HTTP','DOWNSTREAM AUTH','EXTERNAL EFFECT'],
  },
  {
    locale:'en',
    route:'/en/series/context-engineering-memory-mcp/05-mcp-hosts-clients-servers-tools-resources-prompts-lifecycle-trust-boundaries/',
    required:['MCP ≠ implicit trust','HOST · ORCHESTRATION + POLICY','USER','MODEL','HOST POLICY','CLIENT A','1:1 with server A','CLIENT B','1:1 with server B','SERVER A · LOCAL / STDIO','RESOURCES','SERVER B · REMOTE / HTTP','MCP AUTH','ANOTHER BOUNDARY · DOWNSTREAM SYSTEM','DOWNSTREAM AUTH','separate token · no passthrough','EXTERNAL EFFECT','2026-07-28: version + capabilities per request','≤ 2025-11-25: initialize · legacy'],
    forbidden:['confianza implícita','POLÍTICA DEL HOST','REMOTO / HTTP','OTRA FRONTERA','EFECTO EXTERNO','credencial distinta','aislados entre sí'],
  },
];
const viewports = [
  {name:'desktop',width:1440,height:1000,hasTouch:false},
  {name:'mobile',width:390,height:844,hasTouch:true},
];

const browser = await chromium.launch({headless:true});
try {
  for (const testCase of cases) {
    for (const viewport of viewports) {
      const context = await browser.newContext({viewport:{width:viewport.width,height:viewport.height},hasTouch:viewport.hasTouch,isMobile:viewport.hasTouch,reducedMotion:'reduce'});
      const page = await context.newPage();
      const runtimeErrors=[]; const consoleErrors=[];
      page.on('pageerror',(e)=>runtimeErrors.push(e.message));
      page.on('console',(m)=>{if(m.type()==='error') consoleErrors.push(m.text());});
      const response=await page.goto(`${base}${testCase.route}`,{waitUntil:'networkidle'});
      check(response?.ok(),`${testCase.route}: ${viewport.name} HTTP ${response?.status() ?? 'no response'}`);
      const htmlLang=await page.locator('html').getAttribute('lang');
      check((htmlLang||'').toLowerCase().startsWith(testCase.locale),`${testCase.route}: ${viewport.name} wrong html lang ${htmlLang}`);
      check(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),`${testCase.route}: ${viewport.name} reduced-motion emulation inactive`);

      const visual=page.locator('.s5v-context-mcp-trust');
      check((await visual.count())===1,`${testCase.route}: ${viewport.name} expected exactly one MCP visual`);
      if(await visual.count()){
        const label=(await visual.getAttribute('aria-label'))?.trim()||'';
        check(label.length>=70,`${testCase.route}: ${viewport.name} visual missing meaningful aria-label`);
        const text=(await visual.innerText()).toLocaleLowerCase();
        for(const token of testCase.required) check(text.includes(token.toLocaleLowerCase()),`${testCase.route}: ${viewport.name} visual missing ${JSON.stringify(token)}`);
        for(const token of testCase.forbidden) check(!text.includes(token.toLocaleLowerCase()),`${testCase.route}: ${viewport.name} untranslated visual token ${JSON.stringify(token)}`);
        check((await visual.locator('.s5v-arch-map__pipe').count())===0,`${testCase.route}: obsolete linear pipe rendered`);
        check((await visual.locator('.s5v__steps--tabs,[data-s5v-stepper],[data-s5v-tabs]').count())===0,`${testCase.route}: cosmetic interaction rendered`);

        const geometry=await visual.evaluate((root)=>{
          const box=(sel)=>{const node=root.querySelector(sel);if(!node)return null;const r=node.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height,cx:r.left+r.width/2,cy:r.top+r.height/2};};
          return{
            stage:box('.mt-stage'),scroller:box('.mt-scroll'),host:box('[data-boundary="host"]'),serverABoundary:box('[data-boundary="server-a"]'),serverBBoundary:box('[data-boundary="server-b"]'),downstream:box('[data-boundary="downstream"]'),lifecycle:box('[data-boundary="lifecycle"]'),
            user:box('[data-node="user"]'),model:box('[data-node="model"]'),policy:box('[data-node="host-policy"]'),clientA:box('[data-node="client-a"]'),clientB:box('[data-node="client-b"]'),serverA:box('[data-node="server-a"]'),resources:box('[data-node="local-resources"]'),serverB:box('[data-node="server-b"]'),mcpAuth:box('[data-node="mcp-auth"]'),downAuth:box('[data-node="downstream-auth"]'),effect:box('[data-node="external-effect"]'),
            aLink:box('[data-edge="client-a-server-a"]'),bLink:box('[data-edge="client-b-server-b"]'),resourceBack:box('[data-edge="resource-back-a"]'),tool:box('[data-edge="tool-proposal"]'),serverDown:box('[data-edge="server-downstream-auth"]'),authEffect:box('[data-edge="auth-effect"]'),modern:box('[data-edge="modern-request"]'),legacy:box('[data-edge="legacy-initialize"]'),isolation:box('[data-edge="server-isolation"]'),
          };
        });
        for(const [name,b] of Object.entries(geometry)) check(Boolean(b&&b.width>=0&&b.height>=0),`${testCase.route}: ${viewport.name} missing geometry ${name}`);
        if(geometry.host&&geometry.serverABoundary&&geometry.serverBBoundary&&geometry.downstream){
          check(geometry.host.right<geometry.serverABoundary.left+5,`${testCase.route}: ${viewport.name} host/server A trust boundaries overlap`);
          check(geometry.host.right<geometry.serverBBoundary.left+5,`${testCase.route}: ${viewport.name} host/server B trust boundaries overlap`);
          check(geometry.serverBBoundary.right<geometry.downstream.left+5,`${testCase.route}: ${viewport.name} MCP/downstream boundaries overlap`);
          check(geometry.serverABoundary.bottom<geometry.serverBBoundary.top+5,`${testCase.route}: ${viewport.name} isolated servers collapsed together`);
        }
        if(geometry.user&&geometry.model&&geometry.policy&&geometry.clientA&&geometry.clientB){
          check(Math.abs(geometry.user.cy-geometry.model.cy)<12,`${testCase.route}: ${viewport.name} user/model peer relationship lost`);
          check(geometry.policy.cy>geometry.user.cy+90,`${testCase.route}: ${viewport.name} host policy hierarchy collapsed`);
          check(Math.abs(geometry.clientA.cy-geometry.clientB.cy)<12,`${testCase.route}: ${viewport.name} client peer lanes lost`);
          check(geometry.clientA.cy>geometry.policy.cy+110,`${testCase.route}: ${viewport.name} policy→client boundary collapsed`);
        }
        if(geometry.aLink&&geometry.bLink&&geometry.serverA&&geometry.serverB){
          check(geometry.aLink.width>250&&geometry.aLink.height>150,`${testCase.route}: ${viewport.name} client A→server A 1:1 path collapsed`);
          check(geometry.bLink.width>100,`${testCase.route}: ${viewport.name} client B→server B 1:1 path collapsed`);
          check(geometry.serverA.cy<geometry.serverB.cy-200,`${testCase.route}: ${viewport.name} server isolation no longer visible`);
        }
        if(geometry.resourceBack&&geometry.tool&&geometry.serverDown&&geometry.authEffect){
          check(geometry.resourceBack.width>250&&geometry.resourceBack.height>200,`${testCase.route}: ${viewport.name} inbound resource path collapsed`);
          check(geometry.tool.width>150&&geometry.tool.height>250,`${testCase.route}: ${viewport.name} outbound tool proposal path collapsed`);
          check(geometry.serverDown.width>100,`${testCase.route}: ${viewport.name} MCP→downstream authorization crossing collapsed`);
          check(geometry.authEffect.height>30,`${testCase.route}: ${viewport.name} downstream auth→effect relation collapsed`);
        }
        if(geometry.mcpAuth&&geometry.downAuth&&geometry.effect){
          check(geometry.downAuth.cx>geometry.mcpAuth.cx+250,`${testCase.route}: ${viewport.name} separate downstream authorization boundary lost`);
          check(geometry.effect.cy>geometry.downAuth.cy+90,`${testCase.route}: ${viewport.name} external-effect consequence collapsed`);
        }
        if(geometry.lifecycle&&geometry.modern&&geometry.legacy){
          check(geometry.lifecycle.top>geometry.host.bottom+20,`${testCase.route}: ${viewport.name} lifecycle lane collapsed into trust topology`);
          check(geometry.modern.width>80&&geometry.legacy.width>100,`${testCase.route}: ${viewport.name} modern/legacy lifecycle distinction collapsed`);
        }

        const scroller=visual.locator('.mt-scroll');
        check((await scroller.count())===1,`${testCase.route}: ${viewport.name} topology-preserving scroll region missing`);
        if(await scroller.count()){
          check((await scroller.getAttribute('tabindex'))==='0',`${testCase.route}: ${viewport.name} scroll region not keyboard focusable`);
          const state=await scroller.evaluate((node)=>{const maxScroll=node.scrollWidth-node.clientWidth;node.scrollLeft=maxScroll;void node.offsetWidth;const stage=node.querySelector('.mt-stage')?.getBoundingClientRect();const r=node.getBoundingClientRect();return{maxScroll,actualScroll:node.scrollLeft,stageWidth:stage?.width??0,stageRight:stage?.right??0,scrollerRight:r.right};});
          if(viewport.name==='mobile'){
            check(state.maxScroll>450&&state.actualScroll>450,`${testCase.route}: mobile MCP topology did not survive horizontal scroll (${JSON.stringify(state)})`);
            await scroller.screenshot({path:path.join(outDir,`context-engineering-ch5-${testCase.locale}-mobile-visual-end.png`),animations:'disabled'});
          } else {
            check(state.maxScroll<=1&&state.actualScroll<=1,`${testCase.route}: desktop MCP visual clips horizontally (${JSON.stringify(state)})`);
            check(state.stageWidth>=900&&state.stageRight<=state.scrollerRight+1,`${testCase.route}: desktop stage too narrow or escapes viewport (${JSON.stringify(state)})`);
          }
          await scroller.evaluate((node)=>{node.scrollLeft=0;});
        }
        await visual.screenshot({path:path.join(outDir,`context-engineering-ch5-${testCase.locale}-${viewport.name}-visual.png`),animations:'disabled'});
      }

      const articleText=(await page.locator('main').innerText()).toLocaleLowerCase();
      for(const token of ['mcp','host','client','server','tool','resource','prompt','authorization','2026-07-28']) check(articleText.includes(token),`${testCase.route}: ${viewport.name} article missing ${token}`);
      const overflow=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));
      check(overflow.scrollWidth<=overflow.clientWidth+1,`${testCase.route}: ${viewport.name} page overflow ${JSON.stringify(overflow)}`);
      for(const error of runtimeErrors) failures.push(`${testCase.route}: ${viewport.name} runtime error: ${error}`);
      for(const error of consoleErrors.filter((entry)=>!/favicon|Failed to load resource.*404/i.test(entry))) failures.push(`${testCase.route}: ${viewport.name} console error: ${error}`);
      await page.screenshot({path:path.join(outDir,`context-engineering-ch5-${testCase.locale}-${viewport.name}-page.png`),fullPage:true,animations:'disabled'});
      await context.close();
    }
  }
} finally { await browser.close(); }

if(failures.length){console.error(`Context engineering chapter 3.5 browser/accessibility QA failed (${failures.length}):`);for(const failure of failures)console.error(`- ${failure}`);process.exit(1);}
console.log('Context engineering chapter 3.5 browser/accessibility QA PASS: host/client/server isolation, inbound context vs outbound action, authorization boundaries, 2026/legacy lifecycle, desktop fit, topology-preserving mobile scroll, reduced-motion, overflow and screenshots are valid.');
