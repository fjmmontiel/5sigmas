#!/usr/bin/env python3
"""Capture the canonical Seguridad 00 ESM renderer, never grant video approval.

Usage: python motion/scripts/seguridad_intro_beats_export.py --locale es \
  --orientation horizontal --out /tmp/seg00-es-h --source-head <frozen-visual-ref>
The no-network import map supports restricted Chromium runtimes. Explicit fonts
and full-to-limited-range encoding are part of the reproducible capture contract.
"""
from __future__ import annotations
import argparse, base64, hashlib, json, os, re, subprocess, time
from pathlib import Path
from playwright.sync_api import sync_playwright
REPO = Path(os.environ.get('SIGMAS_SOURCE_ROOT', str(Path(__file__).resolve().parents[2]))).resolve()
SOURCES = ('labels.mjs', 'render/paint.mjs', 'render/layout.mjs',
           'seguridad/semantic-beats.mjs', 'seguridad/intro-v3-data.mjs', 'seguridad/intro-v3.mjs')
FONTS = {
 'Inter-Regular.otf': '/usr/share/fonts/opentype/inter/Inter-Regular.otf',
 'Inter-SemiBold.otf': '/usr/share/fonts/opentype/inter/Inter-SemiBold.otf',
 'GFSDidotBold.otf': '/usr/share/fonts/opentype/didot/GFSDidotBold.otf',
 'GFSDidot.otf': '/usr/share/fonts/opentype/didot/GFSDidot.otf',
}
HTML = '''<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Inter;src:url('/_font/Inter-Regular.otf');font-weight:400;font-style:normal}
@font-face{font-family:Inter;src:url('/_font/Inter-SemiBold.otf');font-weight:500 900;font-style:normal}
@font-face{font-family:'GFS Didot';src:url('/_font/GFSDidotBold.otf');font-weight:500 900;font-style:normal}
@font-face{font-family:'GFS Didot';src:url('/_font/GFSDidot.otf');font-weight:400;font-style:normal}
html,body{margin:0;background:#FCFAF7}canvas{display:block}video{width:100%;height:auto}
</style></head><body><canvas></canvas>__BOOT__</body></html>'''
INIT = '''import {renderIntroV3} from '@5sigmas/motion/src/seguridad/intro-v3.mjs';
import {INTRO_V3,INTRO_TIMELINE} from '@5sigmas/motion/src/seguridad/intro-v3-data.mjs';
await document.fonts.load('400 60px Inter');await document.fonts.load('600 60px Inter');
await document.fonts.load('600 84px "GFS Didot"');await document.fonts.ready;
const canvas=document.querySelector('canvas');window.profile={...INTRO_V3,cues:INTRO_TIMELINE};
window.frame=(locale,orientation,t,{image=true}={})=>{
 const result=renderIntroV3(canvas,locale,orientation,t);
 return {result,jpeg:image?canvas.toDataURL('image/jpeg',.98).split(',')[1]:null};
};window.ready=true;'''

def digest(path: Path) -> str:
 return hashlib.sha256(path.read_bytes()).hexdigest()

def bundled_page() -> str:
 def rewrite(source: str, parent: Path) -> str:
  def replace(m):
   target = (parent / m.group(2)).resolve()
   if not target.is_relative_to(REPO):
    raise ValueError('MODULE_ESCAPES_SOURCE_ROOT')
   return m.group(1) + json.dumps('@5sigmas/' + target.relative_to(REPO).as_posix())
  return re.sub(r'''(from\s+|import\s+)["'](\.[^"']+)["']''', replace, source)
 modules = {}
 for relative in SOURCES:
  path = REPO / 'motion/src' / relative
  modules['@5sigmas/motion/src/' + relative] = rewrite(path.read_text(encoding='utf-8'), path.parent)
 html = HTML
 for name, path in FONTS.items():
  html = html.replace('/_font/' + name, 'data:font/otf;base64,' + base64.b64encode(Path(path).read_bytes()).decode())
 boot = '<script>const modules=' + json.dumps(modules, ensure_ascii=False).replace('</', '<\\/')
 boot += ';const imports={};for(const [id,source] of Object.entries(modules))imports[id]=URL.createObjectURL(new Blob([source],{type:"text/javascript"}));'
 boot += 'const map=document.createElement("script");map.type="importmap";map.textContent=JSON.stringify({imports});document.head.append(map);'
 boot += 'const start=document.createElement("script");start.type="module";start.textContent=' + json.dumps(INIT).replace('</', '<\\/') + ';document.body.append(start);</script>'
 return html.replace('__BOOT__', boot)

