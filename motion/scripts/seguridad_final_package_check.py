#!/usr/bin/env python3
"""Validate Seguridad media diagnostics; independently gate owner review.

Pixel movement is diagnostic only. It must never act as a semantic-motion gate:
semantic motion, cue sync and visual quality are decided by the independent
encoded-media review consumed by review_admission.py.
"""
from __future__ import annotations
import argparse
import hashlib
import io
import json
import subprocess
from collections import Counter, defaultdict
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageStat
from review_admission import finalize_package
FPS=60


def sha256(path: Path) -> str:
    h=hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
    return h.hexdigest()


def frame(path: Path,t: float,width: int=480) -> Image.Image:
    raw=subprocess.check_output(['ffmpeg','-hide_banner','-loglevel','error','-ss',f'{t:.3f}','-i',str(path),'-frames:v','1','-vf',f'scale={width}:-2:flags=lanczos','-f','image2pipe','-vcodec','png','-'])
    return Image.open(io.BytesIO(raw)).convert('RGB')


def delta(a: Image.Image,b: Image.Image) -> float:
    d=ImageChops.difference(a.resize((320,180)),b.resize((320,180)))
    return round(sum(ImageStat.Stat(d).mean)/3,4)


def encoded_motion_diagnostic(path: Path,cues: list[dict]) -> tuple[list[dict],list[str]]:
    """Measure pixel evolution across authored visual windows, diagnostics only.

    Low pixel delta is never a semantic-motion failure. Independent encoded-media
    QA remains the fail-closed authority for semantic motion and cue correctness.
    """
    rows=[];warnings=[]
    for cue in cues:
        start=float(cue['visual_at']);end=float(cue['visual_end_at']);scene_end=float(cue['scene_end_at'])
        if not (0 <= start < end < scene_end + 1e-9):
            raise ValueError(f"invalid authored cue timing {cue.get('id')}: {start}, {end}, {scene_end}")
        span=end-start
        times=(start+.05,start+span*.35,start+span*.70,end-.05)
        images=[frame(path,t,width=320) for t in times]
        pair_deltas=[delta(images[i],images[i+1]) for i in range(3)]
        emergence=delta(images[0],images[-1])
        max_delta=max(pair_deltas)
        rows.append({'cue_id':cue.get('id'),'concept_id':cue.get('concept_id'),
                     'visual_target_id':cue.get('visual_target_id'),'visual_at':start,
                     'visual_end_at':end,'sample_times':[round(t,3) for t in times],
                     'pair_deltas':pair_deltas,'max_pair_delta':max_delta,
                     'window_emergence_delta':emergence,
                     'scope':'PIXEL_CHANGE_DIAGNOSTIC_ONLY_NOT_SEMANTIC_MOTION'})
        if max_delta<=.015 and emergence<=.015:
            warnings.append(f"low encoded pixel-change diagnostic {path.name} cue {cue.get('id')}: max_pair_delta={max_delta}, emergence={emergence}")
    return rows,warnings


