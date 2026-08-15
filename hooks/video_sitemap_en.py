"""Generate the native-English 5sigmas video library and watch pages.

This hook intentionally lives beside the Spanish generator rather than changing
its rendering contract. English video declarations come from
``locales/en/media.yml`` and therefore never inherit Spanish binaries implicitly.
The generated surface includes the `/en/videos/` hub, one watch page per declared
English video, VideoObject/CollectionPage structured data, a video sitemap,
JSON catalogue, and Markdown mirrors.
"""

from __future__ import annotations

from collections import Counter
from datetime import date, datetime
from html import escape as html_escape
import json
import logging
import os
from pathlib import Path
import re
from typing import Any
from xml.sax.saxutils import escape as xml_escape

from mkdocs.structure.files import File, Files
import yaml


LOGGER = logging.getLogger("mkdocs.hooks.video_sitemap_en")
ROOT = Path(__file__).resolve().parents[1]
MEDIA_INDEX = ROOT / "locales" / "en" / "media.yml"
HUB_SRC_URI = "videos/index.md"
LOCALE_PREFIX = "en"

TOPICS = {
    "fundamentos-ia-iag": ("foundations", "Foundations"),
    "from-cave-to-agi": ("history", "History of AI"),
    "multimodalidad-iag": ("multimodality", "Multimodality"),
    "modelos-razonadores": ("reasoning", "Reasoning"),
    "ia-pib-bienestar-energia": ("impact", "Economics, energy and well-being"),
    "datacenters-espacio": ("infrastructure", "Infrastructure"),
    "seguridad-ia": ("security", "AI security"),
    "agentes-ia": ("agents", "AI agents"),
    "articulos-tecnicos": ("engineering", "Systems engineering"),
}
NOISY_HEADINGS = {
    "sources",
    "references",
    "bibliography",
    "notes",
    "conclusion",
    "conclusions",
    "summary",
    "table of contents",
    "what you will learn",
    "prerequisites",
    "prerequisite",
}

_video_entries: list[dict[str, Any]] = []
_watch_by_src: dict[str, dict[str, Any]] = {}
_generated_markdown: dict[str, str] = {}


def _load_media_index() -> dict[str, dict[str, Any]]:
    if not MEDIA_INDEX.is_file():
        raise RuntimeError(f"Missing English media index: {MEDIA_INDEX}")
    data = yaml.safe_load(MEDIA_INDEX.read_text(encoding="utf-8")) or {}
    if not isinstance(data, dict):
        raise RuntimeError(f"English media index must be a mapping: {MEDIA_INDEX}")
    return {str(key): value for key, value in data.items() if isinstance(value, dict)}


def on_config(config, **kwargs):
    _video_entries.clear()
    _watch_by_src.clear()
    _generated_markdown.clear()
    return config


