---
title: "LLM-as-a-judge and human evaluation: calibration, bias, variance, and agreement"
description: "How to turn human judgments and model-based graders into trustworthy evidence through rubrics, calibration, agreement, repetition, position-bias probes, adjudication, and production gates."
date: 2026-09-12
date_modified: 2026-09-12
keywords: "LLM-as-judge, human evaluation, grader calibration, inter-rater agreement, Cohen kappa, position bias, evaluator variance, AI evaluation"
tags:
  - AI
  - Evaluation
  - Reliability
  - Production
---

# Chapter 3 — LLM-as-a-judge and human evaluation: calibration, bias, variance, and agreement

An automated judge can turn thousands of open-ended outputs into labels or scores. That does not make its decisions ground truth.

An expert human panel can add domain judgment. That does not remove disagreement, ambiguity, or presentation bias.

This chapter asks one concrete question:

> **When is a human or LLM-based grader trustworthy enough to use as evidence in a release decision?**

The answer is not "when it looks reasonable," nor is it "when it agrees with humans a lot" without specifying which humans, on which cases, under which protocol. We need to separate five properties:

1. **rubric validity**: whether the criterion encodes the behavior that actually matters
2. **reliability**: whether the judge is stable when nothing material changes
3. **agreement**: how often it matches an independent reference or other independent raters
4. **systematic bias**: whether position, style, length, identity, or model family changes the judgment without changing relevant quality
5. **scope**: the distribution and decision type for which the judge was validated

Anthropic recommends deterministic graders where possible and model-based graders where flexibility is needed, with frequent calibration against expert human judgment for subjective tasks.[^anthropic-evals] OpenAI's Graders API exposes programmatic, label-model, and score-model graders among its available mechanisms.[^openai-graders] That availability is a **tooling capability**. It does not certify a rubric or judge as valid for our product.

{{ include_html("snippets/articulos-tecnicos/eval-judge-calibration-bias-agreement.html") }}

## Define what "calibration" means first

In this chapter, *judge calibration* means an operational process: validate one concrete grader version against independent decisions and controlled cases before scaling it.

That is not the same thing as probabilistic calibration.

If a grader emits `pass/fail` or an ordinal 1–5 quality score, that number is **not automatically a probability**. We should not say "70% calibrated confidence" unless the protocol actually produces a probability with an explicit statistical interpretation and that interpretation has been validated.

A useful judge identity is:

```text
judge_version =
  model revision
  + rubric/prompt revision
  + decoding/config revision
  + evidence/context supplied
  + output parser
```

Changing any of these can change the decision policy. Calibration therefore belongs to a **judge version**, not to a model brand or family in the abstract.

## Choose the narrowest grader that answers the question

Do not use an LLM to judge a property that can be checked exactly.

### Deterministic

Use deterministic checks when there is a verifiable invariant:

- a test passes
- a JSON field satisfies a schema
- an action produced the expected state
- a citation points to an allowed identifier
- a number falls within a defined tolerance

The main challenge here is specifying the check correctly, not approximating human preference.

### LLM-as-a-judge

Model-based graders are useful when the criterion is semantic or admits multiple valid answers:

- clarity of an explanation
- compliance with a natural-language policy
- quality of a synthesis
- whether an answer is supported by supplied evidence
- conversational behavior that an exact rule cannot capture well

The grader should receive only the context needed to decide and should have a valid escape hatch when evidence is insufficient, such as `unknown` or `insufficient_evidence`.[^anthropic-evals]

### Human evaluation

Human evaluation is especially valuable when:

- we are defining a new rubric
- the cost of a false positive is high
- cases are ambiguous or require domain expertise
- we need to understand *why* criteria disagree
- the automatic judge has not yet been calibrated for that distribution

The goal is not to declare a universal winner between humans and LLMs. It is to route each decision to the mechanism capable of producing defensible evidence.

## A vague rubric creates variance that a stronger model cannot fix

Suppose the prompt is:

