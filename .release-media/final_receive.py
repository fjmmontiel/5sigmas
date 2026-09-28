"""Stage twenty exact owner-approved F1/W1 originals. No merge, deploy or rendering."""
from pathlib import Path
import base64, hashlib, json, os, subprocess, tempfile, time, zipfile
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlsplit
from urllib.request import build_opener, HTTPRedirectHandler, Request
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey, X25519PublicKey
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
BRANCH = 'release/owner-approved-video-batch-20260927'
TARGET = 'release/final-approved-f1-w1-20260928'
BASE = '6209a852b804338e31b95f06bdf604baeb04cf40'
PIN = 'f843bc3678d08563f6339e9a7866b96c467b2c7ba7170f08882ffd759f4d632d'
STATE = Path('.release-media')
PREFIXES = ('docs/series/fundamentos-ia-iag/', 'locales/en/series/fundamentos-ia-iag/', 'docs/series/ia-pib-bienestar-energia/', 'locales/en/series/ia-pib-bienestar-energia/')
def git(*args, env=None):
    return subprocess.check_output(['git', *args], text=True, stderr=subprocess.PIPE, env=env).strip()
def digest(path):
    with Path(path).open('rb') as f:
        return hashlib.file_digest(f, 'sha256').hexdigest()
class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None

