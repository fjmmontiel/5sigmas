---
title: "What is AGI: Artificial General Intelligence"
description: "What AGI means, why there is no consensus definition, DeepMind's capability levels, economic definitions, and what would still be required to reach it."
date: 2026-03-20
keywords: "AGI, artificial general intelligence, what is AGI, AGI definition, DeepMind AGI levels, superintelligence, AI alignment, OpenAI AGI"
tags:
  - AI
  - AGI
  - Alignment
---

# Chapter 4 — AGI: Artificial General Intelligence

This chapter closes the Foundations series by examining Artificial General Intelligence: what the term means, why there is no consensus definition and what reaching it would imply. By the end, you will understand the main definitions in dispute, DeepMind's capability-level framework, the gap between today's frontier systems and robust general intelligence, and why economic impact, scientific acceleration and alignment become increasingly important as systems grow more capable.

!!! info "Prerequisites"
    This chapter closes the series. It is best read after [Chapter 1 — What is AI?](./01-que-es-ia.md), [Chapter 2 — What is Generative AI?](./02-que-es-ia-generativa.md) and [Chapter 3 — Classical AI vs Generative AI](./03-ia-vs-ia-generativa.md).

A fraud detector cannot explain thermodynamics. A vision classifier cannot play chess. A language model can generate fluent text but does not automatically drive a car, repair a tap or remember yesterday's conversation unless the surrounding system gives it those capabilities.

**Artificial General Intelligence (AGI)** is the term usually used for a system capable of competent performance across a **broad range of cognitive tasks**, without being redesigned separately for each one, while transferring useful knowledge between domains.

The problem is that the field does not agree on exactly where that threshold lies.

---

## 1. The definition problem

“AGI” is not a technical term with one universally accepted test. Different communities use it to capture different properties:

- breadth across intellectual tasks,
- economically useful autonomy,
- transfer and learning in unfamiliar domains,
- expert-level or superhuman performance,
- or the ability to automate increasingly large parts of AI research itself.

Those definitions are related but not equivalent. Depending on the criterion, the threshold can move dramatically.

---

## 2. Definitions in dispute

### 2.1 Cognitive definition

The classical framing is roughly: an AGI can perform **the broad range of intellectual tasks a human can perform** rather than excelling only in one engineered domain.

This includes abstract reasoning, learning unfamiliar tasks, common-sense knowledge, long-horizon planning and transferring knowledge across domains.

The difficulty is measurement. “Human-level” is not one number. Humans differ substantially by task, expertise, time budget and access to tools.

### 2.2 Economic definition

The [OpenAI Charter][r3] defines AGI as **highly autonomous systems that outperform humans at most economically valuable work**.

This shifts the question from cognitive similarity to broad economic usefulness. It is more operational because labour and productivity can be benchmarked, but it may classify a system as economically general before it satisfies stronger notions of cognitive generality.

A system could transform a large share of knowledge work while still lacking robust physical understanding, persistent learning or transfer to truly unfamiliar environments.

### 2.3 Capability spectrum: six levels

DeepMind proposed treating progress toward AGI as a spectrum rather than one binary event. The framework separates **performance** from **generality** and uses six approximate capability levels:

| Level | Description | Approximate intuition |
|---|---|---|
| **0. No AI** | No autonomous intelligent capability | Calculator |
| **1. Emerging** | At least non-expert-level performance on some tasks | Current systems on bounded tasks |
| **2. Competent** | At least as capable as a substantial fraction of skilled adults across a broad set of tasks | Not established as broadly achieved |
| **3. Expert** | Expert-level performance across most relevant tasks | Achieved only in narrow domains today |
| **4. Virtuoso** | At or above the best humans across essentially all relevant domains | Not achieved |
| **5. Superintelligence** | Beyond all humans across cognitive tasks | Hypothetical |

The important idea is that a system can be spectacularly strong on one benchmark while remaining narrow in overall generality.

### 2.4 Safety-oriented definitions

For AI-safety researchers, a critical threshold may be less about “human-level intelligence” and more about **autonomous capability growth**: systems able to automate increasingly large parts of AI research, improve tooling, and contribute to building more capable successors.

Operational safety frameworks such as Anthropic's Responsible Scaling Policy therefore define capability thresholds around AI R&D automation rather than relying only on the word AGI.

> The ambiguity is not merely poor terminology. Different groups are trying to measure different properties of increasingly capable systems.

{{ include_html("snippets/fundamentos-ia-iag/04-niveles-agi.html") }}

---

## 3. What current systems still do not establish

Frontier models are extremely capable across language, coding, mathematics and tool use. They also have limits that matter when discussing general intelligence.

### What current systems do well

- Expert-level language generation and analysis in many trained domains.
- Reasoning over large provided contexts.
- In-context adaptation from a small number of demonstrations.
- Software engineering and debugging on increasingly realistic benchmarks.
- Computer use and web interaction when given tools and interfaces.
- Cross-domain synthesis when relevant information is available in training or context.
- High performance on selected mathematics and science competitions and benchmarks.

### What remains incomplete

