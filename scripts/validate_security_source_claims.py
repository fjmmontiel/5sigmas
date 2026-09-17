#!/usr/bin/env python3
"""Fail-closed source-claim guard for the active Security00 requalification.

This deterministic gate protects a reviewed ES/EN material claim from regressing
back to an unconditional cross-setup severity ranking. It is intentionally
narrow: it does not certify the full article, media, rendered pixels or
pedagogy. Those remain separate GOLDEN requirements.
"""
from __future__ import annotations

import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ES_PATH = ROOT / "docs/series/seguridad-ia/00_presentacion_serie.md"
EN_PATH = ROOT / "locales/en/series/seguridad-ia/00_presentacion_serie.md"

REVIEWED_ES = (
    "Por qué la inyección indirecta puede ser más grave cuando el sistema conecta "
    "contenido no confiable con herramientas, datos o acciones con privilegios."
)
REVIEWED_EN = (
    "Why indirect injection can be more severe when the system connects untrusted "
    "content to tools, data, or privileged actions."
)

FORBIDDEN_ES = (
    "Por qué la inyección indirecta en RAG y agentes es más grave que el caso de chat aislado."
)
FORBIDDEN_EN = (
    "Why indirect injection in RAG and agents is more severe than the isolated-chat case."
)


def claim_failures(es_text: str, en_text: str) -> list[str]:
    failures: list[str] = []

    if REVIEWED_ES not in es_text:
        failures.append("security00:es: reviewed conditional indirect-injection claim missing")
    if REVIEWED_EN not in en_text:
        failures.append("security00:en: reviewed conditional indirect-injection claim missing")

    if FORBIDDEN_ES in es_text:
        failures.append("security00:es: unconditional severity ranking regressed")
    if FORBIDDEN_EN in en_text:
        failures.append("security00:en: unconditional severity ranking regressed")

    return failures


def self_test(es_text: str, en_text: str) -> None:
    failures = claim_failures(es_text, en_text)
    if failures:
        raise AssertionError(f"positive current-source fixture must pass: {failures}")

    mutated_es = es_text.replace(REVIEWED_ES, FORBIDDEN_ES, 1)
    failures = claim_failures(mutated_es, en_text)
    if not any("es: unconditional severity ranking regressed" in item for item in failures):
        raise AssertionError("ES unconditional-severity mutation was not rejected")
    if not any("es: reviewed conditional indirect-injection claim missing" in item for item in failures):
        raise AssertionError("ES removal of reviewed conditional claim was not rejected")

    mutated_en = en_text.replace(REVIEWED_EN, FORBIDDEN_EN, 1)
    failures = claim_failures(es_text, mutated_en)
    if not any("en: unconditional severity ranking regressed" in item for item in failures):
        raise AssertionError("EN unconditional-severity mutation was not rejected")
    if not any("en: reviewed conditional indirect-injection claim missing" in item for item in failures):
        raise AssertionError("EN removal of reviewed conditional claim was not rejected")

    missing_en = en_text.replace(REVIEWED_EN, "", 1)
    failures = claim_failures(es_text, missing_en)
    if not any("en: reviewed conditional indirect-injection claim missing" in item for item in failures):
        raise AssertionError("missing EN reviewed claim mutation was not rejected")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    es_text = ES_PATH.read_text(encoding="utf-8")
    en_text = EN_PATH.read_text(encoding="utf-8")

    if args.self_test:
        self_test(es_text, en_text)
        print("SECURITY_SOURCE_CLAIMS_SELF_TEST=PASS")
        return 0

    failures = claim_failures(es_text, en_text)
    if failures:
        print("SECURITY_SOURCE_CLAIMS=FAIL")
        for failure in failures:
            print(f"- {failure}")
        return 1

    print("SECURITY_SOURCE_CLAIMS=PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
