---
title: Más allá de la exactitud
description: Píldora 5sigmas completa con texto y slides inline.
hide:
  - toc
  - footer
---

<a class="li-back" href="../">Volver a Píldoras 5sigmas</a>

# Más allá de la exactitud

<div class="li-detail-meta" style="--series-accent:#4E9CD6">
  <span>Multimodalidad en IA generativa</span>
  <span>Cap. 4</span>
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
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap4-post-2-mas-alla-exactitud/slide-01.jpg" alt="Slide 1 de Más allá de la exactitud: Hook: Un modelo puede acertar sin haber entendido nada. Exactitud no distingue comprensión de suerte estadística." loading="lazy">
  <figcaption>01. Hook: Un modelo puede acertar sin haber entendido nada. Exactitud no distingue comprensión de suerte estadística.</figcaption>
</figure>
<figure class="li-slide" id="slide-2">
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap4-post-2-mas-alla-exactitud/slide-02.jpg" alt="Slide 2 de Más allá de la exactitud: Chain flow de 4 métricas: Grounding → Consistencia → Localización → Calibración" loading="lazy">
  <figcaption>02. Chain flow de 4 métricas: Grounding → Consistencia → Localización → Calibración</figcaption>
</figure>
<figure class="li-slide" id="slide-3">
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap4-post-2-mas-alla-exactitud/slide-03.jpg" alt="Slide 3 de Más allá de la exactitud: Tabla de parafraseos: misma pregunta, 3 formulaciones, tercera da respuesta inconsistente" loading="lazy">
  <figcaption>03. Tabla de parafraseos: misma pregunta, 3 formulaciones, tercera da respuesta inconsistente</figcaption>
</figure>
<figure class="li-slide" id="slide-4">
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap4-post-2-mas-alla-exactitud/slide-04.jpg" alt="Slide 4 de Más allá de la exactitud: Bifold SVG: comprensión parcial (&quot;Hay tres coches&quot;) vs con localización (&quot;izquierda, centro-arriba, derecha&quot;)" loading="lazy">
  <figcaption>04. Bifold SVG: comprensión parcial (&quot;Hay tres coches&quot;) vs con localización (&quot;izquierda, centro-arriba, derecha&quot;)</figcaption>
</figure>
<figure class="li-slide" id="slide-5">
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap4-post-2-mas-alla-exactitud/slide-05.jpg" alt="Slide 5 de Más allá de la exactitud: Comparison: modelo mal calibrado (Toyota Corolla 2019 con confianza alta) vs bien calibrado (incertidumbre expresada)" loading="lazy">
  <figcaption>05. Comparison: modelo mal calibrado (Toyota Corolla 2019 con confianza alta) vs bien calibrado (incertidumbre expresada)</figcaption>
</figure>
<figure class="li-slide" id="slide-6">
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap4-post-2-mas-alla-exactitud/slide-06.jpg" alt="Slide 6 de Más allá de la exactitud: CTA: Grounding, consistencia, localización y calibración: cuatro dimensiones que la exactitud oculta." loading="lazy">
  <figcaption>06. CTA: Grounding, consistencia, localización y calibración: cuatro dimensiones que la exactitud oculta.</figcaption>
</figure>
    </div>
    <nav class="li-slide-dots" aria-label="Navegación de slides">
      <a href="#slide-1" class="li-slide-dot" aria-label="Ir a slide 1">1</a><a href="#slide-2" class="li-slide-dot" aria-label="Ir a slide 2">2</a><a href="#slide-3" class="li-slide-dot" aria-label="Ir a slide 3">3</a><a href="#slide-4" class="li-slide-dot" aria-label="Ir a slide 4">4</a><a href="#slide-5" class="li-slide-dot" aria-label="Ir a slide 5">5</a><a href="#slide-6" class="li-slide-dot" aria-label="Ir a slide 6">6</a>
    </nav>
  </section>

  <section class="li-caption-panel"><p>Medir solo acierto final en un benchmark de IA multimodal tapa un problema serio: puedes premiar una respuesta correcta nacida de la evidencia equivocada. Como cuando en matemáticas llegas al resultado correcto pero con los pasos equivocados.</p>
<p>Dos modelos pueden empatar en acierto final y estar haciendo cosas completamente distintas por dentro. Una evaluación reciente de lectura y comprensión visual da un ejemplo muy claro: un modelo puede rondar el acierto de 78,3% en respuesta y desplomarse al 12,9% cuando le pides señalar exactamente la región que sostiene esa respuesta. Acertar no implica estar anclado en la evidencia correcta.</p>
<p>Con vídeo pasa algo parecido. Si el modelo mantiene rendimiento cuando desordenas los frames, no está entendiendo la secuencia temporal aunque el marcador final siga siendo bueno. Si además la imagen rotada en espejo le hunde la precisión, tampoco conviene hablar de comprensión robusta del documento.</p>
<p>Por eso grounding, consistencia, localización y calibración no son extras metodológicos. Son la diferencia entre un sistema que parece sólido en el benchmark y uno que aguanta mejor cuando el entorno se vuelve menos limpio.</p>
<p>En el artículo desarrollo esas cuatro métricas y por qué cambian la lectura del benchmark (<a href="https://5sigmas.com/series/multimodalidad-iag/04-evaluacion/">https://5sigmas.com/series/multimodalidad-iag/04-evaluacion/</a>).</p>
<p class="li-caption-tags">#InteligenciaArtificial #ComputerVision #MachineLearning #MultimodalAI</p>
    <p><a class="md-button md-button--primary" href="/series/multimodalidad-iag/04-evaluacion/">Leer artículo de contexto</a></p>
  </section>
</div>

<nav class="li-post-pager">
  <a href="../multimodalidad-iag-cap4-post-1-benchmarks-mienten/">Post anterior</a>
  <a href="../">Píldoras 5sigmas</a>
  <a href="../multimodalidad-iag-cap4-post-3-dominios-dificiles/">Post siguiente</a>
</nav>
