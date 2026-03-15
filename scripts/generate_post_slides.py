"""
generate_post_slides.py

Genera diapositivas visuales para los posts de LinkedIn de 5Sigmas.
Formato: 1080×1080px (cuadrado), 2× device scale → PNGs a 2160px efectivos.
Plantillas: hook · steps · comparison · snippet · table · cta

Uso:
    .venv/bin/python scripts/generate_post_slides.py
    .venv/bin/python scripts/generate_post_slides.py --post 1
    .venv/bin/python scripts/generate_post_slides.py --preview  (solo slide 1 de cada post)
    .venv/bin/python scripts/generate_post_slides.py --out documentacion_interna/posts/fundamentos-ia-cap1
"""

import argparse
import asyncio
import base64
import math
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
SNIPPETS = ROOT / "exports" / "snippets"

SLIDE_W = 1080

# ---------------------------------------------------------------------------
# Brand tokens
# ---------------------------------------------------------------------------

BRAND_LABEL = "5Sigmas · Divulgación de IA sin hype"
FONT_STACK = '"Inter", "Avenir Next", "Segoe UI", Arial, sans-serif'

DARK_BG        = "#0b1220"
DARK_BG_CARD   = "#131e30"
DARK_TEXT      = "#e2e8f0"
DARK_MUTED     = "#94a3b8"
DARK_PRIMARY   = "#7cc7ff"
DARK_ACCENT    = "#f8c15c"
DARK_BORDER    = "rgba(255,255,255,0.07)"

LIGHT_BG       = "#ffffff"
LIGHT_BG_CARD  = "#f1f5f9"
LIGHT_TEXT     = "#0f172a"
LIGHT_MUTED    = "#64748b"
LIGHT_PRIMARY  = "#146eeb"
LIGHT_ACCENT   = "#e07b00"
LIGHT_BORDER   = "rgba(15,23,42,0.08)"

GRADIENT = "linear-gradient(90deg, #26A69A 0%, #324AB2 40%, #FFB343 80%)"


def _tokens(theme: str) -> dict:
    if theme == "dark":
        return dict(
            bg=DARK_BG, bg_card=DARK_BG_CARD, text=DARK_TEXT,
            muted=DARK_MUTED, primary=DARK_PRIMARY, accent=DARK_ACCENT,
            border=DARK_BORDER,
            logo_stop="#e2e8f0",
        )
    return dict(
        bg=LIGHT_BG, bg_card=LIGHT_BG_CARD, text=LIGHT_TEXT,
        muted=LIGHT_MUTED, primary=LIGHT_PRIMARY, accent=LIGHT_ACCENT,
        border=LIGHT_BORDER,
        logo_stop="#0F172A",
    )


def _logo_svg(t: dict) -> str:
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 120" height="44">
  <defs><linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%"  stop-color="#26A69A"/>
    <stop offset="40%" stop-color="#324AB2"/>
    <stop offset="75%" stop-color="#FFB343"/>
    <stop offset="100%" stop-color="{t['logo_stop']}"/>
  </linearGradient></defs>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
    font-family="Inter, sans-serif, Arial" font-size="68" letter-spacing="-4" fill="url(#lg)">
    <tspan font-weight="800">5</tspan><tspan dx="-22" font-weight="800">σ</tspan>
  </text>
</svg>"""


# ---------------------------------------------------------------------------
# Base page wrapper
# ---------------------------------------------------------------------------


def _page_wrap(body_html: str, t: dict, show_footer: bool = True) -> str:
    return f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=block" rel="stylesheet">
  <style>
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    html, body {{
      width: {SLIDE_W}px;
      background: {t['bg']}; font-family: {FONT_STACK};
      color: {t['text']};
    }}
    .slide {{
      width: {SLIDE_W}px;
      display: flex; flex-direction: column;
    }}
    .accent-bar {{
      height: 4px; flex-shrink: 0;
      background: {GRADIENT};
    }}
    .top-bar {{
      display: flex; justify-content: space-between; align-items: center;
      padding: 14px 64px 10px; flex-shrink: 0;
    }}
    .footer {{
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 64px 20px; flex-shrink: 0;
    }}
    .label {{
      font-size: 10px; font-weight: 700; letter-spacing: 0.14em;
      text-transform: uppercase; color: {t['primary']};
    }}
    .slide-num {{
      font-size: 11px; font-weight: 600; letter-spacing: 0.04em;
      color: {t['muted']}; opacity: 0.55;
    }}
    .footer-label {{
      font-size: 9px; font-weight: 700; letter-spacing: 0.13em;
      text-transform: uppercase; color: {t['muted']}; opacity: 0.45;
    }}
    .divider {{
      width: 44px; height: 3px;
      background: {GRADIENT};
      border-radius: 2px; margin-bottom: 24px;
    }}
    .primary {{ color: {t['primary']}; }}
    .accent  {{ color: {t['accent']}; }}
    .muted   {{ color: {t['muted']}; }}
  </style>
</head>
<body>
<div class="slide">
  <div class="accent-bar"></div>
  {body_html}
  {f'<div class="footer"><span class="footer-label">{BRAND_LABEL}</span>{_logo_svg(t)}</div>' if show_footer else ''}
</div>
</body>
</html>"""


# ---------------------------------------------------------------------------
# Template builders
# ---------------------------------------------------------------------------

def _top_bar(label: str, n: int, total: int) -> str:
    return f'<div class="top-bar"><span class="label">{label}</span><span class="slide-num">{n:02d} / {total:02d}</span></div>'


