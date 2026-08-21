---
title: AI Inference VRAM Calculator
description: Estimate model-weight memory, KV cache, runtime reserve, total VRAM and approximate context capacity for Transformer inference with GQA/MQA.
keywords: LLM VRAM calculator, AI inference memory, KV cache, GQA, LLM quantization, context VRAM, GPU LLM
hide:
  - toc
  - navigation
  - footer
---

<link rel="stylesheet" href="/stylesheets/tools.css" />
<script src="/assets/javascripts/tools/inference-vram-core.js" defer></script>
<script src="/assets/javascripts/tools/inference-vram.js" defer></script>

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "AI Inference VRAM Calculator — 5sigmas",
  "url": "https://5sigmas.com/en/tools/inference-vram/",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Any",
  "isAccessibleForFree": true,
  "description": "Interactive calculator for model-weight memory, KV cache and approximate GPU capacity during LLM inference.",
  "featureList": [
    "Weight memory from parameter count and precision",
    "KV cache from layers, KV heads, context and concurrency",
    "GQA versus full multi-head attention",
    "Approximate maximum context and sequence capacity",
    "Shareable scenario and JSON export"
  ],
  "isPartOf": {"@type": "WebSite", "name": "5sigmas", "url": "https://5sigmas.com/en/"}
}
</script>

<div class="s5-landing s5-tool-page" data-s5-inference-vram data-locale="en">

<section class="s5-page-intro">
  <div class="s5-eyebrow">Tools · Infrastructure · 03</div>
  <h1>Calculate what consumes VRAM during inference.</h1>
  <p>Separate model weights, KV cache and runtime reserve. Change precision, context length, concurrency and GPU count to see which part of the memory budget is constraining the deployment.</p>
</section>

<div class="s5-tool-summary-strip" aria-label="Scope of the estimate">
  <div><small>Weights</small><strong>parameters × bits</strong></div>
  <div><small>KV cache</small><strong>layers × K/V × heads × tokens</strong></div>
  <div><small>Capacity</small><strong>ideal GPU sharding</strong></div>
</div>

