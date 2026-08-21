---
title: Model Price/Performance Explorer
description: Compare cost per request, Artificial Analysis Intelligence Index, output speed, TTFT and context for current AI models with explicit sources and assumptions.
keywords: compare AI models, LLM price performance, LLM benchmark, Artificial Analysis Intelligence Index, tokens per second, AI model TTFT
hide:
  - toc
  - navigation
  - footer
---

<link rel="stylesheet" href="/stylesheets/tools.css" />
<script src="/assets/javascripts/tools/model-price-performance-core.js" defer></script>
<script src="/assets/javascripts/tools/model-price-performance.js" defer></script>

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Model Price/Performance Explorer — 5sigmas",
  "url": "https://5sigmas.com/en/tools/model-price-performance/",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Any",
  "isAccessibleForFree": true,
  "description": "Interactive explorer for comparing workload cost, measured intelligence, output speed, latency and context across AI models with explicit provenance.",
  "featureList": [
    "Cost per request for an editable workload",
    "Artificial Analysis Intelligence Index",
    "Measured output speed and TTFT",
    "Context window",
    "Price/intelligence Pareto frontier",
    "Filters, shareable state and CSV export"
  ],
  "isPartOf": {"@type": "WebSite", "name": "5sigmas", "url": "https://5sigmas.com/en/"}
}
</script>

<div class="s5-landing s5-tool-page" data-s5-model-explorer data-locale="en">

<section class="s5-page-intro">
  <div class="s5-eyebrow">Tools · Models · 02</div>
  <h1>Compare models for your workload, not with one universal ranking.</h1>
  <p>Set request size and filter by measured intelligence, latency, context or cost. The explorer keeps provider pricing separate from independent Artificial Analysis measurements so you can see the trade-off among quality, speed and spend.</p>
</section>

<div class="s5-tool-summary-strip" aria-label="Data used in the comparison">
  <div><small>Quality</small><strong>Intelligence Index</strong></div>
  <div><small>Performance</small><strong>tokens/s + TTFT</strong></div>
  <div><small>Price</small><strong>current first-party API</strong></div>
</div>