def _build_hook(spec: dict, t: dict, n: int, total: int) -> str:
    headline = spec["headline"].replace("\n", "<br>")
    highlight = spec.get("highlight", "")
    lead = spec.get("lead", "")

    highlight_html = (
        f'<div style="font-size:78px;font-weight:900;line-height:1.05;'
        f'letter-spacing:-0.03em;color:{t["primary"]};margin-top:14px;">'
        f'{highlight}</div>'
    ) if highlight else ""

    lead_html = (
        f'<p style="font-size:24px;font-weight:400;line-height:1.6;'
        f'color:{t["muted"]};margin-top:32px;">{lead}</p>'
    ) if lead else ""

    content = f"""
    <div style="padding:52px 72px 48px;">
      <div style="font-size:90px;font-weight:900;line-height:1.1;letter-spacing:-0.03em;color:{t['text']};">{headline}</div>
      {highlight_html}
      {lead_html}
    </div>"""
    return _page_wrap(_top_bar(spec["label"], n, total) + content, t)


def _build_steps(spec: dict, t: dict, n: int, total: int) -> str:
    title = spec.get("title", "").replace("\n", "<br>")
    items = spec.get("items", [])
    note = spec.get("note", "")

    steps_html = ""
    for i, item in enumerate(items, 1):
        bold = item.get("bold", "")
        text = item.get("text", "")
        bold_html = f'<strong style="color:{t["text"]};font-weight:700;">{bold}</strong> ' if bold else ""
        border = f'border-bottom:1px solid {t["border"]};' if i < len(items) else ""
        steps_html += f"""
        <div style="display:flex;align-items:flex-start;gap:20px;padding:22px 0;{border}">
          <div style="width:44px;height:44px;border-radius:50%;background:{t['primary']}1a;
            color:{t['primary']};display:flex;align-items:center;justify-content:center;
            font-size:17px;font-weight:800;flex-shrink:0;">{i}</div>
          <div style="font-size:22px;line-height:1.5;color:{t['muted']};padding-top:10px;">{bold_html}{text}</div>
        </div>"""

    note_html = (
        f'<p style="font-size:17px;color:{t["muted"]};margin-top:20px;'
        f'padding-top:20px;border-top:1px solid {t["border"]};">{note}</p>'
    ) if note else ""

    content = f"""
    <div style="padding:28px 64px 24px;">
      <div class="divider"></div>
      <div style="font-size:32px;font-weight:800;line-height:1.2;letter-spacing:-0.02em;margin-bottom:16px;">{title}</div>
      {steps_html}
      {note_html}
    </div>"""
    return _page_wrap(_top_bar(spec["label"], n, total) + content, t)


def _build_comparison(spec: dict, t: dict, n: int, total: int) -> str:
    left = spec["left"]
    right = spec["right"]

    def _col(col: dict, is_right: bool = False) -> str:
        tag_color = t["primary"] if is_right else t["muted"]
        tag_bg = f"{t['primary']}18" if is_right else t["border"]
        items_html = ""
        for item in col.get("items", []):
            items_html += f'<div style="font-size:19px;line-height:1.65;color:{t["muted"]};padding:6px 0;">{item}</div>'
        formula = col.get("formula", "")
        formula_html = (
            f'<div style="font-size:15px;font-weight:600;font-family:monospace;color:{t["text"]};'
            f'background:{t["border"]};padding:12px 14px;border-radius:8px;margin-top:auto;padding-top:14px;">{formula}</div>'
        ) if formula else ""
        note = col.get("note", "")
        note_html = f'<p style="font-size:14px;color:{t["muted"]};margin-top:12px;opacity:0.7;">{note}</p>' if note else ""
        title_html = col.get("title", "").replace("\n", "<br>")
        return f"""
        <div style="flex:1;background:{t['bg_card']};border-radius:16px;padding:32px 28px;">
          <div style="font-size:9px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;
            color:{tag_color};background:{tag_bg};padding:5px 12px;border-radius:6px;
            width:fit-content;margin-bottom:20px;">{col['tag']}</div>
          <div style="font-size:21px;font-weight:700;color:{t['text']};line-height:1.3;margin-bottom:20px;">{title_html}</div>
          <div>{items_html}</div>
          {formula_html}{note_html}
        </div>"""

    content = f"""
    <div style="padding:12px 64px 20px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;
        color:{t['muted']};margin-bottom:14px;">{spec.get('suptitle','')}</div>
      <div style="display:flex;gap:20px;align-items:stretch;">
        {_col(left)}
        {_col(right, is_right=True)}
      </div>
    </div>"""
    return _page_wrap(_top_bar(spec["label"], n, total) + content, t)


def _img_data_uri(rel_path: str) -> str:
    path = SNIPPETS / rel_path
    if not path.exists():
        raise FileNotFoundError(f"Snippet no encontrado: {path}")
    data = base64.b64encode(path.read_bytes()).decode()
    return f"data:image/png;base64,{data}"


def _build_snippet(spec: dict, t: dict, n: int, total: int) -> str:
    data_uri = _img_data_uri(spec["img"])
    caption = spec.get("caption", "")
    tag = spec.get("tag", "")

    tag_html = (
        f'<span style="font-size:16px;font-weight:700;letter-spacing:0.08em;'
        f'text-transform:uppercase;color:{t["primary"]};margin-right:8px;">{tag} ·</span>'
    ) if tag else ""

    caption_html = (
        f'<div style="flex-shrink:0;padding:12px 0 4px;">'
        f'<p style="font-size:16px;line-height:1.5;color:{t["muted"]};">{tag_html}{caption}</p>'
        f'</div>'
    ) if caption else ""

    content = f"""
    <div style="padding:12px 52px 16px;display:flex;flex-direction:column;align-items:center;gap:12px;">
      <img src="{data_uri}" style="max-width:100%;width:auto;height:auto;
        display:block;border-radius:12px;"/>
      {caption_html}
    </div>"""
    return _page_wrap(_top_bar(spec["label"], n, total) + content, t, show_footer=False)


