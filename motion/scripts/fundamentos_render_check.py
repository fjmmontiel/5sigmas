#!/usr/bin/env python3
from __future__ import annotations
import base64,io,json,re,shutil,subprocess
from pathlib import Path
from PIL import Image,ImageDraw
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
REGISTER=ROOT/'migration/fundamentos-ia-iag/series-semantic-register.json';HTML=ROOT/'web/fundamentos-render.html';OUT=ROOT/'dist/fundamentos-browser-check'
def bundled_page():
  def rewrite(js,parent):
    def replace(m):
      target=(parent/m.group(2)).resolve()
      if not target.is_relative_to(ROOT): raise ValueError(f'module escapes motion root: {target}')
      return m.group(1)+'"@5sigmas/'+target.relative_to(ROOT).as_posix()+'"'
    return re.sub(r'(from\s+|import\s+)["\'](\.[^"\']+)["\']',replace,js)
  modules={'@5sigmas/'+p.relative_to(ROOT).as_posix():rewrite(p.read_text(encoding='utf-8'),p.parent) for p in sorted((ROOT/'src/fundamentos').glob('*.mjs'))}
  html=HTML.read_text(encoding='utf-8');init=re.search(r'<script type="module">(.*?)</script>',html,re.S).group(1);init=rewrite(init,HTML.parent)
  payload=json.dumps(modules,ensure_ascii=False).replace('</','<\\/');init_payload=json.dumps(init,ensure_ascii=False).replace('</','<\\/')
  boot="""<script>const modules=__MODULES__,imports={};for(const [id,source] of Object.entries(modules))imports[id]=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));const map=document.createElement('script');map.type='importmap';map.textContent=JSON.stringify({imports});document.head.append(map);const start=document.createElement('script');start.type='module';start.textContent=__INIT__;document.body.append(start);</script>""".replace('__MODULES__',payload).replace('__INIT__',init_payload)
  return re.sub(r'<script type="module">.*?</script>',lambda _:boot,html,flags=re.S)
def git_blob(path): return subprocess.check_output(['git','rev-parse',f'HEAD:{path}'],cwd=ROOT.parent,text=True).strip()
def contact_sheet(page,register,locale,orientation,target):
  tiles=[];samples=[]
  for binding in register['source_bindings']:
    job=f"fundamentos-ia-iag-{binding['chapter']}-{locale}-{orientation}"
    for scene in range(5):
      t=scene*15+7.5;item=page.evaluate('(a)=>window.frame(a.job,a.t)',{'job':job,'t':t});im=Image.open(io.BytesIO(base64.b64decode(item['jpeg']))).convert('RGB');im.thumbnail((420,250) if orientation=='horizontal' else (250,420));tiles.append((job,scene+1,im.copy(),item['result']));samples.append({'job':job,'scene':scene+1,'family':item['result']['family'],'mechanismId':item['result']['mechanismId']})
  cols=5;tile_w=max(x[2].width for x in tiles);tile_h=max(x[2].height for x in tiles)+48;rows=(len(tiles)+cols-1)//cols;sheet=Image.new('RGB',(cols*tile_w+40,rows*tile_h+30),'white');draw=ImageDraw.Draw(sheet)
  for i,(job,scene,im,result) in enumerate(tiles):x=20+(i%cols)*tile_w;y=15+(i//cols)*tile_h;draw.text((x,y),f'{locale.upper()} S{scene} · {result["family"]}',fill='black');draw.text((x,y+18),result['mechanismId'],fill='black');sheet.paste(im,(x,y+42))
  sheet.save(target,quality=91);return samples
def main():
  exe=shutil.which('google-chrome') or shutil.which('chromium') or shutil.which('chromium-browser')
  if not exe: raise SystemExit('system Chromium/Chrome is required')
  OUT.mkdir(parents=True,exist_ok=True);register=json.loads(REGISTER.read_text(encoding='utf-8'));errors=[];source=[]
  for b in register['source_bindings']:
    for locale in ('es','en'): source.append({'chapter':b['chapter'],'locale':locale,'path':b[locale]['path'],'expected':b[locale]['blob_sha'],'actual':git_blob(b[locale]['path'])})
  mismatches=[x for x in source if x['expected']!=x['actual']]
  with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=exe,headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);page=browser.new_page(viewport={'width':1920,'height':1920});page.on('pageerror',lambda e:errors.append(str(e)));page.set_content(bundled_page());page.wait_for_function('window.ready===true',timeout=15000);setup=page.evaluate('(r)=>window.setup(r)',register);rows=page.evaluate('window.layoutCheck()');issues=[{'jobId':r['jobId'],'scene':r['scene'],'timeSeconds':r['timeSeconds'],'issue':i} for r in rows for i in r['issues']]
    report={'unit':'fundamentos-ia-iag','scope':'actual browser/canvas ES/EN H/V preflight; not encoded MP4, owner approval or Technical GOLDEN','browser':browser.version,'jobs':len(set(r['jobId'] for r in rows)),'frames_sampled':len(rows),'setup':setup,'minimum_body_px':min(r['bodySize'] for r in rows),'minimum_mechanism_scale':min(r['mechanismScale'] for r in rows),'minimum_embed_body_px':min(r['metrics']['intendedEmbedBodyPixels'] for r in rows),'issue_count':len(issues),'issues':issues,'browser_errors':errors,'source_blobs':source,'source_blob_mismatches':mismatches}
    for locale in ('es','en'):
      for orientation in ('horizontal','vertical'): report[f'{locale}_{orientation}_contact_sheet']=contact_sheet(page,register,locale,orientation,OUT/f'fundamentos-{locale}-{orientation}-contact-sheet.jpg')
    sample=page.evaluate("()=>window.draw('fundamentos-ia-iag-04-agi-en-vertical',68,true)");report['reduced_motion_sample']={'jobId':sample['jobId'],'scene':sample['scene'],'issues':sample['issues']};(OUT/'fundamentos-browser-preflight.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');browser.close()
  if report['jobs']!=20 or report['frames_sampled']!=300: raise SystemExit(f'incomplete matrix: jobs={report["jobs"]} frames={report["frames_sampled"]}')
  if errors or issues or mismatches or report['reduced_motion_sample']['issues']: raise SystemExit(json.dumps({'browser_errors':errors,'layout_issues':issues[:30],'source_mismatches':mismatches,'reduced_motion':report['reduced_motion_sample']['issues']},ensure_ascii=False))
  print(json.dumps({'jobs':20,'frames_sampled':300,'layout_issues':0,'browser_errors':0,'source_blob_mismatches':0,'minimum_body_px':report['minimum_body_px'],'minimum_mechanism_scale':report['minimum_mechanism_scale'],'minimum_embed_body_px':report['minimum_embed_body_px'],'contact_sheets':4}))
if __name__=='__main__': main()
