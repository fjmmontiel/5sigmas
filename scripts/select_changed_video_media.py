#!/usr/bin/env python3
"""Select the manifest objects whose source files changed in a release."""
from __future__ import annotations

import argparse
import json
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--changed-files", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--all", action="store_true", dest="select_all")
    args = parser.parse_args()

    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    objects = list(manifest.get("objects") or [])

    changed: set[str] = set()
    if args.changed_files and args.changed_files.is_file():
        changed = {
            line.strip()
            for line in args.changed_files.read_text(encoding="utf-8").splitlines()
            if line.strip()
        }

    selected = objects if args.select_all else [item for item in objects if item.get("source") in changed]
    payload = {
        "version": 1,
        "mode": "all" if args.select_all else "changed",
        "object_count": len(selected),
        "total_bytes": sum(int(item.get("bytes") or 0) for item in selected),
        "objects": selected,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Selected {len(selected)}/{len(objects)} media objects ({payload['mode']}).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
