#!/usr/bin/env node
/** Exact whole-article pixel evidence for Security02-05; editorial PIXEL/PEDAGOGY remains manual. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_BASE || 'http://127.0.0.1:8000';
const out = path.resolve('artifacts/security-requalification/security-02-05-browser-fast');
const shots = path.join(out, 'full-pages');
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
const safe = s => s.replace(/[^a-zA-Z0-9_-]+/g, '-');
const browser = await chromium.launch({ headless:true });
for (const item of routes) {
  for (const spec of specs) {
    const ctx = `${item.locale}-security${item.chapter}-${spec.name}`;
    const context = await browser.newContext({
      viewport:{ width:spec.width, height:spec.height }, hasTouch:spec.mobile, isMobile:spec.mobile,
      reducedMotion:spec.reducedMotion, colorScheme:'light'
    });
    const page = await context.newPage();
    const runtime = [];
    page.on('pageerror', e => runtime.push({type:'pageerror', detail:String(e)}));
    page.on('console', m => { if (m.type()==='error') runtime.push({type:'console', detail:m.text()}); });
    page.on('requestfailed', q => runtime.push({type:'requestfailed', url:q.url(), detail:q.failure()?.errorText||'unknown'}));
    page.on('response', r => { if (r.status()>=400) runtime.push({type:'http', status:r.status(), url:r.url()}); });
    try {
      const response = await page.goto(new URL(item.route, base).href, { waitUntil:'networkidle', timeout:20000 });
      if (!response?.ok()) failures.push({ctx, type:'navigation', status:response?.status()});
      await page.locator('article').waitFor({state:'visible', timeout:5000});
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForTimeout(80);
      const geometry = await page.evaluate(() => ({viewport:innerWidth, scrollWidth:document.documentElement.scrollWidth, bodyWidth:document.body.scrollWidth, height:document.documentElement.scrollHeight}));
      if (geometry.scrollWidth > geometry.viewport + 2 || geometry.bodyWidth > geometry.viewport + 2) failures.push({ctx, type:'overflow', geometry});
      const file = path.join(shots, `${safe(ctx)}-full-page.png`);
      await page.screenshot({path:file, fullPage:true, animations:'disabled'});
      if (runtime.length) failures.push({ctx, type:'runtime', runtime});
      records.push({...item, ...spec, ctx, geometry, screenshot:path.relative(process.cwd(),file), runtime});
    } catch (error) {
      failures.push({ctx, type:'exception', detail:String(error?.stack||error)});
    }
    await context.close();
  }
}
await browser.close();
await fs.writeFile(path.join(out,'fullpage-report.json'), JSON.stringify({generated_at:new Date().toISOString(), contract:'whole-article exact pixel evidence only; all pre-teardown runtime/resource failures fail closed; manual PIXEL/PEDAGOGY required', contexts:records.length, failures, records}, null, 2));
console.log(`SECURITY02_05_FULLPAGE contexts=${records.length} failures=${failures.length}`);
if (failures.length) { for (const f of failures) console.error('FAIL', JSON.stringify(f)); process.exit(1); }
console.log('PASS exact whole-article captures for Security02-05.');
