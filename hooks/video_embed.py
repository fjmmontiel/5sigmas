"""
hooks/video_embed.py — MkDocs hook

Injects a <video> embed on pages that declare:

    video: "01-representar.mp4"

in their frontmatter. Both the .mp4 and the poster (.jpg, same base name)
must live alongside the .md file — they'll be copied to the site by MkDocs.

Optional frontmatter fields:
    video_duration: "PT4M20S"   ISO 8601

The video title and description are taken from the page's own title/description.
"""

from functools import lru_cache
from pathlib import Path
import re

import yaml


def _esc(s: str) -> str:
    return str(s).replace('"', '\\"').replace("\n", " ").strip()


def _dom_id(prefix: str, value: str) -> str:
    token = re.sub(r"[^a-z0-9]+", "-", str(value).lower()).strip("-")
    return f"{prefix}-{token or 'page'}"


ARTICLE_AUDIO_INDEX = Path(__file__).resolve().parents[1] / "docs" / "series" / "article_audio.yml"
MIME_TYPES = {
    ".wav": "audio/wav",
    ".mp3": "audio/mpeg",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
    ".ogg": "audio/ogg",
}


@lru_cache(maxsize=1)
def _load_article_audio_index() -> dict:
    if not ARTICLE_AUDIO_INDEX.exists():
        return {}
    try:
        data = yaml.safe_load(ARTICLE_AUDIO_INDEX.read_text(encoding="utf-8")) or {}
    except Exception:
        return {}
    return data if isinstance(data, dict) else {}


def _render_article_audio(page, video_dom_id: str) -> str:
    entry = _load_article_audio_index().get(page.file.src_path)
    if not isinstance(entry, dict):
        return ""

    audio_file = str(entry.get("audio_file") or "").strip().lstrip("/")
    if not audio_file:
        return ""

    title = _esc(entry.get("title") or "Escucha el artículo")
    voice = _esc(entry.get("voice_label") or entry.get("voice") or "Kokoro")
    mime = MIME_TYPES.get(Path(audio_file).suffix.lower(), "audio/wav")
    detail = f"Narrado con la voz {voice}."

    return (
        f'<div class="s5-article-audio" data-video-id="{video_dom_id}">\n'
        '  <div class="s5-article-audio__meta">\n'
        '    <p class="s5-article-audio__eyebrow">Audio local</p>\n'
        f'    <p class="s5-article-audio__title">{title}</p>\n'
        f'    <p class="s5-article-audio__detail">{detail}</p>\n'
        "  </div>\n"
        '  <audio controls preload="none" class="s5-article-audio__player" data-audio-role="podcast">\n'
        f'    <source src="/{audio_file}" type="{mime}">\n'
        "    Tu navegador no soporta el elemento de audio.\n"
        "  </audio>\n"
        "</div>"
    )


def _watch_url(site_url: str, src_path: str, video_file: str) -> str:
    rel = Path(src_path).parent / Path(video_file).stem
    return f"{site_url}/videos/{rel.as_posix().strip('/')}/"


# ── Hook ──────────────────────────────────────────────────────────────────────

def on_post_page(output: str, page, config, **kwargs) -> str:
    meta = page.meta or {}
    video_file = meta.get("video")
    if not video_file:
        return output

    # Derive poster filename from mp4 basename
    base        = video_file.rsplit(".", 1)[0]   # "01-representar"
    poster_file = base + ".jpg"

    # Relative paths used inside <video> — one level up from the slug/ directory
    rel_video  = f"../{video_file}"
    rel_poster = f"../{poster_file}"

    # Metadata from page frontmatter / config
    title       = _esc(meta.get("video_title") or page.title or "")
    site_url    = (config.site_url or "").rstrip("/")
    watch_url   = _watch_url(site_url, page.file.src_path, video_file) if site_url else ""

    # ── <video> embed ─────────────────────────────────────────────────────────
    video_dom_id = _dom_id("s5-video", page.file.src_path)
    video_html = (
        '<div class="s5-video-embed">\n'
        "  <video\n"
        f'    id="{video_dom_id}"\n'
        "    controls\n"
        '    controlsList="nodownload"\n'
        '    oncontextmenu="return false"\n'
        '    preload="none"\n'
        f'    poster="{rel_poster}"\n'
        "    playsinline\n"
        f'    aria-label="{title}"\n'
        "  >\n"
        f'    <source src="{rel_video}" type="video/mp4">\n'
        "  </video>\n"
        f'  <p class="s5-video-embed__watch"><a href="{watch_url}">Ver página del vídeo</a></p>\n'
        "</div>"
    )
    audio_html = _render_article_audio(page, video_dom_id)

    # Inject video after the first </h1> in the page
    output = re.sub(r"(</h1>)", r"\1\n" + video_html + ("\n" + audio_html if audio_html else ""), output, count=1)

    return output
