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


def _render_library(collections: list[dict[str, Any]], src_path: str) -> str:
    cards: list[str] = []
    for number, collection in enumerate(collections, start=1):
        chapter_links: list[str] = []
        for page_number, page in enumerate(collection["pages"], start=1):
            current = page["path"] == src_path
            current_attr = ' aria-current="page"' if current else ""
            chapter_links.append(
                f'<a href="{page["url"]}"{current_attr}>'
                f'<span>{page_number:02d}</span><strong>{escape(page["title"])}</strong></a>'
            )
        cards.append(
            '<section class="s5-reader-library__collection">'
            '<header>'
            f'<span>{number:02d} · {escape(collection["kind"])}</span>'
            f'<h3><a href="{collection["url"]}">{escape(collection["title"])}</a></h3>'
            f'<small>{len(collection["pages"])} contenidos</small>'
            '</header>'
            f'<nav>{"".join(chapter_links)}</nav>'
            '</section>'
        )

    return (
        '<dialog class="s5-reader-library" data-s5-reader-library aria-labelledby="s5-reader-library-title">'
        '<div class="s5-reader-library__surface">'
        '<header class="s5-reader-library__header">'
        '<div><span>Biblioteca 5sigmas</span><h2 id="s5-reader-library-title">Todas las series y artículos</h2></div>'
        '<button type="button" data-s5-reader-close aria-label="Cerrar biblioteca">Cerrar ×</button>'
        '</header>'
        f'<div class="s5-reader-library__grid">{"".join(cards)}</div>'
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
        '<div class="s5-reader-nav" data-s5-reader-nav>'
        '<div class="s5-reader-nav__bar">'
        '<button class="s5-reader-nav__library" type="button" data-s5-reader-open '
        'aria-haspopup="dialog" aria-label="Abrir todas las series y artículos">'
        '<span>Biblioteca</span><b>Series + artículos</b>'
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
        f'{_render_library(collections, src_path)}'
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
