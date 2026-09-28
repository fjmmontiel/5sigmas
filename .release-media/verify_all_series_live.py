"""Read-only exact-byte publication inventory for all thirteen approved series."""
from __future__ import annotations
import collections, concurrent.futures, hashlib, html, json, os, re, time
from pathlib import Path
from urllib.parse import urlsplit, urljoin
from urllib.request import Request, urlopen
ROOT = Path(os.environ.get('SOURCE_ROOT', 'audit-source'))
REVISION = os.environ['EXPECTED_REVISION']
OUT = Path('/tmp/all-series-publication')
ORIGIN = 'https://5sigmas.com'
COUNTS = {'fundamentos-ia-iag':10, 'from-cave-to-agi':12, 'multimodalidad-iag':12, 'modelos-razonadores':12, 'ia-pib-bienestar-energia':10, 'datacenters-espacio':10, 'seguridad-ia':12, 'agentes-ia':12, 'agentes-voz-tiempo-real':12, 'coding-agents-agent-harnesses':12, 'context-engineering-memory-mcp':12, 'llm-inference-engineering-economics':12, 'evaluating-ai-systems-production':12}
OUT.mkdir(parents=True, exist_ok=True)
def request(path, headers=None):
    if path.startswith('https://'):
        u = urlsplit(path)
        assert u.scheme == 'https' and u.netloc == '5sigmas.com', 'Unexpected public origin'
        path = u.path
    assert path.startswith('/') and '..' not in path.split('/')
    return urlopen(Request(ORIGIN + path + '?publication_audit=' + REVISION, headers={'User-Agent':'5sigmas-owner-approved-series-audit/1','Cache-Control':'no-cache', **(headers or {})}), timeout=60)
def get(path):
    with request(path) as r:
        assert r.status == 200, (path, r.status)
        return r.read()
def json_nodes(x):
    if isinstance(x, dict):
        yield x
        for v in x.values(): yield from json_nodes(v)
    elif isinstance(x, list):
        for v in x: yield from json_nodes(v)
