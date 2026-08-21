#!/usr/bin/env python3
"""Measure English 5sigmas against the canonical Spanish public surface.

Spanish under ``docs/`` is the route/media capability source of truth. English
is complete only when it mirrors the same public editorial and interactive-tool
surface. Most routes preserve source slugs; product surfaces may declare an
explicit canonical→localized mapping in ``tools/locale-en.yml``.
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
TOOL_MANIFEST = ROOT / "tools" / "locale-en.yml"
LOCALE_MEDIA = LOCALE / "media.yml"
LOCALE_AUDIO_INDEX = LOCALE / "article_audio.yml"
SPANISH_AUDIO_INDEX = DOCS / "series" / "article_audio.yml"
MKDOCS_ES = ROOT / "mkdocs.yml"
MKDOCS_EN = ROOT / "mkdocs.en.yml"
NON_PUBLIC_STATES = {"draft", "hidden", "wip", "private"}

PUBLIC_ROOT_FILES = (
    "index.md",
    "proximamente.md",
    "meta/about.md",
    "series/index.md",
    "visuales/index.md",
)
PUBLIC_DIRS = ("series", "temas", "articulos-tecnicos", "herramientas")
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
        if path.is_file():
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


def route_snippet_dependencies(root: Path, routes: set[str]) -> set[str]:
    deps: set[str] = set()
    for rel in routes:
        path = root / rel
        if path.is_file():
            deps.update(INCLUDE_HTML_RE.findall(path.read_text(encoding="utf-8")))
    return deps


def video_pages(routes: set[str]) -> set[str]:
    result: set[str] = set()
    for rel in routes:
        path = DOCS / rel
        if path.is_file() and str(frontmatter(path).get("video") or "").strip():
            result.add(rel)
    return result


def load_mapping(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        value = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except yaml.YAMLError:
        return {}
    return value if isinstance(value, dict) else {}


def manifest() -> dict[str, Any]:
    return load_mapping(MANIFEST)


def tool_route_mapping() -> dict[str, str]:
    data = load_mapping(TOOL_MANIFEST)
    result: dict[str, str] = {}
    localized_seen: set[str] = set()
    for entry in data.get("routes") or []:
        if not isinstance(entry, dict):
            raise AssertionError(f"invalid tool route entry: {entry!r}")
        canonical = str(entry.get("canonical") or "").strip().lstrip("/")
        localized = str(entry.get("localized") or "").strip().lstrip("/")
        if not canonical.endswith(".md") or not localized.endswith(".md"):
            raise AssertionError(f"tool route mappings must use Markdown sources: {entry!r}")
        if ".." in Path(canonical).parts or ".." in Path(localized).parts:
            raise AssertionError(f"unsafe tool route mapping: {entry!r}")
        if canonical in result or localized in localized_seen:
            raise AssertionError(f"duplicate tool route mapping: {entry!r}")
        result[canonical] = localized
        localized_seen.add(localized)
    return result


def tool_published_files() -> set[str]:
    data = load_mapping(TOOL_MANIFEST)
    values = data.get("published_files") or []
    if not isinstance(values, list):
        raise AssertionError("tools/locale-en.yml published_files must be a list")
    return {str(value).strip().lstrip("/") for value in values if str(value).strip()}


def nav_paths(config_text: str) -> set[str]:
    match = re.search(
        r"(?ms)^nav:\s*\n(?P<body>.*?)(?=^[A-Za-z_][A-Za-z0-9_-]*:\s*(?:\n|$)|\Z)",
        config_text,
    )
    if not match:
        return set()
    return set(
        re.findall(
            r"(?<![A-Za-z0-9_./-])([A-Za-z0-9_./-]+\.md)\b",
            match.group("body"),
        )
    )


def javascript_paths(config_text: str) -> set[str]:
    match = re.search(
        r"(?ms)^extra_javascript:\s*\n(?P<body>.*?)(?=^[A-Za-z_][A-Za-z0-9_-]*:\s*(?:\n|$)|\Z)",
        config_text,
    )
    if not match:
        return set()
    return set(
        re.findall(
            r"^\s*-\s+path:\s*([^\s#]+\.js)\s*$",
            match.group("body"),
            re.MULTILINE,
        )
    )


def locale_video_pages(config_text: str) -> set[str]:
    result: set[str] = set()
    media = load_mapping(LOCALE_MEDIA)
    for route, entry in media.items():
        if isinstance(entry, dict) and str(entry.get("video") or "").strip():
            result.add(str(route))

    match = re.search(
        r"(?ms)^\s{2}locale_video_pages:\s*\n(?P<body>.*?)(?=^\s{2}[A-Za-z_][A-Za-z0-9_-]*:\s*(?:\n|$)|\Z)",
        config_text,
    )
    if match:
        result.update(
            re.findall(
                r"^\s{4}([^:#]+\.md):\s*$",
                match.group("body"),
                re.MULTILINE,
            )
        )
    return result


def compare(expected: set[str], actual: set[str]) -> dict[str, list[str]]:
    return {
        "missing": sorted(expected - actual),
        "extra": sorted(actual - expected),
    }


def required_subset(expected: set[str], actual: set[str]) -> dict[str, list[str]]:
    return {"missing": sorted(expected - actual), "extra": []}


def translated_snippet_contract(
    routes: set[str],
    declared_snippets: set[str],
) -> tuple[set[str], list[str]]:
    dependencies = route_snippet_dependencies(LOCALE, routes)
    required = dependencies | declared_snippets
    missing = sorted(rel for rel in required if not (LOCALE / rel).is_file())
    return dependencies, missing


def english_audio_binary_contract(
    expected_routes: set[str],
    locale_index: dict[str, Any],
) -> tuple[list[str], set[str]]:
    failures: list[str] = []
    required_files: set[str] = {"article_audio.yml"} if expected_routes else set()

    for route in sorted(expected_routes):
        entry = locale_index.get(route)
        if not isinstance(entry, dict):
            continue
        raw = str(entry.get("audio_file") or "").strip().lstrip("/")
        if not raw:
            failures.append(f"{route}: missing audio_file")
            continue
        if not raw.startswith("en/"):
            failures.append(f"{route}: audio_file must use the en/ namespace ({raw})")
            continue
        relative = raw.removeprefix("en/")
        if not relative or ".." in Path(relative).parts:
            failures.append(f"{route}: unsafe audio_file ({raw})")
            continue
        required_files.add(relative)
        if not (LOCALE / relative).is_file():
            failures.append(f"{route}: missing locales/en/{relative}")

    return failures, required_files


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--strict", action="store_true")
    parser.add_argument("--json", dest="json_path")
    args = parser.parse_args()

    data = manifest()
    status = str(data.get("status") or "").strip().lower()
    strict = args.strict or status == "complete"
    tool_map = tool_route_mapping()
    tool_reverse = {localized: canonical for canonical, localized in tool_map.items()}

    routes = expected_editorial_routes()
    videos = video_pages(routes)
    spanish_audio = load_mapping(SPANISH_AUDIO_INDEX)
    english_audio = load_mapping(LOCALE_AUDIO_INDEX)
    expected_audio = set(spanish_audio)
    actual_audio = set(english_audio)
    audio_binary_failures, required_audio_files = english_audio_binary_contract(
        expected_audio, english_audio
    )

    declared_routes = set(data.get("published_routes") or []) | set(tool_map)
    declared_snippets = set(data.get("required_snippets") or [])
    declared_files = set(data.get("published_files") or []) | tool_published_files()
    raw_existing_routes = {
        path.relative_to(LOCALE).as_posix()
        for path in LOCALE.rglob("*.md")
        if path.is_file()
    }
    existing_routes = {tool_reverse.get(route, route) for route in raw_existing_routes}
    localized_expected_routes = {tool_map.get(route, route) for route in routes}
    english_snippets, snippet_failures = translated_snippet_contract(
        localized_expected_routes, declared_snippets
    )

    es_cfg = MKDOCS_ES.read_text(encoding="utf-8")
    en_cfg = MKDOCS_EN.read_text(encoding="utf-8")
    expected_nav = {
        path
        for path in nav_paths(es_cfg)
        if (DOCS / path).is_file() or path in GENERATED_NAV_ROUTES
    }
    raw_actual_nav = nav_paths(en_cfg)
    actual_nav = {tool_reverse.get(route, route) for route in raw_actual_nav}
    es_js = javascript_paths(es_cfg)
    en_js = javascript_paths(en_cfg)
    en_video_pages = locale_video_pages(en_cfg)

    report: dict[str, Any] = {
        "status": status or "unknown",
        "strict": strict,
        "route_equivalents": tool_map,
        "expected": {
            "editorial_routes": len(routes),
            "nav_routes": len(expected_nav),
            "translated_snippet_dependencies": len(english_snippets),
            "video_articles": len(videos),
            "audio_articles": len(expected_audio),
            "canonical_javascript_modules": len(es_js),
        },
        "editorial_routes": compare(routes, existing_routes),
        "manifest_routes": compare(routes, declared_routes),
        "translated_snippets": {"missing": snippet_failures, "extra": []},
        "navigation": compare(expected_nav, actual_nav),
        "video_articles": required_subset(videos, en_video_pages),
        "javascript_modules": required_subset(es_js, en_js),
        "audio_articles": compare(expected_audio, actual_audio),
        "audio_binaries": {"missing": audio_binary_failures, "extra": []},
        "manifest_audio_files": {
            "missing": sorted(required_audio_files - declared_files),
            "extra": [],
        },
    }

    generated = data.get("generated_surfaces") or {}
    report["generated_surfaces"] = {
        "video_library": bool(generated.get("video_library")),
        "video_watch_pages": bool(generated.get("video_watch_pages")),
        "visual_hub": bool(generated.get("visual_hub")),
    }

    keys = (
        "editorial_routes",
        "manifest_routes",
        "translated_snippets",
        "navigation",
        "video_articles",
        "javascript_modules",
        "audio_articles",
        "audio_binaries",
        "manifest_audio_files",
    )
    deltas = sum(
        len(report[key].get("missing", [])) + len(report[key].get("extra", []))
        for key in keys
    )
    deltas += sum(1 for value in report["generated_surfaces"].values() if not value)
    report["delta_count"] = deltas

    print("English full-parity audit")
    print(f"  canonical editorial routes:       {len(routes)}")
    print(f"  explicit localized tool routes:   {len(tool_map)}")
    print(f"  canonical nav routes:             {len(expected_nav)}")
    print(f"  English snippet dependencies:     {len(english_snippets)}")
    print(f"  canonical video-bearing articles: {len(videos)}")
    print(f"  canonical audio-bearing articles: {len(expected_audio)}")
    print(f"  canonical JS runtime modules:     {len(es_js)}")
    print(f"  total parity delta:               {deltas}")

    for key in keys:
        missing = report[key]["missing"]
        extra = report[key]["extra"]
        if missing:
            preview = ", ".join(missing[:8])
            suffix = f" … +{len(missing) - 8}" if len(missing) > 8 else ""
            print(f"  missing {key}: {len(missing)} — {preview}{suffix}")
        if extra:
            preview = ", ".join(extra[:8])
            suffix = f" … +{len(extra) - 8}" if len(extra) > 8 else ""
            print(f"  extra {key}: {len(extra)} — {preview}{suffix}")

    if args.json_path:
        destination = Path(args.json_path)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

    if strict and deltas:
        print("English parity is not complete.", file=sys.stderr)
        return 1
    if not deltas:
        print("English parity is complete: zero canonical deltas.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
