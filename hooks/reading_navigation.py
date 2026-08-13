"""Inject locale-aware contextual navigation into series chapters and technical notes."""

from __future__ import annotations

from html import escape
from pathlib import Path
import re
from typing import Any


_DEFAULT_UI = {
    "learn_section": "Aprender",
    "build_section": "Construir",
    "series_kind": "Serie",
    "build_kind": "Construir",
    "technical_title": "Notas técnicas",
    "content_singular": "{count} contenido",
    "content_plural": "{count} contenidos",
    "previous": "Anterior",
    "next": "Siguiente",
    "chapters_aria": "Capítulos de {collection}",
    "reading": "Leyendo",
    "open": "Abrir",
    "contents_aria": "Contenidos de {collection}",
    "library": "Biblioteca",
    "library_title": "Series y notas técnicas.",
    "you_are_in": "Estás en",
    "search_placeholder": "Buscar serie, capítulo o nota",
    "search_aria": "Buscar serie, capítulo o nota técnica",
    "close_library": "Cerrar biblioteca",
    "close": "Cerrar ×",
    "library_catalogue_aria": "Series y notas técnicas",
    "no_results": "No hay contenidos que coincidan con la búsqueda.",
    "next_chapter": "Siguiente capítulo",
    "series_completed": "Serie completada",
    "choose_next_path": "Elige la siguiente ruta",
    "all_series": "Todas las series",
    "note_completed": "Nota completada",
    "explore_technical": "Explorar notas técnicas",
    "all_technical": "Todas las notas técnicas",
    "continue_learning": "Continúa aprendiendo",
    "open_library": "Abrir biblioteca",
    "continue_aria": "Continuar aprendizaje",
    "context_aria": "Contexto de lectura",
    "navigation_aria": "Navegación de {collection}",
    "progress_of": "de",
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
        result.append({"title": str(title), "path": src_path, "url": _url_for(src_path, prefix)})
    return result


def _content_count(count: int, ui: dict[str, str]) -> str:
    template = ui["content_singular"] if count == 1 else ui["content_plural"]
    return template.format(count=count)


def _library(config, ui: dict[str, str], prefix: str) -> list[dict[str, Any]]:
    nav = config.get("nav") or []
    collections: list[dict[str, Any]] = []

    for item in _section(nav, ui["learn_section"]):
        if not isinstance(item, dict) or len(item) != 1:
            continue
        title, children = next(iter(item.items()))
        if not isinstance(children, list):
            continue
        chapters = _pages(children, prefix=prefix)
        if chapters:
            collections.append(
                {
                    "type": "series",
                    "kind": ui["series_kind"],
                    "title": str(title),
                    "url": chapters[0]["url"],
                    "pages": chapters,
                }
            )

    technical = _pages(_section(nav, ui["build_section"]), prefix=prefix, skip_indexes=True)
    if technical:
        collections.append(
            {
                "type": "technical",
                "kind": ui["build_kind"],
                "title": ui["technical_title"],
                "url": _with_prefix(prefix, "articulos-tecnicos"),
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


def _neighbor_link(
    item: dict[str, str] | None,
    direction: str,
    collection: dict[str, Any],
    ui: dict[str, str],
) -> str:
    if item is None:
        return f'<span class="s5-reader-arrow s5-reader-arrow--{direction} is-disabled" aria-hidden="true"></span>'

    arrow = "←" if direction == "prev" else "→"
    label = ui["previous"] if direction == "prev" else ui["next"]
    title = escape(item["title"])
    collection_title = escape(collection["title"])

    copy = f'<span>{escape(label)}</span><strong>{title}</strong><small>{collection_title}</small>'
    if direction == "prev":
        copy = f'<b aria-hidden="true">{arrow}</b><span class="s5-reader-arrow__copy">{copy}</span>'
    else:
        copy = f'<span class="s5-reader-arrow__copy">{copy}</span><b aria-hidden="true">{arrow}</b>'

    return (
        f'<a class="s5-reader-arrow s5-reader-arrow--{direction}" href="{item["url"]}" '
        f'aria-label="{escape(label, quote=True)}: {title}">{copy}</a>'
    )


def _chapter_rail(collection: dict[str, Any], src_path: str, ui: dict[str, str]) -> str:
    links: list[str] = []
    for number, page in enumerate(collection["pages"], start=1):
        current = page["path"] == src_path
        current_attr = ' aria-current="page"' if current else ""
        links.append(
            f'<a href="{page["url"]}"{current_attr}>'
            f'<span>{number:02d}</span><strong>{escape(page["title"])}</strong></a>'
        )
    aria = ui["chapters_aria"].format(collection=collection["title"])
    return f'<nav class="s5-reader-rail" aria-label="{escape(aria, quote=True)}">{"".join(links)}</nav>'


def _series_id(number: int) -> str:
    return f"s5-reader-series-{number}"


def _series_tab(collection: dict[str, Any], number: int, is_current: bool, ui: dict[str, str]) -> str:
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
        f'<small>{escape(collection["kind"])} · {_content_count(len(collection["pages"]), ui)}</small></span></button>'
    )


def _series_panel(
    collection: dict[str, Any],
    number: int,
    src_path: str,
    is_current: bool,
    ui: dict[str, str],
) -> str:
    chapter_links: list[str] = []
    for page_number, page in enumerate(collection["pages"], start=1):
        current = page["path"] == src_path
        current_attr = ' aria-current="page"' if current else ""
        search_value = escape(f'{collection["title"]} {page["title"]}', quote=True)
        chapter_links.append(
            f'<a href="{page["url"]}" data-s5-reader-entry data-search="{search_value}"{current_attr}>'
            f'<span>{page_number:02d}</span><strong>{escape(page["title"])}</strong>'
            f'<b>{escape(ui["reading"] if current else ui["open"])}</b></a>'
        )

    hidden = "" if is_current else " hidden"
    contents_aria = ui["contents_aria"].format(collection=collection["title"])
    return (
        f'<section class="s5-reader-series-panel" role="tabpanel" id="{_series_id(number)}" '
        f'aria-labelledby="{_series_id(number)}-tab" data-s5-series-panel="{_series_id(number)}"{hidden}>'
        '<header>'
        f'<div><span>{escape(collection["kind"])}</span><h3>{escape(collection["title"])}</h3></div>'
        f'<small>{_content_count(len(collection["pages"]), ui)}</small>'
        '</header>'
        f'<nav aria-label="{escape(contents_aria, quote=True)}">{"".join(chapter_links)}</nav>'
        '</section>'
    )


def _render_map(
    collections: list[dict[str, Any]],
    current_collection: dict[str, Any],
    current_page: dict[str, str],
    src_path: str,
    ui: dict[str, str],
) -> str:
    tabs = [
        _series_tab(collection, number, collection is current_collection, ui)
        for number, collection in enumerate(collections, start=1)
    ]
    panels = [
        _series_panel(collection, number, src_path, collection is current_collection, ui)
        for number, collection in enumerate(collections, start=1)
    ]

    return (
        '<dialog class="s5-reader-map" data-s5-reader-library aria-labelledby="s5-reader-map-title">'
        '<div class="s5-reader-map__surface">'
        '<header class="s5-reader-map__header">'
        f'<div><span>{escape(ui["library"])}</span><h2 id="s5-reader-map-title">{escape(ui["library_title"])}</h2>'
        f'<p>{escape(ui["you_are_in"])} <strong>{escape(current_collection["title"])}</strong> · {escape(current_page["title"])}.</p></div>'
        '<div class="s5-reader-map__tools">'
        f'<input class="s5-reader-search" type="search" data-s5-reader-search placeholder="{escape(ui["search_placeholder"], quote=True)}" '
        f'aria-label="{escape(ui["search_aria"], quote=True)}">'
        f'<button type="button" data-s5-reader-close aria-label="{escape(ui["close_library"], quote=True)}">{escape(ui["close"])}</button>'
        '</div>'
        '</header>'
        '<div class="s5-reader-map__body">'
        f'<div class="s5-reader-series-list" role="tablist" aria-label="{escape(ui["library_catalogue_aria"], quote=True)}">{"".join(tabs)}</div>'
        f'<div class="s5-reader-series-panels">{"".join(panels)}'
        f'<p class="s5-reader-empty" data-s5-reader-empty hidden>{escape(ui["no_results"])}</p>'
        '</div>'
        '</div>'
        '</div>'
        '</dialog>'
    )


def _render_end(
    previous: dict[str, str] | None,
    following: dict[str, str] | None,
    current_collection: dict[str, Any],
    ui: dict[str, str],
    prefix: str,
) -> str:
    if following is not None:
        primary = (
            f'<a class="s5-reader-end__next" href="{following["url"]}">'
            f'<span>{escape(ui["next_chapter"])}</span><strong>{escape(following["title"])}</strong>'
            f'<small>{escape(current_collection["title"])}</small><b aria-hidden="true">→</b></a>'
        )
    elif current_collection["type"] == "series":
        primary = (
            f'<a class="s5-reader-end__next" href="{_with_prefix(prefix, "series")}">'
            f'<span>{escape(ui["series_completed"])}</span><strong>{escape(ui["choose_next_path"])}</strong>'
            f'<small>{escape(ui["all_series"])}</small><b aria-hidden="true">→</b></a>'
        )
    else:
        primary = (
            f'<a class="s5-reader-end__next" href="{_with_prefix(prefix, "articulos-tecnicos")}">'
            f'<span>{escape(ui["note_completed"])}</span><strong>{escape(ui["explore_technical"])}</strong>'
            f'<small>{escape(ui["build_section"])}</small><b aria-hidden="true">→</b></a>'
        )

    previous_link = ""
    if previous is not None:
        previous_link = f'<a class="s5-reader-end__previous" href="{previous["url"]}">← {escape(previous["title"])}</a>'

    is_series = current_collection["type"] == "series"
    catalogue_url = _with_prefix(prefix, "series" if is_series else "articulos-tecnicos")
    catalogue_label = ui["all_series"] if is_series else ui["all_technical"]

    return (
        f'<section class="s5-reader-end" aria-label="{escape(ui["continue_aria"], quote=True)}">'
        f'<div class="s5-reader-end__label"><span>{escape(ui["continue_learning"])}</span>'
        f'<button type="button" data-s5-reader-open>{escape(ui["open_library"])}</button></div>'
        f'{primary}<div class="s5-reader-end__footer">{previous_link}'
        f'<a href="{catalogue_url}">{escape(catalogue_label)} →</a></div>'
        '</section>'
    )


def _render_context(collection: dict[str, Any], index: int, ui: dict[str, str]) -> str:
    section = ui["learn_section"] if collection["type"] == "series" else ui["build_section"]
    return (
        f'<div class="s5-reader-context" aria-label="{escape(ui["context_aria"], quote=True)}">'
        f'<button type="button" data-s5-reader-open>{escape(section)}</button>'
        '<span aria-hidden="true">·</span>'
        f'<span>{index + 1:02d} {escape(ui["progress_of"])} {len(collection["pages"]):02d}</span>'
        '<span aria-hidden="true">·</span>'
        f'<strong>{escape(collection["title"])}</strong>'
        '</div>'
    )


def _render(
    collections: list[dict[str, Any]],
    collection: dict[str, Any],
    index: int,
    src_path: str,
    ui: dict[str, str],
    prefix: str,
) -> tuple[str, str, str]:
    pages = collection["pages"]
    current = pages[index]
    progress = round(((index + 1) / len(pages)) * 100, 2)
    previous = pages[index - 1] if index > 0 else None
    following = pages[index + 1] if index + 1 < len(pages) else None

    context = _render_context(collection, index, ui)
    nav_aria = ui["navigation_aria"].format(collection=collection["title"])
    top = (
        '<div class="s5-reader-shell" data-s5-reader-nav '
        f'data-series="{escape(collection["title"], quote=True)}" '
        f'data-page="{escape(current["title"], quote=True)}" data-url="{current["url"]}">'
        f'<nav class="s5-reader-topbar" aria-label="{escape(nav_aria, quote=True)}">'
        f'{_neighbor_link(previous, "prev", collection, ui)}'
        '<button class="s5-reader-course" type="button" data-s5-reader-open aria-haspopup="dialog">'
        f'<span>{escape(collection["title"])}</span>'
        f'<strong>{index + 1:02d}/{len(pages):02d} · {escape(current["title"])}</strong>'
        f'<i style="--s5-reader-progress:{progress}%" aria-hidden="true"></i>'
        '</button>'
        f'{_neighbor_link(following, "next", collection, ui)}'
        '</nav>'
        f'{_chapter_rail(collection, src_path, ui)}'
        f'{_render_map(collections, collection, current, src_path, ui)}'
        '</div>'
    )
    end = _render_end(previous, following, collection, ui, prefix)
    return context, top, end


def on_post_page(output: str, page, config, **kwargs) -> str:
    src_path = page.file.src_path
    if not (src_path.startswith("series/") or src_path.startswith("articulos-tecnicos/")):
        return output
    if Path(src_path).name == "index.md":
        return output

    ui = _reader_ui(config)
    prefix = _locale_prefix(config)
    collections = _library(config, ui, prefix)
    collection, _, index = _find_current(collections, src_path)
    if collection is None:
        return output

    context, top, end = _render(collections, collection, index, src_path, ui, prefix)
    output = re.sub(r"(<h1(?:\s[^>]*)?>)", context + r"\1", output, count=1)
    output = re.sub(r"(</h1>)", r"\1\n" + top, output, count=1)
    output = re.sub(r"(</article>)", end + r"\1", output, count=1)
    return output
