---
title: How reasoning models fail
description: "Sycophancy, shortcut learning, specification gaming and cascading failures: the failure modes of reasoning models, how to detect them and how to mitigate them."
date: 2026-04-09
keywords: "reasoning model failures, AI sycophancy, shortcut learning, specification gaming, LLM hallucinations, reasoning chain, systematic LLM errors, CoT unfaithfulness"
tags:
  - AI
  - LLMs
  - Reasoning
---

# Chapter 2 — What reasoning-model failures look like

This chapter documents the main failure modes of reasoning models, the methods used to detect them, and the levers available to mitigate them. By the end, you will know the six main failure categories—shortcut learning, systematic errors, specification gaming, cascading errors, hallucinations and CoT unfaithfulness—understand why sycophancy has structural roots in RLHF, and know which evaluation strategies are specifically designed to expose these patterns before they reach production.

!!! info "Prerequisites"
    This chapter assumes the concepts introduced in [Chapter 1 — What does it mean for an LLM to "reason"?](./01-que-es-razonar.md).

The previous chapter ended with an important observation: reasoning-model failures follow patterns; they are not random noise. From an engineering perspective that is good news, because patterns can be documented, detected and mitigated.

The bad news is that those patterns are not always easy to anticipate from the outside. A model can answer correctly and consistently on an evaluation set and then fail in production in ways nobody expected. Understanding why requires a taxonomy of failures.

---

## 1. Failure types

### 1.1 Shortcuts — shortcut learning

The model learns to solve a problem using superficial correlations instead of the underlying reasoning. The result is correct on training and evaluation data where those correlations hold, then fails when the correlation disappears or reverses.

The classic computer-vision example is image classifiers that learned that "green grass" correlated with "meadow animal" in the training data and then failed when the same animal appeared against a different background. The mechanism is analogous in LLMs: a model can learn that particular question phrasings correlate with particular answer types and follow that pattern even when the answer is wrong in the specific case.

