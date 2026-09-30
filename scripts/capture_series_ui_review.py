"""Actual browser evidence for every redesigned series and advanced chapter.

No generated images, DOM content replacement or screenshot-specific CSS.
Component crops retain exactly the pixels of the normal rendered full page.
"""
from __future__ import annotations
import argparse,hashlib,io,json,math,os,subprocess
from datetime import datetime,timezone
from pathlib import Path
from bs4 import BeautifulSoup
from PIL import Image
from playwright.sync_api import sync_playwright, expect
BASE_SHA='6209a852b804338e31b95f06bdf604baeb04cf40'

def run(args):
 out=args.output;out.mkdir(parents=True,exist_ok=True)
 report={'baseline_sha':BASE_SHA,'candidate_sha':os.getenv('REVIEW_HEAD_SHA','local-uncommitted'),'captured_at':datetime.now(timezone.utc).isoformat(),'method':'Exact source builds served on separate localhost ports in GitHub Actions. Playwright driving installed Google Chrome (codec-capable). Component images are pixel crops of full-page captures; no DOM/style substitution. Live production is a separately labelled reference.','captures':[],'checks':[],'errors':[],'console_errors':[],'baseline_console_errors':[],'live_reference_errors':[],'inventory':[]}
 hub=BeautifulSoup((args.site/'series/index.html').read_text(),'lxml')
 series=[]
 for i,detail in enumerate(hub.select('[data-sx-detail]'),1):
  chapters=[]
  for j,c in enumerate(detail.select('[data-sx-chapter-url]'),1):
   route=c['data-sx-chapter-url'];source=BeautifulSoup((args.site/route.strip('/')/'index.html').read_text(),'lxml');g=source.select_one('[data-sx-guide]')
   chapters.append({'number':j,'route':route,'title':c.select_one('h3').get_text(' ',strip=True),'view':g.get('data-view') if g else None})
  original=detail.select_one('.sx-original-intro')
  series.append({'number':i,'id':detail['id'],'title':detail.select_one('.sx-detail-heading h2').get_text(' ',strip=True),'before':original['href'] if original else chapters[0]['route'],'chapters':chapters})
 report['inventory']=series
 def save(): (out/'manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 def check(name,ok,detail=None):
  report['checks'].append({'name':name,'pass':bool(ok),'detail':detail});save()
 def safe(name,fn):
  try: fn()
  except Exception as e: report['errors'].append({'name':name,'error':str(e)[:1600]});save();print('ERROR',name,str(e)[:200],flush=True)
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True, channel='chrome')
  report['browser']={'channel':'chrome','version':browser.version}
  def context(width=1440,height=1000,**kw):
   return browser.new_context(viewport={'width':width,'height':height},device_scale_factor=1,reduced_motion='reduce',locale='es-ES',**kw)
  def page_for(ctx,baseline=False):
   p=ctx.new_page();p.set_default_timeout(15000)
   p.on('pageerror',lambda e: report['baseline_console_errors' if baseline else 'console_errors'].append({'url':p.url,'error':str(e)}))
   return p
  def goto(p,url):
   r=p.goto(url,wait_until='networkidle',timeout=60000)
   if r and r.status>=400: raise RuntimeError(f'{r.status} {url}')
   p.evaluate('document.fonts.ready');p.wait_for_timeout(120)
  def capture(p,name,kind,selector=None,full=False,**metadata):
   path=out/(name+'.png')
   if full:
    p.evaluate("async()=>{for(let y=0;y<document.body.scrollHeight;y+=750){scrollTo(0,y);await new Promise(r=>setTimeout(r,15));}scrollTo(0,0);}")
    p.wait_for_timeout(150)
   bounds=None
   if selector:
    p.evaluate("scrollTo({top:0,left:0,behavior:'instant'})");p.wait_for_timeout(80)
    el=p.locator(selector).first;el.wait_for(state='visible');b=el.bounding_box()
    if not b: raise RuntimeError(f'Missing bounds {selector}')
    with Image.open(io.BytesIO(p.screenshot(full_page=True,animations='disabled'))) as image:
     bounds=(max(0,math.floor(b['x'])),max(0,math.floor(b['y'])),min(image.width,math.ceil(b['x']+b['width'])),min(image.height,math.ceil(b['y']+b['height'])))
     if bounds[2]<=bounds[0] or bounds[3]<=bounds[1]: raise RuntimeError(str(bounds))
     image.crop(bounds).save(path)
   else: p.screenshot(path=str(path),full_page=full,animations='disabled')
   style=p.evaluate("()=>{const h=document.querySelector('h1'),bar=document.querySelector('.md-header');return {bodyFont:getComputedStyle(document.body).fontFamily,headingFont:h?getComputedStyle(h).fontFamily:null,headerBackground:bar?getComputedStyle(bar).backgroundColor:null,scheme:document.body.dataset.mdColorScheme};}")
   report['captures'].append({'file':path.name,'kind':kind,'url':p.url,'viewport':p.viewport_size,'selector':selector,'bounds':bounds,'full_page':full,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'style':style,**metadata});save();print('CAPTURE',name,flush=True)
  for width,height,label in [(1440,1000,'desktop'),(390,844,'mobile')]:
   for variant,base in [('before',args.before),('after',args.after)]:
    ctx=context(width,height);p=page_for(ctx,variant=='before')
    def catalogue():
     goto(p,base+'/series/');capture(p,f'{label}-{variant}-catalog',variant,full=True,surface='catalog')
     p.evaluate('scrollTo(0,0)');capture(p,f'{label}-{variant}-catalog-viewport',variant,surface='catalog-viewport')
     if variant=='after':
      check(label+'-all13',p.locator('[data-sx-card]:visible').count()==13)
      check(label+'-catalog-fits',p.evaluate('document.documentElement.scrollWidth<=innerWidth+2'))
      p.locator('[data-sx-search]').fill('inferencia');check(label+'-search',p.locator('[data-sx-card]:visible').count()>=1 and p.locator('[data-sx-card][data-series-number="12"]').is_visible())
      capture(p,f'{label}-after-search',variant,surface='search')
      p.locator('[data-sx-search]').fill('zz-no-such-concept');check(label+'-empty',p.locator('[data-sx-empty]').is_visible())
      p.locator('[data-sx-clear]').click()
      if width<=700: p.locator('[data-sx-mobile-filter]').select_option('evaluate')
      else: p.locator('[data-sx-filter="evaluate"]').click()
      check(label+'-filter',p.locator('[data-sx-card]:visible').count()==3)
      if width<=700: p.locator('[data-sx-mobile-filter]').select_option('all')
      else: p.locator('[data-sx-filter="all"]').click()
      p.goto(base+'/series/#mapa',wait_until='networkidle');expect(p.locator('#mapa')).to_have_attribute('open','');capture(p,f'{label}-after-map',variant,selector='#mapa',surface='map')
    safe(label+'-'+variant+'-catalog',catalogue)
    for s in series:
     def detail(s=s):
      goto(p,base+(('/series/#'+s['id']) if variant=='after' else s['before']))
      capture(p,f'{label}-{variant}-series-{s["number"]:02}',variant,full=True,surface='series',series=s['number'])
     safe(f'{label}-{variant}-series-{s["number"]}',detail)
    for s in series[6:]:
     for c in s['chapters']:
      def lesson(s=s,c=c):
       ident=f'{s["number"]:02}-{c["number"]:02}';goto(p,base+c['route'])
       capture(p,f'{label}-{variant}-chapter-{ident}',variant,surface='chapter',series=s['number'],chapter=c['number'])
       selector='[data-sx-guide]' if variant=='after' else '.anim-brand-shell, .aix-loop, .s5v'
       if not p.locator(selector).count(): selector='article.md-content__inner'
       capture(p,f'{label}-{variant}-mechanism-{ident}',variant,selector=selector,surface='mechanism',series=s['number'],chapter=c['number'],view=c['view'],state='initial')
       if variant=='after':
        g=p.locator('[data-sx-guide]');initial=g.locator('[data-sx-scene]').inner_text()
        g.locator('[data-sx-step="3"]').click();final=g.locator('[data-sx-scene]').inner_text()
        check(f'{label}-{ident}-steps',g.get_attribute('data-step')=='3' and initial!=final)
        capture(p,f'{label}-after-mechanism-{ident}-result',variant,selector=selector,surface='mechanism',series=s['number'],chapter=c['number'],view=c['view'],state='result')
        g.locator('[data-sx-scenario="1"]').click();other=g.locator('[data-sx-scene]').inner_text()
        check(f'{label}-{ident}-scenario',g.get_attribute('data-scenario')=='1' and final!=other)
        capture(p,f'{label}-after-mechanism-{ident}-alternative',variant,selector=selector,surface='mechanism',series=s['number'],chapter=c['number'],view=c['view'],state='alternative')
        check(f'{label}-{ident}-fit',g.evaluate('(e)=>e.scrollWidth<=e.clientWidth+2'))
        g.locator('[data-sx-tab="original"]').click();check(f'{label}-{ident}-original',g.locator('#s5-diagrama-original').is_visible() and not g.locator('#sx-guided-panel').is_visible())
        if label=='desktop': capture(p,f'{label}-after-original-{ident}',variant,selector='#s5-diagrama-original',surface='original-retained',series=s['number'],chapter=c['number'])
        g.locator('[data-sx-tab="guided"]').click();g.locator('[data-sx-reset]').click();check(f'{label}-{ident}-reset',g.get_attribute('data-step')=='0' and g.get_attribute('data-scenario')=='0' and g.locator('[data-sx-scene]').inner_text()==initial)
        check(f'{label}-{ident}-reader',p.locator('.sx-reader-context a').count()==2 and p.locator('.sx-reader-next a').count()==2)
      safe(f'{label}-{variant}-{s["number"]}-{c["number"]}',lesson)
    for path,name in [('/visuales/','ver'),('/videos/','videos'),('/videos/series/agentes-ia/01-que-es-un-agente/','watch')]:
     safe(label+'-'+variant+'-'+name,lambda path=path,name=name:(goto(p,base+path),capture(p,f'{label}-{variant}-{name}',variant,surface=name)))
    ctx.close()
  # English and narrow widths: exercise every state without extrapolating from one pilot.
  for width,prefix in [(1440,'/en'),(390,'/en'),(360,''),(768,'')]:
   ctx=context(width,1000);p=page_for(ctx)
   for s in series[6:]:
    for c in s['chapters']:
     def translated(s=s,c=c):
      goto(p,args.after+prefix+c['route']);g=p.locator('[data-sx-guide]');g.locator('[data-sx-step="3"]').click();a=g.locator('[data-sx-scene]').inner_text();g.locator('[data-sx-scenario="1"]').click();b=g.locator('[data-sx-scene]').inner_text()
      check(f'{width}-{prefix}-{c["view"]}-scenario',a!=b)
      check(f'{width}-{prefix}-{c["view"]}-fit',g.evaluate('(e)=>e.scrollWidth<=e.clientWidth+2'))
      if prefix and c['number']==1: capture(p,f'{width}-en-after-mechanism-{s["number"]:02}', 'after',selector='[data-sx-guide]',surface='mechanism-en',series=s['number'],chapter=c['number'])
     safe(f'{width}-{prefix}-{c["view"]}',translated)
   safe(f'{width}-{prefix}-catalog',lambda:(goto(p,args.after+prefix+'/series/'),capture(p,f'{width}-{prefix.strip("/") or "es"}-after-catalog','after',full=True,surface='catalog-extra')))
   ctx.close()
  # Real dark-mode switch, keyboard, player, history, no-JS and a recording.
  ctx=context();p=page_for(ctx)
  def functional():
   goto(p,args.after+'/series/');p.locator('[data-sx-card] .sx-card-open').nth(7).click();expect(p.locator('#serie-agentes-ia')).to_be_visible();check('card-opens-series',p.locator('#serie-agentes-ia').is_visible())
   p.go_back(wait_until='networkidle');expect(p.locator('[data-sx-overview]')).to_be_visible();check('back-to-catalog',p.locator('[data-sx-overview]').is_visible())
   goto(p,args.after+'/series/#serie-agentes-ia');expect(p.locator('#serie-agentes-ia')).to_be_visible();p.locator('#serie-agentes-ia [data-sx-play]').click();v=p.locator('#serie-agentes-ia video');p.wait_for_function("document.querySelector('#serie-agentes-ia video').currentTime > 0",timeout=30000);check('approved-video-plays',v.evaluate('(v)=>!v.paused && v.currentTime>0'));capture(p,'desktop-after-inline-playback','after',surface='inline-playback')
   p.locator('#serie-agentes-ia [data-sx-preview]').last.click();p.wait_for_function("document.querySelector('#serie-agentes-ia video').currentTime > 0",timeout=30000);check('chapter-preview-in-place',p.locator('#serie-agentes-ia .sx-chapter.is-current').count()==1)
   goto(p,args.after+series[7]['chapters'][0]['route']);g=p.locator('[data-sx-guide]');g.locator('[data-sx-next]').focus();p.keyboard.press('Enter');check('keyboard-next',g.get_attribute('data-step')=='1');g.locator('[data-sx-tab="guided"]').focus();p.keyboard.press('ArrowRight');check('keyboard-tab',g.locator('#s5-diagrama-original').is_visible())
   g.locator('[data-sx-tab="guided"]').click();g.locator('[data-sx-fullscreen]').click();p.wait_for_function('!!document.fullscreenElement');check('fullscreen',p.evaluate('!!document.fullscreenElement'));p.keyboard.press('Escape');p.wait_for_function('!document.fullscreenElement')
   goto(p,args.after+'/series/');check('resume-real-last-reading',p.locator('[data-sx-resume]').is_visible())
  safe('functional',functional)
  def all_players():
   for s in series:
    goto(p,args.after+'/series/#'+s['id']);detail=p.locator('#'+s['id']);expect(detail).to_be_visible()
    video=detail.locator('video')
    if not video.count(): continue
    check(f'player-{s["number"]}-deferred',not video.get_attribute('src') and video.get_attribute('preload')=='none')
    detail.locator('[data-sx-play]').click()
    p.wait_for_function('(id)=>{const v=document.querySelector("#"+id+" video");return v.currentTime>0 && v.videoWidth>0 && !v.error;}',arg=s['id'],timeout=30000)
    check(f'player-{s["number"]}-decoded',video.evaluate('v=>v.currentTime>0 && v.videoWidth>0 && !v.error'),video.evaluate('v=>({time:v.currentTime,width:v.videoWidth,error:!!v.error})'))
    video.evaluate('v=>v.pause()')
   goto(p,args.after+'/series/#%E0%A4%A');expect(p.locator('[data-sx-overview]')).to_be_visible();check('malformed-fragment-safe',True)
  safe('all-approved-inline-players',all_players)
  def dark():
   goto(p,args.after+'/series/');id_=p.locator('input[data-md-color-scheme="slate"]').first.get_attribute('id');p.locator(f'label[for="{id_}"]').first.click();p.wait_for_function("document.body.dataset.mdColorScheme==='slate'");check('real-dark-mode',True);capture(p,'desktop-dark-after-catalog','after',full=True,surface='catalog-dark')
   for s in series[6:]:
    goto(p,args.after+s['chapters'][0]['route']);capture(p,f'desktop-dark-after-mechanism-{s["number"]:02}','after',selector='[data-sx-guide]',surface='mechanism-dark',series=s['number'],chapter=1)
  safe('dark',dark);ctx.close()
  nojs=browser.new_context(java_script_enabled=False,viewport={'width':1440,'height':1000});p=nojs.new_page()
  def fallback():
   goto(p,args.after+'/series/');p.locator('#serie-agentes-ia>summary').click();check('nojs-series-links',p.locator('#serie-agentes-ia [data-sx-chapter-url]').count()==5);capture(p,'desktop-after-nojs-series','after',surface='nojs')
   goto(p,args.after+series[7]['chapters'][0]['route']);check('nojs-original-visible',p.locator('#s5-diagrama-original').is_visible());check('nojs-step-explanation',p.locator('[data-sx-guide] noscript li').count()==4)
  safe('nojs',fallback);nojs.close()
  live=context();p=live.new_page()
  for route,name in [('/series/','series'),('/visuales/','ver')]:
   try: goto(p,'https://5sigmas.com'+route);capture(p,'production-live-'+name,'live-production',full=True,surface='live-'+name)
   except Exception as e: report['live_reference_errors'].append(str(e))
  live.close()
  recording=browser.new_context(viewport={'width':1440,'height':1000},record_video_dir=str(out/'recording'),record_video_size={'width':1440,'height':1000},reduced_motion='no-preference');p=recording.new_page()
  def film():
   goto(p,args.after+'/series/');p.wait_for_timeout(900);p.locator('[data-sx-card] .sx-card-open').nth(7).click();p.wait_for_timeout(900)
   for s in series[6:]:
    goto(p,args.after+s['chapters'][0]['route']);g=p.locator('[data-sx-guide]');g.scroll_into_view_if_needed();p.wait_for_timeout(400)
    for step in range(4): g.locator(f'[data-sx-step="{step}"]').click();p.wait_for_timeout(550)
    g.locator('[data-sx-scenario="1"]').click();p.wait_for_timeout(1100)
   goto(p,args.after+'/series/#mapa');p.wait_for_timeout(1100)
  safe('recording',film);recording.close();browser.close()
 for file in (out/'recording').glob('*.webm'):
  subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(file),'-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',str(out/'real-interactions.mp4')],check=True);break
 # Compare computed brand properties only for the exact same default theme.
 for mode in ['desktop','mobile']:
  a=next((c for c in report['captures'] if c['file']==f'{mode}-before-catalog.png'),None);b=next((c for c in report['captures'] if c['file']==f'{mode}-after-catalog.png'),None)
  if a and b: check(mode+'-brand-preserved',a['style']==b['style'],{'before':a['style'],'after':b['style']})
 report['status']='PASS' if not report['errors'] and not report['console_errors'] and all(c['pass'] for c in report['checks']) else 'FAIL';save()
 print(json.dumps({'status':report['status'],'captures':len(report['captures']),'checks':len(report['checks']),'failed_checks':[c for c in report['checks'] if not c['pass']],'errors':report['errors'],'console_errors':report['console_errors'][:10]},ensure_ascii=False),flush=True)
 if report['status']!='PASS':raise SystemExit(1)

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--before',default='http://127.0.0.1:8000');p.add_argument('--after',default='http://127.0.0.1:8001');p.add_argument('--site',type=Path,default=Path('site'));p.add_argument('--output',type=Path,default=Path('artifacts/series-ui-review'));run(p.parse_args())
