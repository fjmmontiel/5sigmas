---
title: Agent reliability and evaluation — trace playground
description: Evaluate final success, first-pass success, retries, tool decisions, timeouts, policy adherence and trajectory efficiency with explicit release gates.
hide:
  - toc
  - navigation
  - footer
---

<link rel="stylesheet" href="/stylesheets/tools.css" />
<link rel="stylesheet" href="/stylesheets/tools-agent-reliability.css" />
<script src="/assets/javascripts/tools/agent-reliability-core.js" defer></script>
<script src="/assets/javascripts/tools/agent-reliability.js" defer></script>

<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebApplication","name":"Agent Reliability / Eval Playground — 5sigmas","url":"https://5sigmas.com/en/tools/agent-reliability-eval/","applicationCategory":"DeveloperApplication","operatingSystem":"Any","isAccessibleForFree":true,"description":"Interactive playground for evaluating outcome and observable agent-trajectory signals with explicit release gates."}</script>

<div class="s5-landing s5-tool-page s5-agent-reliability" data-s5-agent-reliability data-locale="en">
<section class="s5-page-intro"><div class="s5-eyebrow">Tools · Agents · 11</div><h1>Evaluate whether an agent solves the task and whether its trajectory is reliable.</h1><p>A correct final result can hide a wrong tool call, excessive retries or a fragile path. The playground separates final outcome, observable trace decisions and operational failures, then compares them with release gates you define.</p></section>
<div class="s5-tool-summary-strip"><div><small>Outcome</small><strong>final success, first pass and recovery</strong></div><div><small>Trace</small><strong>correct tools, omissions, steps and retries</strong></div><div><small>Operations</small><strong>timeouts, policy and projection</strong></div></div>

<div class="s5-tool-workbench">
<form class="s5-tool-controls" aria-label="Agent evaluation scenario" onsubmit="return false">
<section class="s5-tool-controls__section"><h2>Task outcome</h2><div class="s5-tool-field-grid">
<div class="s5-tool-field"><label>Evaluated tasks</label><input data-field="tasks" type="number" min="0" step="10" value="200" /></div>
<div class="s5-tool-field"><label>First-pass successes</label><input data-field="firstPassSuccesses" type="number" min="0" step="1" value="148" /></div>
<div class="s5-tool-field"><label>Tasks that entered retry</label><input data-field="retryingTasks" type="number" min="0" step="1" value="42" /></div>
<div class="s5-tool-field"><label>Tasks recovered after retry</label><input data-field="retryRecoveredTasks" type="number" min="0" step="1" value="24" /></div>
<div class="s5-tool-field"><label>Total additional retry attempts</label><input data-field="totalRetryAttempts" type="number" min="0" step="1" value="58" /></div>
</div></section>
<section class="s5-tool-controls__section"><h2>Tools and trajectory</h2><div class="s5-tool-field-grid">
<div class="s5-tool-field"><label>Expected tool decisions</label><input data-field="expectedToolDecisions" type="number" min="0" step="10" value="520" /></div>
<div class="s5-tool-field"><label>Correct decisions</label><input data-field="correctToolDecisions" type="number" min="0" step="1" value="487" /></div>
<div class="s5-tool-field"><label>Wrong tool / invalid arguments</label><input data-field="wrongToolDecisions" type="number" min="0" step="1" value="18" /><small>The remainder is interpreted as a missed required decision.</small></div>
<div class="s5-tool-field"><label>Total observable steps</label><input data-field="totalAgentSteps" type="number" min="0" step="10" value="1360" /></div>
<div class="s5-tool-field"><label>Unnecessary steps by rubric</label><input data-field="unnecessarySteps" type="number" min="0" step="1" value="170" /></div>
</div></section>
<section class="s5-tool-controls__section"><h2>Operations and traffic</h2><div class="s5-tool-field-grid">
<div class="s5-tool-field"><label>Tasks with timeout</label><input data-field="timeoutTasks" type="number" min="0" step="1" value="9" /><small>May overlap other failures; do not add it to the failure rate.</small></div>
<div class="s5-tool-field"><label>Tasks with policy-adherence failure</label><input data-field="policyViolationTasks" type="number" min="0" step="1" value="3" /><small>Do not count guardrails that correctly blocked an action.</small></div>
<div class="s5-tool-field"><label>Projected monthly traffic</label><input data-field="monthlyTasks" type="number" min="0" step="1000" value="100000" /></div>
</div></section>
<section class="s5-tool-controls__section"><h2>Release gates</h2><div class="s5-tool-field-grid">
<div class="s5-tool-field"><label>Minimum final success (%)</label><input data-field="minFinalSuccessPercent" type="number" min="0" max="100" step="0.5" value="85" /></div>
<div class="s5-tool-field"><label>Minimum first-pass success (%)</label><input data-field="minFirstPassPercent" type="number" min="0" max="100" step="0.5" value="70" /></div>
<div class="s5-tool-field"><label>Minimum tool-decision accuracy (%)</label><input data-field="minToolDecisionPercent" type="number" min="0" max="100" step="0.5" value="95" /></div>
<div class="s5-tool-field"><label>Maximum timeout rate (%)</label><input data-field="maxTimeoutPercent" type="number" min="0" max="100" step="0.5" value="5" /></div>
<div class="s5-tool-field"><label>Maximum policy-adherence failure (%)</label><input data-field="maxPolicyViolationPercent" type="number" min="0" max="100" step="0.1" value="1" /></div>
<div class="s5-tool-field"><label>Maximum unnecessary steps (%)</label><input data-field="maxUnnecessaryStepPercent" type="number" min="0" max="100" step="0.5" value="15" /></div>
</div><p class="s5-agent-note">The gates compare point estimates. The 95% intervals are shown separately and are not used to auto-approve a release.</p><div class="s5-tool-actions"><button class="s5-tool-action" type="button" data-action="share">Copy link</button><button class="s5-tool-action" type="button" data-action="export">Export JSON</button><button class="s5-tool-action" type="button" data-action="reset">Reset</button></div><p class="s5-tool-feedback" data-s5-tool-feedback hidden aria-live="polite"></p></section>
</form>

