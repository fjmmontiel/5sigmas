---
title: What is Generative AI
description: "How generative AI works: from embeddings and the Transformer to foundation models. Scaling laws, LLMOps, and differences between LLMs, RAG, and agents."
date: 2026-03-17
keywords: "generative AI, what is generative AI, transformer, language models, LLM, embedding, scaling laws, GPT, foundation models, RLHF, fine-tuning"
tags:
  - AI
  - GenAI
  - LLMs
video: "02-que-es-ia-generativa.mp4"
video_duration: "PT1M14S"
---

# Chapter 2 — What is Generative AI?

This chapter explains how generative AI works, from its fundamental pieces to the systems used in production today. By the end, the reader will understand what embeddings are and why they allow text to be treated mathematically, how the Transformer solved the problems of earlier models through the attention mechanism, and what scaling laws and emergent capabilities are. The chapter also covers the three main practical configurations (plain LLM, RAG, and agent) and the LLMOps lifecycle that makes it possible to operate any of them in production. Reading Chapter 1 before continuing is recommended.

!!! info "Prerequisites"
    This chapter assumes you know the general AI framework described in [Chapter 1 — What is AI?](./01-que-es-ia.md).

In the [previous chapter](./01-que-es-ia.md) we saw the different layers within AI, and now we are going to go deeper into one specific aspect of DL: generative AI.

Generative AI generates text, images, code, audio, and video instead of classifying inputs or discriminating between different classes.

The underlying mechanism is the same as in any ML system, with data coming in, parameters being adjusted, and error that we try to reduce at each phase of training.

What changed is what is learned and the scale at which it is applied. That change rests on three pieces that fit together in order:

- **Embeddings**: how the model represents meaning as numbers.
- **Transformer**: the architecture that makes it possible to process long context in parallel.
- **Scaling laws**: why more data and parameters produce capabilities that nobody programmed.

---

## 1. Embeddings: Translating text into numbers

ML models need numbers as input, and text is not naturally numerical.

The solution happens through three chained steps.