def _build_table(spec: dict, t: dict, n: int, total: int) -> str:
    title = spec.get("title", "")
    headers = spec.get("headers", [])
    rows = spec.get("rows", [])

    dot_colors = [t["primary"], "#26A69A", t["accent"], "#324AB2", "#FF6B6B"]

    th_html = "".join(
        f'<th style="font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;'
        f'color:{t["muted"]};text-align:left;padding:14px 16px;'
        f'border-bottom:2px solid {t["border"]};">{h}</th>'
        for h in headers
    )
    rows_html = ""
    for i, row in enumerate(rows):
        bg = t["bg_card"] if i % 2 == 0 else "transparent"
        dot = dot_colors[i % len(dot_colors)]
        cells = ""
        for j, cell in enumerate(row):
            prefix = (
                f'<span style="display:inline-block;width:8px;height:8px;border-radius:50%;'
                f'background:{dot};margin-right:10px;vertical-align:middle;"></span>'
            ) if j == 0 else ""
            cells += (
                f'<td style="padding:18px 16px;font-size:18px;line-height:1.4;'
                f'color:{t["text"] if j==0 else t["muted"]};'
                f'font-weight:{"600" if j==0 else "400"};">{prefix}{cell}</td>'
            )
        rows_html += f'<tr style="background:{bg};">{cells}</tr>'

    note = spec.get("note", "")
    note_html = (
        f'<p style="margin:18px 0 0;font-size:14px;color:{t["muted"]};'
        f'font-style:italic;line-height:1.5;">{note}</p>'
    ) if note else ""

    content = f"""
    <div style="padding:32px 64px 28px;">
      <div class="divider"></div>
      <div style="font-size:32px;font-weight:800;letter-spacing:-0.01em;margin-bottom:28px;">{title}</div>
      <table style="width:100%;border-collapse:collapse;border-radius:12px;overflow:hidden;">
        <thead><tr>{th_html}</tr></thead>
        <tbody>{rows_html}</tbody>
      </table>
      {note_html}
    </div>"""
    return _page_wrap(_top_bar(spec["label"], n, total) + content, t)


def _build_cta(spec: dict, t: dict, n: int, total: int) -> str:
    headline = spec["headline"].replace("\n", "<br>")
    sub = spec.get("sub", "")
    url_text = spec.get("url_text", "Link en bio. →")

    sub_html = (
        f'<p style="font-size:20px;color:{t["muted"]};margin-top:16px;line-height:1.55;">{sub}</p>'
    ) if sub else ""

    content = f"""
    <div style="padding:52px 72px 48px;">
      <div class="divider"></div>
      <div style="font-size:56px;font-weight:800;line-height:1.15;letter-spacing:-0.02em;">{headline}</div>
      {sub_html}
      <div style="margin-top:40px;font-size:28px;font-weight:700;color:{t['primary']};">{url_text}</div>
    </div>"""
    return _page_wrap(_top_bar(spec["label"], n, total) + content, t)


def _build_stat(spec: dict, t: dict, n: int, total: int) -> str:
    number = spec.get("number", "")
    unit = spec.get("unit", "")
    stat_label = spec.get("stat_label", "")
    statement = spec.get("statement", "").replace("\n", "<br>")
    context = spec.get("context", "")

    context_html = (
        f'<p style="font-size:17px;line-height:1.65;color:{t["muted"]};margin-top:16px;">{context}</p>'
    ) if context else ""

    content = f"""
    <div style="padding:40px 64px 36px;position:relative;overflow:hidden;">
      <!-- decorative circle -->
      <div style="position:absolute;right:-80px;top:-80px;width:420px;height:420px;
        border-radius:50%;background:{t['primary']};opacity:0.05;pointer-events:none;"></div>
      <!-- big stat number -->
      <div style="display:flex;align-items:flex-end;gap:2px;margin-bottom:20px;line-height:1;">
        <span style="font-size:190px;font-weight:900;letter-spacing:-0.04em;
          color:{t['primary']};line-height:0.82;">{number}</span>
        <span style="font-size:76px;font-weight:900;color:{t['primary']};padding-bottom:14px;">{unit}</span>
      </div>
      <!-- label -->
      <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;
        color:{t['muted']};margin-bottom:48px;">{stat_label}</div>
      <!-- divider -->
      <div class="divider"></div>
      <!-- statement -->
      <div style="font-size:34px;font-weight:800;line-height:1.25;letter-spacing:-0.01em;">{statement}</div>
      {context_html}
    </div>"""
    return _page_wrap(_top_bar(spec["label"], n, total) + content, t)


def _build_decision(spec: dict, t: dict, n: int, total: int) -> str:
    """Visual decision guide: big stat on the left + 3 color-coded 'when to use' cards on the right."""
    number   = spec.get("number", "")
    unit     = spec.get("unit", "")
    anchor   = spec.get("anchor", "")        # e.g. "Supervisado · la norma"
    anchor_note = spec.get("anchor_note", "") # short explanation for the big stat
    cards    = spec.get("cards", [])          # list of {color, trigger, label}
    headline = spec.get("headline", "").replace("\n", "<br>")

    anchor_html = (
        f'<div style="font-size:13px;font-weight:700;letter-spacing:0.1em;'
        f'text-transform:uppercase;color:{t["muted"]};margin-top:8px;">{anchor}</div>'
    ) if anchor else ""

    anchor_note_html = (
        f'<div style="font-size:18px;line-height:1.5;color:{t["muted"]};'
        f'margin-top:20px;max-width:22ch;">{anchor_note}</div>'
    ) if anchor_note else ""

    cards_html = ""
    for card in cards:
        color   = card.get("color", t["primary"])
        trigger = card.get("trigger", "")
        label   = card.get("label", "")
        cards_html += f"""
        <div style="display:flex;align-items:flex-start;gap:14px;
          background:{t['bg_card']};border-radius:14px;padding:18px 20px;
          border-left:4px solid {color};">
          <div style="flex:1;min-width:0;">
            <div style="font-size:12px;font-weight:700;letter-spacing:0.09em;
              text-transform:uppercase;color:{color};margin-bottom:6px;">{trigger}</div>
            <div style="font-size:20px;font-weight:700;color:{t['text']};line-height:1.25;">{label}</div>
          </div>
        </div>"""

    headline_html = (
        f'<div style="font-size:13px;font-weight:700;letter-spacing:0.1em;'
        f'text-transform:uppercase;color:{t["muted"]};margin-bottom:18px;">{headline}</div>'
    ) if headline else ""

    content = f"""
    <div style="padding:20px 56px 28px;display:flex;gap:40px;align-items:flex-start;">

      <!-- left: big stat -->
      <div style="flex:0 0 auto;width:340px;padding-top:10px;">
        <div style="display:flex;align-items:flex-end;gap:2px;line-height:1;">
          <span style="font-size:160px;font-weight:900;letter-spacing:-0.04em;
            color:{t['primary']};line-height:0.82;">{number}</span>
          <span style="font-size:64px;font-weight:900;color:{t['primary']};
            padding-bottom:12px;">{unit}</span>
        </div>
        {anchor_html}
        <div style="width:44px;height:3px;background:{GRADIENT};
          border-radius:2px;margin:24px 0 16px;"></div>
        {anchor_note_html}
      </div>

      <!-- right: decision cards -->
      <div style="flex:1;display:flex;flex-direction:column;gap:14px;padding-top:8px;">
        {headline_html}
        {cards_html}
      </div>

    </div>"""
    return _page_wrap(_top_bar(spec["label"], n, total) + content, t)


