---
title: Encoders, conectores y acceso dinámico: dos filosofías de integración
description: Píldora 5sigmas completa con texto y slides inline.
hide:
  - toc
  - footer
---

<a class="li-back" href="../">Volver a Píldoras 5sigmas</a>

# Encoders, conectores y acceso dinámico: dos filosofías de integración

<div class="li-detail-meta" style="--series-accent:#4E9CD6">
  <span>Multimodalidad en IA generativa</span>
  <span>Cap. 3</span>
  <span>Post 1</span>
  <span>7 slides</span>
</div>

<div class="li-detail-layout">
  <section class="li-deck" data-li-deck>
    <div class="li-deck__bar">
      <button class="li-deck__button" type="button" data-li-prev aria-label="Slide anterior">‹</button>
      <div class="li-deck__status"><span data-li-current>1</span> / 7</div>
      <button class="li-deck__button" type="button" data-li-next aria-label="Slide siguiente">›</button>
    </div>
    <div class="li-deck__track" data-li-track>
<figure class="li-slide" id="slide-1">
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap3-post-1-encoder-conector-llm/slide-01.jpg" alt="Slide 1 de Encoders, conectores y acceso dinámico: dos filosofías de integración: Hook: &quot;Encoder aquí. LLM allá. El medio decide cuánto pasa — y cuándo. Proyección o cross-attention: dos filosofías de integración.&quot;" loading="lazy">
  <figcaption>01. Hook: &quot;Encoder aquí. LLM allá. El medio decide cuánto pasa — y cuándo. Proyección o cross-attention: dos filosofías de integración.&quot;</figcaption>
</figure>
<figure class="li-slide" id="slide-2">
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap3-post-1-encoder-conector-llm/slide-02.jpg" alt="Slide 2 de Encoders, conectores y acceso dinámico: dos filosofías de integración: Chain flow: Modalidad de entrada → Encoder → Conector → LLM (ViT, Whisper, etc.)" loading="lazy">
  <figcaption>02. Chain flow: Modalidad de entrada → Encoder → Conector → LLM (ViT, Whisper, etc.)</figcaption>
</figure>
<figure class="li-slide" id="slide-3">
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap3-post-1-encoder-conector-llm/slide-03.jpg" alt="Slide 3 de Encoders, conectores y acceso dinámico: dos filosofías de integración: Bifold: Q-Former (BLIP-2) vs proyección lineal (LLaVA/InternVL)" loading="lazy">
  <figcaption>03. Bifold: Q-Former (BLIP-2) vs proyección lineal (LLaVA/InternVL)</figcaption>
</figure>
<figure class="li-slide" id="slide-4">
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap3-post-1-encoder-conector-llm/slide-04.jpg" alt="Slide 4 de Encoders, conectores y acceso dinámico: dos filosofías de integración: Bifold: acceso estático (encoder+conector, señal fija al inicio) vs acceso dinámico (Flamingo cross-attention)" loading="lazy">
  <figcaption>04. Bifold: acceso estático (encoder+conector, señal fija al inicio) vs acceso dinámico (Flamingo cross-attention)</figcaption>
</figure>
<figure class="li-slide" id="slide-5">
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap3-post-1-encoder-conector-llm/slide-05.jpg" alt="Slide 5 de Encoders, conectores y acceso dinámico: dos filosofías de integración: Diagrama cross-attention: capas de texto intercaladas con capas de atención cruzada" loading="lazy">
  <figcaption>05. Diagrama cross-attention: capas de texto intercaladas con capas de atención cruzada</figcaption>
</figure>
<figure class="li-slide" id="slide-6">
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap3-post-1-encoder-conector-llm/slide-06.jpg" alt="Slide 6 de Encoders, conectores y acceso dinámico: dos filosofías de integración: Tabla 3×3: proyección lineal / Q-Former / cross-attention × acceso / coste / mejor para" loading="lazy">
  <figcaption>06. Tabla 3×3: proyección lineal / Q-Former / cross-attention × acceso / coste / mejor para</figcaption>
</figure>
<figure class="li-slide" id="slide-7">
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap3-post-1-encoder-conector-llm/slide-07.jpg" alt="Slide 7 de Encoders, conectores y acceso dinámico: dos filosofías de integración: CTA: &quot;El conector decide cuánto llega al LLM. El mecanismo de acceso decide cuándo.&quot;" loading="lazy">
  <figcaption>07. CTA: &quot;El conector decide cuánto llega al LLM. El mecanismo de acceso decide cuándo.&quot;</figcaption>
</figure>
    </div>
    <nav class="li-slide-dots" aria-label="Navegación de slides">
      <a href="#slide-1" class="li-slide-dot" aria-label="Ir a slide 1">1</a><a href="#slide-2" class="li-slide-dot" aria-label="Ir a slide 2">2</a><a href="#slide-3" class="li-slide-dot" aria-label="Ir a slide 3">3</a><a href="#slide-4" class="li-slide-dot" aria-label="Ir a slide 4">4</a><a href="#slide-5" class="li-slide-dot" aria-label="Ir a slide 5">5</a><a href="#slide-6" class="li-slide-dot" aria-label="Ir a slide 6">6</a><a href="#slide-7" class="li-slide-dot" aria-label="Ir a slide 7">7</a>
    </nav>
  </section>

  <section class="li-caption-panel"><p>Muchos fallos multimodales nacen antes de que el modelo empiece a responder. Si no razona sobre la imagen sino sobre un resumen demasiado agresivo de la imagen, el error ya viene incorporado desde la entrada.</p>
<p>Ahí es donde se ve por qué importa tanto el conector entre la entrada multimodal y el LLM. Hay sistemas que comprimen la información visual en 32 tokens y otros que la reducen a 64 tokens fijos. Muchos modelos multimodales no llevan la imagen al núcleo del lenguaje, sino una versión resumida de ella. A veces basta, pero otras veces el razonamiento nace mutilado porque solo recibe lo que el conector decidió conservar.</p>
<p>Ahí se separan dos filosofías. Una proyección lineal como la de LLaVA conserva más secuencia y abarata integración. Un selector como Q-Former recorta lo que pasa. Y un acceso dinámico como el de Flamingo deja reabrir la señal durante el razonamiento.</p>
<p>Ninguna elección es neutra: cambias coste, latencia y fidelidad a la vez.</p>
<p>En el artículo comparo esas filosofías y el coste de cada mecanismo de acceso (<a href="https://5sigmas.com/series/multimodalidad-iag/03-arquitecturas/">https://5sigmas.com/series/multimodalidad-iag/03-arquitecturas/</a>).</p>
<p class="li-caption-tags">#InteligenciaArtificial #MachineLearning #MultimodalAI #LLM</p>
    <p><a class="md-button md-button--primary" href="/series/multimodalidad-iag/03-arquitecturas/">Leer artículo de contexto</a></p>
  </section>
</div>

<nav class="li-post-pager">
  <a href="../multimodalidad-iag-cap2-post-2-imagebind-transitividad/">Post anterior</a>
  <a href="../">Píldoras 5sigmas</a>
  <a href="../multimodalidad-iag-cap3-post-3-tokenizacion-nativa/">Post siguiente</a>
</nav>
