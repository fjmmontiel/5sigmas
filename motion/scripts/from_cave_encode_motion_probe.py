#!/usr/bin/env python3
"""Encode bounded From Cave to AGI H/V semantic-motion probes from the exact browser renderer."""
from __future__ import annotations
import base64, hashlib, io, json, shutil, subprocess
from pathlib import Path
from PIL import Image, ImageChops, ImageStat
from playwright.sync_api import sync_playwright
from from_cave_render_check import bundled_page, load_semantic_chapters

ROOT = Path(__file__).resolve().parents[1]
SPEC = ROOT / 'migration/from-cave-to-agi-content-v1.json'
BINDINGS = ROOT / 'content/from-cave-to-agi/locale-bindings.json'
OUT = ROOT / 'dist/from-cave-to-agi-encoded-motion'
FPS = 60
WINDOW_SECONDS = 0.60
FRAMES_PER_WINDOW = round(FPS * WINDOW_SECONDS)
WINDOW_STARTS = (3.4, 10.2)


def sha256(path: Path) -> str:
    h=hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
    return h.hexdigest()


def image_delta(a: bytes,b: bytes) -> float:
    ia=Image.open(io.BytesIO(a)).convert('RGB').resize((320,180))
    ib=Image.open(io.BytesIO(b)).convert('RGB').resize((320,180))
    diff=ImageChops.difference(ia,ib)
    return round(sum(ImageStat.Stat(diff).mean)/3.0,4)


def ffmpeg_cmd(path: Path,width:int,height:int)->list[str]:
    return ['ffmpeg','-hide_banner','-loglevel','error','-y','-f','image2pipe','-vcodec','mjpeg','-framerate',str(FPS),'-i','-','-an','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-r',str(FPS),'-movflags','+faststart','-vf',f'scale={width}:{height}:flags=lanczos',str(path)]


def encode_orientation(page,spec:dict,orientation:str)->dict:
    width,height=((1920,1080) if orientation=='horizontal' else (1080,1920))
    out_path=OUT/f'from-cave-to-agi-es-{orientation}-motion-probe.mp4'
    proc=subprocess.Popen(ffmpeg_cmd(out_path,width,height),stdin=subprocess.PIPE)
    windows=[];total_frames=0
    try:
        for chapter in range(6):
            job=f'from-cave-to-agi-{chapter:02d}-es-{orientation}'
            chapter_spec=spec['chapters'][chapter]
            for scene_index,scene in enumerate(chapter_spec['scenes']):
                scene_windows=[];observed=None
                for start_local in WINDOW_STARTS:
                    first_jpeg=last_jpeg=None;hashes=set()
                    for fi in range(FRAMES_PER_WINDOW):
                        local=min(14.8,start_local+fi/FPS);t=scene_index*15.0+local
                        item=page.evaluate('(a)=>window.frame(a.job,a.t)',{'job':job,'t':t});observed=item['result']
                        if observed['issues']:raise RuntimeError(f"render issues {job} {scene['concept_id']} {t}: {observed['issues']}")
                        jpeg=base64.b64decode(item['jpeg']);hashes.add(hashlib.sha256(jpeg).hexdigest())
                        if first_jpeg is None:first_jpeg=jpeg
                        last_jpeg=jpeg
                        assert proc.stdin is not None;proc.stdin.write(jpeg);total_frames+=1
                    delta=image_delta(first_jpeg,last_jpeg)
                    scene_windows.append({'start_local_seconds':start_local,'duration_seconds':WINDOW_SECONDS,'unique_encoded_source_frames':len(hashes),'first_to_last_mean_rgb_delta':delta})
                moving=[w for w in scene_windows if w['unique_encoded_source_frames']>6 and w['first_to_last_mean_rgb_delta']>0.02]
                windows.append({'job_id':job,'concept_id':scene['concept_id'],'family':observed['family'],'topology':observed['topology'],'visual_style':observed['visualStyle'],'windows':scene_windows,'motion_windows_pass':len(moving)})
    finally:
        if proc.stdin:proc.stdin.close()
        rc=proc.wait()
    if rc!=0:raise SystemExit(f'ffmpeg failed for {orientation}: {rc}')
    static=[w['concept_id'] for w in windows if w['motion_windows_pass']==0]
    if static:raise SystemExit(f'no observed encoded-source semantic motion for {orientation}: {static}')
    probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=codec_name,width,height,pix_fmt,r_frame_rate,avg_frame_rate,duration,nb_frames','-of','json',str(out_path)],text=True))['streams'][0]
    subprocess.run(['ffmpeg','-v','error','-i',str(out_path),'-f','null','-'],check=True)
    return {'orientation':orientation,'path':out_path.name,'sha256':sha256(out_path),'size_bytes':out_path.stat().st_size,'frames_written':total_frames,'concepts':len(windows),'static_concepts':static,'ffprobe':probe,'full_decode':'PASS','motion_windows':windows}


def main()->None:
    if not shutil.which('ffmpeg') or not shutil.which('ffprobe'):raise SystemExit('ffmpeg and ffprobe are required')
    exe=shutil.which('google-chrome') or shutil.which('chromium') or shutil.which('chromium-browser')
    if not exe:raise SystemExit('system Chromium/Chrome is required')
    OUT.mkdir(parents=True,exist_ok=True)
    spec=json.loads(SPEC.read_text(encoding='utf-8'));bindings=json.loads(BINDINGS.read_text(encoding='utf-8'));chapters=load_semantic_chapters();errors=[]
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=exe,headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
        page=browser.new_page(viewport={'width':1920,'height':1920},device_scale_factor=1);page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content(bundled_page());page.wait_for_function('window.ready===true',timeout=15000)
        setup=page.evaluate('(a)=>window.setup(a.spec,a.bindings,a.chapters)',{'spec':spec,'bindings':bindings,'chapters':chapters})
        reports=[encode_orientation(page,spec,o) for o in ('horizontal','vertical')];browser.close()
    if errors:raise SystemExit(f'browser errors: {errors}')
    result={'unit':'from-cave-to-agi','scope':'bounded encoded H/V semantic-motion probe across all 30 canonical concepts; diagnostic evidence, not final outputs, owner approval or Technical GOLDEN','source_head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT.parent,text=True).strip(),'fps':FPS,'window_seconds':WINDOW_SECONDS,'window_starts':WINDOW_STARTS,'setup':setup,'browser_errors':errors,'outputs':reports}
    (OUT/'from-cave-encoded-motion-report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'outputs':len(reports),'concepts_per_orientation':reports[0]['concepts'],'frames_total':sum(r['frames_written'] for r in reports),'full_decode':[r['full_decode'] for r in reports],'static_concepts':[r['static_concepts'] for r in reports],'sha256':[r['sha256'] for r in reports]}))

if __name__=='__main__':main()
