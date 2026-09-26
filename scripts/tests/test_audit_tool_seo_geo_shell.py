#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location(
    "audit_tool_seo_geo_shell",
    ROOT / "scripts" / "audit_tool_seo_geo_shell.py",
)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class ToolSeoGeoShellAuditTests(unittest.TestCase):
    def test_frontmatter_extracts_search_metadata(self) -> None:
        text = "---\ntitle: Example tool\ndescription: Useful static answer.\n---\n<h1>Example</h1>"
        self.assertEqual(
            MODULE._frontmatter(text),
            {"title": "Example tool", "description": "Useful static answer."},
        )

    def test_web_application_schema_is_required_not_generic_jsonld(self) -> None:
        generic = '<script type="application/ld+json">{"@type":"Article"}</script>'
        tool = '<script type="application/ld+json">{"@type":"WebApplication"}</script>'
        self.assertFalse(MODULE._has_web_application_schema(generic))
        self.assertTrue(MODULE._has_web_application_schema(tool))

    def test_source_signals_separate_required_shell_from_optional_actions(self) -> None:
        text = """
        <div class="s5-tool-page">
          <section class="s5-page-intro"><h1>Answer the question</h1><p>Static answer.</p></section>
          <form><label>Latency · ms</label><input type="number" value="100" /></form>
          <section class="s5-tool-method"><h2>Method</h2><p>Assumptions and limits are explicit.</p></section>
          <a href="https://example.org/primary">Source</a>
          <a href="/series/example/">Related explanation</a>
          <button data-action="share">Share</button>
        </div>
        """
        signals = MODULE._source_signals(text)
        self.assertTrue(signals["h1"])
        self.assertTrue(signals["interactive_controls"])
        self.assertTrue(signals["numeric_assumptions_applicable"])
        self.assertTrue(signals["default_or_example_state"])
        self.assertTrue(signals["methodology"])
        self.assertTrue(signals["assumptions_or_units"])
        self.assertTrue(signals["limits_or_caveats"])
        self.assertTrue(signals["primary_source_or_provenance"])
        self.assertEqual(signals["contextual_internal_links"], 1)
        self.assertTrue(signals["share"])
        self.assertFalse(signals["export"])

    def test_qualitative_controls_make_numeric_assumptions_not_applicable(self) -> None:
        text = """
        <h1>Threat explorer</h1>
        <form><select><option selected>Indirect</option></select><input type="checkbox" checked /></form>
        <div class="s5-threat-method-grid"><p>Reachability is deterministic, not a probability.</p></div>
        <p><strong>Limit:</strong> this does not estimate attack probability.</p>
        """
        signals = MODULE._source_signals(text)
        self.assertFalse(signals["numeric_assumptions_applicable"])
        self.assertTrue(signals["methodology"])
        self.assertTrue(signals["limits_or_caveats"])
        states = MODULE._check_states({
            **signals,
            "title": True,
            "description": True,
            "web_application_schema": True,
            "tool_page_shell": True,
            "llms_markdown_surface": True,
            "deterministic_test": True,
            "browser_validation": True,
            "contextual_internal_links": 1,
            "static_explanation_chars": 1000,
        })
        self.assertEqual(states["assumptions_or_units"], "N/A")

    def test_numeric_controls_still_fail_without_assumption_or_unit_signal(self) -> None:
        signals = MODULE._source_signals('<h1>X</h1><input type="number" value="3" /><p>Method</p>')
        self.assertTrue(signals["numeric_assumptions_applicable"])
        self.assertFalse(signals["assumptions_or_units"])
        self.assertEqual(
            MODULE._check_states({
                **signals,
                "title": True,
                "description": True,
                "web_application_schema": True,
                "tool_page_shell": True,
                "llms_markdown_surface": True,
                "deterministic_test": True,
                "browser_validation": True,
                "contextual_internal_links": 1,
                "static_explanation_chars": 1000,
            })["assumptions_or_units"],
            "FAIL",
        )

    def test_tool_specific_method_classes_and_partial_qrels_are_detected(self) -> None:
        text = """
        <div class="s5-agent-method-grid">Trajectory and result answer different questions.</div>
        <p>Qrels can be partial. Do not interpret a high value as absolute coverage.</p>
        """
        signals = MODULE._source_signals(text)
        self.assertTrue(signals["methodology"])
        self.assertTrue(signals["limits_or_caveats"])

    def test_contextual_links_include_related_tools_and_video(self) -> None:
        text = """
        <a href="/herramientas/presupuesto-contexto/">Related tool</a>
        <a href="/en/videos/series/example/chapter/">Watch</a>
        [Topic](/temas/evaluacion-modelos/)
        """
        self.assertEqual(MODULE._source_signals(text)["contextual_internal_links"], 3)

    def test_volatile_tools_require_dated_provenance_signal(self) -> None:
        row = {
            "title": True,
            "description": True,
            "h1": True,
            "web_application_schema": True,
            "tool_page_shell": True,
            "interactive_controls": True,
            "numeric_assumptions_applicable": False,
            "default_or_example_state": True,
            "methodology": True,
            "limits_or_caveats": True,
            "primary_source_or_provenance": True,
            "llms_markdown_surface": True,
            "deterministic_test": True,
            "browser_validation": True,
            "contextual_internal_links": 1,
            "static_explanation_chars": 1000,
            "dated_source_signal": False,
        }
        self.assertNotIn("dated_primary_source_provenance", MODULE._quality_gaps(row, volatile_data=False))
        self.assertIn("dated_primary_source_provenance", MODULE._quality_gaps(row, volatile_data=True))

    def test_shared_runtime_data_can_supply_volatile_dated_provenance(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            data = root / "docs/assets/data/tools/llm-pricing.json"
            data.parent.mkdir(parents=True)
            data.write_text('{"updated_at":"2026-08-21"}', encoding="utf-8")
            self.assertTrue(
                MODULE._shared_dated_provenance(root, "herramientas/coste-latencia-llm.md")
            )
            self.assertFalse(
                MODULE._shared_dated_provenance(root, "herramientas/linea-temporal-capacidades-modelos.md")
            )

    def test_protected_surface_keeps_reason_machine_readable(self) -> None:
        self.assertIn("herramientas/ecosistema-global-ia.md", MODULE.PROTECTED)
        self.assertIn("herramientas/precio-rendimiento-modelos.md", MODULE.PROTECTED)


if __name__ == "__main__":
    unittest.main()
