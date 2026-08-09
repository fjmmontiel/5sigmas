#!/usr/bin/env python3
"""Fail when public media extensions do not match their binary format.

This catches a class of critical publication bugs that HTTP/content-type checks
cannot detect when a static server infers MIME type from the filename.
"""
from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"


def valid_signature(path: Path) -> bool:
    head = path.read_bytes()[:32]
    suffix = path.suffix.lower()
    if suffix in {".jpg", ".jpeg"}:
        return head.startswith(b"\xff\xd8\xff")
    if suffix == ".png":
        return head.startswith(b"\x89PNG\r\n\x1a\n")
    if suffix == ".mp4":
        return len(head) >= 12 and head[4:8] == b"ftyp"
    return True


def main() -> int:
    media = sorted(
        path for path in DOCS.rglob("*")
        if path.is_file() and path.suffix.lower() in {".jpg", ".jpeg", ".png", ".mp4"}
    )
    failures = [path.relative_to(ROOT).as_posix() for path in media if not valid_signature(path)]
    print(f"Media signature audit: {len(media)} files checked.")
    if failures:
        print("Extension/content mismatches:", file=sys.stderr)
        for failure in failures:
            print(f"  - {failure}", file=sys.stderr)
        return 1
    print("Media signature audit passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
