#!/usr/bin/env node
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base=(process.env.S5_PREVIEW_BASE||'http://127.0.0.1:8000').replace(/\/$/,'');
const browser=await chromium.launch({headless:true});

async function waitPlaying(page,selector){
  await page.waitForFunction((sel)=>{
    const video=document.querySelector(sel);
    return Boolean(video && (video.currentTime>0 || (!video.paused && video.readyState>=2)));
  },selector,{timeout:12000});
}

async function desktopFlow(){
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage();
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await page.goto(base+'/series/',{waitUntil:'networkidle',timeout:60000});
  const hub=page.locator('[data-sx-hub]');
  assert.equal(await hub.getAttribute('data-ready'),'true','series hub must enhance successfully');
  assert.equal(await hub.locator('[data-sx-detail]:visible').count(),0,'fallback series details must be hidden after enhancement');

  const cards=page.locator('[data-sx-card]');
  assert.equal(await cards.count(),13,'series catalogue must expose 13 cards');
  assert.equal(await page.locator('[data-sx-card] .sx-card-poster').count(),13,'every series needs a real poster cover');
  assert.equal(await page.locator('[data-sx-card] [data-sx-card-video][data-src]').count(),13,'every series needs a lazy motion preview');

  const previews=page.locator('[data-sx-card] [data-sx-card-video]');
  for(let i=0;i<await previews.count();i++){
    assert.equal(await previews.nth(i).locator('video').count(),0,'card previews must not create video elements before user intent');
    assert.match(await previews.nth(i).getAttribute('data-src'),/\.mp4$/);
  }

  const first=cards.first();
  await first.locator('.sx-card-art').hover();
  await page.waitForTimeout(250);
  const firstPreview=first.locator('[data-sx-card-video] .sx-card-preview');
  await firstPreview.waitFor({state:'attached'});
  assert.match((await firstPreview.getAttribute('src'))||'',/\.mp4$/,'hover should opt into only that preview');
  assert.equal(await firstPreview.evaluate(v=>v.muted),true,'preview must stay muted');

  await first.locator('.sx-card-open').click();
  await page.waitForTimeout(250);
  const detail=page.locator('#serie-fundamentos-ia-iag');
  await detail.waitFor({state:'visible'});
  assert.equal(await hub.locator('[data-sx-detail]:visible').count(),1,'only the selected series detail may be visible');
  assert.equal(await detail.locator('.sx-player-follow-placeholder').count(),0,'series follow-player DOM must not exist before Play');
  await detail.locator('.sx-back').click();
  await page.waitForTimeout(150);
  assert.equal(await hub.locator('[data-sx-detail]:visible').count(),0,'back to catalogue must hide the selected detail');
  await first.locator('.sx-card-open').click();
  await detail.waitFor({state:'visible'});
  const hubVideo=detail.locator('.sx-player video');
  await detail.locator('[data-sx-play]').click();
  await waitPlaying(page,'#serie-fundamentos-ia-iag .sx-player video');
  await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  await page.waitForTimeout(350);
  const floatingHub=detail.locator('.sx-player.is-following');
  assert.equal(await floatingHub.count(),1,'played series video should follow after leaving its source');
  assert.equal(await floatingHub.locator('.sx-follow-back').count(),1);
  assert.equal(await floatingHub.locator('.sx-follow-close').count(),1);

  await floatingHub.locator('.sx-follow-back').click();
  await page.waitForTimeout(450);
  assert.equal(await detail.locator('.sx-player.is-following').count(),0,'Back to video should restore the player');

  await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  await page.waitForTimeout(350);
  assert.equal(await detail.locator('.sx-player.is-following').count(),1,'player should follow again while playback continues');
  await detail.locator('.sx-follow-close').click();
  assert.equal(await detail.locator('.sx-player.is-following').count(),0,'close must dismiss the mini player');
  assert.equal(await hubVideo.evaluate(v=>v.paused),true,'closing the mini player must pause playback');

  await page.goto(base+'/series/fundamentos-ia-iag/01-que-es-ia/',{waitUntil:'networkidle',timeout:60000});
  assert.equal(await page.locator('.s5-follow-placeholder').count(),0,'inline follow-player DOM must not exist before Play');
  const inlineStart=page.locator('[data-s5-inline-video-start]').first();
  await inlineStart.click();
  await waitPlaying(page,'[data-s5-inline-video-player]');
  await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  await page.waitForTimeout(350);
  assert.equal(await page.locator('.s5-video-embed__frame.is-following').count(),1,'chapter video should become a follow player');
  await page.locator('.s5-video-embed__frame.is-following .s5-follow-close').click();

  await page.goto(base+'/series/',{waitUntil:'networkidle',timeout:60000});
  const progress=page.locator('[data-series-slug="fundamentos-ia-iag"] [data-sx-progress]');
  assert.equal(await progress.isVisible(),true,'reading a chapter should expose local progress');
  assert.equal((await progress.locator('[data-sx-progress-label]').innerText()).trim(),'1/4');

  await page.goto(base+'/videos/series/fundamentos-ia-iag/00_presentacion_serie/',{waitUntil:'networkidle',timeout:60000});
  assert.equal(await page.locator('.s5-follow-placeholder').count(),0,'watch follow-player DOM must not exist before playback');
  const seek=page.locator('[data-s5-video-seek]').first();
  if(await seek.count()){
    await seek.click();
    await waitPlaying(page,'[data-s5-watch-player]');
    await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
    await page.waitForTimeout(350);
    assert.equal(await page.locator('.s5-video-watch__player.is-following').count(),1,'watch page player should follow after user playback');
    await page.locator('.s5-video-watch__player.is-following .s5-follow-close').click();
  }

  assert.deepEqual(pageErrors,[],'desktop flow must not emit runtime errors');
  await context.close();
}

async function mobileFlow(){
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage();
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await page.goto(base+'/series/',{waitUntil:'networkidle',timeout:60000});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'series catalogue must not overflow at 390px');
  assert.equal(await page.locator('[data-sx-card] .sx-card-poster').count(),13);

  await page.locator('[data-series-slug="fundamentos-ia-iag"] .sx-card-open').click();
  await page.locator('#serie-fundamentos-ia-iag [data-sx-play]').click();
  await waitPlaying(page,'#serie-fundamentos-ia-iag .sx-player video');
  await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  await page.waitForTimeout(350);
  const floating=page.locator('#serie-fundamentos-ia-iag .sx-player.is-following');
  assert.equal(await floating.count(),1,'mobile series player should follow');
  const box=await floating.boundingBox();
  assert.ok(box && box.x>=0 && box.x+box.width<=391 && box.width<=366,'mobile follow player must fit the viewport');
  await floating.locator('.sx-follow-close').click();
  assert.deepEqual(pageErrors,[],'mobile flow must not emit runtime errors');
  await context.close();
}

async function reducedMotionFlow(){
  const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});
  const page=await context.newPage();
  await page.goto(base+'/series/',{waitUntil:'networkidle',timeout:60000});
  const first=page.locator('[data-sx-card]').first();
  await first.locator('.sx-card-art').hover();
  await page.waitForTimeout(250);
  assert.equal(await first.locator('[data-sx-card-video] video').count(),0,'reduced motion must not instantiate cover motion previews');
  await context.close();
}

try{
  await desktopFlow();
  await mobileFlow();
  await reducedMotionFlow();
  console.log('SERIES_COVERS_FOLLOW_PLAYER_PASS 13 covers, lazy previews, progress, desktop/mobile follow player, reduced motion');
}finally{
  await browser.close();
}