- **Robust causal reasoning:** systems can confuse correlation and causation and remain brittle under some counterfactual changes.
- **Grounded physical understanding:** text and multimodal training are not equivalent to reliable embodied interaction with the physical world.
- **Persistent learning:** ordinary inference does not continuously update the pretrained model's weights; memory must be added explicitly.
- **Out-of-distribution generalization:** performance can fail unpredictably when tasks depart substantially from learned patterns.
- **Reliable uncertainty awareness:** models do not always know when they lack information and can produce confident unsupported outputs.
- **Long-horizon autonomy:** sustained multi-step work remains substantially harder than short benchmark questions.

> Passing a short conversational Turing-style interaction is not the same as demonstrating general intelligence.

<details markdown="1">
<summary><strong>Does a language model “understand”?</strong></summary>

This remains an active philosophical and empirical debate.

One view argues that language models learn statistical structure from representations of the world rather than direct causal interaction with the world itself, so linguistic competence should not be equated with grounded understanding.

Another view notes that learned representations support genuine generalization: models can combine concepts in ways that exceed simple memorization, and internal representations encode useful structure related to space, time, truth and semantics.

The unresolved question matters because it changes what we should expect from scaling. If broad understanding emerges sufficiently from multimodal predictive learning, scale may continue closing the gap. If robust intelligence requires deeper interaction, memory and causal experience, scale alone may not be enough.

</details>

{{ include_html("snippets/fundamentos-ia-iag/04-capacidades-limites.html") }}

---

## 4. If AGI arrived: what would change?

### Economic impact

A broadly capable cognitive system could automate not only repetitive work but parts of analysis, design, research and complex decision-making.

Even estimates for current generative AI are wide. McKinsey has estimated that generative AI could affect activities representing a large share of worker time, while Goldman Sachs has estimated meaningful exposure of jobs and tasks to AI-driven automation. ([McKinsey][r8], [Goldman Sachs][r9])

The distribution of impact matters as much as the aggregate productivity gain: who captures the value, which tasks disappear first, which new work appears, and how transitions are managed.

### Scientific impact

AlphaFold provides a concrete example of AI accelerating scientific work. Its protein-structure predictions helped transform a decades-old scientific challenge and contributed to the work recognized by the 2024 Nobel Prize in Chemistry.

A much more general system able to absorb large literatures, identify contradictions, propose testable hypotheses and design experiments could compress the cycle from scientific question to useful application.

### Alignment

The central safety concern is not that a powerful system must be “evil.” It is that it may be **highly capable while optimizing an objective that imperfectly captures what people actually want**.

Alignment is the technical and philosophical problem of ensuring that increasingly capable systems pursue intended outcomes under uncertainty, conflicting preferences and changing contexts.

> There is no complete, generally accepted solution to alignment for arbitrarily capable autonomous systems. That uncertainty is a technical reason to study capability thresholds and control mechanisms before systems become much harder to supervise.

{{ include_html("snippets/fundamentos-ia-iag/04-impacto-agi.html") }}

---

## 5. Where are we now?

No public consensus establishes that current systems satisfy the strongest cognitive, economic or recursive-improvement definitions of AGI. Instead, we have extremely capable but still uneven systems whose coverage across tasks is widening quickly.

{{ include_html("snippets/fundamentos-ia-iag/04-benchmarks-evolucion.html") }}

{{ include_html("snippets/fundamentos-ia-iag/04-ia-vs-humanos.html") }}

Frontier systems in 2025–2026 report expert or superhuman results in bounded domains such as coding, formal mathematics and scientific benchmarks, but narrow benchmark strength does not by itself establish broad generality.

One useful measure is **task horizon**. METR estimates how long a task, measured by the time required by a skilled human, a model can complete with a target reliability such as 50%. The key idea is that sustained work over hours or days is a more demanding autonomy test than answering isolated questions.

Another family of tests, such as ARC-AGI, attempts to measure adaptation to unfamiliar abstract problems from very few examples. Performance has improved dramatically, but the benchmark designers themselves emphasize that high benchmark scores are not equivalent to proving AGI.

The most useful question is therefore not “what exact date will AGI arrive?” No one can answer that reliably. Better questions are:

- Which capabilities are becoming robust across domains rather than on one benchmark?
- How long can systems operate autonomously before errors compound?
- How well do they transfer to genuinely novel tasks?
- Can they recognize uncertainty and recover safely from failure?
- What controls remain effective as capability increases?

!!! abstract "Position summary"
    **What we know:** modern systems outperform humans on some bounded tasks, their autonomous task horizon is increasing, and general-reasoning benchmarks are improving quickly.

    **What we do not know:** whether continued scaling converges to robust general intelligence; where unknown ceilings may exist; whether current alignment methods remain adequate for much more capable systems; and how strongly benchmark progress transfers outside benchmark distributions.

    **What true broad generality would imply:** deep changes to cognitive labour, faster scientific discovery, and a much higher premium on solving control and alignment before failures become difficult to reverse.

This is the purpose of the Foundations series: a conceptual map that remains useful even while specific model names change.

