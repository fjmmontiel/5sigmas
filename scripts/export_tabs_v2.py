"""
export_tabs_v2.py

Export animation snippets to PNG for light and dark themes,
with optional LinkedIn-ready portrait frames (1080x1350).

Improvements over v1:
  - Multi-theme (light + dark) in a single browser launch
  - Per-tab _auto_run_interactions after each tab click
  - LinkedIn portrait frames via --linkedin (default: on)
  - Tab selector restricted to real tab buttons only
  - _undo_linkedin_frame restores DOM after LinkedIn screenshot
  - emulate_media removed (color_scheme set at context level)
  - Deduped auto_run trigger selectors
  - export_tabs_v2() returns {theme: [file_paths]}
  - CLI exposes --wait, --width, --scale, --themes, --no-linkedin
"""

import argparse
import asyncio
import base64
import mimetypes
import os
import re
import sys
from pathlib import Path

# Regex to extract <script> block contents from HTML files
_SCRIPT_RE = re.compile(r'<script[^>]*>(.*?)</script>', re.DOTALL)

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
ASSETS = DOCS / "assets"
sys.path.insert(0, str(ROOT))
import main  # noqa: E402

# LinkedIn: ancho fijo al que el componente reenderiza de forma natural
LI_FRAME_WIDTH = 1080


# ---------------------------------------------------------------------------
# Theme helpers
# ---------------------------------------------------------------------------

def _resolve_theme(theme):
    if theme == "dark":
        return "dark", "slate"
    if theme == "light":
        return "light", "default"
    return "no-preference", "default"


# ---------------------------------------------------------------------------
# CSS / HTML builders
# ---------------------------------------------------------------------------

def _build_export_style(md_scheme):
    is_dark = md_scheme == "slate"
    base_bg = "#0b1220" if is_dark else "#ffffff"
    base_fg = "#e2e8f0" if is_dark else "#0f172a"
    primary = "#7cc7ff" if is_dark else "#146eeb"
    accent = "#f8c15c" if is_dark else "#ffb343"
    color_scheme = "dark" if is_dark else "light"
    text_font = '"Inter", "Avenir Next", "Avenir", "Segoe UI", "Helvetica Neue", Arial, sans-serif'
    code_font = '"JetBrains Mono", "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", monospace'
    return f"""
:root {{
  color-scheme: {color_scheme};
  --md-default-bg-color: {base_bg};
  --md-default-fg-color: {base_fg};
  --md-primary-fg-color: {primary};
  --md-accent-fg-color: {accent};
  --md-text-font-family: {text_font};
  --md-code-font-family: {code_font};
}}
html, body {{
  margin: 0;
  background: var(--md-default-bg-color) !important;
  color: var(--md-default-fg-color) !important;
  font-family: var(--md-text-font-family) !important;
}}
"""


def _build_export_layout_style(export_width):
    width = max(960, int(export_width))
    return f"""
body {{
  padding: 24px;
}}
.export-stage {{
  width: min({width}px, calc(100vw - 48px));
  margin: 0 auto;
}}
.export-stage > .anim-brand-shell {{
  width: 100%;
  margin: 0;
}}
.anim-brand-shell::after {{
  opacity: .40 !important;
}}
[data-md-color-scheme="slate"] .anim-brand-shell::after {{
  opacity: .36 !important;
}}
"""


def _asset_base_uri():
    return ASSETS.resolve().as_uri().rstrip("/")


def _asset_data_uri(asset_rel_path):
    asset_path = DOCS / asset_rel_path.lstrip("/")
    data = asset_path.read_bytes()
    mime = mimetypes.guess_type(asset_path.name)[0] or "application/octet-stream"
    encoded = base64.b64encode(data).decode("ascii")
    return f"data:{mime};base64,{encoded}"


def _embed_export_assets(text):
    if not text:
        return text
    embedded = text
    for asset_rel in ("/assets/logo.svg", "/assets/logo_white.svg"):
        embedded = embedded.replace(asset_rel, _asset_data_uri(asset_rel))
    return embedded


def _localize_asset_urls(text):
    if not text:
        return text
    localized = _embed_export_assets(text)
    asset_base = _asset_base_uri()
    replacements = (
        ('url("/assets/', f'url("{asset_base}/'),
        ("url('/assets/", f"url('{asset_base}/"),
        ("url(/assets/", f"url({asset_base}/"),
        ('="/assets/', f'="{asset_base}/'),
        ("='/assets/", f"='{asset_base}/"),
    )
    for old, new in replacements:
        localized = localized.replace(old, new)
    return localized


