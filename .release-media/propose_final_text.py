"""Create a hash-pinned proposed Git commit. Does not update a ref, merge or deploy."""
from pathlib import Path
import base64,hashlib,io,json,os,subprocess,time,zipfile
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlsplit
from urllib.request import Request,urlopen
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey,X25519PublicKey
from cryptography.hazmat.primitives import serialization,hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
REPO='fjmmontiel/5sigmas';BRANCH='release/owner-approved-video-batch-20260927';TARGET='release/final-approved-f1-w1-20260928';BASE='9e1080a36a5d88f9ecbe0537088a0126ad30a3ab';PIN='318dc766163014ad42dc80207f0f59bac4396a7577fcac8a5bd9d3ab95c96f69';SIZE=216723

def git(*args):return subprocess.check_output(['git',*args],text=True,stderr=subprocess.PIPE).strip()
def sha(data):return hashlib.sha256(data).hexdigest()
def api(path,payload=None):
    req=Request('https://api.github.com/repos/'+REPO+path,data=json.dumps(payload).encode() if payload is not None else None,headers={'Authorization':'Bearer '+os.environ['GH_TOKEN'],'User-Agent':'5sigmas-approved-release/1','Accept':'application/vnd.github+json','Content-Type':'application/json'})
    with urlopen(req,timeout=60) as r:return json.load(r)
def main():
    assert os.environ['GITHUB_REPOSITORY']==REPO and os.environ['GITHUB_REF_NAME']==BRANCH and os.environ['GITHUB_ACTOR']=='fjmmontiel'
    assert git('ls-remote','origin','refs/heads/'+TARGET).split()[0]==BASE
    git('config','user.name','github-actions[bot]');git('config','user.email','41898282+github-actions[bot]@users.noreply.github.com')
    private=X25519PrivateKey.generate();run=os.environ['GITHUB_RUN_ID'];aad=(BRANCH+'|text|'+run+'|'+PIN).encode()
    ready={'run':run,'public_key':base64.b64encode(private.public_key().public_bytes(serialization.Encoding.Raw,serialization.PublicFormat.Raw)).decode(),'pin':PIN,'base':BASE,'target':TARGET,'scope':'Pinned public UTF-8 changes only. Proposed commit objects, no ref update, merge or deploy.'}
    path=Path('.release-media/text-receiver.json');path.write_text(json.dumps(ready)+'\n');git('add',str(path));git('commit','-m','release(video): announce exact text proposal receiver');git('push','origin','HEAD:refs/heads/'+BRANCH)
    data=None;deadline=time.time()+1200
    while time.time()<deadline:
        git('fetch','--quiet','--depth=1','origin',BRANCH)
        try:raw=git('show','FETCH_HEAD:.release-media/text-input.json')
        except subprocess.CalledProcessError:time.sleep(5);continue
        try:
            assert len(raw)<10000;e=json.loads(raw);assert set(e)=={'sender','nonce','ciphertext'}
            key=HKDF(algorithm=hashes.SHA256(),length=32,salt=bytes.fromhex(PIN),info=aad).derive(private.exchange(X25519PublicKey.from_public_bytes(base64.b64decode(e['sender'],validate=True))))
            url=AESGCM(key).decrypt(base64.b64decode(e['nonce'],validate=True),base64.b64decode(e['ciphertext'],validate=True),aad).decode()
            u=urlsplit(url);assert u.scheme=='https' and u.hostname.endswith('.oaiusercontent.com') and not u.username and not u.password and not u.fragment
            with urlopen(Request(url,headers={'User-Agent':'5sigmas-approved-release/1'}),timeout=60) as r:
                assert r.status==200;data=r.read(SIZE+1)
            assert len(data)==SIZE and sha(data)==PIN
        except Exception:raise RuntimeError('PINNED_TEXT_TRANSFER_FAILED_NO_PRIVATE_URL_LOGGED') from None
        break
    assert data is not None
    git('fetch','--quiet','--depth=1','origin',TARGET);assert git('rev-parse','FETCH_HEAD')==BASE
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        spec=json.loads(z.read('PROPOSAL.json'));rows=spec['files'];assert len(rows)==63 and spec['target']==TARGET and spec['expected_head']==BASE
        assert len(z.namelist())==64 and set(z.namelist())=={'PROPOSAL.json'}|{r['path'] for r in rows}
        entries=[]
        for row in rows:
            p=row['path'];assert '..' not in Path(p).parts and not p.startswith('/') and Path(p).suffix in {'.json','.sha256','.md','.html','.vtt','.yml','.py','.mjs'}
            new=z.read(p);assert len(new)==row['size'] and sha(new)==row['sha256'];text=new.decode('utf8')
            try:old=subprocess.check_output(['git','show',BASE+':'+p],stderr=subprocess.PIPE)
            except subprocess.CalledProcessError:old=None
            assert (sha(old) if old is not None else None)==row['before_sha256'],('Stale base',p)
            entries.append((p,text,row))
    base=api('/git/commits/'+BASE)
    def blob(entry):
        p,text,row=entry;b=api('/git/blobs',{'content':text,'encoding':'utf-8'});expected=hashlib.sha1(b'blob '+str(len(text.encode())).encode()+b'\0'+text.encode()).hexdigest();assert b['sha']==expected
        return {'path':p,'mode':'100644','type':'blob','sha':b['sha']}
    with ThreadPoolExecutor(max_workers=3) as pool:tree_entries=list(pool.map(blob,entries))
    tree=api('/git/trees',{'base_tree':base['tree']['sha'],'tree':tree_entries})
    commit=api('/git/commits',{'message':'feat(video): integrate approved F1 W1 and verify all 13 series without changing approved media','tree':tree['sha'],'parents':[BASE]})
    assert git('ls-remote','origin','refs/heads/'+TARGET).split()[0]==BASE
    receipt={'status':'PINNED_TEXT_PROPOSAL_CREATED_REF_NOT_MOVED','run':run,'target':TARGET,'base':BASE,'proposed_commit':commit['sha'],'tree':tree['sha'],'zip_sha256':PIN,'files':rows,'scope':'63 reviewed text files only; all approved MP4s and existing embedded article animations preserved.'}
    out=Path('/tmp/final-text-evidence');out.mkdir();(out/'proposal-receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
    print('PINNED_TEXT_PROPOSAL_READY',commit['sha'],flush=True)
if __name__=='__main__':main()
