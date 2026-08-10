#!/usr/bin/env python3
"""Fast exhaustive contract for the eight compact P0 video routes.

Browser playback is intentionally handled separately. This gate proves that every
P0 source declaration and generated article/watch page remains structurally wired
before merge, while production smoke provides the exhaustive browser/transport
proof against the deployed site.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
SITE = ROOT / "site"

P0_STEMS = (
    "series/ia-pib-bienestar-energia/04-ia-pib-hoy",
    "series/ia-pib-bienestar-energia/02-ia-tecnologia-electrica",
    "series/ia-pib-bienestar-energia/03-pib-vs-bienestar",
    "series/multimodalidad-iag/02-alineamiento",
    "series/multimodalidad-iag/03-arquitecturas",
    "series/multimodalidad-iag/05-riesgos",
    "series/datacenters-espacio/02-energia-calor-conectividad",
    "series/datacenters-espacio/04-huella-real-datacenter",
)


def frontmatter(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    match = re.match(r"^---\s*\n(.*?)\n---\s*(?:\n|$)", text, re.DOTALL)
    if not match:
        raise ValueError(f"{path.relative_to(ROOT)}: missing YAML frontmatter")
    data = yaml.safe_load(match.group(1)) or {}
    if not isinstance(data, dict):
        raise ValueError(f"{path.relative_to(ROOT)}: frontmatter is not a mapping")
    return data


def require(text: str, needle: str, label: str, failures: list[str]) -> None:
    if needle not in text:
        failures.append(f"{label}: missing {needle!r}")


def main() -> int:
    failures: list[str] = []
    for stem in P0_STEMS:
        source_md = DOCS / f"{stem}.md"
        mp4 = DOCS / f"{stem}.mp4"
        poster = DOCS / f"{stem}.jpg"
        article = SITE / stem / "index.html"
        watch = SITE / "videos" / stem / "index.html"

        for path in (source_md, mp4, poster, article, watch):
            if not path.is_file() or path.stat().st_size <= 0:
                failures.append(f"{path.relative_to(ROOT)}: missing or empty")
        if failures and any(str(path.relative_to(ROOT)) in failures[-1] for path in (source_md, mp4, poster)):
            continue

        try:
            meta = frontmatter(source_md)
        except Exception as exc:
            failures.append(str(exc))
            continue

        expected_video = mp4.name
        declared_video = str(meta.get("video") or "")
        if declared_video != expected_video:
            failures.append(f"{source_md.relative_to(ROOT)}: video={declared_video!r}, expected {expected_video!r}")
        if str(meta.get("video_duration") or "") != "PT52S":
            failures.append(f"{source_md.relative_to(ROOT)}: P0 video_duration must remain PT52S")
        declared_poster = str(meta.get("video_poster") or poster.name)
        if declared_poster != poster.name:
            failures.append(f"{source_md.relative_to(ROOT)}: poster={declared_poster!r}, expected {poster.name!r}")

        if article.is_file():
            article_html = article.read_text(encoding="utf-8")
            require(article_html, "data-s5-inline-video-start", str(article.relative_to(ROOT)), failures)
            require(article_html, "data-s5-inline-video-player", str(article.relative_to(ROOT)), failures)
            require(article_html, mp4.name, str(article.relative_to(ROOT)), failures)
            require(article_html, poster.name, str(article.relative_to(ROOT)), failures)
            require(article_html, f"/videos/{stem}/", str(article.relative_to(ROOT)), failures)

        if watch.is_file():
            watch_html = watch.read_text(encoding="utf-8")
            require(watch_html, "data-s5-video-watch", str(watch.relative_to(ROOT)), failures)
            require(watch_html, "data-s5-watch-player", str(watch.relative_to(ROOT)), failures)
            require(watch_html, mp4.name, str(watch.relative_to(ROOT)), failures)
            require(watch_html, poster.name, str(watch.relative_to(ROOT)), failures)
            require(watch_html, f"/{stem}/", str(watch.relative_to(ROOT)), failures)

    if failures:
        print(f"P0 video contract failed with {len(failures)} problem(s):", file=sys.stderr)
        for failure in failures:
            print(f"- {failure}", file=sys.stderr)
        return 1
    print(f"P0 video contract passed: {len(P0_STEMS)} article/watch routes structurally wired with PT52S media.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
