#!/usr/bin/env python3
"""Fail-closed freshness/parity guard for Security03 (memory poisoning).

Protects the reviewed Sep-2026 evidence boundary and prevents MemSecBench from
being described as the latest evidence after PMPA was published. This is a
source gate only; it does not certify builds, browsers, media, pixels or pedagogy.
"""
from __future__ import annotations

import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ES_PATH = ROOT / "docs/series/seguridad-ia/03-envenenamiento.md"
EN_PATH = ROOT / "locales/en/series/seguridad-ia/03-envenenamiento.md"

REQUIRED_ES = (
    "Un preprint posterior, publicado en septiembre de 2026, evalúa *Persistent Memory Poisoning Attack* (PMPA)",
    "73,7%/55,5% en OpenClaw y 66,9%/81,7% en Claude Code",
    "Son resultados de esos harnesses concretos, no tasas esperables para cualquier agente",
    "https://arxiv.org/abs/2609.13889",
)
REQUIRED_EN = (
    "A later preprint, published in September 2026, evaluates a *Persistent Memory Poisoning Attack* (PMPA)",
    "73.7%/55.5% on OpenClaw and 66.9%/81.7% on Claude Code",
    "These are results for those specific harnesses, not expected rates for arbitrary agents",
    "https://arxiv.org/abs/2609.13889",
)
FORBIDDEN_ES = "La señal más reciente es *MemSecBench*"
FORBIDDEN_EN = "The latest evidence is *MemSecBench*"


def failures(es: str, en: str) -> list[str]:
    out: list[str] = []
    for needle in REQUIRED_ES:
        if needle not in es:
            out.append(f"security03:es: missing reviewed Sep-2026 evidence: {needle}")
    for needle in REQUIRED_EN:
        if needle not in en:
            out.append(f"security03:en: missing reviewed Sep-2026 evidence: {needle}")
    if FORBIDDEN_ES in es:
        out.append("security03:es: stale latest-evidence claim regressed")
    if FORBIDDEN_EN in en:
        out.append("security03:en: stale latest-evidence claim regressed")
    if "date_modified: 2026-09-17" not in es or "date_modified: 2026-09-17" not in en:
        out.append("security03: parity: reviewed modification date missing in one locale")
    return out


def self_test(es: str, en: str) -> None:
    current = failures(es, en)
    if current:
        raise AssertionError(f"positive current-source fixture must pass: {current}")

    mutated_es = es.replace(REQUIRED_ES[0], FORBIDDEN_ES, 1)
    result = failures(mutated_es, en)
    if not any("stale latest-evidence claim" in item for item in result):
        raise AssertionError("ES stale-latest mutation was not rejected")
    if not any("missing reviewed Sep-2026 evidence" in item for item in result):
        raise AssertionError("ES removal of PMPA evidence was not rejected")

    mutated_en = en.replace(REQUIRED_EN[0], FORBIDDEN_EN, 1)
    result = failures(es, mutated_en)
    if not any("stale latest-evidence claim" in item for item in result):
        raise AssertionError("EN stale-latest mutation was not rejected")
    if not any("missing reviewed Sep-2026 evidence" in item for item in result):
        raise AssertionError("EN removal of PMPA evidence was not rejected")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    es = ES_PATH.read_text(encoding="utf-8")
    en = EN_PATH.read_text(encoding="utf-8")
    if args.self_test:
        self_test(es, en)
        print("PASS Security03 freshness mutation fixtures")
    result = failures(es, en)
    if result:
        for item in result:
            print(f"FAIL {item}")
        return 1
    print("PASS Security03 reviewed Sep-2026 source claims ES/EN")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
