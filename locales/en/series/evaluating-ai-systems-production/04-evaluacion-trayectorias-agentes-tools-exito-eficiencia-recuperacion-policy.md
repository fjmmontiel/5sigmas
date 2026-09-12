---
title: "Evaluating agent and tool trajectories: success, efficiency, recovery, and policy compliance"
description: "How to evaluate an agent beyond the final result: tool selection, arguments, side effects, retries, recovery, stop conditions, efficiency, and policy compliance."
date: 2026-09-13
date_modified: 2026-09-13
keywords: "agent evaluation, trajectory evaluation, tool calls, policy compliance, recovery, retries, efficiency, agent traces, outcome evaluation"
tags:
  - AI
  - Evaluation
  - Agents
  - Reliability
  - Production
---

# Chapter 4 — Evaluating agent and tool trajectories: success, efficiency, recovery, and policy compliance

An agent can finish with the right result after taking an unacceptable path.

It might process a valid refund after skipping a mandatory approval. It might create a reservation, receive a timeout, and repeat the write, leaving two reservations behind. It might solve the task and keep calling tools because it failed to notice that the goal was already satisfied.

The opposite evaluation error also occurs: a benchmark can penalize a perfectly valid trajectory simply because it does not reproduce the sequence written by the task author.

This chapter asks one concrete question:

> **How should we evaluate an agent trajectory without conflating final success, process correctness, recovery, and efficiency?**

We need two distinct evidence objects:

1. **outcome**: the terminal state produced by the system.
2. **trajectory**: the observed sequence of decisions, tool calls, results, state changes, and recovery that led to that outcome.

Anthropic makes this distinction explicit in its guidance on agent evaluations. A transcript or trajectory contains the complete execution, while the outcome is the final state of the environment. Graders can inspect either object or both.[^anthropic-evals] This separation matters because a single success rate cannot explain how success was obtained.

{{ include_html("snippets/articulos-tecnicos/eval-agent-tool-trajectory-success-recovery-policy.html") }}

## A trajectory is a sequence of transitions, not a list of tool names

For reasoning about one execution, represent each step as:

\[
e_t = (o_t, d_t, a_t, r_t, s_{t+1})
\]

where:

- `o_t` is the observation available before acting.
- `d_t` is the agent's decision.
- `a_t` is the executed action, such as a tool call or a response.
- `r_t` is the observed result of that action.
- `s_{t+1}` is the real state after the transition.

The complete trajectory is:

\[
\tau = (e_1, e_2, \ldots, e_T)
\]

and the terminal outcome can be viewed as a function of the final state:

\[
y(\tau) = g(s_{T+1})
\]

This notation does not imply that every internal model thought should be scored. In production, the useful record is the set of **observable events that affect the decision or the world**: relevant inputs, tool calls, arguments, authorization decisions, results, errors, side effects, retries, handoffs, state changes, and the stop condition.

The OpenAI Agents SDK, for example, can record an end-to-end execution as a trace containing spans for agents, turns, generations, function tools, guardrails, and handoffs.[^openai-tracing] That is a framework observability capability. **Having a trace does not make the trajectory correct.** The trace only provides evidence that can later be evaluated.

## Start with the outcome: was the task actually solved?

When the result can be checked directly, the first grader should inspect the real state.

Examples include:

- the reservation exists in the database with the correct dates and user.
- the ticket ended in the expected state.
- the produced file passes deterministic tests.
- the order was cancelled exactly once.
- the user-facing message contains required contractual information.

A simple binary variable is:

\[
S_i = \mathbf{1}[\text{terminal assertions satisfied for trial } i]
\]

This measures **task success**. It does not measure policy compliance or recovery quality.

The current τ-bench/τ² evaluation documentation illustrates the distinction well. In its main domains, an `actions` sequence describes one reference trajectory used to derive a target state. An agent may take a different path and still receive full credit if it reaches an equivalent database state and satisfies the communication requirements.[^tau-evaluation] The repository explicitly warns that matching tool calls against that single reference path is a similarity signal, not a general correctness verdict.

The production implication is important:

> **when multiple trajectories can legitimately solve a task, evaluate the outcome through result invariants rather than imitation of one sequence.**

## Then evaluate the decisions that matter along the way

Not every trajectory difference is important.

Reading the user profile before the reservation may be equivalent to doing those reads in the opposite order. Skipping approval before a write is not.

The evaluation must separate **planning freedom** from **mandatory invariants**.

### Tool selection

Ask whether the chosen action was compatible with the goal and the available state.

Examples:

- use a read tool before an irreversible operation when a precondition is missing.
- avoid a write tool when the user only requested information.
- select the correct endpoint among similar operations.

An exact check works when there is one correct selection. If several paths are valid, the grader should recognize equivalence or verify consequences rather than compare against one expected tool name.

### Arguments and preconditions

