#!/usr/bin/env python3
"""Render From Cave to AGI through the actual browser ESM graph and inspect ES/EN H/V layouts."""
from __future__ import annotations
import base64, io, json, re, shutil, subprocess
from pathlib import Path
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SPEC = ROOT / 'migration/from-cave-to-agi-content-v1.json'
BINDINGS = ROOT / 'content/from-cave-to-agi/locale-bindings.json'
PARTIAL = ROOT / 'content/from-cave-to-agi/series-register.partial.json'
HTML = ROOT / 'web/from-cave-render.html'
OUT = ROOT / 'dist/from-cave-to-agi-check'


def load_semantic_chapters() -> list[dict]:
    partial = json.loads(PARTIAL.read_text(encoding='utf-8'))
    selected = {item['chapter']: item for item in partial['chapters']}
    paths = {
        '00': ROOT / 'content/from-cave-to-agi/chapters/00-presentacion.json',
        '03': ROOT / 'content/from-cave-to-agi/chapters/03-aprender.json',
        '04': ROOT / 'content/from-cave-to-agi/chapters/04-escalar.json',
        '05': ROOT / 'content/from-cave-to-agi/chapters/05-mas-alla.json',
    }
    for chapter, path in paths.items():
        selected[chapter] = json.loads(path.read_text(encoding='utf-8'))
    chapters = [selected[f'{i:02d}'] for i in range(6)]
    if sum(len(chapter['concepts']) for chapter in chapters) != 30:
        raise ValueError('expected 30 semantic concepts')
    return chapters


def bundled_page() -> str:
    def rewrite(js: str, parent: Path) -> str:
        def replace(match):
            target = (parent / match.group(2)).resolve()
            if not target.is_relative_to(ROOT):
                raise ValueError(f'module escapes motion root: {target}')
            return match.group(1) + '"@5sigmas/' + target.relative_to(ROOT).as_posix() + '"'
        return re.sub(r'(from\s+|import\s+)[\"\'](\.[^\"\']+)[\"\']', replace, js)

    modules = {
        '@5sigmas/' + path.relative_to(ROOT).as_posix(): rewrite(path.read_text(encoding='utf-8'), path.parent)
        for path in sorted((ROOT / 'src').rglob('*.mjs'))
    }
    html = HTML.read_text(encoding='utf-8')
    init = re.search(r'<script type="module">(.*?)</script>', html, re.S).group(1)
    init = rewrite(init, HTML.parent)
    payload = json.dumps(modules, ensure_ascii=False).replace('</', '<\\/')
    init_payload = json.dumps(init, ensure_ascii=False).replace('</', '<\\/')
    boot = """<script>
    const modules=__MODULES__; const imports={};
    for(const [id,source] of Object.entries(modules)) imports[id]=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
    const map=document.createElement('script');map.type='importmap';map.textContent=JSON.stringify({imports});document.head.append(map);
    const start=document.createElement('script');start.type='module';start.textContent=__INIT__;document.body.append(start);
    </script>""".replace('__MODULES__', payload).replace('__INIT__', init_payload)
    return re.sub(r'<script type="module">.*?</script>', lambda _: boot, html, flags=re.S)


def git_blob(path: str) -> str:
    return subprocess.check_output(['git', 'rev-parse', f'HEAD:{path}'], cwd=ROOT.parent, text=True).strip()


