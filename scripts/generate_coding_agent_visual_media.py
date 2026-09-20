#!/usr/bin/env python3
"""Generate mobile-safe, silent, locale-native mechanism videos for Coding Agents.

VOICE is intentionally out of scope: this generator creates no narration, audio,
captions, transcript, or narration-derived timings. The visual contract is built
for the real ~356x200 CSS-pixel inline mobile player: all material mechanism text
projects to >=12 CSS px and the lower ~52 CSS px are kept free of material content
so native playback controls cannot hide the explanation.
"""
from __future__ import annotations

import argparse
import json
import math
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import yaml
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SERIES = "coding-agents-agent-harnesses"
W, H = 1920, 1080
DURATION_SECONDS = 36
SCENE_SECONDS = 12
FPS = 6
TOTAL_FRAMES = DURATION_SECONDS * FPS

# Real inline mobile playback geometry observed in GOLDEN QA.
MOBILE_INLINE_WIDTH = 356
MOBILE_INLINE_HEIGHT = 200
MOBILE_SCALE = MOBILE_INLINE_WIDTH / W
MIN_MATERIAL_SOURCE_PX = 68
MIN_MATERIAL_PROJECTED_CSS_PX = MIN_MATERIAL_SOURCE_PX * MOBILE_SCALE
SAFE_ZONE_START_Y = 800
RESERVED_CONTROL_SOURCE_PX = H - SAFE_ZONE_START_Y
RESERVED_CONTROL_PROJECTED_CSS_PX = RESERVED_CONTROL_SOURCE_PX * MOBILE_SCALE

BG = "#101719"
BG_2 = "#121D20"
PANEL = "#18262A"
PANEL_2 = "#203338"
TEXT = "#F4F0E7"
MUTED = "#A8B6B9"
DIM = "#60767C"
ACCENT = "#79D2B6"
ACCENT_2 = "#D8B76B"
GOOD = "#7BD6A4"
WARN = "#E3BB65"
BAD = "#E8897D"
BLUE = "#79AEE8"
PURPLE = "#AD96E6"
LINE = "#496067"

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

# Concise, material labels. Every one is rendered at >= MIN_MATERIAL_SOURCE_PX.
FLOWS = {
    0: {
        "es": (("flow", ("Modelo\npropone", "Harness\nvalida", "Workspace\nefecto")), ("loop", ("Observación", "Modelo + estado", "Nueva acción")), ("gates", ("Permiso", "Verificador", "DONE"))),
        "en": (("flow", ("Model\nproposes", "Harness\nvalidates", "Workspace\neffect")), ("loop", ("Observation", "Model + state", "Next action")), ("gates", ("Permission", "Verifier", "DONE"))),
    },
    1: {
        "es": (("split", ("Repo base", "Worktree T1", "Worktree T2")), ("split", ("Sandbox", "Recursos T1", "Recursos T2")), ("flow", ("Target actual", "Integrar patches", "Revalidar"))),
        "en": (("split", ("Base repo", "Worktree T1", "Worktree T2")), ("split", ("Sandbox", "T1 resources", "T2 resources")), ("flow", ("Current target", "Integrate patches", "Re-verify"))),
    },
    2: {
        "es": (("flow", ("Petición", "Contrato\nobservable", "Criterios PASS")), ("loop", ("Plan", "Evidencia", "Checkpoint")), ("branch", ("PASS", "RECUPERAR", "ESCALAR"))),
        "en": (("flow", ("Request", "Observable\ncontract", "PASS criteria")), ("loop", ("Plan", "Evidence", "Checkpoint")), ("branch", ("PASS", "RECOVER", "ESCALATE"))),
    },
    3: {
        "es": (("gates", ("Tool call", "Policy", "Efecto")), ("flow", ("Input no fiable", "Capacidad limitada", "Sandbox")), ("flow", ("Secret ref", "Inyección runtime", "Tool"))),
        "en": (("gates", ("Tool call", "Policy", "Effect")), ("flow", ("Untrusted input", "Bounded capability", "Sandbox")), ("flow", ("Secret ref", "Runtime injection", "Tool"))),
    },
    4: {
        "es": (("merge", ("Tests", "Diff", "Contrato")), ("flow", ("Candidate SHA", "Evidencia fresca", "Accept?")), ("loop", ("Fallo", "Reparar", "Revalidar"))),
        "en": (("merge", ("Tests", "Diff", "Contract")), ("flow", ("Candidate SHA", "Fresh evidence", "Accept?")), ("loop", ("Failure", "Repair", "Re-verify"))),
    },
    5: {
        "es": (("recovery", ("Checkpoint", "Proceso perdido", "RECOVER")), ("fanout", ("Orchestrator", "Workers", "Evidence bundle")), ("flow", ("Target B", "Integrate I9", "Re-verify"))),
        "en": (("recovery", ("Checkpoint", "Process lost", "RECOVER")), ("fanout", ("Orchestrator", "Workers", "Evidence bundle")), ("flow", ("Target B", "Integrate I9", "Re-verify"))),
    },
}


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    path = FONT_BOLD if bold else FONT_REGULAR
    if not path.is_file():
        raise RuntimeError(f"required font not found: {path}")
    return ImageFont.truetype(str(path), size=size)


