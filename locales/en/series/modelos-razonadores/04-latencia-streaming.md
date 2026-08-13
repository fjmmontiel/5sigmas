---
title: Physical time — latency, streaming and human interaction
description: "TTFT, streaming and perceived-latency thresholds for reasoning models. RouteLLM, production design patterns and session-cost management."
date: 2026-04-11
keywords: "AI latency, TTFT, LLM streaming, RouteLLM, test-time compute product, perceived latency, AI response time, AI SLO, speculative decoding"
tags:
  - AI
  - LLMs
  - Reasoning
---

# Chapter 4 — Physical time: latency, streaming and human interaction

The previous chapter described test-time compute as a design variable. This chapter translates that variable into a product problem: what happens when compute measured in a paper becomes real seconds that a user must wait. By the end, you will know the perceived-latency thresholds that determine when waiting starts to break an experience, understand the difference between TTFT and total latency and why that distinction matters, and know the design patterns that let a product use test-time compute without destroying usability.

!!! info "Prerequisites"
    This chapter assumes the test-time compute concepts introduced in [Chapter 3 — Test-Time Compute](./03-test-time-compute.md).

"Thinking longer" is measured in tokens in a paper. In a product, it is measured in seconds of blank screen, in more expensive sessions and in systems with more places where something can fail.

Moving from theory to practice requires understanding three things: how long users can wait before the interaction breaks down, how streaming changes the perception of waiting, and which architectural patterns let us buy more reasoning without buying a poor experience.

---

## 1. Perceived-latency thresholds

