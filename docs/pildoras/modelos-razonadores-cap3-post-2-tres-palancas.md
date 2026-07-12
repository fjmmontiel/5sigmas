---
title: Tres formas de usar más cómputo en inferencia
description: Píldora 5sigmas completa con texto y slides inline.
hide:
  - toc
  - footer
---

<a class="li-back" href="../">Volver a Píldoras 5sigmas</a>

# Tres formas de usar más cómputo en inferencia

<div class="li-detail-meta" style="--series-accent:#C27A00">
  <span>Modelos razonadores</span>
  <span>Cap. 3</span>
  <span>Post 2</span>
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
  <img src="/assets/linkedin/posts/modelos-razonadores-cap3-post-2-tres-palancas/slide-01.jpg" alt="Slide 1 de Tres formas de usar más cómputo en inferencia: Hook: tres formas de usar más cómputo en inferencia, no una" loading="lazy">
  <figcaption>01. Hook: tres formas de usar más cómputo en inferencia, no una</figcaption>
</figure>
<figure class="li-slide" id="slide-2">
  <img src="/assets/linkedin/posts/modelos-razonadores-cap3-post-2-tres-palancas/slide-02.jpg" alt="Slide 2 de Tres formas de usar más cómputo en inferencia: Flow: Pasos (CoT) → Muestras (best-of-N) → Ramas (árbol)" loading="lazy">
  <figcaption>02. Flow: Pasos (CoT) → Muestras (best-of-N) → Ramas (árbol)</figcaption>
</figure>
<figure class="li-slide" id="slide-3">
  <img src="/assets/linkedin/posts/modelos-razonadores-cap3-post-2-tres-palancas/slide-03.jpg" alt="Slide 3 de Tres formas de usar más cómputo en inferencia: Contrast: evaluar resultado (ORM) vs evaluar proceso (PRM)" loading="lazy">
  <figcaption>03. Contrast: evaluar resultado (ORM) vs evaluar proceso (PRM)</figcaption>
</figure>
<figure class="li-slide" id="slide-4">
  <img src="/assets/linkedin/posts/modelos-razonadores-cap3-post-2-tres-palancas/slide-04.jpg" alt="Slide 4 de Tres formas de usar más cómputo en inferencia: Beat: ≈ — la palanca correcta depende del tipo de problema" loading="lazy">
  <figcaption>04. Beat: ≈ — la palanca correcta depende del tipo de problema</figcaption>
</figure>
<figure class="li-slide" id="slide-5">
  <img src="/assets/linkedin/posts/modelos-razonadores-cap3-post-2-tres-palancas/slide-05.jpg" alt="Slide 5 de Tres formas de usar más cómputo en inferencia: CTA con link al artículo" loading="lazy">
  <figcaption>05. CTA con link al artículo</figcaption>
</figure>
    </div>
    <nav class="li-slide-dots" aria-label="Navegación de slides">
      <a href="#slide-1" class="li-slide-dot" aria-label="Ir a slide 1">1</a><a href="#slide-2" class="li-slide-dot" aria-label="Ir a slide 2">2</a><a href="#slide-3" class="li-slide-dot" aria-label="Ir a slide 3">3</a><a href="#slide-4" class="li-slide-dot" aria-label="Ir a slide 4">4</a><a href="#slide-5" class="li-slide-dot" aria-label="Ir a slide 5">5</a>
    </nav>
  </section>

  <section class="li-caption-panel"><p>Cuando decimos que un modelo necesita más tiempo para pensar, en realidad podemos estar hablando de cosas distintas. A veces recorre más pasos en una sola respuesta, a veces prueba varias respuestas y elige la mejor, y a veces añade un sistema que revisa si el camino seguido tiene sentido antes de continuar.</p>
<p>Claude 3.7 llegó al 84,8% en una prueba científica de nivel experto usando el equivalente a 256 muestras. La cifra no demuestra que exista un botón mágico para razonar mejor; demuestra que gastar más cómputo al responder puede hacerse de varias maneras y que cada una cambia el resultado de forma distinta.</p>
<p>Alargar la cadena de pasos suele aumentar la espera. Probar varias respuestas sube el coste por consulta. Añadir verificación puede mejorar problemas largos porque revisa el proceso y no solo la respuesta final.</p>
<p>La decisión útil no es &quot;darle más pensamiento&quot; en abstracto. La decisión útil es elegir qué mecanismo compensa en esa tarea, con ese presupuesto y con ese nivel de latencia aceptable.</p>
<p>En el artículo aterrizo cuándo conviene alargar pasos, cuándo conviene probar varias respuestas y cuándo compensa añadir verificación. (<a href="https://5sigmas.com/series/modelos-razonadores/03-test-time-compute/">https://5sigmas.com/series/modelos-razonadores/03-test-time-compute/</a>).</p>
<p class="li-caption-tags">#InteligenciaArtificial #LLM #TestTimeCompute #AIResearch</p>
    <p><a class="md-button md-button--primary" href="/series/modelos-razonadores/03-test-time-compute/">Leer artículo de contexto</a></p>
  </section>
</div>

<nav class="li-post-pager">
  <a href="../modelos-razonadores-cap3-post-1-segunda-escala/">Post anterior</a>
  <a href="../">Píldoras 5sigmas</a>
  <a href="../modelos-razonadores-cap4-post-1-suelo-fisico/">Post siguiente</a>
</nav>
