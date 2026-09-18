"""Add locale-aware Open Graph article metadata after rendering.

The JSON-LD graph lives in the locale templates. This hook adds the ``article:*``
Open Graph properties that Material does not emit by default and makes article
pages use ``og:type=article``. The English MkDocs configuration delegates here
through ``sitemap_noindex.py`` because MkDocs replaces inherited hook lists.
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
    "agentes-voz-tiempo-real": "Agentes de voz en tiempo real",
    "coding-agents-agent-harnesses": "Coding agents y agent harnesses",
    "context-engineering-memory-mcp": "Context engineering, memoria y MCP",
    "llm-inference-engineering-economics": "Ingeniería y economía de inferencia de LLMs",
    "evaluating-ai-systems-production": "Evaluar sistemas de IA en producción",
}

SERIES_NAMES_EN = {
    "fundamentos-ia-iag": "AI and Generative AI Foundations",
    "from-cave-to-agi": "From the Caves to AGI",
    "multimodalidad-iag": "Multimodality in Generative AI",
    "modelos-razonadores": "Reasoning Models",
    "ia-pib-bienestar-energia": "AI, GDP, Well-being and Energy",
    "datacenters-espacio": "Data Centers in Space",
    "seguridad-ia": "AI Security",
    "agentes-ia": "AI Agents",
    "agentes-voz-tiempo-real": "Realtime Voice Agents",
    "coding-agents-agent-harnesses": "Coding Agents & Agent Harnesses",
    "context-engineering-memory-mcp": "Context Engineering, Memory & MCP",
    "llm-inference-engineering-economics": "LLM Inference Engineering & Economics",
    "evaluating-ai-systems-production": "Evaluating AI Systems in Production",
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


def _locale(config) -> str:
    extra = config.get("extra") or {}
    locale = str(extra.get("content_language") or extra.get("locale_code") or "").strip().lower()
    if locale:
        return locale
    site_url = str(config.get("site_url") or "")
    return "en" if "/en/" in site_url else "es"


def _section(page, config) -> str:
    parts = _parts(page)
    if not parts:
        return "5sigmas"
    english = _locale(config).startswith("en")
    if parts[0] == "series" and len(parts) >= 2:
        names = SERIES_NAMES_EN if english else SERIES_NAMES
        return names.get(parts[1], "5sigmas Series" if english else "Series de 5sigmas")
    if parts[0] == "articulos-tecnicos":
        return "AI systems engineering" if english else "Ingeniería de sistemas de IA"
    if parts[0] == "temas":
        return "Artificial intelligence concepts" if english else "Conceptos de inteligencia artificial"
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
    section = _section(page, config)

    output = output.replace(
        'property="og:type" content="website"',
        'property="og:type" content="article"',
        1,
    )

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
