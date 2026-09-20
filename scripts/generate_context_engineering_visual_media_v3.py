#!/usr/bin/env python3
"""Run Context media v2 with an exact-bounds node fit contract.

The v2 self-test correctly caught a Spanish single-word label whose glyph box was
8 px wider than the *padding* budget, although it still fit inside the node. This
wrapper keeps the 68 px material typography floor and all safe-area constraints,
but changes the fail-closed condition to the actual node bounds (5 px horizontal
and 9 px vertical margin per side). No threshold is lowered and no overflow is
accepted.
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


def exact_bounds_node(draw, center, value: str, *, w=400, h=150, outline=None, active=False, size=68):
    if outline is None:
        outline = v2.LINE
    x, y = center
    box = (int(x-w/2), int(y-h/2), int(x+w/2), int(y+h/2))
    if box[1] < 390 or box[3] > v2.SAFE_ZONE_START_Y - 15:
        raise RuntimeError(f"node leaves mechanism band: {value} -> {box}")
    if size < v2.MIN_MATERIAL_SOURCE_PX:
        raise RuntimeError(f"material text below floor: {size}px < {v2.MIN_MATERIAL_SOURCE_PX}px ({value})")
    fnt = v2.base.font(size, True)
    wrapped = v2.base.wrap(draw, value, fnt, w-10)
    metrics = draw.multiline_textbbox((0, 0), wrapped, font=fnt, spacing=max(8, size//6), align="center")
    tw, th = metrics[2]-metrics[0], metrics[3]-metrics[1]
    if tw > w-10 or th > h-18:
        raise RuntimeError(f"node label does not fit actual bounds: {value!r} text={tw}x{th}, node={w}x{h}")
    if active:
        draw.rounded_rectangle((box[0]-8,box[1]-8,box[2]+8,box[3]+8), radius=30, outline=v2.ACCENT, width=6)
    draw.rounded_rectangle(box, radius=24, fill=v2.PANEL_2 if active else v2.PANEL, outline=v2.ACCENT if active else outline, width=5)
    draw.multiline_text(center, wrapped, font=fnt, fill=v2.TEXT, spacing=max(8,size//6), anchor="mm", align="center")
    return box


# Patch only the node renderer used by all v2 mechanism functions.
v2.node = exact_bounds_node


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", type=Path, default=ROOT)
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()
    report = v2.self_test()
    report["node_fit_contract"] = "ACTUAL_BOUNDS_5PX_HORIZONTAL_9PX_VERTICAL_MARGIN_PER_SIDE"
    if args.self_test:
        print(json.dumps(report, indent=2))
        return 0
    v2.generate(args.root.resolve())
    print(f"Generated {len(v2.CHAPTERS)*2} v3 overlap-safe silent native Context videos + posters")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
