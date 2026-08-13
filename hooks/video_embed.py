"""Inject locale-aware article video and optional audio players.

Pages opt into video with ``video`` in frontmatter. Media is same-origin by
default. If ``S5_VIDEO_MEDIA_ORIGIN`` is configured, non-Spanish locales are
stored under a locale prefix so translated pages can never resolve Spanish media.
"""

from functools import lru_cache
from html import escape
import os
from pathlib import Path
import re

import yaml


def _esc(value: str) -> str:
    return escape(str(value or "").replace("\n", " ").strip(), quote=True)


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


def _locale(config) -> str:
    extra = config.get("extra") or {}
    value = str(extra.get("content_language") or os.environ.get("S5_LOCALE") or "es").strip().lower()
    return value or "es"


def _ui(config) -> dict:
    if _locale(config).startswith("en"):
        return {
            "caption_lang": "en",
            "caption_label": "English",
            "unsupported_video": "Your browser does not support the video element.",
            "play": "Play video",
            "watch": "Watch video, summary and related content",
        }
    return {
        "caption_lang": "es",
        "caption_label": "Español",
        "unsupported_video": "Tu navegador no soporta el elemento de vídeo.",
        "play": "Reproducir vídeo",
        "watch": "Ver vídeo, resumen y contenidos relacionados",
    }


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


def _media_url(page, filename: str, config) -> str:
    if re.match(r"^https?://", filename, re.IGNORECASE):
        return filename
    media_origin = os.environ.get("S5_VIDEO_MEDIA_ORIGIN", "").strip().rstrip("/")
    if media_origin:
        parent = Path(page.file.src_path).parent.as_posix().strip("/")
        locale = _locale(config)
        prefix = "" if locale == "es" else f"{locale}/"
        relative = f"{parent}/{filename}" if parent else filename
        return f"{media_origin}/{prefix}{relative}"
    return f"../{filename}"


def on_post_page(output: str, page, config, **kwargs) -> str:
    meta = page.meta or {}
    video_file = str(meta.get("video") or "").strip()
    if not video_file:
        return output

    poster_file = str(meta.get("video_poster") or Path(video_file).with_suffix(".jpg").name).strip()
    captions_file = str(meta.get("video_captions") or "").strip()

    video_url = _media_url(page, video_file, config)
    poster_url = _media_url(page, poster_file, config)
    captions_url = _media_url(page, captions_file, config) if captions_file else ""

    title = _esc(meta.get("video_title") or page.title or "")
    site_url = (config.site_url or "").rstrip("/")
    extra = config.get("extra") or {}
    watch_pages = bool(extra.get("video_watch_pages", True))
    watch_url = _watch_url(site_url, page.file.src_path, video_file) if site_url and watch_pages else ""
    video_dom_id = _dom_id("s5-video", page.file.src_path)
    ui = _ui(config)

    track = ""
    if captions_url:
        track = (
            f'      <track kind="captions" src="{_esc(captions_url)}" '
            f'srclang="{ui["caption_lang"]}" label="{_esc(ui["caption_label"])}" default>\n'
        )

    watch_html = (
        f'  <p class="s5-video-embed__watch"><a href="{_esc(watch_url)}">{_esc(ui["watch"])}</a></p>\n'
        if watch_url else ""
    )
    video_html = (
        '<div class="s5-video-embed" data-s5-inline-video>\n'
        '  <div class="s5-video-embed__frame">\n'
        "    <video\n"
        f'      id="{video_dom_id}"\n'
        '      data-s5-inline-video-player\n'
        '      controls\n'
        '      crossorigin="anonymous"\n'
        '      controlsList="nodownload"\n'
        '      oncontextmenu="return false"\n'
        '      preload="none"\n'
        f'      poster="{_esc(poster_url)}"\n'
        "      playsinline\n"
        f'      aria-label="{title}"\n'
        "    >\n"
        f'      <source src="{_esc(video_url)}" type="video/mp4">\n'
        f"{track}"
        f'      {_esc(ui["unsupported_video"])}\n'
        "    </video>\n"
        '    <button class="s5-video-embed__poster" type="button" data-s5-inline-video-start '
        f'aria-label="{_esc(ui["play"])}: {title}">\n'
        f'      <img src="{_esc(poster_url)}" alt="" decoding="async" aria-hidden="true">\n'
        '      <span class="s5-video-embed__play" aria-hidden="true"></span>\n'
        "    </button>\n"
        "    <noscript><style>.s5-video-embed__frame>video{visibility:visible!important}.s5-video-embed__poster{display:none!important}</style></noscript>\n"
        "  </div>\n"
        f"{watch_html}"
        "</div>"
    )
    audio_html = _render_article_audio(page, video_dom_id) if _locale(config) == "es" else ""

    output = re.sub(
        r"(</h1>)",
        r"\1\n" + video_html + ("\n" + audio_html if audio_html else ""),
        output,
        count=1,
    )
    return output
