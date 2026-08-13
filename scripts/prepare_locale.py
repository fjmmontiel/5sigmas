#!/usr/bin/env python3
"""Create an isolated MkDocs docs_dir for a 5sigmas locale.

Locale builds are intentionally source-strict:
- only manifest-declared Markdown routes are publishable;
- translated snippets referenced by those published routes are staged automatically;
- ``required_snippets`` remains supported for explicit global/non-route dependencies;
- shared global assets (CSS/JS/design system) come from ``docs``;
- article-adjacent images, video and audio are *not* inherited from Spanish;
- a canonical media file is shared only when the locale manifest explicitly lists
  it under ``shared_media``.

Draft translations may exist under ``locales/<locale>`` without entering the
MkDocs build until their route is added to the manifest. This prevents both
accidental publication and strict-nav failures while a full locale is mirrored.
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


def _safe_relative(raw: object, *, field: str, locale: str) -> Path:
    relative = Path(str(raw).strip().lstrip("/"))
    if not str(relative) or ".." in relative.parts or relative.is_absolute():
        raise SystemExit(f"Unsafe {field} entry for {locale}: {raw!r}")
    return relative


def _list_field(manifest: dict, field: str, locale: str) -> list[object]:
    entries = manifest.get(field) or []
    if not isinstance(entries, list):
        raise SystemExit(f"locales/{locale}/manifest.yml {field} must be a list")
    return entries


def _published_routes(locale: str, manifest: dict) -> list[Path]:
    routes: list[Path] = []
    for raw in _list_field(manifest, "published_routes", locale):
        relative = _safe_relative(raw, field="published_routes", locale=locale)
        if relative.suffix.lower() != ".md":
            raise SystemExit(f"Unexpected published_routes extension for {locale}: {relative}")
        routes.append(relative)
    return routes


def _discover_route_snippets(locale: str, source: Path, manifest: dict) -> set[Path]:
    """Return translated HTML dependencies referenced by published Markdown.

    The published route remains the publication authority. A draft route cannot
    pull snippets into the build because it is never scanned. Every discovered
    dependency must exist in the locale source; Spanish fallback is impossible.
    """
    result: set[Path] = set()
    for route in _published_routes(locale, manifest):
        path = source / route
        if not path.is_file():
            raise SystemExit(f"Manifest-declared locale file is missing: locales/{locale}/{route}")
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
            _copy_locale_file(locale, source, target, relative, field="published_routes")
            seen.add(relative)

    # Explicit snippets remain useful for dependencies that do not originate in
    # a published Markdown route. Route-local dependencies are discovered below.
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

    for raw in _list_field(manifest, "published_files", locale):
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

    # The design/runtime layer is shared. Content-bearing media is not.
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