def _build_runtime_document(snippet_ref, md_scheme, export_width=1800):
    rendered = _localize_asset_urls(
        main.render_include_html(snippet_ref, anim_shell="on", anim_fullscreen="off")
    )
    extra_css = _localize_asset_urls(
        (DOCS / "stylesheets" / "extra.css").read_text(encoding="utf-8")
    )
    animations_css = _localize_asset_urls(
        (ASSETS / "stylesheets" / "animations.css").read_text(encoding="utf-8")
    )
    tabbed_js_path = ASSETS / "javascripts" / "tabbed-animations.js"
    if not tabbed_js_path.is_file():
        raise FileNotFoundError(f"Required JS not found: {tabbed_js_path}")
    tabbed_js = tabbed_js_path.read_text(encoding="utf-8")
    shell_js = (ASSETS / "javascripts" / "animation-shell.js").read_text(encoding="utf-8")

    # If the snippet uses nn: demo namespace, inject the rendering engine from all_animations.html.
    # tabbed-animations.js runs initTabs() (setting __taInited) before the nn namespace is
    # registered, so we also add a post-registration script that calls ensureDemo() directly on
    # the visible demo elements to force canvas initialization.
    extra_demo_scripts = ""
    if 'data-demo="nn:' in rendered or "data-demo='nn:" in rendered:
        nn_src = DOCS / "snippets" / "fundamentos-ia" / "all_animations.html"
        if nn_src.is_file():
            nn_html = nn_src.read_text(encoding="utf-8")
            nn_blocks = _SCRIPT_RE.findall(nn_html)
            if nn_blocks:
                nn_inject = "\n".join(f"<script>{b}</script>" for b in nn_blocks)
                # Force-init visible demo elements after namespace registration
                force_init = (
                    "<script>(function(){"
                    "if(!window.TabbedAnimations||typeof window.TabbedAnimations.ensureDemo!=='function')return;"
                    "document.querySelectorAll('[data-demo^=\"nn:\"]').forEach(function(el){"
                    "var panel=el.closest('[data-panel]');"
                    "if(!panel||!panel.hidden){window.TabbedAnimations.ensureDemo(el);}"
                    "});"
                    "})();</script>"
                )
                extra_demo_scripts = nn_inject + "\n" + force_init

    return f"""<!doctype html>
<html data-md-color-scheme="{md_scheme}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=block" rel="stylesheet">
    <style>{_build_export_style(md_scheme)}</style>
    <style>{_build_export_layout_style(export_width)}</style>
    <style>{animations_css}</style>
    <style>{extra_css}</style>
  </head>
  <body data-md-color-scheme="{md_scheme}">
    <div class="export-stage">{rendered}</div>
    <script>{tabbed_js}</script>
    <script>{shell_js}</script>
    {extra_demo_scripts}
  </body>
</html>
"""


# ---------------------------------------------------------------------------
# Path helpers
# ---------------------------------------------------------------------------

def _resolve_snippet_path(html_path):
    raw = str(html_path or "").strip()
    if not raw:
        raise ValueError("html_path is required")

    if raw.startswith("snippets/"):
        abs_path = DOCS / raw
        if not abs_path.is_file():
            raise ValueError(f"Snippet not found: {raw}")
        return raw, abs_path.resolve()

    candidate = Path(raw).expanduser()
    if not candidate.is_absolute():
        candidate = (Path.cwd() / candidate).resolve()
    else:
        candidate = candidate.resolve()

    if not candidate.is_file():
        raise ValueError(f"File not found: {candidate}")

    try:
        rel = candidate.relative_to(DOCS).as_posix()
    except ValueError as exc:
        raise ValueError("Input file must be under docs/") from exc

    if not rel.startswith("snippets/") or not rel.endswith(".html"):
        raise ValueError("Input file must resolve to docs/snippets/*.html")

    return rel, candidate


def _target_dir_for_export(output_root, snippet_ref, theme):
    rel_dir = os.path.dirname(snippet_ref)
    basename = os.path.splitext(os.path.basename(snippet_ref))[0]
    target_dir = os.path.join(output_root, rel_dir, basename, theme)
    os.makedirs(target_dir, exist_ok=True)
    return target_dir, basename


# ---------------------------------------------------------------------------
# Playwright helpers
# ---------------------------------------------------------------------------

def _auto_run_trigger_selectors():
    return (
        '[data-btn="train"]',
        '[data-btn="toggle"]',
        'button[aria-label*="Entrenar"]',
    )


