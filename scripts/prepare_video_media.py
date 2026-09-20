#!/usr/bin/env python3
"""Validate and stage the public video media declared by 5sigmas articles.

The destination preserves every path relative to ``docs/``. That means a file
such as ``docs/series/modelos-razonadores/03-test-time-compute.mp4`` becomes the
R2 object ``series/modelos-razonadores/03-test-time-compute.mp4``. The MkDocs
video hooks use the same mapping when ``S5_VIDEO_MEDIA_ORIGIN`` is configured.
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
MKDOCS = ROOT / "mkdocs.yml"
REMOTE_URL = re.compile(r"^https?://", re.IGNORECASE)
DURATION = re.compile(r"^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$")


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


def local_asset(article: Path, raw_value: str) -> tuple[Path, Path]:
    value = raw_value.strip()
    if not value:
        raise ValueError("empty media path")
    candidate = (article.parent / value).resolve()
    try:
        relative = candidate.relative_to(DOCS.resolve())
    except ValueError as exc:
        raise ValueError(f"media path escapes docs/: {value}") from exc
    return candidate, relative


def content_type(path: Path) -> str:
    guessed, _ = mimetypes.guess_type(path.name)
    if guessed:
        return guessed
    return "application/octet-stream"


def add_object(
    *,
    article: Path,
    kind: str,
    value: str,
    objects: dict[str, dict[str, Any]],
    errors: list[str],
) -> str:
    if REMOTE_URL.match(value):
        return value

    try:
        source, relative = local_asset(article, value)
    except ValueError as exc:
        errors.append(f"{article.relative_to(ROOT)}: {kind}: {exc}")
        return ""

    key = relative.as_posix()
    if not source.is_file():
        errors.append(
            f"{article.relative_to(ROOT)}: missing {kind} file {relative.as_posix()}"
        )
        return key
    if source.stat().st_size == 0:
        errors.append(
            f"{article.relative_to(ROOT)}: empty {kind} file {relative.as_posix()}"
        )
        return key

    extension = source.suffix.lower()
    allowed = {
        "video": {".mp4"},
        "poster": {".jpg", ".jpeg", ".webp", ".png"},
        "captions": {".vtt"},
    }[kind]
    if extension not in allowed:
        errors.append(
            f"{article.relative_to(ROOT)}: unsupported {kind} extension {extension}"
        )

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


def collect() -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[str]]:
    errors: list[str] = []
    pages: list[dict[str, Any]] = []
    objects: dict[str, dict[str, Any]] = {}
    patterns = exclude_patterns()

    for article in sorted(DOCS.rglob("*.md")):
        if is_excluded(article, patterns):
            continue
        meta = read_frontmatter(article)
        video = str(meta.get("video") or "").strip()
        if not video or "noindex" in str(meta.get("robots") or "").lower():
            continue

        duration = str(meta.get("video_duration") or "").strip()
        if not DURATION.fullmatch(duration):
            errors.append(
                f"{article.relative_to(ROOT)}: video_duration must be ISO 8601, found {duration!r}"
            )

        poster = str(
            meta.get("video_poster")
            or Path(video).with_suffix(".jpg").name
        ).strip()
        captions = str(meta.get("video_captions") or "").strip()

        video_key = add_object(
            article=article,
            kind="video",
            value=video,
            objects=objects,
            errors=errors,
        )
        poster_key = add_object(
            article=article,
            kind="poster",
            value=poster,
            objects=objects,
            errors=errors,
        )
        captions_key = ""
        if captions:
            captions_key = add_object(
                article=article,
                kind="captions",
                value=captions,
                objects=objects,
                errors=errors,
            )

        pages.append(
            {
                "source": article.relative_to(DOCS).as_posix(),
                "title": str(meta.get("video_title") or meta.get("title") or "").strip(),
                "duration": duration,
                "video": video_key,
                "poster": poster_key,
                "captions": captions_key,
            }
        )

    if not pages:
        errors.append("no public article videos were discovered")

    return pages, sorted(objects.values(), key=lambda item: item["key"]), errors


def write_stage(
    output: Path,
    pages: list[dict[str, Any]],
    objects: list[dict[str, Any]],
) -> None:
    if output.exists():
        shutil.rmtree(output)
    media_dir = output / "media"
    media_dir.mkdir(parents=True, exist_ok=True)

    for item in objects:
        source = ROOT / item["source"]
        destination = media_dir / item["key"]
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)

    manifest = {
        "version": 1,
        "object_count": len(objects),
        "total_bytes": sum(item["bytes"] for item in objects),
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
    print(
        f"Validated {len(pages)} video pages and {len(objects)} media objects "
        f"({total_bytes / (1024 * 1024):.1f} MiB)."
    )

    if not args.check:
        output = args.output.resolve()
        write_stage(output, pages, objects)
        print(f"Staged media at {output}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
