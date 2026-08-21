---
title: Calculadora de VRAM para inferencia de LLMs
description: Estima memoria de pesos, KV cache, reserva de runtime, VRAM total y capacidad de contexto para inferencia de modelos Transformer con GQA/MQA.
keywords: calculadora VRAM LLM, memoria inferencia IA, KV cache, GQA, cuantización LLM, contexto VRAM, GPU LLM
hide:
  - toc
  - navigation
  - footer
---

<link rel="stylesheet" href="/stylesheets/tools.css" />
<script src="/assets/javascripts/tools/inference-vram-core.js" defer></script>
<script src="/assets/javascripts/tools/inference-vram.js" defer></script>

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Calculadora de VRAM para inferencia — 5sigmas",
  "url": "https://5sigmas.com/herramientas/vram-inferencia/",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Any",
  "isAccessibleForFree": true,
  "description": "Calculadora interactiva de memoria de pesos, KV cache y capacidad aproximada de GPU para inferencia de LLMs.",
  "featureList": [
    "Memoria de pesos según parámetros y precisión",
    "KV cache según capas, cabezas KV, contexto y concurrencia",
    "GQA frente a atención multi-head completa",
    "Capacidad máxima aproximada de contexto y secuencias",
    "Escenario compartible y exportación JSON"
  ],
  "isPartOf": {"@type": "WebSite", "name": "5sigmas", "url": "https://5sigmas.com/"}
}
</script>

<div class="s5-landing s5-tool-page" data-s5-inference-vram data-locale="es">

<section class="s5-page-intro">
  <div class="s5-eyebrow">Herramientas · Infraestructura · 03</div>
  <h1>Calcula qué ocupa la VRAM durante la inferencia.</h1>
  <p>Separa pesos, KV cache y reserva de runtime. Cambia precisión, longitud de contexto, concurrencia y número de GPUs para ver qué parte de la memoria está limitando el despliegue.</p>
</section>

<div class="s5-tool-summary-strip" aria-label="Alcance de la estimación">
  <div><small>Pesos</small><strong>parámetros × bits</strong></div>
  <div><small>KV cache</small><strong>capas × K/V × cabezas × tokens</strong></div>
  <div><small>Capacidad</small><strong>reparto ideal entre GPUs</strong></div>
</div>

