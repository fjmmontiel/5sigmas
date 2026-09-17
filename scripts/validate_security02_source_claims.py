#!/usr/bin/env python3
"""Fail-closed reviewed-source guard for Security 02 (Jailbreaks).

Protects the current ES/EN chapter from regressing to an inaccurate description
of GCG as a black-box search method. This is intentionally a source-claim gate;
it does not certify browser, media, pixels or pedagogy.
"""
from __future__ import annotations

import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ES_PATH = ROOT / "docs/series/seguridad-ia/02-jailbreaks.md"
EN_PATH = ROOT / "locales/en/series/seguridad-ia/02-jailbreaks.md"

REVIEWED_GCG_ES = (
    "El método GCG trata los tokens como variables discretas, pero su optimización original es de caja blanca: "
    "usa gradientes del modelo para priorizar sustituciones de tokens y después evalúa los candidatos."
)
REVIEWED_GCG_EN = (
    "GCG treats tokens as discrete variables, but its original optimization is white-box: "
    "it uses model gradients to prioritize token substitutions and then evaluates candidate replacements."
)
REVIEWED_TRANSFER_ES = (
    "La transferencia posterior de los sufijos encontrados es lo que permite probarlos contra modelos de caja negra"
)
REVIEWED_TRANSFER_EN = (
    "Transfer of the resulting suffixes is what allows them to be tested against black-box models"
)
FORBIDDEN_GCG_ES = (
    "No necesita que el atacante entienda cada detalle del modelo. Necesita una función de evaluación, "
    "capacidad de probar variantes y una ruta para observar el resultado"
)
FORBIDDEN_GCG_EN = (
    "The attacker does not need to understand every detail of the model. They need an evaluation function, "
    "the ability to try variants and a path to observe the result"
)

REVIEWED_TEMP_ES = (
    "OWASP resume la evidencia de Best-of-N indicando que bajar la temperatura ofrece una protección mínima "
    "incluso a temperatura 0"
)
REVIEWED_TEMP_EN = (
    "OWASP summarizes the Best-of-N evidence by noting that temperature reduction provides minimal protection "
    "even at temperature 0"
)
FORBIDDEN_TEMP_ES = (
    "Si la entrada adversaria ya ha llevado al modelo a una región no deseada de su distribución, "
    "decodificar de forma determinista solo hace más repetible el resultado"
)
FORBIDDEN_TEMP_EN = (
    "If an adversarial input has already moved the model into an undesirable region of its distribution, "
    "deterministic decoding only makes the result more repeatable"
)


def failures(es_text: str, en_text: str) -> list[str]:
    out: list[str] = []
    required = (
        (REVIEWED_GCG_ES, es_text, "security02:es: reviewed white-box GCG mechanics missing"),
        (REVIEWED_GCG_EN, en_text, "security02:en: reviewed white-box GCG mechanics missing"),
        (REVIEWED_TRANSFER_ES, es_text, "security02:es: GCG transfer-to-black-box boundary missing"),
        (REVIEWED_TRANSFER_EN, en_text, "security02:en: GCG transfer-to-black-box boundary missing"),
        (REVIEWED_TEMP_ES, es_text, "security02:es: sourced temperature-zero caveat missing"),
        (REVIEWED_TEMP_EN, en_text, "security02:en: sourced temperature-zero caveat missing"),
    )
    for needle, text, message in required:
        if needle not in text:
            out.append(message)

    forbidden = (
        (FORBIDDEN_GCG_ES, es_text, "security02:es: GCG regressed to black-box-style search description"),
        (FORBIDDEN_GCG_EN, en_text, "security02:en: GCG regressed to black-box-style search description"),
        (FORBIDDEN_TEMP_ES, es_text, "security02:es: unsupported deterministic-decoding causal explanation regressed"),
        (FORBIDDEN_TEMP_EN, en_text, "security02:en: unsupported deterministic-decoding causal explanation regressed"),
    )
    for needle, text, message in forbidden:
        if needle in text:
            out.append(message)
    return out


def self_test(es_text: str, en_text: str) -> None:
    current = failures(es_text, en_text)
    if current:
        raise AssertionError(f"positive current-source fixture must pass: {current}")

    mutated_es = es_text.replace(REVIEWED_GCG_ES, FORBIDDEN_GCG_ES, 1)
    result = failures(mutated_es, en_text)
    if not any("GCG regressed" in item for item in result):
        raise AssertionError("ES GCG black-box mutation was not rejected")
    if not any("white-box GCG mechanics missing" in item for item in result):
        raise AssertionError("ES removal of reviewed GCG mechanics was not rejected")

    mutated_en = en_text.replace(REVIEWED_GCG_EN, FORBIDDEN_GCG_EN, 1)
    result = failures(es_text, mutated_en)
    if not any("GCG regressed" in item for item in result):
        raise AssertionError("EN GCG black-box mutation was not rejected")
    if not any("white-box GCG mechanics missing" in item for item in result):
        raise AssertionError("EN removal of reviewed GCG mechanics was not rejected")

    mutated_temp_es = es_text.replace(REVIEWED_TEMP_ES, FORBIDDEN_TEMP_ES, 1)
    result = failures(mutated_temp_es, en_text)
    if not any("deterministic-decoding causal explanation regressed" in item for item in result):
        raise AssertionError("ES temperature-zero mutation was not rejected")

    mutated_temp_en = en_text.replace(REVIEWED_TEMP_EN, FORBIDDEN_TEMP_EN, 1)
    result = failures(es_text, mutated_temp_en)
    if not any("deterministic-decoding causal explanation regressed" in item for item in result):
        raise AssertionError("EN temperature-zero mutation was not rejected")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    es_text = ES_PATH.read_text(encoding="utf-8")
    en_text = EN_PATH.read_text(encoding="utf-8")
    if args.self_test:
        self_test(es_text, en_text)
        print("PASS security02 source-claim mutation fixtures")

    result = failures(es_text, en_text)
    if result:
        for item in result:
            print(f"FAIL {item}")
        return 1
    print("PASS Security02 reviewed source claims ES/EN")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
