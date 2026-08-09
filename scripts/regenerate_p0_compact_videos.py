#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import json, math, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
STORYBOARDS = ROOT / 'scripts' / 'p0_video_storyboards.json'
WORK = Path(os.environ.get('S5_P0_WORKDIR', ROOT / 'artifacts' / 'p0-video-regeneration'))
W, H, FPS = 1920, 1080, 30
BG=(31,37,42); PANEL=(25,31,37); WHITE=(244,246,250); MUTED=(183,190,198)
TEAL=(38,166,154); AMBER=(255,179,67); BLUE=(124,199,255); RED=(239,98,98); GREEN=(87,201,148)
PALETTE=[BLUE,TEAL,AMBER,RED,GREEN]
FONT_REG='/usr/share/fonts/truetype/lato/Lato-Regular.ttf'
FONT_BOLD='/usr/share/fonts/truetype/lato/Lato-Heavy.ttf'
FONT_MONO='/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'


def hex_rgb(value: str):
    value=value.lstrip('#'); return tuple(int(value[i:i+2],16) for i in (0,2,4))

def font(size, bold=False, mono=False):
    return ImageFont.truetype(FONT_MONO if mono else (FONT_BOLD if bold else FONT_REG), size)

def wrap(draw, text, fnt, maxw):
    lines=[]; cur=''
    for word in text.split():
        candidate=(cur+' '+word).strip()
        if draw.textbbox((0,0),candidate,font=fnt)[2] <= maxw: cur=candidate
        else:
            if cur: lines.append(cur)
            cur=word
    if cur: lines.append(cur)
    return lines

def text_block(draw, text, x, y, fnt, fill, maxw, max_lines=5, gap=8):
    lines=wrap(draw,text,fnt,maxw)
    if len(lines)>max_lines:
        lines=lines[:max_lines]
        lines[-1]=lines[-1].rstrip(' .')+'…'
    step=int(fnt.size*1.25)+gap
    for line in lines:
        draw.text((x,y),line,font=fnt,fill=fill); y+=step
    return y

def box(draw, rect, fill=PANEL, outline=(55,65,73), radius=24, width=2):
    draw.rounded_rectangle(rect,radius=radius,fill=fill,outline=outline,width=width)

def arrow(draw,a,b,color,width=6):
    draw.line([a,b],fill=color,width=width)
    ang=math.atan2(b[1]-a[1],b[0]-a[0]); size=17
    pts=[b,(b[0]-size*math.cos(ang-.55),b[1]-size*math.sin(ang-.55)),(b[0]-size*math.cos(ang+.55),b[1]-size*math.sin(ang+.55))]
    draw.polygon(pts,fill=color)

