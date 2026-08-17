---
title: "Evaluating AI models"
seo_title: "How to evaluate AI models: benchmarks, quality and production"
description: "How to evaluate an AI model and system with benchmarks, domain sets, judges, human review and product metrics without confusing a score with real value."
keywords: "AI model evaluation, LLM benchmark, evals, human evaluation, LLM as a judge, benchmark contamination, AI quality"
date: 2026-04-07
date_modified: 2026-08-16
---

# Evaluating AI models

Evaluating AI means measuring whether a **model, system or product** meets an objective under specific conditions. A public benchmark answers a limited question. By itself it does not prove that an application is reliable, fast, safe or useful to its users.

The first decision in an evaluation is not which metric to use. It is **what object is being evaluated**.

{{ include_html("snippets/temas/evaluation-object.html") }}

Each layer introduces different failures and criteria.

## The 60-second answer

{{ include_html("snippets/temas/evaluation-stack.html") }}

No layer replaces the others. The key is connecting every metric to a product decision.

## 1. Define the task and the cost of error

“Quality” is too broad. An evaluation needs an observable contract.

For a data extractor:

- required fields
- valid formats
- precision and recall
- handling of missing values
- cost of a false positive.

For an agent with tools:

- action selection
- correct arguments
- operation order
- idempotency
- final state
- user-facing message.

For a voice assistant:

- intent understanding
- entities
- time to first audio
- interruptions
- task success
- duplicate closure.

The metric must reflect the failure that matters. Optimizing textual similarity when the real problem is executing a transfer twice measures the wrong surface.

## 2. Build a case taxonomy

An average hides where the system fails. The evaluation set should label relevant dimensions:

- intent or task type
- difficulty
- language and market
- length and noise
- ambiguity
- need for external knowledge
- tool use
- impact of error
- affected population or segment.

Then calculate performance by segment, not only one global number.

A taxonomy enables actionable questions: “Does the new model improve long queries but regress on Spanish proper names?” That helps a decision. “It gained two points” does not.

## 3. Use your own golden set

The **golden set** contains real or designed examples representative of the domain. Every case needs:

- input
- relevant context
- expected result or rubric
- segment labels
- failure severity
- provenance and date.

{{ include_html("snippets/temas/evaluation-reference-set.html") }}

It should be versioned like code. When an incident appears, add a regression case. When the product changes, update the distribution while keeping a stable subset for comparing versions.

Size alone does not guarantee coverage. Prioritize representative cases and critical failures, then expand the set where uncertainty or risk requires it.

## 4. Understand what a benchmark measures

A benchmark provides standardization and comparison. MMLU, for example, measures multiple-choice answers across many academic domains.[^mmlu] HELM proposed a broader and more transparent evaluation framework built around scenarios, metrics and documented limitations.[^helm]

Before using a score, ask:

- does the task resemble the application?
- does the format privilege one capability?
- are the answers unambiguous?
- could the model have seen the data during training?
- does the metric capture severity or only average correctness?
- are there confidence intervals and enough samples?

A benchmark may measure academic knowledge while saying almost nothing about tool calling, conversation, latency or operational reliability.

## Contamination and saturation

Public benchmarks can appear in training corpora or inspire very similar data. When labs repeatedly optimize against a static test, the score becomes a weaker estimate of generalization.

Contamination can be exact or semantic. It is difficult to detect when training data is not public.

{{ include_html("snippets/temas/evaluation-benchmark-contamination.html") }}

LiveCodeBench designed a code evaluation that updates with recent problems and executes solutions to verify them.[^livecodebench] The broader principle is useful: where possible, a live and verifiable test resists superficial optimization better.

## 5. Use deterministic metrics when they exist

Not everything needs a generative judge.

Use rules or execution to:

- validate JSON and schemas
- compare numeric values
- run tests
- check citations and URLs
- verify API arguments
- inspect final state
- measure latency and cost.

A deterministic metric is usually cheaper, reproducible and auditable. Generative evaluation should be reserved for dimensions that genuinely require judgement.

{{ include_html("snippets/temas/evaluation-verifier-routing.html") }}

## 6. Human evaluation

Humans can assess correctness, usefulness, tone, clarity or preference. For that signal to be reliable, the protocol has to specify which dimension is being judged, which examples anchor the rubric, what information is hidden from the rater, where annotation is duplicated, and how disagreements are handled.

{{ include_html("snippets/temas/evaluation-human-protocol.html") }}

Preference is still not the same as truth. A more fluent answer can beat a more correct one. When an external check exists, use it and reserve human judgment for dimensions that genuinely require it.

