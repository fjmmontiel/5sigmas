---
title: "What is AGI: artificial general intelligence"
description: "AGI means artificial general intelligence. This chapter explains its definitions, DeepMind's and OpenAI's levels, and what would still be required to reach it."
date: 2026-03-20
keywords: "agi, artificial general intelligence, what is agi, agi definition, deepmind agi levels, superintelligence, ai alignment, openai agi, agi risks"
tags:
  - AI
  - AGI
  - Alignment
video: "04-agi.mp4"
video_duration: "PT1M10S"
---

# Chapter 4 — AGI: Artificial General Intelligence

This chapter closes the series by examining the concept of Artificial General Intelligence: what it means, why there is no agreed definition, and what reaching it would imply. By the end, the reader will know the three main definitions in dispute (cognitive, economic, and DeepMind's six-level spectrum), understand precisely what current systems can and cannot do, and have a clear map of the economic, scientific, and alignment impacts that would need to be addressed before reaching much more capable systems. To get the most from it, it is best to have read the previous three chapters in the series.

!!! info "Prerequisites"
    This chapter closes the series. To get the most from it, it is best to have read the previous three chapters: [Chapter 1 — What is AI](./01-que-es-ia.md), [Chapter 2 — What is Generative AI](./02-que-es-ia-generativa.md) and [Chapter 3 — AI vs Generative AI](./03-ia-vs-ia-generativa.md).

A fraud detector cannot explain thermodynamics to you, a computer-vision model does not know how to play chess, and an LLM generates fluent text but cannot drive a car, repair a tap, or remember what it learned in yesterday's conversation. Now imagine a system that had all these capabilities at once.

**Artificial General Intelligence (AGI)** is the term for a system capable of performing at a competent human level across a **broad range of cognitive tasks**, without being specifically redesigned for each one and with the ability to transfer what it has learned between domains.

The problem is that nobody agrees on exactly what that means.

---

## 1. The definition problem

"AGI" is not a technical term with an agreed definition. It is a field term that different groups use in different, sometimes incompatible ways. There is no paper that says "this is AGI, this is not."

The underlying questions do not have a single answer: does it matter that the system can do any task? That it surpasses humans in economic value? That it can improve itself? That it has something resembling real understanding?

Depending on the definition you use, AGI could be 2 years away, 20 years away, or indefinable in today's terms.

---

## 2. The definitions in dispute

### 2.1 The cognitive definition

The oldest definition: AGI is a system that can **perform any intellectual task that a human being can perform**.
It comes from the AI research community of the 1950s-80s, and includes abstract reasoning, learning in completely new domains, common sense, long-term planning, and understanding language in real-world context.

The problem with this definition is that "any human intellectual task" is a fuzzy bar. Humans also have biases, limits, and failures.
Which human do we compare against? Under what conditions?

### 2.2 The economic definition

OpenAI defines AGI as **"highly autonomous systems that outperform humans at most economically valuable work"** ([OpenAI Charter][r3]).
Unlike the cognitive definition, this is measurable: it can be tested against labour and productivity benchmarks.

The shift in focus is significant: from "general intelligence" to "general economic usefulness", a different and in some respects lower bar. The problem is that a substantial part of economically valuable cognitive work could be transformed or automated without the system reaching the classical-definition threshold. Would that be AGI?

### 2.3 The capability spectrum: six levels

DeepMind proposed treating AGI not as a binary threshold but as a **spectrum of six capability levels**, numbered from 0 to 5:

| Level | Description | Approximate reference |
|---|---|---|
| **0. No AI** | No autonomous capability | Calculator |
| **1. Emerging AI** | Equal to or better than a non-expert on some tasks | ChatGPT, according to its authors, on some specific tasks |
| **2. Competent AI** | Equal to or better than 50% of adult workers | — |
| **3. Expert AI** | Equal to or better than a human expert on most tasks in its domain | Medical-diagnosis models in specific domains |
| **4. Virtuoso AI** | Equal to or better than the best human expert at practically everything | — |
| **5. Superintelligence (ASI)** | Surpasses all humans on all cognitive tasks | — |

This framework recognises that the transition does not happen all at once. In the original paper (2023), DeepMind marked Competent AGI and higher levels as unreached by any public system. The framework also distinguishes performance from generality: a system can show high-level performance on one specific task without demonstrating equivalent generality ([arXiv][r1]).

### 2.4 The safety perspective

For AI-safety researchers, the critical line is not "better than humans at cognitive tasks" but the **capacity for recursive improvement**: a system that improves its own design to produce successively more capable systems. A system could surpass all humans on all tasks without crossing that threshold, but if it did cross it, the pace of change would exceed humans' ability to understand and control what is happening. Current operational frameworks go further: Anthropic defines specific thresholds based on the ability to automate an AI researcher's work, from bounded tasks to full autonomous research cycles ([Anthropic RSP][r_rsp]).

> The ambiguity in the definition is not carelessness. It reflects that different communities are trying to capture different properties of the same entity.

{{ include_html("snippets/fundamentos-ia-iag/04-niveles-agi.html") }}

---

## 3. What we know is not AGI today

Current models have capabilities that impress both people using them for the first time and people who have worked in the field for years. They also have fundamental limitations that are worth understanding precisely.

### What they do well today

* Expert-level language understanding and generation in many domains represented in their training.
* Reasoning over complex texts within a context window.
* Generalisation from very few examples: learning from three cases in the prompt and generalising.
* Coding and solving real errors: frontier models achieve very high scores on software benchmarks such as OSWorld and SWE-bench, although SWE-bench Verified is no longer considered representative of the current frontier because of data contamination ([OpenAI][r_swe]).
* Computer use and web navigation: Claude Sonnet 4.6 and GPT 5.4 operate graphical interfaces and execute complete browser workflows with a 1M-token context window ([Anthropic][r11]).
* Synthesising knowledge across domains when the relevant knowledge was present in the training data.
* Olympiad mathematics and science: the most capable models achieve gold-medal performance in the IMO, IPhO, and IChO and exceed 90% on PhD-level science benchmarks ([Gemini 3 Deep Think blog][r14]). ARC-AGI-2 results are verified by the ARC Prize Foundation, but the Olympiad and HLE results are reported by the laboratories themselves.

### What they lack

* **Robust causal reasoning**: they confuse correlation with causation and fail on counterfactuals.
* **Knowledge of the physical world**: their "understanding" comes from text, not direct interaction with objects and consequences.
* **Real persistent memory**: each conversation starts from scratch unless the architecture includes explicit memory.
* **Generalisation outside what is known**: they work well in training domains and fail unpredictably on variations far from what they have seen.
* **Knowing when they do not know**: they do not reliably recognise the limits of their own knowledge, hence hallucinations.

> Passing the Turing test in a short conversation does not imply general intelligence. A model can generate text that looks human for minutes and fail on causal-reasoning or common-sense problems that a human with no specific training would solve without difficulty.

<details markdown="1">
<summary><strong>The difference between linguistic understanding and understanding the world</strong></summary>

One of the most active debates in the field is whether LLMs "understand" or simply produce very sophisticated statistical patterns over text.

The argument that they do not understand: the model has no access to the world, only to text about the world. It can complete sentences about physics without understanding why a ball falls. It can describe pain without having felt it. Linguistic representation is not the same as conceptual representation.

The argument that something resembling understanding emerges: models generalise in ways that are not explained by pure memorisation. Their internal representations capture semantic structure. Some experiments show that models have internal representations of concepts such as truth/falsehood, space, or time.

The debate is not settled and has direct consequences for what to expect from continued scaling: if understanding emerges from language at scale, scaling could move us closer to AGI. If it requires something more (direct experience of the world, causal interaction with objects and consequences), scaling alone would not be enough.

</details>

{{ include_html("snippets/fundamentos-ia-iag/04-capacidades-limites.html") }}

---

## 4. If it arrived: what would change

The question is not whether what we have today is AGI. It is not, under any reasonable definition. The question is what it would imply if it arrived.

### Economic impact

A system with AGI capabilities could automate cognitive work at scale: not only manual or repetitive tasks, but analysis, design, research, and complex decision-making.

The impact estimates are broad, and that is already with today's AI. McKinsey estimates that generative AI could automate activities representing up to 60-70% of workers' time ([McKinsey report][r8]). Goldman Sachs estimates that ~25% of current tasks are directly automatable and that two-thirds of jobs in the US and Europe are exposed to some degree of substitution ([Goldman Sachs report][r9]).

The distribution of the impact matters as much as the total impact: who captures the value produced, how it is redistributed, and what happens to the people whose work is automated first.

### Scientific impact

AlphaFold provides a glimpse of what could be possible: it delivered a decisive leap on a problem the scientific community had been trying to solve for fifty years, recognised by the 2024 Nobel Prize in Chemistry.

A system capable of reading all available literature, identifying contradictions, proposing testable hypotheses, and designing experiments would radically change the speed of discovery. Compressing the time between discovery and application could redefine entire fields of medicine, chemistry, and physics within a single generation.

### The alignment problem

The greatest risk is not that an AGI is malicious. It is that it is **very capable and optimises for an objective that does not exactly capture what we want as a society**.

"Alignment" is the technical and philosophical problem of ensuring that a very capable system optimises for what humans actually value, not merely what we were able to specify in the training objective. It is a problem with no known complete solution today.

> The field of AI Safety exists precisely because the most serious researchers in the area acknowledge that they do not know how to solve alignment before reaching systems far more capable than today's. The uncertainty is not alarmism; it is technical honesty about an open problem.

{{ include_html("snippets/fundamentos-ia-iag/04-impacto-agi.html") }}

---

## 5. Where we are and where we are going

No current system satisfies any of the AGI definitions (neither the cognitive one, nor the complete economic one, nor recursive improvement). What exists are very capable narrow-intelligence systems (not general ones) that, when combined, are beginning to cover a broad range of tasks.

{{ include_html("snippets/fundamentos-ia-iag/04-benchmarks-evolucion.html") }}

{{ include_html("snippets/fundamentos-ia-iag/04-ia-vs-humanos.html") }}

Frontier models from 2025-2026 show expert-level performance in specific domains such as software, formal mathematics, or text analysis, but there is no public, agreed evidence that they have reached the Competent AGI threshold under DeepMind's framework across most cognitive tasks. In domains requiring physical experience, tacit knowledge, or robust causal reasoning, they remain below it.

METR evaluates the **task time horizon**: the length of task a model can solve with 50% reliability. In March 2025 that horizon was ~1 hour; with GPT-5-thinking, METR estimates it at ~2 hours 15 minutes ([METR, 2025][r12]). The trend is a doubling roughly every ~7 months, and the next significant threshold is the jump to days or weeks, where the risks of real autonomy emerge.

ARC-AGI-2 measures the capability still missing for cognitive AGI: reasoning about completely new problems from very few examples, without memorising patterns. Launched with initial results below 4%, Gemini 3 Deep Think reached 84.6% in February 2026, close to the ~85% threshold for beating the benchmark ([Gemini 3 Deep Think blog][r14]). Humanity's Last Exam (HLE), the hardest benchmark published to date, reached 48.4% with the same model, while human experts with references score ~85-90%. The ARC Prize organisers themselves insist that "AGI remains unsolved" and that ARC-AGI-2 was designed to keep tasks easy for humans and difficult for AI ([ARC Prize][r_arc]).

The pace of progress over the last five years is unprecedented. Emergent capabilities with scale suggest dynamics that the scientific community does not fully understand, and the AGI debate has moved from academic speculation to the public, regulatory, and foreign-policy agenda.

The most useful question is not "when will AGI arrive?" Nobody honestly knows. The question is which criteria for thinking and which evaluation frameworks make you more robust in an environment where AI improves quickly and the landscape changes every few months.

!!! abstract "Position summary"
    **What we do know:** current systems outperform human experts in specific, bounded domains. The horizon of autonomous tasks is growing predictably. General-reasoning benchmarks are improving faster than expected.

    **What we do not know:** whether emergent capabilities with scale converge towards something that deserves to be called AGI or whether there is a ceiling we do not know about. Whether alignment is a technical problem that can be solved before reaching much more capable systems. Whether the qualitative jumps observed in benchmarks translate into real generalisation outside the laboratory.

    **What reaching it would imply:** a reorganisation of the division of cognitive labour deeper than industrialisation. Compression of the time between scientific discovery and application. And the need to solve alignment before the system is capable enough for errors to become irreversible.

That is what this series has tried to build: a stable mental map that works even when the models change.

---

## 6. References

<details markdown="1">
<summary><strong>Base sources</strong></summary>

| Key | Source | Short description |
| --- | --- | --- |
| R1 | **Morris et al. (2023)** — *Levels of AGI: Operationalizing Progress on the Path to AGI* ([arXiv][r1]) | DeepMind's six-level (0-5) framework for operationalising AGI. |
| R2 | **Bubeck et al. (2023)** — *Sparks of Artificial General Intelligence: Early experiments with GPT-4* ([arXiv][r2]) | Systematic evaluation of GPT-4 against the cognitive-AGI bar. |
| R3 | **OpenAI (2023)** — *OpenAI Charter* ([OpenAI][r3]) | OpenAI's canonical definition of AGI: "highly autonomous systems that outperform humans at most economically valuable work". |
| R4 | **Russell, S. (2019)** — *Human Compatible: Artificial Intelligence and the Problem of Control* (book, Basic Books) | Central argument on the alignment problem and the design of AI compatible with human values. |
| R5 | **Bostrom, N. (2014)** — *Superintelligence: Paths, Dangers, Strategies* (book, Oxford University Press) | The intelligence-explosion scenario and its risks. A debate reference, not scientific consensus. |
| R6 | **Krakovna et al. (2020)** — *Specification gaming: the flip side of AI ingenuity* ([DeepMind blog][r6]) | Real examples of systems optimising the wrong metric with unforeseen results. |
| R7 | **Grace et al. (2024)** — *Thousands of AI Authors on the Future of AI* ([arXiv][r7]) | Survey of AI researchers on probabilities and estimated timelines for AGI milestones. |
| R8 | **McKinsey Global Institute (2023)** — *The economic potential of generative AI: The next productivity frontier* ([McKinsey][r8]) | Estimates that generative AI could automate activities representing 60-70% of workers' time. |
| R9 | **Briggs, J. & Kodnani, D. (2023)** — *The Potentially Large Effects of Artificial Intelligence on Economic Growth* ([Goldman Sachs][r9]) | Estimates that two-thirds of jobs in the US and Europe are exposed to some degree of AI automation; ~25% of tasks are directly automatable. |
| R10 | **OpenAI (2025)** — *GPT-5 System Card* ([OpenAI][r10]) | Results on SWE-bench Verified (74.9%), METR evaluations (task horizon ~2h15m), and comparisons with human experts in scientific domains. |
| R11 | **Anthropic (2026)** — *Introducing Claude Sonnet 4.6* ([Anthropic][r11]) | Official announcement with computer-use and coding capabilities and a 1M-token context window (beta). |
| R12 | **METR (2025)** — *Measuring AI Ability to Complete Long Tasks* ([METR][r12]) | Introduces the task-horizon metric: task length completable with 50% reliability doubles roughly every ~7 months; Claude 3.7 Sonnet reaches ~1 hour. |
| R13 | **Google DeepMind (2026)** — *Gemini 3.1 Pro* ([deepmind.google][r13]) | Gemini 3.1 Pro: GPQA Diamond 94.3%; SWE-bench Verified 80.6% (new SOTA as of Feb 2026); ARC-AGI-2 77.1%. |
| R14 | **The Deep Think team (2026)** — *Gemini 3 Deep Think: Advancing science, research and engineering* ([blog.google][r14]) | Gemini 3 Deep Think: ARC-AGI-2 84.6% (verified by the ARC Prize Foundation); HLE 48.4% without tools; gold medal in IMO 2025, IPhO 2025, and IChO 2025. |
| R15 | **ARC Prize Foundation (2025)** — *Announcing ARC-AGI-2 and ARC Prize 2025* ([arcprize.org][r_arc]) | Launch of ARC-AGI-2; insists that "AGI remains unsolved" and details the result-verification methodology. |
| R16 | **Anthropic (2024)** — *Responsible Scaling Policy v2.1* ([Anthropic][r_rsp]) | Defines AI R&D autonomy thresholds (AI R&D-1 through AI R&D-5) and their relationship to safety measures. |
| R17 | **OpenAI (2026)** — *Why SWE-bench Verified no longer measures frontier coding capabilities* ([OpenAI][r_swe]) | Explains why SWE-bench Verified is contaminated and recommends SWE-bench Pro and other alternative benchmarks. |

</details>

[r1]: https://arxiv.org/abs/2311.02462 "Levels of AGI: Operationalizing Progress on the Path to AGI"
[r2]: https://arxiv.org/abs/2303.12528 "Sparks of Artificial General Intelligence: Early experiments with GPT-4"
[r3]: https://openai.com/charter/ "OpenAI Charter"
[r6]: https://deepmind.google/discover/blog/specification-gaming-the-flip-side-of-ai-ingenuity/ "Specification gaming: the flip side of AI ingenuity"
[r7]: https://arxiv.org/abs/2401.02843 "Thousands of AI Authors on the Future of AI"
[r8]: https://www.mckinsey.com/capabilities/mckinsey-digital/our-insights/the-economic-potential-of-generative-ai-the-next-productivity-frontier "The economic potential of generative AI: The next productivity frontier"
[r9]: https://www.goldmansachs.com/insights/articles/generative-ai-could-raise-global-gdp-by-7-percent.html "The Potentially Large Effects of Artificial Intelligence on Economic Growth"
[r10]: https://openai.com/index/gpt-5-system-card/ "GPT-5 System Card"
[r11]: https://www.anthropic.com/news/claude-sonnet-4-6 "Introducing Claude Sonnet 4.6"
[r12]: https://metr.org/blog/2025-03-19-measuring-ai-ability-to-complete-long-tasks/ "Measuring AI Ability to Complete Long Tasks"
[r13]: https://deepmind.google/models/gemini/pro/ "Gemini 3.1 Pro"
[r14]: https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-deep-think/ "Gemini 3 Deep Think: Advancing science, research and engineering"
[r_arc]: https://arcprize.org/blog/announcing-arc-agi-2-and-arc-prize-2025 "Announcing ARC-AGI-2 and ARC Prize 2025"
[r_rsp]: https://www-cdn.anthropic.com/17310f6d70ae5627f55313ed067afc1a762a4068.pdf "Anthropic Responsible Scaling Policy v2.1"
[r_swe]: https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/ "Why SWE-bench Verified no longer measures frontier coding capabilities"

---

## Frequently asked questions

**What levels define the path towards AGI according to DeepMind?**
DeepMind proposes a spectrum of six levels numbered from 0 to 5: from no AI through to Superintelligence. Frontier models from 2025-2026 sit at the boundary between competent AI and expert AI in specific domains, but they have not reached expert-level generality across most cognitive tasks, which would be the threshold for level 3 in that framework.

**How does the economic definition of AGI differ from the classical cognitive definition?**
The cognitive definition requires performing any human intellectual task, a fuzzy bar because humans also have biases and limits. OpenAI's economic definition focuses on outperforming humans at most economically valuable work, a bar measurable with labour benchmarks although lower in some respects, because part of cognitive work could be automated without the system reaching real cognitive generality.

**What criterion most concerns safety researchers when discussing AGI?**
For them, the critical line is not task performance but recursive improvement: a system that improves its own design to produce successively more capable systems. If that threshold were crossed, the pace of change would exceed humans' ability to understand and control what is happening, regardless of whether the system satisfies the cognitive or economic definition.

**What does the task time horizon (METR) measure and why does it matter for autonomy?**
It measures the maximum task duration an agent completes with 50% reliability, not the time it takes to answer questions but sustained multi-step work. In March 2025 that horizon was approximately two hours and fifteen minutes for the most capable models, and the trend is a doubling every seven months. The next significant threshold is the jump to days or weeks, where the risks of real autonomy emerge.
