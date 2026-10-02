#!/usr/bin/env python3
from __future__ import annotations

import argparse
import fnmatch
import json
from pathlib import Path


def _matches(path: str, pattern: str) -> bool:
    candidates = {pattern}
    if "**/" in pattern:
        candidates.add(pattern.replace("**/", ""))
    return any(fnmatch.fnmatchcase(path, candidate) for candidate in candidates)


def select(manifest: dict, changed: list[str], suite: str, draft: bool) -> list[str]:
    workflows = manifest["workflows"]
    if draft and suite == "changed":
        return []
    if suite == "all":
        return [item["id"] for item in workflows]
    if suite != "changed":
        return [
            item["id"] for item in workflows
            if item.get("suite") in {"core", suite}
        ]
    selected = []
    for item in workflows:
        if any(_matches(path, pattern) for path in changed for pattern in item.get("paths", [])):
            selected.append(item["id"])
    return selected


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--manifest", type=Path, required=True)
    p.add_argument("--changed-files", type=Path)
    p.add_argument("--suite", default="changed")
    p.add_argument("--draft", default="false")
    p.add_argument("--github-output", type=Path)
    args = p.parse_args()

    manifest = json.loads(args.manifest.read_text())
    changed = []
    if args.changed_files and args.changed_files.exists():
        changed = [line.strip() for line in args.changed_files.read_text().splitlines() if line.strip()]
    selected = select(manifest, changed, args.suite, args.draft.lower() == "true")
    payload = json.dumps(selected, separators=(",", ":"))

    print(json.dumps({"suite": args.suite, "changed_files": len(changed), "selected": selected}, indent=2))
    if args.github_output:
        with args.github_output.open("a") as fh:
            fh.write(f"selected={payload}\n")
            fh.write(f"selected_count={len(selected)}\n")


if __name__ == "__main__":
    main()
