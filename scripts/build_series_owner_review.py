"""Package real Series pages, visual controls and A/B assets in one offline HTML.

Only the review harness adapts route/storage navigation for srcdoc. Production
article markup, original controls, scientific strings and media are not rewritten.
Font binaries and video bytes are deliberately not distributed in the package.
"""
from __future__ import annotations
import argparse, base64, gzip, hashlib, json, mimetypes, re
from pathlib import Path
from urllib.parse import urljoin, urlsplit
from bs4 import BeautifulSoup

ROOT = ','.join(['.ctxmix','.aix-loop','.aix-eval','.aix-sec','.defsim','.jbsearch','.jbbudget','.jbladder','.memlife','.memgov','.memprop','.memlayers','.threatbuild','.uplift3','.causalrt','.regloop','.proddef','.mcpbound','.killpath','.releasegate','.s5v'])
FONT_EXT = {'.woff','.woff2','.ttf','.otf'}

class Pack:
    def __init__(self):
        self.assets: dict[str,dict] = {}
        self.pages: dict[str,dict] = {'before':{},'after':{}}

    def asset(self, path: Path, kind: str) -> str:
        raw=path.read_bytes()
        if kind in {'css','js'}:
            text=raw.decode('utf-8')
            if kind=='css':
                text=re.sub(r'@font-face\s*\{[^}]*\}', '', text)
            else:
                text=text.replace('window.location.pathname','window.__S5_REVIEW_PATH').replace('location.pathname','window.__S5_REVIEW_PATH')
            raw=text.encode()
        key=hashlib.sha256(raw).hexdigest()[:20]
        if key not in self.assets:
            self.assets[key]={'kind':kind,'data':text if kind in {'css','js'} else 'data:'+(mimetypes.guess_type(path.name)[0] or 'application/octet-stream')+';base64,'+base64.b64encode(raw).decode()}
        return key

    def page(self, root: Path, route: str, version: str):
        path=root/route.strip('/')/'index.html'
        if not path.exists():return
        soup=BeautifulSoup(path.read_text(encoding='utf-8'),'html.parser')
        def local(url):return root/urlsplit(urljoin('https://5sigmas.com'+route,url)).path.lstrip('/')
        for el in list(soup.select('link')):
            href=el.get('href','');p=local(href)
            if 'stylesheet' in el.get('rel',[]) and not href.startswith('http') and p.is_file():
                tag=soup.new_tag('style');tag['data-review-asset']=self.asset(p,'css');el.replace_with(tag)
            else:el.decompose()
        for el in list(soup.select('script')):
            if el.get('type') in {'application/ld+json','application/json'}:el.decompose();continue
            src=el.get('src')
            if src:
                p=local(src)
                # Material's remote navigation/search runtime is replaced only
                # inside the review iframe. Original visual runtimes are retained.
                if src.startswith('http') or 'bundle.' in src or 'mathjax.js' in src or not p.is_file():el.decompose();continue
                el.attrs={'data-review-asset':self.asset(p,'js')};el.string=''
            elif '__md_scope' in el.text or '__md_get' in el.text:el.decompose()
        for el in soup.select('img[src]'):
            p=local(el['src'])
            if p.is_file() and p.suffix not in FONT_EXT:
                el['data-review-src']=self.asset(p,'image');el['src']='';el.attrs.pop('srcset',None)
            elif not el['src'].startswith(('data:','http')):el['src']=urljoin('https://5sigmas.com'+route,el['src'])
        for el in soup.select('video'):
            if el.get('poster'):
                p=local(el['poster'])
                if p.is_file():el['data-review-poster']=self.asset(p,'image');del el['poster']
            for attr in ('src','data-src'):
                if el.get(attr):el[attr]=urljoin('https://5sigmas.com'+route,el[attr])
        for el in soup.select('source[src],track[src]'):
            el['src']=urljoin('https://5sigmas.com'+route,el['src'])
        for el in soup.select('[data-sx-preview]'):
            try:
                info=json.loads(el['data-sx-preview']);p=local(info.get('poster',''))
                if p.is_file():info['reviewPoster']=self.asset(p,'image')
                for key in ('video','track','watch'):
                    if info.get(key):info[key]=urljoin('https://5sigmas.com'+route,info[key])
                el['data-sx-preview']=json.dumps(info,ensure_ascii=False)
            except (ValueError,TypeError):pass
        soup.html['class']=['js']
        self.pages[version][route]={'html':str(soup),'title':soup.title.get_text() if soup.title else route}


