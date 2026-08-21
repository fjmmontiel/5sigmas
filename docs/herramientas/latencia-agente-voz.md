---
title: Latencia de agentes de voz — presupuesto de respuesta y barge-in
description: Descompón la latencia de un agente de voz entre transporte, fin de turno, STT, modelo, TTS, salida y buffering; calcula también el camino de interrupción.
keywords: latencia agente de voz, voice agent latency, barge-in, endpointing, STT latency, TTS latency, realtime voice AI, speech to speech
hide:
  - toc
  - navigation
  - footer
---

<link rel="stylesheet" href="/stylesheets/tools.css" />
<link rel="stylesheet" href="/stylesheets/tools-voice-latency.css" />
<script src="/assets/javascripts/tools/voice-latency-core.js" defer></script>
<script src="/assets/javascripts/tools/voice-latency.js" defer></script>

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Presupuesto de latencia para agentes de voz — 5sigmas",
  "url": "https://5sigmas.com/herramientas/latencia-agente-voz/",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Any",
  "isAccessibleForFree": true,
  "description": "Explorador interactivo del camino crítico hasta el primer audio y del tiempo de interrupción de un agente de voz.",
  "featureList": ["Cascada STT-LLM-TTS", "Half-cascade", "Speech-to-speech", "Presupuesto hasta primer audio", "Barge-in", "Cuello de botella", "Escenario compartible", "Exportación JSON"],
  "isPartOf": {"@type": "WebSite", "name": "5sigmas", "url": "https://5sigmas.com/"}
}
</script>

<div class="s5-landing s5-tool-page" data-s5-voice-latency data-locale="es">

<section class="s5-page-intro">
  <div class="s5-eyebrow">Herramientas · Voz · 09</div>
  <h1>Encuentra dónde se consume la latencia antes de que el agente empiece a hablar.</h1>
  <p>Descompón el intervalo desde el final acústico del turno del usuario hasta el primer audio que vuelve al oyente. Cambia la arquitectura, mide cada tramo y comprueba si el objetivo es viable antes de culpar al modelo. El barge-in se calcula por separado porque detener audio ya en reproducción es otro camino crítico.</p>
</section>

<div class="s5-tool-summary-strip" aria-label="Qué mide el explorador">
  <div><small>Respuesta</small><strong>fin del habla → primer audio del agente</strong></div>
  <div><small>Interrupción</small><strong>inicio de habla → audio del agente detenido</strong></div>
  <div><small>Comparación</small><strong>cascada, half-cascade y speech-to-speech</strong></div>
</div>

