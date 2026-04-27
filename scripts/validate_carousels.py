#!/usr/bin/env python3
"""
validate_carousels.py — Validador determinístico de carousel.html para 5Sigmas.

Comprueba las reglas gráficas y estructurales consolidadas en CLAUDE.md.
Sale con código 0 si todo pasa, 1 si hay algún FAIL.

Uso:
    .venv/bin/python3.14 scripts/validate_carousels.py
    .venv/bin/python3.14 scripts/validate_carousels.py --path "from-cave-to-agi/cap5"
    .venv/bin/python3.14 scripts/validate_carousels.py --file distribution/linkedin/posts/from-cave-to-agi/cap5/post_4_robotica/carousel.html
"""

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
POSTS_DIR = ROOT / "distribution/linkedin/posts"

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
    """Return [(data_id, slide_html), ...] para cada .slide-section.

    Soporta dos formatos:
    - Actual:  <div class="slide-section" data-id="...">
    - Legado:  <div class="slide-section" id="sN" data-index="N">
    """
    slides = []
    # Intentar formato actual (data-id)
    parts = re.split(r'<div\s+class="slide-section"\s+data-id="', html)
    if len(parts) > 1:
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

    # Fallback: formato legado (<section> o <div> con data-index)
    parts = re.split(r'<(?:div|section)\s+class="slide-section"[^>]+data-index="', html)
    for part in parts[1:]:
        m = re.match(r'(\d+)"', part)
        if not m:
            continue
        data_id = f"slide_{m.group(1)}"
        boundary = re.search(
            r'(?=<(?:div|section)\s+class="slide-section"|<div\s+class="dots-bar")', part
        )
        content = part[: boundary.start()] if boundary else part
        slides.append((data_id, content))
    return slides


def has_class(html: str, cls: str) -> bool:
    return f'class="{cls}"' in html or f'class=\'{cls}\'' in html or f'"{cls}"' in html


def count_pattern(html: str, pattern: str) -> int:
    return len(re.findall(pattern, html))


def extract_first_block(html: str, class_name: str) -> str | None:
    pattern = rf'<div\s+class="[^"]*\b{re.escape(class_name)}\b[^"]*"[^>]*>(.*?)</div>'
    match = re.search(pattern, html, re.DOTALL)
    return match.group(1) if match else None


def extract_support_visual_blocks(html: str) -> list[str]:
    pattern = r'<div\s+class="[^"]*\bsupport-visual\b[^"]*"[^>]*>(.*?)</div>'
    return re.findall(pattern, html, re.DOTALL)


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


