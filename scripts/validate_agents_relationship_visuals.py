#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES = {
    "eval_es": ROOT / "docs/snippets/agentes-ia/03-evaluacion.html",
    "eval_en": ROOT / "locales/en/snippets/agentes-ia/03-evaluacion.html",
    "sec_es": ROOT / "docs/snippets/agentes-ia/04-seguridad.html",
    "sec_en": ROOT / "locales/en/snippets/agentes-ia/04-seguridad.html",
}


def check_eval(text: str, locale: str) -> list[str]:
    errors: list[str] = []
    required = [
        'class="aix-eval-trace"',
        'data-dimension="outcome"',
        'data-dimension="trajectory"',
        'data-dimension="permissions"',
        'data-dimension="economics"',
        'class="aix-eval-counterexample"',
    ]
    for token in required:
        if token not in text:
            errors.append(f"{locale}: missing {token}")
    if 'class="aix-eval-track"' in text:
        errors.append(f"{locale}: legacy linear Objective→Trace→Outcome→Cost pipeline remains")
    if text.count('data-dimension=') != 4:
        errors.append(f"{locale}: expected exactly four orthogonal evaluator dimensions")
    if locale == "en" and "Una tarea, una trayectoria" in text:
        errors.append("en: Spanish title leaked into localized visual")
    return errors


def check_security(text: str, locale: str) -> list[str]:
    errors: list[str] = []
    required = [
        'data-boundary="provenance"',
        'data-boundary="capability"',
        'data-boundary="authorization"',
        'class="aix-sec-blocked"',
        'class="aix-sec-feedback"',
    ]
    for token in required:
        if token not in text:
            errors.append(f"{locale}: missing {token}")
    if 'class="aix-sec-controls"' in text:
        errors.append(f"{locale}: legacy detached control chips remain")
    if text.count('data-boundary=') != 3:
        errors.append(f"{locale}: expected exactly three explicit path boundaries")
    if locale == "en" and "frontera de autorización" in text.lower():
        errors.append("en: Spanish authorization label leaked into localized visual")
    return errors


def validate(contents: dict[str, str]) -> list[str]:
    errors: list[str] = []
    errors += check_eval(contents["eval_es"], "eval_es")
    errors += check_eval(contents["eval_en"], "eval_en")
    errors += check_security(contents["sec_es"], "sec_es")
    errors += check_security(contents["sec_en"], "sec_en")

    # Structural ES/EN parity: same mechanism inventory, independent native copy.
    if contents["eval_es"].count('data-dimension=') != contents["eval_en"].count('data-dimension='):
        errors.append("evaluation: ES/EN dimension-count mismatch")
    if contents["sec_es"].count('data-boundary=') != contents["sec_en"].count('data-boundary='):
        errors.append("security: ES/EN boundary-count mismatch")
    return errors


def read_current() -> dict[str, str]:
    return {name: path.read_text(encoding="utf-8") for name, path in FILES.items()}


def self_test(contents: dict[str, str]) -> None:
    mutations = []

    m = dict(contents)
    m["eval_es"] = m["eval_es"].replace('data-dimension="permissions"', 'data-removed="permissions"', 1)
    mutations.append(("missing eval permission dimension", m))

    m = dict(contents)
    m["eval_en"] = m["eval_en"].replace('class="aix-eval-trace"', 'class="aix-eval-track"', 1)
    mutations.append(("linear eval regression", m))

    m = dict(contents)
    m["sec_es"] = m["sec_es"].replace('data-boundary="authorization"', 'data-removed="authorization"', 1)
    mutations.append(("missing authorization boundary", m))

    m = dict(contents)
    m["sec_en"] = m["sec_en"].replace('class="aix-sec-blocked"', 'class="aix-sec-controls"', 1)
    mutations.append(("detached-control regression", m))

    for name, mutated in mutations:
        if not validate(mutated):
            raise SystemExit(f"SELF_TEST_FAIL: mutation escaped: {name}")
    print(f"SELF_TEST_PASS: {len(mutations)} relationship mutations rejected")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    contents = read_current()
    if args.self_test:
        self_test(contents)
    errors = validate(contents)
    if errors:
        for error in errors:
            print(f"FAIL: {error}")
        raise SystemExit(1)
    print("PASS: Agents 03/04 relationship-first ES/EN visual contracts")


if __name__ == "__main__":
    main()
