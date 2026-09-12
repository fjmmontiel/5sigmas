---
title: "What to evaluate: model, component, system, workflow, and trajectory"
description: "How to choose the right evaluation boundary for AI systems, separate local diagnosis from end-to-end evidence, and avoid attributing system behavior to the model when the mechanism lives elsewhere."
date: 2026-09-12
date_modified: 2026-09-12
keywords: "AI system evaluation, evals, model eval, component eval, system eval, workflow eval, trajectory eval, agent evals, trace grading"
tags:
  - AI
  - Evaluation
  - Agents
  - Production
  - Reliability
---

# Chapter 1 — What to evaluate: model, component, system, workflow, and trajectory

When an AI system fails, the first question should not be “which benchmark should we run?” It should be **“which boundary contains the hypothesis we need to test?”**

If the model changed, isolating model behavior may be useful. If the retriever changed, the retriever needs its own evaluation. If the policy that decides when to call a tool changed, the relevant object is the workflow. If the failure only appears after several calls, retries, and state mutations, a single model response does not contain the mechanism we need to observe.

A score only describes what the harness actually executed and measured. NIST currently offers two complementary examples of this distinction. **AITE** uses a sequestered testbed to evaluate model performance on blind data, while **TEVV-Athlon** is framed as an adaptable approach for evaluating AI systems and their real-world outcomes.[^nist-aite][^nist-tevv] They are not two names for the same evaluation boundary.

{{ include_html("snippets/articulos-tecnicos/eval-boundary-system-workflow-trajectory.html") }}

## Start by defining the object, not the metric

A useful abstraction for an AI system is:

\[
(o, \tau, s_f)
=
S(x, e; M, C, \pi)
\]

where:

- `x` is the task or input
- `e` is the environment, including data, tools, permissions, initial state, network, and dependencies
- `M` is the model or set of models
- `C` represents components such as retrievers, rerankers, parsers, guardrails, and tool adapters
- `π` is the workflow policy that decides what to do, in which order, and under which conditions
- `τ` is the **realized trajectory**, including messages, decisions, tool calls, observations, retries, and state transitions
- `o` is the observable result and `s_f` is the relevant final state

This notation is not an architecture prescription. Its purpose is to locate the variable that changed and identify what must remain fixed if we want to attribute an effect to that change.

A useful evaluation needs at least four explicit decisions:

1. **Object:** what exactly are we evaluating?
2. **Boundary:** what is inside and outside the system under test?
3. **Evidence:** what do we observe: output, final state, trajectory, latency, cost, safety?
4. **Attribution:** what conclusion does this boundary support, and what does it not support?

MLPerf formalizes the same discipline in another domain through the **System Under Test (SUT)** concept. The measured hardware and software are declared as a specific boundary, and the traffic scenario is part of the benchmark definition.[^mlperf-rules] Generative systems need the same precision even when the boundary includes agent logic, tools, and mutable state.

## Level 1 — Evaluate the model

A **model eval** tries to measure model behavior under a controlled harness.

Examples include:

- answering questions with a fixed prompt
- structured extraction against a defined schema
- classification over a labeled dataset
- code generation with a fixed harness, tool set, and environment

Conceptually:

\[
\text{score}_{model}
=
G(M(x; c, d), y^*)
\]

where `c` is the prompt/context, `d` is decoding or inference configuration, and `G` is the grader.

The main advantage is diagnostic isolation. If `c`, `d`, the dataset, and the grader stay constant, two models can be compared with relatively little confounding.

The limit matters just as much: **that result does not automatically describe the product**. A model that performs better inside this boundary can make the system worse if it increases latency, breaks a format assumed by a parser, changes tool-calling behavior, or interacts poorly with the workflow.

Even benchmarks described as agentic often fix a specific harness. Google DeepMind’s May 2026 Gemini 3.5 Flash model card, for example, reports Terminal-bench 2.1 with the Terminus-2 harness. That setup detail is part of the evaluated configuration, not methodological decoration.[^gemini-card]

### What a model eval can support

It can support a statement such as:

> On this dataset, with this prompt, harness, inference configuration, and grader, model B outperforms model A on the defined metric.

It does not by itself support:

> Production will be better with model B.

That second claim requires a wider boundary.

## Level 2 — Evaluate a component

A **component eval** isolates a module that transforms an input into an output consumed by the rest of the system.