<div class="s5-tool-workbench">
  <form class="s5-tool-controls" data-s5-tool-form aria-label="Supuestos de memoria" onsubmit="return false">
    <section class="s5-tool-controls__section">
      <h2>Arquitectura</h2>
      <div class="s5-tool-field-grid s5-tool-field-grid--single">
        <div class="s5-tool-field">
          <label for="s5-vram-es-preset">Preset</label>
          <select id="s5-vram-es-preset" data-field="preset"></select>
          <small>Los presets usan la geometría publicada por Meta. Todos los campos siguen siendo editables.</small>
        </div>
      </div>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field"><label for="s5-vram-es-p">Parámetros · miles de millones</label><input id="s5-vram-es-p" data-field="parametersB" type="number" min="0" step="0.1" inputmode="decimal" value="8" /></div>
        <div class="s5-tool-field"><label for="s5-vram-es-l">Capas</label><input id="s5-vram-es-l" data-field="layers" type="number" min="1" step="1" inputmode="numeric" value="32" /></div>
        <div class="s5-tool-field"><label for="s5-vram-es-h">Tamaño oculto</label><input id="s5-vram-es-h" data-field="hiddenSize" type="number" min="1" step="128" inputmode="numeric" value="4096" /></div>
        <div class="s5-tool-field"><label for="s5-vram-es-ah">Cabezas de atención</label><input id="s5-vram-es-ah" data-field="attentionHeads" type="number" min="1" step="1" inputmode="numeric" value="32" /></div>
        <div class="s5-tool-field"><label for="s5-vram-es-kvh">Cabezas KV</label><input id="s5-vram-es-kvh" data-field="kvHeads" type="number" min="1" step="1" inputmode="numeric" value="8" /><small>GQA/MQA reduce este valor frente al número total de cabezas.</small></div>
      </div>
    </section>

    <section class="s5-tool-controls__section">
      <h2>Escenario de inferencia</h2>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field"><label for="s5-vram-es-wb">Precisión de pesos · bits</label><input id="s5-vram-es-wb" data-field="weightBits" type="number" min="1" max="32" step="1" inputmode="numeric" value="16" /><small>Por ejemplo: 16 para BF16/FP16, 8 u 4 para una aproximación cuantizada.</small></div>
        <div class="s5-tool-field"><label for="s5-vram-es-kvb">Precisión de KV cache · bits</label><input id="s5-vram-es-kvb" data-field="kvBits" type="number" min="1" max="32" step="1" inputmode="numeric" value="16" /></div>
        <div class="s5-tool-field"><label for="s5-vram-es-ctx">Contexto por secuencia · tokens</label><input id="s5-vram-es-ctx" data-field="contextTokens" type="number" min="0" step="1024" inputmode="numeric" value="8192" /></div>
        <div class="s5-tool-field"><label for="s5-vram-es-seq">Secuencias concurrentes</label><input id="s5-vram-es-seq" data-field="concurrentSequences" type="number" min="0" step="1" inputmode="numeric" value="1" /><small>Representa secuencias residentes simultáneamente en la KV cache.</small></div>
      </div>
    </section>

    <section class="s5-tool-controls__section">
      <h2>Hardware y reserva</h2>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field"><label for="s5-vram-es-g">GPUs</label><input id="s5-vram-es-g" data-field="devices" type="number" min="1" step="1" inputmode="numeric" value="1" /></div>
        <div class="s5-tool-field"><label for="s5-vram-es-cap">VRAM por GPU · GiB</label><input id="s5-vram-es-cap" data-field="gpuVramGiB" type="number" min="0" step="1" inputmode="decimal" value="24" /></div>
        <div class="s5-tool-field"><label for="s5-vram-es-wm">Metadatos/formato de pesos · %</label><input id="s5-vram-es-wm" data-field="weightMetadataPct" type="number" min="0" max="100" step="1" inputmode="decimal" value="0" /><small>Añade escalas, metadatos u overhead del formato si los conoces.</small></div>
        <div class="s5-tool-field"><label for="s5-vram-es-oh">Reserva de runtime · %</label><input id="s5-vram-es-oh" data-field="runtimeOverheadPct" type="number" min="0" max="200" step="1" inputmode="decimal" value="10" /><small>Reserva explícita para activaciones temporales, kernels y allocator. No es un valor universal.</small></div>
      </div>
      <div class="s5-tool-actions" aria-label="Acciones del escenario">
        <button class="s5-tool-action" type="button" data-action="share">Copiar enlace</button>
        <button class="s5-tool-action" type="button" data-action="export">Exportar JSON</button>
        <button class="s5-tool-action" type="button" data-action="reset">Restablecer</button>
      </div>
      <p class="s5-tool-feedback" data-s5-tool-feedback hidden aria-live="polite"></p>
    </section>
  </form>

  <section class="s5-tool-results" aria-label="Resultados de memoria" aria-live="polite">
    <div class="s5-tool-kpis">
      <div class="s5-tool-kpi"><small>VRAM total estimada</small><strong data-output="totalVram">—</strong><span>pesos + KV cache + reserva</span></div>
      <div class="s5-tool-kpi"><small>Pesos</small><strong data-output="weights">—</strong><span>incluye el overhead de formato configurado</span></div>
      <div class="s5-tool-kpi"><small>KV cache</small><strong data-output="kvCache">—</strong><span>contexto × secuencias concurrentes</span></div>
      <div class="s5-tool-kpi"><small>Memoria por GPU</small><strong data-output="perDevice">—</strong><span data-output="perDeviceNote">—</span></div>
    </div>

    <div class="s5-tool-status-grid" aria-label="Comprobaciones del escenario">
      <div class="s5-tool-status" data-output="fitStatus" data-label="Capacidad">—</div>
      <div class="s5-tool-status" data-output="architectureStatus" data-label="Arquitectura">—</div>
      <div class="s5-tool-status" data-output="contextStatus" data-label="Contexto del preset">—</div>
    </div>

    <div class="s5-tool-breakdowns">
      <div class="s5-tool-breakdown">
        <div class="s5-tool-breakdown__head"><strong>De dónde sale la memoria</strong><span>estimación total</span></div>
        <div class="s5-tool-bar" aria-label="Desglose relativo de VRAM">
          <span data-memory-bar="weights" title="Pesos"></span><span data-memory-bar="kv" title="KV cache"></span><span data-memory-bar="runtime" title="Reserva de runtime"></span>
        </div>
        <div class="s5-tool-legend"><span>Pesos</span><span>KV cache</span><span>Reserva de runtime</span></div>
      </div>
    </div>

    <div class="s5-tool-detail-grid" aria-label="Detalles de arquitectura y capacidad">
      <div><small>KV / token / secuencia</small><strong data-output="kvPerToken">—</strong></div>
      <div><small>Contexto máximo aproximado</small><strong data-output="maxContext">—</strong></div>
      <div><small>Secuencias máximas aproximadas</small><strong data-output="maxSequences">—</strong></div>
      <div><small>Dimensión por cabeza</small><strong data-output="headDim">—</strong></div>
      <div><small>KV frente a MHA</small><strong data-output="gqaRatio">—</strong></div>
      <div><small>Holgura de VRAM</small><strong data-output="headroom">—</strong></div>
    </div>

    <aside class="s5-tool-source" aria-label="Procedencia del preset">
      <div class="s5-tool-source__head"><a data-output="sourceLink" target="_blank" rel="noopener noreferrer">Preset</a><span data-output="sourceDate"></span></div>
      <p data-output="sourceNote"></p>
    </aside>
  </section>
