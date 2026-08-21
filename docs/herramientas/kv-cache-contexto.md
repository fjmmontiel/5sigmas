---
title: Explorador de KV cache y ventana de contexto
description: Visualiza cómo crece la KV cache de un Transformer con contexto, concurrencia, GQA/MQA y precisión, y compárala con un presupuesto de memoria.
keywords: KV cache LLM, ventana de contexto, memoria contexto LLM, GQA, MQA, atención multi-head, memoria inferencia
hide:
  - toc
  - navigation
  - footer
---

<link rel="stylesheet" href="/stylesheets/tools.css" />
<script src="/assets/javascripts/tools/kv-context-core.js" defer></script>
<script src="/assets/javascripts/tools/kv-context.js" defer></script>

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Explorador de KV cache y ventana de contexto — 5sigmas",
  "url": "https://5sigmas.com/herramientas/kv-cache-contexto/",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Any",
  "isAccessibleForFree": true,
  "description": "Explorador interactivo del crecimiento de la KV cache según arquitectura, contexto, concurrencia y precisión.",
  "featureList": [
    "Curva de memoria KV frente a longitud de contexto",
    "Comparación GQA/MQA frente a atención multi-head completa",
    "Presupuesto editable de KV cache",
    "Contexto y concurrencia máximos limitados por memoria",
    "Escenario compartible y exportación CSV"
  ],
  "isPartOf": {"@type": "WebSite", "name": "5sigmas", "url": "https://5sigmas.com/"}
}
</script>

<div class="s5-landing s5-tool-page" data-s5-kv-context data-locale="es">

<section class="s5-page-intro">
  <div class="s5-eyebrow">Herramientas · Infraestructura · 04</div>
  <h1>Ve cuánto contexto cabe en la KV cache.</h1>
  <p>La KV cache crece linealmente con tokens residentes y secuencias concurrentes. Cambia la geometría de atención, la precisión y el presupuesto de memoria para ver cuándo el contexto se convierte en el límite.</p>
</section>

<div class="s5-tool-summary-strip" aria-label="Relaciones principales">
  <div><small>Contexto</small><strong>tokens × secuencias</strong></div>
  <div><small>Por token</small><strong>capas × K/V × cabezas KV</strong></div>
  <div><small>GQA/MQA</small><strong>menos cabezas KV que query</strong></div>
</div>

