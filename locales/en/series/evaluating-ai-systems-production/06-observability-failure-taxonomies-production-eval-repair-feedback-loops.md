---
title: "Observability, failure taxonomies, and production → eval → repair feedback loops"
description: "How to turn production signals into reproducible cases, versioned evals, verifiable repairs, and regression protection without confusing telemetry with a verdict or overfitting every incident."
date: 2026-09-13
date_modified: 2026-09-13
keywords: "AI observability, failure taxonomy, production monitoring, evals, regression testing, incident response, traces, feedback loop"
tags:
  - AI
  - Evaluation
  - Observability
  - Production
  - Reliability
---

# Chapter 6 — Observability, failure taxonomies, and production → eval → repair feedback loops

The previous chapters built an evaluation system from the inside out: choose the evaluation boundary, design offline sets, calibrate judges, inspect trajectories, and expose changes progressively in production.

One piece remains: close the loop.

Real systems produce signals no static eval can know in advance: new inputs, rare tool combinations, slow dependencies, partial state, abuse, distribution shifts, and failures that appear only after thousands of sessions. Production is indispensable evidence. But **telemetry is not an evaluation verdict**, and an incident should not automatically become a test.

This chapter asks:

> **How do we turn a production signal into reproducible evidence that can guide a repair and prevent regression without training ourselves to memorize the incident?**

{{ include_html("snippets/articulos-tecnicos/eval-production-feedback-loop.html") }}

## Observability and evaluation answer different questions

Observability tries to reconstruct **what happened** in a running system.

It can include:

- aggregate metrics such as error rate, timeouts, tail latency, cost, and abandonment
- event and decision logs
- traces and spans connecting a request to models, retrieval, tools, guardrails, and handoffs
- dependency state
- user feedback
- support tickets, escalations, and incidents

Evaluation asks a different question: **under a declared contract, does the system satisfy the behavior we want to measure?**

That distinction matters. A spike in `tool_error_rate` proves that a signal changed. It does not by itself identify whether the cause was an invalid agent argument, a degraded API, an expired token, a network timeout, or a bug in the instrument itself.

Likewise, a complete trace can explain one execution without telling us whether that execution was correct. OpenAI Agents SDK, for example, documents end-to-end tracing with spans for generations, function tools, guardrails, handoffs, and audio. That improves workflow reconstruction; it does not turn the trace into a grader.[^openai-tracing]

The base rule is:

> **telemetry → hypothesis; reproduction + criterion → eval evidence.**

## Preserve a reproducible system identity first

A failure that cannot be tied to what was actually deployed is difficult to explain.

For each relevant session or task, record enough identity to reconstruct the executed package:

```text
candidate_id
model + snapshot
prompt / policy version
retrieval / index version
tool schema + implementation version
runtime / harness version
routing / fallback policy
feature flags
relevant environment version
```

These fields do not have to live in one trace, but there must be a stable correlation key.

This prevents the anti-pattern:

```text
"the model failed on Tuesday"
```

when Tuesday also introduced a new index, a new tool version, and a regional fallback policy.

## A useful trace preserves causality, not every byte

More data is not automatically better evidence.

Current OpenTelemetry GenAI semantic conventions standardize names for operations and attributes, while warning that input/output messages, retrieval queries, and tool arguments/results may contain sensitive information or PII.[^otel-genai] OpenAI Agents SDK gives a similar warning: generation and function spans may store sensitive inputs and outputs and their capture can be disabled.[^openai-tracing]

An observability contract should therefore answer at least:

```text
which fields are required for diagnosis
which data is redacted or tokenized
who may access it
how long it is retained
which identifiers preserve correlation
which content must NOT persist
```

**Observability does not authorize copying production conversations into an eval set.** A session must pass the applicable privacy, permission, redaction, and retention policy before it becomes evaluation material.

OpenTelemetry semantic conventions also evolve over time. Standardized names improve interoperability, but not every GenAI attribute should be treated as a forever-stable application contract. Instrumentation version belongs in the evidence record.[^otel-semconv]

## From anomaly to failure taxonomy

A taxonomy is not useful because it makes a dashboard tidy. It is useful because failures with the same mechanism can land together even when their surface text differs.

