#!/usr/bin/env python3
"""Verify the series 07+ video rollback on the exact live deployment."""

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

import yaml

ORIGIN = "https://5sigmas.com"
REVISION = os.environ.get("GITHUB_SHA", "").strip()
BLOCKED = (
    "agentes-ia",
    "agentes-voz-tiempo-real",
    "coding-agents-agent-harnesses",
    "context-engineering-memory-mcp",
    "llm-inference-engineering-economics",
    "evaluating-ai-systems-production",
)
KEEP = {"datacenters-espacio": 5, "modelos-razonadores": 6, "seguridad-ia": 6}
NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}


def fetch(url: str) -> tuple[int, bytes]:
    sep = "&" if "?" in url else "?"
    cache_busted = f"{url}{sep}rev={REVISION}" if REVISION else url
    request = Request(
        cache_busted,
        headers={
            "Cache-Control": "no-cache",
            "User-Agent": "5sigmas-series07-unpublish-verifier/1.0",
        },
    )
    try:
        with urlopen(request, timeout=30) as response:
            return response.status, response.read()
    except HTTPError as exc:
        return exc.code, exc.read()


def frontmatter(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    match = re.match(r"\A---\s*\n(.*?)\n---\s*(?:\n|$)", text, re.DOTALL)
    data = yaml.safe_load(match.group(1)) if match else {}
    return data if isinstance(data, dict) else {}


def entries(series: str) -> list[tuple[Path, str]]:
    rows = []
    for md in sorted((Path("docs/series") / series).glob("*.md")):
        video = str(frontmatter(md).get("video") or "").strip()
        if video:
            rows.append((md, video))
    return rows


def sitemap_locs(url: str) -> set[str]:
    status, body = fetch(url)
    if status != 200:
        raise AssertionError(f"{url}: expected 200, got {status}")
    root = ET.fromstring(body)
    return {
        (node.text or "").strip()
        for node in root.findall(".//sm:loc", NS)
        if (node.text or "").strip()
    }


def catalogue(url: str) -> dict:
    status, body = fetch(url)
    if status != 200:
        raise AssertionError(f"{url}: expected 200, got {status}")
    data = json.loads(body)
    if data.get("count") != len(data.get("videos") or []):
        raise AssertionError(f"{url}: catalogue count mismatch")
    return data


def assert_blocked_article(
    article: str,
    watch: str,
    normal: set[str],
    video_sitemap: set[str],
    catalog: dict,
) -> None:
    status, body = fetch(article)
    if status != 200:
        raise AssertionError(f"{article}: article disappeared (HTTP {status})")
    html = body.decode("utf-8", errors="replace")
    if "s5-video-embed" in html or "<video" in html.lower():
        raise AssertionError(f"{article}: video embed remains")
    if watch in html:
        raise AssertionError(f"{article}: removed watch URL remains linked")
    if '"@type":"VideoObject"' in html or '"@type": "VideoObject"' in html:
        raise AssertionError(f"{article}: VideoObject remains")
    if article not in normal:
        raise AssertionError(f"{article}: article missing from normal sitemap")
    if watch in normal or watch in video_sitemap:
        raise AssertionError(f"{watch}: removed watch URL remains in sitemap")
    status, _ = fetch(watch)
    if status != 404:
        raise AssertionError(f"{watch}: expected 404, got {status}")
    if any(
        row.get("watch_url") == watch or row.get("source_url") == article
        for row in catalog.get("videos") or []
        if isinstance(row, dict)
    ):
        raise AssertionError(f"{article}: blocked video remains in catalogue")


def assert_keep_live(
    series: str,
    expected: int,
    prefix: str,
    normal: set[str],
    video_sitemap: set[str],
    catalog: dict,
) -> None:
    rows = entries(series)
    if len(rows) != expected:
        raise AssertionError(f"{series}: expected {expected} video entries, got {len(rows)}")
    for md, video in rows:
        slug = md.stem
        stem = Path(video).stem
        article = f"{ORIGIN}{prefix}/series/{series}/{slug}/"
        watch = f"{ORIGIN}{prefix}/videos/series/{series}/{stem}/"
        status, body = fetch(article)
        html = body.decode("utf-8", errors="replace")
        if status != 200 or "s5-video-embed" not in html:
            raise AssertionError(f"{article}: keep-live video article changed")
        status, _ = fetch(watch)
        if status != 200:
            raise AssertionError(f"{watch}: keep-live watch missing (HTTP {status})")
        if article not in normal or watch not in normal or watch not in video_sitemap:
            raise AssertionError(f"{watch}: keep-live sitemap contract changed")
        if not any(
            isinstance(row, dict) and row.get("watch_url") == watch
            for row in catalog.get("videos") or []
        ):
            raise AssertionError(f"{watch}: keep-live catalogue entry missing")


def main() -> int:
    if not REVISION:
        raise SystemExit("GITHUB_SHA is required for exact-live verification")

    status, body = fetch(f"{ORIGIN}/build.json")
    if status != 200:
        raise SystemExit(f"build.json: HTTP {status}")
    live_revision = json.loads(body).get("revision")
    if live_revision != REVISION:
        raise SystemExit(f"wrong live revision: {live_revision} != {REVISION}")

    es_normal = sitemap_locs(f"{ORIGIN}/sitemap.xml")
    en_normal = sitemap_locs(f"{ORIGIN}/en/sitemap.xml")
    es_video = sitemap_locs(f"{ORIGIN}/video-sitemap.xml")
    en_video = sitemap_locs(f"{ORIGIN}/en/video-sitemap.xml")
    es_catalog = catalogue(f"{ORIGIN}/videos/catalog.json")
    en_catalog = catalogue(f"{ORIGIN}/en/videos/catalog.json")

    if es_catalog.get("count") != 40 or en_catalog.get("count") != 40:
        raise AssertionError(
            f"catalogue count mismatch: ES={es_catalog.get('count')} EN={en_catalog.get('count')}"
        )

    blocked_count = 0
    for series in BLOCKED:
        for md, video in entries(series):
            blocked_count += 1
            slug = md.stem
            stem = Path(video).stem
            meta = frontmatter(md)
            poster = str(meta.get("video_poster") or Path(video).with_suffix(".jpg").name).strip()
            captions = str(meta.get("video_captions") or "").strip()
            assert_blocked_article(
                f"{ORIGIN}/series/{series}/{slug}/",
                f"{ORIGIN}/videos/series/{series}/{stem}/",
                es_normal,
                es_video,
                es_catalog,
            )
            assert_blocked_article(
                f"{ORIGIN}/en/series/{series}/{slug}/",
                f"{ORIGIN}/en/videos/series/{series}/{stem}/",
                en_normal,
                en_video,
                en_catalog,
            )
            for prefix in ("", "/en"):
                for asset in filter(None, (video, poster, captions)):
                    asset_url = f"{ORIGIN}{prefix}/series/{series}/{asset}"
                    status, _ = fetch(asset_url)
                    if status != 404:
                        raise AssertionError(f"{asset_url}: blocked video asset still public (HTTP {status})")
    if blocked_count != 36:
        raise AssertionError(f"blocked inventory drift: expected 36, got {blocked_count}")

    for series, expected in KEEP.items():
        assert_keep_live(series, expected, "", es_normal, es_video, es_catalog)
        assert_keep_live(series, expected, "/en", en_normal, en_video, en_catalog)

    print(
        "LIVE PASS: 36 still-unapproved video entries removed; Security R5 plus protected baselines remain live across embeds/watch pages/catalogues/"
        "video sitemaps/public video assets while all ES/EN articles remain live; Datacenters and "
        "Modelos R2 video surfaces remain live."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
