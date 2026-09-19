#!/usr/bin/env python3
"""Render the actual ESM module graph offline; preserve each module scope."""
from __future__ import annotations
import argparse, base64, hashlib, io, json, math, os, re, shutil, subprocess
from pathlib import Path
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]

def bundled_page():
    """Load each local ESM file in its own scope via an in-memory import map.

    No HTTP server, external requests, concatenated globals, or hardcoded module list.
    """
    def rewrite(js, parent):
        def replace(match):
            target=(parent/match.group(2)).resolve()
            if not target.is_relative_to(ROOT):raise ValueError('Module escapes motion root')
            return match.group(1)+'"@5sigmas/'+target.relative_to(ROOT).as_posix()+'"'
        return re.sub(r"(from\s+|import\s+)[\"'](\.[^\"']+)[\"']",replace,js)
    modules={"@5sigmas/"+path.relative_to(ROOT).as_posix():rewrite(path.read_text(),path.parent) for path in sorted((ROOT/'src').rglob('*.mjs'))}
    html=(ROOT/'web/render.html').read_text()
    init=re.search(r'<script type="module">(.*?)</script>',html,re.S).group(1)
    init=rewrite(init,ROOT/'web')
    payload=json.dumps(modules,ensure_ascii=False).replace('</','<\\/')
    init_payload=json.dumps(init,ensure_ascii=False).replace('</','<\\/')
    boot="""<script>
    const modules=__MODULES__; const imports={};
    for(const [id,source] of Object.entries(modules)) imports[id]=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
    const map=document.createElement('script');map.type='importmap';map.textContent=JSON.stringify({imports});document.head.append(map);
    const start=document.createElement('script');start.type='module';start.textContent=__INIT__;document.body.append(start);
    </script>""".replace('__MODULES__',payload).replace('__INIT__',init_payload)
    return re.sub(r'<script type="module">.*?</script>',lambda _:boot,html,flags=re.S)

