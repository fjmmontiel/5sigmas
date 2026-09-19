#!/usr/bin/env python3
"""Generate narration-independent native visual videos for Realtime Voice Agents.

The output is intentionally silent. It implements the current GOLDEN contract where
visual video remains mandatory while owner-local narration/audio/captions/transcript
are a separate deferred enhancement lane.

Each chapter uses a different explanatory geometry rather than one repeated step
animation. Videos contain three honest visual key moments, each exactly 12 seconds,
which are recorded in source metadata. No narration-derived text/timings are created.
"""
from __future__ import annotations

import hashlib
import json
import math
import os
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

import yaml
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SERIES = "agentes-voz-tiempo-real"
FPS = 24
DURATION = 36.0
WIDTH, HEIGHT = 1920, 1080

BG = "#FCFBF8"
INK = "#171B1B"
MUTED = "#586362"
RULE = "#D4DAD7"
ACCENT = "#26A69A"
ACCENT_TEXT = "#00776F"
ACCENT_SURFACE = "#E7F4F0"
AMBER = "#98600C"
AMBER_SURFACE = "#FBF1DF"
WHITE = "#FFFFFF"
RED = "#A23B3B"
RED_SURFACE = "#F8E7E5"
BLUE = "#2B6F8F"
BLUE_SURFACE = "#E6F2F7"


def _font_path(candidates: list[str]) -> str:
    for path in candidates:
        if Path(path).is_file():
            return path
    raise RuntimeError(f"Required font unavailable: {candidates}")


SANS = _font_path([
    "/usr/share/fonts/truetype/inter/Inter-Regular.ttf",
    "/usr/share/fonts/truetype/inter/InterVariable.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
])
SANS_BOLD = _font_path([
    "/usr/share/fonts/truetype/inter/Inter-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
])
SERIF = _font_path([
    "/usr/share/fonts/truetype/noto/NotoSerifDisplay-Regular.ttf",
    "/usr/share/fonts/truetype/noto/NotoSerif-Regular.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
])
SERIF_BOLD = _font_path([
    "/usr/share/fonts/truetype/noto/NotoSerifDisplay-Bold.ttf",
    "/usr/share/fonts/truetype/noto/NotoSerif-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
])


