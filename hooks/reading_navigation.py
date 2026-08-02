"""Inject compact course navigation into series chapters and technical notes."""

from __future__ import annotations

from html import escape
from pathlib import Path
import re
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
    result: list[dict[str, str]] = []
    for item in items:
        if isinstance(item, str):
            src_path = item
            title = Path(item).stem.replace("-", " ").title()
        elif isinstance(item, dict) and len(item) == 1:
            title, src_path = next(iter(item.items()))
            if not isinstance(src_path, str):
                continue
        else:
            continue
        if skip_indexes and Path(src_path).name == "index.md":
            continue
        result.append({"title": str(title), "path": src_path, "url": _url_for(src_path)})
    return result


def _library(config) -> list[dict[str, Any]]:
    nav = config.get("nav") or []
    collections: list[dict[str, Any]] = []

    for item in _section(nav, "Aprender"):
        if not isinstance(item, dict) or len(item) != 1:
            continue
        title, children = next(iter(item.items()))
        if not isinstance(children, list):
            continue
        chapters = _pages(children)
        if chapters:
            collections.append(
                {
                    "kind": "Serie",
                    "title": str(title),
                    "url": chapters[0]["url"],
                    "pages": chapters,
                }
            )

    technical = _pages(_section(nav, "Construir"), skip_indexes=True)
    if technical:
        collections.append(
            {
                "kind": "Construir",
                "title": "Notas técnicas",
                "url": "/articulos-tecnicos/",
                "pages": technical,
            }
        )

    return collections


def _find_current(collections: list[dict[str, Any]], src_path: str):
    for collection_index, collection in enumerate(collections):
        for page_index, page in enumerate(collection["pages"]):
            if page["path"] == src_path:
                return collection, collection_index, page_index
    return None, -1, -1


def _flat_pages(collections: list[dict[str, Any]]) -> list[dict[str, Any]]:
    flattened: list[dict[str, Any]] = []
    for collection in collections:
        for page_index, page in enumerate(collection["pages"]):
            flattened.append(
                {
                    **page,
                    "collection": collection,
                    "page_index": page_index,
                }
            )
    return flattened


def _neighbor_link(item: dict[str, Any] | None, direction: str, current_collection: dict[str, Any]) -> str:
    if item is None:
        return f'<span class="s5-reader-arrow s5-reader-arrow--{direction} is-disabled" aria-hidden="true"></span>'

    arrow = "←" if direction == "prev" else "→"
    same_series = item["collection"] is current_collection
    label = "Anterior" if direction == "prev" else "Siguiente"
    if not same_series:
        label = "Serie anterior" if direction == "prev" else "Siguiente serie"
    title = escape(item["title"])
    series = escape(item["collection"]["title"])

    copy = f'<span>{label}</span><strong>{title}</strong><small>{series}</small>'
    if direction == "prev":
        copy = f'<b aria-hidden="true">{arrow}</b><span class="s5-reader-arrow__copy">{copy}</span>'
    else:
        copy = f'<span class="s5-reader-arrow__copy">{copy}</span><b aria-hidden="true">{arrow}</b>'

    return (
        f'<a class="s5-reader-arrow s5-reader-arrow--{direction}" href="{item["url"]}" '
        f'aria-label="{label}: {title}">{copy}</a>'
    )


def _chapter_rail(collection: dict[str, Any], src_path: str) -> str:
    links: list[str] = []
    for number, page in enumerate(collection["pages"], start=1):
        current = page["path"] == src_path
        current_attr = ' aria-current="page"' if current else ""
        links.append(
            f'<a href="{page["url"]}"{current_attr}>'
            f'<span>{number:02d}</span><strong>{escape(page["title"])}</strong></a>'
        )
    return (
        f'<nav class="s5-reader-rail" aria-label="Capítulos de {escape(collection["title"], quote=True)}">'
        f'{"".join(links)}</nav>'
    )


def _series_id(number: int) -> str:
    return f"s5-reader-series-{number}"


def _series_tab(collection: dict[str, Any], number: int, is_current: bool) -> str:
    selected = "true" if is_current else "false"
    search_value = escape(
        " ".join([collection["title"], collection["kind"], *[page["title"] for page in collection["pages"]]]),
        quote=True,
    )
    return (
        f'<button type="button" role="tab" class="s5-reader-series-tab" '
        f'id="{_series_id(number)}-tab" aria-controls="{_series_id(number)}" '
        f'aria-selected="{selected}" tabindex="{0 if is_current else -1}" '
        f'data-s5-series-tab="{_series_id(number)}" data-search="{search_value}">'
        f'<span>{number:02d}</span><span><strong>{escape(collection["title"])}</strong>'
        f'<small>{escape(collection["kind"])} · {len(collection["pages"])} contenidos</small></span></button>'
    )


def _series_panel(collection: dict[str, Any], number: int, src_path: str, is_current: bool) -> str:
    chapter_links: list[str] = []
    for page_number, page in enumerate(collection["pages"], start=1):
        current = page["path"] == src_path
        current_attr = ' aria-current="page"' if current else ""
        search_value = escape(f'{collection["title"]} {page["title"]}', quote=True)
        chapter_links.append(
            f'<a href="{page["url"]}" data-s5-reader-entry data-search="{search_value}"{current_attr}>'
            f'<span>{page_number:02d}</span><strong>{escape(page["title"])}</strong>'
            f'<b>{"Leyendo" if current else "Abrir"}</b></a>'
        )

    hidden = "" if is_current else " hidden"
    return (
        f'<section class="s5-reader-series-panel" role="tabpanel" id="{_series_id(number)}" '
        f'aria-labelledby="{_series_id(number)}-tab" data-s5-series-panel="{_series_id(number)}"{hidden}>'
        '<header>'
        f'<div><span>{escape(collection["kind"])}</span><h3>{escape(collection["title"])}</h3></div>'
        f'<small>{len(collection["pages"])} contenidos</small>'
        '</header>'
        f'<nav aria-label="Contenidos de {escape(collection["title"], quote=True)}">{"".join(chapter_links)}</nav>'
        '</section>'
    )


