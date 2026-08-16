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
HOME = DOCS / "index.md"
LLMS = DOCS / "llms.txt"
EN_ROOT = ROOT / "locales" / "en"
EN_MKDOCS = ROOT / "mkdocs.en.yml"
EN_TOPIC_INDEX = EN_ROOT / "temas" / "index.md"
EN_HOME = EN_ROOT / "index.md"
ORIGIN = "https://5sigmas.com"

PRIORITY_TOPICS = {
    "llms": {
        "es_label": "Qué es un LLM",
        "en_label": "What is an LLM",
    },
    "transformer": {
        "es_label": "Transformer",
        "en_label": "Transformer",
    },
    "razonamiento": {
        "es_label": "Razonamiento",
        "en_label": "Reasoning",
    },
    "evaluacion-modelos": {
        "es_label": "Evaluación",
        "en_label": "Evaluation",
    },
    "agentes-ia": {
        "es_label": "Qué es un agente de IA",
        "en_label": "AI agent",
    },
    "prompt-injection": {
        "es_label": "Qué es prompt injection",
        "en_label": "prompt injection",
    },
}

SPANISH_FORBIDDEN_CALQUES = {
    "evaluacion-modelos": (
        "conjunto dorado",
        "análisis de memorization",
        "tool correctness",
        "outputs estocásticos",
    ),
}

SPANISH_REQUIRED_TERMS = {
    "evaluacion-modelos": ("conjunto de datos de referencia",),
}

REQUIRED_VISUAL_INCLUDES = {
    "transformer": (
        "snippets/temas/transformer-block.html",
        "snippets/temas/transformer-embedding-position.html",
        "snippets/temas/transformer-qkv.html",
        "snippets/temas/transformer-multihead.html",
        "snippets/temas/transformer-causal-mask.html",
        "snippets/temas/transformer-ffn.html",
        "snippets/temas/transformer-residual-norm.html",
        "snippets/temas/transformer-encoder-decoder.html",
    ),
    "razonamiento": (
        "snippets/temas/reasoning-loop.html",
        "snippets/temas/reasoning-chain-of-thought.html",
        "snippets/temas/reasoning-self-consistency.html",
        "snippets/temas/reasoning-search-planning.html",
        "snippets/temas/reasoning-test-time-compute.html",
        "snippets/temas/agent-tool-gate.html",
    ),
    "agentes-ia": (
        "snippets/agentes-ia/01-bucle-agente.html",
        "snippets/temas/agent-system-boundary.html",
        "snippets/temas/agent-tool-gate.html",
        "snippets/temas/agent-context-memory-state.html",
        "snippets/temas/agent-evaluation-trace.html",
    ),
    "prompt-injection": (
        "snippets/seguridad-ia/01-control-vs-datos.html",
        "snippets/seguridad-ia/01-rag-trigger-fragment.html",
        "snippets/seguridad-ia/01-defensa-en-capas.html",
        "snippets/seguridad-ia/04-causal-chain.html",
    ),
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


def source_contract_errors(
    *,
    source: Path,
    nav_text: str,
    topic_index_text: str,
    home_text: str,
    slug: str,
    locale: str,
) -> list[str]:
    errors: list[str] = []
    prefix = "" if locale == "es" else "/en"
    source_label = f"temas/{slug}.md" if locale == "es" else f"locales/en/temas/{slug}.md"

    if not source.is_file():
        return [f"Missing {locale.upper()} priority topic source: {source_label}"]

    source_text = source.read_text(encoding="utf-8")
    meta = frontmatter(source)
    if "noindex" in str(meta.get("robots") or "").lower():
        errors.append(f"{locale.upper()} priority topic is noindex: {source_label}")
    if not str(meta.get("description") or "").strip():
        errors.append(f"{locale.upper()} priority topic has no meta description: {source_label}")
    if not str(meta.get("seo_title") or "").strip():
        errors.append(f"{locale.upper()} priority topic has no seo_title: {source_label}")

    if locale == "es":
        folded = source_text.casefold()
        for forbidden in SPANISH_FORBIDDEN_CALQUES.get(slug, ()):
            if forbidden.casefold() in folded:
                errors.append(
                    f"ES priority topic contains forbidden literal/calque terminology {forbidden!r}: {source_label}"
                )
        for required in SPANISH_REQUIRED_TERMS.get(slug, ()):
            if required.casefold() not in folded:
                errors.append(
                    f"ES priority topic is missing required native technical terminology {required!r}: {source_label}"
                )

    for visual in REQUIRED_VISUAL_INCLUDES.get(slug, ()):
        include = f'{{{{ include_html("{visual}") }}}}'
        if include not in source_text:
            errors.append(
                f"{locale.upper()} priority topic is missing required visual include {visual!r}: {source_label}"
            )

    if f"temas/{slug}.md" not in nav_text:
        errors.append(f"{locale.upper()} priority topic missing from MkDocs navigation: {slug}")

    expected_href = f'href="{prefix}/temas/{slug}/"'
    if expected_href not in topic_index_text:
        errors.append(f"{locale.upper()} priority topic missing incoming link from topic index: {slug}")
    if expected_href not in home_text:
        errors.append(f"{locale.upper()} priority topic missing direct homepage link: {slug}")

    return errors


def main() -> int:
    errors: list[str] = []
    nav = MKDOCS.read_text(encoding="utf-8")
    topic_index = TOPIC_INDEX.read_text(encoding="utf-8")
    home = HOME.read_text(encoding="utf-8")
    llms = LLMS.read_text(encoding="utf-8")
    en_nav = EN_MKDOCS.read_text(encoding="utf-8")
    en_topic_index = EN_TOPIC_INDEX.read_text(encoding="utf-8")
    en_home = EN_HOME.read_text(encoding="utf-8")
    sitemap = sitemap_urls()

    for slug, labels in PRIORITY_TOPICS.items():
        source = DOCS / "temas" / f"{slug}.md"
        errors.extend(
            source_contract_errors(
                source=source,
                nav_text=nav,
                topic_index_text=topic_index,
                home_text=home,
                slug=slug,
                locale="es",
            )
        )
        errors.extend(
            source_contract_errors(
                source=EN_ROOT / "temas" / f"{slug}.md",
                nav_text=en_nav,
                topic_index_text=en_topic_index,
                home_text=en_home,
                slug=slug,
                locale="en",
            )
        )

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
            if re.search(
                r'<meta[^>]+name=["\']robots["\'][^>]+content=["\'][^"\']*noindex',
                rendered,
                re.I,
            ):
                errors.append(f"Built priority topic is noindex: {canonical}")
            if canonical not in rendered:
                errors.append(f"Built priority topic does not expose its canonical URL: {canonical}")
            if str(labels["es_label"]).casefold() not in rendered.casefold():
                errors.append(
                    "Built priority topic does not expose expected answer intent "
                    f"{labels['es_label']!r}: {canonical}"
                )

    print(f"Priority topic hubs: {len(PRIORITY_TOPICS)} (ES + EN source contracts)")
    if errors:
        print("Priority topic hub contract violations:", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        return 1
    print("Priority topic hub audit passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
