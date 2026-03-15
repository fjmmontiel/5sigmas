"""
build_posts.py

Para cada post de LinkedIn genera:
  posts/<serie>/<post>/
    carousel.html   ← carrusel completo viewable en el navegador (standalone)
    post.md         ← guía de publicación: caption, hashtags, orden de slides
    01_hook.png     ← slide exportada lista para subir a LinkedIn
    02_*.png
    ...

Uso:
    .venv/bin/python scripts/build_posts.py
    .venv/bin/python scripts/build_posts.py --post 1
    .venv/bin/python scripts/build_posts.py --series fundamentos-ia-cap1
"""

import argparse
import asyncio
import base64
import struct
from pathlib import Path

from playwright.async_api import async_playwright

ROOT     = Path(__file__).resolve().parents[1]
SNIPPETS = ROOT / "exports" / "snippets"
POSTS_OUT = ROOT / "documentacion_interna" / "posts"

SLIDE_W = 1080
SLIDE_H = 1080

# ---------------------------------------------------------------------------
# Brand tokens
# ---------------------------------------------------------------------------

BRAND_LABEL = "5SIGMAS"      # ← cambia el tagline aquí
FONT_STACK  = '"Inter", "Avenir Next", "Segoe UI", Arial, sans-serif'
GRADIENT    = "linear-gradient(90deg, #26A69A 0%, #324AB2 40%, #FFB343 80%)"

_DARK = dict(
    bg="#0b1220", bg_card="#131e30", text="#e2e8f0",
    muted="#94a3b8", primary="#7cc7ff", accent="#f8c15c",
    border="rgba(255,255,255,0.07)", logo_stop="#e2e8f0",
)
_LIGHT = dict(
    bg="#ffffff", bg_card="#f1f5f9", text="#0f172a",
    muted="#64748b", primary="#146eeb", accent="#e07b00",
    border="rgba(15,23,42,0.08)", logo_stop="#0F172A",
)

def _t(theme): return _DARK if theme == "dark" else _LIGHT

def _logo(t):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 120" height="26">'
        f'<defs><linearGradient id="lg{id(t)}" x1="0%" y1="0%" x2="100%" y2="100%">'
        f'<stop offset="0%" stop-color="#26A69A"/>'
        f'<stop offset="40%" stop-color="#324AB2"/>'
        f'<stop offset="75%" stop-color="#FFB343"/>'
        f'<stop offset="100%" stop-color="{t["logo_stop"]}"/>'
        f'</linearGradient></defs>'
        f'<text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" '
        f'font-family="Inter,sans-serif" font-size="68" letter-spacing="-4" fill="url(#lg{id(t)})">'
        f'<tspan font-weight="800">5</tspan><tspan dx="-22" font-weight="800">\u03c3</tspan>'
        f'</text></svg>'
    )

def _b64(rel_path):
    p = SNIPPETS / rel_path
    if not p.exists():
        raise FileNotFoundError(f"Imagen no encontrada: {p}")
    return "data:image/png;base64," + base64.b64encode(p.read_bytes()).decode()

def _img_ratio(rel_path):
    """Returns width/height ratio of a PNG by reading its IHDR chunk."""
    p = SNIPPETS / rel_path
    with open(p, "rb") as f:
        f.read(8); f.read(4); f.read(4)
        w = struct.unpack(">I", f.read(4))[0]
        h = struct.unpack(">I", f.read(4))[0]
    return w / h

def _snippet_img_html(data_uri, rel_path, t):
    """Render snippet image without side clipping.

    Portrait (<1.0): width:100%, height:auto — container overflow:hidden clips
      bottom naturally, hiding the animation footer bar.
    Landscape (>=1.0): inner div is position:relative so the absolute-positioned
      mask sits at the bottom of the IMAGE (not the container), covering the
      animation's footer bar with the slide background color. No side clipping.
    """
    ratio = _img_ratio(rel_path)
    if ratio < 1.0:
        return f'<img src="{data_uri}" style="width:100%;height:auto;display:block;"/>'
    return (
        f'<div style="position:relative;width:100%;">'
        f'<img src="{data_uri}" style="width:100%;height:auto;display:block;"/>'
        f'<div style="position:absolute;bottom:0;left:0;right:0;height:60px;'
        f'background:{t["bg"]};"></div>'
        f'</div>'
    )

# ---------------------------------------------------------------------------
# Slide CSS (compartido entre carousel.html y renders individuales)
# ---------------------------------------------------------------------------

