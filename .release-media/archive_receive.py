"""One bounded transfer of approved originals. No merge/deploy; no private URL logs."""
from pathlib import Path
import base64,json,os,time,tempfile,subprocess,zipfile
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlsplit
from urllib.request import build_opener,Request
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey,X25519PublicKey
from cryptography.hazmat.primitives import serialization,hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from final_receive import git,digest,BRANCH,TARGET,BASE,PIN,STATE,PREFIXES,NoRedirect
ARCHIVES={'f1-es':(54229455,'c76717b4ede81b031ae6aa300b4d2558468a58f9442a6d003be789bf82e4600b'),'f1-en':(51857158,'97c69cc915a4d1b7c164475c414e8ea3cd0d3a118f7e3569850542229cbff5ca'),'w1':(50978921,'f0f7d6a31de10ec99ccdf0e7793214014798d791df29a3eb6f5f43c0267da074')}
def main():
 assert os.environ['GITHUB_REPOSITORY']=='fjmmontiel/5sigmas' and os.environ['GITHUB_REF_NAME']==BRANCH and os.environ['GITHUB_ACTOR']=='fjmmontiel'
 assert digest(STATE/'final-spec.json')==PIN
 spec=json.loads((STATE/'final-spec.json').read_text());rows=spec['media'];by_path={r['path']:r for r in rows}
 assert len(rows)==len(by_path)==20 and spec['target']==TARGET and spec['expected_head']==BASE
 assert git('ls-remote','origin','refs/heads/'+TARGET).split()[0]==BASE
 assert all(p.startswith(PREFIXES) and '..' not in Path(p).parts for p in by_path)
 git('config','user.name','github-actions[bot]');git('config','user.email','41898282+github-actions[bot]@users.noreply.github.com')
 private=X25519PrivateKey.generate();run=os.environ['GITHUB_RUN_ID'];aad=(BRANCH+'|archives|'+run+'|'+PIN).encode()
 ready={'run':run,'public_key':base64.b64encode(private.public_key().public_bytes(serialization.Encoding.Raw,serialization.PublicFormat.Raw)).decode(),'spec_sha256':PIN,'target':TARGET,'base':BASE,'scope':'Three exact pinned archives of twenty already-approved MP4s; target staging only.'}
 (STATE/'archive-receiver.json').write_text(json.dumps(ready)+'\n');git('add',str(STATE/'archive-receiver.json'));git('commit','-m','release(video): announce one-run approved archive receiver');git('push','origin','HEAD:refs/heads/'+BRANCH)
 payload=None;deadline=time.time()+1800
 while time.time()<deadline:
  git('fetch','--quiet','--depth=1','origin',BRANCH)
  try:raw=git('show','FETCH_HEAD:.release-media/archive-input.json')
  except subprocess.CalledProcessError:time.sleep(5);continue
  try:
   e=json.loads(raw);assert len(raw)<16000 and set(e)=={'sender','nonce','ciphertext'}
   key=HKDF(algorithm=hashes.SHA256(),length=32,salt=bytes.fromhex(PIN),info=aad).derive(private.exchange(X25519PublicKey.from_public_bytes(base64.b64decode(e['sender'],validate=True))))
   payload=json.loads(AESGCM(key).decrypt(base64.b64decode(e['nonce'],validate=True),base64.b64decode(e['ciphertext'],validate=True),aad))
   assert set(payload)==set(ARCHIVES)
   for url in payload.values():
    u=urlsplit(url);assert u.scheme=='https' and u.hostname and u.hostname.endswith('.oaiusercontent.com') and not u.username and not u.password and not u.fragment
  except Exception:raise RuntimeError('INVALID_ARCHIVE_ENVELOPE') from None
  break
 assert payload is not None,'NO_INPUT'
 with tempfile.TemporaryDirectory(prefix='approved-final-') as temp:
  td=Path(temp)
  def download(name):
   size,sha=ARCHIVES[name];path=td/(name+'.zip')
   try:
    with build_opener(NoRedirect()).open(Request(payload[name]),timeout=120) as response,path.open('wb') as out:
     assert response.status==200;count=0
     while chunk:=response.read(1048576):
      count+=len(chunk);assert count<=size;out.write(chunk)
    assert path.stat().st_size==size and digest(path)==sha
   except Exception:raise RuntimeError('ARCHIVE_DOWNLOAD_FAILED_NO_PRIVATE_URL_LOGGED') from None
   print('ARCHIVE_SHA256_PASS',name,flush=True)
  with ThreadPoolExecutor(max_workers=3) as pool:list(pool.map(download,ARCHIVES))
  payload=None;seen=set()
  for name in ARCHIVES:
   with zipfile.ZipFile(td/(name+'.zip')) as z:
    for entry in z.infolist():
     p=entry.filename;assert p in by_path and p not in seen and entry.file_size==by_path[p]['size'];seen.add(p)
     dst=td/p;dst.parent.mkdir(parents=True,exist_ok=True);dst.write_bytes(z.read(entry));assert digest(dst)==by_path[p]['sha256']
  assert seen==set(by_path)
  def validate(row):
   path=td/row['path'];probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-of','json',str(path)]));assert len(probe['streams'])==1;v=probe['streams'][0]
   assert (v['codec_name'],v['pix_fmt'],v['width'],v['height'],v['avg_frame_rate'])==('h264','yuv420p',1920,1080,'60/1')
   assert int(v['nb_frames'])==row['frames'] and abs(float(v['duration'])-row['duration'])<.002
   data=path.read_bytes();assert 0<data.find(b'moov')<data.find(b'mdat')
   subprocess.run(['ffmpeg','-v','error','-xerror','-threads','1','-i',str(path),'-f','null','-'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
   poster=path.with_suffix('.jpg');subprocess.run(['ffmpeg','-v','error','-y','-ss','5.5','-i',str(path),'-frames:v','1','-q:v','2','-threads','1',str(poster)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
   assert digest(path)==row['sha256'];print('EXACT_FULL_DECODE_PASS',row['path'],flush=True)
   return dict(row,poster_sha256=digest(poster),technical='SHA256_SIZE_SILENT_H264_1080P60_FASTSTART_FULL_DECODE_PASS')
  with ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(validate,rows))
  git('fetch','--quiet','--depth=1','origin',TARGET);assert git('rev-parse','FETCH_HEAD')==BASE
  env=dict(os.environ,GIT_INDEX_FILE=str(td/'index'));git('read-tree',BASE,env=env);allowed=[]
  for row in rows:
   for name in [row['path'],str(Path(row['path']).with_suffix('.jpg'))]:
    blob=git('hash-object','-w',str(td/name));git('update-index','--add','--cacheinfo','100644',blob,name,env=env);allowed.append(name)
  receipt={'schema':1,'status':'EXACT_F1_W1_STAGED_NOT_MERGED_NOT_DEPLOYED','source_head':BASE,'run':run,'approval':spec['approval'],'spec_sha256':PIN,'media_count':20,'objects':results,'scope':'Only approved F1 W1 originals and derived posters. All articles and previous eleven collections unchanged. Metadata and checked release still required.'}
  name='.github/receipts/final-f1-w1-20260928-staging.json';p=td/'receipt.json';p.write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n');blob=git('hash-object','-w',str(p));git('update-index','--add','--cacheinfo','100644',blob,name,env=env);allowed.append(name)
  tree=git('write-tree',env=env);commit=git('commit-tree',tree,'-p',BASE,'-m','feat(video): stage twenty exact approved F1 W1 originals without transcoding')
  assert set(git('diff','--name-only',BASE,commit).splitlines())==set(allowed) and git('ls-remote','origin','refs/heads/'+TARGET).split()[0]==BASE
  git('push','origin',commit+':refs/heads/'+TARGET)
  evidence=Path('/tmp/final-evidence');evidence.mkdir(exist_ok=True);receipt['staged_commit']=commit;(evidence/'receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
  with zipfile.ZipFile(evidence/'posters.zip','w',zipfile.ZIP_DEFLATED) as z:
   for row in rows:
    p=Path(row['path']).with_suffix('.jpg');z.write(td/p,str(p))
  print('EXACT_F1_W1_STAGED_NOT_PUBLISHED',commit,flush=True)
if __name__=='__main__':main()
