#!/usr/bin/env python3
"""Create an isolated MkDocs docs_dir for a 5sigmas locale.

Only locale-authored Markdown/HTML is published. Shared static assets are copied
from the canonical Spanish tree; untranslated prose and snippets are not copied.
"""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
LOCALES = ROOT / "locales"
BUILD = ROOT / ".locale-build"

SHARED_DIRS = ("assets", "stylesheets", "javascripts")
SHARED_ROOT_FILES = ("favicon.svg",)


def copy_non_text_media(src: Path, dst: Path) -> None:
    """Copy media required by translated pages without copying prose/snippets."""
    blocked_dirs = {"snippets"}
    blocked_suffixes = {".md", ".html", ".txt"}

    for path in src.rglob("*"):
        rel = path.relative_to(src)
        if any(part in blocked_dirs for part in rel.parts):
            continue
        if path.is_dir():
            continue
        if path.suffix.lower() in blocked_suffixes:
            continue
        target = dst / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, target)


def prepare(locale: str) -> Path:
    source = LOCALES / locale
    if not source.is_dir():
        raise SystemExit(f"Unknown locale source: {source}")

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

    # Preserve images/video/audio located next to articles.
    copy_non_text_media(DOCS, target)

    # Locale source wins and contains all publishable Markdown + translated HTML.
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
