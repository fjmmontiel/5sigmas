#!/usr/bin/env python3
"""Regression checks for the generated video discovery and playback contract."""

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from hooks.video_sitemap import (
    _render_watch_page as render_watch_page_es,
    _topic_for,
    _video_schema as video_schema_es,
)
from hooks.video_sitemap_en import (
    _render_watch_page as render_watch_page_en,
    _video_schema as video_schema_en,
)


def base_entry() -> dict:
    site_url = "https://5sigmas.com"
    return {
        "id": "demo",
        "watch_url": f"{site_url}/videos/series/example/demo/",
        "video_url": "https://5sigmas.com/series/example/demo.mp4",
        "video_playback_url": "/series/example/demo.mp4",
        "thumb_url": "https://5sigmas.com/series/example/demo.jpg",
        "thumb_playback_url": "/series/example/demo.jpg",
        "captions_url": "https://5sigmas.com/series/example/demo.vtt",
        "captions_playback_url": "/series/example/demo.vtt",
        "title": "Demo",
        "description": "Demo de contrato de vídeo.",
        "publication_date": "2026-08-07T00:00:00+00:00",
        "source_url": f"{site_url}/series/example/demo/",
        "duration_iso": "PT60S",
        "duration_seconds": 60,
        "duration_label": "1:00",
        "topic": "seguridad",
        "topic_label": "Seguridad en IA",
        "collection": "Seguridad en IA",
        "snippets": [{"title": "Idea clave", "excerpt": "Resumen."}],
        "chapters": [],
        "transcript": "",
        "keywords": ["seguridad IA"],
    }


def english_entry() -> dict:
    entry = base_entry()
    site_url = "https://5sigmas.com/en"
    entry.update(
        {
            "watch_url": f"{site_url}/videos/series/example/demo/",
            "video_url": f"{site_url}/series/example/demo.mp4",
            "video_playback_url": "/en/series/example/demo.mp4",
            "thumb_url": f"{site_url}/series/example/demo.jpg",
            "thumb_playback_url": "/en/series/example/demo.jpg",
            "captions_url": f"{site_url}/series/example/demo.vtt",
            "captions_playback_url": "/en/series/example/demo.vtt",
            "description": "Video contract demo.",
            "source_url": f"{site_url}/series/example/demo/",
            "topic_label": "AI security",
            "collection": "AI security",
            "snippets": [{"title": "Key idea", "excerpt": "Summary."}],
            "keywords": ["AI security"],
        }
    )
    return entry


def curated_entry(entry: dict, transcript: str) -> dict:
    enriched = dict(entry)
    enriched["chapters"] = [
        {"name": "Primera idea", "start": 0, "end": 25},
        {"name": "Segunda idea", "start": 25, "end": 60},
    ]
    enriched["transcript"] = transcript
    return enriched


def assert_seek_contract(schema: dict, watch_url: str) -> None:
    action = schema["potentialAction"]
    assert action["@type"] == "SeekToAction"
    assert action["target"] == f"{watch_url}?t={{seek_to_second_number}}"
    assert action["startOffset-input"] == "required name=seek_to_second_number"


def assert_clip_contract(schema: dict, watch_url: str) -> None:
    assert "potentialAction" not in schema, (
        "curated chapters must use Clip rather than advertising automatic SeekToAction"
    )
    assert len(schema["hasPart"]) == 2
    assert schema["hasPart"][0]["@type"] == "Clip"
    assert schema["hasPart"][0]["startOffset"] == 0
    assert schema["hasPart"][0]["endOffset"] == 25
    assert schema["hasPart"][1]["url"] == f"{watch_url}?t=25"


def main() -> None:
    global_root = "https://5sigmas.com"
    entry = base_entry()

    automatic = video_schema_es(entry, global_root)
    assert automatic["contentUrl"] == entry["video_url"]
    assert automatic["inLanguage"] == "es"
    assert "embedUrl" not in automatic, (
        "embedUrl must only point to a dedicated player URL; the 5sigmas watch "
        "page is the page containing the VideoObject, not an embed player"
    )
    assert_seek_contract(automatic, entry["watch_url"])

    curated = curated_entry(entry, "Transcripción revisada del vídeo.")
    curated_schema = video_schema_es(curated, global_root)
    assert_clip_contract(curated_schema, entry["watch_url"])

    watch_html = render_watch_page_es(entry, [])
    assert 'src="/series/example/demo.mp4"' in watch_html
    assert 'poster="/series/example/demo.jpg"' in watch_html
    assert (
        '<track kind="captions" src="/series/example/demo.vtt" '
        'srclang="es" label="Español" default>'
    ) in watch_html
    assert 'class="s5-video-watch__source-link"' in watch_html
    assert '<video controls crossorigin="anonymous"' in watch_html, (
        "watch pages must opt into anonymous CORS so cross-origin captions and media "
        "from media.5sigmas.com work under the documented R2 CORS policy"
    )

    curated_html = render_watch_page_es(curated, [])
    assert 'class="s5-video-watch__chapters"' in curated_html
    assert 'href="?t=0" data-s5-video-seek="0"' in curated_html
    assert 'href="?t=25" data-s5-video-seek="25"' in curated_html
    assert 'class="s5-video-watch__transcript"' in curated_html
    assert "Transcripción revisada del vídeo." in curated_html

    en_site_url = "https://5sigmas.com/en"
    en_entry = english_entry()
    en_automatic = video_schema_en(en_entry, en_site_url, global_root)
    assert en_automatic["contentUrl"] == en_entry["video_url"]
    assert en_automatic["inLanguage"] == "en"
    assert "embedUrl" not in en_automatic
    assert_seek_contract(en_automatic, en_entry["watch_url"])

    en_curated = curated_entry(en_entry, "Reviewed video transcript.")
    en_curated["chapters"] = [
        {"name": "First idea", "start": 0, "end": 25},
        {"name": "Second idea", "start": 25, "end": 60},
    ]
    en_curated_schema = video_schema_en(en_curated, en_site_url, global_root)
    assert_clip_contract(en_curated_schema, en_entry["watch_url"])

    en_watch_html = render_watch_page_en(en_entry, [], en_site_url)
    assert 'src="/en/series/example/demo.mp4"' in en_watch_html
    assert 'poster="/en/series/example/demo.jpg"' in en_watch_html
    assert (
        '<track kind="captions" src="/en/series/example/demo.vtt" '
        'srclang="en" label="English" default>'
    ) in en_watch_html
    assert 'class="s5-video-watch__source-link"' in en_watch_html
    assert '<video controls crossorigin="anonymous"' in en_watch_html

    en_curated_html = render_watch_page_en(en_curated, [], en_site_url)
    assert 'class="s5-video-watch__chapters"' in en_curated_html
    assert 'href="?t=0" data-s5-video-seek="0"' in en_curated_html
    assert 'href="?t=25" data-s5-video-seek="25"' in en_curated_html
    assert 'class="s5-video-watch__transcript"' in en_curated_html
    assert "Reviewed video transcript." in en_curated_html

    topic, label = _topic_for("series/seguridad-ia/01-prompt-injection.md")
    assert (topic, label) == ("seguridad", "Seguridad en IA")

    embed_source = (ROOT / "hooks" / "video_embed.py").read_text(encoding="utf-8")
    assert 'crossorigin="anonymous"' in embed_source, (
        "article video embeds must opt into anonymous CORS for the production media origin"
    )

    print("Bilingual video discovery, accessibility and key-moment contract passed.")


if __name__ == "__main__":
    main()
