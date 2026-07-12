---
title: Más allá del Transformer: Mamba, Titans y Nested Learning
description: Píldora 5sigmas completa con texto y slides inline.
hide:
  - toc
  - footer
---

<a class="li-back" href="../">Volver a Píldoras 5sigmas</a>

# Más allá del Transformer: Mamba, Titans y Nested Learning

<div class="li-detail-meta" style="--series-accent:#324AB2">
  <span>De las cavernas a la AGI</span>
  <span>Cap. 5</span>
  <span>Post 2</span>
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
  <img src="/assets/linkedin/posts/from-cave-to-agi-cap5-post-2-arquitecturas/slide-01.jpg" alt="Slide 1 de Más allá del Transformer: Mamba, Titans y Nested Learning: El Transformer marcó una era, pero tiene límites claros" loading="lazy">
  <figcaption>01. El Transformer marcó una era, pero tiene límites claros</figcaption>
</figure>
<figure class="li-slide" id="slide-2">
  <img src="/assets/linkedin/posts/from-cave-to-agi-cap5-post-2-arquitecturas/slide-02.jpg" alt="Slide 2 de Más allá del Transformer: Mamba, Titans y Nested Learning: 3 tarjetas: coste cuadrático O(N²) · memoria efímera · sin adaptación" loading="lazy">
  <figcaption>02. 3 tarjetas: coste cuadrático O(N²) · memoria efímera · sin adaptación</figcaption>
</figure>
<figure class="li-slide" id="slide-3">
  <img src="/assets/linkedin/posts/from-cave-to-agi-cap5-post-2-arquitecturas/slide-03.jpg" alt="Slide 3 de Más allá del Transformer: Mamba, Titans y Nested Learning: Timeline: Transformer O(N²) → SSM selectivo h(t) → Mamba O(N)" loading="lazy">
  <figcaption>03. Timeline: Transformer O(N²) → SSM selectivo h(t) → Mamba O(N)</figcaption>
</figure>
<figure class="li-slide" id="slide-4">
  <img src="/assets/linkedin/posts/from-cave-to-agi-cap5-post-2-arquitecturas/slide-04.jpg" alt="Slide 4 de Más allá del Transformer: Mamba, Titans y Nested Learning: Comparison: KV cache limitado vs Titans memoria neuronal con gradiente" loading="lazy">
  <figcaption>04. Comparison: KV cache limitado vs Titans memoria neuronal con gradiente</figcaption>
</figure>
<figure class="li-slide" id="slide-5">
  <img src="/assets/linkedin/posts/from-cave-to-agi-cap5-post-2-arquitecturas/slide-05.jpg" alt="Slide 5 de Más allá del Transformer: Mamba, Titans y Nested Learning: 3 escalas temporales: contexto inmediato · pesos en inferencia · entrenamiento" loading="lazy">
  <figcaption>05. 3 escalas temporales: contexto inmediato · pesos en inferencia · entrenamiento</figcaption>
</figure>
<figure class="li-slide" id="slide-6">
  <img src="/assets/linkedin/posts/from-cave-to-agi-cap5-post-2-arquitecturas/slide-06.jpg" alt="Slide 6 de Más allá del Transformer: Mamba, Titans y Nested Learning: No buscan reemplazar al Transformer — atacan sus fricciones concretas" loading="lazy">
  <figcaption>06. No buscan reemplazar al Transformer — atacan sus fricciones concretas</figcaption>
</figure>
    </div>
    <nav class="li-slide-dots" aria-label="Navegación de slides">
      <a href="#slide-1" class="li-slide-dot" aria-label="Ir a slide 1">1</a><a href="#slide-2" class="li-slide-dot" aria-label="Ir a slide 2">2</a><a href="#slide-3" class="li-slide-dot" aria-label="Ir a slide 3">3</a><a href="#slide-4" class="li-slide-dot" aria-label="Ir a slide 4">4</a><a href="#slide-5" class="li-slide-dot" aria-label="Ir a slide 5">5</a><a href="#slide-6" class="li-slide-dot" aria-label="Ir a slide 6">6</a>
    </nav>
  </section>

  <section class="li-caption-panel"><p>El Transformer ganó la década, pero el precio de esa victoria empezó a notarse enseguida: contexto largo caro, memoria que se evapora al terminar la sesión y pesos que no aprenden mientras el sistema está trabajando, un sistema super útil pero que no evoluciona de forma sencilla.</p>
<p>Mamba, Titans o Nested Learning surgen justo de esa fricción. <br>Intentan resolver lo que el escalado bruto ya no arregla bien: abaratar secuencias largas, recordar más allá de la ventana activa y abrir alguna forma de adaptación durante el uso.</p>
<p>Mamba intenta abaratar secuencias largas con coste lineal. <br>Titans prueba memoria persistente durante la inferencia y Nested Learning empuja la idea de aprender en varias escalas temporales. <br>Cada propuesta ataca un cuello de botella distinto, pero todas parten de la misma constatación: una ventana enorme de contexto sigue sin ser memoria viva.</p>
<p>La frontera empieza a moverse en ese punto. El cambio deja de pasar por repetir el Transformer a mayor escala y empieza a pasar por decidir qué partes del problema necesitan atención y cuáles necesitan otra forma de recordar o adaptarse.</p>
<p>Comparo esas rutas más allá del escalado puro aquí (<a href="https://5sigmas.com/series/from-cave-to-agi/05-mas-alla/">https://5sigmas.com/series/from-cave-to-agi/05-mas-alla/</a>).</p>
<p class="li-caption-tags">#InteligenciaArtificial #LLM #MachineLearning #DeepLearning</p>
    <p><a class="md-button md-button--primary" href="/series/from-cave-to-agi/05-mas-alla/">Leer artículo de contexto</a></p>
  </section>
</div>

<nav class="li-post-pager">
  <a href="../from-cave-to-agi-cap5-post-1-busqueda/">Post anterior</a>
  <a href="../">Píldoras 5sigmas</a>
  <a href="../from-cave-to-agi-cap5-post-3-world-models/">Post siguiente</a>
</nav>
