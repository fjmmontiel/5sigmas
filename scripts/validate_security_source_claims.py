#!/usr/bin/env python3
"""Fail-closed source-claim guard for the active Security00 requalification.

This deterministic gate protects reviewed ES/EN material claims from regressing
back to unsupported broad rankings or software-security generalizations. It is
intentionally narrow: it does not certify the full article, media, rendered
pixels or pedagogy. Those remain separate GOLDEN requirements.
"""
from __future__ import annotations

import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ES_PATH = ROOT / "docs/series/seguridad-ia/00_presentacion_serie.md"
EN_PATH = ROOT / "locales/en/series/seguridad-ia/00_presentacion_serie.md"

REVIEWED_SEVERITY_ES = (
    "Por qué la inyección indirecta puede ser más grave cuando el sistema conecta "
    "contenido no confiable con herramientas, datos o acciones con privilegios."
)
REVIEWED_SEVERITY_EN = (
    "Why indirect injection can be more severe when the system connects untrusted "
    "content to tools, data, or privileged actions."
)
FORBIDDEN_SEVERITY_ES = (
    "Por qué la inyección indirecta en RAG y agentes es más grave que el caso de chat aislado."
)
FORBIDDEN_SEVERITY_EN = (
    "Why indirect injection in RAG and agents is more severe than the isolated-chat case."
)

REVIEWED_BOUNDARY_ES = (
    "Esa frontera no resuelve todas las clases de ataque, pero sí evita que esos datos "
    "se conviertan en control por el mismo canal."
)
REVIEWED_BOUNDARY_EN = (
    "That boundary does not solve every attack class, but it does stop that data from "
    "becoming control through the same channel."
)
FORBIDDEN_BOUNDARY_ES = (
    "si separas bien el código de los datos, las clases de ataque principales quedan acotadas."
)
FORBIDDEN_BOUNDARY_EN = (
    "if code and data are cleanly separated, the main attack classes are easier to bound."
)


def claim_failures(es_text: str, en_text: str) -> list[str]:
    failures: list[str] = []

    if REVIEWED_SEVERITY_ES not in es_text:
        failures.append("security00:es: reviewed conditional indirect-injection claim missing")
    if REVIEWED_SEVERITY_EN not in en_text:
        failures.append("security00:en: reviewed conditional indirect-injection claim missing")
    if FORBIDDEN_SEVERITY_ES in es_text:
        failures.append("security00:es: unconditional severity ranking regressed")
    if FORBIDDEN_SEVERITY_EN in en_text:
        failures.append("security00:en: unconditional severity ranking regressed")

    if REVIEWED_BOUNDARY_ES not in es_text:
        failures.append("security00:es: reviewed bounded software-injection claim missing")
    if REVIEWED_BOUNDARY_EN not in en_text:
        failures.append("security00:en: reviewed bounded software-injection claim missing")
    if FORBIDDEN_BOUNDARY_ES in es_text:
        failures.append("security00:es: broad code-data security generalization regressed")
    if FORBIDDEN_BOUNDARY_EN in en_text:
        failures.append("security00:en: broad code-data security generalization regressed")

    return failures


def self_test(es_text: str, en_text: str) -> None:
    failures = claim_failures(es_text, en_text)
    if failures:
        raise AssertionError(f"positive current-source fixture must pass: {failures}")

    mutated_es = es_text.replace(REVIEWED_SEVERITY_ES, FORBIDDEN_SEVERITY_ES, 1)
    failures = claim_failures(mutated_es, en_text)
    if not any("es: unconditional severity ranking regressed" in item for item in failures):
        raise AssertionError("ES unconditional-severity mutation was not rejected")
    if not any("es: reviewed conditional indirect-injection claim missing" in item for item in failures):
        raise AssertionError("ES removal of reviewed conditional severity claim was not rejected")

    mutated_en = en_text.replace(REVIEWED_SEVERITY_EN, FORBIDDEN_SEVERITY_EN, 1)
    failures = claim_failures(es_text, mutated_en)
    if not any("en: unconditional severity ranking regressed" in item for item in failures):
        raise AssertionError("EN unconditional-severity mutation was not rejected")
    if not any("en: reviewed conditional indirect-injection claim missing" in item for item in failures):
        raise AssertionError("EN removal of reviewed conditional severity claim was not rejected")

    missing_en = en_text.replace(REVIEWED_SEVERITY_EN, "", 1)
    failures = claim_failures(es_text, missing_en)
    if not any("en: reviewed conditional indirect-injection claim missing" in item for item in failures):
        raise AssertionError("missing EN reviewed severity claim mutation was not rejected")

    mutated_boundary_es = es_text.replace(REVIEWED_BOUNDARY_ES, FORBIDDEN_BOUNDARY_ES, 1)
    failures = claim_failures(mutated_boundary_es, en_text)
    if not any("es: broad code-data security generalization regressed" in item for item in failures):
        raise AssertionError("ES broad software-security mutation was not rejected")
    if not any("es: reviewed bounded software-injection claim missing" in item for item in failures):
        raise AssertionError("ES removal of reviewed bounded injection claim was not rejected")

    mutated_boundary_en = en_text.replace(REVIEWED_BOUNDARY_EN, FORBIDDEN_BOUNDARY_EN, 1)
    failures = claim_failures(es_text, mutated_boundary_en)
    if not any("en: broad code-data security generalization regressed" in item for item in failures):
        raise AssertionError("EN broad software-security mutation was not rejected")
    if not any("en: reviewed bounded software-injection claim missing" in item for item in failures):
        raise AssertionError("EN removal of reviewed bounded injection claim was not rejected")


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
