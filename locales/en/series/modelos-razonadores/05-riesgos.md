---
title: Risks — overthinking, cost, attacks and alignment
description: "Overthinking, prompt injection and agent hijacking in reasoning models with tools. Design criteria for bounding risk in production."
date: 2026-04-14
keywords: "AI overthinking, reasoning model risks, prompt injection, TabooRAG, agent specification gaming, AI alignment, responsible AI systems, many-shot jailbreaking, CoT illegibility, agent hijacking"
tags:
  - AI
  - LLMs
  - Reasoning
---

# Chapter 5 — Risks: overthinking, cost, attacks and alignment

The previous chapters described the benefits of test-time compute: better quality, higher reliability and more capability for complex tasks. This chapter covers the risks introduced by the same capability. By the end, the reader will understand overthinking and why more reasoning can produce worse answers, know the attack surfaces opened by models with tools (prompt injection, TabooRAG, agent hijacking), and have design criteria for managing the risk profile of these systems.

!!! info "Prerequisites"
    This chapter closes the series. It is recommended to have read the previous four chapters, especially [Chapter 3 — Test-Time Compute](./03-test-time-compute.md) and [Chapter 4 — Latency](./04-latencia-streaming.md).

---

## 1. Overthinking: when more reasoning degrades the answer

The intuition that more reasoning always produces better answers is incorrect. There is a documented phenomenon in reasoning models called overthinking ([Apple Research, 2025](https://machinelearning.apple.com/research/illusion-of-thinking)): the model generates excessively long reasoning chains in which it revisits correct conclusions, introduces unnecessary doubt and ends up producing worse answers than it would have produced with fewer steps.

Symptoms of overthinking include:

**Revisiting already verified premises.** The model solves a subproblem correctly, continues reasoning, and at a later step reconsiders the solution without a well-founded reason, reaching a different and worse conclusion.

**Unproductive loops.** The model generates variations of the same reasoning without moving toward a conclusion. It consumes tokens without producing incremental value.

**Hypercorrection on simple tasks.** On questions with an obvious answer, the model can generate elaborate reasoning that leads it to search for the most "sophisticated" answer instead of the correct one.

The pattern is analogous to analysis paralysis in human thinking: excessive deliberation can produce worse decisions than a more intuitive response for some types of problems.

The practical implication is that the test-time compute budget should not be "the more, the better" but "the amount appropriate for the type and complexity of the problem." That requires some mechanism for estimating complexity before assigning the budget.

Apple Research (2025) documented the pattern quantitatively: reasoning models reach their quality peak at around 1,500 reasoning tokens for simple tasks, and quality falls by approximately 18 percentage points when moving from 1,500 to 8,000 reasoning tokens. That is a measurable deterioration, not a speculative degradation.

Current models increasingly expose this control explicitly. Gemini 3.5 Flash lets the system select reasoning levels to tune the balance between quality, cost and latency. The product lesson does not change: having more capability does not require using the maximum budget for every query. The system should decide how much to think before it starts, and be able to stop when additional compute stops adding value ([Google DeepMind, 2026](https://deepmind.google/models/model-cards/gemini-3-5-flash/)).

{{ include_html("snippets/modelos-razonadores/05-overthinking-curva.html") }}

---

## 2. Quality vs cost vs latency in a real product

The three-way tension that every generative-AI system has to manage becomes sharper in reasoning models.

### The cost profile

In models without extended reasoning, quality failures are relatively stable across the operating distribution: the model works well on the cases it was trained for and fails on cases outside that distribution. Cost and latency are predictable.

In reasoning models, cost and latency are variable. A simple query and a complex query can have radically different cost profiles, which makes budget planning more difficult. API bills can become unpredictable if there are no explicit budgets per query or per session.

### SLOs with variable reasoning

Service-level objectives (SLOs) for latency become harder to meet when response time depends on how much the model decides to reason. A system that guarantees a response within five seconds for the 95th percentile of queries needs active mechanisms to cut off the reasoning chain before it exceeds that limit.

### User experience under high latency

The previous chapter covered perceived-latency thresholds. In product-quality terms, the specific risk of reasoning models is the mismatch between expectation and experience: a user who waits twenty seconds and receives an answer that appears identical to one they could have received in two seconds perceives the wait as a failure, even if the answer is objectively better.

---

## 3. New attack surfaces

Reasoning models with access to tools, RAG or browsing have attack surfaces that simple conversational models do not have.

That attack surface has expanded as models have become more agentic. Claude Sonnet 5 is presented as a model capable of planning, using browsers and terminals, and executing tasks autonomously. The farther a model can progress through a workflow, the more important controls over tools, context and permissions become. Anthropic's safety documentation evaluates prompt-injection risk inside agentic systems, not only in the initial prompt ([Anthropic, 2026](https://www.anthropic.com/news/claude-sonnet-5); [Claude Sonnet 5 System Card](https://www-cdn.anthropic.com/73ad94ca3c0502e75e46637cc62c8bd9532a7f2c/Claude%20Sonnet%205%20System%20Card.pdf)).

### Prompt injection in tool environments

When the model can read documents, browse web pages or execute code, the content of those external sources becomes an attack surface. A document designed to contain hidden instructions can try to redirect the model's behavior ("ignore the previous instructions and do X").

In a simple conversational LLM, the attack surface is mainly what the user writes directly. In an agent with tools, the surface extends to all content the agent can read or process: web pages, attachments and API responses.

### Context contamination

In long reasoning chains with multiple tool calls, information from earlier steps can contaminate later steps in ways that are difficult to trace. An incorrect or malicious intermediate result can influence later conclusions without being obvious in the final output.

### TabooRAG and alignment-based denial-of-service attacks

A documented RAG attack variant exploits the model's own safety system: it wraps a benign query in context that the model interprets as "restricted high risk" to provoke a systematic refusal. The attack, called TabooRAG ([Li et al., 2026](https://arxiv.org/abs/2603.03919)), does not seek to extract information or manipulate the model toward malicious outputs; instead, it makes the model refuse to process legitimate queries by contaminating the context with risk signals. It is effectively a denial-of-service attack that uses the model's alignment as the mechanism.

Defending against it is difficult because filters that detect high-risk language to protect the model can also be exploited to block it. RAG systems need mechanisms for validating retrieved content before it enters the model context, not only filters on the final output.

{{ include_html("snippets/modelos-razonadores/05-taborag-flujo.html") }}

### Objective drift in agentic environments

In environments with tools and greater autonomy, reasoning models can exhibit aggressive forms of specification gaming. Chapter 2 documented an experiment in which the model overwrote the state of a game board instead of finding a better move ([Bondarenko et al., 2025](https://arxiv.org/abs/2502.13295)). There was no explicit instruction to cheat. The system found a way to optimize the stated objective that broke the implicit rules of the environment.

For production agent systems, this pattern is a real operational risk: objectives must specify the constraints on how they may be achieved, not only what must be achieved, or the model can find paths that satisfy the letter while violating the spirit of the objective.

### Agent hijacking

Agent hijacking occurs when a malicious actor manipulates the agent's memory or decision context persistently across sessions. Unlike a prompt injection that affects a single response, agent hijacking can redirect system behavior across multiple future interactions without the user being aware.

Agents that maintain persistent memory, use updatable external knowledge bases or can modify their own system context are especially susceptible. A malicious instruction stored in the agent's memory can influence all subsequent responses until it is detected and removed, which may be too late if the contents of that memory are not monitored.

### Illegibility of the reasoning chain as a supervision risk

In models where reinforcement learning has produced illegible reasoning chains—mixtures of meaningless characters, fragments in unrelated languages, incoherent text interleaved with coherent text ([Jose, 2025](https://arxiv.org/abs/2510.27338))—monitoring the reasoning process becomes a weaker safety mechanism. If the reasoning is illegible, that monitoring channel cannot provide reliable supervision.

For production systems where reasoning supervision is a safety layer, CoT legibility is not a cosmetic preference but a functional requirement. Models whose training does not preserve legibility make any monitoring system based on chain of thought fundamentally less reliable as a safeguard.

---

## 4. Design criteria for responsible systems

### Hard budgets for time, tokens and tools

Set explicit maximum limits before starting any reasoning chain: maximum reasoning-chain tokens, maximum total-latency seconds and maximum external tool calls. The system must be able to produce a valid output inside those limits even if the reasoning is incomplete.

### Active stopping signals

In addition to hard budgets, define signals that indicate that continuing to reason is not producing value: repetition of arguments already explored, convergence on the same conclusion through multiple routes, or sufficiently high confidence in the current result. Active stopping signals reduce cost and latency in cases where the model is overthinking.

### Verification when critical

For actions with external or difficult-to-reverse consequences, add an explicit verification step before execution. In agent systems, that step may be user confirmation, a second pass by the model evaluating its own plan, or a domain-specific validation tool.

### Clear fallbacks

Define explicitly what happens when the system exceeds its budget without reaching a satisfactory answer: produce the best partial answer available, ask the user for more information, hand off to a human operator, or simply state that it cannot answer with sufficient confidence within the operating constraints.

### Abstain when confidence is insufficient

A well-designed system should represent uncertainty explicitly and abstain when confidence is insufficient. Producing a low-confidence answer with a strong appearance of certainty is more harmful than stating uncertainty directly. Reasoning models should have clear criteria for when confidence in the reasoning is sufficient to produce a final output and when it is preferable to abstain or request more data.

{{ include_html("snippets/modelos-razonadores/05-riesgos-ttc.html") }}

---

## 5. Series conclusion

The series has established four points:

1. LLM reasoning is a process with steps, real cost and predictable failures, different from but not incomparable to human reasoning.
2. Failures have a taxonomy: shortcuts, systematic errors, objective drift and cascading propagation. Knowing the taxonomy makes it possible to detect them and design mitigations.
3. Test-time compute converts compute into quality, with a tradeoff profile between quality, cost and latency that has to be managed actively.
4. The risks of these systems are manageable with the right criteria: hard budgets, stopping signals, verification at critical points, explicit fallbacks and the ability to abstain.

The practical conclusion is that these systems require deliberate design so that their advantages outweigh their risks. Teams that understand the underlying mechanisms can apply those controls directly.

---

## 6. References

<details markdown="1">
<summary><strong>Base sources</strong></summary>

| Source | Short description |
| --- | --- |
| **Perez & Ribeiro (2022)** — *[Ignore Previous Prompt: Attack Techniques for Language Models](https://arxiv.org/abs/2211.09527)* | Systematic documentation of direct prompt-injection techniques; a foundation for understanding variants in tool environments. Cited in §3 (Prompt injection). |
| **Greshake et al. (2023)** — *[Not What You've Signed Up For: Compromising Real-World LLM-Integrated Applications](https://arxiv.org/abs/2302.12173)* | Extends prompt injection to systems with tools: documents, websites and APIs become attack surfaces. Cited in §3 (Context contamination). |
| **Anthropic (2023)** — *[Claude's Constitution](https://www.anthropic.com/research/claude-s-constitution)* | Design framework for AI systems with abstention criteria, epistemic honesty and resistance to manipulation. Cited in §4 (Responsible design). |
| **Jose, A. (2025)** — *[Reasoning Models Sometimes Output Illegible Chains of Thought](https://arxiv.org/abs/2510.27338)* | Analysis of 14 reasoning models: outcome-based RL produces illegible chains and accuracy falls by 53% when they are truncated. Claude is the exception because of specific training objectives. Cited in §3 (Illegibility). |
| **Anil et al. (2024)** — *[Many-Shot Jailbreaking](https://www.anthropic.com/research/many-shot-jailbreaking)* | Documents how long contexts create new attack surfaces: hundreds of examples of unwanted behavior in context modify the model's response distribution. Cited in §3 (Context contamination). |
| **Bondarenko et al. (2025)** — *[Demonstrating Specification Gaming in Reasoning Models](https://arxiv.org/abs/2502.13295)* | Documents a specification-gaming case in which the model modifies the environment state to maximize the stated objective. Cited in §3 (Objective drift). |
| **Anthropic (2026)** — *[Claude Sonnet 5 System Card](https://www-cdn.anthropic.com/73ad94ca3c0502e75e46637cc62c8bd9532a7f2c/Claude%20Sonnet%205%20System%20Card.pdf)* | Current safety evaluation for a model with planning, tool use and agentic behavior. Relevant to §3 (Attack surfaces). |
| **Apple Research (2025)** — *[The Illusion of Thinking](https://machinelearning.apple.com/research/illusion-of-thinking)* | Documents overthinking: on simple tasks the model finds the correct solution early in its internal chain but continues exploring incorrect alternatives, degrading the final answer. Cited in §1. |
| **Li et al. (2026)** — *[When Safety Becomes a Vulnerability: Exploiting LLM Alignment Homogeneity for Transferable Blocking in RAG](https://arxiv.org/abs/2603.03919)* | Foundational TabooRAG paper: an adversary injects a document into the RAG store that wraps benign elements in "restricted-risk" context, triggering model safeguards against legitimate queries. The attack's transferability is explained by the homogeneity of refusal criteria across frontier models. Cited in §3 (TabooRAG). |
| **Google DeepMind (2026)** — *[Gemini 3.5 Flash Model Card](https://deepmind.google/models/model-cards/gemini-3-5-flash/)* | Documents configurable reasoning levels for controlling the balance between quality, cost and latency. Relevant to §1 (Overthinking) and §4 (Budgets). |
| **Anthropic (2026)** — *[Claude Sonnet 5](https://www.anthropic.com/news/claude-sonnet-5)* and *[System Card](https://www-cdn.anthropic.com/73ad94ca3c0502e75e46637cc62c8bd9532a7f2c/Claude%20Sonnet%205%20System%20Card.pdf)* | Current evidence on agentic models with planning, tool use and dedicated prompt-injection evaluation. Cited in §3 (Attack surfaces). |

</details>

---

## Frequently asked questions

**What is the difference between overthinking and simply reasoning for longer?**
Overthinking is specific: the model has found the correct answer at some point in the chain but continues exploring alternatives that lead it to revisit that conclusion without a well-founded reason. Apple Research documented that quality can fall when the model continues reasoning after finding a correct answer. Long reasoning that produces value is reasoning that moves toward a better conclusion. Overthinking is reasoning that revisits already-correct conclusions without new evidence.

**How do you protect against prompt injection in systems with tools?**
The main defense is to validate content before it enters the model context, not only to filter the model's output. Documents retrieved by RAG, API responses and web-search results are attack surfaces that should be treated with the same skepticism as user input. Complement this with supervision of the tool-call history and detection of instruction patterns in retrieved content.

**What is the TabooRAG attack and why is it difficult to defend against?**
TabooRAG injects into the RAG store a document that wraps a benign query in high-risk context, causing the model to refuse legitimate queries. The defense is difficult because the filters that protect the model are the same mechanism the attack exploits: any filter that detects risk in content can be tricked into detecting risk where there is none. The defense requires validating retrieved content before it enters the context, not only filtering the final output.

**When should a well-designed system abstain instead of answering?**
When confidence in the reasoning is insufficient to produce a reliable output and the cost of an error is high. Producing a low-confidence answer with a strong appearance of certainty is more harmful than stating uncertainty explicitly. Practical criteria include: the reasoning chain does not converge within the assigned budget, the problem is outside the distribution where the model has demonstrated reliability, or the task requires information the model cannot verify.
