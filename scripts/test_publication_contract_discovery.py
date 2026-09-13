#!/usr/bin/env python3
"""Regression tests for public-series discovery after the 2026-09-13 requalification."""

import unittest

from audit_publication_contract import (
    CATALOGUE,
    LLMS,
    MKDOCS,
    discover_public_series,
    is_support_markdown,
    slugs_from_catalogue,
    slugs_from_llms,
    slugs_from_nav,
)


EXPECTED_SERIES = {
    "fundamentos-ia-iag",
    "from-cave-to-agi",
    "multimodalidad-iag",
    "modelos-razonadores",
    "ia-pib-bienestar-energia",
    "datacenters-espacio",
    "seguridad-ia",
    "agentes-ia",
    "agentes-voz-tiempo-real",
    "coding-agents-agent-harnesses",
    "context-engineering-memory-mcp",
    "llm-inference-engineering-economics",
    "evaluating-ai-systems-production",
}

CHAPTER_FIRST = {
    "agentes-voz-tiempo-real",
    "coding-agents-agent-harnesses",
    "context-engineering-memory-mcp",
    "llm-inference-engineering-economics",
    "evaluating-ai-systems-production",
}


class PublicationDiscoveryTest(unittest.TestCase):
    def test_current_public_source_inventory_contains_all_thirteen_series(self):
        discovered = discover_public_series()
        self.assertEqual({item.slug for item in discovered}, EXPECTED_SERIES)

    def test_chapter_first_series_do_not_need_fake_presentations(self):
        by_slug = {item.slug: item for item in discover_public_series()}
        for slug in CHAPTER_FIRST:
            self.assertIsNone(by_slug[slug].presentation)
            self.assertTrue(by_slug[slug].landing.name.startswith("01-"))

    def test_transcripts_are_media_dependencies_not_lesson_routes(self):
        for item in discover_public_series():
            for page in item.pages:
                self.assertFalse(is_support_markdown(page), page)
                self.assertNotIn("transcript", page.stem.lower())

    def test_navigation_and_catalogue_cover_the_source_inventory(self):
        mkdocs = MKDOCS.read_text(encoding="utf-8")
        catalogue = CATALOGUE.read_text(encoding="utf-8")
        self.assertEqual(slugs_from_nav(mkdocs), EXPECTED_SERIES)
        self.assertEqual(slugs_from_catalogue(catalogue), EXPECTED_SERIES)

    def test_llms_discovery_must_cover_the_same_series(self):
        # This assertion intentionally fails until the public llms.txt surface is
        # repaired; it prevents a future "build green" from hiding a missing series.
        self.assertEqual(slugs_from_llms(LLMS.read_text(encoding="utf-8")), EXPECTED_SERIES)


if __name__ == "__main__":
    unittest.main()
