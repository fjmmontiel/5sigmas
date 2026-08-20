---
title: AI tools — calculators, visualizers and evaluators
description: Interactive 5sigmas tools for LLM cost and latency, inference memory, RAG, agents, evaluation and AI infrastructure capacity.
hide:
  - toc
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "5sigmas AI tools",
  "url": "https://5sigmas.com/en/tools/",
  "description": "Interactive calculators, visualizers and evaluators for understanding and designing artificial intelligence systems.",
  "isPartOf": {"@type": "WebSite", "name": "5sigmas", "url": "https://5sigmas.com/en/"},
  "mainEntity": {
    "@type": "ItemList",
    "numberOfItems": 1,
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "LLM cost and latency calculator",
        "url": "https://5sigmas.com/en/tools/llm-cost-latency/"
      }
    ]
  }
}
</script>

<div class="s5-tools-hub">

<section class="s5-tool-intro">
  <div class="s5-eyebrow">Tools · 5sigmas</div>
  <h1>Calculate, compare and test AI systems.</h1>
  <p>Technical utilities for answering concrete questions with visible assumptions. Every tool exposes its formulas, units and limits; when it depends on external data, it also publishes the source and update date.</p>
  <div class="s5-tool-meta-line" aria-label="Collection status">
    <span>18 tools on the roadmap</span>
    <span>1 available</span>
    <span>No account required</span>
  </div>
</section>

<section class="s5-tools-category" aria-labelledby="s5-tools-cost">
  <div class="s5-tools-category__head">
    <h2 id="s5-tools-cost">Cost, latency and capacity</h2>
    <p>Turn tokens, generation time, memory and traffic into operational budgets that can be reviewed before deployment.</p>
  </div>
  <div class="s5-tools-list">
    <a class="s5-tool-row" href="/en/tools/llm-cost-latency/">
      <span class="s5-tool-row__index">01</span>
      <span class="s5-tool-row__title">LLM cost and latency</span>
      <span class="s5-tool-row__desc">Cost per request and month, response time and approximate concurrency from tokens, prices, TTFT and output speed.</span>
      <span class="s5-tool-row__status">Available</span>
    </a>
    <div class="s5-tool-row s5-tool-row--planned">
      <span class="s5-tool-row__index">02</span>
      <span class="s5-tool-row__title">Model price/performance</span>
      <span class="s5-tool-row__desc">Dated comparisons of cost, context, latency and capability without treating one benchmark as universal quality.</span>
      <span class="s5-tool-row__status">Roadmap</span>
    </div>
    <div class="s5-tool-row s5-tool-row--planned">
      <span class="s5-tool-row__index">03</span>
      <span class="s5-tool-row__title">Inference VRAM</span>
      <span class="s5-tool-row__desc">Parameters, quantization, KV cache, context, batch size and memory headroom.</span>
      <span class="s5-tool-row__status">Roadmap</span>
    </div>
    <div class="s5-tool-row s5-tool-row--planned">
      <span class="s5-tool-row__index">04</span>
      <span class="s5-tool-row__title">KV cache and context window</span>
      <span class="s5-tool-row__desc">How memory and throughput pressure grow with sequence length, layers and concurrency.</span>
      <span class="s5-tool-row__status">Roadmap</span>
    </div>
  </div>
</section>

<section class="s5-tools-category" aria-labelledby="s5-tools-models">
  <div class="s5-tools-category__head">
    <h2 id="s5-tools-models">Models and context</h2>
    <p>Visualize internal mechanisms and context budgets without turning a useful intuition into a false measure of capability.</p>
  </div>
  <div class="s5-tools-list">
    <div class="s5-tool-row s5-tool-row--planned"><span class="s5-tool-row__index">05</span><span class="s5-tool-row__title">Transformer attention</span><span class="s5-tool-row__desc">Tokens, causal masking, heads and attention weights in manipulable examples.</span><span class="s5-tool-row__status">Roadmap</span></div>
    <div class="s5-tool-row s5-tool-row--planned"><span class="s5-tool-row__index">06</span><span class="s5-tool-row__title">Token and context budget</span><span class="s5-tool-row__desc">System prompt, history, RAG, tools and output inside a finite context window.</span><span class="s5-tool-row__status">Roadmap</span></div>
    <div class="s5-tool-row s5-tool-row--planned"><span class="s5-tool-row__index">15</span><span class="s5-tool-row__title">Scaling laws</span><span class="s5-tool-row__desc">Sensitivity of model/data/compute trade-offs under explicit assumptions.</span><span class="s5-tool-row__status">Roadmap</span></div>
  </div>
</section>

