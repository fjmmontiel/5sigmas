"""
Hook: reading_time.py

Keeps the existing reading-time metadata calculation and, for the six
Evaluating AI Systems chapter visuals, emits a static mobile-native semantic
projection at build time. The detailed desktop SVG remains the desktop view;
at ~390 px the primary teaching surface is a compact relationship graph rather
than a 1180-1240 px horizontally-scrolled canvas.
"""
from __future__ import annotations

import html as html_lib
import re

WORDS_PER_MINUTE = 230
FRONT_MATTER_RE = re.compile(r"\A---\s*\n[\s\S]*?\n---\s*(?:\n|$)")

MOBILE_NATIVE_STYLE = r"""
<style data-series5-mobile-native-style="true">
  .s5v-mobile-native{display:none}
  @media (max-width:700px){
    .s5v-mobile-native{display:block;margin:.8rem 0 1rem}
    .s5v-mobile-native__flow{display:grid;gap:.55rem}
    .s5v-mobile-native__rel{display:grid;grid-template-columns:1.7rem minmax(0,1fr);gap:.55rem;align-items:start;padding:.72rem .78rem;border:1px solid color-mix(in srgb,currentColor 24%,transparent);border-radius:12px;background:color-mix(in srgb,var(--md-default-bg-color,#fff) 96%,currentColor 4%);font-size:.94rem;line-height:1.38;overflow-wrap:anywhere}
    .s5v-mobile-native__rel[data-kind="branch"]{border-style:dashed}
    .s5v-mobile-native__rel[data-kind="gate"]{border-width:2px}
    .s5v-mobile-native__rel[data-kind="loop"]{border-left-width:4px}
    .s5v-mobile-native__index{font-weight:800;text-align:center;opacity:.72}
    .s5v-mobile-native__rel strong{display:block;margin-bottom:.16rem;font-size:.98rem;line-height:1.25}
    .s5v-eval-boundary .s5v-eval-boundary__scroll,
    .s5v-eval-dataset .s5v-eval-dataset__scroll,
    .s5v-judge-calibration .jc-scroll,
    .s5v-agent-trajectory .at-scroll,
    .s5v-online-eval .oe-scroll,
    .s5v-eval-feedback .fb-scroll{display:none!important}
  }
</style>
"""

