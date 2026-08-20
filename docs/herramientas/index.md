---
title: Herramientas de IA — calculadoras, visualizadores y evaluadores
description: Herramientas interactivas de 5sigmas para calcular costes y latencia de LLMs, memoria de inferencia, RAG, agentes, evaluación y capacidad de infraestructura de IA.
hide:
  - toc
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "Herramientas de IA de 5sigmas",
  "url": "https://5sigmas.com/herramientas/",
  "description": "Calculadoras, visualizadores y evaluadores interactivos para comprender y diseñar sistemas de inteligencia artificial.",
  "isPartOf": {"@type": "WebSite", "name": "5sigmas", "url": "https://5sigmas.com/"},
  "mainEntity": {
    "@type": "ItemList",
    "numberOfItems": 1,
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Calculadora de coste y latencia de LLMs",
        "url": "https://5sigmas.com/herramientas/llm-cost-latency/"
      }
    ]
  }
}
</script>

<div class="s5-tools-hub">

<section class="s5-tool-intro">
  <div class="s5-eyebrow">Herramientas · 5sigmas</div>
  <h1>Calcula, compara y prueba sistemas de IA.</h1>
  <p>Utilidades técnicas para responder preguntas concretas con supuestos visibles. Cada herramienta expone sus fórmulas, unidades y límites; cuando usa datos externos, también publica la fuente y la fecha de actualización.</p>
  <div class="s5-tool-meta-line" aria-label="Estado de la colección">
    <span>18 herramientas en la hoja de ruta</span>
    <span>1 disponible</span>
    <span>Sin registro obligatorio</span>
  </div>
</section>

<section class="s5-tools-category" aria-labelledby="s5-tools-coste">
  <div class="s5-tools-category__head">
    <h2 id="s5-tools-coste">Coste, latencia y capacidad</h2>
    <p>Convierte tokens, tiempos de generación, memoria y tráfico en presupuestos operativos que se puedan revisar antes de desplegar.</p>
  </div>
  <div class="s5-tools-list">
    <a class="s5-tool-row" href="/herramientas/llm-cost-latency/">
      <span class="s5-tool-row__index">01</span>
      <span class="s5-tool-row__title">Coste y latencia de LLMs</span>
      <span class="s5-tool-row__desc">Coste por solicitud y por mes, tiempo de respuesta y concurrencia aproximada a partir de tokens, precios, TTFT y velocidad de salida.</span>
      <span class="s5-tool-row__status">Disponible</span>
    </a>
    <div class="s5-tool-row s5-tool-row--planned">
      <span class="s5-tool-row__index">02</span>
      <span class="s5-tool-row__title">Precio/rendimiento de modelos</span>
      <span class="s5-tool-row__desc">Comparación con datos fechados de coste, contexto, latencia y capacidad, sin reducir la calidad a un único benchmark.</span>
      <span class="s5-tool-row__status">En ruta</span>
    </div>
    <div class="s5-tool-row s5-tool-row--planned">
      <span class="s5-tool-row__index">03</span>
      <span class="s5-tool-row__title">VRAM para inferencia</span>
      <span class="s5-tool-row__desc">Parámetros, cuantización, KV cache, contexto, batch y margen de memoria.</span>
      <span class="s5-tool-row__status">En ruta</span>
    </div>
    <div class="s5-tool-row s5-tool-row--planned">
      <span class="s5-tool-row__index">04</span>
      <span class="s5-tool-row__title">KV cache y ventana de contexto</span>
      <span class="s5-tool-row__desc">Cómo crecen memoria y presión de throughput al aumentar secuencia, capas y concurrencia.</span>
      <span class="s5-tool-row__status">En ruta</span>
    </div>
  </div>
</section>

<section class="s5-tools-category" aria-labelledby="s5-tools-modelos">
  <div class="s5-tools-category__head">
    <h2 id="s5-tools-modelos">Modelos y contexto</h2>
    <p>Visualiza mecanismos internos y presupuestos de contexto sin convertir una intuición útil en una falsa medida de capacidad.</p>
  </div>
  <div class="s5-tools-list">
    <div class="s5-tool-row s5-tool-row--planned"><span class="s5-tool-row__index">05</span><span class="s5-tool-row__title">Atención del Transformer</span><span class="s5-tool-row__desc">Tokens, máscara causal, cabezas y pesos de atención en ejemplos manipulables.</span><span class="s5-tool-row__status">En ruta</span></div>
    <div class="s5-tool-row s5-tool-row--planned"><span class="s5-tool-row__index">06</span><span class="s5-tool-row__title">Presupuesto de tokens y contexto</span><span class="s5-tool-row__desc">System prompt, historial, RAG, tools y salida dentro de una ventana de contexto finita.</span><span class="s5-tool-row__status">En ruta</span></div>
    <div class="s5-tool-row s5-tool-row--planned"><span class="s5-tool-row__index">15</span><span class="s5-tool-row__title">Scaling laws</span><span class="s5-tool-row__desc">Sensibilidad del equilibrio entre parámetros, datos y cómputo bajo supuestos explícitos.</span><span class="s5-tool-row__status">En ruta</span></div>
  </div>
</section>