def main() -> None:
 ap = argparse.ArgumentParser()
 ap.add_argument('--locale', choices=['es', 'en'], required=True)
 ap.add_argument('--orientation', choices=['horizontal', 'vertical'], required=True)
 ap.add_argument('--out', type=Path, required=True)
 ap.add_argument('--source-head', required=True)
 ap.add_argument('--revision', type=int, default=5)
 ap.add_argument('--probe-only', action='store_true')
 ap.add_argument('--expect-sha256', default=None)
 args = ap.parse_args()
 args.out.mkdir(parents=True, exist_ok=True)
 target = args.out / f'00-seguridad-r{args.revision}-{args.locale}-{args.orientation}.mp4'
 if target.exists():
  raise SystemExit('RETENTION_GUARD: never overwrite an existing video')
 width, height = (1920, 1080) if args.orientation == 'horizontal' else (1080, 1920)
 errors = []
 with sync_playwright() as p:
  browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
    args=['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'])
  page = browser.new_page(viewport={'width': width, 'height': height}, device_scale_factor=1)
  page.on('pageerror', lambda error: errors.append(str(error)))
  page.set_content(bundled_page());page.wait_for_function('window.ready===true')
  profile = page.evaluate('window.profile')
  (args.out / 'profile.json').write_text(json.dumps(profile, ensure_ascii=False, indent=2) + '\n')
  (args.out / 'timeline.json').write_text(json.dumps(profile['cues'], ensure_ascii=False, indent=2) + '\n')
  if args.probe_only:
   times = {0, profile['duration'] - 1/60}
   for cue in profile['cues']:
    times.update([max(0, cue['text_at']-1/60), cue['text_at'], (cue['text_at']+cue['settled_at'])/2, cue['settled_at']+.1])
   failures = []
   for t in sorted(times):
    item = page.evaluate('(a)=>window.frame(...a)', [args.locale, args.orientation, t, {'image': False}])
    if item['result']['issues']:
     failures.append({'at': t, 'issues': item['result']['issues']})
   record = {'state': 'SOURCE_PREFLIGHT_NOT_ENCODED_QA', 'samples': len(times), 'failures': failures, 'browser_errors': errors}
   (args.out / 'preflight.json').write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
   browser.close();print(json.dumps(record), flush=True)
   raise SystemExit(1 if failures or errors else 0)
  fps = 60;total = round(profile['duration'] * fps)
  command = ['ffmpeg','-nostdin','-v','error','-f','image2pipe','-vcodec','mjpeg','-framerate',str(fps),'-i','-','-an','-vf','scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p','-c:v','libx264','-threads','2','-preset','medium','-crf','17','-pix_fmt','yuv420p','-color_range','tv','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-r',str(fps),'-movflags','+faststart',str(target)]
  encoder = subprocess.Popen(command, stdin=subprocess.PIPE)
  completed = 0;started = time.monotonic();browser_version = browser.version
  try:
   for i in range(total):
    item = page.evaluate('(a)=>window.frame(...a)', [args.locale, args.orientation, i/fps])
    if item['result']['issues']:
     raise RuntimeError(item['result']['issues'])
    encoder.stdin.write(base64.b64decode(item['jpeg']));completed += 1
    if completed % 300 == 0:
     print(json.dumps({'frames': completed, 'expected': total, 'elapsed': round(time.monotonic()-started, 2)}), flush=True)
  finally:
   encoder.stdin.close();code = encoder.wait();browser.close()
  if code or completed != total or errors:
   raise RuntimeError({'exit_code': code, 'frames': completed, 'expected': total, 'browser_errors': errors})
 probe = json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(target)]))
 subprocess.run(['ffmpeg','-v','error','-i',str(target),'-f','null','-'], check=True)
 v = probe['streams'][0]
 if len(probe['streams']) != 1 or v['codec_name'] != 'h264' or v['pix_fmt'] != 'yuv420p' or (v['width'],v['height']) != (width,height) or int(v['nb_frames']) != total:
  raise RuntimeError('ENCODE_CONTRACT_FAIL')
 actual_hash = digest(target)
 record = {'state': 'INTERNAL_ONLY_PENDING_INDEPENDENT_QA', 'source_head': args.source_head,
  'render_revision': args.revision, 'mp4': target.name, 'mp4_sha256': actual_hash,
  'bytes': target.stat().st_size, 'probe': probe, 'browser': browser_version,
  'source_sha256': {'motion/src/'+name: digest(REPO/'motion/src'/name) for name in SOURCES},
  'font_sha256': {name: digest(Path(path)) for name,path in FONTS.items()},
  'capture_sha256': digest(Path(__file__)), 'expected_reproduction_sha256': args.expect_sha256,
  'exact_reproduction': None if not args.expect_sha256 else actual_hash == args.expect_sha256,
  'independent_visual_qa': 'PENDING', 'review_ready': False, 'owner_approved': False, 'published': False}
 target.with_suffix('.metadata.json').write_text(json.dumps(record, ensure_ascii=False, indent=2)+'\n')
 print(json.dumps(record, ensure_ascii=False), flush=True)
 if args.expect_sha256 and actual_hash != args.expect_sha256:
  raise SystemExit('EXACT_REPRODUCTION_FAIL: differing bytes must not inherit earlier QA')

if __name__ == '__main__':
 main()
