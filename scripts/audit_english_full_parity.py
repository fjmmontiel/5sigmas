#!/usr/bin/env python3
"""Measure English 5sigmas against the canonical Spanish public surface.

Spanish under docs/ is the source of truth.  The English locale is complete only
when it mirrors the same public editorial routes, navigation graph, embedded
visual dependencies, article video declarations and shared JavaScript runtime.

During the migration this script reports the exact delta and exits zero.  When
``locales/en/manifest.yml`` declares ``status: complete`` (or --strict is used),
any delta is a CI failure.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

import yaml

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
LOCALE = ROOT / "locales" / "en"
MANIFEST = LOCALE / "manifest.yml"
MKDOCS_ES = ROOT / "mkdocs.yml"
MKDOCS_EN = ROOT / "mkdocs.en.yml"
NON_PUBLIC_STATES = {"draft", "hidden", "wip", "private"}

# These are the canonical editorial surfaces. Generated video watch pages are
# accounted for separately from article frontmatter.
PUBLIC_ROOT_FILES = (
    "index.md",
    "proximamente.md",
    "meta/about.md",
    "series/index.md",
    "visuales/index.md",
)
PUBLIC_DIRS = ("series", "temas", "articulos-tecnicos")
GENERATED_NAV_ROUTES = {"videos/index.md"}

INCLUDE_HTML_RE = re.compile(
    r"include_html\(\s*[\"']([^\"']+)[\"']",
    re.IGNORECASE,
)


def frontmatter(path: Path) -> dict[str, Any]:
    text = path.read_text(encoding="utf-8")
    match = re.match(r"\A---\s*\n(.*?)\n---\s*(?:\n|$)", text, re.DOTALL)
    if not match:
        return {}
    try:
        value = yaml.safe_load(match.group(1)) or {}
    except yaml.YAMLError:
        return {}
    return value if isinstance(value, dict) else {}


def hidden(path: Path) -> bool:
    meta = frontmatter(path)
    status = str(meta.get("publication_status") or "").strip().lower()
    robots = str(meta.get("robots") or "").strip().lower()
    return status in NON_PUBLIC_STATES or "noindex" in robots


def expected_editorial_routes() -> set[str]:
    result: set[str] = set()
    for rel in PUBLIC_ROOT_FILES:
        path = DOCS / rel
        if path.is_file() and not hidden(path):
            result.add(rel)

    for dirname in PUBLIC_DIRS:
        base = DOCS / dirname
        if not base.is_dir():
            continue
        for path in base.rglob("*.md"):
            if path.name.startswith("_") or path.name.upper() == "README.MD":
                continue
            if hidden(path):
                continue
            result.add(path.relative_to(DOCS).as_posix())
    return result


def source_snippets(routes: set[str]) -> set[str]:
    deps: set[str] = set()
    for rel in routes:
        path = DOCS / rel
        if not path.is_file():
            continue
        deps.update(INCLUDE_HTML_RE.findall(path.read_text(encoding="utf-8")))
    return deps


def video_pages(routes: set[str]) -> set[str]:
    result: set[str] = set()
    for rel in routes:
        path = DOCS / rel
        if not path.is_file():
            continue
        if str(frontmatter(path).get("video") or "").strip():
            result.add(rel)
    return result


def manifest() -> dict[str, Any]:
    if not MANIFEST.is_file():
        return {}
    value = yaml.safe_load(MANIFEST.read_text(encoding="utf-8")) or {}
    return value if isinstance(value, dict) else {}


def nav_paths(config_text: str) -> set[str]:
    match = re.search(
        r"(?ms)^nav:\s*\n(?P<body>.*?)(?=^[A-Za-z_][A-Za-z0-9_-]*:\s*(?:\n|$))",
        config_text,
    )
    if not match:
        return set()
    body = match.group("body")
    return set(re.findall(r"(?<![A-Za-z0-9_./-])([A-Za-z0-9_./-]+\.md)\b", body))


def javascript_paths(config_text: str) -> set[str]:
    match = re.search(
        r"(?ms)^extra_javascript:\s*\n(?P<body>.*?)(?=^[A-Za-z_][A-Za-z0-9_-]*:\s*(?:\n|$))",
        config_text,
    )
    if not match:
        return set()
    return set(re.findall(r"^\s*-\s+path:\s*([^\s#]+\.js)\s*$", match.group("body"), re.MULTILINE))


def locale_video_pages(config_text: str) -> set[str]:
    match = re.search(
        r"(?ms)^\s{2}locale_video_pages:\s*\n(?P<body>.*?)(?=^\s{2}[A-Za-z_][A-Za-z0-9_-]*:\s*(?:\n|$))",
        config_text,
    )
    if not match:
        return set()
    return set(re.findall(r"^\s{4}([^:#]+\.md):\s*$", match.group("body"), re.MULTILINE))


def article_audio_pages() -> set[str]:
    index = DOCS / "series" / "article_audio.yml"
    if not index.is_file():
        return set()
    value = yaml.safe_load(index.read_text(encoding="utf-8")) or {}
    return set(value) if isinstance(value, dict) else set()


def compare(expected: set[str], actual: set[str]) -> dict[str, list[str]]:
    return {
        "missing": sorted(expected - actual),
        "extra": sorted(actual - expected),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--strict", action="store_true")
    parser.add_argument("--json", dest="json_path")
    args = parser.parse_args()

    data = manifest()
    status = str(data.get("status") or "").strip().lower()
    strict = args.strict or status == "complete"

    routes = expected_editorial_routes()
    snippets = source_snippets(routes)
    videos = video_pages(routes)
    audio = article_audio_pages()

    declared_routes = set(data.get("published_routes") or [])
    declared_snippets = set(data.get("required_snippets") or [])
    existing_routes = {
        path.relative_to(LOCALE).as_posix()
        for path in LOCALE.rglob("*.md")
        if path.is_file()
    }
    existing_snippets = {
        path.relative_to(LOCALE).as_posix()
        for path in (LOCALE / "snippets").rglob("*.html")
        if path.is_file()
    } if (LOCALE / "snippets").is_dir() else set()

    es_cfg = MKDOCS_ES.read_text(encoding="utf-8")
    en_cfg = MKDOCS_EN.read_text(encoding="utf-8")
    expected_nav = {
        path
        for path in nav_paths(es_cfg)
        if (DOCS / path).is_file() or path in GENERATED_NAV_ROUTES
    }
    actual_nav = nav_paths(en_cfg)
    es_js = javascript_paths(es_cfg)
    en_js = javascript_paths(en_cfg)
    en_video_pages = locale_video_pages(en_cfg)

    report: dict[str, Any] = {
        "status": status or "unknown",
        "strict": strict,
        "expected": {
            "editorial_routes": len(routes),
            "nav_routes": len(expected_nav),
            "snippet_dependencies": len(snippets),
            "video_articles": len(videos),
            "audio_articles": len(audio),
            "javascript_modules": len(es_js),
        },
        "editorial_routes": compare(routes, existing_routes),
        "manifest_routes": compare(routes, declared_routes),
        "snippet_files": compare(snippets, existing_snippets),
        "manifest_snippets": compare(snippets, declared_snippets),
        "navigation": compare(expected_nav, actual_nav),
        "video_articles": compare(videos, en_video_pages),
        "javascript_modules": compare(es_js, en_js),
        "audio_articles": {
            "missing": sorted(audio),
            "extra": [],
        },
    }

    # Generated surfaces become satisfiable once all localized video articles
    # exist and the English build enables its video library/watch-page hooks.
    generated = data.get("generated_surfaces") or {}
    report["generated_surfaces"] = {
        "video_library": bool(generated.get("video_library")),
        "video_watch_pages": bool(generated.get("video_watch_pages")),
        "visual_hub": bool(generated.get("visual_hub")),
    }

    deltas = 0
    for key in (
        "editorial_routes", "manifest_routes", "snippet_files", "manifest_snippets",
        "navigation", "video_articles", "javascript_modules", "audio_articles",
    ):
        section = report[key]
        deltas += len(section.get("missing", [])) + len(section.get("extra", []))
    deltas += sum(1 for value in report["generated_surfaces"].values() if not value)
    report["delta_count"] = deltas

    print("English full-parity audit")
    print(f"  canonical editorial routes: {len(routes)}")
    print(f"  canonical nav routes:       {len(expected_nav)}")
    print(f"  snippet dependencies:       {len(snippets)}")
    print(f"  video-bearing articles:     {len(videos)}")
    print(f"  JS runtime modules:         {len(es_js)}")
    print(f"  total parity delta:         {deltas}")

    for key in (
        "editorial_routes", "snippet_files", "navigation", "video_articles",
        "javascript_modules", "audio_articles",
    ):
        missing = report[key]["missing"]
        if missing:
            preview = ", ".join(missing[:8])
            suffix = f" … +{len(missing) - 8}" if len(missing) > 8 else ""
            print(f"  missing {key}: {len(missing)} — {preview}{suffix}")

    if args.json_path:
        destination = Path(args.json_path)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    if strict and deltas:
        print("English parity is not complete.", file=sys.stderr)
        return 1
    if not deltas:
        print("English parity is complete: zero canonical deltas.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
