---
title: Calculadora de coste y latencia de LLMs
description: Estima coste por solicitud, gasto mensual, tiempo de respuesta y concurrencia de una aplicación LLM a partir de tokens, caché, TTFT, velocidad y tráfico.
keywords: calculadora coste LLM, latencia LLM, TTFT, tokens por segundo, coste API LLM, prompt caching, concurrencia LLM
hide:
  - toc
  - navigation
  - footer
---

<link rel="stylesheet" href="/stylesheets/tools.css" />
<script src="/assets/javascripts/tools/llm-cost-latency-core.js" defer></script>
<script src="/assets/javascripts/tools/llm-cost-latency.js" defer></script>

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Calculadora de coste y latencia de LLMs — 5sigmas",
  "url": "https://5sigmas.com/herramientas/coste-latencia-llm/",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Any",
  "isAccessibleForFree": true,
  "description": "Calculadora interactiva para estimar coste, latencia y concurrencia media de una carga de trabajo con modelos de lenguaje.",
  "featureList": [
    "Coste por solicitud y coste mensual",
    "Entrada cacheada y no cacheada",
    "TTFT y velocidad de generación",
    "Estimación de concurrencia media mediante la ley de Little",
    "Escenario compartible y exportación JSON"
  ],
  "isPartOf": {"@type": "WebSite", "name": "5sigmas", "url": "https://5sigmas.com/"}
}
</script>

<div class="s5-landing s5-tool-page" data-s5-llm-calculator data-locale="es">

<section class="s5-page-intro">
  <div class="s5-eyebrow">Herramientas · LLMs · 01</div>
  <h1>Coste y latencia de un LLM, en el mismo escenario.</h1>
  <p>Introduce el tamaño de la solicitud, la carga y las características de respuesta. La calculadora separa precio, tiempo de respuesta y capacidad para que puedas ver qué variable está limitando el sistema.</p>
</section>

<div class="s5-tool-summary-strip" aria-label="Alcance de la estimación">
  <div><small>Modelo de coste</small><strong>tokens × tarifa</strong></div>
  <div><small>Modelo de latencia</small><strong>TTFT + generación</strong></div>
  <div><small>Modelo de capacidad</small><strong>ley de Little</strong></div>
</div>

