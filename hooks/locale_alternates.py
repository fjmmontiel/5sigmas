"""Keep locale switching route-safe without confusing Material's sitemap integration.

Material for MkDocs treats page-level ``link[rel=alternate]`` elements as locale
roots and appends ``sitemap.xml`` to them. Exact per-page hreflang URLs therefore
cause requests such as ``/article/sitemap.xml``. 5sigmas instead uses:

- exact route-aware URLs in the visible language selector;
- ES/EN hreflang pairs in XML sitemaps for routes that truly exist in both locales;
- an English-home selector fallback for Spanish-only pages;
- explicit route equivalence for localized tool slugs (for example
  ``/herramientas/`` ↔ ``/en/tools/``).

``locales/en/manifest.yml`` remains the source of truth for the editorial mirror.
The interactive-tools product layer declares its localized routes in
``tools/locale-en.yml`` so translated public slugs stay explicit and testable.
Generated English video routes are derived from the manifest's generated-surface
flags plus ``locales/en/media.yml``.
"""

from __future__ import annotations

import ast
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


@lru_cache(maxsize=8)
def _tool_route_pairs(locale: str) -> dict[str, str]:
    """Return canonical-source → localized-source tool route pairs."""
    manifest = ROOT / "tools" / f"locale-{locale}.yml"
    if not manifest.is_file():
        return {}
    data = yaml.safe_load(manifest.read_text(encoding="utf-8")) or {}
    if not isinstance(data, dict):
        raise RuntimeError(f"Tool locale manifest must be a mapping: {manifest}")
    pairs: dict[str, str] = {}
    localized_seen: set[str] = set()
    for entry in data.get("routes") or []:
        if not isinstance(entry, dict):
            raise RuntimeError(f"Invalid tool locale route entry: {entry!r}")
        canonical = str(entry.get("canonical") or "").strip().lstrip("/")
        localized = str(entry.get("localized") or "").strip().lstrip("/")
        for label, route in (("canonical", canonical), ("localized", localized)):
            if not route or ".." in Path(route).parts or not route.endswith(".md"):
                raise RuntimeError(f"Unsafe tool {label} route for {locale}: {route!r}")
        if canonical in pairs or localized in localized_seen:
            raise RuntimeError(f"Duplicate tool route equivalent for {locale}: {entry!r}")
        pairs[canonical] = localized
        localized_seen.add(localized)
    return pairs


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


def _source_frontmatter(path: Path) -> dict[str, Any]:
    text = path.read_text(encoding="utf-8")
    match = re.match(r"\A---\s*\n(.*?)\n---\s*(?:\n|$)", text, flags=re.DOTALL)
    if not match:
        return {}
    data = yaml.safe_load(match.group(1)) or {}
    return data if isinstance(data, dict) else {}


def _source_is_not_indexable(meta: dict[str, Any]) -> bool:
    status = str(meta.get("publication_status") or "").strip().lower()
    robots = str(meta.get("robots") or "").strip().lower()
    return status in {"draft", "hidden", "wip", "private"} or "noindex" in robots


def _is_remote_asset(value: str) -> bool:
    return bool(re.match(r"^(?:https?:)?//", value.strip(), flags=re.IGNORECASE))


@lru_cache(maxsize=1)
def _wip_series() -> frozenset[str]:
    module = ast.parse((ROOT / "hooks" / "wip_series.py").read_text(encoding="utf-8"))
    for node in module.body:
        if not isinstance(node, ast.Assign):
            continue
        if any(
            isinstance(target, ast.Name) and target.id == "WIP_SERIES"
            for target in node.targets
        ):
            value = ast.literal_eval(node.value)
            return frozenset(str(item) for item in value)
    return frozenset()


def _spanish_nav_sources() -> frozenset[str]:
    """Read the Spanish public navigation contract without loading MkDocs YAML tags."""
    config_text = (ROOT / "mkdocs.yml").read_text(encoding="utf-8")
    match = re.search(
        r"(?ms)^nav:\s*\n(?P<body>.*?)(?=^markdown_extensions:)",
        config_text,
    )
    if match is None:
        raise RuntimeError("mkdocs.yml has no parseable Spanish nav contract")
    paths = re.findall(
        r"(?m)(?:^|[-:]\s*)([A-Za-z0-9_.\/-]+\.md)\s*$",
        match.group("body"),
    )
    return frozenset(paths)


