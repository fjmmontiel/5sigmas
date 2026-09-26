import {chromium} from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {startVideoPreview} from './video_preview_server.mjs';
const requestedOrigin=(process.env.S5_C3_ORIGIN||'http://127.0.0.1:8000').replace(/\/$/,'');
const manifest=JSON.parse(fs.readFileSync('docs/evaluation-c3-release.json','utf8'));
const preview=['127.0.0.1','localhost'].includes(new URL(requestedOrigin).hostname);
// Python's basic http.server ignores Range. Use the actual build with proper byte ranges;
// production requests are never proxied, intercepted or replaced.
const previewServer=preview?await startVideoPreview('site'):null;
const origin=previewServer?.origin||requestedOrigin;
const browser=await chromium.launch({channel:'chrome',headless:true});const rows=[];
const report={status:'IN_PROGRESS',scope:'48 native route/viewport interaction probes, not full-duration viewings',requestedOrigin,origin,preview,browser:browser.version(),channel:'chrome',rows};
const save=()=>fs.writeFileSync('/tmp/evaluation-c3-browser.json',JSON.stringify(report,null,2));
try {
  const diagnostic=await browser.newPage();
  report.codecSupport=await diagnostic.evaluate(()=>({h264:document.createElement('video').canPlayType('video/mp4; codecs="avc1.64002a"'),agent:navigator.userAgent}));
  console.log('NATIVE_CODEC_PREFLIGHT',JSON.stringify(report.codecSupport));
  assert.ok(report.codecSupport.h264,'Browser lacks the codec required by the approved MP4');await diagnostic.close();
  for(const width of [1440,390]) {
    const context=await browser.newContext({viewport:{width,height:width===390?844:1000}});
    if(preview)await context.route('https://5sigmas.com/**',async route=>{
      const u=new URL(route.request().url());
      await route.fulfill({response:await route.fetch({url:new URL(u.pathname+u.search,origin).href})});
    });
    for(const object of manifest.objects)for(const kind of ['article','watch']) {
      const page=await context.newPage();const network=[];
      page.on('requestfailed',r=>network.push({url:r.url(),failure:r.failure()}));
      page.on('response',r=>{if(r.status()>=400)network.push({url:r.url(),status:r.status()});});
      const label={locale:object.locale,route:object[kind],kind,viewport:width};
      console.log('CHECK C3',JSON.stringify(label));
      try {
        const response=await page.goto(`${origin}/${object[kind]}`,{waitUntil:'networkidle',timeout:60000});assert.equal(response.status(),200);
        const selector=kind==='watch'?'video[data-s5-watch-player]':'video[data-s5-inline-video-player]';
        const video=page.locator(selector).first();await video.waitFor({state:'attached'});
        await video.evaluate(v=>{v.muted=true;window.__c3Ended=0;v.addEventListener('ended',()=>{window.__c3Ended++;});});
        const source=await video.locator('source').first().getAttribute('src');
        assert.equal(new URL(source,page.url()).pathname,'/'+object.path,'declared source path');
        const mediaResponse=await page.request.get(`${origin}/${object.path}`,{headers:{Range:'bytes=0-1023'}});
        assert.equal(mediaResponse.status(),206,'Native media origin must support byte ranges');
        assert.match(mediaResponse.headers()['content-range'],/^bytes 0-1023\/\d+$/);
        assert.equal((await mediaResponse.body()).length,1024);
        if(kind==='article') {
          await page.locator('[data-s5-inline-video][data-s5-inline-video-ready="true"]').waitFor({state:'attached'});
          await page.locator('[data-s5-inline-video-start]').first().click();
        } else {
          await video.scrollIntoViewIfNeeded();
          await video.evaluate(v=>{v.preload='auto';v.load();const p=v.play();if(p)p.catch(e=>{window.__c3PlayError=String(e);});});
        }
        await video.waitFor({state:'visible'});
        await page.waitForFunction(s=>{const v=document.querySelector(s);return !!v&&v.readyState>=2&&v.videoWidth>0&&v.currentTime>0;},selector,{timeout:25000});
        const meta=await video.evaluate(v=>{v.pause();return {duration:v.duration,width:v.videoWidth,height:v.videoHeight,src:v.currentSrc,started:v.currentTime>0};});
        assert.equal(meta.width,1920);assert.equal(meta.height,1080);assert.ok(Math.abs(meta.duration-object.duration)<.025);assert.equal(new URL(meta.src).pathname,'/'+object.path);
        const result=await video.evaluate(async(v,target)=>{
          const seek=async t=>{
            if(!v.seeking&&Math.abs(v.currentTime-t)<.005)return;
            await new Promise((resolve,reject)=>{
              const timer=setTimeout(()=>reject(new Error('seek timeout '+t)),10000);
              const done=()=>{clearTimeout(timer);resolve();};v.addEventListener('seeked',done,{once:true});v.currentTime=t;
            });
            if(Math.abs(v.currentTime-t)>.1)throw new Error(`inexact seek: wanted ${t}, got ${v.currentTime}; seekable ${Array.from({length:v.seekable.length},(_,i)=>[v.seekable.start(i),v.seekable.end(i)])}`);
          };
          await seek(target);const chapter=v.currentTime;
          const endedBefore=window.__c3Ended;await seek(v.duration-.25);await v.play();
          const deadline=performance.now()+10000;
          while(window.__c3Ended===endedBefore){if(performance.now()>deadline)throw new Error('ended event timeout');await new Promise(r=>setTimeout(r,30));}
          v.pause();return {chapter,endedEvent:true,error:v.error?.code??null};
        },object.chapters[2].start);
        if(kind==='article')await page.locator('[data-s5-inline-video-start]').first().click();
        else await video.evaluate(async v=>{v.currentTime=.001;await v.play();});
        await page.waitForFunction(s=>{const v=document.querySelector(s);return v.currentTime>.05&&!v.paused;},selector,{timeout:10000});
        await video.evaluate(v=>v.pause());const paused=await video.evaluate(v=>v.paused);assert.ok(paused&&!result.error);
        const layout=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(layout.scroll<=layout.width+2,'horizontal overflow '+JSON.stringify(layout));
        rows.push({...label,...meta,...result,replay:true,paused,rangeStatus:mediaResponse.status(),status:'PASS'});save();console.log('PASS C3',JSON.stringify(label));
      }catch(e){
        report.status='FAIL';report.failure={...label,message:String(e),network,media:await page.locator('video').evaluateAll(vs=>vs.map(v=>({src:v.currentSrc,declared:v.outerHTML.slice(0,1800),ready:v.readyState,network:v.networkState,error:v.error?.code,paused:v.paused,time:v.currentTime,playError:window.__c3PlayError,seekable:Array.from({length:v.seekable.length},(_,i)=>[v.seekable.start(i),v.seekable.end(i)])}))).catch(()=>[])};save();console.error(JSON.stringify(report.failure));throw e;
      }finally{await page.close();}
    }
    await context.close();
  }
  assert.equal(rows.length,48);report.status='PASS';save();console.log('C3_NATIVE_BROWSER_PASS 48/48 desktop/mobile article/watch cases');
}finally{await browser.close();if(previewServer)await previewServer.close();}