<div class="s5-tool-workbench">
  <form class="s5-tool-controls" data-s5-tool-form aria-label="Supuestos de la calculadora" onsubmit="return false">
    <section class="s5-tool-controls__section">
      <h2>Modelo y precios</h2>
      <div class="s5-tool-field-grid s5-tool-field-grid--single">
        <div class="s5-tool-field">
          <label for="s5-es-model">Modelo o preset</label>
          <select id="s5-es-model" data-field="model" aria-describedby="s5-es-model-note"></select>
          <small id="s5-es-model-note">Los presets usan precios públicos verificados; todas las tarifas siguen siendo editables.</small>
        </div>
      </div>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field">
          <label for="s5-es-pin">Entrada · USD / 1M tokens</label>
          <input id="s5-es-pin" data-field="inputPrice" type="number" min="0" step="0.001" inputmode="decimal" />
        </div>
        <div class="s5-tool-field">
          <label for="s5-es-pcache">Entrada cacheada · USD / 1M</label>
          <input id="s5-es-pcache" data-field="cachedInputPrice" type="number" min="0" step="0.001" inputmode="decimal" />
        </div>
        <div class="s5-tool-field">
          <label for="s5-es-pout">Salida · USD / 1M tokens</label>
          <input id="s5-es-pout" data-field="outputPrice" type="number" min="0" step="0.001" inputmode="decimal" />
        </div>
        <div class="s5-tool-field">
          <label for="s5-es-cache">Entrada servida desde caché · %</label>
          <input id="s5-es-cache" data-field="cacheHitRate" type="number" min="0" max="100" step="1" inputmode="decimal" value="50" />
        </div>
      </div>
    </section>

    <section class="s5-tool-controls__section">
      <h2>Una solicitud</h2>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field">
          <label for="s5-es-input">Tokens de entrada</label>
          <input id="s5-es-input" data-field="inputTokens" type="number" min="0" step="100" inputmode="numeric" value="4000" />
        </div>
        <div class="s5-tool-field">
          <label for="s5-es-output">Tokens de salida</label>
          <input id="s5-es-output" data-field="outputTokens" type="number" min="0" step="50" inputmode="numeric" value="500" />
        </div>
        <div class="s5-tool-field">
          <label for="s5-es-ttft">TTFT · ms</label>
          <input id="s5-es-ttft" data-field="ttftMs" type="number" min="0" step="50" inputmode="decimal" value="650" />
          <small>Tiempo medido hasta el primer token.</small>
        </div>
        <div class="s5-tool-field">
          <label for="s5-es-tps">Velocidad · tokens/s</label>
          <input id="s5-es-tps" data-field="tokensPerSecond" type="number" min="0.01" step="1" inputmode="decimal" value="60" />
          <small>Velocidad de generación después del primer token.</small>
        </div>
      </div>
    </section>

    <section class="s5-tool-controls__section">
      <h2>Carga mensual y límites</h2>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field">
          <label for="s5-es-rpm">Solicitudes/minuto</label>
          <input id="s5-es-rpm" data-field="requestsPerMinute" type="number" min="0" step="1" inputmode="decimal" value="10" />
        </div>
        <div class="s5-tool-field">
          <label for="s5-es-conc">Concurrencia disponible</label>
          <input id="s5-es-conc" data-field="concurrency" type="number" min="0" step="1" inputmode="decimal" value="3" />
        </div>
        <div class="s5-tool-field">
          <label for="s5-es-hours">Horas activas/día</label>
          <input id="s5-es-hours" data-field="activeHoursPerDay" type="number" min="0" max="24" step="0.5" inputmode="decimal" value="8" />
        </div>
        <div class="s5-tool-field">
          <label for="s5-es-days">Días/mes</label>
          <input id="s5-es-days" data-field="daysPerMonth" type="number" min="0" max="31" step="1" inputmode="numeric" value="22" />
        </div>
        <div class="s5-tool-field">
          <label for="s5-es-budget">Presupuesto mensual · USD</label>
          <input id="s5-es-budget" data-field="monthlyBudgetUsd" type="number" min="0" step="50" inputmode="decimal" value="1500" />
        </div>
        <div class="s5-tool-field">
          <label for="s5-es-target">Objetivo respuesta · ms</label>
          <input id="s5-es-target" data-field="latencyTargetMs" type="number" min="0" step="100" inputmode="decimal" value="10000" />
        </div>
      </div>
      <div class="s5-tool-actions" aria-label="Acciones del escenario">
        <button class="s5-tool-action" type="button" data-action="share">Copiar enlace</button>
        <button class="s5-tool-action" type="button" data-action="export">Exportar JSON</button>
        <button class="s5-tool-action" type="button" data-action="reset">Restablecer</button>
      </div>
      <p class="s5-tool-feedback" data-s5-tool-feedback hidden aria-live="polite"></p>
    </section>
  </form>

  <section class="s5-tool-results" aria-label="Resultados calculados" aria-live="polite">
    <div class="s5-tool-kpis">
      <div class="s5-tool-kpi">
        <small>Coste / solicitud</small>
        <strong data-output="costPerRequest">—</strong>
        <span>entrada + caché + salida</span>
      </div>
      <div class="s5-tool-kpi">
        <small>Coste mensual</small>
        <strong data-output="monthlyCost">—</strong>
        <span data-output="requestsPerMonth">—</span>
      </div>
      <div class="s5-tool-kpi">
        <small>Tiempo de respuesta</small>
        <strong data-output="responseTime">—</strong>
        <span>hasta el último token estimado</span>
      </div>
      <div class="s5-tool-kpi">
        <small>Concurrencia media necesaria</small>
        <strong data-output="requiredConcurrency">—</strong>
        <span>carga media, sin modelar colas ni picos</span>
      </div>
    </div>

    <div class="s5-tool-status-grid" aria-label="Comprobaciones frente a objetivos">
      <div class="s5-tool-status" data-output="budgetStatus" data-label="Presupuesto">—</div>
      <div class="s5-tool-status" data-output="latencyStatus" data-label="Latencia">—</div>
      <div class="s5-tool-status" data-output="capacityStatus" data-label="Capacidad">—</div>
    </div>

    <div class="s5-tool-breakdowns">
      <div class="s5-tool-breakdown">
        <div class="s5-tool-breakdown__head"><strong>De dónde sale el coste</strong><span>por solicitud</span></div>
        <div class="s5-tool-bar" aria-label="Desglose relativo de coste">
          <span data-cost-bar="uncached" title="Entrada no cacheada"></span>
          <span data-cost-bar="cached" title="Entrada cacheada"></span>
          <span data-cost-bar="output" title="Salida"></span>
        </div>
        <div class="s5-tool-legend"><span>Entrada no cacheada</span><span>Entrada cacheada</span><span>Salida</span></div>
      </div>

      <div class="s5-tool-breakdown">
        <div class="s5-tool-breakdown__head"><strong>De dónde sale el tiempo</strong><span>respuesta completa</span></div>
        <div class="s5-tool-bar" aria-label="Desglose relativo de latencia">
          <span data-latency-bar="ttft" title="TTFT"></span>
          <span data-latency-bar="generation" title="Generación"></span>
        </div>
        <div class="s5-tool-legend"><span>TTFT</span><span>Generación posterior al primer token</span></div>
      </div>
    </div>

    <div class="s5-tool-detail-grid" aria-label="Detalles de latencia y capacidad">
      <div><small>TTFT</small><strong data-output="ttft">—</strong></div>
      <div><small>Generación</small><strong data-output="generationTime">—</strong></div>
      <div><small>Capacidad aproximada</small><strong data-output="capacityRpm">—</strong></div>
      <div><small>Holgura de capacidad</small><strong data-output="headroom">—</strong></div>
    </div>

    <aside class="s5-tool-source" aria-label="Procedencia de los precios">
      <div class="s5-tool-source__head">
        <a data-output="sourceLink" target="_blank" rel="noopener noreferrer">Preset</a>
        <span data-output="sourceDate"></span>
      </div>
      <p data-output="sourceNote"></p>
    </aside>
  </section>
