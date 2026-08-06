"""Consolidate the legacy generated video archive into the visual learning hub."""

from pathlib import Path
import re


SITE_URL = "https://5sigmas.com"
VIDEO_INDEX_URL = f"{SITE_URL}/videos/"
VISUAL_HUB_URL = f"{SITE_URL}/visuales/"


def on_post_build(config, **kwargs) -> None:
    """Run after ``video_sitemap`` and replace only the legacy video index."""
    site_dir = Path(config["site_dir"])
    _write_redirect(site_dir)
    _remove_video_index_from_sitemap(site_dir)


def _write_redirect(site_dir: Path) -> None:
    out_dir = site_dir / "videos"
    out_dir.mkdir(parents=True, exist_ok=True)

    html = f"""<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Explicaciones visuales de IA - 5sigmas</title>
  <meta name="robots" content="noindex,follow">
  <meta name="description" content="Los vídeos y animaciones interactivas de 5sigmas se encuentran en el hub visual.">
  <link rel="canonical" href="{VISUAL_HUB_URL}">
  <meta http-equiv="refresh" content="0; url={VISUAL_HUB_URL}">
  <script>window.location.replace({VISUAL_HUB_URL!r});</script>
</head>
<body>
  <main>
    <h1>Las explicaciones visuales se han movido</h1>
    <p><a href="{VISUAL_HUB_URL}">Abrir vídeos y animaciones de 5sigmas</a>.</p>
  </main>
</body>
</html>
"""
    (out_dir / "index.html").write_text(html, encoding="utf-8")


def _remove_video_index_from_sitemap(site_dir: Path) -> None:
    sitemap = site_dir / "sitemap.xml"
    if not sitemap.exists():
        return

    content = sitemap.read_text(encoding="utf-8")
    pattern = re.compile(
        rf"\s*<url>\s*<loc>{re.escape(VIDEO_INDEX_URL)}</loc>\s*</url>",
        re.MULTILINE,
    )
    cleaned = pattern.sub("", content)
    if cleaned != content:
        sitemap.write_text(cleaned, encoding="utf-8")
