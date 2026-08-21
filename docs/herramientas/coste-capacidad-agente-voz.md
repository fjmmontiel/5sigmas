---
title: Coste y capacidad de agentes de voz — planificador mensual
description: Estima coste mensual, coste por llamada, minutos de STT/TTS, tokens del LLM, concurrencia media, workers y límites de streams para un agente de voz.
keywords: coste agente de voz, voice agent cost, calculadora voice AI, concurrencia voz, capacidad agentes IA, coste STT, coste TTS, coste LLM voz
hide:
  - toc
  - navigation
  - footer
---

<link rel="stylesheet" href="/stylesheets/tools.css" />
<link rel="stylesheet" href="/stylesheets/tools-voice-cost-capacity.css" />
<script src="/assets/javascripts/tools/voice-cost-capacity-core.js" defer></script>
<script src="/assets/javascripts/tools/voice-cost-capacity.js" defer></script>

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Planificador de coste y capacidad para agentes de voz — 5sigmas",
  "url": "https://5sigmas.com/herramientas/coste-capacidad-agente-voz/",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Any",
  "isAccessibleForFree": true,
  "description": "Planificador interactivo de coste mensual, unidades facturables y capacidad concurrente para agentes de voz.",
  "featureList": ["Coste por llamada", "Coste por minuto", "Telefonía y Media Streams", "STT", "TTS", "Tokens LLM", "Concurrencia", "Workers", "Límites de streams", "Escenario compartible", "Exportación JSON"],
  "isPartOf": {"@type": "WebSite", "name": "5sigmas", "url": "https://5sigmas.com/"}
}
</script>

<div class="s5-landing s5-tool-page" data-s5-voice-cost-capacity data-locale="es">

<section class="s5-page-intro">
  <div class="s5-eyebrow">Herramientas · Voz · 10</div>
  <h1>Convierte tráfico de llamadas en coste mensual y capacidad necesaria.</h1>
  <p>Separa minutos conectados, voz del usuario, voz del agente, caracteres sintetizados y tokens del modelo. Después contrasta el pico de concurrencia con la capacidad que quieres provisionar. Las tarifas son editables porque el coste real depende de país, contrato, arquitectura y volumen.</p>
</section>

<div class="s5-tool-summary-strip" aria-label="Qué calcula el planificador">
  <div><small>Coste</small><strong>telefonía + media + STT + LLM + TTS</strong></div>
  <div><small>Volumen</small><strong>minutos conectados y audio por dirección</strong></div>
  <div><small>Capacidad</small><strong>concurrencia media, pico, workers y streams</strong></div>
</div>

