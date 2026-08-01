"""Inject a persistent reader navigator into series chapters and technical notes."""

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
    for collection in collections:
        for index, page in enumerate(collection["pages"]):
            if page["path"] == src_path:
                return collection, index
    return None, -1


def _page_link(page: dict[str, str] | None, direction: str) -> str:
    if page is None:
        return f'<span class="s5-reader-step s5-reader-step--{direction} is-disabled" aria-hidden="true"></span>'
    arrow = "←" if direction == "prev" else "→"
    label = "Anterior" if direction == "prev" else "Siguiente"
    title = escape(page["title"])
    content = f'<span>{label}</span><strong>{title}</strong>'
    if direction == "prev":
        content = f'<b aria-hidden="true">{arrow}</b>{content}'
    else:
        content = f'{content}<b aria-hidden="true">{arrow}</b>'
    return (
        f'<a class="s5-reader-step s5-reader-step--{direction}" href="{page["url"]}" '
        f'aria-label="{label}: {title}">{content}</a>'
    )


def _collection_markup(
    collection: dict[str, Any],
    number: int,
    src_path: str,
    is_current: bool,
) -> str:
    chapter_links: list[str] = []
    for page_number, page in enumerate(collection["pages"], start=1):
        current = page["path"] == src_path
        current_attr = ' aria-current="page"' if current else ""
        search_value = escape(f'{collection["title"]} {page["title"]}', quote=True)
        chapter_links.append(
            f'<a href="{page["url"]}" data-s5-reader-entry data-search="{search_value}"{current_attr}>'
            f'<span>{page_number:02d}</span><strong>{escape(page["title"])}</strong></a>'
        )

    current_class = " is-current" if is_current else ""
    open_attr = " open" if is_current else ""
    collection_search = escape(
        " ".join([collection["title"], collection["kind"], *[page["title"] for page in collection["pages"]]]),
        quote=True,
    )
    return (
        f'<details class="s5-reader-library__collection{current_class}" data-s5-reader-collection '
        f'data-search="{collection_search}"{open_attr}>'
        '<summary>'
        f'<span>{number:02d}</span>'
        '<div>'
        f'<strong>{escape(collection["title"])}</strong>'
        f'<small>{escape(collection["kind"])} · {len(collection["pages"])} contenidos</small>'
        '</div>'
        f'<b>{"Serie actual" if is_current else "Explorar"}</b>'
        '</summary>'
        f'<nav aria-label="Capítulos de {escape(collection["title"], quote=True)}">{"".join(chapter_links)}</nav>'
        '</details>'
    )


def _render_library(
    collections: list[dict[str, Any]],
    current_collection: dict[str, Any],
    current_page: dict[str, str],
    src_path: str,
) -> str:
    ordered = [current_collection, *[collection for collection in collections if collection is not current_collection]]
    cards = [
        _collection_markup(collection, number, src_path, collection is current_collection)
        for number, collection in enumerate(ordered, start=1)
    ]

    return (
        '<dialog class="s5-reader-library" data-s5-reader-library aria-labelledby="s5-reader-library-title">'
        '<div class="s5-reader-library__surface">'
        '<header class="s5-reader-library__header">'
        '<div class="s5-reader-library__header-copy">'
        '<span>Mapa de aprendizaje 5sigmas</span>'
        '<h2 id="s5-reader-library-title">Series y artículos</h2>'
        f'<p class="s5-reader-library__context">Estás en <strong>{escape(current_collection["title"])}</strong> · '
        f'{escape(current_page["title"])}. La serie actual aparece primero; busca o abre otra cuando quieras cambiar de ruta.</p>'
        '</div>'
        '<div class="s5-reader-library__tools">'
        '<input class="s5-reader-search" type="search" data-s5-reader-search '
        'placeholder="Buscar serie o capítulo" aria-label="Buscar serie o capítulo">'
        '<button type="button" data-s5-reader-close aria-label="Cerrar biblioteca">Cerrar ×</button>'
        '</div>'
        '</header>'
        f'<div class="s5-reader-library__grid">{"".join(cards)}</div>'
        '<p class="s5-reader-empty" data-s5-reader-empty hidden>No hay contenidos que coincidan con la búsqueda.</p>'
        '</div>'
        '</dialog>'
    )


def _render(collections: list[dict[str, Any]], collection: dict[str, Any], index: int, src_path: str) -> str:
    pages = collection["pages"]
    current = pages[index]
    previous = pages[index - 1] if index > 0 else None
    following = pages[index + 1] if index + 1 < len(pages) else None
    progress = round(((index + 1) / len(pages)) * 100, 2)

    return (
        '<div class="s5-reader-nav" data-s5-reader-nav '
        f'data-series="{escape(collection["title"], quote=True)}" '
        f'data-page="{escape(current["title"], quote=True)}" '
        f'data-url="{current["url"]}">'
        '<div class="s5-reader-nav__bar">'
        '<button class="s5-reader-nav__library" type="button" data-s5-reader-open '
        'aria-haspopup="dialog" aria-label="Abrir mapa de aprendizaje">'
        '<span>Mapa</span><b>Series + artículos</b>'
        '</button>'
        f'{_page_link(previous, "prev")}'
        '<div class="s5-reader-current">'
        f'<span>{escape(collection["kind"])} · {index + 1:02d}/{len(pages):02d}</span>'
        f'<strong>{escape(collection["title"])}</strong>'
        f'<small>{escape(current["title"])}</small>'
        f'<i style="--s5-reader-progress:{progress}%" aria-hidden="true"></i>'
        '</div>'
        f'{_page_link(following, "next")}'
        '</div>'
        f'{_render_library(collections, collection, current, src_path)}'
        '</div>'
    )


def on_post_page(output: str, page, config, **kwargs) -> str:
    src_path = page.file.src_path
    if not (src_path.startswith("series/") or src_path.startswith("articulos-tecnicos/")):
        return output
    if Path(src_path).name == "index.md":
        return output

    collections = _library(config)
    collection, index = _find_current(collections, src_path)
    if collection is None:
        return output

    navigation = _render(collections, collection, index, src_path)
    return re.sub(r"(</h1>)", r"\1\n" + navigation, output, count=1)
