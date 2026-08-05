from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

SNIPPETS = {
"docs/snippets/articulos-tecnicos/voice-rp-contract.html": r'''<section class="s5v s5v-contract" data-s5v-stepper data-s5v-steps="3" data-s5v-autoplay="4200" data-step="1" data-anim-fullscreen="on" aria-label="Contrato reactivo, asíncrono y proactivo">
  <div class="s5v__canvas">
    <header class="s5v__head"><div><span class="s5v__kicker">Contrato</span><h3>Una petición. Dos tiempos.</h3></div><p>La conversación no espera a la tool.</p></header>
    <div class="s5v-contract__tracks">
      <div class="s5v-contract__track s5v-contract__track--talk"><b>Conversación</b><span class="s5v-contract__node" data-at="1">Aceptar</span><span class="s5v-contract__line"></span><span class="s5v-contract__node" data-at="2">Seguir</span></div>
      <div class="s5v-contract__track s5v-contract__track--work"><b>Operación</b><span class="s5v-contract__node" data-at="1">Crear</span><span class="s5v-contract__line"></span><span class="s5v-contract__node" data-at="2">Ejecutar</span><span class="s5v-contract__line"></span><span class="s5v-contract__node" data-at="3">Entregar</span></div>
      <span class="s5v-contract__packet" aria-hidden="true"></span>
    </div>
    <div class="s5v__steps" aria-label="Etapas"><button data-s5v-step="1">Aceptar</button><button data-s5v-step="2">Operar</button><button data-s5v-step="3">Entregar</button></div>
    <div class="s5v__copy"><span data-s5v-copy="1">Responde sin prometer el resultado.</span><span data-s5v-copy="2">La tool avanza fuera del turno.</span><span data-s5v-copy="3">El cierre vuelve cuando puede escucharse.</span></div>
  </div>
</section>''',
"docs/snippets/articulos-tecnicos/voice-rp-safe-window.html": r'''<section class="s5v s5v-window" data-s5v-stepper data-s5v-steps="2" data-s5v-autoplay="3600" data-step="1" data-anim-fullscreen="on" aria-label="Ventana segura para entregar un resultado">
  <div class="s5v__canvas">
    <header class="s5v__head"><div><span class="s5v__kicker">ActivityGate</span><h3>Terminar no da permiso para hablar.</h3></div><p>El canal manda.</p></header>
    <div class="s5v-window__scene">
      <div class="s5v-window__lane"><b>Usuario</b><div class="s5v__wave s5v__wave--user" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><span class="s5v-window__quiet">silencio</span></div>
      <div class="s5v-window__result">resultado listo</div>
      <div class="s5v-window__queue">espera</div>
      <div class="s5v-window__speech">“Ya lo tengo.”</div>
    </div>
    <div class="s5v__steps"><button data-s5v-step="1">Hablando</button><button data-s5v-step="2">Silencio</button></div>
  </div>
</section>''',
"docs/snippets/articulos-tecnicos/voice-rp-clocks.html": r'''<section class="s5v s5v-clocks" data-anim-fullscreen="on" aria-label="Cuatro relojes independientes de una llamada">
  <div class="s5v__canvas">
    <header class="s5v__head"><div><span class="s5v__kicker">Estado</span><h3>Cuatro relojes. Cuatro verdades.</h3></div><p>No existe un único <code>is_busy</code>.</p></header>
    <div class="s5v-clocks__grid">
      <div class="s5v-clocks__row s5v-clocks__row--user"><span>◉</span><b>Usuario</b><div class="s5v-clocks__track"><i></i></div><em>speaking</em></div>
      <div class="s5v-clocks__row s5v-clocks__row--model"><span>◇</span><b>Modelo</b><div class="s5v-clocks__track"><i></i></div><em>generating</em></div>
      <div class="s5v-clocks__row s5v-clocks__row--play"><span>▷</span><b>Playback</b><div class="s5v-clocks__track"><i></i></div><em>playing</em></div>
      <div class="s5v-clocks__row s5v-clocks__row--tool"><span>↻</span><b>Tool</b><div class="s5v-clocks__track"><i></i></div><em>running</em></div>
    </div>
    <div class="s5v__rule"><b>Regla</b><span>Cada reloj se cancela y confirma por separado.</span></div>
  </div>
</section>''',
"docs/snippets/articulos-tecnicos/voice-rp-gate.html": r'''<section class="s5v s5v-gate" data-s5v-stepper data-s5v-steps="3" data-s5v-autoplay="4200" data-step="1" data-anim-fullscreen="on" aria-label="Decisiones del ActivityGate">
  <div class="s5v__canvas">
    <header class="s5v__head"><div><span class="s5v__kicker">Política de entrega</span><h3>¿Qué hace el resultado?</h3></div><p>Una decisión, tres salidas.</p></header>
    <div class="s5v-gate__map">
      <div class="s5v-gate__source">listo</div><div class="s5v-gate__hub">ActivityGate</div>
      <div class="s5v-gate__out" data-out="1"><b>Hablar</b><span>canal libre</span></div>
      <div class="s5v-gate__out" data-out="2"><b>Esperar</b><span>usuario hablando</span></div>
      <div class="s5v-gate__out" data-out="3"><b>Unir</b><span>siguiente turno</span></div>
      <svg viewBox="0 0 600 180" preserveAspectRatio="none" aria-hidden="true"><path data-path="1" d="M220 90 C320 15 390 20 500 35"/><path data-path="2" d="M220 90 C330 90 390 90 500 90"/><path data-path="3" d="M220 90 C320 165 390 160 500 145"/></svg>
    </div>
    <div class="s5v__steps"><button data-s5v-step="1">Silencio</button><button data-s5v-step="2">Hablando</button><button data-s5v-step="3">Turno abierto</button></div>
  </div>
</section>''',
"docs/snippets/articulos-tecnicos/voice-rp-barge.html": r'''<section class="s5v s5v-barge" data-s5v-stepper data-s5v-steps="2" data-s5v-autoplay="4000" data-step="1" data-anim-fullscreen="on" aria-label="Cancelación selectiva durante un barge-in">
  <div class="s5v__canvas">
    <header class="s5v__head"><div><span class="s5v__kicker">Barge-in</span><h3>Cancelar la voz. Mantener el trabajo.</h3></div><p>La interrupción es acústica.</p></header>
    <div class="s5v-barge__scene">
      <div class="s5v-barge__item" data-kind="response"><span>◇</span><b>Respuesta</b><em>generating</em></div>
      <div class="s5v-barge__item" data-kind="playback"><span>▷</span><b>Playback</b><em>playing</em></div>
      <div class="s5v-barge__item" data-kind="operation"><span>↻</span><b>Operación</b><em>running</em></div>
      <div class="s5v-barge__interrupt"><i></i><b>speech_started</b></div>
    </div>
    <div class="s5v__steps"><button data-s5v-step="1">Antes</button><button data-s5v-step="2">Interrupción</button></div>
    <div class="s5v__copy"><span data-s5v-copy="1">El agente está hablando y la tool sigue en marcha.</span><span data-s5v-copy="2">Respuesta y playback se cancelan. La operación continúa.</span></div>
  </div>
</section>''',
"docs/snippets/articulos-tecnicos/voice-rp-batch.html": r'''<section class="s5v s5v-batch" data-s5v-stepper data-s5v-steps="4" data-s5v-autoplay="2400" data-step="1" data-anim-fullscreen="on" aria-label="Agregación de varias tools en un único cierre">
  <div class="s5v__canvas">
    <header class="s5v__head"><div><span class="s5v__kicker">Batch</span><h3>Tres callbacks. Un solo cierre.</h3></div><p>El lote habla cuando se drena.</p></header>
    <div class="s5v-batch__scene">
      <div class="s5v-batch__tools"><span data-tool="1">Disponibilidad</span><span data-tool="2">Cliente</span><span data-tool="3">Alternativa</span></div>
      <div class="s5v-batch__funnel" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="s5v-batch__close">“Hay hueco el jueves.”</div>
    </div>
    <div class="s5v-batch__progress"><i></i><i></i><i></i><b>1</b></div>
  </div>
</section>''',
"docs/snippets/articulos-tecnicos/voice-rp-runtime.html": r'''<section class="s5v s5v-runtime s5v--wide" data-anim-fullscreen="on" aria-label="Arquitectura de un runtime reactivo y proactivo de voz">
  <div class="s5v__canvas">
    <header class="s5v__head"><div><span class="s5v__kicker">Arquitectura</span><h3>Solo una capa puede hablar.</h3></div><p>El resto publica eventos.</p></header>
    <div class="s5v-runtime__stack">
      <div class="s5v-runtime__surface"><span>voz</span><b>Interaction Surface</b><small>escucha · interrumpe · entrega</small></div>
      <div class="s5v-runtime__bus"><i></i><b>event log</b><code>TaskEnvelope ↕ DeliveryEnvelope</code></div>
      <div class="s5v-runtime__lower"><div><span>razón</span><b>Cognitive Plane</b><small>tools · RAG · policy</small></div><div><span>estado</span><b>Durable Coordination</b><small>colas · locks · idempotencia</small></div></div>
      <span class="s5v-runtime__packet" aria-hidden="true"></span>
    </div>
  </div>
</section>''',
"docs/snippets/articulos-tecnicos/voice-arch-map.html": r'''<section class="s5v s5v-arch-map s5v--wide" data-s5v-stepper data-s5v-steps="3" data-step="1" data-anim-fullscreen="on" aria-label="Comparación de las tres arquitecturas de agentes de voz">
  <div class="s5v__canvas">
    <header class="s5v__head"><div><span class="s5v__kicker">Mapa</span><h3>¿Dónde colocas la frontera de texto?</h3></div><p>Ese corte cambia todo.</p></header>
    <div class="s5v__steps s5v__steps--tabs"><button data-s5v-step="1">Full cascade</button><button data-s5v-step="2">Half cascade</button><button data-s5v-step="3">S2S</button></div>
    <div class="s5v-arch-map__panels">
      <div data-panel="1" class="s5v-arch-map__pipe"><span class="is-audio">Audio</span><i>→</i><span>STT</span><i>→</i><span>LLM</span><i>→</i><span>TTS</span><i>→</i><span class="is-audio">Audio</span></div>
      <div data-panel="2" class="s5v-arch-map__pipe"><span class="is-audio">Audio</span><i>→</i><span class="is-model">Audio model</span><i>→</i><span class="is-text">Texto</span><i>→</i><span>TTS</span><i>→</i><span class="is-audio">Audio</span></div>
      <div data-panel="3" class="s5v-arch-map__pipe"><span class="is-audio">Audio</span><i>↔</i><span class="is-model">S2S</span><i>↔</i><span class="is-audio">Audio</span></div>
    </div>
    <div class="s5v__copy"><span data-s5v-copy="1">El texto separa comprensión y voz.</span><span data-s5v-copy="2">El audio entra nativo. La voz sigue fuera.</span><span data-s5v-copy="3">La representación acústica cruza todo el turno.</span></div>
  </div>
</section>''',
"docs/snippets/articulos-tecnicos/voice-arch-cascade.html": r'''<section class="s5v s5v-cascade" data-s5v-stepper data-s5v-steps="5" data-s5v-autoplay="1500" data-step="1" data-anim-fullscreen="on" aria-label="Barreras secuenciales de una arquitectura full cascade">
  <div class="s5v__canvas">
    <header class="s5v__head"><div><span class="s5v__kicker">Full cascade</span><h3>Cada frontera añade una espera.</h3></div><p>Rápido por pieza no siempre es rápido al hablar.</p></header>
    <div class="s5v-cascade__pipe"><span data-at="1">VAD</span><i></i><span data-at="2">STT</span><i></i><span data-at="3">LLM</span><i></i><span data-at="4">TTS</span><i></i><span data-at="5">Buffer</span></div>
    <div class="s5v-cascade__meter"><i></i><b><span data-s5v-step-value>1</span>/5 barreras abiertas</b></div>
  </div>
</section>''',
"docs/snippets/articulos-tecnicos/voice-arch-prosody-loss.html": r'''<section class="s5v s5v-prosody-loss" data-s5v-stepper data-s5v-steps="2" data-s5v-autoplay="3800" data-step="1" data-anim-fullscreen="on" aria-label="Pérdida de prosodia al convertir audio en texto">
  <div class="s5v__canvas">
    <header class="s5v__head"><div><span class="s5v__kicker">Señal</span><h3>El texto conserva qué. No siempre cómo.</h3></div><p>La transcripción comprime la voz.</p></header>
    <div class="s5v-prosody-loss__scene"><div class="s5v__wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="s5v-prosody-loss__gate">STT</div><div class="s5v-prosody-loss__text">“Está bien.”</div></div>
    <div class="s5v-prosody-loss__features"><span>ritmo</span><span>energía</span><span>duda</span><span>énfasis</span></div>
    <div class="s5v__steps"><button data-s5v-step="1">Audio</button><button data-s5v-step="2">Texto</button></div>
  </div>
</section>''',
"docs/snippets/articulos-tecnicos/voice-arch-half.html": r'''<section class="s5v s5v-half s5v--wide" data-anim-fullscreen="on" aria-label="Pipeline half cascade de audio a texto streaming y TTS">
  <div class="s5v__canvas">
    <header class="s5v__head"><div><span class="s5v__kicker">Half cascade</span><h3>Audio-native para entender. TTS para hablar.</h3></div><p>Dos fortalezas con una frontera explícita.</p></header>
    <div class="s5v-half__pipe"><span class="is-audio">Audio</span><i>→</i><span class="is-model">Audio model<small>prosodia + intención</small></span><i>→</i><span class="is-text">Texto Δ</span><i>→</i><span>TTS externo<small>voz controlable</small></span><i>→</i><span class="is-audio">Audio</span></div>
    <div class="s5v__rule"><b>Trade-off</b><span>La prosodia de entrada no cruza sola la frontera de texto.</span></div>
  </div>
</section>''',
"docs/snippets/articulos-tecnicos/voice-arch-speech-plan.html": r'''<section class="s5v s5v-speech-plan" data-s5v-speech-plan data-anim-fullscreen="on" aria-label="SpeechPlan para transportar intención expresiva hasta el TTS">
  <div class="s5v__canvas">
    <header class="s5v__head"><div><span class="s5v__kicker">SpeechPlan</span><h3>El texto necesita instrucciones de voz.</h3></div><p>Mueve los controles.</p></header>
    <div class="s5v-speech-plan__demo"><div class="s5v-speech-plan__quote">“Entiendo. Vamos paso a paso.”</div><div class="s5v__wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div>
    <div class="s5v-speech-plan__controls"><label>Ritmo<input type="range" min="70" max="125" value="92" data-s5v-var="pace"><output>0.92×</output></label><label>Energía<input type="range" min="20" max="90" value="42" data-s5v-var="energy"><output>42%</output></label><label>Pausa<input type="range" min="0" max="500" value="180" data-s5v-var="pause"><output>180 ms</output></label></div>
  </div>
</section>''',
"docs/snippets/articulos-tecnicos/voice-arch-duplex.html": r'''<section class="s5v s5v-duplex" data-anim-fullscreen="on" aria-label="Solapamiento full duplex entre usuario y agente">
  <div class="s5v__canvas">
    <header class="s5v__head"><div><span class="s5v__kicker">Speech-to-speech</span><h3>Escuchar mientras habla.</h3></div><p>Full-duplex es solapamiento con control.</p></header>
    <div class="s5v-duplex__timeline"><div><b>Usuario</b><span class="s5v-duplex__wave s5v-duplex__wave--user"></span></div><div><b>Agente</b><span class="s5v-duplex__wave s5v-duplex__wave--agent"></span><em>“mm-hm”</em></div><i class="s5v-duplex__cursor"></i></div>
    <div class="s5v__rule"><b>No es magia</b><span>El runtime sigue decidiendo turnos, tools y playback.</span></div>
  </div>
</section>''',
"docs/snippets/articulos-tecnicos/voice-arch-latency.html": r'''<section class="s5v s5v-latency s5v--wide" data-anim-fullscreen="on" aria-label="Comparación relativa del camino hasta el primer audio">
  <div class="s5v__canvas">
    <header class="s5v__head"><div><span class="s5v__kicker">Latencia</span><h3>Mide hasta el audio escuchado.</h3></div><p>Ejemplo relativo, no benchmark.</p></header>
    <div class="s5v-latency__rows">
      <div><b>Full</b><span class="s5v-latency__bar"><i class="vad"></i><i class="stt"></i><i class="model"></i><i class="tts"></i><i class="buffer"></i></span></div>
      <div><b>Half</b><span class="s5v-latency__bar"><i class="vad"></i><i class="audio"></i><i class="tts"></i><i class="buffer"></i></span></div>
      <div><b>S2S</b><span class="s5v-latency__bar"><i class="vad"></i><i class="s2s"></i><i class="buffer"></i></span></div>
    </div>
    <div class="s5v-latency__legend"><span class="vad">turn</span><span class="stt">STT</span><span class="model">model</span><span class="tts">TTS</span><span class="buffer">playback</span></div>
  </div>
</section>''',
"docs/snippets/articulos-tecnicos/voice-arch-decision.html": r'''<section class="s5v s5v-decision" data-s5v-stepper data-s5v-steps="3" data-step="1" data-anim-fullscreen="on" aria-label="Elección de arquitectura según la prioridad del producto">
  <div class="s5v__canvas">
    <header class="s5v__head"><div><span class="s5v__kicker">Decisión</span><h3>No hay una ganadora universal.</h3></div><p>Elige qué quieres proteger.</p></header>
    <div class="s5v__steps s5v__steps--tabs"><button data-s5v-step="1">Control</button><button data-s5v-step="2">Equilibrio</button><button data-s5v-step="3">Timing</button></div>
    <div class="s5v-decision__cards"><div data-choice="1"><b>Full cascade</b><span>máxima observabilidad</span></div><div data-choice="2"><b>Half cascade</b><span>audio-native + TTS</span></div><div data-choice="3"><b>Speech-to-speech</b><span>ritmo y full-duplex</span></div></div>
  </div>
</section>''',
"docs/snippets/articulos-tecnicos/voice-arch-surface.html": r'''<section class="s5v s5v-surface s5v--wide" data-anim-fullscreen="on" aria-label="Superficie S2S rápida conectada a un plano cognitivo pesado">
  <div class="s5v__canvas">
    <header class="s5v__head"><div><span class="s5v__kicker">Hot take</span><h3>Dos velocidades. Un contrato.</h3></div><p>La superficie conversa. El plano ejecuta.</p></header>
    <div class="s5v-surface__architecture"><div class="s5v-surface__top"><span class="is-audio">audio ↔ audio</span><b>S2S Interaction Surface</b><small>timing · barge-in · voz</small></div><div class="s5v-surface__envelopes"><span>TaskEnvelope ↓</span><span>↑ DeliveryEnvelope</span></div><div class="s5v-surface__bottom"><div><b>Cognitive Plane</b><small>reasoning · RAG · tools</small></div><div><b>Async workers</b><small>retries · idempotencia</small></div></div><i class="s5v-surface__packet"></i></div>
  </div>
</section>''',
"docs/snippets/articulos-tecnicos/voice-arch-voice-prompt.html": r'''<section class="s5v s5v-voice-prompt" data-anim-fullscreen="on" aria-label="Few-shot prompting con muestras de voz autorizadas">
  <div class="s5v__canvas">
    <header class="s5v__head"><div><span class="s5v__kicker">Voice Prompt Pack</span><h3>Few-shot, pero con voz.</h3></div><p>Muestras autorizadas, no una descripción textual.</p></header>
    <div class="s5v-voice-prompt__flow"><div class="s5v-voice-prompt__samples"><span><i></i><b>Identidad</b></span><span><i></i><b>Estilo</b></span><span><i></i><b>Pronunciación</b></span></div><em>→</em><div class="s5v-voice-prompt__pack">Voice<br>Prompt</div><em>→</em><div class="s5v-voice-prompt__output"><div class="s5v__wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><b>voz condicionada</b></div></div>
    <div class="s5v__rule"><b>Guardrail</b><span>consentimiento · procedencia · revocación</span></div>
  </div>
</section>''',
}


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content.strip() + "\n", encoding="utf-8")


