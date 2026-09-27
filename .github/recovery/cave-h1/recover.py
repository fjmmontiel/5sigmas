"""Bounded byte-exact recovery of owner-approved H1 assets; never aesthetic approval."""
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor
import hashlib, json, lzma, os, shutil, subprocess, sys, tempfile

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[2]
META = json.loads((ROOT / 'approved.json').read_text())
WORK = Path('/tmp/cave-h1-exact-recovery')
WORK.mkdir(exist_ok=True)
for name, expected in META['sources'].items():
    data = lzma.decompress((ROOT / (name + '.xz')).read_bytes())
    assert hashlib.sha256(data).hexdigest() == expected, name
    (WORK / name).write_bytes(data)
sys.path.insert(0, str(WORK))
os.environ['ENCODE_PRESET'] = 'superfast'
os.environ['ENCODE_THREADS'] = '1'
import render


def recover(row):
    chapter = next(x for x in render.STORY['chapters'] if x['chapter'] == row['chapter'])
    target = WORK / row['file']
    render.render_video(chapter, row['lang'], 'h', target, fps=60)
    actual = hashlib.sha256(target.read_bytes()).hexdigest()
    if actual != row['sha256'] or target.stat().st_size != row['size']:
        raise RuntimeError(f"EXACT_APPROVED_BYTES_MISMATCH {row['file']} expected={row['sha256']}/{row['size']} actual={actual}/{target.stat().st_size}; no promotion")
    subprocess.run(['ffmpeg','-v','error','-xerror','-threads','1','-i',str(target),'-f','null','-'],check=True)
    print('APPROVED_BYTES_EXACT', row['file'], actual, flush=True)
    return row


if __name__ == '__main__':
    # Fail cheaply on environment drift before the rest of the twelve-file recovery.
    first = recover(META['media'][0])
    with ProcessPoolExecutor(max_workers=2) as pool:
        completed = [first] + list(pool.map(recover, META['media'][1:]))
    assert len(completed) == 12
    receipts = []
    for row in completed:
        chapter = next(x for x in render.STORY['chapters'] if x['chapter'] == row['chapter'])
        base = Path('docs') if row['lang'] == 'es' else Path('locales/en')
        slug = chapter['slug']
        path = base / 'series' / META['series'] / f"{slug}-h1-{row['sha256'][:12]}.mp4"
        dst = REPO / path
        dst.parent.mkdir(parents=True,exist_ok=True)
        shutil.copyfile(WORK / row['file'],dst)
        assert hashlib.sha256(dst.read_bytes()).hexdigest() == row['sha256']
        receipts.append({**row, 'path':str(path), 'state':'APPROVED_BYTES_EXACT_NOT_DEPLOYED'})
    out = REPO / 'docs/cave-h1-exact-recovery.json'
    out.write_text(json.dumps({'series':META['series'],'round':META['round'],'media':receipts,'publication':'NOT_DEPLOYED'},indent=2)+'\n')
    print('COMPLETE_EXACT_RECOVERY',len(receipts),flush=True)
