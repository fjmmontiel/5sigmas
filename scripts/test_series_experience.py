"""Verify the bilingual human-navigation redesign while preserving prior GOLDEN visuals."""
from __future__ import annotations
import argparse, json
from pathlib import Path
from urllib.parse import unquote, urlsplit
from bs4 import BeautifulSoup

VISUAL_SELECTOR = '.anim-brand-shell, .aix-loop, .aix-eval, .aix-sec, .s5v'

def check(site: Path, output: Path):
    results=[]
    for locale in ('','en/'):
        prefix='/'+locale
        hub=BeautifulSoup((site/locale/'series/index.html').read_text(),'lxml')
        cards=hub.select('[data-sx-card]');details=hub.select('[data-sx-detail]');chapters=hub.select('[data-sx-chapter-url]')
        assert len(cards)==13 and len(details)==13 and len(chapters)==67
        assert len(hub.select('[data-sx-card] .sx-card-poster'))==13
        assert len(hub.select('[data-sx-card] [data-sx-card-video][data-src]'))==13
        assert not hub.select('[data-sx-card] [data-sx-card-video] video'), 'Series previews must not create video elements before user intent'
        assert sum(len(d.select('[data-sx-chapter-url]')) for d in details[6:])==40
        assert len(hub.select('.sx-path'))==4
        assert not hub.select('a[href*="#mecanismo"]'), 'Series cards must not point to discarded guided mechanisms'
        players=hub.select('[data-sx-player] video')
        assert players
        for element in hub.select('[data-sx-hub] a[href], [data-sx-hub] video[poster], [data-sx-hub] track[src]'):
            raw=element.get('href') or element.get('poster') or element.get('src')
            if raw.startswith('#'):
                assert hub.find(id=raw[1:]),raw
                continue
            parsed=urlsplit(raw); assert not parsed.netloc,raw; assert parsed.path.startswith(prefix),raw
            path=site/unquote(parsed.path).lstrip('/')
            if parsed.path.endswith('/'): path/='index.html'
            assert path.is_file(),str(path)
        originals=0; advanced=0
        for path in sorted((site/locale/'series').glob('*/*/index.html')):
            doc=BeautifulSoup(path.read_text(),'lxml')
            if not doc.select_one('.s5-reader-context'): continue
            rel=path.relative_to(site/locale/'series')
            series_slug=rel.parts[0]
            if series_slug not in {'seguridad-ia','agentes-ia','agentes-voz-tiempo-real','coding-agents-agent-harnesses','context-engineering-memory-mcp','llm-inference-engineering-economics','evaluating-ai-systems-production'}:
                continue
            if rel.parts[1].startswith('00'): continue
            advanced+=1
            assert not doc.select('[data-sx-guide]'), str(path)
            assert not doc.select('.sx-reader-context,.sx-reader-next,[data-sx-reader-index]'), str(path)
            assert doc.select_one('.s5-reader-end'), str(path)
            if doc.select_one(VISUAL_SELECTOR): originals+=1
        assert advanced==40, advanced
        assert originals==39, originals
        results.append({'locale':locale or 'es','series':13,'chapters':67,'advanced_chapters':advanced,'golden_visuals_direct':originals,'guided_replacements':0,'inline_players':len(players),'editorial_covers':len(hub.select('[data-sx-card] .sx-card-poster')),'lazy_motion_previews':len(hub.select('[data-sx-card] [data-sx-card-video][data-src]'))})
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps({'status':'PASS','checks':results},ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'status':'PASS','series_per_locale':13,'chapters_per_locale':67,'advanced_chapters_per_locale':40,'golden_visuals_direct':[x['golden_visuals_direct'] for x in results],'guided_replacements':0}))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--site',type=Path,default=Path('site'));p.add_argument('--output',type=Path,default=Path('artifacts/series-ui-review/source-tests.json'));a=p.parse_args();check(a.site,a.output)