async def _open_runtime_page(page, snippet_ref, md_scheme, wait_ms=1200, export_width=1800):
    document_html = _build_runtime_document(snippet_ref, md_scheme, export_width=export_width)
    await page.set_content(document_html, wait_until="load", timeout=60000)
    await page.wait_for_load_state("networkidle", timeout=25000)
    await page.evaluate("() => document.fonts ? document.fonts.ready : Promise.resolve()")
    await page.wait_for_timeout(wait_ms)


async def _auto_run_interactions(page, idle_timeout_ms=30000, settle_ms=500):
    auto_info = await page.evaluate(
        """(selectors) => {
            const isVisible = (el) => {
              if (!el) return false;
              const style = window.getComputedStyle(el);
              if (style.display === 'none' || style.visibility === 'hidden') return false;
              const rect = el.getBoundingClientRect();
              return rect.width > 0 && rect.height > 0;
            };

            const autoplay = Array.from(document.querySelectorAll('[data-autoplay="true"]'))
              .filter(isVisible)
              .map((el) => {
                const raw = parseInt(el.getAttribute('data-interval') || '0', 10);
                return Number.isFinite(raw) && raw > 0 ? raw : 0;
              });

            let clicked = null;
            for (const selector of selectors) {
              // Use querySelectorAll so we find the first VISIBLE match, not just the first in DOM
              const allBtns = Array.from(document.querySelectorAll(selector));
              const btn = allBtns.find((b) => isVisible(b) && !b.disabled);
              if (!btn) continue;
              const label = (btn.textContent || btn.getAttribute('aria-label') || '').trim().toLowerCase();
              if (selector.includes('toggle') && !(
                label.includes('entrenar') || label.includes('animar') ||
                label.includes('play') || label.includes('\u25b6')
              )) {
                continue;
              }
              btn.click();
              clicked = selector;
              break;
            }

            return {
              clicked,
              autoplayWaitMs: autoplay.length ? Math.min(Math.max(...autoplay) * 2, 5000) : 0,
            };
        }""",
        list(_auto_run_trigger_selectors()),
    )

    if auto_info.get("autoplayWaitMs"):
        await page.wait_for_timeout(int(auto_info["autoplayWaitMs"]))
    elif auto_info.get("clicked"):
        # Give the training loop at least a few rAF frames to start and set busy class/state
        await page.wait_for_timeout(400)

    async def _is_busy():
        return await page.evaluate(
            """() => {
                const busyClasses = ['.ml-running', '.nn-running'];
                if (busyClasses.some((s) => document.querySelector(s))) return true;

                const trainBtn = document.querySelector('[data-btn="train"]');
                if (trainBtn && trainBtn.disabled) return true;

                const toggleBtn = document.querySelector('[data-btn="toggle"]');
                if (toggleBtn) {
                  const txt = (toggleBtn.textContent || '').toLowerCase();
                  if (txt.includes('pausar') || txt.includes('entrenando') || txt.includes('animando')) return true;
                }

                const statusNodes = document.querySelectorAll('[data-pill="status"], [data-pill="hint"]');
                for (const node of statusNodes) {
                  const txt = (node.textContent || '').toLowerCase();
                  if (txt.includes('entrenando') || txt.includes('agrupando') ||
                      txt.includes('animando') || txt.includes('contando')) {
                    return true;
                  }
                }
                return false;
            }"""
        )

    waited = 0
    while waited < idle_timeout_ms:
        if not await _is_busy():
            break
        await page.wait_for_timeout(250)
        waited += 250

    await page.wait_for_timeout(settle_ms)
    return auto_info


async def _query_tab_buttons(page):
    """Return visible tab button elements only (not panels or generic data-tab content)."""
    raw_tabs = await page.query_selector_all(
        'button[data-tab], [role="tab"][data-tab], .ta-tab[data-tab]'
    )
    tabs = []
    for tab in raw_tabs:
        try:
            if await tab.is_visible():
                tabs.append(tab)
        except Exception:
            continue
    return tabs


async def _resolve_export_target(page):
    shell = await page.query_selector("[data-anim-shell]")
    if shell is None:
        shell = await page.query_selector(".export-stage > *")
    if shell is None:
        raise RuntimeError("Export target not found in page")
    return shell


