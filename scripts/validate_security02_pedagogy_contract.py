#!/usr/bin/env python3
"""Deterministic source contract for the Security02 adaptive-search explainer.

This gate proves that the explainer encodes an observable candidate trajectory,
feedback-dependent state and a localized static/reduced-motion-compatible SVG.
It does NOT certify rendered pixels or editorial pedagogy by itself.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML_PATH = ROOT / "docs/snippets/seguridad-ia/02-superficie-jailbreak.html"
I18N_PATH = ROOT / "locales/en/snippets/seguridad-ia/02-superficie-jailbreak.i18n.json"

REQUIRED_HTML = (
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
FORBIDDEN_HTML = (
    'jbsearch__attempts',
    'jbsearch__attempt is-tried',
    'data-bar',
    'Ejecutar 12 intentos',
)
REQUIRED_EN = (
    'An automated jailbreak is an adaptive search',
    'Feedback improves: keep and refine this direction.',
    'Feedback worsens: switch branch.',
    'Normalized teaching trace — not a benchmark',
)


def git_blob_sha(text: str) -> str:
    raw = text.encode("utf-8")
    return hashlib.sha1(f"blob {len(raw)}\0".encode() + raw).hexdigest()


def failures(html: str, i18n_text: str) -> list[str]:
    out: list[str] = []
    for needle in REQUIRED_HTML:
        if needle not in html:
            out.append(f"security02:pedagogy: missing mechanism token: {needle}")
    for needle in FORBIDDEN_HTML:
        if needle in html:
            out.append(f"security02:pedagogy: cosmetic legacy token regressed: {needle}")

    try:
        i18n = json.loads(i18n_text)
    except json.JSONDecodeError as exc:
        return out + [f"security02:i18n: invalid JSON: {exc}"]

    expected_blob = git_blob_sha(html)
    if i18n.get("source_blob_sha") != expected_blob:
        out.append(
            "security02:i18n: source_blob_sha stale "
            f"expected={expected_blob} actual={i18n.get('source_blob_sha')}"
        )
    replacements = i18n.get("replacements", {})
    translated = "\n".join(str(v) for v in replacements.values())
    for needle in REQUIRED_EN:
        if needle not in translated:
            out.append(f"security02:i18n: missing reviewed EN mechanism text: {needle}")
    return out


def self_test(html: str, i18n_text: str) -> None:
    current = failures(html, i18n_text)
    if current:
        raise AssertionError(f"positive current-source fixture must pass: {current}")

    mutated = html.replace("path.setAttribute('points'", "voidPath.setAttribute('points'", 1)
    result = failures(mutated, i18n_text)
    if not any("missing mechanism token" in item for item in result):
        raise AssertionError("trajectory-removal mutation was not rejected")

    mutated = html + '<div class="jbsearch__attempts" data-bar></div>'
    result = failures(mutated, i18n_text)
    if not any("cosmetic legacy token regressed" in item for item in result):
        raise AssertionError("legacy dots/progress mutation was not rejected")

    i18n = json.loads(i18n_text)
    i18n["source_blob_sha"] = "0" * 40
    result = failures(html, json.dumps(i18n))
    if not any("source_blob_sha stale" in item for item in result):
        raise AssertionError("stale localization-source mutation was not rejected")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    html = HTML_PATH.read_text(encoding="utf-8")
    i18n_text = I18N_PATH.read_text(encoding="utf-8")
    if args.self_test:
        self_test(html, i18n_text)
        print("PASS Security02 pedagogy-contract mutation fixtures")

    result = failures(html, i18n_text)
    if result:
        for item in result:
            print(f"FAIL {item}")
        return 1
    print("PASS Security02 adaptive-search source contract")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
