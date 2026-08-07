#!/usr/bin/env python3
"""Regression checks for the generated video discovery and playback contract."""

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from hooks.video_sitemap import _render_watch_page, _topic_for, _video_schema


def base_entry() -> dict:
    site_url = "https://5sigmas.com"
    return {
        "id": "demo",
        "watch_url": f"{site_url}/videos/series/example/demo/",
        "video_url": "https://media.5sigmas.com/series/example/demo.mp4",
        "thumb_url": "https://media.5sigmas.com/series/example/demo.jpg",
        "captions_url": "https://media.5sigmas.com/series/example/demo.vtt",
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


def main() -> None:
    site_url = "https://5sigmas.com"
    entry = base_entry()

    automatic = _video_schema(entry, site_url)
    assert automatic["contentUrl"] == entry["video_url"]
    assert "embedUrl" not in automatic, (
        "embedUrl must only point to a dedicated player URL; the 5sigmas watch "
        "page is the page containing the VideoObject, not an embed player"
    )
    action = automatic["potentialAction"]
    assert action["@type"] == "SeekToAction"
    assert action["target"] == f"{entry['watch_url']}?t={{seek_to_second_number}}"
    assert action["startOffset-input"] == "required name=seek_to_second_number"

    curated = dict(entry)
    curated["chapters"] = [
        {"name": "Primera idea", "start": 0, "end": 25},
        {"name": "Segunda idea", "start": 25, "end": 60},
    ]
    curated_schema = _video_schema(curated, site_url)
    assert "potentialAction" not in curated_schema, (
        "curated chapters must use Clip rather than advertising automatic SeekToAction"
    )
    assert len(curated_schema["hasPart"]) == 2
    assert curated_schema["hasPart"][1]["url"] == f"{entry['watch_url']}?t=25"

    watch_html = _render_watch_page(entry, [])
    assert '<video controls crossorigin="anonymous"' in watch_html, (
        "watch pages must opt into anonymous CORS so cross-origin captions and media "
        "from media.5sigmas.com work under the documented R2 CORS policy"
    )

    topic, label = _topic_for("series/seguridad-ia/01-prompt-injection.md")
    assert (topic, label) == ("seguridad", "Seguridad en IA")

    embed_source = (ROOT / "hooks" / "video_embed.py").read_text(encoding="utf-8")
    assert 'crossorigin="anonymous"' in embed_source, (
        "article video embeds must opt into anonymous CORS for the production media origin"
    )

    print("Video discovery and playback contract passed.")


if __name__ == "__main__":
    main()
