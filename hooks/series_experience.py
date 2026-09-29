"""Source-derived series gallery and additive learning guides; no editorial/media rewrites."""
from __future__ import annotations

import json
import re
import yaml
from html import escape, unescape
from pathlib import Path

from mkdocs.utils.meta import get_data

ROOT = Path(__file__).resolve().parents[1]
SERIES = []
PAGE_MAP = {}
PREFIX = ""
EN = False
# These are discovery facets, not a new source of titles, chapter counts or URLs.
FACETS = {
    "fundamentos-ia-iag": "understand", "from-cave-to-agi": "understand",
    "multimodalidad-iag": "understand", "modelos-razonadores": "understand",
    "ia-pib-bienestar-energia": "impact", "datacenters-espacio": "impact",
    "seguridad-ia": "evaluate", "agentes-ia": "build",
    "agentes-voz-tiempo-real": "build", "coding-agents-agent-harnesses": "build",
    "context-engineering-memory-mcp": "build", "llm-inference-engineering-economics": "build",
    "evaluating-ai-systems-production": "evaluate",
}
GUIDES = {
    "seguridad-ia": "security", "agentes-ia": "agent", "agentes-voz-tiempo-real": "voice",
    "coding-agents-agent-harnesses": "coding", "context-engineering-memory-mcp": "context",
    "llm-inference-engineering-economics": "inference", "evaluating-ai-systems-production": "evaluation",
}
PROTECTED = {"series/modelos-razonadores/01-que-es-razonar.md",
             "videos/series/agentes-ia/03-como-evaluar-un-agente.md"}


def t(es, en):
    return en if EN else es


def esc(value):
    return escape(str(value or ""), quote=True)


def meta_of(file):
    # Match MkDocs metadata semantics, including existing pages with invalid YAML.
    return get_data(file.content_string)[1]


def route(path):
    p = Path(path)
    relative = p.parent.as_posix() if p.name == "index.md" else p.with_suffix("").as_posix()
    return f"{PREFIX}/{relative.strip('/')}/"


def target(series):
    return f"{PREFIX}/series/#serie-{series['slug']}"


def media(meta, src, files, docs_dir):
    video = str(meta.get("video") or "")
    if not video or "://" in video:
        return {}
    # The existing watch-page generator applies the publication policy first.
    parent = Path(src).parent
    poster = str(meta.get("video_poster") or Path(video).with_suffix(".jpg"))
    watch = (Path("videos") / parent / Path(video).with_suffix(".md")).as_posix()
    if not files.get_file_from_path(watch):
        return {}
    if not (Path(docs_dir) / parent / video).is_file() or not (Path(docs_dir) / parent / poster).is_file():
        return {}
    return {"poster": f"{PREFIX}/{parent.as_posix()}/{poster}", "watch": route(watch)}


