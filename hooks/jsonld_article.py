"""
Hook: jsonld_article.py
Añade og:article meta tags a páginas de artículo.
El JSON-LD (TechArticle + BreadcrumbList) ya lo genera overrides/main.html.

Añade:
  - <meta property="og:article:published_time">
  - <meta property="og:article:author">
  - <meta property="og:article:section"> (nombre de la serie)
"""

SERIES_NAMES = {
    "fundamentos-ia-iag": "Fundamentos de IA e IA Generativa",
    "from-cave-to-agi": "De las cavernas a la AGI",
    "multimodalidad-iag": "Multimodalidad en IA Generativa",
    "modelos-razonadores": "Modelos razonadores",
    "ia-pib-bienestar-energia": "IA, PIB, bienestar y energía",
    "datacenters-espacio": "Datacenters en el espacio",
}


def _is_article(page) -> bool:
    url = page.url or ""
    if url in ("", "index.html") or "meta/about" in url:
        return False
    if "00_presentacion_serie" in url:
        return False
    return "series/" in url


def _series_name(page) -> str:
    url = page.url or ""
    for slug, name in SERIES_NAMES.items():
        if slug in url:
            return name
    return "5Sigmas"


def on_post_page(output: str, page, config, **kwargs) -> str:
    if not _is_article(page):
        return output

    meta = page.meta or {}
    date_str = str(meta.get("date", "")) or ""
    section = _series_name(page)

    tags = ['<meta property="og:article:author" content="Francisco Maldonado">']
    if date_str:
        tags.append(f'<meta property="og:article:published_time" content="{date_str}">')
    tags.append(f'<meta property="og:article:section" content="{section}">')

    injection = "\n    ".join(tags)
    return output.replace("</head>", f"    {injection}\n</head>", 1)
