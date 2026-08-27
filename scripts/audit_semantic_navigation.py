#!/usr/bin/env python3
"""Audit semantic internal-link coverage, agent paths and video key moments."""

from __future__ import annotations

import json
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]


def require(condition: bool, message: str, failures: list[str]) -> None:
    if not condition:
        failures.append(message)


def html_for_url(site_root: Path, locale_prefix: str, url: str) -> Path:
    path = urlsplit(url).path
    if locale_prefix and path.startswith(locale_prefix + "/"):
        path = path[len(locale_prefix):]
    rel = path.strip("/")
    return site_root / rel / "index.html" if rel else site_root / "index.html"


def audit_locale(site_root: Path, locale: str, locale_prefix: str) -> list[str]:
    failures: list[str] = []
    paths_path = site_root / "agent" / "learning-paths.json"
    graph_path = site_root / "agent" / "knowledge.json"
    catalogue_path = site_root / "videos" / "catalog.json"
    moments_path = site_root / "videos" / "key-moments.json"

    for path, label in (
        (paths_path, "learning paths"),
        (graph_path, "knowledge graph"),
        (catalogue_path, "video catalogue"),
        (moments_path, "video key moments"),
    ):
        require(path.is_file(), f"{locale}: missing {label}: {path}", failures)
    if failures:
        return failures

    paths = json.loads(paths_path.read_text(encoding="utf-8"))
    graph = json.loads(graph_path.read_text(encoding="utf-8"))
    catalogue = json.loads(catalogue_path.read_text(encoding="utf-8"))
    moments = json.loads(moments_path.read_text(encoding="utf-8"))

    rows = paths.get("paths") or []
    coverage = paths.get("coverage") or {}
    require(paths.get("version") == 1, f"{locale}: unexpected learning-path version", failures)
    require(paths.get("locale") == locale, f"{locale}: learning-path locale mismatch", failures)
    require(len(rows) >= 100, f"{locale}: too few semantic paths ({len(rows)})", failures)
    require(
        coverage.get("pages_with_paths") == len(rows),
        f"{locale}: some indexed pages have no semantic path",
        failures,
    )
    require(
        int(coverage.get("total_internal_recommendations") or 0) >= len(rows) * 3,
        f"{locale}: semantic paths expose fewer than three recommendations per page on average",
        failures,
    )

    seen_urls: set[str] = set()
    for row in rows:
        current = row.get("current") or {}
        current_url = str(current.get("url") or "")
        require(current_url not in seen_urls, f"{locale}: duplicate semantic path {current_url}", failures)
        seen_urls.add(current_url)
        html_path = html_for_url(site_root, locale_prefix, current_url)
        require(html_path.is_file(), f"{locale}: semantic path page missing: {current_url}", failures)
        links = row.get("links") or {}
        require(len(links) >= 3, f"{locale}: path has <3 recommendations: {current_url}", failures)
        if current.get("kind") == "concept":
            require(
                "understand" not in links,
                f"{locale}: concept page must not emit a second concept as 'understand': {current_url}",
                failures,
            )
        targets = set()
        for role, link in links.items():
            target = str((link or {}).get("url") or "")
            require(target and target != current_url, f"{locale}: invalid/self {role} link on {current_url}", failures)
            require(urlsplit(target).hostname == "5sigmas.com", f"{locale}: non-5sigmas semantic target {target}", failures)
            require(target not in targets, f"{locale}: duplicate semantic target on {current_url}: {target}", failures)
            targets.add(target)
            require(
                html_for_url(site_root, locale_prefix, target).is_file(),
                f"{locale}: semantic target is not a built page: {target}",
                failures,
            )
        if html_path.is_file():
            html = html_path.read_text(encoding="utf-8", errors="replace")
            require("data-s5-semantic-nav" in html, f"{locale}: crawlable semantic nav missing: {current_url}", failures)
            require(
                html.count("data-learning-role=") >= min(3, len(links)),
                f"{locale}: semantic HTML cards incomplete: {current_url}",
                failures,
            )

    page_like = {
        "home", "concept", "concept-hub", "engineering", "engineering-hub", "meta", "page",
        "series", "series-chapter", "series-hub", "tool", "tool-hub", "video-hub", "video-page", "visual-hub",
    }
    graph_pages = [item for item in (graph.get("items") or []) if item.get("kind") in page_like]
    related_three = sum(1 for item in graph_pages if len(item.get("related_item_ids") or []) >= 3)
    require(graph_pages, f"{locale}: graph has no page-like items", failures)
    if graph_pages:
        require(
            related_three / len(graph_pages) >= 0.90,
            f"{locale}: <90% of graph pages have at least three internal semantic relationships ({related_three}/{len(graph_pages)})",
            failures,
        )

    videos = catalogue.get("videos") or []
    key_coverage = catalogue.get("key_moment_coverage") or {}
    moment_videos = moments.get("videos") or []
    require(catalogue.get("version") >= 2, f"{locale}: video catalogue not enriched with key moments", failures)
    require(len(videos) > 0, f"{locale}: video catalogue is empty", failures)
    require(len(moment_videos) == len(videos), f"{locale}: key-moment manifest video count mismatch", failures)
    require(key_coverage.get("covered") == len(videos), f"{locale}: not every video has key-moment coverage", failures)

    for video in videos:
        watch_url = str(video.get("watch_url") or "")
        contract = video.get("key_moments") or {}
        mode = contract.get("mode")
        require(mode in {"clip", "seek_to_action"}, f"{locale}: invalid key-moment mode for {watch_url}", failures)
        watch_html_path = html_for_url(site_root, locale_prefix, watch_url)
        if not watch_html_path.is_file():
            failures.append(f"{locale}: watch page missing for key moments: {watch_url}")
            continue
        html = watch_html_path.read_text(encoding="utf-8", errors="replace")
        if mode == "clip":
            require('"@type":"Clip"' in html or '"@type": "Clip"' in html, f"{locale}: Clip JSON-LD missing: {watch_url}", failures)
            require(contract.get("clips"), f"{locale}: Clip mode has no clips: {watch_url}", failures)
        else:
            require(
                '"@type":"SeekToAction"' in html or '"@type": "SeekToAction"' in html,
                f"{locale}: SeekToAction JSON-LD missing: {watch_url}",
                failures,
            )
            require("{seek_to_second_number}" in str(contract.get("seek_template") or ""), f"{locale}: invalid seek template: {watch_url}", failures)

    print(
        f"Semantic navigation {locale}: {len(rows)} paths, "
        f"{coverage.get('total_internal_recommendations', 0)} crawlable recommendations, "
        f"{related_three}/{len(graph_pages)} graph pages with >=3 related IDs, "
        f"{len(videos)} videos with key-moment coverage."
    )
    return failures


def main() -> int:
    failures = []
    failures.extend(audit_locale(ROOT / "site", "es", ""))
    failures.extend(audit_locale(ROOT / "site" / "en", "en", "/en"))
    if failures:
        print("Semantic navigation audit failed:")
        for failure in failures:
            print(f"  - {failure}")
        return 1
    print("Semantic navigation audit passed for ES + EN.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
