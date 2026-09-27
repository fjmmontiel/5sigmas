"""Receive hash-pinned owner-approved originals; never render, publish or merge.
Private transfer URLs are AES-GCM sealed to a one-run X25519 receiver key.
Only the public key and ciphertext enter Git; the private key stays in memory.
"""
from pathlib import Path,PurePosixPath
import base64,hashlib,json,os,subprocess,tempfile,time,zipfile
from urllib.parse import urlsplit
from urllib.request import build_opener,HTTPRedirectHandler,Request
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey,X25519PublicKey
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes,serialization
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
PINS={'context':'c4f92393ed686698831a903a32f50cab4d9e0dc144948dbb54ac7b74a0443241','inference':'72b3bd014bf14b92c2bb2e4d4f109b918f7d9a00f6d63ef6f136c67c1f089cd0','cave':'41d658c648d43fb7ebe1ed044900214d7af7388c384eaa7d248bf3c908f8d348','voice':'cbb744c984be3cff69e15709ff0ec0d2555cd1a204566722a996ab907260d9c8'}
BRANCH='release/owner-approved-video-batch-20260927'
SERIES={'context':'context-engineering-memory-mcp','inference':'llm-inference-engineering-economics','cave':'from-cave-to-agi','voice':'agentes-voz-tiempo-real'}
STATE=Path('.release-media');STATE.mkdir(exist_ok=True)
def git(*args):return subprocess.check_output(['git',*args],text=True,stderr=subprocess.PIPE).strip()
def canonical(v):return json.dumps(v,separators=(',',':'),sort_keys=True).encode()
def publish(paths,message):
 git('add','--',*paths);git('commit','-m',message)
 for attempt in range(6):
  try:git('push','origin','HEAD:refs/heads/'+BRANCH);return
  except subprocess.CalledProcessError:
   git('pull','--rebase','origin',BRANCH);time.sleep(2)
 raise RuntimeError('RELEASE_BRANCH_CONCURRENT_WRITE')
class NoRedirect(HTTPRedirectHandler):
 def redirect_request(self,*a,**kw):return None

