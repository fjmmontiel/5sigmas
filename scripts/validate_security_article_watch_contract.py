#!/usr/bin/env python3
"""Fail-closed article↔watch, locale-UI and shared-renderer regression contract.

This focused regression fixture covers Security 00/01 plus one pre-Datacenters
reference surface to ensure the shared generator preserves Spanish output while
emitting native English watch/hub/schema output. It does not certify
MEDIA_PASS, pixel quality, pedagogy, or the global catalogue.
"""
from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from hooks.video_embed import _watch_url
from hooks.video_sitemap import _hub_schema, _render_hub, _render_watch_page, _video_schema


TARGETS = (
    ("00_presentacion_serie.md", "00_presentacion_serie", "AI Security"),
    ("01-prompt-injection.md", "01-prompt-injection", "Prompt Injection"),
)

FORBIDDEN_EN_WATCH_UI = (
    "Todos los vídeos",
    "Resumen del vídeo",
    "Las ideas que debes retener",
    "Contexto y evidencia",
    "Continúa con el artículo completo",
    "Leer el artículo",
    "Siguiente paso",
    "Vídeos relacionados",
    "Tu navegador no soporta el elemento de vídeo.",
    "Los enlaces con <code>?t=</code> abren el vídeo en un segundo concreto.",
)

REQUIRED_EN_WATCH_UI = (
    "All videos",
    "Video summary",
    "Key ideas to retain",
    "Context and evidence",
    "Continue with the full article",
    "Read the article →",
    "Next step",
    "Related videos",
    "Your browser does not support the video element.",
    "Links with <code>?t=</code> open the video at a specific second.",
)

REQUIRED_ES_WATCH_UI = (
    "Todos los vídeos",
    "Resumen del vídeo",
    "Las ideas que debes retener",
    "Contexto y evidencia",
    "Continúa con el artículo completo",
    "Leer el artículo →",
    "Siguiente paso",
    "Vídeos relacionados",
    "Tu navegador no soporta el elemento de vídeo.",
)


def entry(
    *,
    locale: str,
    source_name: str,
    stem: str,
    title: str,
    series: str = "seguridad-ia",
    topic: str = "seguridad",
    topic_label: str | None = None,
) -> dict:
    site_url = "https://5sigmas.com" if locale == "es" else "https://5sigmas.com/en"
    source_rel = f"series/{series}/{source_name}"
    source_url = f"{site_url}/series/{series}/{Path(source_name).stem}/"
    watch_url = f"{site_url}/videos/series/{series}/{stem}/"
    if topic_label is None:
        topic_label = "AI Security" if locale == "en" else "Seguridad en IA"
    return {
        "id": f"{series}-{locale}-{stem}",
        "locale": locale,
        "watch_url": watch_url,
        "video_url": f"{site_url}/series/{series}/{stem}.mp4",
        "video_playback_url": f"/series/{series}/{stem}.mp4",
        "thumb_url": f"{site_url}/series/{series}/{stem}.jpg",
        "thumb_playback_url": f"/series/{series}/{stem}.jpg",
        "captions_url": "",
        "captions_playback_url": "",
        "title": title,
        "description": "Focused watch-page regression fixture.",
        "publication_date": "2026-08-06T00:00:00+00:00",
        "source_url": source_url,
        "source_src_uri": source_rel,
        "duration_iso": "PT48S" if locale == "en" else "PT1M0S",
        "duration_seconds": 48 if locale == "en" else 60,
        "duration_label": "0:48" if locale == "en" else "1:00",
        "topic": topic,
        "topic_label": topic_label,
        "collection": topic_label,
        "snippets": [{"title": "Mechanism" if locale == "en" else "Mecanismo", "excerpt": ""}],
        "chapters": [],
        "transcript": "",
        "keywords": ["AI security" if locale == "en" else "seguridad IA"],
    }


