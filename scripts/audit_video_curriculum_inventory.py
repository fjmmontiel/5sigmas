#!/usr/bin/env python3
"""Owner-amendment aware facade for the canonical video-curriculum inventory.

The global inventory remains fail-closed for unfinished later series and keeps
legacy voice/accessibility debt visible. Security requalification evaluates the
current non-voice visual contract separately, as required by owner amendment
5716685049.

The persisted inventory continues to expose whole-program unfinished debt. The
process exit code, however, represents the active ``seguridad-ia`` gate so a
fresh series audit can close the current series without pretending that later
series are already complete.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import audit_video_curriculum_inventory_legacy as legacy
from audit_video_curriculum_inventory_legacy import *  # noqa: F401,F403 - compatibility
from audit_series_experience import DEFERRED_VOICE_CODES, audit
from audit_video_curriculum_expectation import validate_video_expectation

OWNER_AMENDMENT = 5716685049
SECURITY_PREFIX = "series/seguridad-ia/"


def _security_gate(report: dict, inventory: dict) -> dict:
    blockers: list[dict] = []
    records = [
        item for item in inventory.get("obligations", [])
        if isinstance(item, dict) and str(item.get("route") or "").startswith(SECURITY_PREFIX)
    ]
    expected_obligations = 12
    if len(records) != expected_obligations:
        blockers.append(
            {
                "code": "SECURITY_VIDEO_OBLIGATION_COUNT_MISMATCH",
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
        if not route.startswith(SECURITY_PREFIX):
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
        "series": "seguridad-ia",
        "status": "PASS" if not blockers else "FAIL",
        "locale_video_obligations": len(records),
        "curriculum_h2_obligations": total_h2,
        "mapped_to_curated_key_moment": mapped_h2,
        "blockers": blockers,
        "voice_enhancement": "DEFERRED_OWNER_LOCAL",
        "media_visual_and_voice_are_separate": True,
    }


def _current_gate_exit_code(current: dict) -> int:
    """Return the active-series result while preserving global inventory debt."""
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
        print("VIDEO_CURRICULUM_INVENTORY_SELF_TEST_PASS")
        return 0

    root = args.root.resolve()
    scope_path = args.scope if args.scope.is_absolute() else root / args.scope
    output = args.output if args.output.is_absolute() else root / args.output
    try:
        scope = json.loads(scope_path.read_text(encoding="utf-8"))
        expectation = validate_video_expectation(scope)
        report = audit(root, scope)
        inventory = legacy.build_inventory(report, expectation)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"VIDEO_CURRICULUM_INVENTORY_ERROR: {exc}")
        return 2

    current = _security_gate(report, inventory)
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
        f"OWNER_CURRENT_SECURITY_GATE={current['status']}; "
        f"VOICE_ENHANCEMENT=DEFERRED_OWNER_LOCAL; DIAGNOSTIC_SCOPE={diagnostic_scope}"
    )
    if inventory["status"] == "FAIL_CLOSED":
        print("GLOBAL_FUTURE_SERIES_VIDEO_DEBT=PRESERVED; not treated as an active seguridad-ia blocker")
    return _current_gate_exit_code(current)


if __name__ == "__main__":
    raise SystemExit(main())