<div class="s5-tool-workbench s5-model-workbench">
  <form class="s5-tool-controls" data-s5-tool-form aria-label="Explorer assumptions and filters" onsubmit="return false">
    <section class="s5-tool-controls__section">
      <h2>Workload</h2>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field">
          <label for="s5-model-en-input">Input tokens</label>
          <input id="s5-model-en-input" data-field="inputTokens" type="number" min="0" step="500" inputmode="numeric" value="4000" />
        </div>
        <div class="s5-tool-field">
          <label for="s5-model-en-output">Billed output tokens</label>
          <input id="s5-model-en-output" data-field="outputTokens" type="number" min="0" step="100" inputmode="numeric" value="500" />
        </div>
      </div>
      <p class="s5-tool-control-note">Displayed cost uses these quantities and current standard rates. Published long-context pricing rules are applied automatically when relevant.</p>
    </section>

    <section class="s5-tool-controls__section">
      <h2>Filters</h2>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field">
          <label for="s5-model-en-provider">Provider</label>
          <select id="s5-model-en-provider" data-field="provider"></select>
        </div>
        <div class="s5-tool-field">
          <label for="s5-model-en-quality">Minimum index</label>
          <input id="s5-model-en-quality" data-field="minIntelligence" type="number" min="0" step="1" inputmode="numeric" value="0" />
        </div>
        <div class="s5-tool-field">
          <label for="s5-model-en-ttft">Maximum TTFT · s</label>
          <input id="s5-model-en-ttft" data-field="maxTtftSeconds" type="number" min="0" step="1" inputmode="decimal" value="0" />
          <small>0 = no limit.</small>
        </div>
        <div class="s5-tool-field">
          <label for="s5-model-en-context">Minimum context · tokens</label>
          <input id="s5-model-en-context" data-field="minContextTokens" type="number" min="0" step="1000" inputmode="numeric" value="0" />
          <small>0 = no limit.</small>
        </div>
        <div class="s5-tool-field">
          <label for="s5-model-en-cost">Maximum cost/request · USD</label>
          <input id="s5-model-en-cost" data-field="maxCostPerRequest" type="number" min="0" step="0.001" inputmode="decimal" value="0" />
          <small>0 = no limit.</small>
        </div>
      </div>
    </section>

    <section class="s5-tool-controls__section">
      <h2>View</h2>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field">
          <label for="s5-model-en-x">X axis</label>
          <select id="s5-model-en-x" data-field="xAxis">
            <option value="cost" selected>Cost per request</option>
            <option value="intelligence">Intelligence Index</option>
            <option value="speed">Output speed</option>
            <option value="latency">TTFT</option>
            <option value="context">Context</option>
          </select>
        </div>
        <div class="s5-tool-field">
          <label for="s5-model-en-y">Y axis</label>
          <select id="s5-model-en-y" data-field="yAxis">
            <option value="intelligence" selected>Intelligence Index</option>
            <option value="cost">Cost per request</option>
            <option value="speed">Output speed</option>
            <option value="latency">TTFT</option>
            <option value="context">Context</option>
          </select>
        </div>
        <div class="s5-tool-field">
          <label for="s5-model-en-sort">Table order</label>
          <select id="s5-model-en-sort" data-field="sortBy">
            <option value="frontier" selected>Frontier → index</option>
            <option value="intelligence">Highest index</option>
            <option value="cost">Lowest cost</option>
            <option value="speed">Highest speed</option>
            <option value="latency">Lowest TTFT</option>
            <option value="context">Largest context</option>
          </select>
        </div>
      </div>
      <div class="s5-tool-actions" aria-label="Scenario actions">
        <button class="s5-tool-action" type="button" data-action="share">Copy link</button>
        <button class="s5-tool-action" type="button" data-action="export">Export CSV</button>
        <button class="s5-tool-action" type="button" data-action="reset">Reset</button>
      </div>
      <p class="s5-tool-feedback" data-s5-tool-feedback hidden aria-live="polite"></p>
    </section>
  </form>

  <section class="s5-tool-results s5-model-results" aria-label="Model comparison" aria-live="polite">
    <div class="s5-model-counts">
      <div><small>Visible</small><strong data-output="visibleCount">—</strong></div>
      <div><small>On frontier</small><strong data-output="frontierCount">—</strong></div>
      <p data-output="summarySentence">Loading data…</p>
    </div>

    <div class="s5-tool-kpis s5-model-kpis" aria-label="References for the filtered set">
      <div class="s5-tool-kpi" data-output="smartest"><small>Highest index</small><strong>—</strong></div>
      <div class="s5-tool-kpi" data-output="cheapest"><small>Lowest cost</small><strong>—</strong></div>
      <div class="s5-tool-kpi" data-output="fastest"><small>Highest speed</small><strong>—</strong></div>
      <div class="s5-tool-kpi" data-output="lowestLatency"><small>Lowest TTFT</small><strong>—</strong></div>
    </div>

    <section class="s5-model-chart-wrap" aria-labelledby="s5-model-chart-title">
      <div class="s5-tool-breakdown__head"><strong id="s5-model-chart-title">Comparison map</strong><span>select a point to inspect its provenance</span></div>
      <div class="s5-model-chart" data-model-chart>
        <div class="s5-model-chart__ylabel" data-output="chartYLabel">Intelligence Index</div>
        <div class="s5-model-chart__plot">
          <span class="s5-model-chart__ymax" data-output="chartYMax"></span>
          <span class="s5-model-chart__ymin" data-output="chartYMin"></span>
          <div class="s5-model-chart__points" data-model-chart-points></div>
          <p class="s5-model-chart__empty" data-output="chartEmpty"></p>
        </div>
        <div class="s5-model-chart__xscale"><span data-output="chartXMin"></span><strong data-output="chartXLabel">Cost per request</strong><span data-output="chartXMax"></span></div>
      </div>
      <p class="s5-model-frontier-note"><strong>Price/intelligence frontier:</strong> a model is included when no other model achieves both an equal-or-higher index and an equal-or-lower cost for the workload you defined.</p>
    </section>

    <aside class="s5-model-focus" data-model-focus aria-live="polite"></aside>
  </section>
