---
title: What is Generative AI
description: "How generative AI works: from embeddings and Transformers to foundation models, scaling laws, LLMOps and the differences between LLMs, RAG and agents."
date: 2026-03-17
keywords: "generative AI, what is generative AI, transformer, language models, LLM, embeddings, scaling laws, foundation models, RLHF, fine-tuning"
tags:
  - AI
  - GenAI
  - LLMs
---

# Chapter 2 — What is Generative AI?

This chapter explains generative AI from its fundamental pieces to the systems used in production today. By the end, you will understand what embeddings are and why they make language mathematically tractable, how the Transformer uses attention to process context, why scaling laws matter, and how foundation models changed software. The chapter also covers three practical configurations—plain LLM, RAG and agent—and the LLMOps lifecycle needed to operate them reliably.

!!! info "Prerequisite"
    This chapter assumes the general AI framework from [Chapter 1 — What is AI?](./01-que-es-ia.md).

Generative AI produces text, images, code, audio and video rather than only assigning inputs to predefined classes. Underneath, the mechanism is still machine learning: data enters, parameters are adjusted and an objective is optimized.

What changed is **what is learned and at what scale**. Three ideas fit together:

- **Embeddings:** representing meaning as numbers.
- **Transformer:** an architecture that processes contextual relationships efficiently at scale.
- **Scaling:** increasing data, parameters and compute can systematically improve capability when the resources are balanced well.

---

## 1. Embeddings: translating language into numbers

ML systems operate on numbers, while natural language is symbolic. A modern language-model pipeline bridges that gap in stages.

First, text is split into **tokens**, the discrete units processed by the model. A token can be a word, part of a word, punctuation or another subword unit.

Each token is mapped to a **vector**: a list of numerical coordinates. Before training these coordinates do not carry useful semantics. Training changes them so that tokens used in similar contexts tend to occupy related regions of the representation space.

A learned vector representation is an **embedding**. Classical word-embedding work such as Word2Vec demonstrated that useful linguistic relationships can become geometric relationships in vector space. The famous intuition is that operations such as `king − man + woman ≈ queen` can approximately recover semantic structure.

> A model does not receive “meaning” explicitly. It learns numerical representations whose geometry becomes useful for prediction.

Text is not the only modality that can be represented numerically. Images, audio and video are also converted into learned representations, which is one reason a shared architectural vocabulary can support multimodal systems.

{{ include_html("snippets/fundamentos-ia-iag/02-embeddings.html") }}

---

## 2. The Transformer: the architecture that changed the stack