def diagram(draw, kind, rect, accent, index):
    x0,y0,x1,y1=rect; w=x1-x0; h=y1-y0; cx=(x0+x1)//2; cy=(y0+y1)//2
    box(draw,rect,fill=(26,33,39),outline=tuple(int((a+b)/2) for a,b in zip(accent,(45,55,61))),radius=30,width=3)
    for gx in range(x0+50,x1-20,80): draw.line((gx,y0+30,gx,y1-30),fill=(33,43,49),width=1)
    for gy in range(y0+45,y1-20,70): draw.line((x0+30,gy,x1-30,gy),fill=(33,43,49),width=1)
    if kind=='bars':
        vals=[.42,.70,.88,.58]; labels=['A','B','C','D']
        for i,(v,l) in enumerate(zip(vals,labels)):
            xx=x0+70+i*115; bh=260*v; c=PALETTE[(i+index)%len(PALETTE)]
            draw.rounded_rectangle((xx,y1-95-bh,xx+72,y1-95),14,fill=c)
            draw.text((xx+22,y1-78),l,font=font(18,True,True),fill=MUTED)
    elif kind=='curve':
        ax=(x0+65,y1-75); draw.line((ax[0],y0+60,ax[0],ax[1]),fill=MUTED,width=3); draw.line((ax[0],ax[1],x1-55,ax[1]),fill=MUTED,width=3)
        pts=[]
        for i in range(100):
            t=i/99; val=(t-.26)**2*2.2-.11+.11*t
            pts.append((ax[0]+t*(w-130),ax[1]-val*220))
        draw.line(pts,fill=accent,width=9,joint='curve')
        draw.ellipse((pts[-1][0]-10,pts[-1][1]-10,pts[-1][0]+10,pts[-1][1]+10),fill=AMBER)
    elif kind=='timeline':
        y=cy; draw.line((x0+65,y,x1-65,y),fill=(72,82,88),width=7)
        for i in range(4):
            xx=x0+85+i*(w-170)/3; c=PALETTE[(i+index)%len(PALETTE)]
            draw.ellipse((xx-18,y-18,xx+18,y+18),fill=c)
            draw.text((xx-12,y+38),str(i+1),font=font(18,True),fill=WHITE)
        arrow(draw,(x0+95,y-90),(x1-90,y-90),accent,5)
    elif kind=='flow':
        count=4; bw=100; gap=(w-120-count*bw)/(count-1); xx=x0+60
        for i in range(count):
            c=PALETTE[(i+index)%len(PALETTE)]
            box(draw,(xx,cy-55,xx+bw,cy+55),fill=(35,44,50),outline=c,radius=18,width=4)
            draw.text((xx+36,cy-15),str(i+1),font=font(24,True),fill=c)
            if i<count-1: arrow(draw,(xx+bw+8,cy),(xx+bw+gap-8,cy),MUTED,4)
            xx+=bw+gap
    elif kind=='compare':
        draw.line((cx,y0+65,cx,y1-65),fill=(68,78,84),width=3)
        for side,c,label in [(-1,BLUE,'A'),(1,TEAL,'B')]:
            xx=cx-205 if side<0 else cx+55
            draw.text((xx,y0+85),label,font=font(34,True,True),fill=c)
            draw.rounded_rectangle((xx,y0+155,xx+150,y1-125),20,fill=(35,44,50),outline=c,width=4)
            arrow(draw,(xx+35,y1-160),(xx+120,y0+200),c,5)
    elif kind=='network':
        draw.ellipse((cx-58,cy-58,cx+58,cy+58),fill=(39,48,55),outline=accent,width=5)
        draw.text((cx-20,cy-15),'5σ',font=font(25,True),fill=WHITE)
        for i in range(5):
            a=-math.pi/2+i*2*math.pi/5; px=cx+190*math.cos(a); py=cy+165*math.sin(a); c=PALETTE[(i+index)%5]
            draw.line((cx,cy,px,py),fill=c,width=4); draw.ellipse((px-27,py-27,px+27,py+27),fill=(35,44,50),outline=c,width=3)
    elif kind=='layers':
        yy=y0+75
        for i in range(4):
            c=PALETTE[(i+index)%5]; inset=55+i*25
            box(draw,(x0+inset,yy,x1-inset,yy+65),fill=(35,44,50),outline=c,radius=16,width=3); yy+=88
    elif kind=='wave':
        for i in range(170):
            xx=x0+40+i*(w-80)/169; yy=cy+math.sin(i/7)*48+math.sin(i/2.7)*9
            draw.line((xx,cy,xx,yy),fill=accent if i%19 else RED,width=3)
        draw.line((x0+45,cy,x1-45,cy),fill=(70,80,86),width=2)
    elif kind=='radar':
        R=165; vals=[.82,.55,.75,.65]; pts=[]
        for i,v in enumerate(vals):
            a=-math.pi/2+i*math.pi/2; px=cx+R*math.cos(a); py=cy+R*math.sin(a); draw.line((cx,cy,px,py),fill=(68,78,84),width=3); pts.append((cx+R*v*math.cos(a),cy+R*v*math.sin(a)))
        draw.polygon(pts,fill=(38,166,154),outline=accent)
    elif kind=='area':
        draw.rectangle((x0+70,y0+75,x1-70,y1-90),outline=accent,width=5)
        for i in range(1,7): draw.line((x0+70+i*(w-140)/7,y0+75,x0+70+i*(w-140)/7,y1-90),fill=(56,68,74),width=2)
        for j in range(1,4): draw.line((x0+70,y0+75+j*(h-165)/4,x1-70,y0+75+j*(h-165)/4),fill=(56,68,74),width=2)
        draw.text((cx-95,cy-25),'≈ 4.000 m²',font=font(34,True),fill=WHITE)
    else:
        draw.ellipse((cx-120,cy-120,cx+120,cy+120),outline=accent,width=6)

