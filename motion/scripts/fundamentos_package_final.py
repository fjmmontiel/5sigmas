#!/usr/bin/env python3
"""Validate, visually index, and package all 20 Fundamentos IA final review candidate outputs."""
from __future__ import annotations
import hashlib,io,json,subprocess,zipfile
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1];REGISTER=ROOT/'migration/fundamentos-ia-iag/series-semantic-register.json';OUT=ROOT/'dist/fundamentos-final';PACKAGE=ROOT/'dist/fundamentos-review-package';LOCALES=['es','en'];ORIENTATIONS=['horizontal','vertical']
def sha256(path):
  h=hashlib.sha256()
  with path.open('rb') as f:
    for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
  return h.hexdigest()
def grab(path,t): return Image.open(io.BytesIO(subprocess.check_output(['ffmpeg','-v','error','-ss',str(t),'-i',str(path),'-frames:v','1','-f','image2pipe','-vcodec','mjpeg','-']))).convert('RGB')
def contact_sheet(reports,locale,orientation,target):
  tiles=[]
  for r in reports:
    if r['locale']!=locale or r['orientation']!=orientation: continue
    for i,s in enumerate(r['scenes']):
      im=grab(OUT/r['mp4'],i*15+7.5);im.thumbnail((400,225) if orientation=='horizontal' else (225,400));tiles.append((r['chapter'],i+1,s,im.copy()))
  cols=5;tw=max(x[3].width for x in tiles);th=max(x[3].height for x in tiles)+54;rows=(len(tiles)+cols-1)//cols;sheet=Image.new('RGB',(cols*tw+40,rows*th+30),'white');d=ImageDraw.Draw(sheet)
  for i,(chapter,scene,s,im) in enumerate(tiles):x=20+(i%cols)*tw;y=15+(i//cols)*th;d.text((x,y),f'{chapter} · {locale.upper()} · S{scene}',fill='black');d.text((x,y+18),s['family'],fill='black');sheet.paste(im,(x,y+42))
  sheet.save(target,quality=91)
def main():
  register=json.loads(REGISTER.read_text(encoding='utf-8'));chapters=[b['chapter'] for b in register['source_bindings']];expected=[(c,l,o) for c in chapters for l in LOCALES for o in ORIENTATIONS];reports=[];errors=[]
  for chapter,locale,orientation in expected:
    stem=f'{chapter}-{locale}-{orientation}';rp=OUT/f'{stem}.json';mp4=OUT/f'{stem}.mp4'
    if not rp.exists() or not mp4.exists(): errors.append(f'missing {stem}');continue
    r=json.loads(rp.read_text(encoding='utf-8'));actual=sha256(mp4)
    if (r.get('chapter'),r.get('locale'),r.get('orientation'))!=(chapter,locale,orientation): errors.append(f'identity mismatch {stem}')
    if r.get('full_decode')!='PASS' or r.get('render_issues') or r.get('browser_errors'): errors.append(f'technical output failure {stem}')
    if actual!=r.get('sha256'): errors.append(f'hash mismatch {stem}')
    if r.get('frames')!=4500 or abs(float(r.get('duration_seconds',0))-75.0)>.02 or len(r.get('scenes',[]))!=5: errors.append(f'coverage/timing mismatch {stem}')
    binding=next(b for b in register['source_bindings'] if b['chapter']==chapter);src=binding[locale]
    if r.get('source_path')!=src['path'] or r.get('source_blob_sha')!=src['blob_sha']: errors.append(f'source binding mismatch {stem}')
    reports.append(r)
  if errors or len(reports)!=20: raise SystemExit('package validation failed: '+'; '.join(errors)+f'; reports={len(reports)}')
  esen=[];hv=[]
  for c in chapters:
    for o in ORIENTATIONS:
      es=next(r for r in reports if r['chapter']==c and r['locale']=='es' and r['orientation']==o);en=next(r for r in reports if r['chapter']==c and r['locale']=='en' and r['orientation']==o);ids_es=[s['concept_id'] for s in es['scenes']];ids_en=[s['concept_id'] for s in en['scenes']];ok=ids_es==ids_en and es['frames']==en['frames']==4500;esen.append({'chapter':c,'orientation':o,'pass':ok,'concept_ids':ids_es});errors+=([] if ok else [f'ES/EN parity {c}-{o}'])
    for l in LOCALES:
      h=next(r for r in reports if r['chapter']==c and r['locale']==l and r['orientation']=='horizontal');v=next(r for r in reports if r['chapter']==c and r['locale']==l and r['orientation']=='vertical');ids_h=[s['concept_id'] for s in h['scenes']];ids_v=[s['concept_id'] for s in v['scenes']];ok=ids_h==ids_v and h['frames']==v['frames']==4500;hv.append({'chapter':c,'locale':l,'pass':ok,'concept_ids':ids_h});errors+=([] if ok else [f'H/V parity {c}-{l}'])
  if errors: raise SystemExit('package parity failed: '+'; '.join(errors))
  heads=sorted({r['source_head'] for r in reports});
  if len(heads)!=1: raise SystemExit(f'mixed source heads: {heads}')
  families=[s['family'] for r in reports if r['locale']=='es' and r['orientation']=='horizontal' for s in r['scenes']];counts={f:families.count(f) for f in sorted(set(families))};max_use=max(counts.values())
  if len(families)!=25 or max_use>2: raise SystemExit(f'series diversity failure concepts={len(families)} max_use={max_use}')
  PACKAGE.mkdir(parents=True,exist_ok=True)
  for l in LOCALES:
    for o in ORIENTATIONS: contact_sheet(reports,l,o,PACKAGE/f'fundamentos-{l}-{o}-encoded-contact-sheet.jpg')
  inventory=[{'chapter':r['chapter'],'locale':r['locale'],'orientation':r['orientation'],'mp4':r['mp4'],'sha256':r['sha256'],'size_bytes':r['size_bytes'],'duration_seconds':r['duration_seconds'],'frames':r['frames'],'source_path':r['source_path'],'source_blob_sha':r['source_blob_sha'],'full_decode':r['full_decode'],'scenes':r['scenes']} for r in sorted(reports,key=lambda x:(x['chapter'],x['locale'],x['orientation']))]
  manifest={'schema_version':1,'unit':'fundamentos-ia-iag','state':'COMPLETE_REVIEW_CANDIDATE_TECHNICAL_PACKAGE','source_head':heads[0],'outputs':20,'chapters':5,'locales':LOCALES,'orientations':ORIENTATIONS,'full_decode_pass':20,'es_en_parity':esen,'hv_parity':hv,'series_diversity':{'canonical_concepts':25,'family_counts':counts,'max_family_use':max_use,'pass':True},'encoded_contact_sheets':4,'owner_visual_approval':'NOT_REQUESTED','technical_golden':False,'published':False,'inventory':inventory};mp=PACKAGE/'manifest.json';mp.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
  zp=PACKAGE/'fundamentos-ia-iag-review-candidate.zip'
  with zipfile.ZipFile(zp,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    z.write(mp,'manifest.json')
    for p in sorted(PACKAGE.glob('*encoded-contact-sheet.jpg')):z.write(p,f'review-support/{p.name}')
    for r in inventory:
      stem=Path(r['mp4']).stem;z.write(OUT/r['mp4'],f'mp4/{r["mp4"]}');z.write(OUT/f'{stem}.json',f'evidence/{stem}.json')
  summary={'source_head':heads[0],'outputs':20,'full_decode_pass':20,'es_en_pairs':10,'es_en_parity_pass':sum(x['pass'] for x in esen),'hv_pairs':10,'hv_parity_pass':sum(x['pass'] for x in hv),'canonical_concepts':25,'max_family_use':max_use,'encoded_contact_sheets':4,'package':zp.name,'package_sha256':sha256(zp),'package_size_bytes':zp.stat().st_size,'technical_golden':False,'owner_visual_approval':'NOT_REQUESTED'};(PACKAGE/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps(summary))
if __name__=='__main__':main()
