#!/usr/bin/env python3
"""Fail-closed regression guard for the bounded GOLDEN diagnostic evidence contract."""
from __future__ import annotations

import argparse
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github/workflows/series-experience-diagnostic.yml"
STEP_NAME = "Retain bounded diagnostic evidence"
REQUIRED_PATHS = (
    "artifacts/series-experience/",
    "artifacts/security-requalification/",
)


def validate_text(text: str) -> list[str]:
    errors: list[str] = []
    marker = f"- name: {STEP_NAME}"
    if marker not in text:
        return [f"missing workflow step: {STEP_NAME}"]

    block = text.split(marker, 1)[1]
    next_step = block.find("\n      - name:")
    if next_step >= 0:
        block = block[:next_step]

    if "if: always()" not in block:
        errors.append("evidence upload must run with if: always() so green exact-head QA is reviewable")
    if "if: failure()" in block:
        errors.append("failure-only evidence retention is forbidden")
    if "uses: actions/upload-artifact@v4" not in block:
        errors.append("bounded evidence must use actions/upload-artifact@v4")
    if "retention-days: 1" not in block:
        errors.append("diagnostic evidence retention must remain exactly one day")
    for path in REQUIRED_PATHS:
        if path not in block:
            errors.append(f"missing bounded evidence path: {path}")

    path_block = block.split("path: |", 1)[1].split("retention-days:", 1)[0] if "path: |" in block else ""
    retained = [line.strip() for line in path_block.splitlines() if line.strip()]
    if retained != list(REQUIRED_PATHS):
        errors.append(f"artifact paths must stay narrowly bounded; got {retained!r}")

    return errors


def self_test() -> None:
    good = f"""
      - name: {STEP_NAME}
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: series-experience-diagnostic
          path: |
            artifacts/series-experience/
            artifacts/security-requalification/
          retention-days: 1
          if-no-files-found: warn
"""
    assert validate_text(good) == []
    assert any("always" in e for e in validate_text(good.replace("if: always()", "if: failure()")))
    assert any("one day" in e for e in validate_text(good.replace("retention-days: 1", "retention-days: 7")))
    assert any("narrowly bounded" in e for e in validate_text(good.replace("            artifacts/security-requalification/\n", "            artifacts/security-requalification/\n            artifacts/\n")))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        print("series-experience workflow contract mutation fixtures: PASS")
        return 0

    errors = validate_text(WORKFLOW.read_text(encoding="utf-8"))
    if errors:
        for error in errors:
            print(f"WORKFLOW_CONTRACT_FAIL: {error}")
        return 1
    print("series-experience workflow evidence contract: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
