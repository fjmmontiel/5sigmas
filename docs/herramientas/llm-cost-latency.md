---
title: Calculadora de coste y latencia de LLMs
description: Calcula coste por solicitud, coste mensual, tiempo de respuesta y concurrencia aproximada de un LLM a partir de tokens, precios, TTFT, velocidad de salida y tráfico.
hide:
  - toc
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Calculadora de coste y latencia de LLMs",
  "url": "https://5sigmas.com/herramientas/llm-cost-latency/",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Any",
  "isAccessibleForFree": true,
  "inLanguage": "es",
  "description": "Calculadora interactiva para estimar coste por solicitud, coste mensual, latencia de respuesta y concurrencia aproximada de cargas LLM.",
  "creator": {"@type": "Person", "name": "Francisco Maldonado", "url": "https://5sigmas.com/meta/about/"},
  "isPartOf": {"@type": "WebSite", "name": "5sigmas", "url": "https://5sigmas.com/"}
}
</script>

<div class="s5-tool-page" data-s5-tool="llm-cost-latency" data-lang="es" data-invalid-message="Revisa los valores: no se admiten negativos, la caché debe estar entre 0 y 100 % y la velocidad de salida debe ser mayor que cero." data-share-copied="Enlace con este escenario copiado." data-reset-message="Escenario restablecido." data-downloaded-message="CSV descargado." data-download-name="5sigmas-coste-latencia-llm.csv">

<section class="s5-tool-intro">
  <div class="s5-eyebrow">Herramienta 01 · Coste y rendimiento</div>
  <h1>Coste y latencia de un LLM.</h1>
  <p>Introduce el patrón de tokens, las tarifas que quieras evaluar y el rendimiento observado. La calculadora separa coste de entrada, caché y salida; después estima el tiempo de respuesta y la concurrencia necesaria durante el pico de tráfico.</p>
  <div class="s5-tool-meta-line">
    <span>Precios editables</span>
    <span>Estado compartible por URL</span>
    <span>Exportación CSV</span>
  </div>
</section>

