"""Bounded one-run transport and exact-byte release assembly; no merge or deployment."""
from pathlib import Path,PurePosixPath
import base64,hashlib,json,os,shutil,subprocess,tempfile,time,zipfile
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlsplit
from urllib.request import build_opener,HTTPRedirectHandler,Request
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey,X25519PublicKey
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes,serialization
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
BRANCH='release/owner-approved-video-batch-20260927'
TARGET='release/approved-golden-batch-20260928'
BASE='f9d7daace70b46f344d35f3cef270ff7828e5c03'
PIN='7b89c3504188565d3135b41017358825262b01207f52a815dcba4c518a6824a2'
SIZE=46712458
STATE=Path('.release-media')
SERIES={'from-cave-to-agi','context-engineering-memory-mcp','llm-inference-engineering-economics','agentes-voz-tiempo-real'}
def git(*args):return subprocess.check_output(['git',*args],text=True,stderr=subprocess.PIPE).strip()
def digest(p):
 with Path(p).open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
class NoRedirect(HTTPRedirectHandler):
 def redirect_request(self,*a,**kw):return None

def main():
 assert os.environ['GITHUB_REPOSITORY']=='fjmmontiel/5sigmas' and os.environ['GITHUB_REF_NAME']==BRANCH and os.environ['GITHUB_ACTOR']=='fjmmontiel'
 git('config','user.name','github-actions[bot]');git('config','user.email','41898282+github-actions[bot]@users.noreply.github.com')
 assert git('ls-remote','origin','refs/heads/'+BRANCH).split()[0]==os.environ['GITHUB_SHA']
 private=X25519PrivateKey.generate();run=os.environ['GITHUB_RUN_ID']
 ready={'schema':1,'run':run,'branch':BRANCH,'target':TARGET,'public_key':base64.b64encode(private.public_key().public_bytes(serialization.Encoding.Raw,serialization.PublicFormat.Raw)).decode(),'sha256':PIN,'size':SIZE,'expires_epoch':int(time.time()+2700),'scope':'Only hash-pinned approved public files; clean branch from pinned main; no merge, no deployment, no raw transfer URL in git.'}
 (STATE/'integration-receiver.json').write_text(json.dumps(ready,indent=2)+'\n');git('add',str(STATE/'integration-receiver.json'));git('commit','-m','ci: announce one-run approved integration receiver');git('push','origin','HEAD:refs/heads/'+BRANCH)
 envelope=None
 while time.time()<ready['expires_epoch']:
  git('fetch','--quiet','origin',BRANCH)
  try:raw=git('show','FETCH_HEAD:.release-media/input-integration.json')
  except subprocess.CalledProcessError:time.sleep(6);continue
  assert len(raw)<8000
  try:
   e=json.loads(raw);assert set(e)=={'sender','nonce','ciphertext'}
   aad=(BRANCH+'|integration|'+run+'|'+PIN).encode()
   shared=private.exchange(X25519PublicKey.from_public_bytes(base64.b64decode(e['sender'],validate=True)))
   key=HKDF(algorithm=hashes.SHA256(),length=32,salt=bytes.fromhex(PIN),info=aad).derive(shared)
   envelope=json.loads(AESGCM(key).decrypt(base64.b64decode(e['nonce'],validate=True),base64.b64decode(e['ciphertext'],validate=True),aad))
   assert set(envelope)=={'url','sha256','size','run'} and envelope['run']==run and envelope['sha256']==PIN and envelope['size']==SIZE
   u=urlsplit(envelope['url']);assert u.scheme=='https' and u.hostname.endswith('.oaiusercontent.com') and not u.username and not u.password and not u.fragment
  except Exception:raise RuntimeError('SEALED_INTEGRATION_INVALID_NO_PRIVATE_URL_LOGGED') from None
  break
 assert envelope is not None,'INTEGRATION_INPUT_NOT_RECEIVED'
 with tempfile.TemporaryDirectory(prefix='approved-integration-') as temp:
  td=Path(temp);archive=td/'public.zip'
  try:
   with build_opener(NoRedirect()).open(Request(envelope['url'],headers={'User-Agent':'5sigmas-approved-release/1'}),timeout=90) as response,archive.open('wb') as out:
    assert response.status==200;count=0
    while chunk:=response.read(1024*1024):
     count+=len(chunk);assert count<=SIZE;out.write(chunk)
   assert archive.stat().st_size==SIZE and digest(archive)==PIN
  except Exception:raise RuntimeError('PINNED_PAYLOAD_DOWNLOAD_FAILED_NO_PRIVATE_URL_LOGGED') from None
  with zipfile.ZipFile(archive) as z:
   assert z.getinfo('PACKAGE.json').file_size<100000
   package=json.loads(z.read('PACKAGE.json'));assert package['base']==BASE and len(package['files'])==143 and len(package['staged_media'])==48
   names={x['path'] for x in package['files']};assert len(names)==143 and set(z.namelist())==names|{'PACKAGE.json'} and len(z.namelist())==144
   for item in package['files']:
    name=item['path'];parts=PurePosixPath(name).parts
    assert '..' not in parts and not name.startswith('/') and not name.startswith('.github/workflows/')
    assert Path(name).suffix in {'.md','.mp4','.html','.vtt','.json','.sha256','.yml','.py','.mjs'}
    info=z.getinfo(name);assert info.file_size==item['size'] and info.file_size<15000000 and (info.external_attr>>16)&0o170000!=0o120000
    b=z.read(name);assert hashlib.sha256(b).hexdigest()==item['sha256']
    p=td/'payload'/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b)
  rows=package['staged_media'];assert len({x['path'] for x in rows})==48
  for row in rows:
   p=Path(row['path']);parts=p.parts
   assert p.suffix=='.mp4' and (parts[0]=='docs' and parts[1]=='series' and parts[2] in SERIES or parts[0:3]==('locales','en','series') and parts[3] in SERIES)
   source=td/'payload'/p if row['path'] in names else p
   assert source.stat().st_size==row['size'] and digest(source)==row['sha256'],row['path']
   target=td/'media'/p;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(source,target)
  git('fetch','--quiet','origin','main');assert git('rev-parse','FETCH_HEAD')==BASE,'MAIN_CHANGED_RECONCILE_WITHOUT_OVERWRITE'
  assert not git('ls-remote','origin','refs/heads/'+TARGET),'TARGET_ALREADY_EXISTS_DO_NOT_OVERWRITE'
  git('switch','-c',TARGET,BASE)
  for item in package['files']:
   p=Path(item['path']);p.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(td/'payload'/p,p)
  for row in rows:
   p=Path(row['path']);p.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(td/'media'/p,p)
  def validate(row):
   p=Path(row['path']);probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-of','json',str(p)]));assert len(probe['streams'])==1;v=probe['streams'][0]
   assert (v['codec_name'],v['pix_fmt'],v['width'],v['height'],v['avg_frame_rate'])==('h264','yuv420p',1920,1080,'60/1')
   assert int(v['nb_frames'])==row['frames'] and abs(float(v['duration'])-row['duration'])<.002
   data=p.read_bytes();assert data.find(b'moov')<data.find(b'mdat')
   subprocess.run(['ffmpeg','-v','error','-xerror','-threads','1','-i',str(p),'-f','null','-'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
   subprocess.run(['ffmpeg','-v','error','-y','-ss','5.5','-i',str(p),'-frames:v','1','-q:v','2','-threads','1',str(p.with_suffix('.jpg'))],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
   assert digest(p)==row['sha256']
   print('EXACT_APPROVED_MEDIA_DECODE_PASS',row['path'],flush=True)
   return {'path':row['path'],'sha256':row['sha256'],'frames':int(v['nb_frames']),'duration':float(v['duration']),'status':'PASS'}
  with ThreadPoolExecutor(max_workers=2) as pool:technical=list(pool.map(validate,rows))
  mp=Path('docs/approved-video-batch-20260928-release.json');m=json.loads(mp.read_text());assert len(m['objects'])==48
  for o in m['objects']:
   p=Path('locales/en/'+o['poster_path'][3:]) if o['locale']=='en' else Path('docs/'+o['poster_path']);o['poster_sha256']=digest(p)
  mp.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
  allowed=names|{r['path'] for r in rows}|{str(Path(r['path']).with_suffix('.jpg')) for r in rows}
  git('add','--',*sorted(allowed));changed=set(git('diff','--cached','--name-only').splitlines());assert changed<=allowed and not any(p.startswith('.release-media/') or p.startswith('.github/workflows/') for p in changed)
  subprocess.run(['python','-m','py_compile','scripts/verify_approved_video_batch_release.py','scripts/validate_series_07_video_unpublish.py','scripts/verify_series_07_video_unpublish_live.py'],check=True)
  git('commit','-m','feat(video): restore 48 exact approved Cave Context Inference and Voice originals with bilingual playback and discovery')
  git('push','origin','HEAD:refs/heads/'+TARGET)
  evidence=Path('/tmp/approved-integration-evidence');evidence.mkdir(exist_ok=True)
  receipt={'status':'CLEAN_RELEASE_BRANCH_READY_NOT_MERGED','run':run,'branch':TARGET,'base':BASE,'commit':git('rev-parse','HEAD'),'files':sorted(changed),'media_count':48,'full_decode':technical,'payload_sha256':PIN,'note':'No MP4 transcoding. Posters are derived stills. Workflow gates must be updated through authorized connector before PR. No production publication claimed.'}
  (evidence/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n');shutil.copyfile(mp,evidence/mp.name)
  with zipfile.ZipFile(evidence/'posters.zip','w',zipfile.ZIP_DEFLATED) as z:
   for r in rows:p=Path(r['path']).with_suffix('.jpg');z.write(p,str(p))
  print('CLEAN_APPROVED_RELEASE_BRANCH_READY',TARGET,receipt['commit'],flush=True)
if __name__=='__main__':main()
