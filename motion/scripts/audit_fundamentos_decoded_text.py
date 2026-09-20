#!/usr/bin/env python3
"""Independent decoded-frame diagnostic for the legacy Fundamentos horizontal layout.

This measures whether the editorial text mask changes. It is not OCR, semantic
understanding or aesthetic certification. Static copy can be legitimate; compare
these measurements to source-authored text/action cues before judging a scene.
"""
from __future__ import annotations
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import io
import json
from pathlib import Path
import subprocess
import numpy as np
from PIL import Image

def frame(path: Path,t: float) -> Image.Image:
    raw=subprocess.check_output(['ffmpeg','-v','error','-ss',str(t),'-i',str(path),
        '-frames:v','1','-vf','scale=960:540','-f','image2pipe','-vcodec','png','-'],stderr=subprocess.PIPE)
    return Image.open(io.BytesIO(raw)).convert('RGB')

def audit(path: Path) -> dict:
    rows=[]
    for scene in range(5):
        times=[scene*15+.1,scene*15+7.5,scene*15+13.5]
        frames=[frame(path,t) for t in times]
        masks=[np.asarray(im.crop((30,80,430,465)).convert('L'))<90 for im in frames]
        changes=[float(np.mean(masks[0]!=m)) for m in masks[1:]]
        rows.append({'scene':scene+1,'sample_times':times,'dark_text_mask_change_fraction':changes,
            'observation':'NO_PROGRESSIVE_TEXT_CHANGE' if max(changes)<.003 else 'TEXT_CHANGE_DETECTED',
            'decoded_rgb_frame_sha256':[hashlib.sha256(im.tobytes()).hexdigest() for im in frames]})
    return {'mp4':path.name,'mp4_sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'scenes':rows}

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--media',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--workers',type=int,default=4)
    args=parser.parse_args()
    paths=sorted(args.media.glob('*-es-horizontal.mp4'))
    if len(paths)!=5:raise SystemExit(f'Expected 5 canonical ES horizontal files, found {len(paths)}')
    with ThreadPoolExecutor(max_workers=max(1,min(args.workers,5))) as pool:outputs=list(pool.map(audit,paths))
    scenes=[s for o in outputs for s in o['scenes']]
    report={'schema_version':1,'state':'DIAGNOSTIC_ONLY_NOT_GOLDEN','scope':'Legacy fixed horizontal editorial region at 960x540; not a universal layout or semantic evaluator',
        'outputs_checked':5,'scenes_sampled':len(scenes),'frames_decoded':3*len(scenes),
        'static_text_scenes':sum(s['observation']=='NO_PROGRESSIVE_TEXT_CHANGE' for s in scenes),
        'method':{'roi':[30,80,430,465],'dark_luma_threshold':90,'mask_change_tolerance':.003,'scene_seconds':15},'outputs':outputs}
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k!='outputs'}))

if __name__=='__main__':main()