Common examples are:

- retriever: query → documents
- reranker: candidates → ordering
- intent classifier: message → class
- parser: text → structured object
- guardrail: input/output → allow, block, or label
- tool adapter: logical call → normalized request/response

If the retriever is changing, only measuring the final agent response can hide the mechanism. Retrieval failures can be compensated for by the model in some cases and amplified in others.

A component boundary makes local metrics meaningful. For retrieval, for example:

\[
Recall@k = \frac{|R_k \cap R^*|}{|R^*|}
\]

Yet **higher Recall@k does not prove higher system success**. The retriever may surface more relevant evidence and more noise at the same time. It may also increase context size, cost, latency, or downstream confusion.

The practical pattern is therefore two-stage:

1. use the component eval to test whether the intended local mechanism improved
2. confirm at a wider boundary that the local gain survives the rest of the system

## Level 3 — Evaluate the workflow

The **workflow** is the policy connecting components and choosing the path through them. It decides which model to use, when to call a tool, when to ask for clarification, when to retry, when to escalate, and when to stop.

Two systems can use the same model and tools yet behave very differently because `π` changed.

For example:

```text
request
  ↓
classify intent
  ↓
retrieve policy
  ↓
model decides action
  ├─ answer
  ├─ call tool
  └─ escalate
```

Changing a timeout, retry condition, or escalation rule is a workflow change even when the model is identical.

A workflow eval asks questions such as:

- Does the policy choose the correct branch?
- Does it call the tool only when appropriate?
- Does it respect the retry budget?
- Does it preserve state invariants across steps?
- Does it terminate correctly?
- Can it recover from a failed dependency without repeating non-idempotent effects?

OpenAI currently describes **Trace Grading** as an end-to-end way to evaluate agentic workflows and identify weaknesses across execution.[^openai-agentkit] That capability does not make every trace score a product-level metric. The actual boundary still depends on which environment, tools, and graders were included.

## Level 4 — Evaluate the trajectory

A **trajectory** is not another word for workflow.

- The **workflow** describes the rules or policy that can generate many paths.
- The **trajectory** `τ` is the path that actually occurred in one trial.

Anthropic defines a transcript, trace, or trajectory as the complete record of a trial, including outputs, tool calls, available reasoning, intermediate results, and interactions. It separately defines the **outcome** as the final state of the environment.[^anthropic-evals]

We can write a trajectory as:

\[
\tau_i
=
(a_1, z_1, a_2, z_2, \ldots, a_T, z_T)
\]

for trial `i`, where `a_t` is an action and `z_t` is the observation or state returned by the environment. We reserve `o` for the final outcome so an intermediate observation is not confused with the trial result.

Trajectory evaluation answers questions that the final result cannot answer:

- Did the system call a forbidden tool even though the final answer was correct?
- Did it perform five unnecessary retries before succeeding?
- Did an intermediate step expose sensitive information?
- Was an action actually cancelled, or did the UI merely stop showing its output?
- Did the agent succeed through a fragile route that will fail under a small perturbation?

The opposite mistake is also common: **a clean-looking trajectory does not prove success**.

An agent may say “your booking is complete” and follow a plausible sequence of steps while no booking exists in the database. Anthropic explicitly separates transcript/trajectory from outcome for this reason.[^anthropic-evals]

### Outcome and trajectory answer different questions

| Outcome | Trajectory | Interpretation |
|---|---|---|
| correct | sound | clean success |
| correct | problematic | success with hidden debt or risk |
| incorrect | plausible | possible tool, environment, or grader failure; investigate |
| incorrect | problematic | visible failure with a candidate mechanism |

Collapsing these dimensions into one scalar too early destroys useful diagnostic information.

## Level 5 — Evaluate the system

A **system eval** includes the boundary that actually delivers the behavior we care about.

That boundary may include:

- gateway and authentication
- prompt and context assembly
- model or models
- retrieval
- workflow and orchestration
- tools and external services
- persistent state
- retries and timeouts
- guardrails
- output formatting or rendering
- relevant latency, cost, and operational constraints

The question is no longer “did the model answer correctly?” It might instead be:

> Can the system resolve a refund correctly, respect policy and permissions, produce the right final state, stay within the SLO, and avoid duplicate side effects?

