---
title: El pipeline multimodal necesita defensas en cada etapa
description: Píldora 5sigmas completa con texto y slides inline.
hide:
  - toc
  - footer
---

<a class="li-back" href="../">Volver a Píldoras 5sigmas</a>

# El pipeline multimodal necesita defensas en cada etapa

<div class="li-detail-meta" style="--series-accent:#4E9CD6">
  <span>Multimodalidad en IA generativa</span>
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
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap5-post-2-herramientas-rag/slide-01.jpg" alt="Slide 1 de El pipeline multimodal necesita defensas en cada etapa: Hook: una inyección exitosa ya no solo altera texto; altera acciones y contexto" loading="lazy">
  <figcaption>01. Hook: una inyección exitosa ya no solo altera texto; altera acciones y contexto</figcaption>
</figure>
<figure class="li-slide" id="slide-2">
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap5-post-2-herramientas-rag/slide-02.jpg" alt="Slide 2 de El pipeline multimodal necesita defensas en cada etapa: Flow: imagen adversarial → cambio de rol → exfiltración del sistema" loading="lazy">
  <figcaption>02. Flow: imagen adversarial → cambio de rol → exfiltración del sistema</figcaption>
</figure>
<figure class="li-slide" id="slide-3">
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap5-post-2-herramientas-rag/slide-03.jpg" alt="Slide 3 de El pipeline multimodal necesita defensas en cada etapa: Flow: documento envenenado → recuperación → respuesta contaminada" loading="lazy">
  <figcaption>03. Flow: documento envenenado → recuperación → respuesta contaminada</figcaption>
</figure>
<figure class="li-slide" id="slide-4">
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap5-post-2-herramientas-rag/slide-04.jpg" alt="Slide 4 de El pipeline multimodal necesita defensas en cada etapa: Contrast: imagen útil vs imagen con metadatos y exposición involuntaria" loading="lazy">
  <figcaption>04. Contrast: imagen útil vs imagen con metadatos y exposición involuntaria</figcaption>
</figure>
<figure class="li-slide" id="slide-5">
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap5-post-2-herramientas-rag/slide-05.jpg" alt="Slide 5 de El pipeline multimodal necesita defensas en cada etapa: Beat: mínimo privilegio, sanitización y validación por etapa" loading="lazy">
  <figcaption>05. Beat: mínimo privilegio, sanitización y validación por etapa</figcaption>
</figure>
<figure class="li-slide" id="slide-6">
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap5-post-2-herramientas-rag/slide-06.jpg" alt="Slide 6 de El pipeline multimodal necesita defensas en cada etapa: CTA: artículo completo" loading="lazy">
  <figcaption>06. CTA: artículo completo</figcaption>
</figure>
    </div>
    <nav class="li-slide-dots" aria-label="Navegación de slides">
      <a href="#slide-1" class="li-slide-dot" aria-label="Ir a slide 1">1</a><a href="#slide-2" class="li-slide-dot" aria-label="Ir a slide 2">2</a><a href="#slide-3" class="li-slide-dot" aria-label="Ir a slide 3">3</a><a href="#slide-4" class="li-slide-dot" aria-label="Ir a slide 4">4</a><a href="#slide-5" class="li-slide-dot" aria-label="Ir a slide 5">5</a><a href="#slide-6" class="li-slide-dot" aria-label="Ir a slide 6">6</a>
    </nav>
  </section>

  <section class="li-caption-panel"><p>Una respuesta incorrecta ya molesta, pero un documento o una imagen que consiguen cambiar lo que hace el sistema crean un problema mucho mayor. El daño ya no se queda en el texto: puede tocar contexto, herramientas y datos.</p>
<p>En un sistema que busca contexto en documentos y usa herramientas, un archivo malicioso no necesita convencer al usuario. Le basta con entrar en la base indexada, reaparecer cuando el sistema recupera información y empujar al modelo a responder peor o a actuar con más privilegios de los que debería. Ahí caben fugas por enlaces incrustados, partes del prompt interno que se exponen en la salida o llamadas a herramientas apoyadas en contenido no fiable.</p>
<p>El fallo no suele estar solo al final. Está en la unión entre etapas. Si ingesta, recuperación, montaje del contexto y uso de herramientas comparten demasiado privilegio, una sola pieza contaminada puede atravesar todo el sistema sin parecer extraña en ningún paso.</p>
<p>La defensa útil aquí no es solo endurecer un filtro final. Es separar mejor cada etapa: revisar antes de indexar, dar el mínimo privilegio posible y validar antes de ejecutar.</p>
<p>En el artículo reparto ese riesgo entre RAG, herramientas y privacidad operativa para enseñar dónde se rompe de verdad el sistema. (<a href="https://5sigmas.com/series/multimodalidad-iag/05-riesgos/">https://5sigmas.com/series/multimodalidad-iag/05-riesgos/</a>).</p>
<p class="li-caption-tags">#InteligenciaArtificial #AISecurity #MachineLearning #PrivacidadDigital</p>
    <p><a class="md-button md-button--primary" href="/series/multimodalidad-iag/05-riesgos/">Leer artículo de contexto</a></p>
  </section>
</div>

<nav class="li-post-pager">
  <a href="../multimodalidad-iag-cap5-post-1-prompt-injection/">Post anterior</a>
  <a href="../">Píldoras 5sigmas</a>
  <a href="../multimodalidad-iag-cap5-post-3-agencia-alucinaciones/">Post siguiente</a>
</nav>
