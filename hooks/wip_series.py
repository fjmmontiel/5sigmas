"""
Hook: wip_series.py
Gestiona las series en construcción (WIP):
  - on_page_context: inyecta robots=noindex en todos los artículos de series WIP
  - on_post_build: elimina URLs de series WIP del sitemap.xml generado
"""

import os
import re

# Series cuyos artículos no deben indexarse todavía.
# Actualizar aquí cuando una serie pase a completa.
WIP_SERIES = {
    "ia-pib-bienestar-energia",
    "datacenters-espacio",
}


def _is_wip_page(page) -> bool:
    url = page.url or ""
    return any(slug in url for slug in WIP_SERIES)


def on_page_context(context, page, config, nav, **kwargs):
    """Marca noindex todas las páginas de series WIP."""
    if _is_wip_page(page):
        if page.meta is None:
            page.meta = {}
        page.meta["robots"] = "noindex"
    return context


def on_post_build(config, **kwargs):
    """Elimina URLs WIP del sitemap.xml generado por MkDocs."""
    sitemap_path = os.path.join(config["site_dir"], "sitemap.xml")
    if not os.path.exists(sitemap_path):
        return

    with open(sitemap_path, encoding="utf-8") as f:
        content = f.read()

    # Patrón: bloque <url>…</url> que contenga algún slug WIP
    wip_pattern = "|".join(re.escape(s) for s in WIP_SERIES)
    block_re = re.compile(
        r"\s*<url>\s*<loc>[^<]*(?:" + wip_pattern + r")[^<]*</loc>.*?</url>",
        re.DOTALL,
    )
    cleaned = block_re.sub("", content)

    with open(sitemap_path, "w", encoding="utf-8") as f:
        f.write(cleaned)
