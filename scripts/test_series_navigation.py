"""Browser regressions for the human Series navigation with prior GOLDEN visuals."""
from __future__ import annotations
import argparse, json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

VISUAL = '.anim-brand-shell, .aix-loop, .aix-eval, .aix-sec, .s5v'

def run(base: str, output: Path) -> None:
    report={'checks':[],'errors':[]};output.parent.mkdir(parents=True,exist_ok=True)
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,channel='chrome');report['browser']=browser.version
        for width in (1440,390):
            page=browser.new_page(viewport={'width':width,'height':1000},reduced_motion='reduce')
            page.on('pageerror',lambda e: report['errors'].append(str(e)))
            for locale in ('es','en'):
                prefix='' if locale=='es' else '/en'
                page.goto(base+prefix+'/series/#serie-agentes-ia',wait_until='networkidle')
                expect(page.locator('#serie-agentes-ia')).to_be_visible()
                other='/en' if locale=='es' else ''
                links=page.locator('.md-select a[href]').evaluate_all('(nodes)=>nodes.map(n=>({href:n.href,path:new URL(n.href).pathname}))')
                href=next((x['href'] for x in links if x['path']==other+'/series/'),None)
                assert href and href.endswith(other+'/series/#serie-agentes-ia'),href
                report['checks'].append({'name':f'{width}-{locale}-selected-series-survives-locale','pass':True})
                page.goto(base+prefix+'/series/agentes-ia/01-que-es-un-agente/',wait_until='networkidle')
                assert page.locator('[data-sx-guide]').count()==0
                expect(page.locator(VISUAL).first).to_be_visible()
                expect(page.locator('.s5-reader-context')).to_be_visible()
                assert page.locator('.sx-reader-context').count()==0
                assert page.locator('[data-sx-reader-index]').count()==0
                report['checks'].append({'name':f'{width}-{locale}-golden-visual-direct','pass':True})
            page.close()
        browser.close()
    report['status']='PASS' if not report['errors'] else 'FAIL'
    output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(report,ensure_ascii=False))
    assert report['status']=='PASS',report['errors']

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--base-url',default='http://127.0.0.1:8001');p.add_argument('--output',type=Path,default=Path('artifacts/series-ui-review/navigation-regression.json'));a=p.parse_args();run(a.base_url,a.output)
