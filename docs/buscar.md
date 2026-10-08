---
title: "Buscador semántico de 5sigmas"
description: "Busca artículos, explicaciones, animaciones e instantes de vídeo con EmbeddingGemma 2 en tu dispositivo. Genera respuestas opcionalmente con un LLM local en WebGPU y consulta sus fuentes."
---

# Pregunta a 5sigmas

Busca directamente en las explicaciones técnicas, artículos, conceptos, animaciones y vídeos publicados en 5sigmas. **EmbeddingGemma 2** calcula la similitud semántica en tu dispositivo, sin enviar tu pregunta a un servidor de inferencia. Los resultados siempre enlazan a sus fuentes originales.

<section id="s5-semantic-search" data-lang="es" class="s5-search" aria-label="Buscador semántico de 5sigmas">
  <form class="s5-search-form" role="search" aria-label="Buscar conocimiento publicado">
    <label for="s5-search-question" data-role="question-label">Tu pregunta</label>
    <div class="s5-search-controls">
      <input type="search" id="s5-search-question" name="q" autocomplete="off" minlength="3" maxlength="400" required placeholder="¿Qué diferencia hay entre prefill y decode?">
      <button type="submit" data-action="search" disabled>Buscar fuentes</button>
    </div>
    <div role="status" aria-live="polite" data-role="status">Preparando el índice de fuentes…</div>
    <p data-role="mode"></p>
  </form>

  <section class="s5-search-results" aria-label="Fuentes identificadas">
    <h2 data-role="results-title">Fuentes relacionadas</h2>
    <div data-role="results" aria-live="polite"></div>
  </section>

  <section class="s5-search-answer" aria-label="Respuesta generativa opcional">
    <h2>Respuesta con referencias</h2>
    <p class="s5-search-notice">La respuesta es opcional. Al pulsar «Generar» se descarga un modelo abierto de unos cientos de MB y se ejecuta mediante WebGPU cuando tu navegador y GPU son compatibles. La primera carga puede consumir memoria y tardar. No es un servicio de OpenAI ni una API remota.</p>
    <p><button type="button" data-action="generate" disabled>Generar respuesta local (WebGPU)</button></p>
    <div data-role="answer-text" aria-live="polite">Primero busca fuentes verificables.</div>
  </section>
</section>

<noscript>Activa JavaScript para utilizar el buscador semántico local. Puedes seguir navegando por las <a href="/series/">series</a> y los <a href="/articulos-tecnicos/">artículos</a>.</noscript>

<script type="module" src="/assets/javascripts/semantic-search.js"></script>

## Qué hace y qué no hace

El buscador utiliza **EmbeddingGemma 2 textual de 270M parámetros** para codificar tu consulta en el navegador. Mientras se construye el índice multimodal offline de 740M, recupera contenido a partir del grafo público de conocimiento de 5sigmas, selecciona candidatos y los reordena semánticamente en el dispositivo. Cuando esté disponible el índice binario multimodal validado, lo utilizará en lugar de la preselección por metadatos.

La generación opcional se basa en **Qwen3 0.6B**, ejecutado con WebGPU. Solo recibe los fragmentos de las fuentes recuperadas y debe citar su procedencia. **Una respuesta generada puede contener errores** y el orden de similitud no demuestra que una afirmación sea cierta. Comprueba los artículos y vídeos enlazados.

Los archivos del modelo y el runtime se descargan inicialmente de Hugging Face y jsDelivr. Según la documentación de MediaPipe, el contenido procesado permanece en el dispositivo, pero MediaPipe puede enviar métricas de utilización. No introduzcas datos confidenciales. El índice documental de 5sigmas es público.

Fuentes: [Google EmbeddingGemma 2](https://ai.google.dev/gemma/docs/embeddinggemma/model_card_2), [MediaPipe Universal Embedder](https://developers.google.com/edge/mediapipe/solutions/retrieval/universal_embedder/web_js), [Qwen3 0.6B WebGPU](https://huggingface.co/onnx-community/Qwen3-0.6B-ONNX).
