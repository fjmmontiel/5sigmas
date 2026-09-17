#!/usr/bin/env python3
"""Fail-closed source-claim guard for active Security00/01 requalification.

This deterministic gate protects reviewed ES/EN material claims from regressing
back to unsupported broad rankings or software-security generalizations. It is
intentionally narrow: it does not certify the full articles, media, rendered
pixels or pedagogy. Those remain separate GOLDEN requirements.
"""
from __future__ import annotations

import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ES_PATH = ROOT / "docs/series/seguridad-ia/00_presentacion_serie.md"
EN_PATH = ROOT / "locales/en/series/seguridad-ia/00_presentacion_serie.md"
ES01_PATH = ROOT / "docs/series/seguridad-ia/01-prompt-injection.md"
EN01_PATH = ROOT / "locales/en/series/seguridad-ia/01-prompt-injection.md"

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

REVIEWED_01_INTRO_ES = (
    "por qué la inyección indirecta en RAG y agentes puede aumentar el impacto cuando contenido "
    "no confiable alcanza herramientas, datos o acciones con privilegios"
)
REVIEWED_01_INTRO_EN = (
    "why indirect injection in RAG and agents can increase impact when untrusted content reaches "
    "privileged tools, data or actions"
)
FORBIDDEN_01_INTRO_ES = "por qué la inyección indirecta en RAG y agentes cambia el nivel de gravedad"
FORBIDDEN_01_INTRO_EN = "why indirect injection in RAG and agents changes the severity"

REVIEWED_01_DIRECT_SCOPE_ES = (
    "Esa limitación no es universal: si el mismo chat dispone de herramientas, secretos o acciones "
    "externas, una inyección directa también puede producir efectos privilegiados."
)
REVIEWED_01_DIRECT_SCOPE_EN = (
    "That limit is not universal: if the same chat exposes tools, secrets or external actions, "
    "a direct injection can also produce privileged effects."
)
FORBIDDEN_01_DIRECT_SCOPE_ES = (
    "Eso ya es un problema, pero el riesgo sigue bastante contenido: la entrada maliciosa y el "
    "efecto quedan dentro de la misma interacción."
)
FORBIDDEN_01_DIRECT_SCOPE_EN = (
    "That is already a problem, but the risk remains relatively contained: the malicious input "
    "and the effect stay within the same interaction."
)

REVIEWED_01_ORCHESTRATION_ES = (
    "la recuperación y la orquestación pueden ampliar el daño cuando propagan la instrucción hacia "
    "componentes con más privilegios, datos sensibles o capacidad de acción."
)
REVIEWED_01_ORCHESTRATION_EN = (
    "Retrieval and orchestration can also widen the impact when they propagate the instruction "
    "toward components with greater privileges, sensitive data or action capability."
)
FORBIDDEN_01_ORCHESTRATION_ES = "la recuperación y la orquestación multiplican el daño."
FORBIDDEN_01_ORCHESTRATION_EN = "Retrieval and orchestration also multiply the damage."

REVIEWED_01_FAQ_ES = "¿Cuándo puede tener más impacto la inyección indirecta que el prompt injection directo?"
REVIEWED_01_FAQ_EN = "When can indirect injection have more impact than direct prompt injection?"
FORBIDDEN_01_FAQ_ES = "¿Por qué la inyección indirecta es más peligrosa que el prompt injection directo?"
FORBIDDEN_01_FAQ_EN = "Why is indirect injection more dangerous than direct prompt injection?"


def _security01_texts(es01_text: str | None, en01_text: str | None) -> tuple[str, str]:
    return (
        es01_text if es01_text is not None else ES01_PATH.read_text(encoding="utf-8"),
        en01_text if en01_text is not None else EN01_PATH.read_text(encoding="utf-8"),
    )