def _render_map(
    collections: list[dict[str, Any]],
    current_collection: dict[str, Any],
    current_page: dict[str, str],
    src_path: str,
) -> str:
    ordered = [current_collection, *[collection for collection in collections if collection is not current_collection]]
    tabs = [
        _series_tab(collection, number, collection is current_collection)
        for number, collection in enumerate(ordered, start=1)
    ]
    panels = [
        _series_panel(collection, number, src_path, collection is current_collection)
        for number, collection in enumerate(ordered, start=1)
    ]

    return (
        '<dialog class="s5-reader-map" data-s5-reader-library aria-labelledby="s5-reader-map-title">'
        '<div class="s5-reader-map__surface">'
        '<header class="s5-reader-map__header">'
        '<div><span>Mapa de aprendizaje</span><h2 id="s5-reader-map-title">Navega sin perder el contexto.</h2>'
        f'<p>Estás en <strong>{escape(current_collection["title"])}</strong> · {escape(current_page["title"])}.</p></div>'
        '<div class="s5-reader-map__tools">'
        '<input class="s5-reader-search" type="search" data-s5-reader-search '
        'placeholder="Buscar serie o capítulo" aria-label="Buscar serie o capítulo">'
        '<button type="button" data-s5-reader-close aria-label="Cerrar mapa">Cerrar ×</button>'
        '</div>'
        '</header>'
        '<div class="s5-reader-map__body">'
        f'<div class="s5-reader-series-list" role="tablist" aria-label="Series y artículos">{"".join(tabs)}</div>'
        f'<div class="s5-reader-series-panels">{"".join(panels)}'
        '<p class="s5-reader-empty" data-s5-reader-empty hidden>No hay contenidos que coincidan con la búsqueda.</p>'
        '</div>'
        '</div>'
        '</div>'
        '</dialog>'
    )


def _render_end(
    previous: dict[str, Any] | None,
    following: dict[str, Any] | None,
    current_collection: dict[str, Any],
) -> str:
    if following is not None:
        next_label = "Siguiente capítulo" if following["collection"] is current_collection else "Siguiente serie"
        primary = (
            f'<a class="s5-reader-end__next" href="{following["url"]}">'
            f'<span>{next_label}</span><strong>{escape(following["title"])}</strong>'
            f'<small>{escape(following["collection"]["title"])}</small><b aria-hidden="true">→</b></a>'
        )
    else:
        primary = (
            '<a class="s5-reader-end__next" href="/series/">'
            '<span>Has completado la biblioteca</span><strong>Explorar todas las series</strong>'
            '<small>Elige una nueva ruta</small><b aria-hidden="true">→</b></a>'
        )

    previous_link = ""
    if previous is not None:
        previous_link = (
            f'<a class="s5-reader-end__previous" href="{previous["url"]}">'
            f'← {escape(previous["title"])}</a>'
        )

    return (
        '<section class="s5-reader-end" aria-label="Continuar aprendizaje">'
        '<div class="s5-reader-end__label"><span>Continúa aprendiendo</span>'
        f'<button type="button" data-s5-reader-open>Ver todos los capítulos</button></div>'
        f'{primary}<div class="s5-reader-end__footer">{previous_link}'
        '<a href="/series/">Todas las series →</a></div>'
        '</section>'
    )


def _render(collections: list[dict[str, Any]], collection: dict[str, Any], collection_index: int, index: int, src_path: str) -> tuple[str, str]:
    pages = collection["pages"]
    current = pages[index]
    progress = round(((index + 1) / len(pages)) * 100, 2)

    flattened = _flat_pages(collections)
    flat_index = next(i for i, item in enumerate(flattened) if item["path"] == src_path)
    previous = flattened[flat_index - 1] if flat_index > 0 else None
    following = flattened[flat_index + 1] if flat_index + 1 < len(flattened) else None

    top = (
        '<div class="s5-reader-shell" data-s5-reader-nav '
        f'data-series="{escape(collection["title"], quote=True)}" '
        f'data-page="{escape(current["title"], quote=True)}" data-url="{current["url"]}">'
        '<div class="s5-reader-topbar">'
        f'{_neighbor_link(previous, "prev", collection)}'
        '<button class="s5-reader-course" type="button" data-s5-reader-open aria-haspopup="dialog">'
        f'<span>{escape(collection["title"])}</span>'
        f'<strong>{index + 1:02d}/{len(pages):02d} · {escape(current["title"])}</strong>'
        f'<i style="--s5-reader-progress:{progress}%" aria-hidden="true"></i>'
        '</button>'
        f'{_neighbor_link(following, "next", collection)}'
        '</div>'
        f'{_chapter_rail(collection, src_path)}'
        f'{_render_map(collections, collection, current, src_path)}'
        '</div>'
    )
    end = _render_end(previous, following, collection)
    return top, end


def on_post_page(output: str, page, config, **kwargs) -> str:
    src_path = page.file.src_path
    if not (src_path.startswith("series/") or src_path.startswith("articulos-tecnicos/")):
        return output
    if Path(src_path).name == "index.md":
        return output

    collections = _library(config)
    collection, collection_index, index = _find_current(collections, src_path)
    if collection is None:
        return output

    top, end = _render(collections, collection, collection_index, index, src_path)
    output = re.sub(r"(</h1>)", r"\1\n" + top, output, count=1)
    output = re.sub(r"(</article>)", end + r"\1", output, count=1)
    return output
