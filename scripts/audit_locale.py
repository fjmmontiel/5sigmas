#!/usr/bin/env python3
"""Fail CI on unsafe or incomplete 5sigmas locale builds."""

from __future__ import annotations

import argparse
import re
from pathlib import Path

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


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--locale", required=True)
    parser.add_argument("--site")
    args = parser.parse_args()

    manifest = load_manifest(args.locale)
    errors = audit_source(args.locale, manifest)
    if args.site:
        errors.extend(audit_site((ROOT / args.site).resolve()))

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
