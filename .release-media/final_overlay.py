"""Apply reviewed F1/W1 metadata only. No rendering, merge or deployment."""
from pathlib import Path
import base64,hashlib,io,json,os,subprocess,tempfile,time,zipfile
from urllib.request import build_opener,HTTPRedirectHandler,Request
from urllib.parse import urlsplit
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey,X25519PublicKey
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes,serialization
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
BRANCH='release/owner-approved-video-batch-20260927'
TARGET='release/final-approved-f1-w1-20260928'
BASE='9e1080a36a5d88f9ecbe0537088a0126ad30a3ab'
ZIP_SHA='a23950cba1bfff2631819a1ab3502d7a3ae74305275f50e9f36fcc12185062f1'
ZIP_BYTES=206039
TREE_SHA='dd29b83e8ad4639b47082aee0d7859f0ddd600966c9c3870705d93b1224a3c3e'
def git(*args,env=None):return subprocess.check_output(['git',*args],text=True,stderr=subprocess.PIPE,env=env).strip()
def sha(b):return hashlib.sha256(b).hexdigest()
class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):return None

def main():
    assert os.environ['GITHUB_REPOSITORY']=='fjmmontiel/5sigmas' and os.environ['GITHUB_REF_NAME']==BRANCH and os.environ['GITHUB_ACTOR']=='fjmmontiel'
    assert git('ls-remote','origin','refs/heads/'+TARGET).split()[0]==BASE
    git('config','user.name','github-actions[bot]');git('config','user.email','41898282+github-actions[bot]@users.noreply.github.com')
    private=X25519PrivateKey.generate();run=os.environ['GITHUB_RUN_ID'];aad=(run+'|final-overlay|'+ZIP_SHA).encode()
    ready={'run':run,'archive_sha256':ZIP_SHA,'base':BASE,'target':TARGET,'public_key':base64.b64encode(private.public_key().public_bytes(serialization.Encoding.Raw,serialization.PublicFormat.Raw)).decode(),'expires_epoch':int(time.time()+900)}
    p=Path('.release-media/final-overlay-ready.json');p.write_text(json.dumps(ready)+'\n');git('add',str(p));git('commit','-m','release(video): announce bounded final metadata integration');git('push','origin','HEAD:refs/heads/'+BRANCH)
    url=None
    while time.time()<ready['expires_epoch']:
        git('fetch','--quiet','--depth=1','origin',BRANCH)
        try:raw=git('show','FETCH_HEAD:.release-media/final-overlay-input-'+run+'.json')
        except subprocess.CalledProcessError:time.sleep(6);continue
        try:
            assert len(raw)<10000;e=json.loads(raw);assert set(e)=={'sender','nonce','ciphertext'}
            shared=private.exchange(X25519PublicKey.from_public_bytes(base64.b64decode(e['sender'],validate=True)))
            key=HKDF(algorithm=hashes.SHA256(),length=32,salt=bytes.fromhex(ZIP_SHA),info=aad).derive(shared)
            payload=json.loads(AESGCM(key).decrypt(base64.b64decode(e['nonce'],validate=True),base64.b64decode(e['ciphertext'],validate=True),aad))
            assert set(payload)=={'run','url'} and payload['run']==run
            url=payload['url'];u=urlsplit(url)
            assert u.scheme=='https' and u.hostname.endswith('.oaiusercontent.com') and not u.username and not u.password and not u.fragment
        except Exception:raise RuntimeError('INVALID_OVERLAY_INPUT_PRIVATE_URL_NOT_LOGGED') from None
        break
    assert url is not None,'NO_INPUT_RECEIVED'
    data=None
    for attempt in range(3):
        try:
            request=Request(url,headers={'User-Agent':'5sigmas-approved-release/1'})
            with build_opener(NoRedirect()).open(request,timeout=60) as r:
                assert r.status==200;data=r.read(ZIP_BYTES+1)
            break
        except Exception as exc:
            print('TRANSPORT_ERROR',type(exc).__name__,getattr(exc,'code',None),flush=True)
            if attempt<2:time.sleep(2)
    assert data is not None,'OVERLAY_DOWNLOAD_FAILED_PRIVATE_URL_NOT_LOGGED'
    assert len(data)==ZIP_BYTES and sha(data)==ZIP_SHA
    url=None
    shared={'.github/receipts/approved-video-batch-20260928-content.json','.github/receipts/approved-video-batch-20260928.sha256','.github/workflows/deploy-pages.yml','.github/workflows/pr-visual-review.yml','docs/approved-video-batch-20260928-release.json','locales/en/manifest.yml','locales/en/media.yml','scripts/verify_approved_video_batch_release.py','scripts/verify_approved_video_batch_browser.mjs'}
    slugs={'fundamentos-ia-iag':['00_presentacion_serie','01-que-es-ia','02-que-es-ia-generativa','03-ia-vs-ia-generativa','04-agi'],'ia-pib-bienestar-energia':['00_presentacion_serie','01-electricidad-bienestar','02-ia-tecnologia-electrica','03-pib-vs-bienestar','04-ia-pib-hoy']}
    allowed=set(shared)
    for series,names in slugs.items():
        for slug in names:
            for prefix,exts in [('docs/',['.md','-transcript.html','-visual-text.vtt']),('locales/en/',['-transcript.html','-visual-text.vtt'])]:
                allowed.update(prefix+'series/'+series+'/'+slug+ext for ext in exts)
    assert len(allowed)==59
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        assert len(z.infolist())==59 and set(z.namelist())==allowed and z.testzip() is None
        contents={name:z.read(name) for name in sorted(allowed)}
    hashes_by_path={name:sha(b) for name,b in contents.items()}
    assert sha(json.dumps(hashes_by_path,sort_keys=True,separators=(',',':')).encode())==TREE_SHA
    assert all(b'drive.google.com' not in b and b'oaiusercontent.com' not in b for b in contents.values())
    git('fetch','--quiet','--depth=1','origin',TARGET);assert git('rev-parse','FETCH_HEAD')==BASE
    old=json.loads(git('show',BASE+':docs/approved-video-batch-20260928-release.json'))
    new=json.loads(contents['docs/approved-video-batch-20260928-release.json'])
    assert old['objects']==new['objects'][:60] and old['collections']==new['collections'][:5]
    assert len(new['objects'])==80 and len(new['collections'])==7
    with tempfile.TemporaryDirectory() as temp:
        td=Path(temp);env=dict(os.environ,GIT_INDEX_FILE=str(td/'index'));git('read-tree',BASE,env=env)
        for name,b in contents.items():
            p=td/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b)
            blob=git('hash-object','-w',str(p));git('update-index','--add','--cacheinfo','100644',blob,name,env=env)
        tree=git('write-tree',env=env);commit=git('commit-tree',tree,'-p',BASE,'-m','feat(video): complete exact approved F1 W1 metadata and extend verified playback coverage')
        assert set(git('diff','--name-only',BASE,commit).splitlines())==allowed
        assert git('ls-remote','origin','refs/heads/'+TARGET).split()[0]==BASE
        git('push','origin',commit+':refs/heads/'+TARGET)
    receipt={'status':'REVIEWED_OVERLAY_APPLIED_NOT_MERGED_NOT_DEPLOYED','run':run,'base':BASE,'commit':commit,'target':TARGET,'archive_sha256':ZIP_SHA,'tree_content_sha256':TREE_SHA,'files':hashes_by_path,'media_changes':0}
    Path('/tmp/final-overlay-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n');print('FINAL_METADATA_APPLIED_NOT_PUBLISHED',commit)
if __name__=='__main__':main()
