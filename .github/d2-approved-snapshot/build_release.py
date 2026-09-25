#!/usr/bin/env python3
"""Recover exact owner-approved D2 bytes and stage a narrowly scoped release; no ref mutation."""
import base64,concurrent.futures,hashlib,html,json,os,re,subprocess,sys,zlib
from pathlib import Path
import yaml
HERE=Path(__file__).resolve().parent
ROOT=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path('site').resolve()
SERIES='datacenters-espacio'
BASE='6f65cfa69080f6cc441c81e66bf2fe1b647a214f'
HASHES={
 (0,'es'):'76780b4414f571e4bb7d77d7d86f5efeeed79a40c6ad6d6caeab0896d0e6d30b',
 (0,'en'):'00f1f2fa937e742a6d1c7d6ddf29210ce3a64145a4c911c559079c1fe6c68bc5',
 (1,'es'):'a764cc49ddbfaeef5deb23d440d8db7b149f6eb2694099757d469883d28bba08',
 (1,'en'):'f0a92be446cbd47923017f9735eeea41ef3537bee62ef16dead568c56a183bbd',
 (2,'es'):'094807e548a5b1621036145f879a385c0e071c19c99624c577d8d3c7f8d47b56',
 (2,'en'):'1b4e061be957e880134c6505e9b3c724fbb13b568d4e43fe54fe3d46b2d4bc34',
 (3,'es'):'0c4825e4b2793ef47f07b47adc23e7430adc7be8f91b32e68f42a97b426048ad',
 (3,'en'):'ba7b7d625cde0df2430d5556abcc0a5ba45a454d6e8b7eae29496ea0e94a6ca4',
 (4,'es'):'754a842f8da6f00c0d45bd6ed624cf5ab6662f11efcbeade6fc0154ee212b69e',
 (4,'en'):'5f820d81acfa49b8842d54e19ffbf3204571985bbe7672b93a81732fea28322f'}
RENDER_HASH='68f3f270221287bafc7920399f571578838a9c19c9ce6c216181d3234efdd82d'
STORY_HASH='64d46792753f714ca337b367c88c11e267431a2bd330a22e8575c07042cdb0f9'
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def restore():
 for name,expected in [('render.py',RENDER_HASH),('story.json',STORY_HASH)]:
  data=zlib.decompress(base64.b64decode(''.join(p.read_text().strip() for p in sorted(HERE.glob(name+'.*.txt')))))
  assert hashlib.sha256(data).hexdigest()==expected,(name,'snapshot mismatch')
  (HERE/name).write_bytes(data)
def recover(task):
 ch,lang=task
 from render import render_video
 os.environ['ENCODE_THREADS']='2';os.environ['ENCODE_PRESET']='veryfast'
 p=HERE/'recovered'/f'{ch["chapter"]:02}-{lang}.mp4'
 p.parent.mkdir(exist_ok=True)
 if not p.exists() or sha(p)!=HASHES[(ch['chapter'],lang)]:render_video(ch,lang,'h',p,60)
 assert sha(p)==HASHES[(ch['chapter'],lang)],('UNAPPROVED_BYTES',p.name,sha(p))
 subprocess.run(['ffmpeg','-v','error','-i',str(p),'-f','null','-'],check=True)
 probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(p)]))
 assert len(probe['streams'])==1
 v=probe['streams'][0];assert (v['codec_name'],v['width'],v['height'],v['r_frame_rate'],v['pix_fmt'])==('h264',1920,1080,'60/1','yuv420p')
 assert abs(float(probe['format']['duration'])-sum(s['duration'] for s in ch['scenes']))<.01
 return ch,lang,p
NAMES=set()
def write(rel,content):
 p=ROOT/rel;p.parent.mkdir(parents=True,exist_ok=True)
 p.write_bytes(content if isinstance(content,bytes) else content.encode())
 NAMES.add(rel)
def change(rel,old,new):
 p=ROOT/rel;s=p.read_text();assert old in s,(rel,old)
 write(rel,s.replace(old,new))
def timestamp(t):
 ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02}.{ms%1000:03}'
