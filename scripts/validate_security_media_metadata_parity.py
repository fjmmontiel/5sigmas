#!/usr/bin/env python3
"""Fail-closed ES/EN reviewed-source parity for active Security requalification.

This gate is intentionally source-based. It checks the reviewed native video
metadata for Security00/01 and delegates reviewed Security00 material-claim
protection to ``validate_security_source_claims``. It does not certify binary
media, captions, transcripts, key moments, pixel quality or pedagogy.
"""
from __future__ import annotations

import argparse
import copy
import re
from pathlib import Path

import yaml

from validate_security_source_claims import (
    EN_PATH as SOURCE_CLAIM_EN_PATH,
    ES_PATH as SOURCE_CLAIM_ES_PATH,
    claim_failures as source_claim_failures,
    self_test as source_claim_self_test,
)

ROOT = Path(__file__).resolve().parents[1]
ES_ROOT = ROOT / "docs/series/seguridad-ia"
EN_MEDIA = ROOT / "locales/en/media.yml"

REVIEWED = {
    "00_presentacion_serie.md": {
        "es_title": "Seguridad en IA",
        "en_title": "AI Security",
        "es_summary": (
            "Cómo una entrada no confiable puede influir en un sistema con IA y qué "
            "fronteras de autorización limitan que esa influencia se convierta en una acción."
        ),
        "en_summary": (
            "How untrusted input can influence an AI system and which authorization "
            "boundaries limit whether that influence becomes an action."
        ),
    },
    "01-prompt-injection.md": {
        "es_title": "Prompt injection",
        "en_title": "Prompt Injection",
        "es_summary": (
            "Cómo una orden escondida en un documento puede entrar en un sistema con IA y "
            "qué controles separan la lectura de una acción."
        ),
        "en_summary": (
            "How an instruction hidden in a document can enter an AI system and which "
            "controls separate reading from action."
        ),
    },
}


def frontmatter(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    match = re.match(r"\A---\s*\n(.*?)\n---\s*(?:\n|$)", text, re.S)
    if not match:
        raise ValueError(f"frontmatter missing: {path}")
    data = yaml.safe_load(match.group(1)) or {}
    if not isinstance(data, dict):
        raise ValueError(f"frontmatter must be a mapping: {path}")
    return data


def load_contract() -> tuple[dict[str, dict], dict[str, dict]]:
    es = {name: frontmatter(ES_ROOT / name) for name in REVIEWED}
    en_all = yaml.safe_load(EN_MEDIA.read_text(encoding="utf-8")) or {}
    if not isinstance(en_all, dict):
        raise ValueError("locales/en/media.yml must be a mapping")
    en = {}
    for name in REVIEWED:
        key = f"series/seguridad-ia/{name}"
        entry = en_all.get(key)
        if not isinstance(entry, dict):
            raise ValueError(f"English media entry missing or invalid: {key}")
        en[name] = entry
    return es, en


def parity_failures(es: dict[str, dict], en: dict[str, dict]) -> list[str]:
    failures: list[str] = []
    for name, expected in REVIEWED.items():
        pairs = (
            ("es_title", es[name].get("video_title")),
            ("en_title", en[name].get("video_title")),
            ("es_summary", es[name].get("video_summary")),
            ("en_summary", en[name].get("video_summary")),
        )
        for field, actual in pairs:
            expected_value = expected[field]
            if str(actual or "").strip() != expected_value:
                failures.append(
                    f"{name}:{field}: expected reviewed metadata {expected_value!r}; got {actual!r}"
                )
    return failures


def load_source_claim_texts() -> tuple[str, str]:
    return (
        SOURCE_CLAIM_ES_PATH.read_text(encoding="utf-8"),
        SOURCE_CLAIM_EN_PATH.read_text(encoding="utf-8"),
    )


def self_test(es: dict[str, dict], en: dict[str, dict]) -> None:
    if parity_failures(es, en):
        raise AssertionError("positive source fixture must satisfy reviewed metadata parity contract")

    mutated = copy.deepcopy(en)
    mutated["00_presentacion_serie.md"]["video_summary"] = (
        "How an instruction hidden in a document can influence an AI system, how that risk "
        "can persist and which controls constrain actions."
    )
    failures = parity_failures(es, mutated)
    if not any("00_presentacion_serie.md:en_summary" in item for item in failures):
        raise AssertionError("stale Security00 EN summary mutation was not rejected")

    missing = copy.deepcopy(en)
    missing["01-prompt-injection.md"].pop("video_summary", None)
    failures = parity_failures(es, missing)
    if not any("01-prompt-injection.md:en_summary" in item for item in failures):
        raise AssertionError("missing EN summary mutation was not rejected")

    es_text, en_text = load_source_claim_texts()
    source_claim_self_test(es_text, en_text)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    es, en = load_contract()
    es_text, en_text = load_source_claim_texts()

    if args.self_test:
        self_test(es, en)
        print("SECURITY_MEDIA_METADATA_PARITY_SELF_TEST=PASS")
        print("SECURITY_SOURCE_CLAIMS_SELF_TEST=PASS")
        return 0

    failures = parity_failures(es, en)
    failures.extend(source_claim_failures(es_text, en_text))
    if failures:
        print("SECURITY_REVIEWED_SOURCE_PARITY=FAIL")
        for failure in failures:
            print(f"- {failure}")
        return 1

    print("SECURITY_MEDIA_METADATA_PARITY=PASS")
    print("SECURITY_SOURCE_CLAIMS=PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
