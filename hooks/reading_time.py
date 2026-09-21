"""
Hook: reading_time.py
Calcula el tiempo de lectura de cada página excluyendo:
  - Bloques <details>...</details> (tooltips desplegables)
  - Macros {{ include_html(...) }} (snippets interactivos)
  - Bloques de código
  - Etiquetas HTML restantes

Inyecta page.meta['reading_time'] antes de que el tema Material
lo renderice, por lo que el valor aparece en el header de la página.
"""
import re

WORDS_PER_MINUTE = 230  # velocidad de lectura técnica en español
FRONT_MATTER_RE = re.compile(r"\A---\s*\n[\s\S]*?\n---\s*(?:\n|$)")


def on_page_markdown(markdown, page, **kwargs):
    # Keep the existing hook order so the `reading_time` page metadata cannot
    # shadow the mkdocs-macros helper with the same name. Count the source file
    # instead of macro-expanded Markdown when MkDocs exposes it (1.6+).
    raw_source = getattr(page.file, "content_string", None)
    text = raw_source if isinstance(raw_source, str) and raw_source else markdown
    text = FRONT_MATTER_RE.sub("", text, count=1)

    # Excluir tooltips <details>...</details>
    text = re.sub(r'<details[\s\S]*?</details>', '', text, flags=re.IGNORECASE)

    # Excluir macros de snippets {{ ... }}
    text = re.sub(r'\{\{[^}]+\}\}', '', text)

    # Excluir bloques de código ```...```
    text = re.sub(r'```[\s\S]*?```', '', text)

    # Excluir etiquetas HTML sueltas
    text = re.sub(r'<[^>]+>', '', text)

    # Links markdown: conservar solo el texto visible [texto](url)
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)

    words = len(text.split())
    minutes = max(1, round(words / WORDS_PER_MINUTE))
    page.meta['reading_time'] = minutes
