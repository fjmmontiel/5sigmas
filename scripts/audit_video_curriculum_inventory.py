#!/usr/bin/env python3
"""Owner-amendment aware facade for the canonical video-curriculum inventory.

The persisted inventory always preserves whole-program unfinished debt. The
process exit code, however, represents the series currently owned by the GOLDEN
program. VOICE-dependent audio/captions/transcript debt is non-blocking under
owner amendment 5716685049; native visual video and non-voice curriculum mapping
remain fail-closed.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import audit_video_curriculum_inventory_legacy as legacy
from audit_series_experience import DEFERRED_VOICE_CODES, audit
from audit_video_curriculum_expectation import validate_video_expectation
from audit_video_curriculum_inventory_legacy import *  # noqa: F401,F403 - compatibility

OWNER_AMENDMENT = 5716685049


def _active_series(root: Path) -> str:
    state = legacy.load_yaml(root / "quality/series-requalification/program-state.yml")
    series = str(state.get("active_series") or "").strip()
    if not series:
        raise ValueError("program-state.yml does not define active_series")
    return series


def _active_gate(report: dict, inventory: dict, scope: dict, active_series: str) -> dict:
    blockers: list[dict] = []
    prefix = f"series/{active_series}/"
    records = [
        item for item in inventory.get("obligations", [])
        if isinstance(item, dict) and str(item.get("route") or "").startswith(prefix)
    ]
    configured = scope.get("series", {}).get(active_series, []) if isinstance(scope.get("series"), dict) else []
    locales = scope.get("media_policy", {}).get("required_locales", ["es", "en"])
    expected_obligations = len(configured) * len(locales)
    if len(records) != expected_obligations:
        blockers.append(
            {
                "code": "ACTIVE_VIDEO_OBLIGATION_COUNT_MISMATCH",
                "series": active_series,
                "expected": expected_obligations,
                "actual": len(records),
            }
        )

    mapped_h2 = 0
    total_h2 = 0
    for record in records:
        route = str(record.get("route") or "")
        locale = str(record.get("locale") or "")
        for section in record.get("section_obligations", []):
            if not isinstance(section, dict):
                blockers.append({"route": route, "locale": locale, "code": "INVALID_H2_OBLIGATION"})
                continue
            total_h2 += 1
            if section.get("state") == "MAPPED_TO_CURATED_KEY_MOMENT":
                mapped_h2 += 1
            else:
                blockers.append(
                    {
                        "route": route,
                        "locale": locale,
                        "code": str(section.get("state") or "H2_MAPPING_NOT_PASS"),
                        "section": section.get("section"),
                    }
                )

    for page in report.get("pages", []):
        if not isinstance(page, dict):
            continue
        source = str(page.get("source") or "")
        route = source.removeprefix("docs/").removeprefix("locales/en/")
        if not route.startswith(prefix):
            continue
        locale = str(page.get("locale") or "")
        for finding in page.get("findings", []):
            if not isinstance(finding, dict) or not finding.get("code"):
                continue
            code = str(finding["code"])
            if code in DEFERRED_VOICE_CODES:
                continue
            if code.startswith("VIDEO_"):
                blockers.append({"route": route, "locale": locale, **finding})

    return {
        "owner_amendment_comment": OWNER_AMENDMENT,
        "series": active_series,
        "status": "PASS" if not blockers else "FAIL",
        "locale_video_obligations": len(records),
        "expected_locale_video_obligations": expected_obligations,
        "curriculum_h2_obligations": total_h2,
        "mapped_to_curated_key_moment": mapped_h2,
        "blockers": blockers,
        "voice_enhancement": "DEFERRED_OWNER_LOCAL",
        "media_visual_and_voice_are_separate": True,
    }


def _current_gate_exit_code(current: dict) -> int:
    return 0 if isinstance(current, dict) and current.get("status") == "PASS" else 1


def _diagnostic_scope(root: Path) -> str:
    path = root / "quality/series-requalification/audit-request.json"
    if not path.is_file():
        return "full"
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return "full"
    return str(data.get("diagnostic_scope") or "full")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--scope", type=Path, default=Path("quality/series-requalification/scope.json"))
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("artifacts/series-experience/video-curriculum-inventory.json"),
    )
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        legacy._self_test()
        assert _current_gate_exit_code({"status": "PASS"}) == 0
        assert _current_gate_exit_code({"status": "FAIL"}) == 1
        fixture_scope = {
            "media_policy": {"required_locales": ["es", "en"]},
            "series": {"x": ["01.md", "02.md"]},
        }
        fixture_inventory = {"obligations": []}
        fixture_report = {"pages": []}
        fixture = _active_gate(fixture_report, fixture_inventory, fixture_scope, "x")
        assert fixture["expected_locale_video_obligations"] == 4
        assert fixture["status"] == "FAIL"
        print("VIDEO_CURRICULUM_INVENTORY_SELF_TEST_PASS")
        return 0

    root = args.root.resolve()
    scope_path = args.scope if args.scope.is_absolute() else root / args.scope
    output = args.output if args.output.is_absolute() else root / args.output
    try:
        scope = json.loads(scope_path.read_text(encoding="utf-8"))
        active_series = _active_series(root)
        expectation = validate_video_expectation(scope)
        report = audit(root, scope)
        inventory = legacy.build_inventory(report, expectation)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"VIDEO_CURRICULUM_INVENTORY_ERROR: {exc}")
        return 2

    current = _active_gate(report, inventory, scope, active_series)
    inventory["owner_current_gate"] = current
    inventory["voice_enhancement"] = {
        "state": "DEFERRED_OWNER_LOCAL",
        "blocker": False,
        "owner_amendment_comment": OWNER_AMENDMENT,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(inventory, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(inventory["summary"], ensure_ascii=False, indent=2))
    print(json.dumps({"owner_current_gate": current}, ensure_ascii=False, indent=2))
    diagnostic_scope = _diagnostic_scope(root)
    print(
        f"GOLDEN=NOT_CERTIFIED; GLOBAL_STATUS={inventory['status']}; "
        f"OWNER_CURRENT_SERIES={active_series}; OWNER_CURRENT_GATE={current['status']}; "
        f"VOICE_ENHANCEMENT=DEFERRED_OWNER_LOCAL; DIAGNOSTIC_SCOPE={diagnostic_scope}"
    )
    if inventory["status"] == "FAIL_CLOSED":
        print("GLOBAL_FUTURE_SERIES_VIDEO_DEBT=PRESERVED; unrelated future debt does not replace the active-series result")
    return _current_gate_exit_code(current)


if __name__ == "__main__":
    raise SystemExit(main())