The correct tool with the wrong arguments is still a failure.

Record at least:

```text
tool_name
arguments
schema/version
preconditions observed
principal / tenant / resource scope
approval state if required
idempotency or transaction identifier if relevant
```

Correctness can be split into:

- valid schema.
- correct types and formats.
- correct entity.
- semantically correct values.
- correct authorization and scope.

Do not collapse these dimensions into a single `tool_call_pass` if you need to diagnose the error mechanism.

### Side effects

For a state-changing tool, the important event does not end at "the API returned 200."

We need to know:

```text
intent to write
→ authorization / preconditions
→ request sent
→ external result observed
→ actual side effect / state
→ reconciliation if acknowledgement is ambiguous
```

A network response and the real state may diverge. That distinction becomes critical during retries.

## Hard policy compliance should be non-compensatory

Suppose the agent reaches the correct result but exposes another tenant's data or performs an operation without required approval.

An average such as:

```text
0.8 * task_success + 0.2 * policy_score
```

would let a good result compensate for a serious violation. If the policy represents a security, legal, or authorization boundary, that design is wrong.

A more appropriate gate is:

\[
G_i = H_i \land S_i
\]

where `H_i = 1` only when every applicable hard invariant passes.

Quality and efficiency can then be compared among the valid trials.

Examples of hard invariants include:

- do not execute a write without required authorization.
- do not cross tenant boundaries.
- do not send secrets to an unapproved tool.
- do not confirm an action that the backend rejected.
- do not repeat a non-idempotent side effect without reconciling state first.

The *Procedure-Aware Evaluation* paper formalizes the related risk of "corrupt success": tasks that appear successful by outcome while hiding procedural failures.[^procedure-aware] Its reported numbers belong to its benchmark and setup. We use the paper here to support the conceptual separation, not to transfer its percentages to another product.

## Recovery is not the same as counting retries

A retry may be correct recovery or it may make the incident worse.

First classify what happened.

A useful failure event records:

```text
failure_class: timeout | transport | provider | tool_error | policy_denial | parse | unknown
side_effect_status: not_started | definitely_applied | definitely_not_applied | unknown
retryable_under_policy: true | false
state_reconciled_before_retry: true | false | not_applicable
recovery_action: retry | cancel | fallback | human | stop
recovery_outcome: recovered | unrecovered | corrupted
```

### The dangerous case: timeout after a write

Imagine:

```text
create_refund(...)
→ backend applies refund
→ response is lost
→ client observes timeout
```

If the agent treats an ambiguous timeout as evidence that the operation did not happen and repeats the call, it may duplicate the side effect.

The correct trajectory depends on the system contract:

```text
ambiguous timeout
→ query state / use idempotency key / reconcile transaction
→ only then decide retry, cancel, or escalation
```

So **recovery** includes detection, classification, and reconciliation, not just retrying.

For declared recoverable failures, one descriptive metric is:

\[
R_{rec} = \frac{N_{recovered}}{N_{recoverable\ failures\ observed}}
\]

The denominator must be defined. Do not compare `R_rec` across systems if one grader exposes more failures or uses a different taxonomy.

Also report failures that became state corruption. A 100% "retry success" rate can hide duplicate side effects when the grader sees only the final response.

## Stop conditions: finishing well also means knowing when to stop

A trajectory can fail because it stops too early or because it does not stop when it should.

These are different failure classes.

### Premature stop

The agent declares success before a terminal condition is satisfied.

Example: it says "reservation confirmed" after producing a proposal, without evidence that the backend created the reservation.

### Post-success overrun

The task is already solved but the agent keeps acting.

For tasks with an unambiguous first terminal state, define:

\[
O_i = \#\{a_t: t > t_i^*\}
\]

where `t_i^*` is the first point at which the terminal conditions are satisfied.

`O_i > 0` is not automatically bad. A protocol may require a verification action after the main side effect. The contract must declare which post-success actions remain necessary.

The metric is useful for finding loops, late writes, and unnecessary consumption **after controlling for the protocol**.

## Efficiency: fewer steps does not mean a better agent

Minimizing trajectory length without more context creates the wrong incentives.

A careful agent might perform an extra read to verify a precondition before an irreversible operation. Another agent might save one step by assuming the value. If both happen to succeed in an easy simulator case, "fewer calls" rewards the more fragile behavior.

The τ-bench documentation makes this issue explicit. One reference trajectory is not necessarily the only correct route, and action-match metrics are presented as diagnostics rather than general correctness.[^tau-evaluation]

Evaluate efficiency **conditional on comparable success, quality, and compliance**.

For each trial, retain distributions of:

```text
turns
tool_calls
read_calls
write_calls
retries
model_tokens
wall_time
provider/tool latency
monetary cost
post_success_actions
```

Then compare within comparable strata of difficulty and outcome.

