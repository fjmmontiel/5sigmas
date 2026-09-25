from __future__ import annotations
import argparse, concurrent.futures, hashlib, html, importlib, json, os, re, shutil, subprocess, sys
from pathlib import Path
import yaml
HERE=Path(__file__).resolve().parent
SERIES='evaluating-ai-systems-production'
HASHES={
'01-fronteras-es-h.mp4':'8c8350056bb6865cf58a6207118ff5ea7b74be32386aca6ea46f7cd3c0f56558',
'01-fronteras-en-h.mp4':'e1fe61c11948c38b57c8272786b5e0676e8cc70125243ee44c87c99483702f53',
'02-eval-sets-es-h.mp4':'2fa16609049b6b25d2720a262197ed6131be9cb40f46437d85a8cd135e428f81',
'02-eval-sets-en-h.mp4':'6bfe21e4c7f2a7bdcc2291e5f90b83f6c6c951f9862370c9875736f664fa90e6',
'03-jueces-es-h.mp4':'c22024833d6d8111e7018de791acb13ab841c6c603bb09224ac822322f046921',
'03-jueces-en-h.mp4':'6c055e7276052453c81937150248c383c7b8014d3eae8d187d6c1a3a5e301fe6',
'04-trayectorias-es-h.mp4':'384b7ba855918e40e09b44881c35d9632109788650668cb4080f7d205910e595',
'04-trayectorias-en-h.mp4':'39850a9d765d52d003ab6b3f6df6954240854215feaa5c3f0f70d59c845d2deb',
'05-online-es-h.mp4':'317ef8b608fe00537d73ae02cf9d69e447c06811a92d175632b6d5f416f5acf8',
'05-online-en-h.mp4':'8a415aeb02683745468768de64b4892ed851f8473fc2bfd9c7bfc2ea2c6fa9d3',
'06-repair-loop-es-h.mp4':'229287765f648da399ba7a1969b6fe517277dc12708d3f9f7f5e138eff246195',
'06-repair-loop-en-h.mp4':'92af362202b5647bd0c83897d7ab2f1ee9d55deee4c6d5b01e31b5aa213a77df'}
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def assemble():
 rows=json.loads((HERE/'story1.json').read_text())+json.loads((HERE/'story2.json').read_text())
 chapters=[]
 for n,slug,es,en,scenes in rows:
  chapters.append(dict(chapter=n,slug=slug,title=dict(es=es,en=en),scenes=[dict(id=k,duration=d,illustrative=i,title=dict(es=es_t,en=en_t),cues=dict(es=es_c,en=en_c),cue_times=[.7,7.4,14.1],visual_times=[1.3,8.,14.7]) for k,d,i,es_t,en_t,es_c,en_c in scenes]))
 (HERE/'story.json').write_text(json.dumps(dict(chapters=chapters),ensure_ascii=False))
 (HERE/'render.py').write_text('\n'.join((HERE/f'part{i}.py').read_text() for i in range(4)))
 return chapters

def recover_one(args):
 ch,lang,cache,existing=args
 name=f'{ch["chapter"]:02}-{ch["slug"]}-{lang}-h.mp4';out=Path(cache)/name;out.parent.mkdir(parents=True,exist_ok=True)
 if existing:
  src=Path(existing)/name
  assert sha(src)==HASHES[name],name
  shutil.copyfile(src,out)
 elif not out.exists():
  sys.path.insert(0,str(HERE));r=importlib.import_module('render')
  os.environ['ENCODE_THREADS']='2';os.environ['ENCODE_PRESET']='veryfast'
  r.render_video(ch,lang,'h',out,60)
 assert sha(out)==HASHES[name],f'Not approved bytes: {name}'
 subprocess.run(['ffmpeg','-v','error','-xerror','-i',str(out),'-map','0:v:0','-f','null','-'],check=True)
 print('EXACT_APPROVED_RECOVERY_PASS',name,HASHES[name],flush=True)
 return name

def patch(root,name,changes):
 p=root/name;s=p.read_text()
 for old,new in changes:
  assert old in s,(name,old)
  s=s.replace(old,new)
 p.write_text(s)