</div>

<section class="s5-tool-method" aria-labelledby="s5-vram-method">
  <div><div class="s5-eyebrow">Método</div><h2 id="s5-vram-method">Una estimación de planificación, no un profiler.</h2></div>
  <div class="s5-tool-method__body">
    <p><strong>Pesos.</strong> La aproximación mínima es parámetros × bits por peso. Los formatos cuantizados pueden añadir escalas, codebooks, padding u otros metadatos; por eso ese overhead es un campo independiente en lugar de quedar oculto.</p>
    <div class="s5-tool-method__formula">memoria_pesos ≈ parámetros × bits_peso / 8 × (1 + overhead_formato)</div>
    <p><strong>KV cache.</strong> Para atención decoder estándar, cada capa conserva una clave y un valor por cabeza KV, token y secuencia. Con GQA/MQA el número de cabezas KV puede ser menor que el número de cabezas de consulta. Meta publica esta geometría para Llama 3.1 y vLLM trata la KV cache como un presupuesto explícito de memoria GPU.</p>
    <div class="s5-tool-method__formula">KV ≈ capas × 2 × cabezas_KV × dimensión_cabeza × bytes_KV × tokens × secuencias</div>
    <p><strong>Varias GPUs.</strong> La cifra por GPU supone un reparto ideal y uniforme de pesos y KV cache. Es útil como límite de planificación, pero no modela réplicas, pipeline parallelism, capas no divisibles, buffers de comunicación, offload ni el layout concreto de un backend.</p>
    <p><strong>Reserva de runtime.</strong> Se aplica como porcentaje editable sobre pesos + KV. Activaciones temporales, CUDA graphs, kernels y allocators dependen del motor y de la carga, por lo que la herramienta no presenta un porcentaje fijo como hecho observado.</p>
    <p class="s5-tool-method__notes">La fórmula de KV no representa correctamente arquitecturas con MLA, atención híbrida/sliding-window, estado recurrente o caches comprimidas específicas. En esos casos utiliza el resultado como comparación aproximada y valida el despliegue con métricas reales del motor.</p>
    <p class="s5-tool-method__notes">Fuentes primarias: <a href="https://github.com/meta-llama/llama-models/blob/main/models/sku_list.py">Meta · definiciones de arquitectura Llama</a>, <a href="https://github.com/meta-llama/llama-models/blob/main/models/llama3_1/MODEL_CARD.md">Meta · model card Llama 3.1</a> y <a href="https://docs.vllm.ai/en/latest/api/vllm/config/index.html">vLLM · configuración de KV cache</a>. Verificadas el 21-08-2026.</p>
  </div>
</section>

<section class="s5-section" aria-labelledby="s5-vram-related">
  <div class="s5-section-head"><h2 id="s5-vram-related">Para interpretar la memoria</h2></div>
  <div class="s5-simple-list">
    <a class="s5-list-row" href="/temas/transformer/"><span class="s5-list-row__n">01</span><span class="s5-list-row__title">Cómo funciona el Transformer</span><span class="s5-list-row__desc">Atención, cabezas y representaciones antes de convertirlas en memoria.</span><span class="s5-list-row__meta">Concepto</span></a>
    <a class="s5-list-row" href="/herramientas/coste-latencia-llm/"><span class="s5-list-row__n">02</span><span class="s5-list-row__title">Coste y latencia de LLMs</span><span class="s5-list-row__desc">Conecta la memoria de despliegue con el coste y el tiempo de respuesta de la carga.</span><span class="s5-list-row__meta">Herramienta</span></a>
  </div>
</section>

</div>
