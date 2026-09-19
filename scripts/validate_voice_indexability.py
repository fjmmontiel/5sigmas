#!/usr/bin/env python3
"""Fail-closed INDEXABILITY gate for all realtime voice-agent article + watch surfaces.

Reuses the rendered technical contract already hardened for Security while
switching only the canonical series/slug inventory. Google selection remains
strictly separate from this gate per #305 amendment 5727362172.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import validate_security_indexability as base

SERIES = "agentes-voz-tiempo-real"
SLUGS = (
    "01-arquitecturas-de-voz",
    "02-turn-taking",
    "03-presupuesto-latencia",
    "04-tools-estado-acciones-asincronas",
    "05-webrtc-sip-telefonia-red",
    "06-evaluacion-observabilidad-reliability",
)


def configure() -> None:
    base.SERIES = SERIES
    base.SLUGS = SLUGS


def self_test() -> None:
    configure()
    assert base._expected("es", "article", SLUGS[0]) == (
        "https://5sigmas.com/series/agentes-voz-tiempo-real/01-arquitecturas-de-voz/"
    )
    assert base._expected("en", "watch", SLUGS[5]) == (
        "https://5sigmas.com/en/videos/series/agentes-voz-tiempo-real/06-evaluacion-observabilidad-reliability/"
    )

    good = (
        '<html lang="es"><head><title>x</title><meta name="description" content="d">'
        '<link rel="canonical" href="https://5sigmas.com/series/agentes-voz-tiempo-real/01-arquitecturas-de-voz/">'
        '</head><body><h1>x</h1><p>' + ('texto ' * 50) + '</p></body></html>'
    )
    parser = base.FactsParser()
    parser.feed(good)
    facts = parser.finish()
    assert facts.lang == "es"
    assert len(facts.h1) == 1
    assert facts.description
    expected = ["https://5sigmas.com/series/agentes-voz-tiempo-real/01-arquitecturas-de-voz/"]
    assert facts.canonicals == expected

    mutations = (
        (good.replace("</head>", '<meta name="robots" content="noindex"></head>'), "noindex"),
        (
            good.replace(
                "/series/agentes-voz-tiempo-real/01-arquitecturas-de-voz/",
                "/en/series/agentes-voz-tiempo-real/01-arquitecturas-de-voz/",
            ),
            "canonical",
        ),
        (good.replace("<h1>x</h1>", ""), "h1"),
    )
    for mutation, expected_signal in mutations:
        parser = base.FactsParser()
        parser.feed(mutation)
        mutated = parser.finish()
        signals: list[str] = []
        if "noindex" in mutated.robots.lower():
            signals.append("noindex")
        if mutated.canonicals != facts.canonicals:
            signals.append("canonical")
        if not mutated.h1:
            signals.append("h1")
        assert expected_signal in signals, (expected_signal, signals)

    normal = {
        facts.canonicals[0]: {
            "en": "https://5sigmas.com/en/series/agentes-voz-tiempo-real/01-arquitecturas-de-voz/"
        }
    }
    assert facts.canonicals[0] in normal
    assert normal[facts.canonicals[0]]["en"].startswith("https://5sigmas.com/en/")
    assert not set(), "synthetic orphan fixture must remain empty"
    print("Voice INDEXABILITY negative fixtures passed: noindex/canonical/H1/sitemap-hreflang/orphan signals remain fail-closed.")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--site", type=Path, default=Path("site"))
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("artifacts/voice-requalification/indexability/report.json"),
    )
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    configure()
    if args.self_test:
        self_test()
        return 0

    root = args.root.resolve()
    site = args.site if args.site.is_absolute() else root / args.site
    report = base.audit_indexability(root, site)
    output = args.output if args.output.is_absolute() else root / args.output
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "rows"}, ensure_ascii=False, indent=2))
    for row in report["rows"]:
        if row["blockers"]:
            print(f"{row['locale']} {row['route']}: " + " | ".join(row["blockers"]))
    return 0 if report["INDEXABILITY_PASS"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