def on_files(files: Files, config, **kwargs) -> Files:
    _video_entries.clear()
    _watch_by_src.clear()
    _generated_markdown.clear()

    media_index = _load_media_index()
    site_url = str(config.get("site_url") or "https://5sigmas.com/en/").rstrip("/")
    media_origin = os.environ.get("S5_VIDEO_MEDIA_ORIGIN", "").strip().rstrip("/")

    for source_file in list(files):
        if not source_file.is_documentation_page():
            continue
        src_uri = str(getattr(source_file, "src_uri", source_file.src_path))
        if src_uri.startswith("videos/"):
            continue
        declared = media_index.get(src_uri)
        if not declared:
            continue

        inclusion = getattr(source_file, "inclusion", None)
        try:
            if inclusion is not None and not inclusion.is_included():
                continue
        except AttributeError:
            pass

        try:
            source_text = source_file.content_string
        except (OSError, UnicodeDecodeError):
            continue
        meta, body = _split_frontmatter(source_text)
        merged_meta = dict(meta)
        merged_meta.update(declared)

        video_file = str(merged_meta.get("video") or "").strip()
        if not video_file:
            continue
        poster_file = str(
            merged_meta.get("video_poster") or Path(video_file).with_suffix(".jpg").name
        ).strip()

        abs_source = getattr(source_file, "abs_src_path", None)
        if not abs_source:
            continue
        source_dir = Path(abs_source).parent
        if not _is_url(video_file) and not (source_dir / video_file).is_file():
            # TTC is deployed from the reviewed binary cache after the English
            # MkDocs build. The generated route is still truthful because the
            # production deploy stages the exact reviewed binary before upload.
            if src_uri != "series/modelos-razonadores/03-test-time-compute.md":
                raise RuntimeError(f"English media declaration has no video binary: {src_uri} -> {video_file}")
            LOGGER.info("Deferred reviewed English TTC binary: %s", video_file)
        if not _is_url(poster_file) and not (source_dir / poster_file).is_file():
            if src_uri != "series/modelos-razonadores/03-test-time-compute.md":
                raise RuntimeError(f"English media declaration has no poster binary: {src_uri} -> {poster_file}")
            LOGGER.info("Deferred reviewed English TTC poster: %s", poster_file)

        entry = _build_entry(
            src_uri=src_uri,
            source_dir=source_dir,
            body=body,
            meta=merged_meta,
            site_url=site_url,
            media_origin=media_origin,
            video_file=video_file,
            poster_file=poster_file,
        )
        _video_entries.append(entry)

    _video_entries.sort(
        key=lambda item: (item["publication_date"], item["source_src_uri"]),
        reverse=True,
    )

    hub_markdown = _render_hub(_video_entries, site_url)
    _append_generated_file(files, config, HUB_SRC_URI, hub_markdown, "hooks/video_sitemap_en.py")
    _generated_markdown[HUB_SRC_URI] = hub_markdown

    for entry in _video_entries:
        markdown = _render_watch_page(entry, _related_entries(entry, _video_entries), site_url)
        _append_generated_file(files, config, entry["watch_src_uri"], markdown, entry["source_src_uri"])
        _watch_by_src[entry["watch_src_uri"]] = entry
        _generated_markdown[entry["watch_src_uri"]] = markdown

    return files


def on_post_page(output: str, page, config, **kwargs) -> str:
    src_uri = str(getattr(page.file, "src_uri", page.file.src_path))
    site_url = str(config.get("site_url") or "https://5sigmas.com/en/").rstrip("/")
    global_root = str((config.get("extra") or {}).get("global_site_root") or "https://5sigmas.com/").rstrip("/")

    if src_uri == HUB_SRC_URI:
        return _inject_jsonld(output, _hub_schema(_video_entries, site_url))

    entry = _watch_by_src.get(src_uri)
    if entry is None:
        return output

    output = re.sub(
        r'property="og:type"\s+content="[^"]*"',
        'property="og:type" content="video.other"',
        output,
        count=1,
    )
    video_meta = "\n".join(
        item
        for item in [
            f'<meta property="og:video" content="{html_escape(entry["video_url"], quote=True)}">',
            f'<meta property="og:video:secure_url" content="{html_escape(entry["video_url"], quote=True)}">',
            '<meta property="og:video:type" content="video/mp4">',
            f'<meta property="og:video:duration" content="{entry["duration_seconds"]}">' if entry["duration_seconds"] else "",
        ]
        if item
    )
    if video_meta:
        output = output.replace("</head>", f"  {video_meta}\n</head>", 1)
    return _inject_jsonld(output, _video_schema(entry, site_url, global_root))


def on_post_build(config, **kwargs) -> None:
    site_dir = Path(config["site_dir"])
    _write_video_sitemap(site_dir, _video_entries)
    _write_catalogue(site_dir, _video_entries)
    _write_markdown_mirrors(site_dir, _generated_markdown)


def _append_generated_file(files: Files, config, src_uri: str, content: str, edit_uri: str) -> None:
    generated = File.generated(config, src_uri, content=content)
    generated.edit_uri = edit_uri
    files.append(generated)


def _split_frontmatter(text: str) -> tuple[dict[str, Any], str]:
    match = re.match(r"\A---\s*\n(.*?)\n---\s*(?:\n|$)", text, re.DOTALL)
    if not match:
        return {}, text
    try:
        meta = yaml.safe_load(match.group(1)) or {}
    except yaml.YAMLError:
        return {}, text
    return (meta if isinstance(meta, dict) else {}), text[match.end():]


