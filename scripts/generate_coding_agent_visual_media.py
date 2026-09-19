#!/usr/bin/env python3
"""Generate silent, locale-native visual teaching videos for Coding Agents.

This is deliberately visual-only. It does not create narration, captions,
transcripts, or narration-derived timings. Those remain owner-local voice work.
The generated media teaches three chapter mechanisms per article with a shared
series visual system and locale-native ES/EN labels.
"""
from __future__ import annotations

import argparse
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
FPS = 24

# One coherent palette for the whole series/block.
BG = "#111719"
PANEL = "#172125"
PANEL_2 = "#1C292E"
TEXT = "#F3F0E8"
MUTED = "#A9B5B8"
ACCENT = "#7FD1B9"
ACCENT_2 = "#D7B56D"
LINE = "#5B7178"

FONT_REGULAR = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
FONT_BOLD = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")


@dataclass(frozen=True)
class Scene:
    eyebrow: str
    headline: str
    nodes: tuple[str, ...]
    caption: str


@dataclass(frozen=True)
class Chapter:
    filename: str
    video_title_es: str
    video_title_en: str
    summary_es: str
    summary_en: str
    scenes_es: tuple[Scene, Scene, Scene]
    scenes_en: tuple[Scene, Scene, Scene]


CHAPTERS: tuple[Chapter, ...] = (
    Chapter(
        "01-que-es-agent-harness.md",
        "Qué añade un agent harness al modelo",
        "What an agent harness adds to the model",
        "El harness convierte propuestas del modelo en un bucle operativo con política, tools, estado y observaciones reales.",
        "The harness turns model proposals into an operating loop with policy, tools, state, and real observations.",
        (
            Scene("01 · FRONTERA", "El modelo propone; el harness ejecuta", ("Modelo", "Tool call", "Harness", "Workspace"), "La capacidad de actuar vive fuera del modelo: el runtime aplica política y produce efectos reales."),
            Scene("02 · BUCLE", "Cada acción cambia la siguiente observación", ("Contexto", "Modelo", "Política + tool", "Observación"), "El harness mantiene continuidad causal: el resultado de una acción vuelve al siguiente turno."),
            Scene("03 · CONTROL", "La autonomía útil necesita límites externos", ("Permisos", "Estado", "Verificación", "Stop condition"), "La calidad del agente depende tanto del control del harness como de la capacidad del modelo."),
        ),
        (
            Scene("01 · BOUNDARY", "The model proposes; the harness executes", ("Model", "Tool call", "Harness", "Workspace"), "The ability to act lives outside the model: the runtime applies policy and creates real effects."),
            Scene("02 · LOOP", "Every action changes the next observation", ("Context", "Model", "Policy + tool", "Observation"), "The harness preserves causal continuity: each action result becomes evidence for the next turn."),
            Scene("03 · CONTROL", "Useful autonomy needs external boundaries", ("Permissions", "State", "Verification", "Stop condition"), "Agent quality depends on harness control as much as on model capability."),
        ),
    ),
    Chapter(
        "02-contexto-workspace-sandboxing-aislamiento.md",
        "Workspace, worktrees y sandboxing",
        "Workspace, worktrees, and sandboxing",
        "El aislamiento separa la realidad de cada tarea: estado Git, filesystem, procesos y red no son la misma frontera.",
        "Isolation separates each task's reality: Git state, filesystem, processes, and network are distinct boundaries.",
        (
            Scene("01 · REALIDAD", "Un workspace define qué estado puede observar el agente", ("Repositorio", "Worktree", "Cambios de tarea"), "Dos tareas sobre el mismo repositorio no deberían competir por el mismo estado mutable."),
            Scene("02 · AISLAMIENTO", "Cada tarea necesita su propia superficie mutable", ("Tarea A\nworktree A", "Sandbox A", "Tarea B\nworktree B", "Sandbox B"), "Worktrees separan estado Git; sandboxes pueden limitar filesystem, procesos y red."),
            Scene("03 · LÍMITES", "Sandboxing no sustituye autorización", ("Filesystem", "Procesos", "Red", "Credenciales"), "Aislar ejecución reduce alcance, pero permisos y secretos siguen necesitando políticas explícitas."),
        ),
        (
            Scene("01 · REALITY", "A workspace defines the state the agent can observe", ("Repository", "Worktree", "Task changes"), "Two tasks over one repository should not compete for the same mutable state."),
            Scene("02 · ISOLATION", "Each task needs its own mutable surface", ("Task A\nworktree A", "Sandbox A", "Task B\nworktree B", "Sandbox B"), "Worktrees isolate Git state; sandboxes can constrain filesystem, processes, and network."),
            Scene("03 · BOUNDARIES", "Sandboxing does not replace authorization", ("Filesystem", "Processes", "Network", "Credentials"), "Execution isolation reduces blast radius, but permissions and secrets still need explicit policy."),
        ),
    ),
    Chapter(
        "03-specs-planificacion-task-decomposition-checkpoints.md",
        "Specs, planes, checkpoints y stop conditions",
        "Specs, plans, checkpoints, and stop conditions",
        "Un contrato de tarea convierte un objetivo ambiguo en invariantes, pasos verificables, checkpoints y condiciones de parada.",
        "A task contract turns an ambiguous goal into invariants, verifiable steps, checkpoints, and stopping conditions.",
        (
            Scene("01 · CONTRATO", "La spec define qué significa terminar", ("Objetivo", "Invariantes", "Evidencia"), "Una tarea agentic necesita criterios observables, no sólo una instrucción abierta."),
            Scene("02 · PLAN", "Planificar sirve si cada paso produce evidencia", ("Plan", "Acción", "Verificación", "Checkpoint"), "El checkpoint permite replanificar desde estado conocido en vez de continuar sobre supuestos rotos."),
            Scene("03 · PARADA", "Terminar, recuperar o escalar son estados distintos", ("PASS", "RECUPERAR", "BLOQUEADO", "ESCALAR"), "Las stop conditions evitan loops infinitos y entregas que sólo parecen completas."),
        ),
        (
            Scene("01 · CONTRACT", "The spec defines what done means", ("Goal", "Invariants", "Evidence"), "An agentic task needs observable acceptance criteria, not only an open-ended instruction."),
            Scene("02 · PLAN", "Planning matters when every step creates evidence", ("Plan", "Action", "Verification", "Checkpoint"), "A checkpoint enables replanning from known state instead of continuing on broken assumptions."),
            Scene("03 · STOP", "Finish, recover, block, and escalate are distinct states", ("PASS", "RECOVER", "BLOCKED", "ESCALATE"), "Stopping conditions prevent infinite loops and deliveries that only look complete."),
        ),
    ),
    Chapter(
        "04-tools-permisos-approvals-hooks-secretos-trust-boundaries.md",
        "Tools, permisos, approvals y trust boundaries",
        "Tools, permissions, approvals, and trust boundaries",
        "Una tool call cruza varias fronteras: intención del modelo, política, aprobación, capacidad y efecto real.",
        "A tool call crosses several boundaries: model intent, policy, approval, capability, and real-world effect.",
        (
            Scene("01 · AUTORIZACIÓN", "Una tool call no equivale a permiso", ("Intención", "Política", "Approval", "Ejecución"), "El harness debe decidir fuera del prompt qué acciones pueden producir efectos."),
            Scene("02 · CONFIANZA", "Contenido no confiable no debe ganar capacidades", ("Input no confiable", "Frontera de política", "Capacidad limitada"), "Separar lectura de autorización evita que una instrucción embebida se convierta en acción."),
            Scene("03 · SECRETOS", "Los secretos pertenecen al runtime, no al contexto", ("Modelo", "Handle temporal", "Tool autorizada", "Proveedor"), "Inyectar credenciales en contexto amplía exposición; los hooks pueden reforzar controles fuera del modelo."),
        ),
        (
            Scene("01 · AUTHORIZATION", "A tool call is not permission", ("Intent", "Policy", "Approval", "Execution"), "The harness must decide outside the prompt which actions are allowed to create effects."),
            Scene("02 · TRUST", "Untrusted content must not acquire capabilities", ("Untrusted input", "Policy boundary", "Limited capability"), "Separating reading from authorization prevents embedded instructions from becoming actions."),
            Scene("03 · SECRETS", "Secrets belong in the runtime, not the context", ("Model", "Temporary handle", "Authorized tool", "Provider"), "Putting credentials in context expands exposure; hooks can enforce controls outside the model."),
        ),
    ),
    Chapter(
        "05-tests-verifiers-review-diffs-stop-conditions-evaluacion.md",
        "Tests, verifiers y revisión de diffs",
        "Tests, verifiers, and diff review",
        "La aceptación combina evidencia independiente: tests, verifier, diff, política y checks finales antes de declarar éxito.",
        "Acceptance combines independent evidence: tests, verifier, diff, policy, and final checks before declaring success.",
        (
            Scene("01 · EVIDENCIA", "Un test verde no demuestra toda la tarea", ("Tests", "Verifier", "Diff review", "Política"), "Cada señal cubre una clase de fallo diferente; ninguna sustituye a las demás."),
            Scene("02 · ACEPTACIÓN", "El resultado se acepta por conjunción de evidencia", ("Código correcto", "Tests", "Diff", "Restricciones"), "La entrega sólo avanza cuando las condiciones requeridas coinciden sobre la misma revisión."),
            Scene("03 · CONTROL", "Fallo verificable → reparar; bloqueo real → escalar", ("Ejecutar", "Verificar", "Reparar", "Cerrar / escalar"), "El harness necesita una política explícita para reintentos, stop conditions y handoff humano."),
        ),
        (
            Scene("01 · EVIDENCE", "A green test does not prove the whole task", ("Tests", "Verifier", "Diff review", "Policy"), "Each signal covers a different failure class; none substitutes for the others."),
            Scene("02 · ACCEPTANCE", "The result is accepted by conjunction of evidence", ("Correct code", "Tests", "Diff", "Constraints"), "Delivery advances only when the required conditions agree on the same revision."),
            Scene("03 · CONTROL", "Verifiable failure → repair; real block → escalate", ("Execute", "Verify", "Repair", "Close / escalate"), "The harness needs explicit policy for retries, stop conditions, and human handoff."),
        ),
    ),
    Chapter(
        "06-tareas-largas-memoria-subagentes-recuperacion-merge-observabilidad.md",
        "Tareas largas, subagentes, recuperación y observabilidad",
        "Long-running tasks, subagents, recovery, and observability",
        "Las tareas largas necesitan estado durable, delegación acotada, recuperación reproducible y trazas que expliquen cómo se llegó al merge.",
        "Long-running tasks need durable state, bounded delegation, reproducible recovery, and traces that explain how the merge was reached.",
        (
            Scene("01 · CONTINUIDAD", "Una tarea larga debe sobrevivir a reinicios", ("Checkpoint", "Estado durable", "Reanudar"), "Persistir decisiones, artefactos y evidencia permite continuar sin inventar memoria oculta."),
            Scene("02 · DELEGACIÓN", "Subagentes necesitan contratos y contexto acotado", ("Orquestador", "Subtarea A", "Subtarea B", "Artefactos"), "La coordinación mejora cuando cada subagente devuelve evidencia explícita y mergeable."),
            Scene("03 · RECUPERACIÓN", "Observabilidad convierte una trayectoria en algo depurable", ("Trace", "Fallo", "Recovery", "Merge verificado"), "Logs, checkpoints y diffs permiten reconstruir por qué el sistema siguió, reintentó o se detuvo."),
        ),
        (
            Scene("01 · CONTINUITY", "A long-running task must survive restarts", ("Checkpoint", "Durable state", "Resume"), "Persisting decisions, artifacts, and evidence allows continuation without invented hidden memory."),
            Scene("02 · DELEGATION", "Subagents need contracts and bounded context", ("Orchestrator", "Subtask A", "Subtask B", "Artifacts"), "Coordination improves when every subagent returns explicit, mergeable evidence."),
            Scene("03 · RECOVERY", "Observability makes a trajectory debuggable", ("Trace", "Failure", "Recovery", "Verified merge"), "Logs, checkpoints, and diffs reconstruct why the system continued, retried, or stopped."),
        ),
    ),
)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    path = FONT_BOLD if bold else FONT_REGULAR
    if not path.is_file():
        raise RuntimeError(f"required font not found: {path}")
    return ImageFont.truetype(str(path), size=size)


