"""Generate deterministic semantic learning paths for every public 5sigmas page.

This hook runs after the video-library hook, so generated watch pages participate in
exactly the same relationship graph as articles, concepts, series and tools.

The same relationships are used in two places:

1. crawlable HTML links appended to the rendered page content (SEO / human navigation),
2. /agent/learning-paths.json (WebMCP / agent navigation).

No repository paths or implementation metadata are emitted.
"""

from __future__ import annotations

from collections import Counter
from html import escape as html_escape
import json
from pathlib import Path
import re
from typing import Any
from urllib.parse import urljoin

import yaml


_RECORDS: dict[str, dict[str, Any]] = {}
_PATHS: dict[str, dict[str, Any]] = {}

_PAGE_KINDS = {
    "home",
    "concept",
    "concept-hub",
    "engineering",
    "engineering-hub",
    "series",
    "series-chapter",
    "series-hub",
    "tool",
    "tool-hub",
    "video-page",
    "video-hub",
    "visual-hub",
    "meta",
    "page",
}

_TOOL_TOPICS = {
    "llm-cost-latency": "llms",
    "coste-latencia-llm": "llms",
    "model-price-performance": "llms",
    "precio-rendimiento-modelos": "llms",
    "inference-vram": "llms",
    "vram-inferencia": "llms",
    "kv-cache-context": "transformer",
    "kv-cache-contexto": "transformer",
    "transformer-attention": "transformer",
    "atencion-transformer": "transformer",
    "context-budget": "llms",
    "presupuesto-contexto": "llms",
    "rag-retrieval-lab": "rag",
    "laboratorio-recuperacion-rag": "rag",
    "rag-evaluation": "evaluation",
    "evaluacion-rag": "evaluation",
    "voice-latency-budget": "voice-agents",
    "latencia-agente-voz": "voice-agents",
    "voice-cost-capacity": "voice-agents",
    "coste-capacidad-agente-voz": "voice-agents",
    "agent-reliability-eval": "agents",
    "fiabilidad-evaluacion-agentes": "agents",
    "prompt-injection-threat": "prompt-injection",
    "amenazas-prompt-injection": "prompt-injection",
    "benchmark-reliability": "evaluation",
    "fiabilidad-benchmarks": "evaluation",
    "model-capability-timeline": "llms",
    "linea-temporal-capacidades-modelos": "llms",
    "scaling-laws": "scaling",
    "leyes-escalado": "scaling",
    "training-compute-energy": "energy",
    "computo-energia-entrenamiento": "energy",
    "datacenter-ai-capacity": "infrastructure",
    "capacidad-datacenter-ia": "infrastructure",
    "global-ai-ecosystem": "ecosystem",
    "ecosistema-global-ia": "ecosystem",
}

_TOPIC_ALIASES = {
    "seguridad-ia": "prompt-injection",
    "agentes-ia": "agents",
    "modelos-razonadores": "reasoning",
    "fundamentos-ia-iag": "foundations",
    "from-cave-to-agi": "history-ai",
    "multimodalidad-iag": "multimodality",
    "ia-pib-bienestar-energia": "energy",
    "datacenters-espacio": "infrastructure",
}

_STOPWORDS = {
    "the", "and", "for", "with", "from", "this", "that", "into", "your", "about", "what",
    "how", "why", "when", "where", "which", "una", "uno", "unos", "unas", "para", "por", "con",
    "del", "las", "los", "que", "como", "qué", "cómo", "desde", "sobre", "entre", "esta", "este",
    "esto", "estas", "estos", "5sigmas", "video", "vídeo", "videos", "vídeos", "page", "pagina", "página",
}


def on_config(config, **kwargs):
    _RECORDS.clear()
    _PATHS.clear()
    return config


def _locale(config: Any) -> str:
    extra = config.get("extra") or {}
    value = str(extra.get("content_language") or "").strip().lower()
    if value:
        return value
    theme = config.get("theme")
    language = getattr(theme, "language", None)
    if language:
        return str(language).strip().lower()
    if isinstance(theme, dict):
        return str(theme.get("language") or "es").strip().lower()
    return "es"


def _split_frontmatter(text: str) -> tuple[dict[str, Any], str]:
    match = re.match(r"\A---\s*\n(.*?)\n---\s*(?:\n|$)", text, re.DOTALL)
    if not match:
        return {}, text
    try:
        meta = yaml.safe_load(match.group(1)) or {}
    except yaml.YAMLError:
        return {}, text
    return (meta if isinstance(meta, dict) else {}), text[match.end():]