<div class="s5-tool-workbench">
  <form class="s5-tool-controls" data-s5-tool-form aria-label="Memory assumptions" onsubmit="return false">
    <section class="s5-tool-controls__section">
      <h2>Architecture</h2>
      <div class="s5-tool-field-grid s5-tool-field-grid--single">
        <div class="s5-tool-field">
          <label for="s5-vram-en-preset">Preset</label>
          <select id="s5-vram-en-preset" data-field="preset"></select>
          <small>Presets use architecture geometry published by Meta. Every field remains editable.</small>
        </div>
      </div>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field"><label for="s5-vram-en-p">Parameters · billions</label><input id="s5-vram-en-p" data-field="parametersB" type="number" min="0" step="0.1" inputmode="decimal" value="8" /></div>
        <div class="s5-tool-field"><label for="s5-vram-en-l">Layers</label><input id="s5-vram-en-l" data-field="layers" type="number" min="1" step="1" inputmode="numeric" value="32" /></div>
        <div class="s5-tool-field"><label for="s5-vram-en-h">Hidden size</label><input id="s5-vram-en-h" data-field="hiddenSize" type="number" min="1" step="128" inputmode="numeric" value="4096" /></div>
        <div class="s5-tool-field"><label for="s5-vram-en-ah">Attention heads</label><input id="s5-vram-en-ah" data-field="attentionHeads" type="number" min="1" step="1" inputmode="numeric" value="32" /></div>
        <div class="s5-tool-field"><label for="s5-vram-en-kvh">KV heads</label><input id="s5-vram-en-kvh" data-field="kvHeads" type="number" min="1" step="1" inputmode="numeric" value="8" /><small>GQA/MQA reduces this value relative to the total query-head count.</small></div>
      </div>
    </section>

    <section class="s5-tool-controls__section">
      <h2>Inference scenario</h2>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field"><label for="s5-vram-en-wb">Weight precision · bits</label><input id="s5-vram-en-wb" data-field="weightBits" type="number" min="1" max="32" step="1" inputmode="numeric" value="16" /><small>For example: 16 for BF16/FP16, or 8/4 as a quantized approximation.</small></div>
        <div class="s5-tool-field"><label for="s5-vram-en-kvb">KV-cache precision · bits</label><input id="s5-vram-en-kvb" data-field="kvBits" type="number" min="1" max="32" step="1" inputmode="numeric" value="16" /></div>
        <div class="s5-tool-field"><label for="s5-vram-en-ctx">Context per sequence · tokens</label><input id="s5-vram-en-ctx" data-field="contextTokens" type="number" min="0" step="1024" inputmode="numeric" value="8192" /></div>
        <div class="s5-tool-field"><label for="s5-vram-en-seq">Concurrent sequences</label><input id="s5-vram-en-seq" data-field="concurrentSequences" type="number" min="0" step="1" inputmode="numeric" value="1" /><small>Sequences simultaneously resident in the KV cache.</small></div>
      </div>
    </section>

    <section class="s5-tool-controls__section">
      <h2>Hardware and reserve</h2>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field"><label for="s5-vram-en-g">GPUs</label><input id="s5-vram-en-g" data-field="devices" type="number" min="1" step="1" inputmode="numeric" value="1" /></div>
        <div class="s5-tool-field"><label for="s5-vram-en-cap">VRAM per GPU · GiB</label><input id="s5-vram-en-cap" data-field="gpuVramGiB" type="number" min="0" step="1" inputmode="decimal" value="24" /></div>
        <div class="s5-tool-field"><label for="s5-vram-en-wm">Weight format metadata · %</label><input id="s5-vram-en-wm" data-field="weightMetadataPct" type="number" min="0" max="100" step="1" inputmode="decimal" value="0" /><small>Add scales, metadata or format overhead when you know it.</small></div>
        <div class="s5-tool-field"><label for="s5-vram-en-oh">Runtime reserve · %</label><input id="s5-vram-en-oh" data-field="runtimeOverheadPct" type="number" min="0" max="200" step="1" inputmode="decimal" value="10" /><small>Explicit reserve for temporary activations, kernels and allocator headroom. It is not a universal constant.</small></div>
      </div>
      <div class="s5-tool-actions" aria-label="Scenario actions">
        <button class="s5-tool-action" type="button" data-action="share">Copy link</button>
        <button class="s5-tool-action" type="button" data-action="export">Export JSON</button>
        <button class="s5-tool-action" type="button" data-action="reset">Reset</button>
      </div>
      <p class="s5-tool-feedback" data-s5-tool-feedback hidden aria-live="polite"></p>
    </section>
  </form>

  <section class="s5-tool-results" aria-label="Memory results" aria-live="polite">
    <div class="s5-tool-kpis">
      <div class="s5-tool-kpi"><small>Estimated total VRAM</small><strong data-output="totalVram">—</strong><span>weights + KV cache + reserve</span></div>
      <div class="s5-tool-kpi"><small>Weights</small><strong data-output="weights">—</strong><span>includes configured format overhead</span></div>
      <div class="s5-tool-kpi"><small>KV cache</small><strong data-output="kvCache">—</strong><span>context × concurrent sequences</span></div>
      <div class="s5-tool-kpi"><small>Memory per GPU</small><strong data-output="perDevice">—</strong><span data-output="perDeviceNote">—</span></div>
    </div>

    <div class="s5-tool-status-grid" aria-label="Scenario checks">
      <div class="s5-tool-status" data-output="fitStatus" data-label="Capacity">—</div>
      <div class="s5-tool-status" data-output="architectureStatus" data-label="Architecture">—</div>
      <div class="s5-tool-status" data-output="contextStatus" data-label="Preset context">—</div>
    </div>

    <div class="s5-tool-breakdowns">
      <div class="s5-tool-breakdown">
        <div class="s5-tool-breakdown__head"><strong>Where the memory goes</strong><span>total estimate</span></div>
        <div class="s5-tool-bar" aria-label="Relative VRAM breakdown">
          <span data-memory-bar="weights" title="Weights"></span><span data-memory-bar="kv" title="KV cache"></span><span data-memory-bar="runtime" title="Runtime reserve"></span>
        </div>
        <div class="s5-tool-legend"><span>Weights</span><span>KV cache</span><span>Runtime reserve</span></div>
      </div>
    </div>

    <div class="s5-tool-detail-grid" aria-label="Architecture and capacity details">
      <div><small>KV / token / sequence</small><strong data-output="kvPerToken">—</strong></div>
      <div><small>Approx. max context</small><strong data-output="maxContext">—</strong></div>
      <div><small>Approx. max sequences</small><strong data-output="maxSequences">—</strong></div>
      <div><small>Head dimension</small><strong data-output="headDim">—</strong></div>
      <div><small>KV versus MHA</small><strong data-output="gqaRatio">—</strong></div>
      <div><small>VRAM headroom</small><strong data-output="headroom">—</strong></div>
    </div>

    <aside class="s5-tool-source" aria-label="Preset provenance">
      <div class="s5-tool-source__head"><a data-output="sourceLink" target="_blank" rel="noopener noreferrer">Preset</a><span data-output="sourceDate"></span></div>
      <p data-output="sourceNote"></p>
    </aside>
  </section>
