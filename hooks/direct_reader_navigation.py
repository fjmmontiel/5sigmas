"""Inject a contextual desktop library and a full searchable library."""

from __future__ import annotations

from html import escape
from pathlib import Path
from typing import Any


def _url_for(src_path: str) -> str:
    path = Path(src_path)
    if path.name == "index.md":
        parent = path.parent.as_posix().strip("/")
        return f"/{parent}/" if parent else "/"
    return f"/{path.with_suffix('').as_posix().strip('/')}/"


def _section(nav: list[Any], label: str) -> list[Any]:
    for item in nav or []:
        if isinstance(item, dict) and label in item:
            value = item[label]
            return value if isinstance(value, list) else []
    return []


def _pages(items: list[Any], *, skip_indexes: bool = False) -> list[dict[str, str]]:
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
        pages.append({"title": str(title), "path": src_path, "url": _url_for(src_path)})
    return pages


def _content_count(count: int) -> str:
    return f"{count} contenido" if count == 1 else f"{count} contenidos"


def _collections(config) -> list[dict[str, Any]]:
    nav = config.get("nav") or []
    collections: list[dict[str, Any]] = []

    for item in _section(nav, "Aprender"):
        if not isinstance(item, dict) or len(item) != 1:
            continue
        title, children = next(iter(item.items()))
        if not isinstance(children, list):
            continue
        pages = _pages(children)
        if pages:
            collections.append({"title": str(title), "kind": "Aprender", "pages": pages})

    technical = _pages(_section(nav, "Construir"), skip_indexes=True)
    if technical:
        collections.append({"title": "Notas técnicas", "kind": "Construir", "pages": technical})

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
            f'<small>{"Leyendo" if current else "Abrir"}</small>'
            "</a>"
        )

    collection_search = escape(
        " ".join(
            [collection["kind"], collection["title"], *[page["title"] for page in collection["pages"]]]
        ),
        quote=True,
    )
    current_class = " is-current" if is_current_collection else ""
    current_attr = ' data-current-collection="true"' if is_current_collection else ""
    return (
        f'<section class="s5-reader-direct__collection{current_class}" '
        f'id="s5-direct-collection-{collection_index}" '
        f'data-s5-reader-collection data-search="{collection_search}"{current_attr}>'
        "<header>"
        f'<span>{escape(collection["kind"])}</span>'
        f'<strong>{escape(collection["title"])}</strong>'
        f'<small>{_content_count(len(collection["pages"]))}</small>'
        "</header>"
        f'<nav aria-label="Contenidos de {escape(collection["title"], quote=True)}">'
        f'{"".join(links)}</nav>'
        "</section>"
    )


def _render(
    collections: list[dict[str, Any]],
    current_collection: dict[str, Any],
    current_page: dict[str, str],
) -> tuple[str, str]:
    panels = [
        _collection_panel(collection, index, current_collection, current_page)
        for index, collection in enumerate(collections)
    ]
    page_index = next(
        index for index, page in enumerate(current_collection["pages"]) if page["path"] == current_page["path"]
    )
    progress_label = f"{page_index + 1:02d}/{len(current_collection['pages']):02d}"
    kind_label = "Serie" if current_collection["kind"] == "Aprender" else "Notas"

    aside = (
        '<div class="s5-reader-direct-overlay" data-s5-reader-direct-overlay hidden></div>'
        '<aside class="s5-reader-direct" id="s5-reader-direct" '
        f'data-s5-reader-direct aria-label="Navegación de {escape(current_collection["title"], quote=True)}">'
        '<header class="s5-reader-direct__header">'
        '<div><span>Biblioteca</span>'
        f'<strong>{escape(current_collection["title"])}</strong>'
        f'<small>{kind_label} · {progress_label}</small></div>'
        '<button type="button" data-s5-reader-direct-close aria-label="Cerrar biblioteca">×</button>'
        "</header>"
        '<button class="s5-reader-direct__browse" type="button" data-s5-reader-open>'
        '<span>Toda la biblioteca</span><b aria-hidden="true">↗</b></button>'
        '<label class="s5-reader-direct__search">'
        '<span>Buscar</span>'
        '<input type="search" data-s5-reader-direct-search '
        'placeholder="Serie, capítulo o nota" aria-label="Buscar cualquier serie, capítulo o nota técnica">'
        "</label>"
        f'<div class="s5-reader-direct__collections">{"".join(panels)}'
        '<p class="s5-reader-direct__empty" data-s5-reader-direct-empty hidden>'
        'No hay contenidos que coincidan con la búsqueda.</p></div>'
        "</aside>"
    )

    toggle = (
        '<button class="s5-reader-direct-toggle" type="button" '
        'data-s5-reader-direct-open aria-controls="s5-reader-direct" aria-expanded="false">'
        f'<span>Biblioteca</span><strong>{progress_label} · {escape(current_collection["title"])}</strong>'
        '<b aria-hidden="true">→</b>'
        "</button>"
    )
    return aside, toggle


def on_post_page(output: str, page, config, **kwargs) -> str:
    src_path = page.file.src_path
    if not (src_path.startswith("series/") or src_path.startswith("articulos-tecnicos/")):
        return output
    if Path(src_path).name == "index.md":
        return output

    collections = _collections(config)
    current_collection, current_page = _find_current(collections, src_path)
    if current_collection is None or current_page is None:
        return output

    shell_marker = '<div class="s5-reader-shell"'
    rail_marker = '<nav class="s5-reader-rail"'
    if shell_marker not in output or rail_marker not in output:
        return output

    aside, toggle = _render(collections, current_collection, current_page)
    output = output.replace(shell_marker, aside + shell_marker, 1)
    return output.replace(rail_marker, toggle + rail_marker, 1)
