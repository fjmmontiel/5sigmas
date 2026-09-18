#!/usr/bin/env python3
"""Fail-closed reviewed-source and pedagogy guard for Security04 red-teaming."""
from __future__ import annotations

import argparse
from pathlib import Path

import validate_security04_pedagogy_contract as pedagogy_contract

ROOT = Path(__file__).resolve().parents[1]
ES_PATH = ROOT / "docs/series/seguridad-ia/04-red-teaming.md"
EN_PATH = ROOT / "locales/en/series/seguridad-ia/04-red-teaming.md"

REQUIRED_ES = (
    "Un ejemplo más preciso para agentes de larga duración es *Strengthening Red Teams: A Modular Scaffold for Control Evaluations*.",
    "modelado de sospecha, selección del momento de ataque, planificación, ejecución y sutileza",
    "Ese scaffold pertenece al harness de evaluación",
    "https://alignment.anthropic.com/2025/strengthening-red-teams/",
)
REQUIRED_EN = (
    "A more precise example for long-horizon agents is *Strengthening Red Teams: A Modular Scaffold for Control Evaluations*.",
    "suspicion modeling, attack selection, planning, execution and subtlety",
    "That scaffold belongs to the evaluation harness",
    "https://alignment.anthropic.com/2025/strengthening-red-teams/",
)
FORBIDDEN_ES = (
    "*Constitutional Classifiers* describe un pipeline de red-teaming automático que genera ataques largos y de varios turnos.",
    "Un modelo de ataque propone una estructura, la rellena con variantes y usa los resultados para producir nuevos intentos",
)
FORBIDDEN_EN = (
    "*Constitutional Classifiers* describes an automated red-teaming pipeline that generates long, multi-turn attacks.",
    "An attack model proposes a structure, fills it with variants and uses the results to produce new attempts",
)


def failures(es: str, en: str) -> list[str]:
    out: list[str] = []
    for needle in REQUIRED_ES:
        if needle not in es:
            out.append(f"security04:es: reviewed Anthropic red-team attribution missing: {needle}")
    for needle in REQUIRED_EN:
        if needle not in en:
            out.append(f"security04:en: reviewed Anthropic red-team attribution missing: {needle}")
    for needle in FORBIDDEN_ES:
        if needle in es:
            out.append("security04:es: over-specific Constitutional Classifiers attribution regressed")
    for needle in FORBIDDEN_EN:
        if needle in en:
            out.append("security04:en: over-specific Constitutional Classifiers attribution regressed")
    if "date_modified: 2026-09-17" not in es or "date_modified: 2026-09-17" not in en:
        out.append("security04:parity: reviewed modification date missing in one locale")
    return out


def self_test(es: str, en: str) -> None:
    current = failures(es, en)
    if current:
        raise AssertionError(f"positive current-source fixture must pass: {current}")
    mutated_es = es.replace(REQUIRED_ES[0], FORBIDDEN_ES[0], 1)
    result = failures(mutated_es, en)
    if not any("over-specific" in item for item in result):
        raise AssertionError("ES stale attribution mutation was not rejected")
    mutated_en = en.replace(REQUIRED_EN[0], FORBIDDEN_EN[0], 1)
    result = failures(es, mutated_en)
    if not any("over-specific" in item for item in result):
        raise AssertionError("EN stale attribution mutation was not rejected")

    html = pedagogy_contract.HTML_PATH.read_text(encoding="utf-8")
    i18n = pedagogy_contract.I18N_PATH.read_text(encoding="utf-8")
    pedagogy_contract.self_test(html, i18n)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    es = ES_PATH.read_text(encoding="utf-8")
    en = EN_PATH.read_text(encoding="utf-8")
    if args.self_test:
        self_test(es, en)
        print("PASS Security04 source-claim + regression-pedagogy mutation fixtures")
    result = failures(es, en)
    html = pedagogy_contract.HTML_PATH.read_text(encoding="utf-8")
    i18n = pedagogy_contract.I18N_PATH.read_text(encoding="utf-8")
    result.extend(pedagogy_contract.failures(html, i18n))
    if result:
        for item in result:
            print(f"FAIL {item}")
        return 1
    print("PASS Security04 reviewed source attribution + release-regression source contract")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