def _slide_css(t):
    return f"""
    * {{ margin:0; padding:0; box-sizing:border-box; }}
    html, body {{ width:{SLIDE_W}px; height:{SLIDE_H}px; background:{t['bg']};
                  font-family:{FONT_STACK}; color:{t['text']}; overflow:hidden; }}
    .slide {{
      width:{SLIDE_W}px; height:{SLIDE_H}px;
      display:flex; flex-direction:column;
      position:relative; overflow:hidden;
      background:{t['bg']}; color:{t['text']};
    }}
    .accent-bar {{ height:4px; flex-shrink:0; background:{GRADIENT}; }}
    .top-bar {{
      display:flex; justify-content:space-between; align-items:center;
      padding:22px 64px 0; flex-shrink:0;
    }}
    .lbl {{ font-size:11px; font-weight:700; letter-spacing:.14em;
             text-transform:uppercase; color:{t['primary']}; }}
    .num {{ font-size:12px; font-weight:600; letter-spacing:.04em;
             color:{t['muted']}; opacity:.7; }}
    .footer {{
      display:flex; align-items:center; justify-content:space-between;
      padding:0 64px 28px; flex-shrink:0;
    }}
    .brand-text {{ font-size:10px; font-weight:700; letter-spacing:.15em;
                   text-transform:uppercase; color:{t['muted']}; opacity:.6; }}
    .divider {{ width:44px; height:3px; background:{GRADIENT};
                border-radius:2px; margin-bottom:28px; }}
    /* hook */
    .hook-content {{ flex:1; padding:40px 64px 72px;
                     display:flex; flex-direction:column; justify-content:flex-end; }}
    .hook-headline {{ font-size:96px; font-weight:900; line-height:1.0;
                      letter-spacing:-.04em; margin-bottom:0; }}
    .hook-highlight {{ font-size:96px; font-weight:900; line-height:1.0;
                       letter-spacing:-.04em; color:{t['primary']}; margin-bottom:44px; }}
    .hook-lead {{ font-size:28px; font-weight:400; line-height:1.55; color:{t['muted']}; }}
    .hook-deco {{ position:absolute; bottom:68px; right:64px;
                  font-size:220px; font-weight:900; line-height:1;
                  color:{t['primary']}; opacity:.045; pointer-events:none; user-select:none; }}
    .hook-quote-mark {{ font-size:120px; font-weight:900; line-height:.8;
                        color:{t['primary']}; opacity:.12; margin-bottom:-20px; font-family:Georgia,serif; }}
    .hook-quote-text {{ font-size:38px; font-weight:700; line-height:1.25;
                        letter-spacing:-.02em; font-style:italic; margin-bottom:28px; }}
    .hook-quote-attr {{ font-size:16px; font-weight:500; color:{t['muted']}; }}
    /* steps */
    .steps-content {{ flex:1; padding:72px 64px 40px;
                      display:flex; flex-direction:column; justify-content:flex-start; }}
    .steps-title {{ font-size:44px; font-weight:800; line-height:1.2;
                    letter-spacing:-.02em; margin-bottom:40px; }}
    .step-item {{ display:flex; align-items:flex-start; gap:20px; padding:18px 0;
                  border-bottom:1px solid {t['border']}; }}
    .step-circle {{
      width:42px; height:42px; border-radius:50%; flex-shrink:0;
      display:flex; align-items:center; justify-content:center;
      font-size:16px; font-weight:800;
      background:{t['primary']}1a; color:{t['primary']};
    }}
    .step-text {{ font-size:22px; line-height:1.5; color:{t['muted']}; padding-top:9px; }}
    .step-text strong {{ font-weight:700; color:{t['text']}; }}
    .bullet-arrow {{ font-size:18px; font-weight:700; color:{t['primary']};
                     flex-shrink:0; padding-top:2px; }}
    .steps-note {{ font-size:18px; line-height:1.6; color:{t['muted']};
                   margin-top:32px; padding-top:0; }}
    /* comparison */
    .comparison-content {{ flex:1; padding:24px 64px 16px;
                           display:flex; flex-direction:column; }}
    .compare-sup {{ font-size:12px; font-weight:700; letter-spacing:.1em;
                    text-transform:uppercase; color:{t['muted']}; margin-bottom:16px; }}
    .compare-cols {{ display:flex; gap:16px; flex:1; }}
    .compare-col {{ flex:1; border-radius:16px; padding:32px 28px;
                    display:flex; flex-direction:column; justify-content:space-between; background:{t['bg_card']}; }}
    .col-tag {{ font-size:9px; font-weight:700; letter-spacing:.14em; text-transform:uppercase;
                padding:4px 12px; border-radius:6px; width:fit-content; margin-bottom:20px; }}
    .col-tag-n {{ background:{t['border']};           color:{t['muted']};   }}
    .col-tag-a {{ background:{t['primary']}1a;         color:{t['primary']}; }}
    .col-title {{ font-size:20px; font-weight:700; line-height:1.35; margin-bottom:16px; }}
    .col-item  {{ font-size:17px; line-height:1.55; color:{t['muted']}; padding:4px 0; }}
    .col-code  {{ font-size:13px; font-weight:600; font-family:monospace;
                  padding:10px 14px; border-radius:8px; margin-top:16px; line-height:1.5;
                  background:{t['border']}; color:{t['text']}; }}
    .col-note  {{ font-size:13px; margin-top:12px; color:{t['muted']}; opacity:.65; }}
    .col-icon  {{ width:40px; height:40px; border-radius:10px; margin-bottom:16px;
                  display:flex; align-items:center; justify-content:center;
                  font-size:22px; background:{t['border']}; }}
    /* stat */
    .stat-content {{ flex:1; padding:40px 64px 24px;
                     display:flex; flex-direction:column; justify-content:center; }}
    .stat-big   {{ font-size:160px; font-weight:900; line-height:1;
                   letter-spacing:-.04em; color:{t['primary']}; }}
    .stat-unit  {{ font-size:40px; font-weight:700; color:{t['primary']}; }}
    .stat-label {{ font-size:12px; font-weight:700; letter-spacing:.12em;
                   text-transform:uppercase; margin-top:8px; margin-bottom:28px; color:{t['muted']}; }}
    .stat-stmt  {{ font-size:28px; font-weight:700; line-height:1.3;
                   letter-spacing:-.01em; margin-bottom:16px; }}
    .stat-ctx   {{ font-size:18px; line-height:1.6; color:{t['muted']}; }}
    .stat-deco  {{ position:absolute; top:60px; right:56px; width:280px; height:280px;
                   border-radius:50%; background:{t['primary']}; opacity:.04; }}
    /* snippet */
    .snippet-img-area {{
      flex:1; padding:20px 64px 0;
      display:flex; align-items:flex-start; min-height:0; overflow:hidden;
    }}
    .snippet-img-area img {{
      max-width:100%; max-height:100%; width:100%;
      object-fit:contain; object-position:top center;
      border-radius:12px; display:block;
    }}
    .snippet-caption {{ padding:14px 64px 8px; flex-shrink:0;
                        font-size:16px; line-height:1.5; color:{t['muted']}; }}
    .caption-tag {{ font-size:9px; font-weight:700; letter-spacing:.12em;
                    text-transform:uppercase; color:{t['primary']}; margin-right:6px; }}
    /* table */
    .table-content {{ flex:1; padding:72px 64px 40px;
                      display:flex; flex-direction:column; justify-content:flex-start; }}
    .table-title {{ font-size:38px; font-weight:800; letter-spacing:-.01em; margin-bottom:36px; }}
    .dt {{ width:100%; border-collapse:collapse; }}
    .dt th {{ font-size:10px; font-weight:700; letter-spacing:.1em; text-transform:uppercase;
              text-align:left; padding:12px 16px; color:{t['muted']};
              border-bottom:2px solid {t['border']}; }}
    .dt td {{ font-size:17px; line-height:1.45; padding:15px 16px;
              vertical-align:middle; color:{t['muted']}; }}
    .dt tr:nth-child(even) td {{ background:{t['bg_card']}; }}
    .dt td.cm {{ font-weight:700; color:{t['text']}; }}
    .cdot {{ display:inline-block; width:8px; height:8px; border-radius:50%;
             margin-right:10px; vertical-align:middle; }}
    /* cta */
    .cta-content {{ flex:1; padding:40px 64px 32px;
                    display:flex; flex-direction:column; justify-content:center; position:relative; }}
    .cta-deco {{ position:absolute; top:16px; right:64px; font-size:200px; font-weight:900;
                 line-height:1; color:{t['primary']}; opacity:.045; user-select:none; }}
    .cta-headline {{ font-size:52px; font-weight:800; line-height:1.2; letter-spacing:-.02em; }}
    .cta-sub  {{ font-size:18px; margin-top:16px; line-height:1.55; color:{t['muted']}; }}
    .cta-link {{ font-size:22px; font-weight:700; margin-top:36px; color:{t['primary']}; }}
    """


