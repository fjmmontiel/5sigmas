#!/usr/bin/env python3
"""Deterministic source contracts for Security02 relationship-first explainers.

These checks prove that adaptive search, budget geometry and the outcome model
encode observable geometry/state changes and that EN localization mirrors exact
source blobs. They do NOT certify rendered pixels or editorial pedagogy.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SEARCH_HTML_PATH = ROOT / "docs/snippets/seguridad-ia/02-superficie-jailbreak.html"
SEARCH_I18N_PATH = ROOT / "locales/en/snippets/seguridad-ia/02-superficie-jailbreak.i18n.json"
BUDGET_HTML_PATH = ROOT / "docs/snippets/seguridad-ia/02-attack-budget.html"
BUDGET_I18N_PATH = ROOT / "locales/en/snippets/seguridad-ia/02-attack-budget.i18n.json"
OUTCOME_HTML_PATH = ROOT / "docs/snippets/seguridad-ia/02-outcome-ladder.html"
OUTCOME_I18N_PATH = ROOT / "locales/en/snippets/seguridad-ia/02-outcome-ladder.i18n.json"

SEARCH_REQUIRED_HTML = (
    '<svg viewBox="0 0 640 320" role="img"',
    'data-step',
    'data-reset',
    'data-path',
    'data-best',
    'aria-live="polite"',
    "path.setAttribute('points'",
    'scores=[.10,.16,.14,.25,.34,.31,.48,.57,.53,.69,.78,.84]',
    'El feedback mejora: conservar y refinar esta dirección.',
    'El feedback empeora: cambiar de rama.',
    'Traza pedagógica normalizada — no es un benchmark',
    '@media(prefers-reduced-motion:reduce)',
)
SEARCH_FORBIDDEN_HTML = (
    'jbsearch__attempts',
    'jbsearch__attempt is-tried',
    'data-bar',
    'Ejecutar 12 intentos',
)
SEARCH_REQUIRED_EN = (
    'An automated jailbreak is an adaptive search',
    'Feedback improves: keep and refine this direction.',
    'Feedback worsens: switch branch.',
    'Normalized teaching trace — not a benchmark',
)

BUDGET_REQUIRED_HTML = (
    '<svg viewBox="0 0 680 320" role="img"',
    'data-fixed-rays',
    '<polyline class="jbbudget__adaptive-path" data-adaptive-path points=""/>',
    'data-candidates',
    'root.dataset.mode=mode',
    "path.setAttribute('points'",
    "line.setAttribute('x1','112')",
    "mode==='adaptive'?adaptive:fixed",
    'Geometría pedagógica normalizada. No estima una probabilidad de jailbreak ni reproduce un benchmark.',
    'cada resultado cambia el siguiente paso',
    '@media(prefers-reduced-motion:reduce)',
)
BUDGET_FORBIDDEN_HTML = (
    'jbbudget__dots',
    'jbbudget__dot',
    'Representación conceptual de intentos',
)
BUDGET_REQUIRED_EN = (
    'A security claim needs to declare the budget',
    'Fixed · every attempt returns to the same origin',
    'Adaptive · every result changes the next step',
    'Normalized teaching geometry. It does not estimate jailbreak probability or reproduce a benchmark.',
    'Fixed search tests independent candidates from the same origin. Adaptive search connects candidates because each result informs the next step.',
)

OUTCOME_REQUIRED_HTML = (
    '<svg viewBox="0 0 760 250" role="img"',
    'data-edge',
    'data-route',
    'data-toggle="actionable"',
    'data-toggle="write"',
    'data-toggle="auth"',
    "route.setAttribute('points'",
    "mq.matches?layouts.narrow:layouts.wide",
    "const stage=!state.actionable?0:!state.write?2:!state.auth?3:4",
    'TEXT_ONLY',
    'READ_ONLY_BOUNDARY',
    'AUTH_BLOCKED',
    'EXTERNAL_EFFECT',
    'Contraejemplo:',
    '@media(max-width:760px)',
    '@media(prefers-reduced-motion:reduce)',
)
OUTCOME_FORBIDDEN_HTML = (
    'jbladder__step',
    'data-step="bypass"',
    'Selecciona cada nivel',
)
OUTCOME_REQUIRED_EN = (
    'A textual jailbreak is not the same as an external effect',
    'Actionable output',
    'Tool with write scope',
    'Authorization allows the action',
    'The bypass remains text-only.',
    'A write path exists, but authorization cuts it.',
    'The complete trajectory reaches an external effect.',
    'Counterexample:',
)


def git_blob_sha(text: str) -> str:
    raw = text.encode("utf-8")
    return hashlib.sha1(f"blob {len(raw)}\0".encode() + raw).hexdigest()


def check_contract(
    label: str,
    html: str,
    i18n_text: str,
    required_html: tuple[str, ...],
    forbidden_html: tuple[str, ...],
    required_en: tuple[str, ...],
) -> list[str]:
    out: list[str] = []
    for needle in required_html:
        if needle not in html:
            out.append(f"{label}: missing mechanism token: {needle}")
    for needle in forbidden_html:
        if needle in html:
            out.append(f"{label}: cosmetic legacy token regressed: {needle}")

    try:
        i18n = json.loads(i18n_text)
    except json.JSONDecodeError as exc:
        return out + [f"{label}:i18n: invalid JSON: {exc}"]

    expected_blob = git_blob_sha(html)
    if i18n.get("source_blob_sha") != expected_blob:
        out.append(
            f"{label}:i18n: source_blob_sha stale "
            f"expected={expected_blob} actual={i18n.get('source_blob_sha')}"
        )
    replacements = i18n.get("replacements", {})
    translated = "\n".join(str(v) for v in replacements.values())
    for needle in required_en:
        if needle not in translated:
            out.append(f"{label}:i18n: missing reviewed EN mechanism text: {needle}")
    return out


def failures(
    search_html: str,
    search_i18n: str,
    budget_html: str,
    budget_i18n: str,
    outcome_html: str,
    outcome_i18n: str,
) -> list[str]:
    return [
        *check_contract(
            "security02:adaptive-search",
            search_html,
            search_i18n,
            SEARCH_REQUIRED_HTML,
            SEARCH_FORBIDDEN_HTML,
            SEARCH_REQUIRED_EN,
        ),
        *check_contract(
            "security02:attack-budget",
            budget_html,
            budget_i18n,
            BUDGET_REQUIRED_HTML,
            BUDGET_FORBIDDEN_HTML,
            BUDGET_REQUIRED_EN,
        ),
        *check_contract(
            "security02:outcome-reachability",
            outcome_html,
            outcome_i18n,
            OUTCOME_REQUIRED_HTML,
            OUTCOME_FORBIDDEN_HTML,
            OUTCOME_REQUIRED_EN,
        ),
    ]


def self_test(
    search_html: str,
    search_i18n: str,
    budget_html: str,
    budget_i18n: str,
    outcome_html: str,
    outcome_i18n: str,
) -> None:
    current = failures(
        search_html, search_i18n, budget_html, budget_i18n, outcome_html, outcome_i18n
    )
    if current:
        raise AssertionError(f"positive current-source fixture must pass: {current}")

    mutated = search_html.replace("path.setAttribute('points'", "voidPath.setAttribute('points'", 1)
    result = failures(mutated, search_i18n, budget_html, budget_i18n, outcome_html, outcome_i18n)
    if not any("adaptive-search: missing mechanism token" in item for item in result):
        raise AssertionError("adaptive-search trajectory-removal mutation was not rejected")

    mutated_budget = budget_html.replace(
        '<polyline class="jbbudget__adaptive-path" data-adaptive-path points=""/>',
        '<polyline class="jbbudget__adaptive-path" data-no-adaptive-path points=""/>',
        1,
    )
    result = failures(
        search_html, search_i18n, mutated_budget, budget_i18n, outcome_html, outcome_i18n
    )
    if not any("attack-budget: missing mechanism token" in item for item in result):
        raise AssertionError("attack-budget adaptive-trajectory mutation was not rejected")

    mutated_budget = budget_html + '<div class="jbbudget__dots"><i class="jbbudget__dot"></i></div>'
    result = failures(
        search_html, search_i18n, mutated_budget, budget_i18n, outcome_html, outcome_i18n
    )
    if not any("attack-budget: cosmetic legacy token regressed" in item for item in result):
        raise AssertionError("attack-budget generic-dot regression was not rejected")

    mutated_outcome = outcome_html.replace(
        "route.setAttribute('points'", "voidRoute.setAttribute('points'", 1
    )
    result = failures(
        search_html, search_i18n, budget_html, budget_i18n, mutated_outcome, outcome_i18n
    )
    if not any("outcome-reachability: missing mechanism token" in item for item in result):
        raise AssertionError("outcome reachability mutation was not rejected")

    legacy_outcome = outcome_html + '<button class="jbladder__step" data-step="bypass">legacy</button>'
    result = failures(
        search_html, search_i18n, budget_html, budget_i18n, legacy_outcome, outcome_i18n
    )
    if not any("outcome-reachability: cosmetic legacy token regressed" in item for item in result):
        raise AssertionError("outcome legacy-selection regression was not rejected")

    stale = json.loads(outcome_i18n)
    stale["source_blob_sha"] = "0" * 40
    result = failures(
        search_html,
        search_i18n,
        budget_html,
        budget_i18n,
        outcome_html,
        json.dumps(stale),
    )
    if not any("outcome-reachability:i18n: source_blob_sha stale" in item for item in result):
        raise AssertionError("outcome stale localization-source mutation was not rejected")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    search_html = SEARCH_HTML_PATH.read_text(encoding="utf-8")
    search_i18n = SEARCH_I18N_PATH.read_text(encoding="utf-8")
    budget_html = BUDGET_HTML_PATH.read_text(encoding="utf-8")
    budget_i18n = BUDGET_I18N_PATH.read_text(encoding="utf-8")
    outcome_html = OUTCOME_HTML_PATH.read_text(encoding="utf-8")
    outcome_i18n = OUTCOME_I18N_PATH.read_text(encoding="utf-8")

    if args.self_test:
        self_test(
            search_html,
            search_i18n,
            budget_html,
            budget_i18n,
            outcome_html,
            outcome_i18n,
        )
        print("PASS Security02 pedagogy-contract mutation fixtures")

    result = failures(
        search_html, search_i18n, budget_html, budget_i18n, outcome_html, outcome_i18n
    )
    if result:
        for item in result:
            print(f"FAIL {item}")
        return 1
    print("PASS Security02 relationship-first source contracts")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
