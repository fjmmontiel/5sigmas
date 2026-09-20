#!/usr/bin/env python3
"""Run Context media v2 with exact-bounds layout contracts.

The v2 self-test exposed several nodes whose real DejaVu Sans Bold glyph boxes do
not fit their historical rectangles at the mandatory 68 px material typography
floor. This wrapper keeps that floor and the lower playback-control safe area,
widens only physically undersized nodes, and fails closed against actual glyph
bounds. No font threshold is lowered and no overflow is accepted.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
V2 = ROOT / "scripts/generate_context_engineering_visual_media_v2.py"
spec = importlib.util.spec_from_file_location("context_media_v2", V2)
if spec is None or spec.loader is None:
    raise RuntimeError("cannot load Context media v2")
v2 = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = v2
spec.loader.exec_module(v2)

# Geometry-only corrections derived from the exact CI font metrics at 68 px.
# Keys use the original v2 (center, width, height), so accidental layout changes
# cannot silently inherit a wider box. Values are corrected (width, height).
GEOMETRY_OVERRIDES = {
    # Ch2 — compaction + changing priority.
    ((330, 575), 430, 180): (450, 180),
    ((950, 575), 350, 160): (380, 160),
    ((1590, 575), 420, 180): (470, 180),
    ((1650, 575), 340, 180): (450, 180),
    # Ch3 — memory classes, write/retrieve policy.
    ((1190, 575), 390, 200): (420, 200),
    ((1660, 575), 390, 200): (450, 200),
    ((900, 575), 360, 165): (470, 165),
    ((1580, 680), 400, 150): (430, 150),
    ((850, 575), 430, 180): (450, 180),
    ((1450, 575), 310, 145): (390, 145),
    # Ch4 — conflict resolution and grounded assembly.
    ((1580, 575), 390, 170): (450, 170),
    ((960, 575), 370, 165): (450, 165),
    ((1600, 575), 400, 170): (550, 170),
    ((960, 575), 400, 160): (470, 160),
    ((1600, 535), 420, 180): (460, 230),
    # Ch5 — MCP capability discovery and validation.
    ((880, 450), 340, 105): (390, 105),
    ((880, 575), 340, 105): (390, 105),
    ((880, 700), 340, 105): (390, 105),
    ((1580, 575), 440, 230): (450, 230),
    ((880, 575), 340, 150): (380, 150),
    # Ch6 — evaluation / fan-in.
    ((960, 575), 390, 160): (470, 160),
    ((1620, 680), 390, 150): (490, 150),
}


def exact_bounds_node(draw, center, value: str, *, w=400, h=150, outline=None, active=False, size=68):
    if outline is None:
        outline = v2.LINE

    original = (center, w, h)
    w, h = GEOMETRY_OVERRIDES.get(original, (w, h))

    # The fan-out source is the only label that cannot fit horizontally in the
    # left-side mechanism band even after widening. Keep the exact technical
    # term and the 68 px floor, but use explicit syllabic line breaking.
    display_value = value
    if value == "ORQUESTADOR":
        display_value = "ORQUESTA-\nDOR"
        w, h = 455, 170
    elif value == "ORCHESTRATOR":
        display_value = "ORCHESTRA-\nTOR"
        w, h = 510, 170

    x, y = center
    box = (int(x-w/2), int(y-h/2), int(x+w/2), int(y+h/2))
    if box[0] < 0 or box[2] > v2.W:
        raise RuntimeError(f"node leaves horizontal canvas: {value} -> {box}")
    if box[1] < 390 or box[3] > v2.SAFE_ZONE_START_Y - 15:
        raise RuntimeError(f"node leaves mechanism band: {value} -> {box}")
    if size < v2.MIN_MATERIAL_SOURCE_PX:
        raise RuntimeError(f"material text below floor: {size}px < {v2.MIN_MATERIAL_SOURCE_PX}px ({value})")

    fnt = v2.base.font(size, True)
    wrapped = v2.base.wrap(draw, display_value, fnt, w-10)
    metrics = draw.multiline_textbbox(
        (0, 0), wrapped, font=fnt, spacing=max(8, size//6), align="center"
    )
    tw, th = metrics[2]-metrics[0], metrics[3]-metrics[1]
    if tw > w-10 or th > h-18:
        raise RuntimeError(
            f"node label does not fit actual bounds: {value!r} "
            f"text={tw}x{th}, node={w}x{h}"
        )

    if active:
        draw.rounded_rectangle(
            (box[0]-8, box[1]-8, box[2]+8, box[3]+8),
            radius=30,
            outline=v2.ACCENT,
            width=6,
        )
    draw.rounded_rectangle(
        box,
        radius=24,
        fill=v2.PANEL_2 if active else v2.PANEL,
        outline=v2.ACCENT if active else outline,
        width=5,
    )
    draw.multiline_text(
        center,
        wrapped,
        font=fnt,
        fill=v2.TEXT,
        spacing=max(8, size//6),
        anchor="mm",
        align="center",
    )
    return box


# Patch the node renderer used by every v2 mechanism.
v2.node = exact_bounds_node


def safe_stack_to_gate(draw, labels, center_label, out_label, p, colors=None):
    """Shared three-source mechanism with a 68 px bilingual typography floor."""
    if colors is None:
        colors = (v2.BLUE, v2.PURPLE, v2.ACCENT_2)
    ys = (450, 575, 700)
    for i, (lab, y, col) in enumerate(zip(labels, ys, colors)):
        exact_bounds_node(
            draw,
            (270, y),
            lab,
            w=430,
            h=112,
            outline=col,
            active=p > .18 * (i + 1),
        )
        v2.arrow(draw, (490, y), (700, 575 + (i - 1) * 38), color=col, width=9)
        if p > .18 * (i + 1):
            v2.base.token(
                draw,
                (490, y),
                (700, 575 + (i - 1) * 38),
                min(1, (p - .18 * i) * 1.6),
                col,
            )
    exact_bounds_node(
        draw,
        (950, 575),
        center_label,
        w=500,
        h=230,
        outline=v2.ACCENT,
        active=p > .3,
    )
    v2.arrow(draw, (1210, 575), (1435, 575), color=v2.GOOD, width=9)
    exact_bounds_node(
        draw,
        (1630, 575),
        out_label,
        w=330,
        h=160,
        outline=v2.GOOD,
        active=p > .65,
    )


v2.stack_to_gate = safe_stack_to_gate


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", type=Path, default=ROOT)
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()

    report = v2.self_test()
    report["node_fit_contract"] = "ACTUAL_BOUNDS_5PX_HORIZONTAL_9PX_VERTICAL_MARGIN_PER_SIDE"
    report["material_typography_floor_source_px"] = v2.MIN_MATERIAL_SOURCE_PX
    report["safe_zone_start_y"] = v2.SAFE_ZONE_START_Y
    report["geometry_override_count"] = len(GEOMETRY_OVERRIDES)
    report["orchestrator_line_break"] = "EXPLICIT_SYLLABIC_TERM_PRESERVATION_AT_68PX"
    if args.self_test:
        print(json.dumps(report, indent=2))
        return 0

    v2.generate(args.root.resolve())
    print(
        f"Generated {len(v2.CHAPTERS)*2} v3 exact-bounds, silent, "
        "locale-native Context videos + posters"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
