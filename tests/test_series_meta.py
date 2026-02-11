import os
import shutil
import unittest

import main


class TestSeriesMetaCounts(unittest.TestCase):
    def setUp(self):
        self.base_dir = os.path.join(os.path.dirname(main.__file__), "docs/series")
        self.series_dir = os.path.join(self.base_dir, "__test_series_meta")
        os.makedirs(self.series_dir, exist_ok=True)

        with open(os.path.join(self.series_dir, "00_presentacion_serie.md"), "w", encoding="utf-8") as f:
            f.write("# Serie de prueba\n\n### Uno\n\n<!--\n### Ignorar\n-->\n\n### Dos\n\n### Tres\n")

        with open(os.path.join(self.series_dir, "01_articulo.md"), "w", encoding="utf-8") as f:
            f.write("# Articulo 1\n")

        with open(os.path.join(self.series_dir, "02_articulo.md"), "w", encoding="utf-8") as f:
            f.write("# Articulo 2\n")

    def tearDown(self):
        shutil.rmtree(self.series_dir, ignore_errors=True)

    def test_counts(self):
        total = main._count_series_total("__test_series_meta")
        done = main._count_series_done("__test_series_meta")
        self.assertEqual(total, 3)
        self.assertEqual(done, 2)

    def test_counts_are_case_insensitive(self):
        total = main._count_series_total("__TEST_SERIES_META")
        done = main._count_series_done("__TEST_SERIES_META")
        self.assertEqual(total, 3)
        self.assertEqual(done, 2)

    def test_nav_series_points_to_first(self):
        mkdocs_path = os.path.join(os.path.dirname(main.__file__), "mkdocs.yml")
        self.assertTrue(os.path.isfile(mkdocs_path))
        with open(mkdocs_path, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertIn("series/fundamentos-ia-iag/00_presentacion_serie.md", content)
        self.assertNotIn("navigation.indexes", content)

    def test_datacenters_prereq_link_is_absolute(self):
        series_path = os.path.join(
            os.path.dirname(main.__file__),
            "docs/series/datacenters-espacio/00_presentacion_serie.md",
        )
        self.assertTrue(os.path.isfile(series_path))
        with open(series_path, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertIn(
            'href=\\"/series/fundamentos-ia-iag/00_presentacion_serie/\\"',
            content,
        )

    def test_ai_snippets_include_theme_overrides(self):
        snippets_dir = os.path.join(os.path.dirname(main.__file__), "docs/snippets")
        ia_path = os.path.join(snippets_dir, "fundamentos-ia/ia_ml_dl.html")
        tipos_path = os.path.join(snippets_dir, "fundamentos-ia/tipos_aprendizaje.html")

        self.assertTrue(os.path.isfile(ia_path))
        self.assertTrue(os.path.isfile(tipos_path))

        with open(ia_path, "r", encoding="utf-8") as f:
            ia_content = f.read()
        with open(tipos_path, "r", encoding="utf-8") as f:
            tipos_content = f.read()

        self.assertIn("data-md-color-scheme", ia_content)
        self.assertIn("data-md-color-scheme", tipos_content)
        self.assertIn(".ai-mat", ia_content)
        self.assertIn("ta-learn", tipos_content)

    def test_ia_ml_dl_snippet_has_balanced_section_closure(self):
        path = os.path.join(
            os.path.dirname(main.__file__),
            "docs/snippets/fundamentos-ia/ia_ml_dl.html",
        )
        self.assertTrue(os.path.isfile(path))
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertNotIn("      </div>\n      </div>\n    </section>", content)

    def test_include_html_macro_defined(self):
        path = os.path.join(os.path.dirname(main.__file__), "main.py")
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertIn("def include_html(", content)

    def test_animation_shell_styles_defined(self):
        path = os.path.join(os.path.dirname(main.__file__), "docs/stylesheets/extra.css")
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertIn(".anim-brand-shell", content)

    def test_pages_use_include_html_macro_for_animation_snippets(self):
        base = os.path.dirname(main.__file__)
        targets = (
            os.path.join(base, "docs/series/fundamentos-ia-iag/01_draft.md"),
            os.path.join(base, "docs/series/datacenters-espacio/00_presentacion_serie.md"),
            os.path.join(base, "docs/series/ia-pib-bienestar-energia/00_presentacion_serie.md"),
        )
        for path in targets:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            self.assertIn("include_html(", content)
            self.assertNotIn("include_animation(", content)

    def test_docs_do_not_use_legacy_include_animation_macro(self):
        base = os.path.dirname(main.__file__)
        docs_dir = os.path.join(base, "docs")
        for root, _, files in os.walk(docs_dir):
            for filename in files:
                if not filename.endswith(".md"):
                    continue
                path = os.path.join(root, filename)
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                self.assertNotIn("include_animation(", content)

    def test_drafts_do_not_use_legacy_include_animation_macro(self):
        base = os.path.dirname(main.__file__)
        drafts_dir = os.path.join(base, "drafts")
        if not os.path.isdir(drafts_dir):
            return
        for root, _, files in os.walk(drafts_dir):
            for filename in files:
                if not filename.endswith(".md"):
                    continue
                path = os.path.join(root, filename)
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                self.assertNotIn("include_animation(", content)

    def test_wrap_animation_shell_adds_viewport_and_toolbar(self):
        wrapped = main._wrap_animation_shell("<div>demo</div>", variant="x", fullscreen="on")
        self.assertIn('data-anim-shell', wrapped)
        self.assertIn('data-anim-variant="x"', wrapped)
        self.assertIn('data-anim-fullscreen="on"', wrapped)
        self.assertIn('data-anim-contrast="force"', wrapped)
        self.assertIn('anim-brand-shell__toolbar', wrapped)
        self.assertIn('anim-brand-shell__viewport', wrapped)
        self.assertIn('data-anim-shell-open', wrapped)

    def test_resolve_fullscreen_mode_detects_data_attr(self):
        html = '<div class="demo" data-anim-fullscreen="on"></div>'
        mode = main._resolve_fullscreen_mode(html, explicit_value=None)
        self.assertEqual(mode, "on")

    def test_resolve_fullscreen_mode_defaults_to_on(self):
        html = '<div class="demo"></div>'
        mode = main._resolve_fullscreen_mode(html, explicit_value=None)
        self.assertEqual(mode, "on")

    def test_resolve_fullscreen_mode_respects_explicit_off(self):
        html = '<div class="demo" data-anim-fullscreen="on"></div>'
        mode = main._resolve_fullscreen_mode(html, explicit_value="off")
        self.assertEqual(mode, "off")

    def test_resolve_fullscreen_mode_detects_snippet_off(self):
        html = '<div class="demo" data-anim-fullscreen="off"></div>'
        mode = main._resolve_fullscreen_mode(html, explicit_value=None)
        self.assertEqual(mode, "off")

    def test_resolve_fullscreen_mode_explicit_on_overrides_snippet_off(self):
        html = '<div class="demo" data-anim-fullscreen="off"></div>'
        mode = main._resolve_fullscreen_mode(html, explicit_value="on")
        self.assertEqual(mode, "on")

    def test_should_wrap_with_shell_for_free_snippet_html(self):
        path = "snippets/animaciones/demo_libre.html"
        html = '<div class="demo">contenido</div>'
        self.assertTrue(main._should_wrap_with_shell(path, html, shell_mode="auto"))

    def test_should_not_wrap_excluded_snippets(self):
        path = "snippets/series_meta.html"
        html = '<div class="series-meta"></div>'
        self.assertFalse(main._should_wrap_with_shell(path, html, shell_mode="auto"))


if __name__ == "__main__":
    unittest.main()
