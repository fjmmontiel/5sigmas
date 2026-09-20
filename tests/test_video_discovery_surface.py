from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("s5_video_discovery_surface", ROOT / "hooks" / "video_discovery_surface.py")
assert SPEC and SPEC.loader
SURFACE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = SURFACE
SPEC.loader.exec_module(SURFACE)

MEDIA = {
    ("es", "modelos-razonadores-intro-es"): ROOT / "docs/series/modelos-razonadores/00_presentacion_serie.mp4",
    ("en", "modelos-razonadores-intro-en"): ROOT / "locales/en/series/modelos-razonadores/00_presentacion_serie.mp4",
    ("es", "modelos-razonadores-01-es"): ROOT / "docs/series/modelos-razonadores/01-que-es-razonar.mp4",
    ("en", "modelos-razonadores-01-en"): ROOT / "locales/en/series/modelos-razonadores/01-que-es-razonar.mp4",
}


def rel(url: str, locale: str) -> str:
    path = url.split("5sigmas.com/", 1)[1]
    if locale == "en":
        assert path.startswith("en/")
        path = path[3:]
    return path


def html_page(source: dict, *, watch: bool, noindex: bool = False) -> str:
    video_path = "/" + rel(source["video_url"], source["locale"])
    robots = '<meta name="robots" content="noindex">' if noindex else ''
    schema = {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        "@id": source["watch_url"] + "#video",
        "name": source["title"],
        "description": source["description"],
        "thumbnailUrl": [source["poster_url"]],
        "contentUrl": source["video_url"],
        "duration": f"PT{source['duration_ms'] // 1000}S",
        "inLanguage": source["locale"],
        "potentialAction": {
            "@type": "SeekToAction",
            "target": source["watch_url"] + "?t={seek_to_second_number}",
            "startOffset-input": "required name=seek_to_second_number",
        },
    }
    script = json.dumps(schema, ensure_ascii=False, separators=(",", ":"))
    if watch:
        return f'''<html><head>{robots}<link rel="canonical" href="{source['watch_url']}"><script type="application/ld+json">{script}</script></head><body>
<div class="s5-video-watch"><div class="s5-video-watch__player"><video><source src="{video_path}" type="video/mp4"></video></div>
<aside class="s5-video-watch__source"><a href="{source['article_url']}">article</a></aside></div></body></html>'''
    return f'''<html><head>{robots}<link rel="canonical" href="{source['article_url']}"></head><body>
<div class="s5-video-embed"><video><source src="{video_path}" type="video/mp4"></video></div>
<a href="{source['watch_url']}">watch</a></body></html>'''


def prepare_site(base: Path, locale: str, *, noindex_id: str | None = None, sitemap_bad_id: str | None = None) -> tuple[Path, list[dict]]:
    site_dir = base / ("site/en" if locale == "en" else "site")
    site_dir.mkdir(parents=True, exist_ok=True)
    sources = []
    for path in sorted((ROOT / "discovery" / "modelos-razonadores").glob(f"*.{locale}.json")):
        source = json.loads(path.read_text(encoding="utf-8"))
        sources.append(source)
        video_target = site_dir / rel(source["video_url"], locale)
        video_target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(MEDIA[(locale, source["id"])], video_target)
        watch = site_dir / rel(source["watch_url"], locale) / "index.html"
        watch.parent.mkdir(parents=True, exist_ok=True)
        watch.write_text(html_page(source, watch=True, noindex=source["id"] == noindex_id), encoding="utf-8")
        article = site_dir / rel(source["article_url"], locale) / "index.html"
        article.parent.mkdir(parents=True, exist_ok=True)
        article.write_text(html_page(source, watch=False), encoding="utf-8")

    videos_dir = site_dir / "videos"
    videos_dir.mkdir(parents=True, exist_ok=True)
    catalogue = {
        "version": 2,
        "videos": [
            {
                "id": source["id"],
                "title": source["title"],
                "description": source["description"],
                "watch_url": source["watch_url"],
                "video_url": source["video_url"],
                "thumb_url": source["poster_url"],
                "captions_url": "",
                "duration_seconds": source["duration_ms"] // 1000,
                "chapters": [],
            }
            for source in sources
        ],
    }
    (videos_dir / "catalog.json").write_text(json.dumps(catalogue), encoding="utf-8")

    video_lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">']
    normal_lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for source in sources:
        title = source["title"] if source["id"] != sitemap_bad_id else source["title"] + " stale"
        video_lines.extend([
            '<url>', f'<loc>{escape(source["watch_url"])}</loc>', '<video:video>',
            f'<video:thumbnail_loc>{escape(source["poster_url"])}</video:thumbnail_loc>',
            f'<video:title>{escape(title)}</video:title>',
            f'<video:description>{escape(source["description"])}</video:description>',
            f'<video:content_loc>{escape(source["video_url"])}</video:content_loc>',
            f'<video:duration>{source["duration_ms"] // 1000}</video:duration>',
            '</video:video>', '</url>',
        ])
        normal_lines.extend(['<url>', f'<loc>{escape(source["watch_url"])}</loc>', '</url>'])
    video_lines.append('</urlset>')
    normal_lines.append('</urlset>')
    (site_dir / "video-sitemap.xml").write_text("\n".join(video_lines), encoding="utf-8")
    (site_dir / "sitemap.xml").write_text("\n".join(normal_lines), encoding="utf-8")
    return site_dir, sources