def make_contact_sheet(items: list[dict],out: Path,orientation: str) -> None:
    cell_w,cell_h=(384,250) if orientation=='horizontal' else (220,390)
    margin,label_h,cols,rows=12,34,5,6
    sheet=Image.new('RGB',(margin+cols*(cell_w+margin),margin+rows*(cell_h+label_h+margin)),'white');draw=ImageDraw.Draw(sheet)
    for row,meta in enumerate(sorted(items,key=lambda x:int(x['chapter']))):
        mp4=out.parent/meta['mp4']['file']
        cues=meta.get('text_visual_cues',[])
        times=[float(c['visual_at'])+(float(c['visual_end_at'])-float(c['visual_at']))*.5 for c in cues]
        for col,t in enumerate(times):
            im=frame(mp4,t,width=cell_w)
            if im.height>cell_h:im.thumbnail((cell_w,cell_h))
            x=margin+col*(cell_w+margin);y=margin+row*(cell_h+label_h+margin)
            bg=Image.new('RGB',(cell_w,cell_h),'white');bg.paste(im,((cell_w-im.width)//2,(cell_h-im.height)//2));sheet.paste(bg,(x,y))
            draw.text((x,y+cell_h+7),f"{meta['chapter']} · C{col+1} · {t:.2f}s",fill='black')
    sheet.save(out,quality=92)


def gate_owner_review(root: Path,metas: list[dict],legacy: dict,*,internal_only=False):
    """Normalize the legacy format without promoting its renderer self-reports."""
    heads=sorted({m['source_head'] for m in metas})
    if len(heads)!=1:raise SystemExit(f'mixed source heads: {heads}')
    inventory=[]
    for m in sorted(metas,key=lambda x:(x['chapter'],x['locale'],x['orientation'])):
        media=m['mp4'];probe=media['ffprobe']
        scene_mechanisms=m.get('scene_mechanisms')
        if not isinstance(scene_mechanisms,list) or len(scene_mechanisms)!=5:
            raise SystemExit(f"{m.get('job_id','unknown')}: missing exact per-scene mechanism binding")
        inventory.append({'chapter':m['chapter'],'locale':m['locale'],'orientation':m['orientation'],
            'mp4':media['file'],'sha256':media['sha256'],'size_bytes':media['size_bytes'],
            'duration_seconds':float(probe['duration']),'frames':int(probe['nb_frames']),'fps':FPS,
            'source_binding':m['source_binding'],'text_visual_cues':m.get('text_visual_cues',[]),
            'scenes':scene_mechanisms,
            'declared_families_diagnostic_only':m['observed_families'],
            'declared_topologies_diagnostic_only':m['observed_topologies']})
    canonical={'schema_version':2,'unit':'seguridad-ia','source_head':heads[0],'outputs':len(metas),
        'state':'INTERNAL_RENDER_PACKAGE','review_ready':False,'owner_visual_approval':'NOT_REQUESTED',
        'technical_golden':False,'published':False,'inventory':inventory}
    (root/'manifest.json').write_text(json.dumps(canonical,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    try:
        return finalize_package(root,root,internal_only=internal_only)
    finally:
        current=json.loads((root/'manifest.json').read_text(encoding='utf-8'))
        legacy.update(state=current['state'],review_ready=current.get('review_ready',False),
                      review_admission=current.get('review_admission'),technical_golden=False)
        (root/'seguridad-ia-final-manifest.json').write_text(json.dumps(legacy,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')


def main() -> None:
    ap=argparse.ArgumentParser();ap.add_argument('--package',type=Path,required=True)
    ap.add_argument('--internal-only',action='store_true',help='Diagnostics only; never owner review')
    args=ap.parse_args();root=args.package
    metas=[json.loads(p.read_text(encoding='utf-8')) for p in root.glob('*.metadata.json')]
    if len(metas)!=24:raise SystemExit(f'expected 24 metadata files, got {len(metas)}')
    combos=Counter((m['locale'],m['orientation']) for m in metas)
    if dict(combos)!={(l,o):6 for l in ('es','en') for o in ('horizontal','vertical')}:raise SystemExit(f'locale/orientation coverage mismatch: {combos}')
    if len({(m['chapter'],m['locale'],m['orientation']) for m in metas})!=24:raise SystemExit('duplicate chapter/locale/orientation')
    errors=[];motion=[];diagnostic_warnings=[]
    for m in sorted(metas,key=lambda x:(x['locale'],x['orientation'],x['chapter'])):
        path=root/m['mp4']['file']
        if not path.exists():errors.append(f'missing {path.name}');continue
        if sha256(path)!=m['mp4']['sha256']:errors.append(f'hash mismatch {path.name}')
        p=m['mp4']['ffprobe'];expected_wh=(1920,1080) if m['orientation']=='horizontal' else (1080,1920)
        if (int(p['width']),int(p['height']))!=expected_wh or p['codec_name']!='h264' or p['r_frame_rate']!='60/1' or int(p['nb_frames'])!=3600:errors.append(f'media profile mismatch {path.name}: {p}')
        decode=subprocess.run(['ffmpeg','-v','error','-i',str(path),'-f','null','-'],capture_output=True,text=True)
        if decode.returncode!=0:errors.append(f'full decode failed {path.name}: {decode.stderr.strip()}');continue
        cues=m.get('text_visual_cues',[])
        if not isinstance(cues,list) or len(cues)!=5 or len({c.get('id') for c in cues})!=5:
            errors.append(f'missing/duplicate authored cues {path.name}');continue
        try:rows,warnings=encoded_motion_diagnostic(path,cues)
        except (KeyError,TypeError,ValueError,subprocess.CalledProcessError) as exc:
            errors.append(f'invalid motion diagnostic inputs {path.name}: {exc}');continue
        motion.append({'file':path.name,'cues':rows});diagnostic_warnings.extend(warnings)
    parity=[];groups=defaultdict(dict)
    for m in metas:groups[(m['chapter'],m['orientation'])][m['locale']]=m
    for key,g in sorted(groups.items()):
        if set(g)!={'es','en'}:errors.append(f'locale parity missing {key}');continue
        es,en=g['es'],g['en']
        row={'chapter':key[0],'orientation':key[1],
            'duration_match':es['mp4']['ffprobe']['duration']==en['mp4']['ffprobe']['duration'],
            'frames_match':es['mp4']['ffprobe']['nb_frames']==en['mp4']['ffprobe']['nb_frames'],
            'families_match':es['observed_families']==en['observed_families'],
            'topologies_match':es['observed_topologies']==en['observed_topologies'],
            'scene_mechanisms_match':es.get('scene_mechanisms')==en.get('scene_mechanisms')}
        if not all(v for k,v in row.items() if k not in ('chapter','orientation')):errors.append(f'ES/EN parity fail {key}: {row}')
        parity.append(row)
    for locale in ('es','en'):
        for orientation in ('horizontal','vertical'):
            items=[m for m in metas if m['locale']==locale and m['orientation']==orientation]
            make_contact_sheet(items,root/f'seguridad-ia-{locale}-{orientation}-contact-sheet.jpg',orientation)
    manifest={'schema_version':2,'unit':'seguridad-ia','state':'INTERNAL_RENDER_PACKAGE' if not errors else 'FAIL',
        'review_ready':False,'technical_golden':False,'owner_visual_approval':'NOT_REQUESTED','output_count':len(metas),
        'coverage':{f'{l}_{o}':n for (l,o),n in sorted(combos.items())},'es_en_parity':parity,
        'parity_scope':'STRUCTURAL_ONLY_NOT_SEMANTIC_APPROVAL','encoded_motion_scope':'PIXEL_CHANGE_DIAGNOSTIC_ONLY_NOT_SEMANTIC_MOTION',
        'encoded_motion_check':motion,'diagnostic_warnings':diagnostic_warnings,'errors':errors,'outputs':metas}
    (root/'seguridad-ia-final-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    if errors:raise SystemExit('\n'.join(errors))
    gate_owner_review(root,metas,manifest,internal_only=args.internal_only)

if __name__=='__main__':main()
