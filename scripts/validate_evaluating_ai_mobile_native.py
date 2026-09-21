#!/usr/bin/env python3
"""Fail-closed mobile-native visual contract for Evaluating AI Systems.

The detailed SVGs may remain wide for desktop, but they cannot be the primary
mobile teaching surface. The MkDocs hook must emit a static native ~390px
semantic projection for every Series 5 visual and hide the legacy wide canvas at
mobile widths. This gate also retains negative fixtures for the historical giant
canvas failure mode.
"""
from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HOOK_PATH = ROOT / "hooks/reading_time.py"

VISUALS = {
    "01": (ROOT / "docs/snippets/articulos-tecnicos/eval-boundary-system-workflow-trajectory.html", "s5v-eval-boundary", "s5v-eval-boundary__scroll"),
    "02": (ROOT / "docs/snippets/articulos-tecnicos/eval-dataset-lifecycle-hard-negatives-contamination.html", "s5v-eval-dataset", "s5v-eval-dataset__scroll"),
    "03": (ROOT / "docs/snippets/articulos-tecnicos/eval-judge-calibration-bias-agreement.html", "s5v-judge-calibration", "jc-scroll"),
    "04": (ROOT / "docs/snippets/articulos-tecnicos/eval-agent-tool-trajectory-success-recovery-policy.html", "s5v-agent-trajectory", "at-scroll"),
    "05": (ROOT / "docs/snippets/articulos-tecnicos/eval-online-shadow-canary-ab-regression-gates.html", "s5v-online-eval", "oe-scroll"),
    "06": (ROOT / "docs/snippets/articulos-tecnicos/eval-production-feedback-loop.html", "s5v-eval-feedback", "fb-scroll"),
}

MOBILE_MEDIA_RE = re.compile(r"@media\s*\(max-width\s*:\s*700px\)\s*\{(?P<body>.*?)\}(?=\s*@media|\s*</style>)", re.S)
MIN_WIDTH_RE = re.compile(r"min-width\s*:\s*(?P<px>\d+(?:\.\d+)?)px", re.I)


@dataclass(frozen=True)
class Finding:
    code: str
    detail: str


def legacy_giant_widths(text: str) -> list[float]:
    widths: list[float] = []
    for match in MOBILE_MEDIA_RE.finditer(text):
        for width in MIN_WIDTH_RE.finditer(match.group("body")):
            px = float(width.group("px"))
            if px > 430:
                widths.append(px)
    return widths


def inspect_projection_contract(source: str, hook: str, section_class: str, scroller_class: str) -> list[Finding]:
    findings: list[Finding] = []
    giant = legacy_giant_widths(source)
    legacy_scroll_contract = bool(re.search(r'mobile\s*=\s*"[^"]*horizontal-scroll', source, re.I))

    # A legacy wide desktop SVG is allowed only when the build hook proves that
    # it is replaced as the primary mobile teaching surface.
    if section_class not in hook:
        findings.append(Finding("MOBILE_NATIVE_PROJECTION_MISSING", f"hook has no projection for {section_class}"))
    if scroller_class not in hook or f".{scroller_class}" not in hook:
        findings.append(Finding("MOBILE_LEGACY_CANVAS_NOT_HIDDEN", f"hook CSS does not hide .{scroller_class} at mobile width"))
    if 'data-mobile-native="true"' not in hook or 'data-mobile-relationship' not in hook:
        findings.append(Finding("MOBILE_RELATIONSHIP_MARKERS_MISSING", "hook does not emit deterministic mobile relationship markers"))
    if 'native-390px-semantic-projection;desktop-detail-hidden-on-mobile' not in hook:
        findings.append(Finding("MOBILE_RENDERED_CONTRACT_NOT_REWRITTEN", "rendered GOLDEN mobile contract is not normalized to the native projection"))

    if giant and findings:
        findings.append(Finding("MOBILE_GIANT_CANVAS", f"legacy mobile min-width(s) {','.join(f'{px:g}' for px in giant)}px remain primary because native replacement is incomplete"))
    if legacy_scroll_contract and findings:
        findings.append(Finding("MOBILE_CONTRACT_HORIZONTAL_SCROLL", "legacy horizontal-scroll authoring contract remains primary because native replacement is incomplete"))
    return findings


def self_test() -> None:
    bad_source = '''<style>@media (max-width:700px){.stage{min-width:1180px}}</style>
    <!-- GOLDEN_VISUAL_CONTRACT mobile="horizontal-scroll-preserves-graph" -->'''
    bad_hook = 'MOBILE_NATIVE_PROJECTIONS = {}'
    codes = {f.code for f in inspect_projection_contract(bad_source, bad_hook, "sample-section", "sample-scroll")}
    expected = {
        "MOBILE_NATIVE_PROJECTION_MISSING",
        "MOBILE_LEGACY_CANVAS_NOT_HIDDEN",
        "MOBILE_RELATIONSHIP_MARKERS_MISSING",
        "MOBILE_RENDERED_CONTRACT_NOT_REWRITTEN",
        "MOBILE_GIANT_CANVAS",
        "MOBILE_CONTRACT_HORIZONTAL_SCROLL",
    }
    missing = expected - codes
    if missing:
        raise AssertionError(f"negative giant-canvas fixture did not trigger: {sorted(missing)}")

    good_hook = '''MOBILE_NATIVE_PROJECTIONS={"sample-section":{}}
    .sample-scroll{display:none!important}
    <div data-mobile-native="true"><span data-mobile-relationship="a->b"></span></div>
    native-390px-semantic-projection;desktop-detail-hidden-on-mobile'''
    findings = inspect_projection_contract(bad_source, good_hook, "sample-section", "sample-scroll")
    if findings:
        raise AssertionError(f"covered desktop-detail fixture unexpectedly failed: {findings}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        print("mobile-native gate self-test: PASS")
        return 0

    if not HOOK_PATH.exists():
        print("MOBILE_NATIVE_HOOK_MISSING hooks/reading_time.py")
        return 1
    hook = HOOK_PATH.read_text(encoding="utf-8")

    failed = False
    for chapter, (path, section_class, scroller_class) in VISUALS.items():
        if not path.exists():
            print(f"CH{chapter} MOBILE_VISUAL_SOURCE_MISSING {path.relative_to(ROOT)}")
            failed = True
            continue
        source = path.read_text(encoding="utf-8")
        findings = inspect_projection_contract(source, hook, section_class, scroller_class)
        if findings:
            failed = True
            for finding in findings:
                print(f"CH{chapter} {finding.code}: {finding.detail}")
        else:
            legacy = legacy_giant_widths(source)
            legacy_note = f"; desktop-detail legacy widths={','.join(f'{px:g}' for px in legacy)}px" if legacy else ""
            print(f"CH{chapter} MOBILE_NATIVE_SOURCE_PASS{legacy_note}")

    if failed:
        print("MOBILE_NATIVE_SOURCE_PASS=false")
        return 1
    print("MOBILE_NATIVE_SOURCE_PASS=true (6/6 canonical visuals have build-time native mobile projections)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
