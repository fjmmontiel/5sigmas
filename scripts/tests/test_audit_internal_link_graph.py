from __future__ import annotations

import importlib.util
from pathlib import Path
import sys
import unittest


ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location(
    "audit_internal_link_graph",
    ROOT / "scripts" / "audit_internal_link_graph.py",
)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


class InternalLinkGraphAuditTest(unittest.TestCase):
    def test_parser_separates_navigation_body_and_semantic_links(self) -> None:
        parser = MODULE.LinkSurfaceParser("https://5sigmas.com/series/example/")
        parser.feed(
            """
            <nav><a href="/series/">Series</a></nav>
            <main class="md-content"><div class="md-content__inner">
              <p><a href="/temas/llms/">LLMs explained</a></p>
              <section data-s5-semantic-nav="1">
                <a href="/herramientas/coste-latencia-llm/"><span>LLM cost and latency calculator</span></a>
              </section>
            </div></main>
            """
        )
        surfaces = {(row["url"], row["surface"]) for row in parser.links}
        self.assertIn(("https://5sigmas.com/series/", "navigation"), surfaces)
        self.assertIn(("https://5sigmas.com/temas/llms/", "body"), surfaces)
        self.assertIn(("https://5sigmas.com/herramientas/coste-latencia-llm/", "semantic"), surfaces)

    def test_page_metrics_keeps_contextual_inbound_separate(self) -> None:
        metrics = MODULE.PageMetrics(
            url="https://5sigmas.com/temas/llms/",
            kind="concept",
            inbound_all=5,
            inbound_navigation=4,
            inbound_body=0,
            inbound_semantic=1,
        )
        self.assertEqual(metrics.inbound_contextual, 1)
        self.assertEqual(metrics.payload()["inbound_contextual"], 1)

    def test_english_tool_routes_map_back_to_canonical_spanish(self) -> None:
        mapping = MODULE.english_tool_route_map()
        self.assertEqual(
            mapping["/en/tools/llm-cost-latency/"],
            "/herramientas/coste-latencia-llm/",
        )
        self.assertEqual(
            MODULE.canonical_es_route("https://5sigmas.com/en/tools/llm-cost-latency/", mapping),
            "/herramientas/coste-latencia-llm/",
        )
        self.assertEqual(
            MODULE.canonical_es_route("https://5sigmas.com/en/series/example/", mapping),
            "/series/example/",
        )

    def test_parity_report_flags_contextual_presence_not_count_noise(self) -> None:
        es = [
            MODULE.PageMetrics("https://5sigmas.com/series/a/", "series-chapter", 2, 1, 0, 1),
            MODULE.PageMetrics("https://5sigmas.com/series/b/", "series-chapter", 2, 2, 0, 0),
        ]
        en = [
            MODULE.PageMetrics("https://5sigmas.com/en/series/a/", "series-chapter", 3, 2, 0, 1),
            MODULE.PageMetrics("https://5sigmas.com/en/series/b/", "series-chapter", 3, 2, 0, 1),
        ]
        report = MODULE.parity_report(es, en)
        self.assertEqual(report["paired_pages"], 2)
        self.assertEqual(len(report["kind_mismatches"]), 0)
        self.assertEqual(len(report["contextual_presence_mismatches"]), 1)
        self.assertTrue(report["contextual_presence_mismatches"][0]["en"].endswith("/series/b/"))


if __name__ == "__main__":
    unittest.main()
