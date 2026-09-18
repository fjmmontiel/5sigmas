#!/usr/bin/env python3
"""Owner-amendment aware facade over the legacy full-catalogue experience audit.

The legacy report is intentionally preserved in full so future-series and
voice/accessibility debt remain visible.  Focused Security requalification may
only ignore narration-dependent captions/transcript findings under owner
amendment 5716685049; every other current source/media finding remains
fail-closed.  Security H2→key-moment mappings are supplied by an editorial
receipt derived independently from future narration.
"""
from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path

import audit_series_experience_legacy as legacy
from audit_series_experience_legacy import *  # noqa: F401,F403 - compatibility for existing tests/importers

OWNER_AMENDMENT = 5716685049
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
SECURITY_PREFIX = "series/seguridad-ia/"


def _canonical_route(source: str) -> str:
    for prefix in ("docs/", "locales/en/"):
        if source.startswith(prefix):
            return source[len(prefix):]
    return ""


def _load_security_editorial_maps(root: Path) -> dict:
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


def _security_current_blockers(report: dict) -> list[dict]:
    blockers: list[dict] = []
    # Global structural findings (scope/nav reconciliation) remain blockers.
    for item in report.get("findings", []):
        if isinstance(item, dict) and item.get("code"):
            blockers.append({"scope": "global", **item})
    for page in report.get("pages", []):
        if not isinstance(page, dict):
            continue
        route = _canonical_route(str(page.get("source") or ""))
        if not route.startswith(SECURITY_PREFIX):
            continue
        for item in page.get("findings", []):
            if not isinstance(item, dict) or not item.get("code"):
                continue
            code = str(item["code"])
            if code in DEFERRED_VOICE_CODES:
                continue
            blockers.append(
                {
                    "route": route,
                    "locale": str(page.get("locale") or ""),
                    **item,
                }
            )
    return blockers


def audit(root: Path, scope: dict, site: Path | None = None) -> dict:
    report = legacy.audit(root, scope, site)
    maps = _load_security_editorial_maps(root)

    for page in report.get("pages", []):
        if not isinstance(page, dict):
            continue
        route = _canonical_route(str(page.get("source") or ""))
        locale = str(page.get("locale") or "")
        if not route.startswith(SECURITY_PREFIX):
            continue
        locale_maps = maps.get(locale) if isinstance(maps.get(locale), dict) else {}
        section_map = locale_maps.get(route) if isinstance(locale_maps, dict) else None
        # Missing supplemental editorial evidence must stay fail-closed through
        # the legacy VIDEO_SECTION_MAP_MISSING finding.
        if not isinstance(section_map, list) or not section_map:
            continue
        video = page.get("video") if isinstance(page.get("video"), dict) else {}
        findings = [
            item
            for item in page.get("findings", [])
            if not (isinstance(item, dict) and item.get("code") in SECTION_MAP_CODES)
        ]
        map_findings, normalized = legacy._video_section_map_findings(
            list(page.get("sections", [])),
            list(video.get("video_chapters", [])),
            section_map,
        )
        findings.extend(map_findings)
        page["findings"] = findings
        video["video_section_map"] = normalized
        page["video"] = video

    counts = _recount(report)
    voice_counts = {
        code: count for code, count in sorted(counts.items()) if code in DEFERRED_VOICE_CODES
    }
    blockers = _security_current_blockers(report)
    report["voice_enhancement"] = {
        "state": "DEFERRED_OWNER_LOCAL",
        "blocker": False,
        "owner_amendment_comment": OWNER_AMENDMENT,
        "legacy_findings": voice_counts,
    }
    report["owner_current_gate"] = {
        "owner_amendment_comment": OWNER_AMENDMENT,
        "series": "seguridad-ia",
        "status": "PASS" if not blockers else "FAIL",
        "blockers": blockers,
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
        report = audit(
            root,
            json.loads(scope_path.read_text(encoding="utf-8")),
            args.site.resolve() if args.site else None,
        )
    except (OSError, ValueError, json.JSONDecodeError, legacy.yaml.YAMLError) as exc:
        print(f"EXPERIENCE_AUDIT_ERROR: {exc}")
        return 2
    output = args.output if args.output.is_absolute() else root / args.output
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k != "pages"}, ensure_ascii=False, indent=2))
    for page in report.get("pages", []):
        codes = sorted({f["code"] for f in page.get("findings", []) if isinstance(f, dict) and f.get("code")})
        if codes:
            print(f"{page.get('route')}: {', '.join(codes)}")

    diagnostic_scope = _diagnostic_scope(root)
    current = report["owner_current_gate"]
    print(
        "OWNER_CURRENT_SECURITY_GATE=" + current["status"]
        + "; VOICE_ENHANCEMENT=DEFERRED_OWNER_LOCAL"
        + f"; DIAGNOSTIC_SCOPE={diagnostic_scope}"
        + f"; GLOBAL_LEGACY_STATUS={report['status']}"
    )
    if diagnostic_scope.startswith("focused_security_"):
        return 0 if current["status"] == "PASS" else 1
    return 1 if report["status"] == "TECHNICAL_FAIL" else 0


if __name__ == "__main__":
    raise SystemExit(main())