<section class="s5-tool-results" aria-live="polite">
<div class="s5-tool-kpis s5-agent-kpis"><div class="s5-tool-kpi"><small>Final success</small><strong data-output="finalSuccess">—</strong><span data-output="finalSuccessCi">—</span></div><div class="s5-tool-kpi"><small>First pass</small><strong data-output="firstPass">—</strong><span>without retry</span></div><div class="s5-tool-kpi"><small>Correct tool decisions</small><strong data-output="toolAccuracy">—</strong><span data-output="toolAccuracyCi">—</span></div><div class="s5-tool-kpi"><small>Retry recovery</small><strong data-output="retryRecovery">—</strong><span>among retried tasks</span></div></div>
<div class="s5-agent-incidence"><div><small>Timeouts</small><strong data-output="timeoutRate">—</strong></div><div><small>Policy</small><strong data-output="policyRate">—</strong></div><div><small>Missed tool</small><strong data-output="missedToolRate">—</strong></div><div><small>Unnecessary steps</small><strong data-output="unnecessaryRate">—</strong></div></div>
<div class="s5-agent-ops"><div><small>Steps per task</small><strong data-output="stepsPerTask">—</strong></div><div><small>Attempt multiplier</small><strong data-output="attemptMultiplier">—</strong></div><div><small>Not aggregated</small><strong>failures ≠ sum of incidences</strong></div><div><small>Unit</small><strong>task + observable trace</strong></div></div>
<section class="s5-agent-gates"><div class="s5-agent-gates__head"><h2>Release gates</h2><span class="s5-agent-gates__summary" data-output="gateSummary">—</span></div>
<div class="s5-agent-gate" data-gate="finalSuccess"><strong>Final success</strong><span data-gate-actual>—</span><b data-gate-state>—</b></div><div class="s5-agent-gate" data-gate="firstPass"><strong>First pass</strong><span data-gate-actual>—</span><b data-gate-state>—</b></div><div class="s5-agent-gate" data-gate="toolDecision"><strong>Tool decision</strong><span data-gate-actual>—</span><b data-gate-state>—</b></div><div class="s5-agent-gate" data-gate="timeouts"><strong>Timeouts</strong><span data-gate-actual>—</span><b data-gate-state>—</b></div><div class="s5-agent-gate" data-gate="policyViolations"><strong>Policy adherence</strong><span data-gate-actual>—</span><b data-gate-state>—</b></div><div class="s5-agent-gate" data-gate="unnecessarySteps"><strong>Unnecessary steps</strong><span data-gate-actual>—</span><b data-gate-state>—</b></div></section>
<section class="s5-agent-projection"><div class="s5-agent-projection__top"><div><small data-output="monthlyTasks">—</small><strong data-output="monthlyFailures">—</strong><p class="s5-agent-projection__range" data-output="monthlyFailureRange">—</p></div></div><div class="s5-agent-projection__incidence"><div><span>Expected timeouts</span><strong data-output="monthlyTimeouts">—</strong></div><div><span>Expected policy-adherence failures</span><strong data-output="monthlyPolicy">—</strong></div></div></section>
<p class="s5-agent-note"><strong>Limit:</strong> the projection assumes future traffic resembles the evaluated sample. The failure range comes from the Wilson interval for final success; it does not model dataset shift or dependence between tasks.</p>
</section></div>

<section class="s5-section"><div class="s5-section-head"><h2>Outcome and trajectory answer different questions</h2></div><div class="s5-agent-method-grid"><div><strong>End state</strong><p>τ-bench evaluates the final environment state against an annotated goal state.</p></div><div><strong>Observable trace</strong><p>Tool choice, arguments, retries, handoffs and steps help locate the cause of a result. OpenAI calls this structured path evaluation trace grading.</p></div><div><strong>Consistency</strong><p>Measuring consistency requires repeated trials on the same task. We do not reconstruct pass^k from a single success rate.</p></div></div></section>
<section class="s5-section"><div class="s5-note-feature"><div><div class="s5-eyebrow">Sources</div><h2>No hidden composite score.</h2><p>The gates are configurable and are not presented as universal thresholds.</p></div><div class="s5-note-feature__meta"><a href="https://platform.openai.com/docs/guides/trace-grading">OpenAI · Trace grading</a><br /><a href="https://arxiv.org/abs/2406.12045">τ-bench</a><br /><a href="https://arxiv.org/abs/2308.03688">AgentBench</a><br />Reviewed: 2026-08-21</div></div></section>
</div>
