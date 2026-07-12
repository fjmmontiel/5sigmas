#!/usr/bin/env python3
"""Audit local video indexing metadata after an MkDocs build."""

from __future__ import annotations

import fnmatch
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
SITE = ROOT / "site"
MKDOCS = ROOT / "mkdocs.yml"
NS = {
    "sm": "http://www.sitemaps.org/schemas/sitemap/0.9",
    "video": "http://www.google.com/schemas/sitemap-video/1.1",
}


def frontmatter(path: Path) -> dict[str, str] | None:
    text = path.read_text(encoding="utf-8")
    match = re.match(r"^---\n(.*?)\n---", text, re.S)
    if not match:
        return None
    meta: dict[str, str] = {}
    for line in match.group(1).splitlines():
        if ":" not in line or line.startswith(" "):
            continue
        key, value = line.split(":", 1)
        meta[key.strip()] = value.strip().strip("\"'")
    return meta


def public_url_for_md(path: Path) -> str:
    rel = path.relative_to(DOCS).with_suffix("")
    return "https://5sigmas.com/" + "/".join(rel.parts) + "/"


def site_html_for_md(path: Path) -> Path:
    rel = path.relative_to(DOCS).with_suffix("")
    return SITE.joinpath(*rel.parts, "index.html")


def exclude_patterns() -> list[str]:
    lines = MKDOCS.read_text(encoding="utf-8").splitlines()
    patterns: list[str] = []
    collecting = False
    for line in lines:
        if not collecting:
            if line.startswith("exclude_docs: |"):
                collecting = True
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


def expects_video_indexing(meta: dict[str, str]) -> bool:
    return meta.get("video_sitemap", "").lower() == "true"


def fail(message: str, failures: list[str]) -> None:
    failures.append(message)


def main() -> int:
    failures: list[str] = []
    video_pages: list[tuple[Path, dict[str, str]]] = []
    indexable_video_pages: list[tuple[Path, dict[str, str]]] = []
    excluded = exclude_patterns()

    for md in sorted((DOCS / "series").glob("*/*.md")):
        if is_excluded(md, excluded):
            continue
        meta = frontmatter(md)
        if not meta or "video" not in meta:
            continue
        video_pages.append((md, meta))
        if expects_video_indexing(meta):
            indexable_video_pages.append((md, meta))
        video = md.parent / meta["video"]
        poster = video.with_suffix(".jpg")
        if not video.exists():
            fail(f"{md}: missing video file {video.name}", failures)
        if not poster.exists():
            fail(f"{md}: missing poster file {poster.name}", failures)
        if expects_video_indexing(meta) and "noindex" not in meta.get("robots", "").lower():
            for key in ("title", "description", "date", "video_duration"):
                if not meta.get(key):
                    fail(f"{md}: indexable video page missing {key}", failures)

    sitemap = ET.parse(SITE / "sitemap.xml")
    video_sitemap = ET.parse(SITE / "video-sitemap.xml")
    sitemap_locs = {el.text for el in sitemap.findall(".//sm:loc", NS)}
    video_locs = set()

    for url in video_sitemap.findall(".//sm:url", NS):
        loc = url.find("sm:loc", NS).text
        video_locs.add(loc)
        video = url.find("video:video", NS)
        if loc not in sitemap_locs:
            fail(f"video sitemap URL not present in sitemap.xml: {loc}", failures)
        for tag in ("thumbnail_loc", "title", "description", "content_loc"):
            if video.find(f"video:{tag}", NS) is None:
                fail(f"{loc}: video sitemap missing {tag}", failures)
        for tag in ("duration", "publication_date"):
            if video.find(f"video:{tag}", NS) is None:
                fail(f"{loc}: video sitemap missing optional-but-expected {tag}", failures)

    for md, meta in video_pages:
        html_path = site_html_for_md(md)
        if not html_path.exists():
            fail(f"{md}: missing built HTML {html_path}", failures)
            continue
        html = html_path.read_text(encoding="utf-8", errors="ignore")
        source_noindex = "noindex" in meta.get("robots", "").lower()
        html_noindex = bool(re.search(r'<meta name="robots" content="[^"]*noindex', html, re.I))
        is_noindex = source_noindex or html_noindex
        loc = public_url_for_md(md)
        if not is_noindex and "Redirecting..." in html:
            fail(f"{md}: canonical video page built as redirect", failures)
        if is_noindex:
            if loc in sitemap_locs:
                fail(f"{md}: noindex page present in sitemap.xml", failures)
            if loc in video_locs:
                fail(f"{md}: noindex page present in video-sitemap.xml", failures)
            if '"@type": "VideoObject"' in html:
                fail(f"{md}: noindex page emits VideoObject", failures)
            continue

        if loc not in sitemap_locs:
            fail(f"{md}: missing from sitemap.xml", failures)
        if 'class="s5-video-embed"' not in html:
            fail(f"{md}: missing video player", failures)
        if expects_video_indexing(meta):
            if loc not in video_locs:
                fail(f"{md}: missing from video-sitemap.xml", failures)
            if html.count('"@type": "VideoObject"') != 1:
                fail(f"{md}: expected exactly one VideoObject", failures)
            for field in ("name", "description", "thumbnailUrl", "contentUrl", "uploadDate", "duration"):
                if f'"{field}":' not in html:
                    fail(f"{md}: VideoObject missing {field}", failures)
        else:
            if loc in video_locs:
                fail(f"{md}: non-watch video page present in video-sitemap.xml", failures)
            if '"@type": "VideoObject"' in html:
                fail(f"{md}: non-watch video page emits VideoObject", failures)

    if failures:
        print("Video indexing audit failed:", file=sys.stderr)
        for item in failures:
            print(f"- {item}", file=sys.stderr)
        return 1

    print(
        "Video indexing audit passed for "
        f"{len(video_pages)} video embeds and {len(indexable_video_pages)} indexable video pages."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