<div class="s5-tool-workbench">
  <form class="s5-tool-controls" data-s5-tool-form aria-label="Supuestos de KV cache" onsubmit="return false">
    <section class="s5-tool-controls__section">
      <h2>Arquitectura</h2>
      <div class="s5-tool-field-grid s5-tool-field-grid--single">
        <div class="s5-tool-field">
          <label for="s5-kv-es-preset">Preset</label>
          <select id="s5-kv-es-preset" data-field="preset"></select>
          <small>Los presets usan la geometría publicada por Meta. Los campos siguen siendo editables.</small>
        </div>
      </div>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field"><label for="s5-kv-es-l">Capas</label><input id="s5-kv-es-l" data-field="layers" type="number" min="1" step="1" inputmode="numeric" value="32" /></div>
        <div class="s5-tool-field"><label for="s5-kv-es-h">Tamaño oculto</label><input id="s5-kv-es-h" data-field="hiddenSize" type="number" min="1" step="1" inputmode="numeric" value="4096" /></div>
        <div class="s5-tool-field"><label for="s5-kv-es-ah">Cabezas de atención</label><input id="s5-kv-es-ah" data-field="attentionHeads" type="number" min="1" step="1" inputmode="numeric" value="32" /></div>
        <div class="s5-tool-field"><label for="s5-kv-es-kvh">Cabezas KV</label><input id="s5-kv-es-kvh" data-field="kvHeads" type="number" min="1" step="1" inputmode="numeric" value="8" /><small>GQA/MQA reduce este valor frente a las cabezas de consulta.</small></div>
      </div>
    </section>

    <section class="s5-tool-controls__section">
      <h2>Carga residente</h2>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field"><label for="s5-kv-es-bits">Precisión de KV cache · bits</label><input id="s5-kv-es-bits" data-field="kvBits" type="number" min="1" max="32" step="1" inputmode="numeric" value="16" /></div>
        <div class="s5-tool-field"><label for="s5-kv-es-seq">Secuencias concurrentes</label><input id="s5-kv-es-seq" data-field="concurrentSequences" type="number" min="1" step="1" inputmode="numeric" value="1" /></div>
        <div class="s5-tool-field"><label for="s5-kv-es-ctx">Contexto por secuencia · tokens</label><input id="s5-kv-es-ctx" data-field="contextTokens" type="number" min="1" step="1" inputmode="numeric" value="8192" /></div>
        <div class="s5-tool-field"><label for="s5-kv-es-budget">Presupuesto de KV · GiB</label><input id="s5-kv-es-budget" data-field="kvBudgetGiB" type="number" min="0" step="0.1" inputmode="decimal" value="16" /><small>Memoria disponible solo para KV cache, después de reservar pesos y runtime.</small></div>
      </div>
      <div class="s5-tool-preset-actions" aria-label="Longitudes de contexto frecuentes">
        <button type="button" data-context-preset="8192">8K</button>
        <button type="button" data-context-preset="32768">32K</button>
        <button type="button" data-context-preset="65536">64K</button>
        <button type="button" data-context-preset="131072">128K</button>
      </div>
      <div class="s5-tool-actions" aria-label="Acciones del escenario">
        <button class="s5-tool-action" type="button" data-action="share">Copiar enlace</button>
        <button class="s5-tool-action" type="button" data-action="export">Exportar CSV</button>
        <button class="s5-tool-action" type="button" data-action="reset">Restablecer</button>
      </div>
      <p class="s5-tool-feedback" data-s5-tool-feedback hidden aria-live="polite"></p>
    </section>
  </form>

  <section class="s5-tool-results" aria-label="Resultados de KV cache" aria-live="polite">
    <div class="s5-tool-kpis">
      <div class="s5-tool-kpi"><small>KV cache seleccionada</small><strong data-output="kvTotal">—</strong><span>contexto × concurrencia</span></div>
      <div class="s5-tool-kpi"><small>KV / token / secuencia</small><strong data-output="kvPerToken">—</strong><span>coste marginal de un token residente</span></div>
      <div class="s5-tool-kpi"><small>Tokens residentes</small><strong data-output="residentTokens">—</strong><span>contexto × secuencias</span></div>
      <div class="s5-tool-kpi"><small>Uso del presupuesto</small><strong data-output="budgetUse">—</strong><span>solo del presupuesto de KV configurado</span></div>
    </div>

    <div class="s5-tool-status-grid" aria-label="Comprobaciones del escenario">
      <div class="s5-tool-status" data-output="budgetStatus" data-label="Presupuesto KV">—</div>
      <div class="s5-tool-status" data-output="architectureStatus" data-label="Arquitectura">—</div>
      <div class="s5-tool-status" data-output="contextStatus" data-label="Contexto del preset">—</div>
    </div>

    <div class="s5-kv-chart-wrap">
      <div class="s5-tool-breakdown__head"><strong>Cómo escala la KV cache</strong><span>eje X logarítmico</span></div>
      <svg class="s5-kv-chart" data-kv-chart aria-label="Memoria de KV cache frente a longitud de contexto"></svg>
      <div class="s5-kv-chart-legend" aria-label="Leyenda del gráfico">
        <span><i class="s5-kv-chart-legend__selected"></i>Geometría seleccionada</span>
        <span><i class="s5-kv-chart-legend__mha"></i>MHA completo</span>
        <span><i class="s5-kv-chart-legend__budget"></i>Presupuesto KV</span>
        <span><i class="s5-kv-chart-legend__preset"></i>Máximo del preset</span>
      </div>
    </div>

    <div class="s5-tool-detail-grid" aria-label="Capacidad y geometría">
      <div><small>Máx. contexto por memoria</small><strong data-output="maxContext">—</strong></div>
      <div><small>Máx. secuencias por memoria</small><strong data-output="maxSequences">—</strong></div>
      <div><small>KV frente a MHA</small><strong data-output="gqaRatio">—</strong></div>
      <div><small>Ahorro frente a MHA</small><strong data-output="gqaSaved">—</strong></div>
      <div><small>KV equivalente con MHA</small><strong data-output="mhaKv">—</strong></div>
      <div><small>Dimensión por cabeza</small><strong data-output="headDim">—</strong></div>
    </div>

    <aside class="s5-tool-source" aria-label="Procedencia del preset">
      <div class="s5-tool-source__head"><a data-output="sourceLink" target="_blank" rel="noopener noreferrer">Preset</a><span data-output="sourceDate"></span></div>
      <p data-output="sourceNote"></p>
    </aside>
  </section>
