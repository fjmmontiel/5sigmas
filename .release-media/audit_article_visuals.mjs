import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const base='https://5sigmas.com', root=path.resolve('audit-source'), out=path.resolve('/tmp/article-animation-audit');
const series=['seguridad-ia','agentes-ia','agentes-voz-tiempo-real','coding-agents-agent-harnesses','context-engineering-memory-mcp','llm-inference-engineering-economics','evaluating-ai-systems-production'];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
await fs.mkdir(out,{recursive:true});
const pages=[];
for(const s of series){
  const dir=path.join(root,'docs/series',s);
  for(const name of (await fs.readdir(dir)).filter(n=>n.endsWith('.md')).sort()){
    const source=await fs.readFile(path.join(dir,name),'utf8');const includes=[...source.matchAll(/include_html\(["']([^"']+)["']/g)].map(m=>m[1]).filter(p=>!p.endsWith('series_meta.html'));
    const modules=[];
    for(const p of includes){
      const html=await fs.readFile(path.join(root,'docs',p),'utf8');const match=html.match(/<(?:section|div)\b[^>]*class="([^"]+)"/);if(!match)throw new Error('Missing module root '+p);
      const classes=match[1].split(/\s+/);const selector='.'+(classes[0]==='s5v'?classes[1]:classes[0]);
      modules.push({source:p,source_sha256:sha(html),selector,static_contract:html.includes('static:no-cosmetic-controls'),source_svg_labels:(html.match(/<text\b/g)||[]).length});
    }
    pages.push({series:s,slug:name.slice(0,-3),modules});
  }
}
if(pages.length!==42)throw new Error('Expected42articlepages');
const tasks=[];
for(const pg of pages)for(const width of [1440,390])tasks.push({...pg,width,locale:'es'});
for(const s of series){const pg=pages.find(p=>p.series===s&&p.modules.length);for(const width of [1440,390])tasks.push({...pg,width,locale:'en'});}
const browser=await chromium.launch({headless:true});const records=[];
async function inspect(task){
 const context=await browser.newContext({viewport:{width:task.width,height:task.width===390?844:1000},isMobile:task.width===390,hasTouch:task.width===390,reducedMotion:'no-preference'});
 const page=await context.newPage();page.setDefaultTimeout(12000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const route=(task.locale==='en'?'/en':'')+'/series/'+task.series+'/'+task.slug+'/';const rec={...task,route,modules:[],errors};
 try{
   const response=await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:45000});rec.http=response?.status();await page.waitForTimeout(650);await page.evaluate(()=>document.querySelectorAll('video').forEach(v=>v.pause()));
   rec.h1=await page.locator('main h1').first().innerText().catch(()=>null);
   rec.page_width=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
   for(let i=0;i<task.modules.length;i++){
     const mod=task.modules[i], node=page.locator(mod.selector).first(), item={...mod,samples:[]};rec.modules.push(item);
     if(!await node.count()){item.error='MODULE_NOT_FOUND';continue;}
     await node.scrollIntoViewIfNeeded();await page.waitForTimeout(400);
     const stem=task.series+'__'+task.slug+'__'+task.locale+'__'+task.width+'__'+i;
     async function sample(label){
       const data=await node.evaluate(el=>{
         const r=el.getBoundingClientRect();const visible=e=>{const b=e.getBoundingClientRect(),s=getComputedStyle(e);return b.width>0&&b.height>0&&s.display!=='none'&&s.visibility!=='hidden';};
         const texts=[...el.querySelectorAll('svg text')].filter(visible).map(t=>{const b=t.getBoundingClientRect(),m=t.getScreenCTM();return{text:t.textContent.trim(),x:b.x-r.x,y:b.y-r.y,width:b.width,height:b.height,pixels:parseFloat(getComputedStyle(t).fontSize)*Math.hypot(m?.a||1,m?.b||0)};});
         const overlaps=[];for(let a=0;a<texts.length;a++)for(let b=a+1;b<texts.length;b++){const x=texts[a],y=texts[b];if(Math.min(x.x+x.width,y.x+y.width)-Math.max(x.x,y.x)>2&&Math.min(x.y+x.height,y.y+y.height)-Math.max(x.y,y.y)>2)overlaps.push([a,b]);}
         return{width:r.width,height:r.height,text:el.innerText,svg_text:texts,possible_text_overlap_pairs:overlaps,controls:[...el.querySelectorAll('button,input,select')].filter(visible).map(b=>({tag:b.tagName,text:(b.innerText||b.getAttribute('aria-label')||'').trim(),role:b.getAttribute('role'),pressed:b.getAttribute('aria-pressed'),selected:b.getAttribute('aria-selected'),value:b.value})),scrollers:[...el.querySelectorAll('*')].filter(e=>visible(e)&&e.scrollWidth>e.clientWidth+4&&['auto','scroll'].includes(getComputedStyle(e).overflowX)).map(e=>({class:e.className,client:e.clientWidth,scroll:e.scrollWidth,left:e.scrollLeft,visible_fraction:e.clientWidth/e.scrollWidth})),running_animations:el.getAnimations({subtree:true}).length,dataset:{...el.dataset}};
       });
       const file=stem+'__'+label+'.jpg';await node.screenshot({path:path.join(out,file),type:'jpeg',quality:82,timeout:20000});item.samples.push({label,file,...data});
     }
     await sample('initial');
     if(task.locale==='es'){
       const buttons=node.locator('button');const count=await buttons.count();const indices=[...new Set([0,count-1])];
       for(const b of indices){if(b<0)continue;const button=buttons.nth(b);if(!await button.isVisible()||!await button.isEnabled())continue;const label=(await button.innerText()).trim();const aria=await button.getAttribute('aria-label')||'';if(/fullscreen|expand|pantalla|contraste|ampliar/i.test(label+' '+aria))continue;
         try{await button.click();await page.waitForTimeout(900);await sample('button-'+b);}catch(e){item.samples.push({label:'button-'+b,error:String(e).slice(0,300)});}
       }
       if(task.width===390){const scroller=node.locator('[role="region"]').filter({visible:true}).first();if(await scroller.count()){
         const geom=await scroller.evaluate(e=>({c:e.clientWidth,s:e.scrollWidth,l:e.scrollLeft}));if(geom.s>geom.c+4){await scroller.hover();await page.mouse.wheel(1600,0);await page.waitForTimeout(450);await sample('horizontal-pan');}
       }}
     }
   }
 }catch(e){rec.error=String(e).slice(0,600);}finally{await context.close();records.push(rec);await fs.writeFile(path.join(out,'report.json'),JSON.stringify({source_ref:'6209a852b804338e31b95f06bdf604baeb04cf40',scope:'42 ES articles at desktop/mobile plus one EN article per series at both widths; source-linked snapshots and bounded real control interactions; not a comprehension user study or exhaustive state certification',records},null,2));console.log('AUDIT',task.locale,task.width,task.series,task.slug,rec.http,rec.error||'OK');}
}
try{let cursor=0;await Promise.all([0,1].map(async()=>{while(cursor<tasks.length){const task=tasks[cursor++];await inspect(task);}}));}finally{await browser.close();}
const failed=records.filter(r=>r.error||r.http!==200);console.log(JSON.stringify({article_view_cases:records.length,failed:failed.length,root_snapshots:records.reduce((n,r)=>n+r.modules.reduce((m,x)=>m+x.samples.filter(s=>s.file).length,0),0)}));