An operational taxonomy can separate at least:

| Family | Example symptom | Diagnostic question |
|---|---|---|
| Input / distribution | new format or language | Did an input assumption stop holding? |
| Retrieval / context | stale answer | Did selection, freshness, ranking, or assembly fail? |
| Model / decision | incorrect reasoning | Does the error appear before any tool action? |
| Tool selection / arguments | right tool, invalid parameters | Did policy choose the wrong action or build the call incorrectly? |
| Side effect / state | duplicate or partial write | Does external state match the intended action? |
| Orchestration / recovery | wrong retry or timeout reconciliation | Did recovery preserve invariants? |
| Policy / safety | unauthorized action | Was a non-compensatory boundary violated? |
| UX / handoff | abandonment or wrong escalation | Did the workflow technically finish but fail the experience? |
| Infrastructure / dependency | slow or unavailable external API | Is system behavior correct under a degraded dependency? |
| Observability | incomplete trace or corrupt metric | Can we trust the collected evidence? |
| Eval / grader | valid behavior marked FAIL | Is the oracle or task wrong? |

The classification should store **symptom** and **cause** separately.

```text
symptom = duplicate_refund
cause = retry_after_ambiguous_timeout_without_state_reconciliation
```

If we store only `duplicate_refund`, the repair can target the wrong layer.

The NIST AI RMF Playbook recommends post-deployment monitoring, feedback mechanisms, incident response, recovery, and change management, together with documenting errors, near misses, and attack patterns.[^nist-manage] It also recommends comparing pre- and post-deployment behavior and using operational cases for testing and monitoring.[^nist-measure] This is risk-management guidance, not a universal taxonomy. Product boundaries still determine the useful categories.

## An incident is not an eval case yet

When production exposes a failure, the wrong path is:

```text
incident
→ copy transcript
→ expected = "do not let this happen again"
→ add to regression suite
```

That mixes private information, accidental context, and an ambiguous criterion.

The useful path is to build a **minimal reproducible case** that preserves the relevant mechanism.

An illustrative receipt — not a standard — could look like:

```yaml
failure_case_id: support-refund-retry-017
observed_at: 2026-09-13T01:22:04Z
candidate_id: voice-support-4f2c
trace_id: redacted:8e4...
source: production_incident
symptom: duplicate_write
failure_family: orchestration_recovery
root_cause_hypothesis: retry_after_ambiguous_timeout
impact: financial_side_effect
reproduction:
  environment: sandbox-refunds-v12
  precondition: refund_not_yet_reconciled
  stimulus: provider_timeout_after_write
expected_invariant:
  - at_most_one_refund
  - reconcile_before_retry
verifier:
  type: deterministic_state_check
  version: refund-invariants-v3
provenance:
  user_content_retained: false
  redaction_policy: prod-to-eval-v2
```

The goal is not to archive the entire incident. It is to preserve **the condition that makes the repair falsifiable**.

## Reproducibility decides which gate you need

Not every production failure belongs in the same eval suite.

### Case A — reproducible system behavior

Suppose that, in a particular state, an agent repeats a write after an ambiguous timeout.

That can become a trajectory eval with a state verifier:

```text
initial state
→ tool call
→ ambiguous timeout
→ recovery decision
→ final external state
```

The repair must show not only that final wording changed but that `at_most_one_write` remains true.

### Case B — infrastructure or capacity failure

Suppose an external provider takes 40 seconds and exhausts the connection pool.

Forcing that incident into a prompt eval may be the wrong abstraction. A reliability, load, or fault-injection gate that reproduces the degraded dependency is more appropriate.

The principle is:

> **move the failure into the narrowest harness that can reproduce its mechanism, then confirm it at the boundary where the risk lives.**

### Case C — insufficient evidence

If the trace is missing, external state cannot be reconstructed, or the event occurred under broken instrumentation, do not invent a cause just to create a test.

Mark the case `INSUFFICIENT_EVIDENCE`, improve instrumentation, and retain the incident as a signal. A test built around an imagined cause can institutionalize the wrong diagnosis.

## Do not overfit the regression suite to individual incidents

