#!/usr/bin/env python3
"""Retained chapter encode using shared ESM Paint/layout and semantic timeline.

The import-map mechanism matches seguridad_render_check.bundled_page. This is
an exact render-dependency closure, not a claim of a full site checkout/build.
Outputs remain INTERNAL_ONLY until separate final-MP4 review and delivery.
"""
from __future__ import annotations
import argparse,base64,hashlib,json,re,shutil,subprocess,time
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]

def bundle(entry: str, symbol: str, data: str, spec: str) -> str:
    def rewrite(js: str,parent: Path) -> str:
        def sub(m):
            target=(parent/m.group(2)).resolve()
            if not target.is_relative_to(ROOT) or not target.is_file():
                raise ValueError(f'Unresolved/outside dependency: {target}')
            return m.group(1)+'"@5sigmas/'+target.relative_to(ROOT).as_posix()+'"'
        return re.sub(r'(from\s+|import\s+)[\"\'](\.[^\"\']+)[\"\']',sub,js)
    modules={'@5sigmas/'+p.relative_to(ROOT).as_posix():rewrite(p.read_text(),p.parent) for p in sorted((ROOT/'src').rglob('*.mjs'))}
    payload=json.dumps(modules,ensure_ascii=False).replace('</','<\\/')
    return '''<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0"><canvas></canvas><script>
    const modules=__MODULES__,imports={};
    for(const [id,source] of Object.entries(modules))imports[id]=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
    const map=document.createElement('script');map.type='importmap';map.textContent=JSON.stringify({imports});document.head.append(map);
    const start=document.createElement('script');start.type='module';start.textContent=__INIT__;document.body.append(start);
    </script></body></html>'''.replace('__MODULES__',payload).replace('__INIT__',json.dumps(f'''
import {{{symbol}}} from '@5sigmas/{entry}';
import {{{spec}}} from '@5sigmas/{data}';
window.profile={spec};
const canvas=document.querySelector('canvas');
const original=CanvasRenderingContext2D.prototype.fillText;
window.drawn=[];
CanvasRenderingContext2D.prototype.fillText=function(t,x,y,...rest){{
 const m=this.getTransform(),z=this.measureText(String(t)),size=parseFloat(this.font.match(/([0-9.]+)px/)[1]),w=z.width;
 const dx=this.textAlign==='center'?-w/2:this.textAlign==='right'?-w:0;
 window.drawn.push({{text:String(t),x:m.a*(x+dx)+m.e,y:m.d*y+m.f,w:m.a*w,h:m.d*size,font:size,scale:m.a,color:this.fillStyle}});
 return original.call(this,t,x,y,...rest);
}};
window.frame=(l,o,t,encode=true)=>{{window.drawn=[];const meta={symbol}(canvas,l,o,t);return {{meta,text:window.drawn,jpeg:encode?canvas.toDataURL('image/jpeg',.98).split(',')[1]:null}}}};
window.ready=true;
''',ensure_ascii=False))

def sha(path: Path)->str:return hashlib.sha256(path.read_bytes()).hexdigest()
def check_text(items,W,H):
    errors=[]
    for a in items:
        if a['x']< -1 or a['x']+a['w']>W+1 or a['y']< -1 or a['y']+a['h']>H+1:errors.append({'kind':'outside-canvas','text':a})
    for i,a in enumerate(items):
        for b in items[i+1:]:
            ox=min(a['x']+a['w'],b['x']+b['w'])-max(a['x'],b['x'])
            oy=min(a['y']+a['h'],b['y']+b['h'])-max(a['y'],b['y'])
            if ox>2 and oy>min(a['h'],b['h'])*.4:errors.append({'kind':'text-overlap','texts':[a['text'],b['text']],'overlap':[ox,oy]})
    return errors

