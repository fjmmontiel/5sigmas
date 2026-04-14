"""
Hook: nosnippet.py
Añade data-nosnippet a elementos que Google usa como snippet
pero que no aportan contenido editorial:
  - Skip link ("Saltar a contenido")
  - Texto "Inicializando búsqueda"
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
    # Demos interactivos — cualquier div con data-demo="..."
    # Añade data-nosnippet sin tocar otros atributos.
    output = re.sub(
        r'(<div\b[^>]*\bdata-demo="[^"]*"[^>]*)(>)',
        lambda m: m.group(1) + ' data-nosnippet' + m.group(2)
        if 'data-nosnippet' not in m.group(1)
        else m.group(0),
        output,
    )
    return output
