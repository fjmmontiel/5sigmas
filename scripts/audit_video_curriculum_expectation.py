#!/usr/bin/env python3
"""Fail-closed contract for expected video coverage in the post-Datacenters scope.

This deliberately answers a different question from media integrity: which
curriculum routes are expected to have native video at all?  The owner contract
requires video for every target article in both ES and EN.  Therefore absence in
both locales is two missing requirements, never parity and never an opt-out.

The policy lives in ``quality/series-requalification/scope.json`` so future
changes to video rendering or frontmatter discovery cannot silently redefine the
curriculum requirement.  Binary/media correctness remains the responsibility of
the existing source/browser/media gates.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


EXPECTED_LOCALES = ["es", "en"]


def validate_video_expectation(scope: dict[str, Any]) -> dict[str, Any]:
    """Validate and summarize the canonical expected-video curriculum policy."""
    series = scope.get("series")
    if not isinstance(series, dict) or not series:
        raise ValueError("scope.series must be a non-empty mapping")

    routes: list[str] = []
    for slug, names in series.items():
        if not isinstance(slug, str) or not slug or not isinstance(names, list) or not names:
            raise ValueError("every target series must contain a non-empty route list")
        for name in names:
            if not isinstance(name, str) or not name.endswith(".md"):
                raise ValueError(f"invalid target route in {slug!r}: {name!r}")
            routes.append(f"series/{slug}/{name}")
    if len(set(routes)) != len(routes):
        raise ValueError("target curriculum routes must be unique")

    policy = scope.get("media_policy")
    if not isinstance(policy, dict):
        raise ValueError("scope.media_policy is required")
    if policy.get("video_required_for_every_target_route") is not True:
        raise ValueError("media_policy.video_required_for_every_target_route must be true")
    if policy.get("native_video_required_per_locale") is not True:
        raise ValueError("media_policy.native_video_required_per_locale must be true")
    if policy.get("video_opt_out_allowed") is not False:
        raise ValueError("media_policy.video_opt_out_allowed must be false")
    if policy.get("required_locales") != EXPECTED_LOCALES:
        raise ValueError(f"media_policy.required_locales must be exactly {EXPECTED_LOCALES!r}")

    return {
        "policy": "ALL_TARGET_ROUTES_NATIVE_PER_LOCALE_NO_OPT_OUT",
        "target_routes": len(routes),
        "required_locales": EXPECTED_LOCALES,
        "expected_locale_pages_with_video": len(routes) * len(EXPECTED_LOCALES),
        "routes": routes,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--scope",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "quality/series-requalification/scope.json",
    )
    args = parser.parse_args()
    try:
        scope = json.loads(args.scope.read_text(encoding="utf-8"))
        result = validate_video_expectation(scope)
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        print(f"VIDEO_CURRICULUM_EXPECTATION_FAIL: {exc}")
        return 1
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