def _build_entry(
    *,
    src_uri: str,
    source_dir: Path,
    body: str,
    meta: dict[str, Any],
    site_url: str,
    media_origin: str,
    video_file: str,
    poster_file: str,
) -> dict[str, Any]:
    source_path = Path(src_uri)
    source_parent = source_path.parent
    video_stem = Path(video_file).stem
    watch_src_uri = (Path("videos") / source_parent / f"{video_stem}.md").as_posix()
    watch_url = f"{site_url}/{Path(watch_src_uri).with_suffix('').as_posix().strip('/')}/"
    source_url = _public_url(site_url, src_uri)
    topic_key, topic_label = _topic_for(src_uri)
    title = _plain_text(meta.get("video_title") or meta.get("title") or video_stem)
    description = _plain_text(
        meta.get("video_summary")
        or meta.get("description")
        or f"A short video explanation of {title}."
    )
    publication_date = _normalize_date(meta.get("date"))
    duration_iso = str(meta.get("video_duration") or "").strip()
    duration_seconds = _duration_to_seconds(duration_iso)
    captions_file = str(meta.get("video_captions") or "").strip()

    return {
        "id": re.sub(r"[^a-z0-9]+", "-", watch_src_uri.lower()).strip("-"),
        "source_src_uri": src_uri,
        "source_url": source_url,
        "watch_src_uri": watch_src_uri,
        "watch_url": watch_url,
        "video_url": _asset_url(site_url, media_origin, source_parent, video_file),
        "video_playback_url": _playback_asset_url(media_origin, source_parent, video_file),
        "thumb_url": _asset_url(site_url, media_origin, source_parent, poster_file),
        "thumb_playback_url": _playback_asset_url(media_origin, source_parent, poster_file),
        "captions_url": _asset_url(site_url, media_origin, source_parent, captions_file) if captions_file else "",
        "captions_playback_url": _playback_asset_url(media_origin, source_parent, captions_file) if captions_file else "",
        "title": title,
        "description": description,
        "publication_date": publication_date,
        "duration_iso": duration_iso,
        "duration_seconds": duration_seconds,
        "duration_label": _duration_label(duration_seconds),
        "topic": topic_key,
        "topic_label": topic_label,
        "collection": _collection_label(src_uri),
        "snippets": _extract_snippets(body, meta),
        "chapters": _normalize_chapters(meta.get("video_chapters"), duration_seconds),
        "transcript": _load_optional_text(source_dir, str(meta.get("video_transcript") or "")),
        "keywords": _keywords(meta),
    }


def _topic_for(src_uri: str) -> tuple[str, str]:
    parts = Path(src_uri).parts
    if len(parts) >= 2 and parts[0] == "series":
        return TOPICS.get(parts[1], ("other", "Other topics"))
    if parts:
        return TOPICS.get(parts[0], ("other", "Other topics"))
    return "other", "Other topics"


def _collection_label(src_uri: str) -> str:
    parts = Path(src_uri).parts
    if len(parts) >= 2 and parts[0] == "series":
        return TOPICS.get(parts[1], ("", parts[1].replace("-", " ").title()))[1]
    if parts and parts[0] == "articulos-tecnicos":
        return "Systems engineering"
    return "5sigmas"


def _public_url(site_url: str, src_uri: str) -> str:
    path = Path(src_uri)
    rel = path.parent.as_posix().strip("/") if path.name == "index.md" else path.with_suffix("").as_posix().strip("/")
    return f"{site_url}/{rel}/" if rel else f"{site_url}/"


def _asset_url(site_url: str, media_origin: str, source_parent: Path, filename: str) -> str:
    if _is_url(filename):
        return filename
    relative = (source_parent / filename).as_posix().lstrip("/")
    if media_origin:
        return f"{media_origin}/{LOCALE_PREFIX}/{relative}"
    return f"{site_url}/{relative}"


def _playback_asset_url(media_origin: str, source_parent: Path, filename: str) -> str:
    if _is_url(filename):
        return filename
    relative = (source_parent / filename).as_posix().lstrip("/")
    if media_origin:
        return f"{media_origin}/{LOCALE_PREFIX}/{relative}"
    return f"/{LOCALE_PREFIX}/{relative}"


def _is_url(value: str) -> bool:
    return bool(re.match(r"^https?://", str(value), re.IGNORECASE))


def _plain_text(value: Any) -> str:
    text = str(value or "")
    text = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"[`*_~]", "", text)
    return " ".join(text.split()).strip()


def _keywords(meta: dict[str, Any]) -> list[str]:
    raw = meta.get("keywords") or meta.get("tags") or []
    if isinstance(raw, str):
        raw = [item.strip() for item in raw.split(",")]
    if not isinstance(raw, list):
        return []
    return [_plain_text(item) for item in raw if _plain_text(item)]