```text
Score the answer for quality from 1 to 5.
```

What does quality mean: correctness, coverage, tone, concision, grounding, or safety?

Two judges can apply different functions while both following the instruction literally.

A useful rubric separates dimensions and anchors each one to observable criteria:

```text
groundedness:
  pass: every material claim is supported by supplied evidence
  fail: at least one material claim lacks support or contradicts evidence
  unknown: supplied evidence is insufficient to decide

policy_compliance:
  pass: action satisfies all listed policy constraints
  fail: action violates at least one listed constraint
  unknown: required policy state is missing
```

Separating dimensions also makes disagreement diagnosable. One composite score can hide the fact that all raters agree on factuality and disagree only on style.

## Humans need a protocol too

"Human-rated" is not a complete methodology.

At minimum, record:

```text
rater expertise / locale
rubric_version
examples_or_anchors_version
blindness / model identity visibility
randomization policy
independent rating before adjudication
adjudication rule
item assignment
rater_id or stable pseudonym
```

### Independence before adjudication

If H1 sees H2's decision before rating, we no longer have two independent observations.

A sound flow is:

```text
item
→ H1 label
→ H2 label
→ store both
→ measure disagreement
→ adjudicate if the protocol requires a final label
```

Adjudication produces an operational reference. It should not erase the original disagreement, because that disagreement contains information about task or rubric ambiguity.

### Blind identity when identity is not part of the criterion

If a rater knows which provider or model produced each answer, identity can influence the decision.

For output comparison, hide identity and randomize order unless the evaluation object explicitly requires knowing the source system.

## Observed agreement: measure what actually happened first

For two evaluators producing categorical labels, observed agreement is:

\[
p_o = \frac{1}{N}\sum_{i=1}^{N}\mathbf{1}[j_i=h_i]
\]

`p_o` answers a simple question: **on what fraction of items did they assign the same label?**

It does not show where they disagree. Pair it with a confusion matrix or at least per-label counts.

Illustrative example:

```text
                 human
              pass  fail
judge pass      72     8
judge fail       6    14
```

Here `p_o = (72 + 14) / 100 = 0.86`.

This is illustrative arithmetic, not a benchmark of any model.

## Cohen's κ: correcting expected agreement does not create a universal score

For two raters and nominal categories, Cohen proposed:[^cohen-kappa]

\[
\kappa = \frac{p_o-p_e}{1-p_e}
\]

where `p_e` is expected agreement from the raters' marginal label frequencies.

For the example above:

- judge: `pass=0.80`, `fail=0.20`
- human: `pass=0.78`, `fail=0.22`
- `p_e = 0.80\cdot0.78 + 0.20\cdot0.22 = 0.668`
- `κ = (0.86 - 0.668)/(1 - 0.668) ≈ 0.578`

The difference between `0.86` and `0.578` is not a contradiction. They are different statistics.

Because `p_e` depends on the marginals, κ should not be treated as an absolute quality number that transfers cleanly across datasets with different label prevalence. Report at least `N`, label distribution, `p_o`, κ, and the confusion matrix.

For more than two raters, ordinal categories, or continuous scores, use an agreement measure appropriate to the design rather than forcing Cohen's κ.

## Human agreement does not prove criterion validity

Two judges can agree perfectly while applying the wrong rubric.

For example, both humans and an LLM could prefer a fluent, long answer even when the actual requirement is "make no material claim beyond the supplied evidence."

The correct order is therefore:

```text
product construct
→ rubric
→ calibration cases
→ independent human judgment
→ automatic judge
→ agreement + bias analysis
```

not the reverse.

The MT-Bench/Chatbot Arena paper showed that, under its protocol, strong LLM judges could approximate human preferences and explicitly studied position bias, verbosity bias, and self-enhancement bias.[^mtbench-judge] That is evidence that the approach can work under concrete setups, not a transferable guarantee for every domain, rubric, or judge model.

## Variance: one judgment can hide instability

