#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base=process.env.S5_PREVIEW_BASE||'http://127.0.0.1:8000';
const out=path.resolve('artifacts/security-requalification/security-02-05-browser-fast');
await fs.mkdir(out,{recursive:true});
const routes=[
 {chapter:'02',locale:'es',route:'/series/seguridad-ia/02-jailbreaks/',root:'.jbladder'},
 {chapter:'02',locale:'en',route:'/en/series/seguridad-ia/02-jailbreaks/',root:'.jbladder'},
 {chapter:'03',locale:'es',route:'/series/seguridad-ia/03-envenenamiento/',root:'.memlayers'},
 {chapter:'03',locale:'en',route:'/en/series/seguridad-ia/03-envenenamiento/',root:'.memlayers'},
 {chapter:'04',locale:'es',route:'/series/seguridad-ia/04-red-teaming/',root:'.regloop'},
 {chapter:'04',locale:'en',route:'/en/series/seguridad-ia/04-red-teaming/',root:'.regloop'},
 {chapter:'05',locale:'es',route:'/series/seguridad-ia/05-controles-produccion/',root:'.releasegate'},
 {chapter:'05',locale:'en',route:'/en/series/seguridad-ia/05-controles-produccion/',root:'.releasegate'}
];
let browser; try{browser=await chromium.launch({channel:'chrome',headless:true});}catch{browser=await chromium.launch({headless:true});}
const context=await browser.newContext({viewport:{width:1440,height:1000},colorScheme:'light'});
const page=await context.newPage();
const rows=[];
for(const item of routes){
  const response=await page.goto(new URL(item.route,base).href,{waitUntil:'domcontentloaded',timeout:10000});
  await page.locator('article').waitFor({state:'visible',timeout:5000});
  await page.waitForTimeout(100);
  const root=page.locator(item.root).first();
  const diag=await root.evaluate((node,chapter)=>{
    const cs=e=>e?getComputedStyle(e):null;
    const val=(e,p)=>cs(e)?.getPropertyValue(p)||null;
    const style=node.querySelector('style');
    let cssRules=null,styleDisabled=null;
    try{cssRules=style?.sheet?.cssRules?.length??null;styleDisabled=style?.sheet?.disabled??null;}catch(e){cssRules=`ERR:${e}`;}
    const base={
      chapter,
      styleCount:node.querySelectorAll('style').length,
      styleTextLength:style?.textContent?.length||0,
      cssRules,
      styleDisabled,
      docScheme:document.documentElement.getAttribute('data-md-color-scheme'),
      docBg:val(document.documentElement,'--md-default-bg-color').trim(),
      bodyBg:val(document.body,'--md-default-bg-color').trim(),
      rootBgVar:val(node,'--md-default-bg-color').trim(),
      rootFgVar:val(node,'--md-default-fg-color').trim(),
      rootDisplay:val(node,'display'),
      rootBackground:val(node,'background-color'),
      rootBorder:val(node,'border-top-width')+' '+val(node,'border-top-style')+' '+val(node,'border-top-color'),
    };
    if(chapter==='02'){
      const controls=node.querySelector('.jbladder__controls'),circle=node.querySelector('.jbladder__node circle'),route=node.querySelector('[data-route]'),btn=node.querySelector('.jbladder__control');
      Object.assign(base,{controlsDisplay:val(controls,'display'),controlsGrid:val(controls,'grid-template-columns'),buttonDisplay:val(btn,'display'),buttonBackground:val(btn,'background-color'),buttonBorder:val(btn,'border-top-width')+' '+val(btn,'border-top-style')+' '+val(btn,'border-top-color'),circleFill:val(circle,'fill'),circleStroke:val(circle,'stroke'),routeStroke:val(route,'stroke')});
    }else if(chapter==='03'){
      const lab=node.querySelector('.memlayers__lab'),graph=node.querySelector('.memlayers__graph'),n=node.querySelector('.memlayers__node'),btn=node.querySelector('button');
      const prop=document.querySelector('.memprop'),pmap=prop?.querySelector('.memprop__map'),pnode=prop?.querySelector('.memprop__node'),pbtn=prop?.querySelector('button');
      Object.assign(base,{labDisplay:val(lab,'display'),labGrid:val(lab,'grid-template-columns'),graphPosition:val(graph,'position'),nodePosition:val(n,'position'),buttonBorder:val(btn,'border-top-width')+' '+val(btn,'border-top-style')+' '+val(btn,'border-top-color'),propStyleCount:prop?.querySelectorAll('style').length||0,propMapDisplay:val(pmap,'display'),propNodePosition:val(pnode,'position'),propButtonOutline:val(pbtn,'outline-style')+' '+val(pbtn,'outline-width')});
    }else if(chapter==='04'){
      const svg=node.querySelector('svg'),rect=node.querySelector('svg rect'),btn=node.querySelector('button');
      Object.assign(base,{svgDisplay:val(svg,'display'),rectFill:val(rect,'fill'),rectStroke:val(rect,'stroke'),buttonBorder:val(btn,'border-top-width')+' '+val(btn,'border-top-style')+' '+val(btn,'border-top-color')});
    }else if(chapter==='05'){
      const stage=node.querySelector('.releasegate__stage'),rect=node.querySelector('.rg-node rect'),deploy=node.querySelector('[data-output="deploy"]'),hold=node.querySelector('[data-output="hold"]'),mark=node.querySelector('[data-fail]'),btn=node.querySelector('button');
      Object.assign(base,{stageDisplay:val(stage,'display'),stageGrid:val(stage,'grid-template-columns'),rectFill:val(rect,'fill'),rectStroke:val(rect,'stroke'),deployStroke:val(deploy,'stroke'),deployDisplay:val(deploy,'display'),deployHidden:deploy?.hidden??null,holdStroke:val(hold,'stroke'),holdDisplay:val(hold,'display'),holdHidden:hold?.hidden??null,markDisplay:val(mark,'display'),markHidden:mark?.hidden??null,buttonBorder:val(btn,'border-top-width')+' '+val(btn,'border-top-style')+' '+val(btn,'border-top-color')});
    }
    return base;
  },item.chapter);
  rows.push({...item,status:response?.status()||null,diag});
}
await context.close();await browser.close();
await fs.writeFile(path.join(out,'style-diagnostics.json'),JSON.stringify({generated_at:new Date().toISOString(),rows},null,2));
console.log(JSON.stringify(rows,null,2));