def main():
    p=argparse.ArgumentParser();p.add_argument('--chapter',default='01');p.add_argument('--locale',choices=['es','en'],required=True);p.add_argument('--orientation',choices=['horizontal','vertical'],required=True);p.add_argument('--out',type=Path,required=True);p.add_argument('--source-head',required=True);p.add_argument('--probe',action='store_true');a=p.parse_args()
    entry=f'src/seguridad/chapter{a.chapter}.mjs';symbol=f'renderChapter{a.chapter}';data=f'src/seguridad/chapter{a.chapter}-data.mjs';spec=f'CHAPTER{a.chapter}'
    a.out.mkdir(parents=True,exist_ok=True);name=f'{a.chapter}-seguridad-{a.locale}-{a.orientation}';errors=[]
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
        page=browser.new_page(viewport={'width':1920,'height':1920});page.on('pageerror',lambda e:errors.append(str(e)));page.set_content(bundle(entry,symbol,data,spec));page.wait_for_function('window.ready===true');profile=page.evaluate('window.profile');duration=profile['duration'];fps=60;count=round(duration*fps)
        if a.probe:
            samples=[]
            for s in profile['scenes']:
                times=[s['start']+.05,s['end']-.05]
                for b in s['beats']:times +=[s['start']+b['at']-1/fps,s['start']+b['at']+.05,s['start']+(b['at']+b['settledAt'])/2,s['start']+b['settledAt']+.1]
                for t in sorted(set(times)):
                    r=page.evaluate('(a)=>window.frame(...a)',[a.locale,a.orientation,t,False]);W=1080 if a.orientation=='vertical' else 1920;H=1920 if W==1080 else 1080
                    issues=r['meta']['issues']+check_text(r['text'],W,H)
                    samples.append({'t':t,'scene':s['id'],'issues':issues,'text':r['text'],'layout':r['meta']['layout'],'cues':r['meta']['textCue']})
                page.evaluate('(a)=>window.frame(...a)',[a.locale,a.orientation,s['end']-.1,False]);page.locator('canvas').screenshot(path=str(a.out/f'{name}-{s["id"]}.png'))
            report={'profile':profile,'samples':samples,'errors':errors,'issues':sum(len(s['issues']) for s in samples)}; (a.out/f'{name}-probe.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps({'name':name,'samples':len(samples),'issues':report['issues'],'browser_errors':errors}));browser.close();return
        target=a.out/f'{name}.mp4'
        if target.exists():raise SystemExit('Refusing to overwrite retained output')
        cmd=['ffmpeg','-v','error','-f','image2pipe','-vcodec','mjpeg','-framerate',str(fps),'-i','-','-an','-vf','scale=in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p','-c:v','libx264','-threads','3','-preset','fast','-crf','17','-r',str(fps),'-color_range','tv','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-movflags','+faststart',str(target)]
        proc=subprocess.Popen(cmd,stdin=subprocess.PIPE);done=0;started=time.monotonic();W=1080 if a.orientation=='vertical' else 1920;H=1920 if W==1080 else 1080
        try:
            for frame in range(count):
                r=page.evaluate('(a)=>window.frame(...a)',[a.locale,a.orientation,frame/fps,True]);issues=r['meta']['issues']+check_text(r['text'],W,H)
                if issues:raise RuntimeError({'frame':frame,'issues':issues})
                proc.stdin.write(base64.b64decode(r['jpeg']));done+=1
                if done%600==0: print(json.dumps({'file':name,'frames':done,'of':count,'elapsed':round(time.monotonic()-started,1)}),flush=True)
        finally:proc.stdin.close();status=proc.wait();browser.close()
        if status or done!=count or errors:raise RuntimeError({'encoder':status,'frames':done,'required':count,'browser':errors})
    probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(target)]));subprocess.run(['ffmpeg','-v','error','-threads','2','-i',str(target),'-f','null','-'],check=True)
    record={'state':'INTERNAL_ONLY_PENDING_ENCODED_REVIEW','source_head_at_start':a.source_head,'profile':profile,'sha256':sha(target),'size_bytes':target.stat().st_size,'fps':fps,'frames':count,'probe':probe,'source_frame_layout_checks':done,'source_hashes':{p.relative_to(ROOT).as_posix():sha(p) for p in sorted((ROOT/'src').rglob('*.mjs'))},'encoder_command':cmd,'decode':'PASS','browser_errors':errors,'review_ready':False,'published':False}
    target.with_suffix('.metadata.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'file':str(target),'sha256':record['sha256'],'frames':count}),flush=True)
if __name__=='__main__':main()