# ---------------------------------------------------------------------------
# Slide inner HTML builders (return div.slide content)
# ---------------------------------------------------------------------------

def _top(label, n, total):
    return f'<div class="top-bar"><span class="lbl">{label}</span><span class="num">{n:02d} / {total:02d}</span></div>'

def _footer(t):
    return f'<div class="footer"><span class="brand-text">{BRAND_LABEL}</span>{_logo(t)}</div>'

def _node_icon():
    return ('<svg width="28" height="28" viewBox="0 0 40 40">'
            '<circle cx="20" cy="20" r="6" fill="currentColor" opacity=".7"/>'
            '<circle cx="8" cy="10" r="3" fill="currentColor" opacity=".35"/>'
            '<circle cx="32" cy="10" r="3" fill="currentColor" opacity=".35"/>'
            '<circle cx="8" cy="30" r="3" fill="currentColor" opacity=".35"/>'
            '<circle cx="32" cy="30" r="3" fill="currentColor" opacity=".35"/>'
            '<line x1="20" y1="20" x2="8" y2="10" stroke="currentColor" stroke-width="1.5" opacity=".25"/>'
            '<line x1="20" y1="20" x2="32" y2="10" stroke="currentColor" stroke-width="1.5" opacity=".25"/>'
            '<line x1="20" y1="20" x2="8" y2="30" stroke="currentColor" stroke-width="1.5" opacity=".25"/>'
            '<line x1="20" y1="20" x2="32" y2="30" stroke="currentColor" stroke-width="1.5" opacity=".25"/>'
            '</svg>')


