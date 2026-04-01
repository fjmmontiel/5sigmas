#!/usr/bin/env python3
"""
validate_carousels.py — Validador determinístico de carousel.html para 5Sigmas.

Comprueba las reglas gráficas y estructurales consolidadas en CLAUDE.md.
Sale con código 0 si todo pasa, 1 si hay algún FAIL.

Uso:
    .venv/bin/python3.14 scripts/validate_carousels.py
    .venv/bin/python3.14 scripts/validate_carousels.py --path "from-cave-to-agi/cap5"
    .venv/bin/python3.14 scripts/validate_carousels.py --file documentacion_interna/posts/from-cave-to-agi/cap5/post_4_robotica/carousel.html
"""

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
POSTS_DIR = ROOT / "documentacion_interna/posts"

OK   = "✓"
FAIL = "✗"
WARN = "⚠"

GREEN  = "\033[32m"
RED    = "\033[31m"
YELLOW = "\033[33m"
RESET  = "\033[0m"
BOLD   = "\033[1m"
DIM    = "\033[2m"


# ── HTML helpers ────────────────────────────────────────────────────────────

def extract_slides(html: str) -> list[tuple[str, str]]:
    """Return [(data_id, slide_html), ...] para cada .slide-section."""
    slides = []
    parts = re.split(r'<div\s+class="slide-section"\s+data-id="', html)
    for part in parts[1:]:
        m = re.match(r'([^"]+)"', part)
        if not m:
            continue
        data_id = m.group(1)
        boundary = re.search(
            r'(?=<div\s+class="slide-section"|<div\s+class="dots-bar")', part
        )
        content = part[: boundary.start()] if boundary else part
        slides.append((data_id, content))
    return slides


def has_class(html: str, cls: str) -> bool:
    return f'class="{cls}"' in html or f'class=\'{cls}\'' in html or f'"{cls}"' in html


def count_pattern(html: str, pattern: str) -> int:
    return len(re.findall(pattern, html))


# ── Rule definitions ────────────────────────────────────────────────────────

class Result:
    def __init__(self, rule: str, ok: bool, detail: str = ""):
        self.rule   = rule
        self.ok     = ok
        self.detail = detail

    def __repr__(self):
        sym = f"{GREEN}{OK}{RESET}" if self.ok else f"{RED}{FAIL}{RESET}"
        msg = f"  {sym} {self.rule}"
        if self.detail:
            msg += f"  {DIM}{self.detail}{RESET}"
        return msg


def check_file(html: str, path: Path) -> list[Result]:
    """Reglas a nivel de archivo completo."""
    results = []

    # F1 — Fondo incorrecto (#0d1117 es el fondo del wrapper, no de las slides)
    wrong = len(re.findall(r'background:#0d1117', html))
    ok_bg = len(re.findall(r'background:#0b1220', html))
    results.append(Result(
        "F1 · slide background:#0b1220 (no #0d1117)",
        ok_bg > 0,
        f"encontrado {ok_bg}x #0b1220 / {wrong}x #0d1117"
    ))

    # F2 — accent-bar tiene el gradiente corporativo exacto
    corp_grad = bool(re.search(
        r'accent-bar.*?background:linear-gradient\(90deg,#26A69A.*?#324AB2.*?#FFB343',
        html, re.DOTALL
    ))
    results.append(Result(
        "F2 · accent-bar con gradiente corporativo (#26A69A→#324AB2→#FFB343)",
        corp_grad
    ))

    # F3 — brand-logo tiene el gradiente correcto
    logo_grad = bool(re.search(
        r'brand-logo.*?linear-gradient\(135deg,#26A69A.*?#324AB2.*?#FFB343',
        html, re.DOTALL
    ))
    results.append(Result("F3 · brand-logo con gradiente 135deg", logo_grad))

    # F4 — divider tiene el gradiente corporativo
    divider_grad = bool(re.search(
        r'\.divider\s*\{[^}]*background:linear-gradient\(90deg,#26A69A',
        html
    ))
    results.append(Result("F4 · .divider CSS con gradiente corporativo", divider_grad))

    # F5 — fuente monospace: bare monospace OK en inline styles de slides
    # (Playwright/Chrome renderiza igual que el stack completo en este entorno)
    # Regla omitida intencionalmente — ver feedback 2026-04-01

    # F6 — sin variables de fuente prohibidas (--mf, --rf, --tf)
    bad_vars = re.findall(r'var\(--(mf|rf|tf)\b', html)
    results.append(Result(
        "F6 · sin vars de fuente prohibidas (--mf/--rf/--tf)",
        not bad_vars,
        f"encontrado: {bad_vars}" if bad_vars else ""
    ))

    # F7 — número de dots coincide con número de slides
    slides = extract_slides(html)
    n_slides = len(slides)
    n_dots = count_pattern(html, r'<button class="dot"')
    results.append(Result(
        "F7 · dots count == slide count",
        n_dots == n_slides,
        f"{n_dots} dots / {n_slides} slides"
    ))

    # F8 — counter total en header coincide con slide count
    header_m = re.search(r'<span class="ch-counter"[^>]*>1 / (\d+)<', html)
    if header_m:
        header_total = int(header_m.group(1))
        results.append(Result(
            "F8 · counter header total == slide count",
            header_total == n_slides,
            f"header dice {header_total}, hay {n_slides} slides"
        ))
    else:
        results.append(Result("F8 · counter header total == slide count", False, "counter no encontrado"))

    return results


