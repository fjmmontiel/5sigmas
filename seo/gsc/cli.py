from __future__ import annotations

import argparse
import json
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from .client import GSCClient, GSCError
from .engine import build_report, load_json, render_markdown


MADRID_TZ = ZoneInfo("Europe/Madrid")
ALLOWED_PERMISSION_LEVELS = {"siteFullUser", "siteOwner"}


def _resolve_mode(mode: str) -> str:
    if mode != "auto":
        return mode
    return "full" if datetime.now(MADRID_TZ).hour < 13 else "delta"


def _assert_site_access(client: GSCClient) -> str:
    entries = client.list_sites().get("siteEntry", []) or []
    match = next((item for item in entries if item.get("siteUrl") == client.site_url), None)
    if match is None:
        raise GSCError(
            f"Service account cannot see Search Console property {client.site_url!r}. "
            "Add its client_email to that exact property in Search Console."
        )
    permission = match.get("permissionLevel") or "unknown"
    if permission not in ALLOWED_PERMISSION_LEVELS:
        raise GSCError(
            f"Search Console permission {permission!r} is insufficient for the configured "
            "Search Analytics + URL Inspection contract; grant Full user access."
        )
    return permission


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Direct Google Search Console growth data for 5sigmas.")
    sub = parser.add_subparsers(dest="command", required=True)

    run = sub.add_parser("run", help="Build a full or delta growth report.")
    run.add_argument("--mode", choices=["full", "delta", "auto"], default="auto")
    run.add_argument("--site-url", default="sc-domain:5sigmas.com")
    run.add_argument("--experiments", default="seo/gsc/experiments.json")
    run.add_argument("--tracked", default="seo/gsc/tracked_urls.json")
    run.add_argument("--output-dir", default="seo-gsc-output")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.command != "run":
        raise AssertionError(f"Unsupported command: {args.command}")

    mode = _resolve_mode(args.mode)
    experiments = load_json(args.experiments)
    tracked = load_json(args.tracked)
    client = GSCClient(args.site_url)
    permission_level = _assert_site_access(client)
    report = build_report(
        client,
        mode=mode,
        experiments=experiments,
        tracked=tracked,
        now=datetime.now(MADRID_TZ),
    )
    report["auth"] = {
        "principal_type": "service_account",
        "permission_level": permission_level,
        "oauth_scope": "https://www.googleapis.com/auth/webmasters.readonly",
    }
    markdown = render_markdown(report)

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "report.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    (output_dir / "report.md").write_text(markdown, encoding="utf-8")
    print(markdown)
    return 0
