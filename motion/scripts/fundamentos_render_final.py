#!/usr/bin/env python3
"""Render one immutable Fundamentos IA final review-candidate output from the exact browser renderer."""
from __future__ import annotations
import argparse,base64,hashlib,json,shutil,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
from fundamentos_render_check import bundled_page
ROOT=Path(__file__).resolve().parents[1]
REGISTER=ROOT/'migration/fundamentos-ia-iag/series-semantic-register.json'
OUT=ROOT/'dist/fundamentos-final';FPS=60;DURATION=75.0;TOTAL_FRAMES=int(FPS*DURATION)
def sha256(path):
  h=hashlib.sha256()
  with path.open('rb') as f:
    for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
  return h.hexdigest()
def ffmpeg_cmd(path,w,h): return ['ffmpeg','-hide_banner','-loglevel','error','-y','-f','image2pipe','-vcodec','mjpeg','-framerate',str(FPS),'-i','-','-an','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-r',str(FPS),'-movflags','+faststart','-vf',f'scale={w}:{h}:flags=lanczos',str(path)]
def main():
  register=json.loads(REGISTER.read_text(encoding='utf-8'));chapters=[b['chapter'] for b in register['source_bindings']]
  ap=argparse.ArgumentParser();ap.add_argument('--chapter',required=True,choices=chapters);ap.add_argument('--locale',required=True,choices=['es','en']);ap.add_argument('--orientation',required=True,choices=['horizontal','vertical']);a=ap.parse_args()
  if not shutil.which('ffmpeg') or not shutil.which('ffprobe'): raise SystemExit('ffmpeg and ffprobe are required')
  exe=shutil.which('google-chrome') or shutil.which('chromium') or shutil.which('chromium-browser')
  if not exe: raise SystemExit('system Chromium/Chrome is required')
  binding=next(b for b in register['source_bindings'] if b['chapter']==a.chapter);width,height=((1920,1080) if a.orientation=='horizontal' else (1080,1920));job=f'fundamentos-ia-iag-{a.chapter}-{a.locale}-{a.orientation}'
  OUT.mkdir(parents=True,exist_ok=True);stem=f'{a.chapter}-{a.locale}-{a.orientation}';mp4=OUT/f'{stem}.mp4';report_path=OUT/f'{stem}.json';proc=subprocess.Popen(ffmpeg_cmd(mp4,width,height),stdin=subprocess.PIPE);browser_errors=[];issues=[];observed={}
  try:
    with sync_playwright() as p:
      browser=p.chromium.launch(executable_path=exe,headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);page=browser.new_page(viewport={'width':1920,'height':1920});page.on('pageerror',lambda e:browser_errors.append(str(e)));page.set_content(bundled_page());page.wait_for_function('window.ready===true',timeout=15000);setup=page.evaluate('(r)=>window.setup(r)',register)
      matches=[j for j in setup['jobs'] if j['id']==job]
      if len(matches)!=1: raise RuntimeError(f'expected one source-bound job {job}, got {len(matches)}')
      for frame in range(TOTAL_FRAMES):
        t=frame/FPS;item=page.evaluate('(a)=>window.frame(a.job,a.t)',{'job':job,'t':t});r=item['result']
        if r['issues']:
          issues.append({'frame':frame,'seconds':t,'issues':r['issues']});raise RuntimeError(f'render issues {job} frame={frame}: {r["issues"]}')
        idx=min(4,int(t//15));observed.setdefault(idx,{'concept_id':r['scene'],'family':r['family'],'topology':r['topology'],'visual_style':r['visualStyle'],'mechanism_id':r['mechanismId']})
        proc.stdin.write(base64.b64decode(item['jpeg']))
      browser.close()
  finally:
    if proc.stdin: proc.stdin.close()
    rc=proc.wait()
  if rc: raise SystemExit(f'ffmpeg failed {job}: {rc}')
  if browser_errors or issues: raise SystemExit(f'browser/render failure {job}: errors={browser_errors} issues={issues[:3]}')
  probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=codec_name,width,height,pix_fmt,r_frame_rate,avg_frame_rate,duration,nb_frames','-of','json',str(mp4)],text=True))['streams'][0];subprocess.run(['ffmpeg','-v','error','-i',str(mp4),'-f','null','-'],check=True)
  if probe.get('codec_name')!='h264' or int(probe['width'])!=width or int(probe['height'])!=height or probe.get('r_frame_rate')!='60/1' or probe.get('avg_frame_rate')!='60/1' or int(probe.get('nb_frames') or 0)!=TOTAL_FRAMES or abs(float(probe.get('duration') or 0)-DURATION)>.02: raise SystemExit(f'unexpected media profile {job}: {probe}')
  scenes=[observed[i] for i in range(5)];expected=[c['id'] for c in register['concepts'] if c['chapter']==a.chapter]
  if [s['concept_id'] for s in scenes]!=expected: raise SystemExit(f'concept coverage mismatch {job}')
  source=binding[a.locale];report={'schema_version':1,'unit':'fundamentos-ia-iag','scope':'final review candidate output; owner approval and Technical GOLDEN remain separate gates','source_head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT.parent,text=True).strip(),'job_id':job,'chapter':a.chapter,'locale':a.locale,'orientation':a.orientation,'source_path':source['path'],'source_blob_sha':source['blob_sha'],'native_vertical':a.orientation=='vertical','reduced_motion_required':True,'silent':True,'fps':FPS,'duration_seconds':DURATION,'frames':TOTAL_FRAMES,'mp4':mp4.name,'sha256':sha256(mp4),'size_bytes':mp4.stat().st_size,'ffprobe':probe,'full_decode':'PASS','browser_errors':browser_errors,'render_issues':issues,'scenes':scenes,'owner_visual_approval':'NOT_REQUESTED','technical_golden':False,'published':False};report_path.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps({'job_id':job,'sha256':report['sha256'],'size_bytes':report['size_bytes'],'frames':TOTAL_FRAMES,'full_decode':'PASS','scenes':len(scenes)}))
if __name__=='__main__': main()