def on_files(files, config, **kwargs):
    global SERIES, PAGE_MAP, PREFIX, EN
    extra = config.get("extra") or {}
    EN = str(extra.get("content_language") or "es").startswith("en")
    PREFIX = "/en" if EN else ""
    SERIES, PAGE_MAP = [], {}
    if EN:
        declared_media = yaml.safe_load((ROOT / "locales/en/media.yml").read_text(encoding="utf-8")) or {}
    else:
        declared_media = {}
    hub = files.get_file_from_path("series/index.md")
    descriptions = {}
    if hub:
        for row in re.findall(r'<a class="s5-list-row".*?</a>', hub.content_string, re.S):
            slug = re.search(r'/series/([^/]+)/', row)
            desc = re.search(r'class="s5-list-row__desc">(.*?)</span>', row, re.S)
            if slug and desc:
                descriptions[slug[1]] = unescape(re.sub(r'<[^>]+>', '', desc[1])).strip()
    label = (extra.get("reader_ui") or {}).get("learn_section", "Aprender")
    sections = next((item[label] for item in config.get("nav", []) if isinstance(item, dict) and label in item), [])
    for section in sections:
        if not isinstance(section, dict):
            continue
        title, items = next(iter(section.items()))
        if not isinstance(items, list):
            continue
        entries = []
        for item in items:
            src = item if isinstance(item, str) else next(iter(item.values()))
            if not isinstance(src, str) or not src.startswith("series/"):
                continue
            file = files.get_file_from_path(src)
            if file is None:
                raise ValueError(f"Series navigation references missing source: {src}")
            meta = meta_of(file)
            meta.update(declared_media.get(src, {}))
            entries.append({"src": src, "url": route(src), "title": str(meta.get("title") or (next(iter(item.keys())) if isinstance(item, dict) else Path(src).stem)),
                            "description": str(meta.get("description") or ""), **media(meta, src, files, config['docs_dir'])})
        if not entries:
            continue
        slug = Path(entries[0]['src']).parts[1]
        chapters = [e for e in entries if not Path(e['src']).name.startswith("00")]
        intro = next((e for e in entries if Path(e['src']).name.startswith("00")), None)
        cover = next((e for e in entries if e.get("poster")), {})
        series = {"slug": slug, "number": len(SERIES) + 1, "title": str(title), "chapters": chapters,
                  "intro": intro, "description": descriptions.get(slug, entries[0]['description']),
                  "poster": cover.get("poster"), "facet": FACETS.get(slug, "build"), "entries": entries}
        SERIES.append(series)
        for entry in entries:
            PAGE_MAP[entry['src']] = (series, entry)
            if entry.get('watch'):
                PAGE_MAP['videos/' + entry['src']] = (series, entry)
    if len(SERIES) != 13 or sum(len(s['chapters']) for s in SERIES) != 67:
        raise ValueError("Review inventory changed: expected 13 series and 67 substantive chapters; review source navigation")
    return files


def image(item, cls="s5-series-poster"):
    if not item.get('poster'):
        return ''
    return f'<img class="{cls}" src="{esc(item["poster"])}" alt="{esc(item["title"])}" loading="lazy" decoding="async" width="1280" height="720">'


def actions(entry):
    watch = f'<a href="{esc(entry["watch"])}">{t("Ver vídeo", "Watch video")} ↗</a>' if entry.get('watch') else ''
    return f'<div class="s5-series-actions"><a href="{esc(entry["url"])}">{t("Leer capítulo", "Read chapter")} →</a>{watch}</div>'


