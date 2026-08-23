---
title: Physical time — latency, streaming and human interaction
description: "TTFT, streaming and perceived-latency thresholds in reasoning models. RouteLLM, design patterns and production session-cost management."
date: 2026-04-11
date_modified: 2026-08-23
keywords: "AI latency, TTFT, LLM streaming, RouteLLM, test-time compute product, perceived latency, AI response time, AI SLO, speculative decoding"
tags:
  - AI
  - LLMs
  - Reasoning
---

# Chapter 4 — Physical time: latency, streaming and human interaction

The previous chapter described test-time compute as a design variable. This chapter turns that variable into a concrete product problem: what happens when abstract compute becomes seconds of real user wait time. By the end, you will know the perceived-latency thresholds that determine when waiting breaks the user experience, understand the difference between TTFT and total latency and why that distinction matters for design, and know which design patterns can exploit test-time compute without destroying usability.

!!! info "Prerequisites"
    This chapter assumes that you know the test-time compute concept introduced in [Chapter 3 — Test-Time Compute](./03-test-time-compute.md).

"Thinking longer" in a paper is measured in tokens. In a product, it appears as blank-screen seconds, higher session cost and more places where the system can fail.

Translating theory into practice requires understanding three things: how long a user can wait before the experience breaks, how streaming changes the perception of that wait, and which design patterns can exploit test-time compute without destroying usability.

---

## 1. Perceived-latency thresholds

