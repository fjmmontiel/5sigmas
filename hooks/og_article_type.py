"""Set Open Graph's page type only for real article pages."""


def _is_article(page) -> bool:
    parts = (page.url or "").strip("/").split("/")
    if not parts or parts == [""]:
        return False
    if parts[0] == "series":
        return len(parts) >= 3 and parts[2] != "00_presentacion_serie"
    if parts[0] in {"articulos-tecnicos", "temas"}:
        return len(parts) >= 2
    return False


def on_post_page(output: str, page, config, **kwargs) -> str:
    if not _is_article(page):
        return output

    return output.replace(
        'property="og:type" content="website"',
        'property="og:type" content="article"',
        1,
    )
