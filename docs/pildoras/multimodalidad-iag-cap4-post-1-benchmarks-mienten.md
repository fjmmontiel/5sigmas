---
title: Los benchmarks de IA hacen trampa
description: Píldora 5sigmas completa con texto y slides inline.
hide:
  - toc
  - footer
---

<a class="li-back" href="../">Volver a Píldoras 5sigmas</a>

# Los benchmarks de IA hacen trampa

<div class="li-detail-meta" style="--series-accent:#4E9CD6">
  <span>Multimodalidad en IA generativa</span>
  <span>Cap. 4</span>
  <span>Post 1</span>
  <span>6 slides</span>
</div>

<div class="li-detail-layout">
  <section class="li-deck" data-li-deck>
    <div class="li-deck__bar">
      <button class="li-deck__button" type="button" data-li-prev aria-label="Slide anterior">‹</button>
      <div class="li-deck__status"><span data-li-current>1</span> / 6</div>
      <button class="li-deck__button" type="button" data-li-next aria-label="Slide siguiente">›</button>
    </div>
    <div class="li-deck__track" data-li-track>
<figure class="li-slide" id="slide-1">
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap4-post-1-benchmarks-mienten/slide-01.jpg" alt="Slide 1 de Los benchmarks de IA hacen trampa: Hook: Los benchmarks de IA hacen trampa. Miden probabilidad, no comprensión multimodal." loading="lazy">
  <figcaption>01. Hook: Los benchmarks de IA hacen trampa. Miden probabilidad, no comprensión multimodal.</figcaption>
</figure>
<figure class="li-slide" id="slide-2">
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap4-post-1-benchmarks-mienten/slide-02.jpg" alt="Slide 2 de Los benchmarks de IA hacen trampa: 3 tarjetas: falta de grounding / contaminación / prior lingüístico" loading="lazy">
  <figcaption>02. 3 tarjetas: falta de grounding / contaminación / prior lingüístico</figcaption>
</figure>
<figure class="li-slide" id="slide-3">
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap4-post-1-benchmarks-mienten/slide-03.jpg" alt="Slide 3 de Los benchmarks de IA hacen trampa: Bifold: sin grounding (corpus→&quot;Blanco&quot;) vs con grounding (imagen→&quot;Rojo&quot;)" loading="lazy">
  <figcaption>03. Bifold: sin grounding (corpus→&quot;Blanco&quot;) vs con grounding (imagen→&quot;Rojo&quot;)</figcaption>
</figure>
<figure class="li-slide" id="slide-4">
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap4-post-1-benchmarks-mienten/slide-04.jpg" alt="Slide 4 de Los benchmarks de IA hacen trampa: Chain flow: Internet → Preentrenamiento + Benchmark → Puntuación inflada" loading="lazy">
  <figcaption>04. Chain flow: Internet → Preentrenamiento + Benchmark → Puntuación inflada</figcaption>
</figure>
<figure class="li-slide" id="slide-5">
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap4-post-1-benchmarks-mienten/slide-05.jpg" alt="Slide 5 de Los benchmarks de IA hacen trampa: Bar chart distribución de colores de coches + mecanismo del prior" loading="lazy">
  <figcaption>05. Bar chart distribución de colores de coches + mecanismo del prior</figcaption>
</figure>
<figure class="li-slide" id="slide-6">
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap4-post-1-benchmarks-mienten/slide-06.jpg" alt="Slide 6 de Los benchmarks de IA hacen trampa: CTA: Las puntuaciones solo revelan fallos cuando el prior estadístico diverge de la imagen." loading="lazy">
  <figcaption>06. CTA: Las puntuaciones solo revelan fallos cuando el prior estadístico diverge de la imagen.</figcaption>
</figure>
    </div>
    <nav class="li-slide-dots" aria-label="Navegación de slides">
      <a href="#slide-1" class="li-slide-dot" aria-label="Ir a slide 1">1</a><a href="#slide-2" class="li-slide-dot" aria-label="Ir a slide 2">2</a><a href="#slide-3" class="li-slide-dot" aria-label="Ir a slide 3">3</a><a href="#slide-4" class="li-slide-dot" aria-label="Ir a slide 4">4</a><a href="#slide-5" class="li-slide-dot" aria-label="Ir a slide 5">5</a><a href="#slide-6" class="li-slide-dot" aria-label="Ir a slide 6">6</a>
    </nav>
  </section>

  <section class="li-caption-panel"><p>Un modelo de IA puede dar 90% en un benchmark multimodal y seguir sin demostrar que comprobó lo que debía. Ese es el problema incómodo de mucha evaluación multimodal reciente.</p>
<p>Un benchmark deja de medir visión en cuanto el modelo puede aprobarlo sin mirar, y eso ya está pasando. En varios benchmarks de vídeo, un modelo como GPT-4o alcanza hasta un 50% de acierto sin procesar un solo frame. Cuando eso ocurre, la puntuación ya no mide comprensión real. Mide cuánto puede resolver un modelo de lenguaje con sesgo lingüístico, contaminación del test o simple probabilidad estadística.</p>
<p>El fallo casi no se ve cuando coincide con la respuesta correcta. El ranking sube, la demo queda limpia y parece que el modelo ha entendido la señal. Pero la evaluación no ha distinguido si acertó por evidencia o por correlación.</p>
<p>Por eso muchos benchmarks no fallan por mala fe, sino por diseño insuficiente. La exactitud final tapa justo la pregunta que más importa: qué estaba usando realmente el sistema para responder.</p>
<p>En el artículo desarmo esos fallos de evaluación y por qué inflan tantas comparativas. (<a href="https://5sigmas.com/series/multimodalidad-iag/04-evaluacion/">https://5sigmas.com/series/multimodalidad-iag/04-evaluacion/</a>).</p>
<p class="li-caption-tags">#InteligenciaArtificial #ComputerVision #MachineLearning #LLM</p>
    <p><a class="md-button md-button--primary" href="/series/multimodalidad-iag/04-evaluacion/">Leer artículo de contexto</a></p>
  </section>
</div>

<nav class="li-post-pager">
  <a href="../multimodalidad-iag-cap3-post-4-tradeoffs/">Post anterior</a>
  <a href="../">Píldoras 5sigmas</a>
  <a href="../multimodalidad-iag-cap4-post-2-mas-alla-exactitud/">Post siguiente</a>
</nav>
