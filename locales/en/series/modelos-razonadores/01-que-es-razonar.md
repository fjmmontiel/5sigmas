---
title: "What it means for an LLM to reason"
seo_title: "What it means for an LLM to reason"
description: "What reasoning means for a language model, what o1 and DeepSeek R1 added, and why evaluating reasoning requires looking at steps, cost and failure modes."
date: 2026-04-08
date_modified: 2026-08-24
keywords: "reasoning models, LLM reasoning, chain of thought, CoT, OpenAI o1, test time compute, AI reasoning, illusion of thinking, Apple reasoning paper, chains of thought"
tags:
  - AI
  - LLMs
  - Reasoning
---

# Chapter 1 — What does it mean for an LLM to "reason"?

This chapter examines what reasoning means in the context of LLMs, how the first models explicitly designed to reason emerged, and what the research literature says about their limits. By the end, you will understand how deliberate reasoning differs from pattern recognition, why RLVR and GRPO create a different training profile from standard RLHF, which benchmarks documented o1's jump in performance, and how to read the debate over whether LLMs genuinely reason or reproduce learned structures.

When an LLM answers a complex question with structured arguments, counterexamples and coherent conclusions, the most common reaction is to say that it "reasons." The more technical question is whether that word describes something real or is merely a convenient metaphor.

Whether it truly reasons has direct consequences for how we design systems, evaluate their outputs and understand their failures.

---

## 1. What "reasoning" means for a human

In cognitive psychology, reasoning is a deliberate process that allows people to solve problems outside the patterns they already know. It differs from pattern recognition—which is fast, effortless and automatic—because it is slower, attention-intensive and consciously directed.