def _plain(value: Any) -> str:
    text = str(value or "")
    text = re.sub(r"!\[[^\]]*\]\([^)]*\)", " ", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"[`*_~#]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _tokens(value: Any) -> set[str]:
    normalized = _plain(value).lower()
    normalized = normalized.translate(str.maketrans("áéíóúüñ", "aeiouun"))
    return {
        token
        for token in re.split(r"[^a-z0-9+#.-]+", normalized)
        if len(token) > 2 and token not in _STOPWORDS
    }


def _title(meta: dict[str, Any], body: str, src_uri: str) -> str:
    value = _plain(meta.get("title") or meta.get("seo_title"))
    if value:
        return value
    match = re.search(r"^#\s+(.+?)\s*$", body, re.MULTILINE)
    if match:
        return _plain(match.group(1))
    return Path(src_uri).stem.replace("-", " ").replace("_", " ").title()


def _classify(src_uri: str) -> str:
    parts = list(Path(src_uri).parts)
    if not parts:
        return "page"
    if src_uri == "index.md":
        return "home"
    if parts[0] in {"tools", "herramientas"}:
        return "tool-hub" if len(parts) == 1 or Path(src_uri).name == "index.md" else "tool"
    if parts[0] == "series":
        if len(parts) == 1 or Path(src_uri).name == "index.md":
            return "series-hub"
        if len(parts) >= 3 and Path(src_uri).stem == "00_presentacion_serie":
            return "series"
        return "series-chapter"
    if parts[0] == "temas":
        return "concept-hub" if Path(src_uri).name == "index.md" else "concept"
    if parts[0] == "articulos-tecnicos":
        return "engineering-hub" if Path(src_uri).name == "index.md" else "engineering"
    if parts[0] == "videos":
        return "video-hub" if Path(src_uri).name == "index.md" else "video-page"
    if parts[0] == "visuales":
        return "visual-hub"
    if parts[0] == "meta":
        return "meta"
    return "page"


def _series_key(src_uri: str) -> str:
    parts = list(Path(src_uri).parts)
    if len(parts) >= 2 and parts[0] == "series":
        return parts[1]
    if len(parts) >= 3 and parts[0] == "videos" and parts[1] == "series":
        return parts[2]
    return ""


def _series_order(src_uri: str) -> int | None:
    stem = Path(src_uri).stem
    match = re.match(r"^(\d+)", stem)
    return int(match.group(1)) if match else None


def _topic(src_uri: str, title: str) -> str:
    parts = list(Path(src_uri).parts)
    series = _series_key(src_uri)
    if series:
        return _TOPIC_ALIASES.get(series, series)
    if len(parts) >= 2 and parts[0] == "temas":
        return parts[1]
    if len(parts) >= 2 and parts[0] in {"tools", "herramientas"}:
        return _TOOL_TOPICS.get(Path(src_uri).stem, Path(src_uri).stem)

    text = f"{src_uri} {title}".lower()
    for needle, topic in (
        ("prompt-injection", "prompt-injection"),
        ("prompt injection", "prompt-injection"),
        ("agent", "agents"),
        ("agente", "agents"),
        ("voice", "voice-agents"),
        ("voz", "voice-agents"),
        ("rag", "rag"),
        ("transformer", "transformer"),
        ("reason", "reasoning"),
        ("razon", "reasoning"),
        ("evaluation", "evaluation"),
        ("evaluacion", "evaluation"),
        ("energy", "energy"),
        ("energia", "energy"),
        ("datacenter", "infrastructure"),
        ("multimodal", "multimodality"),
        ("llm", "llms"),
    ):
        if needle in text:
            return topic
    return "general"


def _record(source_file: Any, config: Any) -> dict[str, Any] | None:
    try:
        if not source_file.is_documentation_page():
            return None
    except AttributeError:
        return None

    inclusion = getattr(source_file, "inclusion", None)
    try:
        if inclusion is not None and not inclusion.is_included():
            return None
    except AttributeError:
        pass

    src_uri = str(getattr(source_file, "src_uri", source_file.src_path))
    if src_uri.startswith(("drafts/", "includes/")):
        return None
    try:
        source_text = source_file.content_string
    except (OSError, UnicodeDecodeError, AttributeError):
        return None

    meta, body = _split_frontmatter(source_text)
    if "noindex" in str(meta.get("robots") or "").lower():
        return None

    kind = _classify(src_uri)
    if kind not in _PAGE_KINDS:
        return None

    title = _title(meta, body, src_uri)
    description = _plain(meta.get("description") or "")
    keywords = meta.get("keywords") or meta.get("tags") or []
    if isinstance(keywords, list):
        keyword_text = " ".join(_plain(item) for item in keywords)
    else:
        keyword_text = _plain(keywords)
    headings = " ".join(_plain(match) for match in re.findall(r"^#{2,3}\s+(.+?)\s*$", body, re.MULTILINE)[:20])
    token_set = _tokens(" ".join([title, description, keyword_text, headings, src_uri]))

    site_url = str(config.get("site_url") or "https://5sigmas.com/").rstrip("/") + "/"
    public_url = urljoin(site_url, str(getattr(source_file, "url", "")))

    return {
        "src_uri": src_uri,
        "url": public_url,
        "title": title,
        "description": description,
        "kind": kind,
        "topic": _topic(src_uri, title),
        "series": _series_key(src_uri),
        "order": _series_order(src_uri),
        "tokens": token_set,
    }


def _semantic_score(current: dict[str, Any], candidate: dict[str, Any]) -> int:
    if current["src_uri"] == candidate["src_uri"]:
        return -10_000
    score = 0
    if current["topic"] != "general" and current["topic"] == candidate["topic"]:
        score += 80
    if current["series"] and current["series"] == candidate["series"]:
        score += 110
        if current["order"] is not None and candidate["order"] is not None:
            distance = abs(candidate["order"] - current["order"])
            score += max(0, 35 - distance * 10)
            if candidate["order"] == current["order"] + 1:
                score += 75
    overlap = current["tokens"].intersection(candidate["tokens"])
    score += min(80, len(overlap) * 10)
    if current["kind"] == candidate["kind"]:
        score += 4
    if candidate["kind"] in {"concept", "series-chapter", "engineering", "tool", "video-page"}:
        score += 8
    return score


def _best(
    current: dict[str, Any],
    kinds: set[str],
    *,
    excluded: set[str],
) -> dict[str, Any] | None:
    ranked = [
        (_semantic_score(current, candidate), candidate)
        for candidate in _RECORDS.values()
        if candidate["kind"] in kinds
        and candidate["src_uri"] not in excluded
        and candidate["src_uri"] != current["src_uri"]
    ]
    ranked.sort(key=lambda row: (-row[0], row[1]["title"].casefold()))
    if not ranked:
        return None
    best_score, candidate = ranked[0]
    return candidate if best_score > 0 else None


def _next_series(current: dict[str, Any], excluded: set[str]) -> dict[str, Any] | None:
    if not current["series"] or current["order"] is None:
        return None
    candidates = [
        candidate
        for candidate in _RECORDS.values()
        if candidate["src_uri"] not in excluded
        and candidate["series"] == current["series"]
        and candidate["kind"] in {"series-chapter", "series"}
        and candidate["order"] is not None
        and candidate["order"] > current["order"]
    ]
    candidates.sort(key=lambda item: (item["order"], item["title"].casefold()))
    return candidates[0] if candidates else None


def _link(role: str, record: dict[str, Any]) -> dict[str, Any]:
    return {
        "role": role,
        "title": record["title"],
        "url": record["url"],
        "kind": record["kind"],
        "description": record["description"][:260],
    }


def _build_path(current: dict[str, Any]) -> dict[str, Any]:
    excluded = {current["src_uri"]}
    links: dict[str, dict[str, Any]] = {}

    next_series = _next_series(current, excluded)
    if next_series:
        links["read_next"] = _link("read_next", next_series)
        excluded.add(next_series["src_uri"])
    else:
        read_next = _best(current, {"concept", "series-chapter", "engineering"}, excluded=excluded)
        if read_next:
            links["read_next"] = _link("read_next", read_next)
            excluded.add(read_next["src_uri"])

    watch_next = _best(current, {"video-page"}, excluded=excluded)
    if watch_next:
        links["watch_next"] = _link("watch_next", watch_next)
        excluded.add(watch_next["src_uri"])

    tool = _best(current, {"tool"}, excluded=excluded)
    if tool:
        links["try_tool"] = _link("try_tool", tool)
        excluded.add(tool["src_uri"])

    # A concept page already performs the "understand" job. Adding a second concept
    # under that label can turn weak token overlap into a misleading prerequisite.
    if current["kind"] != "concept":
        concept = _best(current, {"concept"}, excluded=excluded)
        if concept:
            links["understand"] = _link("understand", concept)
            excluded.add(concept["src_uri"])

    deeper = _best(current, {"series", "series-chapter", "engineering", "series-hub"}, excluded=excluded)
    if deeper:
        links["go_deeper"] = _link("go_deeper", deeper)
        excluded.add(deeper["src_uri"])

    # Guarantee a useful crawlable cluster even for generic/meta pages.
    if len(links) < 3:
        for fallback_kind in ({"series-hub"}, {"concept-hub"}, {"tool-hub"}, {"video-hub"}):
            fallback = _best(current, fallback_kind, excluded=excluded)
            if fallback:
                role = "related"
                while role in links:
                    role += "_more"
                links[role] = _link(role, fallback)
                excluded.add(fallback["src_uri"])
            if len(links) >= 3:
                break

    return {
        "current": {
            "title": current["title"],
            "url": current["url"],
            "kind": current["kind"],
            "topic": current["topic"],
        },
        "links": links,
    }


def on_files(files, config, **kwargs):
    _RECORDS.clear()
    _PATHS.clear()
    for source_file in list(files):
        record = _record(source_file, config)
        if record:
            _RECORDS[record["src_uri"]] = record
    for src_uri, record in _RECORDS.items():
        _PATHS[src_uri] = _build_path(record)
    return files


def _copy(locale: str) -> dict[str, dict[str, str]]:
    if locale == "en":
        return {
            "eyebrow": {"text": "Learning path"},
            "title": {"text": "Continue from here"},
            "read_next": {"text": "Read next"},
            "watch_next": {"text": "Watch next"},
            "try_tool": {"text": "Try it"},
            "understand": {"text": "Understand the concept"},
            "go_deeper": {"text": "Go deeper"},
            "related": {"text": "Related"},
        }
    return {
        "eyebrow": {"text": "Ruta de aprendizaje"},
        "title": {"text": "Sigue desde aquí"},
        "read_next": {"text": "Leer después"},
        "watch_next": {"text": "Ver después"},
        "try_tool": {"text": "Pruébalo"},
        "understand": {"text": "Entender el concepto"},
        "go_deeper": {"text": "Profundizar"},
        "related": {"text": "Relacionado"},
    }


def _role_label(role: str, copy: dict[str, dict[str, str]]) -> str:
    key = role if role in copy else "related"
    return copy[key]["text"]


def _render(path: dict[str, Any], locale: str) -> str:
    copy = _copy(locale)
    cards: list[str] = []
    for role in ("understand", "read_next", "watch_next", "try_tool", "go_deeper", "related", "related_more"):
        item = path["links"].get(role)
        if not item:
            continue
        description = html_escape(item["description"])
        cards.append(
            f'<a class="s5-semantic-nav__card" href="{html_escape(item["url"], quote=True)}" '
            f'data-learning-role="{html_escape(role, quote=True)}">'
            f'<span>{html_escape(_role_label(role, copy))}</span>'
            f'<strong>{html_escape(item["title"])}</strong>'
            + (f'<small>{description}</small>' if description else "")
            + '</a>'
        )
        if len(cards) == 4:
            break
    if not cards:
        return ""
    aria = "Learning path" if locale == "en" else "Ruta de aprendizaje"
    return (
        f'<nav class="s5-semantic-nav" data-s5-semantic-nav aria-label="{aria}">'
        '<div class="s5-semantic-nav__head">'
        f'<span class="s5-eyebrow">{html_escape(copy["eyebrow"]["text"])}</span>'
        f'<h2>{html_escape(copy["title"]["text"])}</h2>'
        '</div>'
        f'<div class="s5-semantic-nav__grid">{"".join(cards)}</div>'
        '</nav>'
    )


def on_page_markdown(markdown: str, page, config, files, **kwargs) -> str:
    src_uri = str(getattr(page.file, "src_uri", page.file.src_path))
    path = _PATHS.get(src_uri)
    if not path or "data-s5-semantic-nav" in markdown:
        return markdown
    rendered = _render(path, _locale(config))
    return f"{markdown.rstrip()}\n\n{rendered}\n" if rendered else markdown


def on_post_build(config, **kwargs) -> None:
    site_dir = Path(config["site_dir"])
    out = site_dir / "agent" / "learning-paths.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    locale = _locale(config)
    role_counts = Counter(
        role
        for path in _PATHS.values()
        for role in path.get("links", {})
    )
    payload = {
        "version": 1,
        "locale": locale,
        "count": len(_PATHS),
        "coverage": {
            "pages_with_paths": sum(1 for path in _PATHS.values() if path.get("links")),
            "total_internal_recommendations": sum(len(path.get("links", {})) for path in _PATHS.values()),
            "roles": dict(sorted(role_counts.items())),
        },
        "paths": [
            {
                "src_key": src_uri,
                **path,
            }
            for src_uri, path in sorted(_PATHS.items())
        ],
    }
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
