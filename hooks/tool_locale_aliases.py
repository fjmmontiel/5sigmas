"""Declare the intentionally localized public slugs for the tools product.

The rest of the English mirror preserves Spanish source slugs. Tools are a new
product surface and intentionally use /herramientas/ in Spanish and /en/tools/
in English. Keep this exception explicit and tiny rather than weakening the
site-wide route-safety contract.
"""

from __future__ import annotations

from html import escape
from pathlib import Path
import re
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET

GLOBAL_ORIGIN = "https://5sigmas.com"
SITEMAP_NS = "http://www.sitemaps.org/schemas/sitemap/0.9"
XHTML_NS = "http://www.w3.org/1999/xhtml"

ET.register_namespace("", SITEMAP_NS)
ET.register_namespace("xhtml", XHTML_NS)

# Source-path pairs, not public URLs. Add a pair only when both pages exist.
ROUTE_PAIRS = {
    "herramientas/index.md": "tools/index.md",
    "herramientas/llm-cost-latency.md": "tools/llm-cost-latency.md",
}

_LANGUAGE_ANCHOR_RE = re.compile(
    r'<a\b(?=[^>]*\bhreflang=["\'](?P<lang>es|en)["\'])[^>]*>',
    flags=re.IGNORECASE,
)
_HREF_RE = re.compile(r'\bhref=(["\']).*?\1', flags=re.IGNORECASE)


def _src_route(src_path: str) -> str:
    path = Path(src_path)
    if path.name == "index.md":
        parent = path.parent.as_posix().strip("/")
        return "/" if parent in {"", "."} else f"/{parent}/"
    return "/" + path.with_suffix("").as_posix().strip("/") + "/"


def _english_public_route(src_path: str) -> str:
    route = _src_route(src_path)
    return "/en/" if route == "/" else "/en" + route


def _replace_href(tag: str, href: str) -> str:
    rendered = escape(href, quote=True)
    if _HREF_RE.search(tag):
        return _HREF_RE.sub(f'href="{rendered}"', tag, count=1)
    return tag[:-1] + f' href="{rendered}">'


def _language(config) -> str:
    extra = config.get("extra") or {}
    configured = str(extra.get("content_language") or "").strip().lower()
    if configured:
        return configured
    theme = config.get("theme")
    value = getattr(theme, "language", None)
    if value:
        return str(value).strip().lower()
    if isinstance(theme, dict):
        return str(theme.get("language") or "es").strip().lower()
    return "es"


def on_post_page(output: str, page, config, **kwargs) -> str:
    src_path = page.file.src_path.lstrip("/")
    language = _language(config)

    if language == "es":
        english_src = ROUTE_PAIRS.get(src_path)
        if not english_src:
            return output
        targets = {
            "es": _src_route(src_path),
            "en": _english_public_route(english_src),
        }
    else:
        inverse = {en: es for es, en in ROUTE_PAIRS.items()}
        spanish_src = inverse.get(src_path)
        if not spanish_src:
            return output
        targets = {
            "es": _src_route(spanish_src),
            "en": _english_public_route(src_path),
        }

    def rewrite(match: re.Match[str]) -> str:
        return _replace_href(match.group(0), targets[match.group("lang").lower()])

    return _LANGUAGE_ANCHOR_RE.sub(rewrite, output)


def _normalize_route(url: str, language: str) -> str:
    path = urlsplit(url).path
    route = "/" + path.strip("/")
    route = "/" if route == "/" else route + "/"
    if language == "en":
        if route == "/en/":
            return "/"
        if route.startswith("/en/"):
            return "/" + route[len("/en/"):].strip("/") + "/"
    return route


def on_post_build(config, **kwargs) -> None:
    sitemap = Path(config["site_dir"]) / "sitemap.xml"
    if not sitemap.is_file():
        return

    language = _language(config)
    pairs = [
        (_src_route(es_src), _src_route(en_src))
        for es_src, en_src in ROUTE_PAIRS.items()
    ]
    by_current = {
        (es_route if language == "es" else en_route): (es_route, en_route)
        for es_route, en_route in pairs
    }

    tree = ET.parse(sitemap)
    root = tree.getroot()
    changed = False

    for url_node in root.findall(f"{{{SITEMAP_NS}}}url"):
        loc = url_node.find(f"{{{SITEMAP_NS}}}loc")
        if loc is None or not loc.text:
            continue
        current_route = _normalize_route(loc.text, language)
        pair = by_current.get(current_route)
        if not pair:
            continue

        for child in list(url_node):
            if child.tag == f"{{{XHTML_NS}}}link":
                url_node.remove(child)

        es_route, en_route = pair
        for hreflang, href in (
            ("es", GLOBAL_ORIGIN + es_route),
            ("en", GLOBAL_ORIGIN + _english_public_route(en_route.lstrip("/").replace("/", "/")).replace("/en/en/", "/en/")),
        ):
            # en_route is already a public route; build the /en prefix directly.
            if hreflang == "en":
                href = GLOBAL_ORIGIN + ("/en/" if en_route == "/" else "/en" + en_route)
            ET.SubElement(
                url_node,
                f"{{{XHTML_NS}}}link",
                {"rel": "alternate", "hreflang": hreflang, "href": href},
            )
        changed = True

    if changed:
        tree.write(sitemap, encoding="utf-8", xml_declaration=True)