<section class="s5-tool-workspace" aria-label="Calculadora de coste y latencia">
  <form class="s5-tool-controls" data-s5-tool-form novalidate>
    <div class="s5-tool-controls__group">
      <h2>Tokens por solicitud</h2>
      <div class="s5-tool-control-grid">
        <div class="s5-tool-field">
          <label for="s5-it">Tokens de entrada</label>
          <div class="s5-tool-field__input"><input id="s5-it" data-key="inputTokens" type="number" min="0" step="1" value="1800" inputmode="numeric"><span class="s5-tool-field__unit">tokens</span></div>
          <small>System prompt, historial, RAG y mensaje actual.</small>
        </div>
        <div class="s5-tool-field">
          <label for="s5-cp">Entrada servida desde caché</label>
          <div class="s5-tool-field__input"><input id="s5-cp" data-key="cachedPct" type="number" min="0" max="100" step="1" value="35" inputmode="decimal"><span class="s5-tool-field__unit">%</span></div>
          <small>Proporción de tokens de entrada facturada a la tarifa de caché.</small>
        </div>
        <div class="s5-tool-field">
          <label for="s5-ot">Tokens de salida</label>
          <div class="s5-tool-field__input"><input id="s5-ot" data-key="outputTokens" type="number" min="0" step="1" value="450" inputmode="numeric"><span class="s5-tool-field__unit">tokens</span></div>
          <small>Longitud media generada por respuesta.</small>
        </div>
      </div>
    </div>

    <div class="s5-tool-controls__group">
      <h2>Tarifas</h2>
      <div class="s5-tool-control-grid">
        <div class="s5-tool-field">
          <label for="s5-ip">Entrada sin caché</label>
          <div class="s5-tool-field__input"><input id="s5-ip" data-key="inputPrice" type="number" min="0" step="0.01" value="2.50" inputmode="decimal"><span class="s5-tool-field__unit">$/1M</span></div>
          <small>Valor ilustrativo, no una tarifa de proveedor.</small>
        </div>
        <div class="s5-tool-field">
          <label for="s5-kp">Entrada en caché</label>
          <div class="s5-tool-field__input"><input id="s5-kp" data-key="cachedPrice" type="number" min="0" step="0.01" value="0.25" inputmode="decimal"><span class="s5-tool-field__unit">$/1M</span></div>
          <small>Si no hay descuento de caché, usa la misma tarifa de entrada.</small>
        </div>
        <div class="s5-tool-field">
          <label for="s5-op">Salida</label>
          <div class="s5-tool-field__input"><input id="s5-op" data-key="outputPrice" type="number" min="0" step="0.01" value="10.00" inputmode="decimal"><span class="s5-tool-field__unit">$/1M</span></div>
          <small>Sustituye los valores por la tabla de precios vigente del modelo.</small>
        </div>
      </div>
    </div>

    <div class="s5-tool-controls__group">
      <h2>Latencia observada</h2>
      <div class="s5-tool-control-grid">
        <div class="s5-tool-field">
          <label for="s5-ttft">TTFT</label>
          <div class="s5-tool-field__input"><input id="s5-ttft" data-key="ttftMs" type="number" min="0" step="10" value="450" inputmode="numeric"><span class="s5-tool-field__unit">ms</span></div>
          <small>Tiempo hasta recibir el primer token del modelo.</small>
        </div>
        <div class="s5-tool-field">
          <label for="s5-tps">Velocidad de salida</label>
          <div class="s5-tool-field__input"><input id="s5-tps" data-key="outputTps" type="number" min="0.01" step="1" value="70" inputmode="decimal"><span class="s5-tool-field__unit">tok/s</span></div>
          <small>Throughput medio una vez empieza la generación.</small>
        </div>
        <div class="s5-tool-field">
          <label for="s5-oh">Resto del sistema</label>
          <div class="s5-tool-field__input"><input id="s5-oh" data-key="overheadMs" type="number" min="0" step="10" value="150" inputmode="numeric"><span class="s5-tool-field__unit">ms</span></div>
          <small>Red, serialización, RAG, tools u otras etapas fuera del modelo.</small>
        </div>
      </div>
    </div>

    <div class="s5-tool-controls__group">
      <h2>Tráfico</h2>
      <div class="s5-tool-control-grid">
        <div class="s5-tool-field">
          <label for="s5-rd">Solicitudes al día</label>
          <div class="s5-tool-field__input"><input id="s5-rd" data-key="requestsDay" type="number" min="0" step="100" value="10000" inputmode="numeric"><span class="s5-tool-field__unit">req/día</span></div>
          <small>El coste mensual usa 30 días.</small>
        </div>
        <div class="s5-tool-field">
          <label for="s5-rpm">Pico de solicitudes</label>
          <div class="s5-tool-field__input"><input id="s5-rpm" data-key="peakRequestsMin" type="number" min="0" step="1" value="240" inputmode="numeric"><span class="s5-tool-field__unit">req/min</span></div>
          <small>Se usa para estimar solicitudes simultáneas en vuelo.</small>
        </div>
      </div>
    </div>

    <div class="s5-tool-actions" aria-label="Acciones del escenario">
      <button class="s5-tool-button" type="button" data-action="share">Copiar escenario</button>
      <button class="s5-tool-button s5-tool-button--secondary" type="button" data-action="download">Descargar CSV</button>
      <button class="s5-tool-button s5-tool-button--secondary" type="button" data-action="reset">Restablecer</button>
    </div>
    <div class="s5-tool-live-status" data-s5-live-status role="status" aria-live="polite"></div>
  </form>

  <div class="s5-tool-results" aria-live="polite">
    <div class="s5-tool-results__primary">
      <div class="s5-tool-metric"><span class="s5-tool-metric__label">Coste por solicitud</span><strong class="s5-tool-metric__value" data-output="request-cost">—</strong><span class="s5-tool-metric__hint">Entrada + caché + salida</span></div>
      <div class="s5-tool-metric"><span class="s5-tool-metric__label">Coste mensual</span><strong class="s5-tool-metric__value" data-output="monthly-cost">—</strong><span class="s5-tool-metric__hint"><span data-output="monthly-requests">—</span> solicitudes / 30 días</span></div>
      <div class="s5-tool-metric"><span class="s5-tool-metric__label">Tiempo de respuesta</span><strong class="s5-tool-metric__value" data-output="response-time">—</strong><span class="s5-tool-metric__hint">Overhead + TTFT + generación</span></div>
      <div class="s5-tool-metric"><span class="s5-tool-metric__label">Concurrencia en pico</span><strong class="s5-tool-metric__value" data-output="peak-concurrency">—</strong><span class="s5-tool-metric__hint">Solicitudes simultáneas aproximadas</span></div>
    </div>

    <div class="s5-tool-breakdown">
      <div class="s5-tool-breakdown__head"><span>Desglose del coste por solicitud</span><span data-output="thousand-cost">—</span></div>
      <div class="s5-tool-cost-bar" aria-hidden="true"><span data-cost-bar="input"></span><span data-cost-bar="cached"></span><span data-cost-bar="output"></span></div>
      <div class="s5-tool-breakdown__legend">
        <div>Entrada sin caché<strong data-output="input-cost">—</strong></div>
        <div>Entrada en caché<strong data-output="cached-cost">—</strong></div>
        <div>Salida<strong data-output="output-cost">—</strong></div>
      </div>
    </div>

    <div class="s5-tool-interpretation">
      <h2>Lectura del escenario</h2>
      <p data-s5-interpretation>—</p>
    </div>
    <div class="s5-tool-live-status">Volumen mensual aproximado: <strong data-output="monthly-tokens">—</strong> tokens. El valor mostrado junto al desglose es el coste de 1.000 solicitudes.</div>
  </div>