User-experience research has studied for decades how latency affects perception. [Jakob Nielsen](https://www.nngroup.com/books/usability-engineering/) established a scale in the 1990s that remains relevant:

- **Up to 0.1 seconds**: the response feels instantaneous. The user feels that the system responds directly to their actions.
- **0.1 to 1 second**: the user notices the pause but does not lose their train of thought. The experience remains fluid if the pause stays below one second.
- **1 to 10 seconds**: the pause requires active feedback (loading indicators) so that the user does not assume something has failed. From around 5–7 seconds, most users begin to disengage from the task.
- **More than 10 seconds**: the user needs something to do while waiting. Without feedback, they will assume the system is broken.

Reasoning models with long chains of thought routinely operate in the 10–60 second range for complex problems. That places them in a category where an experience without explicit latency design is poor by default.

It is worth understanding why that latency is not solved simply with faster hardware. The reasoning chain is sequential: token 500 cannot be generated before token 499 exists. The latency of a single request is bounded by `chain_length ÷ generation_speed`. A longer chain requires more time even if hardware improves. Streaming can make progress visible, but it does not eliminate the work the model has to complete.

The denominator can still change. If generation speed increases 10× through specialized inference hardware, speculative decoding or new silicon architectures, the same 10,000-token chain falls from 100 seconds to 10 seconds. If speed increases 100×, it falls to 1 second. In that scenario, reasoning depths that today are reserved for high-value requests because they take minutes would become available for ordinary interactions without perceptible friction, at the same depth of analysis. The current limit is therefore not a permanent property of reasoning models; it reflects the state of inference hardware today.

In real systems that combine an LLM with tool calls and RAG, total latency for a medium-complexity request can be around 20 seconds, with pure reasoning accounting for 7–8 seconds and the remainder distributed across API calls, document retrieval and result synthesis. Those numbers matter for design: they show that perceived-latency improvements can come both from the model (less TTC) and from the system architecture (faster tools, RAG caches).

A critical distinction in this context is the difference between **TTFT (Time To First Token)** and total latency. TTFT is the time from when the user submits the query until they receive the first character of the response. In reasoning models that do not stream their chain of thought, TTFT equals the full reasoning time plus the time required to generate the first visible token, which can be several seconds even for responses that are short overall. TTFT determines the perceived responsiveness of the system; total latency determines the perceived generation speed once the response has started. Optimizing one without the other produces systems that feel slow even though they generate quickly, or systems that generate quickly but start late.

To turn that trade-off into numbers, the [LLM cost and latency calculator](/en/tools/llm-cost-latency/) lets you vary tokens, throughput and pricing to separate TTFT, generation time and spend. When the constraint is how much history, RAG or reasoning fits before the session degrades, the [context-budget planner](/en/tools/context-budget/) makes that allocation visible. And when the decision is which model best fits a workload, the [model price/performance explorer](/en/tools/model-price-performance/) compares cost and performance without collapsing them into one metric.

{{ include_html("snippets/modelos-razonadores/04-ttft-streaming.html") }}

### Dynamic routing: RouteLLM

One relevant pattern is dynamic routing, exemplified by [RouteLLM (Ong et al., 2024)](https://arxiv.org/abs/2406.18665): instead of applying the most capable—and slowest—model to every request, a lightweight classifier analyzes the incoming query and decides which model and how much test-time compute are appropriate to solve it.

A simple factual question goes to a fast, inexpensive model. A complex reasoning problem goes to a slow, expensive model. The user receives the quality required for each request type without paying the maximum latency or cost on all of them. The router adds marginal latency itself, but the net saving can be large when the request distribution is heterogeneous. The original paper established the mechanism. Current products expose the same idea through separate controls for model capability and reasoning effort.

The current version of the problem is no longer just choosing between two models. Claude Sonnet 5 allows the effort level to be adjusted, and Gemini 3.5 Flash exposes reasoning levels that move the balance between quality, cost and latency. In production, the router may need to decide two things: which model to activate and how much reasoning budget to assign to that request ([Anthropic, 2026](https://www.anthropic.com/news/claude-sonnet-5); [Google DeepMind, 2026](https://deepmind.google/models/model-cards/gemini-3-5-flash/)).

{{ include_html("snippets/modelos-razonadores/04-routellm-decision.html") }}

GPT-5.6 exposes the same pattern. OpenAI offers three capability tiers, Sol, Terra and Luna, and allows reasoning effort to be adjusted. Selection is no longer just a choice between a fast model and a deep one; the system also has to decide how much reasoning budget to allocate to each request ([OpenAI, 2026](https://developers.openai.com/api/docs/models/gpt-5.6-sol)).

Claude Sonnet 5 and Gemini 3.5 Flash expose similar controls. Sonnet 5 allows effort to be adjusted, while Gemini 3.5 Flash provides reasoning levels that move the balance between quality, cost and latency ([Anthropic, 2026](https://www.anthropic.com/news/claude-sonnet-5); [Google DeepMind, 2026](https://deepmind.google/models/model-cards/gemini-3-5-flash/)).

---

## 2. Streaming and the perception of latency

Streaming—sending tokens to the client as they are generated instead of waiting for the complete response—is the most widely used tool for improving perceived latency without reducing total time.

The psychological difference is real: receiving the first token after 0.5 seconds and then seeing the response build progressively feels faster than receiving the complete answer after 5 seconds, even when the total time is the same or even longer in the first case.

The problem with streaming in reasoning models is that the chain of thought is not always useful to the user before it is complete. If the model is reasoning through a mathematical problem, showing intermediate steps can be useful or confusing depending on the user and context. And if the interface waits until the chain of thought has finished before it starts streaming the final answer, the perceptual benefit of streaming is lost.

### Streaming patterns for reasoning models

**Reasoning streaming with visual separation.** Show the chain of thought as it happens, with a visual style that distinguishes it from the final answer. The user sees that the system is working and can follow the process if interested.

**Meaningful progress indicators.** Instead of a generic spinner, show which phase the process is in: "Analyzing the problem", "Generating solutions", "Verifying the result". This reduces waiting anxiety without requiring the actual reasoning trace to be streamed.

**Progressive partial response.** Where the task allows it, show partial results that already have value while the system completes the analysis. A report can expose sections while the remaining ones are still being generated.

---

## 3. Session cost and failure points

More test-time compute does not only add latency for the user: it adds session cost and multiplies the number of places where something can fail.

### Session cost

In generative AI systems, cost is billed per generated token. Claude Sonnet 5 shows how that tension is managed today. It has configurable effort levels and an introductory price of $2 per million input tokens and $10 per million output tokens through August 31, 2026. After that, pricing becomes $3 and $15 respectively ([Anthropic, 2026](https://www.anthropic.com/news/claude-sonnet-5)). A longer reasoning chain can improve the result, but it can also increase the bill even when the user never sees those tokens.

Systems that use test-time compute intensively need explicit cost-management strategies: maximum budgets per session, query classification to scale the reasoning level, and cost monitoring by request type to identify requests whose cost exceeds the value they deliver.

### Failure points

A long reasoning chain is also a chain with more steps where something can fail:

- An external tool called by the model can return an error or an unexpected response.
- The context can exceed the model's context-window limit in very long chains.
- Network latency can interrupt streaming halfway through.
- The model can enter an unproductive loop that generates tokens without making progress.

Each of these failures, in a system without explicit recovery design, produces a degraded user experience: a long wait followed by an error instead of an answer.

{{ include_html("snippets/modelos-razonadores/04-latencia-umbral.html") }}

---

## 4. Design patterns for optimizing TTC in products

### Classification by complexity

Classify the request before allocating resources. Simple factual questions do not benefit from long chains of thought. Additional reasoning in those cases is cost without benefit. A lightweight classifier—which can be another LLM or simple rules based on request features—can route to the appropriate TTC level.

### Hard time and token budgets

Define maximum time and token limits for the reasoning process before it starts. If the model has not reached a satisfactory answer within the budget, produce the best answer available at that point with an indication that the analysis is incomplete, instead of continuing indefinitely.

### Verification before expensive steps

In agent flows where the model calls external tools or acts on real systems, verify intent before executing actions with consequences that are difficult to reverse. A brief pause to confirm with the user before a high-impact step costs milliseconds and can prevent expensive damage.

### Explicit fallbacks

Define what the system does when the reasoning chain fails: does it return the latest partial answer? Does it ask the user for more information? Does it degrade to a simpler model that can still provide something? Systems without explicit fallbacks end up producing opaque errors that the user cannot interpret.

> A system that uses test-time compute responsibly knows when to stop, what to do when it stops early, and how to communicate that to the user without breaking the experience.

---

!!! tip "Next reading"
    The final chapter completes the picture with the risks introduced by test-time compute and the design criteria for managing them: [Chapter 5 — Risks: overthinking, cost, attacks and alignment →](./05-riesgos.md)

## 5. References

<details markdown="1">
<summary><strong>Base sources</strong></summary>

| Source | Short description |
| --- | --- |
| **Nielsen, J. (1994)** — *[Usability Engineering](https://www.nngroup.com/books/usability-engineering/)* (Morgan Kaufmann) | Establishes the 0.1 s / 1 s / 10 s thresholds as reference points for latency perception in interactive systems. Cited in §1. |
| **Snell et al. (2024)** — *[Scaling LLM Test-Time Compute Optimally](https://arxiv.org/abs/2408.03314)* | Analyzes the cost and quality profile of different TTC strategies; quantitative basis for the routing and budgeting decisions discussed in §4. |
| **Muennighoff et al. (2025)** — *[s1: Simple Test-Time Scaling](https://arxiv.org/abs/2501.19393)* | Documents how TTC budgeting (budget forcing) produces measurable gains at variable cost; context for the per-session cost variability discussed in §3. |
| **Ong et al. (2024)** — *[RouteLLM: Learning to Route LLMs with Preference Data](https://arxiv.org/abs/2406.18665)* | Dynamic routing technique between models of different capability: a lightweight classifier decides which model and how much TTC to allocate to each request. Cited in §1. |
| **Anthropic (2026)** — *[Claude Sonnet 5](https://www.anthropic.com/news/claude-sonnet-5)* | Current evidence on configurable effort, token pricing and the balance between quality, latency and price. Cited in §1 and §3. |
| **OpenAI (2026)** — *[GPT-5.6 Sol](https://developers.openai.com/api/docs/models/gpt-5.6-sol)* | Three capability levels—Sol, Terra and Luna—together with adjustable effort levels. Cited in §1. |
| **Google DeepMind (2026)** — *[Gemini 3.5 Flash Model Card](https://deepmind.google/models/model-cards/gemini-3-5-flash/)* | Reasoning levels for controlling the balance between quality, cost and latency. Cited in §1. |
| **Anthropic (2026)** — *[Claude Sonnet 5](https://www.anthropic.com/news/claude-sonnet-5)* | Current evidence of configurable effort levels and an explicit balance between cost, latency and performance on agentic tasks. Cited in §1. |
| **Google DeepMind (2026)** — *[Gemini 3.5 Flash Model Card](https://deepmind.google/models/model-cards/gemini-3-5-flash/)* | Documents reasoning levels for controlling the balance between quality, cost and latency. Cited in §1. |

</details>

---

## Frequently asked questions

**Why does streaming not completely solve the latency problem in reasoning models?**
Streaming improves the perception of latency but does not reduce total time. In models that do not expose their chain of thought while reasoning, TTFT still equals the full reasoning time: the user receives no token until the internal process finishes. When the model does stream its chain, the user sees intermediate steps that can be confusing before the useful final answer appears.

**What is the difference between TTFT and total latency, and which matters more?**
TTFT determines the perceived responsiveness of the system: how long it takes for the first character to appear. Total latency determines the perceived speed once generation has started. In reasoning models, TTFT is generally the most visible bottleneck because it can be tens of seconds even when the final answer is brief. Optimizing only total latency produces systems that feel fast once they start but take too long to begin.

**When does RouteLLM make sense?**
RouteLLM is most useful when the request distribution is heterogeneous: there is a high volume of simple questions that do not need deep reasoning and a subset of complex questions that do. If all requests have similar complexity, the classifier adds latency without producing real savings. The benefit depends directly on how much the complexity distribution varies across the system's requests.

**How are SLOs defined when latency is variable?**
The variable latency of reasoning models makes SLOs based on average latency uninformative because the distribution has long tails. It is more practical to define percentiles (p95, p99) and establish active cutoff mechanisms: if the reasoning chain exceeds a time or token threshold, the system produces the best answer available at that point with an indication that the analysis is incomplete, instead of continuing indefinitely.