def clamp01(v: float) -> float:
    return max(0.0, min(1.0, v))


def smooth(v: float) -> float:
    v = clamp01(v)
    return v * v * (3.0 - 2.0 * v)


def wrap(draw: ImageDraw.ImageDraw, value: str, fnt: ImageFont.FreeTypeFont, width: int) -> str:
    lines: list[str] = []
    for paragraph in value.split("\n"):
        words = paragraph.split()
        current = ""
        for word in words:
            candidate = f"{current} {word}".strip()
            box = draw.textbbox((0, 0), candidate, font=fnt)
            if current and box[2] - box[0] > width:
                lines.append(current)
                current = word
            else:
                current = candidate
        if current:
            lines.append(current)
    return "\n".join(lines)


def text(draw: ImageDraw.ImageDraw, xy: tuple[int, int], value: str, *, size: int, color: str = TEXT, bold: bool = False, max_width: int | None = None, anchor: str = "la", align: str = "left") -> None:
    fnt = font(size, bold)
    value = wrap(draw, value, fnt, max_width) if max_width else value
    draw.multiline_text(xy, value, font=fnt, fill=color, spacing=max(8, size // 6), anchor=anchor, align=align)


def rounded(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], fill: str, outline: str, width: int = 4, radius: int = 30) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def node(draw: ImageDraw.ImageDraw, center: tuple[int, int], value: str, *, outline: str = LINE, active: bool = False, w: int = 440, h: int = 190) -> None:
    x, y = center
    box = (x - w // 2, y - h // 2, x + w // 2, y + h // 2)
    if active:
        draw.rounded_rectangle((box[0] - 8, box[1] - 8, box[2] + 8, box[3] + 8), radius=36, outline=ACCENT, width=6)
    rounded(draw, box, PANEL_2 if active else PANEL, outline if not active else ACCENT, 5 if active else 4)
    text(draw, center, value, size=72, color=TEXT, bold=True, max_width=w - 44, anchor="mm", align="center")


def arrow(draw: ImageDraw.ImageDraw, start: tuple[int, int], end: tuple[int, int], *, color: str = ACCENT, width: int = 10) -> None:
    draw.line((*start, *end), fill=color, width=width)
    angle = math.atan2(end[1] - start[1], end[0] - start[0])
    size = 34
    p1 = end
    p2 = (end[0] - size * math.cos(angle - .55), end[1] - size * math.sin(angle - .55))
    p3 = (end[0] - size * math.cos(angle + .55), end[1] - size * math.sin(angle + .55))
    draw.polygon((p1, p2, p3), fill=color)


def token(draw: ImageDraw.ImageDraw, a: tuple[int, int], b: tuple[int, int], t: float, color: str = ACCENT_2) -> None:
    t = smooth(t)
    x = a[0] + (b[0] - a[0]) * t
    y = a[1] + (b[1] - a[1]) * t
    r = 24
    draw.ellipse((x - r - 8, y - r - 8, x + r + 8, y + r + 8), outline=color, width=5)
    draw.ellipse((x - r, y - r, x + r, y + r), fill=color)


def base_frame(chapter: Chapter, locale: str, scene: int, local_t: float) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(image)
    title = chapter.title_es if locale == "es" else chapter.title_en
    moment = (chapter.moments_es if locale == "es" else chapter.moments_en)[scene]
    draw.rectangle((0, 0, W, 12), fill=ACCENT)
    text(draw, (90, 62), "5SIGMAS · CODING AGENTS", size=52, color=ACCENT, bold=True)
    text(draw, (90, 132), title, size=68, bold=True, max_width=1600)
    text(draw, (90, 265), f"{scene + 1:02d}  {moment}", size=72, color=ACCENT_2, bold=True, max_width=1700)
    text(draw, (1810, 70), locale.upper(), size=52, color=MUTED, bold=True, anchor="ra")
    # Keep the lower ~52 mobile CSS pixels free of material content for native controls.
    draw.rectangle((0, SAFE_ZONE_START_Y, W, H), fill=BG_2)
    x1, x2, y = 90, 1830, 1020
    draw.line((x1, y, x2, y), fill="#2B3D42", width=12)
    draw.line((x1, y, int(x1 + (x2 - x1) * clamp01(local_t)), y), fill=ACCENT, width=12)
    return image, draw


def draw_flow(draw: ImageDraw.ImageDraw, labels: tuple[str, str, str], t: float) -> None:
    pts = ((330, 610), (960, 610), (1590, 610))
    active = min(2, int(clamp01(t) * 3))
    for i, (p, value) in enumerate(zip(pts, labels)):
        node(draw, p, value, outline=(BLUE, ACCENT_2, GOOD)[i], active=i == active)
    arrow(draw, (555, 610), (735, 610), color=BLUE)
    arrow(draw, (1185, 610), (1365, 610), color=GOOD)
    seg = min(1, int(clamp01(t) * 2))
    local = clamp01(t * 2 - seg)
    token(draw, ((555, 610), (1185, 610))[seg], ((735, 610), (1365, 610))[seg], local)


def draw_loop(draw: ImageDraw.ImageDraw, labels: tuple[str, str, str], t: float) -> None:
    pts = ((480, 570), (960, 670), (1440, 570))
    active = int(t * 3) % 3
    for i, (p, value) in enumerate(zip(pts, labels)):
        node(draw, p, value, outline=(BLUE, ACCENT_2, GOOD)[i], active=i == active, w=400, h=180)
    arrow(draw, (680, 590), (760, 640), color=BLUE)
    arrow(draw, (1160, 640), (1240, 590), color=GOOD)
    arrow(draw, (1310, 470), (610, 470), color=ACCENT_2)
    edges = (((680, 590), (760, 640)), ((1160, 640), (1240, 590)), ((1310, 470), (610, 470)))
    token(draw, *edges[active], (t * 3) % 1)


def draw_split(draw: ImageDraw.ImageDraw, labels: tuple[str, str, str], t: float) -> None:
    top = (960, 465)
    left, right = (460, 680), (1460, 680)
    node(draw, top, labels[0], outline=ACCENT_2, active=t < .35, w=500, h=180)
    node(draw, left, labels[1], outline=BLUE, active=.3 < t < .75, w=450, h=180)
    node(draw, right, labels[2], outline=PURPLE, active=t > .55, w=450, h=180)
    arrow(draw, (820, 545), (610, 595), color=BLUE)
    arrow(draw, (1100, 545), (1310, 595), color=PURPLE)
    if t > .25:
        token(draw, (820, 545), (610, 595), min(1, (t - .25) / .4), BLUE)
    if t > .45:
        token(draw, (1100, 545), (1310, 595), min(1, (t - .45) / .4), PURPLE)


def draw_branch(draw: ImageDraw.ImageDraw, labels: tuple[str, str, str], t: float) -> None:
    text(draw, (960, 410), "RESULT", size=72, color=ACCENT_2, bold=True, anchor="ma")
    pts = ((350, 650), (960, 650), (1570, 650))
    colors = (GOOD, WARN, BAD)
    for i, (p, value) in enumerate(zip(pts, labels)):
        node(draw, p, value, outline=colors[i], active=i == min(2, int(t * 3)), w=430, h=190)
    arrow(draw, (960, 470), (350, 545), color=GOOD)
    arrow(draw, (960, 470), (960, 545), color=WARN)
    arrow(draw, (960, 470), (1570, 545), color=BAD)


def draw_gates(draw: ImageDraw.ImageDraw, labels: tuple[str, str, str], t: float) -> None:
    pts = ((330, 610), (960, 610), (1590, 610))
    for i, (p, value) in enumerate(zip(pts, labels)):
        passed = t > (i + 1) * .22
        node(draw, p, value, outline=GOOD if passed else WARN, active=passed, w=430, h=190)
        if i < 2:
            arrow(draw, (555 if i == 0 else 1185, 610), (735 if i == 0 else 1365, 610), color=GOOD if passed else DIM)


def draw_merge(draw: ImageDraw.ImageDraw, labels: tuple[str, str, str], t: float) -> None:
    left, right, center = (430, 560), (430, 720), (1050, 640)
    node(draw, left, labels[0], outline=BLUE, active=t > .15, w=420, h=150)
    node(draw, right, labels[1], outline=PURPLE, active=t > .3, w=420, h=150)
    node(draw, center, labels[2], outline=ACCENT_2, active=t > .5, w=430, h=190)
    rounded(draw, (1430, 545, 1770, 735), PANEL, GOOD, 5)
    text(draw, (1600, 640), "JOINT\nEVIDENCE", size=68, color=GOOD, bold=True, anchor="mm", align="center")
    arrow(draw, (645, 575), (835, 610), color=BLUE)
    arrow(draw, (645, 705), (835, 670), color=PURPLE)
    arrow(draw, (1270, 640), (1420, 640), color=GOOD)


def draw_recovery(draw: ImageDraw.ImageDraw, labels: tuple[str, str, str], t: float) -> None:
    draw_flow(draw, labels, t)
    if t > .45:
        draw.line((900, 510, 1020, 710), fill=BAD, width=20)
        draw.line((1020, 510, 900, 710), fill=BAD, width=20)


def draw_fanout(draw: ImageDraw.ImageDraw, labels: tuple[str, str, str], t: float) -> None:
    top, left, right, evidence = (960, 420), (470, 640), (1450, 640), (960, 690)
    node(draw, top, labels[0], outline=ACCENT_2, active=True, w=520, h=170)
    node(draw, left, "W1", outline=BLUE, active=t > .15, w=300, h=150)
    node(draw, right, "W2", outline=PURPLE, active=t > .30, w=300, h=150)
    node(draw, evidence, labels[2], outline=GOOD, active=t > .55, w=500, h=170)
    arrow(draw, (850, 505), (590, 565), color=BLUE)
    arrow(draw, (1070, 505), (1330, 565), color=PURPLE)
    if t > .45:
        arrow(draw, (625, 675), (710, 690), color=BLUE)
        arrow(draw, (1295, 675), (1210, 690), color=PURPLE)


def render_scene(chapter_index: int, chapter: Chapter, locale: str, scene: int, t: float) -> Image.Image:
    image, draw = base_frame(chapter, locale, scene, t)
    mode, labels = FLOWS[chapter_index][locale][scene]
    if mode == "flow":
        draw_flow(draw, labels, t)
    elif mode == "loop":
        draw_loop(draw, labels, t)
    elif mode == "split":
        draw_split(draw, labels, t)
    elif mode == "branch":
        draw_branch(draw, labels, t)
    elif mode == "gates":
        draw_gates(draw, labels, t)
    elif mode == "merge":
        draw_merge(draw, labels, t)
    elif mode == "recovery":
        draw_recovery(draw, labels, t)
    elif mode == "fanout":
        draw_fanout(draw, labels, t)
    else:
        raise RuntimeError(f"unknown mode: {mode}")
    return image


def assert_mobile_safe_contract() -> dict[str, float | int | bool]:
    if MIN_MATERIAL_SOURCE_PX < 68:
        raise RuntimeError("material source typography below mobile-safe floor")
    if MIN_MATERIAL_PROJECTED_CSS_PX < 12.0:
        raise RuntimeError("projected material typography below 12 CSS px")
    if SAFE_ZONE_START_Y > 800:
        raise RuntimeError("controls-safe zone starts too low")
    if RESERVED_CONTROL_PROJECTED_CSS_PX < 50:
        raise RuntimeError("reserved native-controls zone below 50 CSS px")
    return {
        "mobile_inline_width_css_px": MOBILE_INLINE_WIDTH,
        "mobile_inline_height_css_px": MOBILE_INLINE_HEIGHT,
        "min_material_source_px": MIN_MATERIAL_SOURCE_PX,
        "min_material_projected_css_px": round(MIN_MATERIAL_PROJECTED_CSS_PX, 2),
        "safe_zone_start_source_y": SAFE_ZONE_START_Y,
        "reserved_control_source_px": RESERVED_CONTROL_SOURCE_PX,
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
        raise RuntimeError(f"ffmpeg failed for {output}: {result.stderr.strip() or result.stdout.strip()}")


def render_video(chapter_index: int, chapter: Chapter, locale: str, output_root: Path, tmp_root: Path) -> None:
    frame_dir = tmp_root / f"{locale}-{Path(chapter.filename).stem}"
    frame_dir.mkdir(parents=True, exist_ok=True)
    poster: Image.Image | None = None
    for frame_index in range(TOTAL_FRAMES):
        seconds = frame_index / FPS
        scene = min(2, int(seconds // SCENE_SECONDS))
        local_t = (seconds - scene * SCENE_SECONDS) / SCENE_SECONDS
        image = render_scene(chapter_index, chapter, locale, scene, local_t)
        if poster is None:
            poster = image.copy()
        image.save(frame_dir / f"frame-{frame_index:04d}.jpg", format="JPEG", quality=88, optimize=True)
    slug = Path(chapter.filename).stem
    assert poster is not None
    poster.save(output_root / f"{slug}.jpg", format="JPEG", quality=92, optimize=True, progressive=True)
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
    raw = path.read_text(encoding="utf-8")
    if not raw.startswith("---\n"):
        raise RuntimeError(f"frontmatter missing: {path}")
    end = raw.find("\n---\n", 4)
    if end < 0:
        raise RuntimeError(f"frontmatter terminator missing: {path}")
    if "\nvideo:" in raw[:end]:
        return
    path.write_text(raw[:end] + "\n" + es_media_block(chapter).rstrip() + raw[end:], encoding="utf-8")


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
        blocks.append(
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
    if blocks:
        path.write_text(path.read_text(encoding="utf-8").rstrip() + "\n" + "".join(blocks), encoding="utf-8")


def generate(root: Path) -> None:
    contract = assert_mobile_safe_contract()
    report = root / "artifacts" / "coding-requalification" / "mobile-safe-video-contract.json"
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text(json.dumps(contract, indent=2) + "\n", encoding="utf-8")
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
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    contract = assert_mobile_safe_contract()
    if args.self_test:
        print(json.dumps(contract, indent=2))
        return 0
    generate(args.root.resolve())
    print(f"Generated {len(CHAPTERS) * 2} mobile-safe mechanism-first silent native videos + posters for {SERIES}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