def _build_guide_pure(spec: dict, t: dict, n: int, total: int) -> str:
    """4-card decision guide without a big stat number. Each card: color + label + trigger + example."""
    title    = spec.get("title", "¿Cuándo usar cada tipo?")
    subtitle = spec.get("subtitle", "")
    cards    = spec.get("cards", [])

    subtitle_html = (
        f'<span style="font-size:17px;font-weight:500;color:{t["muted"]};'
        f'letter-spacing:0;display:block;margin-top:6px;">{subtitle}</span>'
    ) if subtitle else ""

    cards_html = ""
    for card in cards:
        color   = card.get("color", t["primary"])
        label   = card.get("label", "")
        trigger = card.get("trigger", "")
        example = card.get("example", "")
        example_html = (
            f'<div style="font-size:14px;color:{t["muted"]};line-height:1.4;margin-top:4px;">{example}</div>'
        ) if example else ""
        cards_html += f"""
        <div style="display:flex;align-items:flex-start;gap:16px;
          background:{t['bg_card']};border-radius:14px;padding:16px 20px;
          border-left:4px solid {color};">
          <div style="flex:1;min-width:0;">
            <div style="font-size:12px;font-weight:800;color:{color};
              letter-spacing:0.08em;text-transform:uppercase;margin-bottom:5px;">{label}</div>
            <div style="font-size:19px;font-weight:600;color:{t['text']};line-height:1.35;">{trigger}</div>
            {example_html}
          </div>
        </div>"""

    content = f"""
    <div style="padding:18px 56px 28px;">
      <div style="width:44px;height:3px;background:{GRADIENT};border-radius:2px;margin-bottom:18px;"></div>
      <div style="font-size:30px;font-weight:800;letter-spacing:-0.02em;margin-bottom:20px;line-height:1.2;">
        {title}{subtitle_html}
      </div>
      <div style="display:flex;flex-direction:column;gap:12px;">
        {cards_html}
      </div>
    </div>"""
    return _page_wrap(_top_bar(spec["label"], n, total) + content, t)


