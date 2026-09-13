---
title: "Online evaluation: shadow, canary, A/B, guardrails, and regression gates"
description: "How to evaluate AI-system changes in production without confusing observation, real exposure, and causality: shadow traffic, canaries, A/B experiments, guardrails, rollback, and release gates."
date: 2026-09-13
date_modified: 2026-09-13
keywords: "online evaluation, shadow traffic, canary, A/B testing, guardrails, regression gates, AI systems, progressive delivery"
tags:
  - AI
  - Evaluation
  - Production
  - Reliability
  - Experiments
---

# Chapter 5 — Online evaluation: shadow, canary, A/B, guardrails, and regression gates

A change can pass every offline eval and still fail when it encounters real traffic.

The input distribution shifts, real dependencies enter the path, concurrency no longer looks like the benchmark, user state matters, and some metrics only exist after a person interacts with the product.

But “test in production” is not one method. **Shadow, canary, and A/B answer different questions**:

- a **shadow** runs the candidate on copies of live traffic without using its response to serve the user;
- a **canary** exposes a small share of real traffic to the candidate and watches safety and reliability before expanding;
- an **A/B test** experimentally assigns units to control or treatment to estimate a causal effect under a declared design.

Confusing them leads to bad decisions. A shadow can show that the candidate behaves differently, but not how much a user metric will change. A canary can expose a rise in errors, but percentage traffic routing is not automatically a causal experiment. An A/B test can estimate causal impact and still be too slow or too risky as the first detector of a critical regression.

This chapter asks:

> **What evidence do we need at each online stage to continue, stop, roll back, or expand an AI-system change?**

{{ include_html("snippets/articulos-tecnicos/eval-online-shadow-canary-ab-regression-gates.html") }}

## Before exposing traffic, define the unit of change

A “candidate” should not simply mean “the new model.”

In an AI system, the production experience may depend on:

```text
model + snapshot/version
prompt/system policy
retrieval/index version
tool schemas + tool implementations
runtime/harness
routing/fallback policy
feature flags
post-processing/guardrails
```

If two variants change several layers at once, the online result evaluates the **deployed package**. It does not causally attribute the effect to one layer.

Each release therefore needs a reproducible identity, for example:

```text
candidate_id = hash(
  model_snapshot,
  prompt_version,
  tool_contract_version,
  retrieval_version,
  runtime_version,
  routing_policy
)
```

The identity does not need to be a literal hash, but you must be able to reconstruct what executed for every request.

## Shadow: observe the candidate before giving it authority over the response

Shadow traffic, also called mirroring, copies real requests to a candidate while the stable variant continues to serve the user.

Current Istio documentation describes the boundary precisely: mirrored traffic runs out of band from the primary request path, and responses from the mirrored destination are discarded.[^istio-mirroring]

That makes shadowing useful for questions such as:

- Does the candidate accept the real input distribution?
- Does it produce more tool or schema errors?
- Does latency or resource consumption shift materially?
- Do its outputs or decisions diverge from the stable system?
- Do real cases appear that the offline eval set did not contain?

A descriptive disagreement rate over comparable cases can be written as:

<div class="s5-native-equation" data-equation="shadow-disagreement" tabindex="0" role="group" aria-label="Equation; horizontally scrollable" style="max-width:100%;overflow-x:auto;padding:1rem 0"><math xmlns="http://www.w3.org/1998/Math/MathML" display="block"><msub><mi>D</mi><mrow><mtext>shadow</mtext></mrow></msub><mo>=</mo><mfrac><msub><mi>N</mi><mtext>material disagreements</mtext></msub><msub><mi>N</mi><mtext>comparable shadow trials</mtext></msub></mfrac></math></div>

The numerator needs concrete semantics: different tool selection, a policy violation, a different factual result, a response-class change, and so on. “The strings were not identical” is usually too weak for a generative system.

### Shadowing does not measure real user impact

The candidate response does not determine what the user sees. A shadow therefore cannot directly observe:

- whether users complete their task more successfully;
- whether conversion, retention, or abandonment changes;
- whether slower responses change user behavior;
- whether the user adapts their next action to the candidate output.

Shadow evidence is **counterfactual execution evidence**, not complete evidence about user experience.

### The side-effect trap

“Response discarded” does not mean “execution is harmless.”