def claim_failures(
    es_text: str,
    en_text: str,
    es01_text: str | None = None,
    en01_text: str | None = None,
) -> list[str]:
    failures: list[str] = []
    es01_text, en01_text = _security01_texts(es01_text, en01_text)

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

    reviewed_01 = (
        (REVIEWED_01_INTRO_ES, es01_text, "security01:es: reviewed conditional impact intro missing"),
        (REVIEWED_01_INTRO_EN, en01_text, "security01:en: reviewed conditional impact intro missing"),
        (REVIEWED_01_DIRECT_SCOPE_ES, es01_text, "security01:es: direct-injection scope caveat missing"),
        (REVIEWED_01_DIRECT_SCOPE_EN, en01_text, "security01:en: direct-injection scope caveat missing"),
        (REVIEWED_01_ORCHESTRATION_ES, es01_text, "security01:es: conditional orchestration impact claim missing"),
        (REVIEWED_01_ORCHESTRATION_EN, en01_text, "security01:en: conditional orchestration impact claim missing"),
        (REVIEWED_01_FAQ_ES, es01_text, "security01:es: conditioned indirect-injection FAQ missing"),
        (REVIEWED_01_FAQ_EN, en01_text, "security01:en: conditioned indirect-injection FAQ missing"),
    )
    for reviewed, text, message in reviewed_01:
        if reviewed not in text:
            failures.append(message)

    forbidden_01 = (
        (FORBIDDEN_01_INTRO_ES, es01_text, "security01:es: unconditional severity framing regressed"),
        (FORBIDDEN_01_INTRO_EN, en01_text, "security01:en: unconditional severity framing regressed"),
        (FORBIDDEN_01_DIRECT_SCOPE_ES, es01_text, "security01:es: direct-injection containment overclaim regressed"),
        (FORBIDDEN_01_DIRECT_SCOPE_EN, en01_text, "security01:en: direct-injection containment overclaim regressed"),
        (FORBIDDEN_01_ORCHESTRATION_ES, es01_text, "security01:es: orchestration damage multiplier overclaim regressed"),
        (FORBIDDEN_01_ORCHESTRATION_EN, en01_text, "security01:en: orchestration damage multiplier overclaim regressed"),
        (FORBIDDEN_01_FAQ_ES, es01_text, "security01:es: universal indirect-vs-direct ranking regressed"),
        (FORBIDDEN_01_FAQ_EN, en01_text, "security01:en: universal indirect-vs-direct ranking regressed"),
    )
    for forbidden, text, message in forbidden_01:
        if forbidden in text:
            failures.append(message)

    return failures