def must_replace(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f"Missing marker for {label}: {old[:90]!r}")
    return text.replace(old, new, 1)


for path, content in SNIPPETS.items():
    write(path, content)

rp_path = ROOT / "docs/articulos-tecnicos/reactive-proactive-voice-agents.md"
rp = rp_path.read_text(encoding="utf-8")
rp = rp.replace("date_modified: 2026-08-04", "date_modified: 2026-08-05", 1)
rp = must_replace(rp, '{{ include_html("snippets/articulos-tecnicos/voice-reactive-proactive-panorama.html") }}', '{{ include_html("snippets/articulos-tecnicos/voice-rp-contract.html") }}', "reactive contract")
rp = must_replace(rp, "La operación y la conversación avanzan a ritmos distintos. El runtime tiene que conservar ambas líneas temporales sin mezclarlas.\n", "La operación y la conversación avanzan a ritmos distintos. El runtime tiene que conservar ambas líneas temporales sin mezclarlas.\n\n{{ include_html(\"snippets/articulos-tecnicos/voice-rp-safe-window.html\") }}\n", "safe window")
rp = must_replace(rp, '{{ include_html("snippets/articulos-tecnicos/voice-reactive-proactive-clocks.html") }}', '{{ include_html("snippets/articulos-tecnicos/voice-rp-clocks.html") }}', "four clocks")
rp = must_replace(rp, "Interrumpir para decir que una búsqueda terminó suele ser peor que esperar. Interrumpir para avisar de que un pago va a salir con datos incorrectos puede estar justificado.\n", "Interrumpir para decir que una búsqueda terminó suele ser peor que esperar. Interrumpir para avisar de que un pago va a salir con datos incorrectos puede estar justificado.\n\n{{ include_html(\"snippets/articulos-tecnicos/voice-rp-gate.html\") }}\n", "activity gate")
rp = must_replace(rp, '{{ include_html("snippets/articulos-tecnicos/voice-reactive-proactive-barge-in.html") }}', '{{ include_html("snippets/articulos-tecnicos/voice-rp-barge.html") }}', "barge in")
rp = must_replace(rp, "`record_result_once` y `create_once` son importantes porque producción incluye retries, timeouts ambiguos y entregas *at least once*. El diseño no puede depender de que cada evento llegue exactamente una vez.\n", "`record_result_once` y `create_once` son importantes porque producción incluye retries, timeouts ambiguos y entregas *at least once*. El diseño no puede depender de que cada evento llegue exactamente una vez.\n\n{{ include_html(\"snippets/articulos-tecnicos/voice-rp-batch.html\") }}\n", "batch")
rp = must_replace(rp, '{{ include_html("snippets/articulos-tecnicos/voice-reactive-proactive-runtime.html") }}', '{{ include_html("snippets/articulos-tecnicos/voice-rp-runtime.html") }}', "runtime")
rp_path.write_text(rp, encoding="utf-8")