NIST’s TEVV-Athlon framework is explicitly designed to adapt evaluation to the system, objective, and context of use, spanning statistical models, LLMs, multimodal systems, and agentic systems.[^nist-tevv]

The advantage of an end-to-end boundary is **product validity**. The disadvantage is **attribution**. If task success drops, the cause may be the model, retriever, tool, network, retry policy, data, or grader.

System evals therefore do not replace narrow evals. They connect them.

## The central rule: narrow to diagnose, broad to confirm

A useful default is to choose the **narrowest boundary that still contains the mechanism we changed**, then confirm at the wider boundary where the real product risk lives.

Conceptually:

\[
B_{diagnostic}
=\min\{B : \Delta \subseteq B \land B\text{ observes the expected effect}\}
\]

If we claim product improvement, we then need evidence at the system boundary:

\[
\Delta_{system}
=
E[U_{product}(S_{after})]-E[U_{product}(S_{before})] > 0
\]

where `U_product` is the product utility we actually care about and both terms are estimated under the same representative protocol. The inequality is not implied by a local gain; it has to be measured.

The notation encodes two rules:

1. do not use an end-to-end eval to diagnose something that can be isolated more cleanly
2. do not use an isolated eval to claim product impact that has not been measured

## Causal attribution means changing one thing at a time

Suppose we want to know whether replacing `M_A` with `M_B` improves an agent.

A useful comparison holds constant:

- task set and task distribution
- prompts and context assembly
- workflow
- tools and versions
- initial environment state
- time limits
- graders
- number of trials and sampling configuration

Only the model changes.

We can then estimate a delta inside that harness:

\[
\Delta_{model\mid harness}
=
E[G(S_{M_B})]-E[G(S_{M_A})]
\]

The `| harness` condition matters. The estimate belongs to **that controlled system**.

If the model, prompt, retriever, and retry policy all change at once, an eight-point improvement in task success is an improvement of the **compared stack**, not a causal estimate of the model contribution.

This issue appears frequently in agent benchmarks. OpenAI’s GDPval material notes that additional context, reasoning effort, and scaffolding can change measured performance, which makes the scaffold part of the evaluated setup rather than an ignorable detail.[^openai-evals]

## Three concrete changes and the right boundary

### Case A — Upgrade the model in a support assistant

Hypothesis: the new model interprets ambiguous policy better.

A useful sequence is:

1. **model/component eval** on policy-interpretation cases with fixed context
2. paired comparison inside the same harness
3. **system eval** of the full support flow
4. trajectory review where the outcome changes

A generic model benchmark is not enough.

### Case B — Replace the retriever

Hypothesis: the new retriever finds more relevant evidence.

A useful sequence is:

1. component retrieval eval with labeled queries and relevance judgments
2. measure local coverage, ranking, cost, and latency
3. run the same system with `retriever_A` and `retriever_B`
4. verify outcome, groundedness, and regressions

If Recall@k improves while task success drops, the component eval and system eval **do not contradict each other**. They measure different boundaries.

### Case C — Add retries around an unstable tool

Hypothesis: retries improve reliability.

This is not primarily a model question.

We need to evaluate:

- workflow: when and how many times it retries
- trajectory: whether a retry follows an action that may already have taken effect
- system/outcome: whether side effects are duplicated or recovery actually succeeds
- operations: added latency and cost

A higher tool-call success rate can hide a serious defect if duplicated effects rise at the same time.

## An operational map of evaluation boundaries

| Boundary | Question it answers well | Hold fixed | Primary signal | Does not prove by itself |
|---|---|---|---|---|
| Model | Did model capability or behavior change under this harness? | prompt, dataset, config, grader, harness | output/score | product quality |
| Component | Did this local module improve? | upstream/downstream contracts | module-specific metric | end-to-end success |
| Workflow | Does orchestration make the right decisions? | models, tools, environment when isolating policy | branches, retries, stops, invariants | correct production outcome |
| Trajectory | What happened in this trial and why? | not a component boundary; it is realized evidence | actions, observations, states | population-level performance |
| System | Does the product solve the task under representative conditions? | documented full-stack version and environment | outcome + SLO + safety/cost | exact root cause of a regression |

## The anti-pattern: one “eval score” for everything

A single score is convenient for dashboards and poor for diagnosis.

Imagine:

```text
system_success = 91%
```

Without more structure we do not know:

