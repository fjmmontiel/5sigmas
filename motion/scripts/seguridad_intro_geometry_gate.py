#!/usr/bin/env python3
"""Inspect actual canvas text/shape bounds at every encoded frame time.

This preflight cannot establish final-MP4 semantic acceptance or delivery.
Mutation controls execute broken renderers; they do not inspect code strings as QA.
"""
from __future__ import annotations
import argparse,base64,hashlib,json,re,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
MOTION=Path(__file__).resolve().parents[1]
ENTRY='src/seguridad/intro-v3.mjs'

def bundle(mutation=None):
    modules={}
    def collect(key):
        if key in modules:return
        path=(MOTION/key).resolve()
        if not path.is_relative_to(MOTION.resolve()):raise ValueError('Module escaped motion root')
        text=path.read_text(encoding='utf-8');modules[key]=text
        for ref in re.findall(r"from\s+['\"]([^'\"]+)['\"]",text):
            if not ref.startswith('.'):raise ValueError('Only the frozen local dependency graph is allowed')
            collect((path.parent/ref).resolve().relative_to(MOTION.resolve()).as_posix())
    collect(ENTRY)
    hashes={k:hashlib.sha256(v.encode()).hexdigest() for k,v in modules.items()}
    if mutation=='caption-in-motion-path':
        modules[ENTRY]=modules[ENTRY].replace("label(P,loc('Memoria','Memory',l),135,y1+55,38,true,230);", "label(P,loc('Memoria persistente','Persistent memory',l),640,y1+135,38,true,640);")
    elif mutation=='unreadable-portrait':
        modules[ENTRY]=modules[ENTRY].replace('const size=P.portrait?44:34;', 'const size=P.portrait?32:34;')
    elif mutation=='underline-through-label':
        modules[ENTRY]=modules[ENTRY].replace("label(P,loc('y pide acceso','Request access',l),760,196,44,true,408);", "label(P,loc('y pide acceso','and request access',l),760,196,44,true,408);")
    imports={}
    for key,text in modules.items():
        parent=(MOTION/key).parent
        def replace(m):
            ref=(parent/m.group(1)).resolve().relative_to(MOTION.resolve()).as_posix()
            return "from '@5sigmas/"+ref+"'"
        rewritten=re.sub(r"from\s+['\"]([^'\"]+)['\"]",replace,text)
        imports['@5sigmas/'+key]='data:text/javascript;base64,'+base64.b64encode(rewritten.encode()).decode()
    html='<meta charset="utf-8"><canvas></canvas><script type="importmap">'+json.dumps({'imports':imports})+'</script><script type="module">import{renderIntroV3}from"@5sigmas/'+ENTRY+'";import{INTRO_V3}from"@5sigmas/src/seguridad/intro-v3-data.mjs";window.render=renderIntroV3;window.profile=INTRO_V3;window.ready=true;</script>'
    return html,hashes

