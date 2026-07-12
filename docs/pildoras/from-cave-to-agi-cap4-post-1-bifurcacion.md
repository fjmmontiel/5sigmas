---
title: Dos apuestas para el mismo Transformer: la bifurcación que definió la IA actual
description: Píldora 5sigmas completa con texto y slides inline.
hide:
  - toc
  - footer
---

<a class="li-back" href="../">Volver a Píldoras 5sigmas</a>

# Dos apuestas para el mismo Transformer: la bifurcación que definió la IA actual

<div class="li-detail-meta" style="--series-accent:#324AB2">
  <span>De las cavernas a la AGI</span>
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
  <img src="/assets/linkedin/posts/from-cave-to-agi-cap4-post-1-bifurcacion/slide-01.jpg" alt="Slide 1 de Dos apuestas para el mismo Transformer: la bifurcación que definió la IA actual: Hook — El Transformer fue el acuerdo. Lo que vino después fue la apuesta." loading="lazy">
  <figcaption>01. Hook — El Transformer fue el acuerdo. Lo que vino después fue la apuesta.</figcaption>
</figure>
<figure class="li-slide" id="slide-2">
  <img src="/assets/linkedin/posts/from-cave-to-agi-cap4-post-1-bifurcacion/slide-02.jpg" alt="Slide 2 de Dos apuestas para el mismo Transformer: la bifurcación que definió la IA actual: Chain flow — Datos masivos → Transformer → Preentrenamiento → Modelo base" loading="lazy">
  <figcaption>02. Chain flow — Datos masivos → Transformer → Preentrenamiento → Modelo base</figcaption>
</figure>
<figure class="li-slide" id="slide-3">
  <img src="/assets/linkedin/posts/from-cave-to-agi-cap4-post-1-bifurcacion/slide-03.jpg" alt="Slide 3 de Dos apuestas para el mismo Transformer: la bifurcación que definió la IA actual: Bifold — BERT (Google, oct 2018) vs GPT (OpenAI, jun 2018)" loading="lazy">
  <figcaption>03. Bifold — BERT (Google, oct 2018) vs GPT (OpenAI, jun 2018)</figcaption>
</figure>
<figure class="li-slide" id="slide-4">
  <img src="/assets/linkedin/posts/from-cave-to-agi-cap4-post-1-bifurcacion/slide-04.jpg" alt="Slide 4 de Dos apuestas para el mismo Transformer: la bifurcación que definió la IA actual: 3 tarjetas — El límite del fine-tuning / In-context learning / Un modelo sin límite de tareas" loading="lazy">
  <figcaption>04. 3 tarjetas — El límite del fine-tuning / In-context learning / Un modelo sin límite de tareas</figcaption>
</figure>
<figure class="li-slide" id="slide-5">
  <img src="/assets/linkedin/posts/from-cave-to-agi-cap4-post-1-bifurcacion/slide-05.jpg" alt="Slide 5 de Dos apuestas para el mismo Transformer: la bifurcación que definió la IA actual: Timeline — GPT-1 (2018) → GPT-3 (2020) → InstructGPT (2022) → ChatGPT (nov 2022)" loading="lazy">
  <figcaption>05. Timeline — GPT-1 (2018) → GPT-3 (2020) → InstructGPT (2022) → ChatGPT (nov 2022)</figcaption>
</figure>
<figure class="li-slide" id="slide-6">
  <img src="/assets/linkedin/posts/from-cave-to-agi-cap4-post-1-bifurcacion/slide-06.jpg" alt="Slide 6 de Dos apuestas para el mismo Transformer: la bifurcación que definió la IA actual: CTA — La apuesta autoregresiva no solo generó texto. Generó la categoría." loading="lazy">
  <figcaption>06. CTA — La apuesta autoregresiva no solo generó texto. Generó la categoría.</figcaption>
</figure>
    </div>
    <nav class="li-slide-dots" aria-label="Navegación de slides">
      <a href="#slide-1" class="li-slide-dot" aria-label="Ir a slide 1">1</a><a href="#slide-2" class="li-slide-dot" aria-label="Ir a slide 2">2</a><a href="#slide-3" class="li-slide-dot" aria-label="Ir a slide 3">3</a><a href="#slide-4" class="li-slide-dot" aria-label="Ir a slide 4">4</a><a href="#slide-5" class="li-slide-dot" aria-label="Ir a slide 5">5</a><a href="#slide-6" class="li-slide-dot" aria-label="Ir a slide 6">6</a>
    </nav>
  </section>

  <section class="li-caption-panel"><p>El mismo avance técnico abrió dos futuros muy distintos. Uno seguía atando cada tarea a su propio modelo afinado, el otro prometía cambiar de tarea escribiendo instrucciones sobre una base común.</p>
<p>En 2018 esa tensión se vuelve explícita. Dos papers, uno de Google y otro de OpenAI, parten del mismo Transformer preentrenado pero empujan en direcciones opuestas. Desde ese punto deja de discutirse solo qué arquitectura funciona mejor y empieza a discutirse qué tipo de producto quieres construir.</p>
<p>Una apuesta, la de BERT, consistía en leer el contexto completo y luego afinar un modelo distinto para cada tarea. Para clasificar, extraer entidades o responder preguntas, necesitabas dataset anotado, fine-tuning específico y una versión nueva por problema. La otra, la de GPT, apostaba por predecir el siguiente token de izquierda a derecha y cambiar de tarea desde el prompt, sin reentrenar cada vez.</p>
<p>Una ruta te daba modelos muy buenos para trabajos cerrados. La otra te daba una interfaz generalista donde el cambio de tarea se resolvía escribiendo instrucciones, no lanzando otro ciclo de entrenamiento.</p>
<p>La respuesta llegó en noviembre de 2022. ChatGPT ganó porque convirtió la apuesta autoregresiva de 2018 en una categoría de uso masivo.</p>
<p>Detallo por qué esa bifurcación terminó reordenando el mercado aquí (<a href="https://5sigmas.com/series/from-cave-to-agi/04-escalar/">https://5sigmas.com/series/from-cave-to-agi/04-escalar/</a>).</p>
<p class="li-caption-tags">#InteligenciaArtificial #LLM #DeepLearning #MachineLearning</p>
    <p><a class="md-button md-button--primary" href="/series/from-cave-to-agi/04-escalar/">Leer artículo de contexto</a></p>
  </section>
</div>

<nav class="li-post-pager">
  <a href="../from-cave-to-agi-cap3-post-3-2012/">Post anterior</a>
  <a href="../">Píldoras 5sigmas</a>
  <a href="../from-cave-to-agi-cap4-post-2-economia/">Post siguiente</a>
</nav>
