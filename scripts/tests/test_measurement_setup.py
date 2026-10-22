"""Behavioral checks for source vocabulary and deployment activation."""
from email.message import Message
import io
import json
from pathlib import Path
import tempfile
import traceback
import unittest
from unittest.mock import MagicMock, patch
from urllib.error import HTTPError

from scripts.build_measurement_catalog import build
from scripts.configure_measurement import (
    MAX_ERROR_BODY_BYTES, NoRedirect, browser_config, health_http_error, main, validate_worker_policy,
)


POLICY = {
    "enabled": True, "site_origin": "https://5sigmas.com",
    "endpoint": "/_s5/measurement/events", "policy_revision": "2026-10-18",
    "consent_mode": "explicit_opt_in", "retention_days": 90,
    "session_metadata_retention_hours": 48, "storage_jurisdiction": "eu",
}
HEALTH = {"ok": True, "service": "5sigmas-measurement", "schema_version": 1,
          "policy_revision": "2026-10-18", "consent_mode": "explicit_opt_in", "retention_days": 90, "storage": "ready"}


class MeasurementSetupTests(unittest.TestCase):
    @staticmethod
    def configured_root(directory):
        root = Path(directory)
        (root / "mcp-worker").mkdir()
        (root / "measurement-deployment.json").write_text(json.dumps(POLICY))
        (root / "mcp-worker/wrangler.jsonc").write_text(json.dumps({"vars": {
            "MEASUREMENT_ENABLED": "true", "MEASUREMENT_POLICY_REVISION": "2026-10-18",
        }}))
        return root

    def test_http_failure_has_diagnostics_and_never_activates_or_retries(self):
        headers = Message()
        for name, value in [("Content-Type", "Application/JSON; charset=UTF-8"), ("CF-Ray", "a4e6bd539a703eb5-ORD"),
                            ("CF-Mitigated", "challenge"), ("Set-Cookie", "private-cookie")]:
            headers[name] = value
        for status in (403, 302):
            with self.subTest(status=status), tempfile.TemporaryDirectory() as directory:
                root = self.configured_root(directory)
                target = root / "docs/assets/javascripts/measurement-config.js"
                target.parent.mkdir(parents=True)
                target.write_text("previous configuration")
                error = HTTPError("https://5sigmas.com/_s5/measurement/health", status, "untrusted-reason", headers,
                                  io.BytesIO(b'{"error_code":1010,"message":"private response content"}'))
                opener = MagicMock()
                opener.open.side_effect = error
                with patch("sys.argv", ["configure_measurement.py", "--root", str(root)]), \
                        patch("scripts.configure_measurement.build_opener", return_value=opener) as builder:
                    with self.assertRaises(ValueError) as caught:
                        main()
                diagnostic = str(caught.exception)
                details = json.loads(diagnostic.split(": ", 1)[1])
                self.assertEqual(details["status"], status)
                self.assertEqual(details["headers"], {
                    "Content-Type": "application/json", "CF-Ray": "a4e6bd539a703eb5-ORD", "CF-Mitigated": "challenge",
                })
                self.assertEqual(details["error_code"], 1010)
                self.assertEqual(details["reason_label"], "browser_signature_banned")
                self.assertEqual(details["body_read_status"], "ok")
                self.assertEqual(details["body_parse_status"], "json_object")
                for secret in ("private-cookie", "private response content", "untrusted-reason", "\n", "\x1b"):
                    self.assertNotIn(secret, diagnostic)
                self.assertIsNone(caught.exception.__cause__)
                self.assertTrue(caught.exception.__suppress_context__)
                builder.assert_called_once_with(NoRedirect)
                opener.open.assert_called_once()
                request = opener.open.call_args.args[0]
                self.assertEqual(request.full_url, "https://5sigmas.com/_s5/measurement/health")
                self.assertEqual(request.header_items(), [("Accept", "application/json")])
                self.assertEqual(target.read_text(), "previous configuration")

    def test_http_diagnostic_bounds_read_and_skips_truncated_json(self):
        body = MagicMock()
        body.read.return_value = b"x" * (MAX_ERROR_BODY_BYTES + 1)
        headers = Message()
        headers["CF-Ray"] = "r" * 1000
        error = HTTPError("https://5sigmas.com/_s5/measurement/health", 403, "Denied", headers, body)
        details = json.loads(health_http_error(error).split(": ", 1)[1])
        body.read.assert_called_once_with(MAX_ERROR_BODY_BYTES + 1)
        self.assertEqual(details["body_bytes_observed"], MAX_ERROR_BODY_BYTES + 1)
        self.assertTrue(details["body_truncated"])
        self.assertEqual(details["body_parse_status"], "skipped_truncated")
        self.assertEqual(details["headers"], {})
        self.assertNotIn("body_excerpt", details)

    def test_diagnostic_read_error_keeps_original_http_status(self):
        body = MagicMock()
        body.read.side_effect = TimeoutError("private diagnostic detail")
        error = HTTPError("https://5sigmas.com/_s5/measurement/health", 403, "Denied", None, body)
        diagnostic = health_http_error(error)
        details = json.loads(diagnostic.split(": ", 1)[1])
        self.assertEqual(details["status"], 403)
        self.assertEqual(details["body_read_status"], "failed")
        self.assertEqual(details["body_parse_status"], "not_attempted")
        self.assertNotIn("body_bytes_observed", details)
        self.assertNotIn("private diagnostic detail", diagnostic)

    def test_only_known_application_codes_and_numeric_provider_code_are_recorded(self):
        for code in ("origin_refused", "credentials_refused", "privacy_preference"):
            with self.subTest(code=code):
                payload = {"error": code, "message": "private-content", "error_code": 1020}
                error = HTTPError("https://5sigmas.com/_s5/measurement/health", 403, "private-reason", None,
                                  io.BytesIO(json.dumps(payload).encode()))
                diagnostic = health_http_error(error)
                details = json.loads(diagnostic.split(": ", 1)[1])
                self.assertEqual(details["application_error"], code)
                self.assertEqual(details["error_code"], 1020)
                self.assertNotIn("reason_label", details)
                self.assertNotIn("private-", diagnostic)
        for code in (True, "1010", -1, 2**31, {"private": "value"}):
            with self.subTest(provider_code=code):
                payload = {"error_code": code, "error": "private-error", "reason": "browser_signature_banned"}
                error = HTTPError("https://5sigmas.com/_s5/measurement/health", 403, "private-reason", None,
                                  io.BytesIO(json.dumps(payload).encode()))
                details = json.loads(health_http_error(error).split(": ", 1)[1])
                for field in ("application_error", "error_code", "reason_label"):
                    self.assertNotIn(field, details)

    def test_untrusted_headers_and_body_text_never_enter_diagnostic(self):
        for secret in ("secret-token", "::error::injected\nnext", "\x1b[31mred", "x" * 1000):
            with self.subTest(secret=secret[:20]):
                headers = Message()
                for name in ("Content-Type", "CF-Ray", "CF-Mitigated", "Set-Cookie", "Authorization"):
                    headers[name] = secret
                payload = {"error": secret, "message": secret, "reason": secret, "headers": {"token": secret}}
                error = HTTPError("https://5sigmas.com/_s5/measurement/health", 403, secret, headers,
                                  io.BytesIO(json.dumps(payload).encode()))
                diagnostic = health_http_error(error)
                details = json.loads(diagnostic.split(": ", 1)[1])
                self.assertEqual(details["headers"], {})
                self.assertNotIn(secret, diagnostic)
                self.assertNotIn("body_excerpt", details)
        headers = Message()
        headers["Content-Type"] = "application/json; secret=private-parameter"
        error = HTTPError("https://5sigmas.com/_s5/measurement/health", 403, "Denied", headers, io.BytesIO(b"{}"))
        diagnostic = health_http_error(error)
        self.assertEqual(json.loads(diagnostic.split(": ", 1)[1])["headers"], {"Content-Type": "application/json"})
        self.assertNotIn("private-parameter", diagnostic)

    def test_invalid_json_or_encoding_records_fixed_parse_status_only(self):
        for body, state in ((b"<html>private-body</html>", "invalid_json"),
                            (b"\xffprivate-body", "invalid_encoding"), (b"[]", "json_other")):
            with self.subTest(state=state):
                error = HTTPError("https://5sigmas.com/_s5/measurement/health", 403, "Denied", None, io.BytesIO(body))
                diagnostic = health_http_error(error)
                details = json.loads(diagnostic.split(": ", 1)[1])
                self.assertEqual(details["body_bytes_observed"], len(body))
                self.assertFalse(details["body_truncated"])
                self.assertEqual(details["body_parse_status"], state)
                self.assertNotIn("private-body", diagnostic)

    def test_rendered_traceback_omits_original_reason_url_body_and_headers(self):
        with tempfile.TemporaryDirectory() as directory:
            root = self.configured_root(directory)
            headers = Message()
            headers["CF-Ray"] = "private-ray-secret"
            headers["Content-Type"] = "private-type-secret"
            error = HTTPError("https://invalid.example/?secret=private-url-secret", 403,
                              "private-reason-secret\n::error::injected", headers,
                              io.BytesIO(b'{"message":"private-body-secret"}'))
            opener = MagicMock()
            opener.open.side_effect = error
            with patch("sys.argv", ["configure_measurement.py", "--root", str(root)]), \
                    patch("scripts.configure_measurement.build_opener", return_value=opener):
                try:
                    main()
                except ValueError as failure:
                    rendered = "".join(traceback.format_exception(failure))
                else:
                    self.fail("HTTP failure unexpectedly activated the frontend")
            for secret in ("private-url-secret", "private-reason-secret", "private-body-secret",
                           "private-ray-secret", "private-type-secret", "::error::injected"):
                self.assertNotIn(secret, rendered)
            self.assertIn('"status": 403', rendered)
            self.assertNotIn("urllib.error.HTTPError:", rendered)
            self.assertFalse((root / "docs/assets/javascripts/measurement-config.js").exists())
            opener.open.assert_called_once()

    def test_verified_health_still_activates_frontend(self):
        with tempfile.TemporaryDirectory() as directory:
            root = self.configured_root(directory)
            response = MagicMock()
            response.status = 200
            response.headers = Message()
            response.headers["Content-Type"] = "application/json"
            response.read.return_value = json.dumps(HEALTH).encode()
            opener = MagicMock()
            opener.open.return_value.__enter__.return_value = response
            with patch("sys.argv", ["configure_measurement.py", "--root", str(root)]), \
                    patch("scripts.configure_measurement.build_opener", return_value=opener), \
                    patch("builtins.print"):
                main()
            config = (root / "docs/assets/javascripts/measurement-config.js").read_text()
            self.assertIn('"approved":true', config)
            self.assertIn('"endpoint":"/_s5/measurement/events"', config)
            opener.open.assert_called_once()

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

