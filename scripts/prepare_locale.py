#!/usr/bin/env python3
"""Create an isolated MkDocs docs_dir for a 5sigmas locale.

Locale builds are intentionally source-strict:
- only manifest-declared Markdown routes are publishable;
- translated snippets referenced by those published routes are staged automatically;
- ``required_snippets`` remains supported for explicit global/non-route dependencies;
- shared global assets (CSS/JS/design system) come from ``docs``;
- article-adjacent images, video and audio are *not* inherited from Spanish;
- a canonical media file is shared only when the locale manifest explicitly lists
  it under ``shared_media``;
- interactive tools may declare localized slugs in ``tools/locale-<locale>.yml``.

Draft translations may exist under ``locales/<locale>`` without entering the
MkDocs build until their route is declared. This prevents both accidental
publication and strict-nav failures while a full locale is mirrored.
"""

from __future__ import annotations

import argparse
import re
import shutil
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
LOCALES = ROOT / "locales"
BUILD = ROOT / ".locale-build"
TOOLS = ROOT / "tools"

SHARED_DIRS = ("assets", "stylesheets", "javascripts")
SHARED_ROOT_FILES = ("favicon.svg",)
INCLUDE_HTML_RE = re.compile(r"include_html\(\s*[\"']([^\"']+)[\"']", re.IGNORECASE)


def _manifest(locale: str) -> dict:
    path = LOCALES / locale / "manifest.yml"
    if not path.is_file():
        raise SystemExit(f"Locale has no manifest: {path}")
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    if not isinstance(data, dict):
        raise SystemExit(f"Locale manifest must be a mapping: {path}")
    return data


def _tool_manifest(locale: str) -> dict:
    path = TOOLS / f"locale-{locale}.yml"
    if not path.is_file():
        return {}
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    if not isinstance(data, dict):
        raise SystemExit(f"Tool locale manifest must be a mapping: {path}")
    declared = str(data.get("locale") or "").strip().lower()
    if declared and declared != locale:
        raise SystemExit(f"Tool locale manifest declares {declared!r}, expected {locale!r}: {path}")
    return data


def _safe_relative(raw: object, *, field: str, locale: str) -> Path:
    relative = Path(str(raw).strip().lstrip("/"))
    if not str(relative) or ".." in relative.parts or relative.is_absolute():
        raise SystemExit(f"Unsafe {field} entry for {locale}: {raw!r}")
    return relative


def _list_field(manifest: dict, field: str, locale: str) -> list[object]:
    entries = manifest.get(field) or []
    if not isinstance(entries, list):
        raise SystemExit(f"manifest {field} must be a list for {locale}")
    return entries


def _tool_routes(locale: str) -> list[Path]:
    data = _tool_manifest(locale)
    routes = data.get("routes") or []
    if not isinstance(routes, list):
        raise SystemExit(f"tools/locale-{locale}.yml routes must be a list")
    result: list[Path] = []
    canonical_seen: set[Path] = set()
    localized_seen: set[Path] = set()
    for entry in routes:
        if not isinstance(entry, dict):
            raise SystemExit(f"Invalid tool route entry for {locale}: {entry!r}")
        canonical = _safe_relative(entry.get("canonical"), field="tool canonical route", locale=locale)
        localized = _safe_relative(entry.get("localized"), field="tool localized route", locale=locale)
        if canonical.suffix.lower() != ".md" or localized.suffix.lower() != ".md":
            raise SystemExit(f"Tool routes must be Markdown for {locale}: {entry!r}")
        if canonical in canonical_seen or localized in localized_seen:
            raise SystemExit(f"Duplicate tool route mapping for {locale}: {entry!r}")
        canonical_seen.add(canonical)
        localized_seen.add(localized)
        result.append(localized)
    return result


def _published_routes(locale: str, manifest: dict) -> list[Path]:
    routes: list[Path] = []
    for raw in _list_field(manifest, "published_routes", locale):
        relative = _safe_relative(raw, field="published_routes", locale=locale)
        if relative.suffix.lower() != ".md":
            raise SystemExit(f"Unexpected published_routes extension for {locale}: {relative}")
        routes.append(relative)
    routes.extend(_tool_routes(locale))
    if len(routes) != len(set(routes)):
        raise SystemExit(f"Duplicate published route after tool expansion for {locale}")
    return routes


