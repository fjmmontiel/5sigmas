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

    def test_nav_series_points_to_first(self):
        mkdocs_path = os.path.join(os.path.dirname(main.__file__), "mkdocs.yml")
        self.assertTrue(os.path.isfile(mkdocs_path))
        with open(mkdocs_path, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertIn("series/fundamentos-ia-iag/00_presentacion_serie.md", content)
        self.assertNotIn("navigation.indexes", content)


if __name__ == "__main__":
    unittest.main()
