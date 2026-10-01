#!/usr/bin/env python3
"""Fast regression test for LLM/search-facing generated video watch pages."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import hooks.video_sitemap as es
import hooks.video_sitemap_en as en


def entry(locale: str) -> dict:
    en_locale = locale == "en"
    prefix = "https://5sigmas.com/en" if en_locale else "https://5sigmas.com"
    playback = "/en" if en_locale else ""
    return {
        "id": "demo",
        "watch_url": f"{prefix}/videos/series/example/demo/",
        "video_url": f"{prefix}/series/example/demo.mp4",
        "video_playback_url": f"{playback}/series/example/demo.mp4",
        "thumb_url": f"{prefix}/series/example/demo.jpg",
        "thumb_playback_url": f"{playback}/series/example/demo.jpg",
        "captions_url": "",
        "captions_playback_url": "",
        "title": "Demo",
        "description": "A sufficiently descriptive editorial summary of the video for search and retrieval.",
        "publication_date": "2026-09-30",
        "source_url": f"{prefix}/series/example/demo/",
        "duration_iso": "PT60S",
        "duration_seconds": 60,
        "duration_label": "1:00",
        "topic": "otros",
        "topic_label": "Other" if en_locale else "Otros",
        "collection": "Example",
        "snippets": [
            {
                "title": "Key idea" if en_locale else "Idea clave",
                "excerpt": "Editorial context that is grounded in the parent article.",
            }
        ],
        "chapters": [],
        "transcript": "",
        "keywords": ["demo"],
    }


class FakeFile:
    src_uri = "videos/series/example/demo.md"
    src_path = src_uri


class FakePage:
    file = FakeFile()


BASE_HTML = '<html><head><meta property="og:type" content="article"></head><body></body></html>'


def main() -> None:
    es_entry = entry("es")
    es_watch = es._render_watch_page(es_entry, [])
    assert 'class="s5-video-watch__machine-context"' in es_watch
    assert "no dispone todavía de una transcripción sincronizada revisada" in es_watch
    assert "Contexto textual para búsqueda y agentes" in es_watch
    assert 'class="s5-video-watch__transcript"' not in es_watch

    en_entry = entry("en")
    en_watch = en._render_watch_page(en_entry, [], "https://5sigmas.com/en")
    assert 'class="s5-video-watch__machine-context"' in en_watch
    assert "does not yet have a reviewed synchronized transcript" in en_watch
    assert "Text context for search and agents" in en_watch
    assert 'class="s5-video-watch__transcript"' not in en_watch

    # Curated transcripts must still take precedence over the editorial fallback.
    curated = dict(es_entry)
    curated["transcript"] = '<section id="video-transcript"><p>Reviewed transcript.</p></section>'
    curated_watch = es._render_watch_page(curated, [])
    assert 'class="s5-video-watch__transcript"' in curated_watch
    assert 'class="s5-video-watch__machine-context"' not in curated_watch

    print("Fast video AI discovery contract passed for ES/EN.")


if __name__ == "__main__":
    main()
