#!/usr/bin/env python3
"""Generate silent, locale-native mechanism videos for Coding Agents.

The current GOLDEN contract keeps future owner narration/audio/captions/transcript
out of the blocking gate, but the visual video itself remains mandatory. These
videos therefore teach the chapter mechanism directly through animated state,
causal flow, branching, invalidation, recovery, and integration. They do not
create or infer any narration-derived artifact.

All six chapters share one coherent visual system, while each chapter uses a
mechanism-specific composition rather than a generic slideshow or cosmetic
box-highlighting pattern.
"""
from __future__ import annotations

import argparse
import json
import math
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Iterable

import yaml
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SERIES = "coding-agents-agent-harnesses"
W, H = 1920, 1080
DURATION_SECONDS = 36
SCENE_SECONDS = 12
FPS = 6
TOTAL_FRAMES = DURATION_SECONDS * FPS

# Series-coherent visual identity.
BG = "#101719"
BG_2 = "#121D20"
PANEL = "#172428"
PANEL_2 = "#1D2D32"
TEXT = "#F4F0E7"
MUTED = "#A8B6B9"
DIM = "#667A80"
ACCENT = "#79D2B6"
ACCENT_2 = "#D8B76B"
GOOD = "#7BD6A4"
WARN = "#E3BB65"
BAD = "#E8897D"
BLUE = "#79AEE8"
PURPLE = "#AD96E6"
LINE = "#496067"
WHITE = "#FFFFFF"

FONT_REGULAR = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
FONT_BOLD = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")


@dataclass(frozen=True)
class Chapter:
    filename: str
    title_es: str
    title_en: str
    summary_es: str
    summary_en: str
    moments_es: tuple[str, str, str]
    moments_en: tuple[str, str, str]


CHAPTERS: tuple[Chapter, ...] = (
    Chapter(
        "01-que-es-agent-harness.md",
        "Qué añade un agent harness al modelo",
        "What an agent harness adds to the model",
        "El harness convierte propuestas del modelo en una trayectoria operativa con política, tools, estado y observaciones reales.",
        "The harness turns model proposals into an operating trajectory with policy, tools, state, and real observations.",
        ("Propuesta frente a efecto", "El feedback loop cambia la siguiente observación", "Control externo y condición de parada"),
        ("Proposal versus effect", "The feedback loop changes the next observation", "External control and stopping condition"),
    ),
    Chapter(
        "02-contexto-workspace-sandboxing-aislamiento.md",
        "Workspace, worktrees y sandboxing",
        "Workspace, worktrees, and sandboxing",
        "El aislamiento separa estado Git, filesystem, procesos y recursos; la integración final vuelve a validar el estado combinado.",
        "Isolation separates Git state, filesystem, processes, and resources; final integration revalidates the combined state.",
        ("Una tarea, un estado observable", "Aislar también recursos de ejecución", "Integrar contra el target actual"),
        ("One task, one observable state", "Isolate execution resources too", "Integrate against the current target"),
    ),
    Chapter(
        "03-specs-planificacion-task-decomposition-checkpoints.md",
        "Specs, planes, checkpoints y stop conditions",
        "Specs, plans, checkpoints, and stop conditions",
        "Un contrato fija el éxito; el plan puede cambiar con evidencia; los checkpoints y stop conditions hacen la trayectoria recuperable.",
        "A contract fixes success; the plan can change with evidence; checkpoints and stop conditions make the trajectory recoverable.",
        ("De petición a contrato observable", "Plan, evidencia, checkpoint y replan", "Done, recover, blocked o escalate"),
        ("From request to observable contract", "Plan, evidence, checkpoint, and replan", "Done, recover, blocked, or escalate"),
    ),
    Chapter(
        "04-tools-permisos-approvals-hooks-secretos-trust-boundaries.md",
        "Tools, permisos, approvals y trust boundaries",
        "Tools, permissions, approvals, and trust boundaries",
        "La intención del modelo sólo produce efectos tras cruzar validación, policy, approvals, sandbox y autoridad externa independientes.",
        "Model intent creates effects only after independent validation, policy, approvals, sandbox, and external authority boundaries.",
        ("Una tool call no es autorización", "Input no confiable, capacidad limitada", "Proyectar secretos sin ponerlos en contexto"),
        ("A tool call is not authorization", "Untrusted input, bounded capability", "Project secrets without placing them in context"),
    ),
    Chapter(
        "05-tests-verifiers-review-diffs-stop-conditions-evaluacion.md",
        "Tests, verifiers y revisión de diffs",
        "Tests, verifiers, and diff review",
        "La aceptación deriva de evidencia conjunta y fresca sobre el mismo candidate SHA; un cambio invalida la evidencia que ya no corresponde.",
        "Acceptance derives from combined, fresh evidence over the same candidate SHA; a change invalidates evidence that no longer applies.",
        ("Una señal verde no basta", "Freshness ligada al candidate SHA", "Verificar, reparar, aceptar o escalar"),
        ("One green signal is not enough", "Freshness bound to the candidate SHA", "Verify, repair, accept, or escalate"),
    ),
    Chapter(
        "06-tareas-largas-memoria-subagentes-recuperacion-merge-observabilidad.md",
        "Tareas largas, subagentes, recuperación y observabilidad",
        "Long-running tasks, subagents, recovery, and observability",
        "Estado durable, ownership explícito y evidencia por candidate permiten reiniciar, coordinar workers e integrar sobre un target que avanza.",
        "Durable state, explicit ownership, and candidate-bound evidence allow restart, worker coordination, and integration over a moving target.",
        ("Checkpoint durable y recuperación", "Fan-out con ownership; fan-in con evidencia", "Target avanza: integrar y revalidar"),
        ("Durable checkpoint and recovery", "Fan-out with ownership; fan-in with evidence", "Target moves: integrate and revalidate"),
    ),
)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    path = FONT_BOLD if bold else FONT_REGULAR
    if not path.is_file():
        raise RuntimeError(f"required font not found: {path}")
    return ImageFont.truetype(str(path), size=size)