def _discover_route_snippets(locale: str, source: Path, manifest: dict) -> set[Path]:
    """Return translated HTML dependencies referenced by published Markdown."""
    result: set[Path] = set()
    for route in _published_routes(locale, manifest):
        path = source / route
        if not path.is_file():
            raise SystemExit(f"Declared locale file is missing: locales/{locale}/{route}")
        text = path.read_text(encoding="utf-8")
        for raw in INCLUDE_HTML_RE.findall(text):
            relative = _safe_relative(raw, field="route snippet", locale=locale)
            if relative.suffix.lower() != ".html":
                raise SystemExit(f"Unexpected route snippet extension for {locale}: {relative}")
            snippet = source / relative
            if not snippet.is_file():
                raise SystemExit(
                    f"Published locale route {route} references missing translated snippet: "
                    f"locales/{locale}/{relative}"
                )
            result.add(relative)
    return result


def _copy_explicit_shared_media(locale: str, target: Path, manifest: dict) -> None:
    for raw in _list_field(manifest, "shared_media", locale):
        relative = _safe_relative(raw, field="shared_media", locale=locale)
        source = DOCS / relative
        if not source.is_file():
            raise SystemExit(f"Missing canonical shared media for {locale}: docs/{relative}")
        destination = target / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)


def _copy_locale_file(locale: str, source: Path, target: Path, relative: Path, *, field: str) -> None:
    src = source / relative
    if not src.is_file():
        raise SystemExit(f"Manifest/dependency locale file is missing: locales/{locale}/{relative} ({field})")
    dst = target / relative
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)


def _copy_declared_locale_files(locale: str, source: Path, target: Path, manifest: dict) -> None:
    seen: set[Path] = set()

    for relative in _published_routes(locale, manifest):
        if relative not in seen:
            _copy_locale_file(locale, source, target, relative, field="published_routes/tool routes")
            seen.add(relative)

    for raw in _list_field(manifest, "required_snippets", locale):
        relative = _safe_relative(raw, field="required_snippets", locale=locale)
        if relative.suffix.lower() != ".html":
            raise SystemExit(f"Unexpected required_snippets extension for {locale}: {relative}")
        if relative not in seen:
            _copy_locale_file(locale, source, target, relative, field="required_snippets")
            seen.add(relative)

    for relative in sorted(_discover_route_snippets(locale, source, manifest)):
        if relative not in seen:
            _copy_locale_file(locale, source, target, relative, field="published route dependency")
            seen.add(relative)

    published_files = list(_list_field(manifest, "published_files", locale))
    tool_files = _tool_manifest(locale).get("published_files") or []
    if not isinstance(tool_files, list):
        raise SystemExit(f"tools/locale-{locale}.yml published_files must be a list")
    published_files.extend(tool_files)
    for raw in published_files:
        relative = _safe_relative(raw, field="published_files", locale=locale)
        if relative not in seen:
            _copy_locale_file(locale, source, target, relative, field="published_files")
            seen.add(relative)


def prepare(locale: str) -> Path:
    source = LOCALES / locale
    if not source.is_dir():
        raise SystemExit(f"Unknown locale source: {source}")
    manifest = _manifest(locale)

    target = BUILD / locale
    if target.exists():
        shutil.rmtree(target)
    target.mkdir(parents=True)

    for dirname in SHARED_DIRS:
        src = DOCS / dirname
        if src.exists():
            shutil.copytree(src, target / dirname)

    for filename in SHARED_ROOT_FILES:
        src = DOCS / filename
        if src.is_file():
            shutil.copy2(src, target / filename)

    _copy_explicit_shared_media(locale, target, manifest)
    _copy_declared_locale_files(locale, source, target, manifest)
    return target


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--locale", required=True)
    args = parser.parse_args()
    target = prepare(args.locale)
    print(f"Prepared {args.locale}: {target.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
