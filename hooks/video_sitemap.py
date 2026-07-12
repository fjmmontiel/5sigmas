"""
Hook: video_sitemap.py
Genera video-sitemap.xml con el esquema Google Video Sitemap 1.1.
Genera una página dedicada /videos/.../ por cada .md público que declare `video`.
Requiere que exista un thumbnail .jpg con el mismo slug junto al MP4.
"""

import json
import re
from html import escape as html_escape
from pathlib import Path
from xml.sax.saxutils import escape

SITE_URL = "https://5sigmas.com"

# Páginas recolectadas durante el build
_video_pages: list[dict] = []


def on_config(config, **kwargs):
    _video_pages.clear()
    return config


def on_page_context(context, page, config, nav, **kwargs):
    meta = page.meta or {}
    video_file = meta.get("video")
    if not video_file:
        return context
    if "noindex" in str(meta.get("robots", "")).lower():
        return context

    # Construir rutas relativas al directorio del .md
    src_path = Path(config["docs_dir"]) / page.file.src_path
    src_dir = src_path.parent
    slug = Path(video_file).stem

    thumb_path = src_dir / f"{slug}.jpg"
    if not thumb_path.exists():
        return context  # sin thumbnail Google rechaza la entrada

    # URL canónica de la página
    page_url = page.canonical_url or f"{SITE_URL}/{page.file.dest_path}"
    watch_url = _watch_url(page.file.src_path, video_file)

    # Rutas relativas desde docs/ para construir la URL pública
    rel = Path(page.file.src_path).parent
    video_url = f"{SITE_URL}/{rel}/{video_file}".replace("//", "/").replace(":/", "://")
    thumb_url = f"{SITE_URL}/{rel}/{slug}.jpg".replace("//", "/").replace(":/", "://")
    publication_date = _normalize_date(meta.get("date"))
    duration_seconds = _duration_to_seconds(meta.get("video_duration"))

    _video_pages.append({
        "page_url": page_url.rstrip("/") + "/",
        "watch_url": watch_url,
        "video_url": video_url,
        "thumb_url": thumb_url,
        "title": str(meta.get("video_title") or meta.get("title") or slug),
        "description": str(meta.get("description") or ""),
        "publication_date": publication_date,
        "duration": duration_seconds,
        "duration_iso": str(meta.get("video_duration") or ""),
    })

    return context


def on_post_build(config, **kwargs):
    site_dir = Path(config["site_dir"])
    for entry in _video_pages:
        _write_watch_page(site_dir, entry)
    _append_watch_pages_to_sitemap(site_dir, _video_pages)

    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
        '        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">',
    ]

    for entry in _video_pages:
        optional_video_tags = []
        if entry["duration"]:
            optional_video_tags.append(f"      <video:duration>{entry['duration']}</video:duration>")
        if entry["publication_date"]:
            optional_video_tags.append(f"      <video:publication_date>{entry['publication_date']}</video:publication_date>")
        lines += [
            "  <url>",
            f"    <loc>{entry['watch_url']}</loc>",
            "    <video:video>",
            f"      <video:thumbnail_loc>{entry['thumb_url']}</video:thumbnail_loc>",
            f"      <video:title>{escape(entry['title'])}</video:title>",
            f"      <video:description>{escape(entry['description'])}</video:description>",
            f"      <video:content_loc>{entry['video_url']}</video:content_loc>",
            *optional_video_tags,
            "    </video:video>",
            "  </url>",
        ]

    lines.append("</urlset>")

    out = site_dir / "video-sitemap.xml"
    with open(out, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


def _normalize_date(value) -> str:
    date = str(value or "")
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", date):
        return date + "T00:00:00+00:00"
    return date


def _duration_to_seconds(value) -> str:
    duration = str(value or "")
    match = re.fullmatch(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", duration)
    if not match:
        return ""
    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    seconds = int(match.group(3) or 0)
    total = hours * 3600 + minutes * 60 + seconds
    return str(total) if total else ""


def _watch_url(src_path: str, video_file: str) -> str:
    rel = Path(src_path).parent / Path(video_file).stem
    return f"{SITE_URL}/videos/{rel.as_posix().strip('/')}/"


def _write_watch_page(site_dir: Path, entry: dict) -> None:
    rel = entry["watch_url"].removeprefix(SITE_URL).strip("/")
    out_dir = site_dir / rel
    out_dir.mkdir(parents=True, exist_ok=True)

    title = html_escape(entry["title"])
    description = html_escape(entry["description"])
    jsonld = {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        "name": entry["title"],
        "description": entry["description"],
        "thumbnailUrl": entry["thumb_url"],
        "contentUrl": entry["video_url"],
        "uploadDate": entry["publication_date"],
        "inLanguage": "es",
        "author": {
            "@type": "Person",
            "name": "Francisco Maldonado",
            "url": f"{SITE_URL}/meta/about/",
        },
        "publisher": {
            "@type": "Organization",
            "name": "5sigmas",
            "url": f"{SITE_URL}/",
        },
    }
    if entry["duration_iso"]:
        jsonld["duration"] = entry["duration_iso"]

    html = f"""<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>{title} - Vídeo - 5sigmas</title>
  <meta name="description" content="{description}">
  <link rel="canonical" href="{entry["watch_url"]}">
  <meta property="og:type" content="video.other">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{description}">
  <meta property="og:url" content="{entry["watch_url"]}">
  <meta property="og:image" content="{entry["thumb_url"]}">
  <script type="application/ld+json">
{json.dumps(jsonld, ensure_ascii=False, indent=2)}
  </script>
  <style>
    body {{
      margin: 0;
      background: #071114;
      color: #eef7f8;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }}
    main {{
      width: min(1040px, calc(100% - 32px));
      margin: 0 auto;
      padding: 40px 0 56px;
    }}
    a {{ color: #78dce8; }}
    h1 {{ font-size: clamp(2rem, 4vw, 3.5rem); line-height: 1.05; margin: 0 0 14px; }}
    p {{ color: #bed0d3; font-size: 1.05rem; line-height: 1.7; max-width: 78ch; }}
    video {{
      display: block;
      width: 100%;
      margin: 28px 0 20px;
      border-radius: 10px;
      background: #020607;
      box-shadow: 0 22px 70px rgba(0,0,0,.35);
    }}
    .meta {{ margin-top: 18px; font-size: .95rem; }}
  </style>
</head>
<body>
  <main>
    <p class="meta"><a href="{entry["page_url"]}">Volver al artículo</a></p>
    <h1>{title}</h1>
    <p>{description}</p>
    <video controls preload="metadata" poster="{entry["thumb_url"]}" playsinline>
      <source src="{entry["video_url"]}" type="video/mp4">
      Tu navegador no soporta el elemento de vídeo.
    </video>
  </main>
</body>
</html>
"""
    (out_dir / "index.html").write_text(html, encoding="utf-8")


def _append_watch_pages_to_sitemap(site_dir: Path, entries: list[dict]) -> None:
    sitemap = site_dir / "sitemap.xml"
    if not sitemap.exists() or not entries:
        return

    content = sitemap.read_text(encoding="utf-8")
    blocks = []
    for entry in entries:
        if f"<loc>{entry['watch_url']}</loc>" in content:
            continue
        blocks.append(f"  <url>\n    <loc>{entry['watch_url']}</loc>\n  </url>")
    if not blocks:
        return

    content = content.replace("</urlset>", "\n".join(blocks) + "\n</urlset>")
    sitemap.write_text(content, encoding="utf-8")