def _slide_div(spec, n, total):
    """Returns <div class='slide dark|light'>…</div> with real content."""
    theme  = spec.get("theme", "light")
    t      = _t(theme)
    label  = spec.get("label", "")
    stype  = spec["type"]

    header  = _top(label, n, total)
    footer  = _footer(t)

    # ── hook ──────────────────────────────────────────────────────
    if stype == "hook":
        headline = spec.get("headline", "").replace("\n", "<br>")
        highlight = spec.get("highlight", "")
        lead      = spec.get("lead", "")
        deco      = spec.get("post_num", "")
        hl_html   = f'<div class="hook-highlight">{highlight}</div>' if highlight else ""
        lead_html = f'<div class="hook-lead">{lead}</div>' if lead else ""
        deco_html = f'<div class="hook-deco">{deco}</div>' if deco else ""
        content = (f'<div class="hook-content">'
                   f'<div class="hook-headline">{headline}</div>'
                   f'{hl_html}{lead_html}'
                   f'</div>{deco_html}')

    # ── hook_quote ────────────────────────────────────────────────
    elif stype == "hook_quote":
        quote   = spec.get("quote", "")
        attr    = spec.get("attr", "")
        counter = spec.get("counter", "")
        content = (f'<div class="hook-content">'
                   f'<div class="hook-quote-mark">\u201c</div>'
                   f'<div class="hook-quote-text">{quote}</div>'
                   f'<div class="hook-quote-attr">{attr}</div>'
                   f'<div style="margin-top:32px;font-size:22px;font-weight:700;color:{t["primary"]};">{counter}</div>'
                   f'</div>')

    # ── steps ─────────────────────────────────────────────────────
    elif stype == "steps":
        title = spec.get("title", "").replace("\n", "<br>")
        items = spec.get("items", [])
        note  = spec.get("note", "")
        items_html = ""
        for i, item in enumerate(items, 1):
            bold = item.get("bold", "")
            text = item.get("text", "")
            bold_html = f'<strong>{bold}</strong> ' if bold else ""
            items_html += (f'<div class="step-item">'
                           f'<div class="step-circle">{i}</div>'
                           f'<div class="step-text">{bold_html}{text}</div>'
                           f'</div>')
        note_html = f'<div class="steps-note">{note}</div>' if note else ""
        content = (f'<div class="steps-content">'
                   f'<div class="divider"></div>'
                   f'<div class="steps-title">{title}</div>'
                   f'{items_html}{note_html}'
                   f'</div>')

    # ── comparison ────────────────────────────────────────────────
    elif stype == "comparison":
        sup   = spec.get("suptitle", "")
        left  = spec["left"]
        right = spec["right"]

        def _col(col, tag_cls, icon_color):
            items = "".join(f'<div class="col-item">{it}</div>' for it in col.get("items", []))
            formula = (f'<div class="col-code">{col["formula"]}</div>'
                       if col.get("formula") else "")
            note = (f'<div class="col-note">{col["note"]}</div>'
                    if col.get("note") else "")
            return (f'<div class="compare-col">'
                    f'<div class="col-icon" style="color:{icon_color}">{_node_icon()}</div>'
                    f'<div class="col-tag {tag_cls}">{col["tag"]}</div>'
                    f'<div class="col-title">{col.get("title","").replace(chr(10),"<br>")}</div>'
                    f'{items}{formula}{note}'
                    f'</div>')

        content = (f'<div class="comparison-content">'
                   f'<div class="compare-sup">{sup}</div>'
                   f'<div class="compare-cols">'
                   f'{_col(left,  "col-tag-n", t["muted"])}'
                   f'{_col(right, "col-tag-a", t["primary"])}'
                   f'</div></div>')

    # ── stat ──────────────────────────────────────────────────────
    elif stype == "stat":
        number    = spec.get("number", "")
        unit      = spec.get("unit", "")
        lbl       = spec.get("stat_label", spec.get("label", ""))
        statement = spec.get("statement", "").replace("\n", "<br>")
        ctx       = spec.get("context", "")
        content = (f'<div class="stat-content">'
                   f'<div class="stat-deco"></div>'
                   f'<div class="divider"></div>'
                   f'<div><span class="stat-big">{number}</span>'
                   f'<span class="stat-unit">{unit}</span></div>'
                   f'<div class="stat-label">{lbl}</div>'
                   f'<div class="stat-stmt">{statement}</div>'
                   f'<div class="stat-ctx">{ctx}</div>'
                   f'</div>')

    # ── snippet ───────────────────────────────────────────────────
    elif stype == "snippet":
        data_uri = _b64(spec["img"])
        tag      = spec.get("tag", "")
        caption  = spec.get("caption", "")
        # Derive concept name from label e.g. "IA — Inteligencia Artificial" → "Inteligencia Artificial"
        lbl     = spec.get("label", "")
        concept = lbl.split(" — ", 1)[-1] if " — " in lbl else lbl
        tag_html = (f'<div style="font-size:9px;font-weight:700;letter-spacing:.14em;'
                    f'text-transform:uppercase;color:{t["primary"]};margin-bottom:14px;">'
                    f'{tag}</div>') if tag else ""
        content = (
            f'<div style="padding:28px 64px 12px;flex-shrink:0;">'
            f'{tag_html}'
            f'<div style="font-size:58px;font-weight:900;line-height:1.08;'
            f'letter-spacing:-.03em;margin-bottom:8px;">{concept}</div>'
            f'<div style="font-size:18px;line-height:1.5;color:{t["muted"]};">{caption}</div>'
            f'</div>'
            f'<div style="flex:1;overflow:hidden;min-height:0;background:{t["bg"]};">'
            + _snippet_img_html(data_uri, spec["img"], t) +
            f'</div>'
        )

    # ── table ─────────────────────────────────────────────────────
    elif stype == "table":
        title   = spec.get("title", "")
        headers = spec.get("headers", [])
        rows    = spec.get("rows", [])
        dots    = ["#146eeb", "#26A69A", "#FFB343", "#324AB2", "#f8c15c"]
        ths = "".join(f'<th>{h}</th>' for h in headers)
        trs = ""
        for i, row in enumerate(rows):
            dot = f'<span class="cdot" style="background:{dots[i % len(dots)]}"></span>'
            cells = "".join(
                f'<td class="cm">{dot}{c}</td>' if j == 0
                else f'<td>{c}</td>'
                for j, c in enumerate(row)
            )
            trs += f'<tr>{cells}</tr>'
        content = (f'<div class="table-content">'
                   f'<div class="divider"></div>'
                   f'<div class="table-title">{title}</div>'
                   f'<table class="dt"><thead><tr>{ths}</tr></thead>'
                   f'<tbody>{trs}</tbody></table>'
                   f'</div>')

    # ── cta ───────────────────────────────────────────────────────
    elif stype == "cta":
        headline = spec.get("headline", "").replace("\n", "<br>")
        sub      = spec.get("sub", "")
        link     = spec.get("url_text", "Link en bio. →")
        content = (f'<div class="cta-content">'
                   f'<div class="cta-deco">\u2192</div>'
                   f'<div class="divider"></div>'
                   f'<div class="cta-headline">{headline}</div>'
                   f'<div class="cta-sub">{sub}</div>'
                   f'<div class="cta-link">{link}</div>'
                   f'</div>')

    else:
        content = f'<div style="flex:1;display:flex;align-items:center;justify-content:center;font-size:24px;color:{t["muted"]};">[tipo desconocido: {stype}]</div>'

    return (f'<div class="slide" style="background:{t["bg"]};color:{t["text"]};">'
            f'<div class="accent-bar"></div>'
            f'{header}{content}{footer}'
            f'</div>')


# ---------------------------------------------------------------------------
# Standalone HTML page for Playwright (one slide per page)
# ---------------------------------------------------------------------------

def _standalone_page(slide_div_html, theme):
    t = _t(theme)
    css = _slide_css(t)
    return (f'<!doctype html><html><head><meta charset="utf-8">'
            f'<link rel="preconnect" href="https://fonts.googleapis.com">'
            f'<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=block" rel="stylesheet">'
            f'<style>{css}</style></head><body>{slide_div_html}</body></html>')


# ---------------------------------------------------------------------------
# Carousel HTML (standalone, base64 images, viewable en browser)
# ---------------------------------------------------------------------------