<section class="s5-tools-category" aria-labelledby="s5-tools-eval">
  <div class="s5-tools-category__head">
    <h2 id="s5-tools-eval">RAG, agentes y evaluación</h2>
    <p>Separa recuperación, respuesta, ejecución y fiabilidad para saber qué está fallando en lugar de esconderlo en una puntuación agregada.</p>
  </div>
  <div class="s5-tools-list">
    <div class="s5-tool-row s5-tool-row--planned"><span class="s5-tool-row__index">07</span><span class="s5-tool-row__title">Laboratorio de recuperación RAG</span><span class="s5-tool-row__desc">Precision@k, recall@k, MRR, nDCG, chunking y reranking con ejemplos interpretables.</span><span class="s5-tool-row__status">En ruta</span></div>
    <div class="s5-tool-row s5-tool-row--planned"><span class="s5-tool-row__index">08</span><span class="s5-tool-row__title">Evaluación de RAG</span><span class="s5-tool-row__desc">Recuperación, relevancia de contexto, fidelidad y corrección de respuesta como dimensiones distintas.</span><span class="s5-tool-row__status">En ruta</span></div>
    <div class="s5-tool-row s5-tool-row--planned"><span class="s5-tool-row__index">11</span><span class="s5-tool-row__title">Fiabilidad y evaluación de agentes</span><span class="s5-tool-row__desc">Éxito de tarea, tools, retries, timeouts, trayectorias e intervalos de confianza.</span><span class="s5-tool-row__status">En ruta</span></div>
    <div class="s5-tool-row s5-tool-row--planned"><span class="s5-tool-row__index">12</span><span class="s5-tool-row__title">Amenazas de prompt injection</span><span class="s5-tool-row__desc">Fronteras de confianza, canales de datos, mitigaciones y riesgo residual desde un enfoque defensivo.</span><span class="s5-tool-row__status">En ruta</span></div>
    <div class="s5-tool-row s5-tool-row--planned"><span class="s5-tool-row__index">13</span><span class="s5-tool-row__title">Fiabilidad de benchmarks</span><span class="s5-tool-row__desc">Saturación, contaminación, ítems inválidos, varianza e incertidumbre en rankings.</span><span class="s5-tool-row__status">En ruta</span></div>
  </div>
</section>

<section class="s5-tools-category" aria-labelledby="s5-tools-voz">
  <div class="s5-tools-category__head">
    <h2 id="s5-tools-voz">Voz e interacción en tiempo real</h2>
    <p>Presupuesta los milisegundos y el coste que separan una arquitectura posible de una conversación que realmente se siente inmediata.</p>
  </div>
  <div class="s5-tools-list">
    <div class="s5-tool-row s5-tool-row--planned"><span class="s5-tool-row__index">09</span><span class="s5-tool-row__title">Presupuesto de latencia para agentes de voz</span><span class="s5-tool-row__desc">STT→LLM→TTS, realtime y half-cascade con endpointing, TTFT, primer audio y red.</span><span class="s5-tool-row__status">En ruta</span></div>
    <div class="s5-tool-row s5-tool-row--planned"><span class="s5-tool-row__index">10</span><span class="s5-tool-row__title">Coste y capacidad de agentes de voz</span><span class="s5-tool-row__desc">Duración de llamadas, concurrencia, utilización y coste por componente.</span><span class="s5-tool-row__status">En ruta</span></div>
  </div>
</section>

<section class="s5-tools-category" aria-labelledby="s5-tools-index">
  <div class="s5-tools-category__head">
    <h2 id="s5-tools-index">Progreso e infraestructura de IA</h2>
    <p>Exploradores con metodología y procedencia explícitas para estudiar capacidad técnica, energía, infraestructura y ecosistemas sin ocultar cómo se construye una comparación.</p>
  </div>
  <div class="s5-tools-list">
    <div class="s5-tool-row s5-tool-row--planned"><span class="s5-tool-row__index">14</span><span class="s5-tool-row__title">Cronología de capacidades de modelos</span><span class="s5-tool-row__desc">Series temporales de razonamiento, código, multimodalidad y agentes con advertencias de comparabilidad.</span><span class="s5-tool-row__status">En ruta</span></div>
    <div class="s5-tool-row s5-tool-row--planned"><span class="s5-tool-row__index">16</span><span class="s5-tool-row__title">Cómputo y energía de entrenamiento</span><span class="s5-tool-row__desc">Aceleradores, utilización, duración, potencia, PUE e intervalos de estimación.</span><span class="s5-tool-row__status">En ruta</span></div>
    <div class="s5-tool-row s5-tool-row--planned"><span class="s5-tool-row__index">17</span><span class="s5-tool-row__title">Capacidad de datacenters para IA</span><span class="s5-tool-row__desc">Racks, MW, refrigeración, utilización e hipótesis de capacidad de entrenamiento e inferencia.</span><span class="s5-tool-row__status">En ruta</span></div>
    <div class="s5-tool-row s5-tool-row--planned"><span class="s5-tool-row__index">18</span><span class="s5-tool-row__title">Ecosistema global de IA</span><span class="s5-tool-row__desc">Investigación, talento, infraestructura, inversión, política y desarrollo de modelos con normalización y pesos transparentes.</span><span class="s5-tool-row__status">En ruta</span></div>
  </div>
</section>

<section class="s5-tool-method" aria-labelledby="s5-tools-method">
  <h2 id="s5-tools-method">Qué exige una herramienta de 5sigmas.</h2>
  <div class="s5-tool-method__body">
    <p>Una salida no debe parecer más precisa que sus entradas. Las herramientas distinguen valores medidos, datos externos y supuestos editables; evitan mezclar benchmarks incompatibles y muestran la metodología cuando existe una puntuación compuesta.</p>
    <p>Las herramientas con datos que cambian en el tiempo publicarán su procedencia y fecha de actualización. Las calculadoras puramente matemáticas, como la primera de la colección, no incorporan precios de proveedor ocultos: el usuario introduce las tarifas que quiere evaluar.</p>
  </div>
</section>

</div>
