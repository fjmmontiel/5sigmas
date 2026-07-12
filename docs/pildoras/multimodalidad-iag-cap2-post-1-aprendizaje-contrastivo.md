---
title: Aprendizaje contrastivo: cómo un modelo aprende que dos señales distintas hablan de lo mismo
description: Píldora 5sigmas completa con texto y slides inline.
hide:
  - toc
  - footer
---

<a class="li-back" href="../">Volver a Píldoras 5sigmas</a>

# Aprendizaje contrastivo: cómo un modelo aprende que dos señales distintas hablan de lo mismo

<div class="li-detail-meta" style="--series-accent:#4E9CD6">
  <span>Multimodalidad en IA generativa</span>
  <span>Cap. 2</span>
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
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap2-post-1-aprendizaje-contrastivo/slide-01.jpg" alt="Slide 1 de Aprendizaje contrastivo: cómo un modelo aprende que dos señales distintas hablan de lo mismo: Hook: CLIP aprende sin programación explícita" loading="lazy">
  <figcaption>01. Hook: CLIP aprende sin programación explícita</figcaption>
</figure>
<figure class="li-slide" id="slide-2">
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap2-post-1-aprendizaje-contrastivo/slide-02.jpg" alt="Slide 2 de Aprendizaje contrastivo: cómo un modelo aprende que dos señales distintas hablan de lo mismo: Chain flow: Par → Función contrastiva → Espacio compartido" loading="lazy">
  <figcaption>02. Chain flow: Par → Función contrastiva → Espacio compartido</figcaption>
</figure>
<figure class="li-slide" id="slide-3">
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap2-post-1-aprendizaje-contrastivo/slide-03.jpg" alt="Slide 3 de Aprendizaje contrastivo: cómo un modelo aprende que dos señales distintas hablan de lo mismo: 3 tarjetas: Ruido de pares / Distribución sesgada / Consecuencia" loading="lazy">
  <figcaption>03. 3 tarjetas: Ruido de pares / Distribución sesgada / Consecuencia</figcaption>
</figure>
<figure class="li-slide" id="slide-4">
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap2-post-1-aprendizaje-contrastivo/slide-04.jpg" alt="Slide 4 de Aprendizaje contrastivo: cómo un modelo aprende que dos señales distintas hablan de lo mismo: Comparison: SigLIP vs DINOv2" loading="lazy">
  <figcaption>04. Comparison: SigLIP vs DINOv2</figcaption>
</figure>
<figure class="li-slide" id="slide-5">
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap2-post-1-aprendizaje-contrastivo/slide-05.jpg" alt="Slide 5 de Aprendizaje contrastivo: cómo un modelo aprende que dos señales distintas hablan de lo mismo: CTA: el bottleneck estaba en el encoder visual" loading="lazy">
  <figcaption>05. CTA: el bottleneck estaba en el encoder visual</figcaption>
</figure>
    </div>
    <nav class="li-slide-dots" aria-label="Navegación de slides">
      <a href="#slide-1" class="li-slide-dot" aria-label="Ir a slide 1">1</a><a href="#slide-2" class="li-slide-dot" aria-label="Ir a slide 2">2</a><a href="#slide-3" class="li-slide-dot" aria-label="Ir a slide 3">3</a><a href="#slide-4" class="li-slide-dot" aria-label="Ir a slide 4">4</a><a href="#slide-5" class="li-slide-dot" aria-label="Ir a slide 5">5</a>
    </nav>
  </section>

  <section class="li-caption-panel"><p>La visión por computador tenía un cuello de botella muy claro: cada mejora seria pedía más etiquetas manuales, más clases a definir y más trabajo humano por dataset.</p>
<p>En 2021 aparece una salida creíble a esa fricción. Un sistema entrenado con pares de imagen y texto igualó en zero-shot la precisión del ResNet50 original en ImageNet, 76,2%, sin usar ni una sola de las 1,28 millones de imágenes etiquetadas con las que ese modelo se había entrenado. El número importaba, pero el giro de fondo estaba en el cambio de supervisión.</p>
<p>La decisión técnica clave fue no pedirle que generara captions completos. Solo tenía que acercar pares correctos y alejar pares incorrectos en un espacio compartido. OpenAI mostró que ese objetivo contrastivo era entre 4 y 10 veces más eficiente que obligar al modelo a describir la imagen palabra por palabra.</p>
<p>Ahí empieza la multimodalidad útil. Cuando cualquier concepto visual puede referenciarse con lenguaje natural, dejas de reentrenar un sistema desde cero para cada tarea y empiezas a reutilizar representación a escala.</p>
<p>En el artículo sigo esa jugada desde CLIP hasta la expansión posterior del alineamiento multimodal (<a href="https://5sigmas.com/series/multimodalidad-iag/02-alineamiento/">https://5sigmas.com/series/multimodalidad-iag/02-alineamiento/</a>).</p>
<p class="li-caption-tags">#InteligenciaArtificial #MachineLearning #ComputerVision #LLM</p>
    <p><a class="md-button md-button--primary" href="/series/multimodalidad-iag/02-alineamiento/">Leer artículo de contexto</a></p>
  </section>
</div>

<nav class="li-post-pager">
  <a href="../multimodalidad-iag-cap1-post-3-espacio-compartido/">Post anterior</a>
  <a href="../">Píldoras 5sigmas</a>
  <a href="../multimodalidad-iag-cap2-post-2-imagebind-transitividad/">Post siguiente</a>
</nav>