def gallery():
    labels = [('all', t('Todas', 'All')), ('understand', t('Entender la IA', 'Understand AI')),
              ('build', t('Construir sistemas', 'Build systems')), ('evaluate', t('Evaluar y proteger', 'Evaluate and protect')),
              ('impact', t('Energía e impacto', 'Energy and impact'))]
    filters = ''.join(f'<button type="button" data-sx-filter="{key}" aria-pressed="{str(key == "all").lower()}">{value}</button>' for key, value in labels)
    cards, details = [], []
    for s in SERIES:
        n = len(s['chapters'])
        search = ' '.join([s['title'], s['description'], *(c['title'] for c in s['chapters'])])
        cards.append(f'''<div class="s5-watch-card s5-series-card" data-sx-card data-facet="{s['facet']}" data-search="{esc(search)}">
<a class="s5-series-cover" href="#serie-{s['slug']}" aria-label="{esc(t('Explorar ', 'Explore ') + s['title'])}">{image(s)}</a>
<div class="s5-watch-card__body"><div class="s5-watch-card__meta">{t('Serie', 'Series')} {s['number']:02} · {n} {t('capítulos', 'chapters')}</div>
<h2><a href="#serie-{s['slug']}">{esc(s['title'])}</a></h2><p>{esc(s['description'])}</p>
<a class="s5-series-explore" href="#serie-{s['slug']}">{t('Explorar serie', 'Explore series')} →</a></div></div>''')
        chapter_cards = []
        for i, c in enumerate(s['chapters'], 1):
            chapter_cards.append(f'''<div class="s5-watch-card s5-series-chapter" data-sx-chapter-url="{esc(c['url'])}">
<a class="s5-series-cover" href="{esc(c['url'])}">{image(c)}</a><div class="s5-watch-card__body">
<div class="s5-watch-card__meta">{t('Capítulo', 'Chapter')} {i:02} / {n:02}</div><h3><a href="{esc(c['url'])}">{esc(c['title'])}</a></h3>
<p>{esc(c['description'])}</p>{actions(c)}</div></div>''')
        intro = s['intro']
        intro_link = f'<a href="{esc(intro["watch"])}">{t("Ver presentación", "Watch introduction")} ↗</a>' if intro and intro.get('watch') else ''
        next_s = SERIES[s['number'] % len(SERIES)]
        details.append(f'''<details class="s5-series-detail" id="serie-{s['slug']}" data-sx-detail>
<summary>{esc(s['title'])} · {n} {t('capítulos', 'chapters')}</summary>
<a class="s5-series-back" href="#catalogo">← {t('Todas las series', 'All series')}</a>
<section class="s5-series-hero"><div><div class="s5-eyebrow">{t('Serie', 'Series')} {s['number']:02} · {n} {t('capítulos', 'chapters')}</div>
<h2 tabindex="-1">{esc(s['title'])}</h2><p>{esc(s['description'])}</p>
<div class="s5-series-actions"><a class="s5-series-start" href="{esc(s['chapters'][0]['url'])}">{t('Empezar la serie', 'Start the series')} →</a>{intro_link}</div>
</div>{image(s)}</section><div class="s5-section-head"><h2>{t('Tu recorrido, capítulo a capítulo', 'Your path, chapter by chapter')}</h2></div>
<div class="s5-watch-grid s5-series-grid">{''.join(chapter_cards)}</div>
<nav class="s5-series-next" aria-label="{t('Seguir explorando', 'Keep exploring')}"><span>{t('Otra serie para explorar', 'Another series to explore')}</span><a href="#serie-{next_s['slug']}">{esc(next_s['title'])} →</a><a href="#catalogo">{t('Ver las 13 series', 'See all 13 series')}</a></nav></details>''')
    return f'''<div class="s5-landing s5-visual-hub s5-series-hub" data-sx-hub data-locale="{'en' if EN else 'es'}">
<div data-sx-overview><section class="s5-page-intro s5-visual-hub__intro"><div class="s5-eyebrow">{t('Aprender · 13 series · 67 capítulos', 'Learn · 13 series · 67 chapters')}</div>
<h1>{t('Explora las series.', 'Explore the series.')}</h1><p>{t('Elige qué quieres entender. Descubre la serie, sus capítulos y sus vídeos sin perderte en la biblioteca.', 'Choose what you want to understand. Explore each series, its chapters and videos without getting lost in the library.')}</p>
<nav class="s5-visual-hub__jump" aria-label="{t('Por dónde empezar', 'Where to start')}"><a href="#serie-fundamentos-ia-iag">{t('Empieza desde cero', 'Start from scratch')}</a><a href="#catalogo">{t('Todas las series', 'All series')}</a><a href="{PREFIX}/visuales/">{t('Ir a Ver', 'Open Watch')}</a></nav></section>
<aside class="s5-resume" data-sx-resume hidden><div><span>{t('Última lectura · guardada en este navegador', 'Last reading · saved in this browser')}</span><strong data-sx-resume-title></strong></div><a data-sx-resume-link>{t('Continuar leyendo', 'Continue reading')} →</a></aside>
<section class="s5-section" id="catalogo"><div class="s5-series-controls"><label>{t('Buscar en las series', 'Search the series')}<input type="search" data-sx-search placeholder="{t('Tema, serie o capítulo…', 'Topic, series or chapter…')}" autocomplete="off"></label>
<div class="s5-topic-filter" role="group" aria-label="{t('Filtrar series', 'Filter series')}">{filters}</div></div>
<div class="s5-series-count" data-sx-count role="status">13 {t('series disponibles', 'available series')}</div>
<div class="s5-watch-grid s5-series-grid">{''.join(cards)}</div>
<div class="s5-series-empty" data-sx-empty hidden><p>{t('No hay coincidencias. Prueba otra palabra o elimina los filtros.', 'No matches. Try another word or clear the filters.')}</p><button type="button" data-sx-clear>{t('Mostrar todas', 'Show all')}</button></div></section></div>
<div class="s5-series-details">{''.join(details)}</div></div>'''


