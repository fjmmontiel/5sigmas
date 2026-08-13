#!/usr/bin/env python3
"""Run the search-foundation audit against a single-locale build in a multilingual site.

Material renders configured locale roots (for example ``/en/``) into the language
selector of every page. During the Spanish-only QA phase those routes are not built
yet, even though the production workflow builds them into the final Pages artifact.

This wrapper stages *only* configured alternate-locale roots after proving that each
locale has a manifest, runs the existing strict audit unchanged, then removes the
staged markers. Arbitrary missing internal links therefore still fail normally.
"""

from __future__ import annotations

import shutil
from pathlib import Path
from urllib.parse import urlsplit

import yaml

import audit_search_foundation

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "mkdocs.yml"
SITE = ROOT / "site"
CURRENT_LANGUAGE = "es"


def _configured_alternate_roots() -> list[tuple[str, str]]:
    config = yaml.safe_load(CONFIG.read_text(encoding="utf-8")) or {}
    alternates = (config.get("extra") or {}).get("alternate") or []
    roots: list[tuple[str, str]] = []

    for item in alternates:
        if not isinstance(item, dict):
            raise AssertionError(f"Invalid extra.alternate entry: {item!r}")
        lang = str(item.get("lang", "")).strip().lower()
        link = str(item.get("link", "")).strip()
        if not lang or not link or lang == CURRENT_LANGUAGE:
            continue

        parsed = urlsplit(link)
        if parsed.scheme or parsed.netloc:
            if parsed.netloc.lower() != "5sigmas.com":
                raise AssertionError(f"Locale {lang} points off-site: {link}")
        path = parsed.path or "/"
        if not path.startswith("/") or ".." in Path(path).parts:
            raise AssertionError(f"Unsafe locale root for {lang}: {link}")

        expected = f"/{lang}/"
        normalized = "/" + path.strip("/") + "/"
        if normalized != expected:
            raise AssertionError(
                f"Locale {lang} must use its root {expected}; configured {link}"
            )
        manifest = ROOT / "locales" / lang / "manifest.yml"
        if not manifest.is_file():
            raise AssertionError(
                f"Configured locale {lang} has no manifest: {manifest.relative_to(ROOT)}"
            )
        roots.append((lang, normalized))

    return roots


def main() -> int:
    created_roots: list[Path] = []
    try:
        for lang, root in _configured_alternate_roots():
            locale_dir = SITE / root.strip("/")
            target = locale_dir / "index.html"
            if target.exists():
                continue
            locale_dir.mkdir(parents=True, exist_ok=True)
            target.write_text(
                "<!doctype html><html><head><meta charset=\"utf-8\">"
                f"<title>{lang} locale deployment contract</title></head><body></body></html>",
                encoding="utf-8",
            )
            created_roots.append(locale_dir)

        return audit_search_foundation.main()
    finally:
        for root in reversed(created_roots):
            shutil.rmtree(root, ignore_errors=True)


if __name__ == "__main__":
    raise SystemExit(main())