def build(args):
    pack=Pack();series=[];visuals=[];references=[];routes={'/series/','/en/series/','/','/en/','/videos/','/en/videos/'}
    hub=BeautifulSoup((args.site/'series/index.html').read_text(),'lxml')
    for sn,detail in enumerate(hub.select('[data-sx-detail]'),1):
        chapters=[]
        for cn,ch in enumerate(detail.select('[data-sx-chapter-url]'),1):
            route=ch['data-sx-chapter-url'];title=ch.select_one('h3').get_text(' ',strip=True)
            chapters.append({'route':route,'title':title,'number':cn});routes.update({route,'/en'+route,'/videos'+route,'/en/videos'+route})
            page=BeautifulSoup((args.site/route.strip('/')/'index.html').read_text(),'lxml')
            if sn>=7:
                for vi,el in enumerate(page.select(ROOT),1):
                    h=el.select_one('h3,.aix-loop-title,.aix-eval-title,.aix-sec-title')
                    visuals.append({'id':f'{sn:02}-{cn:02}-{vi:02}','series':sn,'chapter':cn,'visual':vi,'route':route,'selector':ROOT,'index':vi-1,'title':h.get_text(' ',strip=True) if h else el.get('aria-label',title)})
            elif len([r for r in references if r['series']==sn])<2:
                # Actual reference components, not screenshot approximations.
                candidates=page.select('.anim-brand-shell')
                if not candidates:
                    candidates=[el for el in page.select('.md-content__inner div[id]') if el.select_one('canvas,svg') and el.select_one('button')]
                for el in candidates[:2]:
                    if len([r for r in references if r['series']==sn])>=2:break
                    if el.get('id'):selector='#'+el['id']
                    else:
                        cl=el.get('class',[])
                        if not cl:continue
                        selector='.'+cl[0]
                    if any(r['route']==route and r['selector']==selector for r in references):continue
                    h=el.select_one('h3,h2,[class*="title"]')
                    references.append({'id':f'R{sn}-{len(references)+1}','series':sn,'route':route,'selector':selector,'index':0,'title':h.get_text(' ',strip=True) if h else title})
        series.append({'number':sn,'slug':detail['id'].removeprefix('serie-'),'title':detail.select_one('h2').get_text(' ',strip=True),'chapters':chapters})
    for sn,route,selector,title in [
        (3,'/series/multimodalidad-iag/03-arquitecturas/','.ecl-wrap','Encoder → conector → LLM'),
        (4,'/series/modelos-razonadores/03-test-time-compute/','.bn-wrap','Best-of-N: candidatos y selección')]:
        p=args.site/route.strip('/')/'index.html'
        if p.exists() and BeautifulSoup(p.read_text(),'lxml').select_one(selector):
            references.append({'id':f'R{sn}-reference','series':sn,'route':route,'selector':selector,'index':0,'title':title})
    for version,root in [('before',args.before_site),('after',args.site)]:
        for route in sorted(routes):pack.page(root,route,version)
    # Baseline missing mirror routes must not silently render the candidate.
    common=set(pack.pages['before'])&set(pack.pages['after'])
    for version in pack.pages:pack.pages[version]={k:v for k,v in pack.pages[version].items() if k in common}
    # Runtime-promoted assets (e.g. native mobile diagrams) are kept available.
    for root in [args.before_site,args.site]:
        for path in (root/'assets/javascripts').glob('*.js'):
            if 'mobile' in path.name:pack.asset(path,'js')
    report=json.loads(args.report.read_text()) if args.report else {}
    metadata={'candidate':args.candidate_sha,'baseline':args.baseline_sha,'visual_count':len(visuals),'page_pairs':len(common),
              'baseline_label':'Versión rechazada b8a0ec5','candidate_label':'Nueva iteración',
              'validation':{'checks':len(report.get('checks',[])),'failures':sum(not c['pass'] for c in report.get('checks',[])),'errors':len(report.get('errors',[]))},
              'limitations':['Los vídeos conservan su URL original y necesitan conexión.','El visor no incluye el buscador global de Material ni MathJax remoto. La búsqueda del catálogo y los controles originales de los visuales sí funcionan.','Los PASS técnicos no constituyen aprobación visual GOLDEN.']}
    data={'meta':metadata,'series':series,'visuals':visuals,'references':references,'pages':pack.pages,'assets':pack.assets}
    payload=base64.b64encode(gzip.compress(json.dumps(data,ensure_ascii=False,separators=(',',':')).encode(),compresslevel=9)).decode()
    template=args.template.read_text(encoding='utf-8')
    result=template.replace('<!--REVIEW_PAYLOAD-->',payload)
    args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(result,encoding='utf-8')
    manifest={**metadata,'sha256':hashlib.sha256(args.output.read_bytes()).hexdigest(),'bytes':args.output.stat().st_size,'assets':len(pack.assets),'references':len(references),'production_source_hashes':{str(p.relative_to(args.site)):hashlib.sha256(p.read_bytes()).hexdigest() for p in [args.site/'stylesheets/advanced-series-golden.css',args.site/'stylesheets/series-experience.css',args.site/'assets/javascripts/advanced-series-golden.js',args.site/'assets/javascripts/series-experience.js']}}
    args.output.with_suffix('.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(manifest,ensure_ascii=False,indent=2))

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--site',type=Path,required=True);p.add_argument('--before-site',type=Path,required=True)
    p.add_argument('--output',type=Path,required=True);p.add_argument('--report',type=Path)
    p.add_argument('--candidate-sha',required=True);p.add_argument('--baseline-sha',required=True)
    p.add_argument('--template',type=Path,default=Path(__file__).resolve().parents[1]/'quality/series-owner-review/reviewer.html')
    build(p.parse_args())
