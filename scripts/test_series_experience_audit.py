#!/usr/bin/env python3
"""Negative fixtures for coverage and rendering blind spots reported in #305."""
import json
from pathlib import Path
import tempfile
import unittest

from audit_series_experience import audit, load_yaml, rendered_findings


class ExperienceAuditTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.rel = "series/new-series/01-lesson.md"
        self.scope = {"excluded_through": "datacenters-espacio", "series": {"new-series": ["01-lesson.md"]}}
        self.write("mkdocs.yml", "nav:\n - series/datacenters-espacio/00_presentacion_serie.md\n - " + self.rel + "\n")
        self.write("mkdocs.en.yml", "nav:\n - " + self.rel + "\n")
        self.write("locales/en/manifest.yml", "published_routes:\n - " + self.rel + "\n")
        self.article = "---\nvideo: lesson.mp4\n---\n# Lesson\n\n## Mechanism\nOne explicit relationship.\n"
        self.write("docs/" + self.rel, self.article)
        self.write("locales/en/" + self.rel, self.article)

    def write(self, path, text):
        p = self.root / path
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text, encoding="utf-8")

    def codes(self, report):
        return report["summary"]["findings"]

    def test_series_without_presentation_is_audited(self):
        report = audit(self.root, self.scope)
        self.assertEqual(report["summary"]["locale_pages"], 2)
        self.assertEqual(report["status"], "TECHNICAL_PASS_ONLY")
        self.assertEqual(report["golden"], "NOT_CERTIFIED")
        self.assertEqual(report["pixel_review"], "PENDING")

    def test_video_missing_in_both_languages_is_not_parity_pass(self):
        for prefix in ("docs/", "locales/en/"):
            self.write(prefix + self.rel, "# Lesson\nNo video declared.\n")
        report = audit(self.root, self.scope)
        self.assertEqual(self.codes(report)["VIDEO_DECLARATION_MISSING"], 2)
        self.assertEqual(report["status"], "TECHNICAL_FAIL")

    def test_missing_navigation_does_not_remove_page(self):
        self.write("mkdocs.yml", "nav:\n - series/datacenters-espacio/00_presentacion_serie.md\n")
        self.assertIn("NAV_ROUTE_MISSING", self.codes(audit(self.root, self.scope)))
        self.assertEqual(audit(self.root, self.scope)["summary"]["locale_pages"], 2)

    def test_deleting_source_and_navigation_does_not_shrink_scope(self):
        (self.root / "docs" / self.rel).unlink()
        self.write("mkdocs.yml", "nav:\n - series/datacenters-espacio/00_presentacion_serie.md\n")
        report = audit(self.root, self.scope)
        self.assertIn("LOCALE_SOURCE_MISSING", self.codes(report))
        self.assertEqual(report["summary"]["locale_pages"], 2)

    def test_english_manifest_is_checked_independently(self):
        self.write("locales/en/manifest.yml", "published_routes: []\n")
        self.assertEqual(self.codes(audit(self.root, self.scope))["EN_MANIFEST_ROUTE_MISSING"], 1)

    def test_new_disk_chapter_cannot_escape_gate(self):
        self.write("docs/series/new-series/02-extra.md", self.article)
        report = audit(self.root, self.scope)
        self.assertEqual(report["summary"]["locale_pages"], 4)
        self.assertIn("LOCALE_SOURCE_MISSING", self.codes(report))

    def test_new_english_nav_chapter_cannot_escape_gate(self):
        self.write("mkdocs.en.yml", "nav:\n - " + self.rel + "\n - series/new-series/03-extra.md\n")
        self.assertEqual(audit(self.root, self.scope)["summary"]["locale_pages"], 4)

    def test_video_can_be_explicitly_declared_in_locale_media(self):
        self.write("locales/en/" + self.rel, "# Lesson\nNo inherited Spanish video.\n")
        self.write("locales/en/media.yml", self.rel + ":\n  video: lesson-en.mp4\n")
        self.assertNotIn("VIDEO_DECLARATION_MISSING", self.codes(audit(self.root, self.scope)))

    def test_frontmatter_precedence_matches_video_hook(self):
        self.write("locales/en/media.yml", self.rel + ":\n  video: unexpected.mp4\n")
        en = audit(self.root, self.scope)["pages"][1]
        self.assertEqual(en["video"]["video"], "lesson.mp4")

    def test_rendered_raw_tex_is_blocked(self):
        html = '<html lang="es"><article><p>\\[Recall@k=\\frac{x}{y}\\]</p><video></video></article></html>'
        issues, _ = rendered_findings(html, "es")
        self.assertIn("RAW_TEX_RENDERED", {f["code"] for f in issues})

    def test_native_math_and_real_video_structure_pass_only_this_layer(self):
        html = '<html lang="en"><article><p>Recall</p><math><mfrac><mi>x</mi><mi>y</mi></mfrac></math><video><source src="x.mp4"></video></article></html>'
        issues, stats = rendered_findings(html, "en")
        self.assertEqual(issues, [])
        self.assertEqual(stats, {"video_elements": 1, "native_math_elements": 1})

    def test_tex_code_example_is_not_misclassified(self):
        html = '<html lang="es"><article><p>Code example</p><pre><code>\\frac{x}{y}</code></pre><video></video></article></html>'
        self.assertEqual(rendered_findings(html, "es")[0], [])

    def test_accidentally_escaped_snippet_is_blocked_even_in_code(self):
        html = '<html lang="es"><article><pre><code>&lt;section class="s5v"&gt;</code></pre><video></video></article></html>'
        self.assertIn("SNIPPET_OR_MACRO_RENDERED_AS_TEXT", {f["code"] for f in rendered_findings(html, "es")[0]})

    def test_missing_built_page_is_not_a_success(self):
        report = audit(self.root, self.scope, self.root / "site")
        self.assertEqual(self.codes(report)["BUILT_ROUTE_MISSING"], 2)

    def test_missing_video_element_and_wrong_locale_are_blocked(self):
        issues, _ = rendered_findings('<html lang="es"><article><p>English?</p></article></html>', "en")
        self.assertEqual({f["code"] for f in issues}, {"VIDEO_NOT_RENDERED", "WRONG_HTML_LOCALE"})

    def test_custom_yaml_tag_is_inert(self):
        self.write("inert.yml", "x: !!python/name:not.a.real.function ''\n")
        self.assertEqual(load_yaml(self.root / "inert.yml"), {"x": ""})


if __name__ == "__main__":
    unittest.main()