def scene(story, item, index, kind):
    accent=hex_rgb(story['accent']); img=Image.new('RGB',(W,H),BG); d=ImageDraw.Draw(img); d.rectangle((0,0,W,10),fill=accent)
    if kind=='opening':
        d.text((150,110),story['series'].upper(),font=font(26,True,True),fill=BLUE)
        d.rectangle((150,180,240,186),fill=accent)
        y=text_block(d,story['title'],150,245,font(98,True),WHITE,1080,3,0)
        text_block(d,story['subtitle'],150,y+36,font(38),MUTED,940,3,8)
        box(d,(1320,220,1720,620),fill=(29,39,44),outline=accent,radius=70,width=5)
        glyph=story.get('glyph','5σ'); bb=d.textbbox((0,0),glyph,font=font(126,True)); d.text((1520-(bb[2]-bb[0])/2,420-(bb[3]-bb[1])/2),glyph,font=font(126,True),fill=accent)
    elif kind=='cta':
        d.text((150,145),'SIGUE PROFUNDIZANDO',font=font(26,True,True),fill=accent)
        text_block(d,'El mecanismo completo está en el artículo.',150,250,font(82,True),WHITE,1180,3,0)
        d.text((150,650),'Fuentes, matices y contexto.',font=font(35),fill=MUTED); d.text((150,805),'5sigmas.com',font=font(42,True),fill=BLUE)
    else:
        d.text((145,88),item['kicker'].upper(),font=font(22,True,True),fill=accent); d.rectangle((145,150,230,156),fill=accent)
        y=text_block(d,item['headline'],145,205,font(70,True),WHITE,990,4,2)
        text_block(d,item['body'],145,y+32,font(31),MUTED,990,5,7)
        diagram(d,item['diagram'],(1235,230,1810,745),accent,index)
        d.text((145,995),f"5SIGMAS · {story['short'].upper()}",font=font(16,True,True),fill=(105,115,123))
    d.text((1680,968),'5σ',font=font(29,True),fill=AMBER)
    return img

def render_video(story, frames, output):
    durations=[5.0]+[8.8]*5+[5.0]; args=['ffmpeg','-hide_banner','-loglevel','error','-y']
    for frame in frames: args += ['-i',str(frame)]
    filters=[]
    for i,dur in enumerate(durations):
        n=int(round(dur*FPS)); z=f"1+0.012*on/{n-1}" if i%2==0 else f"1.012-0.012*on/{n-1}"
        filters.append(f"[{i}:v]scale={W}:{H},zoompan=z='{z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={n}:s={W}x{H}:fps={FPS},setsar=1,format=yuv420p[v{i}]")
    trans=.35; prev='v0'; offset=durations[0]-trans
    for i in range(1,len(durations)):
        nxt=f'x{i}'; filters.append(f'[{prev}][v{i}]xfade=transition=fade:duration={trans}:offset={offset:.3f}[{nxt}]'); prev=nxt; offset+=durations[i]-trans
    output.parent.mkdir(parents=True,exist_ok=True)
    args += ['-filter_complex',';'.join(filters),'-map',f'[{prev}]','-an','-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',str(output)]
    subprocess.run(args,check=True)

def main():
    if not STORYBOARDS.is_file(): raise SystemExit(f'Missing {STORYBOARDS}')
    stories=json.loads(STORYBOARDS.read_text(encoding='utf-8')); WORK.mkdir(parents=True,exist_ok=True); report=[]
    for story in stories:
        folder=WORK/story['id']; folder.mkdir(parents=True,exist_ok=True)
        images=[scene(story,story,0,'opening')]+[scene(story,b,i+1,'content') for i,b in enumerate(story['beats'])]+[scene(story,story,6,'cta')]
        frame_paths=[]
        for i,img in enumerate(images):
            p=folder/f'scene_{i:02d}.png'; img.save(p); frame_paths.append(p)
        base=ROOT/story['output']; mp4=base.with_suffix('.mp4'); jpg=base.with_suffix('.jpg')
        print(f'Rendering {mp4.relative_to(ROOT)}',flush=True); render_video(story,frame_paths,mp4)
        subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss','1.5','-i',str(mp4),'-frames:v','1','-q:v','3',str(jpg)],check=True)
        duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(mp4)],text=True).strip())
        probe=subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=codec_name,width,height','-of','json',str(mp4)],text=True)
        meta=json.loads(probe)['streams'][0]
        if not (51.5<=duration<=52.2 and meta['codec_name']=='h264' and meta['width']==W and meta['height']==H): raise RuntimeError(f'Invalid output {mp4}: {duration=} {meta=}')
        report.append({'video':str(mp4.relative_to(ROOT)),'poster':str(jpg.relative_to(ROOT)),'duration':duration,**meta})
    (WORK/'manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False,indent=2))

if __name__=='__main__': main()
