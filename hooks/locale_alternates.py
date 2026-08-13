"""Make locale alternates route-equivalent and truthful.

Material's ``extra.alternate`` configuration gives us the language selector, but
with locale-root links it emits the same root targets on every page. 5sigmas has
partial locale coverage, so the build must distinguish pages with a real English
equivalent from Spanish-only pages.

The English manifest is the source of truth:
- translated source paths get exact ES/EN hreflang and selector targets;
- Spanish-only pages keep a usable English-home selector target, but do not emit
  a false ``hreflang=en`` relationship that search engines could interpret as an
  equivalent translation.
"""

from __future__ import annotations

from functools import lru_cache
from html import escape
from pathlib import Path
import re
from typing import Any

import yaml

ROOT = Path(__file__).resolve().parents[1]
GLOBAL_ORIGIN = "https://5sigmas.com"

_ALTERNATE_LINK_RE = re.compile(
    r'<link\b(?=[^>]*\brel=["\']alternate["\'])(?=[^>]*\bhreflang=["\'](?P<lang>es|en)["\'])[^>]*>',
    flags=re.IGNORECASE,
)
_LANGUAGE_ANCHOR_RE = re.compile(
    r'<a\b(?=[^>]*\bhreflang=["\'](?P<lang>es|en)["\'])[^>]*>',
    flags=re.IGNORECASE,
)
_HREF_RE = re.compile(r'\bhref=(["\']).*?\1', flags=re.IGNORECASE)


@lru_cache(maxsize=8)
def _published_routes(locale: str) -> frozenset[str]:
    manifest = ROOT / "locales" / locale / "manifest.yml"
    if not manifest.is_file():
        return frozenset()
    data = yaml.safe_load(manifest.read_text(encoding="utf-8")) or {}
    routes = data.get("published_routes") or []
    return frozenset(str(route).strip().lstrip("/") for route in routes if str(route).strip())


def _src_route(src_path: str) -> str:
    """Convert a MkDocs source path to its stable public route."""
    path = Path(src_path)
    if path.name == "index.md":
        parent = path.parent.as_posix().strip("/")
        return f"/{parent}/" if parent else "/"
    return "/" + path.with_suffix("").as_posix().strip("/") + "/"


def _english_route(source_route: str) -> str:
    if source_route == "/":
        return "/en/"
    return "/en" + source_route


def _replace_href(tag: str, href: str) -> str:
    rendered = escape(href, quote=True)
    if _HREF_RE.search(tag):
        return _HREF_RE.sub(f'href="{rendered}"', tag, count=1)
    return tag[:-1] + f' href="{rendered}">'


def _current_language(config: Any) -> str:
    extra = config.get("extra") or {}
    configured = str(extra.get("content_language") or "").strip().lower()
    if configured:
        return configured
    theme = config.get("theme")
    language = getattr(theme, "language", None)
    if language:
        return str(language).strip().lower()
    if isinstance(theme, dict):
        return str(theme.get("language") or "es").strip().lower()
    return "es"


def on_post_page(output: str, page, config, **kwargs) -> str:
    src_path = page.file.src_path.lstrip("/")
    source_route = _src_route(src_path)
    translated_to_english = src_path in _published_routes("en")
    current_language = _current_language(config)

    spanish_path = source_route
    english_path = _english_route(source_route) if translated_to_english else "/en/"

    head_targets = {
        "es": GLOBAL_ORIGIN + spanish_path,
        "en": GLOBAL_ORIGIN + _english_route(source_route),
    }
    selector_targets = {"es": spanish_path, "en": english_path}

    def rewrite_head(match: re.Match[str]) -> str:
        lang = match.group("lang").lower()
        if lang == "en" and not translated_to_english:
            return ""
        return _replace_href(match.group(0), head_targets[lang])

    def rewrite_selector(match: re.Match[str]) -> str:
        lang = match.group("lang").lower()
        return _replace_href(match.group(0), selector_targets[lang])

    output = _ALTERNATE_LINK_RE.sub(rewrite_head, output)
    output = _LANGUAGE_ANCHOR_RE.sub(rewrite_selector, output)

    # A non-English build may legitimately have no translated counterpart. An
    # English build, however, must only contain manifest-published source paths.
    if current_language == "en" and not translated_to_english:
        raise RuntimeError(f"English page is not declared in locales/en/manifest.yml: {src_path}")

    return output
