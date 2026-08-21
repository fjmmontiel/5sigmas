---
title: Línea temporal de capacidades de modelos — benchmarks con procedencia
description: Explora cómo han cambiado resultados reportados en GPQA Diamond, MMMU-Pro, SWE-bench, Toolathlon y ARC-AGI-2 sin mezclar versiones ni ocultar cambios de protocolo.
hide:
  - toc
  - navigation
  - footer
---

<link rel="stylesheet" href="/stylesheets/tools.css" />
<link rel="stylesheet" href="/stylesheets/tools-model-capability-timeline.css" />
<script src="/assets/javascripts/tools/model-capability-timeline-core.js" defer></script>
<script src="/assets/javascripts/tools/model-capability-timeline.js" defer></script>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebApplication","name":"Línea temporal de capacidades de modelos — 5sigmas","url":"https://5sigmas.com/herramientas/linea-temporal-capacidades-modelos/","applicationCategory":"EducationalApplication","operatingSystem":"Any","isAccessibleForFree":true,"description":"Explorador temporal de resultados de benchmarks con procedencia por punto, condiciones de evaluación y discontinuidades metodológicas visibles."}</script>

<div class="s5-landing s5-tool-page s5-model-timeline" data-s5-model-capability-timeline data-locale="es">
<section class="s5-page-intro"><div class="s5-eyebrow">Herramientas · Datos · 14</div><h1>Mira cómo cambia una capacidad sin convertir benchmarks distintos en una única curva.</h1><p>Selecciona una evaluación y recorre los resultados reportados por fecha. Cada punto conserva modelo, condiciones y fuente. Si cambia el protocolo, la visualización lo muestra en lugar de fingir continuidad.</p></section>
<div class="s5-tool-summary-strip"><div><small>Tiempo</small><strong>fecha de lanzamiento</strong></div><div><small>Medición</small><strong>una evaluación cada vez</strong></div><div><small>Procedencia</small><strong>fuente por punto</strong></div><div><small>Límite</small><strong>benchmark ≠ capacidad total</strong></div></div>

<div class="s5-tool-workbench">
<form class="s5-tool-controls" aria-label="Selección de serie temporal" onsubmit="return false">
<section class="s5-tool-controls__section"><h2>Serie</h2><div class="s5-tool-field"><label for="s5-model-timeline-series-es">Benchmark</label><select id="s5-model-timeline-series-es" data-field="series"></select><small>No se normalizan ni promedian benchmarks diferentes.</small></div><div class="s5-tool-actions"><button class="s5-tool-action" type="button" data-action="share">Copiar escenario</button><button class="s5-tool-action" type="button" data-action="csv">Exportar CSV</button><button class="s5-tool-action" type="button" data-action="json">Exportar JSON</button><button class="s5-tool-action" type="button" data-action="reset">Restablecer</button></div><p class="s5-tool-feedback" data-s5-tool-feedback hidden aria-live="polite"></p></section>
</form>

<section class="s5-tool-results">
<div class="s5-section-head s5-section-head--with-copy"><div><div class="s5-eyebrow">Serie seleccionada</div><h2 data-output="series-title">Cargando…</h2></div><p data-output="definition">—</p></div>
<div class="s5-timeline-kpis"><div><small>Último resultado reportado</small><strong data-output="latest">—</strong><span data-output="latest-model">—</span></div><div><small>Cambio desde el primer punto</small><strong data-output="gain">—</strong><span>descriptivo, no causal</span></div><div><small>Ventana temporal</small><strong data-output="window">—</strong><span>entre primer y último punto</span></div><div><small>Protocolo</small><strong data-output="breaks">—</strong><span data-output="duplicate-note">—</span></div></div>
<section class="s5-timeline-card"><div class="s5-timeline-chart" data-output="chart" role="region" aria-label="Gráfico temporal" tabindex="0"></div></section>
<div class="s5-timeline-context"><section><h3>Cómo leer esta línea</h3><p data-output="caveat">—</p><p class="s5-timeline-caveat">La pendiente resume resultados publicados. No separa mejora del modelo, cambio de prompt, esfuerzo de razonamiento, harness o condiciones de evaluación.</p></section><section><h3>Fuentes activas</h3><ul class="s5-timeline-source-list" data-output="sources"></ul></section></div>
<div class="s5-timeline-table-wrap" role="region" aria-label="Datos de la serie" tabindex="0"><table class="s5-timeline-table"><thead><tr><th>Fecha</th><th>Modelo</th><th>Resultado</th><th>Protocolo</th><th>Condiciones</th><th>Fuente</th></tr></thead><tbody data-output="table-body"></tbody></table></div>
</section></div>

<section class="s5-section"><div class="s5-section-head"><div><div class="s5-eyebrow">Método</div><h2>La cronología conserva diferencias que un leaderboard suele borrar.</h2></div></div><div class="s5-timeline-method"><div><strong>Una métrica por serie</strong><p>GPQA Diamond, MMMU-Pro, SWE-bench Verified, SWE-Bench Pro, Toolathlon y ARC-AGI-2 se muestran por separado. No se convierten a un índice común.</p></div><div><strong>Versiones y protocolos visibles</strong><p>Cuando una fuente cambia número de problemas, harness o versión, la serie lo conserva como contexto. SWE-bench Verified muestra incluso dos resultados distintos de GPT-5 bajo protocolos diferentes.</p></div><div><strong>Procedencia por punto</strong><p>Cada observación enlaza a la tabla de lanzamiento que publicó el valor y conserva las condiciones reportadas. El dataset se revisa con nuevos lanzamientos y al menos cada 30 días mientras esté activo.</p></div></div></section>
<section class="s5-section"><div class="s5-note-feature"><div><div class="s5-eyebrow">Alcance v1</div><h2>Primero comparabilidad; después cobertura.</h2><p>Esta primera versión usa tablas de lanzamiento de OpenAI porque permiten encadenar varias generaciones con condiciones documentadas. No incorpora todavía resultados de otros proveedores en la misma línea si no podemos justificar que la configuración sea comparable. La arquitectura del dataset permite añadirlos como series o protocolos separados cuando exista evidencia suficiente.</p></div><div class="s5-note-feature__meta"><a href="https://openai.com/index/gpt-4-1/">OpenAI · GPT-4.1</a><br /><a href="https://openai.com/index/introducing-gpt-5-for-developers/">OpenAI · GPT-5</a><br /><a href="https://openai.com/index/gpt-5-1-for-developers/">OpenAI · GPT-5.1</a><br /><a href="https://openai.com/index/introducing-gpt-5-2/">OpenAI · GPT-5.2</a><br /><a href="https://openai.com/index/introducing-gpt-5-4/">OpenAI · GPT-5.4</a><br /><a href="https://openai.com/index/gpt-5-6/">OpenAI · GPT-5.6</a><br />Datos revisados: 21-08-2026</div></div></section>
</div>
