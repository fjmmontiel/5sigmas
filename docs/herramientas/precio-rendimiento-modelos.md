---
title: Explorador de precio y rendimiento de modelos de IA
description: Compara coste por solicitud, Artificial Analysis Intelligence Index, velocidad, TTFT y contexto de modelos actuales con fuentes y supuestos visibles.
keywords: comparar modelos IA, precio rendimiento LLM, benchmark LLM, Artificial Analysis Intelligence Index, velocidad tokens por segundo, TTFT modelos IA
hide:
  - toc
  - navigation
  - footer
---

<link rel="stylesheet" href="/stylesheets/tools.css" />
<script src="/assets/javascripts/tools/model-price-performance-core.js" defer></script>
<script src="/assets/javascripts/tools/model-price-performance.js" defer></script>

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Explorador de precio y rendimiento de modelos de IA — 5sigmas",
  "url": "https://5sigmas.com/herramientas/precio-rendimiento-modelos/",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Any",
  "isAccessibleForFree": true,
  "description": "Explorador interactivo para comparar coste por carga de trabajo, inteligencia medida, velocidad, latencia y contexto de modelos de IA con procedencia explícita.",
  "featureList": [
    "Coste por solicitud para una carga editable",
    "Artificial Analysis Intelligence Index",
    "Velocidad de salida y TTFT medidos",
    "Ventana de contexto",
    "Frontera de Pareto precio/inteligencia",
    "Filtros, enlace compartible y exportación CSV"
  ],
  "isPartOf": {"@type": "WebSite", "name": "5sigmas", "url": "https://5sigmas.com/"}
}
</script>

<div class="s5-landing s5-tool-page" data-s5-model-explorer data-locale="es">

<section class="s5-page-intro">
  <div class="s5-eyebrow">Herramientas · Modelos · 02</div>
  <h1>Compara modelos para tu carga, no con un ranking único.</h1>
  <p>Define el tamaño de una solicitud y filtra por inteligencia medida, latencia, contexto o coste. El explorador mantiene separados el precio del proveedor y las mediciones independientes de Artificial Analysis para que puedas ver el compromiso entre calidad, velocidad y gasto.</p>
</section>

<div class="s5-tool-summary-strip" aria-label="Datos utilizados en la comparación">
  <div><small>Calidad</small><strong>Intelligence Index</strong></div>
  <div><small>Rendimiento</small><strong>tokens/s + TTFT</strong></div>
  <div><small>Precio</small><strong>API oficial vigente</strong></div>
</div>