def assert_watch_locale(failures: list[str], current: dict) -> None:
    locale = current["locale"]
    stem = Path(current["video_playback_url"]).stem
    html = _render_watch_page(current, [])
    expected_source_href = f'href="{current["source_url"]}"'
    if expected_source_href not in html or 'class="s5-video-watch__source-link"' not in html:
        failures.append(f"{locale}/{stem}: watch→article source link missing")
    if 'data-s5-watch-player' not in html:
        failures.append(f"{locale}/{stem}: watch player missing")

    expected_hub_href = 'href="/en/videos/"' if locale == "en" else 'href="/videos/"'
    if expected_hub_href not in html:
        failures.append(f"{locale}/{stem}: locale-correct watch hub link missing")

    if locale == "en":
        leaked = [text for text in FORBIDDEN_EN_WATCH_UI if text in html]
        if leaked:
            failures.append(
                f"en/{stem}: generated watch page leaks Spanish UI: {', '.join(leaked)}"
            )
        missing = [text for text in REQUIRED_EN_WATCH_UI if text not in html]
        if missing:
            failures.append(
                f"en/{stem}: generated watch page misses English UI: {', '.join(missing)}"
            )
    else:
        missing = [text for text in REQUIRED_ES_WATCH_UI if text not in html]
        if missing:
            failures.append(
                f"es/{stem}: shared localization changed required Spanish UI: {', '.join(missing)}"
            )

    schema = _video_schema(current, "https://5sigmas.com/en" if locale == "en" else "https://5sigmas.com")
    if schema.get("inLanguage") != locale:
        failures.append(
            f"{locale}/{stem}: VideoObject inLanguage={schema.get('inLanguage')!r}"
        )


def main() -> None:
    failures: list[str] = []

    security_entries: dict[str, list[dict]] = {"es": [], "en": []}
    for locale in ("es", "en"):
        site_url = "https://5sigmas.com" if locale == "es" else "https://5sigmas.com/en"
        for source_name, stem, title in TARGETS:
            src_path = f"series/seguridad-ia/{source_name}"
            expected_watch = f"{site_url}/videos/series/seguridad-ia/{stem}/"
            actual_watch = _watch_url(site_url, src_path, f"{stem}.mp4")
            if actual_watch != expected_watch:
                failures.append(
                    f"{locale}/{stem}: article→watch URL mismatch: {actual_watch!r} != {expected_watch!r}"
                )

            current = entry(locale=locale, source_name=source_name, stem=stem, title=title)
            security_entries[locale].append(current)
            assert_watch_locale(failures, current)

    # Shared-generator regression on the published Datacenters reference family.
    datacenters_es = entry(
        locale="es",
        source_name="00_presentacion_serie.md",
        stem="00_presentacion_serie",
        title="Datacenters en el espacio",
        series="datacenters-espacio",
        topic="infraestructura",
        topic_label="Infraestructura",
    )
    datacenters_en = entry(
        locale="en",
        source_name="00_presentacion_serie.md",
        stem="00_presentacion_serie",
        title="Datacenters in Space",
        series="datacenters-espacio",
        topic="infraestructura",
        topic_label="Infrastructure",
    )
    assert_watch_locale(failures, datacenters_es)
    assert_watch_locale(failures, datacenters_en)

    for locale in ("es", "en"):
        site_url = "https://5sigmas.com" if locale == "es" else "https://5sigmas.com/en"
        hub = _render_hub(security_entries[locale], locale=locale)
        hub_schema = _hub_schema(security_entries[locale], site_url)
        if hub_schema.get("inLanguage") != locale:
            failures.append(f"{locale}: CollectionPage inLanguage mismatch")
        if locale == "en":
            for text in ("Artificial intelligence videos", "Video library", "Explore the series"):
                if text not in hub:
                    failures.append(f"en: generated video hub misses English UI {text!r}")
            for text in ("Vídeos de inteligencia artificial", "Biblioteca de vídeo", "Explorar las series"):
                if text in hub:
                    failures.append(f"en: generated video hub leaks Spanish UI {text!r}")
            if 'href="/en/series/"' not in hub or 'href="/en/visuales/"' not in hub:
                failures.append("en: generated video hub misses locale-prefixed navigation")
        else:
            for text in ("Vídeos de inteligencia artificial", "Biblioteca de vídeo", "Explorar las series"):
                if text not in hub:
                    failures.append(f"es: generated video hub changed Spanish UI {text!r}")
            if 'href="/series/"' not in hub or 'href="/visuales/"' not in hub:
                failures.append("es: generated video hub changed canonical navigation")

    if failures:
        print("SECURITY_ARTICLE_WATCH_CONTRACT=FAIL")
        for failure in failures:
            print(f"- {failure}")
        raise SystemExit(1)

    print("SECURITY_ARTICLE_WATCH_CONTRACT=PASS")


if __name__ == "__main__":
    main()
