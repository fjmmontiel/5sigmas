#!/usr/bin/env python3
"""Declare generated Context Engineering EN media as published locale files.

This is intentionally separate from generation so initial bootstrap and later
regeneration use the same locale-isolation contract as other native EN media.
"""
from __future__ import annotations

from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "locales/en/manifest.yml"
SERIES = "context-engineering-memory-mcp"
STEMS = (
    "01-context-engineering-vs-prompt-engineering",
    "02-context-budgets-prioritisation-compaction-provenance",
    "03-memory-architectures-working-episodic-semantic-persistent-state",
    "04-retrieval-context-assembly-freshness-relevance-conflict-grounding",
    "05-mcp-hosts-clients-servers-tools-resources-prompts-lifecycle-trust-boundaries",
    "06-skills-plugins-subagents-hooks-context-isolation-evaluation",
)


def main() -> int:
    raw = MANIFEST.read_text(encoding="utf-8")
    data = yaml.safe_load(raw) or {}
    published = data.get("published_files")
    if not isinstance(published, list):
        raise SystemExit("locales/en/manifest.yml published_files must be a list")

    required = [
        f"series/{SERIES}/{stem}.{ext}"
        for stem in STEMS
        for ext in ("mp4", "jpg")
    ]
    missing = [entry for entry in required if entry not in published]
    if not missing:
        print("PASS: Context EN media already declared in published_files")
        return 0

    # Preserve the hand-maintained manifest formatting/comments by inserting
    # under published_files rather than reserializing the complete YAML.
    lines = raw.splitlines()
    start = next((i for i, line in enumerate(lines) if line.strip() == "published_files:"), None)
    if start is None:
        raise SystemExit("published_files section missing")
    end = start + 1
    while end < len(lines):
        line = lines[end]
        if line and not line.startswith((" ", "\t")):
            break
        end += 1
    insertion = [f"  - {entry}" for entry in missing]
    lines[end:end] = insertion
    MANIFEST.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"PASS: declared {len(missing)} Context EN media files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
