---
title: LLM Cost & Latency Calculator
description: Estimate cost per request, monthly spend, response time and average concurrency for an LLM workload from tokens, caching, TTFT, generation speed and traffic.
keywords: LLM cost calculator, LLM latency, TTFT, tokens per second, LLM API cost, prompt caching, LLM concurrency
hide:
  - toc
  - navigation
  - footer
---

<link rel="stylesheet" href="/stylesheets/tools.css" />
<script src="/assets/javascripts/tools/llm-cost-latency-core.js" defer></script>
<script src="/assets/javascripts/tools/llm-cost-latency.js" defer></script>

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "LLM Cost & Latency Calculator — 5sigmas",
  "url": "https://5sigmas.com/en/tools/llm-cost-latency/",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Any",
  "isAccessibleForFree": true,
  "description": "Interactive calculator for estimating cost, response latency and average concurrency for language-model workloads.",
  "featureList": [
    "Cost per request and monthly spend",
    "Cached and uncached input",
    "TTFT and generation speed",
    "Average concurrency estimate using Little's law",
    "Shareable scenario and JSON export"
  ],
  "isPartOf": {"@type": "WebSite", "name": "5sigmas", "url": "https://5sigmas.com/en/"}
}
</script>

<div class="s5-landing s5-tool-page" data-s5-llm-calculator data-locale="en">

<section class="s5-page-intro">
  <div class="s5-eyebrow">Tools · LLMs · 01</div>
  <h1>LLM cost and latency in one scenario.</h1>
  <p>Enter request size, workload and response characteristics. The calculator keeps price, response time and capacity separate so you can see which variable is actually limiting the system.</p>
</section>

<div class="s5-tool-summary-strip" aria-label="Scope of the estimate">
  <div><small>Cost model</small><strong>tokens × rate</strong></div>
  <div><small>Latency model</small><strong>TTFT + generation</strong></div>
  <div><small>Capacity model</small><strong>Little's law</strong></div>
</div>