def _extract_snippets(body: str, meta: dict[str, Any]) -> list[dict[str, str]]:
    curated = meta.get("video_takeaways")
    if isinstance(curated, list):
        snippets = [{"title": _plain_text(item), "excerpt": ""} for item in curated if _plain_text(item)]
        if snippets:
            return snippets[:3]

    body = re.sub(r"```.*?```", "", body, flags=re.DOTALL)
    lines = body.splitlines()
    snippets: list[dict[str, str]] = []
    seen: set[str] = set()
    for index, line in enumerate(lines):
        match = re.match(r"^\s*#{2,3}\s+(.+?)\s*#*\s*$", line)
        if not match:
            continue
        title = _plain_text(match.group(1))
        normalized = title.casefold()
        if not title or normalized in NOISY_HEADINGS or normalized in seen:
            continue
        paragraph: list[str] = []
        for candidate in lines[index + 1:]:
            if re.match(r"^\s*#{1,6}\s+", candidate):
                break
            stripped = candidate.strip()
            if not stripped:
                if paragraph:
                    break
                continue
            if stripped.startswith(("<!--", "<div", "</div", "{{", "!!!", "???", "|")):
                continue
            if stripped.startswith(("- ", "* ", "+ ", "> ")):
                stripped = stripped[2:].strip()
            plain = _plain_text(stripped)
            if plain:
                paragraph.append(plain)
            if len(" ".join(paragraph)) >= 180:
                break
        snippets.append({"title": title, "excerpt": _truncate(" ".join(paragraph), 190)})
        seen.add(normalized)
        if len(snippets) == 3:
            break
    if snippets:
        return snippets
    description = _plain_text(meta.get("description") or "")
    return [{"title": "Summary", "excerpt": _truncate(description, 190)}]


def _truncate(value: str, limit: int) -> str:
    value = " ".join(value.split())
    if len(value) <= limit:
        return value
    shortened = value[: limit - 1].rsplit(" ", 1)[0]
    return f"{shortened}…"


def _normalize_date(value: Any) -> str:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return f"{value.isoformat()}T00:00:00+00:00"
    text = str(value or "").strip()
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", text):
        return f"{text}T00:00:00+00:00"
    return text