async def _screenshot_at_linkedin_width(page, path, li_width, orig_width, orig_height, settle_ms=400):
    """Resize viewport to LinkedIn width, screenshot the shell naturally, then restore.

    No CSS transforms, no DOM wrappers. The animation reflows at li_width and is
    captured as-is — identical look to the regular export but at a narrower width.
    """
    await page.set_viewport_size({"width": int(li_width), "height": int(orig_height)})
    await page.wait_for_timeout(settle_ms)
    shell = await _resolve_export_target(page)
    await shell.screenshot(path=path, animations="disabled", timeout=60000)
    await page.set_viewport_size({"width": int(orig_width), "height": int(orig_height)})
    await page.wait_for_timeout(200)


# ---------------------------------------------------------------------------
# Core export logic
# ---------------------------------------------------------------------------

async def _export_one_theme(page, snippet_ref, target_dir, basename, wait_ms, linkedin,
                            viewport_width=1600, viewport_height=1200):
    """Export all tabs for a single theme page. Returns list of produced file paths."""
    produced = []

    await _auto_run_interactions(page)
    tabs = await _query_tab_buttons(page)

    if not tabs:
        print(f"  [no-tabs] single screenshot -> {basename}.png")
        shell = await _resolve_export_target(page)
        out = os.path.join(target_dir, f"{basename}.png")
        await shell.screenshot(path=out, animations="disabled", timeout=60000)
        produced.append(out)

        if linkedin:
            li_out = os.path.join(target_dir, f"{basename}_li.png")
            await _screenshot_at_linkedin_width(
                page, li_out, LI_FRAME_WIDTH, viewport_width, viewport_height
            )
            produced.append(li_out)
            print(f"    linkedin -> {os.path.basename(li_out)}")

    else:
        print(f"  [tabs] {len(tabs)} tab(s) found")
        for i, tab in enumerate(tabs):
            tab_id = await tab.get_attribute("data-tab") or f"tab_{i}"
            tab_text = (await tab.inner_text() or "").strip()
            print(f"  [tab {i + 1}/{len(tabs)}] {tab_text!r} ({tab_id})")

            await tab.click()
            await page.wait_for_timeout(wait_ms)
            await _auto_run_interactions(page)

            shell = await _resolve_export_target(page)
            out = os.path.join(target_dir, f"{i + 1}_{tab_id}.png")
            await shell.screenshot(path=out, animations="disabled", timeout=60000)
            produced.append(out)
            print(f"    -> {os.path.basename(out)}")

            if linkedin:
                li_out = os.path.join(target_dir, f"{i + 1}_{tab_id}_li.png")
                await _screenshot_at_linkedin_width(
                    page, li_out, LI_FRAME_WIDTH, viewport_width, viewport_height
                )
                produced.append(li_out)
                print(f"    linkedin -> {os.path.basename(li_out)}")

    return produced


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def export_tabs_v2(
    html_path,
    output_root="exports",
    themes=("light", "dark"),
    viewport_width=1600,
    viewport_height=1200,
    device_scale_factor=2.0,
    wait_ms=1000,
    export_width=1400,
    linkedin=True,
):
    """
    Export an animation snippet to PNG for each requested theme.

    Each theme gets its own subdirectory under output_root/snippet_dir/basename/<theme>/.
    If linkedin=True, every screenshot also gets a _li.png variant sized 1080x1350.

    Returns dict: {theme: [list of produced file paths]}
    """
    snippet_ref, abs_path = _resolve_snippet_path(html_path)
    all_produced = {}

    _print_preflight(
        snippet_ref, abs_path, themes, export_width, viewport_width,
        device_scale_factor, wait_ms, linkedin, output_root,
    )

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        try:
            for theme in themes:
                color_scheme, md_scheme = _resolve_theme(theme)
                target_dir, basename = _target_dir_for_export(output_root, snippet_ref, theme)
                print(f"[export-v2] theme={theme} -> {target_dir}")

                context = await browser.new_context(
                    viewport={"width": int(viewport_width), "height": int(viewport_height)},
                    color_scheme=color_scheme,
                    device_scale_factor=device_scale_factor,
                )
                page = await context.new_page()
                await _open_runtime_page(
                    page, snippet_ref, md_scheme,
                    wait_ms=wait_ms, export_width=export_width,
                )

                produced = await _export_one_theme(
                    page, snippet_ref, target_dir, basename,
                    wait_ms=wait_ms, linkedin=linkedin,
                    viewport_width=viewport_width, viewport_height=viewport_height,
                )
                all_produced[theme] = produced
                await context.close()
        finally:
            await browser.close()

    total = sum(len(v) for v in all_produced.values())
    print(f"[export-v2] done: {abs_path} -> {total} file(s)")
    for theme, files in all_produced.items():
        for f in files:
            li_tag = " [linkedin]" if f.endswith("_li.png") else ""
            print(f"  [{theme}]{li_tag} {f}")

    return all_produced


