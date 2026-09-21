#!/usr/bin/env python3
"""Fail-closed mobile-native visual contract for Evaluating AI Systems.

The GOLDEN contract requires the primary explanatory relationship to be readable at
~390px without depending on a giant horizontally-scrolled canvas. Desktop diagrams
may remain wide, but every Series 5 visual must expose an explicit mobile-native
projection and must not describe horizontal scrolling as the mobile teaching contract.
"""
from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

VISUALS = {
    "01": ROOT / "docs/snippets/articulos-tecnicos/eval-boundary-system-workflow-trajectory.html",
    "02": ROOT / "docs/snippets/articulos-tecnicos/eval-dataset-lifecycle-hard-negatives-contamination.html",
    "03": ROOT / "docs/snippets/articulos-tecnicos/eval-judge-calibration-bias-agreement.html",
    "04": ROOT / "docs/snippets/articulos-tecnicos/eval-agent-tool-trajectory-success-recovery-policy.html",
    "05": ROOT / "docs/snippets/articulos-tecnicos/eval-online-shadow-canary-ab-regression-gates.html",
    "06": ROOT / "docs/snippets/articulos-tecnicos/eval-production-feedback-loop.html",
}

MOBILE_MEDIA_RE = re.compile(r"@media\s*\(max-width\s*:\s*700px\)\s*\{(?P<body>.*?)\}(?=\s*@media|\s*</style>)", re.S)
MIN_WIDTH_RE = re.compile(r"min-width\s*:\s*(?P<px>\d+(?:\.\d+)?)px", re.I)


@dataclass(frozen=True)
class Finding:
    code: str
    detail: str


def inspect_source(text: str) -> list[Finding]:
    findings: list[Finding] = []
    mobile_blocks = list(MOBILE_MEDIA_RE.finditer(text))
    for match in mobile_blocks:
        for width in MIN_WIDTH_RE.finditer(match.group("body")):
            px = float(width.group("px"))
            if px > 430:
                findings.append(Finding("MOBILE_GIANT_CANVAS", f"mobile min-width={px:g}px > 430px"))

    if re.search(r'mobile\s*=\s*"[^"]*horizontal-scroll', text, re.I):
        findings.append(Finding("MOBILE_CONTRACT_HORIZONTAL_SCROLL", "GOLDEN_VISUAL_CONTRACT still treats horizontal scroll as the mobile teaching contract"))

    if 'data-mobile-native="true"' not in text:
        findings.append(Finding("MOBILE_NATIVE_PROJECTION_MISSING", "explicit data-mobile-native=\"true\" projection is missing"))

    if 'data-mobile-relationship' not in text:
        findings.append(Finding("MOBILE_RELATIONSHIP_MARKERS_MISSING", "mobile projection lacks deterministic relationship markers"))

    return findings


def self_test() -> None:
    bad = '''<style>@media (max-width:700px){.stage{min-width:1180px}}</style>
    <!-- GOLDEN_VISUAL_CONTRACT mobile="horizontal-scroll-preserves-graph" -->'''
    codes = {f.code for f in inspect_source(bad)}
    expected = {
        "MOBILE_GIANT_CANVAS",
        "MOBILE_CONTRACT_HORIZONTAL_SCROLL",
        "MOBILE_NATIVE_PROJECTION_MISSING",
        "MOBILE_RELATIONSHIP_MARKERS_MISSING",
    }
    missing = expected - codes
    if missing:
        raise AssertionError(f"negative fixture did not trigger: {sorted(missing)}")

    good = '''<style>@media (max-width:700px){.mobile{display:block;width:100%}}</style>
    <!-- GOLDEN_VISUAL_CONTRACT mobile="native-390px-semantic-projection" -->
    <div data-mobile-native="true"><span data-mobile-relationship="a->b">a → b</span></div>'''
    findings = inspect_source(good)
    if findings:
        raise AssertionError(f"positive fixture unexpectedly failed: {findings}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        print("mobile-native gate self-test: PASS")
        return 0

    failed = False
    for chapter, path in VISUALS.items():
        if not path.exists():
            print(f"CH{chapter} MOBILE_VISUAL_SOURCE_MISSING {path.relative_to(ROOT)}")
            failed = True
            continue
        findings = inspect_source(path.read_text(encoding="utf-8"))
        if findings:
            failed = True
            for finding in findings:
                print(f"CH{chapter} {finding.code}: {finding.detail}")
        else:
            print(f"CH{chapter} MOBILE_NATIVE_PASS")

    if failed:
        print("MOBILE_NATIVE_PASS=false")
        return 1
    print("MOBILE_NATIVE_PASS=true (6/6 canonical visuals)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
