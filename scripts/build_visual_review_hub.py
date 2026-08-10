#!/usr/bin/env python3
"""Build a self-contained ``5sigmas.html`` from visual-review artifacts.

The HTML is intentionally portable: images are embedded as data URIs so a
reviewer can download only this file from an Actions artifact and inspect the
rendered evidence without running the repository locally.
"""
from __future__ import annotations

import argparse
import base64
import html
import io
import json
from pathlib import Path

try:
    from PIL import Image
except Exception:  # pragma: no cover - raw embedding remains a valid fallback
    Image = None

IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp"}


def image_uri(path: Path, max_width: int = 1100) -> str:
    suffix = path.suffix.lower()
    mime = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp"}.get(suffix, "application/octet-stream")
    raw: bytes
    if Image is not None:
        try:
            with Image.open(path) as source:
                image = source.convert("RGB")
                if image.width > max_width:
                    height = round(image.height * max_width / image.width)
                    image = image.resize((max_width, height), Image.Resampling.LANCZOS)
                buffer = io.BytesIO()
                image.save(buffer, format="JPEG", quality=78, optimize=True)
                raw = buffer.getvalue()
                mime = "image/jpeg"
        except Exception:
            raw = path.read_bytes()
    else:
        raw = path.read_bytes()
    return f"data:{mime};base64,{base64.b64encode(raw).decode('ascii')}"