A model-based grader can vary because of sampling, infrastructure, or sensitivity to small prompt/context changes.

For a numeric score `s_{i,r}` for item `i` on repetition `r`, measure:

\[
\bar{s}_i = \frac{1}{R}\sum_{r=1}^{R}s_{i,r}
\]

\[
\hat{\sigma}^2_i = \frac{1}{R-1}\sum_{r=1}^{R}(s_{i,r}-\bar{s}_i)^2
\]

We do not need infinite repetitions. We do need to know whether a release gate changes because the same judge oscillates around the threshold.

For categorical labels, keep the observed distribution:

```text
item_42, R=10
pass: 6
fail: 3
unknown: 1
```

Silently collapsing this to `pass` destroys useful uncertainty information.

### Separate judge variance from task disagreement

If the same judge changes its answer across repetitions, we have intra-judge instability.

If stable judges disagree with one another, the cause may be different policies, different capabilities, or rubric ambiguity.

Those are different failures and require different fixes.

## Position bias: the minimum control is to reverse the order

For an A/B comparison, also run B/A.

Define swap consistency:

\[
SC = \frac{1}{N}\sum_{i=1}^{N}
\mathbf{1}[pref_i(A,B)=flip(pref_i(B,A))]
\]

`SC=1` means that swapping presentation order did not change semantic preference on the measured items.

It does not mean the preferences are correct.

The original MT-Bench/Chatbot Arena work identified position bias as one limitation of LLM-as-a-judge.[^mtbench-judge] Later studies show that its magnitude depends on the judge and task, so a single universal correction factor is not defensible.[^position-bias]

A production gate should fail if a release decision depends on a judge whose preference changes materially under order reversal.

## Verbosity and style: control content before calling it bias

"The judge prefers long answers" is a hypothesis, not an automatic conclusion.

A longer answer may contain more correct information. Testing style bias requires controlled pairs where relevant content is equivalent or the transformation is explicitly designed.

Useful controls include:

- A/B ↔ B/A ordering
- Markdown ↔ plain text when formatting is not a criterion
- concise ↔ expanded without adding claims
- hidden model identity
- equivalent presentation of references or citations

If content changes, the experiment no longer isolates style.

## Self-preference and judge family: cross generators and judges

The MT-Bench paper discussed *self-enhancement bias*: a judge can favor responses that resemble its own distribution.[^mtbench-judge]

Do not assume that using "the strongest model" removes this risk.

A control matrix can cross:

```text
generator_family × judge_family × task_stratum
```

If the ranking shifts systematically when the judge shares a family with one candidate, treat that as a risk signal and increase human review or use an explicitly designed judge panel.

Do not turn one benchmark's observation into a rule about every provider.

## A reference can help and can also change the task

For problems with an objective answer, giving the judge a reference can reduce reasoning load.

But an overly narrow reference can also penalize valid alternative solutions.

Before introducing one, decide whether the task is:

- **reference matching**: one concrete solution is expected
- **constraint satisfaction**: multiple solutions are valid
- **preference**: quality is compared under a subjective rubric

The grader must match the construct.

## Practical calibration: do not use the holdout to write the judge prompt

Build a **calibration/dev bank** where rubric, examples, and grader prompt may be iterated.

Then reserve an independent bank to confirm the judge.

```text
calibration/dev
  → tune rubric + judge prompt
  → inspect disagreement
  → repair ambiguity

judge validation holdout
  → freeze judge version
  → measure agreement / bias / variance
  → accept, restrict or reject scope
```

If you inspect the holdout after every grader change and edit the prompt again, that bank is now participating in development.

This is the same development-leakage principle from Chapter 5.2, applied to the evaluator itself.

## A judge acceptance gate

There is no universal κ, agreement, or `SC` threshold that makes a judge "good" for every system.

Thresholds should come from product error costs.

A reproducible gate can require:

