#!/usr/bin/env python3
"""Fail-closed reviewed-source guard for Security05 production-classifier evidence."""
from __future__ import annotations

import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ES_PATH = ROOT / "docs/series/seguridad-ia/05-controles-produccion.md"
EN_PATH = ROOT / "locales/en/series/seguridad-ia/05-controles-produccion.md"

REQUIRED_ES = (
    "*Constitutional Classifiers++* cambió de forma material la arquitectura de producción",
    "evalúa el **intercambio completo** en contexto",
    "usa una **cascada de dos etapas**",
    "**40× en coste computacional frente a su baseline de exchange classifier**",
    "**0,05% en tráfico de producción**",
    "más de **1.700 horas acumuladas de red-teaming**",
    "no cifras universales para cualquier guardrail, modelo o distribución de tráfico",
    "https://www.anthropic.com/research/next-generation-constitutional-classifiers",
    "https://arxiv.org/abs/2601.04603",
)
REQUIRED_EN = (
    "*Constitutional Classifiers++* materially changed the production architecture",
    "evaluates the **full exchange** in context",
    "uses a **two-stage cascade**",
    "**40× reduction in computational cost relative to its baseline exchange classifier**",
    "**0.05% refusal rate on production traffic**",
    "more than **1,700 cumulative hours of red-teaming**",
    "not universal numbers for every guardrail, model or traffic distribution",
    "https://www.anthropic.com/research/next-generation-constitutional-classifiers",
    "https://arxiv.org/abs/2601.04603",
)
FORBIDDEN_ES = (
    "Clasificar el texto mientras se genera",
    "Constitutional Classifiers presenta clasificadores de entrada y salida que pueden evaluar la secuencia mientras se genera.",
)
FORBIDDEN_EN = (
    "Classify text while it is generated",
    "Constitutional Classifiers presents input and output classifiers that can evaluate the sequence as it is generated.",
)


def failures(es: str, en: str) -> list[str]:
    out: list[str] = []
    for needle in REQUIRED_ES:
        if needle not in es:
            out.append(f"security05:es: reviewed CC++ production evidence missing: {needle}")
    for needle in REQUIRED_EN:
        if needle not in en:
            out.append(f"security05:en: reviewed CC++ production evidence missing: {needle}")
    for needle in FORBIDDEN_ES:
        if needle in es:
            out.append("security05:es: stale first-generation classifier framing regressed")
    for needle in FORBIDDEN_EN:
        if needle in en:
            out.append("security05:en: stale first-generation classifier framing regressed")
    if "date_modified: 2026-09-17" not in es or "date_modified: 2026-09-17" not in en:
        out.append("security05:parity: reviewed modification date missing in one locale")
    return out


def self_test(es: str, en: str) -> None:
    current = failures(es, en)
    if current:
        raise AssertionError(f"positive current-source fixture must pass: {current}")

    mutated_es = es.replace(REQUIRED_ES[0], FORBIDDEN_ES[1], 1)
    result = failures(mutated_es, en)
    if not any("stale first-generation" in item for item in result):
        raise AssertionError("ES stale CC framing mutation was not rejected")

    mutated_en = en.replace(REQUIRED_EN[0], FORBIDDEN_EN[1], 1)
    result = failures(es, mutated_en)
    if not any("stale first-generation" in item for item in result):
        raise AssertionError("EN stale CC framing mutation was not rejected")

    mutated_numbers = es.replace("**40× en coste computacional frente a su baseline de exchange classifier**", "**40× menos coste en cualquier despliegue**", 1)
    result = failures(mutated_numbers, en)
    if not any("40×" in item for item in result):
        raise AssertionError("unsupported universalized cost mutation was not rejected")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    es = ES_PATH.read_text(encoding="utf-8")
    en = EN_PATH.read_text(encoding="utf-8")
    if args.self_test:
        self_test(es, en)
        print("PASS Security05 source-claim mutation fixtures")
    result = failures(es, en)
    if result:
        for item in result:
            print(f"FAIL {item}")
        return 1
    print("PASS Security05 reviewed CC++ production evidence ES/EN")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