If the candidate invokes real write tools, it can create orders, send email, change tickets, or duplicate operations even though its final response never reaches the user.

Safe shadowing needs an explicit boundary such as:

```text
read-only tools
or sandbox/staging side effects
or write suppression / dry-run adapters
or reversible isolated resources
```

If side effects cannot be isolated, request mirroring is not an innocuous test.

## Canary: expose a little real traffic to discover risk before expanding

In a canary, a small share of live traffic actually uses the new variant.

The main goal is usually to reduce **blast radius** while observing production signals such as:

- error rate;
- timeout and cancellation rate;
- tail latency;
- policy violations;
- tool failures;
- cost per request or task;
- sufficiently fast user-experience signals;
- dependency saturation.

Argo Rollouts is a concrete progressive-delivery implementation: it supports weighted steps, pauses, and analysis, and an `AnalysisRun` can allow progression, pause the rollout, or cause an abort according to declared conditions.[^argo-canary][^argo-analysis]

That is a **rollout-controller capability**, not evidence that the selected metrics or thresholds are correct.

### Canary does not mean A/B

A 5% canary may receive different traffic by region, shard, time, customer type, infrastructure, or routing. Even apparently random traffic splitting can correlate with factors that affect the metric.

Therefore:

> **Use canary to ask whether it is safe to expand real exposure. Use a controlled experiment when the question is how much causal effect the change creates.**

You can compare control and canary descriptively, but you should not automatically turn that difference into “lift caused by the candidate.”

### Declare abort conditions before rollout

A canary is useful only if “stop” has operational meaning.

For example:

```text
ABORT if:
  hard_policy_violation > 0
  OR duplicate_write_detected == true
  OR error_rate exceeds the agreed bound
  OR p99 latency exceeds the agreed budget

PAUSE if:
  evidence is insufficient
  OR a critical metric is delayed
  OR dependency data is missing

PROMOTE only if:
  all hard guardrails pass
  AND the minimum observation window completed
  AND no material reliability regression remains
```

Concrete bounds depend on the product and the cost of failure. There is no universal 1%, 5%, or p95 threshold that makes a canary safe.

Argo Rollouts documentation also distinguishes `Failed`, `Successful`, and `Inconclusive` analysis results. That third state matters: “not enough evidence” should not silently become PASS.[^argo-analysis]

## A/B: randomize when you need causal effect

An A/B experiment changes the question.

We are no longer asking only “does the candidate look stable?” We are asking:

> **What changes for the target population when we assign treatment rather than control?**

Under a valid randomized design, a simple difference-in-means estimator is:

<div class="s5-native-equation" data-equation="ab-difference" tabindex="0" role="group" aria-label="Equation; horizontally scrollable" style="max-width:100%;overflow-x:auto;padding:1rem 0"><math xmlns="http://www.w3.org/1998/Math/MathML" display="block"><mover><mi>Δ</mi><mo>^</mo></mover><mo>=</mo><mover><msub><mi>Y</mi><mi>T</mi></msub><mo>¯</mo></mover><mo>−</mo><mover><msub><mi>Y</mi><mi>C</mi></msub><mo>¯</mo></mover></math></div>

That expression receives a causal interpretation only when the design and analysis preserve the required assumptions: correct assignment, appropriate unit, trustworthy logging, actual treatment exposure, and appropriate handling of issues such as interference or attrition.

Microsoft’s experimentation literature describes A/B tests as controlled experiments that use randomization to establish causal effects, and its platform architecture separates execution, logging, and analysis because trust depends on the entire chain.[^microsoft-exp][^microsoft-platform]

### Choose the randomization unit deliberately

Per-request assignment is not always appropriate.

Examples:

- a copilot with persistent memory may require user-level assignment;
- an enterprise agent may require tenant-level assignment so one organization does not mix policies;
- a conversational experience may need sticky session-level assignment;
- a collaborative system may create interference between users, undermining a naive user-level interpretation.

Record the assignment unit, analysis unit, and actual exposure mechanism.

### Validate experiment health before reading treatment effect

A **Sample Ratio Mismatch (SRM)** occurs when the observed group allocation departs from the expected allocation in a way that is inconsistent with the design. Microsoft documents SRM as a symptom of assignment or data-quality problems that can invalidate a decision when the root cause is unknown.[^srm]

The order should therefore be:

