from pathlib import Path

ARTICLE_PATCHES = {
    Path("docs/series/agentes-voz-tiempo-real/06-evaluacion-observabilidad-reliability.md"): [
        (
            """Para errores, un `FrameProcessor` dispara `on_error` antes de propagar `ErrorFrame` upstream. El frame expone mensaje, excepción opcional, `fatal` y el processor de origen. En la API actual, `fatal=True` indica un error no recuperable que cancela el pipeline; `fatal=False` permite que la aplicación capture el error y aplique una estrategia como failover sin forzar ese shutdown.[^pipecat-errors]\n\nEstas primitives permiten un ledger detallado del pipeline. No conviertas sus nombres en tu única taxonomía de producto. `fatal=False` no demuestra que el turno haya salido bien: sólo evita que ese error obligue a terminar el pipeline. No dice por sí solo si una reserva quedó creada, si existió recovery en otra capa o si el usuario oyó audio parcial.""",
            """Para errores, un `FrameProcessor` dispara `on_error` antes de propagar `ErrorFrame` upstream. El frame expone mensaje, excepción opcional, `category` y el `processor` de origen; en la API actual, `processor.is_usable` refleja si ese processor puede seguir haciendo su trabajo. Pipecat separa así el estado del componente de la decisión sobre la vida del pipeline.[^pipecat-events][^pipecat-errors]\n\n`ErrorFrame.fatal`, `push_error(..., fatal=...)` y `FatalErrorFrame` están deprecados y la documentación indica que se eliminarán en 2.0.0. `fatal=True` todavía cancela el pipeline por compatibilidad, pero el modelo actual recomendado es marcar el processor como no usable y dejar que `PipelineWorker` aplique `ProcessorUnusablePolicy`: `CONTINUE` (default), `END` o `CANCEL`. Un `ServiceSwitcher` puede usar ese estado para failover.[^pipecat-errors]\n\nEstas primitives permiten un ledger detallado del pipeline. No conviertas sus nombres en tu única taxonomía de producto. Que `processor.is_usable` siga siendo `True` no demuestra que el turno haya salido bien, y `CONTINUE` tampoco significa éxito: sólo describe que el framework puede seguir ejecutando. No dice por sí solo si una reserva quedó creada, si existió recovery en otra capa o si el usuario oyó audio parcial.""",
        ),
        (
            "[^pipecat-errors]: Pipecat, [FrameProcessor Events — Error Handling](https://docs.pipecat.ai/api-reference/server/events/frame-processor-events).",
            "[^pipecat-events]: Pipecat, [FrameProcessor Events](https://docs.pipecat.ai/api-reference/server/events/frame-processor-events).\n[^pipecat-errors]: Pipecat, [Error Handling](https://docs.pipecat.ai/pipecat/fundamentals/error-handling).",
        ),
        ("date_modified: 2026-09-10", "date_modified: 2026-09-11"),
    ],
    Path("locales/en/series/agentes-voz-tiempo-real/06-evaluacion-observabilidad-reliability.md"): [
        (
            """For errors, a `FrameProcessor` fires `on_error` before an `ErrorFrame` is propagated upstream. The frame carries the error string, optional exception, `fatal`, and source processor. In the current API, `fatal=True` marks an unrecoverable error that cancels the pipeline; `fatal=False` lets application code handle the error and apply a strategy such as failover without forcing that shutdown.[^pipecat-errors]\n\nThese primitives can support a detailed pipeline ledger. They should not become the entire product taxonomy. `fatal=False` does not prove that the turn succeeded: it only means this error does not force pipeline termination. It does not tell you whether a booking was committed, whether another layer recovered, or whether the caller heard partial audio.""",
            """For errors, a `FrameProcessor` fires `on_error` before an `ErrorFrame` is propagated upstream. The frame carries the error string, optional exception, `category`, and source `processor`; in the current API, `processor.is_usable` reflects whether that processor can still do its job. Pipecat therefore separates component usability from the decision to keep the pipeline running.[^pipecat-events][^pipecat-errors]\n\n`ErrorFrame.fatal`, `push_error(..., fatal=...)`, and `FatalErrorFrame` are deprecated and documented for removal in 2.0.0. `fatal=True` still cancels the pipeline for compatibility, but the current recommended model is to mark the processor unusable and let `PipelineWorker` apply `ProcessorUnusablePolicy`: `CONTINUE` (the default), `END`, or `CANCEL`. A `ServiceSwitcher` can use that state for failover.[^pipecat-errors]\n\nThese primitives can support a detailed pipeline ledger. They should not become the entire product taxonomy. A processor remaining `is_usable=True` does not prove that the turn succeeded, and `CONTINUE` does not mean success either: those states only describe that the framework can keep executing. They do not tell you whether a booking was committed, whether another layer recovered, or whether the caller heard partial audio.""",
        ),
        (
            "[^pipecat-errors]: Pipecat, [FrameProcessor Events — Error Handling](https://docs.pipecat.ai/api-reference/server/events/frame-processor-events).",
            "[^pipecat-events]: Pipecat, [FrameProcessor Events](https://docs.pipecat.ai/api-reference/server/events/frame-processor-events).\n[^pipecat-errors]: Pipecat, [Error Handling](https://docs.pipecat.ai/pipecat/fundamentals/error-handling).",
        ),
        ("date_modified: 2026-09-10", "date_modified: 2026-09-11"),
    ],
}