def smooth(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return t * t * (3.0 - 2.0 * t)


def clamp01(t: float) -> float:
    return max(0.0, min(1.0, t))


def phase(t: float, start: float, end: float) -> float:
    if end <= start:
        return 1.0 if t >= end else 0.0
    return smooth((t - start) / (end - start))


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * smooth(t)


def mix_point(a: tuple[float, float], b: tuple[float, float], t: float) -> tuple[float, float]:
    return (lerp(a[0], b[0], t), lerp(a[1], b[1], t))


def wrap(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.FreeTypeFont, max_width: int) -> str:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        box = draw.textbbox((0, 0), candidate, font=fnt)
        width = box[2] - box[0]
        if current and width > max_width:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return "\n".join(lines)


def rounded(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], fill: str, outline: str = LINE, width: int = 2, radius: int = 24) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def label(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, *, size: int = 26, color: str = TEXT, bold: bool = False, max_width: int | None = None, anchor: str | None = None, align: str = "left") -> None:
    fnt = font(size, bold)
    rendered = wrap(draw, text, fnt, max_width) if max_width else text
    draw.multiline_text(xy, rendered, font=fnt, fill=color, spacing=max(5, size // 5), anchor=anchor, align=align)


def node(draw: ImageDraw.ImageDraw, center: tuple[int, int], text: str, *, w: int = 260, h: int = 118, fill: str = PANEL, outline: str = LINE, text_color: str = TEXT, glow: bool = False) -> tuple[int, int, int, int]:
    x, y = center
    box = (x - w // 2, y - h // 2, x + w // 2, y + h // 2)
    if glow:
        draw.rounded_rectangle((box[0] - 8, box[1] - 8, box[2] + 8, box[3] + 8), radius=30, outline=ACCENT, width=3)
    rounded(draw, box, fill, outline, width=3 if glow else 2, radius=24)
    label(draw, center, text, size=27, color=text_color, bold=True, max_width=w - 36, anchor="mm", align="center")
    return box


def arrow(draw: ImageDraw.ImageDraw, start: tuple[float, float], end: tuple[float, float], *, color: str = ACCENT, width: int = 6, alpha: float = 1.0) -> None:
    x1, y1 = start
    x2, y2 = end
    draw.line((x1, y1, x2, y2), fill=color, width=width)
    angle = math.atan2(y2 - y1, x2 - x1)
    size = 20
    p1 = (x2, y2)
    p2 = (x2 - size * math.cos(angle - 0.55), y2 - size * math.sin(angle - 0.55))
    p3 = (x2 - size * math.cos(angle + 0.55), y2 - size * math.sin(angle + 0.55))
    draw.polygon((p1, p2, p3), fill=color)


def token(draw: ImageDraw.ImageDraw, pos: tuple[float, float], *, color: str = ACCENT, radius: int = 15, ring: bool = True) -> None:
    x, y = pos
    if ring:
        draw.ellipse((x - radius - 8, y - radius - 8, x + radius + 8, y + radius + 8), outline=color, width=3)
    draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=color)


def status_chip(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, color: str) -> None:
    x, y = xy
    fnt = font(23, True)
    box = draw.textbbox((0, 0), text, font=fnt)
    w = box[2] - box[0] + 32
    h = 43
    draw.rounded_rectangle((x, y, x + w, y + h), radius=20, fill=BG_2, outline=color, width=2)
    draw.text((x + 16, y + 9), text, font=fnt, fill=color)


def base_frame(chapter: Chapter, locale: str, scene_idx: int, local_t: float) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(image)
    title = chapter.title_es if locale == "es" else chapter.title_en
    moments = chapter.moments_es if locale == "es" else chapter.moments_en
    draw.rectangle((0, 0, W, 10), fill=ACCENT)
    label(draw, (92, 70), "5SIGMAS", size=30, color=ACCENT, bold=True)
    label(draw, (92, 115), "CODING AGENTS · AGENT HARNESSES", size=22, color=MUTED)
    label(draw, (92, 178), title, size=37, color=TEXT, bold=True, max_width=1490)
    status_chip(draw, (1630, 84), "ES" if locale == "es" else "EN", ACCENT_2)
    label(draw, (92, 260), f"{scene_idx + 1:02d}  {moments[scene_idx]}", size=27, color=ACCENT_2, bold=True, max_width=1560)
    # Scene progress is visual timing, not narration timing.
    x1, x2 = 92, 1828
    y = 1022
    draw.line((x1, y, x2, y), fill="#26383D", width=8)
    draw.line((x1, y, lerp(x1, x2, clamp01(local_t)), y), fill=ACCENT, width=8)
    return image, draw


def draw_harness(chapter: Chapter, locale: str, scene: int, t: float) -> Image.Image:
    image, draw = base_frame(chapter, locale, scene, t)
    es = locale == "es"
    if scene == 0:
        names = ("Modelo" if es else "Model", "Policy + harness", "Workspace", "Observación" if es else "Observation")
        pts = [(280, 600), (750, 600), (1230, 600), (1650, 600)]
        for i, (p, name) in enumerate(zip(pts, names)):
            node(draw, p, name, w=300, h=130, glow=(int(t * 4) % 4 == i))
            if i < 3:
                arrow(draw, (p[0] + 155, p[1]), (pts[i + 1][0] - 155, pts[i + 1][1]), color=ACCENT if i != 0 else ACCENT_2)
        progress = clamp01(t)
        segment = min(2, int(progress * 3))
        local = progress * 3 - segment
        a = (pts[segment][0] + 155, pts[segment][1] - 28)
        b = (pts[segment + 1][0] - 155, pts[segment + 1][1] - 28)
        token(draw, mix_point(a, b, local), color=ACCENT_2 if segment == 0 else ACCENT)
        arrow(draw, (1650, 690), (280, 690), color=BLUE, width=5)
        label(draw, (965, 720), "feedback: stdout · diff · tests" if not es else "feedback: stdout · diff · tests", size=25, color=BLUE, anchor="ma")
        label(draw, (280, 820), "propuesta" if es else "proposal", size=24, color=ACCENT_2, anchor="ma")
        label(draw, (1230, 820), "efecto real" if es else "real effect", size=24, color=GOOD, anchor="ma")
    elif scene == 1:
        names = ["Contexto" if es else "Context", "Modelo" if es else "Model", "Policy", "Workspace", "Observación" if es else "Observation", "Verificar" if es else "Verify"]
        center = (960, 650)
        radius_x, radius_y = 690, 255
        pts = []
        for i in range(6):
            a = math.radians(-150 + i * 60)
            pts.append((int(center[0] + radius_x * math.cos(a)), int(center[1] + radius_y * math.sin(a))))
        active = int(t * 6) % 6
        for i, (p, name) in enumerate(zip(pts, names)):
            node(draw, p, name, w=245, h=105, glow=(i == active))
            nxt = pts[(i + 1) % 6]
            arrow(draw, (p[0] + (105 if nxt[0] > p[0] else -105), p[1]), (nxt[0] - (105 if nxt[0] > p[0] else -105), nxt[1]), color=DIM, width=4)
        a = pts[active]
        b = pts[(active + 1) % 6]
        token(draw, mix_point(a, b, (t * 6) % 1), color=ACCENT)
        rounded(draw, (710, 560, 1210, 735), BG_2, outline="#31464C")
        label(draw, (960, 605), "RUN STATE", size=22, color=ACCENT_2, bold=True, anchor="ma")
        label(draw, (960, 660), "provenance · checkpoint · evidence", size=25, color=TEXT, anchor="ma")
    else:
        gates = [(430, "Permisos" if es else "Permissions"), (960, "Estado" if es else "State"), (1490, "Verifier")]
        label(draw, (960, 430), "La autonomía avanza sólo si las fronteras independientes siguen válidas" if es else "Autonomy advances only while independent boundaries remain valid", size=34, color=TEXT, bold=True, max_width=1450, anchor="ma", align="center")
        for i, (x, name) in enumerate(gates):
            ok = t > (i + 1) * 0.18
            node(draw, (x, 640), name, w=350, h=150, outline=GOOD if ok else WARN, glow=ok)
            status_chip(draw, (x - 62, 755), "PASS" if ok else "CHECK", GOOD if ok else WARN)
            if i < 2:
                arrow(draw, (x + 180, 640), (gates[i + 1][0] - 180, 640), color=GOOD if ok else DIM)
        if t > 0.72:
            status_chip(draw, (850, 885), "DONE / HANDBACK", GOOD)
            arrow(draw, (960, 825), (960, 875), color=GOOD)
    return image


def draw_isolation(chapter: Chapter, locale: str, scene: int, t: float) -> Image.Image:
    image, draw = base_frame(chapter, locale, scene, t)
    es = locale == "es"
    if scene == 0:
        node(draw, (960, 420), "repo · base SHA A", w=390, h=120, outline=ACCENT_2)
        left = (520, 700); right = (1400, 700)
        arrow(draw, (880, 485), (600, 635), color=BLUE)
        arrow(draw, (1040, 485), (1320, 635), color=BLUE)
        node(draw, left, "worktree T1\nagent/parser", w=420, h=170, glow=t > .25)
        node(draw, right, "worktree T2\nagent/tests", w=420, h=170, glow=t > .45)
        if t > .3:
            token(draw, mix_point((740, 700), (840, 700), phase(t, .3, .55)), color=GOOD)
            label(draw, (520, 840), "HEAD + index + dirty state" if not es else "HEAD + índice + dirty state", size=24, color=MUTED, anchor="ma")
        if t > .5:
            token(draw, mix_point((1180, 700), (1080, 700), phase(t, .5, .8)), color=PURPLE)
            label(draw, (1400, 840), "independent mutable view" if not es else "vista mutable independiente", size=24, color=MUTED, anchor="ma")
    elif scene == 1:
        half = t < .48
        label(draw, (960, 390), "Colisión oculta" if (es and half) else "Hidden collision" if half else "Recursos namespaced" if es else "Namespaced resources", size=34, color=BAD if half else GOOD, bold=True, anchor="ma")
        for x, task, col in [(500, "T1", BLUE), (1420, "T2", PURPLE)]:
            node(draw, (x, 540), f"{task} worktree", w=310, h=105, outline=col)
            node(draw, (x, 710), f"{task} sandbox", w=310, h=105, outline=col)
            arrow(draw, (x, 595), (x, 650), color=col)
        if half:
            node(draw, (960, 865), "shared DB · :5432 · /tmp", w=650, h=120, outline=BAD, glow=True)
            arrow(draw, (500, 765), (820, 825), color=BAD)
            arrow(draw, (1420, 765), (1100, 825), color=BAD)
            token(draw, (900 + 60 * math.sin(t * 20), 865), color=BAD)
        else:
            node(draw, (500, 875), "db_t1 · :15432 · /tmp/t1", w=480, h=100, outline=GOOD)
            node(draw, (1420, 875), "db_t2 · :25432 · /tmp/t2", w=480, h=100, outline=GOOD)
            arrow(draw, (500, 765), (500, 825), color=GOOD)
            arrow(draw, (1420, 765), (1420, 825), color=GOOD)
    else:
        node(draw, (320, 520), "base A", w=220, h=100)
        node(draw, (720, 430), "T1 patch", w=250, h=105, outline=BLUE)
        node(draw, (720, 700), "T2 patch", w=250, h=105, outline=PURPLE)
        node(draw, (1110, 520), "target B", w=250, h=105, outline=ACCENT_2, glow=t > .2)
        node(draw, (1510, 520), "integrated I9", w=310, h=120, outline=GOOD, glow=t > .55)
        for a, b, c in [((430, 500), (590, 450), BLUE), ((430, 545), (590, 680), PURPLE), ((845, 430), (1370, 490), BLUE), ((845, 700), (1370, 550), PURPLE), ((1240, 520), (1350, 520), ACCENT_2)]:
            arrow(draw, a, b, color=c, width=5)
        if t > .62:
            rounded(draw, (1330, 720, 1690, 880), BG_2, outline=GOOD, width=3)
            label(draw, (1510, 755), "RE-VERIFY", size=25, color=GOOD, bold=True, anchor="ma")
            label(draw, (1510, 810), "tests · contracts · diff", size=24, color=TEXT, anchor="ma")
    return image


def draw_contracts(chapter: Chapter, locale: str, scene: int, t: float) -> Image.Image:
    image, draw = base_frame(chapter, locale, scene, t)
    es = locale == "es"
    if scene == 0:
        request = "«Añade --json sin romper la API»" if es else "“Add --json without breaking the API”"
        node(draw, (350, 610), request, w=500, h=170, outline=WARN)
        arrow(draw, (610, 610), (760, 610), color=ACCENT)
        fields = [("OBJETIVO" if es else "GOAL", 870, 470), ("SCOPE", 1190, 470), ("ACEPTACIÓN" if es else "ACCEPTANCE", 870, 720), ("STOP RULES", 1190, 720)]
        for i, (name, x, y) in enumerate(fields):
            visible = t > .12 + i * .14
            node(draw, (x, y), name, w=270, h=115, outline=GOOD if visible else LINE, glow=visible)
        rounded(draw, (735, 365, 1340, 825), BG_2, outline=ACCENT, width=3)
        label(draw, (1035, 870), "TASK CONTRACT v1", size=29, color=ACCENT, bold=True, anchor="ma")
    elif scene == 1:
        pts = {"A": (300, 560), "B": (650, 440), "C": (650, 700), "D": (1030, 560), "E": (1430, 560)}
        edges = [("A","B"),("A","C"),("B","D"),("C","D"),("D","E")]
        for a, b in edges:
            arrow(draw, pts[a], pts[b], color=DIM, width=4)
        step = min(4, int(t * 5))
        for i, name in enumerate(["A","B","C","D","E"]):
            col = GOOD if i < step else ACCENT if i == step else LINE
            text = ["inspect" if not es else "inspeccionar", "edit", "tests", "checkpoint", "verify" if not es else "verificar"][i]
            node(draw, pts[name], text, w=230, h=105, outline=col, glow=i == step)
        if .48 < t < .7:
            status_chip(draw, (810, 820), "FAIL → REPLAN", BAD)
            arrow(draw, (1030, 615), (650, 755), color=BAD)
        elif t >= .7:
            status_chip(draw, (810, 820), "CHECKPOINT", GOOD)
    else:
        states = [("DONE", GOOD), ("RECOVER", BLUE), ("BLOCKED", BAD), ("ESCALATE", WARN)]
        xvals = [300, 730, 1160, 1590]
        active = min(3, int(t * 4))
        for i, ((name, col), x) in enumerate(zip(states, xvals)):
            node(draw, (x, 620), name, w=300, h=150, outline=col, glow=i == active)
        label(draw, (960, 430), "evidence + authority + freshness → next safe state", size=34, color=TEXT, bold=True, anchor="ma")
        arrow(draw, (960, 485), (xvals[active], 540), color=states[active][1])
        detail = ["acceptance complete", "new evidence can repair", "required proof unavailable", "owner decision required"][active]
        if es:
            detail = ["aceptación completa", "nueva evidencia puede reparar", "prueba requerida no disponible", "decisión del owner requerida"][active]
        label(draw, (xvals[active], 785), detail, size=25, color=MUTED, max_width=340, anchor="ma", align="center")
    return image


def draw_authority(chapter: Chapter, locale: str, scene: int, t: float) -> Image.Image:
    image, draw = base_frame(chapter, locale, scene, t)
    es = locale == "es"
    if scene == 0:
        names = ["Model intent", "Schema", "Policy", "Approval", "Sandbox", "Effect"]
        if es:
            names = ["Intención", "Schema", "Policy", "Approval", "Sandbox", "Efecto"]
        xs = [220, 510, 800, 1090, 1380, 1670]
        active = min(5, int(t * 6))
        for i, (name, x) in enumerate(zip(names, xs)):
            col = GOOD if i < active else ACCENT if i == active else LINE
            node(draw, (x, 620), name, w=220, h=105, outline=col, glow=i == active)
            if i < 5:
                arrow(draw, (x + 115, 620), (xs[i + 1] - 115, 620), color=GOOD if i < active else DIM, width=4)
        token(draw, (xs[active], 500), color=ACCENT)
        if .38 < t < .55:
            status_chip(draw, (690, 800), "DENY", BAD)
            label(draw, (960, 865), "policy can stop an unsafe proposal before effect" if not es else "la policy puede frenar una propuesta antes del efecto", size=27, color=BAD, anchor="ma")
        elif t > .72:
            status_chip(draw, (1490, 800), "AUTHORIZED EFFECT", GOOD)
    elif scene == 1:
        node(draw, (330, 610), "repo / issue\nuntrusted input" if not es else "repo / issue\ninput no confiable", w=390, h=160, outline=BAD)
        node(draw, (850, 610), "model", w=260, h=125, outline=WARN)
        node(draw, (1330, 610), "policy boundary", w=340, h=140, outline=ACCENT, glow=True)
        node(draw, (1680, 610), "prod capability", w=310, h=140, outline=DIM)
        arrow(draw, (530, 610), (715, 610), color=BAD)
        arrow(draw, (985, 610), (1155, 610), color=WARN)
        # Attempted privilege escalation visibly stops at the policy boundary.
        p = mix_point((990, 520), (1300, 520), phase(t, .15, .55))
        token(draw, p, color=BAD)
        if t > .55:
            draw.line((1280, 490, 1380, 590), fill=BAD, width=12)
            draw.line((1380, 490, 1280, 590), fill=BAD, width=12)
            status_chip(draw, (1240, 790), "DENY", BAD)
            label(draw, (960, 900), "Influence can cross context; authority does not have to." if not es else "La influencia puede cruzar el contexto; la autoridad no tiene por qué hacerlo.", size=30, color=TEXT, bold=True, anchor="ma")
    else:
        node(draw, (360, 610), "Model\n(no secret)", w=350, h=160, outline=BLUE)
        node(draw, (870, 440), "Secret vault", w=330, h=125, outline=PURPLE)
        node(draw, (870, 720), "Authorized tool", w=330, h=125, outline=ACCENT)
        node(draw, (1480, 610), "Provider", w=330, h=140, outline=GOOD)
        arrow(draw, (535, 610), (705, 700), color=BLUE)
        arrow(draw, (870, 505), (870, 655), color=PURPLE)
        arrow(draw, (1035, 720), (1310, 635), color=ACCENT)
        if t > .25:
            status_chip(draw, (760, 835), "scoped handle", PURPLE)
        if t > .62:
            status_chip(draw, (1380, 800), "expires", WARN)
        label(draw, (960, 920), "credential value stays outside model context" if not es else "el valor de la credencial queda fuera del contexto del modelo", size=29, color=TEXT, bold=True, anchor="ma")
    return image


def draw_verification(chapter: Chapter, locale: str, scene: int, t: float) -> Image.Image:
    image, draw = base_frame(chapter, locale, scene, t)
    es = locale == "es"
    if scene == 0:
        node(draw, (960, 490), "candidate h", w=360, h=125, outline=ACCENT_2, glow=True)
        checks = [(300,"criteria"), (630,"tests"), (960,"diff"), (1290,"policy"), (1620,"freshness")]
        if es:
            checks[0] = (300,"criterios")
            checks[4] = (1620,"freshness")
        passed = min(5, int(t * 6))
        for i, (x, name) in enumerate(checks):
            col = GOOD if i < passed else ACCENT if i == passed else LINE
            node(draw, (x, 720), name, w=250, h=110, outline=col, glow=i == passed)
            arrow(draw, (960, 555), (x, 660), color=DIM, width=3)
        result = "ACCEPTED" if passed >= 5 and t > .88 else "PENDING"
        status_chip(draw, (875, 880), result, GOOD if result == "ACCEPTED" else WARN)
    elif scene == 1:
        node(draw, (470, 520), "candidate h1", w=330, h=120, outline=GOOD)
        node(draw, (1450, 520), "candidate h2", w=330, h=120, outline=ACCENT_2, glow=t > .4)
        checks = ["tests", "diff", "policy"]
        for i, name in enumerate(checks):
            y = 700 + i * 85
            status_chip(draw, (330, y), f"{name}: PASS", GOOD)
            if t > .42:
                status_chip(draw, (1320, y), f"{name}: STALE", BAD)
        arrow(draw, (650, 520), (1270, 520), color=ACCENT_2)
        if t > .7:
            label(draw, (1450, 930), "re-run on h2" if not es else "re-ejecutar sobre h2", size=30, color=ACCENT, bold=True, anchor="ma")
            status_chip(draw, (1340, 850), "FRESH PASS", GOOD)
    else:
        pts = [(300, 600), (650, 600), (1000, 600), (1350, 600), (1650, 600)]
        names = ["Execute", "Verify", "Repair", "Re-verify", "Accept"]
        if es:
            names = ["Ejecutar", "Verificar", "Reparar", "Reverificar", "Aceptar"]
        active = min(4, int(t * 5))
        for i, (p, name) in enumerate(zip(pts, names)):
            node(draw, p, name, w=245, h=110, outline=GOOD if i < active else ACCENT if i == active else LINE, glow=i == active)
            if i < 4:
                arrow(draw, (p[0] + 125, p[1]), (pts[i+1][0] - 125, p[1]), color=GOOD if i < active else DIM, width=4)
        if .25 < t < .55:
            arrow(draw, (780, 670), (650, 760), color=BAD)
            status_chip(draw, (520, 785), "FAIL → repair" if not es else "FAIL → reparar", BAD)
        if t > .82:
            status_chip(draw, (1510, 790), "same SHA", GOOD)
    return image


def draw_long_running(chapter: Chapter, locale: str, scene: int, t: float) -> Image.Image:
    image, draw = base_frame(chapter, locale, scene, t)
    es = locale == "es"
    if scene == 0:
        x1, x2, y = 220, 1700, 650
        draw.line((x1, y, x2, y), fill=LINE, width=8)
        marks = [(300,"start"), (700,"checkpoint C7"), (1050,"crash"), (1450,"resume")]
        for x, name in marks:
            draw.line((x, y-30, x, y+30), fill=ACCENT_2 if "checkpoint" in name else TEXT, width=5)
            label(draw, (x, y+65), name, size=25, color=TEXT, anchor="ma")
        token(draw, (lerp(x1, x2, t), y), color=ACCENT)
        rounded(draw, (520, 390, 880, 520), BG_2, outline=GOOD)
        label(draw, (700, 425), "durable state", size=26, color=GOOD, bold=True, anchor="ma")
        label(draw, (700, 470), "candidate · evidence · next", size=22, color=MUTED, anchor="ma")
        if t > .55:
            draw.line((1010, 550, 1090, 750), fill=BAD, width=10)
            status_chip(draw, (980, 420), "PROCESS LOST", BAD)
        if t > .72:
            arrow(draw, (880, 455), (1370, 560), color=GOOD)
            status_chip(draw, (1370, 430), "RECOVER", GOOD)
    elif scene == 1:
        node(draw, (960, 430), "orchestrator", w=360, h=125, outline=ACCENT_2, glow=True)
        workers = [(430,"W1 · API", BLUE), (960,"W2 · migration", PURPLE), (1490,"W3 · docs", ACCENT)]
        for x, name, col in workers:
            node(draw, (x, 690), name, w=350, h=125, outline=col, glow=t > .2)
            arrow(draw, (960, 495), (x, 625), color=col, width=4)
            if t > .5:
                arrow(draw, (x, 755), (960, 880), color=col, width=4)
        if t > .5:
            rounded(draw, (735, 835, 1185, 965), BG_2, outline=GOOD)
            label(draw, (960, 865), "fan-in evidence bundle", size=25, color=GOOD, bold=True, anchor="ma")
            label(draw, (960, 910), "candidate SHA · checks · blockers", size=22, color=MUTED, anchor="ma")
    else:
        node(draw, (260, 540), "base A", w=210, h=100)
        node(draw, (620, 420), "W1", w=180, h=90, outline=BLUE)
        node(draw, (620, 540), "W2", w=180, h=90, outline=PURPLE)
        node(draw, (620, 660), "W3", w=180, h=90, outline=ACCENT)
        node(draw, (1000, 540), "target B", w=250, h=105, outline=ACCENT_2, glow=t > .15)
        node(draw, (1390, 540), "integrated I9", w=300, h=115, outline=GOOD, glow=t > .45)
        node(draw, (1690, 740), "MERGE", w=240, h=100, outline=GOOD, glow=t > .82)
        arrow(draw, (370, 540), (520, 540), color=DIM)
        for y, col in [(420,BLUE),(540,PURPLE),(660,ACCENT)]:
            arrow(draw, (710, y), (1240, 520 + (y-540)//5), color=col, width=4)
        arrow(draw, (1125, 540), (1240, 540), color=ACCENT_2)
        if t > .48:
            status_chip(draw, (1170, 755), "old evidence → STALE", BAD)
        if t > .66:
            status_chip(draw, (1320, 820), "re-verify I9", GOOD)
            arrow(draw, (1510, 590), (1650, 690), color=GOOD)
    return image


DRAWERS: tuple[Callable[[Chapter, str, int, float], Image.Image], ...] = (
    draw_harness,
    draw_isolation,
    draw_contracts,
    draw_authority,
    draw_verification,
    draw_long_running,
)


def encode_video(frame_dir: Path, output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    result = subprocess.run(
        [
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-framerate", str(FPS),
            "-i", str(frame_dir / "frame-%04d.jpg"),
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "24",
            "-pix_fmt", "yuv420p",
            "-r", "24",
            "-t", str(DURATION_SECONDS),
            "-movflags", "+faststart",
            "-an",
            str(output),
        ],
        check=False,
        capture_output=True,
        text=True,
    )
    if result.returncode:
        raise RuntimeError(f"ffmpeg failed for {output}: {result.stderr.strip() or result.stdout.strip()}")


def render_video(chapter_index: int, chapter: Chapter, locale: str, output_root: Path, tmp_root: Path) -> None:
    frame_dir = tmp_root / f"{locale}-{Path(chapter.filename).stem}"
    frame_dir.mkdir(parents=True, exist_ok=True)
    drawer = DRAWERS[chapter_index]
    poster_image: Image.Image | None = None
    for frame_index in range(TOTAL_FRAMES):
        seconds = frame_index / FPS
        scene = min(2, int(seconds // SCENE_SECONDS))
        local_t = (seconds - scene * SCENE_SECONDS) / SCENE_SECONDS
        image = drawer(chapter, locale, scene, local_t)
        if poster_image is None:
            poster_image = image.copy()
        image.save(frame_dir / f"frame-{frame_index:04d}.jpg", format="JPEG", quality=88, optimize=True)
    slug = Path(chapter.filename).stem
    assert poster_image is not None
    poster_image.save(output_root / f"{slug}.jpg", format="JPEG", quality=92, optimize=True, progressive=True)
    encode_video(frame_dir, output_root / f"{slug}.mp4")


def q(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def es_media_block(chapter: Chapter) -> str:
    slug = Path(chapter.filename).stem
    return (
        f"video: {slug}.mp4\n"
        f"video_poster: {slug}.jpg\n"
        f"video_title: {q(chapter.title_es)}\n"
        f"video_summary: {q(chapter.summary_es)}\n"
        "video_duration: PT36S\n"
        "video_chapters:\n"
        f"- name: {q(chapter.moments_es[0])}\n  start: 0\n  end: 12\n"
        f"- name: {q(chapter.moments_es[1])}\n  start: 12\n  end: 24\n"
        f"- name: {q(chapter.moments_es[2])}\n  start: 24\n  end: 36\n"
    )


def patch_spanish_frontmatter(path: Path, chapter: Chapter) -> None:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        raise RuntimeError(f"frontmatter missing: {path}")
    head_end = text.find("\n---\n", 4)
    if head_end < 0:
        raise RuntimeError(f"frontmatter terminator missing: {path}")
    head = text[:head_end]
    if "\nvideo:" in head:
        return
    path.write_text(text[:head_end] + "\n" + es_media_block(chapter).rstrip() + text[head_end:], encoding="utf-8")


def append_english_media(path: Path, chapters: Iterable[Chapter]) -> None:
    existing = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    if not isinstance(existing, dict):
        raise RuntimeError(f"media mapping invalid: {path}")
    blocks: list[str] = []
    for chapter in chapters:
        key = f"series/{SERIES}/{chapter.filename}"
        if key in existing:
            continue
        slug = Path(chapter.filename).stem
        block = (
            f"\n{key}:\n"
            f"  video: {slug}.mp4\n"
            f"  video_poster: {slug}.jpg\n"
            f"  video_title: {q(chapter.title_en)}\n"
            f"  video_summary: {q(chapter.summary_en)}\n"
            "  video_duration: PT36S\n"
            "  video_chapters:\n"
            f"    - name: {q(chapter.moments_en[0])}\n      start: 0\n      end: 12\n"
            f"    - name: {q(chapter.moments_en[1])}\n      start: 12\n      end: 24\n"
            f"    - name: {q(chapter.moments_en[2])}\n      start: 24\n      end: 36\n"
        )
        blocks.append(block)
    if blocks:
        path.write_text(path.read_text(encoding="utf-8").rstrip() + "\n" + "".join(blocks), encoding="utf-8")


def generate(root: Path) -> None:
    es_root = root / "docs" / "series" / SERIES
    en_root = root / "locales" / "en" / "series" / SERIES
    media_path = root / "locales" / "en" / "media.yml"
    for required in (es_root, en_root, media_path):
        if not required.exists():
            raise RuntimeError(f"required path missing: {required}")

    with tempfile.TemporaryDirectory(prefix="coding-video-frames-") as tmp:
        tmp_root = Path(tmp)
        for index, chapter in enumerate(CHAPTERS):
            render_video(index, chapter, "es", es_root, tmp_root)
            render_video(index, chapter, "en", en_root, tmp_root)
            patch_spanish_frontmatter(es_root / chapter.filename, chapter)
    append_english_media(media_path, CHAPTERS)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT)
    args = parser.parse_args()
    generate(args.root.resolve())
    print(f"Generated {len(CHAPTERS) * 2} mechanism-first silent native videos + posters for {SERIES}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