<section class="s5-tools-category" aria-labelledby="s5-tools-eval">
  <div class="s5-tools-category__head">
    <h2 id="s5-tools-eval">RAG, agents and evaluation</h2>
    <p>Separate retrieval, answering, execution and reliability so failures remain diagnosable instead of disappearing inside one aggregate score.</p>
  </div>
  <div class="s5-tools-list">
    <div class="s5-tool-row s5-tool-row--planned"><span class="s5-tool-row__index">07</span><span class="s5-tool-row__title">RAG retrieval lab</span><span class="s5-tool-row__desc">Precision@k, recall@k, MRR, nDCG, chunking and reranking with interpretable examples.</span><span class="s5-tool-row__status">Roadmap</span></div>
    <div class="s5-tool-row s5-tool-row--planned"><span class="s5-tool-row__index">08</span><span class="s5-tool-row__title">RAG evaluation</span><span class="s5-tool-row__desc">Retrieval quality, context relevance, faithfulness and answer correctness as separate dimensions.</span><span class="s5-tool-row__status">Roadmap</span></div>
    <div class="s5-tool-row s5-tool-row--planned"><span class="s5-tool-row__index">11</span><span class="s5-tool-row__title">Agent reliability and evaluation</span><span class="s5-tool-row__desc">Task success, tools, retries, timeouts, trajectories and confidence intervals.</span><span class="s5-tool-row__status">Roadmap</span></div>
    <div class="s5-tool-row s5-tool-row--planned"><span class="s5-tool-row__index">12</span><span class="s5-tool-row__title">Prompt-injection threat explorer</span><span class="s5-tool-row__desc">Trust boundaries, data channels, mitigations and residual risk from a defensive perspective.</span><span class="s5-tool-row__status">Roadmap</span></div>
    <div class="s5-tool-row s5-tool-row--planned"><span class="s5-tool-row__index">13</span><span class="s5-tool-row__title">Benchmark reliability</span><span class="s5-tool-row__desc">Saturation, contamination, invalid items, variance and uncertainty in rankings.</span><span class="s5-tool-row__status">Roadmap</span></div>
  </div>
</section>

<section class="s5-tools-category" aria-labelledby="s5-tools-voice">
  <div class="s5-tools-category__head">
    <h2 id="s5-tools-voice">Voice and realtime interaction</h2>
    <p>Budget the milliseconds and cost that separate a feasible architecture from a conversation that actually feels immediate.</p>
  </div>
  <div class="s5-tools-list">
    <div class="s5-tool-row s5-tool-row--planned"><span class="s5-tool-row__index">09</span><span class="s5-tool-row__title">Voice-agent latency budget</span><span class="s5-tool-row__desc">STT→LLM→TTS, realtime and half-cascade with endpointing, TTFT, first audio and network delay.</span><span class="s5-tool-row__status">Roadmap</span></div>
    <div class="s5-tool-row s5-tool-row--planned"><span class="s5-tool-row__index">10</span><span class="s5-tool-row__title">Voice-agent cost and capacity</span><span class="s5-tool-row__desc">Call duration, concurrency, utilization and component-level cost.</span><span class="s5-tool-row__status">Roadmap</span></div>
  </div>
</section>

<section class="s5-tools-category" aria-labelledby="s5-tools-index">
  <div class="s5-tools-category__head">
    <h2 id="s5-tools-index">AI progress and infrastructure</h2>
    <p>Explorers with explicit methodology and provenance for studying capability, energy, infrastructure and ecosystems without hiding how a comparison is constructed.</p>
  </div>
  <div class="s5-tools-list">
    <div class="s5-tool-row s5-tool-row--planned"><span class="s5-tool-row__index">14</span><span class="s5-tool-row__title">Model capability timeline</span><span class="s5-tool-row__desc">Time series for reasoning, coding, multimodality and agents with comparability warnings.</span><span class="s5-tool-row__status">Roadmap</span></div>
    <div class="s5-tool-row s5-tool-row--planned"><span class="s5-tool-row__index">16</span><span class="s5-tool-row__title">Training compute and energy</span><span class="s5-tool-row__desc">Accelerators, utilization, duration, power, PUE and estimation ranges.</span><span class="s5-tool-row__status">Roadmap</span></div>
    <div class="s5-tool-row s5-tool-row--planned"><span class="s5-tool-row__index">17</span><span class="s5-tool-row__title">AI data-center capacity</span><span class="s5-tool-row__desc">Racks, MW, cooling, utilization and assumptions for training and inference capacity.</span><span class="s5-tool-row__status">Roadmap</span></div>
    <div class="s5-tool-row s5-tool-row--planned"><span class="s5-tool-row__index">18</span><span class="s5-tool-row__title">Global AI ecosystem</span><span class="s5-tool-row__desc">Research, talent, infrastructure, investment, policy and model development with transparent normalization and weights.</span><span class="s5-tool-row__status">Roadmap</span></div>
  </div>
</section>

<section class="s5-tool-method" aria-labelledby="s5-tools-method">
  <h2 id="s5-tools-method">What a 5sigmas tool must make explicit.</h2>
  <div class="s5-tool-method__body">
    <p>An output should never look more precise than its inputs. The tools distinguish measured values, external data and editable assumptions; they avoid mixing incompatible benchmarks and expose the methodology behind any composite score.</p>
    <p>Tools that depend on changing data will publish provenance and update dates. Purely mathematical calculators, including the first tool in this collection, do not hide provider prices inside presets: users enter the rates they want to evaluate.</p>
  </div>
</section>

</div>