def _carousel_html(post):
    title   = f"Post {post['post']} — {post['slug'].replace('_', ' ').title()}"
    slides  = post["slides"]
    total   = len(slides)

    # Build all slide divs
    slides_sections = ""
    for i, spec in enumerate(slides, 1):
        slide_div = _slide_div(spec, i, total)
        slides_sections += (
            f'<section class="slide-section" id="s{i}" data-index="{i}">'
            f'  <div class="slide-frame">{slide_div}</div>'
            f'  <div class="slide-info">'
            f'    <span class="si-num">{i} / {total}</span>'
            f'    <span class="si-label">{spec.get("label","")}</span>'
            f'    <span class="si-type">{spec["type"]}</span>'
            f'  </div>'
            f'</section>\n'
        )

    dots = "".join(
        f'<button class="dot" data-target="{i}" title="Slide {i}"></button>'
        for i in range(1, total + 1)
    )

    # CSS that needs both theme-agnostic slide CSS and showcase styles
    # For carousel we embed a universal slide CSS (works for both themes)
    t_light = _t("light")
    t_dark  = _t("dark")

    return f"""<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>5Sigmas · {title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=block" rel="stylesheet">
  <style>
    /* ── Showcase wrapper ── */
    *, *::before, *::after {{ box-sizing:border-box; margin:0; padding:0; }}
    html, body {{ background:#0d1117; font-family:{FONT_STACK}; height:100%; }}

    .carousel-header {{
      position:fixed; top:0; left:0; right:0; z-index:100;
      background:rgba(13,17,23,.92); backdrop-filter:blur(8px);
      border-bottom:1px solid rgba(255,255,255,.06);
      display:flex; align-items:center; justify-content:space-between;
      padding:12px 32px; gap:20px;
    }}
    .ch-title {{
      font-size:13px; font-weight:700; color:#e2e8f0; white-space:nowrap;
    }}
    .ch-counter {{
      font-size:12px; font-weight:600; color:#64748b;
    }}
    .ch-nav {{ display:flex; gap:8px; }}
    .ch-btn {{
      background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.1);
      color:#94a3b8; border-radius:8px; padding:6px 14px;
      font-size:13px; font-weight:600; cursor:pointer; transition:all .15s;
    }}
    .ch-btn:hover {{ background:rgba(255,255,255,.12); color:#e2e8f0; }}

    .slides-container {{
      padding-top:56px;
      scroll-snap-type: y mandatory;
      overflow-y: scroll;
      height: 100vh;
    }}

    .slide-section {{
      scroll-snap-align: start;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      gap: 20px;
    }}

    .slide-frame {{
      /* the slide itself is 1080×1080 — scale down for screen */
      transform-origin: top center;
      transform: scale(var(--scale, 0.65));
      flex-shrink: 0;
      /* compensate for scale */
      margin-bottom: calc((1080px * var(--scale, 0.65) - 1080px));
    }}

    .slide-info {{
      display:flex; align-items:center; gap:16px; padding:0 8px;
    }}
    .si-num  {{ font-size:11px; font-weight:700; color:#7cc7ff; }}
    .si-label{{ font-size:11px; color:#64748b; }}
    .si-type {{
      font-size:9px; font-weight:700; letter-spacing:.1em; text-transform:uppercase;
      background:rgba(255,255,255,.05); color:#475569;
      padding:2px 8px; border-radius:4px;
    }}

    /* Dots */
    .dots-bar {{
      position:fixed; bottom:20px; left:50%; transform:translateX(-50%);
      display:flex; gap:8px; z-index:100;
      background:rgba(13,17,23,.8); padding:8px 16px; border-radius:999px;
      backdrop-filter:blur(8px);
    }}
    .dot {{
      width:8px; height:8px; border-radius:50%; border:none; cursor:pointer;
      background:rgba(255,255,255,.2); transition:all .2s;
    }}
    .dot.active {{ background:#7cc7ff; width:24px; border-radius:4px; }}

    /* Slide CSS (dark + light themes via inline style on .slide) */
    .slide {{
      width:1080px; height:1080px;
      display:flex; flex-direction:column;
      position:relative; overflow:hidden;
    }}
    .accent-bar {{ height:4px; flex-shrink:0; background:{GRADIENT}; }}
    .top-bar {{
      display:flex; justify-content:space-between; align-items:center;
      padding:22px 64px 0; flex-shrink:0;
    }}
    .lbl {{ font-size:10px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; }}
    .num {{ font-size:11px; font-weight:600; letter-spacing:.04em; opacity:.5; }}
    .footer {{
      display:flex; align-items:center; justify-content:space-between;
      padding:0 64px 28px; flex-shrink:0;
    }}
    .brand-text {{ font-size:9px; font-weight:700; letter-spacing:.15em;
                   text-transform:uppercase; opacity:.4; }}
    .divider {{ width:44px; height:3px; background:{GRADIENT};
                border-radius:2px; margin-bottom:28px; }}
    .hook-content {{ flex:1; padding:52px 64px 40px;
                     display:flex; flex-direction:column; justify-content:flex-start; }}
    .hook-headline {{ font-size:62px; font-weight:900; line-height:1.08; letter-spacing:-.03em; margin-bottom:6px; }}
    .hook-highlight {{ font-size:62px; font-weight:900; line-height:1.08; letter-spacing:-.03em; margin-bottom:36px; }}
    .hook-lead {{ font-size:22px; font-weight:400; line-height:1.55; }}
    .hook-deco {{ position:absolute; bottom:68px; right:64px; font-size:220px; font-weight:900;
                  line-height:1; opacity:.045; pointer-events:none; user-select:none; }}
    .hook-quote-mark {{ font-size:120px; font-weight:900; line-height:.8; opacity:.12; margin-bottom:-20px; font-family:Georgia,serif; }}
    .hook-quote-text {{ font-size:38px; font-weight:700; line-height:1.25; letter-spacing:-.02em; font-style:italic; margin-bottom:28px; }}
    .hook-quote-attr {{ font-size:16px; font-weight:500; }}
    .steps-content {{ flex:1; padding:40px 64px 24px; display:flex; flex-direction:column; justify-content:center; }}
    .steps-title {{ font-size:32px; font-weight:800; line-height:1.25; letter-spacing:-.02em; margin-bottom:32px; }}
    .step-item {{ display:flex; align-items:flex-start; gap:18px; padding:11px 0; }}
    .step-circle {{ width:36px; height:36px; border-radius:50%; flex-shrink:0;
                    display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:800; }}
    .step-text {{ font-size:19px; line-height:1.55; padding-top:7px; }}
    .step-text strong {{ font-weight:700; }}
    .bullet-arrow {{ font-size:18px; font-weight:700; flex-shrink:0; padding-top:2px; }}
    .steps-note {{ font-size:16px; line-height:1.6; margin-top:20px; padding-top:20px; }}
    .comparison-content {{ flex:1; padding:24px 64px 16px; display:flex; flex-direction:column; }}
    .compare-sup {{ font-size:12px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; margin-bottom:16px; }}
    .compare-cols {{ display:flex; gap:16px; flex:1; }}
    .compare-col {{ flex:1; border-radius:16px; padding:32px 28px; display:flex; flex-direction:column; }}
    .col-tag {{ font-size:9px; font-weight:700; letter-spacing:.14em; text-transform:uppercase;
                padding:4px 12px; border-radius:6px; width:fit-content; margin-bottom:20px; }}
    .col-title {{ font-size:20px; font-weight:700; line-height:1.35; margin-bottom:16px; }}
    .col-item  {{ font-size:17px; line-height:1.55; padding:4px 0; }}
    .col-code  {{ font-size:13px; font-weight:600; font-family:monospace; padding:10px 14px;
                  border-radius:8px; margin-top:16px; line-height:1.5; }}
    .col-note  {{ font-size:13px; margin-top:12px; opacity:.65; }}
    .col-icon  {{ width:40px; height:40px; border-radius:10px; margin-bottom:16px;
                  display:flex; align-items:center; justify-content:center; font-size:22px; }}
    .stat-content {{ flex:1; padding:40px 64px 24px; display:flex; flex-direction:column; justify-content:center; }}
    .stat-big   {{ font-size:160px; font-weight:900; line-height:1; letter-spacing:-.04em; }}
    .stat-unit  {{ font-size:40px; font-weight:700; }}
    .stat-label {{ font-size:12px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; margin-top:8px; margin-bottom:28px; }}
    .stat-stmt  {{ font-size:28px; font-weight:700; line-height:1.3; letter-spacing:-.01em; margin-bottom:16px; }}
    .stat-ctx   {{ font-size:18px; line-height:1.6; }}
    .stat-deco  {{ position:absolute; top:60px; right:56px; width:280px; height:280px; border-radius:50%; opacity:.04; }}
    .snippet-img-area {{ flex:1; padding:20px 64px 0; display:flex; align-items:flex-start; min-height:0; overflow:hidden; }}
    .snippet-img-area img {{ max-width:100%; max-height:100%; width:100%; object-fit:contain; object-position:top center; border-radius:12px; display:block; }}
    .snippet-caption {{ padding:14px 64px 8px; flex-shrink:0; font-size:16px; line-height:1.5; }}
    .caption-tag {{ font-size:9px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; margin-right:6px; }}
    .table-content {{ flex:1; padding:36px 64px 24px; display:flex; flex-direction:column; justify-content:center; }}
    .table-title {{ font-size:28px; font-weight:800; letter-spacing:-.01em; margin-bottom:28px; }}
    .dt {{ width:100%; border-collapse:collapse; }}
    .dt th {{ font-size:10px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; text-align:left; padding:12px 16px; }}
    .dt td {{ font-size:17px; line-height:1.45; padding:15px 16px; vertical-align:middle; }}
    .dt td.cm {{ font-weight:700; }}
    .cdot {{ display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:10px; vertical-align:middle; }}
    .cta-content {{ flex:1; padding:40px 64px 32px; display:flex; flex-direction:column; justify-content:center; position:relative; }}
    .cta-deco {{ position:absolute; top:16px; right:64px; font-size:200px; font-weight:900; line-height:1; opacity:.045; user-select:none; }}
    .cta-headline {{ font-size:52px; font-weight:800; line-height:1.2; letter-spacing:-.02em; }}
    .cta-sub  {{ font-size:18px; margin-top:16px; line-height:1.55; }}
    .cta-link {{ font-size:22px; font-weight:700; margin-top:36px; }}

    /* Scale calculation via JS */
  </style>
</head>
<body>

<header class="carousel-header">
  <span class="ch-title">Post {post["post"]} · {post["slug"].replace("_", " ").title()}</span>
  <span class="ch-counter" id="counter">1 / {total}</span>
  <nav class="ch-nav">
    <button class="ch-btn" onclick="navigate(-1)">← Anterior</button>
    <button class="ch-btn" onclick="navigate(1)">Siguiente →</button>
  </nav>
</header>

<div class="slides-container" id="container">
{slides_sections}
</div>

<div class="dots-bar">{dots}</div>

<script>
  const container  = document.getElementById('container');
  const counter    = document.getElementById('counter');
  const sections   = document.querySelectorAll('.slide-section');
  const dots       = document.querySelectorAll('.dot');
  const frames     = document.querySelectorAll('.slide-frame');
  let current      = 1;

  function setScale() {{
    const avail = Math.min(window.innerHeight - 56 - 80, window.innerWidth - 40) * 0.85;
    const scale = Math.min(avail / 1080, 1);
    document.documentElement.style.setProperty('--scale', scale);
    frames.forEach(f => {{
      f.style.marginBottom = `${{(1080 * scale - 1080)}}px`;
    }});
  }}
  setScale();
  window.addEventListener('resize', setScale);

  function goTo(n) {{
    n = Math.max(1, Math.min({total}, n));
    current = n;
    sections[n-1].scrollIntoView({{behavior:'smooth', block:'start'}});
    counter.textContent = `${{n}} / {total}`;
    dots.forEach((d,i) => d.classList.toggle('active', i===n-1));
  }}

  function navigate(dir) {{ goTo(current + dir); }}

  dots.forEach((d,i) => d.addEventListener('click', () => goTo(i+1)));

  document.addEventListener('keydown', e => {{
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') navigate(1);
    if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   navigate(-1);
  }});

  const observer = new IntersectionObserver(entries => {{
    entries.forEach(e => {{
      if (e.isIntersecting && e.intersectionRatio > 0.5) {{
        const i = parseInt(e.target.dataset.index);
        current = i;
        counter.textContent = `${{i}} / {total}`;
        dots.forEach((d,j) => d.classList.toggle('active', j===i-1));
      }}
    }});
  }}, {{threshold: 0.5}});
  sections.forEach(s => observer.observe(s));

  goTo(1);
</script>
</body>
</html>"""