```text
assignment health
→ exposure/logging health
→ metric integrity
→ guardrails
→ treatment effect
```

Do not read “+3%” first and only then check whether randomization was broken.

### Guardrail metrics are not decorative secondary metrics

An experiment can improve the primary metric while damaging a dimension the product is unwilling to trade away.

For example:

```text
primary metric:
  task_completion_rate

guardrails:
  unsafe_action_rate
  duplicate_write_rate
  p99 latency
  support_escalation_rate
  cost_per_successful_task
```

Microsoft’s trustworthy-experimentation material emphasizes looking across product dimensions and detecting unintended consequences while the experiment is running, not only after it ends.[^microsoft-during][^metric-pitfalls]

When a metric represents a hard safety or authorization boundary, product lift must not compensate for violating it.

## A guardrail is not just another detector

In this chapter, a **release guardrail** is a condition that constrains a deployment decision.

It may consume evidence from:

- deterministic rules;
- safety monitors;
- reliability metrics;
- calibrated graders;
- human review;
- business signals.

Its operational semantics matter:

```text
if it fails → what action occurs
who can override
what evidence is retained
when retry is allowed
```

A dashboard that turns red but does not constrain any action is not equivalent to a hard gate.

Not every guardrail should be an immediate hard stop either. Noisy or delayed signals may need `PAUSE + review` rather than automatic rollback.

## Regression gate: compose evidence without averaging incompatible risks

A useful release gate should encode the real promotion logic.

For a variant \(v\), one schematic form is:

<div class="s5-native-equation" data-equation="online-release-gate" tabindex="0" role="group" aria-label="Equation; horizontally scrollable" style="max-width:100%;overflow-x:auto;padding:1rem 0"><math xmlns="http://www.w3.org/1998/Math/MathML" display="block"><mi>G</mi><mo>(</mo><mi>v</mi><mo>)</mo><mo>=</mo><msub><mi>H</mi><mrow><mtext>hard</mtext></mrow></msub><mo>∧</mo><msub><mi>R</mi><mrow><mtext>reliability</mtext></mrow></msub><mo>∧</mo><msub><mi>E</mi><mrow><mtext>evidence</mtext></mrow></msub></math></div>

where:

- `H_hard` represents non-compensatory invariants;
- `R_reliability` requires the candidate to remain within its operational budget;
- `E_evidence` requires the stage to have accumulated the evidence declared for its question.

Do not replace these dimensions with an arbitrary average in which a conversion gain offsets a security violation.

### Evidence should progress in stages

A reasonable sequence for a meaningful-risk change is:

```text
offline regression suite
→ shadow
→ small canary
→ wider canary
→ A/B or holdout when causal effect matters
→ progressive rollout
→ post-release monitoring
```

Not every release needs every stage. A CSS change and an agent allowed to transfer money should not share the same protocol.

The principle is to use the cheapest stage that can falsify the change **before** expanding the scope of risk.

## Three concrete cases

### 1. New model in a support assistant

**Offline**: historical cases, hard negatives, and policy checks.

**Shadow**: run the new model on real requests with write tools disabled. Compare routing, escalation, policy violations, latency, and cost.

**Canary**: 1–5% can be a reasonable operational choice for a particular product, but it is not a universal value. Expose real users only after shadowing has not revealed a critical defect. Predeclare safety and reliability abort conditions.

**A/B**: if the final question is whether resolution improves or repeat contacts decrease, use stable experimental assignment and appropriate user-level metrics.

### 2. New workflow for an agent that performs writes

Real shadow traffic with active writes would be dangerous.

Use:

```text
real requests
→ candidate workflow
→ sandbox / write suppression
→ compare intended actions
```

Then use a canary limited to explicitly eligible accounts or tenants, with idempotency and reconciliation instrumented and an operational rollback already tested.

Do not call lower latency an improvement if it came from skipping a mandatory validation step.

### 3. Low-risk prompt change

If offline evaluation shows parity and the change has no side effects, shadow + A/B may be more informative than a long canary phase.

The A/B test still needs variant identity, stable assignment, trustworthy metrics, and guardrails. “It was only a prompt change” does not remove experimental requirements.

## Design errors that should produce CHANGES_REQUIRED

### “Shadow passed, so users will be better off”

No. The shadow response was never served to the user.

### “The canary is 2% better, therefore we have +2% lift”

