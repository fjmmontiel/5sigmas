#!/usr/bin/env python3
"""Remove terminal semicolons from Markdown bullets in published English routes.

This is a deliberately narrow remediation for a confirmed translation artifact.
It never changes prose, tables, code fences, front matter or non-published files.
The deeper question of whether a list should exist at all remains a human review
step handled by audit_english_editorial_quality.py review signals.
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
EN_ROOT = ROOT / "locales" / "en"
MANIFEST = EN_ROOT / "manifest.yml"
BULLET_RE = re.compile(r"^(?P<prefix>\s*[-*+]\s+)(?P<body>\S.*)$")
FENCE_RE = re.compile(r"^\s*(```|~~~)")
COMMENT_RE = re.compile(r"(?P<visible>.*?)(?P<comment>\s*<!--.*?-->\s*)$")


def routes() -> list[str]:
    data = yaml.safe_load(MANIFEST.read_text(encoding="utf-8")) or {}
    return sorted(
        str(route)
        for route in data.get("published_routes") or []
        if str(route).endswith(".md") and (EN_ROOT / str(route)).is_file()
    )


def clean(path: Path) -> int:
    lines = path.read_text(encoding="utf-8").splitlines(keepends=True)
    changed = 0
    in_frontmatter = bool(lines and lines[0].strip() == "---")
    in_fence = False

    for index, raw in enumerate(lines):
        newline = "\n" if raw.endswith("\n") else ""
        line = raw[:-1] if newline else raw

        if in_frontmatter:
            if index > 0 and line.strip() == "---":
                in_frontmatter = False
            continue
        if FENCE_RE.match(line):
            in_fence = not in_fence
            continue
        if in_fence:
            continue

        match = BULLET_RE.match(line)
        if not match:
            continue

        body = match.group("body")
        comment_match = COMMENT_RE.fullmatch(body)
        visible = comment_match.group("visible") if comment_match else body
        comment = comment_match.group("comment") if comment_match else ""
        stripped = visible.rstrip()
        if not stripped.endswith(";"):
            continue

        trailing_ws = visible[len(visible.rstrip()):]
        stripped = stripped[:-1].rstrip()
        lines[index] = f"{match.group('prefix')}{stripped}{trailing_ws}{comment}{newline}"
        changed += 1

    if changed:
        path.write_text("".join(lines), encoding="utf-8")
    return changed


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()

    total = 0
    touched: list[tuple[str, int]] = []
    for route in routes():
        path = EN_ROOT / route
        original = path.read_text(encoding="utf-8")
        count = clean(path)
        if count:
            touched.append((route, count))
            total += count
            if not args.write:
                path.write_text(original, encoding="utf-8")

    mode = "removed" if args.write else "would remove"
    print(f"{mode} {total} terminal semicolons across {len(touched)} routes")
    for route, count in touched:
        print(f"  {count:3} {route}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