- whether the same component fails every time
- whether an external tool dominates variance
- whether the model makes poor decisions
- whether the grader is broken
- whether correct outcomes hide unsafe trajectories
- whether the improvement costs twice as much or takes twice as long

A mature evaluation stack normally needs **metrics attached to different boundaries**, not one universal score.

Anthropic recommends combining outcome grading with transcript inspection and warns that broken tasks, graders, or harness constraints can produce misleading scores.[^anthropic-evals] Evaluation design is therefore part of system engineering, not merely a reporting layer.

## A trial is also a unit of evidence

Generative systems are stochastic. One task does not necessarily equal one observation.

Anthropic distinguishes a **task** from a **trial**. Each attempt is a trial, and repeated trials let us measure consistency.[^anthropic-evals]

If a task succeeds with probability `p`, a single run is one high-variance Bernoulli observation. Small differences need enough repetitions and an uncertainty-aware report. Choosing the trajectory that best supports our hypothesis is not evidence.

Later chapters will cover dataset construction, judge calibration, agreement, and regression gates. The important point here is simpler: **the correct boundary cannot rescue a weak statistical protocol**.

## What to record with every eval

At minimum, a reproducible result should identify:

```text
eval_scope: model | component | workflow | system
task_id / dataset_version
trial_id / seed where meaningful
model + revision
prompt/context/policy version
component versions
tool/environment versions
initial state
sampling/reasoning config
timeouts/retry policy
graders + versions
trajectory reference
outcome/state checks
latency/cost counters
```

The trajectory appears as evidence, not as a replacement for the outcome.

The exact list varies by system. The rule is stable: **if a variable could explain the result, it must be fixed, recorded, or explicitly treated as a source of variation**.

## Decision checklist

Before running an eval, answer these questions in order:

1. **What change or risk am I trying to measure?**
2. **At which boundary does its mechanism first appear?**
3. **Which variables must stay fixed to attribute the effect?**
4. **Which outcome or final state represents real success?**
5. **Do I need the trajectory to understand safety, efficiency, or recovery?**
6. **Which wider boundary must confirm that the change does not break the product?**
7. **How many trials do I need to avoid mistaking variation for regression?**

If we cannot answer the first question, we do not need a benchmark yet. We need a hypothesis.

## Production implication

Evaluation architecture should resemble a layered software test strategy:

- narrow, fast evals for models and components
- workflow evals for policy and state transitions
- trajectory analysis for mechanism diagnosis
- end-to-end evals for outcomes, SLOs, cost, and real product risk
- production as a source of new cases, not a substitute for controlled evaluation

The important decision is not to choose one level. It is to **connect levels without mixing their conclusions**.

When a system eval fails, move inward until the mechanism is localized. When a narrow eval improves, move outward until the improvement is shown to matter to the user.

That movement — **diagnose narrow, confirm broad** — is the foundation for the rest of this series.

## References

[^nist-aite]: NIST, *Announcing NIST's Artificial Intelligence Technology Evaluation (AITE)*, Jul 27, 2026. https://www.nist.gov/news-events/news/2026/07/announcing-nists-artificial-intelligence-technology-evaluation-aite
[^nist-tevv]: NIST, *The TEVV-Athlon Framework for Evaluating AI Systems*, initial public draft announced Aug 7, 2026. https://www.nist.gov/artificial-intelligence/ai-research/tevv-athlon-framework-evaluating-ai-systems
[^mlperf-rules]: MLCommons, *MLPerf Inference Rules*, definitions of System Under Test, run, and scenarios. https://github.com/mlcommons/inference_policies/blob/master/inference_rules.adoc
[^anthropic-evals]: Anthropic Engineering, *Demystifying evals for AI agents*, Jan 9, 2026. https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
[^openai-agentkit]: OpenAI, *Introducing AgentKit*, Oct 6, 2025; the Evals section documents datasets and Trace Grading for end-to-end agentic workflows. https://openai.com/index/introducing-agentkit/
[^openai-evals]: OpenAI Evals, *GDPval*. https://evals.openai.com/
[^gemini-card]: Google DeepMind, *Gemini 3.5 Flash model card*, published May 19, 2026; the evaluation table reports Terminal-bench 2.1 with the Terminus-2 harness. https://deepmind.google/models/model-cards/gemini-3-5-flash/
