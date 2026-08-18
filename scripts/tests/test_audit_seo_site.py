import tempfile
import unittest
from pathlib import Path

from scripts.audit_seo_site import SiteReader, crawl


class SeoAuditTest(unittest.TestCase):
    def test_classifies_local_noindex_and_sitemap(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "sitemap.xml").write_text(
                """<?xml version='1.0'?><urlset xmlns='http://www.sitemaps.org/schemas/sitemap/0.9'>
                <url><loc>https://5sigmas.com/</loc></url>
                <url><loc>https://5sigmas.com/private/</loc></url>
                </urlset>""",
                encoding="utf-8",
            )
            (root / "index.html").write_text(
                """<html lang='es'><head><title>Home</title>
                <meta name='description' content='Home'>
                <link rel='canonical' href='https://5sigmas.com/'>
                <a href='/private/'>Private</a></head><body><h1>Home</h1></body></html>""",
                encoding="utf-8",
            )
            (root / "private").mkdir()
            (root / "private/index.html").write_text(
                """<html lang='es'><head><title>Private</title>
                <meta name='robots' content='noindex'>
                <link rel='canonical' href='https://5sigmas.com/private/'></head>
                <body><h1>Private</h1></body></html>""",
                encoding="utf-8",
            )
            report = crawl(SiteReader(root=root, base_url="https://5sigmas.com", timeout=2, workers=2))
            pages = {row["url"]: row for row in report["pages"]}
            self.assertEqual(pages["https://5sigmas.com/"]["classification"], "INDEX")
            self.assertEqual(pages["https://5sigmas.com/private/"]["classification"], "NOINDEX")
            self.assertEqual(report["stats"]["sitemap_invalid"], 1)


if __name__ == "__main__":
    unittest.main()
