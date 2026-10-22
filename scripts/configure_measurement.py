#!/usr/bin/env python3
"""Enable the browser only after the approved deployment's storage is live."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
from urllib.error import HTTPError
from urllib.request import HTTPRedirectHandler, Request, build_opener


MAX_ERROR_BODY_BYTES = 2048
APPLICATION_ERROR_CODES = ("origin_refused", "credentials_refused", "privacy_preference")


def health_http_error(error: HTTPError) -> str:
    """Classify bounded HTTP evidence without emitting provider-controlled text."""
    headers = {}
    if error.headers:
        content_type = error.headers.get("Content-Type")
        if isinstance(content_type, str) and len(content_type) <= 512:
            media_type = content_type.split(";", 1)[0].strip().lower()
            if media_type in ("application/json", "text/html", "text/plain"):
                headers["Content-Type"] = media_type
        ray = error.headers.get("CF-Ray")
        if isinstance(ray, str) and re.fullmatch(r"[0-9a-fA-F]{16}-[A-Z]{3}", ray):
            headers["CF-Ray"] = ray[:16].lower() + ray[16:]
        if error.headers.get("CF-Mitigated") == "challenge":
            headers["CF-Mitigated"] = "challenge"
    details = {"headers": headers, "body_read_status": "not_attempted", "body_parse_status": "not_attempted"}
    if type(error.code) is int and 100 <= error.code <= 599:
        details["status"] = error.code
    try:
        body = error.read(MAX_ERROR_BODY_BYTES + 1)
        details["body_read_status"] = "ok"
        details["body_bytes_observed"] = len(body)
        details["body_truncated"] = len(body) > MAX_ERROR_BODY_BYTES
    except Exception:
        # Neither a read exception's message nor its type is safe diagnostic text.
        details["body_read_status"] = "failed"
    else:
        if details["body_truncated"]:
            details["body_parse_status"] = "skipped_truncated"
        else:
            try:
                payload = json.loads(body.decode("utf-8"))
            except UnicodeDecodeError:
                details["body_parse_status"] = "invalid_encoding"
            except (ValueError, RecursionError):
                details["body_parse_status"] = "invalid_json"
            else:
                details["body_parse_status"] = "json_object" if isinstance(payload, dict) else "json_other"
                if isinstance(payload, dict):
                    code = payload.get("error_code")
                    if type(code) is int and 0 <= code <= 2**31 - 1:
                        details["error_code"] = code
                        if code == 1010:
                            details["reason_label"] = "browser_signature_banned"
                    app_error = payload.get("error")
                    if isinstance(app_error, str) and app_error in APPLICATION_ERROR_CODES:
                        details["application_error"] = app_error
    return "Collector health HTTP failure: " + json.dumps(details, ensure_ascii=True)


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def browser_config(policy: dict, health: dict | None) -> dict:
    if policy.get("enabled") is not True:
        return {"endpoint": "", "approved": False, "policyRevision": "2026-10-18"}
    expected = {
        "site_origin": "https://5sigmas.com", "endpoint": "/_s5/measurement/events",
        "policy_revision": "2026-10-18", "consent_mode": "explicit_opt_in",
        "retention_days": 90, "session_metadata_retention_hours": 48, "storage_jurisdiction": "eu",
    }
    if any(policy.get(key) != value for key, value in expected.items()):
        raise ValueError("Unexpected measurement deployment policy")
    required = {"ok": True, "service": "5sigmas-measurement", "schema_version": 1,
                "policy_revision": policy["policy_revision"], "consent_mode": "explicit_opt_in",
                "retention_days": 90, "storage": "ready"}
    if not isinstance(health, dict) or any(health.get(key) != value for key, value in required.items()):
        raise ValueError("Collector storage and matching consent policy are not verified live")
    return {"endpoint": policy["endpoint"], "approved": True, "policyRevision": policy["policy_revision"]}


def validate_worker_policy(root: Path, policy: dict) -> None:
    worker = json.loads((root / "mcp-worker/wrangler.jsonc").read_text(encoding="utf-8"))
    variables = worker.get("vars", {})
    if variables.get("MEASUREMENT_ENABLED") != str(policy.get("enabled")).lower():
        raise ValueError("Worker/browser measurement enable flags disagree")
    if variables.get("MEASUREMENT_POLICY_REVISION") != policy.get("policy_revision"):
        raise ValueError("Worker/browser policy revisions disagree")
    expected = {"ok": True, "service": "5sigmas-measurement", "schema_version": 1,
                "policy_revision": "2026-10-18", "consent_mode": "explicit_opt_in", "retention_days": 90, "storage": "ready"}
    browser_config(policy, expected)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--validate-only", action="store_true", help="Validate policy parity without network or activation")
    args = parser.parse_args()
    policy = json.loads((args.root / "measurement-deployment.json").read_text(encoding="utf-8"))
    validate_worker_policy(args.root, policy)
    if args.validate_only:
        print("Measurement deployment policy: valid")
        return
    health = None
    if policy.get("enabled") is True:
        request = Request("https://5sigmas.com/_s5/measurement/health", headers={"Accept": "application/json"})
        try:
            with build_opener(NoRedirect).open(request, timeout=15) as response:
                if response.status != 200 or response.headers.get_content_type() != "application/json":
                    raise ValueError("Collector health response is invalid")
                body = response.read(8193)
                if len(body) > 8192:
                    raise ValueError("Collector health response is excessive")
                health = json.loads(body)
        except HTTPError as error:
            # HTTPError's reason and URL may contain provider-controlled text.
            # Keep the sanitized failure terminal without rendering that context.
            raise ValueError(health_http_error(error)) from None
    config = browser_config(policy, health)
    target = args.root / "docs/assets/javascripts/measurement-config.js"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text("// Generated only after deployment readiness is verified.\nwindow.__S5_MEASUREMENT__ = Object.freeze(" + json.dumps(config, separators=(",", ":")) + ");\n", encoding="utf-8")
    print("Measurement frontend: enabled after live storage verification" if config["approved"] else "Measurement frontend: disabled")


if __name__ == "__main__":
    main()

