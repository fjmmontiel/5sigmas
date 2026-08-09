#!/usr/bin/env python3
"""Fail CI when public editorial state drifts from the built site.

The contract is intentionally derived from the repository rather than a hardcoded
series count. Any directory under ``docs/series`` with a
``00_presentacion_serie.md`` is considered public unless its presentation
explicitly declares ``publication_status: draft|hidden|wip`` or ``robots:
noindex``.

For every public series we require consistency across:
- source discovery and chapter files;
- MkDocs exclusions and navigation;
- the /series/ catalogue;
- llms.txt / Markdown discovery;
- JSON-LD section naming;
- short /series/<slug>/ redirect;
- the strict MkDocs build, sitemap and Markdown mirrors.

This catches the dangerous class of incident where content is merged and marked
complete but silently remains excluded, unlinked or undiscoverable.
"""

from __future__ import annotations

import ast
import re
import sys
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml


ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
SERIES_ROOT = DOCS / "series"
SITE = ROOT / "site"
MKDOCS = ROOT / "mkdocs.yml"
CATALOGUE = SERIES_ROOT / "index.md"
LLMS = DOCS / "llms.txt"
JSONLD_HOOK = ROOT / "hooks" / "jsonld_article.py"
ORIGIN = "https://5sigmas.com"
PRESENTATION = "00_presentacion_serie.md"
NON_PUBLIC_STATES = {"draft", "hidden", "wip", "private"}


@dataclass(frozen=True)
class PublicSeries:
    slug: str
    title: str
    presentation: Path
    chapters: tuple[Path, ...]


def frontmatter(path: Path) -> dict[str, Any]:
    text = path.read_text(encoding="utf-8")
    match = re.match(r"\A---\s*\n(.*?)\n---\s*(?:\n|$)", text, re.DOTALL)
    if not match:
        return {}
    data = yaml.safe_load(match.group(1)) or {}
    return data if isinstance(data, dict) else {}


def is_explicitly_hidden(meta: dict[str, Any]) -> bool:
    status = str(meta.get("publication_status") or "").strip().lower()
    robots = str(meta.get("robots") or "").lower()
    return status in NON_PUBLIC_STATES or "noindex" in robots


def discover_public_series() -> list[PublicSeries]:
    result: list[PublicSeries] = []
    for presentation in sorted(SERIES_ROOT.glob(f"*/{PRESENTATION}")):
        meta = frontmatter(presentation)
        if is_explicitly_hidden(meta):
            continue
        series_dir = presentation.parent
        chapters: list[Path] = []
        for path in sorted(series_dir.glob("*.md")):
            if path.name in {PRESENTATION, "index.md", "README.md"}:
                continue
            if path.name.startswith("_"):
                continue
            if is_explicitly_hidden(frontmatter(path)):
                continue
            chapters.append(path)
        result.append(
            PublicSeries(
                slug=series_dir.name,
                title=str(meta.get("title") or series_dir.name),
                presentation=presentation,
                chapters=tuple(chapters),
            )
        )
    return result


def slugs_from_catalogue(text: str) -> set[str]:
    return set(re.findall(r'href=["\']/series/([^/]+)/00_presentacion_serie/["\']', text))


def slugs_from_llms(text: str) -> set[str]:
    return set(
        re.findall(
            r"https://5sigmas\.com/series/([^/]+)/00_presentacion_serie/index\.html\.md",
            text,
        )
    )


def slugs_from_nav(text: str) -> set[str]:
    return set(re.findall(r"series/([^/]+)/00_presentacion_serie\.md", text))


def slugs_from_redirects(text: str) -> set[str]:
    return set(
        re.findall(
            r"['\"]series/([^/'\"]+)/index\.md['\"]\s*:\s*['\"]series/[^/'\"]+/00_presentacion_serie\.md['\"]",
            text,
        )
    )


def jsonld_series_names() -> set[str]:
    tree = ast.parse(JSONLD_HOOK.read_text(encoding="utf-8"))
    for node in tree.body:
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == "SERIES_NAMES":
                    value = ast.literal_eval(node.value)
                    if isinstance(value, dict):
                        return {str(key) for key in value}
    return set()


def exclude_block(text: str) -> str:
    match = re.search(r"(?ms)^exclude_docs:\s*\|\s*\n(?P<body>(?:^[ \t]+.*\n?)*)", text)
    return match.group("body") if match else ""


def sitemap_urls() -> set[str]:
    path = SITE / "sitemap.xml"
    if not path.is_file():
        return set()
    root = ET.parse(path).getroot()
    return {
        (node.text or "").strip().rstrip("/") + "/"
        for node in root.findall(".//{*}loc")
        if (node.text or "").strip()
    }