def main():
 restore();story=json.loads((HERE/'story.json').read_text());tasks=[(c,l) for c in story['chapters'] for l in ['es','en']]
 # A fresh process per asset prevents unrelated font-layout cache history entering recovery.
 with concurrent.futures.ProcessPoolExecutor(max_workers=2,max_tasks_per_child=1) as ex:recovered=list(ex.map(recover,tasks))
 print('TEN_EXACT_APPROVED_D2_HASHES_RECOVERED',flush=True)
 m={'schema':1,'series':SERIES,'round':'D2','owner_approval':'APPROVED_2026-09-25','description':'10 exact approved horizontal ES/EN files in existing article/watch consumers; 10 approved vertical originals remain in the owner collection.','source_renderer_sha256':RENDER_HASH,'source_story_sha256':STORY_HASH,'objects':[]}
 em_path='locales/en/media.yml';em_text=(ROOT/em_path).read_text();em_before=yaml.safe_load(em_text)
 locale_path='locales/en/manifest.yml';locale_text=(ROOT/locale_path).read_text()
 receipts=[]
 for ch,lang,p in recovered:
  stem=Path(ch['source']).stem;prefix='' if lang=='es' else 'en/';srcroot='docs/' if lang=='es' else 'locales/en/'
  rel=f'series/{SERIES}/{stem}';asset=srcroot+rel;public=prefix+rel;duration=sum(s['duration'] for s in ch['scenes'])
  write(asset+'.mp4',p.read_bytes());jpg=ROOT/(asset+'.jpg')
  subprocess.run(['ffmpeg','-v','error','-y','-ss','5','-i',str(p),'-frames:v','1','-q:v','2',str(jpg)],check=True);NAMES.add(asset+'.jpg')
  intro='Transcripción del texto visual. Vídeo sin narración.' if lang=='es' else 'Transcript of the visual text. This video has no narration.'
  transcript=['<p>'+intro+'</p>'];vtt=['WEBVTT','',('NOTE Texto visual de un vídeo silencioso.' if lang=='es' else 'NOTE Visual text from a silent video.'),''];chapters=[];offset=0;cue_no=0
  for sc in ch['scenes']:
   name=' '.join(sc['title'][lang].split());end=offset+sc['duration'];chapters.append({'name':name,'start':offset,'end':end})
   transcript.append(f'<h3>{offset//60:02}:{offset%60:02} — {html.escape(name)}</h3>')
   for j,(t,text) in enumerate(zip(sc['cue_times'],sc['cues'][lang])):
    transcript.append('<p>'+html.escape(text)+'</p>');cue_no+=1
    until=offset+sc['cue_times'][j+1] if j<2 else end
    vtt.extend([str(cue_no),timestamp(offset+t)+' --> '+timestamp(until),html.escape(text,quote=False),''])
   if sc['illustrative']:transcript.append('<p><em>'+('Ejemplo ilustrativo; supuestos, no datos operativos.' if lang=='es' else 'Illustrative example; assumptions, not operational measurements.')+'</em></p>')
   offset=end
  assert cue_no==18
  write(asset+'-transcript.html','\n'.join(transcript)+'\n');write(asset+'-visual-text.vtt','\n'.join(vtt)+'\n')
  summary=' '.join(ch['scenes'][-1]['cues'][lang][-2:])
  meta={'video':stem+'.mp4','video_poster':stem+'.jpg','video_title':ch['title'][lang],'video_summary':summary,'video_duration':f'PT{duration//60}M{duration%60}S','video_captions':stem+'-visual-text.vtt','video_transcript':stem+'-transcript.html','video_chapters':chapters}
  if lang=='es':
   md=ROOT/(asset+'.md');old=md.read_text();match=re.match(r'\A---\n(.*?)\n---(.*)\Z',old,re.S);assert match,md
   front,body=match.groups();oldmeta=yaml.safe_load(front)
   keep=re.sub(r'(?ms)^video(?:_[A-Za-z0-9_]+)?:.*?(?=^[A-Za-z_][A-Za-z0-9_-]*:|\Z)','',front).rstrip()
   new='---\n'+keep+'\n'+yaml.safe_dump(meta,allow_unicode=True,sort_keys=False,width=1000)+'---'+body
   parsed=yaml.safe_load(new.split('---',2)[1]);assert {k:v for k,v in oldmeta.items() if not k.startswith('video')}=={k:v for k,v in parsed.items() if not k.startswith('video')}
   assert new.split('---',2)[2]==old.split('---',2)[2]
   write(asset+'.md',new)
  else:
   key=rel+'.md';assert key in em_before
   replacement=yaml.safe_dump({key:meta},allow_unicode=True,sort_keys=False,width=1000)+'\n'
   em_text,n=re.subn(r'(?ms)^'+re.escape(key)+r':\n.*?(?=^\S|\Z)',lambda _:replacement,em_text);assert n==1,(key,n)
   marker='  - '+rel+'.jpg\n';assert locale_text.count(marker)==1
   locale_text=locale_text.replace(marker,marker+'  - '+rel+'-transcript.html\n'+'  - '+rel+'-visual-text.vtt\n')
  receipts.append(HASHES[(ch['chapter'],lang)]+'  '+asset+'.mp4')
  m['objects'].append({'path':public+'.mp4','kind':'video','sha256':sha(p),'bytes':p.stat().st_size,'duration':duration,'width':1920,'height':1080,'fps':60,'locale':lang,'article':public+'/','watch':prefix+'videos/'+rel+'/','poster_path':public+'.jpg','poster_sha256':sha(jpg),'chapters':chapters,'captions_path':public+'-visual-text.vtt','captions_sha256':sha(ROOT/(asset+'-visual-text.vtt')),'captions_scope':'Timed visual text, silent video; no invented narration'})
 em_after=yaml.safe_load(em_text);assert em_after.keys()==em_before.keys()
 assert all(em_before[k]==em_after[k] for k in em_before if not k.startswith('series/'+SERIES+'/'))
 write(em_path,em_text);write(locale_path,locale_text)
 write('docs/datacenters-d2-release.json',json.dumps(m,ensure_ascii=False,indent=2)+'\n')
 write('.github/receipts/datacenters-d2.sha256','\n'.join(receipts)+'\n')
 # Reuse the already exercised exact-media/browser contracts, with D2's actual inventory.
 verifier=(ROOT/'scripts/verify_evaluation_c3_release.py').read_text().replace('evaluation-c3','datacenters-d2').replace('evaluating-ai-systems-production',SERIES).replace('C3','D2').replace('==12','==10').replace('media_count=12,surface_count=24,clips=72','media_count=10,surface_count=20,clips=60').replace('12 media,24 article/watch surfaces,72 clips','10 media,20 article/watch surfaces,60 clips')
 write('scripts/verify_datacenters_d2_release.py',verifier)
 browser=(ROOT/'scripts/verify_evaluation_c3_browser.mjs').read_text().replace('evaluation-c3','datacenters-d2').replace('C3','D2').replace('c3','d2').replace('48','40')
 write('scripts/verify_datacenters_d2_browser.mjs',browser)
 change('scripts/test_video_schema_contract.py','summary["captions_transcript_complete"] == 12','summary["captions_transcript_complete"] == 22')
 change('scripts/test_video_schema_contract.py','summary["captions_transcript_review"] == 80','summary["captions_transcript_review"] == 70')
 pr='.github/workflows/pr-visual-review.yml'
 change(pr,'              docs/series/datacenters-espacio locales/en/series/datacenters-espacio \\\n','')
 change(pr,'This release must not modify later-unapproved series or Datacenters/Modelos assets:','This release must not modify later-unapproved series or Modelos assets:')
 change(pr,'plus Datacenters and Modelos R2','plus Modelos R2')
 change(pr,'python scripts/verify_evaluation_c3_release.py --base-ref "${{ github.event.pull_request.base.sha }}"','python scripts/verify_evaluation_c3_release.py\n\n      - name: Verify exact approved D2 bytes and unchanged article bodies\n        run: python scripts/verify_datacenters_d2_release.py --base-ref "${{ github.event.pull_request.base.sha }}"')
 change(pr,'run: node scripts/verify_evaluation_c3_browser.mjs','run: node scripts/verify_evaluation_c3_browser.mjs\n\n      - name: Verify D2 native desktop and mobile video consumers\n        run: node scripts/verify_datacenters_d2_browser.mjs')
 deploy='.github/workflows/deploy-pages.yml'
 change(deploy,'run: sha256sum -c .github/receipts/evaluation-c3.sha256','run: sha256sum -c .github/receipts/evaluation-c3.sha256\n\n      - name: Verify exact owner-approved Datacenters D2 MP4 bytes\n        run: sha256sum -c .github/receipts/datacenters-d2.sha256')
 change(deploy,'run: node scripts/verify_evaluation_c3_browser.mjs','run: node scripts/verify_evaluation_c3_browser.mjs\n\n      - name: Verify live approved D2 bytes and discovery\n        run: python3 scripts/verify_datacenters_d2_release.py --origin https://5sigmas.com --revision "$GITHUB_SHA"\n\n      - name: Verify live D2 native desktop and mobile playback\n        env:\n          S5_D2_ORIGIN: https://5sigmas.com\n        run: node scripts/verify_datacenters_d2_browser.mjs')
 # Record scoped paths and require no unapproved file or font is transferred.
 assert len(m['objects'])==10 and len(NAMES)==54,(len(m['objects']),len(NAMES),sorted(NAMES))
 (HERE/'release-paths.json').write_text(json.dumps(sorted(NAMES),indent=2)+'\n')
 print('D2_STAGE_COMPLETE',len(NAMES),flush=True)
 if os.environ.get('GH_TOKEN'):
  import urllib.request
  entries=[]
  for rel in sorted(NAMES):
   assert not Path(rel).suffix.lower() in ['.ttf','.otf','.woff','.woff2']
   raw=(ROOT/rel).read_bytes();payload=json.dumps({'encoding':'base64','content':base64.b64encode(raw).decode()}).encode()
   req=urllib.request.Request('https://api.github.com/repos/fjmmontiel/5sigmas/git/blobs',data=payload,headers={'Authorization':'Bearer '+os.environ['GH_TOKEN'],'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'})
   with urllib.request.urlopen(req,timeout=120) as r:blob=json.load(r)['sha']
   assert blob==hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()
   entries.append({'path':rel,'mode':'100644','type':'blob','sha':blob})
   print('D2_BLOB',rel,blob,flush=True)
  receipt={'base':BASE,'entries':entries,'scope':'10 exact approved D2 videos, derived metadata and bounded integration; no ref or deployment mutation'}
  (HERE/'d2-release-entries.json').write_text(json.dumps(receipt,indent=2)+'\n')
  print('D2_RELEASE_ENTRIES='+json.dumps(receipt,separators=(',',':')),flush=True)
if __name__=='__main__':main()
