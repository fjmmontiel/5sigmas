#!/usr/bin/env python3
"""Generate v2 Context Engineering visual media with fail-closed layout checks.

VOICE remains deliberately absent. All material labels are >=68 source px,
all explanatory geometry stays above the native-control safe area, and every
node checks its wrapped text against its own bounds before a frame can render.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import math
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
V1_PATH = ROOT / "scripts/generate_context_engineering_visual_media.py"
spec = importlib.util.spec_from_file_location("context_media_v1", V1_PATH)
if spec is None or spec.loader is None:
    raise RuntimeError("cannot load Context v1 metadata/helpers")
v1 = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = v1
spec.loader.exec_module(v1)

# Reuse only stable metadata, encoding and locale declaration helpers.
CHAPTERS = v1.CHAPTERS
SERIES = v1.SERIES
W, H = 1920, 1080
FPS = 6
DURATION_SECONDS = 36
SCENE_SECONDS = 12
TOTAL_FRAMES = FPS * DURATION_SECONDS
SAFE_ZONE_START_Y = 810
MOBILE_INLINE_WIDTH = 356
MIN_MATERIAL_SOURCE_PX = 68
MOBILE_SCALE = MOBILE_INLINE_WIDTH / W

# Drawing primitives/colors originate in the already-GOLDEN Coding media system.
base = v1.base
BG, BG_2, PANEL, PANEL_2 = base.BG, base.BG_2, base.PANEL, base.PANEL_2
TEXT, MUTED, ACCENT, ACCENT_2 = base.TEXT, base.MUTED, base.ACCENT, base.ACCENT_2
GOOD, WARN, BAD, BLUE, PURPLE, LINE = base.GOOD, base.WARN, base.BAD, base.BLUE, base.PURPLE, base.LINE


def smooth(v: float) -> float:
    v = max(0.0, min(1.0, v))
    return v * v * (3.0 - 2.0 * v)


def wrapped_metrics(draw: ImageDraw.ImageDraw, value: str, size: int, width: int) -> tuple[str, tuple[int, int, int, int]]:
    fnt = base.font(size, True)
    wrapped = base.wrap(draw, value, fnt, width)
    bbox = draw.multiline_textbbox((0, 0), wrapped, font=fnt, spacing=max(8, size // 6), align="center")
    return wrapped, bbox


def material_text(draw: ImageDraw.ImageDraw, xy, value: str, *, size: int = 68, color: str = TEXT, max_width: int | None = None, anchor: str = "la", align: str = "left") -> tuple[int, int, int, int]:
    if size < MIN_MATERIAL_SOURCE_PX:
        raise RuntimeError(f"material text below floor: {size}px < {MIN_MATERIAL_SOURCE_PX}px ({value})")
    fnt = base.font(size, True)
    wrapped = base.wrap(draw, value, fnt, max_width) if max_width else value
    bbox = draw.multiline_textbbox(xy, wrapped, font=fnt, spacing=max(8, size // 6), anchor=anchor, align=align)
    draw.multiline_text(xy, wrapped, font=fnt, fill=color, spacing=max(8, size // 6), anchor=anchor, align=align)
    return bbox


def node(draw: ImageDraw.ImageDraw, center, value: str, *, w=400, h=150, outline=LINE, active=False, size=68) -> tuple[int, int, int, int]:
    x, y = center
    box = (int(x-w/2), int(y-h/2), int(x+w/2), int(y+h/2))
    if box[1] < 390 or box[3] > SAFE_ZONE_START_Y - 15:
        raise RuntimeError(f"node leaves mechanism band: {value} -> {box}")
    wrapped, metrics = wrapped_metrics(draw, value, size, w-42)
    tw, th = metrics[2]-metrics[0], metrics[3]-metrics[1]
    if tw > w-34 or th > h-28:
        raise RuntimeError(f"node label does not fit: {value!r} text={tw}x{th}, node={w}x{h}")
    if active:
        draw.rounded_rectangle((box[0]-8,box[1]-8,box[2]+8,box[3]+8), radius=30, outline=ACCENT, width=6)
    draw.rounded_rectangle(box, radius=24, fill=PANEL_2 if active else PANEL, outline=ACCENT if active else outline, width=5)
    fnt = base.font(size, True)
    draw.multiline_text(center, wrapped, font=fnt, fill=TEXT, spacing=max(8,size//6), anchor="mm", align="center")
    return box


def arrow(draw, a, b, color=ACCENT, width=9):
    base.arrow(draw, a, b, color=color, width=width)


def pulse(draw, a, b, p, color=ACCENT_2):
    base.token(draw, a, b, p, color)


def base_frame(chapter, locale: str, scene: int) -> tuple[Image.Image, ImageDraw.ImageDraw, int]:
    image = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(image)
    title = chapter.title_es if locale == "es" else chapter.title_en
    moment = (chapter.moments_es if locale == "es" else chapter.moments_en)[scene]
    draw.rectangle((0,0,W,12), fill=ACCENT)
    base.text(draw,(80,48),"5SIGMAS · CONTEXT ENGINEERING",size=44,color=ACCENT,bold=True)
    base.text(draw,(1815,52),locale.upper(),size=44,color=MUTED,bold=True,anchor="ra")

    # Metadata title is deliberately smaller than mechanism labels; its measured
    # bottom drives the scene heading, so long localized titles can never collide.
    title_font = base.font(54, True)
    title_wrapped = base.wrap(draw, title, title_font, 1600)
    title_y = 104
    draw.multiline_text((80,title_y), title_wrapped, font=title_font, fill=TEXT, spacing=9)
    title_box = draw.multiline_textbbox((80,title_y), title_wrapped, font=title_font, spacing=9)
    moment_y = title_box[3] + 20
    moment_box = material_text(draw,(80,moment_y),moment,size=68,color=ACCENT_2,max_width=1720)
    mechanism_top = max(400, moment_box[3] + 28)
    if mechanism_top > 455:
        raise RuntimeError(f"heading consumes mechanism band: {title!r} / {moment!r} -> y={mechanism_top}")

    draw.rectangle((0,SAFE_ZONE_START_Y,W,H), fill=BG_2)
    draw.line((80,1020,1840,1020), fill="#294047", width=6)
    progress_x = 80 + int(1760 * (scene * SCENE_SECONDS) / DURATION_SECONDS)
    draw.line((80,1020,progress_x,1020), fill=ACCENT, width=6)
    return image, draw, mechanism_top


def stack_to_gate(draw, labels, center_label, out_label, p, colors=(BLUE,PURPLE,ACCENT_2)):
    ys=(450,575,700)
    for i,(lab,y,col) in enumerate(zip(labels,ys,colors)):
        node(draw,(250,y),lab,w=360,h=112,outline=col,active=p>.18*(i+1))
        arrow(draw,(435,y),(690,575+(i-1)*38),col)
        if p>.18*(i+1): pulse(draw,(435,y),(690,575+(i-1)*38),min(1,(p-.18*i)*1.6),col)
    node(draw,(940,575),center_label,w=500,h=230,outline=ACCENT,active=p>.3)
    arrow(draw,(1200,575),(1430,575),GOOD)
    node(draw,(1620,575),out_label,w=330,h=160,outline=GOOD,active=p>.65)


def draw_ch1(draw, locale, scene, p):
    es=locale=="es"
    if scene==0:
        stack_to_gate(draw,("Prompt","Memoria" if es else "Memory","Retrieval"),"Contexto\ndel turno" if es else "Turn\ncontext","Modelo" if es else "Model",p)
    elif scene==1:
        stack_to_gate(draw,("Estado" if es else "State","Memoria" if es else "Memory","Tools"),"Assembler","Modelo" if es else "Model",p)
    else:
        stack_to_gate(draw,("Turno t" if es else "Turn t","Tool result","Memoria Δ" if es else "Memory Δ"),"Contexto t+1" if es else "Context t+1","Modelo" if es else "Model",p)


def draw_ch2(draw, locale, scene, p):
    es=locale=="es"
    if scene==0:
        labels=("OBLIGATORIO" if es else "REQUIRED","RECIENTE" if es else "RECENT","RETRIEVED")
        widths=(500,430,500); x=95
        for i,(lab,w,col) in enumerate(zip(labels,widths,(GOOD,BLUE,PURPLE))):
            box=(x,485,x+w,640)
            draw.rounded_rectangle(box,radius=24,fill=PANEL,outline=col,width=5)
            material_text(draw,(x+w/2,562),lab,size=68,color=col,max_width=w-30,anchor="mm",align="center")
            x+=w+35
        material_text(draw,(960,735),"COLA / EVICT",size=68,color=WARN,anchor="ma")
        arrow(draw,(1540,650),(1540,715),WARN)
    elif scene==1:
        a="Documento\nlargo" if es else "Long\ndocument"; b="Resumen" if es else "Summary"; c="Resumen +\nprovenance" if es else "Summary +\nprovenance"
        node(draw,(330,575),a,w=430,h=180,outline=BLUE,active=True)
        arrow(draw,(555,575),(750,575),ACCENT)
        node(draw,(950,575),b,w=350,h=160,outline=ACCENT,active=p>.25)
        material_text(draw,(950,720),"src:A17",size=68,color=PURPLE,anchor="ma")
        arrow(draw,(1135,575),(1370,575),GOOD)
        node(draw,(1590,575),c,w=420,h=180,outline=GOOD,active=p>.6)
    else:
        node(draw,(250,475),"Tarea A" if es else "Task A",w=330,h=130,outline=BLUE,active=p<.5)
        node(draw,(250,680),"Tarea B" if es else "Task B",w=330,h=130,outline=PURPLE,active=p>=.5)
        draw.rounded_rectangle((650,430,1260,735),radius=24,fill=PANEL_2,outline=LINE,width=5)
        material_text(draw,(955,475),"MISMO CORPUS" if es else "SAME CORPUS",size=68,color=MUTED,anchor="ma")
        for i,(lab,col) in enumerate((("A",BLUE),("B",PURPLE),("C",ACCENT_2))):
            x=765 + (170 if ((p<.5 and lab=="A") or (p>=.5 and lab=="B")) else 0)
            y=565+i*62
            draw.rounded_rectangle((x,y-35,x+245,y+35),radius=16,fill=PANEL,outline=col,width=4)
            material_text(draw,(x+122,y),lab,size=68,color=col,anchor="mm")
        arrow(draw,(1280,575),(1440,575),GOOD)
        node(draw,(1650,575),"PRIORIDAD\nCAMBIA" if es else "PRIORITY\nCHANGES",w=340,h=180,outline=GOOD,active=True)


def draw_ch3(draw, locale, scene, p):
    es=locale=="es"
    if scene==0:
        labs=("Trabajo" if es else "Working","Episódica" if es else "Episodic","Semántica" if es else "Semantic","Estado\npersistente" if es else "Persistent\nstate")
        cols=(ACCENT,BLUE,PURPLE,ACCENT_2)
        for i,(lab,col) in enumerate(zip(labs,cols)):
            node(draw,(250+i*470,575),lab,w=390,h=200,outline=col,active=p>.15*(i+1))
    elif scene==1:
        node(draw,(260,575),"Evento" if es else "Event",w=330,h=150,outline=BLUE,active=True)
        arrow(draw,(435,575),(700,575),BLUE)
        node(draw,(900,575),"¿GUARDAR?" if es else "STORE?",w=360,h=165,outline=ACCENT_2,active=p>.2)
        arrow(draw,(1090,535),(1350,475),GOOD); arrow(draw,(1090,615),(1350,680),BAD)
        node(draw,(1580,475),"MEMORY\nSTORE",w=400,h=170,outline=GOOD,active=p>.55)
        node(draw,(1580,680),"RECHAZAR" if es else "REJECT",w=400,h=150,outline=BAD,active=p>.55)
    else:
        node(draw,(235,575),"Query",w=300,h=145,outline=BLUE,active=True)
        arrow(draw,(395,575),(620,575),BLUE)
        node(draw,(850,575),"Memoria\nrecuperada" if es else "Retrieved\nmemory",w=430,h=180,outline=PURPLE,active=p>.2)
        arrow(draw,(1075,575),(1285,575),ACCENT)
        node(draw,(1450,575),"¿FRESCA?" if es else "FRESH?",w=310,h=145,outline=ACCENT,active=p>.4)
        arrow(draw,(1610,535),(1770,475),GOOD); arrow(draw,(1610,615),(1770,690),BAD)
        material_text(draw,(1830,475),"USAR" if es else "USE",size=68,color=GOOD,anchor="ra")
        material_text(draw,(1830,710),"STALE",size=68,color=BAD,anchor="ra")


def draw_ch4(draw, locale, scene, p):
    es=locale=="es"
    if scene==0:
        x0,y0,x1,y1=270,450,1280,735
        draw.line((x0,y1,x1,y1),fill=LINE,width=6); draw.line((x0,y1,x0,y0),fill=LINE,width=6)
        material_text(draw,(x0+15,y0-10),"RELEVANCIA" if es else "RELEVANCE",size=68,color=MUTED)
        material_text(draw,(x1,y1+10),"FRESCURA →" if es else "FRESHNESS →",size=68,color=MUTED,anchor="ra")
        pts=((480,655,BLUE,"A"),(720,520,GOOD,"B"),(980,625,PURPLE,"C"),(1160,485,BAD,"!"))
        for i,(x,y,col,lab) in enumerate(pts):
            r=38; draw.ellipse((x-r,y-r,x+r,y+r),fill=col); material_text(draw,(x,y),lab,size=68,color=BG,anchor="mm")
        node(draw,(1580,575),"TOP B" if p<.6 else ("CONFLICTO" if es else "CONFLICT"),w=390,h=170,outline=GOOD if p<.6 else BAD,active=True)
    elif scene==1:
        node(draw,(300,480),"Doc A ·\nayer" if es else "Doc A ·\nyesterday",w=390,h=160,outline=BLUE,active=True)
        node(draw,(300,680),"Doc B ·\nhoy" if es else "Doc B ·\ntoday",w=390,h=160,outline=PURPLE,active=True)
        arrow(draw,(505,500),(760,550),BLUE); arrow(draw,(505,660),(760,600),PURPLE)
        node(draw,(960,575),"CONFLICTO" if es else "CONFLICT",w=370,h=165,outline=BAD,active=p>.2)
        arrow(draw,(1155,575),(1390,575),ACCENT)
        node(draw,(1600,575),("SELECCIONAR B" if es else "SELECT B") if p>.5 else ("RESOLVER" if es else "RESOLVE"),w=400,h=170,outline=GOOD,active=True)
    else:
        node(draw,(285,480),"Evidencia A" if es else "Evidence A",w=420,h=145,outline=BLUE,active=True)
        node(draw,(285,680),"Evidencia B" if es else "Evidence B",w=420,h=145,outline=PURPLE,active=True)
        arrow(draw,(505,500),(750,550),BLUE); arrow(draw,(505,660),(750,600),PURPLE)
        node(draw,(960,575),"ASSEMBLER",w=400,h=160,outline=ACCENT,active=p>.25)
        arrow(draw,(1170,575),(1390,575),GOOD)
        node(draw,(1600,535),"RESPUESTA\n+ CITAS" if es else "ANSWER\n+ CITATIONS",w=420,h=180,outline=GOOD,active=p>.55)
        material_text(draw,(1600,735),"✕ SIN SOPORTE" if es else "✕ UNSUPPORTED",size=68,color=BAD,anchor="ma")


def draw_ch5(draw, locale, scene, p):
    es=locale=="es"
    if scene==0:
        for x,lab,col,sub in ((310,"HOST",ACCENT_2,"modelo + UX" if es else "model + UX"),(960,"CLIENT",ACCENT,"sesión" if es else "session"),(1610,"SERVER",BLUE,"capacidades" if es else "capabilities")):
            node(draw,(x,560),lab,w=390,h=170,outline=col,active=p>((x-300)/2000))
            material_text(draw,(x,715),sub,size=68,color=MUTED,anchor="ma")
        arrow(draw,(515,560),(755,560),ACCENT); arrow(draw,(1165,560),(1405,560),BLUE)
    elif scene==1:
        node(draw,(260,575),"LIST",w=300,h=150,outline=ACCENT,active=True)
        for y,lab,col in ((450,"tools",BLUE),(575,"resources",PURPLE),(700,"prompts",ACCENT_2)):
            arrow(draw,(420,575),(680,y),col); node(draw,(880,y),lab,w=340,h=105,outline=col,active=p>.2)
            arrow(draw,(1060,y),(1320,y),col)
        node(draw,(1580,575),"DISCOVERY\n≠ AUTH",w=440,h=230,outline=BAD,active=p>.5)
    else:
        node(draw,(250,575),"Dato remoto" if es else "Remote data",w=400,h=160,outline=PURPLE,active=True)
        arrow(draw,(460,575),(690,575),PURPLE)
        node(draw,(880,575),"VALIDAR" if es else "VALIDATE",w=340,h=150,outline=ACCENT,active=p>.2)
        arrow(draw,(1060,575),(1260,575),ACCENT)
        node(draw,(1430,575),"POLICY",w=300,h=145,outline=GOOD,active=p>.45)
        arrow(draw,(1585,535),(1760,475),GOOD); arrow(draw,(1585,615),(1760,690),BAD)
        material_text(draw,(1830,475),"EFECTO" if es else "EFFECT",size=68,color=GOOD,anchor="ra")
        material_text(draw,(1830,710),"RECHAZAR" if es else "REJECT",size=68,color=BAD,anchor="ra")


def draw_ch6(draw, locale, scene, p):
    es=locale=="es"
    if scene==0:
        node(draw,(300,575),"Contexto\ncore" if es else "Core\ncontext",w=390,h=180,outline=ACCENT,active=True)
        for y,lab,col in ((450,"Skill",BLUE),(575,"Plugin",PURPLE),(700,"Hook",ACCENT_2)):
            node(draw,(820,y),lab,w=300,h=105,outline=col,active=p>.18)
            arrow(draw,(660,y),(505,575),col)
        arrow(draw,(505,575),(1320,575),GOOD)
        node(draw,(1590,575),"INYECCIÓN\nSELECTIVA" if es else "SELECTIVE\nINJECTION",w=430,h=190,outline=GOOD,active=p>.55)
    elif scene==1:
        node(draw,(260,575),"ORQUESTADOR" if es else "ORCHESTRATOR",w=430,h=160,outline=ACCENT_2,active=True)
        draw.line((570,410,570,750),fill=LINE,width=5)
        arrow(draw,(485,535),(750,475),BLUE); arrow(draw,(485,615),(750,675),PURPLE)
        node(draw,(930,475),"CTX A",w=330,h=140,outline=BLUE,active=p>.2)
        node(draw,(930,675),"CTX B",w=330,h=140,outline=PURPLE,active=p>.35)
        arrow(draw,(1105,475),(1350,475),BLUE); arrow(draw,(1105,675),(1350,675),PURPLE)
        node(draw,(1590,475),"EVIDENCIA A" if es else "EVIDENCE A",w=430,h=145,outline=BLUE,active=p>.55)
        node(draw,(1590,675),"EVIDENCIA B" if es else "EVIDENCE B",w=430,h=145,outline=PURPLE,active=p>.55)
    else:
        node(draw,(300,575),"BUNDLE\nEVIDENCIA" if es else "EVIDENCE\nBUNDLE",w=430,h=180,outline=BLUE,active=True)
        arrow(draw,(525,575),(760,575),BLUE)
        node(draw,(960,575),"EVALUADOR" if es else "EVALUATOR",w=390,h=160,outline=ACCENT,active=p>.2)
        arrow(draw,(1165,535),(1400,475),GOOD); arrow(draw,(1165,615),(1400,680),WARN)
        node(draw,(1620,475),"PASS →\nMERGE",w=390,h=160,outline=GOOD,active=p>.5)
        node(draw,(1620,680),"REINTENTAR" if es else "RETRY",w=390,h=150,outline=WARN,active=p>.5)


DRAWERS=(draw_ch1,draw_ch2,draw_ch3,draw_ch4,draw_ch5,draw_ch6)


def render_scene(index, chapter, locale, scene, p):
    image,draw,_=base_frame(chapter,locale,scene)
    DRAWERS[index](draw,locale,scene,smooth(p))
    return image


def encode(frame_dir: Path, output: Path):
    output.parent.mkdir(parents=True,exist_ok=True)
    cmd=["ffmpeg","-hide_banner","-loglevel","error","-y","-framerate",str(FPS),"-i",str(frame_dir/"frame-%04d.jpg"),"-c:v","libx264","-preset","veryfast","-crf","24","-pix_fmt","yuv420p","-r","24","-t",str(DURATION_SECONDS),"-movflags","+faststart","-an",str(output)]
    r=subprocess.run(cmd,capture_output=True,text=True)
    if r.returncode: raise RuntimeError(r.stderr or r.stdout)


def render_video(index, chapter, locale, output_root: Path, tmp_root: Path):
    slug=Path(chapter.filename).stem
    fd=tmp_root/f"{locale}-{slug}"; fd.mkdir(parents=True,exist_ok=True)
    poster=None
    for fi in range(TOTAL_FRAMES):
        sec=fi/FPS; scene=min(2,int(sec//SCENE_SECONDS)); local=(sec-scene*SCENE_SECONDS)/SCENE_SECONDS
        im=render_scene(index,chapter,locale,scene,local)
        if poster is None: poster=im.copy()
        im.save(fd/f"frame-{fi:04d}.jpg",format="JPEG",quality=88,optimize=True)
    poster.save(output_root/f"{slug}.jpg",format="JPEG",quality=92,optimize=True,progressive=True)
    encode(fd,output_root/f"{slug}.mp4")


def self_test() -> dict:
    projected=MIN_MATERIAL_SOURCE_PX*MOBILE_SCALE
    reserve=(H-SAFE_ZONE_START_Y)*MOBILE_SCALE
    if projected < 12: raise RuntimeError(f"material label projects to only {projected:.2f}px")
    if reserve < 50: raise RuntimeError(f"native-control reserve projects to only {reserve:.2f}px")
    # Render all scene endpoints in both locales so every node/label fit assertion executes.
    for i,ch in enumerate(CHAPTERS):
        for loc in ("es","en"):
            for scene in range(3):
                render_scene(i,ch,loc,scene,0.0)
                render_scene(i,ch,loc,scene,1.0)
    return {"material_source_px":MIN_MATERIAL_SOURCE_PX,"material_projected_css_px":round(projected,2),"safe_zone_start_y":SAFE_ZONE_START_Y,"reserved_control_css_px":round(reserve,2),"scene_endpoint_layout_checks":len(CHAPTERS)*2*3*2,"voice_generated":False}


def generate(root: Path):
    report=self_test()
    out=root/"artifacts/context-requalification/mobile-safe-video-contract.json"; out.parent.mkdir(parents=True,exist_ok=True); out.write_text(json.dumps(report,indent=2)+"\n")
    es_root=root/"docs/series"/SERIES; en_root=root/"locales/en/series"/SERIES
    with tempfile.TemporaryDirectory(prefix="context-v2-frames-") as td:
        tmp=Path(td)
        for i,ch in enumerate(CHAPTERS):
            render_video(i,ch,"es",es_root,tmp); render_video(i,ch,"en",en_root,tmp)
            v1.patch_spanish_frontmatter(es_root/ch.filename,ch)
    v1.append_english_media(root/"locales/en/media.yml",CHAPTERS)


def main() -> int:
    ap=argparse.ArgumentParser(); ap.add_argument("--root",type=Path,default=ROOT); ap.add_argument("--self-test",action="store_true"); args=ap.parse_args()
    report=self_test()
    if args.self_test:
        print(json.dumps(report,indent=2)); return 0
    generate(args.root.resolve()); print(f"Generated {len(CHAPTERS)*2} v2 overlap-safe silent native Context videos + posters"); return 0

if __name__=="__main__": raise SystemExit(main())
