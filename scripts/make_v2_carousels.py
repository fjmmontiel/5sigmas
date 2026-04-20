"""
make_v2_carousels.py

Convierte cada carousel.html (tema dark v1) en carousel_v2.html (tema light v2).

No modifica nada en v1. Los archivos v2 conviven en la misma carpeta de cada post.
El CSS principal se reemplaza íntegramente con el de _template_v2.html.
Los colores en estilos inline y bloques <style> adicionales se sustituyen
sistemáticamente de dark → light.

Uso:
    .venv/bin/python3.14 scripts/make_v2_carousels.py
    .venv/bin/python3.14 scripts/make_v2_carousels.py --series from-cave-to-agi
    .venv/bin/python3.14 scripts/make_v2_carousels.py --post post_1_cero
"""

import argparse
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POSTS_DIR = ROOT / "distribution" / "linkedin" / "posts"
TEMPLATE_V2 = ROOT / "distribution" / "linkedin" / "templates" / "_template_v2.html"

# ──────────────────────────────────────────────────────────────────────────────
# Color substitutions: dark (v1) → light (v2)
# Applied to the full document AFTER replacing the main <style> block.
# Order matters: more specific patterns before more general ones.
# ──────────────────────────────────────────────────────────────────────────────
SUBS = [
    # Slide base: remove inline dark background+color from .slide divs
    (r'style="background:#0b1220;color:#e2e8f0;"', 'style=""'),
    (r"style='background:#0b1220;color:#e2e8f0;'", "style=''"),
    (r'background:#0b1220;color:#e2e8f0;', ''),

    # Explicit dark backgrounds remaining
    (r'background:#0b1220', 'background:#f7f9fc'),
    (r'background:#0d1117', 'background:#f7f9fc'),

    # Primary accent: light-blue → corporate blue (legible on white)
    (r'color:#7cc7ff', 'color:#324AB2'),
    (r'stroke:#7cc7ff', 'stroke:#324AB2'),
    (r'fill:#7cc7ff', 'fill:#324AB2'),

    # SVG axis lines / faint strokes: white-over-dark → dark-over-light
    (r'stroke="rgba\(255,255,255,\.18\)"', 'stroke="rgba(0,0,0,.15)"'),
    (r'stroke="rgba\(255,255,255,\.12\)"', 'stroke="rgba(0,0,0,.10)"'),
    (r'stroke="rgba\(255,255,255,\.08\)"', 'stroke="rgba(0,0,0,.07)"'),

    # Primary-blue rgba (step circles, card backgrounds)
    (r'rgba\(124,199,255,\.25\)', 'rgba(50,74,178,.20)'),
    (r'rgba\(124,199,255,\.20\)', 'rgba(50,74,178,.16)'),
    (r'rgba\(124,199,255,\.18\)', 'rgba(50,74,178,.15)'),
    (r'rgba\(124,199,255,\.15\)', 'rgba(50,74,178,.10)'),
    (r'rgba\(124,199,255,\.12\)', 'rgba(50,74,178,.12)'),
    (r'rgba\(124,199,255,\.10\)', 'rgba(50,74,178,.08)'),
    (r'rgba\(124,199,255,\.08\)', 'rgba(50,74,178,.08)'),
    (r'rgba\(124,199,255,\.06\)', 'rgba(50,74,178,.06)'),
    (r'rgba\(124,199,255,\.05\)', 'rgba(50,74,178,.06)'),
    (r'rgba\(124,199,255,\.04\)', 'rgba(50,74,178,.04)'),
    (r'rgba\(124,199,255,\.03\)', 'rgba(50,74,178,.03)'),

    # White-over-dark overlays → black-over-light equivalents
    # Note: patterns with trailing zero FIRST, then bare single-digit forms
    (r'rgba\(255,255,255,\.35\)', 'rgba(0,0,0,.22)'),
    (r'rgba\(255,255,255,\.30\)', 'rgba(0,0,0,.20)'),
    (r'rgba\(255,255,255,\.3\)', 'rgba(0,0,0,.20)'),
    (r'rgba\(255,255,255,\.25\)', 'rgba(0,0,0,.16)'),
    (r'rgba\(255,255,255,\.20\)', 'rgba(0,0,0,.14)'),
    (r'rgba\(255,255,255,\.2\)', 'rgba(0,0,0,.14)'),
    (r'rgba\(255,255,255,\.18\)', 'rgba(0,0,0,.12)'),
    (r'rgba\(255,255,255,\.15\)', 'rgba(0,0,0,.10)'),
    (r'rgba\(255,255,255,\.12\)', 'rgba(0,0,0,.08)'),
    (r'rgba\(255,255,255,\.10\)', 'rgba(0,0,0,.07)'),
    (r'rgba\(255,255,255,\.1\)', 'rgba(0,0,0,.07)'),
    (r'rgba\(255,255,255,\.08\)', 'rgba(0,0,0,.06)'),
    (r'rgba\(255,255,255,\.07\)', 'rgba(0,0,0,.05)'),
    (r'rgba\(255,255,255,\.06\)', 'rgba(0,0,0,.04)'),
    (r'rgba\(255,255,255,\.05\)', 'rgba(0,0,0,.04)'),
    (r'rgba\(255,255,255,\.04\)', 'rgba(0,0,0,.03)'),
    (r'rgba\(255,255,255,\.03\)', 'rgba(0,0,0,.02)'),
    (r'rgba\(255,255,255,\.02\)', 'rgba(0,0,0,.015)'),
    (r'rgba\(255,255,255,\.01\)', 'rgba(0,0,0,.01)'),

    # Pure white text → dark text
    (r'color:#ffffff', 'color:#0f172a'),
    (r'color:#fff\b', 'color:#0f172a'),
    (r'color:#e2e8f0', 'color:#0f172a'),
    (r'color:#f1f5f9', 'color:#1e293b'),
    (r'color:#cbd5e1', 'color:#334155'),
    (r'color:#f8fafc', 'color:#0f172a'),

    # Light grays: insuficiente contraste sobre blanco (#94a3b8 → ~2.9:1, ilegible)
    # Subir a #64748b (~4.6:1) — sigue leyéndose como "muted" pero visible
    (r'color:#94a3b8', 'color:#64748b'),
    # Stroke SVG equivalente
    (r'stroke:#94a3b8', 'stroke:#64748b'),
    (r'fill:#94a3b8', 'fill:#64748b'),

    # Special: dark card surfaces common in chain-flow / timeline slides
    # These are darker-than-bg card fills in v1 → lighter surface in v2
    (r'rgba\(11,18,32,\.6\)', 'rgba(255,255,255,.85)'),
    (r'rgba\(11,18,32,\.5\)', 'rgba(255,255,255,.80)'),
    (r'rgba\(11,18,32,\.4\)', 'rgba(255,255,255,.70)'),
    (r'rgba\(11,18,32,\.8\)', 'rgba(255,255,255,.90)'),
    (r'rgba\(10,18,36,\.88\)', 'rgba(255,255,255,.92)'),
    (r'rgba\(10,18,36,\.7\)', 'rgba(255,255,255,.85)'),
    (r'rgba\(13,17,23,\.8\)', 'rgba(255,255,255,.90)'),
    (r'rgba\(13,17,23,\.6\)', 'rgba(255,255,255,.80)'),

    # SVG fill for dark containers
    (r'fill="#0b1220"', 'fill="#f7f9fc"'),
    (r'fill="#0d1117"', 'fill="#f7f9fc"'),
    (r'fill="rgba\(11,18,32', 'fill="rgba(247,249,252'),
]


