"""Bind reviewed video discovery sources to the built public surface.

This post-build adapter is deliberately independent of the media renderer. It consumes
versioned ``discovery/**/*.json`` records that have already been byte-bound to exact
MP4s, validates the staged MP4 again, then makes the same source drive the VTT,
visible transcript, chapter links, VideoObject/Clip data and catalogue key moments.

Malformed or stale discovery evidence is a hard build failure. Missing discovery
records do not change legacy videos; coverage is tracked separately while migration
is in progress.
"""
from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import re
import sys
from typing import Any
from urllib.parse import urlsplit
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
HOOKS_DIR = Path(__file__).resolve().parent
if str(HOOKS_DIR) not in sys.path:
    sys.path.insert(0, str(HOOKS_DIR))
from video_publication_policy import is_video_source_published

DISCOVERY_ROOT = ROOT / "discovery"
SITE_ORIGIN = "https://5sigmas.com"
SITEMAP_NS = "http://www.sitemaps.org/schemas/sitemap/0.9"
VIDEO_NS = "http://www.google.com/schemas/sitemap-video/1.1"


def _load_contract_module():
    path = ROOT / "scripts" / "video_discovery_contract.py"
    spec = importlib.util.spec_from_file_location("s5_video_discovery_contract", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


CONTRACT = _load_contract_module()


def _number(value: Any, field: str) -> int | float:
    if isinstance(value, bool) or not isinstance(value, (int, float)) or value < 0:
        raise RuntimeError(f"Invalid video chapter {field}: {value!r}")
    number = float(value)
    return int(number) if number.is_integer() else number


def validated_clips(chapters: Any, watch_url: str) -> list[dict[str, Any]]:
    """Normalize already-generated catalogue chapters without silently repairing them."""
    if not isinstance(chapters, list) or not chapters:
        return []
    clips: list[dict[str, Any]] = []
    previous_start: int | float | None = None
    previous_end: int | float | None = None
    for index, chapter in enumerate(chapters):
        if not isinstance(chapter, dict):
            raise RuntimeError(f"Invalid video chapter object at index {index}: {watch_url}")
        name = str(chapter.get("name") or "").strip()
        if not name:
            raise RuntimeError(f"Missing video chapter name at index {index}: {watch_url}")
        start = _number(chapter.get("start"), "start")
        if previous_start is not None and start <= previous_start:
            raise RuntimeError(f"Unordered/duplicate video chapter start: {watch_url}")
        if previous_end is not None and start < previous_end:
            raise RuntimeError(f"Overlapping video chapters: {watch_url}")
        clip: dict[str, Any] = {"name": name, "start": start, "url": f"{watch_url}?t={start}"}
        if "end" in chapter and chapter.get("end") is not None:
            end = _number(chapter.get("end"), "end")
            if end <= start:
                raise RuntimeError(f"Video chapter end <= start: {watch_url}")
            clip["end"] = end
            previous_end = end
        else:
            previous_end = None
        previous_start = start
        clips.append(clip)
    return clips


def _locale(config: Any) -> str:
    extra = config.get("extra") or {}
    locale = str(extra.get("content_language") or "es").strip().lower()
    return "en" if locale.startswith("en") else "es"


def _relative_path(url: str, locale: str) -> str:
    parsed = urlsplit(url)
    if parsed.scheme != "https" or parsed.netloc != "5sigmas.com":
        raise CONTRACT.ContractError(f"discovery URL must use {SITE_ORIGIN}: {url}")
    path = parsed.path.lstrip("/")
    if locale == "en":
        if not path.startswith("en/"):
            raise CONTRACT.ContractError(f"English discovery URL escaped /en/: {url}")
        path = path[3:]
    elif path.startswith("en/"):
        raise CONTRACT.ContractError(f"Spanish discovery URL leaked /en/: {url}")
    return path


def _built_path(site_dir: Path, url: str, locale: str, *, index: bool = False) -> Path:
    relative = _relative_path(url, locale)
    target = site_dir / relative
    return target / "index.html" if index else target


def _source_files(locale: str) -> list[tuple[Path, dict[str, Any]]]:
    rows: list[tuple[Path, dict[str, Any]]] = []
    if not DISCOVERY_ROOT.is_dir():
        return rows
    for path in sorted(DISCOVERY_ROOT.rglob("*.json")):
        try:
            source = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise CONTRACT.ContractError(f"invalid discovery JSON: {path}") from exc
        if source.get("locale") != locale:
            continue
        article_path = urlsplit(str(source.get("article_url") or "")).path.lstrip("/")
        if article_path.startswith("en/"):
            article_path = article_path[3:]
        if not is_video_source_published(article_path):
            continue
        CONTRACT.validate_source(source)
        rows.append((path, source))
    return rows


def _replace_video_schema(html: str, source: dict[str, Any], compiled: dict[str, Any]) -> str:
    pattern = re.compile(r'<script\s+type=["\']application/ld\+json["\']>(.*?)</script>', re.DOTALL | re.IGNORECASE)
    found = False

    def replace(match: re.Match[str]) -> str:
        nonlocal found
        raw = match.group(1)
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            return match.group(0)
        if not isinstance(data, dict) or data.get("@type") != "VideoObject":
            return match.group(0)
        candidate_id = str(data.get("@id") or "")
        if candidate_id and not candidate_id.startswith(source["watch_url"]):
            return match.group(0)
        merged = dict(data)
        merged.update(compiled["schema"])
        merged.pop("potentialAction", None)
        found = True
        payload = json.dumps(merged, ensure_ascii=False, separators=(",", ":"))
        return f'<script type="application/ld+json">{payload}</script>'

    result = pattern.sub(replace, html)
    if not found:
        raise CONTRACT.ContractError(f"VideoObject missing from {source['watch_url']}")
    return result


def _drop_legacy_discovery_blocks(html: str) -> str:
    patterns = (
        r'\s*<section class="s5-video-watch__chapters".*?</section>\s*',
        r'\s*<details class="s5-video-watch__transcript".*?</details>\s*',
        r'\s*<nav[^>]*data-discovery-source-sha256=.*?</nav>\s*',
        r'\s*<section id="video-transcript"[^>]*data-discovery-source-sha256=.*?</section>\s*',
    )
    for pattern in patterns:
        html = re.sub(pattern, "\n", html, flags=re.DOTALL | re.IGNORECASE)
    return html


def _inject_track(html: str, source: dict[str, Any], compiled: dict[str, Any], *, article: bool) -> str:
    video_path = urlsplit(source["video_url"]).path
    if video_path not in html and Path(video_path).name not in html:
        raise CONTRACT.ContractError(f"exact video path not referenced by HTML: {source['video_url']}")
    vtt_path = urlsplit(source["vtt_url"]).path
    if vtt_path in html:
        return html
    locale = source["locale"]
    track = (
        f'<track kind="captions" src="{vtt_path}" srclang="{locale}" '
        f'label="{compiled["track_label"]}" default data-s5-visual-text-track>'
    )
    marker = re.compile(r'(<source\b[^>]*type=["\']video/mp4["\'][^>]*>)', re.IGNORECASE)
    if article:
        embed_start = html.find('class="s5-video-embed"')
        if embed_start < 0:
            raise CONTRACT.ContractError(f"article video embed missing: {source['article_url']}")
        match = marker.search(html, embed_start)
    else:
        watch_start = html.find('class="s5-video-watch__player"')
        if watch_start < 0:
            raise CONTRACT.ContractError(f"watch player missing: {source['watch_url']}")
        match = marker.search(html, watch_start)
    if match is None:
        raise CONTRACT.ContractError("MP4 source element missing while binding VTT")
    return html[: match.end()] + "\n      " + track + html[match.end() :]


def _patch_watch_html(path: Path, source: dict[str, Any], compiled: dict[str, Any]) -> None:
    if not path.is_file():
        raise CONTRACT.ContractError(f"built watch page missing: {path}")
    html = path.read_text(encoding="utf-8")
    lower = html.lower()
    if "noindex" in lower:
        raise CONTRACT.ContractError(f"watch page is noindex: {source['watch_url']}")
    if source["watch_url"] not in html:
        raise CONTRACT.ContractError(f"watch canonical missing: {source['watch_url']}")
    html = _drop_legacy_discovery_blocks(html)
    html = _inject_track(html, source, compiled, article=False)
    insertion = "\n" + compiled["chapters_html"] + "\n" + compiled["transcript_html"] + "\n"
    marker = '<aside class="s5-video-watch__source">'
    if marker not in html:
        raise CONTRACT.ContractError(f"watch article link block missing: {source['watch_url']}")
    html = html.replace(marker, insertion + marker, 1)
    html = _replace_video_schema(html, source, compiled)
    path.write_text(html, encoding="utf-8")


def _patch_article_html(path: Path, source: dict[str, Any], compiled: dict[str, Any]) -> None:
    if not path.is_file():
        raise CONTRACT.ContractError(f"built article page missing: {path}")
    html = path.read_text(encoding="utf-8")
    if source["watch_url"] not in html:
        raise CONTRACT.ContractError(f"article does not link back to watch page: {source['article_url']}")
    html = _inject_track(html, source, compiled, article=True)
    path.write_text(html, encoding="utf-8")


def _write_vtt(site_dir: Path, source: dict[str, Any], compiled: dict[str, Any], locale: str) -> None:
    target = _built_path(site_dir, source["vtt_url"], locale)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(compiled["vtt"] + "\n", encoding="utf-8")


def _require_equal(actual: Any, expected: Any, *, surface: str, field: str, source_id: str) -> None:
    if actual != expected:
        raise CONTRACT.ContractError(f"{surface} immutable binding divergence for {source_id}: {field}")


def _bind_catalogue(site_dir: Path, source: dict[str, Any], compiled: dict[str, Any]) -> None:
    """Bind mutable discovery metadata while failing closed on media identity."""
    path = site_dir / "videos" / "catalog.json"
    if not path.is_file():
        raise CONTRACT.ContractError(f"video catalogue missing: {path}")
    payload = json.loads(path.read_text(encoding="utf-8"))
    videos = payload.get("videos")
    if not isinstance(videos, list):
        raise CONTRACT.ContractError("video catalogue videos must be a list")
    matches = [row for row in videos if isinstance(row, dict) and row.get("watch_url") == source["watch_url"]]
    if len(matches) != 1:
        raise CONTRACT.ContractError(f"catalogue watch binding count != 1: {source['watch_url']}")
    row = matches[0]
    immutable = {
        "video_url": source["video_url"],
        "thumb_url": source["poster_url"],
        "duration_seconds": source["duration_ms"] // 1000,
    }
    for key, value in immutable.items():
        _require_equal(row.get(key), value, surface="catalogue", field=key, source_id=source["id"])

    # The versioned discovery source is authoritative for mutable public metadata.
    # Legacy article/catalogue copy is allowed to differ before this binding step,
    # but the resulting catalogue, schema, transcript and sitemap must converge.
    row["title"] = source["title"]
    row["description"] = source["description"]
    row["captions_url"] = source["vtt_url"]
    row["chapters"] = compiled["chapters"]
    row["discovery_source_sha256"] = compiled["source_sha256"]
    row["video_sha256"] = source["video_sha256"]
    payload["version"] = max(3, int(payload.get("version") or 1))
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _bind_video_sitemap(site_dir: Path, source: dict[str, Any], locale: str) -> None:
    """Bind mutable discovery metadata while preserving exact sitemap media identity."""
    path = site_dir / "video-sitemap.xml"
    if not path.is_file():
        raise CONTRACT.ContractError(f"video sitemap missing for {locale}")
    root = ET.fromstring(path.read_text(encoding="utf-8"))
    ns = {"s": SITEMAP_NS, "v": VIDEO_NS}
    matches = []
    for node in root.findall("s:url", ns):
        if (node.findtext("s:loc", default="", namespaces=ns) or "").strip() == source["watch_url"]:
            matches.append(node)
    if len(matches) != 1:
        raise CONTRACT.ContractError(f"video sitemap watch binding count != 1: {source['watch_url']}")
    video = matches[0].find("v:video", ns)
    if video is None:
        raise CONTRACT.ContractError("video sitemap video node missing")

    immutable = {
        "v:thumbnail_loc": source["poster_url"],
        "v:content_loc": source["video_url"],
        "v:duration": str(source["duration_ms"] // 1000),
    }
    for selector, expected in immutable.items():
        value = (video.findtext(selector, default="", namespaces=ns) or "").strip()
        _require_equal(value, expected, surface="video sitemap", field=selector, source_id=source["id"])

    for selector, value in (("v:title", source["title"]), ("v:description", source["description"])):
        element = video.find(selector, ns)
        if element is None:
            raise CONTRACT.ContractError(f"video sitemap field missing for {source['id']}: {selector}")
        element.text = value

    ET.register_namespace("", SITEMAP_NS)
    ET.register_namespace("video", VIDEO_NS)
    serialized = ET.tostring(root, encoding="unicode")
    path.write_text('<?xml version="1.0" encoding="UTF-8"?>\n' + serialized + "\n", encoding="utf-8")


def _audit_normal_sitemap(site_dir: Path, source: dict[str, Any], locale: str) -> None:
    candidates = [site_dir / "sitemap.xml"]
    if locale == "en":
        candidates.extend([site_dir.parent / "sitemap-en.xml", site_dir.parent / "sitemap.xml"])
    path = next((candidate for candidate in candidates if candidate.is_file()), None)
    if path is None:
        raise CONTRACT.ContractError(f"normal sitemap missing for {locale}")
    text = path.read_text(encoding="utf-8")
    if source["watch_url"] not in text:
        raise CONTRACT.ContractError(f"watch page missing from normal sitemap: {source['watch_url']}")


def apply_discovery_surface(config: Any) -> dict[str, Any]:
    """Apply all versioned discovery sources for the locale, failing closed."""
    locale = _locale(config)
    site_dir = Path(config["site_dir"])
    sources = _source_files(locale)
    result: dict[str, Any] = {"locale": locale, "sources": []}
    for source_path, source in sources:
        compiled = CONTRACT.compile_source(source)
        video_path = _built_path(site_dir, source["video_url"], locale)
        media = CONTRACT.inspect_asset(source, video_path)
        watch_html = _built_path(site_dir, source["watch_url"], locale, index=True)
        article_html = _built_path(site_dir, source["article_url"], locale, index=True)
        _write_vtt(site_dir, source, compiled, locale)
        _patch_watch_html(watch_html, source, compiled)
        _patch_article_html(article_html, source, compiled)
        _bind_catalogue(site_dir, source, compiled)
        _bind_video_sitemap(site_dir, source, locale)
        _audit_normal_sitemap(site_dir, source, locale)
        result["sources"].append({
            "path": str(source_path.relative_to(ROOT)),
            "id": source["id"],
            "source_sha256": compiled["source_sha256"],
            "video_sha256": media["sha256"],
            "chapters": len(source["chapters"]),
            "cues": sum(len(chapter["cues"]) for chapter in source["chapters"]),
        })
    return result