def contact_sheet(page, locale: str, orientation: str, target: Path) -> list[dict]:
    tiles=[]; samples=[]
    for chapter in range(6):
        job=f'from-cave-to-agi-{chapter:02d}-{locale}-{orientation}'
        for scene in range(5):
            t=scene*15+7.5
            item=page.evaluate('(a)=>window.frame(a.job,a.t)', {'job':job,'t':t})
            im=Image.open(io.BytesIO(base64.b64decode(item['jpeg']))).convert('RGB')
            im.thumbnail((420,250) if orientation=='horizontal' else (250,420))
            tiles.append((job,scene+1,t,im.copy(),item['result']))
            samples.append({'job':job,'scene':scene+1,'time':t,'family':item['result']['family'],'topology':item['result']['topology'],'mechanismId':item['result']['mechanismId']})
    cols=5; tile_w=max(im.width for *_,im,_ in tiles); tile_h=max(im.height for *_,im,_ in tiles)+54
    rows=(len(tiles)+cols-1)//cols
    sheet=Image.new('RGB',(cols*tile_w+40,rows*tile_h+30),'white'); draw=ImageDraw.Draw(sheet)
    for i,(job,scene,t,im,result) in enumerate(tiles):
        x=20+(i%cols)*tile_w; y=15+(i//cols)*tile_h
        draw.text((x,y),f'{locale.upper()} C{job.split("-")[4]} · S{scene} · {result["family"]}',fill='black')
        draw.text((x,y+20),f'{result["mechanismId"]} · {t:.1f}s',fill='black')
        sheet.paste(im,(x,y+46))
    sheet.save(target,quality=91)
    return samples


def main() -> None:
    if not (shutil.which('google-chrome') or shutil.which('chromium') or shutil.which('chromium-browser')):
        raise SystemExit('system Chromium/Chrome is required')
    OUT.mkdir(parents=True,exist_ok=True)
    spec=json.loads(SPEC.read_text(encoding='utf-8'))
    bindings=json.loads(BINDINGS.read_text(encoding='utf-8'))
    chapters=load_semantic_chapters()
    errors=[]
    source_blobs=[]
    for binding in spec['source_bindings']:
        for locale in ('es','en'):
            path=binding[locale]
            source_blobs.append({'chapter':binding['chapter'],'locale':locale,'path':path,'blob_sha':git_blob(path)})
    with sync_playwright() as p:
        exe=shutil.which('google-chrome') or shutil.which('chromium') or shutil.which('chromium-browser')
        browser=p.chromium.launch(executable_path=exe,headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
        page=browser.new_page(viewport={'width':1920,'height':1920},device_scale_factor=1)
        page.on('pageerror',lambda e: errors.append(str(e)))
        page.set_content(bundled_page()); page.wait_for_function('window.ready===true',timeout=15000)
        setup=page.evaluate('(a)=>window.setup(a.spec,a.bindings,a.chapters)',{'spec':spec,'bindings':bindings,'chapters':chapters})
        rows=page.evaluate('window.layoutCheck()')
        issues=[{'jobId':row['jobId'],'scene':row['scene'],'timeSeconds':row['timeSeconds'],'issue':issue} for row in rows for issue in row['issues']]
        report={
            'unit':'from-cave-to-agi',
            'scope':'actual browser/canvas ES/EN H/V layout and semantic-motion preflight; not encoded MP4, owner approval or Technical GOLDEN',
            'browser':browser.version,
            'jobs':len(set(row['jobId'] for row in rows)),
            'frames_sampled':len(rows),
            'locales':sorted(set(row['locale'] for row in rows)),
            'orientations':sorted(set(row['orientation'] for row in rows)),
            'setup':setup,
            'minimum_body_px':min(row['bodySize'] for row in rows),
            'minimum_mechanism_scale':min(row['mechanismScale'] for row in rows),
            'issue_count':len(issues),
            'issues':issues,
            'browser_errors':errors,
            'source_blobs':source_blobs,
        }
        for locale in ('es','en'):
            for orientation in ('horizontal','vertical'):
                key=f'{locale}_{orientation}_contact_sheet'
                report[key]=contact_sheet(page,locale,orientation,OUT/f'from-cave-{locale}-{orientation}-contact-sheet.jpg')
        reduced=page.evaluate("()=>window.draw('from-cave-to-agi-05-en-vertical',68,true)")
        report['reduced_motion_sample']={'jobId':reduced['jobId'],'scene':reduced['scene'],'issues':reduced['issues']}
        (OUT/'from-cave-browser-preflight.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        browser.close()
    if report['jobs']!=24 or report['frames_sampled']!=360:
        raise SystemExit(f'incomplete matrix: jobs={report["jobs"]} frames={report["frames_sampled"]}')
    if errors or issues or report['reduced_motion_sample']['issues']:
        raise SystemExit(json.dumps({'browser_errors':errors,'layout_issues':issues[:30],'reduced_motion_issues':report['reduced_motion_sample']['issues']},ensure_ascii=False))
    print(json.dumps({'jobs':24,'frames_sampled':360,'layout_issues':0,'browser_errors':0,'minimum_body_px':report['minimum_body_px'],'minimum_mechanism_scale':report['minimum_mechanism_scale'],'source_blobs':len(source_blobs),'contact_sheets':4}))


if __name__=='__main__':
    main()