def built_html(source: Path) -> Path:
    rel = source.relative_to(DOCS)
    if source.stem == "index":
        return SITE / rel.parent / "index.html"
    return SITE / rel.parent / source.stem / "index.html"


def canonical_for(source: Path) -> str:
    rel = source.relative_to(DOCS)
    if source.stem == "index":
        path = rel.parent.as_posix().strip("/")
    else:
        path = (rel.parent / source.stem).as_posix().strip("/")
    return f"{ORIGIN}/{path}/"


def markdown_mirror(html: Path) -> Path:
    return Path(f"{html}.md")


def compare_sets(errors: list[str], label: str, actual: set[str], expected: set[str]) -> None:
    missing = sorted(expected - actual)
    extra = sorted(actual - expected)
    if missing:
        errors.append(f"{label} is missing public series: {', '.join(missing)}")
    if extra:
        errors.append(f"{label} exposes series not in the public source contract: {', '.join(extra)}")


def audit() -> tuple[list[str], dict[str, int]]:
    errors: list[str] = []
    stats: dict[str, int] = {}

    series = discover_public_series()
    expected = {item.slug for item in series}
    stats["public_series"] = len(series)
    stats["public_chapters"] = sum(len(item.chapters) for item in series)

    if not expected:
        errors.append("No public series discovered from docs/series/*/00_presentacion_serie.md")
        return errors, stats

    mkdocs_text = MKDOCS.read_text(encoding="utf-8")
    catalogue_text = CATALOGUE.read_text(encoding="utf-8")
    llms_text = LLMS.read_text(encoding="utf-8")

    compare_sets(errors, "MkDocs navigation", slugs_from_nav(mkdocs_text), expected)
    compare_sets(errors, "/series/ catalogue", slugs_from_catalogue(catalogue_text), expected)
    compare_sets(errors, "llms.txt", slugs_from_llms(llms_text), expected)
    compare_sets(errors, "series redirect map", slugs_from_redirects(mkdocs_text), expected)

    jsonld = jsonld_series_names()
    missing_jsonld = sorted(expected - jsonld)
    if missing_jsonld:
        errors.append(
            "hooks/jsonld_article.py SERIES_NAMES is missing public series: "
            + ", ".join(missing_jsonld)
        )

    excluded = exclude_block(mkdocs_text)
    for item in series:
        if re.search(rf"(?m)^\s*series/{re.escape(item.slug)}/(?:\*\*|\*)\s*$", excluded):
            errors.append(
                f"Public series {item.slug!r} is excluded by mkdocs.yml exclude_docs"
            )
        if re.search(rf"(?m)^\s*snippets/{re.escape(item.slug)}/(?:\*\*|\*)\s*$", excluded):
            errors.append(
                f"Public series {item.slug!r} has its snippet namespace excluded by mkdocs.yml"
            )

    if not SITE.is_dir():
        errors.append("site/ is missing; run this gate after the strict MkDocs build")
        return errors, stats

    sitemap = sitemap_urls()
    built_catalogue_path = SITE / "series" / "index.html"
    built_catalogue = (
        built_catalogue_path.read_text(encoding="utf-8", errors="replace")
        if built_catalogue_path.is_file()
        else ""
    )
    if not built_catalogue:
        errors.append("Built /series/ catalogue is missing")

    built_catalogue_slugs = set(
        re.findall(r'href=["\'](?:https://5sigmas\.com)?/series/([^/]+)/00_presentacion_serie/["\']', built_catalogue)
    )
    compare_sets(errors, "built /series/ catalogue", built_catalogue_slugs, expected)

    for item in series:
        series_short = SITE / "series" / item.slug / "index.html"
        if not series_short.is_file():
            errors.append(
                f"Missing short series route /series/{item.slug}/ -> presentation redirect"
            )

        for source in (item.presentation, *item.chapters):
            html = built_html(source)
            canonical = canonical_for(source)
            if not html.is_file():
                errors.append(
                    f"Public source was not built: {source.relative_to(ROOT).as_posix()} -> {html.relative_to(ROOT).as_posix()}"
                )
                continue
            if canonical not in sitemap:
                errors.append(f"Public page missing from sitemap: {canonical}")
            mirror = markdown_mirror(html)
            if not mirror.is_file():
                errors.append(
                    f"Public page has no Markdown mirror for GEO/discovery: {canonical}"
                )

        presentation_url = canonical_for(item.presentation)
        if presentation_url not in sitemap:
            errors.append(f"Series presentation missing from sitemap: {presentation_url}")

    stats["errors"] = len(errors)
    return errors, stats


def main() -> int:
    errors, stats = audit()
    print("Publication contract audit")
    for key in sorted(stats):
        print(f"  {key}: {stats[key]}")
    if errors:
        print("\nPublication contract violations:", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        return 1
    print("\nPublication contract audit passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
