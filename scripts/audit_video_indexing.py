#!/usr/bin/env python3
"""Audit the native 5sigmas video library after an MkDocs build."""

from __future__ import annotations

import fnmatch
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

import yaml


ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
SITE = ROOT / "site"
MKDOCS = ROOT / "mkdocs.yml"
SITE_ORIGIN = "https://5sigmas.com"
NS = {
    "sm": "http://www.sitemaps.org/schemas/sitemap/0.9",
    "video": "http://www.google.com/schemas/sitemap-video/1.1",
}


def read_frontmatter(path: Path) -> dict[str, Any]:
    text = path.read_text(encoding="utf-8")
    match = re.match(r"\A---\s*\n(.*?)\n---\s*(?:\n|$)", text, re.DOTALL)
    if not match:
        return {}
    data = yaml.safe_load(match.group(1)) or {}
    return data if isinstance(data, dict) else {}


def exclude_patterns() -> list[str]:
    patterns: list[str] = []
    collecting = False
    for line in MKDOCS.read_text(encoding="utf-8").splitlines():
        if not collecting:
            collecting = line.startswith("exclude_docs: |")
            continue
        if line and not line.startswith("  "):
            break
        pattern = line.strip()
        if pattern:
            patterns.append(pattern)
    return patterns


def is_excluded(path: Path, patterns: list[str]) -> bool:
    rel = path.relative_to(DOCS).as_posix()
    return any(fnmatch.fnmatch(rel, pattern) for pattern in patterns)


def public_url(path: Path) -> str:
    rel = path.relative_to(DOCS).with_suffix("").as_posix().strip("/")
    return f"{SITE_ORIGIN}/{rel}/"


def watch_url(path: Path, video_file: str) -> str:
    rel = path.relative_to(DOCS).parent / Path(video_file).stem
    return f"{SITE_ORIGIN}/videos/{rel.as_posix().strip('/')}/"


def built_article(path: Path) -> Path:
    rel = path.relative_to(DOCS).with_suffix("")
    return SITE / rel / "index.html"


def built_watch(path: Path, video_file: str) -> Path:
    rel = path.relative_to(DOCS).parent / Path(video_file).stem
    return SITE / "videos" / rel / "index.html"


def canonical(html: str) -> str:
    match = re.search(
        r'<link[^>]+rel="[^"]*\bcanonical\b[^"]*"[^>]+href="([^"]+)"',
        html,
        re.IGNORECASE,
    )
    if not match:
        match = re.search(
            r'<link[^>]+href="([^"]+)"[^>]+rel="[^"]*\bcanonical\b[^"]*"',
            html,
            re.IGNORECASE,
        )
    return match.group(1) if match else ""


def meta_content(html: str, key: str, *, attr: str = "name") -> list[str]:
    values: list[str] = []
    for tag in re.findall(r"<meta\b[^>]*>", html, re.IGNORECASE):
        key_match = re.search(fr'\b{re.escape(attr)}="([^"]*)"', tag, re.IGNORECASE)
        content_match = re.search(r'\bcontent="([^"]*)"', tag, re.IGNORECASE)
        if key_match and content_match and key_match.group(1).casefold() == key.casefold():
            values.append(content_match.group(1))
    return values


def jsonld_objects(html: str) -> list[Any]:
    payloads = re.findall(
        r'<script[^>]+type="application/ld\+json"[^>]*>(.*?)</script>',
        html,
        re.IGNORECASE | re.DOTALL,
    )
    objects: list[Any] = []
    for payload in payloads:
        objects.append(json.loads(payload))
    return objects


def iter_dicts(value: Any):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from iter_dicts(child)
    elif isinstance(value, list):
        for child in value:
            yield from iter_dicts(child)


def schema_nodes(html: str, schema_type: str) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for payload in jsonld_objects(html):
        for node in iter_dicts(payload):
            value = node.get("@type")
            if value == schema_type or (
                isinstance(value, list) and schema_type in value
            ):
                result.append(node)
    return result


def local_url_exists(url: str) -> bool:
    parts = urlsplit(url)
    if parts.netloc and parts.netloc != "5sigmas.com":
        return True
    relative = parts.path.lstrip("/")
    target = SITE / relative
    if target.is_file():
        return True
    if parts.path.endswith("/"):
        return (target / "index.html").is_file()
    return (target / "index.html").is_file()


def require(condition: bool, message: str, failures: list[str]) -> None:
    if not condition:
        failures.append(message)


