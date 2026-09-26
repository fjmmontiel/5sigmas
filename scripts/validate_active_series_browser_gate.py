#!/usr/bin/env python3
"""Reconcile the full-catalogue browser diagnostic into an active-series gate.

The global browser report remains authoritative diagnostic debt for the whole
post-Datacenters catalogue. This helper only decides whether the CURRENT series
has browser blockers, so unfinished future series cannot prevent certification
of an earlier series. It does not remove findings from the global report.

A narrow exception exists for Chromium `net::ERR_ABORTED` media requests caused
by the audit's own verified pause/seek lifecycle. The exception is accepted only
when the aborted request is the exact article-local MP4 and the same result also
proves range delivery, decoded metadata, playback start, seek, and pause.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from urllib.parse import urlparse

OWNER_AMENDMENT = 5716685049
INDEXABILITY_AMENDMENT = 5727362172
EXPECTED_WIDTHS = {390, 1440}
EXPECTED_MOTIONS = {"no-preference", "reduce"}
EXPECTED_ABORT_PHASES = {"interaction-playback", "pixel-capture", "settle"}


def route_is_series(route: str, series: str) -> bool:
    return f"/series/{series}/" in route


def expected_media_path(route: str) -> str:
    return route.rstrip("/") + ".mp4"


def media_lifecycle_proves_audit_owned_abort(result: dict, error: dict) -> bool:
    if error.get("code") != "REQUEST_FAILED":
        return False
    if "ERR_ABORTED" not in str(error.get("detail", "")).upper():
        return False
    if error.get("resourceType") != "media" or bool(error.get("navigation")):
        return False
    if error.get("phase") not in EXPECTED_ABORT_PHASES:
        return False

    route = str(result.get("route", ""))
    error_path = urlparse(str(error.get("url", ""))).path
    if error_path != expected_media_path(route):
        return False

    media = result.get("media") or {}
    range_status = media.get("range_status")
    duration = media.get("duration")
    width = media.get("videoWidth")
    height = media.get("videoHeight")
    return (
        range_status in {200, 206}
        and isinstance(duration, (int, float))
        and duration > 0
        and isinstance(width, (int, float))
        and width > 0
        and isinstance(height, (int, float))
        and height > 0
        and media.get("play_started") is True
        and media.get("seeked") is True
        and media.get("paused_after") is True
    )


def classify_result(result: dict) -> tuple[list[dict], list[dict]]:
    blockers: list[dict] = []
    expected: list[dict] = []
    for error in result.get("errors") or []:
        if media_lifecycle_proves_audit_owned_abort(result, error):
            expected.append({**error, "classification": "EXPECTED_AUDIT_OWNED_MEDIA_CHURN"})
        else:
            blockers.append(error)
    return blockers, expected


def build_gate(report: dict, series: str) -> dict:
    results = [
        result
        for result in report.get("results") or []
        if route_is_series(str(result.get("route", "")), series)
    ]
    if not results:
        raise ValueError(f"No browser results found for active series {series!r}")

    pairs: dict[tuple[str, str], set[tuple[int, str]]] = {}
    blockers: list[dict] = []
    expected_aborts: list[dict] = []
    for result in results:
        route = str(result.get("route", ""))
        locale = str(result.get("locale", ""))
        width = result.get("width")
        motion = str(result.get("motion", ""))
        pairs.setdefault((route, locale), set()).add((width, motion))
        result_blockers, result_expected = classify_result(result)
        for blocker in result_blockers:
            blockers.append(
                {
                    "route": route,
                    "locale": locale,
                    "width": width,
                    "motion": motion,
                    **blocker,
                }
            )
        for item in result_expected:
            expected_aborts.append(
                {
                    "route": route,
                    "locale": locale,
                    "width": width,
                    "motion": motion,
                    **item,
                }
            )

    expected_contexts = {(width, motion) for width in EXPECTED_WIDTHS for motion in EXPECTED_MOTIONS}
    coverage_gaps = []
    for (route, locale), actual in sorted(pairs.items()):
        missing = sorted(expected_contexts - actual)
        extra = sorted(actual - expected_contexts)
        if missing or extra:
            coverage_gaps.append(
                {
                    "route": route,
                    "locale": locale,
                    "missing": missing,
                    "extra": extra,
                }
            )

    expected_result_count = len(pairs) * len(expected_contexts)
    if len(results) != expected_result_count:
        coverage_gaps.append(
            {
                "code": "ACTIVE_SERIES_CONTEXT_COUNT_MISMATCH",
                "actual": len(results),
                "expected": expected_result_count,
            }
        )

    status = "PASS" if not blockers and not coverage_gaps else "FAIL"
    return {
        "schema_version": 1,
        "owner_amendment_comment": OWNER_AMENDMENT,
        "indexability_amendment_comment": INDEXABILITY_AMENDMENT,
        "series": series,
        "status": status,
        "route_locale_pairs": len(pairs),
        "contexts": len(results),
        "expected_contexts": expected_result_count,
        "coverage_gaps": coverage_gaps,
        "blockers": blockers,
        "expected_audit_owned_media_aborts": expected_aborts,
        "global_browser_findings_preserved": report.get("findings", {}),
        "global_browser_contexts": report.get("contexts"),
        "global_browser_expected_contexts": report.get("expected_contexts"),
        "meaning": (
            "Active-series browser gate only. Global catalogue findings remain in the original "
            "browser-report.json and are not whitened. ERR_ABORTED is tolerated only for the exact "
            "article MP4 after the same context proves range delivery, decoded metadata, playback, "
            "seek and pause; every other request/resource/runtime/browser finding remains blocking."
        ),
    }


def run_self_test() -> None:
    base = {
        "route": "/series/seguridad-ia/02-jailbreaks/",
        "locale": "es",
        "width": 1440,
        "motion": "no-preference",
        "media": {
            "range_status": 206,
            "duration": 60.0,
            "videoWidth": 1920,
            "videoHeight": 1080,
            "play_started": True,
            "seeked": True,
            "paused_after": True,
        },
    }
    expected_abort = {
        "code": "REQUEST_FAILED",
        "url": "http://127.0.0.1:8000/series/seguridad-ia/02-jailbreaks.mp4",
        "detail": "net::ERR_ABORTED",
        "phase": "interaction-playback",
        "resourceType": "media",
        "navigation": False,
    }
    assert media_lifecycle_proves_audit_owned_abort(base, expected_abort)

    wrong_url = {**expected_abort, "url": "http://127.0.0.1:8000/series/other/video.mp4"}
    assert not media_lifecycle_proves_audit_owned_abort(base, wrong_url)

    wrong_phase = {**expected_abort, "phase": "lazy-traversal"}
    assert not media_lifecycle_proves_audit_owned_abort(base, wrong_phase)

    non_abort = {**expected_abort, "detail": "net::ERR_FAILED"}
    assert not media_lifecycle_proves_audit_owned_abort(base, non_abort)

    bad_lifecycle = {**base, "media": {**base["media"], "seeked": False}}
    assert not media_lifecycle_proves_audit_owned_abort(bad_lifecycle, expected_abort)

    results = []
    for width in EXPECTED_WIDTHS:
        for motion in EXPECTED_MOTIONS:
            results.append({**base, "width": width, "motion": motion, "errors": [expected_abort]})
    gate = build_gate({"results": results, "findings": {"REQUEST_FAILED": 4}}, "seguridad-ia")
    assert gate["status"] == "PASS"
    assert len(gate["expected_audit_owned_media_aborts"]) == 4

    fatal_results = json.loads(json.dumps(results))
    fatal_results[0]["errors"].append({"code": "PAGE_OVERFLOW"})
    fatal_gate = build_gate({"results": fatal_results, "findings": {}}, "seguridad-ia")
    assert fatal_gate["status"] == "FAIL"
    assert fatal_gate["blockers"][0]["code"] == "PAGE_OVERFLOW"

    print("ACTIVE_SERIES_BROWSER_GATE_SELF_TEST=PASS")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--report", default="artifacts/series-experience/browser-report.json")
    parser.add_argument("--series", default="seguridad-ia")
    parser.add_argument("--output", default="artifacts/series-experience/active-series-browser-gate.json")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    if args.self_test:
        run_self_test()
        return 0

    report_path = Path(args.report)
    if not report_path.exists():
        raise SystemExit(f"browser report missing: {report_path}")
    report = json.loads(report_path.read_text(encoding="utf-8"))
    gate = build_gate(report, args.series)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(gate, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(
        "ACTIVE_SERIES_BROWSER_GATE "
        + json.dumps(
            {
                "series": gate["series"],
                "status": gate["status"],
                "route_locale_pairs": gate["route_locale_pairs"],
                "contexts": gate["contexts"],
                "blocker_count": len(gate["blockers"]),
                "coverage_gap_count": len(gate["coverage_gaps"]),
                "expected_audit_owned_media_abort_count": len(
                    gate["expected_audit_owned_media_aborts"]
                ),
                "global_browser_findings_preserved": gate[
                    "global_browser_findings_preserved"
                ],
            },
            sort_keys=True,
        )
    )
    return 0 if gate["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
