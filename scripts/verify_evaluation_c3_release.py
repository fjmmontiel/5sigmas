#!/usr/bin/env python3
"""Verify exact approved C3 integration locally or against the deployed revision."""
from __future__ import annotations
import argparse,hashlib,json,os,re,subprocess,time
from pathlib import Path
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
 ap=argparse.ArgumentParser();ap.add_argument('--site-dir',default='site');ap.add_argument('--origin');ap.add_argument('--revision',default=os.environ.get('GITHUB_SHA',''));ap.add_argument('--base-ref');ap.add_argument('--output',default='/tmp/evaluation-c3-integration.json');a=ap.parse_args()
 m=json.loads((ROOT/'docs/evaluation-c3-release.json').read_text());assert len(m['objects'])==12 and m['round']=='C3';assert m['owner_approval']=='APPROVED_2026-09-25'
 cache={}
 def get(path):
  path=path.lstrip('/')
  if path in cache:return cache[path]
  if a.origin:
   url=a.origin.rstrip('/')+'/'+path;sep='&' if '?' in url else '?'
   req=Request(url+sep+'revision='+a.revision,headers={'Cache-Control':'no-cache','User-Agent':'5sigmas-c3-release-check/1'})
   with urlopen(req,timeout=60) as r:assert r.status==200;value=r.read()
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
 assert json.loads(get('evaluation-c3-release.json'))==m
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
  captions_text=get(row['captions_path']).decode()
  assert captions_text.startswith('WEBVTT') and captions_text.count(' --> ')==18
  assert row['captions_path'] in watch and '<track' in watch
  assert ('Vídeo sin narración' if row['locale']=='es' else 'video has no narration') in watch
  found=[]
  for text in re.findall(r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',watch,re.S):
   found.extend(n for n in objects(json.loads(text)) if n.get('@type')=='VideoObject')
  assert len(found)==1
  v=found[0];assert urlsplit(v['contentUrl']).path=='/'+row['path'];assert v['duration']==f'PT{row["duration"]//60}M{row["duration"]%60}S';assert v.get('inLanguage')==row['locale']
  clips=v.get('hasPart',[]);assert len(clips)==6
  for actual,expected in zip(clips,row['chapters']):assert actual['startOffset']==expected['start'] and actual['endOffset']==expected['end'] and actual['name']==expected['name']
  assert 'potentialAction' not in v
  assert not re.search(r'<meta[^>]+name=["\']robots["\'][^>]+noindex',watch,re.I)
  results.append(dict(path=row['path'],sha256=row['sha256'],article=row['article'],watch=row['watch'],status='PASS'))
  print('PASS exact C3 media + discovery',row['locale'],row['path'],flush=True)
 if a.base_ref:
  import yaml
  for p in sorted((ROOT/'docs/series/evaluating-ai-systems-production').glob('*.md')):
   rel=p.relative_to(ROOT).as_posix();old=subprocess.check_output(['git','show',a.base_ref+':'+rel],cwd=ROOT).decode()
   assert old.split('---',2)[2]==p.read_text().split('---',2)[2],('article_body_changed',rel)
  rel='locales/en/media.yml';old=yaml.safe_load(subprocess.check_output(['git','show',a.base_ref+':'+rel],cwd=ROOT));new=yaml.safe_load((ROOT/rel).read_text())
  assert old.keys()==new.keys();assert all(old[k]==new[k] for k in old if not k.startswith('series/evaluating-ai-systems-production/'))
 report=dict(scope='Exact approved C3 integration, not a new visual approval',revision=a.revision,origin=a.origin,media_count=12,surface_count=24,clips=72,status='PASS',results=results)
 Path(a.output).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print('C3_INTEGRATION_PASS 12 media,24 article/watch surfaces,72 clips')
if __name__=='__main__':main()