def digest(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def source_fingerprint(spec_path):
    files=sorted(p for p in (ROOT/'src').rglob('*.mjs') if p.name!='player.mjs')+[ROOT/'theme/5sigmas.json',ROOT/'web/render.html',Path(__file__).resolve(),spec_path]
    manifest={str(p.relative_to(ROOT)) if p.is_relative_to(ROOT) else p.name:digest(p) for p in files}
    return {'sha256':hashlib.sha256(json.dumps(manifest,sort_keys=True).encode()).hexdigest(),'files':manifest}
def vtt_time(t):
    n=round(t*1000);h,n=divmod(n,3600000);m,n=divmod(n,60000);s,n=divmod(n,1000);return f'{h:02d}:{m:02d}:{s:02d}.{n:03d}'
def sidecars(spec):
    chapters=[];vtt=['WEBVTT',''];offset=0
    for s in spec['scenes']:
        chapters.append({'id':s['id'],'name':' '.join(s['title']),'start':offset,'end':offset+s['duration']})
        for q in s.get('cues',[]):vtt.extend([f"{vtt_time(offset+q['at'])} --> {vtt_time(offset+q['end'])}",q['text'],''])
        offset+=s['duration']
    transcript='# '+spec['title']+'\n\n'+ '\n\n'.join('## '+' '.join(s['title'])+'\n\n'+'\n\n'.join(s['paragraphs'])+'\n\n'+s.get('source','') for s in spec['scenes'])
    return chapters,'\n'.join(vtt),transcript

def sheet(page,spec,target):
    samples=[];offset=0
    for s in spec['scenes']:
        for fraction in [.35,.72,.965]:samples.append((s['id'],offset+s['duration']*fraction))
        offset+=s['duration']
    tiles=[]
    for name,t in samples:
        im=Image.open(io.BytesIO(base64.b64decode(page.evaluate('(t)=>window.frame(t)',t)))).convert('RGB');im.thumbnail((580,580))
        tiles.append((name,t,im.copy()))
    cols=3;w=max(im.width for _,_,im in tiles);h=max(im.height for _,_,im in tiles)+34;rows=math.ceil(len(tiles)/cols)
    canvas=Image.new('RGB',(cols*w+48,rows*h+40),'white');draw=ImageDraw.Draw(canvas)
    for i,(name,t,im) in enumerate(tiles):x=24+(i%cols)*w;y=20+(i//cols)*h;draw.text((x,y),f'{name} | {t:.2f}s',fill='black');canvas.paste(im,(x,y+28))
    canvas.save(target);return [{'scene':n,'time':t} for n,t,_ in tiles]

def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('spec',type=Path);ap.add_argument('--out',type=Path,default=ROOT/'dist');ap.add_argument('--fps',type=int,default=60);ap.add_argument('--portrait',action='store_true');ap.add_argument('--check-only',action='store_true');ap.add_argument('--review-sheet',action='store_true');ap.add_argument('--still',type=float);ap.add_argument('--start',type=float,default=0);ap.add_argument('--seconds',type=float);args=ap.parse_args()
    if args.fps not in (24,25,30,50,60):ap.error('Unsupported frame rate')
    if not shutil.which('ffmpeg') or not shutil.which('ffprobe'):ap.error('ffmpeg/ffprobe are required')
    if sum((args.check_only,args.review_sheet,args.still is not None))>1:ap.error('Choose only one inspection mode')
    spec=json.loads(args.spec.read_text());theme=json.loads((ROOT/'theme/5sigmas.json').read_text());args.out.mkdir(parents=True,exist_ok=True)
    variant='vertical' if args.portrait else 'horizontal';stem=f"{spec['id']}-{variant}";errors=[]
    with sync_playwright() as p:
        exe=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
        browser=p.chromium.launch(executable_path=exe,headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);page=browser.new_page(viewport={'width':1920,'height':1080},device_scale_factor=1)
        page.on('pageerror',lambda e:errors.append(str(e)));page.set_content(bundled_page());page.wait_for_function('window.ready===true',timeout=10000)
        info=page.evaluate('(args)=>window.setup(...args)',[spec,theme,args.portrait]);checks=page.evaluate('window.layoutCheck()');issues=[i for row in checks for i in row['issues']]
        report={'spec':spec['id'],'variant':variant,'runtime':browser.version,'source':source_fingerprint(args.spec.resolve()),'setup':info,'layout':checks,'spec_version':spec['version'],'cue_count':sum(len(s.get('cues',[])) for s in spec['scenes']),'browser_errors':errors,'technical_golden':False,'scope':'render/layout evidence only; not a complete release certificate'}
        def save_report(): (args.out/(stem+'-validation.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2))
        if errors or issues:save_report();raise ValueError(json.dumps({'browser':errors,'layout':issues},ensure_ascii=False))
        if not all(info['fonts']):raise RuntimeError('Required fonts missing; no silent substitution')
        if args.still is not None:(args.out/(stem+'.jpg')).write_bytes(base64.b64decode(page.evaluate('(t)=>window.frame(t)',args.still)));save_report();browser.close();return
        if args.review_sheet:report['review_stills']=sheet(page,spec,args.out/(stem+'-review.jpg'));save_report();browser.close();print(json.dumps({'spec':spec['id'],'layout_issues':0,'frames_sampled':len(checks)}));return
        if args.check_only:save_report();browser.close();print(json.dumps({'spec':spec['id'],'layout_issues':0,'frames_sampled':len(checks)}));return
        total=info['duration'];start=args.start;duration=min(args.seconds if args.seconds is not None else total-start,total-start)
        if start<0 or duration<=0:raise ValueError('Invalid render interval')
        frames=math.ceil(duration*args.fps);target=args.out/(stem+'.mp4');partial=args.out/(stem+'.partial.mp4')
        cmd=['ffmpeg','-y','-hide_banner','-loglevel','error','-f','image2pipe','-vcodec','mjpeg','-framerate',str(args.fps),'-i','pipe:0','-an','-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart','-threads','3',str(partial)]
        with (args.out/(stem+'-ffmpeg.log')).open('wb') as log:
            proc=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=log)
            try:
                for begin in range(0,frames,18):
                    times=[min(total-.00001,start+k/args.fps) for k in range(begin,min(begin+18,frames))]
                    for encoded in page.evaluate('(times)=>window.frames(times)',times):proc.stdin.write(base64.b64decode(encoded))
                proc.stdin.close()
                if proc.wait(timeout=120):raise RuntimeError('Encoding failed')
            except BaseException:proc.kill();proc.wait();partial.unlink(missing_ok=True);raise
        partial.replace(target);probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(target)]));report.update(frames=frames,fps=args.fps,duration=float(probe['format']['duration']),sha256=digest(target),streams=probe['streams'],interval={'start':start,'duration':duration,'full_video':start==0 and args.seconds is None},audio='Silent visual explainer. No narration added.')
        (args.out/(stem+'.jpg')).write_bytes(base64.b64decode(page.evaluate('(t)=>window.frame(t)',min(total-.8,start+duration*.72))))
        chapters,vtt,transcript=sidecars(spec)
        if report['interval']['full_video']:
            (args.out/(stem+'-chapters.json')).write_text(json.dumps(chapters,ensure_ascii=False,indent=2));(args.out/(stem+'-captions.vtt')).write_text(vtt);(args.out/(stem+'-transcript.md')).write_text(transcript)
        if errors:raise RuntimeError('Browser errors during render: '+str(errors))
        save_report();browser.close();print(json.dumps({'file':str(target),'duration':report['duration'],'frames':frames,'sha256':report['sha256'],'layout_issues':0}))
if __name__=='__main__':main()