</div>

<section class="s5-section s5-model-table-section" aria-labelledby="s5-model-table-title">
  <div class="s5-section-head s5-section-head--with-copy">
    <div><div class="s5-eyebrow">Comparable data</div><h2 id="s5-model-table-title">The same comparison, without hiding dimensions.</h2></div>
    <p>Reasoning variants are compared as distinct configurations. A higher index does not mean a model is better for every task.</p>
  </div>
  <div class="s5-model-table-scroll" role="region" aria-label="Model comparison table" tabindex="0">
    <table class="s5-model-table">
      <thead><tr><th>Model</th><th>Cost</th><th>Index</th><th>tokens/s</th><th>TTFT</th><th>Context</th><th>Read</th></tr></thead>
      <tbody data-model-table-body></tbody>
    </table>
  </div>
</section>

<section class="s5-tool-method" aria-labelledby="s5-model-method-title">
  <div><div class="s5-eyebrow">Method</div><h2 id="s5-model-method-title">What the numbers mean.</h2></div>
  <div class="s5-tool-method__body">
    <p><strong>Cost.</strong> The explorer applies each provider's current public standard price to the token counts you define. For GPT-5.6 it also applies the published multiplier when input exceeds 272k tokens. Cache, tools, search, discounts, batch pricing and premium tiers are excluded.</p>
    <div class="s5-tool-method__formula">request_cost = T<sub>input</sub> × P<sub>input</sub> / 10⁶ + T<sub>output</sub> × P<sub>output</sub> / 10⁶</div>
    <p><strong>Intelligence Index.</strong> This is Artificial Analysis's composite index for the named configuration. It aggregates multiple evaluations covering reasoning, knowledge, coding and tool use. It is a useful comparison signal, not a universal measure of "intelligence" and not a substitute for your own evals.</p>
    <p><strong>Output speed and TTFT.</strong> Artificial Analysis measures them against live APIs. <em>tokens/s</em> describes generation speed after output starts; TTFT measures time to the first token. For reasoning models, latency can be dominated by deliberation and vary substantially with the selected reasoning effort.</p>
    <p><strong>Frontier.</strong> There is no hidden composite score and no arbitrary weighting. The Pareto frontier only identifies configurations that are not simultaneously dominated on both cost and Intelligence Index.</p>
    <p class="s5-tool-method__notes">Data verified August 21, 2026. Performance measurements and benchmarks change; this is deliberately a small curated set containing only configurations for which price, specifications and performance can be maintained with explicit provenance.</p>
  </div>
</section>

<section class="s5-section" aria-labelledby="s5-model-sources-title">
  <details class="s5-model-sources-details">
    <summary id="s5-model-sources-title">Sources and verification date</summary>
    <div class="s5-model-sources" data-model-sources></div>
  </details>
</section>

<section class="s5-section" aria-labelledby="s5-model-related">
  <div class="s5-section-head"><h2 id="s5-model-related">For a better model decision</h2></div>
  <div class="s5-simple-list">
    <a class="s5-list-row" href="/en/topics/model-evaluation/"><span class="s5-list-row__n">01</span><span class="s5-list-row__title">Model evaluation</span><span class="s5-list-row__desc">Why a benchmark is not the objective and how to build representative evals.</span><span class="s5-list-row__meta">Concept</span></a>
    <a class="s5-list-row" href="/en/tools/llm-cost-latency/"><span class="s5-list-row__n">02</span><span class="s5-list-row__title">LLM cost and latency</span><span class="s5-list-row__desc">Move from model comparison to traffic, concurrency and latency budgeting.</span><span class="s5-list-row__meta">Tool</span></a>
    <a class="s5-list-row" href="/en/topics/llms/"><span class="s5-list-row__n">03</span><span class="s5-list-row__title">What is an LLM?</span><span class="s5-list-row__desc">Tokens, context and generation behind these metrics.</span><span class="s5-list-row__meta">Concept</span></a>
  </div>
</section>

</div>
