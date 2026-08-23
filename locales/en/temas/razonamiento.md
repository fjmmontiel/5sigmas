---
title: "Reasoning in LLMs"
seo_title: "Reasoning in LLMs: chain of thought and test-time compute"
description: "What reasoning means in an LLM, how chain of thought, search and verifiers work, and what they cost in latency, compute and reliability."
keywords: "LLM reasoning, chain of thought, test-time compute, inference-time compute, self-consistency, verifiers, reasoning models"
date: 2026-04-14
date_modified: 2026-08-23
---

# Reasoning in LLMs

In an LLM, **reasoning** means producing or executing intermediate computation that helps solve a task before emitting the final answer. That computation can take the form of textual steps, search among candidates, tool use, verification or iterative correction.

It is not a binary property. A model can solve one class of problems well and fail on a minimal variation. It can also reach the right answer with a false explanation, or produce a convincing chain that ends in the wrong result.

That is why it helps to separate three questions:

1. Is the final answer correct?
2. Is the process robust?
3. Does the visible explanation actually reflect that process?

## The central idea

{{ include_html("snippets/temas/reasoning-loop.html") }}

Modern reasoning models spend more compute during inference. This strategy is known as **test-time compute** or **inference-time compute**. Instead of fixing all capability during training, the system can spend additional steps on difficult queries.

The benefit is adaptive capability. The tradeoffs are latency, token usage, variability and operational complexity. The [LLM cost and latency calculator](/en/tools/llm-cost-latency/) makes that tradeoff explicit by comparing model choice, token volume and response time under different assumptions.

## Chain of thought

*Chain of thought* (CoT) prompts the model to produce intermediate steps before the answer. Wei et al. showed that examples containing chained reasoning could improve large-model performance on arithmetic, symbolic and commonsense tasks.[^cot]

{{ include_html("snippets/temas/reasoning-chain-of-thought.html") }}

The technique can help because it provides space to represent variables and dependencies. It can also hurt if early steps contain an error that propagates.

The visible chain should not be treated as a perfect causal trace. A model can rationalize a decision influenced by signals that it does not mention. Turpin et al. documented explanations that looked coherent while omitting decisive prompt factors.[^unfaithful]

The practical conclusion is straightforward: textual explanation can help inspection, but it does not replace correctness evaluation or system telemetry.

## Self-consistency and candidate sampling

A single answer depends on one generation trajectory. **Self-consistency** generates several chains and chooses the answer that appears most consistently across them.[^selfconsistency]

{{ include_html("snippets/temas/reasoning-self-consistency.html") }}

This strategy works when independent paths can converge on the solution. Its cost grows roughly linearly with the number of samples and it does not help if all samples share the same bias.

For open-ended problems, voting over complete text is not meaningful. The system needs to normalize answers, evaluate candidates or use a judge model.

## Search and planning

Reasoning can be formulated as search over possible states. **Tree of Thoughts** makes that idea explicit by maintaining multiple intermediate continuations, evaluating them and deciding which branch to explore next.[^tot]

{{ include_html("snippets/temas/reasoning-search-planning.html") }}

Concrete algorithms differ in how they manage the frontier:

- **beam search:** keeps a bounded set of candidates according to a score
- **Tree of Thoughts:** can branch, evaluate and backtrack among intermediate states
- **Monte Carlo Tree Search / UCT:** allocates exploration according to observed value and uncertainty across branches[^uct]
- **programs or tools:** turn part of the search space into verifiable operations
- **explicit planning:** separates plan creation from execution

Search adds value when there is a signal that distinguishes promising states. Without a reliable evaluator, a system can multiply plausible candidates without improving selection.

## Verifiers and reward models

A verifier scores an answer, a step or a trajectory. The important distinction is **which part of the process it can observe and which source of truth it compares against**. When an executable check exists — tests, a solver, a schema or external state — that signal is usually more direct than asking another model for an opinion.[^verifiers]

{{ include_html("snippets/temas/reasoning-verifier-signal.html") }}

An outcome verifier or **Outcome Reward Model (ORM)** scores the final outcome. It is useful when the answer can be judged reliably, but it does not identify where the first error in a trajectory appeared. A **Process Reward Model (PRM)** scores intermediate states or steps and provides a finer signal for locating errors or guiding search, at the cost of requiring a reliable step-level criterion.[^process]

Process verification also does not prove that a visible explanation is the model's internal causal trace. It scores the intermediate artifact that can be observed. For code, executing tests is still preferable to judging the naturalness of an explanation; for a tool call, validating the schema and checking the real effect is better.

## Test-time compute

A system can allocate more compute in several ways:

{{ include_html("snippets/temas/reasoning-test-time-compute.html") }}

Snell et al. studied scaling inference compute and showed that the best strategy depends both on problem difficulty and on the model's ability to use the additional budget.[^testtime]

More compute does not produce monotonic improvement. Failure modes include:

- overthinking
- objective drift
- propagation of an incorrect initial assumption
- reinforced confidence in a wrong answer
- interaction-breaking latency
- cost greater than simply using a stronger model