</div>

<section class="s5-tool-method" aria-labelledby="s5-kv-method">
  <div><div class="s5-eyebrow">Método</div><h2 id="s5-kv-method">La KV cache escala con los tokens que permanecen residentes.</h2></div>
  <div class="s5-tool-method__body">
    <p><strong>Por token.</strong> En atención decoder estándar, cada capa conserva una clave y un valor por cabeza KV. La dimensión de cada cabeza es tamaño_oculto / cabezas_de_atención.</p>
    <div class="s5-tool-method__formula">KV_token ≈ capas × 2 × cabezas_KV × dimensión_cabeza × bytes_KV</div>
    <p><strong>Contexto y concurrencia.</strong> La memoria total se multiplica por el número de tokens de cada secuencia y por las secuencias residentes simultáneamente.</p>
    <div class="s5-tool-method__formula">KV_total ≈ KV_token × tokens_contexto × secuencias_concurrentes</div>
    <p><strong>GQA y MQA.</strong> Reducir cabezas KV disminuye la memoria de cache en la misma proporción, manteniendo separado este efecto de la precisión o la longitud de contexto. El gráfico muestra la geometría seleccionada frente al caso de MHA completo con el mismo número de cabezas de consulta.</p>
    <p><strong>Presupuesto.</strong> El límite de memoria se aplica únicamente a la KV cache. No representa VRAM total: los pesos, activaciones, CUDA graphs, buffers y otras reservas deben descontarse antes. Para estimar el despliegue completo usa la <a href="/herramientas/vram-inferencia/">calculadora de VRAM para inferencia</a>.</p>
    <p class="s5-tool-method__notes">La aproximación no modela MLA, atención híbrida o sliding-window, estado recurrente, paginación/fragmentación concreta ni caches comprimidas específicas del backend. En esos casos, valida con métricas reales del motor.</p>
    <p class="s5-tool-method__notes">Fuentes primarias: <a href="https://github.com/meta-llama/llama-models/blob/main/models/sku_list.py">Meta · definiciones de arquitectura Llama</a>, <a href="https://github.com/meta-llama/llama-models/blob/main/models/llama3_1/MODEL_CARD.md">Meta · model card Llama 3.1</a> y <a href="https://docs.vllm.ai/en/latest/api/vllm/config/index.html">vLLM · configuración de KV cache</a>. Verificadas el 21-08-2026.</p>
  </div>
</section>

<section class="s5-section" aria-labelledby="s5-kv-related">
  <div class="s5-section-head"><h2 id="s5-kv-related">Conecta contexto, memoria y arquitectura</h2></div>
  <div class="s5-simple-list">
    <a class="s5-list-row" href="/herramientas/vram-inferencia/"><span class="s5-list-row__n">01</span><span class="s5-list-row__title">VRAM total para inferencia</span><span class="s5-list-row__desc">Añade pesos y reserva de runtime al presupuesto de KV cache.</span><span class="s5-list-row__meta">Herramienta</span></a>
    <a class="s5-list-row" href="/temas/transformer/"><span class="s5-list-row__n">02</span><span class="s5-list-row__title">Cómo funciona el Transformer</span><span class="s5-list-row__desc">Atención, cabezas y representaciones que determinan la geometría de la cache.</span><span class="s5-list-row__meta">Concepto</span></a>
  </div>
</section>

</div>