def check_slide(data_id: str, html: str, total: int) -> list[Result]:
    """Reglas por slide individual."""
    results = []
    is_hook    = "hook" in data_id
    is_cta     = "cta"  in data_id
    is_snippet = 'class="snippet-img-area"' in html or "snippet-img-area" in html
    is_content = not is_hook and not is_cta

    # S1 — accent-bar presente
    results.append(Result(
        "S1 · tiene accent-bar",
        'class="accent-bar"' in html
    ))

    # S2 — top-bar con num zero-padded (NN / TT)
    num_m = re.search(r'class="num"[^>]*>(\d{2} / \d{2})<', html)
    if num_m:
        num_val = num_m.group(1)
        n_str = f"{total:02d}"
        ok_num = num_val.endswith(f"/ {n_str}")
        results.append(Result(
            "S2 · .num zero-padded format (NN / TT)",
            ok_num,
            f"encontrado: '{num_val}' esperado total {n_str}"
        ))
    else:
        results.append(Result("S2 · .num zero-padded format (NN / TT)", False, "no encontrado"))

    # S3 — footer con brand-text y brand-logo
    has_footer     = 'class="footer"'      in html
    has_brand_text = 'class="brand-text"'  in html
    has_brand_logo = 'class="brand-logo"'  in html
    results.append(Result(
        "S3 · footer con brand-text y brand-logo",
        has_footer and has_brand_text and has_brand_logo
    ))

    # S4 — slide tiene background:#0b1220
    results.append(Result(
        "S4 · slide div background:#0b1220",
        "background:#0b1220" in html
    ))

    # Hook-only
    if is_hook:
        results.append(Result("S5 · hook-headline presente",  'class="hook-headline"'  in html))
        results.append(Result("S6 · hook-highlight presente", 'class="hook-highlight"' in html))
        results.append(Result("S7 · hook-lead presente",      'class="hook-lead"'      in html))

    # CTA-only
    if is_cta:
        results.append(Result("S8  · cta-headline presente",  'class="cta-headline"' in html))
        results.append(Result("S9  · cta-sub presente",       'class="cta-sub"'      in html))
        results.append(Result("S10 · cta-link presente",      'class="cta-link"'     in html))
        # No flex:1 ni min-height en cta-content inline
        cta_inline = re.search(r'class="cta-content"[^>]*style="([^"]*)"', html)
        if cta_inline:
            style = cta_inline.group(1)
            bad_cta = "flex:1" in style or "min-height" in style
            results.append(Result(
                "S11 · cta-content sin flex:1 / min-height inline",
                not bad_cta,
                f"style inline: {style}" if bad_cta else ""
            ))

    # Content slides (non-hook, non-cta)
    if is_content:
        has_divider      = 'class="divider"'      in html
        has_steps_title  = 'class="steps-title"'  in html
        has_compare_sup  = 'class="compare-sup"'  in html
        # compare-sup es patrón válido para comparison slides sin título grande
        # (layout compacto intencionalmente sin divider ni steps-title)

        results.append(Result(
            "S12 · tiene .divider antes del título (o compare-sup válido)",
            has_divider or has_compare_sup,
            "falta el divider gradiente corporativo" if not has_divider and not has_compare_sup else ""
        ))
        # Aceptar también headings inline (font-weight:800/900 a tamaño de encabezado)
        has_inline_heading = bool(re.search(
            r'font-size:\s*\d{2,3}px[^"]*font-weight:\s*[89]00|font-weight:\s*[89]00[^"]*font-size:\s*\d{2,3}px',
            html
        ))
        heading_ok = has_steps_title or has_inline_heading or has_compare_sup
        results.append(Result(
            "S13 · tiene heading (steps-title o inline font-weight:800+)",
            heading_ok,
            "añadir steps-title o heading inline con font-weight:800+" if not heading_ok else ""
        ))

    # Snippet-only
    if is_snippet:
        caption_tags = re.findall(r'class="caption-tag"[^>]*>(.*?)</\w+>', html, re.DOTALL)
        for tag_text in caption_tags:
            no_anim = "ANIMACIÓN" not in tag_text.upper() and "ANIMACION" not in tag_text.upper()
            results.append(Result(
                "S14 · caption-tag sin 'ANIMACIÓN'",
                no_anim,
                f"texto encontrado: '{tag_text.strip()}'" if not no_anim else ""
            ))
        if not caption_tags:
            results.append(Result("S14 · caption-tag presente en snippet", False, "no encontrado"))

    return results


