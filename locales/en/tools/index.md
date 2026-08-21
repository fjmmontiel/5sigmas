---
title: AI Tools — calculators, visualizers and labs
description: Interactive 5sigmas tools for LLMs, model comparison, inference, context planning, Transformer attention, RAG, agents, evaluation and AI infrastructure.
keywords: AI tools, LLM calculator, compare AI models, LLM cost, LLM latency, token budget, context window, AI VRAM, Transformer attention, RAG evaluation, voice agents, AI benchmarks
hide:
  - toc
  - navigation
  - footer
---

<link rel="stylesheet" href="/stylesheets/tools.css" />

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "AI Tools — 5sigmas",
  "url": "https://5sigmas.com/en/tools/",
  "description": "Calculators, visualizers, evaluators and interactive explorers for understanding and designing artificial intelligence systems.",
  "isPartOf": {"@type": "WebSite", "name": "5sigmas", "url": "https://5sigmas.com/en/"},
  "mainEntity": {
    "@type": "ItemList",
    "numberOfItems": 7,
    "itemListElement": [
      {"@type": "ListItem", "position": 1, "url": "https://5sigmas.com/en/tools/llm-cost-latency/", "name": "LLM Cost & Latency Calculator"},
      {"@type": "ListItem", "position": 2, "url": "https://5sigmas.com/en/tools/model-price-performance/", "name": "Model Price/Performance Explorer"},
      {"@type": "ListItem", "position": 3, "url": "https://5sigmas.com/en/tools/inference-vram/", "name": "AI Inference VRAM Calculator"},
      {"@type": "ListItem", "position": 4, "url": "https://5sigmas.com/en/tools/kv-cache-context/", "name": "KV Cache & Context Window Explorer"},
      {"@type": "ListItem", "position": 5, "url": "https://5sigmas.com/en/tools/transformer-attention/", "name": "Transformer Attention Visualizer"},
      {"@type": "ListItem", "position": 6, "url": "https://5sigmas.com/en/tools/context-budget/", "name": "Token & Context Budget Planner"},
      {"@type": "ListItem", "position": 7, "url": "https://5sigmas.com/en/tools/rag-retrieval-lab/", "name": "RAG Retrieval Lab"}
    ]
  }
}
</script>

<div class="s5-landing s5-tools-hub">

<section class="s5-page-intro">
  <div class="s5-eyebrow">Tools</div>
  <h1>Explore an AI system by changing its variables.</h1>
  <p>Calculators, visualizers and labs for answering AI engineering questions with explicit assumptions. Each tool documents its method, cites its sources and makes the scenario reproducible.</p>
</section>

