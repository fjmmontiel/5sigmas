"""
hooks/video_embed.py — MkDocs hook

Injects a <video> embed and VideoObject JSON-LD on pages that declare:

    video: "01-representar.mp4"

in their frontmatter. Both the .mp4 and the poster (.jpg, same base name)
must live alongside the .md file — they'll be copied to the site by MkDocs.

Optional frontmatter fields:
    video_duration: "PT4M20S"   ISO 8601, used in VideoObject (omitted if missing)

The video title and description are taken from the page's own title/description.
"""

from functools import lru_cache
from pathlib import Path
import re

import yaml

# ── URL helpers ───────────────────────────────────────────────────────────────

def _parent_url(canonical: str) -> str:
    """Return the parent directory URL of the canonical page URL.

    MkDocs pages render as /slug/index.html (use_directory_urls=True), so:
      https://5sigmas.com/series/from-cave-to-agi/01-representar/
      → https://5sigmas.com/series/from-cave-to-agi/
    """
    url = canonical.rstrip("/")
    return url.rsplit("/", 1)[0] + "/"


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


# ── Hook ──────────────────────────────────────────────────────────────────────

def on_post_page(output: str, page, config, **kwargs) -> str:
    meta = page.meta or {}
    video_file = meta.get("video")
    if not video_file:
        return output
    is_noindex = "noindex" in str(meta.get("robots", "")).lower()

    # Derive poster filename from mp4 basename
    base        = video_file.rsplit(".", 1)[0]   # "01-representar"
    poster_file = base + ".jpg"

    # Relative paths used inside <video> — one level up from the slug/ directory
    rel_video  = f"../{video_file}"
    rel_poster = f"../{poster_file}"

    # Absolute paths for VideoObject (Google requires absolute contentUrl)
    canonical  = page.canonical_url or ""
    parent     = _parent_url(canonical) if canonical else ""
    abs_video  = parent + video_file  if parent else ""
    abs_poster = parent + poster_file if parent else ""

    # Metadata from page frontmatter / config
    title       = _esc(meta.get("video_title") or page.title or "")
    description = _esc(meta.get("description") or "")
    date        = str(meta.get("date") or "")
    # Normalize to ISO 8601 with timezone (Google requires it)
    import re as _re
    if date and _re.fullmatch(r"\d{4}-\d{2}-\d{2}", date):
        date = date + "T00:00:00+00:00"
    duration    = str(meta.get("video_duration") or "")
    site_url    = (config.site_url or "").rstrip("/")

    # ── VideoObject JSON-LD ───────────────────────────────────────────────────
    opt_fields = ""
    if date:
        opt_fields += f'\n    "uploadDate": "{date}",'
    if duration:
        opt_fields += f'\n    "duration": "{duration}",'

    jsonld = (
        '<script type="application/ld+json">\n'
        "{\n"
        '  "@context": "https://schema.org",\n'
        '  "@type": "VideoObject",\n'
        f'  "name": "{title}",\n'
        f'  "description": "{description}",\n'
        f'  "thumbnailUrl": "{abs_poster}",\n'
        f'  "contentUrl": "{abs_video}",'
        f"{opt_fields}\n"
        '  "inLanguage": "es",\n'
        '  "author": {\n'
        '    "@type": "Person",\n'
        '    "name": "Francisco Maldonado",\n'
        f'    "url": "{site_url}/meta/about/"\n'
        "  },\n"
        '  "publisher": {\n'
        '    "@type": "Organization",\n'
        '    "name": "5sigmas",\n'
        f'    "url": "{site_url}/"\n'
        "  }\n"
        "}\n"
        "</script>"
    )

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
        "</div>"
    )
    audio_html = _render_article_audio(page, video_dom_id)

    # Inject video after the first </h1> in the page
    output = re.sub(r"(</h1>)", r"\1\n" + video_html + ("\n" + audio_html if audio_html else ""), output, count=1)

    # noindex pages can show the video, but should not emit indexable video markup.
    if not is_noindex:
        output = output.replace("</head>", jsonld + "\n</head>", 1)

    return output
