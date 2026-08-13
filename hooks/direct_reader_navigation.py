"""Inject a locale-aware contextual desktop library and normalize reader metadata."""

from __future__ import annotations

from html import escape
from pathlib import Path
import re
from typing import Any


_DEFAULT_UI = {
    "learn_section": "Aprender",
    "build_section": "Construir",
    "technical_title": "Notas técnicas",
    "concepts_title": "Conceptos",
    "content_singular": "{count} contenido",
    "content_plural": "{count} contenidos",
    "reading": "Leyendo",
    "open": "Abrir",
    "contents_aria": "Contenidos de {collection}",
    "library": "Biblioteca",
    "close_library": "Cerrar biblioteca",
    "all_library": "Toda la biblioteca",
    "search": "Buscar",
    "direct_search_placeholder": "Serie, capítulo o nota",
    "direct_search_aria": "Buscar cualquier serie, capítulo o nota técnica",
    "no_results": "No hay contenidos que coincidan con la búsqueda.",
    "direct_navigation_aria": "Navegación de {collection}",
    "kind_notes": "Notas",
    "kind_concepts": "Conceptos",
    "kind_series": "Serie",
    "reading_time_label": "Tiempo de lectura",
    "reading_estimated": "Lectura estimada",
    "reading_estimated_aria": "Tiempo estimado de lectura",
}


def _reader_ui(config) -> dict[str, str]:
    ui = dict(_DEFAULT_UI)
    extra = config.get("extra") or {}
    overrides = extra.get("reader_ui") or {}
    if isinstance(overrides, dict):
        for key, value in overrides.items():
            if key in ui and isinstance(value, str) and value.strip():
                ui[key] = value
    return ui


def _locale_prefix(config) -> str:
    extra = config.get("extra") or {}
    raw = str(extra.get("locale_prefix") or "").strip()
    if not raw or raw == "/":
        return ""
    return "/" + raw.strip("/")


def _with_prefix(prefix: str, path: str) -> str:
    normalized = "/" + path.strip("/") + "/" if path.strip("/") else "/"
    if not prefix:
        return normalized
    if normalized == "/":
        return prefix + "/"
    return prefix + normalized


def _url_for(src_path: str, prefix: str = "") -> str:
    path = Path(src_path)
    if path.name == "index.md":
        parent = path.parent.as_posix().strip("/")
        return _with_prefix(prefix, parent)
    return _with_prefix(prefix, path.with_suffix("").as_posix())


def _section(nav: list[Any], label: str) -> list[Any]:
    for item in nav or []:
        if isinstance(item, dict) and label in item:
            value = item[label]
            return value if isinstance(value, list) else []
    return []


def _pages(items: list[Any], *, prefix: str = "", skip_indexes: bool = False) -> list[dict[str, str]]:
    pages: list[dict[str, str]] = []
    for item in items:
        if isinstance(item, str):
            title = Path(item).stem.replace("-", " ").title()
            src_path = item
        elif isinstance(item, dict) and len(item) == 1:
            title, src_path = next(iter(item.items()))
            if not isinstance(src_path, str):
                continue
        else:
            continue
        if skip_indexes and Path(src_path).name == "index.md":
            continue
        pages.append({"title": str(title), "path": src_path, "url": _url_for(src_path, prefix)})
    return pages


def _content_count(count: int, ui: dict[str, str]) -> str:
    template = ui["content_singular"] if count == 1 else ui["content_plural"]
    return template.format(count=count)


def _collections(config, ui: dict[str, str], prefix: str) -> list[dict[str, Any]]:
    nav = config.get("nav") or []
    collections: list[dict[str, Any]] = []

    for item in _section(nav, ui["learn_section"]):
        if not isinstance(item, dict) or len(item) != 1:
            continue
        title, children = next(iter(item.items()))
        if not isinstance(children, list):
            continue
        pages = _pages(children, prefix=prefix)
        if pages:
            collections.append({"type": "series", "title": str(title), "kind": ui["learn_section"], "pages": pages})

    technical = _pages(_section(nav, ui["build_section"]), prefix=prefix, skip_indexes=True)
    if technical:
        collections.append({"type": "technical", "title": ui["technical_title"], "kind": ui["build_section"], "pages": technical})

    return collections


def _find_current(collections: list[dict[str, Any]], src_path: str):
    for collection in collections:
        for page in collection["pages"]:
            if page["path"] == src_path:
                return collection, page
    return None, None


def _collection_panel(
    collection: dict[str, Any],
    collection_index: int,
    current_collection: dict[str, Any],
    current_page: dict[str, str],
    ui: dict[str, str],
) -> str:
    is_current_collection = collection is current_collection
    links: list[str] = []
    for page_number, page in enumerate(collection["pages"], start=1):
        current = page["path"] == current_page["path"]
        current_attr = ' aria-current="page"' if current else ""
        search_value = escape(
            f'{collection["kind"]} {collection["title"]} {page["title"]}',
            quote=True,
        )
        links.append(
            f'<a href="{page["url"]}" data-s5-direct-entry data-search="{search_value}"{current_attr}>'
            f'<span>{page_number:02d}</span>'
            f'<strong>{escape(page["title"])}</strong>'
            f'<small>{escape(ui["reading"] if current else ui["open"])}</small>'
            "</a>"
        )

    collection_search = escape(
        " ".join([collection["kind"], collection["title"], *[page["title"] for page in collection["pages"]]]),
        quote=True,
    )
    current_class = " is-current" if is_current_collection else ""
    current_attr = ' data-current-collection="true"' if is_current_collection else ""
    contents_aria = ui["contents_aria"].format(collection=collection["title"])
    return (
        f'<section class="s5-reader-direct__collection{current_class}" '
        f'id="s5-direct-collection-{collection_index}" '
        f'data-s5-reader-collection data-search="{collection_search}"{current_attr}>'
        "<header>"
        f'<span>{escape(collection["kind"])}</span>'
        f'<strong>{escape(collection["title"])}</strong>'
        f'<small>{_content_count(len(collection["pages"]), ui)}</small>'
        "</header>"
        f'<nav aria-label="{escape(contents_aria, quote=True)}">'
        f'{"".join(links)}</nav>'
        "</section>"
    )


