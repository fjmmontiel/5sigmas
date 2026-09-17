#!/usr/bin/env python3
"""Join expected native-video obligations with current source/H2 media state.

This is a fail-closed inventory gate, not a GOLDEN certificate. It keeps one
record for every canonical (route, locale) obligation and one child record for
every locale-native H2. Missing video does not erase section obligations: those
sections remain explicit and blocked. The gate never invents key moments,
timestamps, captions, transcripts, narration, or media completeness.
"""
from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
from typing import Any


def _canonical_route_from_source(source: str) -> str:
    for prefix in ("docs/", "locales/en/"):
        if source.startswith(prefix):
            return source[len(prefix):]
    raise ValueError(f"unexpected audited source path: {source!r}")


def build_inventory(report: dict[str, Any], expectation: dict[str, Any]) -> dict[str, Any]:
    """Build an explicit required→current-state→H2/key-moment obligation ledger."""
    pages = report.get("pages")
    obligations = expectation.get("obligations")
    if not isinstance(pages, list) or not isinstance(obligations, list):
        raise ValueError("audit report pages and expectation obligations are required")

    page_index: dict[tuple[str, str], dict[str, Any]] = {}
    for page in pages:
        if not isinstance(page, dict):
            raise ValueError("audit report page must be an object")
        locale = str(page.get("locale") or "")
        source = str(page.get("source") or "")
        route = _canonical_route_from_source(source)
        key = (route, locale)
        if key in page_index:
            raise ValueError(f"duplicate audited route/locale: {key!r}")
        page_index[key] = page

    records: list[dict[str, Any]] = []
    missing_audited_pages: list[str] = []
    state_counts: Counter[str] = Counter()
    h2_state_counts: Counter[str] = Counter()
    declared_page_h2 = 0
    undeclared_page_h2 = 0

    for obligation in obligations:
        if not isinstance(obligation, dict):
            raise ValueError("expectation obligation must be an object")
        route = str(obligation.get("route") or "")
        locale = str(obligation.get("locale") or "")
        obligation_id = str(obligation.get("obligation_id") or "")
        page = page_index.get((route, locale))
        if page is None:
            missing_audited_pages.append(obligation_id or f"{locale}:{route}")
            records.append(
                {
                    **obligation,
                    "current_state": "AUDITED_PAGE_MISSING",
                    "source_findings": ["AUDITED_PAGE_MISSING"],
                    "curriculum_sections": [],
                    "section_obligations": [],
                }
            )
            state_counts["AUDITED_PAGE_MISSING"] += 1
            continue

        video = page.get("video") if isinstance(page.get("video"), dict) else {}
        declared = bool(str(video.get("video") or "").strip())
        findings = [
            str(item.get("code"))
            for item in page.get("findings", [])
            if isinstance(item, dict) and item.get("code")
        ]
        video_findings = sorted({code for code in findings if code.startswith("VIDEO_")})
        sections = [str(section) for section in page.get("sections", [])]
        chapters = {
            str(chapter.get("name") or "").strip()
            for chapter in video.get("video_chapters", [])
            if isinstance(chapter, dict) and str(chapter.get("name") or "").strip()
        }
        mapping = {
            str(item.get("section") or "").strip(): str(item.get("key_moment") or "").strip()
            for item in video.get("video_section_map", [])
            if isinstance(item, dict)
            and str(item.get("section") or "").strip()
            and str(item.get("key_moment") or "").strip()
        }

        if not declared:
            current_state = "VIDEO_REQUIRED_UNDECLARED"
            undeclared_page_h2 += len(sections)
        elif video_findings:
            current_state = "VIDEO_DECLARED_SOURCE_CONTRACT_INCOMPLETE"
            declared_page_h2 += len(sections)
        else:
            current_state = "VIDEO_DECLARED_SOURCE_CONTRACT_COMPLETE_BINARY_EDITORIAL_PENDING"
            declared_page_h2 += len(sections)
        state_counts[current_state] += 1

        section_obligations: list[dict[str, Any]] = []
        for section in sections:
            key_moment = mapping.get(section)
            if not declared:
                section_state = "BLOCKED_VIDEO_UNDECLARED"
                key_moment = None
            elif not chapters:
                section_state = "BLOCKED_CURATED_KEY_MOMENTS_MISSING"
                key_moment = None
            elif key_moment is None:
                section_state = "BLOCKED_SECTION_MAPPING_MISSING_OR_INVALID"
            elif key_moment not in chapters:
                section_state = "BLOCKED_SECTION_MAPPING_MISSING_OR_INVALID"
            else:
                section_state = "MAPPED_TO_CURATED_KEY_MOMENT"
            h2_state_counts[section_state] += 1
            section_obligations.append(
                {
                    "section": section,
                    "key_moment": key_moment,
                    "state": section_state,
                }
            )

        records.append(
            {
                **obligation,
                "current_state": current_state,
                "source_findings": video_findings,
                "curriculum_sections": sections,
                "section_obligations": section_obligations,
            }
        )

    expected_ids = [str(item.get("obligation_id") or "") for item in obligations]
    record_ids = [str(item.get("obligation_id") or "") for item in records]
    if record_ids != expected_ids:
        raise ValueError("inventory output must preserve canonical obligation order and IDs")

    blocking_states = {
        "AUDITED_PAGE_MISSING",
        "VIDEO_REQUIRED_UNDECLARED",
        "VIDEO_DECLARED_SOURCE_CONTRACT_INCOMPLETE",
    }
    blocking_h2_states = {
        "BLOCKED_VIDEO_UNDECLARED",
        "BLOCKED_CURATED_KEY_MOMENTS_MISSING",
        "BLOCKED_SECTION_MAPPING_MISSING_OR_INVALID",
    }
    blocked = any(state_counts[state] for state in blocking_states) or any(
        h2_state_counts[state] for state in blocking_h2_states
    )

    return {
        "schema_version": 1,
        "status": "FAIL_CLOSED" if blocked else "SOURCE_CONTRACT_COMPLETE_BINARY_EDITORIAL_PENDING",
        "golden": "NOT_CERTIFIED",
        "summary": {
            "expected_locale_video_obligations": len(obligations),
            "audited_obligations": len(records) - len(missing_audited_pages),
            "missing_audited_pages": len(missing_audited_pages),
            "page_states": dict(sorted(state_counts.items())),
            "curriculum_h2_obligations": sum(h2_state_counts.values()),
            "declared_page_h2_obligations": declared_page_h2,
            "undeclared_page_h2_obligations": undeclared_page_h2,
            "h2_states": dict(sorted(h2_state_counts.items())),
        },
        "missing_audited_page_ids": missing_audited_pages,
        "obligations": records,
    }