INSTRUMENT=r'''() => {
 const c=document.querySelector('canvas').getContext('2d');
 const nativeMeasure=c.measureText.bind(c),nativeText=c.fillText.bind(c),nativeRect=c.roundRect.bind(c),nativeBegin=c.beginPath.bind(c),nativeFill=c.fill.bind(c),cache=new Map();
 c.measureText=(s)=>{const k=c.font+'|'+String(s);if(!cache.has(k))cache.set(k,nativeMeasure(s));return cache.get(k);};
 let box=null,order=0,texts=[],rects=[],strokes=[],segments=[],lastPoint=null;
 const nativeMove=c.moveTo.bind(c),nativeLine=c.lineTo.bind(c),nativeStroke=c.stroke.bind(c);
 const transformPoint=(x,y)=>{const t=c.getTransform();return{x:t.a*x+t.c*y+t.e,y:t.b*x+t.d*y+t.f};};
 c.moveTo=(x,y)=>{lastPoint=transformPoint(x,y);return nativeMove(x,y);};
 c.lineTo=(x,y)=>{const next=transformPoint(x,y);if(lastPoint)segments.push([lastPoint,next]);lastPoint=next;return nativeLine(x,y);};
 c.stroke=(...a)=>{const width=c.lineWidth*Math.abs(c.getTransform().a);for(const [a,b]of segments){if(Math.abs(a.y-b.y)<.1&&Math.abs(a.x-b.x)>20)strokes.push({x:Math.min(a.x,b.x),y:a.y-width/2,w:Math.abs(a.x-b.x),h:width,order:++order,alpha:c.globalAlpha});}return nativeStroke(...a);};
 c.beginPath=()=>{box=null;segments=[];lastPoint=null;return nativeBegin();};
 c.roundRect=(x,y,w,h,...a)=>{const t=c.getTransform();box={x:t.a*x+t.e,y:t.d*y+t.f,w:w*t.a,h:h*t.d};return nativeRect(x,y,w,h,...a);};
 c.fill=(...a)=>{if(box)rects.push({...box,order:++order,alpha:c.globalAlpha});return nativeFill(...a);};
 c.fillText=(s,x,y,...a)=>{const m=nativeMeasure(s),t=c.getTransform(),l=x-(c.textAlign==='center'?m.width/2:c.textAlign==='right'?m.width:0),size=Number(/([0-9.]+)px/.exec(c.font)?.[1]);
 texts.push({text:String(s),x:t.a*l+t.e,y:t.d*(y-m.actualBoundingBoxAscent)+t.f,w:m.width*Math.abs(t.a),h:(m.actualBoundingBoxAscent+m.actualBoundingBoxDescent)*Math.abs(t.d),size:size*Math.abs(t.a),alpha:c.globalAlpha,order:++order});return nativeText(s,x,y,...a);};
 const overlap=(a,b)=>{const w=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x),h=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);return {w,h,area:Math.max(0,w)*Math.max(0,h)};};
 window.scan=(locale,orientation,first,count)=>{
  const findings=[],canvas=document.querySelector('canvas');let minimum=null;
  for(let n=first;n<first+count;n++){
   texts=[];rects=[];strokes=[];order=0;const r=window.render(canvas,locale,orientation,n/60);
   for(const a of texts.filter(x=>x.text.trim()&&x.alpha>.1)){
    if(orientation==='vertical'&&a.y>117&&a.y<1810){const size=a.size*390/1080;minimum=minimum===null?size:Math.min(minimum,size);if(size<15)findings.push({type:'mobile-content-type',n,text:a.text,size});}
    if(a.x<-.5||a.y<-.5||a.x+a.w>canvas.width+.5||a.y+a.h>canvas.height+.5)findings.push({type:'text-bounds',n,text:a.text});
    for(const b of texts){if(b.order<=a.order||!b.text.trim()||b.alpha<=.1)continue;const q=overlap(a,b);if(q.w>3&&q.h>5&&q.area>Math.min(a.w*a.h,b.w*b.h)*.08)findings.push({type:'text-overlap',n,text:a.text,other:b.text});}
    for(const b of strokes){if(b.order<=a.order||b.alpha<.9)continue;const q=overlap(a,b);if(q.w>10&&q.h>1)findings.push({type:'horizontal-stroke-through-text',n,text:a.text,intersection:q});}
    for(const b of rects){if(b.order<=a.order||b.alpha<.95)continue;const q=overlap(a,b);if(q.w>4&&q.h>4&&q.area>a.w*a.h*.04)findings.push({type:'shape-over-text',n,text:a.text});}
   }
   findings.push(...r.issues.map(issue=>({...issue,n})));
  }
  return{findings,minimumContentCssPx:minimum};
 };
}'''

def run(browser,mutation=None):
    page=browser.new_page(viewport={'width':1920,'height':1920},device_scale_factor=1)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    html,hashes=bundle(mutation);page.set_content(html);page.wait_for_function('window.ready === true');page.evaluate('document.fonts.ready');page.evaluate(INSTRUMENT)
    duration=page.evaluate('window.profile.duration');rows=[]
    combinations=[('es','horizontal'),('es','vertical'),('en','horizontal'),('en','vertical')]
    if mutation=='caption-in-motion-path':combinations=[('es','horizontal'),('en','horizontal')]
    if mutation=='underline-through-label':combinations=[('en','vertical')]
    if mutation=='unreadable-portrait':combinations=[('es','vertical'),('en','vertical')]
    for locale,orientation in combinations:
        findings=[];minimum=None
        first,last=(0,round(duration*60)) if not mutation else ((22*60,25*60) if mutation=='caption-in-motion-path' else ((5*60,10*60) if mutation=='underline-through-label' else (10*60,12*60)))
        for frame in range(first,last,240):
            result=page.evaluate('(a)=>window.scan(...a)',[locale,orientation,frame,min(240,last-frame)])
            findings.extend(result['findings']);value=result['minimumContentCssPx']
            if value is not None:minimum=value if minimum is None else min(minimum,value)
        rows.append({'locale':locale,'orientation':orientation,'frames_checked':last-first,'minimum_content_css_px':minimum,'findings':findings})
    page.close()
    return {'mutation':mutation,'source_sha256':hashes,'browser_errors':errors,'rows':rows,'passes_geometry':not errors and not any(r['findings'] for r in rows)}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--out',type=Path,required=True);parser.add_argument('--mutations',action='store_true');args=parser.parse_args()
    chrome=shutil.which('chromium') or shutil.which('google-chrome')
    if not chrome:raise SystemExit('An actual Chromium runtime is required')
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=chrome,headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
        good=run(browser);controls=[run(browser,m) for m in ('caption-in-motion-path','unreadable-portrait','underline-through-label')] if args.mutations else []
        browser.close()
    result={'scope':'SOURCE_GEOMETRY_ONLY_NOT_ENCODED_ACCEPTANCE','positive':good,'negative_controls':controls}
    args.out.parent.mkdir(parents=True,exist_ok=True);args.out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    if not good['passes_geometry'] or any(r['passes_geometry'] for r in controls):raise SystemExit('Geometry or mutation control failed')
    print(json.dumps({'frames':sum(r['frames_checked'] for r in good['rows']),'positive':'PASS','negative_controls_rejected':len(controls)}))
if __name__=='__main__':main()