def main() -> int:
    failures: list[str] = []
    patterns = exclude_patterns()
    videos: list[tuple[Path, dict[str, Any]]] = []

    for md in sorted(DOCS.rglob("*.md")):
        if is_excluded(md, patterns):
            continue
        meta = read_frontmatter(md)
        video_file = str(meta.get("video") or "").strip()
        if not video_file:
            continue
        if "noindex" in str(meta.get("robots") or "").lower():
            continue

        video_path = md.parent / video_file
        poster_name = str(
            meta.get("video_poster")
            or Path(video_file).with_suffix(".jpg").name
        )
        poster_path = md.parent / poster_name
        require(video_path.is_file(), f"{md}: missing video {video_path.name}", failures)
        require(poster_path.is_file(), f"{md}: missing poster {poster_path.name}", failures)
        for key in ("title", "description", "date", "video_duration"):
            require(bool(meta.get(key)), f"{md}: missing frontmatter {key}", failures)
        videos.append((md, meta))

    require(bool(videos), "No indexable article videos were discovered", failures)

    sitemap_path = SITE / "sitemap.xml"
    video_sitemap_path = SITE / "video-sitemap.xml"
    require(sitemap_path.is_file(), "Missing site/sitemap.xml", failures)
    require(video_sitemap_path.is_file(), "Missing site/video-sitemap.xml", failures)
    if failures:
        return report(failures)

    sitemap = ET.parse(sitemap_path)
    video_sitemap = ET.parse(video_sitemap_path)
    sitemap_locs = {
        node.text or ""
        for node in sitemap.findall(".//sm:loc", NS)
    }
    video_records: dict[str, dict[str, str]] = {}
    for url_node in video_sitemap.findall(".//sm:url", NS):
        loc = url_node.findtext("sm:loc", default="", namespaces=NS)
        video_node = url_node.find("video:video", NS)
        if video_node is None:
            failures.append(f"{loc or 'unknown URL'}: missing video sitemap payload")
            continue
        video_records[loc] = {
            name: video_node.findtext(f"video:{name}", default="", namespaces=NS)
            for name in (
                "thumbnail_loc",
                "title",
                "description",
                "content_loc",
                "duration",
                "publication_date",
            )
        }

    expected_watch_urls = {
        watch_url(md, str(meta["video"]))
        for md, meta in videos
    }
    require(
        set(video_records) == expected_watch_urls,
        "video-sitemap.xml URLs do not exactly match the source video catalogue",
        failures,
    )

    hub_url = f"{SITE_ORIGIN}/videos/"
    hub_path = SITE / "videos" / "index.html"
    hub_mirror = SITE / "videos" / "index.html.md"
    require(hub_path.is_file(), "Missing native /videos/ hub", failures)
    require(hub_mirror.is_file(), "Missing /videos/ Markdown mirror", failures)
    require(hub_url in sitemap_locs, "/videos/ is missing from sitemap.xml", failures)

    if hub_path.is_file():
        hub_html = hub_path.read_text(encoding="utf-8", errors="replace")
        require("http-equiv=\"refresh\"" not in hub_html.lower(), "/videos/ is still a redirect", failures)
        require(canonical(hub_html) == hub_url, "/videos/ has the wrong canonical", failures)
        robots = ",".join(meta_content(hub_html, "robots")).lower()
        require("noindex" not in robots, "/videos/ is noindex", failures)
        require(
            hub_html.count("data-s5-video-card") == len(videos),
            f"/videos/ must expose {len(videos)} cards",
            failures,
        )
        require("data-s5-video-search" in hub_html, "/videos/ has no search field", failures)
        require("data-s5-video-filter" in hub_html, "/videos/ has no topic filters", failures)
        collection_nodes = schema_nodes(hub_html, "CollectionPage")
        item_nodes = schema_nodes(hub_html, "ItemList")
        require(bool(collection_nodes), "/videos/ is missing CollectionPage JSON-LD", failures)
        require(bool(item_nodes), "/videos/ is missing ItemList JSON-LD", failures)
        if item_nodes:
            require(
                item_nodes[0].get("numberOfItems") == len(videos),
                "/videos/ ItemList count does not match the source catalogue",
                failures,
            )

    catalogue_path = SITE / "videos" / "catalog.json"
    require(catalogue_path.is_file(), "Missing /videos/catalog.json", failures)
    if catalogue_path.is_file():
        catalogue = json.loads(catalogue_path.read_text(encoding="utf-8"))
        require(catalogue.get("count") == len(videos), "Video catalogue count is incorrect", failures)
        require(
            len(catalogue.get("videos", [])) == len(videos),
            "Video catalogue entries are incomplete",
            failures,
        )

    for md, meta in videos:
        video_file = str(meta["video"])
        article_url = public_url(md)
        target_watch_url = watch_url(md, video_file)
        article_path = built_article(md)
        watch_path = built_watch(md, video_file)
        mirror_path = Path(f"{watch_path}.md")

        require(article_url in sitemap_locs, f"{md}: article missing from sitemap.xml", failures)
        require(target_watch_url in sitemap_locs, f"{md}: watch page missing from sitemap.xml", failures)
        require(target_watch_url in video_records, f"{md}: watch page missing from video sitemap", failures)
        require(article_path.is_file(), f"{md}: missing built article", failures)
        require(watch_path.is_file(), f"{md}: missing built watch page", failures)
        require(mirror_path.is_file(), f"{md}: missing watch-page Markdown mirror", failures)
        if not article_path.is_file() or not watch_path.is_file():
            continue

        article_html = article_path.read_text(encoding="utf-8", errors="replace")
        require('class="s5-video-embed"' in article_html, f"{md}: article embed missing", failures)
        require(target_watch_url in article_html, f"{md}: article does not link to watch page", failures)
        require(
            not schema_nodes(article_html, "VideoObject"),
            f"{md}: VideoObject must live on the watch page, not the article",
            failures,
        )

        watch_html = watch_path.read_text(encoding="utf-8", errors="replace")
        require("md-content" in watch_html, f"{md}: watch page is not using the Material layout", failures)
        require(canonical(watch_html) == target_watch_url, f"{md}: wrong watch canonical", failures)
        robots = ",".join(meta_content(watch_html, "robots")).lower()
        require("noindex" not in robots and "index" in robots, f"{md}: watch page is not indexable", failures)
        require(
            meta_content(watch_html, "og:type", attr="property") == ["video.other"],
            f"{md}: watch page must use og:type=video.other",
            failures,
        )
        require('data-s5-watch-player' in watch_html, f"{md}: watch player missing", failures)
        require(
            watch_html.find("data-s5-watch-player") < watch_html.find("s5-video-watch__summary"),
            f"{md}: video is not the prominent primary content",
            failures,
        )
        require(article_url in watch_html, f"{md}: watch page does not link back to article", failures)
        require(
            watch_html.count("s5-video-watch__snippet-grid") == 1
            and re.search(r's5-video-watch__snippet-grid.*?<article', watch_html, re.DOTALL),
            f"{md}: watch page has no summary snippets",
            failures,
        )
        expected_related = min(3, max(0, len(videos) - 1))
        require(
            watch_html.count("s5-video-watch__related-grid") == 1,
            f"{md}: related-video section missing",
            failures,
        )
        related_section = re.search(
            r's5-video-watch__related-grid">(.*?)</div>',
            watch_html,
            re.DOTALL,
        )
        if related_section:
            require(
                related_section.group(1).count("<article>") >= expected_related,
                f"{md}: related-video section is incomplete",
                failures,
            )

        video_nodes = schema_nodes(watch_html, "VideoObject")
        require(len(video_nodes) == 1, f"{md}: expected one VideoObject", failures)
        if video_nodes:
            node = video_nodes[0]
            for field in (
                "name",
                "description",
                "thumbnailUrl",
                "contentUrl",
                "uploadDate",
                "duration",
                "mainEntityOfPage",
                "potentialAction",
            ):
                require(bool(node.get(field)), f"{md}: VideoObject missing {field}", failures)
            action = node.get("potentialAction")
            require(
                isinstance(action, dict) and action.get("@type") == "SeekToAction",
                f"{md}: VideoObject lacks SeekToAction",
                failures,
            )
            content_url = str(node.get("contentUrl") or "")
            thumbnails = node.get("thumbnailUrl") or []
            thumbnail_url = thumbnails[0] if isinstance(thumbnails, list) and thumbnails else str(thumbnails)
            require(local_url_exists(content_url), f"{md}: inaccessible local contentUrl {content_url}", failures)
            require(local_url_exists(thumbnail_url), f"{md}: inaccessible local thumbnail {thumbnail_url}", failures)

            record = video_records.get(target_watch_url, {})
            require(record.get("content_loc") == content_url, f"{md}: sitemap content URL disagrees with JSON-LD", failures)
            require(record.get("thumbnail_loc") == thumbnail_url, f"{md}: sitemap thumbnail disagrees with JSON-LD", failures)
            for field in ("title", "description", "duration", "publication_date"):
                require(bool(record.get(field)), f"{md}: video sitemap missing {field}", failures)

    llms = SITE / "llms.txt"
    require(llms.is_file(), "Missing llms.txt", failures)
    if llms.is_file():
        llms_text = llms.read_text(encoding="utf-8")
        require(
            "https://5sigmas.com/videos/index.html.md" in llms_text,
            "llms.txt does not expose the video library",
            failures,
        )

    return report(failures, len(videos))


def report(failures: list[str], count: int = 0) -> int:
    if failures:
        print("Video indexing audit failed:", file=sys.stderr)
        for item in failures:
            print(f"- {item}", file=sys.stderr)
        return 1
    print(
        "Video indexing audit passed for "
        f"{count} article embeds, {count} watch pages and one indexable library."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