MOBILE_NATIVE_PROJECTIONS = {
    "s5v-eval-boundary": {
        "aria": {
            "es": "Relación móvil entre frontera diagnóstica, workflow, trayectoria y outcome",
            "en": "Mobile relationship among diagnostic boundary, workflow, trajectory, and outcome",
        },
        "rows": [
            ("change->diagnostic-boundary", "Cambio o riesgo", "Elige la frontera más estrecha que todavía observa el efecto.", "Change or risk", "Choose the narrowest boundary that still observes the effect.", "primary"),
            ("boundary->diagnose", "Diagnostica hacia dentro", "Modelo / componente → workflow → sistema para aislar el mecanismo.", "Diagnose inward", "Model / component → workflow → system to isolate the mechanism.", "branch"),
            ("trial->trajectory->outcome", "Trial end-to-end", "Task + environment → policy del workflow → trayectoria realizada → outcome.", "End-to-end trial", "Task + environment → workflow policy → realized trajectory → outcome.", "primary"),
            ("outcome->confirm", "Confirma hacia fuera", "Sube de frontera hasta donde vive el riesgo real del producto.", "Confirm outward", "Move outward to the boundary where real product risk lives.", "gate"),
        ],
    },
    "s5v-eval-dataset": {
        "aria": {
            "es": "Relación móvil del ciclo de vida de un eval set y sus riesgos de leakage",
            "en": "Mobile relationship for an eval-set lifecycle and leakage risks",
        },
        "rows": [
            ("sources->provenance->grouping", "Admisión", "Casos candidatos → provenance + elegibilidad → unidad de agrupación.", "Admission", "Candidate cases → provenance + eligibility → grouping unit.", "primary"),
            ("grouping->banks", "Split por grupo", "Dev | Regression | Holdout | Challenge tienen funciones y acceso distintos.", "Group-aware split", "Dev | Regression | Holdout | Challenge have different roles and access policies.", "branch"),
            ("banks->release", "Release congelada", "Los items admitidos → manifest + hash de una versión comparable.", "Frozen release", "Admitted items → manifest + hash for a comparable version.", "gate"),
            ("hard-pair->boundary", "Hard pair", "Positive ↔ negative cruza una condición intencional manteniendo el resto estable.", "Hard pair", "Positive ↔ negative crosses one intended condition while holding the rest stable.", "branch"),
            ("leakage->trust", "Leakage / exposure", "Training, cross-split, development y temporal leakage degradan o invalidan la evidencia.", "Leakage / exposure", "Training, cross-split, development, and temporal leakage degrade or invalidate evidence.", "gate"),
            ("production-failure->next-version", "Siguiente versión", "Un fallo de producción alimenta la próxima release; no muta la release congelada.", "Next version", "A production failure feeds the next release; it does not mutate the frozen release.", "loop"),
        ],
    },
    "s5v-judge-calibration": {
        "aria": {
            "es": "Relación móvil de calibración, sesgo, acuerdo y alcance de un judge",
            "en": "Mobile relationship for judge calibration, bias, agreement, and scope",
        },
        "rows": [
            ("construct->rubric->calibration->judge", "Define y congela", "Constructo → rúbrica → banco de calibración → versión concreta del judge.", "Define and freeze", "Construct → rubric → calibration bank → concrete judge version.", "primary"),
            ("item->blind->independent-ratings", "Observaciones independientes", "Validation item → blind/randomize → humanos independientes || LLM judge × R.", "Independent observations", "Validation item → blind/randomize → independent humans || LLM judge × R.", "branch"),
            ("probes->llm", "Pruebas de sesgo", "Position swap, style control y family cross estresan la misma versión congelada.", "Bias probes", "Position swap, style control, and family cross stress the same frozen version.", "branch"),
            ("labels->diagnostics", "Diagnósticos", "Labels brutos → acuerdo, confusión, kappa, varianza y swap consistency.", "Diagnostics", "Raw labels → agreement, confusion, kappa, variance, and swap consistency.", "primary"),
            ("diagnostics->scope", "Decisión de alcance", "Accept / restrict / reject → juez automático o fallback humano.", "Scope decision", "Accept / restrict / reject → automatic judge or human fallback.", "gate"),
        ],
    },
    "s5v-agent-trajectory": {
        "aria": {
            "es": "Relación móvil entre trayectoria del agente, recuperación, outcome y release gate",
            "en": "Mobile relationship among agent trajectory, recovery, outcome, and release gate",
        },
        "rows": [
            ("task->observation->decision", "Ejecución", "Task + policy + estado → observación → decisión.", "Execution", "Task + policy + state → observation → decision.", "primary"),
            ("decision->policy-gate", "Antes del side effect", "Decisión → gate de precondiciones → DENY/escalate o tool call autorizado.", "Before the side effect", "Decision → precondition gate → DENY/escalate or authorized tool call.", "gate"),
            ("tool-result->state-or-failure", "Resultado de tool", "Tool call → result → state update o clasificación de fallo.", "Tool result", "Tool call → result → state update or failure classification.", "branch"),
            ("failure->recovery", "Recuperación", "Fallo → reconciliar estado → retry / cancel / fallback.", "Recovery", "Failure → reconcile state → retry / cancel / fallback.", "loop"),
            ("state->stop->outcome", "Terminar correctamente", "State update → nueva observación o stop condition → outcome.", "Stop correctly", "State update → next observation or stop condition → outcome.", "primary"),
            ("trajectory+outcome->release", "Dos verificadores", "Trajectory verifier + outcome verifier → release gate; policy hard-fail no se compensa con éxito.", "Two verifiers", "Trajectory verifier + outcome verifier → release gate; a hard policy failure cannot be offset by success.", "gate"),
        ],
    },
    "s5v-online-eval": {
        "aria": {
            "es": "Relación móvil entre shadow, canary, A/B, guardrails y decisión de release",
            "en": "Mobile relationship among shadow, canary, A/B, guardrails, and release decision",
        },
        "rows": [
            ("candidate->offline->shadow", "Sin autoridad de respuesta", "Candidate → offline gate → shadow; copia tráfico pero no sirve su output.", "No response authority", "Candidate → offline gate → shadow; it copies traffic but does not serve its output.", "primary"),
            ("shadow->canary", "Exposición real limitada", "Shadow → canary cuando ya puedes conceder un blast radius pequeño.", "Limited real exposure", "Shadow → canary when a small real blast radius is acceptable.", "primary"),
            ("canary->ab->rollout", "Causalidad cuando hace falta", "Canary → A/B randomizado si necesitas efecto causal → rollout progresivo.", "Causality when needed", "Canary → randomized A/B when causal effect is needed → progressive rollout.", "branch"),
            ("evidence+guardrails->gate", "Compón evidencia y riesgo", "Shadow + canary + A/B + hard guardrails → regression / release gate.", "Combine evidence and risk", "Shadow + canary + A/B + hard guardrails → regression / release gate.", "gate"),
            ("gate->decision", "Decisión", "FAIL → rollback/abort | inconclusive → pause/review | PASS → promote.", "Decision", "FAIL → rollback/abort | inconclusive → pause/review | PASS → promote.", "branch"),
        ],
    },
    "s5v-eval-feedback": {
        "aria": {
            "es": "Relación móvil del feedback loop desde producción hasta eval, reparación y verificación",
            "en": "Mobile relationship for the feedback loop from production to eval, repair, and verification",
        },
        "rows": [
            ("signals->reconstruct->taxonomy", "Observa y diagnostica", "Señales live → reconstruir trace/estado → taxonomía de fallo.", "Observe and diagnose", "Live signals → reconstruct trace/state → failure taxonomy.", "primary"),
            ("insufficient->instrumentation->signals", "Si falta evidencia", "NO suficiente → mejorar instrumentación → volver a señales; no inventar root cause.", "If evidence is insufficient", "Not enough → improve instrumentation → return to signals; do not invent a root cause.", "loop"),
            ("reproducible->eval", "Si el mecanismo es reproducible", "Minimizar/redactar → dedupe/generalizar → eval versionado + verifier.", "If the mechanism is reproducible", "Minimize/redact → dedupe/generalize → versioned eval + verifier.", "branch"),
            ("eval->repair->release", "Repara y valida", "Eval → repair → regression gate → shadow/canary → deploy.", "Repair and validate", "Eval → repair → regression gate → shadow/canary → deploy.", "primary"),
            ("deploy->verify->signals", "Cierra el loop", "Deploy → verificar producción → señales; sólo aquí compruebas recurrencia real.", "Close the loop", "Deploy → verify production → signals; only here do you check real recurrence.", "loop"),
            ("failure+eval+release->receipts", "Conserva provenance", "Failure receipt → eval receipt → release receipt preservan la identidad de la evidencia.", "Preserve provenance", "Failure receipt → eval receipt → release receipt preserve evidence identity.", "gate"),
        ],
    },
}


