#!/usr/bin/env python3
"""Generate silent, locale-native mechanism videos for LLM Inference Engineering.

VOICE is intentionally deferred by #305 comment 5716685049. This generator creates
only native visual MP4/JPG media plus narration-independent metadata/key moments.
The visual contract is built for the real ~356x200 CSS-pixel inline mobile player:
material text stays at the established 68 px source floor and the lower control
strip contains no material explanation.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import sys
import tempfile
from pathlib import Path
from typing import Iterable

import yaml
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SERIES = "llm-inference-engineering-economics"
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
        "01-prefill-vs-decode-ttft-tpot-throughput-latency-budget.md",
        "Prefill, decode y presupuesto de latencia",
        "Prefill, decode, and the latency budget",
        "Prefill procesa el contexto en paralelo; decode genera tokens secuencialmente. TTFT, TPOT y throughput miden fases distintas del mismo servicio.",
        "Prefill processes context in parallel; decode generates tokens sequentially. TTFT, TPOT, and throughput measure different phases of the same service.",
        ("Prefill construye el estado para decodificar", "Decode avanza token a token", "TTFT, TPOT y throughput forman el presupuesto"),
        ("Prefill builds the state required for decoding", "Decode advances one token at a time", "TTFT, TPOT, and throughput form the budget"),
    ),
    Chapter(
        "02-kv-cache-memory-hierarchy-continuous-batching-pagedattention.md",
        "KV cache, jerarquía de memoria y continuous batching",
        "KV cache, memory hierarchy, and continuous batching",
        "El KV cache intercambia memoria por menos cómputo repetido; paging y continuous batching coordinan capacidad, admisión y reutilización entre requests activos.",
        "The KV cache trades memory for less repeated compute; paging and continuous batching coordinate capacity, admission, and reuse across active requests.",
        ("El KV cache ocupa capacidad por secuencia", "Continuous batching recompone el batch en cada paso", "Paging convierte capacidad en páginas asignables"),
        ("The KV cache consumes capacity per sequence", "Continuous batching rebuilds the batch each step", "Paging turns capacity into assignable pages"),
    ),
    Chapter(
        "03-quantization-parallelism-memory-quality-tradeoffs.md",
        "Quantization, paralelismo y trade-offs",
        "Quantization, parallelism, and trade-offs",
        "Quantization reduce bytes por parámetro; tensor y pipeline parallelism reparten cómputo y memoria. Cada elección mueve memoria, calidad, comunicación y latencia.",
        "Quantization reduces bytes per parameter; tensor and pipeline parallelism distribute compute and memory. Each choice moves memory, quality, communication, and latency.",
        ("Menos bits reducen memoria y ancho de banda", "Paralelismo reparte el modelo entre dispositivos", "Optimizar una métrica desplaza otras"),
        ("Fewer bits reduce memory and bandwidth", "Parallelism distributes the model across devices", "Optimizing one metric moves others"),
    ),
    Chapter(
        "04-speculative-decoding-prefix-caching-latency-optimisations.md",
        "Speculative decoding y prefix caching",
        "Speculative decoding and prefix caching",
        "Speculative decoding propone varios tokens baratos y el modelo objetivo los verifica; prefix caching reutiliza trabajo de prefill cuando el prefijo realmente coincide.",
        "Speculative decoding proposes several cheap tokens and the target model verifies them; prefix caching reuses prefill work when the prefix truly matches.",
        ("El draft propone un bloque de tokens", "El verifier acepta un prefijo y rechaza el resto", "Un prefix hit evita repetir prefill"),
        ("The draft proposes a block of tokens", "The verifier accepts a prefix and rejects the rest", "A prefix hit avoids repeated prefill"),
    ),
    Chapter(
        "05-model-routing-fallback-caching-workload-aware-serving.md",
        "Routing, fallback, caching y serving adaptativo",
        "Routing, fallback, caching, and workload-aware serving",
        "Un router asigna cada request según capacidad, calidad, coste y latencia; cache y fallback cambian la ruta sin eliminar verificación ni límites de política.",
        "A router assigns each request by capacity, quality, cost, and latency; cache and fallback change the path without removing verification or policy bounds.",
        ("Routing separa workloads antes de servir", "Un cache hit evita trabajo cuando la clave es válida", "Fallback recupera el servicio bajo fallo o saturación"),
        ("Routing separates workloads before serving", "A cache hit avoids work when the key is valid", "Fallback recovers service under failure or saturation"),
    ),
    Chapter(
        "06-benchmarking-inference-cost-task-throughput-latency-energy-hardware-constraints.md",
        "Benchmarking: coste, throughput, latencia y energía",
        "Benchmarking: cost, throughput, latency, and energy",
        "Un benchmark de inferencia sólo es comparable si fija workload, frontera de medida y hardware, y reporta distribución de latencia, throughput útil, coste y energía.",
        "An inference benchmark is comparable only when workload, measurement boundary, and hardware are fixed, and latency distribution, useful throughput, cost, and energy are reported.",
        ("El workload define qué se está midiendo", "Una frontera común hace comparables las métricas", "Aceptar requiere SLO, coste y restricciones juntos"),
        ("The workload defines what is being measured", "A common boundary makes metrics comparable", "Acceptance requires SLO, cost, and constraints together"),
    ),
)

# Every material label is rendered by the shared >=68 px mobile-safe primitives.
FLOWS = {
    0: {
        "es": (("flow", ("Prompt batch", "PREFILL", "KV listo")), ("loop", ("Decode step", "Siguiente token", "KV update")), ("gates", ("TTFT ≤ SLO", "TPOT ≤ SLO", "THROUGHPUT"))),
        "en": (("flow", ("Prompt batch", "PREFILL", "KV ready")), ("loop", ("Decode step", "Next token", "KV update")), ("gates", ("TTFT ≤ SLO", "TPOT ≤ SLO", "THROUGHPUT"))),
    },
    1: {
        "es": (("split", ("KV cache", "Páginas hot", "Páginas cold")), ("loop", ("Request queue", "Batch step", "KV pages")), ("gates", ("Capacidad", "Eviction", "ADMIT"))),
        "en": (("split", ("KV cache", "Hot pages", "Cold pages")), ("loop", ("Request queue", "Batch step", "KV pages")), ("gates", ("Capacity", "Eviction", "ADMIT"))),
    },
    2: {
        "es": (("flow", ("FP16 / BF16", "INT8 / FP8", "Menos bytes")), ("split", ("Modelo", "Tensor parallel", "Pipeline parallel")), ("branch", ("MEMORIA", "BALANCE", "CALIDAD"))),
        "en": (("flow", ("FP16 / BF16", "INT8 / FP8", "Fewer bytes")), ("split", ("Model", "Tensor parallel", "Pipeline parallel")), ("branch", ("MEMORY", "BALANCE", "QUALITY"))),
    },
    3: {
        "es": (("flow", ("Draft model", "k tokens", "Verifier")), ("branch", ("ACCEPT", "REJECT", "RESAMPLE")), ("flow", ("Prefix hash", "Cache hit", "Skip prefill"))),
        "en": (("flow", ("Draft model", "k tokens", "Verifier")), ("branch", ("ACCEPT", "REJECT", "RESAMPLE")), ("flow", ("Prefix hash", "Cache hit", "Skip prefill"))),
    },
    4: {
        "es": (("split", ("Request", "Modelo rápido", "Modelo fuerte")), ("gates", ("Cache hit", "Policy", "SERVE")), ("flow", ("Primary fail", "Fallback", "Resultado"))),
        "en": (("split", ("Request", "Fast model", "Strong model")), ("gates", ("Cache hit", "Policy", "SERVE")), ("flow", ("Primary fail", "Fallback", "Result"))),
    },
    5: {
        "es": (("flow", ("Workload", "Servidor", "Mediciones")), ("merge", ("Latencia", "Tokens / s", "Energía")), ("gates", ("p95 SLO", "Coste / task", "ACCEPT"))),
        "en": (("flow", ("Workload", "Server", "Measurements")), ("merge", ("Latency", "Tokens / s", "Energy")), ("gates", ("p95 SLO", "Cost / task", "ACCEPT"))),
    },
}


def clamp01(v: float) -> float:
    return max(0.0, min(1.0, v))


def base_frame(chapter: Chapter, locale: str, scene: int, local_t: float) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (W, H), base.BG)
    draw = ImageDraw.Draw(image)
    title = chapter.title_es if locale == "es" else chapter.title_en
    moment = (chapter.moments_es if locale == "es" else chapter.moments_en)[scene]
    draw.rectangle((0, 0, W, 12), fill=base.ACCENT)
    base.text(draw, (90, 62), "5SIGMAS · LLM INFERENCE", size=52, color=base.ACCENT, bold=True)
    base.text(draw, (90, 132), title, size=68, bold=True, max_width=1600)
    base.text(draw, (90, 265), f"{scene + 1:02d}  {moment}", size=72, color=base.ACCENT_2, bold=True, max_width=1700)
    base.text(draw, (1810, 70), locale.upper(), size=52, color=base.MUTED, bold=True, anchor="ra")
    draw.rectangle((0, SAFE_ZONE_START_Y, W, H), fill=base.BG_2)
    x1, x2, y = 90, 1830, 1020
    draw.line((x1, y, x2, y), fill="#2B3D42", width=12)
    draw.line((x1, y, int(x1 + (x2 - x1) * clamp01(local_t)), y), fill=base.ACCENT, width=12)
    return image, draw


def render_scene(chapter_index: int, chapter: Chapter, locale: str, scene: int, t: float) -> Image.Image:
    image, draw = base_frame(chapter, locale, scene, t)
    mode, labels = FLOWS[chapter_index][locale][scene]
    if mode == "flow":
        base.draw_flow(draw, labels, t)
    elif mode == "loop":
        base.draw_loop(draw, labels, t)
    elif mode == "split":
        base.draw_split(draw, labels, t)
    elif mode == "branch":
        base.draw_branch(draw, labels, t)
    elif mode == "gates":
        base.draw_gates(draw, labels, t)
    elif mode == "merge":
        base.draw_merge(draw, labels, t)
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
    if len(CHAPTERS) != 6 or any(len(c.moments_es) != 3 or len(c.moments_en) != 3 for c in CHAPTERS):
        raise RuntimeError("six chapters with exactly three visual key moments required")
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
    poster.save(output_root / f"{slug}.jpg", format="JPEG", quality=92, optimize=True, progressive=True)
    base.encode_video(frame_dir, output_root / f"{slug}.mp4")


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
    if "\nvideo:" in raw[:end]:
        return
    path.write_text(raw[:end] + "\n" + media_block(chapter, "es").rstrip() + raw[end:], encoding="utf-8")


def append_english_media(path: Path, chapters: Iterable[Chapter]) -> None:
    raw = path.read_text(encoding="utf-8")
    existing = yaml.safe_load(raw) or {}
    if not isinstance(existing, dict):
        raise RuntimeError(f"media mapping invalid: {path}")
    blocks: list[str] = []
    for chapter in chapters:
        key = f"series/{SERIES}/{chapter.filename}"
        if key in existing:
            continue
        blocks.append(f"\n{key}:\n{media_block(chapter, 'en', indent='  ')}")
    if blocks:
        path.write_text(raw.rstrip() + "\n" + "".join(blocks), encoding="utf-8")


def generate(root: Path) -> None:
    contract = assert_mobile_safe_contract()
    report = root / "artifacts/inference-requalification/mobile-safe-video-contract.json"
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text(json.dumps(contract, indent=2) + "\n", encoding="utf-8")
    es_root = root / "docs/series" / SERIES
    en_root = root / "locales/en/series" / SERIES
    media_path = root / "locales/en/media.yml"
    for required in (es_root, en_root, media_path):
        if not required.exists():
            raise RuntimeError(f"required path missing: {required}")
    with tempfile.TemporaryDirectory(prefix="inference-video-frames-") as tmp:
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
