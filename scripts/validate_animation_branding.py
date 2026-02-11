#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
DRAFTS = ROOT / "drafts"
MAIN = ROOT / "main.py"
EXTRA_CSS = DOCS / "stylesheets" / "extra.css"
ANIM_CSS = DOCS / "assets" / "stylesheets" / "animations.css"
SHELL_JS = DOCS / "assets" / "javascripts" / "animation-shell.js"
MKDOCS = ROOT / "mkdocs.yml"
TEMPLATE_GENERIC = DOCS / "assets" / "templates" / "animation_boilerplate_generic.html"
TEMPLATE_TABS = DOCS / "assets" / "templates" / "animation_boilerplate_tabs.html"
SHELL_EXCLUDED_SNIPPETS = {
    "snippets/5sigma.html",
    "snippets/series_cards.html",
    "snippets/series_meta.html",
}

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
    for base in (DOCS, DRAFTS):
        if not base.exists():
            continue
        for md in base.rglob("*.md"):
            content = md.read_text(encoding="utf-8")
            anim_paths = INCLUDE_ANIM_RE.findall(content)

            for path in anim_paths:
                errors.append(
                    f"{md}: legacy include_animation(...) is not allowed, use include_html(...) for '{path}'"
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
        rel = path.relative_to(DOCS).as_posix()
        if rel in SHELL_EXCLUDED_SNIPPETS:
            continue
        
        # Skip preview cards and visualization cards (they use a different structure)
        if "data-series-preview" in text or "sp-card" in text:
            continue

        if "anim-brand-shell" in text or "data-anim-shell" in text:
            errors.append(f"{path}: manual anim-brand-shell is not allowed, use include_html(...) shell")
        
        # Guardrail: avoid collision with Material's native tab runtime.
        if "data-tabs" in text:
            errors.append(f"{path}: uses reserved data-tabs, use data-anim-tabs")

        # Tab Logic (if data-anim-tabs is present)
        if "data-anim-tabs" in text:
            if "role=\"tablist\"" not in text and "data-role=\"tablist\"" not in text:
                errors.append(f"{path}: has data-anim-tabs but missing role='tablist' or data-role='tablist'")
            
            tab_keys = {k for k in re.findall(r'data-tab="([^"]+)"', text) if "${" not in k}
            panel_keys = {k for k in re.findall(r'data-panel="([^"]+)"', text) if "${" not in k}
            if tab_keys and panel_keys and tab_keys != panel_keys:
                errors.append(f"{path}: tab/panel keys mismatch (tabs={sorted(tab_keys)}, panels={sorted(panel_keys)})")


def _check_templates(errors: list[str]) -> None:
    _check_required_text(
        TEMPLATE_GENERIC,
        [
            "ta-generic",
            "ta-section--header",
            "ta-section--viewport",
            'data-anim-fullscreen="on"',
            'data-anim-contrast="force"',
        ],
        errors,
    )
    _check_required_text(
        TEMPLATE_TABS,
        [
            "ta-tabs",
            "data-anim-tabs",
            "role=\"tablist\"",
            "data-tab=\"tab1\"",
            "data-panel=\"tab1\"",
            'data-anim-fullscreen="on"',
            'data-anim-contrast="force"',
        ],
        errors,
    )


def main() -> int:
    errors: list[str] = []

    _check_required_text(
        MAIN,
        [
            "def include_html(",
            "def _wrap_animation_shell(",
            "data-anim-shell",
            "data-anim-fullscreen",
            "data-anim-contrast",
            "anim-brand-shell__viewport",
            "def _should_wrap_with_shell(",
        ],
        errors,
    )
    _check_required_text(
        EXTRA_CSS,
        [
            ".anim-brand-shell__viewport",
            ".anim-brand-shell__toolbar",
            ".anim-shell-modal",
            "data-anim-contrast=\"force\"",
            "5SIGMAS · Animation Library",
        ],
        errors,
    )
    _check_required_text(
        ANIM_CSS,
        [
            ".ta-demo",
            ".ta-section",
            ".ta-vizbox",
        ],
        errors,
    )
    _check_required_text(SHELL_JS, ["data-anim-shell-open", "anim-shell-modal", "data-anim-fullscreen"], errors)
    _check_required_text(MKDOCS, ["assets/javascripts/animation-shell.js"], errors)

    _check_markdown_includes(errors)
    _check_animation_snippets(errors)
    _check_templates(errors)

    if errors:
        print("[branding-check] failed")
        for err in errors:
            print(f"[branding-check] {err}")
        return 1

    print("[branding-check] ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
