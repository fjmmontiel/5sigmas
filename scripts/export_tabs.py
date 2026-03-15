import argparse
import base64
import mimetypes
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
ASSETS = DOCS / "assets"
sys.path.insert(0, str(ROOT))
import main  # noqa: E402


class RendererUnavailableError(RuntimeError):
    pass


def _resolve_theme(theme):
    if theme == "dark":
        return "dark", "slate"
    if theme == "light":
        return "light", "default"
    return "light", "default"


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


def _build_export_layout_style(export_width, frame=None):
    width = max(960, int(export_width))
    stage_css = f"""
body {{
  padding: 24px;
}}
.export-stage {{
  width: {width}px;
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
    if not frame:
        return stage_css

    frame_width = int(frame["width"])
    frame_height = int(frame["height"])
    frame_padding = int(frame["padding"])
    return stage_css + f"""
html, body {{
  width: {frame_width}px;
  height: {frame_height}px;
  overflow: hidden;
}}
body {{
  padding: 0;
}}
.export-frame {{
  width: {frame_width}px;
  height: {frame_height}px;
  box-sizing: border-box;
  padding: {frame_padding}px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  overflow: hidden;
  background: var(--md-default-bg-color);
}}
.export-stage {{
  width: min({width}px, {frame_width - frame_padding * 2}px);
  margin: 0;
}}
"""


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
    asset_base = ASSETS.resolve().as_uri().rstrip("/")
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


def build_variant_filename(theme, variant=None):
    safe_theme = str(theme or "export").strip().lower()
    safe_variant = str(variant or "").strip().lower()
    if safe_variant:
        return f"{safe_theme}_{safe_variant}.png"
    return f"{safe_theme}.png"


def auto_run_trigger_selectors():
    return (
        '[data-btn="train"]',
        '[data-btn="toggle"]',
        'button[data-btn="train"]',
        'button[data-btn="toggle"]',
        'button[aria-label*="Entrenar"]',
    )


def _build_autorun_script(wait_ms):
    selectors = ", ".join(repr(sel) for sel in auto_run_trigger_selectors())
    return f"""
<script>
(function() {{
  function isVisible(el) {{
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }}
  function clickBestTrigger() {{
    const selectors = [{selectors}];
    for (const selector of selectors) {{
      const btn = document.querySelector(selector);
      if (!btn || !isVisible(btn) || btn.disabled) continue;
      const label = (btn.textContent || btn.getAttribute('aria-label') || '').trim().toLowerCase();
      if (selector.includes('toggle') && !(label.includes('entrenar') || label.includes('animar') || label.includes('play') || label.includes('▶'))) {{
        continue;
      }}
      btn.click();
      return true;
    }}
    return false;
  }}
  window.addEventListener('load', function() {{
    setTimeout(clickBestTrigger, 120);
  }});
  window.__EXPORT_WAIT_MS__ = {int(wait_ms)};
}})();
</script>
"""


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
        raise ValueError("Input file must be under docs/ and resolve to snippets/*.html") from exc

    if not rel.startswith("snippets/") or not rel.endswith(".html"):
        raise ValueError("Input file must resolve to docs/snippets/*.html")

    return rel, candidate


def extract_include_html_refs(markdown_text):
    pattern = re.compile(r'include_html\(\s*["\']([^"\']+)["\']')
    return pattern.findall(markdown_text or "")


def _build_runtime_document(snippet_ref, md_scheme, export_width=1800, frame=None, wait_ms=1600):
    rendered = _localize_asset_urls(main.render_include_html(snippet_ref, anim_shell="on", anim_fullscreen="off"))
    extra_css = _localize_asset_urls((DOCS / "stylesheets" / "extra.css").read_text(encoding="utf-8"))
    animations_css = _localize_asset_urls((ASSETS / "stylesheets" / "animations.css").read_text(encoding="utf-8"))
    tabbed_js = (ASSETS / "javascripts" / "tabbed-animations.js").read_text(encoding="utf-8")
    shell_js = (ASSETS / "javascripts" / "animation-shell.js").read_text(encoding="utf-8")
    frame_open = '<div class="export-frame">' if frame else ""
    frame_close = "</div>" if frame else ""
    return f"""<!doctype html>
<html data-md-color-scheme="{md_scheme}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>{_build_export_style(md_scheme)}</style>
    <style>{_build_export_layout_style(export_width, frame=frame)}</style>
    <style>{animations_css}</style>
    <style>{extra_css}</style>
  </head>
  <body data-md-color-scheme="{md_scheme}">
    {frame_open}<div class="export-stage">{rendered}</div>{frame_close}
    <script>{tabbed_js}</script>
    <script>{shell_js}</script>
    {_build_autorun_script(wait_ms)}
  </body>