# ---------------------------------------------------------------------------
# Post markdown content
# ---------------------------------------------------------------------------

_POST_MD = {
    1: {
        "title": "Post 1 — El marco para entender cualquier sistema de IA",
        "semana": "Semana 1",
        "audiencia": "Todos los perfiles — el más accesible, mayor alcance esperado",
        "tema": "Dark",
        "caption": """\
La gente habla de IA como si fuera una sola cosa. No lo es.

Hay una jerarquía, y confundirla genera errores de expectativas, de diseño y de negocio.

El mapa tiene cuatro niveles. [→ desliza]

IA — el paraguas general. Sistemas que clasifican, predicen, deciden o generan.
ML — una rama que aprende desde datos, sin reglas escritas a mano.
DL — redes de muchas capas para imagen, audio, lenguaje.
GenAI — orientada a generar. Texto, imagen, código, audio.

Una aclaración que vale la pena:
"Generativa" describe el tipo de salida, no el tipo de modelo.
Mucha confusión en conversaciones de negocio viene exactamente de ahí.

Cualquier sistema de IA se puede ubicar respondiendo tres preguntas:
¿Qué familia tecnológica usa? ¿De dónde saca la señal para mejorar? ¿Qué cambia por dentro cuando entrena?

Artículo completo con animaciones interactivas en bio.""",
        "hashtags": "#InteligenciaArtificial #MachineLearning #DeepLearning #GenAI #FundamentosIA",
        "primer_comentario": "Artículo completo con todos los conceptos, animaciones interactivas y simuladores: [URL del artículo]",
        "slides_tabla": [
            ("01_hook.png",    "Hook de apertura — dark"),
            ("02_ia.png",      "IA — el paraguas general"),
            ("03_ml.png",      "ML — aprende desde datos"),
            ("04_dl.png",      "DL — redes profundas"),
            ("05_gen.png",     "GenAI — genera texto, imagen, código"),
            ("06_cta.png",     "CTA — link en bio"),
        ],
    },
    2: {
        "title": "Post 2 — Cómo aprende una IA por dentro",
        "semana": "Semana 4",
        "audiencia": "Perfiles técnicos y data scientists",
        "tema": "Light",
        "caption": """\
"La IA aprende de los datos."

Vale. ¿Pero qué cambia exactamente dentro cuando entrena?

Depende del algoritmo. La intuición más útil es esta:
cada familia ajusta algo distinto.

Árboles de decisión → aprenden preguntas y umbrales. El mejor cuestionario para separar casos.
Naive Bayes → aprenden probabilidades por conteo. Una tabla de evidencias que se actualiza.
K-means → aprenden la posición de centros de grupos. Imanes que se mueven en el mapa de datos.
Redes neuronales → ajustan pesos en capas. Redistribuyen influencia entre señales para bajar el error.

Todos siguen el mismo bucle: predice, mide el error, ajusta, repite.
Lo que cambia es qué se ajusta.

El artículo tiene simuladores interactivos para ver cada uno en acción. Link en bio.""",
        "hashtags": "#MachineLearning #Algoritmos #DataScience #RedesNeuronales #IA",
        "primer_comentario": "Artículo completo con simuladores interactivos de redes neuronales, árboles, k-means y Naive Bayes: [URL del artículo]",
        "slides_tabla": [
            ("01_hook.png",     "Hook de apertura"),
            ("02_bucle.png",    "El bucle universal del aprendizaje"),
            ("03_arboles.png",  "Árboles de decisión"),
            ("04_bayes.png",    "Naive Bayes"),
            ("05_kmeans.png",   "K-means"),
            ("06_redes.png",    "Redes neuronales"),
            ("07_resumen.png",  "Tabla resumen — los 4 mecanismos"),
            ("08_cta.png",      "CTA — link en bio"),
        ],
    },
    3: {
        "title": "Post 3 — Hay 4 formas de enseñarle algo a una IA. La mayoría solo conoce una.",
        "semana": "Semana 2",
        "audiencia": "Técnicos y curiosos — pregunta de engagement alta",
        "tema": "Light",
        "caption": """\
Cuando una IA aprende, ¿de dónde sale el profesor?

Esa pregunta cambia todo el diseño del sistema.
Y hay cuatro respuestas posibles. [→ desliza]

Supervisado — el profesor es humano. Ejemplos etiquetados: spam / no spam, fraude / no fraude.
No supervisado — no hay etiquetas. El sistema busca estructura solo. Segmentación, agrupaciones, anomalías.
Auto-supervisado — el propio dato genera la señal. Así entrenan GPT y BERT. Sin etiquetado manual a escala.
Refuerzo — prueba, error y recompensa. Así juega AlphaGo. Así aprende un robot a caminar.

El 80% de los proyectos empresariales son supervisados.
Entender los otros tres marca la diferencia cuando los datos no vienen etiquetados, que es más frecuente de lo que parece.

¿Cuál usas en tus proyectos?""",
        "hashtags": "#MachineLearning #AprendizajeAutomatico #DataScience #LLM #IA",
        "primer_comentario": "Artículo completo con animaciones interactivas por tipo de aprendizaje: [URL del artículo]",
        "slides_tabla": [
            ("01_hook.png",           "Hook de apertura"),
            ("02_supervisado.png",    "Aprendizaje supervisado"),
            ("03_no_supervisado.png", "Aprendizaje no supervisado"),
            ("04_auto.png",           "Auto-supervisado"),
            ("05_refuerzo.png",       "Aprendizaje por refuerzo (RL)"),
            ("06_negocio.png",        "Clave de negocio"),
            ("07_cta.png",            "CTA — link en bio"),
        ],
    },
    4: {
        "title": "Post 4 — Por qué construir con IA es diferente a construir software",
        "semana": "Semana 3",
        "audiencia": "Producto, negocio, tech leads — el más diferenciador para perfiles senior",
        "tema": "Light (slides 1-5) + Dark (slide 5 MLOps)",
        "caption": """\
La diferencia más importante entre software e IA no está en que uno sea "más avanzado".
Está en dónde viven las reglas.

En software clásico, las reglas las escribes tú.
En IA, las reglas emergen del entrenamiento.

Eso cambia cómo se falla, cómo se depura y cómo se mantiene.

Hay tres consecuencias que mucha gente no espera:

El modelo puede degradarse si los datos del mundo cambian.
Necesita monitorización continua, no solo despliegue.
Un modelo entrenado no es un producto. Es el paso 3 de 8.

A ese ciclo completo se le llama MLOps.

Sin monitorización tienes una demo.
Con versionado, feedback y control operativo, empiezas a tener un sistema real.

Artículo completo con animaciones interactivas en bio.""",
        "hashtags": "#MLOps #SoftwareEngineering #ProductoIA #DataScience #IA",
        "primer_comentario": "Artículo completo con el ciclo MLOps detallado y animaciones interactivas: [URL del artículo]",
        "slides_tabla": [
            ("01_hook.png",          "Hook de apertura"),
            ("02_comparacion.png",   "Software clásico vs IA — comparación"),
            ("03_sw2.png",           "Software 2.0 — la lógica se aprende"),
            ("04_consecuencias.png", "Tres consecuencias inesperadas"),
            ("05_mlops.png",         "El ciclo MLOps — dark"),
            ("06_cta.png",           "CTA — link en bio"),
        ],
    },
}


