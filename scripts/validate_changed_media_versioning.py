#!/usr/bin/env python3
"""Require cache-safe filenames when declared public video media changes.

Legacy media is grandfathered until it changes. Once a declared MP4/poster/caption
is modified, the filename must carry either a numeric version (``-v2``) or a
content-like hexadecimal suffix. This prevents an R2/CDN edge from serving stale
bytes under a mutable URL after a release.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

from prepare_video_media import collect

ROOT = Path(__file__).resolve().parents[1]
VERSIONED = re.compile(
    r"(?:-v\d+|-[0-9a-f]{8,64})\.(?:mp4|jpe?g|png|webp|vtt)$",
    re.IGNORECASE,
)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--changed-files", type=Path, required=True)
    args = parser.parse_args()

    if not args.changed_files.is_file():
        print("No changed-file list; media versioning gate skipped.")
        return 0

    changed = {
        line.strip()
        for line in args.changed_files.read_text(encoding="utf-8").splitlines()
        if line.strip()
    }
    _, objects, errors = collect()
    if errors:
        print("Cannot evaluate media versioning because declarations are invalid:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    declared = {item["source"]: item for item in objects}
    affected = [declared[path] for path in sorted(changed & declared.keys())]
    failures = [item for item in affected if not VERSIONED.search(Path(item["source"]).name)]

    if failures:
        print("Changed public video media must use a versioned/content-addressed filename:", file=sys.stderr)
        for item in failures:
            source = item["source"]
            path = Path(source)
            suggestion = f"{path.stem}-v2{path.suffix}"
            print(f"- {source} ({item['kind']}) -> rename, e.g. {suggestion}", file=sys.stderr)
        print(
            "Legacy filenames remain valid while unchanged; this gate applies only when their bytes change.",
            file=sys.stderr,
        )
        return 1

    print(f"Media versioning gate passed: {len(affected)} changed declared objects checked.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
