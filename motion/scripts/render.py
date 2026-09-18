#!/usr/bin/env python3
"""Deterministic Canvas -> H.264, poster, chapters, transcript and validation report."""
from __future__ import annotations
import argparse,base64,hashlib,json,math,os,re,shutil,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
MODULES=['labels.mjs','cues.mjs','theme.mjs','schema.mjs','render/paint.mjs','render/layout.mjs','render/mechanisms/common.mjs','render/mechanisms/reasoning.mjs','engine.mjs']

def bundled_page():
    html=(ROOT/'web/render.html').read_text();parts=[]
    for file in MODULES:
        js=(ROOT/'src'/file).read_text()
        js=re.sub(r'^import .*?;\n','',js,flags=re.M)
        js=re.sub(r'\bexport (?=(?:const|function|class))','',js)
        parts.append(js)
    html=re.sub(r'^import .*?;\n','',html,flags=re.M)
    return html.replace('<script type="module">','<script type="module">\n'+'\n'.join(parts)+'\n')

def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('spec',type=Path);ap.add_argument('--out',type=Path,default=ROOT/'dist');ap.add_argument('--fps',type=int,default=60);ap.add_argument('--portrait',action='store_true');ap.add_argument('--check-only',action='store_true');ap.add_argument('--still',type=float);args=ap.parse_args()
    if args.fps not in (24,25,30,50,60):ap.error('Supported fps: 24,25,30,50,60')
    if not shutil.which('ffmpeg') or not shutil.which('ffprobe'):ap.error('Install ffmpeg/ffprobe first')
    spec=json.loads(args.spec.read_text());theme=json.loads((ROOT/'theme/5sigmas.json').read_text());args.out.mkdir(parents=True,exist_ok=True)
    variant='vertical' if args.portrait else 'horizontal';stem=f"{spec['id']}-{variant}"
    with sync_playwright() as p:
        exe=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
        browser=p.chromium.launch(executable_path=exe,headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);page=browser.new_page(viewport={'width':1920,'height':1080},device_scale_factor=1);page.set_content(bundled_page());page.wait_for_function('window.ready===true')
        info=page.evaluate('(a)=>window.setup(...a)',[spec,theme,args.portrait]);layouts=page.evaluate('window.layoutCheck()');issues=[x for r in layouts for x in r['issues']]
        report={'spec':spec['id'],'variant':variant,'runtime':browser.version,'setup':info,'layout':layouts,'spec_version':spec['version'],'cue_count':sum(len(s.get('cues',[])) for s in spec['scenes'])}
        if issues:raise ValueError('Layout validation failed: '+json.dumps(issues,ensure_ascii=False))
        if not all(info['fonts']):raise RuntimeError('Install Inter and Noto Serif Display; silent font substitution is forbidden')
        if args.still is not None:
            image=page.evaluate('(t)=>window.frame(t)',args.still);target=args.out/(stem+'.jpg');target.write_bytes(base64.b64decode(image));(args.out/(stem+'-validation.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2));print(target);return
        if args.check_only:(args.out/(stem+'-validation.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps({'spec':spec['id'],'variant':variant,'layout_issues':0}));return
        total=info['duration'];frames=math.ceil(total*args.fps);target=args.out/(stem+'.mp4');partial=args.out/(stem+'.partial.mp4')
        cmd=['ffmpeg','-y','-hide_banner','-loglevel','error','-f','image2pipe','-vcodec','mjpeg','-framerate',str(args.fps),'-i','pipe:0','-an','-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart','-threads','4',str(partial)]
        with (args.out/(stem+'-ffmpeg.log')).open('wb') as log:
            proc=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=log)
            try:
                for begin in range(0,frames,18):
                    times=[min(total-.00001,k/args.fps) for k in range(begin,min(begin+18,frames))]
                    for encoded in page.evaluate('(times)=>window.frames(times)',times):proc.stdin.write(base64.b64decode(encoded))
                proc.stdin.close()
                if proc.wait(timeout=120):raise RuntimeError('ffmpeg failed; inspect log')
            except BaseException:proc.kill();proc.wait();partial.unlink(missing_ok=True);raise
        partial.replace(target);probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(target)]));report.update({'frames':frames,'fps':args.fps,'duration':float(probe['format']['duration']),'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'streams':probe['streams'],'audio':'No audio added; narration is optional and not a release gate.'})
        image=page.evaluate('(t)=>window.frame(t)',max(.5,total-1));(args.out/(stem+'.jpg')).write_bytes(base64.b64decode(image));chapters=[];offset=0
        for s in spec['scenes']:chapters.append({'id':s['id'],'name':' '.join(s['title']),'start':offset,'end':offset+s['duration']});offset+=s['duration']
        report['chapters']=chapters;(args.out/(stem+'-validation.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2));(args.out/(stem+'-chapters.json')).write_text(json.dumps(chapters,ensure_ascii=False,indent=2));transcript='\n\n'.join('## '+' '.join(s['title'])+'\n\n'+'\n\n'.join(s['paragraphs'])+'\n\n'+s.get('source','') for s in spec['scenes']);(args.out/(stem+'-transcript.md')).write_text('# '+spec['title']+'\n\n'+transcript);browser.close();print(json.dumps({'file':str(target),'duration':report['duration'],'frames':frames,'layout_issues':0},ensure_ascii=False))
if __name__=='__main__':main()