def _duration_to_seconds(value: str) -> int:
    match = re.fullmatch(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", value or "")
    if not match:
        return 0
    return int(match.group(1) or 0) * 3600 + int(match.group(2) or 0) * 60 + int(match.group(3) or 0)


def _clock_label(seconds: int) -> str:
    minutes, remaining = divmod(max(0, seconds), 60)
    if minutes >= 60:
        hours, minutes = divmod(minutes, 60)
        return f"{hours}:{minutes:02d}:{remaining:02d}"
    return f"{minutes}:{remaining:02d}"


def _duration_label(seconds: int) -> str:
    return _clock_label(seconds) if seconds else "Short video"


def _timestamp_to_seconds(value: Any) -> int | None:
    if isinstance(value, (int, float)) and value >= 0:
        return int(value)
    text = str(value or "").strip()
    if text.isdigit():
        return int(text)
    if re.fullmatch(r"\d{1,2}:\d{2}(?::\d{2})?", text):
        parts = [int(item) for item in text.split(":")]
        return parts[0] * 60 + parts[1] if len(parts) == 2 else parts[0] * 3600 + parts[1] * 60 + parts[2]
    return None


def _normalize_chapters(raw: Any, duration_seconds: int) -> list[dict[str, Any]]:
    if not isinstance(raw, list):
        return []
    chapters: list[dict[str, Any]] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        name = _plain_text(item.get("name") or item.get("title"))
        start = _timestamp_to_seconds(item.get("start"))
        end = _timestamp_to_seconds(item.get("end"))
        if not name or start is None or (duration_seconds and start >= duration_seconds):
            continue
        chapter: dict[str, Any] = {"name": name, "start": start}
        if end is not None and end > start:
            chapter["end"] = min(end, duration_seconds) if duration_seconds else end
        chapters.append(chapter)
    return sorted(chapters, key=lambda item: item["start"])


def _load_optional_text(source_dir: Path, value: str) -> str:
    value = value.strip()
    if not value or _is_url(value):
        return ""
    path = source_dir / value
    return path.read_text(encoding="utf-8") if path.is_file() else ""


def _yaml_frontmatter(meta: dict[str, Any]) -> str:
    return "---\n" + yaml.safe_dump(meta, allow_unicode=True, sort_keys=False, width=1000) + "---\n\n"


def _render_hub(entries: list[dict[str, Any]], site_url: str) -> str:
    counts = Counter(entry["topic"] for entry in entries)
    topic_labels = {entry["topic"]: entry["topic_label"] for entry in entries}
    filters = [f'<button type="button" data-s5-video-filter="all" aria-pressed="true">All <span>{len(entries)}</span></button>']
    for topic in sorted(topic_labels, key=lambda key: topic_labels[key]):
        filters.append(
            f'<button type="button" data-s5-video-filter="{html_escape(topic, quote=True)}" aria-pressed="false">'
            f'{html_escape(topic_labels[topic])} <span>{counts[topic]}</span></button>'
        )
    cards = "\n".join(_render_hub_card(entry) for entry in entries)
    meta = {
        "title": "Artificial intelligence videos",
        "seo_title": "Artificial intelligence video library",
        "description": "A library of short, technically rigorous 5sigmas videos about artificial intelligence, reasoning, multimodality, agents, energy and infrastructure.",
        "keywords": "artificial intelligence videos, AI videos, LLM, Transformer, reasoning models, multimodality, AI agents",
        "hide": ["toc"],
    }
    return _yaml_frontmatter(meta) + f"""
<div class="s5-video-library" data-s5-video-library>
  <section class="s5-video-library__intro">
    <div class="s5-eyebrow">Video library</div>
    <h1>One technical idea per video. Full evidence one click away.</h1>
    <p>Explore {len(entries)} native-English explanations published on 5sigmas. Every watch page connects the short explanation to its original chapter and related material.</p>
    <div class="s5-video-library__actions">
      <a class="s5-video-library__primary" href="{site_url}/visuales/">Open the visual experience</a>
      <a href="{site_url}/series/">Explore the series</a>
    </div>
  </section>

  <section class="s5-video-library__controls" aria-label="Filter the video library">
    <label><span>Search</span><input type="search" data-s5-video-search placeholder="Topic, concept or series" autocomplete="off"></label>
    <div class="s5-video-library__filters" role="toolbar" aria-label="Video topics">{''.join(filters)}</div>
    <p data-s5-video-status aria-live="polite">{len(entries)} videos available</p>
  </section>

  <section class="s5-video-library__grid" data-s5-video-grid>{cards}</section>
  <p class="s5-video-library__empty" data-s5-video-empty hidden>No videos match this search.</p>
</div>
"""


def _render_hub_card(entry: dict[str, Any]) -> str:
    search = " ".join([
        entry["title"], entry["description"], entry["topic_label"], entry["collection"],
        *entry["keywords"], *[snippet["title"] for snippet in entry["snippets"]],
    ])
    snippets = " · ".join(snippet["title"] for snippet in entry["snippets"][:2])
    return f"""
<article class="s5-video-card" data-s5-video-card data-topic="{html_escape(entry['topic'], quote=True)}" data-search="{html_escape(search, quote=True)}">
  <a class="s5-video-card__poster" href="{entry['watch_url']}" aria-label="Watch {html_escape(entry['title'], quote=True)}">
    <img src="{entry['thumb_url']}" alt="" loading="lazy" width="1280" height="720"><span>{html_escape(entry['duration_label'])}</span>
  </a>
  <div class="s5-video-card__body">
    <p class="s5-video-card__meta">{html_escape(entry['topic_label'])} · {html_escape(entry['duration_label'])}</p>
    <h2><a href="{entry['watch_url']}">{html_escape(entry['title'])}</a></h2>
    <p>{html_escape(entry['description'])}</p><small>{html_escape(snippets)}</small>
    <div class="s5-video-card__links"><a href="{entry['watch_url']}">Watch video</a><a href="{entry['source_url']}">Read article</a></div>
  </div>
</article>
"""


def _render_watch_page(entry: dict[str, Any], related: list[dict[str, Any]], site_url: str) -> str:
    meta = {
        "title": entry["title"],
        "seo_title": f"{entry['title']} — video",
        "description": entry["description"],
        "keywords": ", ".join(entry["keywords"]) if entry["keywords"] else entry["topic_label"],
        "date": entry["publication_date"],
        "robots": "index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1",
        "hide": ["toc", "navigation"],
        "video_watch_page": True,
    }
    track = ""
    if entry["captions_playback_url"]:
        track = f'<track kind="captions" src="{entry["captions_playback_url"]}" srclang="en" label="English" default>'
    snippet_cards = "\n".join(
        f'<article><span>{index:02d}</span><h2>{html_escape(snippet["title"])}</h2>'
        + (f'<p>{html_escape(snippet["excerpt"])}</p>' if snippet["excerpt"] else "")
        + '</article>'
        for index, snippet in enumerate(entry["snippets"], start=1)
    )
    chapters = ""
    if entry["chapters"]:
        chapter_links = "\n".join(
            f'<li><a href="?t={chapter["start"]}" data-s5-video-seek="{chapter["start"]}"><time>{html_escape(_clock_label(chapter["start"]))}</time><span>{html_escape(chapter["name"])}</span></a></li>'
            for chapter in entry["chapters"]
        )
        chapters = f'<section class="s5-video-watch__chapters" aria-labelledby="video-chapters-title"><div><span class="s5-eyebrow">Key moments</span><h2 id="video-chapters-title">Jump directly to a section</h2></div><ol>{chapter_links}</ol></section>'
    transcript = ""
    if entry["transcript"]:
        transcript = f'<details class="s5-video-watch__transcript"><summary>Read the reviewed transcript</summary>\n\n{entry["transcript"]}\n\n</details>'
    related_cards = "\n".join(_render_related_card(item) for item in related)
    return _yaml_frontmatter(meta) + f"""
<div class="s5-video-watch" data-s5-video-watch data-video-id="{html_escape(entry['id'], quote=True)}">
  <header class="s5-video-watch__header">
    <div class="s5-video-watch__crumbs"><a href="{site_url}/videos/">All videos</a><span>{html_escape(entry['topic_label'])}</span><span>{html_escape(entry['duration_label'])}</span></div>
    <h1>{html_escape(entry['title'])}</h1><p>{html_escape(entry['description'])}</p>
  </header>
  <div class="s5-video-watch__player">
    <video controls crossorigin="anonymous" preload="metadata" poster="{entry['thumb_playback_url']}" playsinline data-s5-watch-player><source src="{entry['video_playback_url']}" type="video/mp4">{track}Your browser does not support the video element.</video>
    <p>Links containing <code>?t=</code> open the video at a specific second.</p>
  </div>
  <section class="s5-video-watch__summary" aria-labelledby="video-summary-title">
    <div class="s5-video-watch__section-head"><span class="s5-eyebrow">Video summary</span><h2 id="video-summary-title">The ideas to retain</h2></div>
    <div class="s5-video-watch__snippet-grid">{snippet_cards}</div>
  </section>
  {chapters}
  {transcript}
  <aside class="s5-video-watch__source"><div><span class="s5-eyebrow">Context and evidence</span><h2>Continue with the full article</h2><p>The chapter develops the mechanism, primary sources, limitations and connections to the rest of the series.</p></div><a class="s5-video-watch__source-link" href="{entry['source_url']}">Read the article →</a></aside>
  <section class="s5-video-watch__related" aria-labelledby="related-videos-title"><div class="s5-video-watch__section-head"><span class="s5-eyebrow">Next step</span><h2 id="related-videos-title">Related videos</h2></div><div class="s5-video-watch__related-grid">{related_cards}</div></section>
</div>
"""


def _render_related_card(entry: dict[str, Any]) -> str:
    return f'<article><a href="{entry["watch_url"]}"><img src="{entry["thumb_url"]}" alt="" loading="lazy" width="1280" height="720"><span>{html_escape(entry["topic_label"])} · {html_escape(entry["duration_label"])}</span><strong>{html_escape(entry["title"])}</strong></a></article>'


def _related_entries(current: dict[str, Any], entries: list[dict[str, Any]], limit: int = 3) -> list[dict[str, Any]]:
    same_topic = [entry for entry in entries if entry["watch_url"] != current["watch_url"] and entry["topic"] == current["topic"]]
    others = [entry for entry in entries if entry["watch_url"] != current["watch_url"] and entry["topic"] != current["topic"]]
    return (same_topic + others)[:limit]


def _inject_jsonld(output: str, schema: dict[str, Any]) -> str:
    payload = json.dumps(schema, ensure_ascii=False, separators=(",", ":"))
    return output.replace("</head>", f'  <script type="application/ld+json">{payload}</script>\n</head>', 1)


def _hub_schema(entries: list[dict[str, Any]], site_url: str) -> dict[str, Any]:
    hub_url = f"{site_url}/videos/"
    return {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "@id": f"{hub_url}#collection",
        "name": "Artificial intelligence videos",
        "description": "Native-English video explanations from 5sigmas about artificial intelligence.",
        "url": hub_url,
        "inLanguage": "en",
        "isPartOf": {"@id": f"{site_url}/#website"},
        "mainEntity": {
            "@type": "ItemList",
            "numberOfItems": len(entries),
            "itemListElement": [
                {"@type": "ListItem", "position": index, "name": entry["title"], "url": entry["watch_url"]}
                for index, entry in enumerate(entries, start=1)
            ],
        },
    }


def _video_schema(entry: dict[str, Any], site_url: str, global_root: str) -> dict[str, Any]:
    schema: dict[str, Any] = {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        "@id": f"{entry['watch_url']}#video",
        "name": entry["title"],
        "description": entry["description"],
        "thumbnailUrl": [entry["thumb_url"]],
        "contentUrl": entry["video_url"],
        "uploadDate": entry["publication_date"],
        "inLanguage": "en",
        "mainEntityOfPage": {"@id": entry["watch_url"]},
        "isBasedOn": {"@type": "CreativeWork", "@id": entry["source_url"]},
        "isPartOf": {"@id": f"{site_url}/#website"},
        "author": {"@type": "Person", "@id": f"{global_root}/#francisco-maldonado", "name": "Francisco Maldonado", "url": f"{site_url}/meta/about/"},
        "publisher": {"@type": "Organization", "@id": f"{global_root}/#organization", "name": "5sigmas", "url": f"{global_root}/"},
    }
    if entry["duration_iso"]:
        schema["duration"] = entry["duration_iso"]
    if entry["chapters"]:
        clips = []
        for chapter in entry["chapters"]:
            clip = {"@type": "Clip", "name": chapter["name"], "startOffset": chapter["start"], "url": f"{entry['watch_url']}?t={chapter['start']}"}
            if chapter.get("end") is not None:
                clip["endOffset"] = chapter["end"]
            clips.append(clip)
        schema["hasPart"] = clips
    else:
        schema["potentialAction"] = {
            "@type": "SeekToAction",
            "target": f"{entry['watch_url']}?t={{seek_to_second_number}}",
            "startOffset-input": "required name=seek_to_second_number",
        }
    return schema


def _write_video_sitemap(site_dir: Path, entries: list[dict[str, Any]]) -> None:
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
        '        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">',
    ]
    for entry in entries:
        optional: list[str] = []
        if entry["duration_seconds"]:
            optional.append(f"      <video:duration>{entry['duration_seconds']}</video:duration>")
        if entry["publication_date"]:
            optional.append(f"      <video:publication_date>{xml_escape(entry['publication_date'])}</video:publication_date>")
        lines.extend([
            "  <url>", f"    <loc>{xml_escape(entry['watch_url'])}</loc>", "    <video:video>",
            f"      <video:thumbnail_loc>{xml_escape(entry['thumb_url'])}</video:thumbnail_loc>",
            f"      <video:title>{xml_escape(entry['title'])}</video:title>",
            f"      <video:description>{xml_escape(entry['description'])}</video:description>",
            f"      <video:content_loc>{xml_escape(entry['video_url'])}</video:content_loc>",
            *optional, "    </video:video>", "  </url>",
        ])
    lines.append("</urlset>")
    (site_dir / "video-sitemap.xml").write_text("\n".join(lines) + "\n", encoding="utf-8")


def _write_catalogue(site_dir: Path, entries: list[dict[str, Any]]) -> None:
    payload = {
        "version": 1,
        "language": "en",
        "count": len(entries),
        "videos": [
            {key: entry[key] for key in (
                "id", "title", "description", "topic", "topic_label", "source_url", "watch_url",
                "video_url", "thumb_url", "captions_url", "publication_date", "duration_iso",
                "duration_seconds", "snippets", "chapters",
            )}
            for entry in entries
        ],
    }
    out = site_dir / "videos" / "catalog.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _write_markdown_mirrors(site_dir: Path, generated_markdown: dict[str, str]) -> None:
    for src_uri, content in generated_markdown.items():
        source = Path(src_uri)
        html_peer = site_dir / source.parent / "index.html" if source.name == "index.md" else site_dir / source.with_suffix("") / "index.html"
        if not html_peer.is_file():
            LOGGER.warning("Generated English video page was not built: %s", src_uri)
            continue
        target = Path(f"{html_peer}.md")
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
