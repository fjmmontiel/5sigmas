---
title: KV Cache & Context Window Explorer
description: Visualize how Transformer KV-cache memory grows with context, concurrency, GQA/MQA and precision, then compare it with a memory budget.
keywords: LLM KV cache, context window, LLM context memory, GQA, MQA, multi-head attention, inference memory
hide:
  - toc
  - navigation
  - footer
---

<link rel="stylesheet" href="/stylesheets/tools.css" />
<script src="/assets/javascripts/tools/kv-context-core.js" defer></script>
<script src="/assets/javascripts/tools/kv-context.js" defer></script>

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "KV Cache & Context Window Explorer — 5sigmas",
  "url": "https://5sigmas.com/en/tools/kv-cache-context/",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Any",
  "isAccessibleForFree": true,
  "description": "Interactive explorer for KV-cache growth across architecture, context length, concurrency and precision.",
  "featureList": [
    "KV-memory curve versus context length",
    "GQA/MQA comparison with full multi-head attention",
    "Editable KV-cache memory budget",
    "Memory-limited context and concurrency capacity",
    "Shareable scenario and CSV export"
  ],
  "isPartOf": {"@type": "WebSite", "name": "5sigmas", "url": "https://5sigmas.com/en/"}
}
</script>

<div class="s5-landing s5-tool-page" data-s5-kv-context data-locale="en">

<section class="s5-page-intro">
  <div class="s5-eyebrow">Tools · Infrastructure · 04</div>
  <h1>See how much context fits in the KV cache.</h1>
  <p>KV-cache memory grows linearly with resident tokens and concurrent sequences. Change attention geometry, precision and the memory budget to see when context becomes the constraint.</p>
</section>

<div class="s5-tool-summary-strip" aria-label="Main relationships">
  <div><small>Context</small><strong>tokens × sequences</strong></div>
  <div><small>Per token</small><strong>layers × K/V × KV heads</strong></div>
  <div><small>GQA/MQA</small><strong>fewer KV than query heads</strong></div>
</div>

<div class="s5-tool-workbench">
  <form class="s5-tool-controls" data-s5-tool-form aria-label="KV-cache assumptions" onsubmit="return false">
    <section class="s5-tool-controls__section">
      <h2>Architecture</h2>
      <div class="s5-tool-field-grid s5-tool-field-grid--single">
        <div class="s5-tool-field">
          <label for="s5-kv-en-preset">Preset</label>
          <select id="s5-kv-en-preset" data-field="preset"></select>
          <small>Presets use architecture geometry published by Meta. Every field remains editable.</small>
        </div>
      </div>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field"><label for="s5-kv-en-l">Layers</label><input id="s5-kv-en-l" data-field="layers" type="number" min="1" step="1" inputmode="numeric" value="32" /></div>
        <div class="s5-tool-field"><label for="s5-kv-en-h">Hidden size</label><input id="s5-kv-en-h" data-field="hiddenSize" type="number" min="1" step="1" inputmode="numeric" value="4096" /></div>
        <div class="s5-tool-field"><label for="s5-kv-en-ah">Attention heads</label><input id="s5-kv-en-ah" data-field="attentionHeads" type="number" min="1" step="1" inputmode="numeric" value="32" /></div>
        <div class="s5-tool-field"><label for="s5-kv-en-kvh">KV heads</label><input id="s5-kv-en-kvh" data-field="kvHeads" type="number" min="1" step="1" inputmode="numeric" value="8" /><small>GQA/MQA reduces this value relative to the query-head count.</small></div>
      </div>
    </section>

    <section class="s5-tool-controls__section">
      <h2>Resident workload</h2>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field"><label for="s5-kv-en-bits">KV-cache precision · bits</label><input id="s5-kv-en-bits" data-field="kvBits" type="number" min="1" max="32" step="1" inputmode="numeric" value="16" /></div>
        <div class="s5-tool-field"><label for="s5-kv-en-seq">Concurrent sequences</label><input id="s5-kv-en-seq" data-field="concurrentSequences" type="number" min="1" step="1" inputmode="numeric" value="1" /></div>
        <div class="s5-tool-field"><label for="s5-kv-en-ctx">Context per sequence · tokens</label><input id="s5-kv-en-ctx" data-field="contextTokens" type="number" min="1" step="1" inputmode="numeric" value="8192" /></div>
        <div class="s5-tool-field"><label for="s5-kv-en-budget">KV budget · GiB</label><input id="s5-kv-en-budget" data-field="kvBudgetGiB" type="number" min="0" step="0.1" inputmode="decimal" value="16" /><small>Memory available only for KV cache after weights and runtime reserve have been accounted for.</small></div>
      </div>
      <div class="s5-tool-preset-actions" aria-label="Common context lengths">
        <button type="button" data-context-preset="8192">8K</button>
        <button type="button" data-context-preset="32768">32K</button>
        <button type="button" data-context-preset="65536">64K</button>
        <button type="button" data-context-preset="131072">128K</button>
      </div>
      <div class="s5-tool-actions" aria-label="Scenario actions">
        <button class="s5-tool-action" type="button" data-action="share">Copy link</button>
        <button class="s5-tool-action" type="button" data-action="export">Export CSV</button>
        <button class="s5-tool-action" type="button" data-action="reset">Reset</button>
      </div>
      <p class="s5-tool-feedback" data-s5-tool-feedback hidden aria-live="polite"></p>
    </section>
  </form>

  <section class="s5-tool-results" aria-label="KV-cache results" aria-live="polite">
    <div class="s5-tool-kpis">
      <div class="s5-tool-kpi"><small>Selected KV cache</small><strong data-output="kvTotal">—</strong><span>context × concurrency</span></div>
      <div class="s5-tool-kpi"><small>KV / token / sequence</small><strong data-output="kvPerToken">—</strong><span>marginal cost of one resident token</span></div>
      <div class="s5-tool-kpi"><small>Resident tokens</small><strong data-output="residentTokens">—</strong><span>context × sequences</span></div>
      <div class="s5-tool-kpi"><small>Budget utilization</small><strong data-output="budgetUse">—</strong><span>of the configured KV-only budget</span></div>
    </div>

    <div class="s5-tool-status-grid" aria-label="Scenario checks">
      <div class="s5-tool-status" data-output="budgetStatus" data-label="KV budget">—</div>
      <div class="s5-tool-status" data-output="architectureStatus" data-label="Architecture">—</div>
      <div class="s5-tool-status" data-output="contextStatus" data-label="Preset context">—</div>
    </div>

    <div class="s5-kv-chart-wrap">
      <div class="s5-tool-breakdown__head"><strong>How KV-cache memory scales</strong><span>logarithmic X axis</span></div>
      <svg class="s5-kv-chart" data-kv-chart aria-label="KV-cache memory versus context length"></svg>
      <div class="s5-kv-chart-legend" aria-label="Chart legend">
        <span><i class="s5-kv-chart-legend__selected"></i>Selected geometry</span>
        <span><i class="s5-kv-chart-legend__mha"></i>Full MHA</span>
        <span><i class="s5-kv-chart-legend__budget"></i>KV budget</span>
        <span><i class="s5-kv-chart-legend__preset"></i>Preset maximum</span>
      </div>
    </div>

    <div class="s5-tool-detail-grid" aria-label="Capacity and geometry">
      <div><small>Memory-limited max context</small><strong data-output="maxContext">—</strong></div>
      <div><small>Memory-limited max sequences</small><strong data-output="maxSequences">—</strong></div>
      <div><small>KV versus MHA</small><strong data-output="gqaRatio">—</strong></div>
      <div><small>Saving versus MHA</small><strong data-output="gqaSaved">—</strong></div>
      <div><small>Equivalent full-MHA KV</small><strong data-output="mhaKv">—</strong></div>
      <div><small>Head dimension</small><strong data-output="headDim">—</strong></div>
    </div>

    <aside class="s5-tool-source" aria-label="Preset provenance">
      <div class="s5-tool-source__head"><a data-output="sourceLink" target="_blank" rel="noopener noreferrer">Preset</a><span data-output="sourceDate"></span></div>
      <p data-output="sourceNote"></p>
    </aside>
  </section>