<div class="s5-tool-workbench">
  <form class="s5-tool-controls" data-s5-tool-form aria-label="Calculator assumptions" onsubmit="return false">
    <section class="s5-tool-controls__section">
      <h2>Model and pricing</h2>
      <div class="s5-tool-field-grid s5-tool-field-grid--single">
        <div class="s5-tool-field">
          <label for="s5-en-model">Model or preset</label>
          <select id="s5-en-model" data-field="model" aria-describedby="s5-en-model-note"></select>
          <small id="s5-en-model-note">Presets use verified public pricing; every rate remains editable.</small>
        </div>
      </div>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field">
          <label for="s5-en-pin">Input · USD / 1M tokens</label>
          <input id="s5-en-pin" data-field="inputPrice" type="number" min="0" step="0.001" inputmode="decimal" />
        </div>
        <div class="s5-tool-field">
          <label for="s5-en-pcache">Cached input · USD / 1M</label>
          <input id="s5-en-pcache" data-field="cachedInputPrice" type="number" min="0" step="0.001" inputmode="decimal" />
        </div>
        <div class="s5-tool-field">
          <label for="s5-en-pout">Output · USD / 1M tokens</label>
          <input id="s5-en-pout" data-field="outputPrice" type="number" min="0" step="0.001" inputmode="decimal" />
        </div>
        <div class="s5-tool-field">
          <label for="s5-en-cache">Input served from cache · %</label>
          <input id="s5-en-cache" data-field="cacheHitRate" type="number" min="0" max="100" step="1" inputmode="decimal" value="50" />
        </div>
      </div>
    </section>

    <section class="s5-tool-controls__section">
      <h2>One request</h2>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field">
          <label for="s5-en-input">Input tokens</label>
          <input id="s5-en-input" data-field="inputTokens" type="number" min="0" step="100" inputmode="numeric" value="4000" />
        </div>
        <div class="s5-tool-field">
          <label for="s5-en-output">Output tokens</label>
          <input id="s5-en-output" data-field="outputTokens" type="number" min="0" step="50" inputmode="numeric" value="500" />
        </div>
        <div class="s5-tool-field">
          <label for="s5-en-ttft">TTFT · ms</label>
          <input id="s5-en-ttft" data-field="ttftMs" type="number" min="0" step="50" inputmode="decimal" value="650" />
          <small>Measured time to first token.</small>
        </div>
        <div class="s5-tool-field">
          <label for="s5-en-tps">Generation speed · tokens/s</label>
          <input id="s5-en-tps" data-field="tokensPerSecond" type="number" min="0.01" step="1" inputmode="decimal" value="60" />
          <small>Generation rate after the first token.</small>
        </div>
      </div>
    </section>

    <section class="s5-tool-controls__section">
      <h2>Monthly load and limits</h2>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field">
          <label for="s5-en-rpm">Requests/minute</label>
          <input id="s5-en-rpm" data-field="requestsPerMinute" type="number" min="0" step="1" inputmode="decimal" value="10" />
        </div>
        <div class="s5-tool-field">
          <label for="s5-en-conc">Available concurrency</label>
          <input id="s5-en-conc" data-field="concurrency" type="number" min="0" step="1" inputmode="decimal" value="3" />
        </div>
        <div class="s5-tool-field">
          <label for="s5-en-hours">Active hours/day</label>
          <input id="s5-en-hours" data-field="activeHoursPerDay" type="number" min="0" max="24" step="0.5" inputmode="decimal" value="8" />
        </div>
        <div class="s5-tool-field">
          <label for="s5-en-days">Days/month</label>
          <input id="s5-en-days" data-field="daysPerMonth" type="number" min="0" max="31" step="1" inputmode="numeric" value="22" />
        </div>
        <div class="s5-tool-field">
          <label for="s5-en-budget">Monthly budget · USD</label>
          <input id="s5-en-budget" data-field="monthlyBudgetUsd" type="number" min="0" step="50" inputmode="decimal" value="1500" />
        </div>
        <div class="s5-tool-field">
          <label for="s5-en-target">Response target · ms</label>
          <input id="s5-en-target" data-field="latencyTargetMs" type="number" min="0" step="100" inputmode="decimal" value="10000" />
        </div>
      </div>
      <div class="s5-tool-actions" aria-label="Scenario actions">
        <button class="s5-tool-action" type="button" data-action="share">Copy link</button>
        <button class="s5-tool-action" type="button" data-action="export">Export JSON</button>
        <button class="s5-tool-action" type="button" data-action="reset">Reset</button>
      </div>
      <p class="s5-tool-feedback" data-s5-tool-feedback hidden aria-live="polite"></p>
    </section>
  </form>

  <section class="s5-tool-results" aria-label="Calculated results" aria-live="polite">
    <div class="s5-tool-kpis">
      <div class="s5-tool-kpi">
        <small>Cost / request</small>
        <strong data-output="costPerRequest">—</strong>
        <span>input + cache + output</span>
      </div>
      <div class="s5-tool-kpi">
        <small>Monthly cost</small>
        <strong data-output="monthlyCost">—</strong>
        <span data-output="requestsPerMonth">—</span>
      </div>
      <div class="s5-tool-kpi">
        <small>Response time</small>
        <strong data-output="responseTime">—</strong>
        <span>estimated time to the last token</span>
      </div>
      <div class="s5-tool-kpi">
        <small>Average concurrency required</small>
        <strong data-output="requiredConcurrency">—</strong>
        <span>average load; queues and bursts are not modelled</span>
      </div>
    </div>

    <div class="s5-tool-status-grid" aria-label="Checks against targets">
      <div class="s5-tool-status" data-output="budgetStatus" data-label="Budget">—</div>
      <div class="s5-tool-status" data-output="latencyStatus" data-label="Latency">—</div>
      <div class="s5-tool-status" data-output="capacityStatus" data-label="Capacity">—</div>
    </div>

    <div class="s5-tool-breakdowns">
      <div class="s5-tool-breakdown">
        <div class="s5-tool-breakdown__head"><strong>Where the cost comes from</strong><span>per request</span></div>
        <div class="s5-tool-bar" aria-label="Relative cost breakdown">
          <span data-cost-bar="uncached" title="Uncached input"></span>
          <span data-cost-bar="cached" title="Cached input"></span>
          <span data-cost-bar="output" title="Output"></span>
        </div>
        <div class="s5-tool-legend"><span>Uncached input</span><span>Cached input</span><span>Output</span></div>
      </div>

      <div class="s5-tool-breakdown">
        <div class="s5-tool-breakdown__head"><strong>Where the time comes from</strong><span>complete response</span></div>
        <div class="s5-tool-bar" aria-label="Relative latency breakdown">
          <span data-latency-bar="ttft" title="TTFT"></span>
          <span data-latency-bar="generation" title="Generation"></span>
        </div>
        <div class="s5-tool-legend"><span>TTFT</span><span>Generation after first token</span></div>
      </div>
    </div>

    <div class="s5-tool-detail-grid" aria-label="Latency and capacity details">
      <div><small>TTFT</small><strong data-output="ttft">—</strong></div>
      <div><small>Generation</small><strong data-output="generationTime">—</strong></div>
      <div><small>Approximate capacity</small><strong data-output="capacityRpm">—</strong></div>
      <div><small>Capacity headroom</small><strong data-output="headroom">—</strong></div>
    </div>

    <aside class="s5-tool-source" aria-label="Pricing provenance">
      <div class="s5-tool-source__head">
        <a data-output="sourceLink" target="_blank" rel="noopener noreferrer">Preset</a>
        <span data-output="sourceDate"></span>
      </div>
      <p data-output="sourceNote"></p>
    </aside>
  </section>
