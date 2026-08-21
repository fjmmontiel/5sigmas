---
title: Herramientas de IA — calculadoras, visualizadores y laboratorios
description: Herramientas interactivas de 5sigmas para LLMs, modelos, inferencia, contexto, atención Transformer, RAG, agentes, evaluación e infraestructura de IA.
keywords: herramientas IA, calculadora LLM, comparar modelos IA, coste LLM, latencia LLM, presupuesto tokens, ventana contexto, VRAM IA, atención Transformer, RAG evaluación, agentes de voz, benchmarks IA
hide:
  - toc
  - navigation
  - footer
---

<link rel="stylesheet" href="/stylesheets/tools.css" />

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "Herramientas de IA — 5sigmas",
  "url": "https://5sigmas.com/herramientas/",
  "description": "Calculadoras, visualizadores, evaluadores y exploradores interactivos para comprender y diseñar sistemas de inteligencia artificial.",
  "isPartOf": {"@type": "WebSite", "name": "5sigmas", "url": "https://5sigmas.com/"},
  "mainEntity": {
    "@type": "ItemList",
    "numberOfItems": 11,
    "itemListElement": [
      {"@type": "ListItem", "position": 1, "url": "https://5sigmas.com/herramientas/coste-latencia-llm/", "name": "Calculadora de coste y latencia de LLMs"},
      {"@type": "ListItem", "position": 2, "url": "https://5sigmas.com/herramientas/precio-rendimiento-modelos/", "name": "Explorador de precio y rendimiento de modelos de IA"},
      {"@type": "ListItem", "position": 3, "url": "https://5sigmas.com/herramientas/vram-inferencia/", "name": "Calculadora de VRAM para inferencia"},
      {"@type": "ListItem", "position": 4, "url": "https://5sigmas.com/herramientas/kv-cache-contexto/", "name": "Explorador de KV cache y ventana de contexto"},
      {"@type": "ListItem", "position": 5, "url": "https://5sigmas.com/herramientas/atencion-transformer/", "name": "Visualizador de atención Transformer"},
      {"@type": "ListItem", "position": 6, "url": "https://5sigmas.com/herramientas/presupuesto-contexto/", "name": "Planificador de presupuesto de contexto y tokens"},
      {"@type": "ListItem", "position": 7, "url": "https://5sigmas.com/herramientas/laboratorio-recuperacion-rag/", "name": "Laboratorio de recuperación RAG"},
      {"@type": "ListItem", "position": 8, "url": "https://5sigmas.com/herramientas/evaluacion-rag/", "name": "Entorno interactivo de evaluación RAG"},
      {"@type": "ListItem", "position": 9, "url": "https://5sigmas.com/herramientas/latencia-agente-voz/", "name": "Explorador de presupuesto de latencia para agentes de voz"},
      {"@type": "ListItem", "position": 10, "url": "https://5sigmas.com/herramientas/coste-capacidad-agente-voz/", "name": "Planificador de coste y capacidad para agentes de voz"},
      {"@type": "ListItem", "position": 11, "url": "https://5sigmas.com/herramientas/fiabilidad-evaluacion-agentes/", "name": "Entorno interactivo de fiabilidad y evaluación de agentes"}
    ]
  }
}
</script>

<div class="s5-landing s5-tools-hub">
<section class="s5-page-intro">
  <div class="s5-eyebrow">Herramientas</div>
  <h1>Experimenta con las variables de un sistema de IA.</h1>
  <p>Calculadoras, visualizadores y laboratorios para responder preguntas de ingeniería de IA con supuestos visibles. Cada herramienta explica el método, documenta las fuentes y permite reproducir el escenario.</p>
</section>