<div class="s5-tool-workbench">
  <form class="s5-tool-controls" data-s5-tool-form aria-label="Escenario de latencia de agente de voz" onsubmit="return false">
    <section class="s5-tool-controls__section">
      <h2>Arquitectura y objetivo</h2>
      <div class="s5-tool-field-grid s5-tool-field-grid--single">
        <div class="s5-tool-field">
          <label for="s5-voice-latency-es-architecture">Arquitectura</label>
          <select id="s5-voice-latency-es-architecture" data-field="architecture">
            <option value="cascade">Cascada STT → LLM → TTS</option>
            <option value="halfCascade">Half-cascade / audio → modelo → TTS</option>
            <option value="speechToSpeech">Speech-to-speech</option>
          </select>
          <small>Los presets son escenarios didácticos editables, no mediciones de proveedores.</small>
        </div>
        <div class="s5-tool-field"><label for="s5-voice-latency-es-target">Tu objetivo hasta primer audio (ms)</label><input id="s5-voice-latency-es-target" data-field="targetMs" type="number" min="0" max="10000" step="10" value="900" /></div>
      </div>
    </section>

    <section class="s5-tool-controls__section">
      <h2>Camino hasta primer audio</h2>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field"><label for="s5-voice-latency-es-in">Entrada de audio (ms)</label><input id="s5-voice-latency-es-in" data-field="ingressMs" type="number" min="0" max="10000" step="10" value="60" /><small>Último audio del usuario hasta tu punto de procesamiento.</small></div>
        <div class="s5-tool-field"><label for="s5-voice-latency-es-ep">Detección de fin de turno (ms)</label><input id="s5-voice-latency-es-ep" data-field="endpointMs" type="number" min="0" max="10000" step="10" value="300" /><small>Espera residual tras recibir el final acústico.</small></div>
        <div class="s5-tool-field"><label for="s5-voice-latency-es-stt">Finalización STT residual (ms)</label><input id="s5-voice-latency-es-stt" data-field="sttMs" type="number" min="0" max="10000" step="10" value="80" /><small>Usa 0 si la arquitectura no tiene STT externo en este camino.</small></div>
        <div class="s5-tool-field"><label for="s5-voice-latency-es-model">Modelo → primera salida útil (ms)</label><input id="s5-voice-latency-es-model" data-field="modelMs" type="number" min="0" max="10000" step="10" value="350" /></div>
        <div class="s5-tool-field"><label for="s5-voice-latency-es-tts">TTS → primer audio (ms)</label><input id="s5-voice-latency-es-tts" data-field="ttsMs" type="number" min="0" max="10000" step="10" value="120" /><small>TTFB/primer chunk audible, no duración total de síntesis.</small></div>
        <div class="s5-tool-field"><label for="s5-voice-latency-es-out">Salida de audio (ms)</label><input id="s5-voice-latency-es-out" data-field="egressMs" type="number" min="0" max="10000" step="10" value="70" /></div>
        <div class="s5-tool-field"><label for="s5-voice-latency-es-buffer">Buffer de reproducción (ms)</label><input id="s5-voice-latency-es-buffer" data-field="bufferMs" type="number" min="0" max="10000" step="10" value="40" /></div>
      </div>
    </section>

    <section class="s5-tool-controls__section">
      <h2>Barge-in</h2>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field"><label for="s5-voice-latency-es-bd">Detección de nueva voz (ms)</label><input id="s5-voice-latency-es-bd" data-field="bargeDetectMs" type="number" min="0" max="10000" step="10" value="80" /></div>
        <div class="s5-tool-field"><label for="s5-voice-latency-es-cancel">Control/cancelación (ms)</label><input id="s5-voice-latency-es-cancel" data-field="cancelMs" type="number" min="0" max="10000" step="10" value="30" /></div>
        <div class="s5-tool-field"><label for="s5-voice-latency-es-clear">Vaciar buffer de salida (ms)</label><input id="s5-voice-latency-es-clear" data-field="clearMs" type="number" min="0" max="10000" step="10" value="60" /></div>
        <div class="s5-tool-field"><label for="s5-voice-latency-es-btarget">Tu objetivo de interrupción (ms)</label><input id="s5-voice-latency-es-btarget" data-field="bargeTargetMs" type="number" min="0" max="10000" step="10" value="250" /></div>
      </div>
      <div class="s5-tool-actions" aria-label="Acciones del escenario">
        <button class="s5-tool-action" type="button" data-action="share">Copiar enlace</button>
        <button class="s5-tool-action" type="button" data-action="export">Exportar JSON</button>
        <button class="s5-tool-action" type="button" data-action="reset">Restablecer</button>
      </div>
      <p class="s5-tool-feedback" data-s5-tool-feedback hidden aria-live="polite"></p>
    </section>
  </form>

  <section class="s5-tool-results" aria-label="Resultados del presupuesto de latencia" aria-live="polite">
    <div class="s5-tool-kpis s5-voice-latency-kpis">
      <div class="s5-tool-kpi"><small>Primer audio</small><strong data-output="responseMs">—</strong><span class="s5-voice-latency-status" data-output="responseStatus">—</span><span data-output="responseDelta">—</span></div>
      <div class="s5-tool-kpi"><small>Presupuesto restante para el modelo</small><strong data-output="modelBudget">—</strong><span data-output="modelBudgetRead">—</span></div>
      <div class="s5-tool-kpi"><small>Barge-in hasta detener audio</small><strong data-output="bargeMs">—</strong><span class="s5-voice-latency-status" data-output="bargeStatus">—</span><span data-output="bargeDelta">—</span></div>
    </div>

    <p class="s5-voice-latency-budget-note"><strong data-output="architecture">—</strong>. Cada cifra representa contribución residual al camino crítico después del final acústico del turno; si dos etapas se solapan en tu sistema, no sumes dos veces el mismo tiempo de pared.</p>

    <div class="s5-voice-latency-timeline" aria-label="Desglose del camino hasta primer audio">
      <div class="s5-voice-latency-stage" data-stage="ingressMs"><span>Entrada de audio</span><div class="s5-voice-latency-stage__bar"></div><strong data-stage-value>—</strong></div>
      <div class="s5-voice-latency-stage" data-stage="endpointMs"><span>Fin de turno</span><div class="s5-voice-latency-stage__bar"></div><strong data-stage-value>—</strong></div>
      <div class="s5-voice-latency-stage" data-stage="sttMs"><span>STT residual</span><div class="s5-voice-latency-stage__bar"></div><strong data-stage-value>—</strong></div>
      <div class="s5-voice-latency-stage" data-stage="modelMs"><span>Primera salida del modelo</span><div class="s5-voice-latency-stage__bar"></div><strong data-stage-value>—</strong></div>
      <div class="s5-voice-latency-stage" data-stage="ttsMs"><span>Primer audio TTS</span><div class="s5-voice-latency-stage__bar"></div><strong data-stage-value>—</strong></div>
      <div class="s5-voice-latency-stage" data-stage="egressMs"><span>Salida de audio</span><div class="s5-voice-latency-stage__bar"></div><strong data-stage-value>—</strong></div>
      <div class="s5-voice-latency-stage" data-stage="bufferMs"><span>Buffer de reproducción</span><div class="s5-voice-latency-stage__bar"></div><strong data-stage-value>—</strong></div>
    </div>

    <div class="s5-voice-latency-callout">
      <div><small>Mayor contribución</small><strong data-output="bottleneck">—</strong></div>
      <div><small>Camino de interrupción</small><p data-output="bargeRead">—</p></div>
    </div>

    <aside class="s5-tool-source" aria-label="Procedencia metodológica">
      <div class="s5-tool-source__head"><a href="https://developers.deepgram.com/docs/endpointing" target="_blank" rel="noopener noreferrer">Deepgram · Endpointing</a><span>Fuentes revisadas 21-08-2026</span></div>
      <p>El fin de turno es una decisión, no latencia gratis: los sistemas de endpointing esperan evidencia de silencio o de finalización semántica. El valor correcto depende de tu dominio y debe medirse con falsos cortes y esperas excesivas, no solo con milisegundos.</p>
    </aside>
  </section>
