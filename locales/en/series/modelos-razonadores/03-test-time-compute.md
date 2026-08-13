---
title: Test-Time Compute
description: "Test-time compute as a second scaling axis. The three levers—more steps, more candidates and more structure—and their quality, cost and latency tradeoffs in reasoning models."
date: 2026-04-10
keywords: "test-time compute, LLM reasoning, best-of-N, chain of thought, PRM, ORM, scaling laws, extended reasoning, budget forcing, DeepSeek R1, MCTS, self-consistency, Tree of Thoughts"
tags:
  - AI
  - LLMs
  - Reasoning
---

# Chapter 3 — Test-Time Compute

The previous chapters established that LLM reasoning consumes resources and produces predictable failure modes. This chapter adds the piece that connects the two: the reasoning process has a scaling law of its own. By the end, you will understand what test-time compute is and why it represents a second scaling dimension independent of training; you will know the three main levers for converting additional compute into better answers—more steps, more candidates and more structure—and the quality, cost and latency tradeoff profile of each one.

!!! info "Prerequisites"
    This chapter builds on the concepts introduced earlier in the **Reasoning Models** series: what it means for an LLM to reason and how reasoning systems fail. The complete English versions of those chapters are being mirrored into this same series; the [series introduction](./00_presentacion_serie.md) provides the current map.

The central observation is that spending more compute while generating the answer—at inference time—can produce better answers in a predictable way for particular classes of problems. This is the idea behind **test-time compute scaling**.

---

## 1. What test-time compute is and why it matters