<div class="s5-tool-workbench">
  <form class="s5-tool-controls" data-s5-tool-form aria-label="Escenario de coste y capacidad de agente de voz" onsubmit="return false">
    <section class="s5-tool-controls__section">
      <h2>Tráfico</h2>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field"><label for="s5-vcc-es-calls">Llamadas al mes</label><input id="s5-vcc-es-calls" data-field="callsPerMonth" type="number" min="0" step="100" value="10000" /></div>
        <div class="s5-tool-field"><label for="s5-vcc-es-duration">Duración media (min)</label><input id="s5-vcc-es-duration" data-field="averageCallMinutes" type="number" min="0" step="0.1" value="4" /></div>
        <div class="s5-tool-field"><label for="s5-vcc-es-user">Usuario hablando (%)</label><input id="s5-vcc-es-user" data-field="userSpeechPercent" type="number" min="0" max="100" step="1" value="42" /><small>Porcentaje de minutos conectados con audio facturable del usuario.</small></div>
        <div class="s5-tool-field"><label for="s5-vcc-es-agent">Agente hablando (%)</label><input id="s5-vcc-es-agent" data-field="agentSpeechPercent" type="number" min="0" max="100" step="1" value="38" /><small>Puede solaparse con el usuario durante interrupciones.</small></div>
        <div class="s5-tool-field"><label for="s5-vcc-es-hours">Horas de servicio al mes</label><input id="s5-vcc-es-hours" data-field="serviceHoursPerMonth" type="number" min="0" step="1" value="220" /><small>Se usa para convertir volumen mensual en concurrencia media.</small></div>
        <div class="s5-tool-field"><label for="s5-vcc-es-peak">Pico de llamadas simultáneas</label><input id="s5-vcc-es-peak" data-field="peakConcurrency" type="number" min="0" step="1" value="35" /><small>Debe venir de observación o forecast; no se infiere de una media.</small></div>
      </div>
    </section>

    <section class="s5-tool-controls__section">
      <h2>Capacidad</h2>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field"><label for="s5-vcc-es-util">Utilización objetivo por worker (%)</label><input id="s5-vcc-es-util" data-field="targetWorkerUtilizationPercent" type="number" min="1" max="100" step="1" value="70" /></div>
        <div class="s5-tool-field"><label for="s5-vcc-es-spw">Sesiones máximas por worker</label><input id="s5-vcc-es-spw" data-field="sessionsPerWorker" type="number" min="1" step="1" value="50" /><small>Capacidad de tu runtime, no un límite universal.</small></div>
        <div class="s5-tool-field"><label for="s5-vcc-es-stt-limit">Límite concurrente STT</label><input id="s5-vcc-es-stt-limit" data-field="sttConcurrencyLimit" type="number" min="0" step="1" value="0" /><small>0 = no comprobar límite.</small></div>
        <div class="s5-tool-field"><label for="s5-vcc-es-tts-limit">Límite concurrente TTS</label><input id="s5-vcc-es-tts-limit" data-field="ttsConcurrencyLimit" type="number" min="0" step="1" value="0" /><small>0 = no comprobar límite.</small></div>
      </div>
    </section>

    <section class="s5-tool-controls__section">
      <h2>Tarifas por uso</h2>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field"><label for="s5-vcc-es-tel">Telefonía (USD/min conectado)</label><input id="s5-vcc-es-tel" data-field="telephonyUsdPerConnectedMinute" type="number" min="0" step="0.0001" value="0.0178" /></div>
        <div class="s5-tool-field"><label for="s5-vcc-es-media">Media Stream (USD/min conectado)</label><input id="s5-vcc-es-media" data-field="mediaStreamUsdPerConnectedMinute" type="number" min="0" step="0.0001" value="0.0044" /></div>
        <div class="s5-tool-field"><label for="s5-vcc-es-stt">STT (USD/min de usuario)</label><input id="s5-vcc-es-stt" data-field="sttUsdPerUserAudioMinute" type="number" min="0" step="0.0001" value="0.017" /></div>
        <div class="s5-tool-field"><label for="s5-vcc-es-tts">TTS (USD/1.000 caracteres)</label><input id="s5-vcc-es-tts" data-field="ttsUsdPer1000Characters" type="number" min="0" step="0.001" value="0.05" /></div>
        <div class="s5-tool-field"><label for="s5-vcc-es-chars">Caracteres por minuto hablado</label><input id="s5-vcc-es-chars" data-field="charactersPerAgentMinute" type="number" min="0" step="10" value="1000" /><small>Supuesto editable para convertir minutos del agente en caracteres TTS.</small></div>
        <div class="s5-tool-field"><label for="s5-vcc-es-fixed">Otros costes fijos (USD/llamada)</label><input id="s5-vcc-es-fixed" data-field="fixedUsdPerCall" type="number" min="0" step="0.001" value="0" /></div>
      </div>
    </section>

    <section class="s5-tool-controls__section">
      <h2>LLM por llamada</h2>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field"><label for="s5-vcc-es-it">Tokens de entrada</label><input id="s5-vcc-es-it" data-field="llmInputTokensPerCall" type="number" min="0" step="100" value="1400" /></div>
        <div class="s5-tool-field"><label for="s5-vcc-es-ot">Tokens de salida</label><input id="s5-vcc-es-ot" data-field="llmOutputTokensPerCall" type="number" min="0" step="50" value="220" /></div>
        <div class="s5-tool-field"><label for="s5-vcc-es-ip">Entrada (USD/MTok)</label><input id="s5-vcc-es-ip" data-field="llmInputUsdPerMillionTokens" type="number" min="0" step="0.01" value="0.2" /></div>
        <div class="s5-tool-field"><label for="s5-vcc-es-op">Salida (USD/MTok)</label><input id="s5-vcc-es-op" data-field="llmOutputUsdPerMillionTokens" type="number" min="0" step="0.01" value="1.2" /></div>
      </div>
      <div class="s5-tool-actions" aria-label="Acciones del escenario">
        <button class="s5-tool-action" type="button" data-action="share">Copiar enlace</button>
        <button class="s5-tool-action" type="button" data-action="export">Exportar JSON</button>
        <button class="s5-tool-action" type="button" data-action="reset">Restablecer referencia</button>
      </div>
      <p class="s5-tool-feedback" data-s5-tool-feedback hidden aria-live="polite"></p>
    </section>
  </form>

  <section class="s5-tool-results" aria-label="Resultados de coste y capacidad" aria-live="polite">
    <div class="s5-tool-kpis s5-voice-cost-kpis">
      <div class="s5-tool-kpi"><small>Coste mensual</small><strong data-output="monthlyCost">—</strong><span data-output="largestCost">—</span></div>
      <div class="s5-tool-kpi"><small>Coste por llamada</small><strong data-output="costPerCall">—</strong><span>incluye todas las partidas modeladas</span></div>
      <div class="s5-tool-kpi"><small>Coste por minuto conectado</small><strong data-output="costPerMinute">—</strong><span>útil para comparar escenarios de duración distinta</span></div>
    </div>

    <div class="s5-voice-cost-usage" aria-label="Volumen mensual derivado">
      <div><small>Minutos conectados</small><strong data-output="connectedMinutes">—</strong></div>
      <div><small>Audio del usuario</small><strong data-output="userMinutes">—</strong></div>
      <div><small>Audio del agente</small><strong data-output="agentMinutes">—</strong></div>
    </div>

    <div class="s5-voice-cost-breakdown" aria-label="Desglose del coste mensual">
      <div class="s5-voice-cost-row" data-cost-row="telephony"><span>Telefonía</span><div class="s5-voice-cost-row__track"></div><strong data-cost-amount>—</strong><small data-cost-share>—</small></div>
      <div class="s5-voice-cost-row" data-cost-row="media"><span>Media Streams</span><div class="s5-voice-cost-row__track"></div><strong data-cost-amount>—</strong><small data-cost-share>—</small></div>
      <div class="s5-voice-cost-row" data-cost-row="stt"><span>STT</span><div class="s5-voice-cost-row__track"></div><strong data-cost-amount>—</strong><small data-cost-share>—</small></div>
      <div class="s5-voice-cost-row" data-cost-row="tts"><span>TTS</span><div class="s5-voice-cost-row__track"></div><strong data-cost-amount>—</strong><small data-cost-share>—</small></div>
      <div class="s5-voice-cost-row" data-cost-row="llm"><span>LLM</span><div class="s5-voice-cost-row__track"></div><strong data-cost-amount>—</strong><small data-cost-share>—</small></div>
      <div class="s5-voice-cost-row" data-cost-row="fixed"><span>Fijo por llamada</span><div class="s5-voice-cost-row__track"></div><strong data-cost-amount>—</strong><small data-cost-share>—</small></div>
    </div>

    <div class="s5-voice-capacity-grid" aria-label="Capacidad concurrente">
      <div><small>Concurrencia media</small><strong data-output="averageConcurrency">—</strong><span>Pico/media: <span data-output="peakRatio">—</span></span></div>
      <div><small>Workers requeridos</small><strong data-output="workers">—</strong><span>sesiones objetivo / físicas: <span data-output="workerRead">—</span></span></div>
      <div><small>STT activos esperados en pico</small><strong data-output="sttStreams">—</strong><span class="s5-voice-quota" data-output="sttQuota">—</span></div>
      <div><small>TTS activos esperados en pico</small><strong data-output="ttsStreams">—</strong><span class="s5-voice-quota" data-output="ttsQuota">—</span></div>
    </div>

    <div class="s5-voice-cost-reference">
      <div><small>Snapshot de referencia</small><strong data-field="presetLabel">Referencia España · cascada</strong><p data-output="presetNote">Tarifas públicas verificadas el 21-08-2026; edítalas para reflejar tu contrato y región.</p></div>
      <strong>Datos: <span data-output="sourceUpdated">2026-08-21</span></strong>
    </div>

    <aside class="s5-tool-source" aria-label="Procedencia de precios">
      <div class="s5-tool-source__head"><a href="https://www.twilio.com/en-us/voice/pricing/es" target="_blank" rel="noopener noreferrer">Twilio · Voice pricing Spain</a><span>Verificado 21-08-2026</span></div>
      <p>El preset usa 0,0178 USD/min para una llamada saliente local a España y 0,0044 USD/min para Media Streams. Móvil, entrante, SIP/BYOC, impuestos y descuentos pueden cambiar la factura.</p>
    </aside>
  </section>
