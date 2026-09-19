#!/usr/bin/env python3
"""Owner-amendment aware facade over the legacy full-catalogue experience audit.

Global legacy/future-series debt is always preserved, while the process exit code
represents the series currently owned by the GOLDEN requalification program.
VOICE-dependent audio/captions/transcript debt is non-blocking under owner
amendment 5716685049; visual media remains blocking when the curriculum requires
it. Technical INDEXABILITY is a separate mandatory gate under amendment
5727362172 and never means Google selection/index state.
"""
from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
from typing import Callable

import audit_series_experience_legacy as legacy
import validate_agents_indexability
import validate_security_indexability
import validate_voice_indexability
from audit_series_experience_legacy import *  # noqa: F401,F403 - compatibility for existing tests/importers

OWNER_AMENDMENT = 5716685049
INDEXABILITY_AMENDMENT = 5727362172
DEFERRED_VOICE_CODES = {
    "VIDEO_CAPTIONS_MISSING",
    "VIDEO_CAPTIONS_FILE_MISSING",
    "VIDEO_TRANSCRIPT_MISSING",
    "VIDEO_TRANSCRIPT_FILE_MISSING",
}
SECTION_MAP_CODES = {
    "VIDEO_SECTION_MAP_MISSING",
    "VIDEO_SECTION_UNMAPPED",
    "VIDEO_SECTION_MAP_INVALID",
    "VIDEO_SECTION_MAP_UNKNOWN_SECTION",
    "VIDEO_SECTION_MAP_UNKNOWN_KEY_MOMENT",
    "VIDEO_SECTION_MAP_DUPLICATE_SECTION",
}

INDEXABILITY_VALIDATORS: dict[str, object] = {
    "seguridad-ia": validate_security_indexability,
    "agentes-ia": validate_agents_indexability,
    "agentes-voz-tiempo-real": validate_voice_indexability,
}


def _canonical_route(source: str) -> str:
    for prefix in ("docs/", "locales/en/"):
        if source.startswith(prefix):
            return source[len(prefix):]
    return ""


def _active_series(root: Path) -> str:
    """Read the durable program owner; fail closed if it cannot be resolved."""
    state_path = root / "quality/series-requalification/program-state.yml"
    data = legacy.load_yaml(state_path)
    series = str(data.get("active_series") or "").strip()
    if not series:
        raise ValueError("program-state.yml does not define active_series")
    return series


def _load_security_editorial_maps(root: Path) -> dict:
    """Security-only independent H2→key-moment receipt; preserved after series advance."""
    path = root / "quality/series-requalification/security-video-section-maps.yml"
    if not path.is_file():
        return {}
    data = legacy.load_yaml(path)
    locales = data.get("locales")
    return locales if isinstance(locales, dict) else {}


def _recount(report: dict) -> Counter:
    counts: Counter[str] = Counter(
        item.get("code")
        for item in report.get("findings", [])
        if isinstance(item, dict) and item.get("code")
    )
    counts.update(
        item.get("code")
        for page in report.get("pages", [])
        if isinstance(page, dict)
        for item in page.get("findings", [])
        if isinstance(item, dict) and item.get("code")
    )
    report.setdefault("summary", {})["findings"] = dict(sorted(counts.items()))
    report["status"] = "TECHNICAL_FAIL" if counts else "TECHNICAL_PASS_ONLY"
    report["media"] = (
        "SOURCE_FAIL"
        if any(code.startswith("VIDEO_") for code in counts)
        else "SOURCE_PASS_BINARY_PENDING"
    )
    return counts


def _current_blockers(report: dict, active_series: str) -> list[dict]:
    blockers: list[dict] = []
    # Truly global findings remain blocking for any active series.
    for item in report.get("findings", []):
        if isinstance(item, dict) and item.get("code"):
            blockers.append({"scope": "global", **item})
    prefix = f"series/{active_series}/"
    for page in report.get("pages", []):
        if not isinstance(page, dict):
            continue
        route = _canonical_route(str(page.get("source") or ""))
        if not route.startswith(prefix):
            continue
        for item in page.get("findings", []):
            if not isinstance(item, dict) or not item.get("code"):
                continue
            code = str(item["code"])
            if code in DEFERRED_VOICE_CODES:
                continue
            blockers.append({"route": route, "locale": str(page.get("locale") or ""), **item})
    return blockers


def _indexability_blockers(indexability_report: dict | None) -> list[dict]:
    if not isinstance(indexability_report, dict):
        return []
    blockers: list[dict] = []
    for item in indexability_report.get("global_errors", []):
        blockers.append({"scope": "global", "detail": str(item)})
    for row in indexability_report.get("rows", []):
        if not isinstance(row, dict):
            continue
        for item in row.get("blockers", []):
            blockers.append({"route": row.get("route"), "locale": row.get("locale"), "detail": str(item)})
    return blockers


def _run_indexability(root: Path, site: Path, active_series: str) -> dict:
    module = INDEXABILITY_VALIDATORS.get(active_series)
    if module is None:
        return {
            "owner_amendment_comment": INDEXABILITY_AMENDMENT,
            "series": active_series,
            "INDEXABILITY_PASS": False,
            "status": "FAIL_CLOSED_VALIDATOR_MISSING",
            "global_errors": [f"No dedicated rendered INDEXABILITY validator registered for {active_series}"],
            "rows": [],
        }
    # Every current validator exports its own negative-fixture entrypoint and
    # audit_indexability implementation. Voice/Agents configure their series inventory first.
    if hasattr(module, "self_test"):
        module.self_test()
    elif hasattr(module, "_self_test"):
        module._self_test()
    if hasattr(module, "configure"):
        module.configure()
    return module.audit_indexability(root, site)


