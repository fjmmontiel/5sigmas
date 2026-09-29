"""Verify the rendered, bilingual series contract. Does not replace browser QA."""
from __future__ import annotations
import argparse
import json
from pathlib import Path
from urllib.parse import unquote, urlsplit
from bs4 import BeautifulSoup


def check(site: Path, output: Path):
    results=[]
    for locale in ('','en/'):
        prefix='/'+locale
        hub=BeautifulSoup((site/locale/'series/index.html').read_text(),'lxml')
        cards=hub.select('[data-sx-card]');details=hub.select('[data-sx-detail]');chapters=hub.select('[data-sx-chapter-url]')
        assert len(cards)==13 and len(details)==13 and len(chapters)==67
        assert len(hub.select('[data-sx-card] svg[role="img"][aria-label]'))==13
        assert sum(len(d.select('[data-sx-chapter-url]')) for d in details[6:])==40
        assert len(hub.select('.sx-path'))==4
        assert len({d['id'] for d in details})==13
        players=hub.select('[data-sx-player] video')
        assert players, 'No published source video available for inline playback'
        for element in hub.select('[data-sx-hub] a[href], [data-sx-hub] video[poster], [data-sx-hub] track[src]'):
            raw=element.get('href') or element.get('poster') or element.get('src')
            if raw.startswith('#'):
                assert hub.find(id=raw[1:]),raw
                continue
            parsed=urlsplit(raw)
            assert not parsed.netloc,raw
            assert parsed.path.startswith(prefix),raw
            path=site/unquote(parsed.path).lstrip('/')
            if parsed.path.endswith('/'): path/='index.html'
            assert path.is_file(),str(path)
            if parsed.fragment:
                target=BeautifulSoup(path.read_text(),'lxml') if path.suffix=='.html' else None
                assert target and target.find(id=parsed.fragment),raw
        for v in players:
            assert v['preload']=='none' and not v.has_attr('autoplay')
            assert not v.get('src'), 'The source must be loaded only on an explicit playback action'
            assert (site/unquote(v['data-src']).lstrip('/')).is_file()
        guides=[]; views=set(); originals=0
        for path in (site/locale/'series').glob('*/*/index.html'):
            text=path.read_text()
            if 'data-sx-guide=' not in text: continue
            doc=BeautifulSoup(text,'lxml');guide=doc.select_one('[data-sx-guide]')
            assert len(doc.select('[data-sx-guide]'))==1
            assert len(guide.select('[data-sx-step]'))==4
            assert len(guide.select('[data-sx-scenario]'))==2
            data=json.loads(guide['data-guide'])
            assert data['locale']==('en' if locale else 'es')
            assert data['view'] not in views; views.add(data['view'])
            assert len(data['steps'])==4 and len(data['options'])==2 and data['caveat']
            assert guide.select_one('#s5-diagrama-original')
            original=guide.select_one('[data-sx-panel="original"]')
            originals+=bool(original.select_one('.anim-brand-shell, .aix-loop, .s5v, svg'))
            assert not guide.find('article'), 'Do not break native reader-end placement'
            assert doc.select_one('.s5-reader-direct'),str(path)
            assert doc.select_one('.sx-reader-context') and doc.select_one('.sx-reader-next')
            ids=[n['id'] for n in guide.select('[id]')]
            assert len(ids)==len(set(ids)),str(path)
            guides.append({'path':str(path.relative_to(site)),'view':data['view'],'kind':data['kind'],'integrated_original':bool(original.select_one('.anim-brand-shell, .aix-loop, .s5v, svg'))})
        assert len(guides)==40, len(guides)
        results.append({'locale':locale or 'es','series':13,'chapters':67,'advanced_chapters':40,'guides':guides,'integrated_originals':originals,'inline_players':len(players),'generated_links_resolve':True})
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps({'status':'PASS','checks':results},ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'status':'PASS','series_per_locale':13,'chapters_per_locale':67,'guides_total':80,'integrated_originals':[x['integrated_originals'] for x in results]}))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--site',type=Path,default=Path('site'));p.add_argument('--output',type=Path,default=Path('artifacts/series-ui-review/source-tests.json'));a=p.parse_args();check(a.site,a.output)
