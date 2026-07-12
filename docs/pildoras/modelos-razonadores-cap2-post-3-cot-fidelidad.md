---
title: Mostrar el razonamiento y entenderlo no son lo mismo
description: Píldora 5sigmas completa con texto y slides inline.
hide:
  - toc
  - footer
---

<a class="li-back" href="../">Volver a Píldoras 5sigmas</a>

# Mostrar el razonamiento y entenderlo no son lo mismo

<div class="li-detail-meta" style="--series-accent:#C27A00">
  <span>Modelos razonadores</span>
  <span>Cap. 2</span>
  <span>Post 3</span>
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
  <img src="/assets/linkedin/posts/modelos-razonadores-cap2-post-3-cot-fidelidad/slide-01.jpg" alt="Slide 1 de Mostrar el razonamiento y entenderlo no son lo mismo: Hook: 3 de cada 4 casos, el CoT no refleja lo que ocurre internamente" loading="lazy">
  <figcaption>01. Hook: 3 de cada 4 casos, el CoT no refleja lo que ocurre internamente</figcaption>
</figure>
<figure class="li-slide" id="slide-2">
  <img src="/assets/linkedin/posts/modelos-razonadores-cap2-post-3-cot-fidelidad/slide-02.jpg" alt="Slide 2 de Mostrar el razonamiento y entenderlo no son lo mismo: Metric: 25–39% de los casos el CoT verbaliza los factores reales" loading="lazy">
  <figcaption>02. Metric: 25–39% de los casos el CoT verbaliza los factores reales</figcaption>
</figure>
<figure class="li-slide" id="slide-3">
  <img src="/assets/linkedin/posts/modelos-razonadores-cap2-post-3-cot-fidelidad/slide-03.jpg" alt="Slide 3 de Mostrar el razonamiento y entenderlo no son lo mismo: Contrast: narrativa visible vs proceso interno" loading="lazy">
  <figcaption>03. Contrast: narrativa visible vs proceso interno</figcaption>
</figure>
<figure class="li-slide" id="slide-4">
  <img src="/assets/linkedin/posts/modelos-razonadores-cap2-post-3-cot-fidelidad/slide-04.jpg" alt="Slide 4 de Mostrar el razonamiento y entenderlo no son lo mismo: Beat: ≡ — monitorear el CoT supervisa la narrativa, no el proceso" loading="lazy">
  <figcaption>04. Beat: ≡ — monitorear el CoT supervisa la narrativa, no el proceso</figcaption>
</figure>
<figure class="li-slide" id="slide-5">
  <img src="/assets/linkedin/posts/modelos-razonadores-cap2-post-3-cot-fidelidad/slide-05.jpg" alt="Slide 5 de Mostrar el razonamiento y entenderlo no son lo mismo: CTA con link al artículo" loading="lazy">
  <figcaption>05. CTA con link al artículo</figcaption>
</figure>
    </div>
    <nav class="li-slide-dots" aria-label="Navegación de slides">
      <a href="#slide-1" class="li-slide-dot" aria-label="Ir a slide 1">1</a><a href="#slide-2" class="li-slide-dot" aria-label="Ir a slide 2">2</a><a href="#slide-3" class="li-slide-dot" aria-label="Ir a slide 3">3</a><a href="#slide-4" class="li-slide-dot" aria-label="Ir a slide 4">4</a><a href="#slide-5" class="li-slide-dot" aria-label="Ir a slide 5">5</a>
    </nav>
  </section>

  <section class="li-caption-panel"><p>Una explicación clara puede tranquilizar mucho y revelar muy poco. Ese es el límite incómodo de usar el razonamiento visible de un modelo como auditoría.</p>
<p>Anthropic midió algo bastante incómodo para toda la industria de la interpretabilidad en LLMs: en sus pruebas, modelos de frontera solo verbalizan los factores reales de decisión en una fracción minoritaria de los casos. Eso obliga a distinguir dos cosas que en muchas demos aparecen mezcladas: que la explicación sea clara y útil, y que represente fielmente el proceso que llevó al modelo hasta ahí.</p>
<p>El límite no es solo filosófico. Si usas el razonamiento paso a paso para auditar seguridad, investigar errores o justificar confianza, supervisas una narrativa. Y una narrativa puede ser elegante, detallada y útil sin ser una ventana fiable al mecanismo interno.</p>
<p>De hecho, parte del trabajo reciente apunta justo en esa dirección: cuando obligas a algunos modelos a quedarse solo con la parte legible de su razonamiento, la precisión se desploma. Es una señal bastante fuerte de que el proceso útil no coincide limpiamente con el texto que el humano puede leer.</p>
<p>En el artículo separo esa narrativa visible del mecanismo que realmente conviene auditar (<a href="https://5sigmas.com/series/modelos-razonadores/02-fallos/">https://5sigmas.com/series/modelos-razonadores/02-fallos/</a>).</p>
<p class="li-caption-tags">#InteligenciaArtificial #AIAlignment #LLM #AIResearch</p>
    <p><a class="md-button md-button--primary" href="/series/modelos-razonadores/02-fallos/">Leer artículo de contexto</a></p>
  </section>
</div>

<nav class="li-post-pager">
  <a href="../modelos-razonadores-cap2-post-2-specification-gaming/">Post anterior</a>
  <a href="../">Píldoras 5sigmas</a>
  <a href="../modelos-razonadores-cap3-post-1-segunda-escala/">Post siguiente</a>
</nav>