def self_test(
    es_text: str,
    en_text: str,
    es01_text: str | None = None,
    en01_text: str | None = None,
) -> None:
    es01_text, en01_text = _security01_texts(es01_text, en01_text)
    failures = claim_failures(es_text, en_text, es01_text, en01_text)
    if failures:
        raise AssertionError(f"positive current-source fixture must pass: {failures}")

    mutated_es = es_text.replace(REVIEWED_SEVERITY_ES, FORBIDDEN_SEVERITY_ES, 1)
    failures = claim_failures(mutated_es, en_text, es01_text, en01_text)
    if not any("es: unconditional severity ranking regressed" in item for item in failures):
        raise AssertionError("ES unconditional-severity mutation was not rejected")
    if not any("es: reviewed conditional indirect-injection claim missing" in item for item in failures):
        raise AssertionError("ES removal of reviewed conditional severity claim was not rejected")

    mutated_en = en_text.replace(REVIEWED_SEVERITY_EN, FORBIDDEN_SEVERITY_EN, 1)
    failures = claim_failures(es_text, mutated_en, es01_text, en01_text)
    if not any("en: unconditional severity ranking regressed" in item for item in failures):
        raise AssertionError("EN unconditional-severity mutation was not rejected")
    if not any("en: reviewed conditional indirect-injection claim missing" in item for item in failures):
        raise AssertionError("EN removal of reviewed conditional severity claim was not rejected")

    missing_en = en_text.replace(REVIEWED_SEVERITY_EN, "", 1)
    failures = claim_failures(es_text, missing_en, es01_text, en01_text)
    if not any("en: reviewed conditional indirect-injection claim missing" in item for item in failures):
        raise AssertionError("missing EN reviewed severity claim mutation was not rejected")

    mutated_boundary_es = es_text.replace(REVIEWED_BOUNDARY_ES, FORBIDDEN_BOUNDARY_ES, 1)
    failures = claim_failures(mutated_boundary_es, en_text, es01_text, en01_text)
    if not any("es: broad code-data security generalization regressed" in item for item in failures):
        raise AssertionError("ES broad software-security mutation was not rejected")
    if not any("es: reviewed bounded software-injection claim missing" in item for item in failures):
        raise AssertionError("ES removal of reviewed bounded injection claim was not rejected")

    mutated_boundary_en = en_text.replace(REVIEWED_BOUNDARY_EN, FORBIDDEN_BOUNDARY_EN, 1)
    failures = claim_failures(es_text, mutated_boundary_en, es01_text, en01_text)
    if not any("en: broad code-data security generalization regressed" in item for item in failures):
        raise AssertionError("EN broad software-security mutation was not rejected")
    if not any("en: reviewed bounded software-injection claim missing" in item for item in failures):
        raise AssertionError("EN removal of reviewed bounded injection claim was not rejected")

    mutated_01_es = es01_text.replace(REVIEWED_01_INTRO_ES, FORBIDDEN_01_INTRO_ES, 1)
    failures = claim_failures(es_text, en_text, mutated_01_es, en01_text)
    if not any("security01:es: unconditional severity framing regressed" in item for item in failures):
        raise AssertionError("Security01 ES unconditional-severity mutation was not rejected")

    mutated_01_en = en01_text.replace(REVIEWED_01_INTRO_EN, FORBIDDEN_01_INTRO_EN, 1)
    failures = claim_failures(es_text, en_text, es01_text, mutated_01_en)
    if not any("security01:en: unconditional severity framing regressed" in item for item in failures):
        raise AssertionError("Security01 EN unconditional-severity mutation was not rejected")

    mutated_direct_es = es01_text.replace(REVIEWED_01_DIRECT_SCOPE_ES, FORBIDDEN_01_DIRECT_SCOPE_ES, 1)
    failures = claim_failures(es_text, en_text, mutated_direct_es, en01_text)
    if not any("security01:es: direct-injection containment overclaim regressed" in item for item in failures):
        raise AssertionError("Security01 ES direct-injection containment mutation was not rejected")

    mutated_orchestration_en = en01_text.replace(
        REVIEWED_01_ORCHESTRATION_EN, FORBIDDEN_01_ORCHESTRATION_EN, 1
    )
    failures = claim_failures(es_text, en_text, es01_text, mutated_orchestration_en)
    if not any("security01:en: orchestration damage multiplier overclaim regressed" in item for item in failures):
        raise AssertionError("Security01 EN orchestration multiplier mutation was not rejected")

    mutated_faq_es = es01_text.replace(REVIEWED_01_FAQ_ES, FORBIDDEN_01_FAQ_ES, 1)
    failures = claim_failures(es_text, en_text, mutated_faq_es, en01_text)
    if not any("security01:es: universal indirect-vs-direct ranking regressed" in item for item in failures):
        raise AssertionError("Security01 ES universal-ranking FAQ mutation was not rejected")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    es_text = ES_PATH.read_text(encoding="utf-8")
    en_text = EN_PATH.read_text(encoding="utf-8")
    es01_text = ES01_PATH.read_text(encoding="utf-8")
    en01_text = EN01_PATH.read_text(encoding="utf-8")

    if args.self_test:
        self_test(es_text, en_text, es01_text, en01_text)
        print("SECURITY_SOURCE_CLAIMS_SELF_TEST=PASS")
        return 0

    failures = claim_failures(es_text, en_text, es01_text, en01_text)
    if failures:
        print("SECURITY_SOURCE_CLAIMS=FAIL")
        for failure in failures:
            print(f"- {failure}")
        return 1

    print("SECURITY_SOURCE_CLAIMS=PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
