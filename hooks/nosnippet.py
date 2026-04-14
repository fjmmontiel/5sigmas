"""
Hook: nosnippet.py
Añade data-nosnippet a elementos que Google usa como snippet
pero que no aportan contenido editorial:
  - Skip link ("Saltar a contenido")
  - Texto "Inicializando búsqueda"
  - Sidebars de navegación (md-sidebar): contienen nav y TOC que aparecen
    antes del <article> en el DOM y contaminan el snippet editorial.
  - TOC nav secundario (md-nav--secondary): aparece dos veces en el DOM
    (una dentro del sidebar primario en mobile, otra en el sidebar secundario)
    antes del contenido real — Google lo usa para el snippet en vez del artículo.
  - Contenedores de demos/snippets interactivos (data-demo="..."):
    evita que Google lea fechas de ejemplo, controles UI o texto de widgets
    como si fueran el resumen editorial del artículo.

Referencia: https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag#data-nosnippet
"""

import re


def on_post_page(output: str, page, config, **kwargs) -> str:
    # Skip link — "Saltar a contenido"
    output = output.replace(
        'data-md-component="skip">',
        'data-md-component="skip" data-nosnippet>',
        1,
    )

    # Search result meta — "Inicializando búsqueda"
    output = output.replace(
        'class="md-search-result__meta"',
        'class="md-search-result__meta" data-nosnippet',
        1,
    )

    # Sidebars de navegación — aparecen antes del <article> en el DOM.
    # Contienen nav principal y TOC. Google los lee primero y extrae links
    # y headings de navegación como si fueran el resumen del artículo.
    output = re.sub(
        r'(<div\b[^>]*\bdata-md-component="sidebar"[^>]*)(>)',
        lambda m: m.group(1) + ' data-nosnippet' + m.group(2)
        if 'data-nosnippet' not in m.group(1)
        else m.group(0),
        output,
    )

    # TOC nav secundario — aparece dos veces en el DOM antes del artículo:
    # una vez dentro del sidebar primario (visible en mobile) y otra en el
    # sidebar secundario. Marca ambas instancias.
    output = re.sub(
        r'(<nav\b[^>]*\bmd-nav--secondary\b[^>]*)(>)',
        lambda m: m.group(1) + ' data-nosnippet' + m.group(2)
        if 'data-nosnippet' not in m.group(1)
        else m.group(0),
        output,
    )

    # Demos interactivos — cualquier div con data-demo="..."
    # Evita que Google lea fechas de ejemplo, controles UI o texto de widgets
    # como si fueran el resumen editorial del artículo.
    output = re.sub(
        r'(<div\b[^>]*\bdata-demo="[^"]*"[^>]*)(>)',
        lambda m: m.group(1) + ' data-nosnippet' + m.group(2)
        if 'data-nosnippet' not in m.group(1)
        else m.group(0),
        output,
    )

    return output
