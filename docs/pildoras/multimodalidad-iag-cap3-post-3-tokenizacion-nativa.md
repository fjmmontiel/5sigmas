---
title: Tokenización nativa: imagen como secuencia de tokens
description: Píldora 5sigmas completa con texto y slides inline.
hide:
  - toc
  - footer
---

<a class="li-back" href="../">Volver a Píldoras 5sigmas</a>

# Tokenización nativa: imagen como secuencia de tokens

<div class="li-detail-meta" style="--series-accent:#4E9CD6">
  <span>Multimodalidad en IA generativa</span>
  <span>Cap. 3</span>
  <span>Post 3</span>
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
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap3-post-3-tokenizacion-nativa/slide-01.jpg" alt="Slide 1 de Tokenización nativa: imagen como secuencia de tokens: Hook: la barrera que separa imagen y texto desaparece cuando ambos son tokens" loading="lazy">
  <figcaption>01. Hook: la barrera que separa imagen y texto desaparece cuando ambos son tokens</figcaption>
</figure>
<figure class="li-slide" id="slide-2">
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap3-post-3-tokenizacion-nativa/slide-02.jpg" alt="Slide 2 de Tokenización nativa: imagen como secuencia de tokens: 3 tarjetas: el problema de la heterogeneidad de modalidades" loading="lazy">
  <figcaption>02. 3 tarjetas: el problema de la heterogeneidad de modalidades</figcaption>
</figure>
<figure class="li-slide" id="slide-3">
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap3-post-3-tokenizacion-nativa/slide-03.jpg" alt="Slide 3 de Tokenización nativa: imagen como secuencia de tokens: Chain flow: imagen → encoder → codebook → tokens discretos" loading="lazy">
  <figcaption>03. Chain flow: imagen → encoder → codebook → tokens discretos</figcaption>
</figure>
<figure class="li-slide" id="slide-4">
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap3-post-3-tokenizacion-nativa/slide-04.jpg" alt="Slide 4 de Tokenización nativa: imagen como secuencia de tokens: Grid 2×2: 4 expertos (2 activos, 2 inactivos) + stats row" loading="lazy">
  <figcaption>04. Grid 2×2: 4 expertos (2 activos, 2 inactivos) + stats row</figcaption>
</figure>
<figure class="li-slide" id="slide-5">
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap3-post-3-tokenizacion-nativa/slide-05.jpg" alt="Slide 5 de Tokenización nativa: imagen como secuencia de tokens: 3 tarjetas: preentrenamiento ∞, datos PB, solución MoE" loading="lazy">
  <figcaption>05. 3 tarjetas: preentrenamiento ∞, datos PB, solución MoE</figcaption>
</figure>
<figure class="li-slide" id="slide-6">
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap3-post-3-tokenizacion-nativa/slide-06.jpg" alt="Slide 6 de Tokenización nativa: imagen como secuencia de tokens: CTA: tokenización nativa — imagen y texto en el mismo espacio" loading="lazy">
  <figcaption>06. CTA: tokenización nativa — imagen y texto en el mismo espacio</figcaption>
</figure>
    </div>
    <nav class="li-slide-dots" aria-label="Navegación de slides">
      <a href="#slide-1" class="li-slide-dot" aria-label="Ir a slide 1">1</a><a href="#slide-2" class="li-slide-dot" aria-label="Ir a slide 2">2</a><a href="#slide-3" class="li-slide-dot" aria-label="Ir a slide 3">3</a><a href="#slide-4" class="li-slide-dot" aria-label="Ir a slide 4">4</a><a href="#slide-5" class="li-slide-dot" aria-label="Ir a slide 5">5</a><a href="#slide-6" class="li-slide-dot" aria-label="Ir a slide 6">6</a>
    </nav>
  </section>

  <section class="li-caption-panel"><p>Imagen y texto siguen viajando por circuitos demasiado distintos para que la integración salga gratis. Mientras cada señal entre por una tubería separada, siempre habrá pérdidas.</p>
<p>La tokenización nativa intenta borrar esa frontera desde la raíz, y fue impulsada desde las primeras fases de Gemini de DeepMind. Algunos modelos convierten una imagen de 512x512 en 1.024 tokens visuales sacados de un vocabulario discreto de 8.192 entradas. La promesa es que imagen y texto circulen por el mismo flujo de predicción, sin tener que traducir entre dos mundos separados.</p>
<p>El peaje aparece enseguida. El vocabulario explota, la predicción se encarece, las secuencias se alargan y el entrenamiento se vuelve inestable si texto e imagen no avanzan al mismo ritmo. Ahí aparecen problemas como el modality collapse, donde el sistema aprende antes a explotar el texto que a mirar de verdad.</p>
<p>Por eso esta vía sigue siendo la más ambiciosa y también una de las más caras del campo.</p>
<p>En el artículo detallo ese intercambio entre unificación radical y coste computacional (<a href="https://5sigmas.com/series/multimodalidad-iag/03-arquitecturas/">https://5sigmas.com/series/multimodalidad-iag/03-arquitecturas/</a>).</p>
<p class="li-caption-tags">#InteligenciaArtificial #MachineLearning #MultimodalAI #LLM</p>
    <p><a class="md-button md-button--primary" href="/series/multimodalidad-iag/03-arquitecturas/">Leer artículo de contexto</a></p>
  </section>
</div>

<nav class="li-post-pager">
  <a href="../multimodalidad-iag-cap3-post-1-encoder-conector-llm/">Post anterior</a>
  <a href="../">Píldoras 5sigmas</a>
  <a href="../multimodalidad-iag-cap3-post-4-tradeoffs/">Post siguiente</a>
</nav>
