---
title: LLM cost and latency calculator
description: Estimate cost per request, monthly spend, response time and approximate concurrency from tokens, prices, TTFT, output speed and traffic.
hide:
  - toc
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "LLM cost and latency calculator",
  "url": "https://5sigmas.com/en/tools/llm-cost-latency/",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Any",
  "isAccessibleForFree": true,
  "inLanguage": "en",
  "description": "Interactive calculator for estimating per-request cost, monthly spend, response latency and approximate concurrency for LLM workloads.",
  "creator": {"@type": "Person", "name": "Francisco Maldonado", "url": "https://5sigmas.com/en/meta/about/"},
  "isPartOf": {"@type": "WebSite", "name": "5sigmas", "url": "https://5sigmas.com/en/"}
}
</script>

<div class="s5-tool-page" data-s5-tool="llm-cost-latency" data-lang="en" data-invalid-message="Check the values: negatives are not supported, cache share must be between 0 and 100%, and output speed must be greater than zero." data-share-copied="Scenario link copied." data-reset-message="Scenario reset." data-downloaded-message="CSV downloaded." data-download-name="5sigmas-llm-cost-latency.csv">

<section class="s5-tool-intro">
  <div class="s5-eyebrow">Tool 01 · Cost and performance</div>
  <h1>LLM cost and latency.</h1>
  <p>Enter the token pattern, the rates you want to evaluate and observed performance. The calculator separates uncached input, cached input and output cost, then estimates response time and the concurrency implied by peak traffic.</p>
  <div class="s5-tool-meta-line">
    <span>Editable prices</span>
    <span>Shareable URL state</span>
    <span>CSV export</span>
  </div>
</section>

<section class="s5-tool-workspace" aria-label="LLM cost and latency calculator">
  <form class="s5-tool-controls" data-s5-tool-form novalidate>
    <div class="s5-tool-controls__group">
      <h2>Tokens per request</h2>
      <div class="s5-tool-control-grid">
        <div class="s5-tool-field">
          <label for="s5-it">Input tokens</label>
          <div class="s5-tool-field__input"><input id="s5-it" data-key="inputTokens" type="number" min="0" step="1" value="1800" inputmode="numeric"><span class="s5-tool-field__unit">tokens</span></div>
          <small>System prompt, history, RAG and the current message.</small>
        </div>
        <div class="s5-tool-field">
          <label for="s5-cp">Input served from cache</label>
          <div class="s5-tool-field__input"><input id="s5-cp" data-key="cachedPct" type="number" min="0" max="100" step="1" value="35" inputmode="decimal"><span class="s5-tool-field__unit">%</span></div>
          <small>Share of input tokens billed at the cached-input rate.</small>
        </div>
        <div class="s5-tool-field">
          <label for="s5-ot">Output tokens</label>
          <div class="s5-tool-field__input"><input id="s5-ot" data-key="outputTokens" type="number" min="0" step="1" value="450" inputmode="numeric"><span class="s5-tool-field__unit">tokens</span></div>
          <small>Average generated length per response.</small>
        </div>
      </div>
    </div>

    <div class="s5-tool-controls__group">
      <h2>Rates</h2>
      <div class="s5-tool-control-grid">
        <div class="s5-tool-field">
          <label for="s5-ip">Uncached input</label>
          <div class="s5-tool-field__input"><input id="s5-ip" data-key="inputPrice" type="number" min="0" step="0.01" value="2.50" inputmode="decimal"><span class="s5-tool-field__unit">$/1M</span></div>
          <small>Illustrative value, not a provider quote.</small>
        </div>
        <div class="s5-tool-field">
          <label for="s5-kp">Cached input</label>
          <div class="s5-tool-field__input"><input id="s5-kp" data-key="cachedPrice" type="number" min="0" step="0.01" value="0.25" inputmode="decimal"><span class="s5-tool-field__unit">$/1M</span></div>
          <small>If caching has no discount, use the same input rate.</small>
        </div>
        <div class="s5-tool-field">
          <label for="s5-op">Output</label>
          <div class="s5-tool-field__input"><input id="s5-op" data-key="outputPrice" type="number" min="0" step="0.01" value="10.00" inputmode="decimal"><span class="s5-tool-field__unit">$/1M</span></div>
          <small>Replace these values with the model's current pricing documentation.</small>
        </div>
      </div>
    </div>

    <div class="s5-tool-controls__group">
      <h2>Observed latency</h2>
      <div class="s5-tool-control-grid">
        <div class="s5-tool-field">
          <label for="s5-ttft">TTFT</label>
          <div class="s5-tool-field__input"><input id="s5-ttft" data-key="ttftMs" type="number" min="0" step="10" value="450" inputmode="numeric"><span class="s5-tool-field__unit">ms</span></div>
          <small>Time until the first model token arrives.</small>
        </div>
        <div class="s5-tool-field">
          <label for="s5-tps">Output speed</label>
          <div class="s5-tool-field__input"><input id="s5-tps" data-key="outputTps" type="number" min="0.01" step="1" value="70" inputmode="decimal"><span class="s5-tool-field__unit">tok/s</span></div>
          <small>Average throughput after generation starts.</small>
        </div>
        <div class="s5-tool-field">
          <label for="s5-oh">Rest of system</label>
          <div class="s5-tool-field__input"><input id="s5-oh" data-key="overheadMs" type="number" min="0" step="10" value="150" inputmode="numeric"><span class="s5-tool-field__unit">ms</span></div>
          <small>Network, serialization, RAG, tools or other non-model stages.</small>
        </div>
      </div>
    </div>

    <div class="s5-tool-controls__group">
      <h2>Traffic</h2>
      <div class="s5-tool-control-grid">
        <div class="s5-tool-field">
          <label for="s5-rd">Requests per day</label>
          <div class="s5-tool-field__input"><input id="s5-rd" data-key="requestsDay" type="number" min="0" step="100" value="10000" inputmode="numeric"><span class="s5-tool-field__unit">req/day</span></div>
          <small>Monthly cost uses 30 days.</small>
        </div>
        <div class="s5-tool-field">
          <label for="s5-rpm">Peak request rate</label>
          <div class="s5-tool-field__input"><input id="s5-rpm" data-key="peakRequestsMin" type="number" min="0" step="1" value="240" inputmode="numeric"><span class="s5-tool-field__unit">req/min</span></div>
          <small>Used to estimate simultaneous in-flight requests.</small>
        </div>
      </div>
    </div>

    <div class="s5-tool-actions" aria-label="Scenario actions">
      <button class="s5-tool-button" type="button" data-action="share">Copy scenario</button>
      <button class="s5-tool-button s5-tool-button--secondary" type="button" data-action="download">Download CSV</button>
      <button class="s5-tool-button s5-tool-button--secondary" type="button" data-action="reset">Reset</button>
    </div>
    <div class="s5-tool-live-status" data-s5-live-status role="status" aria-live="polite"></div>
  </form>

  <div class="s5-tool-results" aria-live="polite">
    <div class="s5-tool-results__primary">
      <div class="s5-tool-metric"><span class="s5-tool-metric__label">Cost per request</span><strong class="s5-tool-metric__value" data-output="request-cost">—</strong><span class="s5-tool-metric__hint">Input + cache + output</span></div>
      <div class="s5-tool-metric"><span class="s5-tool-metric__label">Monthly cost</span><strong class="s5-tool-metric__value" data-output="monthly-cost">—</strong><span class="s5-tool-metric__hint"><span data-output="monthly-requests">—</span> requests / 30 days</span></div>
      <div class="s5-tool-metric"><span class="s5-tool-metric__label">Response time</span><strong class="s5-tool-metric__value" data-output="response-time">—</strong><span class="s5-tool-metric__hint">Overhead + TTFT + generation</span></div>
      <div class="s5-tool-metric"><span class="s5-tool-metric__label">Peak concurrency</span><strong class="s5-tool-metric__value" data-output="peak-concurrency">—</strong><span class="s5-tool-metric__hint">Approximate simultaneous requests</span></div>
    </div>

    <div class="s5-tool-breakdown">
      <div class="s5-tool-breakdown__head"><span>Cost breakdown per request</span><span data-output="thousand-cost">—</span></div>
      <div class="s5-tool-cost-bar" aria-hidden="true"><span data-cost-bar="input"></span><span data-cost-bar="cached"></span><span data-cost-bar="output"></span></div>
      <div class="s5-tool-breakdown__legend">
        <div>Uncached input<strong data-output="input-cost">—</strong></div>
        <div>Cached input<strong data-output="cached-cost">—</strong></div>
        <div>Output<strong data-output="output-cost">—</strong></div>
      </div>
    </div>

    <div class="s5-tool-interpretation">
      <h2>Reading this scenario</h2>
      <p data-s5-interpretation>—</p>
    </div>
    <div class="s5-tool-live-status">Approximate monthly volume: <strong data-output="monthly-tokens">—</strong> tokens. The value shown beside the breakdown is the cost of 1,000 requests.</div>
  </div>