# ── Main ────────────────────────────────────────────────────────────────────

def validate_file(carousel_path: Path) -> tuple[int, int]:
    """Valida un carousel.html. Retorna (fails, total_checks)."""
    html = carousel_path.read_text(encoding="utf-8")
    slides = extract_slides(html)
    total = len(slides)

    rel = carousel_path.relative_to(ROOT)
    print(f"\n{BOLD}{'─'*70}{RESET}")
    print(f"{BOLD}{rel}{RESET}  {DIM}({total} slides){RESET}")
    print(f"{'─'*70}")

    all_results: list[Result] = []

    # File-level checks
    print(f"\n  {BOLD}[archivo]{RESET}")
    file_results = check_file(html, carousel_path)
    for r in file_results:
        print(repr(r))
    all_results.extend(file_results)

    # Per-slide checks
    for data_id, slide_html in slides:
        print(f"\n  {BOLD}[{data_id}]{RESET}")
        slide_results = check_slide(data_id, slide_html, total)
        for r in slide_results:
            print(repr(r))
        all_results.extend(slide_results)

    fails = sum(1 for r in all_results if not r.ok)
    total_checks = len(all_results)

    color = GREEN if fails == 0 else RED
    print(f"\n  {color}{BOLD}{'PASS' if fails == 0 else 'FAIL'} — {fails} error(s) / {total_checks} checks{RESET}\n")
    return fails, total_checks


def find_carousels(path_filter: str | None, file_filter: str | None) -> list[Path]:
    if file_filter:
        p = Path(file_filter)
        if not p.is_absolute():
            p = ROOT / p
        return [p] if p.exists() else []
    if path_filter:
        base = POSTS_DIR / path_filter
        return sorted(base.rglob("carousel.html"))
    return sorted(POSTS_DIR.rglob("carousel.html"))


def main():
    parser = argparse.ArgumentParser(description="Valida carousel.html de 5Sigmas")
    parser.add_argument("--path", help="Subfiltro bajo documentacion_interna/posts/ (ej: from-cave-to-agi/cap5)")
    parser.add_argument("--file", help="Ruta directa a un carousel.html concreto")
    args = parser.parse_args()

    carousels = find_carousels(args.path, args.file)
    if not carousels:
        print(f"{RED}No se encontraron carousel.html con ese filtro.{RESET}")
        sys.exit(1)

    total_fails = 0
    total_checks = 0
    for c in carousels:
        f, t = validate_file(c)
        total_fails  += f
        total_checks += t

    print(f"{'═'*70}")
    color = GREEN if total_fails == 0 else RED
    print(f"{color}{BOLD}TOTAL — {len(carousels)} archivo(s) · {total_fails} error(s) / {total_checks} checks{RESET}\n")
    sys.exit(0 if total_fails == 0 else 1)


if __name__ == "__main__":
    main()