<section class="s5-section" aria-labelledby="s5-tools-available">
  <div class="s5-section-head s5-section-head--with-copy">
    <div><div class="s5-eyebrow">Available</div><h2 id="s5-tools-available">Available tools</h2></div>
    <p>A tool appears here when the English and Spanish versions share the same logic, sources and tests.</p>
  </div>

  <div class="s5-tool-index-grid">
    <a class="s5-tool-index-card" href="/en/tools/llm-cost-latency/">
      <span class="s5-tool-index-card__meta">Calculator · LLMs · 01</span>
      <h2>LLM cost and latency</h2>
      <p>Turn tokens, caching, traffic, TTFT, generation speed and concurrency into cost per request, monthly spend, response time and approximate capacity.</p>
      <span class="s5-tool-index-card__cta">Open calculator →</span>
    </a>
    <a class="s5-tool-index-card" href="/en/tools/model-price-performance/">
      <span class="s5-tool-index-card__meta">Explorer · Models · 02</span>
      <h2>Model price and performance</h2>
      <p>Compare your workload cost with Intelligence Index, output speed, TTFT and context while keeping pricing and performance provenance separate.</p>
      <span class="s5-tool-index-card__cta">Open explorer →</span>
    </a>
    <a class="s5-tool-index-card" href="/en/tools/inference-vram/">
      <span class="s5-tool-index-card__meta">Calculator · Infrastructure · 03</span>
      <h2>Inference VRAM</h2>
      <p>Separate weights, KV cache and runtime reserve to estimate total memory, memory per GPU, maximum context and approximate concurrency.</p>
      <span class="s5-tool-index-card__cta">Open calculator →</span>
    </a>
    <a class="s5-tool-index-card" href="/en/tools/kv-cache-context/">
      <span class="s5-tool-index-card__meta">Explorer · Infrastructure · 04</span>
      <h2>KV cache and context window</h2>
      <p>Visualize how KV-cache memory and context capacity change with GQA/MQA, precision, concurrency and a configurable memory budget.</p>
      <span class="s5-tool-index-card__cta">Open explorer →</span>
    </a>
    <a class="s5-tool-index-card" href="/en/tools/transformer-attention/">
      <span class="s5-tool-index-card__meta">Visualizer · Architecture · 05</span>
      <h2>Transformer attention</h2>
      <p>Manipulate scores, causal masking, softmax and values to see how one attention head turns a query into a weighted mixture.</p>
      <span class="s5-tool-index-card__cta">Open visualizer →</span>
    </a>
    <a class="s5-tool-index-card" href="/en/tools/context-budget/">
      <span class="s5-tool-index-card__meta">Planner · LLMs · 06</span>
      <h2>Token and context budget</h2>
      <p>Allocate the window across instructions, tools, history, RAG, the current message, output and safety headroom to surface overflow and future pressure.</p>
      <span class="s5-tool-index-card__cta">Open planner →</span>
    </a>
    <a class="s5-tool-index-card" href="/en/tools/rag-retrieval-lab/">
      <span class="s5-tool-index-card__meta">Lab · RAG · 07</span>
      <h2>RAG retrieval</h2>
      <p>Measure Precision@k, Recall@k, MRR and nDCG on a visible ranking; test reranking while keeping retrieval quality separate from chunking and overlap footprint.</p>
      <span class="s5-tool-index-card__cta">Open lab →</span>
    </a>
  </div>
</section>

<section class="s5-section s5-tools-roadmap" aria-labelledby="s5-tools-roadmap">
  <div>
    <div class="s5-eyebrow">Roadmap</div>
    <h2 id="s5-tools-roadmap">What comes next</h2>
    <p>The section grows one tool at a time. There are no empty placeholder pages: an entry appears when it has real interaction, ES/EN parity, provenance and tests.</p>
  </div>
  <div class="s5-tools-roadmap__list" aria-label="Upcoming tool families">
    <div class="s5-tools-roadmap__row"><span>08</span><strong>RAG evaluation across context, faithfulness and answer quality</strong><span>evaluator</span></div>
    <div class="s5-tools-roadmap__row"><span>09–12</span><strong>Agents: latency, cost, reliability and security</strong><span>explorers</span></div>
    <div class="s5-tools-roadmap__row"><span>13–18</span><strong>Benchmarks, scaling, infrastructure and the global ecosystem</strong><span>data</span></div>
  </div>
</section>

<section class="s5-section" aria-labelledby="s5-tools-method">
  <div class="s5-section-head s5-section-head--with-copy">
    <div><div class="s5-eyebrow">Standard</div><h2 id="s5-tools-method">What a 5sigmas tool must show</h2></div>
  </div>
  <div class="s5-entry-grid">
    <div class="s5-entry"><div class="s5-entry__index">01</div><div class="s5-entry__title">Visible assumptions</div><div class="s5-entry__text">Editable estimates are kept separate from observed data. If a result depends on an assumption, you can change it.</div></div>
    <div class="s5-entry"><div class="s5-entry__index">02</div><div class="s5-entry__title">Primary sources</div><div class="s5-entry__text">Prices, limits and other changing data carry provenance and a verification date. Stale values are not presented as current.</div></div>
    <div class="s5-entry"><div class="s5-entry__index">03</div><div class="s5-entry__title">Reproducible output</div><div class="s5-entry__text">When useful, a scenario can be shared or exported with its inputs, outputs and provenance intact.</div></div>
  </div>
</section>

</div>