</html>
"""


def _target_dir_for_export(output_root, snippet_ref):
    rel_dir = os.path.dirname(snippet_ref)
    basename = os.path.splitext(os.path.basename(snippet_ref))[0]
    target_dir = os.path.join(output_root, rel_dir, basename)
    os.makedirs(target_dir, exist_ok=True)
    return target_dir, basename


def _resolve_renderer_binary(renderer_bin=None):
    explicit = renderer_bin or os.environ.get("EXPORT_RENDERER_BIN")
    if explicit:
        path = Path(explicit).expanduser()
        if not path.exists():
            raise RendererUnavailableError(
                f"Renderer bin not found: {path}. Minimum action: install wkhtmltoimage and set EXPORT_RENDERER_BIN."
            )
        return str(path)

    found = shutil.which("wkhtmltoimage")
    if found:
        return found

    raise RendererUnavailableError(
        "Missing renderer: wkhtmltoimage. Expected in PATH or EXPORT_RENDERER_BIN. "
        "Minimum action: install wkhtmltoimage and rerun the export."
    )


def render_html_to_png(html, output_path, width, height=None, wait_ms=1600, renderer_bin=None):
    renderer = _resolve_renderer_binary(renderer_bin)
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    tmpdir = Path(tempfile.mkdtemp(prefix="export-tabs-"))
    html_path = tmpdir / "render.html"
    html_path.write_text(html, encoding="utf-8")

    cmd = [
        renderer,
        "--enable-local-file-access",
        "--quality",
        "100",
        "--javascript-delay",
        str(int(wait_ms)),
        "--width",
        str(int(width)),
    ]
    if height is not None:
        cmd.extend(["--height", str(int(height))])
    cmd.extend([str(html_path), str(output_path)])

    try:
        completed = subprocess.run(cmd, capture_output=True, text=True, check=False)
    finally:
        if html_path.exists():
            html_path.unlink()
        try:
            tmpdir.rmdir()
        except OSError:
            pass

    if completed.returncode != 0:
        raise RuntimeError(
            f"Renderer failed ({renderer}). Exit={completed.returncode}. "
            f"stderr={completed.stderr.strip() or 'n/a'}"
        )

    if not Path(output_path).is_file():
        raise RuntimeError(f"Renderer did not create output: {output_path}")

    return str(output_path)


def export_primary_png(
    html_path,
    output_path,
    theme="light",
    wait_ms=1600,
    export_width=1800,
    frame=None,
    renderer_bin=None,
):
    snippet_ref, _ = _resolve_snippet_path(html_path)
    _, md_scheme = _resolve_theme(theme)
    html = _build_runtime_document(
        snippet_ref,
        md_scheme,
        export_width=export_width,
        frame=frame,
        wait_ms=wait_ms,
    )
    frame_height = None if not frame else int(frame["height"])
    frame_width = export_width if not frame else int(frame["width"])
    return render_html_to_png(
        html,
        output_path,
        width=frame_width,
        height=frame_height,
        wait_ms=wait_ms,
        renderer_bin=renderer_bin,
    )


def export_tabs(
    html_path,
    output_root,
    theme="light",
    wait_ms=1600,
    export_width=1800,
    renderer_bin=None,
):
    snippet_ref, abs_path = _resolve_snippet_path(html_path)
    target_dir, basename = _target_dir_for_export(output_root, snippet_ref)
    output_path = os.path.join(target_dir, f"{basename}_{theme}.png")
    export_primary_png(
        snippet_ref,
        output_path,
        theme=theme,
        wait_ms=wait_ms,
        export_width=export_width,
        renderer_bin=renderer_bin,
    )
    print(f"[export-tabs] done: {abs_path} -> {output_path}")
    return output_path


def main_cli():
    parser = argparse.ArgumentParser(description="Export animation snippets to PNG via include_html shell rendering.")
    parser.add_argument("html_path", help='Snippet path ("snippets/...") or absolute path under docs/snippets.')
    parser.add_argument("--output", "-o", default="exports", help="Output directory root.")
    parser.add_argument("--theme", choices=["light", "dark"], default="light", help="Theme for export.")
    parser.add_argument("--wait-ms", type=int, default=1600, help="JavaScript wait before export.")
    parser.add_argument("--export-width", type=int, default=1800, help="Target shell width in CSS pixels.")
    parser.add_argument("--renderer-bin", default=None, help="Path to wkhtmltoimage binary.")
    args = parser.parse_args()
    export_tabs(
        args.html_path,
        args.output,
        theme=args.theme,
        wait_ms=args.wait_ms,
        export_width=args.export_width,
        renderer_bin=args.renderer_bin,
    )


if __name__ == "__main__":
    main_cli()