</div>

<section class="s5-tool-method" aria-labelledby="s5-vcc-method">
  <div><div class="s5-eyebrow">Método</div><h2 id="s5-vcc-method">No conviertas toda la llamada en la misma unidad facturable.</h2></div>
  <div class="s5-tool-method__body">
    <p><strong>Minutos conectados.</strong> Telefonía y transporte suelen seguir el tiempo de conexión. STT depende del audio de entrada que procesas. TTS puede facturarse por caracteres generados. El LLM sigue sus propios tokens. Mezclar estas bases produce estimaciones que parecen precisas pero no corresponden a la factura.</p>
    <div class="s5-tool-method__formula">monthly_cost = connected_min × (telephony + media) + user_audio_min × STT + agent_chars/1000 × TTS + LLM_tokens + fixed_per_call</div>
    <p><strong>Mezcla de habla.</strong> Los porcentajes de usuario y agente son independientes. Pueden sumar más de 100% si existe solapamiento por barge-in; cada dirección puede seguir generando uso facturable durante ese solape.</p>
    <p><strong>Concurrencia.</strong> La media se deriva del volumen mensual y las horas de servicio. El pico no: debe venir de tus trazas o de un forecast con granularidad suficiente. El cociente pico/media deja visible cuánto perderías si dimensionaras solo con el promedio.</p>
    <div class="s5-tool-method__formula">avg_concurrency = connected_minutes / service_minutes</div>
    <div class="s5-tool-method__formula">workers = ceil(peak_concurrency / (sessions_per_worker × target_utilization))</div>
    <p><strong>Streams activos.</strong> El planificador aproxima streams STT y TTS simultáneos multiplicando el pico de llamadas por la fracción de tiempo en la que habla cada lado. Es una expectativa de duty cycle, no un bound de cola. Para una garantía operativa usa percentiles medidos de sesiones simultáneas por proveedor.</p>
    <p><strong>Tarifas iniciales.</strong> OpenAI publica GPT Live Transcribe a 0,017 USD/min. ElevenLabs publica Flash/Turbo TTS a 0,05 USD por 1.000 caracteres y aproxima 1.000 caracteres a ~1 minuto. El LLM de referencia usa GPT-5.6 Luna a 0,20/1,20 USD por MTok de entrada/salida. Las cifras están fechadas y siguen siendo editables.</p>
    <div class="s5-voice-cost-note"><strong>No es una factura.</strong> No se incluyen números telefónicos mensuales, impuestos, recording, observability, tool calls, storage, transferencias, descuentos por volumen ni mínimos contractuales. Añade cualquier partida estable mediante “otros costes fijos por llamada” o ajusta las tarifas efectivas.</div>
    <p>Para optimizar tiempo de respuesta y no solo coste, usa también el <a href="/herramientas/latencia-agente-voz/">explorador de latencia de agentes de voz</a>. Para entender qué cambia al pasar de cascada a speech-to-speech, consulta <a href="/articulos-tecnicos/arquitecturas-agentes-voz/">arquitecturas de agentes de voz</a>.</p>
    <p><strong>Fuentes:</strong> <a href="https://www.twilio.com/en-us/voice/pricing/es" target="_blank" rel="noopener noreferrer">Twilio Voice Spain</a> · <a href="https://developers.openai.com/api/docs/models/gpt-live-transcribe" target="_blank" rel="noopener noreferrer">OpenAI GPT Live Transcribe</a> · <a href="https://developers.openai.com/api/docs/models/gpt-5.6-luna" target="_blank" rel="noopener noreferrer">OpenAI GPT-5.6 Luna</a> · <a href="https://elevenlabs.io/pricing/api" target="_blank" rel="noopener noreferrer">ElevenLabs API pricing</a>. Revisadas el 21-08-2026.</p>
  </div>
</section>

</div>