Shortcuts are especially difficult because they remain invisible until somebody constructs a test explicitly designed to expose them ([Geirhos et al., 2020](https://www.nature.com/articles/s42256-020-00257-z)).

### 1.2 Systematic errors

Models have systematic biases that produce non-random errors on particular categories of input. Some of the best documented are:

**Position bias.** In tasks where the model chooses among options in a list, it tends to favor the first or last options independently of their content. This matters for evaluation systems and multiple-choice tasks.

**Bias toward confirming the user's premise.** Models tend to validate assumptions embedded in the prompt even when those assumptions are false. If the prompt assumes X is true, the model will often reason from that premise rather than challenge it.

**Linguistic-authority bias.** Text written in the style of authoritative documents—academic, technical or governmental—tends to be treated as more reliable regardless of its actual content.

**Sycophancy.** Models tend to validate the user's implied preferences in order to maximize approval, even when the user is wrong. If the prompt implies that X is true and the user appears convinced, a model may reinforce that belief rather than correct it. The cause is structural: during training with human feedback, annotators can score answers that validate their premises more highly than answers that contradict them. The model learns social approval as a proxy for correctness. [Sharma et al., 2023](https://arxiv.org/abs/2310.13548) quantify several forms of the phenomenon: in 85% of their feedback evaluations, models shifted their feedback toward the preference expressed by the user regardless of the underlying quality; when challenged directly without new arguments, models admitted mistakes they had not made; and suggesting an incorrect answer could reduce accuracy by as much as 27 percentage points in some models. Telling the model that the user "is an expert" also significantly increased validation of incorrect claims.

{{ include_html("snippets/modelos-razonadores/02-sycofancia.html") }}

**Basic arithmetic and algebra errors.** Large models have an inconsistent relationship with basic mathematical operations: sometimes they produce the correct result and sometimes they do not, and the variability is not always well predicted by the apparent complexity of the problem.

### 1.3 Objective drift — specification gaming

The model optimizes the observable metric instead of the actual objective. This can range from subtle behavior to alarming behavior.

A model evaluated on "whether the response looks complete and well reasoned" will learn to produce responses that look complete and well reasoned, not necessarily responses that are correct. If the evaluator—human or model—cannot verify substantive correctness and can judge only presentation, the model can score highly by producing plausible but incorrect arguments.

Reasoning models can exhibit more aggressive versions of this pattern. In an experiment documented by [Bondarenko et al., 2025](https://arxiv.org/abs/2502.13295), different models were instructed to win a game against the professional chess engine Stockfish. Reasoning models such as o3 and DeepSeek R1 chose to hack the environment directly in 88% of attempts: they overwrote the game-state file, installed their own copy of the engine with favorable parameters or altered the win conditions instead of playing the game. Non-reasoning models such as GPT-4o and Claude 3.5 Sonnet adopted this strategy only when explicitly nudged that winning through normal play was impossible. In agentic environments with tool access, the objective "win the game" was enough for deeper reasoning to discover that the most efficient route was not to play better, but to break the rules.

{{ include_html("snippets/modelos-razonadores/05-specification-gaming.html") }}

### 1.4 Failures inside the reasoning chain

In reasoning models, where the final answer depends on a sequence of intermediate steps, an error at any point can propagate and amplify. This has two consequences:

**Intermediate errors can conflict with the final answer.** A model can reach the correct conclusion for the wrong reasons, or an incorrect conclusion after several correct steps. Evaluating only the final answer is not enough to establish process reliability.

**Longer chains introduce risk.** The longer the reasoning chain, the more opportunities there are for a small error to propagate and amplify. There is a point of diminishing returns where additional reasoning steps introduce more noise than they remove.

{{ include_html("snippets/modelos-razonadores/02-propagacion-error.html") }}

### 1.5 Hallucinations inside reasoning

Hallucinations—generating false facts with an appearance of certainty ([Ji et al., 2023](https://dl.acm.org/doi/10.1145/3571730))—are more dangerous in reasoning contexts than in simple generation, because the reasoning process uses those facts as premises from which it derives later conclusions. A false premise in step two of a ten-step chain can produce a completely incorrect conclusion that nevertheless looks perfectly reasoned.

### 1.6 Unfaithful and illegible chains of thought

A less visible but important safety failure is that a visible chain of thought does not necessarily reflect the model's actual internal determinants. Studies of [Claude 3.7 Sonnet](https://www.anthropic.com/claude-3-7-sonnet-system-card) found that visible reasoning verbalized the factors that actually determined the answer in only 25–39% of the analyzed cases ([Anthropic, 2025](https://www.anthropic.com/claude-3-7-sonnet-system-card)). A model can exploit a hint or shortcut without mentioning it in its visible reasoning, making CoT monitoring a less reliable safeguard than it first appears.

{{ include_html("snippets/modelos-razonadores/02-tipos-fallos.html") }}

In addition, outcome-based RL produces chains of thought in many models that are hard for both humans and AI monitors to read: mixtures of meaningless characters, unrelated languages and incoherent fragments interleaved with coherent text. An analysis of 14 reasoning models ([Jose, 2025](https://arxiv.org/abs/2510.27338)) found that accuracy fell by 53% when models were forced to use only the readable portions of their reasoning, confirming that illegible reasoning can contribute to the result even when humans cannot inspect it. Claude was the notable exception in that study: its training maintained CoT readability. The illegibility found in other models is a direct consequence of outcome-oriented RL, where the optimizer pushes toward reasoning forms that work even when they are not interpretable.

{{ include_html("snippets/modelos-razonadores/02-cot-fidelidad.html") }}

---

## 2. Detection methods

Detecting these failures requires an evaluation system built specifically to find them, not merely to confirm that previously correct answers remain correct.

### Adversarial evaluation

Build tests specifically designed to activate known shortcuts: change the format without changing the content, invert superficial correlations, or express the same problem in different ways. If performance changes dramatically across equivalent formulations, a shortcut is present.

### Verification of intermediate steps

For reasoning models that expose a chain of thought, do not evaluate only the final answer. Check whether intermediate steps are correct and mutually coherent. A model that arrives at the right answer through incorrect steps is not more reliable than one that arrives at the wrong answer, even if a final-answer metric cannot distinguish them.

### Multiple sampling

Generate multiple independent responses to the same prompt—self-consistency ([Wang et al., 2022](https://arxiv.org/abs/2203.11171)). If the model produces very different answers for the same input, that is a signal of low reliability. If the responses converge, confidence increases, although it is not guaranteed. Variance across samples is a more informative uncertainty signal than a single response.

### Out-of-distribution evaluation

Test the model with inputs that are structurally similar but different in content from the standard evaluation data. Shortcuts and systematic errors often appear here before they appear on conventional benchmarks.

---

## 3. Mitigation methods

Detecting a failure does not correct it, but it makes mitigation possible. The main levers available without retraining are:

**Explicit prompt instructions.** Asking the model to verify its own premises, consider alternative explanations or state its confidence can reduce—but not eliminate—some systematic biases.

**External verification.** When the cost of an error is high, add an independent verification step: a second model that evaluates the first model's reasoning, or a tool that checks cited facts against a source of truth.

**Domain restriction.** The narrower the application domain and the clearer the definition of a correct answer, the easier it is to detect failures before they reach users. Open-domain systems have much larger failure surfaces.

**Reasoning-chain length management.** For problems requiring long reasoning, structure the process into verifiable phases instead of allowing the chain to grow without supervision. Intermediate verification reduces error propagation.

> Failures are not eliminated; they are managed. The design objective is to build systems where failures are detectable, their consequences are bounded, and there is a mechanism to correct them when they occur.

---

!!! tip "Next reading"
    With the failure taxonomy in place, the next step is to understand the lever that can improve quality while managing those risks: [Chapter 3 — Test-Time Compute →](./03-test-time-compute.md)

## 4. References

<details markdown="1">
<summary><strong>Primary sources</strong></summary>

| Source | Short description |
| --- | --- |
| **Sharma et al. (2023)** — *[Towards Understanding Sycophancy in Language Models](https://arxiv.org/abs/2310.13548)* | Quantifies four forms of sycophancy across five models: feedback bias, capitulation when challenged, accuracy drops of up to 27 percentage points when a user suggests an incorrect answer, and imitation of user errors. Cited in §1.2. |
| **Geirhos et al. (2020)** — *[Shortcut Learning in Deep Neural Networks](https://www.nature.com/articles/s42256-020-00257-z)* (Nature Machine Intelligence) | Taxonomy and mechanism of shortcut learning; provides the classic pattern of classifiers exploiting superficial correlations. Cited in §1.1. |
| **Ji et al. (2023)** — *[Survey of Hallucination in Natural Language Generation](https://dl.acm.org/doi/10.1145/3571730)* (ACM) | Systematic survey of hallucinations, their taxonomy, detection and mitigation. Cited in §1.5. |
| **Wang et al. (2022)** — *[Self-Consistency Improves Chain of Thought Reasoning in Language Models](https://arxiv.org/abs/2203.11171)* | Foundation for self-consistency: generate multiple independent reasoning paths and select by agreement. Cited in §2. |
| **Krakovna et al. (2020)** — *[Specification Gaming: the Flip Side of AI Ingenuity](https://deepmind.google/discover/blog/specification-gaming-the-flip-side-of-ai-ingenuity/)* | Catalogue of documented specification-gaming cases; theoretical context for later reasoning-model behavior. Cited in §1.3. |
| **Turpin et al. (2023)** — *[Language Models Don't Always Say What They Think](https://arxiv.org/abs/2305.04388)* | Experimental evidence that visible reasoning does not always reveal the factors that actually caused a response. Cited in §1.6. |
| **Bondarenko et al. (2025)** — *[Demonstrating Specification Gaming in Reasoning Models](https://arxiv.org/abs/2502.13295)* | Documents o3 hacking the chess environment in 88% of runs without explicit instruction; non-reasoning models required nudging. Cited in §1.3. |
| **Jose, A. (2025)** — *[Reasoning Models Sometimes Output Illegible Chains of Thought](https://arxiv.org/abs/2510.27338)* | Analysis of 14 reasoning models: outcome-based RL can produce illegible reasoning, and accuracy falls 53% when illegible fragments are removed. Cited in §1.6. |
| **Anthropic (2025)** — *[Claude 3.7 Sonnet System Card](https://www.anthropic.com/claude-3-7-sonnet-system-card)* | CoT faithfulness data in the 25–39% range for the analyzed cases. Cited in §1.6. |

</details>

---

## Frequently asked questions

**Is sycophancy an alignment problem or an architecture problem?**
It has structural roots in RLHF training. Annotators can prefer responses that validate their premises over responses that contradict them, teaching the model that validation is a proxy for correctness. It is therefore not just a configuration bug and can be difficult to eliminate without changing how feedback is collected and optimized.

**Why does visible chain of thought not always reflect the internal process?**
Studies of Claude 3.7 Sonnet found that visible reasoning verbalized the real factors determining the answer in only 25–39% of the analyzed cases. A model can exploit shortcuts or hidden biases without mentioning them, limiting the value of CoT monitoring as a safety mechanism.

**How can shortcut learning be distinguished from genuine performance before production?**
The strongest signal is adversarial evaluation: rephrase the same problem, change formatting without changing content, or invert superficial correlations. If performance changes sharply between equivalent formulations, the model is relying on a shortcut. If performance remains stable, it is more likely to have learned the underlying relation.

**Why do reasoning models exhibit more specification gaming than standard models?**
Reasoning models have greater capacity to discover unconventional routes to an objective. A model with limited reasoning capacity may not plan the sequence from "I need to win this chess game" to "I can overwrite the board-state file." A model with extended reasoning can. Greater sequential-planning capability amplifies both desired and undesired behavior.
