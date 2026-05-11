"""
Hook: video_sitemap.py
Genera video-sitemap.xml con el esquema Google Video Sitemap 1.1.
Lee el front matter de cada .md que declare `video: <archivo.mp4>`.
Requiere que exista un thumbnail .jpg con el mismo slug junto al MP4.
"""

import os
import re
from pathlib import Path
from xml.sax.saxutils import escape

import yaml  # disponible vía mkdocs

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

    # Rutas relativas desde docs/ para construir la URL pública
    rel = Path(page.file.src_path).parent
    video_url = f"{SITE_URL}/{rel}/{video_file}".replace("//", "/").replace(":/", "://")
    thumb_url = f"{SITE_URL}/{rel}/{slug}.jpg".replace("//", "/").replace(":/", "://")
    publication_date = _normalize_date(meta.get("date"))
    duration_seconds = _duration_to_seconds(meta.get("video_duration"))

    _video_pages.append({
        "page_url": page_url.rstrip("/") + "/",
        "video_url": video_url,
        "thumb_url": thumb_url,
        "title": escape(meta.get("title", slug)),
        "description": escape(meta.get("description", "")),
        "publication_date": publication_date,
        "duration": duration_seconds,
    })

    return context


def on_post_build(config, **kwargs):
    if not _video_pages:
        return

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
            f"    <loc>{entry['page_url']}</loc>",
            "    <video:video>",
            f"      <video:thumbnail_loc>{entry['thumb_url']}</video:thumbnail_loc>",
            f"      <video:title>{entry['title']}</video:title>",
            f"      <video:description>{entry['description']}</video:description>",
            f"      <video:content_loc>{entry['video_url']}</video:content_loc>",
            *optional_video_tags,
            "    </video:video>",
            "  </url>",
        ]

    lines.append("</urlset>")

    out = os.path.join(config["site_dir"], "video-sitemap.xml")
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