A useful aggregate operational-cost metric is:

\[
C_{success} = \frac{\sum_i C_i}{\sum_i S_i}
\]

provided that `C_i` also includes the cost of failed trials that consumed resources. If the product has hard compliance requirements, replace the denominator with successes that also pass those invariants.

Do not turn this formula into a universal ranking. Workload, tools, prices, caches, and success criteria need to be comparable.

## Do not require a "golden trajectory" unless the path is the task

There are tasks where a particular sequence really does matter.

Examples include:

- a regulated protocol requires consent before data access.
- a security workflow requires approval before deployment.
- an educational task is explicitly testing whether the agent follows a process.

In those cases, order or specific actions are part of the criterion.

Even then, it is usually better to express the requirement as **partial-order invariants**:

```text
approval precedes write
authentication precedes protected read
at most one charge side effect
state reconciliation precedes retry after ambiguous write
```

That allows multiple valid plans around the relationships that actually matter.

τ-bench exposes `RewardType.ACTION` for tasks where the reference trajectory is treated as mandatory, and its documentation warns that this assumes the valid solutions have been enumerated or that the path is effectively unique.[^tau-evaluation] Exact-path matching is therefore a strong evaluation choice, not a default.

## Three grader families for a trajectory

### 1. Deterministic verifiers

They are the first choice for observable facts:

- tool names and arguments.
- schema.
- relative ordering between events.
- permissions and approval IDs.
- number of writes.
- terminal state.
- retries and timeouts.
- cost or latency limits.
- duplicate side effects.

Their advantage is clear reproducibility and attribution.

Their limitation is equally clear: they only verify what has been explicitly specified.

### 2. Model-based trajectory graders

They are useful for semantic properties that are difficult to encode exactly:

- whether a decision was supported by the observation available at that point.
- whether the agent interpreted a tool error correctly.
- whether a recovery action was reasonable under a natural-language policy.
- whether the user-facing communication faithfully represents the observed state.

They should follow the discipline from Chapter 5.3: versioned rubric, calibration against humans, an `unknown` output when evidence is insufficient, bias probes, and a declared scope.

Do not show the grader information the agent did not have if the question is "was this decision reasonable at that moment?" Doing so introduces hindsight.

### 3. Human review

Human review is especially useful for:

- high-risk trajectories.
- new taxonomies.
- grader disagreement.
- unexplained failure clusters.
- periodic audits of automatic-grader false positives and false negatives.

Anthropic recommends combining deterministic, model-based, and human graders according to the evidence type, and manually reviewing transcripts to verify that the graders are measuring the intended behavior.[^anthropic-evals]

## The trace must preserve enough causality

A flat log of tool names is usually insufficient.

To reconstruct why a side effect occurred, retain relationships such as:

```text
trace_id
trial_id
parent/child span ids
turn / step index
observed state version
model / policy / tool version
tool request + arguments
authorization decision
tool response
side-effect identity
retry lineage
state reconciliation result
stop reason
timestamps / durations
```

OpenAI Agents SDK tracing is one concrete example of a trace-and-span hierarchy for runner, agent, turns, generations, tools, guardrails, and handoffs.[^openai-tracing] Another framework does not need to copy that schema. The requirement is that the observability model preserve enough relationships to evaluate the trajectory.

There is also a security boundary. Traces and function spans may contain sensitive inputs and outputs. OpenAI's documentation provides controls for disabling capture of sensitive trace data.[^openai-tracing] Evaluation observability does not remove data-minimization, access-control, or retention requirements.

## Do not let the grader use the future to judge the past

A trajectory eval can answer two different questions:

1. **ex post:** was the complete trajectory safe and correct?
2. **local:** given only what was known at `t`, was decision `d_t` justified?

For the second question, the grader needs a causal snapshot:

```text
history available at t
+ relevant policy at t
+ state visible at t
→ judge decision at t
```

If the grader sees a future tool result, it may call a reasonable decision obviously wrong after the fact, or rationalize a reckless decision that happened to work.

Keep these two grader modes separate.

## Case A — Support refund: correct outcome, invalid process

Goal: refund a purchase only when it satisfies policy and high-value refunds have approval.

Observed trajectory:

```text
read_order
→ amount = €600
→ create_refund(€600)
→ success
```

The terminal state contains the correct refund. `task_success = 1`.

But the required `approval_id` was missing before the write. If approval is a hard invariant:

```text
outcome: PASS
policy trajectory: FAIL
release gate: FAIL
```

The evaluation prevents final success from erasing the policy violation.

## Case B — Booking timeout: recovery can duplicate the side effect

Trajectory:

```text
create_booking(idempotency_key=K)
→ timeout
→ lookup_booking(K)
→ found existing booking
→ return confirmation
```

Compare it with:

```text
create_booking()
→ timeout
→ create_booking() again
→ second booking created
```

