#!/usr/bin/env node
/**
 * Exhaustive rendered-state evidence for every Security02-05 teaching visual.
 * Captures each innermost teaching visual at its initial state and after every
 * meaningful teaching control, in ES/EN × desktop/mobile × normal/reduced.
 * Fullscreen shell controls are presentation chrome and are excluded. Stateful
 * controls whose action disables siblings (for example the kill path) are
 * captured as independent scenarios instead of one destructive cumulative walk.
 * This is evidence only: manual PIXEL_REVIEW/PEDAGOGY_REVIEW remains required.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const out = path.resolve('artifacts/security-requalification/security-02-05-browser-fast');
const shots = path.join(out, 'all-visual-states');
await fs.mkdir(shots, { recursive: true });
const routes = [
  { chapter:'02', locale:'es', route:'/series/seguridad-ia/02-jailbreaks/' },
  { chapter:'02', locale:'en', route:'/en/series/seguridad-ia/02-jailbreaks/' },
  { chapter:'03', locale:'es', route:'/series/seguridad-ia/03-envenenamiento/' },
  { chapter:'03', locale:'en', route:'/en/series/seguridad-ia/03-envenenamiento/' },
  { chapter:'04', locale:'es', route:'/series/seguridad-ia/04-red-teaming/' },
  { chapter:'04', locale:'en', route:'/en/series/seguridad-ia/04-red-teaming/' },
  { chapter:'05', locale:'es', route:'/series/seguridad-ia/05-controles-produccion/' },
  { chapter:'05', locale:'en', route:'/en/series/seguridad-ia/05-controles-produccion/' },
];
const specs = [
  { name:'desktop-normal', width:1440, height:1000, mobile:false, reducedMotion:'no-preference' },
  { name:'desktop-reduced', width:1440, height:1000, mobile:false, reducedMotion:'reduce' },
  { name:'mobile-normal', width:390, height:844, mobile:true, reducedMotion:'no-preference' },
  { name:'mobile-reduced', width:390, height:844, mobile:true, reducedMotion:'reduce' },
];
const failures = [], records = [];
const safe = s => String(s).replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-|-$/g,'');
async function capture(root, file) {
  await root.evaluate(node => node.scrollIntoView({block:'center', inline:'nearest'}));
  await new Promise(r => setTimeout(r, 50));
  await root.screenshot({path:file, animations:'disabled'});
}
async function activate(button, mobile) {
  await button.scrollIntoViewIfNeeded();
  if (mobile) await button.tap({timeout:3000}); else await button.click({timeout:3000});
  await new Promise(r => setTimeout(r, 100));
}
async function visualRoots(page) {
  // animation-shell wraps the real visual in another data-anim-fullscreen node.
  // Keep only the innermost node so each pedagogical mechanism is counted once.
  return page.locator('article [data-anim-fullscreen="on"]:not(:has([data-anim-fullscreen="on"]))');
}
async function rootIdentity(root, index) {
  return root.evaluate((node,i) => ({index:i,id:node.id||null,classes:[...node.classList],tag:node.tagName.toLowerCase()}),index);
}
async function captureKillPath(page, rootIndex, ctx, spec, key, captures) {
  // Each kill action is a separate counterfactual from a fresh active run.
  // Clicking one kill control intentionally disables its siblings, so a generic
  // cumulative button walk would miss valid states.
  const scenarios = ['credential','cancel','readonly','rollback'];
  for (const scenario of scenarios) {
    await page.reload({waitUntil:'networkidle',timeout:20000});
    const roots = await visualRoots(page);
    const root = roots.nth(rootIndex);
    const start = root.locator('[data-start]').first();
    const target = root.locator(`[data-kill="${scenario}"]`).first();
    if (!(await start.count()) || !(await target.count())) throw new Error(`kill-path scenario controls missing: ${scenario}`);
    await activate(start,spec.mobile);
    await page.waitForTimeout(100);
    if (!(await target.isEnabled())) throw new Error(`kill-path target did not enable: ${scenario}`);
    await activate(target,spec.mobile);
    const file = path.join(shots,`${safe(ctx)}-${String(rootIndex).padStart(2,'0')}-${safe(key)}-kill-${scenario}.png`);
    await capture(root,file); captures.push(path.relative(process.cwd(),file));
  }
  // A no-intervention run is the counterexample: allow it to reach commit.
  await page.reload({waitUntil:'networkidle',timeout:20000});
  const roots = await visualRoots(page);
  const root = roots.nth(rootIndex);
  const start = root.locator('[data-start]').first();
  await activate(start,spec.mobile);
  await page.waitForTimeout(spec.reducedMotion==='reduce'?3900:4100);
  const file = path.join(shots,`${safe(ctx)}-${String(rootIndex).padStart(2,'0')}-${safe(key)}-commit-without-kill.png`);
  await capture(root,file); captures.push(path.relative(process.cwd(),file));
}

const browser = await chromium.launch({headless:true});
for (const item of routes) {
  for (const spec of specs) {
    const ctx = `${item.locale}-security${item.chapter}-${spec.name}`;
    const context = await browser.newContext({viewport:{width:spec.width,height:spec.height},hasTouch:spec.mobile,isMobile:spec.mobile,reducedMotion:spec.reducedMotion,colorScheme:'light'});
    const page = await context.newPage();
    const runtime = [];
    page.on('pageerror', e => runtime.push({type:'pageerror',detail:String(e)}));
    page.on('console', m => { if (m.type()==='error') runtime.push({type:'console',detail:m.text()}); });
    page.on('requestfailed', q => runtime.push({type:'requestfailed',url:q.url(),detail:q.failure()?.errorText||'unknown'}));
    page.on('response', r => { if (r.status()>=400) runtime.push({type:'http',status:r.status(),url:r.url()}); });
    try {
      const response = await page.goto(new URL(item.route,base).href,{waitUntil:'networkidle',timeout:20000});
      if (!response?.ok()) failures.push({ctx,type:'navigation',status:response?.status()});
      await page.locator('article').waitFor({state:'visible',timeout:5000});
      let roots = await visualRoots(page);
      const rootCount = await roots.count();
      if (!rootCount) failures.push({ctx,type:'no_visual_roots'});
      const visualRecords = [];
      for (let i=0;i<rootCount;i++) {
        roots = await visualRoots(page);
        let root = roots.nth(i);
        let identity = {index:i,id:null,classes:[],tag:'unknown'};
        try {
          identity = await rootIdentity(root,i);
          const key = identity.id || identity.classes[0] || `visual-${i}`;
          const captures = [];
          let file = path.join(shots,`${safe(ctx)}-${String(i).padStart(2,'0')}-${safe(key)}-start.png`);
          await capture(root,file); captures.push(path.relative(process.cwd(),file));

          const excludedUiButtons = await root.locator('button[data-anim-shell-open]:visible').count();
          const isKillPath = identity.classes.includes('killpath');
          let buttonCount = await root.locator('button:not([data-anim-shell-open]):visible').count();
          if (isKillPath) {
            await captureKillPath(page,i,ctx,spec,key,captures);
            roots = await visualRoots(page);
            root = roots.nth(i);
          } else if (buttonCount) {
            const buttons = root.locator('button:not([data-anim-shell-open]):visible');
            for (let j=0;j<buttonCount;j++) {
              const button = buttons.nth(j);
              const label = ((await button.getAttribute('aria-label')) || (await button.textContent()) || `button-${j}`).replace(/\s+/g,' ').trim().slice(0,60);
              if (!(await button.isEnabled())) {
                failures.push({ctx,type:'disabled_teaching_control_unhandled',visual:key,control:label});
                continue;
              }
              await activate(button,spec.mobile);
              file = path.join(shots,`${safe(ctx)}-${String(i).padStart(2,'0')}-${safe(key)}-after-${String(j).padStart(2,'0')}-${safe(label)}.png`);
              await capture(root,file); captures.push(path.relative(process.cwd(),file));
            }
          } else {
            await page.waitForTimeout(spec.reducedMotion==='reduce'?120:700);
            file = path.join(shots,`${safe(ctx)}-${String(i).padStart(2,'0')}-${safe(key)}-mid.png`);
            await capture(root,file); captures.push(path.relative(process.cwd(),file));
            await page.waitForTimeout(spec.reducedMotion==='reduce'?120:1000);
            file = path.join(shots,`${safe(ctx)}-${String(i).padStart(2,'0')}-${safe(key)}-final.png`);
            await capture(root,file); captures.push(path.relative(process.cwd(),file));
          }
          visualRecords.push({...identity,key,buttonCount,excludedUiButtons,scenarioMode:isKillPath?'independent-kill-counterfactuals':'standard',captures});
        } catch (error) {
          failures.push({ctx,type:'visual_exception',visual:identity,detail:String(error?.stack||error)});
          visualRecords.push({...identity,error:String(error?.stack||error)});
        }
      }
      const geometry = await page.evaluate(() => ({viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth}));
      if (geometry.scrollWidth>geometry.viewport+2 || geometry.bodyWidth>geometry.viewport+2) failures.push({ctx,type:'overflow',geometry});
      if (runtime.length) failures.push({ctx,type:'runtime',runtime});
      records.push({...item,...spec,ctx,rootCount,geometry,visuals:visualRecords,runtime});
    } catch (error) {
      failures.push({ctx,type:'exception',detail:String(error?.stack||error)});
    }
    await context.close();
  }
}
await browser.close();
await fs.writeFile(path.join(out,'all-visual-states-report.json'),JSON.stringify({generated_at:new Date().toISOString(),contract:'each innermost teaching visual × every meaningful control/counterfactual or timed initial/mid/final; fullscreen presentation chrome excluded; destructive controls captured independently; manual PIXEL/PEDAGOGY required',contexts:records.length,failures,records},null,2));
console.log(`SECURITY02_05_ALL_VISUAL_STATES contexts=${records.length} failures=${failures.length}`);
if (failures.length) { for (const f of failures) console.error('FAIL',JSON.stringify(f)); process.exit(1); }
console.log('PASS exhaustive Security02-05 teaching-visual state capture.');
