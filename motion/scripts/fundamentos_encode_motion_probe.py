#!/usr/bin/env python3
"""Encode bounded Fundamentos H/V semantic-motion probes from the exact browser renderer."""
from __future__ import annotations
import base64,hashlib,io,json,shutil,subprocess
from pathlib import Path
from PIL import Image,ImageChops,ImageStat
from playwright.sync_api import sync_playwright
from fundamentos_render_check import bundled_page
ROOT=Path(__file__).resolve().parents[1];REGISTER=ROOT/'migration/fundamentos-ia-iag/series-semantic-register.json';OUT=ROOT/'dist/fundamentos-encoded-motion';FPS=60;WINDOW_SECONDS=.60;FRAMES_PER_WINDOW=round(FPS*WINDOW_SECONDS)
def sha256(path):
  h=hashlib.sha256()
  with path.open('rb') as f:
    for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
  return h.hexdigest()
def image_delta(a,b):
  ia=Image.open(io.BytesIO(a)).convert('RGB').resize((320,180));ib=Image.open(io.BytesIO(b)).convert('RGB').resize((320,180));return round(sum(ImageStat.Stat(ImageChops.difference(ia,ib)).mean)/3,4)
def ffmpeg_cmd(path,w,h): return ['ffmpeg','-hide_banner','-loglevel','error','-y','-f','image2pipe','-vcodec','mjpeg','-framerate',str(FPS),'-i','-','-an','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-r',str(FPS),'-movflags','+faststart','-vf',f'scale={w}:{h}:flags=lanczos',str(path)]
def concepts_for(register,chapter): return [c for c in register['concepts'] if c['chapter']==chapter]
def encode_orientation(page,register,orientation):
  width,height=((1920,1080) if orientation=='horizontal' else (1080,1920));out=OUT/f'fundamentos-es-{orientation}-motion-probe.mp4';proc=subprocess.Popen(ffmpeg_cmd(out,width,height),stdin=subprocess.PIPE);windows=[];total=0
  try:
    for binding in register['source_bindings']:
      job=f"fundamentos-ia-iag-{binding['chapter']}-es-{orientation}"
      for scene_index,concept in enumerate(concepts_for(register,binding['chapter'])):
        starts=[max(.05,min(13.8,float(cue)+.05)) for cue in concept['cues'] if cue>0][:2]
        if len(starts)<2: starts=[3.05,9.05]
        scene_windows=[];observed=None
        for start_local in starts:
          first=last=None;hashes=set()
          for fi in range(FRAMES_PER_WINDOW):
            local=min(14.8,start_local+fi/FPS);t=scene_index*15+local;item=page.evaluate('(a)=>window.frame(a.job,a.t)',{'job':job,'t':t});observed=item['result']
            if observed['issues']: raise RuntimeError(f"render issues {job} {concept['id']} {t}: {observed['issues']}")
            jpeg=base64.b64decode(item['jpeg']);hashes.add(hashlib.sha256(jpeg).hexdigest());first=jpeg if first is None else first;last=jpeg;proc.stdin.write(jpeg);total+=1
          scene_windows.append({'start_local_seconds':start_local,'duration_seconds':WINDOW_SECONDS,'unique_encoded_source_frames':len(hashes),'first_to_last_mean_rgb_delta':image_delta(first,last)})
        moving=[w for w in scene_windows if w['unique_encoded_source_frames']>6 and w['first_to_last_mean_rgb_delta']>.02]
        windows.append({'job_id':job,'concept_id':concept['id'],'family':observed['family'],'topology':observed['topology'],'visual_style':observed['visualStyle'],'windows':scene_windows,'motion_windows_pass':len(moving)})
  finally:
    if proc.stdin: proc.stdin.close()
    rc=proc.wait()
  if rc: raise SystemExit(f'ffmpeg failed for {orientation}: {rc}')
  static=[w['concept_id'] for w in windows if w['motion_windows_pass']==0]
  if static: raise SystemExit(f'no observed encoded-source semantic motion for {orientation}: {static}')
  probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=codec_name,width,height,pix_fmt,r_frame_rate,avg_frame_rate,duration,nb_frames','-of','json',str(out)],text=True))['streams'][0];subprocess.run(['ffmpeg','-v','error','-i',str(out),'-f','null','-'],check=True)
  return {'orientation':orientation,'path':out.name,'sha256':sha256(out),'size_bytes':out.stat().st_size,'frames_written':total,'concepts':len(windows),'static_concepts':static,'ffprobe':probe,'full_decode':'PASS','motion_windows':windows}
def main():
  if not shutil.which('ffmpeg') or not shutil.which('ffprobe'): raise SystemExit('ffmpeg and ffprobe are required')
  exe=shutil.which('google-chrome') or shutil.which('chromium') or shutil.which('chromium-browser')
  if not exe: raise SystemExit('system Chromium/Chrome is required')
  OUT.mkdir(parents=True,exist_ok=True);register=json.loads(REGISTER.read_text(encoding='utf-8'));errors=[]
  with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=exe,headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);page=browser.new_page(viewport={'width':1920,'height':1920});page.on('pageerror',lambda e:errors.append(str(e)));page.set_content(bundled_page());page.wait_for_function('window.ready===true',timeout=15000);setup=page.evaluate('(r)=>window.setup(r)',register);reports=[encode_orientation(page,register,o) for o in ('horizontal','vertical')];browser.close()
  if errors: raise SystemExit(f'browser errors: {errors}')
  result={'unit':'fundamentos-ia-iag','scope':'bounded encoded H/V semantic-motion probe across all 25 canonical concepts; diagnostic evidence, not final outputs, owner approval or Technical GOLDEN','source_head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT.parent,text=True).strip(),'fps':FPS,'window_seconds':WINDOW_SECONDS,'setup':setup,'browser_errors':errors,'outputs':reports};(OUT/'fundamentos-encoded-motion-report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps({'outputs':2,'concepts_per_orientation':25,'frames_total':sum(r['frames_written'] for r in reports),'full_decode':[r['full_decode'] for r in reports],'static_concepts':[r['static_concepts'] for r in reports],'sha256':[r['sha256'] for r in reports]}))
if __name__=='__main__': main()