</div>

<section class="s5-tool-method" aria-labelledby="s5-kv-method">
  <div><div class="s5-eyebrow">Method</div><h2 id="s5-kv-method">KV-cache memory scales with the tokens that remain resident.</h2></div>
  <div class="s5-tool-method__body">
    <p><strong>Per token.</strong> In standard decoder attention, every layer retains one key and one value per KV head. Head dimension is hidden_size / attention_heads.</p>
    <div class="s5-tool-method__formula">KV_token ≈ layers × 2 × KV_heads × head_dim × KV_bytes</div>
    <p><strong>Context and concurrency.</strong> Total memory then multiplies by the number of tokens in each sequence and by the number of sequences resident at the same time.</p>
    <div class="s5-tool-method__formula">KV_total ≈ KV_token × context_tokens × concurrent_sequences</div>
    <p><strong>GQA and MQA.</strong> Fewer KV heads reduce cache memory in the same proportion, independently of precision or context length. The chart compares the selected geometry with full MHA using the same query-head count.</p>
    <p><strong>Budget.</strong> The memory limit applies only to KV cache. It is not total VRAM: weights, activations, CUDA graphs, buffers and other reserves must be subtracted first. Use the <a href="/en/tools/inference-vram/">AI Inference VRAM Calculator</a> to model the full deployment budget.</p>
    <p class="s5-tool-method__notes">This approximation does not model MLA, hybrid/sliding-window attention, recurrent state, backend-specific paging/fragmentation or compressed caches. Validate those deployments against real serving-engine metrics.</p>
    <p class="s5-tool-method__notes">Primary sources: <a href="https://github.com/meta-llama/llama-models/blob/main/models/sku_list.py">Meta · Llama architecture definitions</a>, <a href="https://github.com/meta-llama/llama-models/blob/main/models/llama3_1/MODEL_CARD.md">Meta · Llama 3.1 model card</a>, and <a href="https://docs.vllm.ai/en/latest/api/vllm/config/index.html">vLLM · KV-cache configuration</a>. Verified 2026-08-21.</p>
  </div>
</section>

<section class="s5-section" aria-labelledby="s5-kv-related">
  <div class="s5-section-head"><h2 id="s5-kv-related">Connect context, memory and architecture</h2></div>
  <div class="s5-simple-list">
    <a class="s5-list-row" href="/en/tools/inference-vram/"><span class="s5-list-row__n">01</span><span class="s5-list-row__title">Total inference VRAM</span><span class="s5-list-row__desc">Add weights and runtime reserve around the KV-cache budget.</span><span class="s5-list-row__meta">Tool</span></a>
    <a class="s5-list-row" href="/en/temas/transformer/"><span class="s5-list-row__n">02</span><span class="s5-list-row__title">How the Transformer works</span><span class="s5-list-row__desc">Attention, heads and representations that determine cache geometry.</span><span class="s5-list-row__meta">Concept</span></a>
  </div>
</section>

</div>
