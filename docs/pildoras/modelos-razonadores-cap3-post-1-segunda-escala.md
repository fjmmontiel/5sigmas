---
title: La segunda escala: cómputo en inferencia
description: Píldora 5sigmas completa con texto y slides inline.
hide:
  - toc
  - footer
---

<a class="li-back" href="../">Volver a Píldoras 5sigmas</a>

# La segunda escala: cómputo en inferencia

<div class="li-detail-meta" style="--series-accent:#C27A00">
  <span>Modelos razonadores</span>
  <span>Cap. 3</span>
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
  <img src="/assets/linkedin/posts/modelos-razonadores-cap3-post-1-segunda-escala/slide-01.jpg" alt="Slide 1 de La segunda escala: cómputo en inferencia: Hook: mejorar un modelo ya no depende solo del entrenamiento" loading="lazy">
  <figcaption>01. Hook: mejorar un modelo ya no depende solo del entrenamiento</figcaption>
</figure>
<figure class="li-slide" id="slide-2">
  <img src="/assets/linkedin/posts/modelos-razonadores-cap3-post-1-segunda-escala/slide-02.jpg" alt="Slide 2 de La segunda escala: cómputo en inferencia: Metric: mejora cuantificada al gastar cómputo en inferencia" loading="lazy">
  <figcaption>02. Metric: mejora cuantificada al gastar cómputo en inferencia</figcaption>
</figure>
<figure class="li-slide" id="slide-3">
  <img src="/assets/linkedin/posts/modelos-razonadores-cap3-post-1-segunda-escala/slide-03.jpg" alt="Slide 3 de La segunda escala: cómputo en inferencia: Proof: entrenamiento e inferencia como dos escalas distintas" loading="lazy">
  <figcaption>03. Proof: entrenamiento e inferencia como dos escalas distintas</figcaption>
</figure>
<figure class="li-slide" id="slide-4">
  <img src="/assets/linkedin/posts/modelos-razonadores-cap3-post-1-segunda-escala/slide-04.jpg" alt="Slide 4 de La segunda escala: cómputo en inferencia: Proof: el presupuesto de test-time compute pasa a ser variable de diseño" loading="lazy">
  <figcaption>04. Proof: el presupuesto de test-time compute pasa a ser variable de diseño</figcaption>
</figure>
<figure class="li-slide" id="slide-5">
  <img src="/assets/linkedin/posts/modelos-razonadores-cap3-post-1-segunda-escala/slide-05.jpg" alt="Slide 5 de La segunda escala: cómputo en inferencia: CTA: artículo completo" loading="lazy">
  <figcaption>05. CTA: artículo completo</figcaption>
</figure>
    </div>
    <nav class="li-slide-dots" aria-label="Navegación de slides">
      <a href="#slide-1" class="li-slide-dot" aria-label="Ir a slide 1">1</a><a href="#slide-2" class="li-slide-dot" aria-label="Ir a slide 2">2</a><a href="#slide-3" class="li-slide-dot" aria-label="Ir a slide 3">3</a><a href="#slide-4" class="li-slide-dot" aria-label="Ir a slide 4">4</a><a href="#slide-5" class="li-slide-dot" aria-label="Ir a slide 5">5</a>
    </nav>
  </section>

  <section class="li-caption-panel"><p>Durante mucho tiempo mejorar un modelo quería decir entrenarlo más. Ahora parte del rendimiento también se compra después, cuando el sistema responde y decide cuánto tiempo y cuánto cómputo gasta en esa pregunta.</p>
<p>Durante años escalar un modelo significaba casi siempre lo mismo: más datos, más parámetros y más entrenamiento. Ahora aparece otra palanca. Trabajos como el de Snell sobre cómputo extra al responder apuntan justo ahí. No todo el rendimiento queda fijado cuando termina el entrenamiento. En Claude 3.7 sobre AIME 2024, por ejemplo, la precisión crece de forma bastante predecible cuando aumentas el presupuesto de pensamiento.</p>
<p>Eso mueve el centro de gravedad del diseño. El modelo base deja de ser toda la historia. También cuenta cuánto esfuerzo extra compras para cada pregunta, y ese esfuerzo se traduce en latencia, coste y una curva de calidad que mejora hasta cierto punto.</p>
<p>La decisión ya no es solo qué modelo usas. También es cuánto razonamiento pagas para cada tipo de problema. Ahí la investigación del modelo y el diseño de producto empiezan a mezclarse.</p>
<p>En el artículo explico por qué esta segunda escala obliga a pensar entrenamiento e inferencia como partes del mismo sistema. (<a href="https://5sigmas.com/series/modelos-razonadores/03-test-time-compute/">https://5sigmas.com/series/modelos-razonadores/03-test-time-compute/</a>).</p>
<p class="li-caption-tags">#InteligenciaArtificial #LLM #ScalingLaws #AIResearch</p>
    <p><a class="md-button md-button--primary" href="/series/modelos-razonadores/03-test-time-compute/">Leer artículo de contexto</a></p>
  </section>
</div>

<nav class="li-post-pager">
  <a href="../modelos-razonadores-cap2-post-3-cot-fidelidad/">Post anterior</a>
  <a href="../">Píldoras 5sigmas</a>
  <a href="../modelos-razonadores-cap3-post-2-tres-palancas/">Post siguiente</a>
</nav>
