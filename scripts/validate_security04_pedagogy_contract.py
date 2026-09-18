#!/usr/bin/env python3
"""Source contract for Security04 release-regression pedagogy.

This gate verifies that the red-team regression explainer models release-state
outcomes instead of replaying a decorative highlight loop. It does not certify
pixels, accessibility, or the other Security04 teaching visuals.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML_PATH = ROOT / "docs/snippets/seguridad-ia/04-regression-loop.html"
I18N_PATH = ROOT / "locales/en/snippets/seguridad-ia/04-regression-loop.i18n.json"

REQUIRED_HTML = (
    'data-toggle="fixture"',
    'data-toggle="blocked"',
    'data-toggle="legit"',
    'data-branch="safe"',
    'data-branch="attack"',
    'data-branch="legit"',
    'data-mobile="gate"',
    'data-node="finding" transform="translate(90 150)"',
    'data-node="fixture" transform="translate(250 150)"',
    'data-node="rerun" transform="translate(410 150)"',
    'data-node="gate" transform="translate(570 150)"',
    'data-node="deploy" transform="translate(690 65)"',
    'data-node="attack" transform="translate(690 150)"',
    'data-node="legit" transform="translate(690 240)"',
    "const verdict=!state.fixture?'NO_FIXTURE':!state.blocked?'ATTACK_PERSISTS':!state.legit?'LEGIT_BREAKS':'DEPLOY'",
    "route.setAttribute('points'",
    "mobile.gate.dataset.result=verdict==='DEPLOY'?'DEPLOY':'HOLD'",
    'Contraejemplo:',
    '@media(max-width:760px)',
    '@media(prefers-reduced-motion:reduce)',
)
FORBIDDEN_HTML = (
    '▶ Recorrer ciclo',
    'setInterval(',
    'regloop__step is-active',
)
REQUIRED_EN = (
    'A finding protects a release only if it changes the gate',
    'Fixture reproduces the attack',
    'Mitigation cuts the trajectory',
    'Legitimate case still passes',
    'The attack still crosses the system.',
    'The gate has evidence to allow the release.',
    'Counterexample:',
)


def git_blob_sha(text: str) -> str:
    raw = text.encode("utf-8")
    return hashlib.sha1(f"blob {len(raw)}\0".encode() + raw).hexdigest()


def failures(html: str, i18n_text: str) -> list[str]:
    out: list[str] = []
    for needle in REQUIRED_HTML:
        if needle not in html:
            out.append(f"security04:regression-gate missing mechanism token: {needle}")
    for needle in FORBIDDEN_HTML:
        if needle in html:
            out.append(f"security04:regression-gate cosmetic legacy token regressed: {needle}")
    try:
        i18n = json.loads(i18n_text)
    except json.JSONDecodeError as exc:
        return out + [f"security04:regression-gate:i18n invalid JSON: {exc}"]
    expected = git_blob_sha(html)
    if i18n.get("source_blob_sha") != expected:
        out.append(
            "security04:regression-gate:i18n source_blob_sha stale "
            f"expected={expected} actual={i18n.get('source_blob_sha')}"
        )
    translated = "\n".join(str(v) for v in i18n.get("replacements", {}).values())
    for needle in REQUIRED_EN:
        if needle not in translated:
            out.append(f"security04:regression-gate:i18n missing reviewed EN text: {needle}")
    return out


def self_test(html: str, i18n_text: str) -> None:
    current = failures(html, i18n_text)
    if current:
        raise AssertionError(f"positive current-source fixture must pass: {current}")

    mutated = html.replace("route.setAttribute('points'", "voidRoute.setAttribute('points'", 1)
    if not any("missing mechanism token" in item for item in failures(mutated, i18n_text)):
        raise AssertionError("release-route mutation was not rejected")

    geometry_mutation = html.replace(
        'data-node="gate" transform="translate(570 150)"',
        'data-node="gate"',
        1,
    )
    if not any("missing mechanism token" in item for item in failures(geometry_mutation, i18n_text)):
        raise AssertionError("release-gate node-geometry mutation was not rejected")

    legacy = html + "<script>setInterval(()=>{},620)</script>"
    if not any("cosmetic legacy token regressed" in item for item in failures(legacy, i18n_text)):
        raise AssertionError("legacy autoplay-loop mutation was not rejected")

    stale = json.loads(i18n_text)
    stale["source_blob_sha"] = "0" * 40
    if not any("source_blob_sha stale" in item for item in failures(html, json.dumps(stale))):
        raise AssertionError("stale EN source identity mutation was not rejected")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    html = HTML_PATH.read_text(encoding="utf-8")
    i18n_text = I18N_PATH.read_text(encoding="utf-8")
    if args.self_test:
        self_test(html, i18n_text)
        print("PASS Security04 regression-gate mutation fixtures")
    result = failures(html, i18n_text)
    if result:
        for item in result:
            print(f"FAIL {item}")
        return 1
    print("PASS Security04 release-regression source contract")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