[Daniel Kahneman](https://en.wikipedia.org/wiki/Thinking,_Fast_and_Slow) described this distinction as System 1 (fast, intuitive, automatic) and System 2 (slow, deliberate, effortful). System 2 is what we intuitively associate with reasoning: examining premises, considering alternatives, detecting contradictions and constructing arguments.

The properties of human reasoning that matter for understanding how LLMs can approximate it can be grouped into three:

**It is a process with steps.** A complex problem is not solved all at once, but by decomposing it into subproblems that are solved in sequence, each depending on what came before.

**It consumes resources.** Reasoning is tiring. It requires sustained attention, has real cognitive costs and degrades with fatigue.

**It is not infallible.** Humans reason poorly quite often. We have well-known biases—confirmation, availability, anchoring—that produce systematic errors even when we believe we are reasoning carefully. Critical thinking is, in part, the set of tools we use to detect and correct those errors.

---

## 2. What LLMs can do that looks like reasoning

LLMs can perform actions that, in practical terms, produce outputs similar to human reasoning in many contexts.

**Decompose problems.** When an LLM is asked to solve a complex problem step by step, the sequence it generates is often coherent and the final result is usually better than when it answers directly.

**Detect contradictions in text.** Advanced models can identify when two statements in a passage are incompatible, although not with perfect reliability.

**Generate alternatives.** Given a scenario, a model can produce multiple interpretations or possible solutions—what in a human context we might call lateral thinking.

**Follow formal logic.** For problems with explicit logical structure (if P then Q, P, therefore Q), LLMs generally produce the correct inference within their context window.

According to the best current understanding, the process that produces these outputs is not the same process that produces human reasoning. Models operate through statistical next-token prediction: text that looks like a coherent argument is text that is likely to follow the preceding text given the model's pretraining.

The debate remains open over whether that process should be called reasoning or whether it is fundamentally different. What is much clearer is that its failure patterns differ substantially from those of human reasoning.

---

## 3. The emergence of reasoning models: OpenAI o1

In September 2024, OpenAI released [o1](https://openai.com/index/learning-to-reason-with-llms/), the first model explicitly designed to "think before answering." The difference from earlier models was not simply model size or training data, but the inference setup: before generating its final response, the model produced an internal reasoning chain that the user did not directly see.

The benchmark results were striking. On AIME 2024, a competitive mathematics exam, GPT-4o solved 12% of the problems while o1 reached 74% with a single sample and 83% with consensus across 64 samples. On Codeforces programming competitions, o1 moved from the 11th percentile to the 89th percentile. On GPQA Diamond—a benchmark of physics, chemistry and biology questions intentionally designed to be resistant to simple web lookup—o1 exceeded, for the first time, the accuracy of recruited PhD-level experts answering the same questions.

Before turning those gaps into a general claim about which model is better, the [benchmark reliability explorer](/en/tools/benchmark-reliability/) lets you test resolution, saturation, potential test exposure, invalid items and ranking sensitivity to benchmark composition.

The underlying idea was not new. Chain-of-thought prompting had appeared in Google papers in 2022 ([Wei et al., 2022](https://arxiv.org/abs/2201.11903)), showing that producing intermediate steps improved performance. What o1 added was that this "thinking" process happened autonomously rather than only when explicitly requested in the prompt, and that training taught the model when and how to extend its reasoning process to improve the outcome.

> o1's central observation was that reasoning, understood as a multi-step process, could improve as more inference-time compute was allocated: spending more processing time before producing the final answer could improve answer quality. That idea is called test-time compute and is the central axis of this series.

### 3.1 The training mechanism: RLVR and GRPO

The difference between o1 and a standard model is not only its inference behavior but also its training. Reasoning models are trained with **RLVR (Reinforcement Learning with Verifiable Rewards)**: rather than imitating existing human text, the model generates solution attempts for problems with objectively verifiable answers—such as mathematics or executable code—receives a signal indicating whether each attempt was correct, and adjusts its weights to reinforce the reasoning strategies that worked.

DeepSeek R1 introduced a specific variant called **GRPO (Group Relative Policy Optimization)** that removes the need for a separate critic model. The model generates G independent attempts for the same problem, evaluates them, and calculates each attempt's advantage as its deviation from the group average. Attempts above the average reinforce their strategies; attempts below it are penalized.

{{ include_html("snippets/modelos-razonadores/01-rlvr-entrenamiento.html") }}

### 3.2 The ecosystem: from o1 to current reasoning models

In less than a year after o1 was released, the reasoning-model ecosystem moved from a single proprietary model to a diverse set that included frontier-level open-weight models such as DeepSeek R1 (671B parameters), hybrid models with configurable reasoning such as Claude 3.7 and Gemini 2.5, and models with deeper internal reasoning and extended search such as o3. They differ substantially in process transparency, weight availability and benchmark performance.

{{ include_html("snippets/modelos-razonadores/01-ecosistema-modelos.html") }}

---

## 4. Apple's paper—and the response to it

On June 6, 2025, [Apple Research](https://machinelearning.apple.com/research/illusion-of-thinking) published "The Illusion of Thinking: Understanding the Strengths and Limitations of Reasoning Models via the Lens of Problem Complexity," a paper studying reasoning models on logic problems whose complexity could be controlled, including Towers of Hanoi and block-world puzzles. Its findings were provocative: model accuracy collapsed completely once complexity crossed a threshold, and, counterintuitively, the models reduced their reasoning effort in tokens precisely when they needed it most. The paper also documented overthinking: on simple tasks, a model could find the correct solution early in its internal chain and then continue exploring incorrect alternatives, ultimately degrading the final answer.

The paper argued that what models do when they "reason" may, in many cases, be sophisticated pattern recognition rather than genuine reasoning: the model learns the surface structure of correct arguments during training and reproduces it, but fails when that structure changes in ways it has not seen.

A response followed on June 13, 2025. Alex Lawsen, a researcher at Open Philanthropy, published "The Illusion of the Illusion of Thinking," co-written with Claude Opus, identifying three methodological problems in Apple's experimental design: models were failing because they hit token-budget limits rather than because they could not reason; the evaluation script penalized partially correct solutions as completely wrong; and some river-crossing puzzle instances were mathematically unsolvable, which models correctly identified as impossible but the evaluation still counted as failures.

The debate remains genuinely open. Both sides agree that reasoning-model failures have structure: they are neither random nor uniformly distributed. That is precisely the subject of the next chapter.

{{ include_html("snippets/modelos-razonadores/01-razonamiento-pasos.html") }}

---

## 5. Why the distinction matters in practice

If you treat an LLM as though it reasons in the same way as a human expert, you make poor design decisions. You trust its outputs in contexts where its failures are systematic. You build systems that work in a demo and fail in production when the input moves away from the learned pattern.

If you treat an LLM as incapable of reasoning simply because it does not share the same underlying mechanism as human reasoning, you also make a mistake. You underuse a real capability that, with the right safeguards, can create value in cases where the human alternative is more expensive, slower or equally fallible.

A practical approach is to treat LLM reasoning as a process with a measurable performance curve: it works well on certain classes of problems and fails predictably on others. The next step is to understand exactly what that curve looks like.

---

## 6. References

<details markdown="1">
<summary><strong>Primary sources</strong></summary>

| Source | Short description |
| --- | --- |
| **Wei et al. (2022)** — *[Chain-of-Thought Prompting Elicits Reasoning in Large Language Models](https://arxiv.org/abs/2201.11903)* | Foundational chain-of-thought prompting paper; shows that generating intermediate steps improves performance on complex tasks. Cited in §3. |
| **OpenAI (2024)** — *[Learning to Reason with LLMs](https://openai.com/index/learning-to-reason-with-llms/)* | Public introduction of o1 with the reference benchmarks: AIME 2024 (74% with one sample, 83% with 64), Codeforces (P11→P89) and GPQA Diamond. Cited in §3. |
| **Apple Research (2025)** — *[The Illusion of Thinking](https://machinelearning.apple.com/research/illusion-of-thinking)* | Documents accuracy collapse with complexity and overthinking: on simple tasks, a model can find the solution early and then continue exploring incorrect alternatives. Cited in §4. |
| **Kahneman, D. (2011)** — *[Thinking, Fast and Slow](https://en.wikipedia.org/wiki/Thinking,_Fast_and_Slow)* (Farrar, Straus and Giroux) | System 1/System 2 framework used here to contextualize deliberate reasoning versus automatic pattern recognition. Cited in §1. |
| **Lawsen, A. & Claude Opus (2025)** — *The Illusion of the Illusion of Thinking* (LessWrong, June 13, 2025) | Methodological response to the Apple paper: argues that observed failures can be explained by token-budget limits, incorrect scoring of partial solutions and unsolvable instances counted as errors. Cited in §4. |

</details>

---

## Frequently asked questions

**Is there a real difference between an LLM that "reasons" and one that does not?**
Yes, in the operational sense that matters for system design. Reasoning models generate a chain of intermediate steps before producing the final answer, and that process is explicitly trained with RLVR rather than only through text imitation. The observable result is a substantial improvement on reasoning benchmarks: o1 moved from 12% for GPT-4o to 74% on AIME 2024 with a single sample. What remains debated is whether this process deserves the same label as human reasoning, but that debate does not change the fact that its failure modes have a distinct pattern.

**How does RLVR differ from standard RLHF?**
RLHF uses human evaluations to adjust model behavior: people rate answers and that signal guides training. RLVR uses problems with objectively verifiable answers—mathematics or executable code—and the reward signal is an automatic correctness check rather than a subjective evaluation. The key difference is that RLVR can scale without requiring human annotators for every problem.

**What is GRPO and how does it differ from standard PPO?**
GRPO (Group Relative Policy Optimization), introduced by DeepSeek R1, removes the need for a separate critic model. Instead of estimating each state's value with a second model, it generates multiple independent attempts for the same problem and computes the advantage of each attempt as its deviation from the group average. Attempts above the average reinforce their strategies and worse attempts are penalized, reducing both computational cost and the instability of training two models in parallel.

**Why is the debate over whether LLMs genuinely reason still unresolved?**
Because it depends on how reasoning is defined. If the definition requires the same underlying mechanism as human reasoning, the answer is no. If the definition focuses on observable behavior—producing correct intermediate steps, detecting contradictions and deriving valid conclusions in complex domains—the answer is more nuanced. Apple Research's 2025 paper showed an accuracy collapse beyond a complexity threshold. The response by Lawsen and Claude Opus challenged the experimental design. Neither position has closed the debate.