<div class="s5-tool-workbench s5-model-workbench">
  <form class="s5-tool-controls" data-s5-tool-form aria-label="Supuestos y filtros del explorador" onsubmit="return false">
    <section class="s5-tool-controls__section">
      <h2>Carga de trabajo</h2>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field">
          <label for="s5-model-es-input">Tokens de entrada</label>
          <input id="s5-model-es-input" data-field="inputTokens" type="number" min="0" step="500" inputmode="numeric" value="4000" />
        </div>
        <div class="s5-tool-field">
          <label for="s5-model-es-output">Tokens de salida facturados</label>
          <input id="s5-model-es-output" data-field="outputTokens" type="number" min="0" step="100" inputmode="numeric" value="500" />
        </div>
      </div>
      <p class="s5-tool-control-note">El coste mostrado usa estas cantidades y las tarifas estándar vigentes. Si el proveedor aplica una regla publicada de contexto largo, se incorpora automáticamente.</p>
    </section>

    <section class="s5-tool-controls__section">
      <h2>Filtros</h2>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field">
          <label for="s5-model-es-provider">Proveedor</label>
          <select id="s5-model-es-provider" data-field="provider"></select>
        </div>
        <div class="s5-tool-field">
          <label for="s5-model-es-quality">Índice mínimo</label>
          <input id="s5-model-es-quality" data-field="minIntelligence" type="number" min="0" step="1" inputmode="numeric" value="0" />
        </div>
        <div class="s5-tool-field">
          <label for="s5-model-es-ttft">TTFT máximo · s</label>
          <input id="s5-model-es-ttft" data-field="maxTtftSeconds" type="number" min="0" step="1" inputmode="decimal" value="0" />
          <small>0 = sin límite.</small>
        </div>
        <div class="s5-tool-field">
          <label for="s5-model-es-context">Contexto mínimo · tokens</label>
          <input id="s5-model-es-context" data-field="minContextTokens" type="number" min="0" step="1000" inputmode="numeric" value="0" />
          <small>0 = sin límite.</small>
        </div>
        <div class="s5-tool-field">
          <label for="s5-model-es-cost">Coste máximo / solicitud · USD</label>
          <input id="s5-model-es-cost" data-field="maxCostPerRequest" type="number" min="0" step="0.001" inputmode="decimal" value="0" />
          <small>0 = sin límite.</small>
        </div>
      </div>
    </section>

    <section class="s5-tool-controls__section">
      <h2>Vista</h2>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field">
          <label for="s5-model-es-x">Eje X</label>
          <select id="s5-model-es-x" data-field="xAxis">
            <option value="cost" selected>Coste por solicitud</option>
            <option value="intelligence">Intelligence Index</option>
            <option value="speed">Velocidad de salida</option>
            <option value="latency">TTFT</option>
            <option value="context">Contexto</option>
          </select>
        </div>
        <div class="s5-tool-field">
          <label for="s5-model-es-y">Eje Y</label>
          <select id="s5-model-es-y" data-field="yAxis">
            <option value="intelligence" selected>Intelligence Index</option>
            <option value="cost">Coste por solicitud</option>
            <option value="speed">Velocidad de salida</option>
            <option value="latency">TTFT</option>
            <option value="context">Contexto</option>
          </select>
        </div>
        <div class="s5-tool-field">
          <label for="s5-model-es-sort">Orden de la tabla</label>
          <select id="s5-model-es-sort" data-field="sortBy">
            <option value="frontier" selected>Frontera → índice</option>
            <option value="intelligence">Mayor índice</option>
            <option value="cost">Menor coste</option>
            <option value="speed">Mayor velocidad</option>
            <option value="latency">Menor TTFT</option>
            <option value="context">Mayor contexto</option>
          </select>
        </div>
      </div>
      <div class="s5-tool-actions" aria-label="Acciones del escenario">
        <button class="s5-tool-action" type="button" data-action="share">Copiar enlace</button>
        <button class="s5-tool-action" type="button" data-action="export">Exportar CSV</button>
        <button class="s5-tool-action" type="button" data-action="reset">Restablecer</button>
      </div>
      <p class="s5-tool-feedback" data-s5-tool-feedback hidden aria-live="polite"></p>
    </section>
  </form>

  <section class="s5-tool-results s5-model-results" aria-label="Comparación de modelos" aria-live="polite">
    <div class="s5-model-counts">
      <div><small>Visibles</small><strong data-output="visibleCount">—</strong></div>
      <div><small>En frontera</small><strong data-output="frontierCount">—</strong></div>
      <p data-output="summarySentence">Cargando datos…</p>
    </div>

    <div class="s5-tool-kpis s5-model-kpis" aria-label="Referencias del conjunto filtrado">
      <div class="s5-tool-kpi" data-output="smartest"><small>Mayor índice</small><strong>—</strong></div>
      <div class="s5-tool-kpi" data-output="cheapest"><small>Menor coste</small><strong>—</strong></div>
      <div class="s5-tool-kpi" data-output="fastest"><small>Mayor velocidad</small><strong>—</strong></div>
      <div class="s5-tool-kpi" data-output="lowestLatency"><small>Menor TTFT</small><strong>—</strong></div>
    </div>

    <section class="s5-model-chart-wrap" aria-labelledby="s5-model-chart-title">
      <div class="s5-tool-breakdown__head"><strong id="s5-model-chart-title">Mapa comparativo</strong><span>selecciona un punto para ver su procedencia</span></div>
      <div class="s5-model-chart" data-model-chart>
        <div class="s5-model-chart__ylabel" data-output="chartYLabel">Intelligence Index</div>
        <div class="s5-model-chart__plot">
          <span class="s5-model-chart__ymax" data-output="chartYMax"></span>
          <span class="s5-model-chart__ymin" data-output="chartYMin"></span>
          <div class="s5-model-chart__points" data-model-chart-points></div>
          <p class="s5-model-chart__empty" data-output="chartEmpty"></p>
        </div>
        <div class="s5-model-chart__xscale"><span data-output="chartXMin"></span><strong data-output="chartXLabel">Coste por solicitud</strong><span data-output="chartXMax"></span></div>
      </div>
      <p class="s5-model-frontier-note"><strong>Frontera precio/inteligencia:</strong> un modelo entra cuando ningún otro consigue a la vez un índice igual o mayor y un coste igual o menor para la solicitud definida.</p>
    </section>

    <aside class="s5-model-focus" data-model-focus aria-live="polite"></aside>
  </section>