def guide(kind):
    data = json.loads((ROOT / 'hooks' / 'series_guides.json').read_text(encoding='utf-8'))[kind]['en' if EN else 'es']
    steps = ''.join(f'<button type="button" data-sx-step="{i}" aria-pressed="{str(i == 0).lower()}"><span>{i+1:02}</span>{esc(step[0])}</button>' for i, step in enumerate(data['steps']))
    config = esc(json.dumps(data, ensure_ascii=False, separators=(',', ':')))
    return f'''<section class="s5-guide" data-sx-guide="{kind}" data-guide="{config}" data-locale="{'en' if EN else 'es'}" aria-label="{esc(data['title'])}">
<header class="s5-guide-header"><div class="s5-eyebrow">{t('Explora el mecanismo', 'Explore the mechanism')}</div><h2>{esc(data['title'])}</h2><p>{esc(data['intro'])}</p></header>
<div class="s5-guide-layout"><nav class="s5-guide-steps" aria-label="{t('Pasos de la explicación', 'Explanation steps')}">{steps}</nav>
<div class="s5-guide-main"><div class="s5-guide-experiment" data-sx-experiment></div><div class="s5-guide-scene" data-sx-scene></div>
<div class="s5-guide-explanation" aria-live="polite"><span data-sx-step-label>{t('Paso', 'Step')} 1 / {len(data['steps'])}</span><h3 data-sx-title>{esc(data['steps'][0][0])}</h3><p data-sx-copy>{esc(data['steps'][0][1])}</p></div>
<div class="s5-guide-controls"><button type="button" data-sx-prev disabled>← {t('Anterior', 'Previous')}</button><button type="button" data-sx-next>{t('Siguiente', 'Next')} →</button><button type="button" data-sx-reset>{t('Reiniciar', 'Reset')}</button><a href="#s5-diagrama-original">{t('Ver el diagrama completo', 'See the full diagram')} ↓</a></div></div></div>
<p class="s5-guide-caveat">{esc(data['caveat'])}</p><noscript><p>{t('La secuencia interactiva necesita JavaScript. La explicación y el diagrama originales están disponibles a continuación.', 'The interactive sequence needs JavaScript. The original explanation and diagram remain available below.')}</p></noscript></section><div id="s5-diagrama-original" class="s5-series-anchor"></div>'''


def on_page_content(html, page, config, files, **kwargs):
    src = page.file.src_uri
    if src == 'series/index.md':
        return gallery()
    if src in {'visuales/index.md', 'videos/index.md'}:
        href = f'{PREFIX}/series/'
        link = f'<div class="s5-series-discovery"><a href="{href}">{t("Explorar las 13 series y sus capítulos", "Explore all 13 series and their chapters")} →</a></div>'
        return re.sub(r'(</h1>)', r'\1' + link, html, count=1)
    matched = PAGE_MAP.get(src)
    if not matched or src in PROTECTED:
        return html
    s, entry = matched
    # Keep the six foundational series and their original presentation unchanged.
    if s['slug'] not in GUIDES:
        return html
    position = next((i for i, c in enumerate(s['chapters'], 1) if c['src'] == entry['src']), 0)
    position_label = f'{t("Capítulo", "Chapter")} {position} / {len(s["chapters"])}' if position else t('Presentación', 'Introduction')
    bar = f'<nav class="s5-series-discovery" aria-label="{t("Tu serie", "Your series")}"><span>{position_label}</span><a href="{target(s)}">{t("Explorar serie", "Explore series")}: {esc(s["title"])} →</a></nav>'
    html = re.sub(r'(</h1>)', r'\1' + bar, html, count=1)
    if src == s['chapters'][0]['src']:
        addition = guide(GUIDES[s['slug']])
        marker = re.search(r'<(?:section|div)\b[^>]*class="[^"]*\b(?:anim-brand-shell|aix-loop|s5v)\b[^"]*"', html)
        if marker:
            html = html[:marker.start()] + addition + html[marker.start():]
        else:
            html = re.sub(r'(<h2\b)', lambda m: addition + m[0], html, count=1)
    return html