def main():
    pins, sources = {}, {}
    files = [ROOT/'.github/workflows/deploy-pages.yml'] + sorted((ROOT/'.github/receipts').glob('*.sha256'))
    for p in files:
        raw = p.read_bytes()
        sources[str(p.relative_to(ROOT))] = hashlib.sha256(raw).hexdigest()
        for digest, original in re.findall(r'^\s*([0-9a-f]{64})\s+((?:docs/series/|locales/en/series/)[^\s]+\.mp4)\s*$',raw.decode(), re.M):
            route = '/' + (original[5:] if original.startswith('docs/') else original[len('locales/'):])
            if route in pins: assert pins[route] == digest, 'Conflicting approval'
            pins[route] = digest
    assert len(pins) == 150
    actual = collections.Counter(route.split('/series/')[1].split('/')[0] for route in pins)
    assert dict(actual) == COUNTS, dict(actual)
    for attempt in range(40):
        try: seen = json.loads(get('/build.json')).get('revision')
        except Exception: seen = None
        if seen == REVISION: break
        time.sleep(5)
    assert seen == REVISION, ('Expected deployed revision', seen, REVISION)
    catalogues, indexed = {}, {}
    for locale, prefix in [('es',''),('en','/en')]:
        c = json.loads(get(prefix+'/videos/catalog.json'))
        assert c['count'] == len(c['videos']) == 76
        rows = [r for r in c['videos'] if '/series/' in urlsplit(r['video_url']).path]
        assert len(rows) == 75 and len({r['watch_url'] for r in rows}) == 75
        expected = {p for p in pins if p.startswith('/en/') == (locale == 'en')}
        assert {urlsplit(r['video_url']).path for r in rows} == expected
        catalogues[locale] = {'count':c['count'],'series_videos':len(rows),'non_series_videos':1}
        for r in rows:
            route = urlsplit(r['video_url']).path
            assert route not in indexed
            indexed[route] = (locale,r)
    def check(route):
        locale, row = indexed[route]
        result = {'path':route,'locale':locale,'series':route.split('/series/')[1].split('/')[0], 'expected_sha256':pins[route],'article':row['source_url'],'watch':row['watch_url']}
        try:
            h = hashlib.sha256(); count = 0; beginning = b''
            with request(route) as r:
                assert r.status == 200
                content_type = r.headers.get_content_type()
                assert content_type == 'video/mp4', content_type
                length = r.headers.get('Content-Length')
                while chunk := r.read(1048576):
                    if not beginning: beginning = chunk[:1024]
                    count += len(chunk); h.update(chunk)
            assert h.hexdigest() == pins[route], 'PUBLIC_BYTES_MISMATCH'
            assert length is None or int(length) == count
            with request(route, {'Range':'bytes=0-1023'}) as r:
                assert r.status == 206, ('RANGE_STATUS',r.status)
                assert r.headers.get('Content-Range') == f'bytes 0-1023/{count}'
                assert r.read(1025) == beginning
            article = get(row['source_url']).decode(); watch = get(row['watch_url']).decode()
            assert '<video' in article and '<video' in watch
            assert route in article and route in watch
            assert urlsplit(row['watch_url']).path in article
            assert urlsplit(row['source_url']).path in watch
            found=[]
            for raw in re.findall(r'<script[^>]*type=[\"\']application/ld\+json[\"\'][^>]*>(.*?)</script>',watch,re.S):
                found.extend(x for x in json_nodes(json.loads(raw)) if x.get('@type')=='VideoObject')
            assert len(found)==1
            assert urlsplit(found[0]['contentUrl']).path==route and found[0]['inLanguage']==locale
            assert found[0]['duration']==row['duration_iso']
            assert not re.search(r'<meta[^>]+name=[\"\']robots[\"\'][^>]+noindex',watch,re.I)
            with request(row['thumb_url']) as r:
                assert r.status==200 and r.headers.get_content_type().startswith('image/') and r.read(16)
            tracks=[]
            for tag in re.findall(r'<track\b[^>]*>',watch,re.I):
                attrs={k.lower():html.unescape(v) for k,_,v in re.findall(r'([\w-]+)\s*=\s*([\"\'])(.*?)\2',tag)}
                if attrs.get('kind') not in ['captions','subtitles']: continue
                url=urljoin(row['watch_url'],attrs['src'])
                assert get(url).lstrip().startswith(b'WEBVTT'),'Declared captions not retrievable VTT'
                tracks.append(url)
            transcript_present='s5-video-watch__transcript' in watch or bool(re.search(r'id=[\"\']video-transcript[\"\']',watch))
            result.update(status='PASS',bytes=count,sha256=h.hexdigest(),range='206_EXACT_FIRST_1024_BYTES',media_type=content_type,article_watch_schema='PASS',poster='PUBLIC_IMAGE_PRESENT',rendered_caption_tracks_verified=tracks,rendered_transcript_block_present=transcript_present,rendered_clip_count=len(found[0].get('hasPart',[])))
        except Exception as exc:
            result.update(status='FAIL',error=type(exc).__name__+': '+str(exc)[:350])
        print(result['status'],route,flush=True)
        return result
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        results=list(pool.map(check,sorted(pins)))
    final_revision=json.loads(get('/build.json')).get('revision')
    passed=sum(x['status']=='PASS' for x in results)
    aggregate={s:{'expected':n,'passed':sum(x['status']=='PASS' and x['series']==s for x in results)} for s,n in COUNTS.items()}
    accessibility={'scope':'Observed generated watch markup and retrieval of declared caption tracks, not WCAG conformance or qualitative transcript assessment','with_caption_tracks':sum(bool(x.get('rendered_caption_tracks_verified')) for x in results),'with_transcript_block':sum(x.get('rendered_transcript_block_present',False) for x in results),'missing_either':[x['path'] for x in results if x['status']=='PASS' and not (x['rendered_caption_tracks_verified'] and x['rendered_transcript_block_present'])]}
    report={'schema':1,'status':'PASS' if passed==150 and final_revision==REVISION else 'FAIL', 'revision_before':seen,'revision_after':final_revision,'expected_revision':REVISION, 'observed_at_utc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()), 'scope':'All thirteen series: 150 exact approved horizontal ES/EN MP4s, HTTP Range, article/watch consumers, locale/schema/catalogue consistency and public poster availability. Not a new visual approval, accessibility certification, full browser playback audit or search engine indexing claim.', 'series_count':13,'conceptual_pieces':75,'media_expected':150,'media_pass':passed,'catalogues':catalogues, 'total_bytes':sum(x.get('bytes',0) for x in results),'approval_source_sha256':sources,'by_series':aggregate,'rendered_accessibility':accessibility,'results':results}
    (OUT/'ALL_SERIES_LIVE.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({k:v for k,v in report.items() if k not in ['results','approval_source_sha256']},ensure_ascii=False))
    assert report['status']=='PASS','ALL_SERIES_PUBLICATION_INCOMPLETE'
if __name__=='__main__':main()
