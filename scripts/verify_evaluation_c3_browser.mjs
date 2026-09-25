import {chromium} from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const origin=(process.env.S5_C3_ORIGIN||'http://127.0.0.1:8000').replace(/\/$/,'');
const manifest=JSON.parse(fs.readFileSync('docs/evaluation-c3-release.json','utf8'));
const browser=await chromium.launch({headless:true});const rows=[];
try {
 for(const width of [1440,390]) {
  const context=await browser.newContext({viewport:{width,height:width===390?844:1000}});
  for(const object of manifest.objects) {
   for(const kind of ['article','watch']) {
    const page=await context.newPage();
    const response=await page.goto(`${origin}/${object[kind]}`,{waitUntil:'domcontentloaded',timeout:60000});assert.equal(response.status(),200);
    const locator=page.locator(kind==='watch'?'video[data-s5-watch-player]':'.s5-video-embed video').first();await locator.waitFor({state:'attached'});
    const meta=await locator.evaluate(async(v)=>{
     v.muted=true;v.preload='auto';v.load();
     await new Promise((resolve,reject)=>{
      if(v.readyState>=1)return resolve();
      const timer=setTimeout(()=>reject(new Error('metadata timeout')),20000);
      v.addEventListener('loadedmetadata',()=>{clearTimeout(timer);resolve();},{once:true});
      v.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('media error '+v.error?.code));},{once:true});
     });return {duration:v.duration,width:v.videoWidth,height:v.videoHeight,src:v.currentSrc};
    });
    assert.equal(meta.width,1920);assert.equal(meta.height,1080);assert.ok(Math.abs(meta.duration-object.duration)<.025);assert.equal(new URL(meta.src).pathname,'/'+object.path);
    const result=await locator.evaluate(async(v,target)=>{
     const seek=async(t)=>{
      const done=new Promise((resolve,reject)=>{
       const timer=setTimeout(()=>reject(new Error('seek timeout '+t)),10000);
       v.addEventListener('seeked',()=>{clearTimeout(timer);resolve();},{once:true});
      });v.currentTime=t;await done;if(Math.abs(v.currentTime-t)>.1)throw new Error('inexact seek');
     };
     await v.play();await new Promise(r=>setTimeout(r,180));v.pause();const started=v.currentTime>0;
     await seek(target);const chapter=v.currentTime;await seek(v.duration-.25);await v.play();
     await new Promise((resolve,reject)=>{
      if(v.ended)return resolve();const timer=setTimeout(()=>reject(new Error('end timeout')),10000);
      v.addEventListener('ended',()=>{clearTimeout(timer);resolve();},{once:true});
     });
     await seek(.001);await v.play();await new Promise(r=>setTimeout(r,120));v.pause();
     return {started,chapter,ended:true,replay:v.currentTime>0,paused:v.paused,error:v.error?.code??null};
    },object.chapters[2].start);
    assert.ok(result.started&&result.replay&&result.paused&&!result.error);
    const layout=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(layout.scroll<=layout.width+2,'horizontal overflow '+JSON.stringify(layout));
    rows.push({locale:object.locale,route:object[kind],kind,viewport:width,...meta,...result,status:'PASS'});
    console.log('PASS C3 native playback/seek/pause/end/replay:',width,kind,object.locale,object.path);await page.close();
   }
  }await context.close();
 }
}finally{await browser.close();}
assert.equal(rows.length,48);
fs.writeFileSync('/tmp/evaluation-c3-browser.json',JSON.stringify({status:'PASS',scope:'48 route/viewport playback probes, not48 full-duration viewings',origin,rows},null,2));
console.log('C3_NATIVE_BROWSER_PASS 48/48 desktop/mobile article/watch cases');
