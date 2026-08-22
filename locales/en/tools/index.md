---
title: AI Tools — calculators, visualizers and labs
description: Interactive 5sigmas tools for LLMs, model comparison, inference, context planning, Transformer attention, RAG, agents, evaluation and AI infrastructure.
keywords: AI tools, LLM calculator, compare AI models, LLM cost, LLM latency, token budget, context window, AI VRAM, Transformer attention, RAG evaluation, voice agents, AI benchmarks, scaling laws, AI training energy, training compute
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
    "numberOfItems": 16,
    "itemListElement": [
      {"@type": "ListItem", "position": 1, "url": "https://5sigmas.com/en/tools/llm-cost-latency/", "name": "LLM Cost & Latency Calculator"},
      {"@type": "ListItem", "position": 2, "url": "https://5sigmas.com/en/tools/model-price-performance/", "name": "Model Price/Performance Explorer"},
      {"@type": "ListItem", "position": 3, "url": "https://5sigmas.com/en/tools/inference-vram/", "name": "AI Inference VRAM Calculator"},
      {"@type": "ListItem", "position": 4, "url": "https://5sigmas.com/en/tools/kv-cache-context/", "name": "KV Cache & Context Window Explorer"},
      {"@type": "ListItem", "position": 5, "url": "https://5sigmas.com/en/tools/transformer-attention/", "name": "Transformer Attention Visualizer"},
      {"@type": "ListItem", "position": 6, "url": "https://5sigmas.com/en/tools/context-budget/", "name": "Token & Context Budget Planner"},
      {"@type": "ListItem", "position": 7, "url": "https://5sigmas.com/en/tools/rag-retrieval-lab/", "name": "RAG Retrieval Lab"},
      {"@type": "ListItem", "position": 8, "url": "https://5sigmas.com/en/tools/rag-evaluation/", "name": "RAG Evaluation Playground"},
      {"@type": "ListItem", "position": 9, "url": "https://5sigmas.com/en/tools/voice-latency-budget/", "name": "Voice-Agent Latency Budget Explorer"},
      {"@type": "ListItem", "position": 10, "url": "https://5sigmas.com/en/tools/voice-cost-capacity/", "name": "Voice-Agent Cost & Capacity Planner"},
      {"@type": "ListItem", "position": 11, "url": "https://5sigmas.com/en/tools/agent-reliability-eval/", "name": "Agent Reliability / Eval Playground"},
      {"@type": "ListItem", "position": 12, "url": "https://5sigmas.com/en/tools/prompt-injection-threat/", "name": "Prompt-Injection Threat Explorer"},
      {"@type": "ListItem", "position": 13, "url": "https://5sigmas.com/en/tools/benchmark-reliability/", "name": "Benchmark Reliability Explorer"},
      {"@type": "ListItem", "position": 14, "url": "https://5sigmas.com/en/tools/model-capability-timeline/", "name": "Model Capability Timeline"},
      {"@type": "ListItem", "position": 15, "url": "https://5sigmas.com/en/tools/scaling-laws/", "name": "Scaling-Laws Explorer"},
      {"@type": "ListItem", "position": 16, "url": "https://5sigmas.com/en/tools/training-compute-energy/", "name": "AI Training Compute & Energy Estimator"}
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
    <a class="s5-tool-index-card" href="/en/tools/llm-cost-latency/"><span class="s5-tool-index-card__meta">Calculator · LLMs · 01</span><h2>LLM cost and latency</h2><p>Turn tokens, caching, traffic, TTFT, generation speed and concurrency into cost per request, monthly spend, response time and approximate capacity.</p><span class="s5-tool-index-card__cta">Open calculator →</span></a>
    <a class="s5-tool-index-card" href="/en/tools/model-price-performance/"><span class="s5-tool-index-card__meta">Explorer · Models · 02</span><h2>Model price and performance</h2><p>Compare your workload cost with Intelligence Index, output speed, TTFT and context while keeping pricing and performance provenance separate.</p><span class="s5-tool-index-card__cta">Open explorer →</span></a>
    <a class="s5-tool-index-card" href="/en/tools/inference-vram/"><span class="s5-tool-index-card__meta">Calculator · Infrastructure · 03</span><h2>Inference VRAM</h2><p>Separate weights, KV cache and runtime reserve to estimate total memory, memory per GPU, maximum context and approximate concurrency.</p><span class="s5-tool-index-card__cta">Open calculator →</span></a>
    <a class="s5-tool-index-card" href="/en/tools/kv-cache-context/"><span class="s5-tool-index-card__meta">Explorer · Infrastructure · 04</span><h2>KV cache and context window</h2><p>Visualize how KV-cache memory and context capacity change with GQA/MQA, precision, concurrency and a configurable memory budget.</p><span class="s5-tool-index-card__cta">Open explorer →</span></a>
    <a class="s5-tool-index-card" href="/en/tools/transformer-attention/"><span class="s5-tool-index-card__meta">Visualizer · Architecture · 05</span><h2>Transformer attention</h2><p>Manipulate scores, causal masking, softmax and values to see how one attention head turns a query into a weighted mixture.</p><span class="s5-tool-index-card__cta">Open visualizer →</span></a>
    <a class="s5-tool-index-card" href="/en/tools/context-budget/"><span class="s5-tool-index-card__meta">Planner · LLMs · 06</span><h2>Token and context budget</h2><p>Allocate the window across instructions, tools, history, RAG, the current message, output and safety headroom to surface overflow and future pressure.</p><span class="s5-tool-index-card__cta">Open planner →</span></a>
    <a class="s5-tool-index-card" href="/en/tools/rag-retrieval-lab/"><span class="s5-tool-index-card__meta">Lab · RAG · 07</span><h2>RAG retrieval</h2><p>Measure Precision@k, Recall@k, MRR and nDCG on a visible ranking; test reranking while keeping retrieval quality separate from chunking and overlap footprint.</p><span class="s5-tool-index-card__cta">Open lab →</span></a>
    <a class="s5-tool-index-card" href="/en/tools/rag-evaluation/"><span class="s5-tool-index-card__meta">Evaluator · RAG · 08</span><h2>RAG evaluation</h2><p>Separate context relevance, faithfulness, correctness and coverage; inspect claims, uncertainty intervals and weights without hiding diagnosis inside one score.</p><span class="s5-tool-index-card__cta">Open evaluator →</span></a>
    <a class="s5-tool-index-card" href="/en/tools/voice-latency-budget/"><span class="s5-tool-index-card__meta">Explorer · Voice · 09</span><h2>Voice-agent latency</h2><p>Break down time to first audio across transport, turn end, STT, model, TTS and buffering, then calculate the interruption path separately.</p><span class="s5-tool-index-card__cta">Open explorer →</span></a>
    <a class="s5-tool-index-card" href="/en/tools/voice-cost-capacity/"><span class="s5-tool-index-card__meta">Planner · Voice · 10</span><h2>Voice-agent cost and capacity</h2><p>Turn calls, minutes, STT, TTS and model tokens into monthly spend, then size workers and provider limits without treating calls and TTS generations as the same concurrency.</p><span class="s5-tool-index-card__cta">Open planner →</span></a>
    <a class="s5-tool-index-card" href="/en/tools/agent-reliability-eval/"><span class="s5-tool-index-card__meta">Evaluator · Agents · 11</span><h2>Agent reliability and evaluation</h2><p>Separate final success, first-pass success, retry recovery, tool decisions, timeouts and trajectory efficiency; apply explicit release gates instead of hiding everything in one score.</p><span class="s5-tool-index-card__cta">Open evaluator →</span></a>
    <a class="s5-tool-index-card" href="/en/tools/prompt-injection-threat/"><span class="s5-tool-index-card__meta">Explorer · Security · 12</span><h2>Prompt-injection threat paths</h2><p>Trace paths from untrusted content into sensitive data, write-capable tools, external egress and persistent memory, then test which architectural boundaries cut each path.</p><span class="s5-tool-index-card__cta">Open explorer →</span></a>
    <a class="s5-tool-index-card" href="/en/tools/benchmark-reliability/"><span class="s5-tool-index-card__meta">Explorer · Evaluation · 13</span><h2>Benchmark reliability</h2><p>Check statistical resolution, saturation, sensitivity to invalid or potentially exposed items, and whether the ranking changes when task composition shifts.</p><span class="s5-tool-index-card__cta">Open explorer →</span></a>
    <a class="s5-tool-index-card" href="/en/tools/model-capability-timeline/"><span class="s5-tool-index-card__meta">Data explorer · Models · 14</span><h2>Model capability timeline</h2><p>Follow published results for one benchmark at a time, keep conditions and point-level provenance visible, and surface protocol breaks instead of blending incompatible metrics.</p><span class="s5-tool-index-card__cta">Open explorer →</span></a>
    <a class="s5-tool-index-card" href="/en/tools/scaling-laws/"><span class="s5-tool-index-card__meta">Explorer · Scaling · 15</span><h2>Scaling laws</h2><p>Reallocate a fixed training budget between parameters and tokens, compare the optimum of a Chinchilla-style surface, and test how sensitive that optimum is to the fitted exponents.</p><span class="s5-tool-index-card__cta">Open explorer →</span></a>
    <a class="s5-tool-index-card" href="/en/tools/training-compute-energy/"><span class="s5-tool-index-card__meta">Calculator · Infrastructure · 16</span><h2>Training compute and energy</h2><p>Turn accelerators, MFU, schedule, average power and PUE into model FLOPs, estimated runtime, facility power and energy while keeping dense-workload assumptions separate from electrical assumptions.</p><span class="s5-tool-index-card__cta">Open calculator →</span></a>
  </div>
</section>

<section class="s5-section s5-tools-roadmap" aria-labelledby="s5-tools-roadmap">
  <div><div class="s5-eyebrow">Roadmap</div><h2 id="s5-tools-roadmap">What comes next</h2><p>The section grows one tool at a time. There are no empty placeholder pages: an entry appears when it has real interaction, ES/EN parity, provenance and tests.</p></div>
  <div class="s5-tools-roadmap__list" aria-label="Upcoming tool families">
    <div class="s5-tools-roadmap__row"><span>17–18</span><strong>Datacenter capacity and the global AI ecosystem</strong><span>data</span></div>
  </div>
</section>

<section class="s5-section" aria-labelledby="s5-tools-method">
  <div class="s5-section-head s5-section-head--with-copy"><div><div class="s5-eyebrow">Standard</div><h2 id="s5-tools-method">What a 5sigmas tool must show</h2></div></div>
  <div class="s5-entry-grid">
    <div class="s5-entry"><div class="s5-entry__index">01</div><div class="s5-entry__title">Visible assumptions</div><div class="s5-entry__text">Editable estimates are kept separate from observed data. If a result depends on an assumption, you can change it.</div></div>
    <div class="s5-entry"><div class="s5-entry__index">02</div><div class="s5-entry__title">Primary sources</div><div class="s5-entry__text">Prices, limits and other changing data carry provenance and a verification date. Stale values are not presented as current.</div></div>
    <div class="s5-entry"><div class="s5-entry__index">03</div><div class="s5-entry__title">Reproducible output</div><div class="s5-entry__text">When useful, a scenario can be shared or exported with its inputs, outputs and provenance intact.</div></div>
  </div>
</section>
</div>