Anthropic recommends turning real failures and support tickets into eval cases, prioritized by user impact.[^anthropic-evals] That does not mean storing every incident as a unique independent example.

If twenty tickets represent the same mechanism, twenty nearly identical tests inflate apparent coverage.

Before adding a case:

1. **deduplicate by mechanism**, not just text.
2. define the **equivalence class** you want to protect.
3. add at least one **neighbor case** where correct behavior differs.
4. add a **hard negative** when needed so the repair does not become a universal rule.
5. keep **regression** and **capability** sets distinct.

For example, a bug summarized as “never retry on a timeout” can lead to a naive repair that removes legitimate retries.

A better regression packet covers:

```text
ambiguous timeout after possible write → reconcile, then decide
confirmed pre-write timeout          → retry may be valid
read-only idempotent request         → retry policy can differ
explicit provider failure/no write   → safe recovery path
```

This protects the **invariant** instead of memorizing the incident.

## The grader can also be the failure

A growing regression suite accumulates defects of its own.

When a production-derived case still fails after a repair, inspect:

```text
agent/system behavior
AND task specification
AND environment
AND verifier/grader
```

Anthropic emphasizes reading transcripts and grades because a low score can come from an ambiguous task, a broken harness, or a grader rejecting valid behavior.[^anthropic-evals]

Each new case should therefore version:

- the task or fixture
- the environment
- the verifier or rubric
- the system candidate
- relevant external data

Changing a grader changes the **oracle**. Do not present that as an agent improvement until the two effects are separated.

## Repair loop: test the cause, not only the disappearance of the symptom

A robust repair loop can be written as:

```text
1. detect signal
2. reconstruct execution
3. classify symptom + likely cause
4. reproduce the mechanism
5. create/update the versioned eval
6. implement repair
7. run targeted regression
8. run neighbor / broader regression suite
9. use shadow/canary when real-world risk changes
10. monitor recurrence after deployment
```

Step 8 prevents the classic “fixed this ticket and broke the neighboring class” failure.

Step 10 prevents another mistake: closing the loop in CI. A repair is not fully confirmed until production stops showing the same failure family **without that disappearance being caused by new instrumentation or routing hiding it**.

### Useful loop metrics

There is no universal number that proves a system is repaired. But measures with explicit denominators are useful:

```text
failure_family_rate
reproduction_success_rate
regression_pass_rate
recurrence_after_fix
mean_time_to_detect
mean_time_to_reproduce
mean_time_to_verified_repair
unknown / unclassified failure rate
```

These metrics measure the process as well as the model. A lower `unknown_failure_rate`, for example, can mean better instrumentation and taxonomy rather than better agent behavior.

NIST recommends measuring response and repair times and assessing whether existing metrics are sufficient for detecting emergent risks and guiding improvements.[^nist-measure]

## Three concrete examples

### 1. Correct answer, duplicate write

A support agent ends with “refund completed.” The user-facing response is correct, but the backend contains two refunds.

A success metric based only on final wording can pass this run.

The feedback loop uses the trace to expose:

```text
tool write
→ ambiguous timeout
→ retry without reconciliation
→ second write
```

Taxonomy: `orchestration_recovery + side_effect`.

New eval: external state plus trajectory, not text matching. Repair: idempotency or reconciliation before retry. Regression neighbors: timeout before the write, read-only tool, and idempotent tool.

### 2. Stale retrieval

Users report that the assistant answers with an old policy.

The feedback text is only the symptom. Trace correlation shows affected sessions used `index_version=2026-08-31` after the policy changed.

Taxonomy: `retrieval_context / freshness`.

The reproduction should pin a corpus snapshot and freshness contract. The eval can check selection of the current version and behavior when conflicting documents coexist. The repair may be index invalidation rather than a prompt that says “use recent information.”

### 3. p99 rises, but the model is not the cause

After a release, p99 rises and abandonment increases.

The metric detects the regression. The trace shows that most of the time is spent in a CRM API rather than model generation.

Taxonomy: `dependency / reliability`.

The right gate may be fault injection with a latency budget and cancellation/recovery, followed by canary exposure. Turning this into a language-response eval would create false coverage.

## The loop needs ownership and explicit states

