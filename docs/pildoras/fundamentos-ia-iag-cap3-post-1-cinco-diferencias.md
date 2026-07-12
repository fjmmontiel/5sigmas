---
title: La confusión que mezcla ML clásico y GenAI
description: Píldora 5sigmas completa con texto y slides inline.
hide:
  - toc
  - footer
---

<a class="li-back" href="../">Volver a Píldoras 5sigmas</a>

# La confusión que mezcla ML clásico y GenAI

<div class="li-detail-meta" style="--series-accent:#26A69A">
  <span>Fundamentos de IA e IA generativa</span>
  <span>Cap. 3</span>
  <span>Post 1</span>
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
  <img src="/assets/linkedin/posts/fundamentos-ia-iag-cap3-post-1-cinco-diferencias/slide-01.jpg" alt="Slide 1 de La confusión que mezcla ML clásico y GenAI: Hook: &quot;Un clasificador y un LLM comparten etiqueta. Operan con reglas de juego distintas.&quot;" loading="lazy">
  <figcaption>01. Hook: &quot;Un clasificador y un LLM comparten etiqueta. Operan con reglas de juego distintas.&quot;</figcaption>
</figure>
<figure class="li-slide" id="slide-2">
  <img src="/assets/linkedin/posts/fundamentos-ia-iag-cap3-post-1-cinco-diferencias/slide-02.jpg" alt="Slide 2 de La confusión que mezcla ML clásico y GenAI: Matriz: Entrada / salida, Determinismo, Explicabilidad, Evaluación, Riesgos" loading="lazy">
  <figcaption>02. Matriz: Entrada / salida, Determinismo, Explicabilidad, Evaluación, Riesgos</figcaption>
</figure>
<figure class="li-slide" id="slide-3">
  <img src="/assets/linkedin/posts/fundamentos-ia-iag-cap3-post-1-cinco-diferencias/slide-03.jpg" alt="Slide 3 de La confusión que mezcla ML clásico y GenAI: Contraste: ML: etiqueta, número, probabilidad vs GenAI: texto, código, imagen o audio" loading="lazy">
  <figcaption>03. Contraste: ML: etiqueta, número, probabilidad vs GenAI: texto, código, imagen o audio</figcaption>
</figure>
<figure class="li-slide" id="slide-4">
  <img src="/assets/linkedin/posts/fundamentos-ia-iag-cap3-post-1-cinco-diferencias/slide-04.jpg" alt="Slide 4 de La confusión que mezcla ML clásico y GenAI: Contraste: Más reproducible vs Probabilístico por generación token a token" loading="lazy">
  <figcaption>04. Contraste: Más reproducible vs Probabilístico por generación token a token</figcaption>
</figure>
<figure class="li-slide" id="slide-5">
  <img src="/assets/linkedin/posts/fundamentos-ia-iag-cap3-post-1-cinco-diferencias/slide-05.jpg" alt="Slide 5 de La confusión que mezcla ML clásico y GenAI: Contraste: Árboles, SHAP, LIME vs Texto fluido con proceso interno opaco" loading="lazy">
  <figcaption>05. Contraste: Árboles, SHAP, LIME vs Texto fluido con proceso interno opaco</figcaption>
</figure>
<figure class="li-slide" id="slide-6">
  <img src="/assets/linkedin/posts/fundamentos-ia-iag-cap3-post-1-cinco-diferencias/slide-06.jpg" alt="Slide 6 de La confusión que mezcla ML clásico y GenAI: Contraste: Métricas objetivas sobre etiquetas vs Calidad abierta y revisión contextual" loading="lazy">
  <figcaption>06. Contraste: Métricas objetivas sobre etiquetas vs Calidad abierta y revisión contextual</figcaption>
</figure>
<figure class="li-slide" id="slide-7">
  <img src="/assets/linkedin/posts/fundamentos-ia-iag-cap3-post-1-cinco-diferencias/slide-07.jpg" alt="Slide 7 de La confusión que mezcla ML clásico y GenAI: Contraste: Deriva, sesgo, adversarial input vs Alucinación, prompt injection, salida impredecible" loading="lazy">
  <figcaption>07. Contraste: Deriva, sesgo, adversarial input vs Alucinación, prompt injection, salida impredecible</figcaption>
</figure>
<figure class="li-slide" id="slide-8">
  <img src="/assets/linkedin/posts/fundamentos-ia-iag-cap3-post-1-cinco-diferencias/slide-08.jpg" alt="Slide 8 de La confusión que mezcla ML clásico y GenAI: CTA: La familia tecnológica decide el tipo de control." loading="lazy">
  <figcaption>08. CTA: La familia tecnológica decide el tipo de control.</figcaption>
</figure>
    </div>
    <nav class="li-slide-dots" aria-label="Navegación de slides">
      <a href="#slide-1" class="li-slide-dot" aria-label="Ir a slide 1">1</a><a href="#slide-2" class="li-slide-dot" aria-label="Ir a slide 2">2</a><a href="#slide-3" class="li-slide-dot" aria-label="Ir a slide 3">3</a><a href="#slide-4" class="li-slide-dot" aria-label="Ir a slide 4">4</a><a href="#slide-5" class="li-slide-dot" aria-label="Ir a slide 5">5</a><a href="#slide-6" class="li-slide-dot" aria-label="Ir a slide 6">6</a><a href="#slide-7" class="li-slide-dot" aria-label="Ir a slide 7">7</a><a href="#slide-8" class="li-slide-dot" aria-label="Ir a slide 8">8</a>
    </nav>
  </section>

  <section class="li-caption-panel"><p>Elegir un LLM para un problema de clasificación tabular puede ser tan mala decisión como pedirle a un modelo clásico que redacte texto abierto con contexto variable.</p>
<p>ML clásico y GenAI comparten parte del árbol genealógico, pero no el comportamiento operativo. Cambian las entradas, las salidas, la reproducibilidad, la explicabilidad, la evaluación y los riesgos. Eso afecta al coste, a la auditoría y a la forma de diseñar producto.</p>
<p>Un clasificador de fraude devuelve una etiqueta o probabilidad dentro de un espacio cerrado. Un LLM genera texto en un espacio casi ilimitado, con alucinaciones posibles y evaluación mucho más ambigua. El primero puede degradarse por deriva de datos; el segundo puede obedecer instrucciones ocultas dentro del contenido que procesa.</p>
<p>Llamar a todo &quot;IA&quot; borra justo las diferencias que necesitas para diseñar bien.</p>
<p>Desarrollo las cinco dimensiones aquí (<a href="https://5sigmas.com/series/fundamentos-ia-iag/03-ia-vs-ia-generativa/">https://5sigmas.com/series/fundamentos-ia-iag/03-ia-vs-ia-generativa/</a>).</p>
<p class="li-caption-tags">#InteligenciaArtificial #MachineLearning #LLM #GenAI #Arquitectura</p>
    <p><a class="md-button md-button--primary" href="/series/fundamentos-ia-iag/03-ia-vs-ia-generativa/">Leer artículo de contexto</a></p>
  </section>
</div>

<nav class="li-post-pager">
  <a href="../fundamentos-ia-iag-cap2-post-5-llmops/">Post anterior</a>
  <a href="../">Píldoras 5sigmas</a>
  <a href="../fundamentos-ia-iag-cap3-post-2-matriz-operacional/">Post siguiente</a>
</nav>
