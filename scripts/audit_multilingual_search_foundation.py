#!/usr/bin/env python3
"""Run strict Spanish search QA against the final multilingual route contract.

The Spanish site is built first in CI, while alternate locales are added later to the
same ``site/`` tree. Route-aware language links therefore reference valid future
locale pages that do not exist yet at the moment the Spanish search audit runs.

This wrapper stages routes explicitly declared in the locale editorial manifest and
the interactive-tools locale contract, runs the strict search audit plus the
canonical priority-topic contract, then removes the staged markers. Arbitrary
missing internal links still fail normally.
"""

from __future__ import annotations

from pathlib import Path
from urllib.parse import urlsplit

import yaml

import audit_priority_topic_hubs
import audit_search_foundation

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "mkdocs.yml"
SITE = ROOT / "site"
CURRENT_LANGUAGE = "es"


def _load_extra_block() -> dict:
    lines = CONFIG.read_text(encoding="utf-8").splitlines()
    try:
        start = next(
            index
            for index, line in enumerate(lines)
            if line.strip() == "extra:" and not line.startswith(" ")
        )
    except StopIteration as exc:
        raise AssertionError("mkdocs.yml has no top-level extra block") from exc

    block = [lines[start]]
    for line in lines[start + 1 :]:
        if line and not line[0].isspace():
            break
        block.append(line)

    parsed = yaml.safe_load("\n".join(block)) or {}
    extra = parsed.get("extra") or {}
    if not isinstance(extra, dict):
        raise AssertionError("mkdocs.yml extra block must be a mapping")
    return extra


def _load_manifest(locale: str) -> dict:
    manifest = ROOT / "locales" / locale / "manifest.yml"
    if not manifest.is_file():
        raise AssertionError(
            f"Configured locale {locale} has no manifest: {manifest.relative_to(ROOT)}"
        )
    data = yaml.safe_load(manifest.read_text(encoding="utf-8")) or {}
    if not isinstance(data, dict):
        raise AssertionError(f"Locale manifest must be a mapping: {manifest.relative_to(ROOT)}")
    return data


def _configured_alternates() -> list[tuple[str, str, dict]]:
    alternates = _load_extra_block().get("alternate") or []
    if not isinstance(alternates, list):
        raise AssertionError("extra.alternate must be a list")

    configured: list[tuple[str, str, dict]] = []
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

        configured.append((lang, normalized, _load_manifest(lang)))

    return configured


def _tool_localized_routes(locale: str) -> list[str]:
    path = ROOT / "tools" / f"locale-{locale}.yml"
    if not path.is_file():
        return []
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    if not isinstance(data, dict):
        raise AssertionError(f"Tool locale manifest must be a mapping: {path.relative_to(ROOT)}")
    routes = data.get("routes") or []
    if not isinstance(routes, list):
        raise AssertionError(f"{path.relative_to(ROOT)} routes must be a list")
    result: list[str] = []
    for entry in routes:
        if not isinstance(entry, dict):
            raise AssertionError(f"Invalid tool route entry in {path.relative_to(ROOT)}: {entry!r}")
        localized = str(entry.get("localized") or "").strip().lstrip("/")
        if not localized or ".." in Path(localized).parts or not localized.endswith(".md"):
            raise AssertionError(f"Unsafe localized tool route: {entry!r}")
        source = ROOT / "locales" / locale / localized
        if not source.is_file():
            raise AssertionError(f"Tool locale route has no source: locales/{locale}/{localized}")
        result.append(localized)
    return result


def _published_source_routes(locale: str, manifest: dict) -> list[str]:
    routes = manifest.get("published_routes") or []
    if not isinstance(routes, list):
        raise AssertionError(f"locales/{locale}/manifest.yml published_routes must be a list")

    normalized: list[str] = []
    for raw in routes:
        src = str(raw).strip().lstrip("/")
        if not src or ".." in Path(src).parts or not src.endswith(".md"):
            raise AssertionError(f"Unsafe published route in locales/{locale}/manifest.yml: {raw!r}")
        source = ROOT / "locales" / locale / src
        if not source.is_file():
            raise AssertionError(
                f"Manifest-published route has no locale source: locales/{locale}/{src}"
            )
        normalized.append(src)
    normalized.extend(_tool_localized_routes(locale))
    if len(normalized) != len(set(normalized)):
        raise AssertionError(f"Duplicate locale route after tool expansion: {locale}")
    return normalized


def _site_target(locale: str, source_path: str) -> Path:
    source = Path(source_path)
    if source.name == "index.md":
        relative = source.parent
    else:
        relative = source.with_suffix("")
    return SITE / locale / relative / "index.html"


def _stage_manifest_routes() -> list[Path]:
    created_files: list[Path] = []
    for lang, _root, manifest in _configured_alternates():
        for source_path in _published_source_routes(lang, manifest):
            target = _site_target(lang, source_path)
            if target.exists():
                continue
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(
                "<!doctype html><html><head><meta charset=\"utf-8\">"
                f"<title>{lang} locale deployment contract</title></head><body></body></html>",
                encoding="utf-8",
            )
            created_files.append(target)
    return created_files


def _cleanup_staged_routes(created_files: list[Path]) -> None:
    for target in reversed(created_files):
        target.unlink(missing_ok=True)

    parents = sorted(
        {parent for target in created_files for parent in target.parents if SITE in parent.parents or parent == SITE},
        key=lambda path: len(path.parts),
        reverse=True,
    )
    for directory in parents:
        if directory == SITE:
            continue
        try:
            directory.rmdir()
        except OSError:
            pass


def main() -> int:
    created_files = _stage_manifest_routes()
    try:
        search_result = audit_search_foundation.main()
        if search_result:
            return search_result
        return audit_priority_topic_hubs.main()
    finally:
        _cleanup_staged_routes(created_files)


if __name__ == "__main__":
    raise SystemExit(main())