@lru_cache(maxsize=1)
def _spanish_public_routes() -> frozenset[str]:
    """Derive Spanish indexable routes from nav/front matter plus explicit tool routes."""
    sources = set(_spanish_nav_sources())
    sources.update(_tool_route_pairs("en").keys())
    routes: set[str] = set()

    for source_path in sources:
        if source_path == "videos/index.md":
            routes.add("/videos/")
            continue

        source = ROOT / "docs" / source_path
        if not source.is_file():
            continue

        meta = _source_frontmatter(source)
        source_route = _src_route(source_path)
        if _source_is_not_indexable(meta) or any(
            slug in source_route for slug in _wip_series()
        ):
            continue
        routes.add(source_route)

        video = str(meta.get("video") or "").strip()
        if not video:
            continue
        if not _is_remote_asset(video) and not (source.parent / video).is_file():
            continue
        poster = str(
            meta.get("video_poster") or Path(video).with_suffix(".jpg").name
        ).strip()
        if not _is_remote_asset(poster) and not (source.parent / poster).is_file():
            continue
        source_parent = Path(source_path).parent.as_posix().strip("/")
        routes.add(f"/videos/{source_parent}/{Path(video).stem}/")

    return frozenset(routes)


@lru_cache(maxsize=8)
def _published_routes(locale: str) -> frozenset[str]:
    data = _manifest_data(locale)
    routes = {
        str(route).strip().lstrip("/")
        for route in (data.get("published_routes") or [])
        if str(route).strip()
    }
    routes.update(_tool_route_pairs(locale).values())
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


@lru_cache(maxsize=8)
def _tool_public_route_maps(locale: str) -> tuple[dict[str, str], dict[str, str]]:
    source_pairs = _tool_route_pairs(locale)
    canonical_to_localized = {
        _src_route(canonical): _src_route(localized)
        for canonical, localized in source_pairs.items()
    }
    return canonical_to_localized, {value: key for key, value in canonical_to_localized.items()}


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


def on_post_page(output: str, page, config, **kwargs) -> str:
    src_path = page.file.src_path.lstrip("/")
    current_language = _current_language(config)
    published_english = _published_routes("en")
    tool_pairs = _tool_route_pairs("en")
    tool_reverse = {localized: canonical for canonical, localized in tool_pairs.items()}
    spanish_routes = _spanish_public_routes()

    if current_language == "en":
        english_source = src_path
        spanish_source = tool_reverse.get(english_source, english_source)
    else:
        spanish_source = src_path
        english_source = tool_pairs.get(spanish_source, spanish_source)

    spanish_route = _src_route(spanish_source)
    english_source_route = _src_route(english_source)
    translated_to_english = english_source in published_english

    selector_targets = {
        "es": spanish_route if spanish_route in spanish_routes else "/",
        "en": _english_route(english_source_route) if translated_to_english else "/en/",
    }

    def rewrite_selector(match: re.Match[str]) -> str:
        lang = match.group("lang").lower()
        return _replace_href(match.group(0), selector_targets[lang])

    output = _ALTERNATE_LINK_RE.sub("", output)
    output = _LANGUAGE_ANCHOR_RE.sub(rewrite_selector, output)

    if current_language == "en" and not translated_to_english:
        raise RuntimeError(
            "English page is not declared in the editorial or tools locale contract: "
            f"{src_path}"
        )

    return output


def on_post_build(config, **kwargs) -> None:
    """Add truthful ES/EN hreflang pairs to this locale's XML sitemap."""
    sitemap_path = Path(config["site_dir"]) / "sitemap.xml"
    if not sitemap_path.is_file():
        return

    language = _current_language(config)
    english_routes = _published_public_routes("en")
    spanish_routes = _spanish_public_routes()
    es_to_en, en_to_es = _tool_public_route_maps("en")
    tree = ET.parse(sitemap_path)
    root = tree.getroot()
    changed = False

    for url_node in root.findall(f"{{{SITEMAP_NS}}}url"):
        loc_node = url_node.find(f"{{{SITEMAP_NS}}}loc")
        if loc_node is None or not loc_node.text:
            continue

        local_route = _source_route_from_sitemap_url(loc_node.text, language)

        for child in list(url_node):
            if child.tag == f"{{{XHTML_NS}}}link":
                url_node.remove(child)
                changed = True

        if language == "en":
            english_route = local_route
            spanish_route = en_to_es.get(english_route, english_route)
            if english_route not in english_routes or spanish_route not in spanish_routes:
                continue
        else:
            spanish_route = local_route
            english_route = es_to_en.get(spanish_route, spanish_route)
            if spanish_route not in spanish_routes or english_route not in english_routes:
                continue

        for hreflang, href in (
            ("es", GLOBAL_ORIGIN + spanish_route),
            ("en", GLOBAL_ORIGIN + _english_route(english_route)),
        ):
            ET.SubElement(
                url_node,
                f"{{{XHTML_NS}}}link",
                {"rel": "alternate", "hreflang": hreflang, "href": href},
            )
        changed = True

    if changed:
        tree.write(sitemap_path, encoding="utf-8", xml_declaration=True)