def text_width(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.FreeTypeFont) -> float:
    box = draw.textbbox((0, 0), text, font=fnt)
    return float(box[2] - box[0])


def wrap(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.FreeTypeFont, max_width: int) -> str:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if current and text_width(draw, candidate, fnt) > max_width:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return "\n".join(lines)


def rounded_panel(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], *, fill: str, outline: str = LINE, radius: int = 28, width: int = 2) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def arrow(draw: ImageDraw.ImageDraw, start: tuple[int, int], end: tuple[int, int]) -> None:
    x1, y1 = start
    x2, y2 = end
    draw.line((x1, y1, x2, y2), fill=ACCENT, width=7)
    draw.polygon(((x2, y2), (x2 - 20, y2 - 13), (x2 - 20, y2 + 13)), fill=ACCENT)


def render_scene(chapter_title: str, scene: Scene, locale: str, scene_index: int) -> Image.Image:
    image = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(image)

    # Header and series identity.
    draw.text((110, 82), "5SIGMAS", font=font(30, True), fill=ACCENT)
    series_label = "CODING AGENTS · AGENT HARNESSES"
    draw.text((110, 128), series_label, font=font(24), fill=MUTED)
    draw.text((1665, 88), f"{scene_index + 1:02d}/03", font=font(28, True), fill=ACCENT_2)

    chapter_f = font(34, True)
    draw.text((110, 202), wrap(draw, chapter_title, chapter_f, 1700), font=chapter_f, fill=TEXT, spacing=8)

    eyebrow_f = font(25, True)
    draw.text((110, 310), scene.eyebrow, font=eyebrow_f, fill=ACCENT_2)

    headline_f = font(55, True)
    headline = wrap(draw, scene.headline, headline_f, 1680)
    draw.multiline_text((110, 355), headline, font=headline_f, fill=TEXT, spacing=10)

    nodes = scene.nodes
    n = len(nodes)
    total_w = 1690
    gap = 34
    card_w = int((total_w - gap * (n - 1)) / n)
    card_y1, card_y2 = 585, 785
    start_x = 110
    centers: list[tuple[int, int]] = []
    for idx, label in enumerate(nodes):
        x1 = start_x + idx * (card_w + gap)
        x2 = x1 + card_w
        rounded_panel(draw, (x1, card_y1, x2, card_y2), fill=PANEL if idx % 2 == 0 else PANEL_2)
        label_f = font(33, True)
        wrapped = wrap(draw, label.replace("\n", " "), label_f, card_w - 60)
        bbox = draw.multiline_textbbox((0, 0), wrapped, font=label_f, spacing=8, align="center")
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        draw.multiline_text((x1 + (card_w - tw) / 2, card_y1 + (card_y2 - card_y1 - th) / 2 - 4), wrapped, font=label_f, fill=TEXT, spacing=8, align="center")
        centers.append((x1 + card_w // 2, (card_y1 + card_y2) // 2))
    for idx in range(len(centers) - 1):
        left_x = start_x + idx * (card_w + gap) + card_w
        right_x = start_x + (idx + 1) * (card_w + gap)
        arrow(draw, (left_x + 5, 685), (right_x - 5, 685))

    caption_f = font(29)
    caption = wrap(draw, scene.caption, caption_f, 1660)
    rounded_panel(draw, (110, 845, 1800, 995), fill="#131D20", outline="#33484F", radius=24, width=2)
    draw.multiline_text((145, 878), caption, font=caption_f, fill=MUTED, spacing=9)
    locale_label = "ES" if locale == "es" else "EN"
    draw.text((1695, 1015), locale_label, font=font(22, True), fill=ACCENT)
    return image


def encode_video(scene_paths: list[Path], output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    command = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y"]
    for path in scene_paths:
        command += ["-loop", "1", "-t", str(SCENE_SECONDS), "-i", str(path)]
    filter_parts = []
    labels = []
    for idx in range(len(scene_paths)):
        filter_parts.append(f"[{idx}:v]fps={FPS},scale={W}:{H},format=yuv420p[v{idx}]")
        labels.append(f"[v{idx}]")
    filter_parts.append("".join(labels) + f"concat=n={len(scene_paths)}:v=1:a=0[outv]")
    command += [
        "-filter_complex", ";".join(filter_parts),
        "-map", "[outv]",
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "29",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        "-t", str(DURATION_SECONDS),
        "-an",
        str(output),
    ]
    result = subprocess.run(command, check=False, capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(f"ffmpeg failed for {output}: {result.stderr.strip()}")


def es_media_block(chapter: Chapter) -> str:
    slug = Path(chapter.filename).stem
    scene_names = [s.headline for s in chapter.scenes_es]
    return (
        f"video: {slug}.mp4\n"
        f"video_poster: {slug}.jpg\n"
        f"video_title: {chapter.video_title_es!r}\n"
        f"video_summary: {chapter.summary_es!r}\n"
        "video_duration: PT36S\n"
        "video_chapters:\n"
        f"- name: {scene_names[0]!r}\n  start: 0\n  end: 12\n"
        f"- name: {scene_names[1]!r}\n  start: 12\n  end: 24\n"
        f"- name: {scene_names[2]!r}\n  start: 24\n  end: 36\n"
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
    block = es_media_block(chapter).rstrip()
    path.write_text(text[:head_end] + "\n" + block + text[head_end:], encoding="utf-8")


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
        scenes = [s.headline for s in chapter.scenes_en]
        block = (
            f"\n{key}:\n"
            f"  video: {slug}.mp4\n"
            f"  video_poster: {slug}.jpg\n"
            f"  video_title: {chapter.video_title_en!r}\n"
            f"  video_summary: {chapter.summary_en!r}\n"
            "  video_duration: PT36S\n"
            "  video_chapters:\n"
            f"    - name: {scenes[0]!r}\n      start: 0\n      end: 12\n"
            f"    - name: {scenes[1]!r}\n      start: 12\n      end: 24\n"
            f"    - name: {scenes[2]!r}\n      start: 24\n      end: 36\n"
        )
        blocks.append(block)
    if blocks:
        original = path.read_text(encoding="utf-8").rstrip() + "\n"
        path.write_text(original + "".join(blocks), encoding="utf-8")


def generate(root: Path) -> None:
    es_root = root / "docs" / "series" / SERIES
    en_root = root / "locales" / "en" / "series" / SERIES
    media_path = root / "locales" / "en" / "media.yml"
    for required in (es_root, en_root, media_path):
        if not required.exists():
            raise RuntimeError(f"required path missing: {required}")

    with tempfile.TemporaryDirectory(prefix="coding-video-scenes-") as tmp:
        tmp_root = Path(tmp)
        for chapter in CHAPTERS:
            slug = Path(chapter.filename).stem
            for locale, title, scenes, asset_root in (
                ("es", chapter.video_title_es, chapter.scenes_es, es_root),
                ("en", chapter.video_title_en, chapter.scenes_en, en_root),
            ):
                scene_paths: list[Path] = []
                for index, scene in enumerate(scenes):
                    image = render_scene(title, scene, locale, index)
                    scene_path = tmp_root / f"{locale}-{slug}-{index}.png"
                    image.save(scene_path, format="PNG", optimize=True)
                    scene_paths.append(scene_path)
                poster = asset_root / f"{slug}.jpg"
                Image.open(scene_paths[0]).save(poster, format="JPEG", quality=91, optimize=True, progressive=True)
                encode_video(scene_paths, asset_root / f"{slug}.mp4")
            patch_spanish_frontmatter(es_root / chapter.filename, chapter)
    append_english_media(media_path, CHAPTERS)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT)
    args = parser.parse_args()
    generate(args.root.resolve())
    print(f"Generated {len(CHAPTERS) * 2} native silent visual videos + posters for {SERIES}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
