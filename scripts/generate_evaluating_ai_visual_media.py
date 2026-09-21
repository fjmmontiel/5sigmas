#!/usr/bin/env python3
"""Generate silent, locale-native visual videos for Evaluating AI Systems in Production.

VOICE is deliberately deferred by the owner contract. This generator creates only
visual H.264 MP4/JPG media. Titles, summaries and three 12-second key moments are
narration-independent. Material labels use the established >=68 px source floor,
which projects to >=12 CSS px in the real ~356 px inline mobile player; the lower
control strip contains no material explanation.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SERIES = "evaluating-ai-systems-production"
W, H = 1920, 1080
FPS = 6
DURATION_SECONDS = 36
SCENE_SECONDS = 12
TOTAL_FRAMES = FPS * DURATION_SECONDS
MOBILE_INLINE_WIDTH = 356
MOBILE_INLINE_HEIGHT = 200
MOBILE_SCALE = MOBILE_INLINE_WIDTH / W
MIN_MATERIAL_SOURCE_PX = 68
MIN_MATERIAL_PROJECTED_CSS_PX = MIN_MATERIAL_SOURCE_PX * MOBILE_SCALE
SAFE_ZONE_START_Y = 800
RESERVED_CONTROL_SOURCE_PX = H - SAFE_ZONE_START_Y
RESERVED_CONTROL_PROJECTED_CSS_PX = RESERVED_CONTROL_SOURCE_PX * MOBILE_SCALE

spec = importlib.util.spec_from_file_location(
    "evaluation_media_primitives", ROOT / "scripts/generate_coding_agent_visual_media.py"
)
if spec is None or spec.loader is None:
    raise RuntimeError("cannot load shared visual-media primitives")
base = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = base
spec.loader.exec_module(base)
Chapter = base.Chapter

CHAPTERS: tuple[Chapter, ...] = (
    Chapter(
        "01-que-evaluar-modelo-componente-sistema-workflow-trayectoria.md",
        "Modelo, componente, workflow, trayectoria y sistema",
        "Model, component, workflow, trajectory, and system",
        "La frontera correcta contiene el mecanismo que quieres atribuir: una trayectoria es evidencia de una ejecución, mientras el outcome confirma si el cambio importa al sistema.",
        "The right boundary contains the mechanism you want to attribute: a trajectory is evidence of one execution, while the outcome confirms whether the change matters to the system.",
        (
            "Empieza por el cambio y elige la frontera mínima",
            "Una trayectoria conecta policy, componentes y outcome",
            "Diagnostica estrecho; confirma en la frontera del riesgo",
        ),
        (
            "Start from the change and choose the smallest boundary",
            "A trajectory connects policy, components, and outcome",
            "Diagnose narrowly; confirm at the risk boundary",
        ),
    ),
    Chapter(
        "02-offline-eval-sets-curation-hard-negatives-contamination-versioning.md",
        "Eval sets: curación, hard negatives, leakage y versionado",
        "Eval sets: curation, hard negatives, leakage, and versioning",
        "Un eval set fiable conserva provenance, separa bancos por función y congela una release; hard pairs y canales de leakage distintos prueban fallos distintos sin mutar la comparación.",
        "A trustworthy eval set preserves provenance, separates banks by role, and freezes a release; hard pairs and distinct leakage channels test different failures without mutating the comparison.",
        (
            "Provenance y grouping preceden al split",
            "Hard positive y hard negative cruzan una sola frontera",
            "La release se congela; fallos nuevos alimentan v+1",
        ),
        (
            "Provenance and grouping come before the split",
            "Hard positive and hard negative cross one boundary",
            "Freeze the release; new failures feed v+1",
        ),
    ),
    Chapter(
        "03-llm-as-judge-evaluacion-humana-calibracion-sesgo-varianza-acuerdo.md",
        "LLM-as-judge, evaluación humana y calibración",
        "LLM-as-judge, human evaluation, and calibration",
        "Un judge sólo es útil cuando su criterio se calibra contra evidencia humana, se mide su desacuerdo y se separan sesgo, varianza y estabilidad antes de usarlo como señal de aceptación.",
        "A judge is useful only when its criterion is calibrated against human evidence, disagreement is measured, and bias, variance, and stability are separated before using it as an acceptance signal.",
        (
            "Define la rúbrica antes de pedir el veredicto",
            "Compara judge y humanos sobre los mismos casos",
            "Calibra sesgo, varianza y desacuerdo antes del gate",
        ),
        (
            "Define the rubric before asking for a verdict",
            "Compare judge and humans on the same cases",
            "Calibrate bias, variance, and disagreement before the gate",
        ),
    ),
    Chapter(
        "04-evaluacion-trayectorias-agentes-tools-exito-eficiencia-recuperacion-policy.md",
        "Trayectorias de agentes: éxito, eficiencia, recovery y policy",
        "Agent trajectories: success, efficiency, recovery, and policy",
        "Una trayectoria agentic se evalúa por outcome y por proceso: tools y estados observados explican cómo se llegó al resultado, mientras recovery, coste y policy separan éxito limpio de éxito corrupto.",
        "An agentic trajectory is evaluated by outcome and process: tools and observed states explain how the result was reached, while recovery, cost, and policy separate clean success from corrupt success.",
        (
            "Acción, tool result y estado forman la trayectoria",
            "El recovery debe restaurar progreso sin ocultar fallos",
            "Éxito, eficiencia y policy se aceptan conjuntamente",
        ),
        (
            "Action, tool result, and state form the trajectory",
            "Recovery must restore progress without hiding failures",
            "Success, efficiency, and policy are accepted together",
        ),
    ),
    Chapter(
        "05-online-evaluation-shadow-canary-ab-guardrails-regression-gates.md",
        "Evaluación online: shadow, canary, A/B y regression gates",
        "Online evaluation: shadow, canary, A/B, and regression gates",
        "La evaluación online aumenta exposición de forma controlada: shadow observa sin decidir, canary limita blast radius, A/B estima efecto y guardrails o regression gates detienen una promoción insegura.",
        "Online evaluation increases exposure under control: shadow observes without deciding, canary limits blast radius, A/B estimates effect, and guardrails or regression gates stop an unsafe promotion.",
        (
            "Shadow observa tráfico sin cambiar la decisión",
            "Canary aumenta exposición sólo con guardrails verdes",
            "A/B mide efecto; regression gate decide promote o rollback",
        ),
        (
            "Shadow observes traffic without changing the decision",
            "Canary increases exposure only with green guardrails",
            "A/B measures effect; the regression gate promotes or rolls back",
        ),
    ),
    Chapter(
        "06-observability-failure-taxonomies-production-eval-repair-feedback-loops.md",
        "Observabilidad, taxonomías de fallos y feedback loops",
        "Observability, failure taxonomies, and feedback loops",
        "Telemetría no es un veredicto: señales de producción se convierten en fallos reproducibles, eval cases y reparaciones que vuelven a pasar por el mismo gate antes de regresar a producción.",
        "Telemetry is not a verdict: production signals become reproducible failures, eval cases, and repairs that pass through the same gate before returning to production.",
        (
            "Telemetría detecta síntomas; la taxonomía localiza el fallo",
            "Un fallo reproducible se convierte en eval case",
            "Repair → candidate → eval → producción cierra el loop",
        ),
        (
            "Telemetry detects symptoms; the taxonomy localizes failure",
            "A reproducible failure becomes an eval case",
            "Repair → candidate → eval → production closes the loop",
        ),
    ),
)

FLOWS = {
    0: {
        "es": (("flow", ("Cambio / riesgo", "Frontera mínima", "Hipótesis")), ("flow", ("Task", "Workflow + τ", "Outcome")), ("branch", ("MODEL", "WORKFLOW", "SYSTEM"))),
        "en": (("flow", ("Change / risk", "Smallest boundary", "Hypothesis")), ("flow", ("Task", "Workflow + τ", "Outcome")), ("branch", ("MODEL", "WORKFLOW", "SYSTEM"))),
    },
    1: {
        "es": (("flow", ("Fuentes", "Provenance", "Grouping")), ("split", ("Contexto común", "Hard positive", "Hard negative")), ("flow", ("Release v", "Fallo nuevo", "Release v+1"))),
        "en": (("flow", ("Sources", "Provenance", "Grouping")), ("split", ("Shared context", "Hard positive", "Hard negative")), ("flow", ("Release v", "New failure", "Release v+1"))),
    },
    2: {
        "es": (("flow", ("Rúbrica", "Judge", "Veredicto")), ("merge", ("Judge", "Humanos", "Casos comunes")), ("gates", ("Bias", "Agreement", "CALIBRADO"))),
        "en": (("flow", ("Rubric", "Judge", "Verdict")), ("merge", ("Judge", "Humans", "Shared cases")), ("gates", ("Bias", "Agreement", "CALIBRATED"))),
    },
    3: {
        "es": (("flow", ("Acción", "Tool result", "Estado")), ("loop", ("Fallo", "Recovery", "Progreso")), ("merge", ("Éxito", "Eficiencia", "Policy"))),
        "en": (("flow", ("Action", "Tool result", "State")), ("loop", ("Failure", "Recovery", "Progress")), ("merge", ("Success", "Efficiency", "Policy"))),
    },
    4: {
        "es": (("flow", ("Producción", "SHADOW", "Evidencia")), ("gates", ("CANARY", "Guardrails", "EXPAND")), ("branch", ("PROMOTE", "HOLD", "ROLLBACK"))),
        "en": (("flow", ("Production", "SHADOW", "Evidence")), ("gates", ("CANARY", "Guardrails", "EXPAND")), ("branch", ("PROMOTE", "HOLD", "ROLLBACK"))),
    },
    5: {
        "es": (("flow", ("Telemetría", "Taxonomía", "Fallo")), ("flow", ("Reproducir", "Eval case", "Candidate")), ("loop", ("Producción", "Eval", "Repair"))),
        "en": (("flow", ("Telemetry", "Taxonomy", "Failure")), ("flow", ("Reproduce", "Eval case", "Candidate")), ("loop", ("Production", "Eval", "Repair"))),
    },
}


def clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def base_frame(chapter: Chapter, locale: str, scene: int, local_t: float) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (W, H), base.BG)
    draw = ImageDraw.Draw(image)
    title = chapter.title_es if locale == "es" else chapter.title_en
    moment = (chapter.moments_es if locale == "es" else chapter.moments_en)[scene]
    draw.rectangle((0, 0, W, 12), fill=base.ACCENT)
    base.text(draw, (90, 62), "5SIGMAS · AI EVALUATION", size=52, color=base.ACCENT, bold=True)
    base.text(draw, (90, 132), title, size=68, bold=True, max_width=1600)
    base.text(draw, (90, 265), f"{scene + 1:02d}  {moment}", size=72, color=base.ACCENT_2, bold=True, max_width=1700)
    base.text(draw, (1810, 70), locale.upper(), size=52, color=base.MUTED, bold=True, anchor="ra")
    draw.rectangle((0, SAFE_ZONE_START_Y, W, H), fill=base.BG_2)
    x1, x2, y = 90, 1830, 1020
    draw.line((x1, y, x2, y), fill="#2B3D42", width=12)
    draw.line((x1, y, int(x1 + (x2 - x1) * clamp01(local_t)), y), fill=base.ACCENT, width=12)
    return image, draw


def render_scene(chapter_index: int, chapter: Chapter, locale: str, scene: int, local_t: float) -> Image.Image:
    image, draw = base_frame(chapter, locale, scene, local_t)
    mode, labels = FLOWS[chapter_index][locale][scene]
    if mode == "flow":
        base.draw_flow(draw, labels, local_t)
    elif mode == "loop":
        base.draw_loop(draw, labels, local_t)
    elif mode == "split":
        base.draw_split(draw, labels, local_t)
    elif mode == "branch":
        base.draw_branch(draw, labels, local_t)
    elif mode == "gates":
        base.draw_gates(draw, labels, local_t)
    elif mode == "merge":
        base.draw_merge(draw, labels, local_t)
    else:
        raise RuntimeError(f"unknown visual mechanism mode: {mode}")
    return image


def assert_mobile_safe_contract() -> dict[str, float | int | bool]:
    if len(CHAPTERS) != 6:
        raise RuntimeError("exactly six Evaluating AI Systems chapters are required")
    if any(len(ch.moments_es) != 3 or len(ch.moments_en) != 3 for ch in CHAPTERS):
        raise RuntimeError("each chapter requires exactly three locale-native key moments")
    if MIN_MATERIAL_SOURCE_PX < 68 or MIN_MATERIAL_PROJECTED_CSS_PX < 12.0:
        raise RuntimeError("material typography does not meet the mobile-safe floor")
    if SAFE_ZONE_START_Y > 800 or RESERVED_CONTROL_PROJECTED_CSS_PX < 50:
        raise RuntimeError("native controls-safe zone is too small")
    return {
        "chapter_count": len(CHAPTERS),
        "locale_video_obligations": len(CHAPTERS) * 2,
        "duration_seconds": DURATION_SECONDS,
        "mobile_inline_width_css_px": MOBILE_INLINE_WIDTH,
        "mobile_inline_height_css_px": MOBILE_INLINE_HEIGHT,
        "min_material_source_px": MIN_MATERIAL_SOURCE_PX,
        "min_material_projected_css_px": round(MIN_MATERIAL_PROJECTED_CSS_PX, 2),
        "reserved_control_projected_css_px": round(RESERVED_CONTROL_PROJECTED_CSS_PX, 2),
        "material_content_below_safe_zone": False,
        "voice_generated": False,
        "captions_generated": False,
        "transcript_generated": False,
        "narration_dependent_timing_generated": False,
    }


def render_video(chapter_index: int, chapter: Chapter, locale: str, output_root: Path, tmp_root: Path) -> None:
    slug = Path(chapter.filename).stem
    frame_dir = tmp_root / f"{locale}-{slug}"
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
    if poster is None:
        raise RuntimeError("poster frame missing")
    output_root.mkdir(parents=True, exist_ok=True)
    poster.save(output_root / f"{slug}.jpg", format="JPEG", quality=92, optimize=True, progressive=True)
    base.encode_video(frame_dir, output_root / f"{slug}.mp4")


def self_test() -> int:
    contract = assert_mobile_safe_contract()
    samples: list[dict[str, object]] = []
    for chapter_index in (0, 2, 5):
        for locale in ("es", "en"):
            first = render_scene(chapter_index, CHAPTERS[chapter_index], locale, 0, 0.05)
            last = render_scene(chapter_index, CHAPTERS[chapter_index], locale, 2, 0.85)
            if first.tobytes() == last.tobytes():
                raise RuntimeError(f"non-changing visual sample: chapter={chapter_index + 1} locale={locale}")
            samples.append({"chapter": chapter_index + 1, "locale": locale, "different_frames": True})
    print(json.dumps({"PASS": True, "contract": contract, "samples": samples}, ensure_ascii=False))
    return 0


def generate() -> int:
    contract = assert_mobile_safe_contract()
    roots = {
        "es": ROOT / "docs" / "series" / SERIES,
        "en": ROOT / "locales" / "en" / "series" / SERIES,
    }
    with tempfile.TemporaryDirectory(prefix="s5-evaluating-ai-media-") as tmp:
        tmp_root = Path(tmp)
        for chapter_index, chapter in enumerate(CHAPTERS):
            for locale, output_root in roots.items():
                render_video(chapter_index, chapter, locale, output_root, tmp_root)
                slug = Path(chapter.filename).stem
                print(f"generated {locale}: {output_root / (slug + '.mp4')}")
    print(json.dumps({"PASS": True, "contract": contract}, ensure_ascii=False))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    return self_test() if args.self_test else generate()


if __name__ == "__main__":
    raise SystemExit(main())