def _current_gate_exit_code(current: dict) -> int:
    return 0 if isinstance(current, dict) and current.get("status") == "PASS" else 1


def audit(root: Path, scope: dict, site: Path | None = None) -> dict:
    active_series = _active_series(root)
    report = legacy.audit(root, scope, site)

    # Preserve the independently curated Security H2→key-moment mapping even after
    # ownership advances, because it remains historical evidence in the global report.
    maps = _load_security_editorial_maps(root)
    security_prefix = "series/seguridad-ia/"
    for page in report.get("pages", []):
        if not isinstance(page, dict):
            continue
        route = _canonical_route(str(page.get("source") or ""))
        locale = str(page.get("locale") or "")
        if not route.startswith(security_prefix):
            continue
        locale_maps = maps.get(locale) if isinstance(maps.get(locale), dict) else {}
        section_map = locale_maps.get(route) if isinstance(locale_maps, dict) else None
        if not isinstance(section_map, list) or not section_map:
            continue
        video = page.get("video") if isinstance(page.get("video"), dict) else {}
        findings = [
            item for item in page.get("findings", [])
            if not (isinstance(item, dict) and item.get("code") in SECTION_MAP_CODES)
        ]
        map_findings, normalized = legacy._video_section_map_findings(
            list(page.get("sections", [])), list(video.get("video_chapters", [])), section_map
        )
        findings.extend(map_findings)
        page["findings"] = findings
        video["video_section_map"] = normalized
        page["video"] = video

    counts = _recount(report)
    voice_counts = {code: count for code, count in sorted(counts.items()) if code in DEFERRED_VOICE_CODES}
    blockers = _current_blockers(report, active_series)

    indexability_report: dict | None = None
    if site is not None:
        indexability_report = _run_indexability(root, site, active_series)
    indexability_blockers = _indexability_blockers(indexability_report)
    indexability_pass: bool | None = (
        bool(indexability_report.get("INDEXABILITY_PASS")) if isinstance(indexability_report, dict) else None
    )

    report["voice_enhancement"] = {
        "state": "DEFERRED_OWNER_LOCAL",
        "blocker": False,
        "owner_amendment_comment": OWNER_AMENDMENT,
        "legacy_findings": voice_counts,
    }
    report["indexability"] = indexability_report if indexability_report is not None else {
        "owner_amendment_comment": INDEXABILITY_AMENDMENT,
        "series": active_series,
        "INDEXABILITY_PASS": None,
        "status": "PENDING_RENDERED_SITE",
        "meaning": "technical indexability only; Google selection/index state is separate",
    }
    # Rendered indexability is mandatory whenever --site is supplied. Without a rendered
    # site this source-stage facade reports pending rather than inventing a pass.
    gate_status = "PASS" if not blockers and indexability_pass is not False else "FAIL"
    report["owner_current_gate"] = {
        "owner_amendment_comment": OWNER_AMENDMENT,
        "indexability_amendment_comment": INDEXABILITY_AMENDMENT,
        "series": active_series,
        "status": gate_status,
        "blockers": blockers,
        "INDEXABILITY_PASS": indexability_pass,
        "indexability_status": "PASS" if indexability_pass is True else "FAIL" if indexability_pass is False else "PENDING_RENDERED_SITE",
        "indexability_blockers": indexability_blockers,
        "voice_enhancement": "DEFERRED_OWNER_LOCAL",
        "media_visual_and_voice_are_separate": True,
    }
    return report


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
    parser.add_argument("--site", type=Path)
    parser.add_argument("--output", type=Path, default=Path("artifacts/series-experience/report.json"))
    args = parser.parse_args()
    root = args.root.resolve()
    scope_path = args.scope if args.scope.is_absolute() else root / args.scope
    try:
        report = audit(root, json.loads(scope_path.read_text(encoding="utf-8")), args.site.resolve() if args.site else None)
    except (OSError, ValueError, json.JSONDecodeError, legacy.yaml.YAMLError) as exc:
        print(f"EXPERIENCE_AUDIT_ERROR: {exc}")
        return 2
    output = args.output if args.output.is_absolute() else root / args.output
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    indexability = report.get("indexability")
    if isinstance(indexability, dict) and isinstance(indexability.get("rows"), list):
        active = str(report.get("owner_current_gate", {}).get("series") or "active")
        index_output = root / f"artifacts/{active}-requalification/indexability/report.json"
        index_output.parent.mkdir(parents=True, exist_ok=True)
        index_output.write_text(json.dumps(indexability, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(json.dumps({k: v for k, v in report.items() if k != "pages"}, ensure_ascii=False, indent=2))
    for page in report.get("pages", []):
        codes = sorted({f["code"] for f in page.get("findings", []) if isinstance(f, dict) and f.get("code")})
        if codes:
            print(f"{page.get('route')}: {', '.join(codes)}")

    diagnostic_scope = _diagnostic_scope(root)
    current = report["owner_current_gate"]
    print(
        f"OWNER_CURRENT_SERIES={current['series']}; OWNER_CURRENT_GATE={current['status']}"
        + "; VOICE_ENHANCEMENT=DEFERRED_OWNER_LOCAL"
        + f"; INDEXABILITY_PASS={current.get('INDEXABILITY_PASS')}"
        + f"; DIAGNOSTIC_SCOPE={diagnostic_scope}"
        + f"; GLOBAL_LEGACY_STATUS={report['status']}"
    )
    if report["status"] == "TECHNICAL_FAIL":
        print("GLOBAL_FUTURE_SERIES_DEBT=PRESERVED; not treated as unrelated active-series blockers")
    return _current_gate_exit_code(current)


if __name__ == "__main__":
    raise SystemExit(main())
