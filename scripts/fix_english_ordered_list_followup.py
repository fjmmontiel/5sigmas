#!/usr/bin/env python3
"""Apply reviewed ordered-list punctuation fixes for PR #213.

This script is intentionally narrow. It does not rewrite prose generically; it
only removes confirmed semicolon chaining from ordered fragment lists that were
reviewed against the canonical Spanish route.
"""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EN_ROOT = ROOT / "locales" / "en"

REPLACEMENTS: dict[str, dict[str, str]] = {
    "temas/llms.md": {
        "1. the real input distribution;": "1. the real input distribution",
        "2. the minimum acceptable quality;": "2. the minimum acceptable quality",
        "3. costly failure modes;": "3. costly failure modes",
        "4. latency to a usable output;": "4. latency to a usable output",
        "5. total system cost;": "5. total system cost",
        "6. stability under paraphrases;": "6. stability under paraphrases",
        "7. correctness of tools and retrieved data.": "7. correctness of tools and retrieved data",
    },
}


def main() -> int:
    changed = 0
    for route, replacements in REPLACEMENTS.items():
        path = EN_ROOT / route
        text = path.read_text(encoding="utf-8")
        original = text
        for old, new in replacements.items():
            if old in text:
                text = text.replace(old, new)
                changed += 1
        if text != original:
            path.write_text(text, encoding="utf-8")
    print(f"fixed {changed} reviewed ordered-list punctuation artifacts")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
