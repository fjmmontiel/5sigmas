#!/usr/bin/env python3
"""Create an isolated MkDocs docs_dir for a 5sigmas locale.

Locale builds are intentionally source-strict:
- only manifest-declared Markdown routes and translated snippets are publishable;
- shared global assets (CSS/JS/design system) come from ``docs``;
- article-adjacent images, video and audio are *not* inherited from Spanish;
- a canonical media file is shared only when the locale manifest explicitly lists
  it under ``shared_media``.

Draft translations may exist under ``locales/<locale>`` without entering the
MkDocs build until they are added to the manifest. This prevents both accidental
publication and strict-nav failures while a full locale is being mirrored.
"""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
LOCALES = ROOT / "locales"
BUILD = ROOT / ".locale-build"

SHARED_DIRS = ("assets", "stylesheets", "javascripts")
SHARED_ROOT_FILES = ("favicon.svg",)


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


def _copy_explicit_shared_media(locale: str, target: Path, manifest: dict) -> None:
    entries = manifest.get("shared_media") or []
    if not isinstance(entries, list):
        raise SystemExit(f"locales/{locale}/manifest.yml shared_media must be a list")

    for raw in entries:
        relative = _safe_relative(raw, field="shared_media", locale=locale)
        source = DOCS / relative
        if not source.is_file():
            raise SystemExit(f"Missing canonical shared media for {locale}: docs/{relative}")
        destination = target / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)


def _copy_declared_locale_files(locale: str, source: Path, target: Path, manifest: dict) -> None:
    groups = (
        ("published_routes", ".md"),
        ("required_snippets", ".html"),
    )
    seen: set[Path] = set()
    for field, expected_suffix in groups:
        entries = manifest.get(field) or []
        if not isinstance(entries, list):
            raise SystemExit(f"locales/{locale}/manifest.yml {field} must be a list")
        for raw in entries:
            relative = _safe_relative(raw, field=field, locale=locale)
            if expected_suffix and relative.suffix.lower() != expected_suffix:
                raise SystemExit(f"Unexpected {field} extension for {locale}: {relative}")
            if relative in seen:
                continue
            seen.add(relative)
            src = source / relative
            if not src.is_file():
                raise SystemExit(f"Manifest-declared locale file is missing: locales/{locale}/{relative}")
            dst = target / relative
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)

    # Optional locale-specific public files can be declared without expanding the
    # semantic route/snippet contracts above (for example captions or diagrams).
    extras = manifest.get("published_files") or []
    if not isinstance(extras, list):
        raise SystemExit(f"locales/{locale}/manifest.yml published_files must be a list")
    for raw in extras:
        relative = _safe_relative(raw, field="published_files", locale=locale)
        src = source / relative
        if not src.is_file():
            raise SystemExit(f"Manifest-declared locale file is missing: locales/{locale}/{relative}")
        dst = target / relative
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)


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
