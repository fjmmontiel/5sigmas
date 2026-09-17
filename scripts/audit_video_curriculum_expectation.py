#!/usr/bin/env python3
"""Fail-closed contract for expected video coverage in the post-Datacenters scope.

This deliberately answers a different question from media integrity: which
curriculum routes are expected to have native video at all? The owner contract
requires video for every target article in both ES and EN. Therefore absence in
both locales is two missing requirements, never parity and never an opt-out.

The policy lives in ``quality/series-requalification/scope.json`` so future
changes to video rendering or frontmatter discovery cannot silently redefine the
curriculum requirement. Binary/media correctness remains the responsibility of
the existing source/browser/media gates.

In addition to aggregate counts, the gate emits one stable obligation per
(route, locale). This makes the 84 expected native-video requirements independently
addressable and prevents an aggregate count from hiding a missing locale or route.
The obligation ledger expresses requirements only; it never claims that media is
present or valid.
"""
from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
from typing import Any


EXPECTED_LOCALES = ["es", "en"]


def _expected_obligations(routes: list[str]) -> list[dict[str, Any]]:
    obligations: list[dict[str, Any]] = []
    for route in routes:
        series_slug = route.split("/", 2)[1]
        for locale in EXPECTED_LOCALES:
            obligations.append(
                {
                    "obligation_id": f"{locale}:{route}",
                    "series": series_slug,
                    "route": route,
                    "locale": locale,
                    "video_required": True,
                    "native_locale_required": True,
                    "declaration_or_media_pass": "NOT_ASSERTED_BY_EXPECTATION_GATE",
                }
            )
    return obligations


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

    obligations = _expected_obligations(routes)
    expected_total = len(routes) * len(EXPECTED_LOCALES)
    if len(obligations) != expected_total:
        raise ValueError("expected-video obligation ledger size drift")
    obligation_ids = [item["obligation_id"] for item in obligations]
    if len(set(obligation_ids)) != expected_total:
        raise ValueError("expected-video obligation IDs must be unique")
    pairs = {(item["route"], item["locale"]) for item in obligations}
    expected_pairs = {(route, locale) for route in routes for locale in EXPECTED_LOCALES}
    if pairs != expected_pairs:
        raise ValueError("expected-video route/locale obligation matrix is incomplete")

    by_series = Counter(item["series"] for item in obligations)
    expected_by_series = {slug: len(names) * len(EXPECTED_LOCALES) for slug, names in series.items()}
    if dict(by_series) != expected_by_series:
        raise ValueError("expected-video per-series obligation counts drifted")

    return {
        "policy": "ALL_TARGET_ROUTES_NATIVE_PER_LOCALE_NO_OPT_OUT",
        "obligation_schema": 1,
        "target_routes": len(routes),
        "required_locales": EXPECTED_LOCALES,
        "expected_locale_pages_with_video": expected_total,
        "expected_by_series": expected_by_series,
        "routes": routes,
        "obligations": obligations,
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