def _render(
    collections: list[dict[str, Any]],
    current_collection: dict[str, Any],
    current_page: dict[str, str],
    ui: dict[str, str],
) -> tuple[str, str]:
    panels = [
        _collection_panel(collection, index, current_collection, current_page, ui)
        for index, collection in enumerate(collections)
    ]
    page_index = next(
        index for index, page in enumerate(current_collection["pages"]) if page["path"] == current_page["path"]
    )
    progress_label = f"{page_index + 1:02d}/{len(current_collection['pages']):02d}"
    kind_label = (
        ui["kind_notes"]
        if current_collection["type"] == "technical"
        else (ui["kind_concepts"] if current_collection["title"] == ui["concepts_title"] else ui["kind_series"])
    )
    nav_aria = ui["direct_navigation_aria"].format(collection=current_collection["title"])

    aside = (
        '<div class="s5-reader-direct-overlay" data-s5-reader-direct-overlay hidden></div>'
        '<aside class="s5-reader-direct" id="s5-reader-direct" '
        f'data-s5-reader-direct aria-label="{escape(nav_aria, quote=True)}">'
        '<header class="s5-reader-direct__header">'
        f'<div><span>{escape(ui["library"])}</span>'
        f'<strong>{escape(current_collection["title"])}</strong>'
        f'<small>{escape(kind_label)} · {progress_label}</small></div>'
        f'<button type="button" data-s5-reader-direct-close aria-label="{escape(ui["close_library"], quote=True)}">×</button>'
        "</header>"
        '<button class="s5-reader-direct__browse" type="button" data-s5-reader-open>'
        f'<span>{escape(ui["all_library"])}</span><b aria-hidden="true">↗</b></button>'
        '<label class="s5-reader-direct__search">'
        f'<span>{escape(ui["search"])}</span>'
        f'<input type="search" data-s5-reader-direct-search placeholder="{escape(ui["direct_search_placeholder"], quote=True)}" '
        f'aria-label="{escape(ui["direct_search_aria"], quote=True)}">'
        "</label>"
        f'<div class="s5-reader-direct__collections">{"".join(panels)}'
        f'<p class="s5-reader-direct__empty" data-s5-reader-direct-empty hidden>{escape(ui["no_results"])}</p></div>'
        "</aside>"
    )

    toggle = (
        '<button class="s5-reader-direct-toggle" type="button" '
        'data-s5-reader-direct-open aria-controls="s5-reader-direct" aria-expanded="false">'
        f'<span>{escape(ui["library"])}</span><strong>{progress_label} · {escape(current_collection["title"])}</strong>'
        '<b aria-hidden="true">→</b>'
        "</button>"
    )
    return aside, toggle


def _reading_time_pattern(ui: dict[str, str]) -> re.Pattern[str]:
    label = re.escape(ui["reading_time_label"].rstrip(":"))
    return re.compile(
        rf'<blockquote>\s*<p>[^<]*<strong>{label}:?</strong>\s*[^<]*</p>\s*</blockquote>',
        flags=re.IGNORECASE,
    )


def _normalize_series_metadata(output: str, page, ui: dict[str, str]) -> str:
    src_path = page.file.src_path
    if not src_path.startswith("series/"):
        return output

    pattern = _reading_time_pattern(ui)
    match = pattern.search(output)
    if Path(src_path).name == "00_presentacion_serie.md":
        return pattern.sub("", output, count=1)

    minutes = (page.meta or {}).get("reading_time")
    if not minutes and match:
        found = re.search(r"(\d+)\s*min\b", match.group(0), flags=re.IGNORECASE)
        if found:
            minutes = found.group(1)
    if not minutes or not match:
        return output

    replacement = (
        f'<div class="s5-reading-meta" aria-label="{escape(ui["reading_estimated_aria"], quote=True)}">'
        f'<span>{escape(ui["reading_estimated"])}</span>'
        f'<strong>{escape(str(minutes))} min</strong>'
        '</div>'
    )
    return pattern.sub(replacement, output, count=1)


def on_post_page(output: str, page, config, **kwargs) -> str:
    src_path = page.file.src_path
    if not (src_path.startswith("series/") or src_path.startswith("articulos-tecnicos/")):
        return output
    if Path(src_path).name == "index.md":
        return output

    ui = _reader_ui(config)
    prefix = _locale_prefix(config)
    collections = _collections(config, ui, prefix)
    current_collection, current_page = _find_current(collections, src_path)
    if current_collection is None or current_page is None:
        return output

    shell_marker = '<div class="s5-reader-shell"'
    rail_marker = '<nav class="s5-reader-rail"'
    if shell_marker not in output or rail_marker not in output:
        return output

    aside, toggle = _render(collections, current_collection, current_page, ui)
    output = output.replace(shell_marker, aside + shell_marker, 1)
    output = output.replace(rail_marker, toggle + rail_marker, 1)
    return _normalize_series_metadata(output, page, ui)