</section>

<section class="s5-tool-method" aria-labelledby="s5-method-title">
  <h2 id="s5-method-title">Qué calcula y qué no.</h2>
  <div class="s5-tool-method__body">
    <p>Los precios iniciales son un escenario ilustrativo. No representan la tarifa vigente de ningún proveedor. La calculadora no mantiene una base de precios: introduce los valores de la documentación actual del modelo que quieras estudiar.</p>
    <span class="s5-tool-method__formula">coste = tokens_entrada_sin_cache × precio_entrada + tokens_cache × precio_cache + tokens_salida × precio_salida</span>
    <span class="s5-tool-method__formula">latencia ≈ overhead + TTFT + tokens_salida / tokens_por_segundo</span>
    <span class="s5-tool-method__formula">concurrencia_en_pico ≈ (solicitudes_por_segundo) × tiempo_de_respuesta</span>
    <p>La tercera relación aplica la intuición de la ley de Little, <em>L = λW</em>, a una carga estable. Es una aproximación de capacidad, no un modelo de colas completo. No incorpora rate limits, batching, colas del proveedor, retries, distribución de longitudes, jitter de red ni percentiles de latencia. Para dimensionar producción conviene usar medidas p50/p95/p99 y la distribución real del tráfico.</p>
    <p>Referencia metodológica: John D. C. Little, “A Proof for the Queuing Formula: L = λW”, <em>Operations Research</em> 9(3), 1961, <a href="https://doi.org/10.1287/opre.9.3.383">doi:10.1287/opre.9.3.383</a>.</p>
  </div>
</section>

<section class="s5-tool-related" aria-labelledby="s5-related-title">
  <h2 id="s5-related-title">Profundiza en el mecanismo.</h2>
  <div class="s5-tool-related__links">
    <a href="/temas/llms/">Qué es un LLM y cómo genera tokens →</a>
    <a href="/temas/razonamiento/">Razonamiento, coste y test-time compute →</a>
    <a href="/articulos-tecnicos/voice-agent-architectures/">Latencia en arquitecturas de agentes de voz →</a>
  </div>
</section>

</div>