def get_v2_style_block() -> str:
    """Extract the <style> block from _template_v2.html."""
    html = TEMPLATE_V2.read_text(encoding="utf-8")
    m = re.search(r"(<style>.*?</style>)", html, re.DOTALL)
    if not m:
        raise RuntimeError("No <style> block found in _template_v2.html")
    return m.group(1)


def convert(html: str, v2_style: str) -> str:
    """Transform a v1 carousel.html into a v2 light-theme version."""
    # 1. Replace the FIRST <style> block (main template CSS) with v2 CSS.
    #    Any additional <style> blocks (custom compositions) remain and
    #    will have their colors updated by the substitutions below.
    first_open = html.find("<style>")
    first_close = html.find("</style>")
    if first_open != -1 and first_close != -1:
        html = html[:first_open] + v2_style + html[first_close + len("</style>"):]

    # 2. Apply color substitutions to the entire document.
    #    This covers: remaining <style> blocks (custom patterns) + all inline styles + SVG attrs.
    for pattern, replacement in SUBS:
        html = re.sub(pattern, replacement, html)

    # 3. Tweak the visible carousel-header and dots-bar bg via class styles
    #    (already handled by the replaced <style> block — no extra step needed).

    return html


def main():
    parser = argparse.ArgumentParser(
        description="Convierte carousel.html → carousel_v2.html (tema light)."
    )
    parser.add_argument("--series", default=None, help="Filtrar por serie (ej: from-cave-to-agi)")
    parser.add_argument("--post", default=None, help="Filtrar por nombre de carpeta de post")
    args = parser.parse_args()

    v2_style = get_v2_style_block()

    search_dir = POSTS_DIR / args.series if args.series else POSTS_DIR
    carousels = sorted(search_dir.rglob("carousel.html"))
    # Exclude template files
    carousels = [c for c in carousels if "_template" not in c.name and "_template" not in str(c.parent)]

    if args.post:
        carousels = [c for c in carousels if args.post in c.parent.name]

    if not carousels:
        print(f"No se encontraron carousel.html en {search_dir}")
        return

    print(f"\n[v2] Convirtiendo {len(carousels)} carousel(s)...\n")
    ok = 0
    for c in carousels:
        try:
            html = c.read_text(encoding="utf-8")
            v2_html = convert(html, v2_style)
            out = c.parent / "carousel_v2.html"
            out.write_text(v2_html, encoding="utf-8")
            print(f"  ✓ {c.parent.relative_to(POSTS_DIR)}")
            ok += 1
        except Exception as e:
            print(f"  ✗ {c.parent.relative_to(POSTS_DIR)}: {e}")

    print(f"\n[v2] {ok}/{len(carousels)} convertidos → carousel_v2.html\n")


if __name__ == "__main__":
    main()
