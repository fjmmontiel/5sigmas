---
title: El Transformer dejó atrás la lectura en fila
description: Píldora 5sigmas completa con texto y slides inline.
hide:
  - toc
  - footer
---

<a class="li-back" href="../">Volver a Píldoras 5sigmas</a>

# El Transformer dejó atrás la lectura en fila

<div class="li-detail-meta" style="--series-accent:#26A69A">
  <span>Fundamentos de IA e IA generativa</span>
  <span>Cap. 2</span>
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
  <img src="/assets/linkedin/posts/fundamentos-ia-iag-cap2-post-2-transformer/slide-01.jpg" alt="Slide 1 de El Transformer dejó atrás la lectura en fila: Hook: &quot;Antes del Transformer, el texto se procesaba en fila. La atención cambió el cuello de botella.&quot;" loading="lazy">
  <figcaption>01. Hook: &quot;Antes del Transformer, el texto se procesaba en fila. La atención cambió el cuello de botella.&quot;</figcaption>
</figure>
<figure class="li-slide" id="slide-2">
  <img src="/assets/linkedin/posts/fundamentos-ia-iag-cap2-post-2-transformer/slide-02.jpg" alt="Slide 2 de El Transformer dejó atrás la lectura en fila: Contraste: Secuencia token a token vs Contexto relacionado en paralelo" loading="lazy">
  <figcaption>02. Contraste: Secuencia token a token vs Contexto relacionado en paralelo</figcaption>
</figure>
<figure class="li-slide" id="slide-3">
  <img src="/assets/linkedin/posts/fundamentos-ia-iag-cap2-post-2-transformer/slide-03.jpg" alt="Slide 3 de El Transformer dejó atrás la lectura en fila: Flujo: Token → Contexto → Relevancia → Representación" loading="lazy">
  <figcaption>03. Flujo: Token → Contexto → Relevancia → Representación</figcaption>
</figure>
<figure class="li-slide" id="slide-4">
  <img src="/assets/linkedin/posts/fundamentos-ia-iag-cap2-post-2-transformer/slide-04.jpg" alt="Slide 4 de El Transformer dejó atrás la lectura en fila: banco: La atención conecta palabras del contexto para distinguir mueble de entidad financiera." loading="lazy">
  <figcaption>04. banco: La atención conecta palabras del contexto para distinguir mueble de entidad financiera.</figcaption>
</figure>
<figure class="li-slide" id="slide-5">
  <img src="/assets/linkedin/posts/fundamentos-ia-iag-cap2-post-2-transformer/slide-05.jpg" alt="Slide 5 de El Transformer dejó atrás la lectura en fila: CTA: El salto no fue solo generar texto." loading="lazy">
  <figcaption>05. CTA: El salto no fue solo generar texto.</figcaption>
</figure>
    </div>
    <nav class="li-slide-dots" aria-label="Navegación de slides">
      <a href="#slide-1" class="li-slide-dot" aria-label="Ir a slide 1">1</a><a href="#slide-2" class="li-slide-dot" aria-label="Ir a slide 2">2</a><a href="#slide-3" class="li-slide-dot" aria-label="Ir a slide 3">3</a><a href="#slide-4" class="li-slide-dot" aria-label="Ir a slide 4">4</a><a href="#slide-5" class="li-slide-dot" aria-label="Ir a slide 5">5</a>
    </nav>
  </section>

  <section class="li-caption-panel"><p>El Transformer no se volvió central porque sonara futurista. Se volvió central porque resolvió dos límites prácticos: procesar secuencias largas y entrenar a gran escala.</p>
<p>Antes, muchos modelos leían texto en orden, token a token. Eso dificultaba paralelizar el entrenamiento y hacía más frágil mantener información del inicio cuando la secuencia se alargaba. La atención cambió esa dinámica: cada token puede mirar al resto del contexto y ponderar qué partes importan.</p>
<p>En &quot;el banco donde me senté estaba mojado&quot;, la arquitectura no necesita una regla escrita a mano para elegir el significado de banco. Usa el contexto. &quot;Senté&quot; y &quot;mojado&quot; pesan más que una interpretación financiera.</p>
<p>Ese mecanismo convirtió una idea de procesamiento de lenguaje en una arquitectura general para texto, imagen, audio, vídeo y código.</p>
<p>Lo desarrollo aquí (<a href="https://5sigmas.com/series/fundamentos-ia-iag/02-que-es-ia-generativa/">https://5sigmas.com/series/fundamentos-ia-iag/02-que-es-ia-generativa/</a>).</p>
<p class="li-caption-tags">#InteligenciaArtificial #Transformer #LLM #DeepLearning #GenAI</p>
    <p><a class="md-button md-button--primary" href="/series/fundamentos-ia-iag/02-que-es-ia-generativa/">Leer artículo de contexto</a></p>
  </section>
</div>

<nav class="li-post-pager">
  <a href="../fundamentos-ia-iag-cap2-post-1-embeddings/">Post anterior</a>
  <a href="../">Píldoras 5sigmas</a>
  <a href="../fundamentos-ia-iag-cap2-post-3-leyes-escala/">Post siguiente</a>
</nav>
