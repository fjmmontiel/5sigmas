---
title: Lo que rompe un LLM casi nunca está en el modelo
description: Píldora 5sigmas completa con texto y slides inline.
hide:
  - toc
  - footer
---

<a class="li-back" href="../">Volver a Píldoras 5sigmas</a>

# Lo que rompe un LLM casi nunca está en el modelo

<div class="li-detail-meta" style="--series-accent:#26A69A">
  <span>Fundamentos de IA e IA generativa</span>
  <span>Cap. 2</span>
  <span>Post 5</span>
  <span>9 slides</span>
</div>

<div class="li-detail-layout">
  <section class="li-deck" data-li-deck>
    <div class="li-deck__bar">
      <button class="li-deck__button" type="button" data-li-prev aria-label="Slide anterior">‹</button>
      <div class="li-deck__status"><span data-li-current>1</span> / 9</div>
      <button class="li-deck__button" type="button" data-li-next aria-label="Slide siguiente">›</button>
    </div>
    <div class="li-deck__track" data-li-track>
<figure class="li-slide" id="slide-1">
  <img src="/assets/linkedin/posts/fundamentos-ia-iag-cap2-post-5-llmops/slide-01.jpg" alt="Slide 1 de Lo que rompe un LLM casi nunca está en el modelo: Hook: &quot;Desplegar un LLM no termina al elegir modelo. Empieza cuando gestionas prompt, contexto, evaluación y coste.&quot;" loading="lazy">
  <figcaption>01. Hook: &quot;Desplegar un LLM no termina al elegir modelo. Empieza cuando gestionas prompt, contexto, evaluación y coste.&quot;</figcaption>
</figure>
<figure class="li-slide" id="slide-2">
  <img src="/assets/linkedin/posts/fundamentos-ia-iag-cap2-post-5-llmops/slide-02.jpg" alt="Slide 2 de Lo que rompe un LLM casi nunca está en el modelo: Flujo: Modelo → Prompt → Contexto → Evaluación → Monitorización" loading="lazy">
  <figcaption>02. Flujo: Modelo → Prompt → Contexto → Evaluación → Monitorización</figcaption>
</figure>
<figure class="li-slide" id="slide-3">
  <img src="/assets/linkedin/posts/fundamentos-ia-iag-cap2-post-5-llmops/slide-03.jpg" alt="Slide 3 de Lo que rompe un LLM casi nunca está en el modelo: Contraste: API externa vs Modelo propio" loading="lazy">
  <figcaption>03. Contraste: API externa vs Modelo propio</figcaption>
</figure>
<figure class="li-slide" id="slide-4">
  <img src="/assets/linkedin/posts/fundamentos-ia-iag-cap2-post-5-llmops/slide-04.jpg" alt="Slide 4 de Lo que rompe un LLM casi nunca está en el modelo: Instrucciones como artefacto: Un cambio sin versionar puede cambiar todo el comportamiento sin dejar rastro." loading="lazy">
  <figcaption>04. Instrucciones como artefacto: Un cambio sin versionar puede cambiar todo el comportamiento sin dejar rastro.</figcaption>
</figure>
<figure class="li-slide" id="slide-5">
  <img src="/assets/linkedin/posts/fundamentos-ia-iag-cap2-post-5-llmops/slide-05.jpg" alt="Slide 5 de Lo que rompe un LLM casi nunca está en el modelo: Iterar sin métrica es moverse a ciegas: Human review, tests y LLM-as-judge convierten opinión en señal operativa." loading="lazy">
  <figcaption>05. Iterar sin métrica es moverse a ciegas: Human review, tests y LLM-as-judge convierten opinión en señal operativa.</figcaption>
</figure>
<figure class="li-slide" id="slide-6">
  <img src="/assets/linkedin/posts/fundamentos-ia-iag-cap2-post-5-llmops/slide-06.jpg" alt="Slide 6 de Lo que rompe un LLM casi nunca está en el modelo: La producción genera verdad: Errores, coste, latencia y calidad real alimentan la siguiente iteración." loading="lazy">
  <figcaption>06. La producción genera verdad: Errores, coste, latencia y calidad real alimentan la siguiente iteración.</figcaption>
