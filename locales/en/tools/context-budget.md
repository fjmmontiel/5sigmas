---
title: Token and context budget planner for LLMs
description: Allocate an LLM context window across system instructions, tools, history, RAG, user input, output reserve and safety headroom; catch overflow before production.
keywords: LLM context window, token budget, context budget, RAG tokens, conversation history tokens, tool schema tokens, max output tokens
hide:
  - toc
  - navigation
  - footer
---

<link rel="stylesheet" href="/stylesheets/tools.css" />
<link rel="stylesheet" href="/stylesheets/tools-context-budget.css" />
<script src="/assets/javascripts/tools/context-budget-core.js" defer></script>
<script src="/assets/javascripts/tools/context-budget.js" defer></script>

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Token and Context Budget Planner — 5sigmas",
  "url": "https://5sigmas.com/en/tools/context-budget/",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Any",
  "isAccessibleForFree": true,
  "description": "Interactive planner for allocating an LLM context window across instructions, tools, history, RAG, user input, output reserve and safety headroom.",
  "featureList": [
    "Explicit input, output and safety budget",
    "System, tools, history, RAG and user-input breakdown",
    "Overflow and headroom detection",
    "Estimated additional turns until context pressure",
    "Shareable scenario and JSON export"
  ],
  "isPartOf": {"@type": "WebSite", "name": "5sigmas", "url": "https://5sigmas.com/"}
}
</script>

<div class="s5-landing s5-tool-page" data-s5-context-budget data-locale="en">

<section class="s5-page-intro">
  <div class="s5-eyebrow">Tools · LLMs · 06</div>
  <h1>Decide what deserves your context budget.</h1>
  <p>A large context window is still a finite budget. Separate instructions, tool schemas, history, RAG context, the current user message, output reserve and operating headroom to see what fits before you truncate or fail.</p>
</section>

<div class="s5-tool-summary-strip" aria-label="Core relationships">
  <div><small>Window</small><strong>input + output + safety</strong></div>
  <div><small>Input</small><strong>system + tools + history + RAG + user</strong></div>
  <div><small>Future pressure</small><strong>headroom ÷ growth per turn</strong></div>
</div>

<div class="s5-tool-workbench">
  <form class="s5-tool-controls" data-s5-tool-form aria-label="Context budget assumptions" onsubmit="return false">
    <section class="s5-tool-controls__section">
      <h2>Limit and reserves</h2>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field"><label for="s5-context-en-limit">Context window · tokens</label><input id="s5-context-en-limit" data-field="contextLimit" type="number" min="1" step="1" inputmode="numeric" value="128000" /></div>
        <div class="s5-tool-field"><label for="s5-context-en-output">Reserved output · tokens</label><input id="s5-context-en-output" data-field="reservedOutput" type="number" min="0" step="1" inputmode="numeric" value="8000" /><small>This is not a prediction. It is the output capacity you want to protect.</small></div>
        <div class="s5-tool-field"><label for="s5-context-en-safety">Safety headroom · tokens</label><input id="s5-context-en-safety" data-field="safetyTokens" type="number" min="0" step="1" inputmode="numeric" value="4096" /><small>Reserve for tokenization variance, dynamic content and unmodeled overhead.</small></div>
        <div class="s5-tool-field"><label for="s5-context-en-growth">History growth per turn · tokens</label><input id="s5-context-en-growth" data-field="historyGrowthPerTurn" type="number" min="0" step="1" inputmode="numeric" value="1800" /><small>Use this to approximate when a long conversation begins to pressure the window.</small></div>
      </div>
      <div class="s5-context-preset-actions" aria-label="Common context-window sizes">
        <button type="button" data-context-preset="32768">32K</button>
        <button type="button" data-context-preset="128000">128K</button>
        <button type="button" data-context-preset="256000">256K</button>
        <button type="button" data-context-preset="400000">400K</button>
        <button type="button" data-context-preset="1050000">1.05M</button>
      </div>
    </section>

    <section class="s5-tool-controls__section">
      <h2>What enters each model call</h2>
      <div class="s5-tool-field-grid">
        <div class="s5-tool-field"><label for="s5-context-en-system">System / developer · tokens</label><input id="s5-context-en-system" data-field="systemTokens" type="number" min="0" step="1" inputmode="numeric" value="2500" /></div>
        <div class="s5-tool-field"><label for="s5-context-en-tools">Tools / schemas · tokens</label><input id="s5-context-en-tools" data-field="toolTokens" type="number" min="0" step="1" inputmode="numeric" value="5000" /></div>
        <div class="s5-tool-field"><label for="s5-context-en-history">History · tokens</label><input id="s5-context-en-history" data-field="historyTokens" type="number" min="0" step="1" inputmode="numeric" value="20000" /></div>
        <div class="s5-tool-field"><label for="s5-context-en-rag">RAG context · tokens</label><input id="s5-context-en-rag" data-field="ragTokens" type="number" min="0" step="1" inputmode="numeric" value="24000" /></div>
        <div class="s5-tool-field"><label for="s5-context-en-user">Current user message · tokens</label><input id="s5-context-en-user" data-field="userTokens" type="number" min="0" step="1" inputmode="numeric" value="2000" /></div>
      </div>
      <div class="s5-tool-actions" aria-label="Scenario actions">
        <button class="s5-tool-action" type="button" data-action="share">Copy link</button>
        <button class="s5-tool-action" type="button" data-action="export">Export JSON</button>
        <button class="s5-tool-action" type="button" data-action="reset">Reset</button>
      </div>
      <p class="s5-tool-feedback" data-s5-tool-feedback hidden aria-live="polite"></p>
    </section>
  </form>

  <section class="s5-tool-results" aria-label="Context budget results" aria-live="polite">
    <div class="s5-tool-kpis">
      <div class="s5-tool-kpi"><small>Planned context</small><strong data-output="planned">—</strong><span>input + output reserve + safety</span></div>
      <div class="s5-tool-kpi"><small>Limit</small><strong data-output="limit">—</strong><span>context window configured for this scenario</span></div>
      <div class="s5-tool-kpi"><small>Available input</small><strong data-output="availableInput">—</strong><span>after protecting output and safety</span></div>
      <div class="s5-tool-kpi"><small>Remaining input</small><strong data-output="remainingInput">—</strong><span>negative means overflow</span></div>
    </div>

    <div class="s5-tool-status-grid" aria-label="Scenario checks">
      <div class="s5-tool-status" data-output="budgetStatus" data-label="Total budget">—</div>
      <div class="s5-tool-status" data-output="reserveStatus" data-label="Output reserve">—</div>
      <div class="s5-tool-status" data-output="growthStatus" data-label="History growth">—</div>
    </div>

    <div class="s5-context-budget-bar-wrap">
      <div class="s5-tool-breakdown__head"><strong>Who occupies the window</strong><span data-output="utilization">—</span></div>
      <div class="s5-context-budget-bar" data-budget-bar role="img" aria-label="Context budget distribution"></div>
      <div class="s5-context-budget-legend" data-budget-legend aria-label="Budget legend"></div>
    </div>

    <div class="s5-tool-detail-grid" aria-label="Budget details">
      <div><small>Available-input use</small><strong data-output="inputUse">—</strong></div>
      <div><small>Overflow</small><strong data-output="overflow">—</strong></div>
      <div><small>Turns until pressure</small><strong data-output="turns">—</strong></div>
      <div><small>Largest block</small><strong data-output="largestBlock">—</strong></div>
    </div>

    <div class="s5-context-pressure" data-budget-pressure aria-label="Scenario interpretation"></div>

    <aside class="s5-tool-source" aria-label="Method provenance">
      <div class="s5-tool-source__head"><a href="https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them" target="_blank" rel="noopener noreferrer">OpenAI · tokens and limits</a><span>Verified 2026-08-21</span></div>
      <p>The planner does not bind itself to a specific model. It treats context as a combined budget and makes output reserve and safety headroom explicit so you can insert the real limits of your provider.</p>
    </aside>
  </section>
