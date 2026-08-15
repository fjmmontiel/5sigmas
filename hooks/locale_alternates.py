"""Keep locale switching route-safe without confusing Material's sitemap integration.

Material for MkDocs treats page-level ``link[rel=alternate]`` elements as locale
roots and appends ``sitemap.xml`` to them. Exact per-page hreflang URLs therefore
cause requests such as ``/article/sitemap.xml``. 5sigmas instead uses:

- exact route-aware URLs in the visible language selector;
- ES/EN hreflang pairs in XML sitemaps for routes that truly exist in both locales;
- an English-home selector fallback for Spanish-only pages.

``locales/en/manifest.yml`` remains the source of truth for published English pages.
Generated English video routes are derived from the manifest's generated-surface
flags plus ``locales/en/media.yml`` so they stay truthful without pretending that
hook-generated Markdown exists as locale source files.
"""

from __future__ import annotations

from functools import lru_cache
from html import escape
from pathlib import Path
import re
from typing import Any
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET

import yaml

ROOT = Path(__file__).resolve().parents[1]
GLOBAL_ORIGIN = "https://5sigmas.com"
SITEMAP_NS = "http://www.sitemaps.org/schemas/sitemap/0.9"
XHTML_NS = "http://www.w3.org/1999/xhtml"

_ALTERNATE_LINK_RE = re.compile(
    r'<link\b(?=[^>]*\brel=["\']alternate["\'])(?=[^>]*\bhreflang=["\'](?P<lang>es|en)["\'])[^>]*>',
    flags=re.IGNORECASE,
)
_LANGUAGE_ANCHOR_RE = re.compile(
    r'<a\b(?=[^>]*\bhreflang=["\'](?P<lang>es|en)["\'])[^>]*>',
    flags=re.IGNORECASE,
)
_HREF_RE = re.compile(r'\bhref=(["\']).*?\1', flags=re.IGNORECASE)

ET.register_namespace("", SITEMAP_NS)
ET.register_namespace("xhtml", XHTML_NS)


def _manifest_data(locale: str) -> dict[str, Any]:
    manifest = ROOT / "locales" / locale / "manifest.yml"
    if not manifest.is_file():
        return {}
    data = yaml.safe_load(manifest.read_text(encoding="utf-8")) or {}
    return data if isinstance(data, dict) else {}


def _generated_video_routes(locale: str, data: dict[str, Any]) -> frozenset[str]:
    if locale != "en":
        return frozenset()
    generated = data.get("generated_surfaces") or {}
    library_enabled = bool(generated.get("video_library"))
    watches_enabled = bool(generated.get("video_watch_pages"))
    if not library_enabled and not watches_enabled:
        return frozenset()

    routes: set[str] = set()
    if library_enabled:
        routes.add("videos/index.md")
    if not watches_enabled:
        return frozenset(routes)

    media_index = ROOT / "locales" / locale / "media.yml"
    if not media_index.is_file():
        return frozenset(routes)
    media = yaml.safe_load(media_index.read_text(encoding="utf-8")) or {}
    if not isinstance(media, dict):
        return frozenset(routes)

    for src_uri, declaration in media.items():
        if not isinstance(declaration, dict):
            continue
        video = str(declaration.get("video") or "").strip()
        if not video:
            continue
        source_parent = Path(str(src_uri)).parent
        watch_src = Path("videos") / source_parent / f"{Path(video).stem}.md"
        routes.add(watch_src.as_posix())
    return frozenset(routes)


@lru_cache(maxsize=8)
def _published_routes(locale: str) -> frozenset[str]:
    data = _manifest_data(locale)
    routes = {
        str(route).strip().lstrip("/")
        for route in (data.get("published_routes") or [])
        if str(route).strip()
    }
    routes.update(_generated_video_routes(locale, data))
    return frozenset(routes)


@lru_cache(maxsize=8)
def _published_public_routes(locale: str) -> frozenset[str]:
    return frozenset(_src_route(route) for route in _published_routes(locale))


