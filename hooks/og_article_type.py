"""Correct generated search titles and Open Graph page types."""

from html import escape
import re


def _parts(page) -> list[str]:
    value = (page.url or "").strip("/")
    return value.split("/") if value else []


def _is_series_presentation(page) -> bool:
    parts = _parts(page)
    return len(parts) >= 3 and parts[0] == "series" and parts[2] == "00_presentacion_serie"


def _is_article(page) -> bool:
    parts = _parts(page)
    if not parts:
        return False
    if parts[0] == "series":
        return len(parts) >= 3 and parts[2] != "00_presentacion_serie"
    if parts[0] in {"articulos-tecnicos", "temas"}:
        return len(parts) >= 2
    return False


def _isolate_markdown_alternate(output: str) -> str:
    """Keep the Markdown alternate without triggering Material's site switcher.

    Material for MkDocs 9.7.7 queries ``link[rel=alternate]`` with an exact
    attribute selector and treats every match as another deployed site. A
    Markdown representation is an alternate format, not an alternate site.
    Adding a descriptive extension token preserves the standard ``alternate``
    relation for crawlers while keeping it out of Material's exact selector.
    """

    return output.replace(
        'rel="alternate" type="text/markdown"',
        'rel="alternate markdown" type="text/markdown"',
        1,
    )


def _fix_series_presentation_title(output: str, page, config) -> str:
    if not _is_series_presentation(page):
        return output

    parts = _parts(page)
    series_title = page.parent.title if page.parent else parts[1].replace("-", " ")
    search_title = f"{series_title} | {config.site_name}"
    return re.sub(
        r"<title>.*?</title>",
        f"<title>{escape(search_title)}</title>",
        output,
        count=1,
        flags=re.DOTALL,
    )


def on_post_page(output: str, page, config, **kwargs) -> str:
    output = _isolate_markdown_alternate(output)
    output = _fix_series_presentation_title(output, page, config)
    if not _is_article(page):
        return output

    return output.replace(
        'property="og:type" content="website"',
        'property="og:type" content="article"',
        1,
    )
