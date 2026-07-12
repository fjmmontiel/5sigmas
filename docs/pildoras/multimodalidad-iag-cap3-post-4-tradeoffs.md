---
title: Cuatro familias, un mapa: cómo elegir arquitectura multimodal
description: Píldora 5sigmas completa con texto y slides inline.
hide:
  - toc
  - footer
---

<a class="li-back" href="../">Volver a Píldoras 5sigmas</a>

# Cuatro familias, un mapa: cómo elegir arquitectura multimodal

<div class="li-detail-meta" style="--series-accent:#4E9CD6">
  <span>Multimodalidad en IA generativa</span>
  <span>Cap. 3</span>
  <span>Post 4</span>
  <span>5 slides</span>
</div>

<div class="li-detail-layout">
  <section class="li-deck" data-li-deck>
    <div class="li-deck__bar">
      <button class="li-deck__button" type="button" data-li-prev aria-label="Slide anterior">‹</button>
      <div class="li-deck__status"><span data-li-current>1</span> / 5</div>
      <button class="li-deck__button" type="button" data-li-next aria-label="Slide siguiente">›</button>
    </div>
    <div class="li-deck__track" data-li-track>
<figure class="li-slide" id="slide-1">
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap3-post-4-tradeoffs/slide-01.jpg" alt="Slide 1 de Cuatro familias, un mapa: cómo elegir arquitectura multimodal: Hook: cuatro familias arquitectónicas, tradeoffs distintos, una decisión de diseño" loading="lazy">
  <figcaption>01. Hook: cuatro familias arquitectónicas, tradeoffs distintos, una decisión de diseño</figcaption>
</figure>
<figure class="li-slide" id="slide-2">
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap3-post-4-tradeoffs/slide-02.jpg" alt="Slide 2 de Cuatro familias, un mapa: cómo elegir arquitectura multimodal: Grid 2×2: encoder+conector, cross-attention, tokenización nativa, fusión temprana" loading="lazy">
  <figcaption>02. Grid 2×2: encoder+conector, cross-attention, tokenización nativa, fusión temprana</figcaption>
</figure>
<figure class="li-slide" id="slide-3">
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap3-post-4-tradeoffs/slide-03.jpg" alt="Slide 3 de Cuatro familias, un mapa: cómo elegir arquitectura multimodal: Timeline 3 paneles: GPT-4o → Gemini 2.5 → Qwen2.5-Omni" loading="lazy">
  <figcaption>03. Timeline 3 paneles: GPT-4o → Gemini 2.5 → Qwen2.5-Omni</figcaption>
</figure>
<figure class="li-slide" id="slide-4">
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap3-post-4-tradeoffs/slide-04.jpg" alt="Slide 4 de Cuatro familias, un mapa: cómo elegir arquitectura multimodal: Tabla comparativa: 4 familias × 6 métricas" loading="lazy">
  <figcaption>04. Tabla comparativa: 4 familias × 6 métricas</figcaption>
</figure>
<figure class="li-slide" id="slide-5">
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap3-post-4-tradeoffs/slide-05.jpg" alt="Slide 5 de Cuatro familias, un mapa: cómo elegir arquitectura multimodal: CTA: arquitectura multimodal — cuatro filosofías de diseño" loading="lazy">
  <figcaption>05. CTA: arquitectura multimodal — cuatro filosofías de diseño</figcaption>
</figure>
    </div>
    <nav class="li-slide-dots" aria-label="Navegación de slides">
      <a href="#slide-1" class="li-slide-dot" aria-label="Ir a slide 1">1</a><a href="#slide-2" class="li-slide-dot" aria-label="Ir a slide 2">2</a><a href="#slide-3" class="li-slide-dot" aria-label="Ir a slide 3">3</a><a href="#slide-4" class="li-slide-dot" aria-label="Ir a slide 4">4</a><a href="#slide-5" class="li-slide-dot" aria-label="Ir a slide 5">5</a>
    </nav>
  </section>

  <section class="li-caption-panel"><p>La palabra &quot;multimodal&quot; mete en el mismo saco sistemas con latencias, costes y compromisos completamente distintos. Y no podemos creer que compiten en la misma categoría solo porque comparten etiqueta.</p>
<p>Un modelo que responde en unos 320 ms y otro que tarda entre 2 y 5 segundos no está jugando el mismo partido. Ese margen no sale del benchmark. Sale de arquitectura. Un sistema nativo de voz e imagen se ahorra la cadena de transcripción, modelo de lenguaje y síntesis final.</p>
<p>En el extremo opuesto, hay diseños que vuelven multimodal un modelo grande entrenando solo una fracción pequeña de parámetros. Y también existe la apuesta contraria: integración mucho más profunda a cambio de entrenar desde cero sobre cantidades descomunales de datos.</p>
<p>Por eso las cuatro familias no son estilos. Son formas distintas de comprar una restricción: latencia, coste de entrenamiento, acceso continuo a la señal o profundidad real de la fusión.</p>
<p>La decisión importante para elegir una u otra no es qué cual parece más elegante. Si no qué cuello de botella aceptas en producción antes de desplegarla.</p>
<p>En el artículo convierto ese mapa en una comparación directa de familias y trade-offs (<a href="https://5sigmas.com/series/multimodalidad-iag/03-arquitecturas/">https://5sigmas.com/series/multimodalidad-iag/03-arquitecturas/</a>).</p>
<p class="li-caption-tags">#InteligenciaArtificial #MachineLearning #MultimodalAI #ArquitecturaIA</p>
    <p><a class="md-button md-button--primary" href="/series/multimodalidad-iag/03-arquitecturas/">Leer artículo de contexto</a></p>
  </section>
</div>

<nav class="li-post-pager">
  <a href="../multimodalidad-iag-cap3-post-3-tokenizacion-nativa/">Post anterior</a>
  <a href="../">Píldoras 5sigmas</a>
  <a href="../multimodalidad-iag-cap4-post-1-benchmarks-mienten/">Post siguiente</a>
</nav>
