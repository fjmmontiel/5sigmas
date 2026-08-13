#!/usr/bin/env python3
"""Create an isolated MkDocs docs_dir for a 5sigmas locale.

Locale builds are intentionally source-strict:
- Markdown and HTML must be authored under ``locales/<locale>``;
- shared global assets (CSS/JS/design system) come from ``docs``;
- article-adjacent images, video and audio are *not* inherited from Spanish;
- a canonical media file is shared only when the locale manifest explicitly lists
  it under ``shared_media``.

This prevents a translated page from silently serving Spanish-labelled posters,
Spanish MP4s or Spanish narration under a locale-prefixed URL.
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


def _copy_explicit_shared_media(locale: str, target: Path, manifest: dict) -> None:
    entries = manifest.get("shared_media") or []
    if not isinstance(entries, list):
        raise SystemExit(f"locales/{locale}/manifest.yml shared_media must be a list")

    for raw in entries:
        relative = Path(str(raw).strip().lstrip("/"))
        if not str(relative) or ".." in relative.parts:
            raise SystemExit(f"Unsafe shared_media entry for {locale}: {raw!r}")
        source = DOCS / relative
        if not source.is_file():
            raise SystemExit(f"Missing canonical shared media for {locale}: docs/{relative}")
        destination = target / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)


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

    # Locale source wins and contains all publishable Markdown, translated HTML
    # and all locale-specific media (posters, videos, audio, diagrams, etc.).
    shutil.copytree(source, target, dirs_exist_ok=True)
    return target


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--locale", required=True)
    args = parser.parse_args()
    target = prepare(args.locale)
    print(f"Prepared {args.locale}: {target.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
