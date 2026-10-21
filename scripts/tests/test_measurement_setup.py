"""Behavioral checks for source vocabulary and deployment activation."""
import json
from pathlib import Path
import tempfile
import unittest

from scripts.build_measurement_catalog import build
from scripts.configure_measurement import browser_config, validate_worker_policy


POLICY = {
    "enabled": True, "site_origin": "https://5sigmas.com",
    "endpoint": "/_s5/measurement/events", "policy_revision": "2026-10-18",
    "consent_mode": "explicit_opt_in", "retention_days": 90,
    "session_metadata_retention_hours": 48, "storage_jurisdiction": "eu",
}
HEALTH = {"ok": True, "service": "5sigmas-measurement", "schema_version": 1,
          "policy_revision": "2026-10-18", "consent_mode": "explicit_opt_in", "retention_days": 90, "storage": "ready"}


class MeasurementSetupTests(unittest.TestCase):
    def test_disabled_policy_needs_no_live_endpoint(self):
        config = browser_config({"enabled": False}, None)
        self.assertFalse(config["approved"])
        self.assertEqual(config["endpoint"], "")

    def test_live_storage_and_same_policy_are_required(self):
        self.assertTrue(browser_config(POLICY, HEALTH)["approved"])
        for health in [None, {}, {**HEALTH, "storage": "missing"}, {**HEALTH, "policy_revision": "old"}, {**HEALTH, "ok": False}]:
            with self.assertRaises(ValueError):
                browser_config(POLICY, health)

    def test_cross_origin_or_changed_retention_never_activates(self):
        for change in [{"endpoint": "https://other.invalid/events"}, {"retention_days": 365}, {"storage_jurisdiction": "us"}]:
            with self.assertRaises(ValueError):
                browser_config({**POLICY, **change}, HEALTH)

    def test_policy_drift_blocks_deployment(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "mcp-worker").mkdir()
            path = root / "mcp-worker/wrangler.jsonc"
            path.write_text(json.dumps({"vars": {"MEASUREMENT_ENABLED": "true", "MEASUREMENT_POLICY_REVISION": "2026-10-18"}}))
            validate_worker_policy(root, POLICY)
            with self.assertRaises(ValueError):
                validate_worker_policy(root, {**POLICY, "enabled": False})

    def test_vocabulary_uses_public_paths_static_fields_and_existing_tool_manifest(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for relative in ["docs/herramientas", "docs/includes", "docs/snippets", "docs/series/test", "locales/en/tools"]:
                (root / relative).mkdir(parents=True)
            (root / "docs/index.md").write_text("# Home")
            (root / "docs/includes/private.md").write_text("Not a page")
            (root / "docs/snippets/fragment.md").write_text("Not a page")
            (root / "docs/herramientas/demo.md").write_text('<input data-field="inputTokens" value="email@example.com"><input data-field="email@example.com"><video id="demo-video">')
            (root / "locales/en/tools/demo.md").write_text('<input data-field="provider" value="private-user-input">')
            (root / "docs/series/test/intro.mp4").write_bytes(b"fixture")
            (root / "docs/agent-tools.json").write_text(json.dumps({"tools": [{"id": "demo", "paths": {"es": "/herramientas/demo/", "en": "/en/tools/demo/"}}]}))
            catalog = build(root)
            self.assertIn("/", catalog["paths"])
            self.assertIn("/videos/series/test/intro/", catalog["paths"])
            self.assertNotIn("/includes/private/", catalog["paths"])
            self.assertNotIn("/snippets/fragment/", catalog["paths"])
            self.assertEqual(catalog["tool_fields"]["demo"], ["inputTokens", "provider"])
            self.assertEqual(catalog["tool_paths"]["/en/tools/demo/"], "demo")
            serialized = json.dumps(catalog)
            self.assertNotIn("email@example.com", serialized)
            self.assertNotIn("private-user-input", serialized)


if __name__ == "__main__":
    unittest.main()
