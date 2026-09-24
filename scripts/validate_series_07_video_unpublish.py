#!/usr/bin/env python3
"""Fail-closed audit for the owner-directed series 07+ video unpublish.

The article/series content must remain public in ES and EN. Only video-specific
surfaces and assets for series 07-13 are allowed to disappear.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET

import yaml

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
SITE = ROOT / "site"
EN_MEDIA = ROOT / "locales" / "en" / "media.yml"

BLOCKED = (
    "agentes-ia",
    "agentes-voz-tiempo-real",
    "coding-agents-agent-harnesses",
    "context-engineering-memory-mcp",
    "llm-inference-engineering-economics",
    "evaluating-ai-systems-production",
)
KEEP_LIVE = ("datacenters-espacio", "modelos-razonadores", "seguridad-ia")
EXPECTED_BLOCKED_ENTRIES = 36
EXPECTED_PUBLIC_CATALOGUE = 40

NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}


def frontmatter(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    match = re.match(r"\A---\s*\n(.*?)\n---\s*(?:\n|$)", text, re.DOTALL)
    if not match:
        return {}
    data = yaml.safe_load(match.group(1)) or {}
    return data if isinstance(data, dict) else {}


def route_for_source(src: Path, locale: str) -> str:
    rel = src.relative_to(DOCS).with_suffix("").as_posix()
    prefix = "/en" if locale == "en" else ""
    return f"{prefix}/{rel}/"


def html_for_route(route: str) -> Path:
    rel = route.strip("/")
    return SITE / rel / "index.html"


def mirror_for_route(route: str) -> Path:
    return Path(f"{html_for_route(route)}.md")


def locs(path: Path) -> set[str]:
    if not path.is_file():
        raise AssertionError(f"missing sitemap: {path}")
    root = ET.parse(path).getroot()
    return {
        (node.text or "").strip()
        for node in root.findall(".//sm:loc", NS)
        if (node.text or "").strip()
    }


def catalogue(path: Path) -> dict:
    if not path.is_file():
        raise AssertionError(f"missing catalogue: {path}")
    data = json.loads(path.read_text(encoding="utf-8"))
    assert isinstance(data.get("videos"), list), f"invalid catalogue videos: {path}"
    assert data.get("count") == len(data["videos"]), f"catalogue count mismatch: {path}"
    return data


def source_entries(series: str) -> list[tuple[Path, dict]]:
    folder = DOCS / "series" / series
    rows = []
    for md in sorted(folder.glob("*.md")):
        meta = frontmatter(md)
        if str(meta.get("video") or "").strip():
            rows.append((md, meta))
    return rows


def english_media() -> dict:
    data = yaml.safe_load(EN_MEDIA.read_text(encoding="utf-8")) or {}
    assert isinstance(data, dict), "English media index must be a mapping"
    return data


def assert_article_intact_without_video(
    *,
    md: Path,
    meta: dict,
    locale: str,
    normal_locs: set[str],
    video_locs: set[str],
    cat: dict,
    en_media: dict,
) -> None:
    source_rel = md.relative_to(DOCS).as_posix()
    article_route = route_for_source(md, locale)
    video_name = str(meta["video"])
    video_stem = Path(video_name).stem
    watch_route = ("/en" if locale == "en" else "") + f"/videos/{md.parent.relative_to(DOCS).as_posix()}/{video_stem}/"
    article_url = f"https://5sigmas.com{article_route}"
    watch_url = f"https://5sigmas.com{watch_route}"

    article_html = html_for_route(article_route)
    assert article_html.is_file(), f"{locale}:{source_rel}: article HTML disappeared"
    html = article_html.read_text(encoding="utf-8", errors="replace")
    assert "s5-video-embed" not in html, f"{locale}:{source_rel}: inline video embed remains"
    assert "<video" not in html.lower(), f"{locale}:{source_rel}: video element remains"
    assert watch_route not in html, f"{locale}:{source_rel}: article still links to removed watch page"
    assert '"@type":"VideoObject"' not in html and '"@type": "VideoObject"' not in html, (
        f"{locale}:{source_rel}: VideoObject remains on article"
    )
    assert article_url in normal_locs, f"{locale}:{source_rel}: article removed from normal sitemap"
    assert watch_url not in normal_locs, f"{locale}:{source_rel}: watch page remains in normal sitemap"
    assert watch_url not in video_locs, f"{locale}:{source_rel}: watch page remains in video sitemap"

    watch_html = html_for_route(watch_route)
    assert not watch_html.exists(), f"{locale}:{source_rel}: watch HTML still built"
    assert not mirror_for_route(watch_route).exists(), f"{locale}:{source_rel}: watch Markdown mirror still built"

    mirror = mirror_for_route(article_route)
    assert mirror.is_file(), f"{locale}:{source_rel}: article Markdown mirror disappeared"
    mirror_text = mirror.read_text(encoding="utf-8", errors="replace")
    assert not re.search(r"(?m)^video(?:_[A-Za-z0-9_-]+)?:", mirror_text), (
        f"{locale}:{source_rel}: public Markdown mirror still exposes video metadata"
    )

    parent_rel = md.parent.relative_to(DOCS).as_posix()
    prefix = "en/" if locale == "en" else ""
    locale_meta = dict(meta)
    if locale == "en":
        declared = en_media.get(source_rel) or {}
        assert isinstance(declared, dict), f"{source_rel}: invalid English media declaration"
        locale_meta.update(declared)
    poster_name = str(locale_meta.get("video_poster") or Path(video_name).with_suffix(".jpg").name)
    captions_name = str(locale_meta.get("video_captions") or "").strip()

    for asset in filter(None, (video_name, poster_name, captions_name)):
        built_asset = SITE / prefix / parent_rel / asset
        assert not built_asset.exists(), f"{locale}:{source_rel}: blocked public asset remains: {built_asset}"

    for row in cat["videos"]:
        assert row.get("watch_url") != watch_url, f"{locale}:{source_rel}: blocked watch remains in catalogue"
        assert row.get("source_url") != article_url, f"{locale}:{source_rel}: blocked article remains video-bearing in catalogue"


def assert_keep_live(
    *,
    series: str,
    locale: str,
    normal_locs: set[str],
    video_locs: set[str],
    cat: dict,
    en_media: dict,
) -> None:
    entries = source_entries(series)
    expected = 5 if series == "datacenters-espacio" else 6
    assert len(entries) == expected, f"{series}: expected {expected} source videos, found {len(entries)}"
    for md, meta in entries:
        source_rel = md.relative_to(DOCS).as_posix()
        video_name = str(meta["video"])
        if locale == "en":
            declared = en_media.get(source_rel) or {}
            assert isinstance(declared, dict), f"{source_rel}: invalid English media declaration"
            video_name = str(declared.get("video") or video_name)
        article_route = route_for_source(md, locale)
        watch_route = ("/en" if locale == "en" else "") + f"/videos/{md.parent.relative_to(DOCS).as_posix()}/{Path(video_name).stem}/"
        article_url = f"https://5sigmas.com{article_route}"
        watch_url = f"https://5sigmas.com{watch_route}"
        article_html = html_for_route(article_route)
        watch_html = html_for_route(watch_route)
        assert article_html.is_file(), f"{locale}:{source_rel}: keep-live article missing"
        html = article_html.read_text(encoding="utf-8", errors="replace")
        assert "s5-video-embed" in html, f"{locale}:{source_rel}: keep-live inline video unexpectedly removed"
        assert watch_route in html, f"{locale}:{source_rel}: keep-live watch link unexpectedly removed"
        assert watch_html.is_file(), f"{locale}:{source_rel}: keep-live watch page missing"
        assert article_url in normal_locs, f"{locale}:{source_rel}: keep-live article missing from normal sitemap"
        assert watch_url in normal_locs, f"{locale}:{source_rel}: keep-live watch missing from normal sitemap"
        assert watch_url in video_locs, f"{locale}:{source_rel}: keep-live watch missing from video sitemap"
        assert any(row.get("watch_url") == watch_url for row in cat["videos"]), (
            f"{locale}:{source_rel}: keep-live watch missing from catalogue"
        )


def main() -> int:
    blocked_count = sum(len(source_entries(series)) for series in BLOCKED)
    assert blocked_count == EXPECTED_BLOCKED_ENTRIES, (
        f"blocked inventory drift: expected {EXPECTED_BLOCKED_ENTRIES}, found {blocked_count}"
    )

    en_media = english_media()
    es_normal = locs(SITE / "sitemap.xml")
    en_normal = locs(SITE / "en" / "sitemap.xml")
    es_video = locs(SITE / "video-sitemap.xml")
    en_video = locs(SITE / "en" / "video-sitemap.xml")
    es_cat = catalogue(SITE / "videos" / "catalog.json")
    en_cat = catalogue(SITE / "en" / "videos" / "catalog.json")

    assert es_cat["count"] == EXPECTED_PUBLIC_CATALOGUE, (
        f"Spanish catalogue count: expected {EXPECTED_PUBLIC_CATALOGUE}, got {es_cat['count']}"
    )
    assert en_cat["count"] == EXPECTED_PUBLIC_CATALOGUE, (
        f"English catalogue count: expected {EXPECTED_PUBLIC_CATALOGUE}, got {en_cat['count']}"
    )

    for series in BLOCKED:
        for md, meta in source_entries(series):
            assert_article_intact_without_video(
                md=md, meta=meta, locale="es",
                normal_locs=es_normal, video_locs=es_video, cat=es_cat, en_media=en_media,
            )
            assert_article_intact_without_video(
                md=md, meta=meta, locale="en",
                normal_locs=en_normal, video_locs=en_video, cat=en_cat, en_media=en_media,
            )

    for series in KEEP_LIVE:
        assert_keep_live(series=series, locale="es", normal_locs=es_normal, video_locs=es_video, cat=es_cat, en_media=en_media)
        assert_keep_live(series=series, locale="en", normal_locs=en_normal, video_locs=en_video, cat=en_cat, en_media=en_media)

    for locale_prefix in ("", "en/"):
        llms_path = SITE / locale_prefix / "llms.txt"
        if llms_path.is_file():
            text = llms_path.read_text(encoding="utf-8", errors="replace")
            for series in BLOCKED:
                assert f"/videos/series/{series}/" not in text, (
                    f"{llms_path}: blocked video discovery link remains for {series}"
                )

        key_moments = SITE / locale_prefix / "videos" / "key-moments.json"
        if key_moments.is_file():
            payload = key_moments.read_text(encoding="utf-8", errors="replace")
            for series in BLOCKED:
                assert f"/videos/series/{series}/" not in payload, (
                    f"{key_moments}: blocked key-moment record remains for {series}"
                )

    print(
        "Series 07+ video unpublish PASS: "
        f"{EXPECTED_BLOCKED_ENTRIES} blocked articles preserved in ES/EN with zero video embeds/watch pages/"
        "VideoObject/catalogue/sitemap/public media/Markdown video metadata; "
        "AI Security R5, Data Centers in Space, and Reasoning Models R2 remain video-live."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
