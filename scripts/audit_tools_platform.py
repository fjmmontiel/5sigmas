#!/usr/bin/env python3
"""Deterministic contract for the bilingual 5sigmas tools product."""

from __future__ import annotations

import json
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET

import yaml

ROOT = Path(__file__).resolve().parents[1]
ROADMAP = ROOT / "tools" / "roadmap.yml"
EN_MANIFEST = ROOT / "locales" / "en" / "manifest.yml"
SITE = ROOT / "site"
SITEMAP_NS = "http://www.sitemaps.org/schemas/sitemap/0.9"
XHTML_NS = "http://www.w3.org/1999/xhtml"

EXPECTED = {
    "es_hub": (ROOT / "docs/herramientas/index.md", SITE / "herramientas/index.html", "https://5sigmas.com/herramientas/"),
    "es_tool": (ROOT / "docs/herramientas/llm-cost-latency.md", SITE / "herramientas/llm-cost-latency/index.html", "https://5sigmas.com/herramientas/llm-cost-latency/"),
    "en_hub": (ROOT / "locales/en/tools/index.md", SITE / "en/tools/index.html", "https://5sigmas.com/en/tools/"),
    "en_tool": (ROOT / "locales/en/tools/llm-cost-latency.md", SITE / "en/tools/llm-cost-latency/index.html", "https://5sigmas.com/en/tools/llm-cost-latency/"),
}


def fail(message: str, failures: list[str]) -> None:
    failures.append(message)


def canonical(html: str) -> str:
    tags = re.findall(r"<link\b[^>]*>", html, flags=re.IGNORECASE)
    for tag in tags:
        if not re.search(r'\brel=["\'][^"\']*canonical[^"\']*["\']', tag, flags=re.IGNORECASE):
            continue
        match = re.search(r'\bhref=["\']([^"\']+)["\']', tag, flags=re.IGNORECASE)
        if match:
            return match.group(1)
    return ""


def jsonld_types(html: str) -> set[str]:
    result: set[str] = set()
    payloads = re.findall(
        r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html,
        flags=re.IGNORECASE | re.DOTALL,
    )
    for payload in payloads:
        data = json.loads(payload)
        stack = [data]
        while stack:
            value = stack.pop()
            if isinstance(value, dict):
                node_type = value.get("@type")
                if isinstance(node_type, str):
                    result.add(node_type)
                elif isinstance(node_type, list):
                    result.update(str(item) for item in node_type)
                stack.extend(value.values())
            elif isinstance(value, list):
                stack.extend(value)
    return result


def audit_sources(failures: list[str]) -> None:
    if not ROADMAP.is_file():
        fail("missing tools/roadmap.yml", failures)
        return
    roadmap = yaml.safe_load(ROADMAP.read_text(encoding="utf-8")) or {}
    tools = roadmap.get("tools") or []
    if len(tools) < 18:
        fail(f"roadmap must contain at least 18 distinct tools; found {len(tools)}", failures)
    ids = [str(tool.get("id") or "") for tool in tools]
    orders = [tool.get("order") for tool in tools]
    if len(ids) != len(set(ids)) or "" in ids:
        fail("roadmap tool ids must be unique and non-empty", failures)
    if len(orders) != len(set(orders)):
        fail("roadmap order values must be unique", failures)
    allowed = set(roadmap.get("quality_states") or [])
    if allowed != {"planned", "in_progress", "excellent"}:
        fail("roadmap quality states must be planned/in_progress/excellent", failures)
    for tool in tools:
        if tool.get("status") not in allowed:
            fail(f"{tool.get('id')}: invalid roadmap status", failures)

    first = next((tool for tool in tools if tool.get("id") == "llm-cost-latency"), None)
    if not first:
        fail("roadmap is missing llm-cost-latency", failures)
    else:
        if first.get("es_en_parity") != "complete":
            fail("llm-cost-latency must declare complete ES/EN parity before review", failures)
        for key in ("es_path", "en_path"):
            path = ROOT / str(first.get(key) or "")
            if not path.is_file():
                fail(f"llm-cost-latency missing {key}: {path.relative_to(ROOT)}", failures)

    for key, (source, _, _) in EXPECTED.items():
        if not source.is_file():
            fail(f"missing {key} source: {source.relative_to(ROOT)}", failures)

    manifest = yaml.safe_load(EN_MANIFEST.read_text(encoding="utf-8")) or {}
    published = set(manifest.get("published_routes") or [])
    for route in ("tools/index.md", "tools/llm-cost-latency.md"):
        if route not in published:
            fail(f"English manifest does not publish {route}", failures)

    mkdocs = (ROOT / "mkdocs.yml").read_text(encoding="utf-8")
    mkdocs_en = (ROOT / "mkdocs.en.yml").read_text(encoding="utf-8")
    for token in ("Herramientas: herramientas/index.md", "javascripts/ai-tools.js", "stylesheets/ai-tools.css", "hooks/tool_locale_aliases.py"):
        if token not in mkdocs:
            fail(f"mkdocs.yml missing tools integration: {token}", failures)
    if "Tools: tools/index.md" not in mkdocs_en:
        fail("mkdocs.en.yml missing top-level Tools navigation", failures)

    llms = (ROOT / "docs/llms.txt").read_text(encoding="utf-8")
    for url in (
        "https://5sigmas.com/herramientas/index.html.md",
        "https://5sigmas.com/herramientas/llm-cost-latency/index.html.md",
    ):
        if url not in llms:
            fail(f"llms.txt missing {url}", failures)


