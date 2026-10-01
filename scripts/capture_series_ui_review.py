"""Real before/after evidence for the Series 7-13 GOLDEN uplift.

The candidate may change presentation only. Text, controls and SVG topology must
remain identical to the PR base for every detected advanced-series visual.
"""
from __future__ import annotations
import argparse, hashlib, json, os
from datetime import datetime, timezone
from pathlib import Path
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

VISUAL_ROOT = ','.join([
    '.ctxmix','.aix-loop','.aix-eval','.aix-sec',
    '.defsim','.jbsearch','.jbbudget','.jbladder','.memlife','.memgov','.memprop','.memlayers',
    '.threatbuild','.uplift3','.causalrt','.regloop','.proddef','.mcpbound','.killpath','.releasegate',
    '.s5v',
])
ADVANCED = {
    'seguridad-ia','agentes-ia','agentes-voz-tiempo-real',
    'coding-agents-agent-harnesses','context-engineering-memory-mcp',
    'llm-inference-engineering-economics','evaluating-ai-systems-production',
}

def run(args):
    out=args.output
    out.mkdir(parents=True,exist_ok=True)
    report={
        'baseline_sha':os.getenv('REVIEW_BASE_SHA'),
        'candidate_sha':os.getenv('REVIEW_HEAD_SHA'),
        'captured_at':datetime.now(timezone.utc).isoformat(),
        'captures':[],'checks':[],'errors':[]
    }
    hub=BeautifulSoup((args.site/'series/index.html').read_text(encoding='utf-8'),'lxml')
    series=[]
    for i,detail in enumerate(hub.select('[data-sx-detail]'),1):
        slug=detail['id'].removeprefix('serie-')
        if slug not in ADVANCED: continue
        chapters=[c['data-sx-chapter-url'] for c in detail.select('[data-sx-chapter-url]')]
        series.append({'number':i,'slug':slug,'chapters':chapters})

    def check(name,ok,detail=None):
        report['checks'].append({'name':name,'pass':bool(ok),'detail':detail})

    def shot(page,name,selector=None,nth=0,full=False,meta=None):
        path=out/(name+'.png')
        if selector:
            el=page.locator(selector).nth(nth)
            el.wait_for(state='visible')
            el.screenshot(path=str(path),animations='disabled')
        else:
            page.screenshot(path=str(path),full_page=full,animations='disabled')
        report['captures'].append({
            'file':path.name,
            'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
            **(meta or {})
        })

    def signature(page,index):
        return page.locator(VISUAL_ROOT).nth(index).evaluate(
            """el => {
              const text=(el.innerText||'').replace(/\s+/g,' ').trim();
              const svg=[...el.querySelectorAll('svg')].map(node => ({
                viewBox:node.getAttribute('viewBox')||'',
                path:node.querySelectorAll('path').length,
                rect:node.querySelectorAll('rect').length,
                circle:node.querySelectorAll('circle').length,
                line:node.querySelectorAll('line').length,
                polyline:node.querySelectorAll('polyline').length,
                polygon:node.querySelectorAll('polygon').length,
                text:node.querySelectorAll('text').length
              }));
              return {
                tag:el.tagName,
                demo:el.getAttribute('data-demo')||'',
                aria:el.getAttribute('aria-label')||'',
                text,
                buttons:el.querySelectorAll('button').length,
                ranges:el.querySelectorAll('input[type="range"]').length,
                selects:el.querySelectorAll('select').length,
                links:el.querySelectorAll('a[href]').length,
                svg
              };
            }"""
        )

    def style_signature(page,index):
        return page.locator(VISUAL_ROOT).nth(index).evaluate(
            """el => {
              const target=el.matches('.s5v')
                ? (el.querySelector('.s5v__canvas') || el.querySelector(':scope > [class$="__sheet"]') || el)
                : el;
              const s=getComputedStyle(target);
              return {
                body:document.body.classList.contains('s5-advanced-series'),
                root:el.classList.contains('s5g-visual'),
                radius:parseFloat(s.borderRadius)||0,
                shadow:s.boxShadow,
                width:el.getBoundingClientRect().width,
                viewport:innerWidth,
                scrollWidth:el.scrollWidth,
                scheme:document.body.getAttribute('data-md-color-scheme')||document.documentElement.getAttribute('data-md-color-scheme')||'',
                color:s.color,
                backgroundColor:s.backgroundColor,
                backgroundImage:s.backgroundImage
              };
            }"""
        )

    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,channel='chrome')
        report['browser']=browser.version

        # Approved navigation surfaces.
        for width,height,label in ((1440,1000,'desktop'),(390,844,'mobile')):
            for variant,base in (('before',args.before),('after',args.after)):
                page=browser.new_page(viewport={'width':width,'height':height},reduced_motion='reduce')
                page.goto(base+'/series/',wait_until='networkidle')
                shot(page,f'{label}-{variant}-catalog',full=True,meta={'surface':'catalog','state':variant})
                if variant=='after':
                    check(f'{label}-13-series',page.locator('[data-sx-card]:visible').count()==13)
                    check(f'{label}-catalog-fit',page.evaluate('document.documentElement.scrollWidth<=innerWidth+2'))
                for item in series:
                    page.goto(base+'/series/#serie-'+item['slug'],wait_until='networkidle')
                    shot(page,f'{label}-{variant}-series-{item["number"]:02}',full=True,
                         meta={'surface':'series','series':item['number'],'state':variant})
                page.close()

        visual_count=0
        for item in series:
            for chapter_no,route in enumerate(item['chapters'],1):
                before=browser.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce')
                after=browser.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce')
                before.goto(args.before+route,wait_until='networkidle')
                after.goto(args.after+route,wait_until='networkidle')
                before_roots=before.locator(VISUAL_ROOT)
                after_roots=after.locator(VISUAL_ROOT)
                count_before=before_roots.count()
                count_after=after_roots.count()
                check(f'{item["number"]:02}-{chapter_no:02}-visual-count',
                      count_before==count_after,{'before':count_before,'after':count_after})
                count=min(count_before,count_after)
                visual_count+=count
                for visual_index in range(count):
                    if not before_roots.nth(visual_index).is_visible() or not after_roots.nth(visual_index).is_visible():
                        continue
                    sig_before=signature(before,visual_index)
                    sig_after=signature(after,visual_index)
                    ident=f'{item["number"]:02}-{chapter_no:02}-{visual_index+1:02}'
                    check(ident+'-mechanism-preserved',sig_before==sig_after,
                          {'before':sig_before,'after':sig_after})
                    style=style_signature(after,visual_index)
                    check(ident+'-golden-layer',style['body'] and style['root'],style)
                    check(ident+'-presentation-uplift',style['radius']>=12 and style['shadow']!='none',style)
                    shot(before,'golden-'+ident+'-before',selector=VISUAL_ROOT,nth=visual_index,
                         meta={'surface':'advanced-visual','series':item['number'],'chapter':chapter_no,'visual':visual_index+1,'state':'before'})
                    shot(after,'golden-'+ident+'-after',selector=VISUAL_ROOT,nth=visual_index,
                         meta={'surface':'advanced-visual','series':item['number'],'chapter':chapter_no,'visual':visual_index+1,'state':'after'})
                    original_scheme=after.evaluate("document.body.getAttribute('data-md-color-scheme') || 'default'")
                    after.evaluate("document.body.setAttribute('data-md-color-scheme','slate')")
                    after.wait_for_timeout(60)
                    dark_sig=signature(after,visual_index)
                    dark_style=style_signature(after,visual_index)
                    check(ident+'-dark-mechanism-preserved',dark_sig==sig_after,
                          {'light':sig_after,'dark':dark_sig})
                    check(ident+'-dark-scheme-applied',
                          dark_style['scheme']=='slate' and dark_style['color']!=style['color'],
                          {'light':style,'dark':dark_style})
                    shot(after,'golden-'+ident+'-dark',selector=VISUAL_ROOT,nth=visual_index,
                         meta={'surface':'advanced-visual','series':item['number'],'chapter':chapter_no,'visual':visual_index+1,'state':'dark'})
                    after.evaluate("(scheme) => document.body.setAttribute('data-md-color-scheme', scheme)",original_scheme)
                    after.wait_for_timeout(30)
                before.close();after.close()

            # One mobile chapter per series, preserving topology while improving presentation.
            route=item['chapters'][0]
            before=browser.new_page(viewport={'width':390,'height':844},reduced_motion='reduce')
            after=browser.new_page(viewport={'width':390,'height':844},reduced_motion='reduce')
            before.goto(args.before+route,wait_until='networkidle')
            after.goto(args.after+route,wait_until='networkidle')
            count=min(before.locator(VISUAL_ROOT).count(),after.locator(VISUAL_ROOT).count())
            for visual_index in range(count):
                if not before.locator(VISUAL_ROOT).nth(visual_index).is_visible() or not after.locator(VISUAL_ROOT).nth(visual_index).is_visible():
                    continue
                ident=f'{item["number"]:02}-{visual_index+1:02}'
                check('mobile-'+ident+'-mechanism-preserved',
                      signature(before,visual_index)==signature(after,visual_index))
                style=style_signature(after,visual_index)
                check('mobile-'+ident+'-root-fit',style['width']<=style['viewport']+1,style)
                shot(before,'mobile-golden-'+ident+'-before',selector=VISUAL_ROOT,nth=visual_index,
                     meta={'surface':'advanced-visual-mobile','series':item['number'],'visual':visual_index+1,'state':'before'})
                shot(after,'mobile-golden-'+ident+'-after',selector=VISUAL_ROOT,nth=visual_index,
                     meta={'surface':'advanced-visual-mobile','series':item['number'],'visual':visual_index+1,'state':'after'})
                light_sig=signature(after,visual_index)
                light_style=style_signature(after,visual_index)
                original_scheme=after.evaluate("document.body.getAttribute('data-md-color-scheme') || 'default'")
                after.evaluate("document.body.setAttribute('data-md-color-scheme','slate')")
                after.wait_for_timeout(60)
                dark_sig=signature(after,visual_index)
                dark_style=style_signature(after,visual_index)
                check('mobile-'+ident+'-dark-mechanism-preserved',dark_sig==light_sig)
                check('mobile-'+ident+'-dark-scheme-applied',
                      dark_style['scheme']=='slate' and dark_style['color']!=light_style['color'],
                      {'light':light_style,'dark':dark_style})
                shot(after,'mobile-golden-'+ident+'-dark',selector=VISUAL_ROOT,nth=visual_index,
                     meta={'surface':'advanced-visual-mobile','series':item['number'],'visual':visual_index+1,'state':'dark'})
                after.evaluate("(scheme) => document.body.setAttribute('data-md-color-scheme', scheme)",original_scheme)
                after.wait_for_timeout(30)
            before.close();after.close()

        check('all-advanced-visuals-reviewed',visual_count>=50,{'visuals':visual_count})
        browser.close()

    failed=[x for x in report['checks'] if not x['pass']]
    report['failed_checks']=failed
    report['status']='PASS' if not failed and not report['errors'] else 'FAIL'
    (out/'manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({
        'status':report['status'],
        'captures':len(report['captures']),
        'checks':len(report['checks']),
        'failed_checks':len(failed),
        'visuals_reviewed':visual_count
    }))
    if report['status']!='PASS':
        raise SystemExit(1)

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--before',default='http://127.0.0.1:8000')
    parser.add_argument('--after',default='http://127.0.0.1:8001')
    parser.add_argument('--site',type=Path,default=Path('site'))
    parser.add_argument('--output',type=Path,default=Path('artifacts/series-ui-review'))
    run(parser.parse_args())
