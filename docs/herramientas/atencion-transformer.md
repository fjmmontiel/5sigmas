---
title: Visualizador de atención Transformer
description: Visualiza logits, máscara causal, softmax y mezcla de valores en una cabeza de atención Transformer. Cambia el token de consulta, la temperatura y los pesos.
keywords: atención Transformer, visualizador atención, self-attention, scaled dot product attention, softmax, máscara causal, multi-head attention
hide:
  - toc
  - navigation
  - footer
---

<link rel="stylesheet" href="/stylesheets/tools.css" />
<link rel="stylesheet" href="/stylesheets/tools-attention.css" />
<script src="/assets/javascripts/tools/transformer-attention-core.js" defer></script>
<script src="/assets/javascripts/tools/transformer-attention.js" defer></script>

<script type="application/ld+json">
{"@context":"https://schema.org","@type":"WebApplication","name":"Visualizador de atención Transformer — 5sigmas","url":"https://5sigmas.com/herramientas/atencion-transformer/","applicationCategory":"EducationalApplication","operatingSystem":"Any","isAccessibleForFree":true,"description":"Visualizador interactivo de scores de atención, máscara causal, softmax y mezcla de valores en un Transformer.","featureList":["Matriz de atención por token de consulta y clave","Máscara causal activable","Logits editables para la fila seleccionada","Temperatura educativa para inspeccionar softmax","Tres patrones de cabeza sintéticos comparables","Valores V escalares editables, enlace compartible y exportación JSON"],"isPartOf":{"@type":"WebSite","name":"5sigmas","url":"https://5sigmas.com/"}}
</script>

<div class="s5-landing s5-tool-page" data-s5-transformer-attention data-locale="es">
<section class="s5-page-intro">
  <div class="s5-eyebrow">Herramientas · Arquitectura · 05</div>
  <h1>Manipula una cabeza de atención paso a paso.</h1>
  <p>Selecciona un token de consulta y observa cómo los scores previos a softmax se convierten en pesos de atención. Activa la máscara causal, cambia la concentración de la distribución y modifica un valor V para ver cómo cambia la salida.</p>
</section>
<div class="s5-attention-pipeline" aria-label="Flujo de atención">
  <div><small>01 · Scores</small><strong>S = QKᵀ / √dₖ</strong></div><div><small>02 · Máscara</small><strong>S + M</strong></div><div><small>03 · Normalización</small><strong>α = softmax(S)</strong></div><div><small>04 · Mezcla</small><strong>salida = Σ αⱼVⱼ</strong></div>
</div>
<div class="s5-tool-workbench s5-attention-workbench">
  <form class="s5-tool-controls" data-s5-tool-form aria-label="Controles del visualizador de atención" onsubmit="return false">
    <section class="s5-tool-controls__section"><h2>Secuencia</h2><div class="s5-tool-field-grid s5-tool-field-grid--single">
      <div class="s5-tool-field"><label for="s5-att-es-text">Tokens ilustrativos</label><input id="s5-att-es-text" data-field="text" type="text" value="el gato vio al gato" maxlength="120" /><small>Se separan por espacios y se usan como etiquetas. No es el tokenizador de un modelo real. Máximo: 8 tokens.</small></div>
      <div class="s5-tool-field"><label for="s5-att-es-query">Token de consulta</label><select id="s5-att-es-query" data-field="queryIndex"></select><small>Selecciona la fila cuya distribución quieres inspeccionar y editar.</small></div>
    </div></section>
    <section class="s5-tool-controls__section"><h2>Patrón de cabeza</h2><div class="s5-tool-field-grid s5-tool-field-grid--single"><div class="s5-tool-field"><label for="s5-att-es-head">Head sintético</label><select id="s5-att-es-head" data-field="head"><option value="local">Contexto local</option><option value="previous">Token anterior</option><option value="repeat" selected>Repetición léxica</option></select><small>Son patrones didácticos de scores, no cabezas extraídas de un Transformer entrenado.</small></div></div>
      <div class="s5-tool-toggle"><input id="s5-att-es-causal" data-field="causal" type="checkbox" checked /><label for="s5-att-es-causal">Aplicar máscara causal: una consulta no puede atender a tokens futuros.</label></div>
      <div class="s5-tool-field" style="margin-top:.8rem"><label for="s5-att-es-temp">Temperatura educativa</label><div class="s5-attention-temperature"><input id="s5-att-es-temp" data-field="temperature" type="range" min="0.25" max="4" step="0.05" value="1" /><output data-output="temperature">1,00</output></div><small>La formulación original usa el escalado 1/√dₖ. Aquí T se añade después como control didáctico: softmax(S/T). T alta aplana; T baja concentra.</small></div>
      <div class="s5-tool-actions" aria-label="Acciones del escenario"><button class="s5-tool-action" type="button" data-action="share">Copiar enlace</button><button class="s5-tool-action" type="button" data-action="export">Exportar JSON</button><button class="s5-tool-action" type="button" data-action="reset">Restablecer</button></div><p class="s5-tool-feedback" data-s5-tool-feedback hidden aria-live="polite"></p>
    </section>
  </form>
  <section class="s5-tool-results" aria-label="Resultados de atención" aria-live="polite">
    <div class="s5-tool-kpis s5-attention-kpis">
      <div class="s5-tool-kpi"><small>Consulta</small><strong data-output="queryToken">—</strong><span>fila seleccionada</span></div><div class="s5-tool-kpi"><small>Mayor peso</small><strong data-output="topToken">—</strong><span>clave dominante tras softmax</span></div><div class="s5-tool-kpi"><small>Entropía</small><strong data-output="entropy">—</strong><span>concentración de la distribución</span></div><div class="s5-tool-kpi"><small>Tokens efectivos</small><strong data-output="effectiveTokens">—</strong><span>exp(entropía)</span></div><div class="s5-tool-kpi"><small>Salida V escalar</small><strong data-output="outputScalar">—</strong><span>Σ αⱼVⱼ en el ejemplo 1D</span></div><div class="s5-tool-kpi"><small>Claves permitidas</small><strong data-output="allowedKeys">—</strong><span>después de la máscara</span></div>
    </div>
    <div class="s5-attention-section"><div class="s5-attention-section__head"><strong>Matriz de atención</strong><span>filas = consultas · columnas = claves</span></div><div class="s5-attention-matrix-wrap" data-attention-matrix></div></div>
    <div class="s5-attention-section"><div class="s5-attention-section__head"><strong>La misma consulta, tres patrones</strong><span>haz clic para cambiar de head</span></div><div class="s5-attention-head-comparison" data-head-comparison></div></div>
    <div class="s5-attention-section"><div class="s5-attention-section__head"><strong>De score a contribución</strong><span>edita S y V para la consulta seleccionada</span></div><div class="s5-attention-row" data-attention-row></div></div>
  </section>
