#!/usr/bin/env python3
"""Audit the bilingual SEO/GEO shell for every published interactive tool.

This is a source/build contract, not a Search Console collector. It inventories the
published ES/EN tool pairs from tools/locale-en.yml, verifies durable structural and
content-quality requirements, preserves protected experiment ownership, and emits a
machine-readable report for the tools-quality workflow.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
PAIR_RE = re.compile(
    r"- canonical:\s*([^\n]+\.md)\s*\n\s*localized:\s*([^\n]+\.md)"
)
JSONLD_RE = re.compile(
    r'<script\s+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
    re.IGNORECASE | re.DOTALL,
)
H1_RE = re.compile(r"<h1\b[^>]*>.*?</h1>", re.IGNORECASE | re.DOTALL)
TAG_RE = re.compile(r"<[^>]+>")
EXTERNAL_LINK_RE = re.compile(r'href=["\']https?://(?!5sigmas\.com)[^"\']+["\']', re.IGNORECASE)
CONTEXTUAL_HTML_LINK_RE = re.compile(
    r'href=["\']/(?:en/)?(?:herramientas|tools|temas|topics|series|articulos-tecnicos|engineering|videos?)/[^"\']+["\']',
    re.IGNORECASE,
)
CONTEXTUAL_MD_LINK_RE = re.compile(
    r'\]\(/(?:en/)?(?:herramientas|tools|temas|topics|series|articulos-tecnicos|engineering|videos?)/[^)]+\)',
    re.IGNORECASE,
)
DATE_RE = re.compile(r"\b(?:20\d{2}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]20\d{2})\b")
NUMERIC_CONTROL_RE = re.compile(
    r'<input\b[^>]*\btype=["\'](?:number|range)["\'][^>]*>',
    re.IGNORECASE,
)
METHOD_CLASS_RE = re.compile(r'class=["\'][^"\']*method[^"\']*["\']', re.IGNORECASE)

PROTECTED: dict[str, str] = {
    "herramientas/ecosistema-global-ia.md": "PR #302 AWAITING_RECRAWL",
    "herramientas/precio-rendimiento-modelos.md": "active PR #323 / measurement ownership",
}

VOLATILE = {
    "herramientas/coste-latencia-llm.md",
    "herramientas/precio-rendimiento-modelos.md",
    "herramientas/linea-temporal-capacidades-modelos.md",
    "herramientas/ecosistema-global-ia.md",
}

VOLATILE_PROVENANCE_FILES: dict[str, str] = {
    "herramientas/coste-latencia-llm.md": "docs/assets/data/tools/llm-pricing.json",
    "herramientas/precio-rendimiento-modelos.md": "docs/assets/data/tools/model-price-performance.json",
}

TESTS: dict[str, tuple[str, str]] = {
    "coste-latencia-llm": ("test_llm_cost_latency_tool.mjs", "validate_llm_cost_latency_tool.mjs"),
    "precio-rendimiento-modelos": ("test_model_price_performance_tool.mjs", "validate_model_price_performance_tool.mjs"),
    "vram-inferencia": ("test_inference_vram_tool.mjs", "validate_inference_vram_tool.mjs"),
    "kv-cache-contexto": ("test_kv_context_tool.mjs", "validate_kv_context_tool.mjs"),
    "atencion-transformer": ("test_transformer_attention_tool.mjs", "validate_transformer_attention_tool.mjs"),
    "presupuesto-contexto": ("test_context_budget_tool.mjs", "validate_context_budget_tool.mjs"),
    "laboratorio-recuperacion-rag": ("test_rag_retrieval_tool.mjs", "validate_rag_retrieval_tool.mjs"),
    "evaluacion-rag": ("test_rag_evaluation_tool.mjs", "validate_rag_evaluation_tool.mjs"),
    "latencia-agente-voz": ("test_voice_latency_tool.mjs", "validate_voice_latency_tool.mjs"),
    "coste-capacidad-agente-voz": ("test_voice_cost_capacity_tool.mjs", "validate_voice_cost_capacity_tool.mjs"),
    "fiabilidad-evaluacion-agentes": ("test_agent_reliability_tool.mjs", "validate_agent_reliability_tool.mjs"),
    "amenazas-prompt-injection": ("test_prompt_injection_tool.mjs", "validate_prompt_injection_tool.mjs"),
    "fiabilidad-benchmarks": ("test_benchmark_reliability_tool.mjs", "validate_benchmark_reliability_tool.mjs"),
    "linea-temporal-capacidades-modelos": ("test_model_capability_timeline_tool.mjs", "validate_model_capability_timeline_tool.mjs"),
    "leyes-escalado": ("test_scaling_laws_tool.mjs", "validate_scaling_laws_tool.mjs"),
    "computo-energia-entrenamiento": ("test_training_compute_energy_tool.mjs", "validate_training_compute_energy_tool.mjs"),
    "capacidad-datacenter-ia": ("test_datacenter_ai_capacity_tool.mjs", "validate_datacenter_ai_capacity_tool.mjs"),
    "ecosistema-global-ia": ("test_global_ai_ecosystem_tool.mjs", "validate_global_ai_ecosystem_tool.mjs"),
}


def _frontmatter(text: str) -> dict[str, str]:
    if not text.startswith("---\n"):
        return {}
    end = text.find("\n---\n", 4)
    if end < 0:
        return {}
    result: dict[str, str] = {}
    for line in text[4:end].splitlines():
        if ":" not in line or line.startswith((" ", "\t")):
            continue
        key, value = line.split(":", 1)
        result[key.strip()] = value.strip().strip('"\'')
    return result


def _has_web_application_schema(text: str) -> bool:
    for raw in JSONLD_RE.findall(text):
        try:
            payload = json.loads(raw.strip())
        except json.JSONDecodeError:
            continue
        nodes = payload if isinstance(payload, list) else [payload]
        for node in nodes:
            if not isinstance(node, dict):
                continue
            kind = node.get("@type")
            if kind == "WebApplication" or (isinstance(kind, list) and "WebApplication" in kind):
                return True
    return False


def _source_signals(text: str) -> dict[str, bool | int]:
    lower = text.lower()
    visible = TAG_RE.sub(" ", text)
    visible = re.sub(r"\s+", " ", visible).strip()
    controls = bool(re.search(r"<(?:input|select|textarea)\b", text, re.IGNORECASE))
    numeric_controls = bool(NUMERIC_CONTROL_RE.search(text))
    defaults = bool(re.search(r'\bvalue=["\'][^"\']+["\']|<option\b', text, re.IGNORECASE))
    method = bool(
        "s5-tool-method" in lower
        or METHOD_CLASS_RE.search(text)
        or re.search(r">\s*(?:método|method|metodología|methodology)\s*<", lower)
        or "qué calcula" in lower
        or "how it works" in lower
    )
    assumptions = bool(
        numeric_controls
        and re.search(
            r"supuest|assumpt|unidad|units?|tokens?|\bms\b|\busd\b|\bkw\b|\bmw\b|\bgb\b|\bgib\b|bits?|%|billion|millones?",
            lower,
        )
    )
    limits = bool(
        re.search(
            r"\blímit|\blimit|caveat|no sustituye|no incluye|does not replace|does not include|"
            r"uncertaint|incertidumbr|descriptiv|incomplet|partial|not a profiler|not a benchmark|"
            r"not a probability|no (?:predice|modela|garantiza)|does not (?:predict|model|guarantee)|"
            r"do not interpret|no interpretes|supone una|assumes (?:a|the)",
            lower,
        )
    )
    provenance = bool(
        EXTERNAL_LINK_RE.search(text)
        or "s5-tool-source" in lower
        or "procedencia" in lower
        or "provenance" in lower
    )
    contextual_links = len(CONTEXTUAL_HTML_LINK_RE.findall(text)) + len(CONTEXTUAL_MD_LINK_RE.findall(text))
    share = bool(re.search(r'data-action=["\'](?:share|copy)["\']', text, re.IGNORECASE))
    export = bool(re.search(r'data-action=["\'](?:export|csv|json)["\']', text, re.IGNORECASE))
    return {
        "h1": len(H1_RE.findall(text)) == 1,
        "interactive_controls": controls,
        "numeric_assumptions_applicable": numeric_controls,
        "default_or_example_state": defaults or share or export,
        "methodology": method,
        "assumptions_or_units": assumptions,
        "limits_or_caveats": limits,
        "primary_source_or_provenance": provenance,
        "contextual_internal_links": contextual_links,
        "share": share,
        "export": export,
        "static_explanation_chars": len(visible),
        "dated_source_signal": bool(DATE_RE.search(text)),
    }


def _llms_has(llms_text: str, route: str) -> bool:
    return f"https://5sigmas.com/{route}/index.html.md" in llms_text


def _audit_locale(
    path: Path,
    *,
    route: str,
    llms_text: str,
    test_script: Path,
    browser_script: Path,
    extra_dated_source_signal: bool = False,
) -> dict[str, Any]:
    if not path.is_file():
        return {"source": str(path), "missing": True}
    text = path.read_text(encoding="utf-8")
    fm = _frontmatter(text)
    signals = _source_signals(text)
    signals["dated_source_signal"] = bool(signals["dated_source_signal"] or extra_dated_source_signal)
    return {
        "source": str(path),
        "missing": False,
        "title": bool(fm.get("title")),
        "description": bool(fm.get("description")),
        "web_application_schema": _has_web_application_schema(text),
        "tool_page_shell": "s5-tool-page" in text,
        "llms_markdown_surface": _llms_has(llms_text, route),
        "deterministic_test": test_script.is_file(),
        "browser_validation": browser_script.is_file(),
        **signals,
    }


def _shared_dated_provenance(repo_root: Path, canonical: str) -> bool:
    relative = VOLATILE_PROVENANCE_FILES.get(canonical)
    if not relative:
        return False
    path = repo_root / relative
    if not path.is_file():
        return False
    return bool(DATE_RE.search(path.read_text(encoding="utf-8")))


def _check_states(row: dict[str, Any], *, volatile_data: bool = False) -> dict[str, str]:
    required = (
        "title",
        "description",
        "h1",
        "web_application_schema",
        "tool_page_shell",
        "interactive_controls",
        "default_or_example_state",
        "methodology",
        "limits_or_caveats",
        "primary_source_or_provenance",
        "llms_markdown_surface",
        "deterministic_test",
        "browser_validation",
    )
    states = {key: ("PASS" if row.get(key) else "FAIL") for key in required}
    states["assumptions_or_units"] = (
        "PASS"
        if row.get("numeric_assumptions_applicable") and row.get("assumptions_or_units")
        else "FAIL"
        if row.get("numeric_assumptions_applicable")
        else "N/A"
    )
    states["contextual_internal_links"] = "PASS" if int(row.get("contextual_internal_links") or 0) >= 1 else "FAIL"
    states["indexable_static_explanation"] = "PASS" if int(row.get("static_explanation_chars") or 0) >= 900 else "FAIL"
    states["dated_primary_source_provenance"] = (
        "PASS" if row.get("dated_source_signal") else "FAIL"
    ) if volatile_data else "N/A"
    return states


def _quality_gaps(row: dict[str, Any], *, volatile_data: bool = False) -> list[str]:
    return [key for key, state in _check_states(row, volatile_data=volatile_data).items() if state == "FAIL"]


def audit(repo_root: Path = ROOT) -> tuple[dict[str, Any], list[str]]:
    mapping = (repo_root / "tools" / "locale-en.yml").read_text(encoding="utf-8")
    pairs = [(a.strip(), b.strip()) for a, b in PAIR_RE.findall(mapping) if not a.endswith("/index.md")]
    es_llms = (repo_root / "docs" / "llms.txt").read_text(encoding="utf-8")
    en_llms = (repo_root / "locales" / "en" / "llms.txt").read_text(encoding="utf-8")

    failures: list[str] = []
    if len(pairs) != 18:
        failures.append(f"published tool mapping count is {len(pairs)}, expected 18")

    tools: list[dict[str, Any]] = []
    for canonical, localized in pairs:
        slug = Path(canonical).stem
        scripts = TESTS.get(slug)
        if scripts is None:
            failures.append(f"{canonical}: deterministic/browser test mapping missing")
            scripts = ("__missing__", "__missing__")
        test_script = repo_root / "scripts" / scripts[0]
        browser_script = repo_root / "scripts" / scripts[1]
        es_route = canonical.removesuffix(".md")
        en_route = f"en/{localized.removesuffix('.md')}"
        volatile_data = canonical in VOLATILE
        shared_dated_provenance = _shared_dated_provenance(repo_root, canonical)
        es = _audit_locale(
            repo_root / "docs" / canonical,
            route=es_route,
            llms_text=es_llms,
            test_script=test_script,
            browser_script=browser_script,
            extra_dated_source_signal=shared_dated_provenance,
        )
        en = _audit_locale(
            repo_root / "locales" / "en" / localized,
            route=en_route,
            llms_text=en_llms,
            test_script=test_script,
            browser_script=browser_script,
            extra_dated_source_signal=shared_dated_provenance,
        )
        es_states = _check_states(es, volatile_data=volatile_data) if not es.get("missing") else {"source": "FAIL"}
        en_states = _check_states(en, volatile_data=volatile_data) if not en.get("missing") else {"source": "FAIL"}
        es_gaps = [key for key, state in es_states.items() if state == "FAIL"]
        en_gaps = [key for key, state in en_states.items() if state == "FAIL"]
        protected_reason = PROTECTED.get(canonical)
        status = "PASS"
        if es_gaps or en_gaps:
            status = "PROTECTED_REVIEW" if protected_reason else "FAIL"
        row = {
            "canonical": canonical,
            "localized": localized,
            "protected": protected_reason,
            "volatile_data": volatile_data,
            "status": status,
            "es": es,
            "en": en,
            "checks": {"es": es_states, "en": en_states},
            "gaps": {"es": es_gaps, "en": en_gaps},
            "capabilities": {
                "share": bool(es.get("share") and en.get("share")),
                "export": bool(es.get("export") and en.get("export")),
                "dated_source_signal": bool(es.get("dated_source_signal") and en.get("dated_source_signal")),
            },
        }
        tools.append(row)
        if status == "FAIL":
            failures.append(f"{canonical}: ES gaps={es_gaps}; EN gaps={en_gaps}")

    report = {
        "contract_version": 2,
        "published_tool_pairs": len(pairs),
        "summary": {
            "pass": sum(row["status"] == "PASS" for row in tools),
            "fail": sum(row["status"] == "FAIL" for row in tools),
            "protected_review": sum(row["status"] == "PROTECTED_REVIEW" for row in tools),
            "with_share": sum(row["capabilities"]["share"] for row in tools),
            "with_export": sum(row["capabilities"]["export"] for row in tools),
            "volatile_with_dated_source_signal": sum(
                row["volatile_data"] and row["capabilities"]["dated_source_signal"] for row in tools
            ),
            "volatile_total": sum(row["volatile_data"] for row in tools),
            "not_applicable_checks": sum(
                state == "N/A"
                for row in tools
                for locale in ("es", "en")
                for state in row["checks"][locale].values()
            ),
        },
        "tools": tools,
        "policy": {
            "protected_surfaces": PROTECTED,
            "share_export_are_capabilities_not_blanket_requirements": True,
            "numeric_assumptions_units_are_applicability_gated": True,
            "qualitative_select_checkbox_tools_may_report_assumptions_or_units_as_na": True,
            "volatile_tools_require_dated_source_signal": True,
            "dated_provenance_may_live_in_shared_runtime_data_assets": True,
            "contextual_links_include_related_tools_topics_series_engineering_and_video": True,
            "rendered_canonical_hreflang_sitemap_mobile_accessibility": "covered by existing tools-quality build/crawl/browser gates",
        },
    }
    return report, failures


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, default=ROOT)
    parser.add_argument("--output", type=Path, default=Path("seo-audit/tool-seo-geo-shell.json"))
    args = parser.parse_args()

    report, failures = audit(args.repo_root.resolve())
    output = args.output if args.output.is_absolute() else args.repo_root / args.output
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    summary = report["summary"]
    print(
        "Tool SEO/GEO shell: "
        f"pairs={report['published_tool_pairs']}; pass={summary['pass']}; "
        f"fail={summary['fail']}; protected_review={summary['protected_review']}; "
        f"share={summary['with_share']}; export={summary['with_export']}; "
        f"n/a checks={summary['not_applicable_checks']}."
    )
    for failure in failures:
        print(f"FAIL: {failure}")
    print(f"Machine-readable report: {output}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