Not necessarily. Without randomized design and appropriate analysis, the difference may reflect selection or confounding.

### “The A/B result is significant, so we can ignore the incident increase”

No. A hard guardrail must block even when the primary metric improves.

### “The rollout controller says Success, so the product hypothesis is validated”

No. The controller only evaluates the conditions you configured. Argo Rollouts can automate promotion or abort from metrics, but it does not decide which metric represents value or safety.[^argo-analysis]

### “We watched the dashboard until it turned green”

That creates an implicit stopping rule and makes the evidence harder to interpret. Define minimum windows, stopping conditions, and confirmatory versus exploratory analyses before launch.

### “The expected split was 50/50, but we got 57/43 and analyzed it anyway”

An unexplained SRM is a trustworthiness problem, not a minor statistical imperfection.[^srm]

## Record the contract for every online eval

A minimal receipt should include:

```text
candidate_id / control_id
traffic stage: shadow | canary | experiment | rollout
start/end timestamps
eligible population
assignment unit + assignment mechanism
exposure definition
side-effect policy
primary metrics
guardrail metrics
metric windows + denominators
abort/pause/promote rules
rollback target
logging/schema versions
known exclusions
final decision + approver/automation
```

For A/B, add the hypothesis, prespecified analysis, expected allocation, and health checks such as SRM.

For canary, add the real traffic weights or steps, exposure duration, and the routing mechanism that created the cohort.

For shadow, add which responses and side effects were suppressed and how control/candidate executions were paired.

## Do not discard the evidence after promotion

After the candidate wins, retain:

- which version was evaluated;
- which cohorts were exposed;
- which guardrails passed;
- which alerts occurred;
- which rollout or rollback actions ran;
- which results were descriptive and which were causal;
- which delayed data arrived after the decision.

This leads directly into the next chapter: online evaluation remains useful only when observability, failure taxonomy, and repair feed production evidence back into offline evals.

## Production rule

> **Shadow answers “how does the candidate behave on real traffic without serving it?” Canary answers “is it safe enough to expand real exposure?” A/B answers “what causal effect does treatment produce under this design?” Guardrails constrain which risks are acceptable, and the regression gate decides whether the available evidence is sufficient to move forward.**

System quality depends less on having many dashboards than on giving every stage a question, population, variant identity, side-effect boundary, and explicit decision.

---

## Primary sources

[^istio-mirroring]: Istio. *Mirroring*. https://istio.io/latest/docs/tasks/traffic-management/mirroring/

[^argo-canary]: Argo Rollouts. *Canary*. https://argo-rollouts.readthedocs.io/en/stable/features/canary/

[^argo-analysis]: Argo Rollouts. *Analysis & Progressive Delivery*. https://argo-rollouts.readthedocs.io/en/stable/features/analysis/

[^microsoft-exp]: Kohavi, R. et al. *Online Experimentation at Microsoft*. Microsoft Research, 2009. https://www.microsoft.com/en-us/research/publication/online-experimentation-at-microsoft/

[^microsoft-platform]: Gupta, S. et al. *The Anatomy of a Large-Scale Experimentation Platform*. IEEE ICSA, 2018. https://www.microsoft.com/en-us/research/publication/the-anatomy-of-a-large-scale-experimentation-platform/

[^srm]: Fabijan, A. et al. *Diagnosing Sample Ratio Mismatch in Online Controlled Experiments: A Taxonomy and Rules of Thumb for Practitioners*. KDD, 2019. https://www.microsoft.com/en-us/research/publication/diagnosing-sample-ratio-mismatch-in-online-controlled-experiments-a-taxonomy-and-rules-of-thumb-for-practitioners/

[^microsoft-during]: Machmouchi, W., Gupta, S., Zhang, R. *Patterns of Trustworthy Experimentation: During-Experiment Stage*. Microsoft Experimentation Platform, 2021. https://www.microsoft.com/en-us/research/articles/patterns-of-trustworthy-experimentation-during-experiment-stage/

[^metric-pitfalls]: Dmitriev, P. et al. *A Dirty Dozen: Twelve Common Metric Interpretation Pitfalls in Online Controlled Experiments*. KDD, 2017. https://www.microsoft.com/en-us/research/publication/a-dirty-dozen-twelve-common-metric-interpretation-pitfalls-in-online-controlled-experiments/
