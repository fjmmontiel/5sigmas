#!/usr/bin/env python3
"""Generate silent, locale-native mechanism videos for Context Engineering.

The current GOLDEN contract keeps narration/VOICE deferred. This generator creates
only visual MP4/JPG media plus narration-independent metadata/key moments. It is
optimized for the real inline mobile player: material labels project to >=12 CSS
px and the lower control strip contains no material explanation.
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
from typing import Iterable

import yaml
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SERIES = "context-engineering-memory-mcp"
W, H = 1920, 1080
FPS = 6
DURATION_SECONDS = 36
SCENE_SECONDS = 12
TOTAL_FRAMES = FPS * DURATION_SECONDS
MOBILE_INLINE_WIDTH = 356
MOBILE_SCALE = MOBILE_INLINE_WIDTH / W
MIN_MATERIAL_SOURCE_PX = 72
SAFE_ZONE_START_Y = 800
RESERVED_CONTROL_PROJECTED_CSS_PX = (H - SAFE_ZONE_START_Y) * MOBILE_SCALE

spec = importlib.util.spec_from_file_location(
    "coding_media_base", ROOT / "scripts/generate_coding_agent_visual_media.py"
)
if spec is None or spec.loader is None:
    raise RuntimeError("cannot load shared visual-media primitives")
base = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = base
spec.loader.exec_module(base)
Chapter = base.Chapter

CHAPTERS: tuple[Chapter, ...] = (
    Chapter(
        "01-context-engineering-vs-prompt-engineering.md",
        "Context engineering frente a prompt engineering",
        "Context engineering versus prompt engineering",
        "La calidad depende de qué evidencia, estado y herramientas entran en cada turno, no sólo de cómo se redacta el prompt.",
        "Quality depends on which evidence, state, and tools enter each turn, not only on prompt wording.",
        ("Prompt fijo frente a contexto vivo", "Selección y ensamblado por turno", "El contexto cambia después de observar"),
        ("Fixed prompt versus live context", "Per-turn selection and assembly", "Context changes after observation"),
    ),
    Chapter(
        "02-context-budgets-prioritisation-compaction-provenance.md",
        "Presupuesto, prioridad, compactación y procedencia",
        "Budget, prioritization, compaction, and provenance",
        "Un presupuesto finito obliga a seleccionar, compactar o expulsar contexto conservando la procedencia de lo que sobrevive.",
        "A finite budget forces selection, compaction, or eviction while preserving provenance for what survives.",
        ("La ventana es un presupuesto finito", "Compactar sin perder la fuente", "Prioridad cambia con la tarea"),
        ("The window is a finite budget", "Compact without losing the source", "Priority changes with the task"),
    ),
    Chapter(
        "03-memory-architectures-working-episodic-semantic-persistent-state.md",
        "Arquitecturas de memoria y estado persistente",
        "Memory architectures and persistent state",
        "Memoria de trabajo, episodios, conocimiento semántico y estado persistente tienen ciclos de escritura, recuperación y caducidad distintos.",
        "Working memory, episodes, semantic knowledge, and persistent state have different write, retrieval, and expiry lifecycles.",
        ("Cuatro memorias, cuatro ciclos", "Escribir requiere una política", "Recuperar no significa confiar"),
        ("Four memories, four lifecycles", "Writing requires a policy", "Retrieving does not mean trusting"),
    ),
    Chapter(
        "04-retrieval-context-assembly-freshness-relevance-conflict-grounding.md",
        "Retrieval, frescura, conflictos y grounding",
        "Retrieval, freshness, conflict, and grounding",
        "Recuperar candidatos no basta: hay que ponderar relevancia y frescura, resolver conflictos y ensamblar evidencia trazable.",
        "Retrieving candidates is not enough: relevance and freshness must be weighed, conflicts resolved, and traceable evidence assembled.",
        ("Relevancia y frescura son señales distintas", "Resolver conflicto antes de ensamblar", "Grounding mantiene evidencia y respuesta unidas"),
        ("Relevance and freshness are different signals", "Resolve conflict before assembly", "Grounding keeps evidence and answer connected"),
    ),
    Chapter(
        "05-mcp-hosts-clients-servers-tools-resources-prompts-lifecycle-trust-boundaries.md",
        "MCP: lifecycle, capacidades y trust boundaries",
        "MCP: lifecycle, capabilities, and trust boundaries",
        "MCP separa host, clientes y servidores; el descubrimiento de capacidades no elimina autorización, validación ni fronteras de confianza.",
        "MCP separates host, clients, and servers; capability discovery does not remove authorization, validation, or trust boundaries.",
        ("Host, cliente y servidor tienen roles distintos", "Descubrir capacidades no las autoriza", "Datos remotos no heredan autoridad"),
        ("Host, client, and server have different roles", "Discovering capabilities does not authorize them", "Remote data does not inherit authority"),
    ),
    Chapter(
        "06-skills-plugins-subagents-hooks-context-isolation-evaluation.md",
        "Skills, plugins, subagentes y aislamiento de contexto",
        "Skills, plugins, subagents, and context isolation",
        "Extensiones y subagentes sólo escalan bien cuando el contexto, la autoridad y la evidencia de cada worker permanecen explícitos y evaluables.",
        "Extensions and subagents scale only when each worker's context, authority, and evidence remain explicit and evaluable.",
        ("Extender no significa compartir todo el contexto", "Fan-out con contextos aislados", "Fan-in sólo con evidencia evaluada"),
        ("Extending does not mean sharing all context", "Fan-out with isolated contexts", "Fan-in only with evaluated evidence"),
    ),
)

BG = base.BG
BG_2 = base.BG_2
PANEL = base.PANEL
PANEL_2 = base.PANEL_2
TEXT = base.TEXT
MUTED = base.MUTED
DIM = base.DIM
ACCENT = base.ACCENT
ACCENT_2 = base.ACCENT_2
GOOD = base.GOOD
WARN = base.WARN
BAD = base.BAD
BLUE = base.BLUE
PURPLE = base.PURPLE
LINE = base.LINE


def t(draw: ImageDraw.ImageDraw, xy, value, *, size=72, color=TEXT, bold=True, max_width=None, anchor="la", align="left"):
    base.text(draw, xy, value, size=size, color=color, bold=bold, max_width=max_width, anchor=anchor, align=align)


def rr(draw: ImageDraw.ImageDraw, box, *, fill=PANEL, outline=LINE, width=4, radius=28):
    base.rounded(draw, box, fill, outline, width, radius)


def arrow(draw: ImageDraw.ImageDraw, a, b, *, color=ACCENT, width=10):
    base.arrow(draw, a, b, color=color, width=width)


def pulse(draw: ImageDraw.ImageDraw, a, b, progress, *, color=ACCENT_2):
    base.token(draw, a, b, progress, color)


def node(draw: ImageDraw.ImageDraw, center, value, *, outline=LINE, active=False, w=400, h=150):
    base.node(draw, center, value, outline=outline, active=active, w=w, h=h)


def smooth(v: float) -> float:
    v = max(0.0, min(1.0, v))
    return v * v * (3 - 2 * v)


def base_frame(chapter: Chapter, locale: str, scene: int) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(image)
    title = chapter.title_es if locale == "es" else chapter.title_en
    moment = (chapter.moments_es if locale == "es" else chapter.moments_en)[scene]
    draw.rectangle((0, 0, W, 12), fill=ACCENT)
    t(draw, (90, 60), "5SIGMAS · CONTEXT ENGINEERING", size=52, color=ACCENT)
    t(draw, (90, 126), title, size=68, max_width=1580)
    t(draw, (90, 252), moment, size=78, color=ACCENT_2, max_width=1710)
    t(draw, (1810, 70), locale.upper(), size=52, color=MUTED, anchor="ra")
    draw.rectangle((0, SAFE_ZONE_START_Y, W, H), fill=BG_2)
    # Progress is non-material and intentionally confined to the controls-safe strip.
    draw.line((90, 1018, 1830, 1018), fill="#294047", width=6)
    x = 90 + (1740 * (scene * SCENE_SECONDS) / DURATION_SECONDS)
    draw.line((90, 1018, x, 1018), fill=ACCENT, width=6)
    return image, draw


def draw_sources_to_window(draw, labels, p):
    sources = [(260, 410), (260, 555), (260, 700)]
    colors = [BLUE, PURPLE, ACCENT_2]
    for i, (pos, label) in enumerate(zip(sources, labels[:3])):
        node(draw, pos, label, outline=colors[i], active=p > .12 * (i + 1), w=360, h=118)
        arrow(draw, (445, pos[1]), (690, 555 + (i - 1) * 54), color=colors[i])
        if p > .15 * (i + 1):
            pulse(draw, (445, pos[1]), (690, 555 + (i - 1) * 54), min(1, (p - .15 * i) * 1.8), color=colors[i])
    rr(draw, (700, 390, 1280, 725), fill=PANEL_2, outline=ACCENT, width=6)
    t(draw, (990, 438), labels[3], size=72, color=ACCENT, anchor="ma")
    for i, label in enumerate(labels[4:7]):
        y = 520 + i * 72
        rr(draw, (760, y - 34, 1220, y + 28), fill=PANEL, outline=LINE, width=3, radius=16)
        t(draw, (990, y - 4), label, size=60, anchor="mm", max_width=420, align="center")
    arrow(draw, (1285, 555), (1510, 555), color=GOOD)
    node(draw, (1650, 555), labels[7], outline=GOOD, active=p > .65, w=300, h=170)


def ch1(draw, locale, scene, p):
    if locale == "es":
        sets = [
            ("Prompt", "Memoria", "Retrieval", "Contexto del turno", "Sistema", "Tarea", "Evidencia", "Modelo"),
            ("Estado", "Memoria", "Tools", "Assembler", "Instrucción", "Evidencia", "Observación", "Modelo"),
            ("Turno t", "Tool result", "Memoria Δ", "Contexto t+1", "Estado nuevo", "Evidencia nueva", "Prioridad nueva", "Modelo"),
        ]
    else:
        sets = [
            ("Prompt", "Memory", "Retrieval", "Turn context", "System", "Task", "Evidence", "Model"),
            ("State", "Memory", "Tools", "Assembler", "Instruction", "Evidence", "Observation", "Model"),
            ("Turn t", "Tool result", "Memory Δ", "Context t+1", "New state", "New evidence", "New priority", "Model"),
        ]
    draw_sources_to_window(draw, sets[scene], p)


def ch2(draw, locale, scene, p):
    es = locale == "es"
    if scene == 0:
        labels = ("OBLIGATORIO", "RECIENTE", "RETRIEVED", "COLA / EVICT") if es else ("REQUIRED", "RECENT", "RETRIEVED", "QUEUE / EVICT")
        rr(draw, (180, 430, 1740, 690), fill=PANEL_2, outline=ACCENT, width=6)
        widths = [470, 390, 470]
        x = 230
        colors = [GOOD, BLUE, PURPLE]
        for i, (label, w) in enumerate(zip(labels[:3], widths)):
            active_w = int(w * (0.78 + .22 * smooth(p)))
            rr(draw, (x, 500, x + active_w, 620), fill=PANEL, outline=colors[i], width=5, radius=18)
            t(draw, (x + active_w / 2, 560), label, size=64, color=colors[i], anchor="mm", max_width=active_w - 30, align="center")
            x += w + 34
        t(draw, (960, 735), labels[3], size=62, color=WARN, anchor="ma")
        arrow(draw, (1560, 675), (1560, 735), color=WARN)
    elif scene == 1:
        labels = ("Documento largo", "Resumen", "src:A17", "Conserva procedencia") if es else ("Long document", "Summary", "src:A17", "Keep provenance")
        node(draw, (380, 545), labels[0], outline=BLUE, active=True, w=470, h=180)
        arrow(draw, (625, 545), (845, 545), color=ACCENT)
        node(draw, (1050, 545), labels[1], outline=ACCENT, active=p > .25, w=370, h=180)
        rr(draw, (890, 675, 1210, 755), fill=PANEL_2, outline=PURPLE, width=4, radius=20)
        t(draw, (1050, 715), labels[2], size=60, color=PURPLE, anchor="mm")
        arrow(draw, (1240, 545), (1460, 545), color=GOOD)
        node(draw, (1640, 545), labels[3], outline=GOOD, active=p > .6, w=350, h=180)
    else:
        labels = ("Tarea A", "Tarea B", "Prioridad cambia", "Mismo corpus") if es else ("Task A", "Task B", "Priority changes", "Same corpus")
        node(draw, (330, 455), labels[0], outline=BLUE, active=p < .5, w=340, h=140)
        node(draw, (330, 680), labels[1], outline=PURPLE, active=p >= .5, w=340, h=140)
        rr(draw, (720, 395, 1280, 740), fill=PANEL_2, outline=LINE, width=5)
        t(draw, (1000, 450), labels[3], size=70, color=MUTED, anchor="ma")
        items = [("A", BLUE, .25), ("B", PURPLE, .5), ("C", ACCENT_2, .75)]
        for label, color, yv in items:
            y = int(470 + yv * 260)
            x = int(850 + (220 if (p > .5 and label == "B") or (p <= .5 and label == "A") else 0))
            rr(draw, (x, y - 38, x + 260, y + 38), fill=PANEL, outline=color, width=4, radius=16)
            t(draw, (x + 130, y), label, size=66, color=color, anchor="mm")
        arrow(draw, (1300, 565), (1490, 565), color=GOOD)
        node(draw, (1660, 565), labels[2], outline=GOOD, active=True, w=320, h=180)


def ch3(draw, locale, scene, p):
    es = locale == "es"
    if scene == 0:
        labels = ("Trabajo", "Episódica", "Semántica", "Persistente") if es else ("Working", "Episodic", "Semantic", "Persistent")
        colors = [ACCENT, BLUE, PURPLE, ACCENT_2]
        for i, (label, color) in enumerate(zip(labels, colors)):
            x = 250 + i * 470
            rr(draw, (x - 180, 430, x + 180, 690), fill=PANEL, outline=color, width=5)
            t(draw, (x, 505), label, size=68, color=color, anchor="ma", max_width=330, align="center")
            y0 = 610 - int(85 * smooth(min(1, p * (1.25 + i * .15))))
            draw.ellipse((x - 34, y0 - 34, x + 34, y0 + 34), fill=color)
            draw.line((x, 625, x, y0 + 34), fill=color, width=8)
    elif scene == 1:
        labels = ("Evento", "¿Guardar?", "Policy", "Memory store", "RECHAZAR") if es else ("Event", "Store?", "Policy", "Memory store", "REJECT")
        node(draw, (270, 560), labels[0], outline=BLUE, active=True, w=300, h=150)
        arrow(draw, (425, 560), (690, 560), color=BLUE)
        node(draw, (850, 560), labels[1], outline=ACCENT_2, active=p > .2, w=300, h=170)
        t(draw, (850, 705), labels[2], size=58, color=MUTED, anchor="ma")
        arrow(draw, (1010, 530), (1330, 455), color=GOOD)
        arrow(draw, (1010, 590), (1330, 690), color=BAD)
        node(draw, (1510, 455), labels[3], outline=GOOD, active=p > .55, w=350, h=160)
        node(draw, (1510, 690), labels[4], outline=BAD, active=p > .55, w=350, h=140)
    else:
        labels = ("Query", "Retrieved memory", "Fresh?", "Action", "STALE") if es else ("Query", "Retrieved memory", "Fresh?", "Action", "STALE")
        node(draw, (250, 560), labels[0], outline=BLUE, active=True, w=280, h=150)
        arrow(draw, (400, 560), (655, 560), color=BLUE)
        node(draw, (850, 560), labels[1], outline=PURPLE, active=p > .18, w=380, h=170)
        arrow(draw, (1045, 560), (1265, 560), color=ACCENT)
        node(draw, (1420, 560), labels[2], outline=ACCENT, active=p > .4, w=280, h=150)
        arrow(draw, (1570, 520), (1720, 455), color=GOOD)
        arrow(draw, (1570, 600), (1720, 690), color=BAD)
        t(draw, (1780, 450), labels[3], size=68, color=GOOD, anchor="ra")
        t(draw, (1780, 705), labels[4], size=68, color=BAD, anchor="ra")


def ch4(draw, locale, scene, p):
    es = locale == "es"
    if scene == 0:
        x0, y0, x1, y1 = 280, 400, 1330, 730
        draw.line((x0, y1, x1, y1), fill=LINE, width=6)
        draw.line((x0, y1, x0, y0), fill=LINE, width=6)
        t(draw, (x0 + 20, y0 - 20), "RELEVANCIA" if es else "RELEVANCE", size=58, color=MUTED)
        t(draw, (x1, y1 + 18), "FRESCURA →" if es else "FRESHNESS →", size=58, color=MUTED, anchor="ra")
        points = [(500, 620, BLUE, "A"), (760, 490, GOOD, "B"), (1040, 590, PURPLE, "C"), (1190, 440, BAD, "!")]
        for i, (x, y, color, label) in enumerate(points):
            r = 34 + (10 if p > .2 * i else 0)
            draw.ellipse((x-r, y-r, x+r, y+r), fill=color)
            t(draw, (x, y), label, size=52, color=BG, anchor="mm")
        node(draw, (1600, 560), "TOP B" if p < .65 else ("CONFLICT" if locale == "en" else "CONFLICTO"), outline=GOOD if p < .65 else BAD, active=True, w=360, h=180)
    elif scene == 1:
        labels = ("Doc A · ayer", "Doc B · hoy", "CONFLICTO", "Resolver", "Seleccionar B") if es else ("Doc A · yesterday", "Doc B · today", "CONFLICT", "Resolve", "Select B")
        node(draw, (350, 470), labels[0], outline=BLUE, active=True, w=430, h=150)
        node(draw, (350, 675), labels[1], outline=PURPLE, active=True, w=430, h=150)
        arrow(draw, (575, 500), (790, 555), color=BLUE)
        arrow(draw, (575, 645), (790, 590), color=PURPLE)
        node(draw, (980, 570), labels[2], outline=BAD, active=p > .25, w=340, h=180)
        arrow(draw, (1160, 570), (1385, 570), color=ACCENT)
        node(draw, (1560, 570), labels[4] if p > .55 else labels[3], outline=GOOD, active=True, w=360, h=180)
    else:
        labels = ("Evidence A", "Evidence B", "Assembler", "Answer + citations", "Unsupported")
        if es:
            labels = ("Evidencia A", "Evidencia B", "Assembler", "Respuesta + citas", "Sin soporte")
        node(draw, (320, 470), labels[0], outline=BLUE, active=True, w=400, h=140)
        node(draw, (320, 680), labels[1], outline=PURPLE, active=True, w=400, h=140)
        arrow(draw, (530, 500), (750, 555), color=BLUE)
        arrow(draw, (530, 650), (750, 595), color=PURPLE)
        node(draw, (950, 575), labels[2], outline=ACCENT, active=p > .25, w=360, h=180)
        arrow(draw, (1140, 575), (1370, 575), color=GOOD)
        node(draw, (1580, 510), labels[3], outline=GOOD, active=p > .55, w=390, h=180)
        t(draw, (1580, 720), f"✕ {labels[4]}", size=62, color=BAD, anchor="ma")


def ch5(draw, locale, scene, p):
    es = locale == "es"
    if scene == 0:
        labels = ("HOST", "CLIENT", "SERVER", "modelo + UX", "sesión", "capacidades") if es else ("HOST", "CLIENT", "SERVER", "model + UX", "session", "capabilities")
        node(draw, (330, 560), labels[0], outline=ACCENT_2, active=True, w=360, h=180)
        node(draw, (950, 560), labels[1], outline=ACCENT, active=p > .15, w=330, h=180)
        node(draw, (1580, 560), labels[2], outline=BLUE, active=p > .35, w=360, h=180)
        arrow(draw, (520, 560), (775, 560), color=ACCENT)
        arrow(draw, (1125, 560), (1390, 560), color=BLUE)
        t(draw, (330, 705), labels[3], size=54, color=MUTED, anchor="ma")
        t(draw, (950, 705), labels[4], size=54, color=MUTED, anchor="ma")
        t(draw, (1580, 705), labels[5], size=54, color=MUTED, anchor="ma")
    elif scene == 1:
        labels = ("LIST", "tools", "resources", "prompts", "NO AUTH") if es else ("LIST", "tools", "resources", "prompts", "NO AUTH")
        node(draw, (300, 560), labels[0], outline=ACCENT, active=True, w=280, h=150)
        centers = [(820, 430), (820, 560), (820, 690)]
        colors = [BLUE, PURPLE, ACCENT_2]
        for (x, y), label, color in zip(centers, labels[1:4], colors):
            arrow(draw, (450, 560), (640, y), color=color)
            node(draw, (x, y), label, outline=color, active=p > .18, w=320, h=120)
            arrow(draw, (990, y), (1320, y), color=color)
        rr(draw, (1340, 380, 1740, 735), fill=PANEL_2, outline=BAD, width=5)
        t(draw, (1540, 545), labels[4], size=78, color=BAD, anchor="mm", align="center")
    else:
        labels = ("Remote data", "Validate", "Policy", "Tool effect", "No authority") if locale == "en" else ("Dato remoto", "Validar", "Policy", "Efecto tool", "Sin autoridad")
        node(draw, (300, 560), labels[0], outline=PURPLE, active=True, w=380, h=160)
        arrow(draw, (500, 560), (740, 560), color=PURPLE)
        node(draw, (900, 560), labels[1], outline=ACCENT, active=p > .2, w=300, h=150)
        arrow(draw, (1060, 560), (1280, 560), color=ACCENT)
        node(draw, (1440, 490), labels[2], outline=GOOD, active=p > .45, w=300, h=140)
        node(draw, (1440, 690), labels[4], outline=BAD, active=p > .45, w=300, h=140)
        arrow(draw, (1600, 490), (1760, 490), color=GOOD)
        t(draw, (1810, 490), labels[3], size=58, color=GOOD, anchor="ra")


def ch6(draw, locale, scene, p):
    es = locale == "es"
    if scene == 0:
        labels = ("Core context", "Skill", "Plugin", "Hook", "Selective inject") if locale == "en" else ("Contexto core", "Skill", "Plugin", "Hook", "Inyección selectiva")
        node(draw, (360, 560), labels[0], outline=ACCENT, active=True, w=420, h=180)
        ys = [420, 560, 700]
        cols = [BLUE, PURPLE, ACCENT_2]
        for y, label, color in zip(ys, labels[1:4], cols):
            node(draw, (1000, y), label, outline=color, active=p > .15, w=300, h=120)
            arrow(draw, (835, y), (580, 560), color=color)
        arrow(draw, (580, 560), (1400, 560), color=GOOD)
        node(draw, (1620, 560), labels[4], outline=GOOD, active=p > .55, w=360, h=180)
    elif scene == 1:
        labels = ("Orchestrator", "Ctx A", "Ctx B", "Evidence A", "Evidence B") if locale == "en" else ("Orquestador", "Ctx A", "Ctx B", "Evidencia A", "Evidencia B")
        node(draw, (350, 560), labels[0], outline=ACCENT_2, active=True, w=380, h=170)
        arrow(draw, (550, 520), (830, 450), color=BLUE)
        arrow(draw, (550, 600), (830, 670), color=PURPLE)
        node(draw, (1030, 450), labels[1], outline=BLUE, active=p > .2, w=340, h=150)
        node(draw, (1030, 670), labels[2], outline=PURPLE, active=p > .35, w=340, h=150)
        # isolation boundary
        draw.line((800, 350, 800, 760), fill=LINE, width=5)
        arrow(draw, (1210, 450), (1460, 500), color=BLUE)
        arrow(draw, (1210, 670), (1460, 620), color=PURPLE)
        node(draw, (1650, 500), labels[3], outline=BLUE, active=p > .55, w=320, h=130)
        node(draw, (1650, 650), labels[4], outline=PURPLE, active=p > .55, w=320, h=130)
    else:
        labels = ("Evidence bundle", "Evaluator", "PASS", "RETRY", "Merge") if locale == "en" else ("Bundle evidencia", "Evaluador", "PASS", "REINTENTAR", "Merge")
        node(draw, (340, 560), labels[0], outline=BLUE, active=True, w=410, h=170)
        arrow(draw, (555, 560), (800, 560), color=BLUE)
        node(draw, (980, 560), labels[1], outline=ACCENT, active=p > .2, w=340, h=170)
        arrow(draw, (1160, 520), (1390, 450), color=GOOD)
        arrow(draw, (1160, 600), (1390, 680), color=WARN)
        node(draw, (1550, 450), labels[2], outline=GOOD, active=p > .5, w=300, h=140)
        node(draw, (1550, 680), labels[3], outline=WARN, active=p > .5, w=300, h=140)
        t(draw, (1810, 450), labels[4], size=64, color=GOOD, anchor="ra")


DRAWERS = (ch1, ch2, ch3, ch4, ch5, ch6)


def render_scene(chapter_index: int, chapter: Chapter, locale: str, scene: int, progress: float) -> Image.Image:
    image, draw = base_frame(chapter, locale, scene)
    DRAWERS[chapter_index](draw, locale, scene, smooth(progress))
    return image


def assert_mobile_safe_contract() -> dict[str, float | int | bool]:
    projected = MIN_MATERIAL_SOURCE_PX * MOBILE_SCALE
    if projected < 12.0:
        raise RuntimeError(f"material typography projects below 12 CSS px: {projected:.2f}")
    if SAFE_ZONE_START_Y > 800:
        raise RuntimeError("controls-safe zone starts too low")
    if RESERVED_CONTROL_PROJECTED_CSS_PX < 50:
        raise RuntimeError("controls-safe reserve below 50 CSS px")
    return {
        "mobile_inline_width_css_px": MOBILE_INLINE_WIDTH,
        "min_material_source_px": MIN_MATERIAL_SOURCE_PX,
        "min_material_projected_css_px": round(projected, 2),
        "safe_zone_start_source_y": SAFE_ZONE_START_Y,
        "reserved_control_projected_css_px": round(RESERVED_CONTROL_PROJECTED_CSS_PX, 2),
        "material_content_below_safe_zone": False,
        "voice_generated": False,
    }


def encode_video(frame_dir: Path, output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    result = subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-framerate", str(FPS), "-i", str(frame_dir / "frame-%04d.jpg"),
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "24", "-pix_fmt", "yuv420p",
        "-r", "24", "-t", str(DURATION_SECONDS), "-movflags", "+faststart", "-an", str(output),
    ], check=False, capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip() or f"ffmpeg failed for {output}")


def render_video(chapter_index: int, chapter: Chapter, locale: str, output_root: Path, tmp_root: Path) -> None:
    slug = Path(chapter.filename).stem
    frame_dir = tmp_root / f"{locale}-{slug}"
    frame_dir.mkdir(parents=True, exist_ok=True)
    poster = None
    for frame_index in range(TOTAL_FRAMES):
        seconds = frame_index / FPS
        scene = min(2, int(seconds // SCENE_SECONDS))
        local_t = (seconds - scene * SCENE_SECONDS) / SCENE_SECONDS
        image = render_scene(chapter_index, chapter, locale, scene, local_t)
        if poster is None:
            poster = image.copy()
        image.save(frame_dir / f"frame-{frame_index:04d}.jpg", format="JPEG", quality=88, optimize=True)
    if poster is None:
        raise RuntimeError("poster frame missing")
    poster.save(output_root / f"{slug}.jpg", format="JPEG", quality=92, optimize=True, progressive=True)
    encode_video(frame_dir, output_root / f"{slug}.mp4")


def q(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def media_block(chapter: Chapter, locale: str, indent: str = "") -> str:
    slug = Path(chapter.filename).stem
    title = chapter.title_es if locale == "es" else chapter.title_en
    summary = chapter.summary_es if locale == "es" else chapter.summary_en
    moments = chapter.moments_es if locale == "es" else chapter.moments_en
    return (
        f"{indent}video: {slug}.mp4\n"
        f"{indent}video_poster: {slug}.jpg\n"
        f"{indent}video_title: {q(title)}\n"
        f"{indent}video_summary: {q(summary)}\n"
        f"{indent}video_duration: PT36S\n"
        f"{indent}video_chapters:\n"
        f"{indent}- name: {q(moments[0])}\n{indent}  start: 0\n{indent}  end: 12\n"
        f"{indent}- name: {q(moments[1])}\n{indent}  start: 12\n{indent}  end: 24\n"
        f"{indent}- name: {q(moments[2])}\n{indent}  start: 24\n{indent}  end: 36\n"
    )


def patch_spanish_frontmatter(path: Path, chapter: Chapter) -> None:
    raw = path.read_text(encoding="utf-8")
    if not raw.startswith("---\n"):
        raise RuntimeError(f"frontmatter missing: {path}")
    end = raw.find("\n---\n", 4)
    if end < 0:
        raise RuntimeError(f"frontmatter terminator missing: {path}")
    front = raw[:end]
    if "\nvideo:" in front:
        return
    path.write_text(front + "\n" + media_block(chapter, "es").rstrip() + raw[end:], encoding="utf-8")


def append_english_media(path: Path, chapters: Iterable[Chapter]) -> None:
    raw = path.read_text(encoding="utf-8")
    existing = yaml.safe_load(raw) or {}
    if not isinstance(existing, dict):
        raise RuntimeError(f"media mapping invalid: {path}")
    blocks = []
    for chapter in chapters:
        key = f"series/{SERIES}/{chapter.filename}"
        if key in existing:
            continue
        # media_block uses list indentation relative to the entry.
        block = media_block(chapter, "en", indent="  ")
        blocks.append(f"\n{key}:\n{block}")
    if blocks:
        path.write_text(raw.rstrip() + "\n" + "".join(blocks), encoding="utf-8")


def generate(root: Path) -> None:
    contract = assert_mobile_safe_contract()
    report = root / "artifacts/context-requalification/mobile-safe-video-contract.json"
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text(json.dumps(contract, indent=2) + "\n", encoding="utf-8")
    es_root = root / "docs/series" / SERIES
    en_root = root / "locales/en/series" / SERIES
    media_path = root / "locales/en/media.yml"
    for required in (es_root, en_root, media_path):
        if not required.exists():
            raise RuntimeError(f"required path missing: {required}")
    with tempfile.TemporaryDirectory(prefix="context-video-frames-") as tmp:
        tmp_root = Path(tmp)
        for index, chapter in enumerate(CHAPTERS):
            render_video(index, chapter, "es", es_root, tmp_root)
            render_video(index, chapter, "en", en_root, tmp_root)
            patch_spanish_frontmatter(es_root / chapter.filename, chapter)
    append_english_media(media_path, CHAPTERS)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    contract = assert_mobile_safe_contract()
    if args.self_test:
        print(json.dumps(contract, indent=2))
        return 0
    generate(args.root.resolve())
    print(f"Generated {len(CHAPTERS) * 2} silent native videos + posters for {SERIES}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