</div>

<section class="s5-tool-method" aria-labelledby="s5-tool-method-title">
  <div>
    <div class="s5-eyebrow">Method</div>
    <h2 id="s5-tool-method-title">What it calculates — and what it does not.</h2>
  </div>
  <div class="s5-tool-method__body">
    <p><strong>Cost.</strong> Uncached input, cached input and output tokens are priced separately. Preset rates are a starting point: replace them with your contract, batch pricing or effective rate whenever that better represents your workload.</p>
    <div class="s5-tool-method__formula">cost = (T<sub>in,uncached</sub> × P<sub>in</sub> + T<sub>in,cached</sub> × P<sub>cache</sub> + T<sub>out</sub> × P<sub>out</sub>) / 1,000,000</div>
    <p><strong>Latency.</strong> TTFT covers everything up to the first generated token. The remaining generation is approximated as <code>(output_tokens − 1) / tokens_per_second</code>. This estimates completion time, not perceived streaming latency.</p>
    <div class="s5-tool-method__formula">response_time ≈ TTFT + (T<sub>out</sub> − 1) / generation_rate</div>
    <p><strong>Capacity.</strong> For a stable workload the calculator applies Little's law: average concurrency ≈ arrival rate × service time. This is useful for average capacity planning; it is not a queueing model for bursts, p95/p99 latency, provider rate limits, retries or batching.</p>
    <div class="s5-tool-method__formula">average_concurrency ≈ requests/second × seconds/request</div>
    <p class="s5-tool-method__notes">Tool calls, web search, cache storage, audio/image charges, priority processing, volume discounts and self-hosted infrastructure are excluded unless you fold them into the editable rates. Presets with known long-context pricing rules apply them automatically and disclose the adjustment next to the source.</p>
  </div>
</section>

<section class="s5-section" aria-labelledby="s5-tool-related">
  <div class="s5-section-head">
    <h2 id="s5-tool-related">Interpret the result</h2>
  </div>
  <div class="s5-simple-list">
    <a class="s5-list-row" href="/en/temas/llms/"><span class="s5-list-row__n">01</span><span class="s5-list-row__title">What is an LLM?</span><span class="s5-list-row__desc">Tokens, generation and context before converting them into cost.</span><span class="s5-list-row__meta">Concept</span></a>
    <a class="s5-list-row" href="/en/series/modelos-razonadores/04-latencia-streaming/"><span class="s5-list-row__n">02</span><span class="s5-list-row__title">Latency, streaming and human interaction</span><span class="s5-list-row__desc">Why TTFT, generation rate and completion time describe different user experiences.</span><span class="s5-list-row__meta">Chapter</span></a>
    <a class="s5-list-row" href="/en/articulos-tecnicos/voice-agent-architectures/"><span class="s5-list-row__n">03</span><span class="s5-list-row__title">Voice-agent architectures</span><span class="s5-list-row__desc">How latency budgets compound when the LLM is only one stage in a realtime system.</span><span class="s5-list-row__meta">Engineering</span></a>
  </div>
</section>

<section class="s5-section" aria-labelledby="s5-tool-sources">
  <div class="s5-section-head">
    <h2 id="s5-tool-sources">Preset sources</h2>
  </div>
  <p>The data layer stores the source organization, primary URL and verification date for every preset. This version uses official pages from <a href="https://developers.openai.com/api/docs/models" target="_blank" rel="noopener noreferrer">OpenAI</a>, <a href="https://www.anthropic.com/news/claude-sonnet-5" target="_blank" rel="noopener noreferrer">Anthropic</a> and <a href="https://ai.google.dev/gemini-api/docs/pricing" target="_blank" rel="noopener noreferrer">Google AI for Developers</a>. Prices can change; check the source shown for the selected model before making a contractual decision.</p>
</section>

</div>
