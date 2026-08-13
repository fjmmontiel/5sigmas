"""Inject locale-aware article video and optional audio players.

Spanish pages normally opt into video through frontmatter. Locale builds may
also declare media in ``extra.locale_video_pages`` or ``locales/<locale>/media.yml``.
Locale media is intentionally explicit so translated pages never inherit a
Spanish-labelled binary by accident.
"""

from functools import lru_cache
from html import escape
import os
from pathlib import Path
import re

import yaml


ROOT = Path(__file__).resolve().parents[1]
ARTICLE_AUDIO_INDEX = ROOT / "docs" / "series" / "article_audio.yml"
LOCALES_ROOT = ROOT / "locales"
MIME_TYPES = {".wav": "audio/wav", ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".aac": "audio/aac", ".ogg": "audio/ogg"}


def _esc(value: str) -> str:
    return escape(str(value or "").replace("\n", " ").strip(), quote=True)


def _dom_id(prefix: str, value: str) -> str:
    token = re.sub(r"[^a-z0-9]+", "-", str(value).lower()).strip("-")
    return f"{prefix}-{token or 'page'}"


@lru_cache(maxsize=1)
def _load_article_audio_index() -> dict:
    if not ARTICLE_AUDIO_INDEX.exists():
        return {}
    try:
        data = yaml.safe_load(ARTICLE_AUDIO_INDEX.read_text(encoding="utf-8")) or {}
    except Exception:
        return {}
    return data if isinstance(data, dict) else {}


@lru_cache(maxsize=8)
def _load_locale_media(locale: str) -> dict:
    path = LOCALES_ROOT / locale / "media.yml"
    if not path.is_file():
        return {}
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except Exception:
        return {}
    return data if isinstance(data, dict) else {}


def _locale(config) -> str:
    extra = config.get("extra") or {}
    return str(extra.get("content_language") or os.environ.get("S5_LOCALE") or "es").strip().lower() or "es"


def _ui(config) -> dict:
    if _locale(config).startswith("en"):
        return {"caption_lang":"en","caption_label":"English","unsupported_video":"Your browser does not support the video element.","play":"Play video","watch":"Watch video, summary and related content"}
    return {"caption_lang":"es","caption_label":"Español","unsupported_video":"Tu navegador no soporta el elemento de vídeo.","play":"Reproducir vídeo","watch":"Ver vídeo, resumen y contenidos relacionados"}


def _video_meta(page, config) -> dict:
    meta = dict(page.meta or {})
    declared = (config.get("extra") or {}).get("locale_video_pages") or {}
    sources = []
    config_entry = declared.get(page.file.src_path) if isinstance(declared, dict) else None
    if isinstance(config_entry, dict):
        sources.append(config_entry)
    locale_entry = _load_locale_media(_locale(config)).get(page.file.src_path)
    if isinstance(locale_entry, dict):
        sources.append(locale_entry)
    for source in sources:
        for key, value in source.items():
            meta.setdefault(key, value)
    return meta


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
    return (f'<div class="s5-article-audio" data-video-id="{video_dom_id}">\n'
        '  <div class="s5-article-audio__meta">\n<p class="s5-article-audio__eyebrow">Audio local</p>\n'
        f'<p class="s5-article-audio__title">{title}</p>\n<p class="s5-article-audio__detail">Narrado con la voz {voice}.</p>\n</div>\n'
        f'<audio controls preload="none" class="s5-article-audio__player" data-audio-role="podcast"><source src="/{audio_file}" type="{mime}">Tu navegador no soporta el elemento de audio.</audio>\n</div>')


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
    meta = _video_meta(page, config)
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
        track = f'      <track kind="captions" src="{_esc(captions_url)}" srclang="{ui["caption_lang"]}" label="{_esc(ui["caption_label"])}" default>\n'
    watch_html = f'  <p class="s5-video-embed__watch"><a href="{_esc(watch_url)}">{_esc(ui["watch"])}</a></p>\n' if watch_url else ""
    video_html = (
        '<div class="s5-video-embed" data-s5-inline-video>\n  <div class="s5-video-embed__frame">\n'
        f'<video id="{video_dom_id}" data-s5-inline-video-player controls crossorigin="anonymous" controlsList="nodownload" oncontextmenu="return false" preload="none" poster="{_esc(poster_url)}" playsinline aria-label="{title}">\n'
        f'<source src="{_esc(video_url)}" type="video/mp4">\n{track}      {_esc(ui["unsupported_video"])}\n</video>\n'
        f'<button class="s5-video-embed__poster" type="button" data-s5-inline-video-start aria-label="{_esc(ui["play"])}: {title}"><img src="{_esc(poster_url)}" alt="" decoding="async" aria-hidden="true"><span class="s5-video-embed__play" aria-hidden="true"></span></button>\n'
        '<noscript><style>.s5-video-embed__frame>video{visibility:visible!important}.s5-video-embed__poster{display:none!important}</style></noscript>\n  </div>\n'
        f'{watch_html}</div>')
    audio_html = _render_article_audio(page, video_dom_id) if _locale(config) == "es" else ""
    return re.sub(r"(</h1>)", r"\1\n" + video_html + ("\n" + audio_html if audio_html else ""), output, count=1)