for path, edits in ARTICLE_PATCHES.items():
    text = path.read_text(encoding="utf-8")
    for old, new in edits:
        count = text.count(old)
        if count != 1:
            raise SystemExit(f"{path}: expected one patch target, found {count}: {old[:100]!r}")
        text = text.replace(old, new)
    path.write_text(text, encoding="utf-8")

gate_path = Path("scripts/validate_voice_evaluation_observability_ch6_source.mjs")
gate = gate_path.read_text(encoding="utf-8")

url_needle = "  'https://docs.pipecat.ai/api-reference/server/events/frame-processor-events',\n"
if gate.count(url_needle) != 1:
    raise SystemExit(f"source gate URL insertion drift: {gate.count(url_needle)}")
gate = gate.replace(
    url_needle,
    url_needle + "  'https://docs.pipecat.ai/pipecat/fundamentals/error-handling',\n",
)

start_marker = "// Pipecat 1.x current source/docs (revalidated 2026-09-11): ErrorFrame again exposes fatal."
end_marker = "check(es.includes('`UserBotLatencyObserver` mide entre la parada de habla detectada')"
start = gate.find(start_marker)
end = gate.find(end_marker, start)
if start < 0 or end < 0:
    raise SystemExit(f"source gate Pipecat block drift: start={start} end={end}")

corrected = """// Pipecat current source/docs (revalidated 2026-09-11): processor usability is distinct from pipeline termination.
check(es.includes('`processor.is_usable` refleja') && es.includes('`ErrorFrame.fatal`') && es.includes('deprecados') && es.includes('2.0.0'), 'ES: current Pipecat processor-usability/deprecation semantics missing');
check(en.includes('`processor.is_usable` reflects') && en.includes('`ErrorFrame.fatal`') && en.includes('deprecated') && en.includes('2.0.0'), 'EN: current Pipecat processor-usability/deprecation semantics missing');
check(es.includes('`ProcessorUnusablePolicy`') && es.includes('`CONTINUE` (default)') && es.includes('`END`') && es.includes('`CANCEL`'), 'ES: current Pipecat pipeline policy semantics missing');
check(en.includes('`ProcessorUnusablePolicy`') && en.includes('`CONTINUE` (the default)') && en.includes('`END`') && en.includes('`CANCEL`'), 'EN: current Pipecat pipeline policy semantics missing');
check(es.includes('`ServiceSwitcher` puede usar ese estado para failover'), 'ES: current Pipecat failover boundary missing');
check(en.includes('`ServiceSwitcher` can use that state for failover'), 'EN: current Pipecat failover boundary missing');
check(!es.includes('En la API actual, `fatal=True` indica un error no recuperable') && !en.includes('In the current API, `fatal=True` marks an unrecoverable error'), 'Stale Pipecat fatal-first semantics remain');
check(es.includes('Que `processor.is_usable` siga siendo `True` no demuestra que el turno haya salido bien') && es.includes('`CONTINUE` tampoco significa éxito'), 'ES: Pipecat framework-state-vs-product-outcome boundary missing');
check(en.includes('A processor remaining `is_usable=True` does not prove that the turn succeeded') && en.includes('`CONTINUE` does not mean success either'), 'EN: Pipecat framework-state-vs-product-outcome boundary missing');
"""
gate = gate[:start] + corrected + gate[end:]
gate_path.write_text(gate, encoding="utf-8")