Both may end with the user seeing "reservation confirmed." Only the first reconciles state before acting again.

The required graders are different:

- outcome verifier: does the correct reservation exist?
- duplicate-side-effect verifier: does exactly one reservation exist?
- recovery verifier: was the ambiguous write reconciled before retry?
- communication verifier: does the user-facing statement match the real state?

## Case C — Coding agent: green tests with an excessive trajectory

A coding agent receives a small task and eventually passes all tests.

We still want to know:

- which files it modified.
- whether it left the allowed scope.
- whether it ran destructive commands.
- how often it repeated the same failure.
- whether it reverted failed changes.
- whether it kept editing after the acceptance criteria were already met.

The outcome verifier can inspect the tests and final diff. Trajectory evaluation adds policy, recovery, and cost evidence.

Do not optimize `tool_calls` before filtering for diff correctness, tests, and scope. An agent with 12 correct calls may be preferable to one with 7 calls that got lucky on one case.

## Build the release gate as layers, not an opaque average

A practical structure is:

```text
Layer 0 — evaluability
complete trace, known versions, verifiable state

Layer 1 — hard invariants
security / authorization / tenant / irreversible side-effect rules

Layer 2 — terminal success
state assertions + required communication

Layer 3 — recovery quality
failure detection + reconciliation + retry/cancel/fallback correctness

Layer 4 — efficiency
latency / tokens / calls / cost, only among comparable valid trials
```

A Layer 1 failure should not disappear because Layer 4 looks excellent.

For release aggregates, report by stratum and failure mode rather than only a global mean:

```text
task_success_rate
hard_policy_violation_rate
recoverable_failure_count
recovered_failure_rate
duplicate_side_effect_count
premature_stop_rate
post_success_action_distribution
tool_calls_per_valid_success
cost_per_valid_success
```

These names are an internal contract, not universal standards. Define the numerator, denominator, and unit in the eval spec.

## The trajectory can expose benchmark failures too

When outcome and trajectory disagree in a surprising way, do not automatically assume the agent is the problem.

The defect may be in:

- the simulator.
- the grader.
- an ambiguous task.
- the initial state.
- the outcome definition.
- the reference policy.

Anthropic documents benchmark cases where grader or harness defects materially changed measured results once the evaluation was corrected.[^anthropic-evals]

Recent τ-bench documentation also clarifies the semantics of `actions` because misreading one reference trajectory as a mandatory sequence would change what is actually being evaluated.[^tau-evaluation]

When a new failure cluster appears, use a workflow such as:

```text
agent failure?
→ inspect trajectory
→ replay / deterministic verifier
→ inspect task + grader + environment
→ classify root cause
→ only then repair agent or eval
```

## What to persist for each trial

A defensible minimum is:

```text
task_id / task_version
trial_id
system_version
model + harness + policy versions
initial_state_fingerprint
trace_id
observable trajectory events
tool versions
arguments / results or safe hashes
policy and approval decisions
side-effect identifiers
retry lineage
reconciliation evidence
stop_reason
terminal_state_fingerprint
outcome assertions
trajectory grader outputs + versions
human review status if applicable
latency / token / cost measurements
```

If privacy or security prevents storing full payloads, keep minimized identifiers, hashes, metadata, and evidence sufficient to reproduce the permitted checks.

Without versioning, two runs with the same eval name may be measuring different systems, tools, or policies.

## Production implication

A useful agent evaluation does not try to reduce the whole execution to one number.

It first answers separate questions:

1. **Was the outcome achieved?**
2. **Were tool calls and arguments correct given the information available?**
3. **Were authorization, policy, and side-effect constraints respected?**
4. **Were failures detected, reconciled, and recovered correctly?**
5. **Did the agent stop at the right time?**
6. **Among valid executions, what are the cost and efficiency distributions?**

Then those dimensions become a release gate aligned with the product's actual risk.

The core principle is:

> **the outcome tells us whether the task ended well; the trajectory tells us whether the system got there in a way we would accept repeating in production.**

The next chapter takes those signals into real traffic: shadow evaluation, canaries, A/B tests, guardrails, and regression gates.

## References

[^anthropic-evals]: Anthropic Engineering, *Demystifying evals for AI agents*, 9 Jan 2026. https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
[^openai-tracing]: OpenAI Agents SDK, *Tracing*. https://openai.github.io/openai-agents-python/tracing/
[^tau-evaluation]: Sierra, *τ-bench / τ² — Task Schema and Evaluation*. https://github.com/sierra-research/tau2-bench/blob/main/docs/evaluation.md
[^procedure-aware]: Hongliu Cao, Ilias Driouich, Eoin Thomas, *Beyond Task Completion: Revealing Corrupt Success in LLM Agents through Procedure-Aware Evaluation*, 3 Mar 2026. https://arxiv.org/abs/2603.03116