## 7. LLM as a judge

A judge model can scale open-ended evaluations. It receives the input, responses and a rubric, then produces a score or comparison.

It is useful for:

- filtering regressions
- comparing many variants
- evaluating format and coverage
- prioritizing samples for human review.

Risks include:

- position bias
- preference for longer answers
- affinity with its own model family
- prompt sensitivity
- shared errors with the evaluated model.

A judge needs calibration. Compare it against a human-annotated set, measure agreement by segment and review important disagreements. For high-impact decisions, it should not be the sole authority.

{{ include_html("snippets/temas/evaluation-judge-calibration.html") }}

## 8. Evaluate the system, not only the answer

A system with retrieval or tools can fail before text generation.

{{ include_html("snippets/temas/evaluation-system-trace.html") }}

### RAG

A wrong answer can come from a missing document, poor ranking, insufficient evidence, an incorrect inference or a citation that does not support the claim. Without that decomposition, the proposed fix is guesswork.

### Agents and tools

Evaluate task success, unnecessary steps, forbidden actions, retries, duplicates, final state and error recovery. The trajectory shows whether the failure is in the decision, execution or final user-facing message.

### Voice and realtime systems

Add temporal and acoustic measures. A correct answer arriving after an awkward pause can still fail as a product.

## 9. From offline to online

Offline evals provide reproducibility and fast comparison. Online metrics reveal what happens with real users.

{{ include_html("snippets/temas/evaluation-offline-online.html") }}

An online experiment still needs guardrails. A variant should not reach production merely because an automated judge improved.

## 10. Statistical uncertainty

A small difference can be sampling noise. If you compare two versions on the same cases, preserve the per-example pairing and analyze the per-case difference before aggregation. The interval should accompany the estimated effect.

{{ include_html("snippets/temas/evaluation-uncertainty.html") }}

For stochastic systems, separate uncertainty caused by which cases were sampled from run-to-run variability on the same case when that randomness is part of the product. The final decision should combine magnitude, uncertainty, and cost, latency, or risk; a statistically detectable difference does not by itself imply practical value.

## An operational evaluation loop

{{ include_html("snippets/temas/evaluation-cycle.html") }}

Evaluation is not a final phase. It is the loop that lets a system change without forgetting what it has already learned about its failures.[^openai-evals]

## Where to go deeper in 5sigmas

- [Multimodal evaluation](/en/series/multimodalidad-iag/04-evaluacion/) for benchmarks involving text, images and grounding.
- [Reasoning-model failures](/en/series/modelos-razonadores/02-fallos/) for shortcuts, sycophancy and error propagation.
- [Test-time compute](/en/series/modelos-razonadores/03-test-time-compute/) for comparing quality, latency and inference budget.
- [Three architectures for voice agents](/en/articulos-tecnicos/voice-agent-architectures/) for an operational evaluation matrix in realtime systems.

## Frequently asked questions

### What is the best benchmark for choosing an LLM?

There is no universal one. Use benchmarks for general capabilities and your own set for the product's task, language, data, latency and risk.

### How many examples does a golden set need?

It depends on diversity and the size of the improvement you need to detect. Start with representative cases and critical failures, measure segment coverage and expand where uncertainty is high.

### Can open-ended answers be evaluated automatically?

Yes, through partial rules, references, execution or a judge model. Automation should be calibrated and combined with human review for subjective or high-impact dimensions.

### Does a benchmark score predict user experience?

Only when the task, distribution and metric resemble the product. In many systems, latency, retrieval, tools and interface quality explain more value than a small difference between base models.

## Primary sources

[^mmlu]: Dan Hendrycks et al., [*Measuring Massive Multitask Language Understanding*](https://arxiv.org/abs/2009.03300), 2020.
[^helm]: Percy Liang et al., [*Holistic Evaluation of Language Models*](https://arxiv.org/abs/2211.09110), 2022.
[^arena]: Lianmin Zheng et al., [*Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena*](https://arxiv.org/abs/2306.05685), 2023.
[^livecodebench]: Naman Jain et al., [*LiveCodeBench: Holistic and Contamination Free Evaluation of Large Language Models for Code*](https://arxiv.org/abs/2403.07974), 2024.
[^openai-evals]: OpenAI, [*GPT-4 Research — OpenAI Evals*](https://openai.com/index/gpt-4-research/), 2023. OpenAI describes Evals as a development tool for identifying shortcomings, preventing regressions and tracking performance across model versions.
