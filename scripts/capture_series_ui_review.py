"""Real Chromium captures of exact baseline/candidate builds; never synthesize a UI image."""
from __future__ import annotations
import argparse
import hashlib
import io
import json
import math
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from bs4 import BeautifulSoup
from PIL import Image
from playwright.sync_api import sync_playwright

BASE_SHA = '6209a852b804338e31b95f06bdf604baeb04cf40'


def run(args):
    out=args.output;out.mkdir(parents=True,exist_ok=True)
    report={'baseline_sha':BASE_SHA,'candidate_sha':os.environ.get('REVIEW_HEAD_SHA','local-uncommitted'),
            'captured_at':datetime.now(timezone.utc).isoformat(),'method':'Playwright Chromium screenshots; two local HTTP builds plus a separately labelled live-site reference. Component images crop actual full-page screenshots taken at scroll zero, without changing page styles or hiding fixed headers.',
            'captures':[], 'checks':[], 'errors':[], 'console_errors':[]}
    hub=BeautifulSoup((args.site/'series/index.html').read_text(),'lxml')
    series=[{'id':p['id'],'title':p.select_one('.s5-series-hero h2').get_text(),
             'first':p.select_one('[data-sx-chapter-url]')['data-sx-chapter-url']} for p in hub.select('[data-sx-detail]')]
    guides=series[6:]
    def save():
        (out/'manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    def record(name,ok,detail=''):
        report['checks'].append({'name':name,'pass':bool(ok),'detail':detail})
        save()
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True)
        def context(width,height,dark=False):
            return browser.new_context(viewport={'width':width,'height':height},device_scale_factor=1,
                                       color_scheme='dark' if dark else 'light',reduced_motion='reduce',locale='es-ES')
        def goto(page,url):
            response=page.goto(url,wait_until='networkidle',timeout=60000)
            if response and response.status >= 400: raise RuntimeError(f'{response.status}: {url}')
            page.evaluate('document.fonts.ready')
            page.wait_for_timeout(180)
        def capture(page,name,kind,selector=None,full=False):
            path=out/(name+'.png')
            if full:
                page.evaluate("async () => {for(let y=0;y<document.body.scrollHeight;y+=650){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,40));}window.scrollTo(0,0);}")
                page.wait_for_timeout(250)
            if selector:
                # Locator screenshots scroll tall elements under the sticky header.
                # Capture the untouched page at scroll zero, then crop its real pixels.
                page.evaluate("window.scrollTo({top:0,left:0,behavior:'instant'})")
                page.wait_for_timeout(120)
                element=page.locator(selector).first
                element.wait_for(state='visible')
                box=element.bounding_box()
                if not box: raise RuntimeError(f'No bounding box for {selector}')
                pixels=page.screenshot(full_page=True,animations='disabled')
                with Image.open(io.BytesIO(pixels)) as shot:
                    crop=(max(0,math.floor(box['x'])),max(0,math.floor(box['y'])),
                          min(shot.width,math.ceil(box['x']+box['width'])),
                          min(shot.height,math.ceil(box['y']+box['height'])))
                    if crop[2]<=crop[0] or crop[3]<=crop[1]: raise RuntimeError(f'Invalid capture bounds: {crop}')
                    shot.crop(crop).save(path)
            else:
                page.screenshot(path=str(path),full_page=full,animations='disabled')
            style=page.evaluate("() => {const h=document.querySelector('h1');return {bodyFont:getComputedStyle(document.body).fontFamily,headingFont:h?getComputedStyle(h).fontFamily:null,headerBackground:getComputedStyle(document.querySelector('.md-header')).backgroundColor,scheme:document.body.dataset.mdColorScheme};}")
            report['captures'].append({'file':path.name,'kind':kind,'url':page.url,'viewport':page.viewport_size,
                                       'selector':selector,'full_page':full,'component_crop':bool(selector),
                                       'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'style':style})
            print('CAPTURE',path.name,flush=True)
            save()
        def safe(name,fn):
            try:fn()
            except Exception as ex:
                report['errors'].append({'name':name,'error':str(ex)[:1500]})
                save()
        for width,height,label in [(1440,1000,'desktop'),(390,844,'mobile')]:
            for variant,base in [('before',args.before),('after',args.after)]:
                ctx=context(width,height);page=ctx.new_page()
                page.on('pageerror',lambda error: report['console_errors'].append(str(error)))
                safe(f'{label}-{variant}-catalog',lambda: (goto(page,base+'/series/'),capture(page,f'{label}-{variant}-catalog','baseline' if variant=='before' else 'candidate',full=True)))
                if variant=='after':
                    record(f'{label}-13-visible',page.locator('[data-sx-card]:visible').count()==13)
                    page.locator('[data-sx-search]').fill('inferencia')
                    record(f'{label}-search',page.locator('[data-sx-card]:visible').count()>=1)
                    page.locator('[data-sx-search]').fill('zzzzzz-no-matches')
                    record(f'{label}-empty',page.locator('[data-sx-empty]').is_visible())
                    page.locator('[data-sx-clear]').click()
                    page.locator('[data-sx-filter="evaluate"]').click()
                    record(f'{label}-filter',page.locator('[data-sx-card]:visible').count()==2)
                    page.locator('[data-sx-filter="all"]').click()
                    for i,s in enumerate(series):
                        safe(f'{label}-{s["id"]}',lambda s=s,i=i:(goto(page,base+'/series/#'+s['id']),capture(page,f'{label}-after-series-{i+1:02}','candidate',full=True)))
                    goto(page,base+'/series/')
                    origin=page.locator('[data-sx-card] .s5-series-explore').nth(7)
                    origin.click()
                    record(f'{label}-detail-navigation',page.locator('#serie-agentes-ia').is_visible())
                    page.go_back(wait_until='networkidle')
                    record(f'{label}-history-back',page.locator('[data-sx-overview]').is_visible())
                for i,s in enumerate(guides,7):
                    def chapter(s=s,i=i):
                        goto(page,base+s['first'])
                        capture(page,f'{label}-{variant}-chapter-{i:02}','baseline' if variant=='before' else 'candidate',full=False)
                        selector='[data-sx-guide]' if variant=='after' else '.anim-brand-shell'
                        capture(page,f'{label}-{variant}-mechanism-{i:02}','baseline' if variant=='before' else 'candidate',selector=selector)
                        if variant=='after':
                            root=page.locator('[data-sx-guide]')
                            for step in range(4):root.locator(f'[data-sx-step="{step}"]').click()
                            record(f'{label}-guide-{i}-steps',root.get_attribute('data-active-step')=='3')
                            control=root.locator('select').first
                            if control.count():control.select_option(index=1)
                            else:
                                root.locator('input[type=range]').focus()
                                page.keyboard.press('End')
                            capture(page,f'{label}-after-mechanism-{i:02}-changed','candidate-interaction',selector=selector)
                            root.locator('[data-sx-reset]').click()
                            record(f'{label}-guide-{i}-reset',root.get_attribute('data-active-step')=='0')
                            fits=root.evaluate('(e)=>e.scrollWidth<=e.clientWidth+2')
                            record(f'{label}-guide-{i}-fits',fits)
                    safe(f'{label}-{variant}-chapter-{i}',chapter)
                safe(f'{label}-{variant}-ver',lambda:(goto(page,base+'/visuales/'),capture(page,f'{label}-{variant}-ver','baseline' if variant=='before' else 'candidate')))
                ctx.close()
        # Activate dark mode using the real site control; assert the DOM state.
        for width,height,label,dark in [(1440,1000,'desktop-en',False),(390,844,'mobile-en',False),(1440,1000,'desktop-dark',True)]:
            ctx=context(width,height,dark);page=ctx.new_page();prefix='' if dark else '/en'
            page.on('pageerror',lambda error: report['console_errors'].append(str(error)))
            def themed_catalog():
                goto(page,args.after+prefix+'/series/')
                if dark:
                    if page.locator('body').get_attribute('data-md-color-scheme')!='slate':
                        palette=page.locator('input[data-md-color-scheme="slate"]').first
                        control_id=palette.get_attribute('id')
                        if not control_id: raise RuntimeError('Dark palette control missing')
                        page.locator('label[for="'+control_id+'"]').first.click()
                    page.wait_for_function("document.body.dataset.mdColorScheme === 'slate'")
                    record('desktop-dark-active-scheme',page.locator('body').get_attribute('data-md-color-scheme')=='slate')
                capture(page,label+'-after-catalog','candidate',full=True)
            safe(label+'-catalog',themed_catalog)
            record(label+'-catalog-count',page.locator('[data-sx-card]').count()==13)
            if not dark:
                for s in guides:
                    safe(label+'-'+s['id'],lambda s=s:(goto(page,args.after+prefix+s['first']),record(label+'-'+s['id']+'-guide',page.locator('[data-sx-guide][data-sx-ready]').count()==1)))
            ctx.close()
        for width in [360,768]:
            ctx=context(width,900);page=ctx.new_page();goto(page,args.after+'/series/')
            record(f'width-{width}-gallery-fits',page.evaluate('document.documentElement.scrollWidth<=innerWidth+2'))
            for s in guides:
                goto(page,args.after+s['first'])
                root=page.locator('[data-sx-guide]')
                record(f'width-{width}-{s["id"]}-fits',root.evaluate('(e)=>e.scrollWidth<=e.clientWidth+2'))
            ctx.close()
        ctx=context(1440,1000);page=ctx.new_page()
        goto(page,args.after+guides[1]['first'])
        root=page.locator('[data-sx-guide]');root.locator('[data-sx-next]').focus();page.keyboard.press('Enter')
        record('keyboard-next',root.get_attribute('data-active-step')=='1')
        goto(page,args.after+guides[5]['first']);root=page.locator('[data-sx-guide]')
        root.locator('[data-input=input]').select_option('2048');root.locator('[data-input=output]').select_option('128')
        record('inference-arithmetic',abs(float(root.get_attribute('data-ttft'))-4.13125)<1e-6 and abs(float(root.get_attribute('data-total'))-8.1)<1e-6)
        goto(page,args.after+guides[3]['first']);root=page.locator('[data-sx-guide]');root.locator('[data-sx-step="2"]').click()
        record('coding-fail-real-calculation','FAIL' in root.locator('[data-sx-scene]').inner_text())
        root.locator('[data-input=factor]').select_option('1.21')
        record('coding-correction','PASS' in root.locator('[data-sx-scene]').inner_text())
        safe('live-production-series',lambda:(goto(page,'https://5sigmas.com/series/'),capture(page,'production-live-series','live-production',full=True)))
        safe('live-production-ver',lambda:(goto(page,'https://5sigmas.com/visuales/'),capture(page,'production-live-ver','live-production')))
        ctx.close()
        nojs=browser.new_context(java_script_enabled=False,viewport={'width':1440,'height':1000});page=nojs.new_page();goto(page,args.after+'/series/')
        page.locator('#serie-agentes-ia > summary').click()
        record('no-js-chapter-links',page.locator('#serie-agentes-ia [data-sx-chapter-url]').count()==5 and page.locator('#serie-agentes-ia .s5-series-start').is_visible())
        capture(page,'desktop-no-js-fallback','candidate-no-javascript')
        nojs.close()
        videoctx=browser.new_context(viewport={'width':1440,'height':1000},record_video_dir=str(out/'recording'),record_video_size={'width':1440,'height':1000})
        page=videoctx.new_page()
        for s in [guides[1],guides[5]]:
            goto(page,args.after+s['first']);root=page.locator('[data-sx-guide]');root.scroll_into_view_if_needed();page.wait_for_timeout(600)
            for step in range(4):root.locator(f'[data-sx-step="{step}"]').click();page.wait_for_timeout(500)
            root.locator('select').first.select_option(index=1);page.wait_for_timeout(800)
        videoctx.close();browser.close()
    report['status']='PASS' if not report['errors'] and not report['console_errors'] and all(c['pass'] for c in report['checks']) else 'FAIL'
    (out/'manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    links='\n'.join(f'<figure><figcaption>{c["file"]} · {c["kind"]}</figcaption><a href="{c["file"]}"><img loading="lazy" src="{c["file"]}" style="width:100%"></a></figure>' for c in report['captures'])
    (out/'index.html').write_text('<!doctype html><html lang="es"><meta charset="utf-8"><title>5sigmas · Capturas reales</title><body style="font:16px system-ui;max-width:1400px;margin:30px auto"><h1>5sigmas · Capturas reales de navegador</h1><p>Antes: '+BASE_SHA+' · Después: '+report['candidate_sha']+'</p>'+links+'</body></html>')
    print(json.dumps({'status':report['status'],'captures':len(report['captures']),'checks':len(report['checks']),'errors':report['errors']},ensure_ascii=False))
    if report['status']!='PASS':raise SystemExit(1)


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--before',default='http://127.0.0.1:8000');p.add_argument('--after',default='http://127.0.0.1:8001');p.add_argument('--site',type=Path,default=Path('site'));p.add_argument('--output',type=Path,default=Path('artifacts/series-ui-review'))
    run(p.parse_args())