```text
judge_revision fixed
rubric_revision fixed
validation_set fixed and not used for tuning
per-stratum sample counts declared
raw agreement + confusion matrix
agreement statistic appropriate to label type
repeat stability near release boundary
A/B ↔ B/A consistency for pairwise judging
controlled style/length probes
human review of disagreements
known failure strata explicitly excluded or routed to humans
```

The output need not be binary `judge good / judge bad`.

It can be:

```text
ACCEPT: automatic judging for low-risk support-quality items
RESTRICT: human fallback for safety/policy disputes
REJECT: not reliable enough for release gating
```

That scope must travel with the grader version.

## Three concrete cases

### Case A — Grounding in a RAG assistant

We want to know whether every material claim is supported by supplied evidence.

Design:

1. deterministic checks for citation-ID presence and validity
2. isolated LLM judge for claim↔evidence entailment
3. calibration bank labeled by experts
4. `unknown` when evidence is insufficient
5. validation by strata: simple factual, multi-source synthesis, source conflict
6. human review of false `pass` decisions because they are the costliest error

We do not mix fluency into the same grounding score.

### Case B — Comparing two support responses

We want the response that resolves the case better without violating policy.

First validate any machine-checkable policy actions deterministically. Then compare communication quality using both A/B and B/A.

If the judge frequently changes the winner when positions are reversed, silently averaging the two results is not a repair. Investigate the bias or route that region to humans.

### Case C — Human review of high-risk answers

Two specialists independently rate a sensitive decision.

Store:

- original labels
- rationale or cited evidence
- `p_o` and confusion matrix
- κ only when the two-rater nominal design makes it appropriate
- final adjudication separately

If disagreement concentrates in one subgroup, inspect the rubric or context for that stratum rather than hiding it inside the global average.

## What to record with every judge-based result

At minimum:

```text
judge_type: deterministic | llm | human | hybrid
judge_model_revision: ...
judge_prompt_rubric_revision: ...
judge_sampling_config: ...
human_protocol_revision: ...
calibration_set_version: ...
validation_set_version: ...
item_stratum: ...
raw_judgments: ...
repetitions: ...
position_randomization: ...
agreement_metrics: ...
known_bias_probes: ...
adjudication_status: ...
```

Without this identity, repeating "the same eval" after changing the judge or rubric can measure a different decision policy.

## Production implication

An LLM-as-a-judge should not enter a release gate merely because it is cheap, fast, or because an external benchmark says LLM judges can agree well with humans.

It should enter when **that concrete judge version**:

1. implements a rubric that represents product risk
2. has been compared with independent human decisions on relevant cases
3. is stable enough around the operational threshold
4. survives bias probes designed for its judging format
5. declares unreliable strata and routes those cases to another mechanism

A robust architecture is often hybrid:

```text
deterministic invariants
+ calibrated model graders for scalable semantic checks
+ targeted human review for ambiguity, high-risk cases, and judge maintenance
```

The central principle is:

> **a judge is another component of the measurement system: it needs a version, tests, calibration, limits, and observability.**

The next chapter applies this discipline to the hardest evaluation object in the series: a complete agent trajectory with tools, recovery, efficiency, and policy compliance.

## References

[^anthropic-evals]: Anthropic Engineering, *Demystifying evals for AI agents*, 9 Jan 2026. https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
[^openai-graders]: OpenAI API Reference, *Graders*. https://platform.openai.com/docs/api-reference/graders
[^mtbench-judge]: Lianmin Zheng et al., *Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena*, NeurIPS 2023 Datasets and Benchmarks Track. https://arxiv.org/abs/2306.05685
[^position-bias]: Lin Shi et al., *Judging the Judges: A Systematic Study of Position Bias in LLM-as-a-Judge*, 2024. https://arxiv.org/abs/2406.07791
[^cohen-kappa]: Jacob Cohen, *A Coefficient of Agreement for Nominal Scales*, Educational and Psychological Measurement 20(1), 1960. https://doi.org/10.1177/001316446002000104
