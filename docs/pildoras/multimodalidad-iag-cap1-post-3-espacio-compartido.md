---
title: Tres formas de integrar una señal en un modelo de lenguaje: lo que pierde cada una
description: Píldora 5sigmas completa con texto y slides inline.
hide:
  - toc
  - footer
---

<a class="li-back" href="../">Volver a Píldoras 5sigmas</a>

# Tres formas de integrar una señal en un modelo de lenguaje: lo que pierde cada una

<div class="li-detail-meta" style="--series-accent:#4E9CD6">
  <span>Multimodalidad en IA generativa</span>
  <span>Cap. 1</span>
  <span>Post 3</span>
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
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap1-post-3-espacio-compartido/slide-01.jpg" alt="Slide 1 de Tres formas de integrar una señal en un modelo de lenguaje: lo que pierde cada una: Hook: &quot;Tres formas de integrar una señal en un modelo de lenguaje. Lo que pierde cada una no es lo mismo.&quot;" loading="lazy">
  <figcaption>01. Hook: &quot;Tres formas de integrar una señal en un modelo de lenguaje. Lo que pierde cada una no es lo mismo.&quot;</figcaption>
</figure>
<figure class="li-slide" id="slide-2">
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap1-post-3-espacio-compartido/slide-02.jpg" alt="Slide 2 de Tres formas de integrar una señal en un modelo de lenguaje: lo que pierde cada una: 3 tarjetas: Traducir (contrato → descripción → texto) / Alinear (zapatillas sin etiquetar) / Copresencia (radiografía con razonamiento activo)" loading="lazy">
  <figcaption>02. 3 tarjetas: Traducir (contrato → descripción → texto) / Alinear (zapatillas sin etiquetar) / Copresencia (radiografía con razonamiento activo)</figcaption>
</figure>
<figure class="li-slide" id="slide-3">
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap1-post-3-espacio-compartido/slide-03.jpg" alt="Slide 3 de Tres formas de integrar una señal en un modelo de lenguaje: lo que pierde cada una: Qué pierde el nivel 1: posición espacial / tono de voz / sincronía en vídeo — con ejemplos concretos" loading="lazy">
  <figcaption>03. Qué pierde el nivel 1: posición espacial / tono de voz / sincronía en vídeo — con ejemplos concretos</figcaption>
</figure>
<figure class="li-slide" id="slide-4">
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap1-post-3-espacio-compartido/slide-04.jpg" alt="Slide 4 de Tres formas de integrar una señal en un modelo de lenguaje: lo que pierde cada una: Grid 3×3: cuándo funciona y cuándo no cada nivel, con tareas reales" loading="lazy">
  <figcaption>04. Grid 3×3: cuándo funciona y cuándo no cada nivel, con tareas reales</figcaption>
</figure>
<figure class="li-slide" id="slide-5">
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap1-post-3-espacio-compartido/slide-05.jpg" alt="Slide 5 de Tres formas de integrar una señal en un modelo de lenguaje: lo que pierde cada una: La definición desde las consecuencias: &quot;el que usa las señales originales para razonar&quot;" loading="lazy">
  <figcaption>05. La definición desde las consecuencias: &quot;el que usa las señales originales para razonar&quot;</figcaption>
</figure>
<figure class="li-slide" id="slide-6">
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap1-post-3-espacio-compartido/slide-06.jpg" alt="Slide 6 de Tres formas de integrar una señal en un modelo de lenguaje: lo que pierde cada una: CTA: &quot;Traducir, alinear o razonar con la señal: no son sinónimos.&quot; · 5sigmas.com →" loading="lazy">
  <figcaption>06. CTA: &quot;Traducir, alinear o razonar con la señal: no son sinónimos.&quot; · 5sigmas.com →</figcaption>
</figure>
    </div>
    <nav class="li-slide-dots" aria-label="Navegación de slides">
      <a href="#slide-1" class="li-slide-dot" aria-label="Ir a slide 1">1</a><a href="#slide-2" class="li-slide-dot" aria-label="Ir a slide 2">2</a><a href="#slide-3" class="li-slide-dot" aria-label="Ir a slide 3">3</a><a href="#slide-4" class="li-slide-dot" aria-label="Ir a slide 4">4</a><a href="#slide-5" class="li-slide-dot" aria-label="Ir a slide 5">5</a><a href="#slide-6" class="li-slide-dot" aria-label="Ir a slide 6">6</a>
    </nav>
  </section>

  <section class="li-caption-panel"><p>Con los LLMs multimodales, ¿cómo podemos combinar y representar: texto, audio, video, sonido en el mismo espacio?<br>Una señal puede dejar por el camino justo la parte que la hacía útil en cuanto obligas a meterla en una representación que no fue hecha para ella.</p>
<p>Un modelo de IA puede llamarse multimodal y seguir tratando una imagen como si fuera texto mal traducido. <br>Si traduces todo a texto, reaprovechas infraestructura y simplificas mucho el sistema, pero pierdes relaciones espaciales finas, tono, sincronía o señales no verbales. <br>Si alineas en embeddings, conservas más estructura, pero dependes de que ese espacio compartido no derive. <br>Si tokenizas de forma nativa, unificas más de verdad, aunque pagas con secuencias más largas, vocabularios enormes y costes de entrenamiento bastante más duros.</p>
<p>La etiqueta &quot;multimodal&quot; oculta esa diferencia. Dos productos pueden llamarse igual y estar perdiendo cosas muy distintas antes de empezar a razonar.</p>
<p>En el artículo comparo esas tres rutas y los compromisos que arrastra cada una (<a href="https://5sigmas.com/series/multimodalidad-iag/01-el-problema/">https://5sigmas.com/series/multimodalidad-iag/01-el-problema/</a>).</p>
<p class="li-caption-tags">#InteligenciaArtificial #Multimodalidad #MachineLearning #LLM</p>
    <p><a class="md-button md-button--primary" href="/series/multimodalidad-iag/01-el-problema/">Leer artículo de contexto</a></p>
  </section>
</div>

<nav class="li-post-pager">
  <a href="../multimodalidad-iag-cap1-post-2-dificultades/">Post anterior</a>
  <a href="../">Píldoras 5sigmas</a>
  <a href="../multimodalidad-iag-cap2-post-1-aprendizaje-contrastivo/">Post siguiente</a>
</nav>
