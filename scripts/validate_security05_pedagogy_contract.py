#!/usr/bin/env python3
"""Relationship-first source contract for the Security05 release-gate visual."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VISUAL = ROOT / "docs/snippets/seguridad-ia/05-release-gate.html"
I18N = ROOT / "locales/en/snippets/seguridad-ia/05-release-gate.i18n.json"

REQUIRED = (
    'data-mode="pass"',
    'data-mode="authority"',
    'data-mode="state"',
    'data-mode="recovery"',
    'data-edge="authority"',
    'data-edge="state"',
    'data-edge="recovery"',
    '<path class="rg-output rg-output--deploy" data-output="deploy"',
    '<path class="rg-output rg-output--hold" data-output="hold"',
    "hold=root.querySelector('[data-output=\"hold\"]')",
    "e.classList.toggle('is-failed',failed)",
    'deploy.hidden=!pass',
    'hold.hidden=pass',
    'release-evidence.json · 3/3 current',
    'authz-policy.json · STALE',
    'state-contract.json · DRIFT',
    'recovery-e2e.json · MISSING',
    'La evidencia rota no se compensa con dos checks verdes',
)
FORBIDDEN = (
    'data-check',
    'releasegate__meter',
    'releasegate__bar',
    '${n/checks.length*100}%',
    '0 / 3 fronteras verificadas',
)


def git_blob_sha(text: str) -> str:
    data = text.encode('utf-8')
    return hashlib.sha1(f"blob {len(data)}\0".encode() + data).hexdigest()


def failures(html: str, i18n_text: str) -> list[str]:
    out: list[str] = []
    for token in REQUIRED:
        if token not in html:
            out.append(f"security05:release-gate: relationship/state token missing: {token}")
    for token in FORBIDDEN:
        if token in html:
            out.append(f"security05:release-gate: cosmetic checkbox/progress regression: {token}")
    try:
        payload = json.loads(i18n_text)
    except json.JSONDecodeError as exc:
        out.append(f"security05:release-gate:i18n invalid JSON: {exc}")
        return out
    expected = git_blob_sha(html)
    if payload.get('source_blob_sha') != expected:
        out.append(f"security05:release-gate:i18n stale source blob: expected {expected}, got {payload.get('source_blob_sha')}")
    required_en = (
        'A release gate decides from evidence, not checked boxes',
        'Broken evidence is not offset by two green checks',
        'Broken authorization → HOLD',
        'State drift → HOLD',
        'Recovery unproven → HOLD',
    )
    replacements = payload.get('replacements', {})
    values = set(replacements.values())
    for token in required_en:
        if not any(token in value for value in values):
            out.append(f"security05:release-gate:i18n required EN relationship text missing: {token}")
    return out


def self_test(html: str, i18n_text: str) -> None:
    current = failures(html, i18n_text)
    if current:
        raise AssertionError(f"positive current visual fixture must pass: {current}")

    mutated = html.replace(
        '<path class="rg-output rg-output--hold" data-output="hold"',
        '<path class="rg-output rg-output--hold" data-output="blocked-copy"',
        1,
    )
    result = failures(mutated, i18n_text)
    if not any('rg-output--hold' in item and 'data-output' in item for item in result):
        raise AssertionError('missing HOLD-path mutation was not rejected')

    mutated = html.replace("hold.hidden=pass", "hold.hidden=true", 1)
    result = failures(mutated, i18n_text)
    if not any('hold.hidden=pass' in item for item in result):
        raise AssertionError('HOLD visibility-state mutation was not rejected')

    mutated = html + '<div class="releasegate__meter"><div class="releasegate__bar"></div></div>'
    result = failures(mutated, i18n_text)
    if not any('cosmetic checkbox/progress regression' in item for item in result):
        raise AssertionError('generic progress-bar mutation was not rejected')

    payload = json.loads(i18n_text)
    payload['source_blob_sha'] = '0' * 40
    result = failures(html, json.dumps(payload))
    if not any('stale source blob' in item for item in result):
        raise AssertionError('stale EN mirror mutation was not rejected')


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args()
    html = VISUAL.read_text(encoding='utf-8')
    i18n_text = I18N.read_text(encoding='utf-8')
    if args.self_test:
        self_test(html, i18n_text)
        print('PASS Security05 release-gate pedagogy mutation fixtures')
    result = failures(html, i18n_text)
    if result:
        for item in result:
            print(f'FAIL {item}')
        return 1
    print('PASS Security05 relationship-first release-gate source contract')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
