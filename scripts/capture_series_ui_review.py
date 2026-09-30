"""Capture real before/after navigation evidence and prove prior GOLDEN visuals remain direct."""
from __future__ import annotations
import argparse, hashlib, io, json, os
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image, ImageChops
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, expect

VISUAL='.anim-brand-shell, .aix-loop, .aix-eval, .aix-sec, .s5v'

def run(args):
    out=args.output;out.mkdir(parents=True,exist_ok=True)
    report={'baseline_sha':os.getenv('REVIEW_BASE_SHA'),'candidate_sha':os.getenv('REVIEW_HEAD_SHA'),'captured_at':datetime.now(timezone.utc).isoformat(),'captures':[],'checks':[],'errors':[]}
    hub=BeautifulSoup((args.site/'series/index.html').read_text(),'lxml')
    series=[]
    for i,d in enumerate(hub.select('[data-sx-detail]'),1):
        chapters=[c['data-sx-chapter-url'] for c in d.select('[data-sx-chapter-url]')]
        intro=d.select_one('.sx-original-intro')
        series.append({'number':i,'id':d['id'],'before':intro['href'] if intro else chapters[0],'chapters':chapters})
    def check(name,ok,detail=None): report['checks'].append({'name':name,'pass':bool(ok),'detail':detail})
    def shot(page,name,selector=None,full=False,meta=None):
        path=out/(name+'.png')
        if selector:
            el=page.locator(selector).first;el.wait_for(state='visible');el.screenshot(path=str(path),animations='disabled')
        else: page.screenshot(path=str(path),full_page=full,animations='disabled')
        report['captures'].append({'file':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),**(meta or {})})
        return path
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,channel='chrome');report['browser']=browser.version
        for width,height,label in ((1440,1000,'desktop'),(390,844,'mobile')):
            for variant,base in (('before',args.before),('after',args.after)):
                page=browser.new_page(viewport={'width':width,'height':height},reduced_motion='reduce')
                page.goto(base+'/series/',wait_until='networkidle')
                shot(page,f'{label}-{variant}-catalog',full=True,meta={'surface':'catalog','state':variant,'width':width})
                if variant=='after':
                    check(f'{label}-all13',page.locator('[data-sx-card]:visible').count()==13)
                    check(f'{label}-catalog-fit',page.evaluate('document.documentElement.scrollWidth<=innerWidth+2'))
                for s in series:
                    url=base+(('/series/#'+s['id']) if variant=='after' else s['before'])
                    page.goto(url,wait_until='networkidle')
                    shot(page,f'{label}-{variant}-series-{s["number"]:02}',full=True,meta={'surface':'series','series':s['number'],'state':variant,'width':width})
                page.goto(base+'/visuales/',wait_until='networkidle')
                shot(page,f'{label}-{variant}-ver',full=True,meta={'surface':'ver','state':variant,'width':width})
                if variant=='after':
                    entry=page.locator('.s5-visual-hub__jump .sx-series-entry')
                    check(f'{label}-ver-series-entry',entry.count()==1)
                page.close()
        # GOLDEN visual fidelity for every advanced chapter: direct, no wrapper, real browser crops.
        for s in series[6:]:
            for chapter_no,route in enumerate(s['chapters'],1):
                pair=[]
                for variant,base in (('before',args.before),('after',args.after)):
                    page=browser.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce')
                    page.goto(base+route,wait_until='networkidle')
                    if variant=='after':
                        check(f'{s["number"]:02}-{chapter_no:02}-no-guide',page.locator('[data-sx-guide]').count()==0)
                    visual=page.locator(VISUAL).first
                    if visual.count() and visual.is_visible():
                        path=shot(page,f'golden-{s["number"]:02}-{chapter_no:02}-{variant}',selector=VISUAL,meta={'surface':'golden-visual','series':s['number'],'chapter':chapter_no,'state':variant})
                        pair.append(path)
                    page.close()
                if len(pair)==2:
                    with Image.open(pair[0]).convert('RGBA') as a, Image.open(pair[1]).convert('RGBA') as b:
                        equal=a.size==b.size and ImageChops.difference(a,b).getbbox() is None
                    check(f'{s["number"]:02}-{chapter_no:02}-golden-pixels',equal,{'before':pair[0].name,'after':pair[1].name})
        # Human journey.
        page=browser.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce')
        page.goto(args.after+'/',wait_until='networkidle');page.locator('.s5-start-card__cta').click();expect(page.locator('#serie-fundamentos-ia-iag')).to_be_visible();check('home-to-series',True)
        page.goto(args.after+'/visuales/',wait_until='networkidle');page.locator('.s5-visual-hub__jump .sx-series-entry').click();page.wait_for_load_state('networkidle');check('ver-to-series',page.locator('[data-sx-hub]').count()==1)
        browser.close()
    failed=[x for x in report['checks'] if not x['pass']]
    report['status']='PASS' if not failed and not report['errors'] else 'FAIL';report['failed_checks']=failed
    (out/'manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'status':report['status'],'captures':len(report['captures']),'checks':len(report['checks']),'failed_checks':failed,'errors':report['errors']},ensure_ascii=False))
    if report['status']!='PASS': raise SystemExit(1)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--before',default='http://127.0.0.1:8000');p.add_argument('--after',default='http://127.0.0.1:8001');p.add_argument('--site',type=Path,default=Path('site'));p.add_argument('--output',type=Path,default=Path('artifacts/series-ui-review'));run(p.parse_args())