An operating system needs to know what happens after a failure is classified.

A minimal state machine can be:

```text
OBSERVED
→ TRIAGED
→ REPRODUCED | INSUFFICIENT_EVIDENCE
→ EVAL_ADDED | EXISTING_EVAL_COVERS
→ REPAIR_CANDIDATE
→ REGRESSION_PASS
→ RELEASED
→ VERIFIED_IN_PRODUCTION
```

`REGRESSION_PASS` is not `VERIFIED_IN_PRODUCTION`.

It is also useful to preserve states such as:

```text
DUPLICATE_MECHANISM
NOT_PRODUCT_DEFECT
GRADER_DEFECT
INSTRUMENTATION_DEFECT
PRIVACY_BLOCKED
```

This prevents every case from being forced into a single “model bugs” queue.

## What should stay attached to the case

For an auditable loop, retain enough provenance to reconstruct the decision:

```text
production evidence reference
failure taxonomy version
redaction/privacy decision
minimal reproducible fixture
expected invariant
verifier + version
candidate/version that failed
repair candidate/version
eval-set version
release/deploy identity
post-deploy verification evidence
```

No specific platform is required to express this contract.

What matters is that a future reviewer can answer:

> **What did we observe, why do we think it failed, which test represents that mechanism, which change repaired it, and what evidence shows it did not return?**

## Production does not replace evals; evals do not replace production

Anthropic summarizes the operating pattern usefully: automated evals help before launch and in CI/CD, production monitoring finds drift and unanticipated failures, A/B tests validate significant changes, and human review fills gaps and calibrates criteria.[^anthropic-evals]

NIST similarly treats post-deployment monitoring and continuing TEVV as complementary lifecycle activities.[^nist-manage]

No layer is sufficient by itself:

```text
offline eval
≠ production monitoring
≠ incident response
≠ randomized experiment
≠ human review
```

A reliable system connects these layers while preserving the question each one can answer.

## Production rule

**Do not turn telemetry into a score, an incident into a test, or a passing test into proof of root cause.**

Close the loop only when you can traverse it in both directions:

```text
production
→ evidence
→ reproducible mechanism
→ versioned eval
→ repair
→ regression gate
→ controlled deployment
→ production
```

If the same failure returns, do not reflexively add another identical case. First ask whether the repair, coverage, verifier, deployment, taxonomy, or observability failed.

That closes the series: evaluating AI systems in production is not about accumulating scores. It is about building evidence that survives system changes and can explain why a release decision is defensible.

---

[^anthropic-evals]: Anthropic Engineering, [*Demystifying evals for AI agents*](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents), January 9, 2026. It separates evals, production monitoring, A/B testing, and human review; recommends turning real failures into eval cases, reading transcripts, and maintaining regression suites.
[^openai-tracing]: OpenAI Agents SDK, [*Tracing*](https://openai.github.io/openai-agents-python/tracing/). Documents traces/spans for generations, function tools, guardrails, and handoffs, including controls around sensitive captured content.
[^otel-genai]: OpenTelemetry, [*Gen AI semantic attributes*](https://opentelemetry.io/docs/specs/semconv/registry/attributes/gen-ai/). Defines GenAI semantic attributes and warns that messages, retrieval queries, and tool arguments/results may contain sensitive information or PII.
[^otel-semconv]: OpenTelemetry, [*Semantic Conventions 1.44.0*](https://opentelemetry.io/docs/specs/semconv/). Semantic conventions provide a common telemetry vocabulary; stability should be checked for the specific signal/area and version being used.
[^nist-manage]: NIST AI Resource Center, [*AI RMF Playbook — Manage*](https://airc.nist.gov/airmf-resources/playbook/manage/), especially Manage 4.1–4.2 on post-deployment monitoring, incident response, recovery, feedback, and continual improvement. The Playbook is voluntary guidance, not a universal checklist.
[^nist-measure]: NIST AI Resource Center, [*AI RMF Playbook — Measure*](https://airc.nist.gov/airmf-resources/playbook/measure/), especially Measure 2.4 and Measure 4 on production behavior, operational cases, feedback, emergent-risk metrics, and response/repair times.