def main():
    assert os.environ['GITHUB_REPOSITORY'] == 'fjmmontiel/5sigmas'
    assert os.environ['GITHUB_REF_NAME'] == BRANCH and os.environ['GITHUB_ACTOR'] == 'fjmmontiel'
    spec_path = STATE / 'final-spec.json'
    assert digest(spec_path) == PIN
    spec = json.loads(spec_path.read_text())
    assert spec['target'] == TARGET and spec['expected_head'] == BASE
    rows = spec['media']
    assert len(rows) == len({r['path'] for r in rows}) == 20
    assert all(r['path'].startswith(PREFIXES) and '..' not in Path(r['path']).parts and r['path'].endswith('.mp4') for r in rows)
    assert git('ls-remote', 'origin', 'refs/heads/' + TARGET).split()[0] == BASE
    git('config', 'user.name', 'github-actions[bot]')
    git('config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com')
    private = X25519PrivateKey.generate()
    run = os.environ['GITHUB_RUN_ID']
    ready = {'schema': 1, 'run': run, 'branch': BRANCH, 'target': TARGET, 'expected_head': BASE, 'spec_sha256': PIN, 'public_key': base64.b64encode(private.public_key().public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)).decode(), 'expires_epoch': int(time.time() + 2400), 'scope': 'Twenty hash-pinned approved F1/W1 originals and derived posters; staging branch only; no merge or deployment.'}
    ready_path = STATE / 'final-receiver.json'
    ready_path.write_text(json.dumps(ready, indent=2) + '\n')
    git('add', str(ready_path))
    git('commit', '-m', 'release(video): announce bounded final exact-media receiver')
    git('push', 'origin', 'HEAD:refs/heads/' + BRANCH)
    payload = None
    while time.time() < ready['expires_epoch']:
        git('fetch', '--quiet', '--depth=1', 'origin', BRANCH)
        try:
            raw = git('show', 'FETCH_HEAD:.release-media/final-input.json')
        except subprocess.CalledProcessError:
            time.sleep(8)
            continue
        try:
            assert len(raw) < 60000
            envelope = json.loads(raw)
            assert set(envelope) == {'sender', 'nonce', 'ciphertext'}
            aad = (BRANCH + '|final|' + run + '|' + PIN).encode()
            shared = private.exchange(X25519PublicKey.from_public_bytes(base64.b64decode(envelope['sender'], validate=True)))
            key = HKDF(algorithm=hashes.SHA256(), length=32, salt=bytes.fromhex(PIN), info=aad).derive(shared)
            payload = json.loads(AESGCM(key).decrypt(base64.b64decode(envelope['nonce'], validate=True), base64.b64decode(envelope['ciphertext'], validate=True), aad))
            assert set(payload) == {'run', 'spec_sha256', 'urls'} and payload['run'] == run and payload['spec_sha256'] == PIN
            assert set(payload['urls']) == {r['path'] for r in rows}
            for url in payload['urls'].values():
                u = urlsplit(url)
                assert u.scheme == 'https' and u.hostname and u.hostname.endswith('.oaiusercontent.com') and not u.username and not u.password and not u.fragment
        except Exception:
            raise RuntimeError('INVALID_INPUT_PRIVATE_URLS_NOT_LOGGED') from None
        break
    assert payload is not None, 'NO_AUTHORIZED_INPUT_RECEIVED'
    with tempfile.TemporaryDirectory(prefix='final-exact-media-') as temp:
        td = Path(temp)
        def download(row):
            path = td / row['path']
            path.parent.mkdir(parents=True, exist_ok=True)
            try:
                with build_opener(NoRedirect()).open(Request(payload['urls'][row['path']], headers={'User-Agent': '5sigmas-approved-release/1'}), timeout=90) as response, path.open('wb') as out:
                    assert response.status == 200
                    count = 0
                    while chunk := response.read(1048576):
                        count += len(chunk)
                        assert count <= row['size']
                        out.write(chunk)
                assert path.stat().st_size == row['size'] and digest(path) == row['sha256']
            except Exception:
                raise RuntimeError('EXACT_MEDIA_DOWNLOAD_FAILED_PRIVATE_URL_NOT_LOGGED') from None
            print('EXACT_DOWNLOAD_PASS', row['path'], flush=True)
        with ThreadPoolExecutor(max_workers=4) as pool:
            list(pool.map(download, rows))
        payload = None
        def validate(row):
            path = td / row['path']
            probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-of', 'json', str(path)]))
            assert len(probe['streams']) == 1
            v = probe['streams'][0]
            assert (v['codec_name'], v['pix_fmt'], v['width'], v['height'], v['avg_frame_rate']) == ('h264', 'yuv420p', 1920, 1080, '60/1')
            assert int(v['nb_frames']) == row['frames'] and abs(float(v['duration']) - row['duration']) < .002
            data = path.read_bytes()
            assert 0 < data.find(b'moov') < data.find(b'mdat')
            subprocess.run(['ffmpeg', '-v', 'error', '-xerror', '-threads', '1', '-i', str(path), '-f', 'null', '-'], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
            poster = path.with_suffix('.jpg')
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', '5.5', '-i', str(path), '-frames:v', '1', '-q:v', '2', '-threads', '1', str(poster)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
            assert digest(path) == row['sha256']
            print('EXACT_FULL_DECODE_PASS', row['path'], flush=True)
            return dict(row, poster_sha256=digest(poster), technical='SHA256_SIZE_SILENT_H264_1080P60_FASTSTART_FULL_DECODE_PASS')
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(validate, rows))
        git('fetch', '--quiet', '--depth=1', 'origin', TARGET)
        assert git('rev-parse', 'FETCH_HEAD') == BASE, 'TARGET_CHANGED_NO_OVERWRITE'
        env = dict(os.environ, GIT_INDEX_FILE=str(td / 'index'))
        git('read-tree', BASE, env=env)
        allowed = []
        for row in rows:
            for name in [row['path'], str(Path(row['path']).with_suffix('.jpg'))]:
                blob = git('hash-object', '-w', str(td / name))
                git('update-index', '--add', '--cacheinfo', '100644', blob, name, env=env)
                allowed.append(name)
        receipt = {'schema': 1, 'status': 'EXACT_F1_W1_STAGED_NOT_MERGED_NOT_DEPLOYED', 'source_head': BASE, 'run': run, 'approval': spec['approval'], 'spec_sha256': PIN, 'media_count': 20, 'objects': results, 'scope': 'Only exact approved F1/W1 horizontal originals and posters. Existing eleven approved collections and all article bodies untouched. Metadata integration and release checks still required.'}
        name = '.github/receipts/final-f1-w1-20260928-staging.json'
        p = td / 'receipt.json'
        p.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n')
        blob = git('hash-object', '-w', str(p))
        git('update-index', '--add', '--cacheinfo', '100644', blob, name, env=env)
        allowed.append(name)
        tree = git('write-tree', env=env)
        commit = git('commit-tree', tree, '-p', BASE, '-m', 'feat(video): stage twenty exact approved F1 W1 originals without transcoding')
        assert set(git('diff', '--name-only', BASE, commit).splitlines()) == set(allowed)
        assert git('ls-remote', 'origin', 'refs/heads/' + TARGET).split()[0] == BASE
        git('push', 'origin', commit + ':refs/heads/' + TARGET)
        evidence = Path('/tmp/final-evidence')
        evidence.mkdir(exist_ok=True)
        receipt['staged_commit'] = commit
        (evidence / 'receipt.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n')
        with zipfile.ZipFile(evidence / 'posters.zip', 'w', zipfile.ZIP_DEFLATED) as z:
            for row in rows:
                poster = Path(row['path']).with_suffix('.jpg')
                z.write(td / poster, str(poster))
        print('EXACT_F1_W1_STAGED_NOT_PUBLISHED', commit, flush=True)
if __name__ == '__main__':
    main()
