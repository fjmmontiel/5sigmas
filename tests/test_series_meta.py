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
        for filename in ("ia_ml_dl.html", "tipos_aprendizaje.html"):
            path = os.path.join(snippets_dir, filename)
            self.assertTrue(os.path.isfile(path))
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            self.assertIn("data-md-color-scheme", content)
            self.assertTrue("--ai-" in content or ".ai-mat{" in content)

    def test_include_animation_macro_defined(self):
        path = os.path.join(os.path.dirname(main.__file__), "main.py")
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertIn("def include_animation(", content)

    def test_animation_shell_styles_defined(self):
        path = os.path.join(os.path.dirname(main.__file__), "docs/stylesheets/extra.css")
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertIn(".anim-brand-shell", content)

    def test_pages_use_include_animation_macro(self):
        base = os.path.dirname(main.__file__)
        targets = (
            os.path.join(base, "docs/series/fundamentos-ia-iag/01_draft.md"),
            os.path.join(base, "docs/series/datacenters-espacio/00_presentacion_serie.md"),
            os.path.join(base, "docs/series/ia-pib-bienestar-energia/00_presentacion_serie.md"),
        )
        for path in targets:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            self.assertIn("include_animation(", content)

    def test_animation_snippets_not_included_with_include_html(self):
        base = os.path.dirname(main.__file__)
        docs_dir = os.path.join(base, "docs")
        for root, _, files in os.walk(docs_dir):
            for filename in files:
                if not filename.endswith(".md"):
                    continue
                path = os.path.join(root, filename)
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                self.assertNotIn('include_html("snippets/animaciones/', content)
                self.assertNotIn('include_html("snippets/series_energy_ai_', content)
                self.assertNotIn('include_html("snippets/dc_space_pressure_anim.html")', content)
                self.assertNotIn('include_html("snippets/ia_ml_dl.html")', content)
                self.assertNotIn('include_html("snippets/tipos_aprendizaje.html")', content)


if __name__ == "__main__":
    unittest.main()
