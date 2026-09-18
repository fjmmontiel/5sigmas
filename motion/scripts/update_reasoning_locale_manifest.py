#!/usr/bin/env python3
"""Ensure the English locale manifest publishes all v4 reasoning media."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "locales" / "en" / "manifest.yml"
SERIES = "series/modelos-razonadores"
STEMS = (
    "00_presentacion_serie",
    "01-que-es-razonar",
    "02-fallos",
    "03-test-time-compute",
    "04-latencia-streaming",
    "05-riesgos",
)


def main() -> None:
    text = MANIFEST.read_text(encoding="utf-8")
    marker = "published_files:\n"
    start = text.find(marker)
    if start < 0:
        raise SystemExit("English locale manifest has no published_files section")
    body_start = start + len(marker)
    next_key = re.search(r"(?m)^[A-Za-z_][A-Za-z0-9_-]*:\s*(?:\n|$)", text[body_start:])
    end = len(text) if not next_key else body_start + next_key.start()
    body = text[body_start:end]

    required = [f"{SERIES}/{stem}{ext}" for stem in STEMS for ext in (".mp4", ".jpg", ".vtt")]
    existing = set(re.findall(r"(?m)^  -\s+(.+?)\s*$", body))
    missing = [item for item in required if item not in existing]
    if missing:
        if body and not body.endswith("\n"):
            body += "\n"
        body += "".join(f"  - {item}\n" for item in missing)
        text = text[:body_start] + body + text[end:]
        MANIFEST.write_text(text, encoding="utf-8")

    # Re-read and enforce the exact contract; especially TTC, which previously
    # depended on a one-off Actions artifact instead of the locale tree.
    final = MANIFEST.read_text(encoding="utf-8")
    absent = [item for item in required if f"  - {item}" not in final]
    if absent:
        raise SystemExit(f"English reasoning media still absent from manifest: {absent}")
    print(f"English reasoning media manifest complete: {len(required)}/{len(required)} files")


if __name__ == "__main__":
    main()
