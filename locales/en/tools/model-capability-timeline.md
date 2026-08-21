---
title: Model Capability Timeline — sourced benchmark history
description: Explore how reported results changed across GPQA Diamond, MMMU-Pro, SWE-bench, Toolathlon, and ARC-AGI-2 without mixing benchmark versions or hiding protocol changes.
hide:
  - toc
  - navigation
  - footer
---

<link rel="stylesheet" href="/stylesheets/tools.css" />
<link rel="stylesheet" href="/stylesheets/tools-model-capability-timeline.css" />
<script src="/assets/javascripts/tools/model-capability-timeline-core.js" defer></script>
<script src="/assets/javascripts/tools/model-capability-timeline.js" defer></script>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebApplication","name":"Model Capability Timeline — 5sigmas","url":"https://5sigmas.com/en/tools/model-capability-timeline/","applicationCategory":"EducationalApplication","operatingSystem":"Any","isAccessibleForFree":true,"description":"Timeline explorer for reported benchmark results with point-level provenance, evaluation conditions, and visible methodology discontinuities."}</script>

<div class="s5-landing s5-tool-page s5-model-timeline" data-s5-model-capability-timeline data-locale="en">
<section class="s5-page-intro"><div class="s5-eyebrow">Tools · Data · 14</div><h1>See how one capability changes without turning different benchmarks into one fake curve.</h1><p>Select an evaluation and move through reported results by date. Every point keeps its model, conditions, and source. When the protocol changes, the visualization exposes the break instead of pretending continuity.</p></section>
<div class="s5-tool-summary-strip"><div><small>Time</small><strong>model release date</strong></div><div><small>Measurement</small><strong>one evaluation at a time</strong></div><div><small>Provenance</small><strong>source per point</strong></div><div><small>Limit</small><strong>benchmark ≠ total capability</strong></div></div>

<div class="s5-tool-workbench">
<form class="s5-tool-controls" aria-label="Timeline selection" onsubmit="return false">
<section class="s5-tool-controls__section"><h2>Series</h2><div class="s5-tool-field"><label for="s5-model-timeline-series-en">Benchmark</label><select id="s5-model-timeline-series-en" data-field="series"></select><small>Different benchmarks are never normalized or averaged together.</small></div><div class="s5-tool-actions"><button class="s5-tool-action" type="button" data-action="share">Copy scenario</button><button class="s5-tool-action" type="button" data-action="csv">Export CSV</button><button class="s5-tool-action" type="button" data-action="json">Export JSON</button><button class="s5-tool-action" type="button" data-action="reset">Reset</button></div><p class="s5-tool-feedback" data-s5-tool-feedback hidden aria-live="polite"></p></section>
</form>

<section class="s5-tool-results">
<div class="s5-section-head s5-section-head--with-copy"><div><div class="s5-eyebrow">Selected series</div><h2 data-output="series-title">Loading…</h2></div><p data-output="definition">—</p></div>
<div class="s5-timeline-kpis"><div><small>Latest reported result</small><strong data-output="latest">—</strong><span data-output="latest-model">—</span></div><div><small>Change from first point</small><strong data-output="gain">—</strong><span>descriptive, not causal</span></div><div><small>Time window</small><strong data-output="window">—</strong><span>between first and last point</span></div><div><small>Protocol</small><strong data-output="breaks">—</strong><span data-output="duplicate-note">—</span></div></div>
<section class="s5-timeline-card"><div class="s5-timeline-chart" data-output="chart" role="region" aria-label="Capability timeline chart" tabindex="0"></div></section>
<div class="s5-timeline-context"><section><h3>How to read this line</h3><p data-output="caveat">—</p><p class="s5-timeline-caveat">The slope summarizes published outcomes. It does not isolate model improvement from prompt changes, reasoning effort, harness changes, or evaluation conditions.</p></section><section><h3>Active sources</h3><ul class="s5-timeline-source-list" data-output="sources"></ul></section></div>
<div class="s5-timeline-table-wrap" role="region" aria-label="Series data" tabindex="0"><table class="s5-timeline-table"><thead><tr><th>Date</th><th>Model</th><th>Result</th><th>Protocol</th><th>Conditions</th><th>Source</th></tr></thead><tbody data-output="table-body"></tbody></table></div>
</section></div>

<section class="s5-section"><div class="s5-section-head"><div><div class="s5-eyebrow">Method</div><h2>The timeline keeps differences that leaderboards often erase.</h2></div></div><div class="s5-timeline-method"><div><strong>One metric per series</strong><p>GPQA Diamond, MMMU-Pro, SWE-bench Verified, SWE-Bench Pro, Toolathlon, and ARC-AGI-2 remain separate. They are not converted into a common index.</p></div><div><strong>Versions and protocols stay visible</strong><p>When a source changes problem count, harness, or benchmark version, the series preserves that context. SWE-bench Verified even shows two different GPT-5 results under different protocols.</p></div><div><strong>Point-level provenance</strong><p>Every observation links to the release table that published the value and keeps the reported conditions. The dataset is reviewed on relevant releases and at least every 30 days while active.</p></div></div></section>
<section class="s5-section"><div class="s5-note-feature"><div><div class="s5-eyebrow">v1 scope</div><h2>Comparability first, coverage second.</h2><p>This first version uses OpenAI release tables because they let us chain multiple generations with documented evaluation conditions. It does not yet place other vendors on the same line unless the configuration can be justified as comparable. The dataset architecture can add them later as separate series or protocols when the evidence is strong enough.</p></div><div class="s5-note-feature__meta"><a href="https://openai.com/index/gpt-4-1/">OpenAI · GPT-4.1</a><br /><a href="https://openai.com/index/introducing-gpt-5-for-developers/">OpenAI · GPT-5</a><br /><a href="https://openai.com/index/gpt-5-1-for-developers/">OpenAI · GPT-5.1</a><br /><a href="https://openai.com/index/introducing-gpt-5-2/">OpenAI · GPT-5.2</a><br /><a href="https://openai.com/index/introducing-gpt-5-4/">OpenAI · GPT-5.4</a><br /><a href="https://openai.com/index/gpt-5-6/">OpenAI · GPT-5.6</a><br />Data reviewed: 2026-08-21</div></div></section>
</div>