def font(size: int, *, bold: bool = False, serif: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(
        SERIF_BOLD if serif and bold else SERIF if serif else SANS_BOLD if bold else SANS,
        size,
    )


def ease(x: float) -> float:
    x = max(0.0, min(1.0, x))
    return 1 - (1 - x) ** 3


def pulse(x: float) -> float:
    return 0.5 + 0.5 * math.sin(x * math.tau)


def wrap(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.FreeTypeFont, width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = word if not current else current + " " + word
        if draw.textbbox((0, 0), candidate, font=fnt)[2] <= width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def text_block(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, fnt: ImageFont.FreeTypeFont,
               width: int, fill: str = INK, gap: int = 10, max_lines: int | None = None) -> int:
    x, y = xy
    lines = wrap(draw, text, fnt, width)
    if max_lines is not None:
        lines = lines[:max_lines]
    line_h = int(fnt.size * 1.23)
    for line in lines:
        draw.text((x, y), line, font=fnt, fill=fill)
        y += line_h + gap
    return y


def rrect(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], fill: str, outline: str = RULE,
          radius: int = 26, width: int = 2) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def arrow(draw: ImageDraw.ImageDraw, a: tuple[float, float], b: tuple[float, float], color: str = ACCENT_TEXT,
          width: int = 6, head: int = 18) -> None:
    ax, ay = a; bx, by = b
    draw.line((ax, ay, bx, by), fill=color, width=width)
    ang = math.atan2(by - ay, bx - ax)
    p1 = (bx - head * math.cos(ang - 0.55), by - head * math.sin(ang - 0.55))
    p2 = (bx - head * math.cos(ang + 0.55), by - head * math.sin(ang + 0.55))
    draw.polygon([(bx, by), p1, p2], fill=color)


def label(draw: ImageDraw.ImageDraw, center: tuple[int, int], text: str, *, fill: str = WHITE,
          outline: str = RULE, color: str = INK, w: int = 230, h: int = 76, fs: int = 31) -> None:
    cx, cy = center
    box = (cx - w // 2, cy - h // 2, cx + w // 2, cy + h // 2)
    rrect(draw, box, fill, outline, 22, 2)
    f = font(fs, bold=True)
    lines = wrap(draw, text, f, w - 30)[:2]
    total = len(lines) * int(fs * 1.08)
    y = cy - total // 2
    for line in lines:
        bb = draw.textbbox((0, 0), line, font=f)
        draw.text((cx - (bb[2] - bb[0]) / 2, y), line, font=f, fill=color)
        y += int(fs * 1.08)


def base_frame(chapter: str, title: str, scene_title: str, explanation: str, phase: int) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    im = Image.new("RGB", (WIDTH, HEIGHT), BG)
    d = ImageDraw.Draw(im)
    d.text((92, 60), "5SIGMAS · REALTIME VOICE AGENTS", font=font(24, bold=True), fill=ACCENT_TEXT)
    d.line((92, 104, WIDTH - 92, 104), fill=RULE, width=2)
    d.text((92, 152), chapter, font=font(27, bold=True), fill=MUTED)
    y = text_block(d, (92, 208), title, font(62, bold=True, serif=True), 650, INK, gap=2, max_lines=3)
    y += 32
    d.text((92, y), scene_title, font=font(35, bold=True), fill=ACCENT_TEXT)
    y += 58
    text_block(d, (92, y), explanation, font(36), 630, MUTED, gap=4, max_lines=5)
    # three semantic chapters, not an animated counter
    x0 = 92
    for i in range(3):
        x = x0 + i * 172
        d.rounded_rectangle((x, 936, x + 150, 946), radius=5, fill=ACCENT if i == phase else RULE)
    d.text((92, 975), "Visual explanation · silent by design", font=font(24), fill=MUTED)
    d.line((770, 152, 770, 970), fill=RULE, width=2)
    return im, d


def scene_phase(t: float) -> tuple[int, float]:
    phase = min(2, int(t // 12))
    local = (t - phase * 12) / 12
    return phase, local


def architecture(d: ImageDraw.ImageDraw, local: float, phase: int, lang: str) -> None:
    x0, y0 = 830, 230
    if phase == 0:
        names = ["Audio", "STT", "Text", "LLM", "Text", "TTS", "Audio"] if lang == "en" else ["Audio", "STT", "Texto", "LLM", "Texto", "TTS", "Audio"]
        xs = [880, 1030, 1170, 1320, 1470, 1620, 1760]
        n = min(len(xs) - 1, int(ease(local) * (len(xs) - 1) + 0.001))
        for i, (x, name) in enumerate(zip(xs, names)):
            active = i <= n
            label(d, (x, 505), name, fill=ACCENT_SURFACE if active else WHITE, outline=ACCENT if active else RULE, w=128, h=74, fs=27)
            if i < len(xs) - 1:
                arrow(d, (x + 67, 505), (xs[i+1] - 67, 505), ACCENT_TEXT if i < n else RULE, 5)
        for x in (1110, 1400):
            d.line((x, 365, x, 650), fill=AMBER, width=4)
            d.text((x - 58, 320), "TEXT" if lang == "en" else "TEXTO", font=font(24, bold=True), fill=AMBER)
        d.text((880, 700), "Observable boundaries make latency and policy attributable." if lang == "en" else "Las fronteras observables hacen atribuibles latencia y política.", font=font(31), fill=MUTED)
    elif phase == 1:
        # modality fan-out rather than same line
        center = (1300, 525)
        label(d, center, "AUDIO IN" if lang == "en" else "AUDIO ENTRA", fill=BLUE_SURFACE, outline=BLUE, w=250)
        targets = [((980, 300), "Full cascade"), ((1640, 300), "Audio-native + TTS"), ((1300, 790), "Speech-to-speech")]
        for idx, (pos, name) in enumerate(targets):
            grow = ease(max(0, local * 1.4 - idx * 0.12))
            px = center[0] + (pos[0] - center[0]) * grow
            py = center[1] + (pos[1] - center[1]) * grow
            if grow > .05:
                arrow(d, center, (px, py), ACCENT_TEXT, 5)
                label(d, pos, name, fill=WHITE, outline=ACCENT, w=310, h=92, fs=30)
        d.text((930, 900), "Text boundary ≠ turn-taking behavior" if lang == "en" else "Frontera de texto ≠ comportamiento de turnos", font=font(35, bold=True), fill=AMBER)
    else:
        # overlapping bidirectional streams
        d.text((930, 245), "DUPLEX IS AN INDEPENDENT AXIS" if lang == "en" else "DUPLEX ES UN EJE INDEPENDIENTE", font=font(34, bold=True), fill=INK)
        d.line((930, 520, 1750, 520), fill=RULE, width=3)
        u = ease(local)
        for row, (name, color, direction) in enumerate([
            (("USER AUDIO" if lang == "en" else "AUDIO USUARIO"), BLUE, 1),
            (("AGENT AUDIO" if lang == "en" else "AUDIO AGENTE"), ACCENT_TEXT, -1),
        ]):
            y = 430 + row * 190
            d.text((930, y - 70), name, font=font(28, bold=True), fill=color)
            start, end = (960, 1710) if direction == 1 else (1710, 960)
            x = start + (end - start) * u
            d.line((960, y, 1710, y), fill=RULE, width=8)
            d.ellipse((x-20, y-20, x+20, y+20), fill=color)
        d.rounded_rectangle((1230, 360, 1480, 780), radius=48, outline=AMBER, width=5)
        d.text((1263, 790), "OVERLAP" if lang == "en" else "SOLAPE", font=font(30, bold=True), fill=AMBER)


def turn_taking(d: ImageDraw.ImageDraw, local: float, phase: int, lang: str) -> None:
    if phase == 0:
        # waveform + semantic endpoint confidence
        d.text((880, 245), "SPEECH IS A SIGNAL, A TURN IS A DECISION" if lang == "en" else "EL HABLA ES SEÑAL; EL TURNO ES DECISIÓN", font=font(32, bold=True), fill=INK)
        baseline = 600
        pts=[]
        for x in range(880, 1780, 8):
            q=(x-880)/900
            amp=85*(0.25+0.75*math.sin(q*math.pi)**2)
            y=baseline + math.sin(q*72 + local*8)*amp*(0.7+0.3*math.sin(q*19)**2)
            pts.append((x,y))
        d.line(pts, fill=BLUE, width=5)
        marker=880+int(900*ease(local))
        d.line((marker,390,marker,780), fill=ACCENT_TEXT, width=4)
        d.text((900, 780), "VAD detects activity" if lang == "en" else "VAD detecta actividad", font=font(30), fill=MUTED)
        d.text((1380, 780), "Endpoint commits a turn" if lang == "en" else "Endpoint confirma turno", font=font(30), fill=ACCENT_TEXT)
    elif phase == 1:
        states=[("LISTEN" if lang=="en" else "ESCUCHA", BLUE_SURFACE, BLUE), ("HOLD" if lang=="en" else "ESPERA", AMBER_SURFACE, AMBER), ("COMMIT" if lang=="en" else "CONFIRMA", ACCENT_SURFACE, ACCENT_TEXT)]
        cx,cy=1320,540
        radius=260
        for i,(name,fill,c) in enumerate(states):
            ang=-math.pi/2+i*2*math.pi/3
            pos=(cx+int(math.cos(ang)*radius),cy+int(math.sin(ang)*radius))
            label(d,pos,name,fill=fill,outline=c,w=260,h=96,fs=31)
        for i in range(3):
            a=-math.pi/2+i*2*math.pi/3
            b=-math.pi/2+((i+1)%3)*2*math.pi/3
            p1=(cx+math.cos(a)*190,cy+math.sin(a)*190); p2=(cx+math.cos(b)*190,cy+math.sin(b)*190)
            arrow(d,p1,p2,RULE,4)
        ang=-math.pi/2+(local*math.tau)
        d.ellipse((cx+math.cos(ang)*120-18,cy+math.sin(ang)*120-18,cx+math.cos(ang)*120+18,cy+math.sin(ang)*120+18),fill=ACCENT)
        d.text((985,865), "Silence alone does not define intent." if lang=="en" else "El silencio por sí solo no define intención.", font=font(36,bold=True), fill=INK)
    else:
        # interruption fork: audio vs business action
        d.text((900,250),"INTERRUPTION SPLITS TWO CANCELLATION DOMAINS" if lang=="en" else "UNA INTERRUPCIÓN SEPARA DOS DOMINIOS",font=font(31,bold=True),fill=INK)
        label(d,(1120,510),"USER BARGE-IN" if lang=="en" else "USUARIO INTERRUMPE",fill=AMBER_SURFACE,outline=AMBER,w=330,h=100,fs=31)
        arrow(d,(1285,470),(1510,360),RED,6); arrow(d,(1285,550),(1510,700),ACCENT_TEXT,6)
        label(d,(1635,340),"STOP PLAYBACK" if lang=="en" else "PARAR AUDIO",fill=RED_SURFACE,outline=RED,w=300,h=100,fs=30)
        label(d,(1635,720),"TOOL MAY CONTINUE" if lang=="en" else "TOOL PUEDE SEGUIR",fill=ACCENT_SURFACE,outline=ACCENT,w=320,h=100,fs=30)
        if local>.45:
            d.rounded_rectangle((1450,835,1810,920),radius=22,fill=WHITE,outline=AMBER,width=3)
            d.text((1480,858),"cancel ≠ rollback" if lang=="en" else "cancelar ≠ revertir",font=font(31,bold=True),fill=AMBER)


def latency(d: ImageDraw.ImageDraw, local: float, phase: int, lang: str) -> None:
    if phase == 0:
        d.text((900,245),"CRITICAL PATH, NOT A SUM OF HEADLINES" if lang=="en" else "CAMINO CRÍTICO, NO SUMA DE TITULARES",font=font(31,bold=True),fill=INK)
        stages=[("Endpoint",0.00,0.20,AMBER),("Residual STT",0.12,0.37,BLUE),("First speakable output",0.30,0.62,ACCENT_TEXT),("TTS first chunk",0.53,0.78,ACCENT),("Transport / playout",0.73,1.0,MUTED)]
        for i,(name,a,b,c) in enumerate(stages):
            y=350+i*115
            d.text((880,y),name,font=font(28,bold=True),fill=INK)
            x1=1200+int(a*550); x2=1200+int(b*550*ease(local)+a*550*(1-ease(local)))
            d.rounded_rectangle((x1,y+4,max(x1+6,x2),y+52),radius=18,fill=c)
        d.line((1200,325,1200,925),fill=RULE,width=3);d.line((1750,325,1750,925),fill=RULE,width=3)
        d.text((1160,945),"speech stop",font=font(24),fill=MUTED);d.text((1660,945),"first audio",font=font(24),fill=MUTED)
    elif phase == 1:
        # same-turn timestamp lattice
        events=[("speech.stop",(930,350)),("turn.commit",(1180,470)),("model.first_text",(1430,350)),("tts.first_audio",(1680,470))]
        for idx,(name,pos) in enumerate(events):
            if local > idx*.12:
                label(d,pos,name,fill=WHITE,outline=ACCENT,w=260,h=88,fs=26)
                if idx:
                    arrow(d,(events[idx-1][1][0]+130,events[idx-1][1][1]),(pos[0]-130,pos[1]),ACCENT_TEXT,4)
        d.text((950,700),"One turn · one clock · reconstruct overlap" if lang=="en" else "Un turno · un reloj · reconstruye el solape",font=font(39,bold=True),fill=INK)
        d.text((950,770),"Provider p50 values from different harnesses are not additive." if lang=="en" else "Los p50 de proveedores con harness distintos no se suman.",font=font(31),fill=MUTED)
    else:
        # optimization shifts bottleneck
        d.text((920,250),"OPTIMIZE THE DOMINANT BLOCKER" if lang=="en" else "OPTIMIZA EL BLOQUEO DOMINANTE",font=font(34,bold=True),fill=INK)
        vals=[.78,.52,.34,.60]
        names=["Endpoint","Model","TTS","Network"] if lang=="en" else ["Endpoint","Modelo","TTS","Red"]
        for i,(v,name) in enumerate(zip(vals,names)):
            x=970+i*205;h=int(430*v*(.45+.55*ease(local)))
            d.rounded_rectangle((x,800-h,x+130,800),radius=22,fill=AMBER if v==max(vals) else ACCENT_SURFACE,outline=AMBER if v==max(vals) else ACCENT,width=3)
            d.text((x,830),name,font=font(27,bold=True),fill=INK)
        d.text((965,900),"Reduce what lies on the measured path." if lang=="en" else "Reduce lo que está en el camino medido.",font=font(33),fill=MUTED)


def tools_state(d: ImageDraw.ImageDraw, local: float, phase: int, lang: str) -> None:
    if phase == 0:
        d.text((900,245),"A TOOL CALL OUTLIVES THE SPOKEN TURN" if lang=="en" else "UNA TOOL PUEDE SOBREVIVIR AL TURNO HABLADO",font=font(31,bold=True),fill=INK)
        lanes=["Conversation" if lang=="en" else "Conversación","Tool","Business state" if lang=="en" else "Estado negocio"]
        ys=[390,590,790]
        for name,y in zip(lanes,ys):
            d.text((880,y-48),name,font=font(28,bold=True),fill=MUTED);d.line((880,y,1780,y),fill=RULE,width=4)
        u=ease(local)
        d.ellipse((900+700*u-16,374,900+700*u+16,406),fill=ACCENT)
        if local>.25:
            arrow(d,(1120,390),(1250,590),ACCENT_TEXT,5);label(d,(1390,590),"tool_call_id=42",fill=ACCENT_SURFACE,outline=ACCENT,w=300,h=86,fs=28)
        if local>.60:
            arrow(d,(1530,590),(1640,790),AMBER,5);d.text((1450,835),"side effect",font=font(27,bold=True),fill=AMBER)
    elif phase == 1:
        label(d,(1060,430),"BARGE-IN" if lang=="en" else "INTERRUPCIÓN",fill=RED_SURFACE,outline=RED,w=270,h=94,fs=31)
        label(d,(1570,430),"AUDIO STOPPED" if lang=="en" else "AUDIO PARADO",fill=RED_SURFACE,outline=RED,w=300,h=94,fs=30)
        arrow(d,(1195,430),(1420,430),RED,6)
        label(d,(1060,740),"TOOL #42",fill=ACCENT_SURFACE,outline=ACCENT,w=270,h=94,fs=31)
        label(d,(1570,740),"RESULT ARRIVES" if lang=="en" else "LLEGA RESULTADO",fill=ACCENT_SURFACE,outline=ACCENT,w=310,h=94,fs=30)
        arrow(d,(1195,740),(1415,740),ACCENT_TEXT,6)
        d.text((970,885),"Playback cancellation does not imply business rollback." if lang=="en" else "Cancelar playback no implica revertir negocio.",font=font(34,bold=True),fill=INK)
    else:
        d.text((900,245),"RECONCILE BY IDENTITY + STATE" if lang=="en" else "RECONCILIA POR IDENTIDAD + ESTADO",font=font(34,bold=True),fill=INK)
        labels=[("request_id",BLUE_SURFACE,BLUE),("tool_call_id",ACCENT_SURFACE,ACCENT_TEXT),("idempotency_key",AMBER_SURFACE,AMBER),("state_version",WHITE,MUTED)]
        for i,(name,fill,c) in enumerate(labels):
            x=940+(i%2)*390;y=420+(i//2)*230
            label(d,(x,y),name,fill=fill,outline=c,w=320,h=110,fs=31)
        arrow(d,(1260,535),(1390,535),ACCENT_TEXT,6)
        d.text((1030,820),"accept · ignore stale · compensate" if lang=="en" else "aceptar · ignorar stale · compensar",font=font(37,bold=True),fill=INK)


def network(d: ImageDraw.ImageDraw, local: float, phase: int, lang: str) -> None:
    if phase == 0:
        nodes=[((930,470),"Browser" if lang=="en" else "Navegador",BLUE_SURFACE,BLUE),((1280,330),"WebRTC edge",ACCENT_SURFACE,ACCENT),((1640,470),"Realtime model" if lang=="en" else "Modelo realtime",WHITE,MUTED),((1280,760),"SIP / PSTN",AMBER_SURFACE,AMBER)]
        for pos,name,fill,c in nodes: label(d,pos,name,fill=fill,outline=c,w=270,h=92,fs=29)
        links=[(0,1),(1,2),(1,3),(3,0)]
        for idx,(a,b) in enumerate(links):
            if local>idx*.12: arrow(d,nodes[a][0],nodes[b][0],ACCENT_TEXT if idx<2 else AMBER,5)
        d.text((915,900),"Transport choice changes where media state lives." if lang=="en" else "El transporte cambia dónde vive el estado de media.",font=font(34,bold=True),fill=INK)
    elif phase == 1:
        d.text((900,245),"JITTER IS VARIANCE IN ARRIVAL TIME" if lang=="en" else "JITTER ES VARIACIÓN EN TIEMPO DE LLEGADA",font=font(32,bold=True),fill=INK)
        xs=[]
        for i in range(11):
            base=930+i*75
            jitter=int(math.sin(i*2.1+local*5)*28)
            xs.append(base+jitter)
            d.rounded_rectangle((base+jitter,470,base+jitter+44,560),radius=10,fill=ACCENT if i%3 else BLUE)
        d.line((900,650,1770,650),fill=RULE,width=4)
        buffer_x=1450
        d.rounded_rectangle((buffer_x,620,1740,710),radius=20,fill=AMBER_SURFACE,outline=AMBER,width=3)
        d.text((1510,645),"jitter buffer",font=font(28,bold=True),fill=AMBER)
        d.text((930,780),"More buffering smooths arrival — and adds playout delay." if lang=="en" else "Más buffer suaviza llegadas — y añade retraso de reproducción.",font=font(32),fill=MUTED)
    else:
        d.text((900,245),"TRANSCODING IS A BOUNDARY, NOT FREE CONVERSION" if lang=="en" else "TRANSCODIFICAR ES UNA FRONTERA, NO ES GRATIS",font=font(29,bold=True),fill=INK)
        label(d,(1030,500),"Opus / WebRTC",fill=BLUE_SURFACE,outline=BLUE,w=300,h=100,fs=31)
        label(d,(1330,500),"Transcode",fill=AMBER_SURFACE,outline=AMBER,w=260,h=100,fs=31)
        label(d,(1660,500),"G.711 / SIP",fill=ACCENT_SURFACE,outline=ACCENT,w=280,h=100,fs=31)
        arrow(d,(1180,500),(1200,500),AMBER,5);arrow(d,(1460,500),(1520,500),AMBER,5)
        d.text((985,710),"Codec · packetization · loss · buffer · carrier path" if lang=="en" else "Codec · paquetización · pérdida · buffer · carrier",font=font(33,bold=True),fill=INK)
        d.text((1040,800),"Measure the whole path the user actually hears." if lang=="en" else "Mide el camino completo que realmente oye el usuario.",font=font(34),fill=MUTED)


def evaluation(d: ImageDraw.ImageDraw, local: float, phase: int, lang: str) -> None:
    if phase == 0:
        d.text((900,245),"ONE TURN, MANY CORRELATED SPANS" if lang=="en" else "UN TURNO, MUCHOS SPANS CORRELACIONADOS",font=font(32,bold=True),fill=INK)
        root=(970,420);label(d,root,"turn_id=7",fill=ACCENT_SURFACE,outline=ACCENT,w=250,h=90,fs=31)
        children=[((1300,340),"endpoint"),((1300,500),"model"),((1300,660),"tool"),((1640,500),"playout")]
        for idx,(pos,name) in enumerate(children):
            if local>idx*.12:
                arrow(d,(1095,420),pos,ACCENT_TEXT if name!="tool" else AMBER,4)
                label(d,pos,name,fill=WHITE,outline=RULE,w=230,h=82,fs=29)
        d.text((980,830),"Trace context joins latency, state, tool and playback evidence." if lang=="en" else "El trace une latencia, estado, tool y evidencia de playback.",font=font(31),fill=MUTED)
    elif phase == 1:
        cats=[("Timing" if lang=="en" else "Tiempo",BLUE), ("Turn",ACCENT_TEXT), ("Tool",AMBER), ("Media",MUTED), ("Policy" if lang=="en" else "Política",RED)]
        cx,cy=1330,560
        for i,(name,c) in enumerate(cats):
            ang=-math.pi/2+i*math.tau/len(cats)
            r=260+25*math.sin(local*math.tau+i)
            pos=(cx+int(math.cos(ang)*r),cy+int(math.sin(ang)*r))
            label(d,pos,name,fill=WHITE,outline=c,w=210,h=82,fs=28)
            d.line((cx,cy,pos[0],pos[1]),fill=RULE,width=3)
        d.ellipse((cx-68,cy-68,cx+68,cy+68),fill=ACCENT_SURFACE,outline=ACCENT,width=4)
        d.text((cx-42,cy-16),"FAIL",font=font(30,bold=True),fill=ACCENT_TEXT)
    else:
        # production -> eval -> repair feedback loop
        pts=[((980,440),"PROD"),((1450,330),"EVAL"),((1680,700),"REPAIR"),((1110,790),"GATE")]
        for pos,name in pts: label(d,pos,name,fill=WHITE,outline=ACCENT,w=220,h=90,fs=30)
        for i in range(len(pts)):
            a=pts[i][0];b=pts[(i+1)%len(pts)][0];arrow(d,a,b,ACCENT_TEXT,5)
        ang=local*math.tau
        x=1330+int(math.cos(ang)*290);y=560+int(math.sin(ang)*210)
        d.ellipse((x-16,y-16,x+16,y+16),fill=AMBER)
        d.text((960,925),"Observed failures become versioned eval cases and regression gates." if lang=="en" else "Los fallos observados se convierten en evals versionadas y gates.",font=font(31,bold=True),fill=INK)


@dataclass(frozen=True)
class Chapter:
    stem: str
    title_es: str
    title_en: str
    summary_es: str
    summary_en: str
    scenes_es: tuple[tuple[str, str], tuple[str, str], tuple[str, str]]
    scenes_en: tuple[tuple[str, str], tuple[str, str], tuple[str, str]]
    draw: Callable[[ImageDraw.ImageDraw, float, int, str], None]


CHAPTERS = [
    Chapter("01-arquitecturas-de-voz", "Arquitecturas de voz", "Voice architectures",
            "Dónde aparece el texto y por qué full-duplex es un eje distinto.", "Where text appears and why full-duplex is a separate axis.",
            (("Fronteras observables", "El cascade hace explícitas STT, texto, modelo y TTS."),("Modalidad", "Audio-native + TTS y S2S cambian dónde cruza el texto."),("Interacción", "Full-duplex describe solape de entrada y salida, no modalidad.")),
            (("Observable boundaries", "Cascade exposes STT, text, model and TTS as separate contracts."),("Modality", "Audio-native + TTS and S2S move the mandatory text boundary."),("Interaction", "Full-duplex describes overlapping input/output, not modality.")), architecture),
    Chapter("02-turn-taking", "Turn-taking e interrupciones", "Turn-taking and interruptions",
            "VAD detecta actividad; endpointing decide turnos; barge-in no revierte negocio.", "VAD detects activity; endpointing decides turns; barge-in does not roll back business state.",
            (("Señal vs decisión", "VAD observa voz, pero no decide por sí solo que el usuario terminó."),("Estado del turno", "El runtime combina evidencia para esperar, confirmar o continuar escuchando."),("Dos cancelaciones", "Parar audio y cancelar una acción asíncrona son decisiones diferentes.")),
            (("Signal vs decision", "VAD observes speech but does not by itself decide that the user is done."),("Turn state", "The runtime combines evidence to wait, commit, or keep listening."),("Two cancellation domains", "Stopping audio and cancelling an asynchronous action are different decisions.")), turn_taking),
    Chapter("03-presupuesto-latencia", "Presupuesto de latencia", "Latency budget",
            "Mide el camino crítico del mismo turno y separa trabajo solapado de bloqueos.", "Measure the same-turn critical path and separate overlap from true blockers.",
            (("Camino crítico", "Endpoint, STT residual, salida hablable, TTS y playout pueden solaparse."),("Un reloj", "Los timestamps del mismo turno permiten reconstruir causalidad y solape."),("Optimización", "Reduce el componente dominante del camino medido, no cifras aisladas.")),
            (("Critical path", "Endpointing, residual STT, speakable output, TTS and playout can overlap."),("One clock", "Same-turn timestamps let you reconstruct causality and overlap."),("Optimization", "Reduce the dominant component on the measured path, not isolated headline numbers.")), latency),
    Chapter("04-tools-estado-acciones-asincronas", "Tools, estado y acciones asíncronas", "Tools, state and asynchronous actions",
            "La conversación puede cambiar antes de que una acción termine; identidad y estado evitan aplicar resultados stale.", "Conversation can move on before an action finishes; identity and state prevent stale results from being applied.",
            (("Lifecycles distintos", "Una tool call puede continuar después de que el turno hablado cambie."),("Interrupción", "Cancelar playback no implica cancelar ni revertir una operación de negocio."),("Reconciliación", "IDs, idempotencia y versión de estado permiten aceptar, ignorar o compensar.")),
            (("Different lifecycles", "A tool call can continue after the spoken turn has moved on."),("Interruption", "Cancelling playback does not imply cancelling or rolling back a business operation."),("Reconciliation", "IDs, idempotency and state version let the runtime accept, ignore or compensate.")), tools_state),
    Chapter("05-webrtc-sip-telefonia-red", "WebRTC, SIP y red", "WebRTC, SIP and network",
            "El transporte decide dónde viven media, jitter, codecs y fronteras de telefonía.", "Transport determines where media, jitter, codecs and telephony boundaries live.",
            (("Topología", "WebRTC, provider edge, SIP y PSTN crean caminos de media distintos."),("Jitter", "El buffer suaviza variación de llegada a cambio de retraso de reproducción."),("Transcodificación", "Cambiar codec puede añadir latencia, pérdida y otra frontera operativa.")),
            (("Topology", "WebRTC, provider edge, SIP and PSTN create different media paths."),("Jitter", "A buffer smooths arrival variance at the cost of playout delay."),("Transcoding", "Changing codec can add latency, loss and another operational boundary.")), network),
    Chapter("06-evaluacion-observabilidad-reliability", "Evaluación, observabilidad y reliability", "Evaluation, observability and reliability",
            "La unidad útil es el turno trazable: evidencia correlacionada, taxonomía y bucle producción→eval→reparación.", "The useful unit is a traceable turn: correlated evidence, taxonomy, and a production→eval→repair loop.",
            (("Traza por turno", "Un turn_id une endpointing, modelo, tools y audio realmente reproducido."),("Taxonomía", "Clasificar por mecanismo evita mezclar síntomas de latencia, turnos, tools o política."),("Bucle de reparación", "Los fallos de producción se convierten en evals versionadas y gates de regresión.")),
            (("Turn trace", "A turn_id joins endpointing, model, tools and audio actually played."),("Taxonomy", "Mechanism-based classes avoid mixing timing, turn, tool, media or policy symptoms."),("Repair loop", "Production failures become versioned eval cases and regression gates.")), evaluation),
]


def render_frame(ch: Chapter, lang: str, t: float) -> Image.Image:
    phase, local = scene_phase(t)
    scenes = ch.scenes_en if lang == "en" else ch.scenes_es
    title = ch.title_en if lang == "en" else ch.title_es
    chapter = "Realtime voice engineering" if lang == "en" else "Ingeniería de voz en tiempo real"
    scene_title, explanation = scenes[phase]
    im, d = base_frame(chapter, title, scene_title, explanation, phase)
    ch.draw(d, local, phase, lang)
    return im


def encode_video(ch: Chapter, lang: str, out_dir: Path) -> tuple[Path, Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    video = out_dir / f"{ch.stem}.mp4"
    poster = out_dir / f"{ch.stem}.jpg"
    cmd = [
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{WIDTH}x{HEIGHT}",
        "-r", str(FPS), "-i", "pipe:0", "-an", "-c:v", "libx264",
        "-preset", "veryfast", "-crf", "21", "-pix_fmt", "yuv420p",
        "-movflags", "+faststart", "-threads", "4", str(video),
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    try:
        assert proc.stdin is not None
        frames = int(DURATION * FPS)
        for i in range(frames):
            proc.stdin.write(render_frame(ch, lang, i / FPS).tobytes())
        proc.stdin.close()
        rc = proc.wait(timeout=240)
        if rc:
            raise RuntimeError(f"ffmpeg failed for {lang}:{ch.stem} rc={rc}")
    except BaseException:
        proc.kill(); proc.wait(); video.unlink(missing_ok=True); raise
    render_frame(ch, lang, 27.0).save(poster, "JPEG", quality=92, optimize=True)
    return video, poster


def media_block(ch: Chapter, lang: str) -> dict:
    scenes = ch.scenes_en if lang == "en" else ch.scenes_es
    return {
        "video": f"{ch.stem}.mp4",
        "video_poster": f"{ch.stem}.jpg",
        "video_title": ch.title_en if lang == "en" else ch.title_es,
        "video_summary": ch.summary_en if lang == "en" else ch.summary_es,
        "video_duration": "PT36S",
        "video_chapters": [
            {"name": scenes[0][0], "start": 0, "end": 12},
            {"name": scenes[1][0], "start": 12, "end": 24},
            {"name": scenes[2][0], "start": 24, "end": 36},
        ],
    }


def inject_es_frontmatter(path: Path, block: dict) -> None:
    text = path.read_text(encoding="utf-8")
    match = re.match(r"\A---\n(.*?)\n---\n", text, re.S)
    if not match:
        raise RuntimeError(f"frontmatter missing: {path}")
    existing = yaml.safe_load(match.group(1)) or {}
    if existing.get("video"):
        if existing.get("video") != block["video"]:
            raise RuntimeError(f"unexpected existing video mapping in {path}")
        return
    addition = yaml.safe_dump(block, allow_unicode=True, sort_keys=False).rstrip()
    new_front = match.group(1).rstrip() + "\n" + addition
    path.write_text("---\n" + new_front + "\n---\n" + text[match.end():], encoding="utf-8")


def update_en_media(path: Path) -> None:
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    if not isinstance(data, dict):
        raise RuntimeError("locales/en/media.yml must be a mapping")
    changed = False
    for ch in CHAPTERS:
        key = f"series/{SERIES}/{ch.stem}.md"
        block = media_block(ch, "en")
        existing = data.get(key)
        if existing is None:
            data[key] = block; changed = True
        elif existing != block:
            raise RuntimeError(f"unexpected existing EN media mapping for {key}")
    if changed:
        path.write_text(yaml.safe_dump(data, allow_unicode=True, sort_keys=False, width=120), encoding="utf-8")


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def probe(path: Path) -> dict:
    return json.loads(subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries",
        "format=duration,format_name:stream=codec_type,codec_name,width,height,pix_fmt",
        "-of", "json", str(path)
    ], text=True))


def main() -> int:
    if not shutil_which("ffmpeg") or not shutil_which("ffprobe"):
        raise RuntimeError("ffmpeg/ffprobe required")
    es_dir = ROOT / "docs" / "series" / SERIES
    en_dir = ROOT / "locales" / "en" / "series" / SERIES
    receipt: dict = {
        "schema_version": 1,
        "series": SERIES,
        "generated_for_contract": "MEDIA_VISUAL_PASS; VOICE_ENHANCEMENT remains DEFERRED_OWNER_LOCAL",
        "narration": "none; intentionally silent",
        "captions_transcript": "not generated; narration-dependent lane deferred",
        "duration_seconds": DURATION,
        "fps": FPS,
        "chapters": [],
    }
    for ch in CHAPTERS:
        for lang, out_dir in (("es", es_dir), ("en", en_dir)):
            video, poster = encode_video(ch, lang, out_dir)
            p = probe(video)
            streams = p.get("streams") or []
            video_streams = [x for x in streams if x.get("codec_type") == "video"]
            audio_streams = [x for x in streams if x.get("codec_type") == "audio"]
            if len(video_streams) != 1 or audio_streams:
                raise RuntimeError(f"unexpected stream contract for {video}")
            vs = video_streams[0]
            if (vs.get("codec_name"), vs.get("width"), vs.get("height"), vs.get("pix_fmt")) != ("h264", 1920, 1080, "yuv420p"):
                raise RuntimeError(f"invalid visual stream for {video}: {vs}")
            receipt["chapters"].append({
                "locale": lang,
                "stem": ch.stem,
                "visual_family": ch.draw.__name__,
                "video": video.relative_to(ROOT).as_posix(),
                "video_sha256": sha256(video),
                "video_bytes": video.stat().st_size,
                "poster": poster.relative_to(ROOT).as_posix(),
                "poster_sha256": sha256(poster),
                "probe_duration": float((p.get("format") or {}).get("duration") or 0),
                "key_moments": media_block(ch, lang)["video_chapters"],
            })
        inject_es_frontmatter(es_dir / f"{ch.stem}.md", media_block(ch, "es"))
    update_en_media(ROOT / "locales" / "en" / "media.yml")
    receipt_path = ROOT / "quality" / "series-requalification" / "voice-media-generation-2026-09-19.json"
    receipt_path.parent.mkdir(parents=True, exist_ok=True)
    receipt_path.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"generated": len(receipt["chapters"]), "receipt": str(receipt_path.relative_to(ROOT))}, ensure_ascii=False))
    return 0


def shutil_which(name: str) -> str | None:
    for directory in os.environ.get("PATH", "").split(os.pathsep):
        candidate = Path(directory) / name
        if candidate.is_file() and os.access(candidate, os.X_OK):
            return str(candidate)
    return None


if __name__ == "__main__":
    raise SystemExit(main())
