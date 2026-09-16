#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
from pathlib import Path
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
        self.assertTrue(signals["default_or_example_state"])
        self.assertTrue(signals["methodology"])
        self.assertTrue(signals["assumptions_or_units"])
        self.assertTrue(signals["limits_or_caveats"])
        self.assertTrue(signals["primary_source_or_provenance"])
        self.assertEqual(signals["contextual_internal_links"], 1)
        self.assertTrue(signals["share"])
        self.assertFalse(signals["export"])

    def test_protected_surface_keeps_reason_machine_readable(self) -> None:
        self.assertIn("herramientas/ecosistema-global-ia.md", MODULE.PROTECTED)
        self.assertIn("herramientas/precio-rendimiento-modelos.md", MODULE.PROTECTED)


if __name__ == "__main__":
    unittest.main()