def _post_md(post):
    meta = _POST_MD[post["post"]]
    slides_rows = "\n".join(
        f"| {i+1} | `{fname}` | {desc} |"
        for i, (fname, desc) in enumerate(meta["slides_tabla"])
    )
    return f"""# {meta['title']}

**Publicar:** {meta['semana']}
**Audiencia:** {meta['audiencia']}
**Tema visual:** {meta['tema']}

---

## Checklist de publicación

- [ ] Abrir LinkedIn → Crear publicación → Añadir documento (carrusel PDF o imágenes)
- [ ] Subir las {len(meta['slides_tabla'])} diapositivas **en el orden de la tabla** (ver abajo)
- [ ] Pegar el caption completo
- [ ] Añadir los hashtags al final del caption
- [ ] Primera hora: responder todos los comentarios para favorecer el alcance
- [ ] Anclar el artículo completo en el primer comentario

---

## Carrusel — subir en este orden

| # | Archivo | Contenido |
|---|---------|-----------|
{slides_rows}

> Todos los archivos están en esta misma carpeta.

---

## Caption

```
{meta['caption']}
```

---

## Hashtags

```
{meta['hashtags']}
```

---

## Primer comentario (anclar)

```
{meta['primer_comentario']}
```
"""


# ---------------------------------------------------------------------------
# Export slides via Playwright
# ---------------------------------------------------------------------------

