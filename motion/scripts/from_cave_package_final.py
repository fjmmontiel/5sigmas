#!/usr/bin/env python3
"""Package From Cave diagnostics; independent QA and direct MP4 delivery gate review."""
from __future__ import annotations
import hashlib
import json
from pathlib import Path
import sys
import zipfile
from review_admission import finalize_package

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'dist/from-cave-to-agi-final'
PACKAGE=ROOT/'dist/from-cave-to-agi-review-package'
CHAPTERS=[f'{i:02d}' for i in range(6)]
LOCALES=['es','en']
ORIENTATIONS=['horizontal','vertical']

def sha256(path: Path) -> str:
    h=hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda:stream.read(1024*1024),b''):h.update(chunk)
    return h.hexdigest()

def main(*,internal_only=False) -> None:
    reports=[];errors=[]
    for chapter in CHAPTERS:
        for locale in LOCALES:
            for orientation in ORIENTATIONS:
                stem=f'{chapter}-{locale}-{orientation}'
                rp=OUT/f'{stem}.json';mp4=OUT/f'{stem}.mp4'
                if not rp.is_file() or not mp4.is_file():
                    errors.append(f'missing {stem}');continue
                r=json.loads(rp.read_text(encoding='utf-8'))
                if (r.get('chapter'),r.get('locale'),r.get('orientation'))!=(chapter,locale,orientation):errors.append(f'identity mismatch {stem}')
                if r.get('full_decode')!='PASS' or r.get('render_issues') or r.get('browser_errors'):errors.append(f'technical output failure {stem}')
                if sha256(mp4)!=r.get('sha256'):errors.append(f'hash mismatch {stem}')
                if r.get('frames')!=4500 or abs(float(r.get('duration_seconds',0))-75)>.02:errors.append(f'duration/frame mismatch {stem}')
                if len(r.get('scenes',[]))!=5:errors.append(f'scene coverage mismatch {stem}')
                reports.append(r)
    if errors or len(reports)!=24:raise SystemExit('package validation failed: '+'; '.join(errors)+f'; reports={len(reports)}')
    parity=[];hv=[]
    for chapter in CHAPTERS:
        for orientation in ORIENTATIONS:
            es=next(r for r in reports if (r['chapter'],r['locale'],r['orientation'])==(chapter,'es',orientation))
            en=next(r for r in reports if (r['chapter'],r['locale'],r['orientation'])==(chapter,'en',orientation))
            ids=[s['concept_id'] for s in es['scenes']]
            ok=es['frames']==en['frames']==4500 and es['duration_seconds']==en['duration_seconds']==75.0 and ids==[s['concept_id'] for s in en['scenes']]
            parity.append({'chapter':chapter,'orientation':orientation,'pass':ok,'concept_ids':ids})
            if not ok:errors.append(f'ES/EN structural parity failure {chapter}-{orientation}')
        for locale in LOCALES:
            h=next(r for r in reports if (r['chapter'],r['locale'],r['orientation'])==(chapter,locale,'horizontal'))
            v=next(r for r in reports if (r['chapter'],r['locale'],r['orientation'])==(chapter,locale,'vertical'))
            ids=[s['concept_id'] for s in h['scenes']]
            ok=ids==[s['concept_id'] for s in v['scenes']] and h['frames']==v['frames']==4500
            hv.append({'chapter':chapter,'locale':locale,'pass':ok,'concept_ids':ids})
            if not ok:errors.append(f'H/V structural parity failure {chapter}-{locale}')
    if errors:raise SystemExit('; '.join(errors))
    heads=sorted({r['source_head'] for r in reports})
    if len(heads)!=1:raise SystemExit(f'mixed source heads: {heads}')
    PACKAGE.mkdir(parents=True,exist_ok=True)
    inventory=[]
    for r in sorted(reports,key=lambda x:(x['chapter'],x['locale'],x['orientation'])):
        row={k:r[k] for k in ('chapter','locale','orientation','mp4','sha256','size_bytes','duration_seconds','frames','source_path','canonical_horizontal_output','full_decode','scenes')}
        row.update(fps=r.get('fps',60),text_visual_cues=r.get('text_visual_cues',[]))
        inventory.append(row)
    manifest={'schema_version':2,'unit':'from-cave-to-agi','state':'INTERNAL_RENDER_PACKAGE','review_ready':False,'source_head':heads[0],
        'outputs':24,'chapters':6,'locales':LOCALES,'orientations':ORIENTATIONS,'full_decode_pass':24,
        'parity_scope':'STRUCTURAL_IDS_AND_TIMING_ONLY_NOT_SEMANTIC_APPROVAL','es_en_parity':parity,'hv_parity':hv,
        'owner_visual_approval':'NOT_REQUESTED','technical_golden':False,'published':False,'inventory':inventory}
    mp=PACKAGE/'manifest.json';mp.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    archive=PACKAGE/'from-cave-to-agi-review-candidate.zip'
    with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
        z.write(mp,'manifest.json')
        for r in inventory:
            z.write(OUT/r['mp4'],f'mp4/{r["mp4"]}')
            stem=Path(r['mp4']).stem;z.write(OUT/f'{stem}.json',f'evidence/{stem}.json')
    summary={'state':'INTERNAL_RENDER_PACKAGE','review_ready':False,'source_head':heads[0],'outputs':24,'full_decode_pass':24,
        'es_en_pairs':12,'es_en_parity_pass':sum(x['pass'] for x in parity),'hv_pairs':12,'hv_parity_pass':sum(x['pass'] for x in hv),
        'package':archive.name,'package_sha256':sha256(archive),'package_size_bytes':archive.stat().st_size,
        'technical_golden':False,'owner_visual_approval':'NOT_REQUESTED'}
    (PACKAGE/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    # Deliberately inside main: programmatic callers cannot bypass admission.
    finalize_package(PACKAGE,OUT,internal_only=internal_only)

if __name__=='__main__':main(internal_only='--internal-only' in sys.argv[1:])
