"""Regression coverage for the catalogue preceding nested Concept navigation."""
from __future__ import annotations
import unittest
from audit_publication_contract import slugs_from_nav


class NavigationSlugs(unittest.TestCase):
    def test_root_catalogue_does_not_capture_next_yaml_lines(self):
        text = '- series/index.md\n- Conceptos:\n    - temas/index.md\n'
        self.assertEqual(slugs_from_nav(text), set())

    def test_real_chapters_remain_discoverable(self):
        text = '- Agentes:\n    - Qué es: series/agentes-ia/01-que-es-un-agente.md'
        self.assertEqual(slugs_from_nav(text), {'agentes-ia'})

    def test_quoted_paths_remain_discoverable(self):
        text = '"series/agentes-ia/01-que-es-un-agente.md"'
        self.assertEqual(slugs_from_nav(text), {'agentes-ia'})

    def test_mixed_catalogue_concepts_and_series(self):
        text = ('- series/index.md\n- Conceptos:\n  - temas/index.md\n'
                '- A:\n  - series/agentes-ia/01-que-es-un-agente.md\n'
                '  - series/seguridad-ia/01-prompt-injection.md')
        self.assertEqual(slugs_from_nav(text), {'agentes-ia', 'seguridad-ia'})


if __name__ == '__main__':
    unittest.main(verbosity=2)