def receive(slot,private,ready,envelope):
 try:
  assert set(envelope)=={'sender','nonce','ciphertext'}
  shared=private.exchange(X25519PublicKey.from_public_bytes(base64.b64decode(envelope['sender'],validate=True)))
  aad=(BRANCH+'|'+slot+'|'+ready['run']+'|'+PINS[slot]).encode()
  key=HKDF(algorithm=hashes.SHA256(),length=32,salt=bytes.fromhex(PINS[slot]),info=aad).derive(shared)
  data=json.loads(AESGCM(key).decrypt(base64.b64decode(envelope['nonce'],validate=True),base64.b64decode(envelope['ciphertext'],validate=True),aad))
  assert set(data)=={'url','sha256','size','slot','run'} and data['slot']==slot and data['run']==ready['run']
  u=urlsplit(data['url']);assert u.scheme=='https' and u.hostname.endswith('.oaiusercontent.com') and not u.username and not u.password and not u.fragment
  assert isinstance(data['size'],int) and 0<data['size']<500_000_000
  assert len(data['sha256'])==64 and all(c in '0123456789abcdef' for c in data['sha256'])
 except Exception:raise RuntimeError('SEALED_INPUT_INVALID') from None
 with tempfile.TemporaryDirectory(prefix='approved-media-') as td:
  archive=Path(td)/'originals.zip';observed=0;digest=hashlib.sha256()
  try:
   with build_opener(NoRedirect()).open(Request(data['url'],headers={'User-Agent':'5sigmas-approved-original-transfer/1'}),timeout=90) as response,archive.open('wb') as out:
    assert response.status==200
    while chunk:=response.read(1024*1024):
     observed+=len(chunk);assert observed<=data['size'];digest.update(chunk);out.write(chunk)
   assert observed==data['size'] and digest.hexdigest()==data['sha256']
  except Exception:raise RuntimeError('EXACT_PUBLIC_PAYLOAD_DOWNLOAD_FAILED_NO_URL_LOGGED') from None
  with zipfile.ZipFile(archive) as z:
   assert len(z.infolist())==13 and len(set(z.namelist()))==13
   assert z.getinfo('approved.json').file_size<20000
   rows=json.loads(z.read('approved.json'))
   assert len(rows)==12 and hashlib.sha256(canonical(rows)).hexdigest()==PINS[slot]
   allowed={r['path'] for r in rows};assert set(z.namelist())==allowed|{'approved.json'}
   for row in rows:
    name=row['path'];parts=PurePosixPath(name).parts
    assert '..' not in parts and not name.startswith('/') and name.endswith('.mp4')
    assert name.startswith('docs/series/'+SERIES[slot]+'/') or name.startswith('locales/en/series/'+SERIES[slot]+'/')
    info=z.getinfo(name);assert info.file_size==row['size'] and (info.external_attr>>16)&0o170000!=0o120000
    b=z.read(name);assert len(b)==row['size'] and hashlib.sha256(b).hexdigest()==row['sha256']
    target=Path(td)/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(b)
    probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-of','json',str(target)]))
    assert len(probe['streams'])==1;v=probe['streams'][0]
    assert (v['codec_name'],v['pix_fmt'],v['width'],v['height'],v['avg_frame_rate'])==('h264','yuv420p',1920,1080,'60/1')
    assert int(v['nb_frames'])==row['frames'] and abs(float(v['duration'])-row['duration'])<.002
    subprocess.run(['ffmpeg','-v','error','-xerror','-threads','1','-i',str(target),'-f','null','-'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
  git('fetch','--quiet','origin',BRANCH);git('reset','--hard','FETCH_HEAD')
  for row in rows:
   target=Path(row['path']);target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes((Path(td)/row['path']).read_bytes())
  receipt=STATE/(slot+'-receipt.json');receipt.write_text(json.dumps({'status':'EXACT_APPROVED_ORIGINALS_STAGED_NOT_PUBLISHED','slot':slot,'objects':rows,'run':ready['run'],'count':12},indent=2)+'\n')
  publish([r['path'] for r in rows]+[str(receipt)],'media: stage twelve exact owner-approved '+slot+' originals')
  print('EXACT_APPROVED_ORIGINALS_STAGED',slot,12,flush=True)

def main():
 assert os.environ['GITHUB_REPOSITORY']=='fjmmontiel/5sigmas' and os.environ['GITHUB_REF_NAME']==BRANCH
 assert os.environ['GITHUB_ACTOR']=='fjmmontiel'
 git('config','user.name','github-actions[bot]');git('config','user.email','41898282+github-actions[bot]@users.noreply.github.com')
 assert git('ls-remote','origin','refs/heads/'+BRANCH).split()[0]==os.environ['GITHUB_SHA']
 private=X25519PrivateKey.generate()
 ready={'schema':1,'run':os.environ['GITHUB_RUN_ID'],'branch':BRANCH,'public_key':base64.b64encode(private.public_key().public_bytes(serialization.Encoding.Raw,serialization.PublicFormat.Raw)).decode(),'pins':PINS,'expires_epoch':int(time.time()+3300),'scope':'Exact approved horizontal media only; no private source, tokens, regenerated originals, merge or production publication.'}
 (STATE/'receiver.json').write_text(json.dumps(ready,indent=2)+'\n');publish([str(STATE/'receiver.json')],'release: announce one-run public media receiver key')
 done=set()
 while time.time()<ready['expires_epoch'] and done!=set(PINS):
  git('fetch','--quiet','origin',BRANCH)
  for slot in PINS:
   if slot in done:continue
   try:raw=git('show','FETCH_HEAD:'+str(STATE/('input-'+slot+'.json')))
   except subprocess.CalledProcessError:continue
   assert len(raw)<8000
   receive(slot,private,ready,json.loads(raw));done.add(slot)
  if done!=set(PINS):time.sleep(8)
 assert done==set(PINS),'UNDELIVERED_APPROVED_MEDIA_SLOTS'
 print('EXACT_MEDIA_STAGE_COMPLETE 48/48; release integration, checks and deployment still required',flush=True)
if __name__=='__main__':main()
