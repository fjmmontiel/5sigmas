"""One-run exact M1 media staging. No merge, deployment, regeneration or private URL logs."""
from pathlib import Path
import base64,hashlib,json,os,subprocess,tempfile,time,zipfile
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlsplit
from urllib.request import build_opener,HTTPRedirectHandler,Request
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey,X25519PublicKey
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes,serialization
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
BRANCH='release/owner-approved-video-batch-20260927'
PIN='71f065a50724fe9c1a23c7b8586ffc7dad55912af4931f79366a574a3bfe9712'
STATE=Path('.release-media')
def git(*args,env=None,input=None):
 return subprocess.check_output(['git',*args],text=True,stderr=subprocess.PIPE,env=env,input=input).strip()
def digest(p):
 with Path(p).open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
class NoRedirect(HTTPRedirectHandler):
 def redirect_request(self,*args,**kwargs):return None

def main():
 assert os.environ['GITHUB_REPOSITORY']=='fjmmontiel/5sigmas' and os.environ['GITHUB_REF_NAME']==BRANCH and os.environ['GITHUB_ACTOR']=='fjmmontiel'
 spec_path=STATE/'m1-spec.json';assert digest(spec_path)==PIN
 spec=json.loads(spec_path.read_text());rows=spec['media'];target=spec['target'];head=spec['expected_head']
 assert len(rows)==12 and len({r['path'] for r in rows})==12
 assert git('ls-remote','origin','refs/heads/'+target).split()[0]==head,'TARGET_CHANGED_RECONCILE'
 git('config','user.name','github-actions[bot]');git('config','user.email','41898282+github-actions[bot]@users.noreply.github.com')
 private=X25519PrivateKey.generate();run=os.environ['GITHUB_RUN_ID']
 ready={'schema':1,'run':run,'branch':BRANCH,'target':target,'expected_head':head,'spec_sha256':PIN,'public_key':base64.b64encode(private.public_key().public_bytes(serialization.Encoding.Raw,serialization.PublicFormat.Raw)).decode(),'expires_epoch':int(time.time()+2700),'scope':'Twelve hash-pinned owner-approved M1 horizontal originals and derived posters only. No merge, deploy, private source publication or permanent credentials.'}
 (STATE/'m1-receiver.json').write_text(json.dumps(ready,indent=2)+'\n');git('add',str(STATE/'m1-receiver.json'));git('commit','-m','release(video): announce one-run exact M1 receiver');git('push','origin','HEAD:refs/heads/'+BRANCH)
 envelope=None
 while time.time()<ready['expires_epoch']:
  git('fetch','--quiet','--depth=1','origin',BRANCH)
  try:raw=git('show','FETCH_HEAD:.release-media/m1-input.json')
  except subprocess.CalledProcessError:time.sleep(8);continue
  try:
   assert len(raw)<50000
   e=json.loads(raw);assert set(e)=={'sender','nonce','ciphertext'}
   aad=(BRANCH+'|m1|'+run+'|'+PIN).encode()
   shared=private.exchange(X25519PublicKey.from_public_bytes(base64.b64decode(e['sender'],validate=True)))
   key=HKDF(algorithm=hashes.SHA256(),length=32,salt=bytes.fromhex(PIN),info=aad).derive(shared)
   envelope=json.loads(AESGCM(key).decrypt(base64.b64decode(e['nonce'],validate=True),base64.b64decode(e['ciphertext'],validate=True),aad))
   assert set(envelope)=={'run','spec_sha256','urls'} and envelope['run']==run and envelope['spec_sha256']==PIN
   assert set(envelope['urls'])=={r['path'] for r in rows}
   for url in envelope['urls'].values():
    u=urlsplit(url);assert u.scheme=='https' and u.hostname.endswith('.oaiusercontent.com') and not u.username and not u.password and not u.fragment
  except Exception:raise RuntimeError('INVALID_M1_ENVELOPE_NO_PRIVATE_URL_LOGGED') from None
  break
 assert envelope is not None,'M1_INPUT_NOT_RECEIVED'
 with tempfile.TemporaryDirectory(prefix='exact-m1-') as temp:
  td=Path(temp)
  def acquire(row):
   path=td/row['path'];path.parent.mkdir(parents=True,exist_ok=True)
   try:
    with build_opener(NoRedirect()).open(Request(envelope['urls'][row['path']],headers={'User-Agent':'5sigmas-approved-M1/1'}),timeout=90) as response,path.open('wb') as out:
     assert response.status==200;count=0
     while chunk:=response.read(1048576):
      count+=len(chunk);assert count<=row['size'];out.write(chunk)
    assert path.stat().st_size==row['size'] and digest(path)==row['sha256']
   except Exception:raise RuntimeError('M1_PINNED_DOWNLOAD_FAILED_NO_PRIVATE_URL_LOGGED') from None
   probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-of','json',str(path)]));assert len(probe['streams'])==1;v=probe['streams'][0]
   assert (v['codec_name'],v['pix_fmt'],v['width'],v['height'],v['avg_frame_rate'])==('h264','yuv420p',1920,1080,'60/1')
   assert int(v['nb_frames'])==row['frames'] and abs(float(v['duration'])-row['duration'])<.002
   data=path.read_bytes();assert 0<data.find(b'moov')<data.find(b'mdat')
   subprocess.run(['ffmpeg','-v','error','-xerror','-threads','1','-i',str(path),'-f','null','-'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
   poster=path.with_suffix('.jpg');subprocess.run(['ffmpeg','-v','error','-y','-ss','5.5','-i',str(path),'-frames:v','1','-q:v','2','-threads','1',str(poster)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
   assert digest(path)==row['sha256']
   print('EXACT_M1_FULL_DECODE_PASS',row['path'],flush=True)
   return dict(row,poster_sha256=digest(poster),technical='SHA256_SIZE_SILENT_H264_1080P60_FASTSTART_FULL_DECODE_PASS')
  with ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(acquire,rows))
  envelope=None
  git('fetch','--quiet','--depth=1','origin',target);assert git('rev-parse','FETCH_HEAD')==head,'TARGET_CHANGED_NO_OVERWRITE'
  index=td/'index';env=dict(os.environ,GIT_INDEX_FILE=str(index));git('read-tree',head,env=env)
  allowed=[]
  for row in rows:
   for name in [row['path'],str(Path(row['path']).with_suffix('.jpg'))]:
    assert name.startswith(('docs/series/multimodalidad-iag/','locales/en/series/multimodalidad-iag/'))
    blob=git('hash-object','-w',str(td/name));git('update-index','--add','--cacheinfo','100644',blob,name,env=env);allowed.append(name)
  receipt={'schema':1,'status':'EXACT_M1_MEDIA_STAGED_NOT_MERGED_NOT_DEPLOYED','source_head':head,'run':run,'approval':'EXPLICIT_OWNER_APPROVAL_2026-09-28','spec_sha256':PIN,'media_count':12,'objects':results,'scope':'Only exact approved M1 horizontal media and derived posters. Existing four approved batch collections and article sources untouched. Web metadata and technical gate reconciliation required before merge.'}
  name='.github/receipts/multimodalidad-m1-20260928-staging.json';p=td/'receipt.json';p.write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n');blob=git('hash-object','-w',str(p));git('update-index','--add','--cacheinfo','100644',blob,name,env=env);allowed.append(name)
  tree=git('write-tree',env=env);commit=git('commit-tree',tree,'-p',head,'-m','feat(video): stage twelve exact owner-approved Multimodalidad M1 originals without transcoding')
  changed=set(git('diff','--name-only',head,commit).splitlines());assert changed==set(allowed)
  assert git('ls-remote','origin','refs/heads/'+target).split()[0]==head
  git('push','origin',commit+':refs/heads/'+target)
  evidence=Path('/tmp/m1-evidence');evidence.mkdir(exist_ok=True);receipt['staged_commit']=commit;(evidence/'receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
  with zipfile.ZipFile(evidence/'posters.zip','w',zipfile.ZIP_DEFLATED) as z:
   for row in rows:
    p=Path(row['path']).with_suffix('.jpg');z.write(td/p,str(p))
  print('EXACT_M1_STAGED_NOT_PUBLISHED',commit,flush=True)
if __name__=='__main__':main()
