"""
Hook: og_article_type.py
Corrects og:type from "website" to "article" for article pages.
Material for MkDocs always emits og:type="website"; this hook patches it post-render.
Uses on_post_page which receives the full HTML output (head + body).
"""


def on_post_page(output: str, page, config, **kwargs) -> str:
    url = page.url or ""
    is_index = url in ("", "index.html")
    is_about = "meta/about" in url
    is_series_index = "00_presentacion_serie" in url

    if is_index or is_about or is_series_index:
        return output

    # Only pages with a parent nav section are articles
    if page.parent is None:
        return output

    return output.replace(
        'property="og:type" content="website"',
        'property="og:type" content="article"',
        1,
    )