def _build_cycle(spec: dict, t: dict, n: int, total: int) -> str:
    """Circular diagram with N nodes on an orbit ring, color-coded by phase."""
    steps        = spec.get("steps", [])
    phases       = spec.get("phases", [])
    center_main  = spec.get("center_main", "")
    center_sub   = spec.get("center_sub", "")
    title        = spec.get("title", "")
    subtitle     = spec.get("subtitle", "")

    N       = len(steps)
    CX, CY  = 540, 390   # SVG center
    R       = 255         # orbit radius
    NR      = 42          # node radius
    LR      = 322         # label radius (R + NR + 25)
    SVG_H   = 780

    # Phase color per step (0-based)
    step_colors = [t["muted"]] * N
    for ph in phases:
        for idx in ph["step_indices"]:
            step_colors[idx] = ph["color"]

    def arad(i):
        return math.radians(-90 + i * 360 / N)

    def npt(i):
        a = arad(i)
        return CX + R * math.cos(a), CY + R * math.sin(a)

    def lpt(i):
        a = arad(i)
        return CX + LR * math.cos(a), CY + LR * math.sin(a)

    def anchor(i):
        lx, _ = lpt(i)
        if lx > CX + 25: return "start"
        if lx < CX - 25: return "end"
        return "middle"

    def label_dy(i):
        _, ny = npt(i)
        if ny < CY - 140: return -6   # top node
        if ny > CY + 140: return 20   # bottom node
        return 7                       # side nodes

    # SVG defs: arrowhead marker
    defs = (
        '<defs>'
        '<marker id="arr" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">'
        '<path d="M0,0.5 L0,6.5 L7,3.5 z" fill="rgba(255,255,255,0.28)"/>'
        '</marker>'
        '</defs>'
    )

    # Orbit ring (base) + phase arcs
    arcs_svg = (
        f'<circle cx="{CX}" cy="{CY}" r="{R}" fill="none" '
        f'stroke="rgba(255,255,255,0.08)" stroke-width="1.5"/>'
    )
    for ph in phases:
        idxs  = sorted(ph["step_indices"])
        first, last = idxs[0], idxs[-1]
        ax, ay = npt(first)
        bx, by = npt(last)
        span   = (last - first) * 360 / N
        large  = 1 if span > 180 else 0
        color  = ph["color"]
        arcs_svg += (
            f'<path d="M {ax:.1f} {ay:.1f} A {R} {R} 0 {large} 1 {bx:.1f} {by:.1f}" '
            f'fill="none" stroke="{color}" stroke-width="3.5" '
            f'stroke-linecap="round" opacity="0.65"/>'
        )

    # Arrows between adjacent nodes
    arrows_svg = ""
    for i in range(N):
        ax, ay = npt(i)
        bx, by = npt((i + 1) % N)
        ddx, ddy = bx - ax, by - ay
        length = math.sqrt(ddx * ddx + ddy * ddy)
        if length < 0.01:
            continue
        ndx, ndy = ddx / length, ddy / length
        sx = ax + (NR + 4) * ndx
        sy = ay + (NR + 4) * ndy
        ex = bx - (NR + 12) * ndx
        ey = by - (NR + 12) * ndy
        arrows_svg += (
            f'<line x1="{sx:.1f}" y1="{sy:.1f}" x2="{ex:.1f}" y2="{ey:.1f}" '
            f'stroke="rgba(255,255,255,0.18)" stroke-width="1.5" marker-end="url(#arr)"/>'
        )

    # Node circles + step numbers
    nodes_svg = ""
    for i in range(N):
        nx, ny = npt(i)
        color = step_colors[i]
        nodes_svg += (
            f'<circle cx="{nx:.1f}" cy="{ny:.1f}" r="{NR}" '
            f'fill="{color}1a" stroke="{color}" stroke-width="2.5"/>'
            f'<text x="{nx:.1f}" y="{ny:.1f}" text-anchor="middle" '
            f'dominant-baseline="central" font-family="Inter,sans-serif" '
            f'font-size="19" font-weight="800" fill="{color}">{i + 1}</text>'
        )

    # Step name labels outside orbit
    labels_svg = ""
    for i, step_name in enumerate(steps):
        lx, ly = lpt(i)
        labels_svg += (
            f'<text x="{lx:.1f}" y="{ly + label_dy(i):.1f}" '
            f'text-anchor="{anchor(i)}" font-family="Inter,sans-serif" '
            f'font-size="15" font-weight="600" fill="{step_colors[i]}">'
            f'{step_name}</text>'
        )

    # Center text
    center_svg = ""
    if center_main:
        center_svg += (
            f'<text x="{CX}" y="{CY - 16}" text-anchor="middle" '
            f'font-family="Inter,sans-serif" font-size="34" font-weight="900" '
            f'letter-spacing="-0.03em" fill="white">{center_main}</text>'
        )
    if center_sub:
        center_svg += (
            f'<text x="{CX}" y="{CY + 18}" text-anchor="middle" '
            f'font-family="Inter,sans-serif" font-size="13" font-weight="500" '
            f'fill="rgba(255,255,255,0.4)">{center_sub}</text>'
        )

    svg = (
        f'<svg viewBox="0 0 1080 {SVG_H}" width="1080" height="{SVG_H}" '
        f'xmlns="http://www.w3.org/2000/svg">'
        f'{defs}{arcs_svg}{arrows_svg}{nodes_svg}{labels_svg}{center_svg}'
        f'</svg>'
    )

    title_html = ""
    if title:
        title_html = (
            f'<div style="padding:16px 64px 0;">'
            f'<div class="divider"></div>'
            f'<div style="font-size:26px;font-weight:800;line-height:1.2;'
            f'letter-spacing:-0.02em;">{title.replace(chr(10), "<br>")}</div>'
            f'</div>'
        )
    if subtitle:
        title_html += (
            f'<p style="padding:6px 64px 0;font-size:16px;color:{t["muted"]};">'
            f'{subtitle}</p>'
        )

    content = _top_bar(spec["label"], n, total) + title_html + svg
    return _page_wrap(content, t)


_BUILDERS = {
    "hook":        _build_hook,
    "steps":       _build_steps,
    "comparison":  _build_comparison,
    "snippet":     _build_snippet,
    "table":       _build_table,
    "cta":         _build_cta,
    "stat":        _build_stat,
    "decision":    _build_decision,
    "guide_pure":  _build_guide_pure,
    "cycle":       _build_cycle,
}


def build_slide_html(spec: dict, n: int, total: int) -> str:
    t = _tokens(spec.get("theme", "light"))
    builder = _BUILDERS[spec["type"]]
    return builder(spec, t, n, total)


# ---------------------------------------------------------------------------
# Posts definition
# ---------------------------------------------------------------------------

