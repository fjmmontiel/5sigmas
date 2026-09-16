#!/usr/bin/env python3
"""Negative fixtures for coverage, rendering and media blind spots reported in #305."""
from pathlib import Path
import json
import tempfile
import unittest

from audit_series_experience import audit, load_yaml, rendered_findings
from audit_video_curriculum_expectation import validate_video_expectation


class ExperienceAuditTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.rel = "series/new-series/01-lesson.md"
        self.scope = {
            "excluded_through": "datacenters-espacio",
            "media_policy": {
                "video_required_for_every_target_route": True,
                "native_video_required_per_locale": True,
                "video_opt_out_allowed": False,
                "required_locales": ["es", "en"],
            },
            "series": {"new-series": ["01-lesson.md"]},
        }
        self.write("mkdocs.yml", "nav:\n - series/datacenters-espacio/00_presentacion_serie.md\n - " + self.rel + "\n")
        self.write("mkdocs.en.yml", "nav:\n - " + self.rel + "\n")
        self.write("locales/en/manifest.yml", "published_routes:\n - " + self.rel + "\n")
        self.article = (
            "---\n"
            "video: lesson.mp4\n"
            "video_poster: lesson.jpg\n"
            "video_duration: PT30S\n"
            "video_title: Lesson video\n"
            "video_summary: The mechanism in thirty seconds.\n"
            "video_captions: lesson.vtt\n"
            "video_transcript: lesson-transcript.md\n"
            "video_chapters:\n"
            "  - name: Problem\n    start: 0\n    end: 10\n"
            "  - name: Mechanism\n    start: 10\n    end: 22\n"
            "  - name: Consequence\n    start: 22\n    end: 30\n"
            "video_section_map:\n"
            "  - section: Mechanism\n    key_moment: Mechanism\n"
            "---\n# Lesson\n\n## Mechanism\nOne explicit relationship.\n"
        )
        for prefix in ("docs/", "locales/en/"):
            self.write(prefix + self.rel, self.article)
            parent = str(Path(prefix + self.rel).parent)
            for name in ("lesson.mp4", "lesson.jpg", "lesson.vtt", "lesson-transcript.md"):
                self.write(f"{parent}/{name}", "fixture")

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
        self.assertEqual(report["media"], "SOURCE_PASS_BINARY_PENDING")
        self.assertEqual(report["golden"], "NOT_CERTIFIED")
        self.assertEqual(report["pixel_review"], "PENDING")

    def test_video_expectation_policy_is_explicit_and_complete(self):
        result = validate_video_expectation(self.scope)
        self.assertEqual(result["policy"], "ALL_TARGET_ROUTES_NATIVE_PER_LOCALE_NO_OPT_OUT")
        self.assertEqual(result["target_routes"], 1)
        self.assertEqual(result["required_locales"], ["es", "en"])
        self.assertEqual(result["expected_locale_pages_with_video"], 2)

    def test_missing_video_expectation_policy_fails_closed(self):
        scope = dict(self.scope)
        scope.pop("media_policy")
        with self.assertRaises(ValueError):
            validate_video_expectation(scope)

    def test_video_opt_out_policy_fails_closed(self):
        scope = dict(self.scope)
        scope["media_policy"] = dict(scope["media_policy"], video_opt_out_allowed=True)
        with self.assertRaises(ValueError):
            validate_video_expectation(scope)

    def test_non_native_or_incomplete_locale_policy_fails_closed(self):
        scope = dict(self.scope)
        scope["media_policy"] = dict(scope["media_policy"], native_video_required_per_locale=False)
        with self.assertRaises(ValueError):
            validate_video_expectation(scope)
        scope["media_policy"] = dict(self.scope["media_policy"], required_locales=["es"])
        with self.assertRaises(ValueError):
            validate_video_expectation(scope)

    def test_canonical_scope_requires_video_for_all_84_locale_pages(self):
        scope_path = Path(__file__).resolve().parents[1] / "quality/series-requalification/scope.json"
        result = validate_video_expectation(json.loads(scope_path.read_text(encoding="utf-8")))
        self.assertEqual(result["target_routes"], 42)
        self.assertEqual(result["expected_locale_pages_with_video"], 84)

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

    def test_nonnumbered_english_orphan_cannot_escape_gate(self):
        self.write("locales/en/series/new-series/glossary.md", self.article)
        report = audit(self.root, self.scope)
        self.assertEqual(report["summary"]["locale_pages"], 4)
        self.assertIn("NAV_ROUTE_MISSING", self.codes(report))

    def test_manifest_only_page_cannot_escape_gate(self):
        self.write("locales/en/manifest.yml", "published_routes:\n - " + self.rel + "\n - series/new-series/appendix.md\n")
        self.assertEqual(audit(self.root, self.scope)["summary"]["locale_pages"], 4)

    def test_empty_scope_cannot_pass(self):
        with self.assertRaises(ValueError):
            audit(self.root, {"excluded_through": "datacenters-espacio", "series": {}})

    def test_nested_article_does_not_hide_later_math(self):
        html = '<html lang="es"><article><article><p>Card</p></article><p>\\frac{x}{y}</p><video></video></article></html>'
        issues, counts = rendered_findings(html, "es")
        self.assertEqual(counts["video_elements"], 1)
        self.assertIn("RAW_TEX_RENDERED", {f["code"] for f in issues})

    def test_video_can_be_explicitly_declared_in_locale_media(self):
        self.write("locales/en/" + self.rel, "# Lesson\nNo inherited Spanish video.\n")
        self.write("locales/en/media.yml", self.rel + ":\n  video: lesson.mp4\n")
        self.assertNotIn("VIDEO_DECLARATION_MISSING", self.codes(audit(self.root, self.scope)))

    def test_frontmatter_precedence_matches_video_hook(self):
        self.write("locales/en/media.yml", self.rel + ":\n  video: unexpected.mp4\n")
        en = audit(self.root, self.scope)["pages"][1]
        self.assertEqual(en["video"]["video"], "lesson.mp4")

    def test_missing_video_binary_is_blocked(self):
        (self.root / "docs/series/new-series/lesson.mp4").unlink()
        self.assertEqual(self.codes(audit(self.root, self.scope))["VIDEO_FILE_MISSING"], 1)

    def test_missing_captions_is_blocked_even_with_video(self):
        for prefix in ("docs/", "locales/en/"):
            path = self.root / prefix / self.rel
            text = path.read_text().replace("video_captions: lesson.vtt\n", "")
            path.write_text(text)
        report = audit(self.root, self.scope)
        self.assertEqual(self.codes(report)["VIDEO_CAPTIONS_MISSING"], 2)
        self.assertEqual(report["media"], "SOURCE_FAIL")

    def test_missing_transcript_is_blocked_even_with_captions(self):
        for prefix in ("docs/", "locales/en/"):
            path = self.root / prefix / self.rel
            text = path.read_text().replace("video_transcript: lesson-transcript.md\n", "")
            path.write_text(text)
        self.assertEqual(self.codes(audit(self.root, self.scope))["VIDEO_TRANSCRIPT_MISSING"], 2)

    def test_missing_curated_chapters_is_blocked(self):
        for prefix in ("docs/", "locales/en/"):
            path = self.root / prefix / self.rel
            text = path.read_text()
            text = text.split("video_chapters:\n", 1)[0] + "---\n# Lesson\n\n## Mechanism\nOne explicit relationship.\n"
            path.write_text(text)
        self.assertEqual(self.codes(audit(self.root, self.scope))["VIDEO_CHAPTERS_MISSING"], 2)

    def test_invalid_chapter_outside_declared_duration_is_blocked(self):
        path = self.root / "docs" / self.rel
        text = path.read_text().replace("start: 22\n    end: 30", "start: 31\n    end: 35")
        path.write_text(text)
        self.assertIn("VIDEO_CHAPTER_INVALID", self.codes(audit(self.root, self.scope)))

    def test_missing_video_title_and_summary_are_blocked(self):
        path = self.root / "docs" / self.rel
        text = path.read_text().replace("video_title: Lesson video\n", "").replace("video_summary: The mechanism in thirty seconds.\n", "")
        path.write_text(text)
        codes = self.codes(audit(self.root, self.scope))
        self.assertEqual(codes["VIDEO_TITLE_MISSING"], 1)
        self.assertEqual(codes["VIDEO_SUMMARY_MISSING"], 1)

    def test_missing_video_section_map_is_blocked(self):
        block = "video_section_map:\n  - section: Mechanism\n    key_moment: Mechanism\n"
        for prefix in ("docs/", "locales/en/"):
            path = self.root / prefix / self.rel
            path.write_text(path.read_text().replace(block, ""))
        codes = self.codes(audit(self.root, self.scope))
        self.assertEqual(codes["VIDEO_SECTION_MAP_MISSING"], 2)

    def test_unmapped_h2_is_blocked(self):
        for prefix in ("docs/", "locales/en/"):
            path = self.root / prefix / self.rel
            path.write_text(path.read_text() + "\n## Production\nA second curriculum section.\n")
        codes = self.codes(audit(self.root, self.scope))
        self.assertEqual(codes["VIDEO_SECTION_UNMAPPED"], 2)

    def test_unknown_key_moment_is_blocked(self):
        path = self.root / "docs" / self.rel
        path.write_text(path.read_text().replace("key_moment: Mechanism", "key_moment: Not a real key moment"))
        codes = self.codes(audit(self.root, self.scope))
        self.assertEqual(codes["VIDEO_SECTION_MAP_UNKNOWN_KEY_MOMENT"], 1)
        self.assertEqual(codes["VIDEO_SECTION_UNMAPPED"], 1)

    def test_unknown_section_is_blocked(self):
        path = self.root / "docs" / self.rel
        path.write_text(path.read_text().replace("section: Mechanism", "section: Not a real section"))
        codes = self.codes(audit(self.root, self.scope))
        self.assertEqual(codes["VIDEO_SECTION_MAP_UNKNOWN_SECTION"], 1)
        self.assertEqual(codes["VIDEO_SECTION_UNMAPPED"], 1)

    def test_multiple_h2s_can_share_one_key_moment(self):
        old = "video_section_map:\n  - section: Mechanism\n    key_moment: Mechanism\n"
        new = old + "  - section: Production\n    key_moment: Mechanism\n"
        for prefix in ("docs/", "locales/en/"):
            path = self.root / prefix / self.rel
            path.write_text(path.read_text().replace(old, new) + "\n## Production\nA second curriculum section.\n")
        report = audit(self.root, self.scope)
        self.assertNotIn("VIDEO_SECTION_UNMAPPED", self.codes(report))
        self.assertNotIn("VIDEO_SECTION_MAP_INVALID", self.codes(report))
        self.assertEqual(report["status"], "TECHNICAL_PASS_ONLY")

    def test_rendered_raw_tex_is_blocked(self):
        html = '<html lang="es"><article><p>\\[Recall@k=\\frac{x}{y}\\]</p><video></video></article></html>'
        issues, _ = rendered_findings(html, "es")
        self.assertIn("RAW_TEX_RENDERED", {f["code"] for f in issues})

    def test_arithmatex_wrapper_is_protected_at_static_layer(self):
        html = '<html lang="es"><article><p>Mechanism</p><div class="arithmatex">\\[Recall@k=\\frac{x}{y}\\]</div><video></video></article></html>'
        issues, stats = rendered_findings(html, "es")
        self.assertEqual(issues, [])
        self.assertEqual(stats["arithmatex_wrappers"], 1)
        self.assertEqual(stats["native_math_elements"], 0)

    def test_tex_outside_arithmatex_still_fails_when_wrapper_exists(self):
        html = '<html lang="en"><article><p>\\frac{a}{b}</p><div class="arithmatex">\\[x+y\\]</div><video></video></article></html>'
        issues, stats = rendered_findings(html, "en")
        self.assertEqual(stats["arithmatex_wrappers"], 1)
        self.assertIn("RAW_TEX_RENDERED", {f["code"] for f in issues})

    def test_native_math_and_real_video_structure_pass_only_this_layer(self):
        html = '<html lang="en"><article><p>Recall</p><math><mfrac><mi>x</mi><mi>y</mi></mfrac></math><video><source src="x.mp4"></video></article></html>'
        issues, stats = rendered_findings(html, "en")
        self.assertEqual(issues, [])
        self.assertEqual(stats, {"video_elements": 1, "native_math_elements": 1, "arithmatex_wrappers": 0})

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
