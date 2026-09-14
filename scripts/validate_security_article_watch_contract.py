#!/usr/bin/env python3
"""Fail-closed Security 00/01 article↔watch and locale-UI contract.

This is a focused regression fixture for the requalification branch. It does
not certify MEDIA_PASS, pixel quality, pedagogy, or the global catalogue.
"""
from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from hooks.video_embed import _watch_url
from hooks.video_sitemap import _render_watch_page


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
)


def entry(*, locale: str, source_name: str, stem: str, title: str) -> dict:
    site_url = "https://5sigmas.com" if locale == "es" else "https://5sigmas.com/en"
    source_rel = f"series/seguridad-ia/{source_name}"
    source_url = f"{site_url}/series/seguridad-ia/{Path(source_name).stem}/"
    watch_url = f"{site_url}/videos/series/seguridad-ia/{stem}/"
    return {
        "id": f"security-{locale}-{stem}",
        "watch_url": watch_url,
        "video_url": f"{site_url}/series/seguridad-ia/{stem}.mp4",
        "video_playback_url": f"/series/seguridad-ia/{stem}.mp4",
        "thumb_url": f"{site_url}/series/seguridad-ia/{stem}.jpg",
        "thumb_playback_url": f"/series/seguridad-ia/{stem}.jpg",
        "captions_url": "",
        "captions_playback_url": "",
        "title": title,
        "description": "Focused Security watch-page regression fixture.",
        "publication_date": "2026-08-06T00:00:00+00:00",
        "source_url": source_url,
        "source_src_uri": source_rel,
        "duration_iso": "PT48S" if locale == "en" else "PT1M0S",
        "duration_seconds": 48 if locale == "en" else 60,
        "duration_label": "0:48" if locale == "en" else "1:00",
        "topic": "seguridad",
        "topic_label": "AI Security" if locale == "en" else "Seguridad en IA",
        "collection": "AI Security" if locale == "en" else "Seguridad en IA",
        "snippets": [{"title": "Mechanism" if locale == "en" else "Mecanismo", "excerpt": ""}],
        "chapters": [],
        "transcript": "",
        "keywords": ["AI security" if locale == "en" else "seguridad IA"],
    }


def main() -> None:
    failures: list[str] = []

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
            html = _render_watch_page(current, [])
            expected_source_href = f'href="{current["source_url"]}"'
            if expected_source_href not in html or 'class="s5-video-watch__source-link"' not in html:
                failures.append(f"{locale}/{stem}: watch→article source link missing")
            if 'data-s5-watch-player' not in html:
                failures.append(f"{locale}/{stem}: watch player missing")

            if locale == "en":
                leaked = [text for text in FORBIDDEN_EN_WATCH_UI if text in html]
                if leaked:
                    failures.append(
                        f"en/{stem}: generated watch page leaks Spanish UI: {', '.join(leaked)}"
                    )

    if failures:
        print("SECURITY_ARTICLE_WATCH_CONTRACT=FAIL")
        for failure in failures:
            print(f"- {failure}")
        raise SystemExit(1)

    print("SECURITY_ARTICLE_WATCH_CONTRACT=PASS")


if __name__ == "__main__":
    main()
