---
title: "5sigmas local semantic search"
description: "Find 5sigmas articles, visuals, explanations and video moments locally using EmbeddingGemma 2. Optionally generate answers using an on-device WebGPU model with original source links."
---

# Ask 5sigmas

Search the published engineering notes, articles, concepts, animations and videos directly. **EmbeddingGemma 2** computes semantic similarities on your own device, without sending your question to a hosted inference service. Every result links to the original source.

<section id="s5-semantic-search" data-lang="en" class="s5-search" aria-label="5sigmas local semantic search">
  <form class="s5-search-form" role="search" aria-label="Search published knowledge">
    <label for="s5-search-question" data-role="question-label">Your question</label>
    <div class="s5-search-controls">
      <input type="search" id="s5-search-question" name="q" autocomplete="off" minlength="3" maxlength="400" required placeholder="How is prefill different from decode?">
      <button type="submit" data-action="search" disabled>Find sources</button>
    </div>
    <div role="status" aria-live="polite" data-role="status">Preparing the public index…</div>
    <p data-role="mode"></p>
  </form>

  <section class="s5-search-results" aria-label="Matching original sources">
    <h2 data-role="results-title">Retrieved sources</h2>
    <div data-role="results" aria-live="polite"></div>
  </section>

  <section class="s5-search-answer" aria-label="Optional local generated answer">
    <h2>Source-backed answer</h2>
    <p class="s5-search-notice">Generation is optional. Pressing Generate downloads an open-weight model of several hundred MB, then runs it with WebGPU on compatible browsers and GPUs. The initial download can take time and use substantial memory. No external inference API is used.</p>
    <p><button type="button" data-action="generate" disabled>Generate local answer (WebGPU)</button></p>
    <div data-role="answer-text" aria-live="polite">Find verifiable sources first.</div>
  </section>
</section>

<noscript>Enable JavaScript to run local semantic search. You can still browse the <a href="/en/series/">series</a> and <a href="/en/articulos-tecnicos/">articles</a>.</noscript>

<script type="module" src="/assets/javascripts/semantic-search.js"></script>

## What is actually running

The browser uses the **270M text-only EmbeddingGemma 2 encoder**. Until the offline-built 740M multimodal index has been validated and shipped, it derives candidates from the [public knowledge graph](/en/agent/knowledge.json) and then semantically reranks them locally. Once the validated binary multimodal index is served, the same interface uses it instead of metadata preselection.

Optional answers come from the **Qwen3 0.6B** open-weight model running through WebGPU. It is prompted only with retrieved source passages, and must cite the sources. **Generated text can still be wrong**, and a high similarity score is not proof. Always verify the linked article or video.

The model weights and inference runtimes initially download from Hugging Face and jsDelivr. MediaPipe says user inputs stay on device, but its runtime may send performance/utilization metrics. Do not enter private information.

Primary references: [Google EmbeddingGemma 2](https://ai.google.dev/gemma/docs/embeddinggemma/model_card_2), [MediaPipe Universal Embedder](https://developers.google.com/edge/mediapipe/solutions/retrieval/universal_embedder/web_js), [Qwen3 0.6B WebGPU](https://huggingface.co/onnx-community/Qwen3-0.6B-ONNX).
