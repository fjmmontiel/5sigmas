#!/usr/bin/env python3
"""Validate and stage all public 5sigmas video media for same-origin/R2 delivery.

Spanish media is declared in article frontmatter under ``docs/``. Locale media
is declared explicitly in ``locales/<locale>/media.yml`` and must also be listed
in the locale manifest's ``published_files`` so the same binaries are available
for the same-origin fallback. Object keys mirror the URLs produced by
``hooks/video_embed.py``: Spanish uses ``series/...`` and locales use a prefix
such as ``en/series/...``.
"""

from __future__ import annotations

import argparse
import fnmatch
import hashlib
import json
import mimetypes
import re
import shutil
import sys
from pathlib import Path
from typing import Any

import yaml

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
LOCALES = ROOT / "locales"
MKDOCS = ROOT / "mkdocs.yml"
REMOTE_URL = re.compile(r"^https?://", re.IGNORECASE)
DURATION = re.compile(r"^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$")


def load_mapping(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    return data if isinstance(data, dict) else {}


def read_frontmatter(path: Path) -> dict[str, Any]:
    text = path.read_text(encoding="utf-8")
    match = re.match(r"\A---\s*\n(.*?)\n---\s*(?:\n|$)", text, re.DOTALL)
    if not match:
        return {}
    data = yaml.safe_load(match.group(1)) or {}
    return data if isinstance(data, dict) else {}


def exclude_patterns() -> list[str]:
    patterns: list[str] = []
    collecting = False
    for line in MKDOCS.read_text(encoding="utf-8").splitlines():
        if not collecting:
            collecting = line.startswith("exclude_docs: |")
            continue
        if line and not line.startswith("  "):
            break
        pattern = line.strip()
        if pattern:
            patterns.append(pattern)
    return patterns


def is_excluded(path: Path, patterns: list[str]) -> bool:
    relative = path.relative_to(DOCS).as_posix()
    return any(fnmatch.fnmatch(relative, pattern) for pattern in patterns)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def content_type(path: Path) -> str:
    guessed, _ = mimetypes.guess_type(path.name)
    return guessed or "application/octet-stream"


def local_asset(asset_root: Path, article: Path, raw_value: str) -> tuple[Path, Path]:
    value = raw_value.strip()
    if not value:
        raise ValueError("empty media path")
    candidate = (article.parent / value).resolve()
    try:
        relative = candidate.relative_to(asset_root.resolve())
    except ValueError as exc:
        raise ValueError(f"media path escapes {asset_root.relative_to(ROOT)}/: {value}") from exc
    return candidate, relative


def add_object(
    *,
    asset_root: Path,
    article: Path,
    kind: str,
    value: str,
    key_prefix: str,
    objects: dict[str, dict[str, Any]],
    errors: list[str],
    published_files: set[str] | None = None,
) -> str:
    if REMOTE_URL.match(value):
        return value

    try:
        source, relative = local_asset(asset_root, article, value)
    except ValueError as exc:
        errors.append(f"{article.relative_to(ROOT)}: {kind}: {exc}")
        return ""

    relative_key = relative.as_posix()
    key = f"{key_prefix}{relative_key}"
    if not source.is_file():
        errors.append(f"{article.relative_to(ROOT)}: missing {kind} file {relative_key}")
        return key
    if source.stat().st_size == 0:
        errors.append(f"{article.relative_to(ROOT)}: empty {kind} file {relative_key}")
        return key
    if published_files is not None and relative_key not in published_files:
        errors.append(
            f"{article.relative_to(ROOT)}: {kind} {relative_key} is not listed in locale manifest published_files"
        )

    extension = source.suffix.lower()
    allowed = {
        "video": {".mp4"},
        "poster": {".jpg", ".jpeg", ".webp", ".png"},
        "captions": {".vtt"},
    }[kind]
    if extension not in allowed:
        errors.append(f"{article.relative_to(ROOT)}: unsupported {kind} extension {extension}")

    record = {
        "key": key,
        "kind": kind,
        "source": source.relative_to(ROOT).as_posix(),
        "bytes": source.stat().st_size,
        "sha256": sha256(source),
        "content_type": content_type(source),
    }
    existing = objects.get(key)
    if existing and existing["sha256"] != record["sha256"]:
        errors.append(f"conflicting media objects resolve to the same R2 key: {key}")
    else:
        objects[key] = record
    return key


def append_page(
    *,
    locale: str,
    article: Path,
    asset_root: Path,
    meta: dict[str, Any],
    key_prefix: str,
    pages: list[dict[str, Any]],
    objects: dict[str, dict[str, Any]],
    errors: list[str],
    published_files: set[str] | None = None,
) -> None:
    video = str(meta.get("video") or "").strip()
    if not video:
        return
    duration = str(meta.get("video_duration") or "").strip()
    if not DURATION.fullmatch(duration):
        errors.append(
            f"{article.relative_to(ROOT)}: video_duration must be ISO 8601, found {duration!r}"
        )
    poster = str(meta.get("video_poster") or Path(video).with_suffix(".jpg").name).strip()
    captions = str(meta.get("video_captions") or "").strip()

    video_key = add_object(
        asset_root=asset_root,
        article=article,
        kind="video",
        value=video,
        key_prefix=key_prefix,
        objects=objects,
        errors=errors,
        published_files=published_files,
    )
    poster_key = add_object(
        asset_root=asset_root,
        article=article,
        kind="poster",
        value=poster,
        key_prefix=key_prefix,
        objects=objects,
        errors=errors,
        published_files=published_files,
    )
    captions_key = ""
    if captions:
        captions_key = add_object(
            asset_root=asset_root,
            article=article,
            kind="captions",
            value=captions,
            key_prefix=key_prefix,
            objects=objects,
            errors=errors,
            published_files=published_files,
        )

    pages.append(
        {
            "locale": locale,
            "source": article.relative_to(asset_root).as_posix(),
            "title": str(meta.get("video_title") or meta.get("title") or "").strip(),
            "duration": duration,
            "video": video_key,
            "poster": poster_key,
            "captions": captions_key,
        }
    )


def collect_spanish(
    pages: list[dict[str, Any]],
    objects: dict[str, dict[str, Any]],
    errors: list[str],
) -> None:
    patterns = exclude_patterns()
    for article in sorted(DOCS.rglob("*.md")):
        if is_excluded(article, patterns):
            continue
        meta = read_frontmatter(article)
        if not str(meta.get("video") or "").strip():
            continue
        if "noindex" in str(meta.get("robots") or "").lower():
            continue
        append_page(
            locale="es",
            article=article,
            asset_root=DOCS,
            meta=meta,
            key_prefix="",
            pages=pages,
            objects=objects,
            errors=errors,
        )


def collect_locales(
    pages: list[dict[str, Any]],
    objects: dict[str, dict[str, Any]],
    errors: list[str],
) -> None:
    if not LOCALES.is_dir():
        return
    for locale_root in sorted(path for path in LOCALES.iterdir() if path.is_dir()):
        locale = locale_root.name.strip().lower()
        media_path = locale_root / "media.yml"
        manifest_path = locale_root / "manifest.yml"
        if not media_path.is_file() or not manifest_path.is_file():
            continue
        media = load_mapping(media_path)
        manifest = load_mapping(manifest_path)
        routes = {str(item) for item in (manifest.get("published_routes") or [])}
        published_files = {str(item) for item in (manifest.get("published_files") or [])}

        for route, meta in sorted(media.items()):
            if route not in routes or not isinstance(meta, dict):
                continue
            if not str(meta.get("video") or "").strip():
                continue
            article = locale_root / route
            if not article.is_file():
                errors.append(f"{media_path.relative_to(ROOT)}: declared route is missing: {route}")
                continue
            append_page(
                locale=locale,
                article=article,
                asset_root=locale_root,
                meta=meta,
                key_prefix=f"{locale}/",
                pages=pages,
                objects=objects,
                errors=errors,
                published_files=published_files,
            )


def collect() -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[str]]:
    errors: list[str] = []
    pages: list[dict[str, Any]] = []
    objects: dict[str, dict[str, Any]] = {}
    collect_spanish(pages, objects, errors)
    collect_locales(pages, objects, errors)
    if not pages:
        errors.append("no public article videos were discovered")
    return pages, sorted(objects.values(), key=lambda item: item["key"]), errors


