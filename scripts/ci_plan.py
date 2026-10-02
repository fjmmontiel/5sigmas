#!/usr/bin/env python3
"""Plan delegated CI workflows from changed files or a requested manual suite."""

from __future__ import annotations

import argparse
import fnmatch
import json
import os
from pathlib import Path


def matches(path: str, pattern: str) -> bool:
    candidates = {pattern}
    if "**/" in pattern:
        candidates.add(pattern.replace("**/", ""))
    return any(fnmatch.fnmatchcase(path, candidate) for candidate in candidates)


def select(manifest: dict, files: list[str], requested: str, draft: bool = False) -> list[str]:
    workflows = manifest["workflows"]
    if draft and requested == "auto":
        return []
    if requested in {"full", "all"}:
        return [item["id"] for item in workflows]
    if requested == "reader":
        requested = "core"
    if requested != "auto":
        suites = {"core", requested}
        if requested == "english":
            suites.add("locale")
        return [item["id"] for item in workflows if item.get("suite") in suites]

    selected: list[str] = []
    for item in workflows:
        own_workflow = item["workflow"]
        if own_workflow in files or any(matches(path, pattern) for path in files for pattern in item.get("paths", [])):
            selected.append(item["id"])
    return selected


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, default=Path("quality/ci-workflows.json"))
    parser.add_argument("--changed-files", type=Path)
    parser.add_argument("--suite", default=os.environ.get("DELEGATED_SUITE", "auto"))
    parser.add_argument("--draft", default=os.environ.get("IS_DRAFT", "false"))
    parser.add_argument("--github-output", type=Path, default=Path(os.environ["GITHUB_OUTPUT"]) if os.environ.get("GITHUB_OUTPUT") else None)
    args = parser.parse_args()

    manifest = json.loads(args.manifest.read_text())
    files = []
    if args.changed_files and args.changed_files.exists():
        files = [line.strip() for line in args.changed_files.read_text().splitlines() if line.strip()]
    selected = select(manifest, files, args.suite, args.draft.lower() == "true")
    payload = {"suite": args.suite, "changed_files": files, "selected": selected}
    print(json.dumps(payload, indent=2, sort_keys=True))

    if args.github_output:
        with args.github_output.open("a", encoding="utf-8") as handle:
            handle.write("selected=" + json.dumps(selected, separators=(",", ":")) + "\n")
            handle.write(f"selected_count={len(selected)}\n")


if __name__ == "__main__":
    main()