</div>

<section class="s5-tool-method" aria-labelledby="s5-vram-method">
  <div><div class="s5-eyebrow">Method</div><h2 id="s5-vram-method">A planning estimate, not a profiler.</h2></div>
  <div class="s5-tool-method__body">
    <p><strong>Weights.</strong> The minimum approximation is parameter count × bits per stored weight. Quantized formats may add scales, codebooks, padding or other metadata, so format overhead is exposed as a separate input rather than hidden.</p>
    <div class="s5-tool-method__formula">weight_memory ≈ parameters × weight_bits / 8 × (1 + format_overhead)</div>
    <p><strong>KV cache.</strong> For standard decoder attention, each layer retains one key and one value vector per KV head, token and sequence. GQA/MQA can use fewer KV heads than query heads. Meta publishes this geometry for Llama 3.1, while vLLM exposes the KV cache as an explicit GPU-memory budget.</p>
    <div class="s5-tool-method__formula">KV ≈ layers × 2 × KV_heads × head_dim × KV_bytes × tokens × sequences</div>
    <p><strong>Multiple GPUs.</strong> The per-GPU figure assumes ideal, even sharding of both weights and KV cache. It is useful as a planning lower bound, but it does not model replicas, pipeline parallelism, indivisible layers, communication buffers, offload or a specific backend layout.</p>
    <p><strong>Runtime reserve.</strong> The tool applies an editable percentage to weights + KV. Temporary activations, CUDA graphs, kernels and allocator behavior vary by engine and workload, so no fixed percentage is presented as an observed fact.</p>
    <p class="s5-tool-method__notes">The KV formula is not a faithful model for MLA, hybrid/sliding-window attention, recurrent state or architecture-specific compressed caches. In those cases, use the result as a comparison estimate and validate the deployment with real serving-engine metrics.</p>
    <p class="s5-tool-method__notes">Primary sources: <a href="https://github.com/meta-llama/llama-models/blob/main/models/sku_list.py">Meta · Llama architecture definitions</a>, <a href="https://github.com/meta-llama/llama-models/blob/main/models/llama3_1/MODEL_CARD.md">Meta · Llama 3.1 model card</a>, and <a href="https://docs.vllm.ai/en/latest/api/vllm/config/index.html">vLLM · KV-cache configuration</a>. Verified 2026-08-21.</p>
  </div>
</section>

<section class="s5-section" aria-labelledby="s5-vram-related">
  <div class="s5-section-head"><h2 id="s5-vram-related">Use the memory estimate in context</h2></div>
  <div class="s5-simple-list">
    <a class="s5-list-row" href="/en/temas/transformer/"><span class="s5-list-row__n">01</span><span class="s5-list-row__title">How the Transformer works</span><span class="s5-list-row__desc">Attention, heads and representations before turning them into a memory budget.</span><span class="s5-list-row__meta">Concept</span></a>
    <a class="s5-list-row" href="/en/tools/llm-cost-latency/"><span class="s5-list-row__n">02</span><span class="s5-list-row__title">LLM cost and latency</span><span class="s5-list-row__desc">Connect deployment memory with workload cost and response time.</span><span class="s5-list-row__meta">Tool</span></a>
  </div>
</section>

</div>