First, text is divided into **tokens**: the smallest unit the model processes. A token can be a complete word, a syllable, or a punctuation mark; for example, the Spanish word «agente» is often tokenized as «ag» + «ente», rather than as a single unit. ([OpenAI Tokenizer](https://platform.openai.com/tokenizer))

Each token is then converted into a **vector**: a list of thousands of numbers representing its position in a mathematical space. At this point the values are arbitrary: the format exists, but the semantics do not.

What training adds is meaning to those vectors through semantics, through geometry.
The vectors are adjusted until words that appear in similar contexts end up close to one another.

That already-adjusted vector is called an **embedding** ([original paper][r2]).
«King» and «Queen» end up close. «King» and «Coal», far apart.

Operations on those positions capture relationships: `king − man + woman ≈ queen`.

> The model does not "understand" words: it learns that certain tokens appear in similar contexts and assigns them nearby positions in vector space. Semantics emerges on its own during training.

Text, images, and audio all go through the same process of being converted into vectors before they are processed, which allows one architecture to work across different modalities.

{{ include_html("snippets/fundamentos-ia-iag/02-embeddings.html") }}

With the representations solved, the next problem is processing them without losing the thread as sequences of those vectors become longer.

---

## 2. The Transformer: The architecture that changes everything

Before the [Transformer (2017)](https://arxiv.org/abs/1706.03762), models processed text **in order**, token by token, with two practical consequences:

1. Training could not be parallelized.
2. Context from the beginning was lost before reaching the end.

The Transformer solves both with one central mechanism: **attention**.

For every token it processes, the model calculates how relevant every other token in the context is. In "The bank where I sat was wet," when processing "bank," attention connects it with "sat" and "wet" and determines that it refers to a place or object you can sit on rather than a financial institution, without any rule explicitly establishing that interpretation.

Internally it works with the same principle as neural networks: weights are adjusted to reduce error. What changes is the architecture of those connections, because attention relates all tokens in the context at once instead of doing so sequentially.

What makes the Transformer so valuable is not only that it solves those two problems, but that the architecture is **general**: it works for text, images, audio, video, and code. The Transformer dominates the language-model stack (GPT, Claude, Gemini, Llama) and an important part of the modern multimodal stack, although not all generative AI shares exactly the same architecture: Stable Diffusion, for example, is a latent diffusion model, not a pure Transformer.

{{ include_html("snippets/fundamentos-ia-iag/02-transformer.html") }}

The architecture was ready, and the leap forward came when it was applied at an unprecedented scale of data and compute.

---

## 3. Scaling laws: when quantity becomes quality

Training uses **self-supervised learning**: without labels and with a simple signal (predicting the next token), the model learns from the raw volume of text, and that volume produces a result that surprised even the people who designed it.

In 2020, OpenAI published ([Scaling Laws][r3]) that model performance follows a **predictable relationship** with three variables: parameters, training data, and compute.

> **Scaling law**: It states that doubling compute with the right proportion of data and parameters produces a predictable and consistent improvement in performance. In other words, more data and compute produce better AI models.

What was unexpected was not that models improved, but that **at a certain scale capabilities appeared that nobody had programmed**: few-shot learning, arithmetic, translation, code synthesis, and following complex instructions.

These capabilities are called **emergent capabilities** because they were not part of anyone's design. Later literature debates how much of that emergence is a real change in the model and how much is an artifact of the metric used to measure it, but the practical jump in usefulness at scale is undeniable.

<details markdown="1">
<summary><strong>What is few-shot learning?</strong></summary>

The model can learn to perform a new task after seeing only two or three examples included directly in the prompt, without retraining or seeing more data. You show it a couple of translations in the format you need and it generalizes to the rest. Before language models at scale, this required a dedicated training set; now it happens in the context of a single call. It is a capability that GPT-3 demonstrated in 2020 ([GPT-3 paper][r4]) and that nobody had anticipated from a training signal as simple as predicting the next token.

</details>

{{ include_html("snippets/fundamentos-ia-iag/02-escalas-curva.html") }}

The same curve becomes concrete when we walk through the GPT family model by model: from 117 million parameters in GPT-1 to 175 billion in GPT-3, where the emergent threshold was crossed.

{{ include_html("snippets/fundamentos-ia-iag/02-escalas.html") }}

### Foundation models

The result of these emergent capabilities is **foundation models** ([Foundation Models][r6]): models pretrained on large volumes of text and adaptable to multiple tasks without retraining from scratch.

A single model can write, summarize, translate, classify, extract information, and generate code. This is where the real usefulness of Generative AI becomes effective: we now have a single model that serves multiple tasks.

> A foundation model is not an expert in one specific task, but a compressed representation of human language and knowledge that can be specialized.

Where before you trained one model per task, now one model serves many, and adaptation can be as lightweight as changing the instructions or as deep as reinforcement learning with human feedback (RLHF, [InstructGPT][r7]), which is what turns a model that predicts text into one that follows instructions.

What changes in each case is the type of system you build on top of it.

Foundation models trained primarily on text are called **LLMs** (Large Language Models). GPT, Claude, Gemini, and Llama are examples.

They all start from the same base AI architecture, the Transformer, are pretrained on massive amounts of text, and are then adapted to follow instructions.

---

## 4. LLM, LLM + RAG, Agent

Further to the right does not mean better: it means more capabilities, higher operating cost, and more difficulty controlling the system when something fails.

### Plain LLM

The model generates from what it learned during pretraining; all of its knowledge is in the parameters.

It works well for writing, summarization, translation, code generation, and text analysis: any task where general knowledge is enough.

The limitation is that this knowledge is static and has a cutoff date: it does not know what happened after its training and cannot access your own or internal documents.

### LLM + RAG (Retrieval-Augmented Generation)

RAG solves the static-knowledge problem by adding a retrieval step before generation ([RAG paper][r5]). The mechanism uses the embeddings from the previous chapter: the documents in your knowledge base are converted into vectors and stored.

When a query arrives, it is also vectorized and the system finds the closest fragments in embedding space, meaning the ones most relevant by meaning.

Those fragments are included in the model's context together with the question, and the model reads and reasons over them to answer.

The result is that the model can answer accurately about things that were not in its base training (internal documentation, updated regulations, proprietary knowledge bases).

But there is an important nuance: the system does not learn anything new permanently. It only reads the relevant documents on each query, just as you would consult a case file before answering.

### Agent

The model no longer only answers: it can plan, use tools, and act in loops with access to web search, executable code, databases, and APIs, which lets it split a complex task into steps, execute each one, read the results, and adjust the plan.

That makes it capable of things no model alone could do, but with proportional risk: the longer the chain of steps, the greater the probability that one failure propagates into the final result.

{{ include_html("snippets/fundamentos-ia-iag/02-llm-rag-agente.html") }}

The Agent is where the promise of Software 2.0 is completed: not only is the logic learned, the system also acts.

As we can anticipate, any of these configurations needs an engineering lifecycle to work in production.

---

## 5. LLMOps: the complete lifecycle for GenAI in production

LLMOps follows the same logic as the lifecycle from the previous chapter (capture data, train, evaluate, deploy, monitor), but with one fundamental difference for 99% of the companies/individuals applying these technologies:

> **The model is a third-party service** — OpenAI, Anthropic, Google, Meta... models that you consume through an API; you do not train them and you do not have access to their weights.

In classic MLOps the central artifact is the model, while in basic LLMOps the central artifacts are the **prompt** and the **context** you pass in each call, so what used to be "retrain" here becomes "rewrite the instructions" and provide the appropriate context for each prompt.

### What you manage in LLMOps

**Prompts**: the equivalent of your system's code, where a poorly worded instruction degrades performance just like a bug, which is why prompts are versioned, tested, and deployed like any other software artifact.

**Context**: system prompt, conversation history, RAG documents: everything that enters each call determines response quality and, at the same time, cost, because you pay for every token that goes in and out.

**Evaluation**: you cannot retrain to correct an error, so the only lever available is the prompt and the context, and without evaluation (automatic, human, or through another model such as LLM-as-judge) you cannot iterate with judgment. That makes evaluation the most underestimated and the most critical step in the entire lifecycle.

<details markdown="1">
<summary><strong>What is LLM-as-judge?</strong></summary>

Instead of a person reviewing every response, another language model is used as an automatic evaluator. You pass it the question, the generated answer, and criteria (is it correct? is it concise? does it cite sources?), and the model returns a score or verdict. It is much faster and cheaper than human review at scale, although it carries the risk of inheriting the evaluator model's biases. The usual approach is to combine them: LLM-as-judge for continuous volume, human review for ambiguous cases and for validating that the evaluator itself works well.

</details>

Latency, cost per query, semantic-drift monitoring, prompt versioning: all of it exists so that the improvement lifecycle is traceable in production.

{{ include_html("snippets/fundamentos-ia-iag/02-llmops.html") }}

> The system's behavior changes with the instructions, not with the model, which is an advantage (iteration is cheap) but also a risk, because a prompt change can silently break the system if there is no automated evaluation.

### External API vs your own open-source model

The previous lifecycle assumes that you consume the model through an API, which is the starting point for most people. But there is a second route: hosting an open-source model yourself.

The LLMOps flow changes at specific points depending on which one you choose.

**External API** (OpenAI, Anthropic, Google, Mistral API…)

You do not manage the model; you only manage the prompt, context, and evaluation. The cost is per token and the bill grows with volume.
The model can change without you deciding it: a provider update can be a general improvement but a regression for your use case. Data leaves your infrastructure on every call, which can be a problem in regulated environments.

<details markdown="1">
<summary><strong>How is the privacy problem with external APIs usually addressed?</strong></summary>

The main providers offer ways to operate in regulated environments. The most common is a **zero data retention** policy: the provider contractually commits not to store your data or use it to train its models.

OpenAI, Anthropic, and Google offer it for enterprise customers. This is complemented by a **Data Processing Agreement** (DPA) with GDPR compliance for operations in Europe, and in sectors such as healthcare, a **Business Associate Agreement** (BAA) for HIPAA compliance.

Some providers also offer endpoints with data residency in the EU, so the data does not leave the region.
</details>

**Your own open-source model** (DeepSeek, Mistral, Qwen, Phi…)

The model lives in your infrastructure. The per-token cost disappears, but the fixed cost of GPUs appears. You have full control over the model version, the data does not leave your servers, and you can fine-tune on your own data if the base model is not sufficient.

In exchange, you add a new operations layer: inference-server management, model updates, scaling under load, and hardware monitoring.

| | External API | Your own open-source model |
|---|---|---|
| Cost | Variable per token | Fixed in hardware |
| Model control | None | Total |
| Data leaves | Yes | No |
| Additional ops | Minimal | Inference server, GPUs, scaling |
| Fine-tuning | Only through provider fine-tuning | Free on your own data |

The choice is not technical but business-driven: iteration speed, request volume, privacy requirements, and cost at scale.

Many teams start with an external API and migrate parts to open-source when volume justifies it or regulation requires it.

{{ include_html("snippets/fundamentos-ia-iag/02-llmops-rutas.html") }}

---

!!! tip "Next reading"
    The next chapter compares classical AI and generative AI across five concrete axes and provides an operational matrix for deciding which technology to use in each case: [Chapter 3 — AI vs Generative AI →](./03-ia-vs-ia-generativa.md)

## 6. References

<details markdown="1">
<summary><strong>Core sources</strong></summary>

| Key | Source | Short description |
| --- | --- | --- |
| R1 | **Vaswani et al. (2017)** — *Attention Is All You Need* ([arXiv][r1]) | Original Transformer paper. |
| R2 | **Mikolov et al. (2013)** — *Efficient Estimation of Word Representations in Vector Space* ([arXiv][r2]) | Establishes the modern concept of word embeddings (Word2Vec). |
| R3 | **Kaplan et al. (2020)** — *Scaling Laws for Neural Language Models* ([arXiv][r3]) | Establishes scaling laws for LLMs. |
| R4 | **Brown et al. (2020)** — *Language Models are Few-Shot Learners* (GPT-3) ([arXiv][r4]) | Demonstrates emergent capabilities in foundation models at scale. |
| R5 | **Lewis et al. (2020)** — *Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks* ([arXiv][r5]) | Foundational RAG paper. |
| R6 | **Bommasani et al. (2021)** — *On the Opportunities and Risks of Foundation Models* ([arXiv][r6]) | Complete overview of foundation models: capabilities, risks, and society. |
| R7 | **Ouyang et al. (2022)** — *Training language models to follow instructions with human feedback* ([arXiv][r7]) | Introduces fine-tuning with human feedback as a method for aligning LLMs. |

</details>

[r1]: https://arxiv.org/abs/1706.03762 "Attention Is All You Need"
[r2]: https://arxiv.org/abs/1301.3781 "Efficient Estimation of Word Representations in Vector Space"
[r3]: https://arxiv.org/abs/2001.08361 "Scaling Laws for Neural Language Models"
[r4]: https://arxiv.org/abs/2005.14165 "Language Models are Few-Shot Learners"
[r5]: https://arxiv.org/abs/2005.11401 "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks"
[r6]: https://arxiv.org/abs/2108.07258 "On the Opportunities and Risks of Foundation Models"
[r7]: https://arxiv.org/abs/2203.02155 "Training language models to follow instructions with human feedback"

---

## Frequently asked questions

**What is the difference between an arbitrary vector and an embedding?**
A vector is a list of numbers with no semantics of its own: the format exists, but the meaning does not. An embedding is that same vector after it has been adjusted through training, with its position in space reflecting meaning. Words with similar contexts end up geometrically close, which allows operations such as `king − man + woman ≈ queen`.

**Why is the Transformer considered a general architecture?**
Because it works for text, images, audio, video, and code, using the same attention mechanism that relates all tokens in the context at once. It is the central component of modern LLMs (GPT, Claude, Gemini, Llama) and an important part of the multimodal stack, making it the dominant architecture of current generative AI.

**What is the few-shot learning that emerges with scale?**
It is the ability to learn to perform a new task after seeing only two or three examples in the prompt itself, without retraining the model. GPT-3 demonstrated it in 2020 and nobody had anticipated it: the training signal was predicting the next token, and from that emerged the ability to generalize from minimal examples.

**What is the main risk of using an agent instead of only RAG?**
An agent can plan and execute external tools, which expands what it can solve, but failures propagate in a chain: the longer the sequence of steps, the harder it is to detect where the result went wrong. With RAG, the model only reads relevant fragments and answers; with an agent, every intermediate action is an additional failure point.
