#!/usr/bin/env python3
"""Assemble all rendered localized variants into one deterministic review package."""
from __future__ import annotations

import argparse
import html
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content/modelos-razonadores"
ACCENT = "#26A69A"
ACCENT_TEXT = "#00776F"


def discover_specs() -> dict[str, tuple[Path, dict]]:
    result = {}
    for path in sorted(CONTENT.glob("*.json")):
        spec = json.loads(path.read_text())
        if spec["id"] in result:
            raise SystemExit(f"duplicate spec id: {spec['id']}")
        result[spec["id"]] = (path, spec)
    if len(result) != 12:
        raise SystemExit(f"expected 12 localized specs, found {len(result)}")
    return result


def find_one(root: Path, name: str) -> Path:
    matches = [p for p in root.rglob(name) if p.is_file()]
    if len(matches) != 1:
        raise SystemExit(f"expected exactly one {name}, found {len(matches)}")
    return matches[0]


def iso_duration(seconds: float) -> str:
    seconds = int(round(seconds))
    h, seconds = divmod(seconds, 3600)
    m, s = divmod(seconds, 60)
    return "PT" + (f"{h}H" if h else "") + (f"{m}M" if m else "") + (f"{s}S" if s or not (h or m) else "")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--inputs", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    specs = discover_specs()
    if args.out.exists():
        shutil.rmtree(args.out)
    media = args.out / "media"
    media.mkdir(parents=True)

    rows = []
    release = {"version": 1, "unit": "modelos-razonadores", "accent": ACCENT, "accentText": ACCENT_TEXT, "outputs": []}
    for spec_id, (spec_path, spec) in sorted(specs.items(), key=lambda item: (item[1][1]["locale"], item[1][1]["chapter"])):
        locale = spec["locale"]
        public_stem = Path(spec["articlePath"]).stem
        total = sum(float(scene["duration"]) for scene in spec["scenes"])
        record = {"id": spec_id, "locale": locale, "chapter": spec["chapter"], "title": spec["title"], "articlePath": spec["articlePath"], "publicStem": public_stem, "durationSeconds": total, "durationISO": iso_duration(total), "variants": {}}
        for variant in ("horizontal", "vertical"):
            stem = f"{spec_id}-{variant}"
            src_dir = find_one(args.inputs, f"{stem}-validation.json").parent
            required = [f"{stem}.mp4", f"{stem}.jpg", f"{stem}-validation.json", f"{stem}-chapters.json", f"{stem}-transcript.md", f"{stem}-captions.vtt", "package-validation.json"]
            for name in required:
                candidate = src_dir / name
                if not candidate.is_file() or candidate.stat().st_size == 0:
                    raise SystemExit(f"{stem}: missing {name}")
            validation = json.loads((src_dir / f"{stem}-validation.json").read_text())
            if validation.get("spec") != spec_id or validation.get("variant") != variant:
                raise SystemExit(f"{stem}: validation identity mismatch")
            destination = media / locale / public_stem / variant
            destination.mkdir(parents=True, exist_ok=True)
            copied = {}
            for suffix, out_name in [('.mp4','video.mp4'),('.jpg','poster.jpg'),('-validation.json','validation.json'),('-chapters.json','chapters.json'),('-transcript.md','transcript.md'),('-captions.vtt','captions.vtt')]:
                source = src_dir / f"{stem}{suffix}"
                target = destination / out_name
                shutil.copy2(source, target)
                copied[out_name] = target.relative_to(args.out).as_posix()
            record["variants"][variant] = copied
        release["outputs"].append(record)
        rows.append(record)

    (args.out / "manifest.json").write_text(json.dumps(release, ensure_ascii=False, indent=2) + "\n")
    cards = []
    for row in rows:
        h = row["variants"]["horizontal"]
        v = row["variants"]["vertical"]
        cards.append(f'''<article class="card" id="{html.escape(row['locale']+'-'+row['publicStem'])}">
  <header><span>{html.escape(row['locale'].upper())} · {html.escape(row['chapter'])}</span><h2>{html.escape(row['title'])}</h2><p>{html.escape(row['durationISO'])} · accent {ACCENT}</p></header>
  <video controls preload="metadata" poster="{html.escape(h['poster.jpg'])}"><source src="{html.escape(h['video.mp4'])}" type="video/mp4"><track kind="captions" src="{html.escape(h['captions.vtt'])}" srclang="{html.escape(row['locale'])}" label="{html.escape(row['locale'].upper())}" default></video>
  <nav><a href="{html.escape(h['transcript.md'])}">Transcript</a><a href="{html.escape(h['chapters.json'])}">Chapters</a><a href="{html.escape(v['video.mp4'])}">Vertical MP4</a><a href="{html.escape(v['poster.jpg'])}">Vertical poster</a></nav>
</article>''')
    doc = f'''<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>5sigmas · Modelos razonadores · render review</title><style>:root{{--accent:{ACCENT};--accent-text:{ACCENT_TEXT};--ink:#171b1b;--muted:#586362;--line:#d4dad7;--paper:#fcfbf8}}*{{box-sizing:border-box}}body{{margin:0;background:var(--paper);color:var(--ink);font-family:Inter,system-ui,sans-serif}}main{{max-width:1180px;margin:auto;padding:48px 24px 80px}}h1,h2{{font-family:"Noto Serif Display",Georgia,serif}}h1{{font-size:clamp(38px,6vw,72px);line-height:.98;margin:8px 0 16px}}.lead{{max-width:72ch;color:var(--muted);line-height:1.65}}.identity{{color:var(--accent-text);font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:13px}}.grid{{display:grid;gap:28px;margin-top:40px}}.card{{border-top:2px solid var(--accent);padding-top:20px}}.card header span{{color:var(--accent-text);font-weight:700;font-size:13px;letter-spacing:.08em}}.card h2{{font-size:32px;margin:7px 0}}.card p{{color:var(--muted)}}video{{width:100%;display:block;background:#fff;border:1px solid var(--line)}}nav{{display:flex;flex-wrap:wrap;gap:14px;margin-top:12px}}a{{color:var(--accent-text);text-underline-offset:3px}}@media(max-width:600px){{main{{padding:30px 16px 60px}}.card h2{{font-size:26px}}}}</style><main><p class="identity">Modelos razonadores · Technical review candidate</p><h1>Bilingual motion review</h1><p class="lead">Twelve localized videos from one reusable framework. Horizontal and vertical outputs, captions, transcripts and chapters are generated from the same timeline. This package is internal QA evidence; it does not imply Technical GOLDEN or Golden Example approval.</p><section class="grid">{''.join(cards)}</section></main>'''
    (args.out / "index.html").write_text(doc)
    print(json.dumps({"unit": "modelos-razonadores", "outputs": len(rows), "variants": len(rows)*2, "review": str(args.out / 'index.html')}, ensure_ascii=False))

if __name__ == "__main__":
    main()
