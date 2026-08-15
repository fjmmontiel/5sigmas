#!/usr/bin/env python3
"""Fail CI on unsafe or incomplete 5sigmas locale builds."""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET

import yaml

ROOT = Path(__file__).resolve().parents[1]

HIGH_SIGNAL_SPANISH = (
    "Capítulo ",
    "Qué deberías recordar",
    "Referencias",
    "Tiempo de lectura",
    "Pantalla completa",
    "Prerrequisitos",
    "Ruta recomendada",
    "Elige ",
    "Aprender",
    "Sobre el proyecto",
)

MISSING_SNIPPET_RE = re.compile(r"Missing locale snippet:", re.IGNORECASE)
MARKDOWN_LINK_RE = re.compile(
    r'<link\b(?=[^>]*\brel=["\']alternate["\'])(?=[^>]*\btype=["\']text/markdown["\'])[^>]*\bhref=["\']([^"\']+)',
    re.IGNORECASE,
)
ROBOTS_NOINDEX_RE = re.compile(
    r'<meta\b(?=[^>]*\bname=["\']robots["\'])(?=[^>]*\bcontent=["\'][^"\']*noindex)',
    re.IGNORECASE,
)
SITEMAP_NS = "http://www.sitemaps.org/schemas/sitemap/0.9"
XHTML_NS = "http://www.w3.org/1999/xhtml"


def load_manifest(locale: str) -> dict:
    path = ROOT / "locales" / locale / "manifest.yml"
    if not path.is_file():
        raise AssertionError(f"Missing manifest: {path}")
    return yaml.safe_load(path.read_text(encoding="utf-8")) or {}


def audit_source(locale: str, manifest: dict) -> list[str]:
    errors: list[str] = []
    locale_root = ROOT / "locales" / locale

    for rel in manifest.get("published_routes", []):
        path = locale_root / rel
        if not path.is_file():
            errors.append(f"manifest route missing source: {rel}")

    for rel in manifest.get("required_snippets", []):
        path = locale_root / rel
        if not path.is_file():
            errors.append(f"required snippet missing: {rel}")

    scan_suffixes = {".md", ".html"}
    for path in locale_root.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in scan_suffixes:
            continue
        text = path.read_text(encoding="utf-8")
        for marker in HIGH_SIGNAL_SPANISH:
            if marker in text:
                errors.append(f"Spanish marker {marker!r} in {path.relative_to(locale_root)}")

    return errors


def audit_site(site: Path) -> list[str]:
    errors: list[str] = []
    if not site.is_dir():
        return [f"site directory does not exist: {site}"]

    html_files = list(site.rglob("*.html"))
    if not html_files:
        errors.append("locale build produced no HTML")
        return errors

    for path in html_files:
        text = path.read_text(encoding="utf-8", errors="replace")
        if MISSING_SNIPPET_RE.search(text):
            errors.append(f"missing translated snippet rendered in {path.relative_to(site)}")
        for markdown_url in MARKDOWN_LINK_RE.findall(text):
            parsed = urlsplit(markdown_url)
            if parsed.path.startswith("/en/"):
                mirror = site / parsed.path.removeprefix("/en/")
                if not mirror.is_file():
                    errors.append(
                        f"Markdown alternate missing for {path.relative_to(site)}: {markdown_url}"
                    )

    sitemap = site / "sitemap.xml"
    if sitemap.is_file():
        tree = ET.parse(sitemap)
        sitemap_urls = tree.getroot().findall(f"{{{SITEMAP_NS}}}url")
        for url_node in sitemap_urls:
            loc_node = url_node.find(f"{{{SITEMAP_NS}}}loc")
            if loc_node is None or not loc_node.text:
                continue
            parsed = urlsplit(loc_node.text)
            if not parsed.path.startswith("/en/"):
                continue
            page_file = site / parsed.path.removeprefix("/en/").strip("/") / "index.html"
            if parsed.path == "/en/":
                page_file = site / "index.html"
            if page_file.is_file() and ROBOTS_NOINDEX_RE.search(
                page_file.read_text(encoding="utf-8", errors="replace")
            ):
                errors.append(f"noindex page appears in English sitemap: {loc_node.text}")

        spanish_sitemap = site.parent / "sitemap.xml"
        if spanish_sitemap.is_file():
            spanish_locs = {
                node.text
                for node in ET.parse(spanish_sitemap).getroot().findall(
                    f"{{{SITEMAP_NS}}}url/{{{SITEMAP_NS}}}loc"
                )
                if node.text
            }
            for url_node in sitemap_urls:
                loc_node = url_node.find(f"{{{SITEMAP_NS}}}loc")
                if loc_node is None or not loc_node.text:
                    continue
                for alternate in url_node.findall(f"{{{XHTML_NS}}}link"):
                    if alternate.attrib.get("hreflang") == "es":
                        if alternate.attrib.get("href") not in spanish_locs:
                            errors.append(
                                "English sitemap hreflang=es is not present in the Spanish sitemap: "
                                f"{alternate.attrib.get('href')}"
                            )

    index = site / "index.html"
    if not index.is_file():
        errors.append("locale homepage missing")
    else:
        html = index.read_text(encoding="utf-8", errors="replace")
        if 'lang="en"' not in html and "lang=en" not in html:
            errors.append("homepage does not render HTML lang=en")
        if "https://5sigmas.com/en/" not in html:
            errors.append("English canonical/site URL missing from homepage")

    return errors


def audit_full_english_parity() -> list[str]:
    """Run the canonical parity counter from the already-required locale gate.

    While manifest status is mirror-in-progress it reports exact gaps and exits
    zero. Once the manifest is flipped to complete the same script becomes a hard
    zero-delta gate and any remaining mismatch blocks the locale build.
    """
    script = ROOT / "scripts" / "audit_english_full_parity.py"
    if not script.is_file():
        return []
    result = subprocess.run([sys.executable, str(script)], cwd=ROOT)
    if result.returncode:
        return [f"full English parity audit failed with exit code {result.returncode}"]
    return []


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--locale", required=True)
    parser.add_argument("--site")
    args = parser.parse_args()

    manifest = load_manifest(args.locale)
    errors = audit_source(args.locale, manifest)
    if args.site:
        errors.extend(audit_site((ROOT / args.site).resolve()))
    if args.locale.strip().lower() == "en" and not args.site:
        errors.extend(audit_full_english_parity())

    if errors:
        print("Locale audit failed:")
        for error in errors:
            print(f" - {error}")
        raise SystemExit(1)

    print(
        f"Locale audit passed: {args.locale}; "
        f"{len(manifest.get('published_routes', []))} routes; "
        f"{len(manifest.get('required_snippets', []))} translated snippets."
    )


if __name__ == "__main__":
    main()