</div>

<section class="s5-tool-method" aria-labelledby="s5-tool-method-title">
  <div>
    <div class="s5-eyebrow">Método</div>
    <h2 id="s5-tool-method-title">Qué calcula y qué no.</h2>
  </div>
  <div class="s5-tool-method__body">
    <p><strong>Coste.</strong> Separa tokens de entrada no cacheados, tokens servidos desde caché y tokens de salida. Los precios del preset son un punto de partida: puedes sustituirlos por tu contrato, batch pricing o cualquier tarifa efectiva.</p>
    <div class="s5-tool-method__formula">coste = (T<sub>in,no-cache</sub> × P<sub>in</sub> + T<sub>in,cache</sub> × P<sub>cache</sub> + T<sub>out</sub> × P<sub>out</sub>) / 1.000.000</div>
    <p><strong>Latencia.</strong> TTFT representa todo lo que ocurre hasta recibir el primer token. Después se aproxima la generación como <code>(tokens_salida − 1) / tokens_por_segundo</code>. Es un modelo de respuesta completa, no de latencia percibida durante streaming.</p>
    <div class="s5-tool-method__formula">tiempo_respuesta ≈ TTFT + (T<sub>out</sub> − 1) / velocidad</div>
    <p><strong>Capacidad.</strong> Para carga estable se aplica la ley de Little: concurrencia media ≈ tasa de llegada × tiempo en servicio. Sirve para presupuestar capacidad media; no sustituye un modelo de colas para tráfico bursty, p95/p99, rate limits, retries o batching.</p>
    <div class="s5-tool-method__formula">concurrencia_media ≈ solicitudes/segundo × segundos/solicitud</div>
    <p class="s5-tool-method__notes">No se incluyen llamadas a tools, búsquedas web, almacenamiento de caché, cargos por audio/imagen, prioridad, descuentos de volumen ni infraestructura propia salvo que los incorpores en las tarifas. Los presets que tienen reglas de contexto largo conocidas las aplican automáticamente y lo indican junto a la fuente.</p>
  </div>
</section>

<section class="s5-section" aria-labelledby="s5-tool-related">
  <div class="s5-section-head">
    <h2 id="s5-tool-related">Para interpretar el resultado</h2>
  </div>
  <div class="s5-simple-list">
    <a class="s5-list-row" href="/temas/llms/"><span class="s5-list-row__n">01</span><span class="s5-list-row__title">Qué es un LLM</span><span class="s5-list-row__desc">Tokens, generación y contexto antes de convertirlos en coste.</span><span class="s5-list-row__meta">Concepto</span></a>
    <a class="s5-list-row" href="/series/modelos-razonadores/04-latencia-streaming/"><span class="s5-list-row__n">02</span><span class="s5-list-row__title">Latencia, streaming e interacción humana</span><span class="s5-list-row__desc">Por qué TTFT, velocidad de generación y tiempo total describen experiencias distintas.</span><span class="s5-list-row__meta">Capítulo</span></a>
    <a class="s5-list-row" href="/articulos-tecnicos/voice-agent-architectures/"><span class="s5-list-row__n">03</span><span class="s5-list-row__title">Arquitecturas de agentes de voz</span><span class="s5-list-row__desc">Cómo se acumulan presupuestos de latencia cuando el LLM es solo una etapa del sistema.</span><span class="s5-list-row__meta">Ingeniería</span></a>
  </div>
</section>

<section class="s5-section" aria-labelledby="s5-tool-sources">
  <div class="s5-section-head">
    <h2 id="s5-tool-sources">Fuentes de los presets</h2>
  </div>
  <p>La capa de datos guarda la organización, URL primaria y fecha de verificación de cada preset. En esta versión se incluyen páginas oficiales de <a href="https://developers.openai.com/api/docs/models" target="_blank" rel="noopener noreferrer">OpenAI</a>, <a href="https://www.anthropic.com/news/claude-sonnet-5" target="_blank" rel="noopener noreferrer">Anthropic</a> y <a href="https://ai.google.dev/gemini-api/docs/pricing" target="_blank" rel="noopener noreferrer">Google AI for Developers</a>. Los precios pueden cambiar; revisa siempre el enlace mostrado para el modelo seleccionado antes de tomar una decisión contractual.</p>
</section>

</div>