</figure>
<figure class="li-slide" id="slide-7">
  <img src="/assets/linkedin/posts/fundamentos-ia-iag-cap2-post-5-llmops/slide-07.jpg" alt="Slide 7 de Lo que rompe un LLM casi nunca está en el modelo: Matriz: API: coste variable, API: menos ops, OSS: control, OSS: GPU y servidor" loading="lazy">
  <figcaption>07. Matriz: API: coste variable, API: menos ops, OSS: control, OSS: GPU y servidor</figcaption>
</figure>
<figure class="li-slide" id="slide-8">
  <img src="/assets/linkedin/posts/fundamentos-ia-iag-cap2-post-5-llmops/slide-08.jpg" alt="Slide 8 de Lo que rompe un LLM casi nunca está en el modelo: Contraste: Iterar rápido con proveedor vs Controlar versión y datos en casa" loading="lazy">
  <figcaption>08. Contraste: Iterar rápido con proveedor vs Controlar versión y datos en casa</figcaption>
</figure>
<figure class="li-slide" id="slide-9">
  <img src="/assets/linkedin/posts/fundamentos-ia-iag-cap2-post-5-llmops/slide-09.jpg" alt="Slide 9 de Lo que rompe un LLM casi nunca está en el modelo: CTA: El comportamiento vive en todo el pipeline." loading="lazy">
  <figcaption>09. CTA: El comportamiento vive en todo el pipeline.</figcaption>
</figure>
    </div>
    <nav class="li-slide-dots" aria-label="Navegación de slides">
      <a href="#slide-1" class="li-slide-dot" aria-label="Ir a slide 1">1</a><a href="#slide-2" class="li-slide-dot" aria-label="Ir a slide 2">2</a><a href="#slide-3" class="li-slide-dot" aria-label="Ir a slide 3">3</a><a href="#slide-4" class="li-slide-dot" aria-label="Ir a slide 4">4</a><a href="#slide-5" class="li-slide-dot" aria-label="Ir a slide 5">5</a><a href="#slide-6" class="li-slide-dot" aria-label="Ir a slide 6">6</a><a href="#slide-7" class="li-slide-dot" aria-label="Ir a slide 7">7</a><a href="#slide-8" class="li-slide-dot" aria-label="Ir a slide 8">8</a><a href="#slide-9" class="li-slide-dot" aria-label="Ir a slide 9">9</a>
    </nav>
  </section>

  <section class="li-caption-panel"><p>En muchos sistemas con LLMs, el modelo base no es lo que más se toca después de salir a producción. Lo que cambia cada semana es el prompt, el contexto, el evaluador, la recuperación, los límites de herramienta y las métricas.</p>
<p>Eso vuelve peligrosa una idea: tratar el prompt como texto informal. Un prompt en producción se parece más a código que a documentación. Si cambia, cambia el comportamiento. Si no se versiona, no puedes saber cuándo empezó la regresión.</p>
<p>LLMOps pone orden en esa capa: elegir modelo, gestionar contexto, evaluar respuestas, monitorizar coste y latencia, y decidir cuándo una mejora compensa el riesgo. Si consumes una API externa, además aceptas que parte del sistema vive fuera de tu control.</p>
<p>El resultado es menos glamuroso que una demo, pero mucho más importante: trazabilidad sobre un sistema probabilístico.</p>
<p>Lo desarrollo aquí (<a href="https://5sigmas.com/series/fundamentos-ia-iag/02-que-es-ia-generativa/">https://5sigmas.com/series/fundamentos-ia-iag/02-que-es-ia-generativa/</a>).</p>
<p class="li-caption-tags">#InteligenciaArtificial #LLMOps #LLM #RAG #GenAI</p>
    <p><a class="md-button md-button--primary" href="/series/fundamentos-ia-iag/02-que-es-ia-generativa/">Leer artículo de contexto</a></p>
  </section>
</div>

<nav class="li-post-pager">
  <a href="../fundamentos-ia-iag-cap2-post-4-llm-rag-agente/">Post anterior</a>
  <a href="../">Píldoras 5sigmas</a>
  <a href="../fundamentos-ia-iag-cap3-post-1-cinco-diferencias/">Post siguiente</a>
</nav>
