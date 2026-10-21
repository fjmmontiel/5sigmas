#!/usr/bin/env python3
"""Enable the browser only after the approved deployment's storage is live."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from urllib.request import HTTPRedirectHandler, Request, build_opener


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
        with build_opener(NoRedirect).open(request, timeout=15) as response:
            if response.status != 200 or response.headers.get_content_type() != "application/json":
                raise ValueError("Collector health response is invalid")
            body = response.read(8193)
            if len(body) > 8192:
                raise ValueError("Collector health response is excessive")
            health = json.loads(body)
    config = browser_config(policy, health)
    target = args.root / "docs/assets/javascripts/measurement-config.js"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text("// Generated only after deployment readiness is verified.\nwindow.__S5_MEASUREMENT__ = Object.freeze(" + json.dumps(config, separators=(",", ":")) + ");\n", encoding="utf-8")
    print("Measurement frontend: enabled after live storage verification" if config["approved"] else "Measurement frontend: disabled")


if __name__ == "__main__":
    main()
