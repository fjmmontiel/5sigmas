---
title: Prompt injection multimodal: la instrucción que los filtros no ven
description: Píldora 5sigmas completa con texto y slides inline.
hide:
  - toc
  - footer
---

<a class="li-back" href="../">Volver a Píldoras 5sigmas</a>

# Prompt injection multimodal: la instrucción que los filtros no ven

<div class="li-detail-meta" style="--series-accent:#4E9CD6">
  <span>Multimodalidad en IA generativa</span>
  <span>Cap. 5</span>
  <span>Post 1</span>
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
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap5-post-1-prompt-injection/slide-01.jpg" alt="Slide 1 de Prompt injection multimodal: la instrucción que los filtros no ven: Hook: &quot;Los guardrails de texto no ven lo que viene por otras modalidades. Cada canal nuevo abre vectores de ataque que los filtros existentes ignoran.&quot;" loading="lazy">
  <figcaption>01. Hook: &quot;Los guardrails de texto no ven lo que viene por otras modalidades. Cada canal nuevo abre vectores de ataque que los filtros existentes ignoran.&quot;</figcaption>
</figure>
<figure class="li-slide" id="slide-2">
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap5-post-1-prompt-injection/slide-02.jpg" alt="Slide 2 de Prompt injection multimodal: la instrucción que los filtros no ven: Bifold: flujo normal vs flujo adversarial. Filtros ven OCR ≠ modelo recibe imagen completa." loading="lazy">
  <figcaption>02. Bifold: flujo normal vs flujo adversarial. Filtros ven OCR ≠ modelo recibe imagen completa.</figcaption>
</figure>
<figure class="li-slide" id="slide-3">
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap5-post-1-prompt-injection/slide-03.jpg" alt="Slide 3 de Prompt injection multimodal: la instrucción que los filtros no ven: 3 tarjetas: bajo contraste / texto rotado / en patrón visual. OCR no detecta, modelo extrae." loading="lazy">
  <figcaption>03. 3 tarjetas: bajo contraste / texto rotado / en patrón visual. OCR no detecta, modelo extrae.</figcaption>
</figure>
<figure class="li-slide" id="slide-4">
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap5-post-1-prompt-injection/slide-04.jpg" alt="Slide 4 de Prompt injection multimodal: la instrucción que los filtros no ven: WhisperInject: bifold humano oye vs modelo transcribe (perturbación δ 0.002, &gt;86% éxito)." loading="lazy">
  <figcaption>04. WhisperInject: bifold humano oye vs modelo transcribe (perturbación δ 0.002, &gt;86% éxito).</figcaption>
</figure>
<figure class="li-slide" id="slide-5">
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap5-post-1-prompt-injection/slide-05.jpg" alt="Slide 5 de Prompt injection multimodal: la instrucción que los filtros no ven: Bullet-arrows: dónde el riesgo es más alto (documentos, asistentes de voz, reuniones)." loading="lazy">
  <figcaption>05. Bullet-arrows: dónde el riesgo es más alto (documentos, asistentes de voz, reuniones).</figcaption>
</figure>
<figure class="li-slide" id="slide-6">
  <img src="/assets/linkedin/posts/multimodalidad-iag-cap5-post-1-prompt-injection/slide-06.jpg" alt="Slide 6 de Prompt injection multimodal: la instrucción que los filtros no ven: CTA: &quot;La instrucción que los filtros no ven.&quot; · 5sigmas.com →" loading="lazy">
  <figcaption>06. CTA: &quot;La instrucción que los filtros no ven.&quot; · 5sigmas.com →</figcaption>
</figure>
    </div>
    <nav class="li-slide-dots" aria-label="Navegación de slides">
      <a href="#slide-1" class="li-slide-dot" aria-label="Ir a slide 1">1</a><a href="#slide-2" class="li-slide-dot" aria-label="Ir a slide 2">2</a><a href="#slide-3" class="li-slide-dot" aria-label="Ir a slide 3">3</a><a href="#slide-4" class="li-slide-dot" aria-label="Ir a slide 4">4</a><a href="#slide-5" class="li-slide-dot" aria-label="Ir a slide 5">5</a><a href="#slide-6" class="li-slide-dot" aria-label="Ir a slide 6">6</a>
    </nav>
  </section>

  <section class="li-caption-panel"><p>Los guardarraíles pensados para texto dejan agujeros enormes en cuanto la instrucción maliciosa entra por audio, imagen o documento. Ahí aparece el problema nuevo que abre la multimodalidad.</p>
<p>WhisperInject lo vuelve tangible: superó el 86% de éxito contra varios modelos que oyen y responden usando perturbaciones que suenan benignas para un humano. La instrucción maliciosa ya no tiene por qué entrar escrita en el chat. Puede viajar dentro de un audio aparentemente inocuo, de una imagen con texto camuflado o de un PDF cuyo layout despista al filtro pero no al modelo.</p>
<p>Ahí la defensa basada solo en texto plano deja de cubrir el problema real. Un sistema clásico de reconocimiento de texto puede no ver bajo contraste, rotaciones raras o texto escondido en patrones visuales mientras el sistema multimodal sí lo reconstruye. En audio pasa algo parecido: lo que el oído humano juzga normal no coincide siempre con lo que el modelo acaba interpretando.</p>
<p>La superficie de ataque no crece porque haya más formatos. Crece porque cada modalidad añade una forma nueva de esconder instrucciones dentro de la percepción.</p>
<p>En el artículo sigo ese vector desde OCR y audio hasta prompt injection multimodal real (<a href="https://5sigmas.com/series/multimodalidad-iag/05-riesgos/">https://5sigmas.com/series/multimodalidad-iag/05-riesgos/</a>).</p>
<p class="li-caption-tags">#InteligenciaArtificial #AISecurity #MachineLearning #LLM</p>
    <p><a class="md-button md-button--primary" href="/series/multimodalidad-iag/05-riesgos/">Leer artículo de contexto</a></p>
  </section>
</div>

<nav class="li-post-pager">
  <a href="../multimodalidad-iag-cap4-post-3-dominios-dificiles/">Post anterior</a>
  <a href="../">Píldoras 5sigmas</a>
  <a href="../multimodalidad-iag-cap5-post-2-herramientas-rag/">Post siguiente</a>
</nav>