POSTS = [
    # ── POST 1 — Marco IA/ML/DL/GenAI ──────────────────────────────────────
    {
        "post": 1,
        "slug": "marco_ia",
        "slides": [
            {
                "id": "01_hook",
                "type": "hook",
                "theme": "dark",
                "label": "Marco IA / ML / DL / GenAI",
                "headline": "La gente habla de IA\ncomo si fuera\nuna sola cosa.",
                "highlight": "No lo es.",
                "lead": "Aquí el mapa que lo ordena todo. →",
            },
            {
                "id": "02_ia",
                "type": "snippet",
                "theme": "dark",
                "label": "IA — Inteligencia Artificial",
                "img": "fundamentos-ia/ia_ml_dl/dark/1_ia_li.png",
                "tag": "Nivel 1",
                "caption": "IA es el paraguas. Cualquier sistema que clasifica, predice, decide o genera.",
            },
            {
                "id": "03_ml",
                "type": "snippet",
                "theme": "dark",
                "label": "ML — Machine Learning",
                "img": "fundamentos-ia/ia_ml_dl/dark/2_ml_li.png",
                "tag": "Nivel 2",
                "caption": "ML es la rama que aprende desde datos, sin reglas escritas a mano.",
            },
            {
                "id": "04_dl",
                "type": "snippet",
                "theme": "dark",
                "label": "DL — Deep Learning",
                "img": "fundamentos-ia/ia_ml_dl/dark/3_dl_li.png",
                "tag": "Nivel 3",
                "caption": "DL usa redes de muchas capas. Necesaria para imagen, audio y lenguaje a escala.",
            },
            {
                "id": "05_gen",
                "type": "snippet",
                "theme": "dark",
                "label": "GenAI — IA Generativa",
                "img": "fundamentos-ia/ia_ml_dl/dark/4_gen_li.png",
                "tag": "Nivel 4",
                "caption": "GenAI describe el tipo de salida: texto, imagen, código, audio. No el tipo de modelo.",
            },
            {
                "id": "06_cta",
                "type": "cta",
                "theme": "dark",
                "label": "Marco IA / ML / DL / GenAI",
                "headline": "Artículo completo\ncon animaciones\ninteractivas.",
                "sub": "Fundamentos de IA · Capítulo 1",
                "url_text": "5sigmas.com →",
            },
        ],
    },

    # ── POST 2 — Tipos de aprendizaje ───────────────────────────────────────
    {
        "post": 2,
        "slug": "tipos_aprendizaje",
        "slides": [
            {
                "id": "01_hook",
                "type": "hook",
                "theme": "dark",
                "label": "Tipos de aprendizaje",
                "headline": "Cuando una IA aprende,\n¿de dónde sale\nel profesor?",
                "highlight": "Hay 4 respuestas.",
                "lead": "La mayoría solo conoce una. →",
            },
            {
                "id": "02_supervisado",
                "type": "snippet",
                "theme": "dark",
                "label": "Aprendizaje supervisado",
                "img": "fundamentos-ia/tipos_aprendizaje/dark/1_sup_li.png",
                "tag": "Tipo 1/4",
                "caption": "El profesor es humano. Ejemplos etiquetados: spam / no spam, fraude / no fraude.",
            },
            {
                "id": "03_no_supervisado",
                "type": "snippet",
                "theme": "dark",
                "label": "Aprendizaje no supervisado",
                "img": "fundamentos-ia/tipos_aprendizaje/dark/2_unsup_li.png",
                "tag": "Tipo 2/4",
                "caption": "No hay etiquetas. El sistema busca estructura solo. Segmentación, agrupaciones, anomalías.",
            },
            {
                "id": "04_auto",
                "type": "snippet",
                "theme": "dark",
                "label": "Auto-supervisado",
                "img": "fundamentos-ia/tipos_aprendizaje/dark/3_self_li.png",
                "tag": "Tipo 3/4",
                "caption": "El propio dato genera la señal. Así entrenan GPT y BERT. Sin etiquetado manual a escala.",
            },
            {
                "id": "05_refuerzo",
                "type": "snippet",
                "theme": "dark",
                "label": "Aprendizaje por refuerzo",
                "img": "fundamentos-ia/tipos_aprendizaje/dark/4_rl_li.png",
                "tag": "Tipo 4/4",
                "caption": "Prueba, error y recompensa. Así juega AlphaGo. Así aprende un robot a caminar.",
            },
            {
                "id": "06_negocio",
                "type": "guide_pure",
                "theme": "dark",
                "label": "Guía de decisión",
                "title": "¿Cuándo usar cada tipo?",
                "subtitle": "Una regla simple para elegir el enfoque correcto.",
                "cards": [
                    {
                        "color": "#7cc7ff",
                        "label": "Supervisado",
                        "trigger": "Tienes etiquetas y quieres predecir un resultado concreto.",
                        "example": "Spam, churn, riesgo de impago.",
                    },
                    {
                        "color": "#26A69A",
                        "label": "No supervisado",
                        "trigger": "No hay etiquetas. Buscas estructura, grupos o anomalías.",
                        "example": "Segmentación de clientes, detección de outliers.",
                    },
                    {
                        "color": "#FFB343",
                        "label": "Auto-supervisado",
                        "trigger": "Tienes datos masivos sin etiquetar y necesitas una base general.",
                        "example": "Preentrenar GPT, BERT o modelos de visión.",
                    },
                    {
                        "color": "#a78bfa",
                        "label": "Refuerzo (RL)",
                        "trigger": "El sistema aprende tomando decisiones y midiendo la recompensa.",
                        "example": "AlphaGo, robótica, optimización dinámica.",
                    },
                ],
            },
            {
                "id": "07_cta",
                "type": "cta",
                "theme": "dark",
                "label": "Tipos de aprendizaje",
                "headline": "Artículo completo con\nanimaciones interactivas\npor tipo de aprendizaje.",
                "sub": "Fundamentos de IA · Capítulo 1",
                "url_text": "5sigmas.com →",
            },
        ],
    },

    # ── POST 3 — Cómo aprende una IA por dentro ─────────────────────────────
    {
        "post": 3,
        "slug": "mecanismos_internos",
        "slides": [
            {
                "id": "01_hook",
                "type": "hook",
                "theme": "dark",
                "label": "Cómo aprende una IA por dentro",
                "headline": "\"La IA aprende\nde los datos.\"",
                "highlight": "¿Pero qué cambia exactamente dentro?",
                "lead": "Depende del algoritmo. Y la diferencia importa. →",
            },
            {
                "id": "02_bucle",
                "type": "steps",
                "theme": "dark",
                "label": "El bucle universal del aprendizaje",
                "title": "Todos aprenden igual.\nLo que cambia es qué ajustan.",
                "items": [
                    {"bold": "Predice", "text": "con los parámetros actuales"},
                    {"bold": "Mide el error", "text": "con los ejemplos reales"},
                    {"bold": "Ajusta", "text": "algo interno para reducirlo"},
                    {"bold": "Repite", "text": "miles o millones de veces"},
                ],
                "note": "Aprender = ajustar parámetros internos para equivocarse menos con datos parecidos.",
            },
            {
                "id": "03_arboles",
                "type": "snippet",
                "theme": "dark",
                "label": "Árboles de decisión",
                "img": "fundamentos-ia/algoritmos/arboles_decision/dark/arboles_decision_li.png",
                "tag": "Algoritmo 1/4",
                "caption": "Aprenden preguntas y umbrales. El mejor cuestionario para separar casos.",
            },
            {
                "id": "04_bayes",
                "type": "snippet",
                "theme": "dark",
                "label": "Naive Bayes",
                "img": "fundamentos-ia/algoritmos/naive_bayes_vnext/dark/naive_bayes_vnext_li.png",
                "tag": "Algoritmo 2/4",
                "caption": "Aprenden probabilidades por conteo. Una tabla de evidencias que se actualiza.",
            },
            {
                "id": "05_kmeans",
                "type": "snippet",
                "theme": "dark",
                "label": "K-means",
                "img": "fundamentos-ia/algoritmos/kmeans_vnext/dark/kmeans_vnext_li.png",
                "tag": "Algoritmo 3/4",
                "caption": "Aprenden la posición de centros de grupos. Imanes que se mueven en el mapa de datos.",
            },
            {
                "id": "06_redes_1",
                "type": "snippet",
                "theme": "dark",
                "label": "Redes neuronales — 1 neurona",
                "img": "fundamentos-ia/redes_neuronales_v2/dark/1_linear_li.png",
                "tag": "Algoritmo 4/4 · Paso 1",
                "caption": "Una neurona ajusta peso y sesgo. Aprende relaciones lineales: entra °C, sale °F.",
            },
            {
                "id": "06_redes_2",
                "type": "snippet",
                "theme": "dark",
                "label": "Redes neuronales — 1 capa oculta",
                "img": "fundamentos-ia/redes_neuronales_v2/dark/2_sine_li.png",
                "tag": "Algoritmo 4/4 · Paso 2",
                "caption": "Varias neuronas en paralelo permiten curvar la respuesta. Ya puede aprender formas no lineales.",
            },
            {
                "id": "06_redes_3",
                "type": "snippet",
                "theme": "dark",
                "label": "Redes neuronales — Más capas",
                "img": "fundamentos-ia/redes_neuronales_v2/dark/3_complex_li.png",
                "tag": "Algoritmo 4/4 · Paso 3",
                "caption": "Más capas apiladas = mayor capacidad. Así funcionan GPT, ResNet y Whisper.",
            },
            {
                "id": "07_resumen",
                "type": "table",
                "theme": "dark",
                "label": "Los 4 mecanismos — resumen",
                "title": "Cada familia ajusta algo distinto\ny sirve para datos distintos.",
                "headers": ["Familia", "Qué ajusta", "Datos ideales"],
                "rows": [
                    ["Árboles · RF · XGBoost", "Preguntas y umbrales", "Tabular estructurado: números y categorías"],
                    ["Naive Bayes", "Probabilidades por conteo", "Texto, frecuencias, categorías independientes"],
                    ["K-means", "Posición de centros", "Numérico continuo con distancia euclidiana"],
                    ["Redes neuronales", "Pesos en capas", "Imágenes, audio, texto, series temporales"],
                ],
                "note": "Hay decenas de familias más. El tipo de dato es el primer filtro para elegir.",
            },
            {
                "id": "08_cta",
                "type": "cta",
                "theme": "dark",
                "label": "Cómo aprende una IA por dentro",
                "headline": "El artículo tiene\nsimuladores interactivos\npara ver cada uno en acción.",
                "sub": "Fundamentos de IA · Capítulo 1",
                "url_text": "5sigmas.com →",
            },
        ],
    },

    # ── POST 4 — Software clásico vs IA ────────────────────────────────────
    {
        "post": 4,
        "slug": "software_vs_ia",
        "slides": [
            {
                "id": "01_hook",
                "type": "hook",
                "theme": "dark",
                "label": "Software clásico vs IA",
                "headline": "En el software clásico\nescribes las reglas.",
                "highlight": "En IA, las reglas emergen de los datos.",
                "lead": "Eso lo cambia todo. →",
            },
            {
                "id": "02_comparacion",
                "type": "comparison",
                "theme": "dark",
                "label": "Software clásico vs Inteligencia Artificial",
                "suptitle": "Dónde viven las reglas",
                "left": {
                    "tag": "Software clásico",
                    "title": "datos + reglas escritas\n= salida",
                    "items": [
                        "La lógica la escribes tú.",
                        "Siempre el mismo resultado.",
                    ],
                    "formula": "C = (F − 32) × 5 / 9",
                    "note": "Predecible. Determinista. Auditable línea a línea.",
                },
                "right": {
                    "tag": "Inteligencia Artificial",
                    "title": "datos + ejemplos correctos\n= reglas aprendidas",
                    "items": [
                        "La lógica emerge del entrenamiento.",
                        "Das pares (F, C) y aprende la fórmula.",
                    ],
                    "formula": "modelo.fit(X_fahrenheit, y_celsius)",
                    "note": "Ya no escribes la fórmula. La entrenas.",
                },
            },
            {
                "id": "03_sw2",
                "type": "hook",
                "theme": "dark",
                "label": "Software 2.0",
                "headline": "La lógica ya no\nse escribe.",
                "highlight": "Se aprende desde datos.",
                "lead": "Eso cambia cómo se falla, cómo se depura y cómo se mantiene.",
                "post_num": "",
            },
            {
                "id": "04_consecuencias",
                "type": "steps",
                "theme": "dark",
                "label": "Tres consecuencias que mucha gente no espera",
                "title": "Un modelo en producción\nno es solo desplegar.",
                "items": [
                    {"bold": "Puede degradarse.", "text": "Si los datos del mundo cambian, el modelo se equivoca más."},
                    {"bold": "Necesita monitorización continua,", "text": "no solo despliegue."},
                    {"bold": "Un modelo entrenado", "text": "no es un producto. Es el paso 3 de 8."},
                ],
                "note": "A ese ciclo completo se le llama MLOps.",
            },
            {
                "id": "05_mlops",
                "type": "snippet",
                "theme": "dark",
                "label": "El ciclo MLOps",
                "img": "fundamentos-ia/mlops/ciclo_mlops/dark/ciclo_mlops_li.png",
                "tag": "MLOps",
                "caption": "Sin monitorización tienes una demo. Con versionado, feedback y control operativo, empiezas a tener un sistema real.",
            },
            {
                "id": "06_cta",
                "type": "cta",
                "theme": "dark",
                "label": "Software clásico vs IA",
                "headline": "Artículo completo\ncon el ciclo MLOps y\nanimaciones interactivas.",
                "sub": "Fundamentos de IA · Capítulo 1",
                "url_text": "5sigmas.com →",
            },
        ],
    },

    # ── POST 5 — MLOps: de modelo entrenado a sistema real ──────────────────
    {
        "post": 5,
        "slug": "mlops",
        "slides": [
            {
                "id": "01_hook",
                "type": "hook",
                "theme": "dark",
                "label": "MLOps",
                "headline": "Un modelo entrenado\nno es una IA\nen producción.",
                "highlight": "Es el paso 3 de 8.",
                "lead": "Esto es lo que falta entre un notebook y un sistema real. →",
            },
            {
                "id": "02_ciclo",
                "type": "cycle",
                "theme": "dark",
                "label": "El ciclo MLOps completo",
                "title": "Entrenar no es el final.\nEs el paso 3 de 8.",
                "center_main": "8 pasos",
                "center_sub": "Si falta uno, tienes una demo.",
                "steps": [
                    "Datos", "Preparar", "Entrenar", "Evaluar",
                    "Versionar", "Desplegar", "Monitorizar", "Feedback",
                ],
                "phases": [
                    {"color": "#26A69A", "step_indices": [0, 1, 2]},
                    {"color": "#7cc7ff", "step_indices": [3, 4]},
                    {"color": "#FFB343", "step_indices": [5, 6, 7]},
                ],
            },
            {
                "id": "03_demo_vs_prod",
                "type": "comparison",
                "theme": "dark",
                "label": "Demo vs sistema real",
                "suptitle": "La diferencia que nadie ve hasta que falla",
                "left": {
                    "tag": "Demo / notebook",
                    "title": "Modelo entrenado\nque funciona hoy",
                    "items": [
                        "Datos fijos del momento del entrenamiento.",
                        "Sin monitorización ni alertas.",
                        "Si el mundo cambia, nadie se entera.",
                    ],
                    "note": "Funciona en la presentación. Falla en producción.",
                },
                "right": {
                    "tag": "Sistema real en producción",
                    "title": "Ciclo completo\nque mejora solo",
                    "items": [
                        "Datos vivos con trazabilidad y versiones.",
                        "Monitorización de rendimiento y deriva.",
                        "Feedback automático para reentrenar.",
                    ],
                    "note": "Escala, se mantiene y mejora con el tiempo.",
                },
            },
            {
                "id": "04_errores",
                "type": "guide_pure",
                "theme": "dark",
                "label": "Qué falla sin MLOps",
                "title": "Los 4 fallos más comunes.",
                "subtitle": "Cada uno tiene un paso del ciclo que lo previene.",
                "cards": [
                    {
                        "color": "#f87171",
                        "label": "Deriva de datos",
                        "trigger": "El mundo cambia y el modelo no lo sabe.",
                        "example": "Solución: monitorización continua + alertas de distribución.",
                    },
                    {
                        "color": "#fb923c",
                        "label": "Sin trazabilidad",
                        "trigger": "No sabes con qué datos se entrenó la versión en producción.",
                        "example": "Solución: versionado de modelo y datos desde el inicio.",
                    },
                    {
                        "color": "#FFB343",
                        "label": "Despliegue todo o nada",
                        "trigger": "Un error en producción afecta a todos los usuarios a la vez.",
                        "example": "Solución: despliegue gradual con rollback automático.",
                    },
                    {
                        "color": "#a78bfa",
                        "label": "Sin feedback real",
                        "trigger": "Las etiquetas reales nunca vuelven al sistema de entrenamiento.",
                        "example": "Solución: pipeline de feedback cerrado para reentrenamiento.",
                    },
                ],
            },
            {
                "id": "05_cta",
                "type": "cta",
                "theme": "dark",
                "label": "MLOps",
                "headline": "El artículo explica\ncada paso con\nanimaciones interactivas.",
                "sub": "Fundamentos de IA · Capítulo 1",
                "url_text": "5sigmas.com →",
            },
        ],
    },
]


