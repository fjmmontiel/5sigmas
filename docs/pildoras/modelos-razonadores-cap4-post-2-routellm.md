---
title: Enrutar bien el coste: el cómputo justo para cada consulta
description: Píldora 5sigmas completa con texto y slides inline.
hide:
  - toc
  - footer
---

<a class="li-back" href="../">Volver a Píldoras 5sigmas</a>

# Enrutar bien el coste: el cómputo justo para cada consulta

<div class="li-detail-meta" style="--series-accent:#C27A00">
  <span>Modelos razonadores</span>
  <span>Cap. 4</span>
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
  <img src="/assets/linkedin/posts/modelos-razonadores-cap4-post-2-routellm/slide-01.jpg" alt="Slide 1 de Enrutar bien el coste: el cómputo justo para cada consulta: Hook: no todas las consultas merecen el mismo modelo" loading="lazy">
  <figcaption>01. Hook: no todas las consultas merecen el mismo modelo</figcaption>
</figure>
<figure class="li-slide" id="slide-2">
  <img src="/assets/linkedin/posts/modelos-razonadores-cap4-post-2-routellm/slide-02.jpg" alt="Slide 2 de Enrutar bien el coste: el cómputo justo para cada consulta: Metric: tres niveles de capacidad y esfuerzo ajustable" loading="lazy">
  <figcaption>02. Metric: tres niveles de capacidad y esfuerzo ajustable</figcaption>
</figure>
<figure class="li-slide" id="slide-3">
  <img src="/assets/linkedin/posts/modelos-razonadores-cap4-post-2-routellm/slide-03.jpg" alt="Slide 3 de Enrutar bien el coste: el cómputo justo para cada consulta: Flow: consulta → clasificador → modelo apropiado" loading="lazy">
  <figcaption>03. Flow: consulta → clasificador → modelo apropiado</figcaption>
</figure>
<figure class="li-slide" id="slide-4">
  <img src="/assets/linkedin/posts/modelos-razonadores-cap4-post-2-routellm/slide-04.jpg" alt="Slide 4 de Enrutar bien el coste: el cómputo justo para cada consulta: Flow: dónde funciona y qué pasa cuando el router falla" loading="lazy">
  <figcaption>04. Flow: dónde funciona y qué pasa cuando el router falla</figcaption>
</figure>
<figure class="li-slide" id="slide-5">
  <img src="/assets/linkedin/posts/modelos-razonadores-cap4-post-2-routellm/slide-05.jpg" alt="Slide 5 de Enrutar bien el coste: el cómputo justo para cada consulta: CTA: artículo completo" loading="lazy">
  <figcaption>05. CTA: artículo completo</figcaption>
</figure>
    </div>
    <nav class="li-slide-dots" aria-label="Navegación de slides">
      <a href="#slide-1" class="li-slide-dot" aria-label="Ir a slide 1">1</a><a href="#slide-2" class="li-slide-dot" aria-label="Ir a slide 2">2</a><a href="#slide-3" class="li-slide-dot" aria-label="Ir a slide 3">3</a><a href="#slide-4" class="li-slide-dot" aria-label="Ir a slide 4">4</a><a href="#slide-5" class="li-slide-dot" aria-label="Ir a slide 5">5</a>
    </nav>
  </section>

  <section class="li-caption-panel"><p>El coste de un modelo razonador en tokens se vuelve grave cuando lo metes en un producto y descubres que tratar todas las consultas con el grado máximo de razonamiento se come tu presupuesto anual en un mes de proyecto.</p>
<p>Un sistema de enrutado de consultas estima la dificultad de cada tarea antes de gastar el presupuesto grande. RouteLLM convirtió esa intuición en un clasificador que decide cuándo basta un modelo ligero y cuándo merece la pena activar uno más capaz (<a href="https://arxiv.org/abs/2406.18665">https://arxiv.org/abs/2406.18665</a>).</p>
<p>El cambio no estaba en inventar un modelo nuevo, sino en decidir mejor cuándo basta uno barato y cuándo merece la pena pagar por el caro.</p>
<p>La parte delicada está justo en el enrutamiento. Si enrutas mal, ahorras en coste pero pagas en calidad porque mandas una tarea compleja al modelo equivocado.</p>
<p>La versión actual del problema se ve en GPT-5.6. OpenAI ofrece tres niveles de capacidad, Sol, Terra y Luna, junto con varios niveles de esfuerzo (<a href="https://developers.openai.com/api/docs/models/gpt-5.6-sol">https://developers.openai.com/api/docs/models/gpt-5.6-sol</a>). El sistema ya no tiene que escoger únicamente entre un modelo barato y uno caro. También puede decidir cuánto razonamiento necesita cada consulta.</p>
<p>Claude Sonnet 5 y Gemini 3.5 Flash siguen la misma dirección. Ambos exponen controles para mover el equilibrio entre calidad, coste y latencia (<a href="https://www.anthropic.com/news/claude-sonnet-5">https://www.anthropic.com/news/claude-sonnet-5</a>) (<a href="https://deepmind.google/models/model-cards/gemini-3-5-flash/">https://deepmind.google/models/model-cards/gemini-3-5-flash/</a>). El router pasa a decidir dos cosas a la vez: qué modelo conviene y cuánto debe pensar.</p>
<p>Ahí está la parte que suele desaparecer en los diagramas. Un router mal calibrado puede mandar una consulta sencilla al modelo más caro, pero también puede cortar demasiado pronto una tarea que necesitaba más capacidad. El ahorro solo existe si la decisión conserva la calidad que el producto promete.</p>
<p>En el artículo explico cómo ese patrón mezcla optimización, UX y diseño económico de sistemas razonadores (<a href="https://5sigmas.com/series/modelos-razonadores/04-latencia-streaming/">https://5sigmas.com/series/modelos-razonadores/04-latencia-streaming/</a>).</p>
<p class="li-caption-tags">#InteligenciaArtificial #LLM #MLEngineering #AIResearch</p>
    <p><a class="md-button md-button--primary" href="/series/modelos-razonadores/04-latencia-streaming/">Leer artículo de contexto</a></p>
  </section>
</div>

<nav class="li-post-pager">
  <a href="../modelos-razonadores-cap4-post-1-suelo-fisico/">Post anterior</a>
  <a href="../">Píldoras 5sigmas</a>
  <a href="../modelos-razonadores-cap5-post-1-overthinking/">Post siguiente</a>
</nav>