User-experience research has studied latency for decades. [Jakob Nielsen](https://www.nngroup.com/books/usability-engineering/) established a scale in the 1990s that remains useful:

- **Up to 0.1 seconds:** response feels instantaneous. The user experiences the system as reacting directly to their action.
- **0.1 to 1 second:** the pause is noticeable but does not interrupt the user's train of thought.
- **1 to 10 seconds:** the pause requires active feedback so that the user does not assume something failed. Around 5–7 seconds, many users begin to disengage from the task.
- **More than 10 seconds:** the user needs meaningful feedback or something useful to do while waiting. A silent interface feels broken.

Reasoning models with long internal chains routinely operate in the 10–60 second range on hard problems. Without explicit latency design, their default interaction therefore starts in a poor UX regime.

That latency cannot be solved only by buying faster hardware. A reasoning chain is sequential: token 500 cannot be generated before token 499 exists. The single-query lower bound is approximately `chain_length ÷ generation_speed`. A longer chain still requires more time even as the hardware improves. Streaming can expose progress; it does not eliminate the work.

Hardware and decoding improvements do move the denominator. If generation becomes 10× faster, a 10,000-token chain that took 100 seconds can take 10. If it becomes 100× faster, the same chain can approach one second. The present latency limit is therefore not a permanent property of reasoning itself; it is partly a point on the inference-hardware curve.

In real systems that combine an LLM with tool calls and RAG, total latency for a medium-complexity request can reach tens of seconds, with reasoning accounting for one part and API calls, retrieval and synthesis accounting for the rest. That matters because perceived latency can be improved either at the model layer—less TTC—or at the system layer—faster tools, caches and parallel work.

A critical distinction is **TTFT (Time To First Token)** versus total latency. TTFT is the time between the user's request and the first visible character. In a reasoning model that does not stream its internal reasoning, TTFT includes the entire hidden reasoning phase. It can therefore be several seconds even when the final answer is short. TTFT determines how responsive the system feels; total latency determines how fast the response completes after it starts. Optimizing one and ignoring the other creates systems that either start late or finish late.

{{ include_html("snippets/modelos-razonadores/04-ttft-streaming.html") }}

### Dynamic routing: RouteLLM

A useful pattern is dynamic routing, formalized as [RouteLLM (Ong et al., 2024)](https://arxiv.org/abs/2406.18665). Instead of using the most capable—and slowest—model for every request, a lightweight classifier inspects the incoming query and selects an appropriate model and reasoning budget.

A simple factual query goes to a fast, inexpensive path. A genuinely complex reasoning problem gets more compute. The user pays the quality/latency cost only where that cost produces value. The router itself adds a small overhead, but the net gain can be large when the request distribution is heterogeneous.

The modern version of the problem is no longer merely "small model or large model." Model families increasingly expose both model choice and reasoning-effort controls. In production, the router may need to decide two things: which capability tier to invoke and how much reasoning budget to assign to this particular query.

{{ include_html("snippets/modelos-razonadores/04-routellm-decision.html") }}

Current model families expose this tradeoff explicitly. GPT-5.6 offers capability tiers and configurable reasoning effort. Claude Sonnet 5 and Gemini 3.5 Flash expose comparable controls that move the balance between quality, latency and cost ([OpenAI, 2026](https://developers.openai.com/api/docs/models/gpt-5.6-sol); [Anthropic, 2026](https://www.anthropic.com/news/claude-sonnet-5); [Google DeepMind, 2026](https://deepmind.google/models/model-cards/gemini-3-5-flash/)).

---

## 2. Streaming and the perception of latency

Streaming—sending tokens to the client while they are generated instead of waiting for the complete response—is the most common way to improve perceived latency without reducing total computation.

The psychological difference is real: receiving the first token after half a second and watching the response build progressively feels faster than receiving the entire answer after five seconds, even if the total completion time is similar.

Reasoning models complicate the pattern because the internal chain is not always useful to expose before it is complete. For a mathematical problem, showing intermediate work can help or confuse depending on the user and context. If the interface waits for all hidden reasoning to finish before it starts streaming the final answer, the main perceptual benefit of streaming disappears.

### Streaming patterns for reasoning models

**Visually separated reasoning stream.** When appropriate and supported, show reasoning/progress in a visually distinct area so the user can tell provisional work from the final answer.

**Meaningful progress states.** Instead of a generic spinner, show phases such as "Analyzing the problem," "Generating candidate solutions," and "Verifying the result." This reduces uncertainty without requiring the true internal reasoning trace.

**Progressive partial results.** For tasks that decompose naturally, expose useful completed sections while the remaining analysis continues. A report can stream finished sections instead of holding the entire document until the last token.

---

## 3. Session cost and breakpoints

More test-time compute does not only increase latency. It increases session cost and multiplies the number of places where a workflow can fail.

### Session cost

Generative systems are typically charged by tokens and/or inference time. Reasoning-effort controls therefore affect the bill even when the user never sees the internal reasoning tokens. A longer chain may improve quality while making the same user-visible answer substantially more expensive.

Systems that use TTC aggressively need explicit cost controls: maximum per-session budgets, query classification to select an effort tier, and observability by request type so expensive patterns can be identified and challenged.

### Breakpoints

Long reasoning workflows contain more operational failure points:

- an external tool can return an error or unexpected data;
- the context can approach the model's window limit;
- network latency can interrupt a streamed response;
- the model can enter an unproductive loop and spend tokens without making progress.

Without explicit recovery design, each of these produces the worst possible UX: a long wait followed by an opaque failure.

{{ include_html("snippets/modelos-razonadores/04-latencia-umbral.html") }}

---

## 4. Product design patterns for TTC

### Classify by complexity

Classify the request before allocating expensive reasoning. Simple factual queries rarely benefit from long chains. Additional compute in those cases is cost without corresponding quality gain. A lightweight classifier—another small model or deterministic rules—can route the request to the right TTC tier.

### Hard time and token budgets

Define maximum time and token budgets before reasoning begins. If the model has not reached a satisfactory answer within the budget, return the best available result with an explicit indication that the analysis is incomplete rather than letting the process continue indefinitely.

### Verify before expensive or irreversible steps

In agentic flows where the model calls external tools or acts on real systems, verify intent before executing high-impact actions. A short confirmation step before an irreversible operation can prevent damage whose cost dwarfs the latency of the confirmation itself.

### Explicit fallbacks

Define what the system does when reasoning fails: return the best partial result, ask the user for missing information, retry a bounded sub-step, or fall back to a simpler model. Systems without explicit fallback semantics collapse into errors the user cannot interpret.

> A system that uses test-time compute responsibly knows when to stop, what to do when it stops early, and how to communicate that state without breaking the interaction.

---

!!! tip "Next reading"
    The final chapter closes the series with the risks introduced by extended reasoning and the design criteria for managing them: [Chapter 5 — Risks: overthinking, cost, attacks and alignment →](./05-riesgos.md)

## 5. References

<details markdown="1">
<summary><strong>Primary sources</strong></summary>

| Source | Short description |
| --- | --- |
| **Nielsen, J. (1994)** — *[Usability Engineering](https://www.nngroup.com/books/usability-engineering/)* | Establishes the 0.1 s / 1 s / 10 s response-time thresholds used in §1. |
| **Snell et al. (2024)** — *[Scaling LLM Test-Time Compute Optimally](https://arxiv.org/abs/2408.03314)* | Studies quality/cost tradeoffs for TTC strategies; quantitative context for routing and budget decisions. |
| **Muennighoff et al. (2025)** — *[s1: Simple Test-Time Scaling](https://arxiv.org/abs/2501.19393)* | Demonstrates budget forcing and measurable gains from variable TTC. |
| **Ong et al. (2024)** — *[RouteLLM: Learning to Route LLMs with Preference Data](https://arxiv.org/abs/2406.18665)* | Dynamic routing between models of different capability and cost. |
| **Anthropic (2026)** — *[Claude Sonnet 5](https://www.anthropic.com/news/claude-sonnet-5)* | Current evidence for configurable effort and explicit quality/latency/cost tradeoffs. |
| **OpenAI (2026)** — *[GPT-5.6 Sol](https://developers.openai.com/api/docs/models/gpt-5.6-sol)* | Capability tiers and configurable reasoning effort. |
| **Google DeepMind (2026)** — *[Gemini 3.5 Flash Model Card](https://deepmind.google/models/model-cards/gemini-3-5-flash/)* | Reasoning levels controlling the balance between quality, cost and latency. |

</details>

---

## Frequently asked questions

**Why does streaming not completely solve latency for reasoning models?**
Streaming improves perceived latency but not total time. If the model does not expose its reasoning chain, TTFT still includes the complete internal reasoning phase. If it does stream provisional reasoning, users may receive intermediate content that is not yet useful or stable.

**What is the difference between TTFT and total latency, and which matters more?**
TTFT determines perceived responsiveness: how long the interface stays silent before the first visible token. Total latency determines how long the entire response takes. In reasoning systems, TTFT is often the most obvious bottleneck because it can be long even for a short final answer.

**When does RouteLLM make sense?**
It is most useful when the request distribution is heterogeneous: many simple queries need little reasoning and a smaller subset genuinely benefits from deeper compute. If every request has similar complexity, routing overhead buys little.

**How should SLOs be defined when latency is highly variable?**
Means hide long tails. Percentile SLOs such as p95/p99 are more informative, combined with active cutoffs: if reasoning crosses a time or token threshold, terminate or degrade gracefully instead of allowing an unbounded tail.
