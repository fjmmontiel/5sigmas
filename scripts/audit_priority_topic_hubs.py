#!/usr/bin/env python3
"""Protect answer-first SEO/GEO topic hubs from silent publication drift."""

from __future__ import annotations

import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

import yaml


ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
SITE = ROOT / "site"
MKDOCS = ROOT / "mkdocs.yml"
TOPIC_INDEX = DOCS / "temas" / "index.md"
LLMS = DOCS / "llms.txt"
ORIGIN = "https://5sigmas.com"

PRIORITY_TOPICS = {
    "agentes-ia": "Qué es un agente de IA",
    "prompt-injection": "Qué es prompt injection",
}


def frontmatter(path: Path) -> dict[str, Any]:
    text = path.read_text(encoding="utf-8")
    match = re.match(r"\A---\s*\n(.*?)\n---\s*(?:\n|$)", text, re.DOTALL)
    if not match:
        return {}
    data = yaml.safe_load(match.group(1)) or {}
    return data if isinstance(data, dict) else {}


def sitemap_urls() -> set[str]:
    sitemap = SITE / "sitemap.xml"
    if not sitemap.is_file():
        return set()
    root = ET.parse(sitemap).getroot()
    return {
        (node.text or "").strip().rstrip("/") + "/"
        for node in root.findall(".//{*}loc")
        if (node.text or "").strip()
    }


def main() -> int:
    errors: list[str] = []
    nav = MKDOCS.read_text(encoding="utf-8")
    topic_index = TOPIC_INDEX.read_text(encoding="utf-8")
    llms = LLMS.read_text(encoding="utf-8")
    sitemap = sitemap_urls()

    for slug, label in PRIORITY_TOPICS.items():
        source = DOCS / "temas" / f"{slug}.md"
        if not source.is_file():
            errors.append(f"Missing priority topic source: temas/{slug}.md")
            continue

        meta = frontmatter(source)
        if "noindex" in str(meta.get("robots") or "").lower():
            errors.append(f"Priority topic is noindex: temas/{slug}.md")
        if not str(meta.get("description") or "").strip():
            errors.append(f"Priority topic has no meta description: temas/{slug}.md")
        if not str(meta.get("seo_title") or "").strip():
            errors.append(f"Priority topic has no seo_title: temas/{slug}.md")

        if f"temas/{slug}.md" not in nav:
            errors.append(f"Priority topic missing from MkDocs navigation: {slug}")
        if f'href="/temas/{slug}/"' not in topic_index:
            errors.append(f"Priority topic missing incoming link from /temas/: {slug}")

        markdown_url = f"{ORIGIN}/temas/{slug}/index.html.md"
        if markdown_url not in llms:
            errors.append(f"Priority topic missing from llms.txt: {slug}")

        html = SITE / "temas" / slug / "index.html"
        mirror = Path(f"{html}.md")
        canonical = f"{ORIGIN}/temas/{slug}/"
        if not html.is_file():
            errors.append(f"Priority topic was not built: {canonical}")
        if not mirror.is_file():
            errors.append(f"Priority topic has no Markdown mirror: {canonical}")
        if canonical not in sitemap:
            errors.append(f"Priority topic missing from sitemap: {canonical}")

        if html.is_file():
            rendered = html.read_text(encoding="utf-8", errors="replace")
            if re.search(r'<meta[^>]+name=["\']robots["\'][^>]+content=["\'][^"\']*noindex', rendered, re.I):
                errors.append(f"Built priority topic is noindex: {canonical}")
            if label.casefold() not in rendered.casefold():
                errors.append(f"Built priority topic does not expose expected answer intent {label!r}: {canonical}")

    print(f"Priority topic hubs: {len(PRIORITY_TOPICS)}")
    if errors:
        print("Priority topic hub contract violations:", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        return 1
    print("Priority topic hub audit passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