class DiscoverySurfaceTests(unittest.TestCase):
    def test_binds_exact_sources_for_both_locales(self):
        for locale in ("es", "en"):
            with self.subTest(locale=locale), tempfile.TemporaryDirectory() as tmp:
                site_dir, sources = prepare_site(Path(tmp), locale)
                result = SURFACE.apply_discovery_surface({"site_dir": str(site_dir), "extra": {"content_language": locale}})
                self.assertEqual(len(result["sources"]), 2)
                catalogue = json.loads((site_dir / "videos/catalog.json").read_text(encoding="utf-8"))
                self.assertEqual(catalogue["version"], 3)
                for source in sources:
                    watch = (site_dir / rel(source["watch_url"], locale) / "index.html").read_text(encoding="utf-8")
                    article = (site_dir / rel(source["article_url"], locale) / "index.html").read_text(encoding="utf-8")
                    vtt = (site_dir / rel(source["vtt_url"], locale)).read_text(encoding="utf-8")
                    self.assertIn('id="video-transcript"', watch)
                    self.assertIn('data-discovery-source-sha256=', watch)
                    self.assertIn('data-s5-video-seek="', watch)
                    self.assertIn('"@type":"Clip"', watch)
                    self.assertNotIn('"@type":"SeekToAction"', watch)
                    self.assertIn('data-s5-visual-text-track', watch)
                    self.assertIn('data-s5-visual-text-track', article)
                    self.assertIn("WEBVTT", vtt)
                    self.assertIn(source["video_sha256"], vtt)

    def test_noindex_is_hard_failure(self):
        with tempfile.TemporaryDirectory() as tmp:
            site_dir, sources = prepare_site(Path(tmp), "es", noindex_id="modelos-razonadores-01-es")
            with self.assertRaisesRegex(SURFACE.CONTRACT.ContractError, "noindex"):
                SURFACE.apply_discovery_surface({"site_dir": str(site_dir), "extra": {"content_language": "es"}})

    def test_video_sitemap_divergence_is_hard_failure(self):
        with tempfile.TemporaryDirectory() as tmp:
            site_dir, sources = prepare_site(Path(tmp), "en", sitemap_bad_id="modelos-razonadores-01-en")
            with self.assertRaisesRegex(SURFACE.CONTRACT.ContractError, "video sitemap divergence"):
                SURFACE.apply_discovery_surface({"site_dir": str(site_dir), "extra": {"content_language": "en"}})

    def test_wrong_mp4_bytes_are_hard_failure(self):
        with tempfile.TemporaryDirectory() as tmp:
            site_dir, sources = prepare_site(Path(tmp), "es")
            source = next(item for item in sources if item["id"] == "modelos-razonadores-01-es")
            target = site_dir / rel(source["video_url"], "es")
            target.write_bytes(b"not the approved mp4")
            with self.assertRaisesRegex(SURFACE.CONTRACT.ContractError, "byte/hash mismatch"):
                SURFACE.apply_discovery_surface({"site_dir": str(site_dir), "extra": {"content_language": "es"}})

    def test_key_moments_preserve_fractional_timestamps(self):
        clips = SURFACE.validated_clips([
            {"name": "A", "start": 0, "end": 15.5},
            {"name": "B", "start": 15.5, "end": 30},
        ], "https://5sigmas.com/videos/x/")
        self.assertEqual(clips[1]["start"], 15.5)
        self.assertEqual(clips[1]["url"], "https://5sigmas.com/videos/x/?t=15.5")

    def test_key_moments_reject_order_overlap_and_bad_end(self):
        with self.assertRaisesRegex(RuntimeError, "Unordered"):
            SURFACE.validated_clips([
                {"name": "B", "start": 20, "end": 30},
                {"name": "A", "start": 0, "end": 20},
            ], "https://5sigmas.com/videos/x/")
        with self.assertRaisesRegex(RuntimeError, "Overlapping"):
            SURFACE.validated_clips([
                {"name": "A", "start": 0, "end": 20},
                {"name": "B", "start": 19, "end": 30},
            ], "https://5sigmas.com/videos/x/")
        with self.assertRaisesRegex(RuntimeError, "end <= start"):
            SURFACE.validated_clips([{"name": "A", "start": 5, "end": 5}], "https://5sigmas.com/videos/x/")


if __name__ == "__main__":
    unittest.main()