</div>
<section class="s5-tool-method" aria-labelledby="s5-att-method"><div><div class="s5-eyebrow">Método</div><h2 id="s5-att-method">El peso de atención no es una explicación del razonamiento.</h2></div><div class="s5-tool-method__body">
  <p><strong>Scaled dot-product attention.</strong> En un Transformer real, cada posición produce vectores query, key y value mediante proyecciones aprendidas. Los scores se obtienen con QKᵀ y se dividen por √dₖ antes de aplicar softmax.</p><div class="s5-tool-method__formula">Attention(Q,K,V) = softmax(QKᵀ / √dₖ + M)V</div>
  <p><strong>Qué simula esta herramienta.</strong> Para mantener cada relación interpretable, los tres heads generan directamente una matriz sintética de scores S en el punto equivalente a QKᵀ/√dₖ. No son pesos de un modelo concreto. Puedes editar la fila seleccionada y comprobar qué hace exactamente la máscara y la normalización.</p>
  <p><strong>Máscara causal.</strong> En un decoder autoregresivo, los scores hacia posiciones futuras se convierten en −∞ antes de softmax. Por eso su probabilidad final es exactamente cero.</p>
  <p><strong>Valores.</strong> Los V reales son vectores de muchas dimensiones. Aquí usamos un único escalar editable por token para que la operación final sea visible sin inventar coordenadas semánticas: la salida es la suma ponderada Σ αⱼVⱼ.</p>
  <p><strong>Multi-head.</strong> Una capa real ejecuta varias cabezas con proyecciones aprendidas distintas y después concatena/proyecta sus salidas. La comparación de tres patrones muestra por qué distintas cabezas pueden producir distribuciones diferentes, pero no pretende reproducir una capa entrenada.</p>
  <p class="s5-tool-method__notes">La temperatura T es un control educativo adicional y no sustituye el factor 1/√dₖ del Transformer original. Tampoco se modelan dropout, rotary/relative position biases, GQA/MQA, FlashAttention ni otras optimizaciones de implementación.</p>
  <p class="s5-tool-method__notes">Fuentes: <a href="https://arxiv.org/abs/1706.03762">Vaswani et al. · Attention Is All You Need</a> para la formulación de scaled dot-product y multi-head attention; <a href="https://docs.pytorch.org/docs/main/generated/torch.nn.functional.scaled_dot_product_attention.html">PyTorch · scaled_dot_product_attention</a> para la semántica actual de máscara causal y la operación equivalente. Verificadas el 21-08-2026.</p>
</div></section>
<section class="s5-section" aria-labelledby="s5-att-related"><div class="s5-section-head"><h2 id="s5-att-related">Continúa desde la operación hasta el sistema</h2></div><div class="s5-simple-list"><a class="s5-list-row" href="/temas/transformer/"><span class="s5-list-row__n">01</span><span class="s5-list-row__title">Cómo funciona el Transformer</span><span class="s5-list-row__desc">Sitúa atención, residuals y bloques feed-forward dentro de la arquitectura completa.</span><span class="s5-list-row__meta">Concepto</span></a><a class="s5-list-row" href="/herramientas/kv-cache-contexto/"><span class="s5-list-row__n">02</span><span class="s5-list-row__title">KV cache y contexto</span><span class="s5-list-row__desc">Conecta keys y values con el coste de memoria durante inferencia autoregresiva.</span><span class="s5-list-row__meta">Herramienta</span></a></div></section>
</div>
