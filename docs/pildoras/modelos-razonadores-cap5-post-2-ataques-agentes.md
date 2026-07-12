---
title: Ataques a agentes: la superficie que crece con la capacidad
description: Píldora 5sigmas completa con texto y slides inline.
hide:
  - toc
  - footer
---

<a class="li-back" href="../">Volver a Píldoras 5sigmas</a>

# Ataques a agentes: la superficie que crece con la capacidad

<div class="li-detail-meta" style="--series-accent:#C27A00">
  <span>Modelos razonadores</span>
  <span>Cap. 5</span>
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
  <img src="/assets/linkedin/posts/modelos-razonadores-cap5-post-2-ataques-agentes/slide-01.jpg" alt="Slide 1 de Ataques a agentes: la superficie que crece con la capacidad: Hook: más capacidad también significa más superficie de ataque" loading="lazy">
  <figcaption>01. Hook: más capacidad también significa más superficie de ataque</figcaption>
</figure>
<figure class="li-slide" id="slide-2">
  <img src="/assets/linkedin/posts/modelos-razonadores-cap5-post-2-ataques-agentes/slide-02.jpg" alt="Slide 2 de Ataques a agentes: la superficie que crece con la capacidad: Contrast: chat simple vs agente con herramientas, memoria y fuentes externas" loading="lazy">
  <figcaption>02. Contrast: chat simple vs agente con herramientas, memoria y fuentes externas</figcaption>
</figure>
<figure class="li-slide" id="slide-3">
  <img src="/assets/linkedin/posts/modelos-razonadores-cap5-post-2-ataques-agentes/slide-03.jpg" alt="Slide 3 de Ataques a agentes: la superficie que crece con la capacidad: Flow: RAG, herramientas y contexto persistente como vectores de entrada" loading="lazy">
  <figcaption>03. Flow: RAG, herramientas y contexto persistente como vectores de entrada</figcaption>
</figure>
<figure class="li-slide" id="slide-4">
  <img src="/assets/linkedin/posts/modelos-razonadores-cap5-post-2-ataques-agentes/slide-04.jpg" alt="Slide 4 de Ataques a agentes: la superficie que crece con la capacidad: Beat: la seguridad empieza en lo que entra al contexto" loading="lazy">
  <figcaption>04. Beat: la seguridad empieza en lo que entra al contexto</figcaption>
</figure>
<figure class="li-slide" id="slide-5">
  <img src="/assets/linkedin/posts/modelos-razonadores-cap5-post-2-ataques-agentes/slide-05.jpg" alt="Slide 5 de Ataques a agentes: la superficie que crece con la capacidad: CTA: artículo completo" loading="lazy">
  <figcaption>05. CTA: artículo completo</figcaption>
</figure>
    </div>
    <nav class="li-slide-dots" aria-label="Navegación de slides">
      <a href="#slide-1" class="li-slide-dot" aria-label="Ir a slide 1">1</a><a href="#slide-2" class="li-slide-dot" aria-label="Ir a slide 2">2</a><a href="#slide-3" class="li-slide-dot" aria-label="Ir a slide 3">3</a><a href="#slide-4" class="li-slide-dot" aria-label="Ir a slide 4">4</a><a href="#slide-5" class="li-slide-dot" aria-label="Ir a slide 5">5</a>
    </nav>
  </section>

  <section class="li-caption-panel"><p>Darle herramientas a un modelo no aumenta solo lo que puede hacer. También aumenta la cantidad de sitios por los que puede entrar información dañina.</p>
<p>TabooRAG lo muestra bien. Un documento malicioso en la base de conocimiento puede hacer que el sistema rechace consultas legítimas cuando recupera ese contenido (<a href="https://arxiv.org/abs/2603.03919">https://arxiv.org/abs/2603.03919</a>).</p>
<p>La capacidad actual vuelve más importante ese control. Claude Sonnet 5 puede planificar, usar navegadores y terminales y ejecutar tareas de forma autónoma (<a href="https://www.anthropic.com/news/claude-sonnet-5">https://www.anthropic.com/news/claude-sonnet-5</a>). Cuando el modelo puede hacer más cosas, también hay más herramientas, resultados y estados persistentes que deben tratarse como entradas no confiables.</p>
<p>Un único documento malicioso en la base de conocimiento puede bastar para que el modelo rechace durante toda la sesión consultas legítimas sobre ese tema. El ataque no rompe la seguridad del modelo desde fuera, sino que aprovecha sus propias reglas de recuperación. En ese momento, el mismo “conocimiento” que debía ayudarle le cambia las instrucciones. Es una denegación de servicio construida con la seguridad del propio modelo.</p>
<p>En un chat simple, casi todo pasa por el prompt del usuario. En un agente con RAG (recuperación aumentada con documentos), herramientas y memoria persistente, también entran documentos recuperados, respuestas de interfaces externas (APIs) e historial de ejecución. Parte de lo que el sistema razona puede venir contaminado desde fuera si entra sin filtros.</p>
<p>La defensa de todas estas capas no puede empezar al final, cuando ya va a responder. Tiene que empezar en la entrada: qué fuentes pueden entrar al contexto, con qué permisos y bajo qué validaciones. Desconfiar de lo recuperado/indexado automáticamente debería ser la norma.</p>
<p>En el artículo explico por qué pasar de chat a agente cambia el modelo de amenaza completo y qué implica eso para sistemas con RAG y memoria (<a href="https://5sigmas.com/series/modelos-razonadores/05-riesgos/">https://5sigmas.com/series/modelos-razonadores/05-riesgos/</a>).</p>
<p class="li-caption-tags">#InteligenciaArtificial #AIAlignment #AgenticAI #CiberseguridadIA</p>
    <p><a class="md-button md-button--primary" href="/series/modelos-razonadores/05-riesgos/">Leer artículo de contexto</a></p>
  </section>
</div>

<nav class="li-post-pager">
  <a href="../modelos-razonadores-cap5-post-1-overthinking/">Post anterior</a>
  <a href="../">Píldoras 5sigmas</a>
  <a href="../ia-pib-bienestar-energia-cap1-post-1-canales-bienestar/">Post siguiente</a>
</nav>
