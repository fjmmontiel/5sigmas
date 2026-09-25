#!/usr/bin/env python3
"""Keep reviewed video dates consistent; article publication dates are not video dates."""
import json
import sys
from pathlib import Path
from tempfile import TemporaryDirectory
from xml.etree import ElementTree as ET
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from hooks.video_discovery_surface import CONTRACT, _bind_catalogue, _bind_video_sitemap
S = "http://www.sitemaps.org/schemas/sitemap/0.9"
V = "http://www.google.com/schemas/sitemap-video/1.1"
def assert_date_parity():
    sources = sorted((ROOT / 'discovery/modelos-razonadores').glob('*.json'))
    assert len(sources) == 12
    for path in sources:
        source = json.loads(path.read_text())
        compiled = CONTRACT.compile_source(source)
        with TemporaryDirectory() as temp:
            root = Path(temp); (root / 'videos').mkdir()
            row = dict(watch_url=source['watch_url'], video_url=source['video_url'], thumb_url=source['poster_url'], duration_seconds=source['duration_ms']//1000, publication_date='2026-04-10T00:00:00+00:00')
            untouched = dict(watch_url='https://5sigmas.com/unrelated/', publication_date='2026-01-01T00:00:00Z')
            catalog = root / 'videos/catalog.json'
            catalog.write_text(json.dumps({'version':2,'videos':[row,untouched]}))
            doc = ET.Element('{'+S+'}urlset'); url = ET.SubElement(doc,'{'+S+'}url')
            ET.SubElement(url,'{'+S+'}loc').text=source['watch_url']
            video = ET.SubElement(url,'{'+V+'}video')
            for key,value in {'thumbnail_loc':source['poster_url'],'content_loc':source['video_url'],'duration':str(source['duration_ms']//1000),'title':'Legacy title','description':'Legacy description','publication_date':row['publication_date']}.items():
                ET.SubElement(video,'{'+V+'}'+key).text=value
            sitemap = root / 'video-sitemap.xml'; sitemap.write_text(ET.tostring(doc,encoding='unicode'))
            _bind_catalogue(root,source,compiled); _bind_video_sitemap(root,source,source['locale'])
            payload=json.loads(catalog.read_text()); actual=payload['videos'][0]
            assert actual['publication_date']==compiled['schema']['uploadDate']==source['upload_date'], path
            assert payload['videos'][1]==untouched
            actual_date=ET.fromstring(sitemap.read_text()).findtext('.//{'+V+'}publication_date')
            assert actual_date==source['upload_date'], path
            before_catalog=catalog.read_bytes(); before_sitemap=sitemap.read_bytes()
            _bind_catalogue(root,source,compiled); _bind_video_sitemap(root,source,source['locale'])
            assert before_catalog==catalog.read_bytes() and before_sitemap==sitemap.read_bytes()
            bad=dict(source,video_url='https://5sigmas.com/unauthorized.mp4')
            for operation,args in [(_bind_catalogue,(root,bad,compiled)),(_bind_video_sitemap,(root,bad,source['locale']))]:
                try: operation(*args)
                except CONTRACT.ContractError: pass
                else: raise AssertionError('Media identity mismatch must fail closed')
    print('PASS reviewed date parity:12 exact ES/EN records, unaffected rows, idempotency and24 immutable-media negative checks')
if __name__=='__main__': assert_date_parity()