arch_path = ROOT / "docs/articulos-tecnicos/voice-agent-architectures.md"
arch = arch_path.read_text(encoding="utf-8")
arch = arch.replace("date_modified: 2026-08-04", "date_modified: 2026-08-05", 1)
arch = must_replace(arch, '{{ include_html("snippets/articulos-tecnicos/voice-architectures-comparison.html") }}', '{{ include_html("snippets/articulos-tecnicos/voice-arch-map.html") }}', "architecture map")
arch = must_replace(arch, "Full cascade no es una mala arquitectura. El problema aparece cuando la conversación tiene que sentirse humana. En ese momento deja de ser una tubería lineal y se convierte en una máquina de estados repartida entre varios servicios.\n", "Full cascade no es una mala arquitectura. El problema aparece cuando la conversación tiene que sentirse humana. En ese momento deja de ser una tubería lineal y se convierte en una máquina de estados repartida entre varios servicios.\n\n{{ include_html(\"snippets/articulos-tecnicos/voice-arch-cascade.html\") }}\n", "cascade barriers")
arch = must_replace(arch, "2. **Expresión.** El TTS recibe texto, pero no siempre sabe cómo debería decirlo\n", "2. **Expresión.** El TTS recibe texto, pero no siempre sabe cómo debería decirlo\n\n{{ include_html(\"snippets/articulos-tecnicos/voice-arch-prosody-loss.html\") }}\n", "prosody loss")
arch = must_replace(arch, "El SDK oficial de OpenAI muestra sesiones Realtime con `output_modalities: [\"text\"]` y streaming a través de `response.output_text.delta`.[^openai-python-realtime] Ese contrato permite construir audio-in / text-out sin pedir al modelo que genere audio.\n", "El SDK oficial de OpenAI muestra sesiones Realtime con `output_modalities: [\"text\"]` y streaming a través de `response.output_text.delta`.[^openai-python-realtime] Ese contrato permite construir audio-in / text-out sin pedir al modelo que genere audio.\n\n{{ include_html(\"snippets/articulos-tecnicos/voice-arch-half.html\") }}\n", "half cascade")
arch = must_replace(arch, '{{ include_html("snippets/articulos-tecnicos/voice-architectures-prosody.html") }}', '{{ include_html("snippets/articulos-tecnicos/voice-arch-speech-plan.html") }}', "speech plan")
arch = must_replace(arch, "Los modelos Realtime modernos pueden recibir y emitir audio directamente y también soportar function calling.[^openai-gpt-realtime] La ventaja principal es que comprensión y expresión comparten una representación acústica.\n", "Los modelos Realtime modernos pueden recibir y emitir audio directamente y también soportar function calling.[^openai-gpt-realtime] La ventaja principal es que comprensión y expresión comparten una representación acústica.\n\n{{ include_html(\"snippets/articulos-tecnicos/voice-arch-duplex.html\") }}\n", "duplex")
arch = must_replace(arch, '{{ include_html("snippets/articulos-tecnicos/voice-architectures-latency.html") }}', '{{ include_html("snippets/articulos-tecnicos/voice-arch-latency.html") }}', "latency")
arch = must_replace(arch, "No hay una arquitectura ganadora para todos los productos.\n", "No hay una arquitectura ganadora para todos los productos.\n\n{{ include_html(\"snippets/articulos-tecnicos/voice-arch-decision.html\") }}\n", "decision")
arch = must_replace(arch, '{{ include_html("snippets/articulos-tecnicos/voice-architectures-surface-plane.html") }}', '{{ include_html("snippets/articulos-tecnicos/voice-arch-surface.html") }}', "surface plane")
arch = must_replace(arch, "system instructions\n+ conversational policy\n+ pronunciation lexicon\n+ 3–15 s audio references\n+ consent and provenance metadata\n```\n", "system instructions\n+ conversational policy\n+ pronunciation lexicon\n+ 3–15 s audio references\n+ consent and provenance metadata\n```\n\n{{ include_html(\"snippets/articulos-tecnicos/voice-arch-voice-prompt.html\") }}\n", "voice prompt")
arch_path.write_text(arch, encoding="utf-8")

print(f"Wrote {len(SNIPPETS)} micro-animations and updated both reports")