For a long time, the main known lever for improving an LLM was training scale: more parameters, more data and more training compute. The original scaling-law work ([Kaplan et al., 2020](https://arxiv.org/abs/2001.08361)) documented that this relationship could be systematic and predictable.

Test-time compute introduces a second dimension: not only how much was spent to train the model, but how much the system spends on each individual answer. Just as a student may solve a problem more reliably when given more time to work through it, a model can sometimes produce a better output when it is allowed to perform more computation before committing to its final answer.

The important difference from training is flexibility. Training cost is paid up front and the resulting model is then shared across users. Test-time compute is variable **per query**: it can be changed according to the task, context, service tier, latency budget and the value of getting the answer right.

> The practical consequence is that compute budget becomes a product variable. Use little inference work for a routine task; allocate more when the problem justifies deeper reasoning. The question is no longer only “which model do we use?” but also “how much work should this system spend on this problem?”

---

## 2. The three levers

There are three principal mechanisms for translating additional inference compute into better answers.

### Lever 1: More internal steps

Chain-of-thought ([Wei et al., 2022](https://arxiv.org/abs/2201.11903)) is the most direct mechanism. Instead of producing the final answer immediately, the model first generates a sequence of intermediate steps that decompose the problem. Those steps consume tokens and computation, but the final answer can benefit from explicitly resolving the subproblems that come before it.

Modern reasoning-oriented systems have internalized this pattern. Rather than requiring the user to explicitly request “think step by step,” the serving system can decide how much reasoning effort to allocate based on the perceived complexity of the task.

One technique for controlling that extension is **budget forcing**: suppressing an early stopping signal and adding a continuation cue such as “Wait” so the model continues deliberating. The s1-32B work ([Muennighoff et al., 2025](https://arxiv.org/abs/2501.19393)), trained on only 1,000 curated examples, used this idea to improve AIME24 from 50% to 56.7% and reported performance above o1-preview on that benchmark. The intuition is simple: if the model is about to commit to a weak answer too early, additional reasoning gives it another opportunity to revise.

The gain is usually more pronounced on problems with chained dependencies—multi-operation mathematics, multi-level logic and code with complex dependencies—and smaller on retrieval or generation tasks where the relevant information is already directly accessible in the model’s parameters or context.

### Lever 2: More candidate generations

Instead of generating one answer, the system generates several independent candidates for the same prompt and selects among them. Selection can be based on majority agreement (**self-consistency**), a separate scoring model (**best-of-N**), an objective verifier, or a combination of these signals.

The statistical intuition is straightforward: if an individual trajectory has some probability of solving the task and candidate trajectories are sufficiently diverse, generating N candidates increases the chance that at least one of them is correct. The operational catch is equally straightforward: sampling N candidates consumes roughly N times the generation work before selection overhead is even considered.

This method is particularly useful when correctness is externally verifiable—mathematics, executable code, constraint satisfaction—because selection can rely on a genuine check instead of asking another LLM to guess which answer looks best.

How the candidates are scored matters. **Process Reward Models (PRMs)** evaluate intermediate reasoning steps, while **Outcome Reward Models (ORMs)** evaluate only the final result ([Lightman et al., 2023](https://arxiv.org/abs/2305.20050)). A PRM can identify an error before it propagates and can therefore guide search. An ORM can reward a shortcut that reaches the correct answer by luck, or penalize an otherwise sound trajectory that makes a small arithmetic mistake at the end.

{{ include_html("snippets/modelos-razonadores/03-prm-orm-comparacion.html") }}

Best-of-N also exhibits a clear cost curve: the first additional samples tend to buy much more than the later ones. Moving from N=1 to N=4 is often far more valuable than moving from N=32 to N=64, even though the latter step doubles the sampling cost.

{{ include_html("snippets/modelos-razonadores/03-best-of-n-visual.html") }}

### Lever 3: More structure in the reasoning process

Tree search ([Yao et al., 2023](https://arxiv.org/abs/2305.10601), and related MCTS-style reasoning methods) pushes the idea further. Instead of following one linear chain, the system explores several reasoning branches, evaluates progress, and prunes trajectories that appear less promising before continuing to spend compute on them.

The result is broader coverage of the solution space at a potentially much higher computational cost. For sufficiently complex planning and optimization tasks, structured search can outperform a single linear trajectory, but it has a fundamentally different serving profile.

{{ include_html("snippets/modelos-razonadores/03-ttc-palancas.html") }}

---

## 3. Quality, cost and latency

None of these levers is free. Each one has a distinct tradeoff surface that matters in production.

### Cost

More internal steps mean more generated reasoning tokens. If a reasoning trajectory is an order of magnitude longer than a direct answer, the serving work can also be materially larger even when the underlying model is unchanged.

Candidate generation multiplies the work more directly: best-of-5 requires five candidate runs before scoring. Tree search can consume orders of magnitude more compute than a single linear chain because several partial trajectories remain alive simultaneously.

### Latency

The user-visible waiting time grows with test-time compute. A task that previously returned in one or two seconds may spend tens of seconds on internal reasoning. In conversational assistants and real-time systems, this latency often becomes the hardest operational constraint.

Streaming improves **perceived** latency when useful content can be shown while it is generated, but it does not eliminate a hidden reasoning phase. If the answer cannot begin until the reasoning trajectory has finished, the real time-to-useful-output remains bounded by that work.

The structural reason is that autoregressive reasoning is **sequential by construction**. Token 500 cannot be generated before tokens 1–499 exist. A rough lower bound is therefore:

`reasoning_length ÷ generation_speed`

At 100 tokens per second, a 5,000-token trajectory alone implies roughly 50 seconds of sequential generation. At 1,000 tokens per second the same trajectory would take about 5 seconds; at 10,000 tokens per second, about half a second. So today’s practical latency limit is not a timeless property of reasoning—it depends strongly on inference hardware, decoding algorithms and how much of the process can be parallelized or avoided.

The next chapter develops this point as a product-design problem: when compute is not an abstract number in a paper but physical seconds experienced by a person.

### Diminishing returns

The relationship between more compute and better answers is not linear. Many problems improve up to a point, after which the marginal gain shrinks. Some tasks can even degrade with excessive reasoning: the model may introduce unnecessary complexity, abandon a correct conclusion or explore low-value branches. This is the **overthinking** failure mode.

> Designing systems around test-time compute therefore requires matching the lever and the budget to the task. A long reasoning trajectory for a simple factual lookup is wasted cost. A direct answer on a difficult multi-step mathematical problem may sacrifice quality unnecessarily.

---

## 4. Test-time compute as a complementary scaling axis

The most important point is that test-time compute and pretraining are **complements, not substitutes**. A stronger base model can have a higher ceiling when test-time compute is applied. A smaller model with substantial inference-time work can, on some classes of reasoning problems, match or exceed a larger model that is given very little reasoning budget.

Benchmark results show how large the system-level effect can be. On AIME 2024, OpenAI reported 13% for GPT-4o, 74% for o1, and 83% for o1 with consensus over 64 samples ([OpenAI, 2024](https://openai.com/index/learning-to-reason-with-llms/)). On GPQA Diamond, Anthropic reported 84.8% for Claude 3.7 Sonnet with 256 parallel samples and a learned scoring model ([Anthropic, 2025](https://www.anthropic.com/claude-3-7-sonnet-system-card)). Older benchmarks such as GSM8K and MATH are heavily saturated by frontier systems, which makes harder suites such as AIME and GPQA more informative for this question.

These numbers should not be interpreted as a perfectly controlled experiment where inference budget is the only variable—model training and serving systems also differ. They do demonstrate the broader point: the final capability exposed to a user depends on both the base model and the amount and structure of inference-time work around it.

That complementarity changes the economics of high-quality AI systems. Cost is no longer determined only by model size. It is determined by the combination of model capability **and** per-query compute policy. Efficient systems will increasingly route each task not only to an appropriate model, but also to an appropriate reasoning budget.

{{ include_html("snippets/modelos-razonadores/03-escala-complementaria.html") }}

The next chapter translates this into the concrete product problem: what happens when compute time becomes actual seconds a user has to wait.

---

!!! tip "Next reading"
    More compute on paper means real seconds in a product. Continue with the **Reasoning Models** series to see how latency, streaming and human interaction constrain the serving design: [series overview →](./00_presentacion_serie.md)

## 5. References

<details markdown="1">
<summary><strong>Primary sources</strong></summary>

| Source | Why it matters |
| --- | --- |
| **Wei et al. (2022)** — *[Chain-of-Thought Prompting Elicits Reasoning in Large Language Models](https://arxiv.org/abs/2201.11903)* | Foundation for explicit step-by-step reasoning; shows that intermediate steps can improve complex-task performance. Used in §2.1. |
| **Wang et al. (2022)** — *[Self-Consistency Improves Chain of Thought Reasoning in Language Models](https://arxiv.org/abs/2203.11171)* | Shows that sampling independent reasoning paths and aggregating answers can improve reliability. Used in §2.2. |
| **Yao et al. (2023)** — *[Tree of Thoughts: Deliberate Problem Solving with Large Language Models](https://arxiv.org/abs/2305.10601)* | Extends linear CoT into branch search with evaluation and pruning. Used in §2.3. |
| **Snell et al. (2024)** — *[Scaling LLM Test-Time Compute Optimally](https://arxiv.org/abs/2408.03314)* | Systematic analysis of when and how test-time compute is efficient across problem difficulty and search strategies. |
| **OpenAI (2024)** — *[Learning to Reason with LLMs](https://openai.com/index/learning-to-reason-with-llms/)* | Reports o1 benchmark results, including AIME 2024: 13% GPT-4o → 74% o1 → 83% with 64-sample consensus. Used in §4. |
| **Muennighoff et al. (2025)** — *[s1: Simple Test-Time Scaling](https://arxiv.org/abs/2501.19393)* | Demonstrates budget forcing on Qwen2.5-32B with 1,000 curated examples and reports AIME24 50% → 56.7%. Used in §2.1 and §4. |
| **Anthropic (2025)** — *[Claude 3.7 Sonnet System Card](https://www.anthropic.com/claude-3-7-sonnet-system-card)* | Reports 84.8% on GPQA Diamond with 256 parallel samples and a learned scoring model. Used in §4. |
| **Kaplan et al. (2020)** — *[Scaling Laws for Neural Language Models](https://arxiv.org/abs/2001.08361)* | Establishes predictable relationships among language-model performance, parameters, data and training compute. Used in §1. |
| **Lightman et al. (2023)** — *[Let's Verify Step by Step](https://arxiv.org/abs/2305.20050)* | Introduces process supervision / PRM-style evaluation of intermediate reasoning steps. Used in §2.2. |

</details>

---

## Frequently asked questions

**When should I use a PRM instead of an ORM?**  
PRMs are especially useful as search guides because they score intermediate steps, allowing the system to identify and prune an incorrect branch before it reaches a final answer. ORMs are simpler and cheaper to construct, but they can reinforce a shortcut that happened to reach the right result. When the reasoning path is itself verifiable—complex mathematics, code with chained dependencies—and the evaluator budget exists, process-level signals are richer.

**Does test-time compute replace training scale?**  
No. The two are complementary. A larger or better-trained model can have a higher capability ceiling, while test-time compute decides how much of that capability the system tries to extract on a particular query. A smaller model with a large TTC budget can beat a larger model on some tasks, but not universally.

**What is budget forcing, and when is it useful?**  
Budget forcing prevents a reasoning process from terminating too early and adds a continuation signal so the model keeps working. It is most useful when premature answers are a known failure mode, the task has a strong correctness signal and the additional latency is acceptable. It should not be treated as a generic rule that “more thinking is always better.”

**Which problems benefit most from chain-of-thought?**  
Problems with sequential structure and explicit dependencies: multi-operation mathematics, multi-level logical reasoning and code where later steps depend on earlier choices. Direct factual retrieval and short, well-specified questions usually benefit less because the relevant information does not require a long chain of intermediate computation.