</div>

<section class="s5-tool-method" aria-labelledby="s5-voice-latency-method">
  <div><div class="s5-eyebrow">Método</div><h2 id="s5-voice-latency-method">Mide un borde claro y suma solo el camino crítico.</h2></div>
  <div class="s5-tool-method__body">
    <p><strong>Frontera de medida.</strong> Esta herramienta define la latencia de respuesta como el tiempo desde el final acústico del turno en el borde de captura hasta el primer audio del agente en el borde de escucha. Si tu telemetría usa otra frontera, cambia los componentes para que todos compartan la misma referencia.</p>
    <div class="s5-tool-method__formula">first_audio = ingress + turn_detection + residual_STT + model_first_output + TTS_first_audio + egress + playback_buffer</div>
    <p><strong>Arquitectura.</strong> En una cascada completa aparece STT y TTS externos. En el preset half-cascade, la comprensión de audio está dentro del modelo y se mantiene TTS externo. En speech-to-speech, STT y TTS externos quedan a cero. Son presets didácticos: no implican que una arquitectura sea siempre más rápida.</p>
    <p><strong>Fin de turno.</strong> Deepgram documenta endpointing por VAD con un tiempo de silencio configurable. OpenAI Realtime distingue <code>server_vad</code> y <code>semantic_vad</code>; la detección semántica puede esperar más cuando estima que el usuario no ha terminado. Reducir este tramo sin medir falsos cortes puede empeorar la conversación.</p>
    <p><strong>TTS.</strong> ElevenLabs separa el tiempo de inferencia del tiempo extremo a extremo y recomienda streaming/WebSocket para reducir tiempo hasta primer byte/audio. El buffering de texto puede añadir espera antes de iniciar síntesis. Por eso aquí se usa “primer audio TTS”, no duración total de generación.</p>
    <p><strong>Barge-in.</strong> El camino de interrupción no es la latencia de respuesta al revés. Incluye recibir nueva voz, detectarla, cancelar la generación/reproducción y vaciar audio ya en cola. En Media Streams bidireccional, Twilio documenta <code>clear</code> para vaciar el buffer y <code>mark</code> para seguir qué audio terminó o fue limpiado.</p>
    <div class="s5-tool-method__formula">barge_in_stop = ingress + speech_start_detection + cancel/control + output_buffer_clear</div>
    <div class="s5-voice-latency-caveat"><p><strong>No son benchmarks.</strong> Los números iniciales son deliberadamente redondos para que exista un escenario manipulable. Sustitúyelos por percentiles de tus trazas. Una media puede ocultar colas largas; para gates de producción conviene mirar al menos distribución por región, proveedor, idioma, tipo de turno y arquitectura.</p></div>
    <p>La investigación sobre turn-taking humano muestra una tendencia transversal a minimizar silencios y solapamientos, pero no define un SLA universal para agentes de voz. El objetivo de 750/800/900 ms de los presets es una hipótesis editable, no una recomendación científica.</p>
    <p class="s5-tool-method__notes">Fuentes: <a href="https://platform.openai.com/docs/api-reference/realtime">OpenAI Realtime API</a>, <a href="https://developers.deepgram.com/docs/endpointing">Deepgram Endpointing</a>, <a href="https://elevenlabs.io/docs/developer-guides/reducing-latency">ElevenLabs Latency Optimization</a>, <a href="https://www.twilio.com/docs/voice/media-streams/websocket-messages">Twilio Media Streams</a> y <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC2705608/">Stivers et al. (PNAS, 2009)</a>.</p>
  </div>