# ---------------------------------------------------------------------------
# Preflight summary
# ---------------------------------------------------------------------------

def _print_preflight(snippet_ref, abs_path, themes, export_width, viewport_width,
                     device_scale_factor, wait_ms, linkedin, output_root):
    sep = "=" * 64
    print(sep)
    print("[export-v2] PREFLIGHT — qué va a pasar")
    print(sep)
    print(f"  Entrada   : {abs_path}")
    print(f"  Temas     : {', '.join(themes)}")
    print(f"  Salida    : {output_root}/snippets/…/<tema>/")
    print(f"  Viewport  : {viewport_width}px ancho · escala {device_scale_factor}x"
          f" → PNGs a {int(viewport_width * device_scale_factor)}px efectivos")
    print(f"  Ancho CSS : {export_width}px (tamaño del componente renderizado)")
    print(f"  Espera    : {wait_ms}ms entre tabs / tras carga")
    print(f"  Fuentes   : Google Fonts online (Inter + JetBrains Mono)")
    print(f"              — se requiere conexión a internet")
    print()
    print("  Flujo por tema:")
    print("  1. Chromium headless · color-scheme forzado al tema")
    print("  2. Carga de página y espera a networkidle (≤25 s)")
    print("  3. Espera a document.fonts.ready (fuentes tipográficas)")
    print("  4. Detección de tabs (button[data-tab] visibles):")
    print("     · Con tabs  → screenshot por cada tab (nombre: N_id.png)")
    print("     · Sin tabs  → un único screenshot (nombre: <snippet>.png)")
    print("  5. Auto-run de animaciones si existen:")
    print("     · [data-btn='train']  → click + espera a idle")
    print("     · [data-btn='toggle'] → click si el label indica 'play'")
    print("     · [data-autoplay]     → espera el intervalo × 2 (máx 5 s)")
    if linkedin:
        print(f"  6. LinkedIn ({LI_FRAME_WIDTH}px ancho · altura natural del contenido):")
        print(f"     · Viewport se redimensiona a {LI_FRAME_WIDTH}px → reflow CSS natural")
        print(f"     · Screenshot del shell tal cual (sin transforms, sin wrappers)")
        print(f"     · Idéntico aspecto al PNG normal pero a {LI_FRAME_WIDTH}px de ancho")
        print(f"     · Guarda <nombre>_li.png junto a cada PNG normal")
    else:
        print("  6. Frames LinkedIn: desactivados (--no-linkedin)")
    print()
    base_per_theme = "N PNGs (uno por tab) + N_li.png" if linkedin else "N PNGs (uno por tab)"
    print(f"  Archivos esperados por tema: {base_per_theme}")
    print(sep)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main_cli():
    parser = argparse.ArgumentParser(
        description=(
            "Export animation snippets to PNG for light and dark themes, "
            "with optional LinkedIn portrait frames."
        )
    )
    parser.add_argument(
        "html_path",
        help='Snippet ref ("snippets/...") or absolute path under docs/snippets.',
    )
    parser.add_argument(
        "--output", "-o",
        default="exports",
        help="Output root directory (default: exports).",
    )
    parser.add_argument(
        "--themes",
        nargs="+",
        choices=["light", "dark"],
        default=["light", "dark"],
        help="Themes to export (default: light dark).",
    )
    parser.add_argument(
        "--wait",
        type=int,
        default=1000,
        help="Wait ms after page load and between tabs (default: 1000).",
    )
    parser.add_argument(
        "--width",
        type=int,
        default=1400,
        help="Animation export width in px (default: 1400).",
    )
    parser.add_argument(
        "--scale",
        type=float,
        default=2.0,
        help="Device pixel ratio / scale factor (default: 2.0).",
    )
    parser.add_argument(
        "--no-linkedin",
        dest="linkedin",
        action="store_false",
        help="Skip LinkedIn-framed exports.",
    )
    parser.set_defaults(linkedin=True)
    args = parser.parse_args()

    asyncio.run(
        export_tabs_v2(
            args.html_path,
            output_root=args.output,
            themes=args.themes,
            wait_ms=args.wait,
            export_width=args.width,
            device_scale_factor=args.scale,
            linkedin=args.linkedin,
        )
    )


if __name__ == "__main__":
    main_cli()
