from pathlib import Path
import sys
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import hooks.video_sitemap as video_sitemap


NS = {"video": "http://www.google.com/schemas/sitemap-video/1.1"}


def test_video_sitemap_uses_direct_content_url_without_duplicate_player_url(tmp_path) -> None:
    site_dir = tmp_path / "site"
    site_dir.mkdir()
    (site_dir / "sitemap.xml").write_text(
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>',
        encoding="utf-8",
    )
    entry = {
        "page_url": "https://5sigmas.com/series/demo/",
        "watch_url": "https://5sigmas.com/videos/series/demo/",
        "video_url": "https://5sigmas.com/series/demo.mp4",
        "thumb_url": "https://5sigmas.com/series/demo.jpg",
        "title": "Demo",
        "description": "Vídeo de prueba",
        "publication_date": "2026-07-26T00:00:00+00:00",
        "duration": "20",
        "duration_iso": "PT20S",
    }
    video_sitemap._video_pages[:] = [entry]

    video_sitemap.on_post_build({"site_dir": str(site_dir)})

    root = ET.parse(site_dir / "video-sitemap.xml").getroot()
    url = root.find("{http://www.sitemaps.org/schemas/sitemap/0.9}url")
    assert url is not None
    assert url.find("{http://www.sitemaps.org/schemas/sitemap/0.9}loc").text == entry["watch_url"]
    video = url.find("video:video", NS)
    assert video is not None
    assert video.find("video:content_loc", NS).text == entry["video_url"]
    assert video.find("video:player_loc", NS) is None