def integrate(root,chapters,cache):
 root=Path(root);docs=root/'docs/series'/SERIES;enroot=root/'locales/en/series'/SERIES
 canonical=sorted(p for p in docs.glob('*.md') if re.match(r'0[1-6]-',p.name))
 assert len(canonical)==6
 media_path=root/'locales/en/media.yml';media_text=media_path.read_text();before=yaml.safe_load(media_text)
 objects=[];receipt=[]
 for ch,article in zip(chapters,canonical):
  assert int(article.name[:2])==ch['chapter']
  stem=article.stem
  for lang,folder,prefix in [('es',docs,''),('en',enroot,'en/')]:
   source=Path(cache)/f'{ch["chapter"]:02}-{ch["slug"]}-{lang}-h.mp4';dest=folder/f'{stem}.mp4'
   folder.mkdir(parents=True,exist_ok=True);shutil.copyfile(source,dest)
   assert sha(dest)==HASHES[source.name]
   poster=folder/f'{stem}.jpg'
   subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss','19','-i',str(dest),'-frames:v','1','-vf','scale=1280:720','-q:v','2',str(poster)],check=True)
   offset=0;clips=[];transcript=['<p>'+('Transcripción del texto visual. Vídeo sin narración.' if lang=='es' else 'Visual-text transcript. This video has no narration.')+'</p>']
   for sc in ch['scenes']:
    title=sc['title'][lang].replace('\n',' ')
    clips.append(dict(name=title,start=offset,end=offset+sc['duration']))
    transcript.append(f'<h3>{offset//60:02}:{offset%60:02} — {html.escape(title)}</h3>')
    transcript.extend('<p>'+html.escape(t)+'</p>' for t in sc['cues'][lang])
    if sc['illustrative']:transcript.append('<p><em>'+('Ejemplo ilustrativo, no resultado de benchmark.' if lang=='es' else 'Illustrative example, not a benchmark result.')+'</em></p>')
    offset+=sc['duration']
   (folder/f'{stem}-transcript.html').write_text('\n'.join(transcript)+'\n')
   meta=dict(video=f'{stem}.mp4',video_poster=f'{stem}.jpg',video_title=ch['title'][lang],video_summary=' '.join(ch['scenes'][-1]['cues'][lang][1:]),video_duration=f'PT{offset//60}M{offset%60}S',video_transcript=f'{stem}-transcript.html',video_chapters=clips)
   if lang=='es':
    original=article.read_text();_,fm,body=original.split('---',2)
    vals={k:v for k,v in yaml.safe_load(fm).items() if not(k=='video' or k.startswith('video_'))};vals.update(meta)
    article.write_text('---\n'+yaml.safe_dump(vals,allow_unicode=True,sort_keys=False)+'---'+body)
    assert article.read_text().split('---',2)[2]==body
   else:
    key=f'series/{SERIES}/{stem}.md';assert key in before
    expr=r'(?ms)^'+re.escape(key)+r':\n.*?(?=^\S|\Z)'
    replacement=yaml.safe_dump({key:meta},allow_unicode=True,sort_keys=False)+'\n'
    media_text,count=re.subn(expr,lambda _:replacement,media_text);assert count==1,key
   path=f'{prefix}series/{SERIES}/{stem}.mp4'
   objects.append(dict(path=path,kind='video',sha256=sha(dest),bytes=dest.stat().st_size,duration=offset,width=1920,height=1080,fps=60,locale=lang,article=f'{prefix}series/{SERIES}/{stem}/',watch=f'{prefix}videos/series/{SERIES}/{stem}/',poster_path=f'{prefix}series/{SERIES}/{stem}.jpg',poster_sha256=sha(poster),chapters=clips))
   receipt.append(f'{sha(dest)}  {dest.relative_to(root).as_posix()}')
 media_path.write_text(media_text);after=yaml.safe_load(media_text)
 assert before.keys()==after.keys()
 assert all(before[k]==after[k] for k in before if not k.startswith(f'series/{SERIES}/'))
 (root/'.github/receipts').mkdir(exist_ok=True)
 (root/'.github/receipts/evaluation-c3.sha256').write_text('\n'.join(receipt)+'\n')
 manifest=dict(schema=1,series=SERIES,round='C3',owner_approval='APPROVED_2026-09-25',description='Exact approved landscape videos in12 ES/EN article/watch routes;24 original H/V files registered in the private Golden dataset. No portrait-site-consumption claim.',source_renderer_sha256='e4a3e6ed79e7d1080f5cf11813ddb5868c955f5bea7fda9081949e825e75a052',objects=objects)
 (root/'docs/evaluation-c3-release.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
 for path in ['hooks/video_publication_policy.py','scripts/validate_series_07_video_unpublish.py','scripts/verify_series_07_video_unpublish_live.py']:
  patch(root,path,[(f'        "{SERIES}",\n','')] if path.startswith('hooks/') else [(f'    "{SERIES}",\n','')])
 patch(root,'scripts/validate_series_07_video_unpublish.py',[
  ('KEEP_LIVE = ("datacenters-espacio", "modelos-razonadores", "seguridad-ia")','KEEP_LIVE = ("datacenters-espacio", "modelos-razonadores", "seguridad-ia", "evaluating-ai-systems-production")'),
  ('EXPECTED_BLOCKED_ENTRIES = 36','EXPECTED_BLOCKED_ENTRIES = 30'),('EXPECTED_PUBLIC_CATALOGUE = 40','EXPECTED_PUBLIC_CATALOGUE = 46')])
 patch(root,'scripts/verify_series_07_video_unpublish_live.py',[
  ('KEEP = {"datacenters-espacio": 5, "modelos-razonadores": 6, "seguridad-ia": 6}','KEEP = {"datacenters-espacio": 5, "modelos-razonadores": 6, "seguridad-ia": 6, "evaluating-ai-systems-production": 6}')])
 p=root/'.github/workflows/unpublish-series-07-video-media.yml';lines=p.read_text().splitlines(True);out=[]
 for line in lines:
  if line.strip()==SERIES:
   assert out[-1].rstrip().endswith('\\');out[-1]=out[-1].rstrip()[:-1].rstrip()+'\n'
  elif line.strip()==f'"{SERIES}",':continue
  else:out.append(line)
 p.write_text(''.join(out))
 for fname in ['verify_evaluation_c3_release.py','verify_evaluation_c3_browser.mjs']:
  shutil.copyfile(HERE/fname,root/'scripts'/fname)
 patch(root,'.github/workflows/deploy-pages.yml',[
  ('      - name: Validate video media declarations','      - name: Verify exact owner-approved Evaluating AI C3 MP4 bytes\n        run: sha256sum -c .github/receipts/evaluation-c3.sha256\n\n      - name: Validate video media declarations'),
  ('      - name: Audit live Spanish resources','      - name: Verify exact live approved C3 media and discovery\n        run: python3 scripts/verify_evaluation_c3_release.py --origin https://5sigmas.com --revision "$GITHUB_SHA"\n\n      - name: Verify live C3 native desktop and mobile playback\n        env:\n          S5_C3_ORIGIN: https://5sigmas.com\n        run: node scripts/verify_evaluation_c3_browser.mjs\n\n      - name: Audit live Spanish resources')])
 patch(root,'.github/workflows/pr-visual-review.yml',[
  ('              docs/series/evaluating-ai-systems-production locales/en/series/evaluating-ai-systems-production \\\n',''),
  ('      - name: Audit generated SEO crawl','      - name: Verify exact approved C3 bytes and discovery\n        run: python scripts/verify_evaluation_c3_release.py --base-ref "${{ github.event.pull_request.base.sha }}"\n\n      - name: Audit generated SEO crawl'),
  ('      - name: Audit browser resource loading','      - name: Verify C3 native desktop and mobile video consumers\n        run: node scripts/verify_evaluation_c3_browser.mjs\n\n      - name: Audit browser resource loading')])
 print('SCOPED_C3_INTEGRATION_CREATED',len(objects),flush=True)

def main():
 p=argparse.ArgumentParser();p.add_argument('--root',required=True);p.add_argument('--existing');p.add_argument('--cache',default='/tmp/exact-c3-media');p.add_argument('--integrate-only',action='store_true');a=p.parse_args()
 chapters=assemble()
 if not a.integrate_only:
  jobs=[(c,l,a.cache,a.existing) for c in chapters for l in ['es','en']]
  with concurrent.futures.ProcessPoolExecutor(max_workers=2) as pool:list(pool.map(recover_one,jobs))
 integrate(Path(a.root).resolve(),chapters,a.cache)
if __name__=='__main__':main()
