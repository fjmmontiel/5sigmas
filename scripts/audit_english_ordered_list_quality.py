#!/usr/bin/env python3
"""Audit ordered-list punctuation in published English editorial routes.

This complements audit_english_editorial_quality.py. Mechanical Spanish-style
semicolon punctuation can also survive in Markdown ordered lists, so every
published English route is checked for ordered items ending in `;`.

Code fences and front matter are ignored. A semicolon-terminated ordered item is
a hard error: rewrite the item as a natural English fragment or sentence rather
than using punctuation to chain separate list items.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import asdict, dataclass
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
EN_ROOT = ROOT / "locales" / "en"
MANIFEST = EN_ROOT / "manifest.yml"
ORDERED_RE = re.compile(r"^(?P<indent>\s*)\d+[.)]\s+(?P<body>\S.*)$")
FENCE_RE = re.compile(r"^\s*(```|~~~)")


@dataclass(frozen=True)
class Finding:
    route: str
    line: int
    excerpt: str


def published_routes() -> list[str]:
    data = yaml.safe_load(MANIFEST.read_text(encoding="utf-8")) or {}
    return sorted(
        str(route)
        for route in data.get("published_routes") or []
        if str(route).endswith(".md") and (EN_ROOT / str(route)).is_file()
    )


def visible_body(body: str) -> str:
    return re.sub(r"\s*<!--.*?-->\s*$", "", body).rstrip()


def scan(route: str) -> list[Finding]:
    path = EN_ROOT / route
    lines = path.read_text(encoding="utf-8").splitlines()
    in_frontmatter = bool(lines and lines[0].strip() == "---")
    in_fence = False
    findings: list[Finding] = []

    for line_no, line in enumerate(lines, start=1):
        if in_frontmatter:
            if line_no > 1 and line.strip() == "---":
                in_frontmatter = False
            continue
        if FENCE_RE.match(line):
            in_fence = not in_fence
            continue
        if in_fence:
            continue

        match = ORDERED_RE.match(line)
        if not match:
            continue
        body = visible_body(match.group("body"))
        if body.endswith(";"):
            findings.append(Finding(route, line_no, body[:300]))
    return findings


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", dest="json_path")
    ap.add_argument("--strict", action="store_true")
    args = ap.parse_args()

    routes = published_routes()
    findings = [finding for route in routes for finding in scan(route)]

    print("English ordered-list editorial audit")
    print(f"  published Markdown routes: {len(routes)}")
    print(f"  hard errors:               {len(findings)}")
    for item in findings:
        print(f"ERROR semicolon_terminated_ordered_item {item.route}:{item.line} — {item.excerpt}")

    if args.json_path:
        output = Path(args.json_path)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(
            json.dumps(
                {
                    "published_markdown_routes": len(routes),
                    "hard_error_count": len(findings),
                    "findings": [asdict(item) for item in findings],
                },
                ensure_ascii=False,
                indent=2,
            ) + "\n",
            encoding="utf-8",
        )

    if args.strict and findings:
        print("English ordered lists contain mechanical semicolon punctuation.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