</div>

<section class="s5-section s5-model-table-section" aria-labelledby="s5-model-table-title">
  <div class="s5-section-head s5-section-head--with-copy">
    <div><div class="s5-eyebrow">Datos comparables</div><h2 id="s5-model-table-title">La misma comparación, sin ocultar dimensiones.</h2></div>
    <p>Las variantes de razonamiento se comparan como configuraciones distintas. Un índice alto no implica que el modelo sea mejor para todas las tareas.</p>
  </div>
  <div class="s5-model-table-scroll" role="region" aria-label="Tabla de comparación de modelos" tabindex="0">
    <table class="s5-model-table">
      <thead><tr><th>Modelo</th><th>Coste</th><th>Índice</th><th>tokens/s</th><th>TTFT</th><th>Contexto</th><th>Lectura</th></tr></thead>
      <tbody data-model-table-body></tbody>
    </table>
  </div>
</section>

<section class="s5-tool-method" aria-labelledby="s5-model-method-title">
  <div><div class="s5-eyebrow">Método</div><h2 id="s5-model-method-title">Qué significan las cifras.</h2></div>
  <div class="s5-tool-method__body">
    <p><strong>Coste.</strong> El explorador aplica el precio estándar público del proveedor a los tokens que defines. En GPT-5.6 también aplica el multiplicador publicado cuando la entrada supera 272k tokens. No incluye caché, herramientas, búsquedas, descuentos, batch ni tiers premium.</p>
    <div class="s5-tool-method__formula">coste_solicitud = T<sub>entrada</sub> × P<sub>entrada</sub> / 10⁶ + T<sub>salida</sub> × P<sub>salida</sub> / 10⁶</div>
    <p><strong>Intelligence Index.</strong> Es el índice compuesto de Artificial Analysis para la configuración indicada. Resume varias evaluaciones de razonamiento, conocimiento, código y trabajo con herramientas. Es una señal útil para comparar, no una medida universal de «inteligencia» ni un sustituto de tus evals.</p>
    <p><strong>Velocidad y TTFT.</strong> Artificial Analysis los mide contra APIs reales. <em>tokens/s</em> describe la velocidad una vez iniciada la salida; TTFT mide el tiempo hasta el primer token. En modelos razonadores, la latencia puede estar dominada por el tiempo de deliberación y cambiar mucho con el esfuerzo elegido.</p>
    <p><strong>Frontera.</strong> No se calcula una puntuación secreta ni se asignan pesos arbitrarios. La frontera de Pareto solo identifica configuraciones que no están dominadas simultáneamente en coste e Intelligence Index.</p>
    <p class="s5-tool-method__notes">Datos verificados el 21 de agosto de 2026. Las mediciones de rendimiento y los benchmarks cambian; la selección es deliberadamente pequeña y solo incluye configuraciones para las que podemos mantener precio, especificaciones y rendimiento con procedencia explícita.</p>
  </div>
</section>

<section class="s5-section" aria-labelledby="s5-model-sources-title">
  <details class="s5-model-sources-details">
    <summary id="s5-model-sources-title">Fuentes y fecha de verificación</summary>
    <div class="s5-model-sources" data-model-sources></div>
  </details>
</section>

<section class="s5-section" aria-labelledby="s5-model-related">
  <div class="s5-section-head"><h2 id="s5-model-related">Para decidir con más contexto</h2></div>
  <div class="s5-simple-list">
    <a class="s5-list-row" href="/temas/evaluacion-modelos/"><span class="s5-list-row__n">01</span><span class="s5-list-row__title">Evaluación de modelos</span><span class="s5-list-row__desc">Por qué un benchmark no es el objetivo y cómo construir evals representativas.</span><span class="s5-list-row__meta">Concepto</span></a>
    <a class="s5-list-row" href="/herramientas/coste-latencia-llm/"><span class="s5-list-row__n">02</span><span class="s5-list-row__title">Coste y latencia de LLMs</span><span class="s5-list-row__desc">Pasa de la comparación de modelos a un presupuesto de tráfico, concurrencia y latencia.</span><span class="s5-list-row__meta">Herramienta</span></a>
    <a class="s5-list-row" href="/temas/llms/"><span class="s5-list-row__n">03</span><span class="s5-list-row__title">Qué es un LLM</span><span class="s5-list-row__desc">Tokens, contexto y generación detrás de estas métricas.</span><span class="s5-list-row__meta">Concepto</span></a>
  </div>
</section>

</div>
