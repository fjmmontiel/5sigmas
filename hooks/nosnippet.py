"""
Hook: nosnippet.py
Añade data-nosnippet a elementos de boilerplate que Google usa como snippet
pero que no aportan contenido editorial: skip link y texto "Inicializando búsqueda".

Referencia: https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag#data-nosnippet
"""


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
    return output