def safe_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def card(title: str, image: Path, meta: str = "", warn: bool = False) -> str:
    cls = "card warn" if warn else "card"
    return (
        f'<article class="{cls}"><h3>{html.escape(title)}</h3>'
        f'<img loading="lazy" src="{image_uri(image)}" alt="{html.escape(title)}">'
        f'<div class="meta">{html.escape(meta)}</div></article>'
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--artifact-dir", type=Path, default=Path("artifacts/visual-review"))
    parser.add_argument("--output", type=Path)
    parser.add_argument("--label", default="Visual review")
    args = parser.parse_args()

    root = args.artifact_dir.resolve()
    output = (args.output or (root / "5sigmas.html")).resolve()
    root.mkdir(parents=True, exist_ok=True)

    video_report = safe_json(root / "video-density" / "report.json")
    density_report = safe_json(root / "animation-density" / "report.json")
    contract_report = safe_json(root / "animation-contract" / "report.json")

    responsive_names = [
        "homepage-desktop.png", "homepage-mobile.png",
        "article-desktop.png", "article-mobile.png",
        "responsive-inline-video-poster-mobile.png",
        "video-library-desktop-v2.png", "video-library-mobile-v2.png",
        "video-watch-desktop-v2.png", "video-watch-mobile-v2.png",
        "article-inline-video-desktop-v2.png", "article-inline-video-mobile-v2.png",
    ]
    responsive = [root / name for name in responsive_names if (root / name).is_file()]

    frames = []
    for item in video_report.get("videos") or []:
        for frame in item.get("frames") or []:
            path = root / "video-density" / str(frame.get("file") or "")
            if path.is_file():
                frames.append((item, frame, path))

    ranked = sorted(density_report.get("flags") or [], key=lambda item: item.get("severity", 0), reverse=True)[:16]
    density_cards = []
    for entry in ranked:
        url = str(entry.get("url") or "")
        index = int(entry.get("index") or 0)
        stem = url.strip("/").replace("/", "__")
        path = root / "animation-density" / f"{stem}__{index:02d}__desktop-default.png"
        if not path.is_file():
            continue
        metrics = entry.get("metrics") or {}
        flags = ", ".join(entry.get("flags") or [])
        density_cards.append((url, index, metrics, flags, path))

    contract_images = sorted((root / "animation-contract").glob("*.png")) if (root / "animation-contract").is_dir() else []

    css = """
:root{color-scheme:dark;--bg:#0d1117;--panel:#151b23;--line:#2a3441;--fg:#f2f5f8;--muted:#9da9b5;--teal:#26a69a;--amber:#ffb343;--red:#ef6262}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{max-width:1500px;margin:auto;padding:32px}.eyebrow{color:var(--teal);font-weight:800;text-transform:uppercase;letter-spacing:.12em;font-size:12px}h1{font-size:clamp(32px,5vw,62px);line-height:1;margin:.35rem 0 1rem}h2{margin-top:52px;font-size:28px}h3{font-size:17px;margin:.25rem 0 .7rem}p{color:var(--muted);max-width:92ch}.summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:24px 0}.stat,.card{background:var(--panel);border:1px solid var(--line);border-radius:16px}.stat{padding:16px}.stat b{display:block;font-size:28px}.stat span{color:var(--muted)}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.frames{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.card{padding:12px;overflow:hidden}.card img{display:block;width:100%;height:auto;border-radius:10px;border:1px solid #27313d}.meta{font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--muted);margin-top:8px;overflow-wrap:anywhere}.warn{border-color:#5a4722;background:#1d1a12}.note{padding:16px;border-left:3px solid var(--amber);background:#17150f;border-radius:8px;color:#d4c8ac}.ok{color:#7bd7c9}@media(max-width:900px){main{padding:18px}.summary,.grid{grid-template-columns:1fr}.frames{grid-template-columns:repeat(2,minmax(0,1fr))}}
"""

    pieces = [
        "<!doctype html><html lang=\"es\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">",
        f"<title>5sigmas · {html.escape(args.label)}</title><style>{css}</style></head><body><main>",
        f'<div class="eyebrow">5sigmas · CI evidence</div><h1>{html.escape(args.label)}</h1>',
        '<p>Artefacto autocontenido generado por CI. Resume responsive, vídeo, poster-first lifecycle y los candidatos de animación que requieren revisión visual.</p>',
        '<div class="summary">',
        f'<div class="stat"><b>{len(video_report.get("videos") or [])}</b><span>vídeos muestreados</span></div>',
        f'<div class="stat"><b>{len(frames)}</b><span>frames representativos</span></div>',
        f'<div class="stat"><b>{len(density_report.get("animations") or [])}</b><span>animation shells</span></div>',
        f'<div class="stat"><b>{len(contract_report.get("violations") or [])}</b><span>violaciones de contrato</span></div>',
        '</div>',
    ]

    if responsive:
        pieces.append('<h2>Responsive + video lifecycle</h2><div class="grid">')
        for path in responsive:
            pieces.append(card(path.stem.replace("-", " "), path))
        pieces.append('</div>')

    if frames:
        pieces.append('<h2>Vídeos cambiados · frames representativos</h2>')
        grouped: dict[str, list[tuple[dict, dict, Path]]] = {}
        for item, frame, path in frames:
            grouped.setdefault(str(item.get("path") or "video"), []).append((item, frame, path))
        for video, group in grouped.items():
            first = group[0][0]
            pieces.append(f'<section class="card" style="margin:16px 0"><h3>{html.escape(video)}</h3><div class="meta">{first.get("duration",0):.1f}s · {first.get("width",0)}×{first.get("height",0)} · {html.escape(str(first.get("fps") or ""))}</div><div class="frames">')
            for _, frame, path in group:
                label = f'{round(float(frame.get("fraction") or 0)*100)}% · {float(frame.get("timestamp") or 0):.1f}s'
                pieces.append(f'<figure style="margin:8px 0"><img loading="lazy" src="{image_uri(path, 960)}"><figcaption class="meta">{html.escape(label)}</figcaption></figure>')
            pieces.append('</div></section>')

    if contract_images:
        pieces.append('<h2>Animation contract · changed demos</h2><div class="grid">')
        for path in contract_images:
            pieces.append(card(path.stem.replace("__", " · "), path))
        pieces.append('</div>')

    if density_cards:
        pieces.append('<h2>Animation density · review queue</h2><p>Estos flags son señal de revisión, no fallos automáticos. El gate duro vive en <code>validate_animation_contract.mjs</code>.</p><div class="grid">')
        for url, index, metrics, flags, path in density_cards:
            meta = f"#{index} · {metrics.get('words')} words · {metrics.get('textLeaves')} labels · min {metrics.get('minTextPx')}px · {flags}"
            pieces.append(card(url, path, meta, warn=True))
        pieces.append('</div>')

    if contract_report:
        violations = contract_report.get("violations") or []
        pieces.append('<h2>Contract result</h2>')
        if violations:
            pieces.append('<div class="note"><strong>Violations:</strong><br>' + '<br>'.join(html.escape(str(item)) for item in violations) + '</div>')
        else:
            pieces.append('<p class="ok"><strong>Animation contract passed.</strong></p>')

    pieces.append('</main></body></html>')
    output.write_text(''.join(pieces), encoding="utf-8")
    print(f"Built {output} ({output.stat().st_size / (1024*1024):.1f} MiB).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
