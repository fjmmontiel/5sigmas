import os
import unittest


class TestNBRecomputeGuard(unittest.TestCase):
    def test_recompute_nb_has_guard_for_missing_vocab(self):
        repo_root = os.path.dirname(os.path.dirname(__file__))
        html_path = os.path.join(
            repo_root,
            "drafts/series/fundamentos-IA-IAG/animaciones/all_animations_extended.html",
        )
        self.assertTrue(os.path.isfile(html_path))
        with open(html_path, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertIn("if (!cfg || !cfg.vocab)", content)


if __name__ == "__main__":
    unittest.main()