async def _export_slides(post, out_dir: Path, carousel_path: Path):
    slides = post["slides"]
    print(f"  [playwright] exportando {len(slides)} slides...")
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": SLIDE_W, "height": SLIDE_H},
            device_scale_factor=2.0,
        )
        page = await context.new_page()

        for i, spec in enumerate(slides, 1):
            theme = spec.get("theme", "light")
            t     = _t(theme)
            slide_div = _slide_div(spec, i, len(slides))
            html  = _standalone_page(slide_div, theme)

            await page.set_viewport_size({"width": SLIDE_W, "height": SLIDE_H})
            await page.set_content(html, wait_until="load", timeout=30000)
            await page.wait_for_load_state("networkidle", timeout=20000)
            await page.evaluate("() => document.fonts ? document.fonts.ready : Promise.resolve()")
            await page.wait_for_timeout(350)

            slide_el = await page.query_selector(".slide")
            fname = f"{spec['id']}.png"
            out_path = out_dir / fname
            await slide_el.screenshot(path=str(out_path), animations="disabled")
            print(f"    → {out_path.relative_to(ROOT)}")

        await browser.close()


# ---------------------------------------------------------------------------
# Main build
# ---------------------------------------------------------------------------

async def build(post_filter: int | None, series: str, out_base: Path):
    from generate_post_slides import POSTS  # reuse the same post definitions

    posts = [p for p in POSTS if post_filter is None or p["post"] == post_filter]
    if not posts:
        print(f"No hay posts que coincidan.")
        return

    for post in posts:
        slug    = post["slug"]
        out_dir = out_base / series / f"post_{post['post']}_{slug}"
        out_dir.mkdir(parents=True, exist_ok=True)

        print(f"\n[post {post['post']}] {slug} → {out_dir.relative_to(ROOT)}")

        # 1. carousel.html
        carousel_path = out_dir / "carousel.html"
        carousel_path.write_text(_carousel_html(post), encoding="utf-8")
        print(f"  ✓ carousel.html")

        # 2. post.md
        md_path = out_dir / "post.md"
        md_path.write_text(_post_md(post), encoding="utf-8")
        print(f"  ✓ post.md")

        # 3. PNG exports
        await _export_slides(post, out_dir, carousel_path)

    print(f"\n[build] Listo — {sum(len(p['slides']) for p in posts)} slides exportadas.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--post",   type=int, default=None)
    parser.add_argument("--series", default="fundamentos-ia-cap1")
    parser.add_argument("--out",    default="documentacion_interna/posts")
    args = parser.parse_args()

    import sys
    sys.path.insert(0, str(Path(__file__).parent))

    out_base = ROOT / args.out
    asyncio.run(build(args.post, args.series, out_base))


if __name__ == "__main__":
    main()