</div>

<section class="s5-tool-method" aria-labelledby="s5-context-method-en">
  <div><div class="s5-eyebrow">Method</div><h2 id="s5-context-method-en">Protect what you do not want truncated first.</h2></div>
  <div class="s5-tool-method__body">
    <p><strong>Input budget.</strong> The configured context window is split between tokens already sent to the model, output capacity you want to preserve, and explicit operating headroom.</p>
    <div class="s5-tool-method__formula">available_input = context_window − reserved_output − safety_headroom</div>
    <p><strong>Actual demand.</strong> Input is broken down so growth in history, large tool schemas or additional RAG chunks cannot disappear inside one opaque number.</p>
    <div class="s5-tool-method__formula">used_input = system + tools + history + RAG + user</div>
    <p><strong>Overflow.</strong> When used input exceeds available input, the planner shows exactly how many tokens must be recovered. It does not decide what your product should discard; instead it shows which blocks are large enough to absorb the current reduction.</p>
    <p><strong>Long conversations.</strong> Remaining turns are a linear approximation: current input headroom divided by the history growth you configure. Summarization, compaction and message eviction change that trajectory.</p>
    <p><strong>Limit semantics.</strong> OpenAI documents a maximum combined input-plus-output token limit. In Responses, `max_output_tokens` bounds generation and the truncation strategy can either fail or drop items from the beginning when the input exceeds the context window. That is why this planner separates capacity, output reserve and truncation policy.</p>
    <p class="s5-tool-method__notes">This tool does not estimate tokens from characters or words. Feed it counts from your actual tokenizer or production telemetry because tokenization varies by model and language.</p>
    <p class="s5-tool-method__notes">Primary sources: <a href="https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them">OpenAI · What are tokens and how to count them?</a> and <a href="https://developers.openai.com/api/reference/cli/resources/responses/methods/create">OpenAI Responses API · create</a>. Verified 2026-08-21.</p>
  </div>
</section>

<section class="s5-section" aria-labelledby="s5-context-related-en">
  <div class="s5-section-head"><h2 id="s5-context-related-en">Connect context, cost and architecture</h2></div>
  <div class="s5-simple-list">
    <a class="s5-list-row" href="/en/tools/llm-cost-latency/"><span class="s5-list-row__n">01</span><span class="s5-list-row__title">LLM cost and latency</span><span class="s5-list-row__desc">Turn the token budget into per-request and monthly cost.</span><span class="s5-list-row__meta">Tool</span></a>
    <a class="s5-list-row" href="/en/tools/kv-cache-context/"><span class="s5-list-row__n">02</span><span class="s5-list-row__title">KV cache and context</span><span class="s5-list-row__desc">See what it costs to keep those tokens resident in memory during inference.</span><span class="s5-list-row__meta">Tool</span></a>
    <a class="s5-list-row" href="/en/temas/llms/"><span class="s5-list-row__n">03</span><span class="s5-list-row__title">LLMs</span><span class="s5-list-row__desc">Tokens, autoregressive generation and context as the underlying mechanism.</span><span class="s5-list-row__meta">Concept</span></a>
  </div>
</section>

</div>