# ---------------------------------------------------------------------------
# Renderer
# ---------------------------------------------------------------------------

async def _render_slide(page, html: str, out_path: Path):
    await page.set_viewport_size({"width": SLIDE_W, "height": 2000})
    await page.set_content(html, wait_until="load", timeout=30000)
    await page.wait_for_load_state("networkidle", timeout=20000)
    await page.evaluate("() => document.fonts ? document.fonts.ready : Promise.resolve()")
    await page.wait_for_timeout(400)
    slide = await page.query_selector(".slide")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    await slide.screenshot(path=str(out_path), animations="disabled")
    print(f"    → {out_path.relative_to(Path.cwd())}")


async def generate(post_filter: int | None, preview: bool, out_dir: Path):
    posts = [p for p in POSTS if post_filter is None or p["post"] == post_filter]
    if not posts:
        print(f"No hay posts que coincidan con --post {post_filter}")
        return

    total_slides = sum(1 if preview else len(p["slides"]) for p in posts)
    print(f"\n[slides] Generando {total_slides} slide(s) en {out_dir}\n")

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": SLIDE_W, "height": 2000},
            device_scale_factor=2.0,
        )
        page = await context.new_page()

        for post in posts:
            folder = out_dir / f"post_{post['post']}_{post['slug']}"
            slides = post["slides"][:1] if preview else post["slides"]
            total = len(post["slides"])
            print(f"  [post {post['post']}] {post['slug']} — {len(slides)} slide(s)")
            for i, spec in enumerate(slides, 1):
                html = build_slide_html(spec, i, total)
                out_path = folder / f"{spec['id']}.png"
                await _render_slide(page, html, out_path)

        await browser.close()

    print(f"\n[slides] Listo — {total_slides} archivo(s)\n")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Genera slides para los posts de LinkedIn de 5Sigmas.")
    parser.add_argument("--post", type=int, default=None, help="Generar solo el post N (1-4)")
    parser.add_argument("--preview", action="store_true", help="Solo slide 1 de cada post (validación rápida)")
    parser.add_argument("--out", default="documentacion_interna/posts/fundamentos-ia-cap1", help="Directorio de salida")
    args = parser.parse_args()

    out_dir = ROOT / args.out
    out_dir.mkdir(parents=True, exist_ok=True)
    asyncio.run(generate(args.post, args.preview, out_dir))


if __name__ == "__main__":
    main()
