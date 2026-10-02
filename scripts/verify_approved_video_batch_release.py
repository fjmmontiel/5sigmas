#!/usr/bin/env python3
"""Verify exact approved APPROVED_BATCH integration locally or against the deployed revision."""
from __future__ import annotations
import argparse,hashlib,json,os,re,subprocess,time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request,urlopen
ROOT=Path(__file__).resolve().parents[1]
def objects(v):
 if isinstance(v,dict):
  yield v
  for x in v.values():yield from objects(x)
 elif isinstance(v,list):
  for x in v:yield from objects(x)
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--site-dir',default='site');ap.add_argument('--origin');ap.add_argument('--revision',default=os.environ.get('GITHUB_SHA',''));ap.add_argument('--base-ref');ap.add_argument('--output',default='/tmp/approved-video-batch-20260928-integration.json');a=ap.parse_args()
 m=json.loads((ROOT/'docs/approved-video-batch-20260928-release.json').read_text());assert len(m['objects'])==60 and len(m['collections'])==5;assert m['owner_approval']=='EXPLICIT_APPROVALS_2026-09-26_2026-09-27_AND_2026-09-28'
 cache={}
 def get(path):
  path=path.lstrip('/')
  if path in cache:return cache[path]
  if a.origin:
   url=a.origin.rstrip('/')+'/'+path;sep='&' if '?' in url else '?'
   target=url+sep+'revision='+a.revision
   retryable={429,500,502,503,504}
   last_error=None
   for attempt in range(4):
    req=Request(target,headers={'Cache-Control':'no-cache','Pragma':'no-cache','User-Agent':'5sigmas-approved-batch-release-check/2'})
    try:
     with urlopen(req,timeout=60) as r:
      assert r.status==200
      value=r.read()
     break
    except HTTPError as exc:
     last_error=exc
     if exc.code not in retryable or attempt==3: raise
    except URLError as exc:
     last_error=exc
     if attempt==3: raise
    time.sleep(2**attempt)
   else:
    raise last_error or RuntimeError(f'Unable to fetch {target}')
  else:
   rel=path+'index.html' if path.endswith('/') else path;value=(ROOT/a.site_dir/rel).read_bytes()
  cache[path]=value;return value
 if a.origin and a.revision:
  for attempt in range(60):
   cache.pop('build.json',None)
   try:current=json.loads(get('build.json')).get('revision')
   except Exception:current=None
   if current==a.revision:break
   time.sleep(5)
  assert current==a.revision,('deployed_revision',current,a.revision)
 assert json.loads(get('approved-video-batch-20260928-release.json'))==m
 results=[]
 for row in m['objects']:
  raw=get(row['path']);assert len(raw)==row['bytes'] and hashlib.sha256(raw).hexdigest()==row['sha256'],row['path']
  assert hashlib.sha256(get(row['poster_path'])).hexdigest()==row['poster_sha256']
  prefix='' if row['locale']=='es' else 'en/';cat=json.loads(get(prefix+'videos/catalog.json'))
  matches=[x for x in cat['videos'] if urlsplit(x['watch_url']).path=='/'+row['watch']]
  assert len(matches)==1 and matches[0]['duration_seconds']==row['duration'],row['watch']
  vmap=get(prefix+'video-sitemap.xml').decode();smap=get(prefix+'sitemap.xml').decode()
  assert row['watch'] in vmap and row['watch'] in smap and row['article'] in smap
  article=get(row['article']).decode();watch=get(row['watch']).decode()
  assert '<video' in article and 's5-video-embed' in article and row['watch'] in article
  assert row['article'] in watch and 's5-video-watch__transcript' in watch
  assert hashlib.sha256(get(row['captions_path'])).hexdigest()==row['captions_sha256']
  assert hashlib.sha256(get(row['transcript_path'])).hexdigest()==row['transcript_sha256']
  captions_text=get(row['captions_path']).decode()
  assert captions_text.startswith('WEBVTT') and captions_text.count(' --> ')==18
  assert row['captions_path'] in watch and '<track' in watch
  assert ('Vídeo sin narración' if row['locale']=='es' else 'video has no narration') in watch
  found=[]
  for text in re.findall(r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',watch,re.S):
   found.extend(n for n in objects(json.loads(text)) if n.get('@type')=='VideoObject')
  assert len(found)==1
  v=found[0];assert urlsplit(v['contentUrl']).path=='/'+row['path'];assert v['duration']==row["duration_iso"];assert v.get('inLanguage')==row['locale']
  clips=v.get('hasPart',[]);assert len(clips)==6
  for actual,expected in zip(clips,row['chapters']):assert actual['startOffset']==expected['start'] and actual['endOffset']==expected['end'] and actual['name']==expected['name']
  assert 'potentialAction' not in v
  assert not re.search(r'<meta[^>]+name=["\']robots["\'][^>]+noindex',watch,re.I)
  results.append(dict(path=row['path'],sha256=row['sha256'],article=row['article'],watch=row['watch'],status='PASS'))
  print('PASS exact APPROVED_BATCH media + discovery',row['locale'],row['path'],flush=True)
 import yaml
 integrity=json.loads((ROOT/'.github/receipts/approved-video-batch-20260928-content.json').read_text())
 for item in integrity:
  text=(ROOT/item['path']).read_text();parts=text.split('---',2)
  if 'unchanged_sha256' in item:
   assert hashlib.sha256(text.encode()).hexdigest()==item['unchanged_sha256'],('unchanged_article_changed',item['path'])
   continue
  assert hashlib.sha256(parts[2].encode()).hexdigest()==item['body_sha256'],('article_body_changed',item['path'])
  actual={k:v for k,v in yaml.safe_load(parts[1]).items() if not k.startswith('video')}
  assert json.loads(json.dumps(actual,default=str))==item['nonvideo_metadata'],('article_metadata_changed',item['path'])
 if a.base_ref:
  rel='locales/en/media.yml';old=yaml.safe_load(subprocess.check_output(['git','show',a.base_ref+':'+rel],cwd=ROOT));new=yaml.safe_load((ROOT/rel).read_text())
  allowed=tuple('series/'+c['series']+'/' for c in m['collections'])+('series/fundamentos-ia-iag/','series/ia-pib-bienestar-energia/')
  assert old.keys()==new.keys();assert all(old[k]==new[k] for k in old if not k.startswith(allowed))
 report=dict(scope='Exact approved APPROVED_BATCH integration, not a new visual approval',revision=a.revision,origin=a.origin,media_count=60,surface_count=120,clips=360,status='PASS',results=results)
 Path(a.output).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print('APPROVED_BATCH_INTEGRATION_PASS 60 media,120 article/watch surfaces,360 clips')
if __name__=='__main__':main()
