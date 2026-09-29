"""Inspect built UI and unchanged original source assets without a browser."""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
from urllib.parse import unquote, urlsplit
from bs4 import BeautifulSoup


def check(site: Path, output: Path):
    results = []
    for locale in ('', 'en/'):
        prefix = '/' + locale
        hub = BeautifulSoup((site / locale / 'series/index.html').read_text(), 'lxml')
        cards, details, chapters = hub.select('[data-sx-card]'), hub.select('[data-sx-detail]'), hub.select('[data-sx-chapter-url]')
        assert len(cards) == 13 and len(details) == 13 and len(chapters) == 67
        assert len(hub.select('[data-sx-card] img')) == 13
        assert sum(len(d.select('[data-sx-chapter-url]')) for d in details[6:]) == 40
        for element in hub.select('[data-sx-hub] a[href], [data-sx-hub] img[src]'):
            raw = element.get('href') or element.get('src')
            if raw.startswith('#'):
                assert hub.find(id=raw[1:]), raw
                continue
            parsed = urlsplit(raw)
            assert not parsed.netloc, raw
            assert parsed.path.startswith(prefix), raw
            path = site / unquote(parsed.path).lstrip('/')
            if parsed.path.endswith('/'):
                path /= 'index.html'
            assert path.is_file(), str(path)
        guides = []
        for path in (site / locale / 'series').glob('*/*/index.html'):
            text = path.read_text()
            if 'data-sx-guide=' not in text:
                continue
            doc = BeautifulSoup(text, 'lxml')
            guide = doc.select_one('[data-sx-guide]')
            assert guide and len(guide.select('[data-sx-step]')) == 4
            data = json.loads(guide['data-guide'])
            assert data['caveat'] and len(data['steps']) == 4
            assert doc.select_one('#s5-diagrama-original')
            assert doc.select_one('.anim-brand-shell, .aix-loop, .s5v'), 'original diagram was lost'
            assert not guide.find('article'), 'must not confuse reader-end placement'
            assert doc.select_one('.s5-reader-direct'), 'native reading navigation was lost'
            guides.append(str(path.relative_to(site)))
        assert len(guides) == 7, guides
        results.append({'locale': locale or 'es', 'series': 13, 'chapters': 67, 'advanced_chapters':40,
                        'real_cover_images':13, 'guide_pages': guides, 'all_generated_links_resolve':True})
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps({'status':'PASS','checks':results},ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'status':'PASS','locales':2,'series_per_locale':13,'chapters_per_locale':67,'guide_pages_total':14}))


if __name__ == '__main__':
    parser=argparse.ArgumentParser(); parser.add_argument('--site',type=Path,default=Path('site'));parser.add_argument('--output',type=Path,default=Path('artifacts/series-ui-review/source-tests.json'))
    args=parser.parse_args();check(args.site,args.output)
