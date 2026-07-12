---
title: Lo que cambia por dentro cuando una IA aprende
description: Píldora 5sigmas completa con texto y slides inline.
hide:
  - toc
  - footer
---

<a class="li-back" href="../">Volver a Píldoras 5sigmas</a>

# Lo que cambia por dentro cuando una IA aprende

<div class="li-detail-meta" style="--series-accent:#26A69A">
  <span>Fundamentos de IA e IA generativa</span>
  <span>Cap. 1</span>
  <span>Post 3</span>
  <span>8 slides</span>
</div>

<div class="li-detail-layout">
  <section class="li-deck" data-li-deck>
    <div class="li-deck__bar">
      <button class="li-deck__button" type="button" data-li-prev aria-label="Slide anterior">‹</button>
      <div class="li-deck__status"><span data-li-current>1</span> / 8</div>
      <button class="li-deck__button" type="button" data-li-next aria-label="Slide siguiente">›</button>
    </div>
    <div class="li-deck__track" data-li-track>
<figure class="li-slide" id="slide-1">
  <img src="/assets/linkedin/posts/fundamentos-ia-iag-cap1-post-3-mecanismos-internos/slide-01.jpg" alt="Slide 1 de Lo que cambia por dentro cuando una IA aprende: Hook: &quot;Una IA no aprende magia. Cambia algo interno para equivocarse menos.&quot;" loading="lazy">
  <figcaption>01. Hook: &quot;Una IA no aprende magia. Cambia algo interno para equivocarse menos.&quot;</figcaption>
</figure>
<figure class="li-slide" id="slide-2">
  <img src="/assets/linkedin/posts/fundamentos-ia-iag-cap1-post-3-mecanismos-internos/slide-02.jpg" alt="Slide 2 de Lo que cambia por dentro cuando una IA aprende: Flujo: Predice → Mide error → Ajusta → Repite" loading="lazy">
  <figcaption>02. Flujo: Predice → Mide error → Ajusta → Repite</figcaption>
</figure>
<figure class="li-slide" id="slide-3">
  <img src="/assets/linkedin/posts/fundamentos-ia-iag-cap1-post-3-mecanismos-internos/slide-03.jpg" alt="Slide 3 de Lo que cambia por dentro cuando una IA aprende: Cambian preguntas y umbrales: Qué variable mirar, dónde cortar y qué rama abrir después." loading="lazy">
  <figcaption>03. Cambian preguntas y umbrales: Qué variable mirar, dónde cortar y qué rama abrir después.</figcaption>
</figure>
<figure class="li-slide" id="slide-4">
  <img src="/assets/linkedin/posts/fundamentos-ia-iag-cap1-post-3-mecanismos-internos/slide-04.jpg" alt="Slide 4 de Lo que cambia por dentro cuando una IA aprende: Cambia probabilidades: Cuenta señales por clase y combina evidencias de forma rápida." loading="lazy">
  <figcaption>04. Cambia probabilidades: Cuenta señales por clase y combina evidencias de forma rápida.</figcaption>
</figure>
<figure class="li-slide" id="slide-5">
  <img src="/assets/linkedin/posts/fundamentos-ia-iag-cap1-post-3-mecanismos-internos/slide-05.jpg" alt="Slide 5 de Lo que cambia por dentro cuando una IA aprende: Cambian centros: Los grupos se recolocan hasta que los puntos parecidos quedan cerca." loading="lazy">
  <figcaption>05. Cambian centros: Los grupos se recolocan hasta que los puntos parecidos quedan cerca.</figcaption>
</figure>
<figure class="li-slide" id="slide-6">
  <img src="/assets/linkedin/posts/fundamentos-ia-iag-cap1-post-3-mecanismos-internos/slide-06.jpg" alt="Slide 6 de Lo que cambia por dentro cuando una IA aprende: Más capas, más composición: Las capas intermedias combinan señales simples hasta formar patrones complejos." loading="lazy">
  <figcaption>06. Más capas, más composición: Las capas intermedias combinan señales simples hasta formar patrones complejos.</figcaption>
</figure>
<figure class="li-slide" id="slide-7">
  <img src="/assets/linkedin/posts/fundamentos-ia-iag-cap1-post-3-mecanismos-internos/slide-07.jpg" alt="Slide 7 de Lo que cambia por dentro cuando una IA aprende: Matriz: Árboles: reglas, Bayes: probabilidades, K-means: centros, Redes: pesos" loading="lazy">
  <figcaption>07. Matriz: Árboles: reglas, Bayes: probabilidades, K-means: centros, Redes: pesos</figcaption>
</figure>
<figure class="li-slide" id="slide-8">
  <img src="/assets/linkedin/posts/fundamentos-ia-iag-cap1-post-3-mecanismos-internos/slide-08.jpg" alt="Slide 8 de Lo que cambia por dentro cuando una IA aprende: CTA: El modelo aprende ajustando estructura interna." loading="lazy">
  <figcaption>08. CTA: El modelo aprende ajustando estructura interna.</figcaption>
</figure>
    </div>
    <nav class="li-slide-dots" aria-label="Navegación de slides">
      <a href="#slide-1" class="li-slide-dot" aria-label="Ir a slide 1">1</a><a href="#slide-2" class="li-slide-dot" aria-label="Ir a slide 2">2</a><a href="#slide-3" class="li-slide-dot" aria-label="Ir a slide 3">3</a><a href="#slide-4" class="li-slide-dot" aria-label="Ir a slide 4">4</a><a href="#slide-5" class="li-slide-dot" aria-label="Ir a slide 5">5</a><a href="#slide-6" class="li-slide-dot" aria-label="Ir a slide 6">6</a><a href="#slide-7" class="li-slide-dot" aria-label="Ir a slide 7">7</a><a href="#slide-8" class="li-slide-dot" aria-label="Ir a slide 8">8</a>
    </nav>
  </section>

  <section class="li-caption-panel"><p>La frase &quot;el modelo aprende&quot; oculta casi todo lo importante. Lo que importa es qué cambia exactamente dentro del sistema.</p>
<p>En un árbol cambian preguntas, umbrales y ramas. En Naive Bayes cambian conteos y probabilidades. En k-means se mueven centros de grupos. En una red neuronal se ajustan pesos numéricos repartidos por conexiones y capas.</p>
<p>El bucle de fondo sí se parece: producir una salida, medir el error, ajustar algo interno y repetir. Pero la pieza que se ajusta determina el tipo de dato que funciona bien, la explicabilidad, el coste y los fallos probables.</p>
<p>Entender IA no consiste solo en saber nombres de modelos. Consiste en saber qué mecanismo está aprendiendo y qué puede romperse cuando el mundo cambia.</p>
<p>En el artículo desarrollo ese mapa interno con ejemplos visuales (<a href="https://5sigmas.com/series/fundamentos-ia-iag/01-que-es-ia/">https://5sigmas.com/series/fundamentos-ia-iag/01-que-es-ia/</a>).</p>
<p class="li-caption-tags">#InteligenciaArtificial #MachineLearning #DeepLearning #GenAI #FundamentosIA</p>
    <p><a class="md-button md-button--primary" href="/series/fundamentos-ia-iag/01-que-es-ia/">Leer artículo de contexto</a></p>
  </section>
</div>

<nav class="li-post-pager">
  <a href="../fundamentos-ia-iag-cap1-post-2-tipos-aprendizaje/">Post anterior</a>
  <a href="../">Píldoras 5sigmas</a>
  <a href="../fundamentos-ia-iag-cap1-post-4-software-vs-ia/">Post siguiente</a>
</nav>
