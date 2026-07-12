---
title: La matriz que evita usar un LLM donde no toca
description: Píldora 5sigmas completa con texto y slides inline.
hide:
  - toc
  - footer
---

<a class="li-back" href="../">Volver a Píldoras 5sigmas</a>

# La matriz que evita usar un LLM donde no toca

<div class="li-detail-meta" style="--series-accent:#26A69A">
  <span>Fundamentos de IA e IA generativa</span>
  <span>Cap. 3</span>
  <span>Post 2</span>
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
  <img src="/assets/linkedin/posts/fundamentos-ia-iag-cap3-post-2-matriz-operacional/slide-01.jpg" alt="Slide 1 de La matriz que evita usar un LLM donde no toca: Hook: &quot;La pregunta no es si puedes usar un LLM. La pregunta es qué parte del problema exige lenguaje abierto.&quot;" loading="lazy">
  <figcaption>01. Hook: &quot;La pregunta no es si puedes usar un LLM. La pregunta es qué parte del problema exige lenguaje abierto.&quot;</figcaption>
</figure>
<figure class="li-slide" id="slide-2">
  <img src="/assets/linkedin/posts/fundamentos-ia-iag-cap3-post-2-matriz-operacional/slide-02.jpg" alt="Slide 2 de La matriz que evita usar un LLM donde no toca: Flujo: Reglas → ML → LLM → RAG → Workflow → Agente" loading="lazy">
  <figcaption>02. Flujo: Reglas → ML → LLM → RAG → Workflow → Agente</figcaption>
</figure>
<figure class="li-slide" id="slide-3">
  <img src="/assets/linkedin/posts/fundamentos-ia-iag-cap3-post-2-matriz-operacional/slide-03.jpg" alt="Slide 3 de La matriz que evita usar un LLM donde no toca: Umbrales conocidos: Rápidas, auditables y suficientes cuando el patrón está claro." loading="lazy">
  <figcaption>03. Umbrales conocidos: Rápidas, auditables y suficientes cuando el patrón está claro.</figcaption>
</figure>
<figure class="li-slide" id="slide-4">
  <img src="/assets/linkedin/posts/fundamentos-ia-iag-cap3-post-2-matriz-operacional/slide-04.jpg" alt="Slide 4 de La matriz que evita usar un LLM donde no toca: Predicción a escala: Datos etiquetados, salida finita y métricas objetivas." loading="lazy">
  <figcaption>04. Predicción a escala: Datos etiquetados, salida finita y métricas objetivas.</figcaption>
</figure>
<figure class="li-slide" id="slide-5">
  <img src="/assets/linkedin/posts/fundamentos-ia-iag-cap3-post-2-matriz-operacional/slide-05.jpg" alt="Slide 5 de La matriz que evita usar un LLM donde no toca: Lenguaje abierto: Útil cuando la entrada o salida requiere comprensión y generación flexible." loading="lazy">
  <figcaption>05. Lenguaje abierto: Útil cuando la entrada o salida requiere comprensión y generación flexible.</figcaption>
</figure>
<figure class="li-slide" id="slide-6">
  <img src="/assets/linkedin/posts/fundamentos-ia-iag-cap3-post-2-matriz-operacional/slide-06.jpg" alt="Slide 6 de La matriz que evita usar un LLM donde no toca: Conocimiento propio: Recupera documentos relevantes antes de generar para no depender solo de parámetros." loading="lazy">
  <figcaption>06. Conocimiento propio: Recupera documentos relevantes antes de generar para no depender solo de parámetros.</figcaption>
</figure>
<figure class="li-slide" id="slide-7">
  <img src="/assets/linkedin/posts/fundamentos-ia-iag-cap3-post-2-matriz-operacional/slide-07.jpg" alt="Slide 7 de La matriz que evita usar un LLM donde no toca: Pasos y herramientas: Cuando la tarea exige actuar, verificar y corregir en varios movimientos." loading="lazy">
  <figcaption>07. Pasos y herramientas: Cuando la tarea exige actuar, verificar y corregir en varios movimientos.</figcaption>
</figure>
<figure class="li-slide" id="slide-8">
  <img src="/assets/linkedin/posts/fundamentos-ia-iag-cap3-post-2-matriz-operacional/slide-08.jpg" alt="Slide 8 de La matriz que evita usar un LLM donde no toca: CTA: Más complejo solo compensa si el problema lo exige." loading="lazy">
  <figcaption>08. CTA: Más complejo solo compensa si el problema lo exige.</figcaption>
</figure>
    </div>
    <nav class="li-slide-dots" aria-label="Navegación de slides">
      <a href="#slide-1" class="li-slide-dot" aria-label="Ir a slide 1">1</a><a href="#slide-2" class="li-slide-dot" aria-label="Ir a slide 2">2</a><a href="#slide-3" class="li-slide-dot" aria-label="Ir a slide 3">3</a><a href="#slide-4" class="li-slide-dot" aria-label="Ir a slide 4">4</a><a href="#slide-5" class="li-slide-dot" aria-label="Ir a slide 5">5</a><a href="#slide-6" class="li-slide-dot" aria-label="Ir a slide 6">6</a><a href="#slide-7" class="li-slide-dot" aria-label="Ir a slide 7">7</a><a href="#slide-8" class="li-slide-dot" aria-label="Ir a slide 8">8</a>
    </nav>
  </section>

  <section class="li-caption-panel"><p>Muchas decisiones de IA se toman al revés: primero se elige la tecnología de moda y después se intenta encajar el problema.</p>
<p>La matriz operacional fuerza el orden contrario. Si el patrón es conocido, unas reglas pueden ser suficientes. Si hay datos etiquetados y salida finita, ML clásico suele ganar en coste, trazabilidad y evaluación. Si la entrada es lenguaje natural y la salida debe ser abierta, un LLM empieza a tener sentido. Si hace falta conocimiento propio actualizado, aparece RAG. Si hay pasos, herramientas y verificación, entras en workflows o agentes.</p>
<p>El salto entre niveles no es progreso automático. Es más complejidad, más superficie de fallo y más necesidad de control.</p>
<p>La buena arquitectura no es la que suena más moderna; es la que deja menos deuda para el problema real.</p>
<p>Desarrollo la matriz aquí (<a href="https://5sigmas.com/series/fundamentos-ia-iag/03-ia-vs-ia-generativa/">https://5sigmas.com/series/fundamentos-ia-iag/03-ia-vs-ia-generativa/</a>).</p>
<p class="li-caption-tags">#InteligenciaArtificial #Arquitectura #LLM #RAG #AgenticAI</p>
    <p><a class="md-button md-button--primary" href="/series/fundamentos-ia-iag/03-ia-vs-ia-generativa/">Leer artículo de contexto</a></p>
  </section>
</div>

<nav class="li-post-pager">
  <a href="../fundamentos-ia-iag-cap3-post-1-cinco-diferencias/">Post anterior</a>
  <a href="../">Píldoras 5sigmas</a>
  <a href="../fundamentos-ia-iag-cap4-post-1-agi-definiciones/">Post siguiente</a>
</nav>
