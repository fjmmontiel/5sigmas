"""Add standards-compliant Open Graph article metadata after rendering.

The JSON-LD graph lives in ``overrides/main.html``. This hook only adds the
``article:*`` Open Graph properties that Material does not emit by default.
"""

from html import escape


SERIES_NAMES = {
    "fundamentos-ia-iag": "Fundamentos de IA e IA generativa",
    "from-cave-to-agi": "De las cavernas a la AGI",
    "multimodalidad-iag": "Multimodalidad en IA generativa",
    "modelos-razonadores": "Modelos razonadores",
    "ia-pib-bienestar-energia": "IA, PIB, bienestar y energía",
    "datacenters-espacio": "Datacenters en el espacio",
    "seguridad-ia": "Seguridad en IA",
    "agentes-ia": "Agentes de IA",
}


def _parts(page) -> list[str]:
    value = (page.url or "").strip("/")
    return value.split("/") if value else []


def _is_article(page) -> bool:
    parts = _parts(page)
    if not parts:
        return False
    if parts[0] == "series":
        return len(parts) >= 3 and parts[2] != "00_presentacion_serie"
    if parts[0] in {"articulos-tecnicos", "temas"}:
        return len(parts) >= 2
    return False


def _section(page) -> str:
    parts = _parts(page)
    if not parts:
        return "5sigmas"
    if parts[0] == "series" and len(parts) >= 2:
        return SERIES_NAMES.get(parts[1], "Series de 5sigmas")
    if parts[0] == "articulos-tecnicos":
        return "Ingeniería de sistemas de IA"
    if parts[0] == "temas":
        return "Conceptos de inteligencia artificial"
    return "5sigmas"


def _iso_datetime(value) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    return text if "T" in text else f"{text}T00:00:00+00:00"


def on_post_page(output: str, page, config, **kwargs) -> str:
    if not _is_article(page):
        return output

    meta = page.meta or {}
    published = _iso_datetime(meta.get("date"))
    modified = _iso_datetime(meta.get("date_modified") or meta.get("date"))
    section = _section(page)

    tags = [
        '<meta property="article:author" content="https://5sigmas.com/meta/about/">',
        f'<meta property="article:section" content="{escape(section, quote=True)}">',
    ]
    if published:
        tags.append(
            f'<meta property="article:published_time" content="{escape(published, quote=True)}">'
        )
    if modified:
        tags.append(
            f'<meta property="article:modified_time" content="{escape(modified, quote=True)}">'
        )

    raw_tags = meta.get("tags") or []
    if isinstance(raw_tags, str):
        raw_tags = [raw_tags]
    for tag in raw_tags:
        tags.append(f'<meta property="article:tag" content="{escape(str(tag), quote=True)}">')

    injection = "\n    ".join(tags)
    return output.replace("</head>", f"    {injection}\n</head>", 1)