def _src_route(src_path: str) -> str:
    """Convert a MkDocs source path to its stable public route."""
    path = Path(src_path)
    if path.name == "index.md":
        parent = path.parent.as_posix().strip("/")
        return "/" if parent in {"", "."} else f"/{parent}/"
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


def _normalize_route(path: str) -> str:
    normalized = "/" + path.strip("/")
    if normalized == "/":
        return "/"
    return normalized + "/"


def _source_route_from_sitemap_url(url: str, language: str) -> str:
    route = _normalize_route(urlsplit(url).path)
    if language == "en":
        if route == "/en/":
            return "/"
        if not route.startswith("/en/"):
            return route
        return _normalize_route(route[len("/en/") :])
    return route


def _sitemap_routes(path: Path) -> frozenset[str]:
    """Return normalized public routes from an already-built locale sitemap."""
    if not path.is_file():
        return frozenset()
    tree = ET.parse(path)
    routes: set[str] = set()
    for loc_node in tree.getroot().findall(f"{{{SITEMAP_NS}}}url/{{{SITEMAP_NS}}}loc"):
        if loc_node.text:
            routes.add(_normalize_route(urlsplit(loc_node.text).path))
    return frozenset(routes)


def on_post_page(output: str, page, config, **kwargs) -> str:
    src_path = page.file.src_path.lstrip("/")
    source_route = _src_route(src_path)
    translated_to_english = src_path in _published_routes("en")
    current_language = _current_language(config)

    selector_targets = {
        "es": source_route,
        "en": _english_route(source_route) if translated_to_english else "/en/",
    }

    def rewrite_selector(match: re.Match[str]) -> str:
        lang = match.group("lang").lower()
        return _replace_href(match.group(0), selector_targets[lang])

    # Remove page-level hreflang links. Material interprets these as locale roots
    # and fetches ``sitemap.xml`` relative to each href. SEO alternates are emitted
    # in the XML sitemap instead, where exact page equivalence is unambiguous.
    output = _ALTERNATE_LINK_RE.sub("", output)
    output = _LANGUAGE_ANCHOR_RE.sub(rewrite_selector, output)

    if current_language == "en" and not translated_to_english:
        raise RuntimeError(f"English page is not declared in locales/en/manifest.yml: {src_path}")

    return output


def on_post_build(config, **kwargs) -> None:
    """Add truthful ES/EN hreflang pairs to this locale's XML sitemap."""
    sitemap_path = Path(config["site_dir"]) / "sitemap.xml"
    if not sitemap_path.is_file():
        return

    language = _current_language(config)
    published = _published_public_routes("en")
    spanish_sitemap = Path(config["site_dir"]).parent / "sitemap.xml"
    spanish_routes = _sitemap_routes(spanish_sitemap) if language == "en" else frozenset()
    tree = ET.parse(sitemap_path)
    root = tree.getroot()
    changed = False

    for url_node in root.findall(f"{{{SITEMAP_NS}}}url"):
        loc_node = url_node.find(f"{{{SITEMAP_NS}}}loc")
        if loc_node is None or not loc_node.text:
            continue

        source_route = _source_route_from_sitemap_url(loc_node.text, language)

        for child in list(url_node):
            if child.tag == f"{{{XHTML_NS}}}link":
                url_node.remove(child)
                changed = True

        if source_route not in published:
            continue
        if language == "en" and source_route not in spanish_routes:
            continue

        for hreflang, href in (
            ("es", GLOBAL_ORIGIN + source_route),
            ("en", GLOBAL_ORIGIN + _english_route(source_route)),
        ):
            ET.SubElement(
                url_node,
                f"{{{XHTML_NS}}}link",
                {"rel": "alternate", "hreflang": hreflang, "href": href},
            )
        changed = True

    if changed:
        tree.write(sitemap_path, encoding="utf-8", xml_declaration=True)
