"""Inject always-visible direct jumps between every series, chapter and technical note."""

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
            collections.append({"title": str(title), "kind": "Serie", "pages": pages})

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


def _series_options(collections: list[dict[str, Any]], current_collection: dict[str, Any]) -> str:
    options: list[str] = []
    for collection in collections:
        selected = ' selected' if collection is current_collection else ''
        first_page = collection["pages"][0]
        options.append(
            f'<option value="{first_page["url"]}"{selected}>{escape(collection["title"])}</option>'
        )
    return "".join(options)


def _content_options(collections: list[dict[str, Any]], current_page: dict[str, str]) -> str:
    groups: list[str] = []
    for collection in collections:
        options: list[str] = []
        for page in collection["pages"]:
            selected = ' selected' if page["path"] == current_page["path"] else ''
            options.append(
                f'<option value="{page["url"]}"{selected}>{escape(page["title"])}</option>'
            )
        groups.append(
            f'<optgroup label="{escape(collection["title"], quote=True)}">{"".join(options)}</optgroup>'
        )
    return "".join(groups)


def _render(collections: list[dict[str, Any]], current_collection: dict[str, Any], current_page: dict[str, str]) -> str:
    return (
        '<nav class="s5-reader-direct" data-s5-reader-direct aria-label="Navegación directa de contenidos">'
        '<label class="s5-reader-direct__field">'
        '<span>Serie</span>'
        '<select data-s5-reader-jump="series" aria-label="Ir directamente a una serie">'
        f'{_series_options(collections, current_collection)}'
        '</select>'
        '</label>'
        '<label class="s5-reader-direct__field s5-reader-direct__field--content">'
        '<span>Capítulo o artículo</span>'
        '<select data-s5-reader-jump="content" aria-label="Ir directamente a cualquier capítulo o artículo">'
        f'{_content_options(collections, current_page)}'
        '</select>'
        '</label>'
        '<button type="button" data-s5-reader-open aria-haspopup="dialog">Mapa</button>'
        '</nav>'
    )


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

    marker = '<nav class="s5-reader-rail"'
    if marker not in output:
        return output
    return output.replace(marker, _render(collections, current_collection, current_page) + marker, 1)