def _content_language(config) -> str:
    try:
        extra = config.get("extra") or {}
        language = extra.get("content_language") or extra.get("locale_code")
        if language:
            return "en" if str(language).lower().startswith("en") else "es"
    except Exception:
        pass
    try:
        theme = config.get("theme")
        language = theme.get("language") if hasattr(theme, "get") else None
        if language:
            return "en" if str(language).lower().startswith("en") else "es"
    except Exception:
        pass
    return "es"


def _projection_markup(spec: dict, language: str) -> str:
    aria = html_lib.escape(spec["aria"][language], quote=True)
    rows = []
    for index, (relationship, title_es, body_es, title_en, body_en, kind) in enumerate(spec["rows"], start=1):
        title = title_en if language == "en" else title_es
        body = body_en if language == "en" else body_es
        rows.append(
            f'<div class="s5v-mobile-native__rel" data-mobile-relationship="{html_lib.escape(relationship, quote=True)}" data-kind="{kind}">'
            f'<span class="s5v-mobile-native__index" aria-hidden="true">{index}</span>'
            f'<span><strong>{html_lib.escape(title)}</strong>{html_lib.escape(body)}</span>'
            '</div>'
        )
    return (
        f'<div class="s5v-mobile-native" data-mobile-native="true" role="group" aria-label="{aria}">'
        f'<div class="s5v-mobile-native__flow'>{"".join(rows)}</div>'
        '</div>'
    )


def _inject_mobile_native(html: str, config, *, final_document: bool) -> tuple[str, bool]:
    """Inject Series 5 mobile projections after the visual HTML is actually present.

    Macros expand include_html snippets after the page-content hook in the current build
    pipeline, so on_page_content is only an early opportunity. on_post_page calls this
    same idempotent transform against the fully rendered document and is the authoritative
    backstop for the final HTML delivered to users and audited by Playwright.
    """
    language = _content_language(config)
    changed = False
    for section_class, spec in MOBILE_NATIVE_PROJECTIONS.items():
        marker = f'class="{section_class}'
        section_start = html.find(marker)
        if section_start < 0:
            continue
        section_end = html.find('</section>', section_start)
        if section_end < 0:
            section_end = len(html)
        if 'data-mobile-native="true"' in html[section_start:section_end]:
            continue
        header_end = html.find('</header>', section_start, section_end)
        if header_end < 0:
            continue
        insert_at = header_end + len('</header>')
        html = html[:insert_at] + _projection_markup(spec, language) + html[insert_at:]
        changed = True

    if changed:
        html = re.sub(
            r'mobile="horizontal-scroll-[^"]+"',
            'mobile="native-390px-semantic-projection;desktop-detail-hidden-on-mobile"',
            html,
        )
        if 'data-series5-mobile-native-style="true"' not in html:
            if final_document and '</head>' in html:
                html = html.replace('</head>', MOBILE_NATIVE_STYLE + '</head>', 1)
            else:
                html = MOBILE_NATIVE_STYLE + html
    return html, changed


def on_page_markdown(markdown, page, **kwargs):
    raw_source = getattr(page.file, "content_string", None)
    text = raw_source if isinstance(raw_source, str) and raw_source else markdown
    text = FRONT_MATTER_RE.sub("", text, count=1)
    text = re.sub(r'<details[\s\S]*?</details>', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\{\{[^}]+\}\}', '', text)
    text = re.sub(r'```[\s\S]*?```', '', text)
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    words = len(text.split())
    page.meta['reading_time'] = max(1, round(words / WORDS_PER_MINUTE))


def on_page_content(html, page, config, **kwargs):
    html, _ = _inject_mobile_native(html, config, final_document=False)
    return html


def on_post_page(output, page, config, **kwargs):
    output, _ = _inject_mobile_native(output, config, final_document=True)
    return output