def audit_rendered(failures: list[str]) -> None:
    if not SITE.is_dir():
        fail("site/ is missing; build both locales before running the rendered tools audit", failures)
        return

    for key, (_, html_path, expected_canonical) in EXPECTED.items():
        if not html_path.is_file():
            fail(f"missing rendered {key}: {html_path.relative_to(ROOT)}", failures)
            continue
        html = html_path.read_text(encoding="utf-8", errors="replace")
        if canonical(html) != expected_canonical:
            fail(f"{key}: canonical is {canonical(html)!r}, expected {expected_canonical!r}", failures)
        if "ai-tools.css" not in html or "ai-tools.js" not in html:
            fail(f"{key}: shared tools CSS/JS is not loaded", failures)
        mirror = Path(f"{html_path}.md")
        if not mirror.is_file():
            fail(f"{key}: Markdown mirror is missing", failures)
        types = jsonld_types(html)
        expected_type = "CollectionPage" if key.endswith("hub") else "WebApplication"
        if expected_type not in types:
            fail(f"{key}: missing {expected_type} JSON-LD", failures)

    es_tool = EXPECTED["es_tool"][1]
    en_tool = EXPECTED["en_tool"][1]
    for path, language in ((es_tool, "es"), (en_tool, "en")):
        if not path.is_file():
            continue
        html = path.read_text(encoding="utf-8", errors="replace")
        if 'data-s5-tool="llm-cost-latency"' not in html:
            fail(f"{language}: calculator root is missing", failures)
        if f'data-lang="{language}"' not in html:
            fail(f"{language}: calculator language contract is missing", failures)
        for action in ("share", "download", "reset"):
            if f'data-action="{action}"' not in html:
                fail(f"{language}: missing {action} action", failures)

    pairs = {
        "https://5sigmas.com/herramientas/": "https://5sigmas.com/en/tools/",
        "https://5sigmas.com/herramientas/llm-cost-latency/": "https://5sigmas.com/en/tools/llm-cost-latency/",
    }
    for sitemap_path in (SITE / "sitemap.xml", SITE / "en/sitemap.xml"):
        if not sitemap_path.is_file():
            fail(f"missing sitemap: {sitemap_path.relative_to(ROOT)}", failures)
            continue
        tree = ET.parse(sitemap_path)
        for es_url, en_url in pairs.items():
            matching = None
            for url_node in tree.getroot().findall(f"{{{SITEMAP_NS}}}url"):
                loc = url_node.find(f"{{{SITEMAP_NS}}}loc")
                if loc is not None and loc.text in {es_url, en_url}:
                    matching = url_node
                    break
            if matching is None:
                continue
            alternates = {
                child.attrib.get("hreflang"): child.attrib.get("href")
                for child in matching.findall(f"{{{XHTML_NS}}}link")
            }
            if alternates.get("es") != es_url or alternates.get("en") != en_url:
                fail(f"{sitemap_path.name}: wrong tools hreflang pair for {es_url}", failures)


def main() -> int:
    failures: list[str] = []
    audit_sources(failures)
    audit_rendered(failures)
    if failures:
        print("Tools platform audit failed:")
        for item in failures:
            print(f" - {item}")
        return 1
    print("Tools platform audit passed: 18-tool roadmap, ES/EN source parity, rendered routes, schema, Markdown mirrors and locale pairs are coherent.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