The right policy is not “always think more.” It is to **route compute according to difficulty and the value of the answer**.

## Visible reasoning and internal reasoning

{{ include_html("snippets/temas/reasoning-evidence-surfaces.html") }}

You do not need to expose every intermediate token to provide transparency. A long explanation can hide the important evidence; an auditable answer should cite relevant data, expose assumptions, communicate uncertainty and record real actions outside the displayed prose.

## Reasoning with tools

Tools change the problem. The model no longer needs to simulate every operation inside a textual chain: it can alternate decisions with actions on an environment and use observable results to update the next step.[^react]

{{ include_html("snippets/temas/agent-tool-gate.html") }}

A calculator reduces arithmetic errors. Retrieval brings current information. An interpreter executes code. An API can act on an external system.

The challenge shifts to the execution contract:

- when to call
- which arguments to use
- how to validate
- what to do on timeout or partial results
- how to prevent duplicates
- how to resume after interruption

The important separation is operational: **the model proposes; the runtime validates and executes; the real result updates state; only then does the system choose the next step**. Current agent runtimes expose exactly this loop and can apply guardrails around tool calls.[^agentguardrails] The [agent reliability and evaluation playground](/en/tools/agent-reliability/) lets you inspect that kind of trajectory by separating final success, first-pass success, retries, timeouts and tool decisions.

The note [Proactive and reactive agents and tool calls](/en/articulos-tecnicos/proactive-reactive-agent-and-tool-calls/) develops this runtime.

## The human cost of latency

In chat, several seconds may be acceptable for a complex task. In voice, the same delay can break conversational rhythm. The [voice-agent latency explorer](/en/tools/voice-agent-latency/) lets you break that delay down by stage and see which component dominates time to the first audible response.

{{ include_html("snippets/temas/reasoning-latency-clocks.html") }}

The [Reasoning Models](/en/series/modelos-razonadores/00_presentacion_serie/) series and the comparison of [voice-agent architectures](/en/articulos-tecnicos/voice-agent-architectures/) develop these boundaries in more detail.

Treating latency as part of system design prevents benchmark-only optimization from ignoring the interaction.

## How to evaluate reasoning

A robust evaluation does not look only at final accuracy.

{{ include_html("snippets/temas/reasoning-evaluation.html") }}

Simple baselines matter too. Sometimes a rule, structured query or small model with a tool beats a long deliberation process.

The guide to [evaluating AI models](/en/temas/evaluacion-modelos/) describes how to build that test set.

## Frequently asked questions

### Does chain of thought make a model logical?

No. It provides space for intermediate steps and can improve some tasks. Those steps are still generated by the model and can contain jumps, rationalizations or errors.

### Does more reasoning always produce a better answer?

No. Improvement depends on the task, model, verifier and budget. On simple queries, extra steps can add cost and create more opportunities for error.

### Can one model judge another model?

It can provide a useful signal, especially with a clear rubric and examples. It also inherits biases, order sensitivity and errors. It should be calibrated against humans or external verifiers and should not be the sole source of truth for critical decisions.

### Is RAG reasoning?

RAG is information retrieval. It can be part of a reasoning process, but retrieving a document does not imply using it correctly or verifying the conclusion.

## Primary sources

[^cot]: Jason Wei et al., [*Chain-of-Thought Prompting Elicits Reasoning in Large Language Models*](https://arxiv.org/abs/2201.11903), 2022.
[^selfconsistency]: Xuezhi Wang et al., [*Self-Consistency Improves Chain of Thought Reasoning in Language Models*](https://arxiv.org/abs/2203.11171), 2022.
[^unfaithful]: Miles Turpin et al., [*Language Models Don't Always Say What They Think: Unfaithful Explanations in Chain-of-Thought Prompting*](https://arxiv.org/abs/2305.04388), 2023.
[^tot]: Shunyu Yao et al., [*Tree of Thoughts: Deliberate Problem Solving with Large Language Models*](https://arxiv.org/abs/2305.10601), 2023.
[^uct]: Levente Kocsis and Csaba Szepesvári, [*Bandit Based Monte-Carlo Planning*](https://doi.org/10.1007/11871842_29), ECML 2006.
[^verifiers]: Karl Cobbe et al., [*Training Verifiers to Solve Math Word Problems*](https://arxiv.org/abs/2110.14168), 2021.
[^process]: Hunter Lightman et al., [*Let's Verify Step by Step*](https://arxiv.org/abs/2305.20050), 2023.
[^testtime]: Charlie Snell et al., [*Scaling LLM Test-Time Compute Optimally can be More Effective than Scaling Model Parameters*](https://arxiv.org/abs/2408.03314), 2024.
[^react]: Shunyu Yao et al., [*ReAct: Synergizing Reasoning and Acting in Language Models*](https://arxiv.org/abs/2210.03629), ICLR 2023.
[^agentguardrails]: [OpenAI Agents SDK — Guardrails](https://openai.github.io/openai-agents-python/guardrails/), official documentation.