#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
MAIN = ROOT / "main.py"
EXTRA_CSS = DOCS / "stylesheets" / "extra.css"
ANIM_CSS = DOCS / "assets" / "stylesheets" / "animations.css"

INCLUDE_HTML_RE = re.compile(r'\{\{\s*include_html\(\s*"([^"]+)"')
INCLUDE_ANIM_RE = re.compile(r'\{\{\s*include_animation\(\s*"([^"]+)"')


def _is_animation_snippet(path: str) -> bool:
    # New project-based structure
    if path.startswith("snippets/fundamentos-ia/"):
        return True
    if path.startswith("snippets/ia-pib-energia/"):
        return True
    if path.startswith("snippets/datacenters-espacio/"):
        return True
    # Legacy patterns (for backward compatibility)
    if path.startswith("snippets/animaciones/"):
        return True
    if path.endswith("_anim.html"):
        return True
    return False


def _check_required_text(path: Path, needles: list[str], errors: list[str]) -> None:
    if not path.exists():
        errors.append(f"missing file: {path}")
        return
    text = path.read_text(encoding="utf-8")
    for needle in needles:
        if needle not in text:
            errors.append(f"missing '{needle}' in {path}")


def _check_markdown_includes(errors: list[str]) -> None:
    for md in DOCS.rglob("*.md"):
        content = md.read_text(encoding="utf-8")
        html_paths = INCLUDE_HTML_RE.findall(content)
        anim_paths = INCLUDE_ANIM_RE.findall(content)

        for path in html_paths:
            if _is_animation_snippet(path):
                errors.append(
                    f"{md}: animation snippet '{path}' must use include_animation(...) instead of include_html(...)"
                )

        for path in anim_paths:
            if not _is_animation_snippet(path):
                errors.append(
                    f"{md}: non-animation snippet '{path}' should not use include_animation(...)"
                )


def _check_animation_snippets(errors: list[str]) -> None:
    # Check all .html files in the new project-based structure
    snippets = []
    snippets.extend(DOCS.glob("snippets/fundamentos-ia/**/*.html"))
    snippets.extend(DOCS.glob("snippets/ia-pib-energia/**/*.html"))
    snippets.extend(DOCS.glob("snippets/datacenters-espacio/**/*.html"))
    # Legacy paths for backward compatibility
    snippets.extend(DOCS.glob("snippets/animaciones/*.html"))
    
    for path in snippets:
        if not path.exists():
            continue

        text = path.read_text(encoding="utf-8")
        
        # Skip preview cards and visualization cards (they use a different structure)
        if "data-series-preview" in text or "sp-card" in text:
            continue
        
        # Branding & Structure - check for either .ta-demo or custom animation containers
        has_branding = (
            "ta-demo" in text or 
            "mlops-walkthrough" in text or
            "sigmas-dcspace" in text or
            "class=\"anim-brand-shell\"" in text
        )
        if not has_branding:
            errors.append(f"{path}: missing shared branding class (ta-demo, mlops-walkthrough, sigmas-dcspace, or anim-brand-shell)")
        
        # Tab Logic (if data-tabs is present)
        if "data-tabs" in text:
            if "role=\"tablist\"" not in text:
                errors.append(f"{path}: has data-tabs but missing role='tablist'")
            
            tab_keys = set(re.findall(r'data-tab="([^"]+)"', text))
            panel_keys = set(re.findall(r'data-panel="([^"]+)"', text))
            if tab_keys and panel_keys and tab_keys != panel_keys:
                errors.append(f"{path}: tab/panel keys mismatch (tabs={sorted(tab_keys)}, panels={sorted(panel_keys)})")


def main() -> int:
    errors: list[str] = []

    _check_required_text(MAIN, ["def include_animation("], errors)
    _check_required_text(
        ANIM_CSS,
        [
            ".ta-demo",
            ".ta-demo::before",
            ".ta-demo::after",
            "/assets/logo.svg",
            "/assets/logo_white.svg",
        ],
        errors,
    )

    _check_markdown_includes(errors)
    _check_animation_snippets(errors)

    if errors:
        print("[branding-check] failed")
        for err in errors:
            print(f"[branding-check] {err}")
        return 1

    print("[branding-check] ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