</section>

<section class="s5-tool-method" aria-labelledby="s5-method-title">
  <h2 id="s5-method-title">What this calculates — and what it does not.</h2>
  <div class="s5-tool-method__body">
    <p>The initial prices are an illustrative scenario. They are not current prices for any provider. The calculator deliberately does not maintain a hidden model-pricing database: enter the rates from the current documentation for the model you want to study.</p>
    <span class="s5-tool-method__formula">cost = uncached_input_tokens × input_rate + cached_tokens × cache_rate + output_tokens × output_rate</span>
    <span class="s5-tool-method__formula">latency ≈ overhead + TTFT + output_tokens / tokens_per_second</span>
    <span class="s5-tool-method__formula">peak_concurrency ≈ requests_per_second × response_time</span>
    <p>The third relationship applies the intuition behind Little's law, <em>L = λW</em>, to a stable workload. It is a capacity approximation, not a full queueing model. It does not include provider rate limits, batching, queue delay, retries, output-length distributions, network jitter or latency percentiles. Production sizing should use measured p50/p95/p99 behavior and the real traffic distribution.</p>
    <p>Method reference: John D. C. Little, “A Proof for the Queuing Formula: L = λW”, <em>Operations Research</em> 9(3), 1961, <a href="https://doi.org/10.1287/opre.9.3.383">doi:10.1287/opre.9.3.383</a>.</p>
  </div>
</section>

<section class="s5-tool-related" aria-labelledby="s5-related-title">
  <h2 id="s5-related-title">Go deeper into the mechanism.</h2>
  <div class="s5-tool-related__links">
    <a href="/en/temas/llms/">What an LLM is and how it generates tokens →</a>
    <a href="/en/temas/razonamiento/">Reasoning, cost and test-time compute →</a>
    <a href="/en/articulos-tecnicos/voice-agent-architectures/">Latency in voice-agent architectures →</a>
  </div>
</section>

</div>