<section class="s5-section" aria-labelledby="s5-tools-available">
  <div class="s5-section-head s5-section-head--with-copy">
    <div><div class="s5-eyebrow">Disponible</div><h2 id="s5-tools-available">Herramientas disponibles</h2></div>
    <p>Una herramienta aparece aquí cuando las versiones española e inglesa comparten la misma lógica, fuentes y pruebas.</p>
  </div>
  <div class="s5-tool-index-grid">
    <a class="s5-tool-index-card" href="/herramientas/coste-latencia-llm/"><span class="s5-tool-index-card__meta">Calculadora · LLMs · 01</span><h2>Coste y latencia de LLMs</h2><p>Convierte tokens, caché, tráfico, TTFT, velocidad de generación y concurrencia en coste por solicitud, coste mensual, tiempo de respuesta y capacidad aproximada.</p><span class="s5-tool-index-card__cta">Abrir calculadora →</span></a>
    <a class="s5-tool-index-card" href="/herramientas/precio-rendimiento-modelos/"><span class="s5-tool-index-card__meta">Explorador · Modelos · 02</span><h2>Precio y rendimiento de modelos</h2><p>Compara el coste de tu carga con Intelligence Index, velocidad, TTFT y contexto, manteniendo separadas las fuentes de precio y rendimiento.</p><span class="s5-tool-index-card__cta">Abrir explorador →</span></a>
    <a class="s5-tool-index-card" href="/herramientas/vram-inferencia/"><span class="s5-tool-index-card__meta">Calculadora · Infraestructura · 03</span><h2>VRAM para inferencia</h2><p>Separa pesos, KV cache y reserva de runtime para estimar memoria total, memoria por GPU, contexto máximo y concurrencia aproximada.</p><span class="s5-tool-index-card__cta">Abrir calculadora →</span></a>
    <a class="s5-tool-index-card" href="/herramientas/kv-cache-contexto/"><span class="s5-tool-index-card__meta">Explorador · Infraestructura · 04</span><h2>KV cache y ventana de contexto</h2><p>Visualiza cómo cambian la memoria de KV cache y la capacidad de contexto con GQA/MQA, precisión, concurrencia y presupuesto de memoria.</p><span class="s5-tool-index-card__cta">Abrir explorador →</span></a>
    <a class="s5-tool-index-card" href="/herramientas/atencion-transformer/"><span class="s5-tool-index-card__meta">Visualizador · Arquitectura · 05</span><h2>Atención Transformer</h2><p>Manipula scores, máscara causal, softmax y valores para ver cómo una cabeza de atención convierte una consulta en una mezcla ponderada.</p><span class="s5-tool-index-card__cta">Abrir visualizador →</span></a>
    <a class="s5-tool-index-card" href="/herramientas/presupuesto-contexto/"><span class="s5-tool-index-card__meta">Planificador · LLMs · 06</span><h2>Presupuesto de tokens y contexto</h2><p>Reparte la ventana entre instrucciones, herramientas, historial, RAG, mensaje actual, salida y margen para detectar overflow y presión futura.</p><span class="s5-tool-index-card__cta">Abrir planificador →</span></a>
    <a class="s5-tool-index-card" href="/herramientas/laboratorio-recuperacion-rag/"><span class="s5-tool-index-card__meta">Laboratorio · RAG · 07</span><h2>Recuperación RAG</h2><p>Mide Precision@k, Recall@k, MRR y nDCG sobre un ranking visible; prueba reranking y separa calidad de recuperación de la huella de chunking y solape.</p><span class="s5-tool-index-card__cta">Abrir laboratorio →</span></a>
    <a class="s5-tool-index-card" href="/herramientas/evaluacion-rag/"><span class="s5-tool-index-card__meta">Evaluador · RAG · 08</span><h2>Evaluación RAG</h2><p>Separa relevancia del contexto, fidelidad, corrección y cobertura; inspecciona afirmaciones, intervalos y pesos sin esconder el diagnóstico en un único score.</p><span class="s5-tool-index-card__cta">Abrir evaluador →</span></a>
    <a class="s5-tool-index-card" href="/herramientas/latencia-agente-voz/"><span class="s5-tool-index-card__meta">Explorador · Voz · 09</span><h2>Latencia de agentes de voz</h2><p>Descompón el tiempo hasta el primer audio entre transporte, fin de turno, STT, modelo, TTS y buffering, y calcula el camino de interrupción por separado.</p><span class="s5-tool-index-card__cta">Abrir explorador →</span></a>
    <a class="s5-tool-index-card" href="/herramientas/coste-capacidad-agente-voz/"><span class="s5-tool-index-card__meta">Planificador · Voz · 10</span><h2>Coste y capacidad de agentes de voz</h2><p>Convierte llamadas, minutos, STT, TTS y tokens en coste mensual y dimensiona workers y límites de proveedor sin confundir llamadas simultáneas con peticiones de generación simultáneas.</p><span class="s5-tool-index-card__cta">Abrir planificador →</span></a>
    <a class="s5-tool-index-card" href="/herramientas/fiabilidad-evaluacion-agentes/"><span class="s5-tool-index-card__meta">Evaluador · Agentes · 11</span><h2>Fiabilidad y evaluación de agentes</h2><p>Separa éxito final, primer intento, recuperación tras reintentos, decisiones de herramientas, timeouts y eficiencia de la trayectoria; aplica criterios de publicación explícitos sin ocultarlo todo en una puntuación compuesta.</p><span class="s5-tool-index-card__cta">Abrir evaluador →</span></a>
  </div>
</section>

<section class="s5-section s5-tools-roadmap" aria-labelledby="s5-tools-roadmap">
  <div><div class="s5-eyebrow">Hoja de ruta</div><h2 id="s5-tools-roadmap">Lo siguiente</h2><p>La sección crece una herramienta cada vez. No se publican páginas vacías: cada entrada aparece cuando tiene interacción real, paridad ES/EN, fuentes y pruebas.</p></div>
  <div class="s5-tools-roadmap__list" aria-label="Próximas familias de herramientas">
    <div class="s5-tools-roadmap__row"><span>12</span><strong>Agentes: seguridad y prompt injection</strong><span>explorador</span></div>
    <div class="s5-tools-roadmap__row"><span>13–18</span><strong>Benchmarks, escalado, infraestructura y ecosistema global</strong><span>datos</span></div>
  </div>
</section>

<section class="s5-section" aria-labelledby="s5-tools-method">
  <div class="s5-section-head s5-section-head--with-copy"><div><div class="s5-eyebrow">Criterio</div><h2 id="s5-tools-method">Qué debe mostrar una herramienta de 5sigmas</h2></div></div>
  <div class="s5-entry-grid">
    <div class="s5-entry"><div class="s5-entry__index">01</div><div class="s5-entry__title">Supuestos visibles</div><div class="s5-entry__text">Las cifras editables se separan de los datos observados. Si una estimación depende de un supuesto, puedes cambiarlo.</div></div>
    <div class="s5-entry"><div class="s5-entry__index">02</div><div class="s5-entry__title">Fuentes primarias</div><div class="s5-entry__text">Precios, límites y datos variables incluyen procedencia y fecha de verificación. Los valores obsoletos no se presentan como actuales.</div></div>
    <div class="s5-entry"><div class="s5-entry__index">03</div><div class="s5-entry__title">Resultado reproducible</div><div class="s5-entry__text">Cuando aporta valor, el escenario se puede compartir o exportar con sus entradas, resultados y procedencia.</div></div>
  </div>
</section>
</div>