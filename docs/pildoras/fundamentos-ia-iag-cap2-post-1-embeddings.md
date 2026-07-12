---
title: Embeddings: cuando el texto se vuelve geometría
description: Píldora 5sigmas completa con texto y slides inline.
hide:
  - toc
  - footer
---

<a class="li-back" href="../">Volver a Píldoras 5sigmas</a>

# Embeddings: cuando el texto se vuelve geometría

<div class="li-detail-meta" style="--series-accent:#26A69A">
  <span>Fundamentos de IA e IA generativa</span>
  <span>Cap. 2</span>
  <span>Post 1</span>
  <span>7 slides</span>
</div>

<div class="li-detail-layout">
  <section class="li-deck" data-li-deck>
    <div class="li-deck__bar">
      <button class="li-deck__button" type="button" data-li-prev aria-label="Slide anterior">‹</button>
      <div class="li-deck__status"><span data-li-current>1</span> / 7</div>
      <button class="li-deck__button" type="button" data-li-next aria-label="Slide siguiente">›</button>
    </div>
    <div class="li-deck__track" data-li-track>
<figure class="li-slide" id="slide-1">
  <img src="/assets/linkedin/posts/fundamentos-ia-iag-cap2-post-1-embeddings/slide-01.jpg" alt="Slide 1 de Embeddings: cuando el texto se vuelve geometría: Hook: &quot;Para un modelo, una palabra empieza como posición. El significado aparece cuando el entrenamiento ordena el espacio.&quot;" loading="lazy">
  <figcaption>01. Hook: &quot;Para un modelo, una palabra empieza como posición. El significado aparece cuando el entrenamiento ordena el espacio.&quot;</figcaption>
</figure>
<figure class="li-slide" id="slide-2">
  <img src="/assets/linkedin/posts/fundamentos-ia-iag-cap2-post-1-embeddings/slide-02.jpg" alt="Slide 2 de Embeddings: cuando el texto se vuelve geometría: Tokenizar: El texto se rompe en unidades que el modelo puede procesar: palabras, fragmentos o signos." loading="lazy">
  <figcaption>02. Tokenizar: El texto se rompe en unidades que el modelo puede procesar: palabras, fragmentos o signos.</figcaption>
</figure>
<figure class="li-slide" id="slide-3">
  <img src="/assets/linkedin/posts/fundamentos-ia-iag-cap2-post-1-embeddings/slide-03.jpg" alt="Slide 3 de Embeddings: cuando el texto se vuelve geometría: Vectorizar: Cada token se convierte en una lista de números. Al principio hay formato, no sentido." loading="lazy">
  <figcaption>03. Vectorizar: Cada token se convierte en una lista de números. Al principio hay formato, no sentido.</figcaption>
</figure>
<figure class="li-slide" id="slide-4">
  <img src="/assets/linkedin/posts/fundamentos-ia-iag-cap2-post-1-embeddings/slide-04.jpg" alt="Slide 4 de Embeddings: cuando el texto se vuelve geometría: Ajustar geometría: El entrenamiento acerca tokens usados en contextos parecidos y aleja los incompatibles." loading="lazy">
  <figcaption>04. Ajustar geometría: El entrenamiento acerca tokens usados en contextos parecidos y aleja los incompatibles.</figcaption>
</figure>
<figure class="li-slide" id="slide-5">
  <img src="/assets/linkedin/posts/fundamentos-ia-iag-cap2-post-1-embeddings/slide-05.jpg" alt="Slide 5 de Embeddings: cuando el texto se vuelve geometría: rey - hombre + mujer ≈ reina: La semántica se vuelve una propiedad geométrica del vector." loading="lazy">
  <figcaption>05. rey - hombre + mujer ≈ reina: La semántica se vuelve una propiedad geométrica del vector.</figcaption>
</figure>
<figure class="li-slide" id="slide-6">
  <img src="/assets/linkedin/posts/fundamentos-ia-iag-cap2-post-1-embeddings/slide-06.jpg" alt="Slide 6 de Embeddings: cuando el texto se vuelve geometría: Matriz: Texto, Imagen, Audio, Código" loading="lazy">
  <figcaption>06. Matriz: Texto, Imagen, Audio, Código</figcaption>
</figure>
<figure class="li-slide" id="slide-7">
  <img src="/assets/linkedin/posts/fundamentos-ia-iag-cap2-post-1-embeddings/slide-07.jpg" alt="Slide 7 de Embeddings: cuando el texto se vuelve geometría: CTA: Antes del Transformer hay geometría." loading="lazy">
  <figcaption>07. CTA: Antes del Transformer hay geometría.</figcaption>
</figure>
    </div>
    <nav class="li-slide-dots" aria-label="Navegación de slides">
      <a href="#slide-1" class="li-slide-dot" aria-label="Ir a slide 1">1</a><a href="#slide-2" class="li-slide-dot" aria-label="Ir a slide 2">2</a><a href="#slide-3" class="li-slide-dot" aria-label="Ir a slide 3">3</a><a href="#slide-4" class="li-slide-dot" aria-label="Ir a slide 4">4</a><a href="#slide-5" class="li-slide-dot" aria-label="Ir a slide 5">5</a><a href="#slide-6" class="li-slide-dot" aria-label="Ir a slide 6">6</a><a href="#slide-7" class="li-slide-dot" aria-label="Ir a slide 7">7</a>
    </nav>
  </section>

  <section class="li-caption-panel"><p>Un modelo de lenguaje no recibe &quot;palabras&quot; como las recibe una persona. Recibe tokens convertidos en vectores: listas de números dentro de un espacio matemático enorme.</p>
<p>Al principio esos números solo dan formato. Lo importante llega durante el entrenamiento, cuando el modelo ajusta posiciones hasta que tokens con contextos parecidos quedan cerca y tokens incompatibles quedan lejos. De ahí que relaciones como `rey - hombre + mujer ≈ reina` puedan aparecer como operaciones dentro del espacio.</p>
<p>La idea es sencilla y profunda: parte del significado se vuelve geometría. El modelo no necesita una definición explícita de cada palabra; aprende posiciones útiles para predecir y generar.</p>
<p>Ese mismo mecanismo permite tratar texto, imagen, audio o código como señales comparables antes de procesarlas.</p>
<p>Desarrollo el recorrido token → vector → embedding aquí (<a href="https://5sigmas.com/series/fundamentos-ia-iag/02-que-es-ia-generativa/">https://5sigmas.com/series/fundamentos-ia-iag/02-que-es-ia-generativa/</a>).</p>
<p class="li-caption-tags">#InteligenciaArtificial #Embeddings #LLM #MachineLearning #GenAI</p>
    <p><a class="md-button md-button--primary" href="/series/fundamentos-ia-iag/02-que-es-ia-generativa/">Leer artículo de contexto</a></p>
  </section>
</div>

<nav class="li-post-pager">
  <a href="../fundamentos-ia-iag-cap1-post-5-mlops/">Post anterior</a>
  <a href="../">Píldoras 5sigmas</a>
  <a href="../fundamentos-ia-iag-cap2-post-2-transformer/">Post siguiente</a>
</nav>