def _self_test() -> None:
    expectation = {
        "obligations": [
            {"obligation_id": "es:series/a/01.md", "route": "series/a/01.md", "locale": "es", "video_required": True},
            {"obligation_id": "en:series/a/01.md", "route": "series/a/01.md", "locale": "en", "video_required": True},
        ]
    }
    report = {
        "pages": [
            {
                "locale": "es",
                "source": "docs/series/a/01.md",
                "sections": ["Problema", "Mecanismo"],
                "findings": [{"code": "VIDEO_DECLARATION_MISSING"}],
                "video": {},
            },
            {
                "locale": "en",
                "source": "locales/en/series/a/01.md",
                "sections": ["Problem", "Mechanism"],
                "findings": [],
                "video": {
                    "video": "01.mp4",
                    "video_chapters": [{"name": "Mechanism", "start": 0}],
                    "video_section_map": [
                        {"section": "Problem", "key_moment": "Mechanism"},
                        {"section": "Mechanism", "key_moment": "Mechanism"},
                    ],
                },
            },
        ]
    }
    result = build_inventory(report, expectation)
    assert result["status"] == "FAIL_CLOSED"
    assert result["summary"]["expected_locale_video_obligations"] == 2
    assert result["summary"]["declared_page_h2_obligations"] == 2
    assert result["summary"]["undeclared_page_h2_obligations"] == 2
    es = result["obligations"][0]
    en = result["obligations"][1]
    assert es["current_state"] == "VIDEO_REQUIRED_UNDECLARED"
    assert all(item["key_moment"] is None for item in es["section_obligations"])
    assert all(item["state"] == "BLOCKED_VIDEO_UNDECLARED" for item in es["section_obligations"])
    assert en["current_state"] == "VIDEO_DECLARED_SOURCE_CONTRACT_COMPLETE_BINARY_EDITORIAL_PENDING"
    assert all(item["state"] == "MAPPED_TO_CURATED_KEY_MOMENT" for item in en["section_obligations"])


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
        _self_test()
        print("VIDEO_CURRICULUM_INVENTORY_SELF_TEST_PASS")
        return 0

    root = args.root.resolve()
    scope_path = args.scope if args.scope.is_absolute() else root / args.scope
    output = args.output if args.output.is_absolute() else root / args.output
    try:
        from audit_series_experience import audit
        from audit_video_curriculum_expectation import validate_video_expectation

        scope = json.loads(scope_path.read_text(encoding="utf-8"))
        expectation = validate_video_expectation(scope)
        report = audit(root, scope)
        inventory = build_inventory(report, expectation)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"VIDEO_CURRICULUM_INVENTORY_ERROR: {exc}")
        return 2

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(inventory, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(inventory["summary"], ensure_ascii=False, indent=2))
    print(f"GOLDEN=NOT_CERTIFIED; status={inventory['status']}")
    return 1 if inventory["status"] == "FAIL_CLOSED" else 0


if __name__ == "__main__":
    raise SystemExit(main())
