"""Capture real before/after navigation and prove series 7–13 keep the same mechanisms while receiving GOLDEN polish."""
from __future__ import annotations
import argparse, hashlib, json, os, re
from datetime import datetime, timezone
from pathlib import Path
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, expect

VISUAL_ROOT = ','.join([
    '.ctxmix','.aix-loop','.aix-eval','.aix-sec',
    '.defsim','.jbsearch','.jbbudget','.jbladder','.memlife','.memgov','.memprop','.memlayers',
    '.threatbuild','.uplift3','.causalrt','.regloop','.proddef','.mcpbound','.killpath','.releasegate',
    '.s5v'
])

def run(args):
    out=args.output; out.mkdir(parents=True,exist_ok=True)
    report={
        'baseline_sha':os.getenv('REVIEW_BASE_SHA'),
        'candidate_sha':os.getenv('REVIEW_HEAD_SHA'),
        'captured_at':datetime.now(timezone.utc).isoformat(),
        'method':'Exact baseline/candidate builds served separately; existing visual DOM signatures must match while rendered pixels are allowed to improve through shared presentation CSS/JS.',
        'captures':[],'checks':[],'errors':[]
    }
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
            el=page.locator(selector).first; el.wait_for(state='visible'); el.screenshot(path=str(path),animations='disabled')
        else:
            page.screenshot(path=str(path),full_page=full,animations='disabled')
        report['captures'].append({'file':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),**(meta or {})})
        return path

    def signature(page):
        return page.locator(VISUAL_ROOT).first.evaluate("""el => {
          const text = (el.innerText || '').replace(/\s+/g,' ').trim();
          const svgs=[...el.querySelectorAll('svg')].map(svg=>({
            viewBox:svg.getAttribute('viewBox')||'',
            paths:svg.querySelectorAll('path').length,
            rects:svg.querySelectorAll('rect').length,
            circles:svg.querySelectorAll('circle').length,
            texts:svg.querySelectorAll('text').length
          }));
          return {
            tag:el.tagName,
            demo:el.getAttribute('data-demo')||'',
            aria:el.getAttribute('aria-label')||'',
            text,
            buttons:el.querySelectorAll('button').length,
            ranges:el.querySelectorAll('input[type=range]').length,
            selects:el.querySelectorAll('select').length,
            svgs
          };
        }""")

    def golden_style(page):
        return page.locator(VISUAL_ROOT).first.evaluate("""el => {
          const target=el.matches('.s5v') ? el.querySelector('.s5v__canvas') : el;
          const s=getComputedStyle(target||el);
          const r=parseFloat(s.borderRadius)||0;
          return {
            body:document.body.classList.contains('s5-advanced-series'),
            root:el.classList.contains('s5g-visual'),
            radius:r,
            shadow:s.boxShadow,
            background:s.backgroundImage,
            width:el.getBoundingClientRect().width,
            scrollWidth:el.scrollWidth
          };
        }""")

    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,channel='chrome'); report['browser']=browser.version

        # Approved human-navigation surfaces.
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

        # Preserve the mechanism byte-for-byte at the DOM/signature level; improve only rendering.
        mobile_representatives={7:1,8:1,9:2,10:1,11:1,12:1,13:1}
        for s in series[6:]:
            for chapter_no,route in enumerate(s['chapters'],1):
                signatures={}; styles={}
                for variant,base in (('before',args.before),('after',args.after)):
                    page=browser.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce')
                    page.goto(base+route,wait_until='networkidle')
                    visual=page.locator(VISUAL_ROOT).first
                    if visual.count() and visual.is_visible():
                        signatures[variant]=signature(page)
                        shot(page,f'golden-{s["number"]:02}-{chapter_no:02}-{variant}',selector=VISUAL_ROOT,meta={'surface':'advanced-visual','series':s['number'],'chapter':chapter_no,'state':variant})
                        if variant=='after':
                            styles[variant]=golden_style(page)
                            check(f'{s["number"]:02}-{chapter_no:02}-no-guide',page.locator('[data-sx-guide]').count()==0)
                            check(f'{s["number"]:02}-{chapter_no:02}-golden-class',styles[variant]['body'] and styles[variant]['root'],styles[variant])
                            check(f'{s["number"]:02}-{chapter_no:02}-golden-shell',styles[variant]['radius']>=20 and styles[variant]['shadow']!='none',styles[variant])
                    page.close()
                if 'before' in signatures and 'after' in signatures:
                    check(f'{s["number"]:02}-{chapter_no:02}-mechanism-preserved',signatures['before']==signatures['after'],{'before':signatures['before'],'after':signatures['after']})

                if mobile_representatives.get(s['number'])==chapter_no:
                    for variant,base in (('before',args.before),('after',args.after)):
                        page=browser.new_page(viewport={'width':390,'height':844},reduced_motion='reduce')
                        page.goto(base+route,wait_until='networkidle')
                        if page.locator(VISUAL_ROOT).count():
                            shot(page,f'mobile-golden-{s["number"]:02}-{variant}',selector=VISUAL_ROOT,meta={'surface':'advanced-visual-mobile','series':s['number'],'chapter':chapter_no,'state':variant})
                            if variant=='after':
                                root=page.locator(VISUAL_ROOT).first
                                check(f'{s["number"]:02}-mobile-root-fit',root.evaluate('(e)=>e.getBoundingClientRect().width<=innerWidth+1'))
                        page.close()

        # Human journey.
        page=browser.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce')
        page.goto(args.after+'/',wait_until='networkidle')
        page.locator('.s5-start-card__cta').click(); expect(page.locator('#serie-fundamentos-ia-iag')).to_be_visible(); check('home-to-series',True)
        page.goto(args.after+'/visuales/',wait_until='networkidle')
        page.locator('.s5-visual-hub__jump .sx-series-entry').click(); page.wait_for_load_state('networkidle'); check('ver-to-series',page.locator('[data-sx-hub]').count()==1)
        browser.close()

    failed=[x for x in report['checks'] if not x['pass']]
    report['status']='PASS' if not failed and not report['errors'] else 'FAIL'; report['failed_checks']=failed
    (out/'manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'status':report['status'],'captures':len(report['captures']),'checks':len(report['checks']),'failed_checks':failed,'errors':report['errors']},ensure_ascii=False))
    if report['status']!='PASS': raise SystemExit(1)

if __name__=='__main__':
    p=argparse.ArgumentParser(); p.add_argument('--before',default='http://127.0.0.1:8000'); p.add_argument('--after',default='http://127.0.0.1:8001'); p.add_argument('--site',type=Path,default=Path('site')); p.add_argument('--output',type=Path,default=Path('artifacts/series-ui-review')); run(p.parse_args())
