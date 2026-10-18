#!/usr/bin/env python3
"""Behavioral regression: every Spanish concept route has an EN counterpart staged by the EN locale manifest.

Run from the repository with: python3 scripts/test_topic_locale_parity.py
No network/browser required; this does not certify deployed locale switching.
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPANISH = ROOT / "docs" / "temas"
ENGLISH = ROOT / "locales" / "en" / "temas"
MANIFEST = ROOT / "locales" / "en" / "manifest.yml"


def frontmatter(text: str) -> str:
    assert text.startswith("---\n"), "Missing YAML frontmatter"
    return text.split("---", 2)[1]


def main() -> None:
    assert SPANISH.is_dir() and ENGLISH.is_dir() and MANIFEST.is_file(), "Run in the 5sigmas repository"
    manifest = MANIFEST.read_text(encoding="utf-8")
    assert "published_routes:" in manifest and "required_snippets:" in manifest
    published = manifest.split("published_routes:", 1)[1].split("required_snippets:", 1)[0]
    declared = set(re.findall(r"(?m)^\s*-\s*(temas/[\w-]+\.md)\s*$", published))
    concept_files = sorted(x for x in SPANISH.glob("*.md") if x.name != "index.md")
    assert concept_files, "Missing source concepts"
    for es in concept_files:
        rel = f"temas/{es.name}"
        en = ENGLISH / es.name
        assert en.is_file(), f"Missing EN translation: locales/en/{rel}"
        assert rel in declared, f"Missing EN published route: {rel}"
        es_src = es.read_text(encoding="utf-8")
        en_src = en.read_text(encoding="utf-8")
        assert len(re.findall(r"(?m)^#\s+", en_src)) == 1, f"EN H1 count != 1: {rel}"
        assert len(re.findall(r"(?m)^##\s+", en_src)) >= 2, f"EN concept has no structure: {rel}"
        assert re.search(r"(?m)^description:\s*.+", frontmatter(en_src)), f"Missing EN metadata: {rel}"
        es_noindex = bool(re.search(r"(?m)^robots:\s*noindex\s*$", frontmatter(es_src)))
        en_noindex = bool(re.search(r"(?m)^robots:\s*noindex\s*$", frontmatter(en_src)))
        assert es_noindex == en_noindex, f"Robots parity mismatch: {rel}"
        for link in re.findall(r'href="(/series/[^\"]+)"', en_src):
            raise AssertionError(f"EN page links to ES series route: {rel}: {link}")
    print(f"PASS: {len(concept_files)} concept pairs, published-route and robots parity")


if __name__ == "__main__":
    main()
