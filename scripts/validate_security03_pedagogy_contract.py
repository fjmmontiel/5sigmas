#!/usr/bin/env python3
"""Relationship-first source contracts for Security03 persistence teaching visuals."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

VISUALS = {
    "persistence": (
        ROOT / "docs/snippets/seguridad-ia/03-persistencia.html",
        ROOT / "locales/en/snippets/seguridad-ia/03-persistencia.i18n.json",
    ),
    "runtime_vs_weights": (
        ROOT / "docs/snippets/seguridad-ia/03-runtime-vs-weights.html",
        ROOT / "locales/en/snippets/seguridad-ia/03-runtime-vs-weights.i18n.json",
    ),
    "propagation": (
        ROOT / "docs/snippets/seguridad-ia/03-propagation-map.html",
        ROOT / "locales/en/snippets/seguridad-ia/03-propagation-map.i18n.json",
    ),
}

REQUIRED = {
    "persistence": (
        'data-action="write"', 'data-action="retrieve"', 'data-action="revoke"', 'data-action="invalidate"',
        'data-edge="derive-index"', 'data-edge="derive-cache"', 'data-edge="index-retrieve"',
        'data-edge="cache-retrieve"', 'data-edge="decision-tool"',
        "const residual=s.index||s.cache,reaches=s.retrieved&&residual",
        "s={...s,row:false,revoked:true}", "s={...s,index:false,cache:false,retrieved:false}",
        "Borrar la fila original no prueba olvido",
        "La revocación solo es completa cuando esos derivados dejan de ser alcanzables",
    ),
    "runtime_vs_weights": (
        'data-scenario="runtime"', 'data-scenario="weights"',
        'data-intervention="clear-runtime"', 'data-intervention="swap-model"',
        'data-path="runtime"', 'data-path="weights"',
        "const reaches=scenario==='runtime'?runtime==='poisoned':weights==='sleeper'",
        "runtime='clean'", "weights='clean'",
        "La misma salida puede venir de dos persistencias distintas",
        "Aplica una intervención que corte un camino",
        "reiniciar la conversación pero rehidratar el mismo vector store",
    ),
    "propagation": (
        'data-action="propagate"', 'data-action="delete-origin"', 'data-action="invalidate"', 'data-action="reset"',
        'data-origin', 'data-derived="index"', 'data-derived="summary"', 'data-derived="cache"',
        'data-derived="checkpoint"', 'data-lineage',
        "const reachable=s.propagated&&s.derivatives", "origin:false", "derivatives:false",
        "Revocar exige cortar el grafo de linaje", "DERIVADO AÚN ALCANZA LA DECISIÓN", "Revocación incompleta:",
    ),
}

FORBIDDEN = {
    "persistence": ('data-run', 'memlife__timeline', 'memlife__step is-active', "setInterval(()=>{n++", '▶ Reproducir ciclo'),
    "runtime_vs_weights": ('data-focus="both"', 'data-focus="runtime"', 'data-focus="weights"', '.memlayers[data-focus="runtime"]', '.memlayers[data-focus="weights"]'),
    "propagation": ('is-propagated', 'is-revoking', '.memprop__node:nth-of-type(even)', 'data-action="revoke"'),
}

REQUIRED_EN = {
    "persistence": ("Persistence creates copies; revocation must cut every path", "INCOMPLETE REVOCATION", "A future query reopens the path", "Source and derivatives were invalidated"),
    "runtime_vs_weights": ("The same output can come from two different kinds of persistence", "Clear memory and derivatives", "Swap to clean weights", "CAUSAL PATH CUT", "Counterexample:"),
    "propagation": ("Revocation requires cutting the lineage graph", "Delete origin", "Invalidate lineage", "A DERIVATIVE STILL REACHES THE DECISION", "Incomplete revocation:"),
}


def git_blob_sha(text: str) -> str:
    data = text.encode("utf-8")
    return hashlib.sha1(f"blob {len(data)}\0".encode() + data).hexdigest()


def visual_failures(name: str, html: str, i18n_text: str) -> list[str]:
    out: list[str] = []
    for token in REQUIRED[name]:
        if token not in html:
            out.append(f"security03:{name}: modeled-state token missing: {token}")
    for token in FORBIDDEN[name]:
        if token in html:
            out.append(f"security03:{name}: cosmetic/highlight regression: {token}")
    try:
        payload = json.loads(i18n_text)
    except json.JSONDecodeError as exc:
        out.append(f"security03:{name}:i18n invalid JSON: {exc}")
        return out
    expected = git_blob_sha(html)
    if payload.get("source_blob_sha") != expected:
        out.append(f"security03:{name}:i18n stale source blob: expected {expected}, got {payload.get('source_blob_sha')}")
    values = tuple(str(value) for value in payload.get("replacements", {}).values())
    for token in REQUIRED_EN[name]:
        if not any(token in value for value in values):
            out.append(f"security03:{name}:i18n required EN state text missing: {token}")
    return out


def failures(texts: dict[str, tuple[str, str]]) -> list[str]:
    out: list[str] = []
    for name, (html, i18n) in texts.items():
        out.extend(visual_failures(name, html, i18n))
    return out


def load() -> dict[str, tuple[str, str]]:
    return {name: (visual.read_text(encoding="utf-8"), i18n.read_text(encoding="utf-8")) for name, (visual, i18n) in VISUALS.items()}


def self_test(texts: dict[str, tuple[str, str]]) -> None:
    current = failures(texts)
    if current:
        raise AssertionError(f"positive current Security03 fixtures must pass: {current}")
    persistence_html, persistence_i18n = texts["persistence"]
    mutated = dict(texts)
    mutated["persistence"] = (persistence_html.replace('data-edge="cache-retrieve"', 'data-edge="cache-decorative"', 1), persistence_i18n)
    if not any("cache-retrieve" in item for item in failures(mutated)):
        raise AssertionError("residual cache path mutation was not rejected")
    mutated = dict(texts)
    mutated["persistence"] = (
        persistence_html.replace(
            "const residual=s.index||s.cache,reaches=s.retrieved&&residual",
            "const residual=s.index||s.cache,reaches=s.retrieved",
            1,
        ),
        persistence_i18n,
    )
    if not any("retrieved&&residual" in item for item in failures(mutated)):
        raise AssertionError("persistence residual-reachability mutation was not rejected")
    runtime_html, runtime_i18n = texts["runtime_vs_weights"]
    mutated = dict(texts)
    mutated["runtime_vs_weights"] = (runtime_html.replace('data-intervention="swap-model"', 'data-intervention="highlight-model"', 1), runtime_i18n)
    if not any("swap-model" in item for item in failures(mutated)):
        raise AssertionError("runtime-vs-weights causal intervention mutation was not rejected")
    propagation_html, propagation_i18n = texts["propagation"]
    mutated = dict(texts)
    mutated["propagation"] = (propagation_html.replace("const reachable=s.propagated&&s.derivatives", "const reachable=s.propagated", 1), propagation_i18n)
    if not any("reachable" in item for item in failures(mutated)):
        raise AssertionError("propagation derivative-reachability mutation was not rejected")
    mutated = dict(texts)
    mutated["runtime_vs_weights"] = (runtime_html, json.dumps({**json.loads(runtime_i18n), "source_blob_sha": "0" * 40}))
    if not any("stale source blob" in item for item in failures(mutated)):
        raise AssertionError("stale EN mirror mutation was not rejected")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    texts = load()
    if args.self_test:
        self_test(texts)
        print("PASS Security03 relationship-first pedagogy mutation fixtures")
    result = failures(texts)
    if result:
        for item in result:
            print(f"FAIL {item}")
        return 1
    print("PASS Security03 persistence/runtime/propagation modeled-state contracts")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