def check_file(html: str, path: Path, v2: bool = False, pulido: bool = False) -> list[Result]:
    """Reglas a nivel de archivo completo."""
    results = []

    if pulido:
        # P1 — Sin listas densas (step-item / col-item) > 3 ítems en total
        step_items = count_pattern(html, r'class="step-item"')
        col_items  = count_pattern(html, r'class="col-item"')
        results.append(Result(
            "P1 · sin listas > 3 ítems (step-item + col-item)",
            step_items + col_items <= 3,
            f"step-item: {step_items}, col-item: {col_items}" if step_items + col_items > 3 else ""
        ))

        # P3 — Sin patrones legacy densos (steps-content, comparison-content)
        has_steps      = "steps-content" in html
        has_comparison = "comparison-content" in html
        results.append(Result(
            "P3 · sin patrones legacy (steps-content / comparison-content)",
            not has_steps and not has_comparison,
            f"steps-content: {has_steps}, comparison-content: {has_comparison}" if has_steps or has_comparison else ""
        ))

        # P4 — Al menos un slide usa una primitiva SVE declarada
        has_sve = bool(re.search(
            r'class="[^"]*\b(beat-content|flow-content|contrast-content|metric-content|proof-content)\b',
            html
        ))
        results.append(Result(
            "P4 · usa primitivas SVE (beat/flow/contrast/metric/proof)",
            has_sve,
            "ningún slide tiene clase beat-content/flow-content/contrast-content/metric-content/proof-content" if not has_sve else ""
        ))

        primitive_css_checks = [
            ("beat-content", r"\.beat-content\b"),
            ("flow-content", r"\.flow-content\b"),
            ("contrast-content", r"\.contrast-content\b"),
            ("metric-content", r"\.metric-content\b"),
            ("metric-content--visual", r"\.metric-content--visual\b"),
            ("proof-content", r"\.proof-content\b"),
        ]
        missing_css = [
            cls for cls, css_pattern in primitive_css_checks
            if cls in html and not re.search(css_pattern, html)
        ]
        results.append(Result(
            "P5 · toda primitiva usada tiene su CSS local",
            not missing_css,
            f"faltan estilos para: {', '.join(missing_css)}" if missing_css else ""
        ))

    if pulido:
        # F1 pulido — Fondo light (#f7f9fc en CSS de .slide)
        ok_bg = len(re.findall(r'background:#f7f9fc', html))
        results.append(Result(
            "F1 · slide background:#f7f9fc (pulido light)",
            ok_bg > 0,
            f"encontrado {ok_bg}x #f7f9fc"
        ))
    elif v2:
        # F1v2 — Fondo light (#f7f9fc en CSS de .slide)
        ok_bg_v2 = len(re.findall(r'background:#f7f9fc', html))
        results.append(Result(
            "F1 · slide background:#f7f9fc (v2 light)",
            ok_bg_v2 > 0,
            f"encontrado {ok_bg_v2}x #f7f9fc"
        ))
    else:
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

    # F9 — body font-family: v1 = "Inter" primero, v2 = "Avenir Next" primero, pulido = "Inter" primero
    if pulido:
        inter_first = bool(re.search(
            r'html,\s*body\s*\{[^}]*font-family:\s*"Inter"',
            html
        ))
        results.append(Result(
            'F9 · body font-family empieza por "Inter" (pulido)',
            inter_first,
            'cambiar a font-family:"Inter","Avenir Next","Segoe UI",Arial,sans-serif' if not inter_first else ""
        ))
    elif v2:
        avenir_first = bool(re.search(
            r'html,\s*body\s*\{[^}]*font-family:\s*"Avenir Next"',
            html
        ))
        results.append(Result(
            'F9 · body font-family empieza por "Avenir Next" (v2)',
            avenir_first,
            'v2 debe usar font-family:"Avenir Next","Avenir","Segoe UI",...' if not avenir_first else ""
        ))
    else:
        inter_first = bool(re.search(
            r'html,\s*body\s*\{[^}]*font-family:\s*"Inter"',
            html
        ))
        results.append(Result(
            'F9 · body font-family empieza por "Inter"',
            inter_first,
            'cambiar a font-family:"Inter","Avenir Next","Segoe UI",Arial,sans-serif' if not inter_first else ""
        ))

    # F10 — Google Fonts Inter cargado vía <link>
    inter_link = bool(re.search(
        r'fonts\.googleapis\.com/css2\?family=Inter',
        html
    ))
    results.append(Result(
        "F10 · Google Fonts Inter cargado vía <link>",
        inter_link,
        'añadir <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=block" rel="stylesheet">' if not inter_link else ""
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


def check_slide(data_id: str, html: str, total: int, v2: bool = False, pulido: bool = False) -> list[Result]:
    """Reglas por slide individual."""
    results = []
    is_hook    = "hook" in data_id
    is_cta     = "cta"  in data_id
    is_snippet = 'class="snippet-img-area"' in html or "snippet-img-area" in html
    is_content = not is_hook and not is_cta and not is_snippet

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

    # P2 — Elemento dominante ≥ 40px en content slides (pulido)
    if pulido and not is_hook and not is_cta and not is_snippet:
        sizes = [int(m) for m in re.findall(r'font-size:(\d+)px', html)]
        dominant = [s for s in sizes if s >= 40]
        dominant_classes = bool(re.search(
            r'class="[^"]*\b(beat-symbol|flow-key|contrast-main|metric-number|metric-headline|metric-visual|proof-formula)\b',
            html
        ))
        results.append(Result(
            "P2 · elemento dominante ≥ 40px (pulido)",
            bool(dominant) or dominant_classes,
            (
                f"tamaños detectados: {sorted(set(sizes), reverse=True)[:6]}"
                if not dominant and not dominant_classes
                else (
                    f"ok: {sorted(set(dominant), reverse=True)[:4]}"
                    if dominant
                    else "ok: dominante detectado por clase SVE"
                )
            )
        ))

    # S4 — slide tiene el fondo correcto según versión
    if pulido:
        bad_dark = "background:#0b1220" in html or "background:#0d1117" in html
        results.append(Result(
            "S4 · slide sin background dark inline (pulido light)",
            not bad_dark,
            "eliminar background dark inline" if bad_dark else ""
        ))
    elif v2:
        # v2: el fondo viene del CSS de clase (.slide { background:#f7f9fc }),
        # no hay inline style — el check pasa si no hay fondo dark incorrecto
        bad_dark = "background:#0b1220" in html or "background:#0d1117" in html
        results.append(Result(
            "S4 · slide sin background dark inline (v2 light)",
            not bad_dark,
            "eliminar background:#0b1220 inline en el div .slide" if bad_dark else ""
        ))
    else:
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
        # Clases de título legacy (cap1): comp-title, eq-title, gen-title, bifold-title, nflow-title, etc.
        has_custom_title = bool(re.search(r'class="[a-z-]+-title"', html))
        # Pulido: SVE family labels (beat-label, flow-label, etc.) equivalen al divider
        has_sve_label    = pulido and bool(re.search(
            r'class="[^"]*\b(beat-label|flow-label|contrast-label|metric-label|proof-label)\b', html
        ))

        results.append(Result(
            "S12 · tiene .divider antes del título (o compare-sup válido)",
            has_divider or has_compare_sup or has_custom_title or has_sve_label,
            "falta el divider gradiente corporativo" if not has_divider and not has_compare_sup and not has_custom_title and not has_sve_label else ""
        ))
        # Aceptar también headings inline (font-weight:800/900 a tamaño de encabezado)
        has_inline_heading = bool(re.search(
            r'font-size:\s*\d{2,3}px[^"]*font-weight:\s*[89]00|font-weight:\s*[89]00[^"]*font-size:\s*\d{2,3}px',
            html
        ))
        # Pulido: SVE dominant elements (beat-symbol, flow-key, contrast-main, metric-number, proof-formula)
        has_sve_dominant = pulido and bool(re.search(
            r'class="[^"]*\b(beat-symbol|flow-key|contrast-main|metric-number|metric-headline|proof-formula)\b', html
        ))
        heading_ok = has_steps_title or has_inline_heading or has_compare_sup or has_custom_title or has_sve_dominant
        results.append(Result(
            "S13 · tiene heading (steps-title o inline font-weight:800+)",
            heading_ok,
            "añadir steps-title o heading inline con font-weight:800+" if not heading_ok else ""
        ))

    if pulido and is_content:
        support_blocks = extract_support_visual_blocks(html)
        dominant_supports = len(re.findall(r'class="[^"]*\bsupport-visual--dominant\b', html))
        results.append(Result(
            "S14a · máximo 1 support-visual dominante por slide",
            dominant_supports <= 1,
            f"dominantes detectados: {dominant_supports}" if dominant_supports > 1 else ""
        ))

        animated_support = bool(re.search(
            r'<animate\b|<animateTransform\b|<animateMotion\b|<set\b|@keyframes|animation:',
            ''.join(support_blocks),
            re.IGNORECASE,
        ))
        results.append(Result(
            "S14b · support-visual sin animaciones en LinkedIn",
            not animated_support,
            "eliminar animate/SMIL/CSS animation dentro del soporte visual" if animated_support else ""
        ))

        text_nodes = len(re.findall(r'<text\b', ''.join(support_blocks)))
        too_many_labels = text_nodes > 10
        results.append(Result(
            "S14c · support-visual sin densidad excesiva de labels",
            not too_many_labels,
            f"text nodes detectados: {text_nodes}" if too_many_labels else ""
        ))

        tiny_font_sizes = [
            int(value)
            for value in re.findall(r'font-size[:=]"?(\d+)', ''.join(support_blocks))
            if int(value) < 8
        ]
        results.append(Result(
            "S14d · support-visual sin labels microscópicos (<8)",
            not tiny_font_sizes,
            f"font-sizes pequeños: {tiny_font_sizes[:6]}" if tiny_font_sizes else ""
        ))

    # S15 — Pulido: flow-key overflow y límite de cajas (SVE: max 3)
    if pulido and is_content and 'class="flow-chain"' in html:
        n_boxes = len(re.findall(r'class="flow-box"', html))
        # S15a — SVE rule: max 3 cajas en un flow
        if n_boxes > 3:
            results.append(Result(
                f"S15a · flow máximo 3 cajas (SVE)",
                False,
                f"encontrado {n_boxes} cajas — dividir en 3 o fusionar pasos"
            ))
        elif n_boxes >= 2:
            # S15b — Overflow: palabra individual demasiado larga para el ancho disponible
            # Geometry: slide=1080px, h-padding=88px each, arrow=36px each
            # Inter 900 char_width ≈ 0.62 × font_px (calibrado vs CONFIRMACIÓN visible overflow)
            chain_width = 1080 - 88 * 2  # 904px
            arrow_width = 36 * (n_boxes - 1)
            per_box = (chain_width - arrow_width) / n_boxes - 44  # 22px padding each side
            flow_key_matches = re.findall(
                r'class="flow-key"[^>]*style="[^"]*font-size:(\d+)px[^"]*"[^>]*>(.*?)</div>',
                html, re.DOTALL
            )
            overflow_words = []
            for fsize_str, content in flow_key_matches:
                fsize = int(fsize_str)
                char_width = 0.62 * fsize
                text = re.sub(r'<[^>]+>', '', content).strip()
                for word in text.split():
                    est_width = len(word) * char_width
                    if est_width > per_box:
                        overflow_words.append(f'"{word}" (~{int(est_width)}px > {int(per_box)}px avail)')
            results.append(Result(
                f"S15b · flow-key sin overflow ({n_boxes} cajas, ~{int(per_box)}px/caja)",
                not overflow_words,
                f"palabras largas: {overflow_words}" if overflow_words else ""
            ))

    # S16 — Pulido: metric visual V2
    if pulido and is_content and 'metric-content--visual' in html:
        has_metric_visual = bool(re.search(r'class="[^"]*\bmetric-visual\b', html))
        results.append(Result(
            "S16a · metric V2 incluye .metric-visual",
            has_metric_visual,
            "añadir contenedor .metric-visual como bloque dominante" if not has_metric_visual else ""
        ))

        has_takeaway = bool(re.search(r'class="[^"]*\bmetric-takeaway\b', html))
        results.append(Result(
            "S16b · metric V2 incluye .metric-takeaway",
            has_takeaway,
            "añadir una takeaway única después del visual" if not has_takeaway else ""
        ))

        visual_idx = html.find("metric-visual")
        takeaway_idx = html.find("metric-takeaway")
        results.append(Result(
            "S16c · metric-visual aparece antes de metric-takeaway",
            visual_idx != -1 and takeaway_idx != -1 and visual_idx < takeaway_idx,
            "reordenar la slide para que el visual domine y el takeaway cierre" if visual_idx != -1 and takeaway_idx != -1 and visual_idx > takeaway_idx else ""
        ))

        visual_block = extract_first_block(html, "metric-visual")
        small_visuals = []
        if visual_block:
            for tag, attr, value in re.findall(r'<(svg|img)\b[^>]*?(width|style)="([^"]+)"', visual_block, re.DOTALL):
                numeric = None
                if attr == "width":
                    width_match = re.search(r'(\d+)', value)
                    if width_match:
                        numeric = int(width_match.group(1))
                else:
                    width_match = re.search(r'width:\s*(\d+)px', value)
                    if width_match:
                        numeric = int(width_match.group(1))
                if numeric is not None and numeric < 560:
                    small_visuals.append(f"{tag} width={numeric}")
        results.append(Result(
            "S16d · metric V2 sin visuales inline < 560px",
            not small_visuals,
            f"visuales demasiado pequeños: {small_visuals}" if small_visuals else ""
        ))

        takeaway_count = len(re.findall(r'class="[^"]*\bmetric-takeaway\b', html))
        takeaway_text = re.sub(r'<[^>]+>', ' ', extract_first_block(html, "metric-takeaway") or "")
        takeaway_text = re.sub(r'\s+', ' ', takeaway_text).strip()
        short_takeaway = takeaway_count == 1 and len(takeaway_text) <= 220
        results.append(Result(
            "S16e · metric V2 tiene una takeaway única y breve",
            short_takeaway,
            f"takeaways: {takeaway_count}, longitud: {len(takeaway_text)}" if not short_takeaway else ""
        ))

        no_metric_context = 'class="metric-context"' not in html
        results.append(Result(
            "S16f · metric V2 no usa metric-context largo",
            no_metric_context,
            "el contexto largo debe salir de la slide V2" if not no_metric_context else ""
        ))

        oversized_metric = False
        for value in re.findall(r'class="metric-number"[^>]*style="[^"]*font-size:(\d+)px', html):
            if int(value) >= 120:
                oversized_metric = True
                break
        results.append(Result(
            "S16g · metric-number secundario si existe en V2",
            not oversized_metric,
            "reducir metric-number por debajo de 120px o usar metric-headline" if oversized_metric else ""
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
    """Valida un carousel.html, carousel_v2.html o carousel_pulido.html. Retorna (fails, total_checks)."""
    html = carousel_path.read_text(encoding="utf-8")
    v2     = carousel_path.name == "carousel_v2.html"
    pulido = carousel_path.name == "carousel_pulido.html"

    rel = carousel_path.relative_to(ROOT)
    print(f"\n{BOLD}{'─'*70}{RESET}")

    # Detectar formato legado (<section class="slide-section" data-index="...">)
    is_legacy = bool(re.search(r'<section\s+class="slide-section"', html))
    if is_legacy:
        print(f"{BOLD}{rel}{RESET}  {YELLOW}[formato legado — publicado, solo check de fondo]{RESET}")
        print(f"{'─'*70}")
        if v2:
            # v2 legacy: #0b1220 fue reemplazado por #f7f9fc — pasar siempre
            r = Result("F1 · slide background (v2 light, legado)", True, "legado convertido a v2")
            print(repr(r))
            print(f"\n  {YELLOW}{BOLD}LEGADO v2 — 0 error(s) / 1 check{RESET}\n")
            return 0, 1
        ok_bg = len(re.findall(r'background:#0b1220', html)) > 0
        r = Result("F1 · slide background:#0b1220 (legado)", ok_bg)
        print(repr(r))
        fails = 0 if ok_bg else 1
        print(f"\n  {YELLOW}{BOLD}LEGADO — {fails} error(s) / 1 check{RESET}\n")
        return fails, 1

    if pulido:
        mode_label = f"  {DIM}[pulido SVE]{RESET}"
    elif v2:
        mode_label = f"  {DIM}[v2 light]{RESET}"
    else:
        mode_label = ""
    slides = extract_slides(html)
    total = len(slides)
    print(f"{BOLD}{rel}{RESET}  {DIM}({total} slides){RESET}{mode_label}")
    print(f"{'─'*70}")

    all_results: list[Result] = []

    # File-level checks
    print(f"\n  {BOLD}[archivo]{RESET}")
    file_results = check_file(html, carousel_path, v2=v2, pulido=pulido)
    for r in file_results:
        print(repr(r))
    all_results.extend(file_results)

    # Per-slide checks
    for data_id, slide_html in slides:
        print(f"\n  {BOLD}[{data_id}]{RESET}")
        slide_results = check_slide(data_id, slide_html, total, v2=v2, pulido=pulido)
        for r in slide_results:
            print(repr(r))
        all_results.extend(slide_results)

    fails = sum(1 for r in all_results if not r.ok)
    total_checks = len(all_results)

    color = GREEN if fails == 0 else RED
    print(f"\n  {color}{BOLD}{'PASS' if fails == 0 else 'FAIL'} — {fails} error(s) / {total_checks} checks{RESET}\n")
    return fails, total_checks


def find_carousels(path_filter: str | None, file_filter: str | None, pulido: bool = False) -> list[Path]:
    carousel_name = "carousel_pulido.html" if pulido else "carousel.html"
    if file_filter:
        p = Path(file_filter)
        if not p.is_absolute():
            p = ROOT / p
        return [p] if p.exists() else []
    if path_filter:
        base = POSTS_DIR / path_filter
        return sorted(base.rglob(carousel_name))
    return sorted(POSTS_DIR.rglob(carousel_name))


def main():
    parser = argparse.ArgumentParser(description="Valida carousel.html de 5Sigmas")
    parser.add_argument("--path", help="Subfiltro bajo distribution/linkedin/posts/ (ej: from-cave-to-agi/cap5)")
    parser.add_argument("--file", help="Ruta directa a un carousel.html concreto")
    parser.add_argument("--pulido", action="store_true", help="Buscar y validar carousel_pulido.html (modo SVE light)")
    args = parser.parse_args()

    carousels = find_carousels(args.path, args.file, pulido=args.pulido)
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
