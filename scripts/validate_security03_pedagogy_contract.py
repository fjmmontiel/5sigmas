#!/usr/bin/env python3
"""Relationship-first source contract for Security03 persistence/revocation teaching."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VISUAL = ROOT / "docs/snippets/seguridad-ia/03-persistencia.html"
I18N = ROOT / "locales/en/snippets/seguridad-ia/03-persistencia.i18n.json"

REQUIRED = (
    'data-action="write"',
    'data-action="retrieve"',
    'data-action="revoke"',
    'data-action="invalidate"',
    'data-edge="derive-index"',
    'data-edge="derive-cache"',
    'data-edge="index-retrieve"',
    'data-edge="cache-retrieve"',
    'data-edge="decision-tool"',
    "const residual=s.index||s.cache",
    "const reaches=s.retrieved&&residual",
    "s={...s,row:false,revoked:true}",
    "s={...s,index:false,cache:false,retrieved:false}",
    "Borrar la fila original no prueba olvido",
    "La revocación solo es completa cuando esos derivados dejan de ser alcanzables",
)
FORBIDDEN = (
    'data-run',
    'memlife__timeline',
    'memlife__step is-active',
    "setInterval(()=>{n++",
    '▶ Reproducir ciclo',
)


def git_blob_sha(text: str) -> str:
    data = text.encode('utf-8')
    return hashlib.sha1(f"blob {len(data)}\0".encode() + data).hexdigest()


def failures(html: str, i18n_text: str) -> list[str]:
    out: list[str] = []
    for token in REQUIRED:
        if token not in html:
            out.append(f"security03:persistence: modeled-state token missing: {token}")
    for token in FORBIDDEN:
        if token in html:
            out.append(f"security03:persistence: highlight-timeline regression: {token}")
    try:
        payload = json.loads(i18n_text)
    except json.JSONDecodeError as exc:
        out.append(f"security03:persistence:i18n invalid JSON: {exc}")
        return out
    expected = git_blob_sha(html)
    if payload.get('source_blob_sha') != expected:
        out.append(f"security03:persistence:i18n stale source blob: expected {expected}, got {payload.get('source_blob_sha')}")
    required_en = (
        'Persistence creates copies; revocation must cut every path',
        'INCOMPLETE REVOCATION',
        'A future query reopens the path',
        'Source and derivatives were invalidated',
    )
    values = set(payload.get('replacements', {}).values())
    for token in required_en:
        if not any(token in value for value in values):
            out.append(f"security03:persistence:i18n required EN state text missing: {token}")
    return out


def self_test(html: str, i18n_text: str) -> None:
    current = failures(html, i18n_text)
    if current:
        raise AssertionError(f"positive current persistence fixture must pass: {current}")
    mutated = html.replace('data-edge="cache-retrieve"', 'data-edge="cache-decorative"', 1)
    if not any('cache-retrieve' in item for item in failures(mutated, i18n_text)):
        raise AssertionError('residual cache path mutation was not rejected')
    mutated = html + '<button data-run>▶ Reproducir ciclo</button>'
    if not any('highlight-timeline regression' in item for item in failures(mutated, i18n_text)):
        raise AssertionError('old playback-only timeline mutation was not rejected')
    payload = json.loads(i18n_text)
    payload['source_blob_sha'] = '0' * 40
    if not any('stale source blob' in item for item in failures(html, json.dumps(payload))):
        raise AssertionError('stale EN mirror mutation was not rejected')


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args()
    html = VISUAL.read_text(encoding='utf-8')
    i18n_text = I18N.read_text(encoding='utf-8')
    if args.self_test:
        self_test(html, i18n_text)
        print('PASS Security03 persistence pedagogy mutation fixtures')
    result = failures(html, i18n_text)
    if result:
        for item in result:
            print(f'FAIL {item}')
        return 1
    print('PASS Security03 persistence/revocation modeled-state contract')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
