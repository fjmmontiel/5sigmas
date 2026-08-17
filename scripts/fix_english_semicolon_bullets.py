#!/usr/bin/env python3
"""Remove confirmed mechanical punctuation artifacts from published English.

This remediation stays deliberately narrow. It removes terminal semicolons from
Markdown bullets, normalizes one confirmed comma-chained list, and rewrites the
three question-plus-colon bullets found by the editorial audit. It does not make
general prose changes; broader list fragmentation remains a human-review signal
in audit_english_editorial_quality.py.
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

EXACT_REPLACEMENTS: dict[str, dict[str, str]] = {
    "series/fundamentos-ia-iag/01-que-es-ia.md": {
        "- **What type of AI application is it?**: the family/technology it uses":
            "- **What type of AI application is it?** The family or technology it uses",
        "- **How does it learn?**: where the “teacher” comes from":
            "- **How does it learn?** Where the learning signal comes from",
        "- **How is it adjusted?**: how the model changes during training":
            "- **What changes during training?** Which parts of the model are adjusted",
    },
    "series/from-cave-to-agi/05-mas-alla.md": {
        "- Search and verification over solution spaces,":
            "- Search and verification over solution spaces",
        "- Selective memory during inference,":
            "- Selective memory during inference",
        "- Continual learning across multiple timescales,":
            "- Continual learning across multiple timescales",
        "- Internal models of environments,":
            "- Internal models of environments",
        "- Systems capable of perceiving and acting in the physical world.":
            "- Systems capable of perceiving and acting in the physical world",
    },
}


def routes() -> list[str]:
    data = yaml.safe_load(MANIFEST.read_text(encoding="utf-8")) or {}
    return sorted(
        str(route)
        for route in data.get("published_routes") or []
        if str(route).endswith(".md") and (EN_ROOT / str(route)).is_file()
    )


def clean_semicolon_bullets(path: Path) -> int:
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


def apply_exact_replacements(route: str, path: Path) -> int:
    replacements = EXACT_REPLACEMENTS.get(route)
    if not replacements:
        return 0

    text = path.read_text(encoding="utf-8")
    original = text
    changed = 0
    for old, new in replacements.items():
        if old in text:
            text = text.replace(old, new)
            changed += 1
    if text != original:
        path.write_text(text, encoding="utf-8")
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
        count = clean_semicolon_bullets(path) + apply_exact_replacements(route, path)
        if count:
            touched.append((route, count))
            total += count
            if not args.write:
                path.write_text(original, encoding="utf-8")

    mode = "fixed" if args.write else "would fix"
    print(f"{mode} {total} mechanical English editorial artifacts across {len(touched)} routes")
    for route, count in touched:
        print(f"  {count:3} {route}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
