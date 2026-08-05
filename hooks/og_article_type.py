"""Correct generated search titles, Open Graph types and Material base paths."""

from html import escape
import re


_MATERIAL_CONFIG_BASE = re.compile(
    r'(<script id="__config" type="application/json">\s*\{.*?"base"\s*:\s*")'
    r'(?P<base>[^"]*)'
    r'(")',
    re.DOTALL,
)


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


def _fix_material_base_url(output: str) -> str:
    """Make Material resolve root assets correctly from nested static pages.

    MkDocs emits values such as ``..`` and ``../../..`` in Material's JSON
    configuration. The browser URL constructor treats those values as files
    unless they end in ``/``. Material then asks for ``sitemap.xml`` below the
    current page instead of at the site root. Keeping the value relative while
    adding the directory marker works for local previews and production.
    """

    def replace(match: re.Match[str]) -> str:
        base = match.group("base")
        normalized = f"{base.rstrip('/')}/" if base else "./"
        return f"{match.group(1)}{normalized}{match.group(3)}"

    return _MATERIAL_CONFIG_BASE.sub(replace, output, count=1)


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
    output = _fix_material_base_url(output)
    output = _fix_series_presentation_title(output, page, config)
    if not _is_article(page):
        return output

    return output.replace(
        'property="og:type" content="website"',
        'property="og:type" content="article"',
        1,
    )
