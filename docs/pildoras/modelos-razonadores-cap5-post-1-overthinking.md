---
title: Overthinking: cuando más razonamiento produce peor respuesta
description: Píldora 5sigmas completa con texto y slides inline.
hide:
  - toc
  - footer
---

<a class="li-back" href="../">Volver a Píldoras 5sigmas</a>

# Overthinking: cuando más razonamiento produce peor respuesta

<div class="li-detail-meta" style="--series-accent:#C27A00">
  <span>Modelos razonadores</span>
  <span>Cap. 5</span>
  <span>Post 1</span>
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
  <img src="/assets/linkedin/posts/modelos-razonadores-cap5-post-1-overthinking/slide-01.jpg" alt="Slide 1 de Overthinking: cuando más razonamiento produce peor respuesta: Hook: pensar más puede empeorar una respuesta sencilla" loading="lazy">
  <figcaption>01. Hook: pensar más puede empeorar una respuesta sencilla</figcaption>
</figure>
<figure class="li-slide" id="slide-2">
  <img src="/assets/linkedin/posts/modelos-razonadores-cap5-post-1-overthinking/slide-02.jpg" alt="Slide 2 de Overthinking: cuando más razonamiento produce peor respuesta: Metric: más tokens no siempre mejoran la calidad" loading="lazy">
  <figcaption>02. Metric: más tokens no siempre mejoran la calidad</figcaption>
</figure>
<figure class="li-slide" id="slide-3">
  <img src="/assets/linkedin/posts/modelos-razonadores-cap5-post-1-overthinking/slide-03.jpg" alt="Slide 3 de Overthinking: cuando más razonamiento produce peor respuesta: Flow: la calidad sube, se estabiliza y luego cae" loading="lazy">
  <figcaption>03. Flow: la calidad sube, se estabiliza y luego cae</figcaption>
</figure>
<figure class="li-slide" id="slide-4">
  <img src="/assets/linkedin/posts/modelos-razonadores-cap5-post-1-overthinking/slide-04.jpg" alt="Slide 4 de Overthinking: cuando más razonamiento produce peor respuesta: Flow: límites, parada y presupuesto adaptativo" loading="lazy">
  <figcaption>04. Flow: límites, parada y presupuesto adaptativo</figcaption>
</figure>
<figure class="li-slide" id="slide-5">
  <img src="/assets/linkedin/posts/modelos-razonadores-cap5-post-1-overthinking/slide-05.jpg" alt="Slide 5 de Overthinking: cuando más razonamiento produce peor respuesta: CTA: artículo completo" loading="lazy">
  <figcaption>05. CTA: artículo completo</figcaption>
</figure>
    </div>
    <nav class="li-slide-dots" aria-label="Navegación de slides">
      <a href="#slide-1" class="li-slide-dot" aria-label="Ir a slide 1">1</a><a href="#slide-2" class="li-slide-dot" aria-label="Ir a slide 2">2</a><a href="#slide-3" class="li-slide-dot" aria-label="Ir a slide 3">3</a><a href="#slide-4" class="li-slide-dot" aria-label="Ir a slide 4">4</a><a href="#slide-5" class="li-slide-dot" aria-label="Ir a slide 5">5</a>
    </nav>
  </section>

  <section class="li-caption-panel"><p>Una respuesta sencilla de un LLM, es decir, un modelo de lenguaje grande, puede estropearse por seguir razonando dos segundos más. Como ocurre con las personas, el sobrepensamiento tiene costes reales. En IA podemos tratarlo como un problema de ingeniería.</p>
<p>Con los modelos razonadores, más presupuesto de razonamiento no garantiza siempre una respuesta mejor. A veces compra justo lo contrario: la versión empeorada de algo que el sistema ya había resuelto bien al principio.</p>
<p>Apple documentó este fallo en tareas simples: varios modelos encontraban pronto una solución correcta y después la empeoraban al seguir generando pasos. El estudio sigue siendo útil para describir el fenómeno, aunque sus modelos y cifras pertenecen al experimento original (<a href="https://machinelearning.apple.com/research/illusion-of-thinking">https://machinelearning.apple.com/research/illusion-of-thinking</a>).</p>
<p>La intuición de “más tokens, mejor respuesta” se rompe cuando el cómputo extra empieza a meter ruido en lugar de progreso.</p>
<p>Los modelos actuales convierten parte de esa tensión en un control de producto. Gemini 3.5 Flash permite seleccionar niveles de razonamiento (<a href="https://deepmind.google/models/model-cards/gemini-3-5-flash/">https://deepmind.google/models/model-cards/gemini-3-5-flash/</a>) y Claude Sonnet 5 permite ajustar el esfuerzo (<a href="https://www.anthropic.com/news/claude-sonnet-5">https://www.anthropic.com/news/claude-sonnet-5</a>). No garantizan que el modelo se detenga en el punto óptimo, pero sí permiten limitar el presupuesto cuando la tarea no justifica seguir pensando.</p>
<p>Esta señal importa porque convierte el control del presupuesto en parte del diseño del sistema, no en un ajuste secundario.</p>
<p>El artículo baja ese patrón a decisiones concretas: cuándo cortar, qué señales vigilar y por qué un presupuesto más largo puede dañar justo lo que querías mejorar (<a href="https://5sigmas.com/series/modelos-razonadores/05-riesgos/">https://5sigmas.com/series/modelos-razonadores/05-riesgos/</a>).</p>
<p class="li-caption-tags">#InteligenciaArtificial #LLM #AIResearch #ModelosDeIA</p>
    <p><a class="md-button md-button--primary" href="/series/modelos-razonadores/05-riesgos/">Leer artículo de contexto</a></p>
  </section>
</div>

<nav class="li-post-pager">
  <a href="../modelos-razonadores-cap4-post-2-routellm/">Post anterior</a>
  <a href="../">Píldoras 5sigmas</a>
  <a href="../modelos-razonadores-cap5-post-2-ataques-agentes/">Post siguiente</a>
</nav>
