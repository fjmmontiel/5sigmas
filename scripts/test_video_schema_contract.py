#!/usr/bin/env python3
"""Regression checks for the generated VideoObject contract."""

from hooks.video_sitemap import _video_schema


def main() -> None:
    site_url = "https://5sigmas.com"
    watch_url = f"{site_url}/videos/series/example/demo/"
    video_url = "https://media.5sigmas.com/series/example/demo.mp4"
    entry = {
        "watch_url": watch_url,
        "video_url": video_url,
        "thumb_url": "https://media.5sigmas.com/series/example/demo.jpg",
        "title": "Demo",
        "description": "Demo de contrato de vídeo.",
        "publication_date": "2026-08-07T00:00:00+00:00",
        "source_url": f"{site_url}/series/example/demo/",
        "duration_iso": "PT60S",
        "chapters": [],
    }

    schema = _video_schema(entry, site_url)
    assert schema["contentUrl"] == video_url
    assert "embedUrl" not in schema, (
        "embedUrl must only point to a dedicated player URL; the 5sigmas watch "
        "page is the page containing the VideoObject, not an embed player"
    )
    action = schema["potentialAction"]
    assert action["@type"] == "SeekToAction"
    assert action["target"] == f"{watch_url}?t={{seek_to_second_number}}"
    assert action["startOffset-input"] == "required name=seek_to_second_number"
    print("Video schema contract passed.")


if __name__ == "__main__":
    main()