</section>

<section class="s5-section" aria-labelledby="s5-voice-latency-related">
  <div class="s5-section-head"><h2 id="s5-voice-latency-related">Lleva el presupuesto a la arquitectura real</h2></div>
  <div class="s5-simple-list">
    <a class="s5-list-row" href="/articulos-tecnicos/voice-agent-architectures/"><span class="s5-list-row__n">01</span><span class="s5-list-row__title">Tres arquitecturas para agentes de voz</span><span class="s5-list-row__desc">Compara dónde viven STT, razonamiento y TTS antes de asignar latencia a cada tramo.</span><span class="s5-list-row__meta">Nota técnica</span></a>
    <a class="s5-list-row" href="/articulos-tecnicos/reactive-proactive-voice-agents/"><span class="s5-list-row__n">02</span><span class="s5-list-row__title">Agentes reactivos y proactivos en voz</span><span class="s5-list-row__desc">Separa eventos conversacionales de la ejecución interna y del control de reproducción.</span><span class="s5-list-row__meta">Nota técnica</span></a>
    <a class="s5-list-row" href="/series/modelos-razonadores/04-latencia-streaming/"><span class="s5-list-row__n">03</span><span class="s5-list-row__title">Latencia, streaming e interacción humana</span><span class="s5-list-row__desc">Entiende por qué el tiempo hasta la primera salida puede importar más que el tiempo total.</span><span class="s5-list-row__meta">Capítulo</span></a>
  </div>
</section>

</div>