!!! tip "Continue learning"
    The next learning path follows the historical sequence that produced today's systems: [From the Caves to AGI →](/en/series/from-cave-to-agi/00_presentacion_serie/)

---

## 6. References

<details markdown="1">
<summary><strong>Core sources</strong></summary>

| Key | Source | Short description |
|---|---|---|
| R1 | **Morris et al. (2023)** — *Levels of AGI: Operationalizing Progress on the Path to AGI* ([arXiv][r1]) | DeepMind's capability/generality framework. |
| R2 | **Bubeck et al. (2023)** — *Sparks of Artificial General Intelligence* ([arXiv][r2]) | Early GPT-4 capability analysis. |
| R3 | **OpenAI** — *OpenAI Charter* ([OpenAI][r3]) | Economic definition of AGI. |
| R4 | **Stuart Russell (2019)** — *Human Compatible* | AI control and value-alignment framing. |
| R5 | **Nick Bostrom (2014)** — *Superintelligence* | Influential risk scenario; a debate reference rather than scientific consensus. |
| R6 | **Krakovna et al. (2020)** — *Specification gaming* ([DeepMind][r6]) | Examples of systems optimizing the wrong proxy objective. |
| R7 | **Grace et al. (2024)** — *Thousands of AI Authors on the Future of AI* ([arXiv][r7]) | Survey of AI researchers' forecasts. |
| R8 | **McKinsey Global Institute (2023)** — *The economic potential of generative AI* ([McKinsey][r8]) | Economic-impact estimates. |
| R9 | **Goldman Sachs (2023)** — *The Potentially Large Effects of Artificial Intelligence on Economic Growth* ([Goldman Sachs][r9]) | Labour/task exposure estimates. |
| R10 | **OpenAI (2025)** — *GPT-5 System Card* ([OpenAI][r10]) | Frontier capability and safety evaluations. |
| R11 | **Anthropic (2026)** — *Introducing Claude Sonnet 4.6* ([Anthropic][r11]) | Computer-use, coding and long-context capability report. |
| R12 | **METR (2025)** — *Measuring AI Ability to Complete Long Tasks* ([METR][r12]) | Task-horizon methodology. |
| R13 | **Google DeepMind (2026)** — *Gemini 3.1 Pro* ([DeepMind][r13]) | Frontier benchmark report. |
| R14 | **Google (2026)** — *Gemini 3 Deep Think* ([Google][r14]) | Reported advanced reasoning results. |
| R15 | **ARC Prize Foundation (2025)** — *ARC-AGI-2* ([ARC Prize][r_arc]) | Generalization benchmark and methodology. |
| R16 | **Anthropic** — *Responsible Scaling Policy* ([RSP][r_rsp]) | Capability thresholds linked to safety measures. |
| R17 | **OpenAI (2026)** — *Why SWE-bench Verified no longer measures frontier coding capabilities* ([OpenAI][r_swe]) | Benchmark-contamination analysis. |

</details>

[r1]: https://arxiv.org/abs/2311.02462
[r2]: https://arxiv.org/abs/2303.12528
[r3]: https://openai.com/charter/
[r6]: https://deepmind.google/discover/blog/specification-gaming-the-flip-side-of-ai-ingenuity/
[r7]: https://arxiv.org/abs/2401.02843
[r8]: https://www.mckinsey.com/capabilities/mckinsey-digital/our-insights/the-economic-potential-of-generative-ai-the-next-productivity-frontier
[r9]: https://www.goldmansachs.com/insights/articles/generative-ai-could-raise-global-gdp-by-7-percent.html
[r10]: https://openai.com/index/gpt-5-system-card/
[r11]: https://www.anthropic.com/news/claude-sonnet-4-6
[r12]: https://metr.org/blog/2025-03-19-measuring-ai-ability-to-complete-long-tasks/
[r13]: https://deepmind.google/models/gemini/pro/
[r14]: https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-deep-think/
[r_arc]: https://arcprize.org/blog/announcing-arc-agi-2-and-arc-prize-2025
[r_rsp]: https://www-cdn.anthropic.com/17310f6d70ae5627f55313ed067afc1a762a4068.pdf
[r_swe]: https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/

---

## Frequently asked questions

**What are DeepMind's levels on the path toward AGI?**  
The framework uses six levels from no AI through superintelligence and separates generality from performance. A system can be superhuman in a narrow task without being generally expert across cognitive work.

**How does the economic definition differ from the classical cognitive definition?**  
The cognitive definition focuses on broad intellectual competence and transfer. The economic definition focuses on outperforming humans across most economically valuable work. A system could therefore be economically transformative while still failing stronger tests of general cognition.

**What capability threshold most concerns safety researchers?**  
One important threshold is the ability to automate increasingly large portions of AI research and development, because that can accelerate further capability growth and reduce the time available for human supervision. Modern safety frameworks define operational thresholds around such capabilities instead of relying only on the label AGI.

**What does METR's task horizon measure?**  
It estimates the duration of tasks a model can complete with a chosen reliability. This measures sustained autonomous work rather than isolated question answering, which makes it useful for tracking when agents move from minutes-long tasks toward hours, days or longer workflows.