Before the [Transformer (2017)](https://arxiv.org/abs/1706.03762), sequence models commonly processed information recurrently, step by step. That created two practical problems:

1. training across sequence positions was difficult to parallelize;
2. information from far earlier in a sequence had to propagate through many intermediate states.

The Transformer's central mechanism is **attention**. For each token, the model computes how strongly other positions in the context should influence its representation.

In “The bank where I sat was wet,” the representation of “bank” can attend strongly to “sat” and “wet,” making the river/bench-like interpretation more plausible than a financial institution without an explicit symbolic rule.

Internally the system still uses neural-network parameters trained to reduce error. The major architectural change is how information is connected: self-attention lets positions exchange information directly instead of relying only on one recurrent chain.

The Transformer is valuable not only for text. Transformer-derived architectures are used across language, vision, audio, video and code. Modern systems such as GPT, Claude, Gemini and Llama rely heavily on this architecture, while other generative families also exist—for example latent diffusion models for image generation.

{{ include_html("snippets/fundamentos-ia-iag/02-transformer.html") }}

---

## 3. Scaling laws: when quantity changes capability

Large language models are commonly pretrained with **self-supervised learning**. The training data itself provides the target—for autoregressive language modelling, predicting subsequent tokens is the canonical example.

In [*Scaling Laws for Neural Language Models*][r3], Kaplan et al. documented predictable empirical relationships among loss, model size, dataset size and compute. Later work refined how those resources should be balanced.

> A scaling law is an empirical relationship that lets researchers estimate how average model performance changes as resources such as parameters, training data and compute increase within a given regime.

The striking observation was not merely that larger models improved. At scale, systems became useful on tasks that had not been individually programmed: few-shot adaptation, translation, arithmetic, code generation and broad instruction following.

The term **emergent abilities** is often used for capabilities that appear abruptly under particular benchmarks. The strong interpretation remains debated: later work has shown that some apparent discontinuities can be created by thresholded or non-linear evaluation metrics. The practical point is more robust—capability broadened dramatically with scale even if the exact mathematics of “emergence” is contested.

<details markdown="1">
<summary><strong>What is few-shot learning?</strong></summary>

A model can infer how to perform a new task from only a few examples placed in the prompt, without changing its weights. GPT-3 made this behaviour especially visible: the model could infer the requested mapping from context and apply it to new inputs inside the same inference call.

</details>

{{ include_html("snippets/fundamentos-ia-iag/02-escalas-curva.html") }}

The historical increase in model scale is concrete: GPT-1 used roughly 117 million parameters, while GPT-3 used 175 billion. Parameter count is only one axis, but it illustrates how quickly the regime changed.

{{ include_html("snippets/fundamentos-ia-iag/02-escalas.html") }}

### Foundation models

A **foundation model** is trained on broad data at large scale and then adapted to many downstream tasks rather than being trained from scratch for only one narrow problem. ([Stanford CRFM][r6])

One model can support writing, summarization, translation, classification, information extraction and code generation. Adaptation may be as light as changing instructions in context or as deep as additional supervised or preference-based training.

> A foundation model is a reusable general base, not a task-specific product.

Large Language Models (LLMs) are foundation models focused heavily on language. Post-training techniques—including supervised fine-tuning and preference/RLHF-style methods such as [InstructGPT][r7]—turn a raw next-token predictor into a system that follows instructions more effectively.

---

## 4. LLM, LLM + RAG, agent

Moving to the right does not automatically mean “better.” Each step adds capability, but also cost, latency, operational complexity and additional failure modes.

### Plain LLM

A plain LLM answers from the information encoded in its parameters plus the context supplied in the request.

It works well for drafting, summarization, translation, code generation and analysis where general pretrained knowledge is sufficient. Its limitations are important: parametric knowledge is not guaranteed to be current, and private documents are unavailable unless provided explicitly.

### LLM + RAG

**Retrieval-Augmented Generation (RAG)** adds a retrieval step before generation. Documents are indexed, often using embeddings. A user query is represented in the same semantic space, relevant fragments are retrieved, and those fragments are injected into the model's context. ([Lewis et al.][r5])

The model can therefore answer using internal documentation, updated rules or private knowledge that was absent from pretraining.

A crucial distinction:

> RAG does not permanently teach the model the retrieved document. It gives the model relevant information to read during the current inference.

### Agent

An agent adds the ability to **plan, invoke tools and operate in a loop**. It can search the web, execute code, query databases or call APIs, observe the results and choose subsequent actions.

That makes agents useful for tasks no single prompt can finish. It also creates compounded risk: every extra step can fail, and an early mistake can alter all later decisions.

{{ include_html("snippets/fundamentos-ia-iag/02-llm-rag-agente.html") }}

---

## 5. LLMOps: operating GenAI in production

LLMOps follows the same broad engineering logic as MLOps—evaluate, deploy, monitor and improve—but many teams consume frontier models through an API rather than training the base model themselves.

For that common case, the artifacts you directly control shift from model weights toward **instructions, context, retrieval, tools and evaluation**.

### What you manage

**Prompts and instructions.** A prompt change can alter behaviour as significantly as a code change, so prompts should be versioned, reviewed and evaluated.

**Context.** System instructions, conversation history and retrieved documents influence both quality and cost because every token consumes context budget and inference resources.

**Evaluation.** If you cannot directly retrain the base model, you need strong evaluation to know whether prompt, model, retrieval or tool changes improved the product. Evaluation may combine automated metrics, human review and model-based evaluators.

<details markdown="1">
<summary><strong>What is LLM-as-a-judge?</strong></summary>

A second language model scores or critiques generated responses against explicit criteria. It is far cheaper and faster than reviewing every output manually, but it can inherit biases and blind spots from the evaluator model. A strong system therefore validates judge behaviour with human review and uses task-specific metrics wherever objective ground truth exists.

</details>

Other production concerns include latency, cost per request, semantic drift, safety evaluation, observability and rollback.

{{ include_html("snippets/fundamentos-ia-iag/02-llmops.html") }}

> The system's behaviour can change when instructions or context change even if the base model is identical. That makes iteration cheap, but also means prompt/configuration changes can silently regress quality without automated evaluation.

### External API vs self-hosted open model

| | External API | Self-hosted open model |
|---|---|---|
| **Cost shape** | Variable, usually usage/token based | Infrastructure and operations dominated |
| **Model control** | Limited to provider interface | High control over serving and weights |
| **Data boundary** | Data reaches provider infrastructure subject to provider terms | Can remain inside your infrastructure |
| **Additional operations** | Relatively low | Inference servers, accelerators, scaling and reliability |
| **Fine-tuning** | Provider-dependent | Flexible if the licence and model permit it |

The decision is primarily a product and business trade-off: iteration speed, request volume, privacy/regulation, latency, control and total cost.

{{ include_html("snippets/fundamentos-ia-iag/02-llmops-rutas.html") }}

!!! tip "Next chapter"
    [Chapter 3 — Classical AI vs Generative AI →](./03-ia-vs-ia-generativa.md)

---

## 6. References

<details markdown="1">
<summary><strong>Core sources</strong></summary>

| Key | Source | Short description |
|---|---|---|
| R1 | **Vaswani et al. (2017)** — *Attention Is All You Need* ([arXiv][r1]) | Original Transformer paper. |
| R2 | **Mikolov et al. (2013)** — *Efficient Estimation of Word Representations in Vector Space* ([arXiv][r2]) | Influential Word2Vec embedding work. |
| R3 | **Kaplan et al. (2020)** — *Scaling Laws for Neural Language Models* ([arXiv][r3]) | Empirical scaling laws for language models. |
| R4 | **Brown et al. (2020)** — *Language Models are Few-Shot Learners* ([arXiv][r4]) | GPT-3 and large-scale in-context learning. |
| R5 | **Lewis et al. (2020)** — *Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks* ([arXiv][r5]) | Foundational RAG paper. |
| R6 | **Bommasani et al. (2021)** — *On the Opportunities and Risks of Foundation Models* ([arXiv][r6]) | Foundation-model framework. |
| R7 | **Ouyang et al. (2022)** — *Training language models to follow instructions with human feedback* ([arXiv][r7]) | Instruction following with human feedback. |

</details>

[r1]: https://arxiv.org/abs/1706.03762
[r2]: https://arxiv.org/abs/1301.3781
[r3]: https://arxiv.org/abs/2001.08361
[r4]: https://arxiv.org/abs/2005.14165
[r5]: https://arxiv.org/abs/2005.11401
[r6]: https://arxiv.org/abs/2108.07258
[r7]: https://arxiv.org/abs/2203.02155

---

## Frequently asked questions

**What is the difference between an arbitrary vector and an embedding?**  
A vector is simply an ordered list of numbers. An embedding is a learned vector whose position is useful: training organizes the representation so related concepts occupy meaningful geometric relationships.

**Why is the Transformer considered a general architecture?**  
Its attention-based sequence-processing pattern can be applied to different tokenized modalities. Transformer variants therefore support language, vision, audio, video and code, although not every generative model is a Transformer.

**What is few-shot learning?**  
It is the ability to infer a task from a small number of examples provided in context, without updating the model's weights. Large language models made this form of in-context adaptation practically useful.

**What is the main additional risk of an agent compared with RAG?**  
An agent can take actions, so errors can propagate through a chain of tool calls and state changes. RAG primarily augments the model with retrieved information; an agent adds planning, execution and feedback loops, increasing both capability and the number of ways the system can fail.