def write_stage(output: Path, pages: list[dict[str, Any]], objects: list[dict[str, Any]]) -> None:
    if output.exists():
        shutil.rmtree(output)
    media_dir = output / "media"
    media_dir.mkdir(parents=True, exist_ok=True)

    for item in objects:
        source = ROOT / item["source"]
        destination = media_dir / item["key"]
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)

    locale_counts: dict[str, int] = {}
    for page in pages:
        locale_counts[page["locale"]] = locale_counts.get(page["locale"], 0) + 1
    manifest = {
        "version": 2,
        "object_count": len(objects),
        "total_bytes": sum(item["bytes"] for item in objects),
        "locale_page_counts": locale_counts,
        "pages": pages,
        "objects": objects,
    }
    (output / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / ".video-media",
        help="Staging directory (default: .video-media)",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Validate declarations without copying media",
    )
    args = parser.parse_args()

    pages, objects, errors = collect()
    if errors:
        print("Video media preparation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    total_bytes = sum(item["bytes"] for item in objects)
    locale_counts: dict[str, int] = {}
    for page in pages:
        locale_counts[page["locale"]] = locale_counts.get(page["locale"], 0) + 1
    locale_summary = ", ".join(f"{key}={value}" for key, value in sorted(locale_counts.items()))
    print(
        f"Validated {len(pages)} video pages ({locale_summary}) and {len(objects)} media objects "
        f"({total_bytes / (1024 * 1024):.1f} MiB)."
    )

    if not args.check:
        output = args.output.resolve()
        write_stage(output, pages, objects)
        print(f"Staged media at {output}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
