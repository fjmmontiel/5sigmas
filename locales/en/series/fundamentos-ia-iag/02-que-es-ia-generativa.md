---
title: What is Generative AI?
description: "How generative AI works: from embeddings and the Transformer to foundation models. Scaling laws, LLMOps and the difference between an LLM, RAG and an agent."
date: 2026-03-17
keywords: "generative AI, what is generative AI, transformer, language models, LLM, embedding, scaling laws, GPT, foundation models, RLHF, fine-tuning"
tags:
  - AI
  - GenAI
  - LLMs
---

# Chapter 2 — What is Generative AI?

This chapter explains how generative AI works, from its fundamental pieces to the systems used in production today. By the end, you will understand what embeddings are and why they let text be treated mathematically, how the Transformer solved key limitations of earlier sequence models through attention, and what scaling laws and emergent capabilities mean. The chapter also covers the three main practical configurations—standalone LLM, RAG and agent—and the LLMOps lifecycle required to operate any of them reliably in production. Reading Chapter 1 first is recommended.

!!! info "Prerequisites"
    This chapter assumes you know the general AI framework from [Chapter 1 — What is AI?](./01-que-es-ia.md).

In the [previous chapter](./01-que-es-ia.md) we mapped the layers inside AI. We can now go deeper into one specific branch of deep learning: generative AI.

Generative AI produces text, images, code, audio and video instead of only classifying inputs or separating them into predefined classes.

The underlying machine-learning loop is still familiar: data enters, parameters are adjusted and training tries to reduce an error signal.

What changed is **what is learned and the scale at which learning happens**. Three pieces fit together in sequence:

- **Embeddings:** how meaning is represented as numbers.
- **Transformer:** the architecture that can process long context efficiently through attention.
- **Scaling laws:** why increasing data, parameters and compute produces predictable capability gains—and, at sufficient scale, qualitatively new useful behaviors.

---

## 1. Embeddings: translating text into numbers

Machine-learning models need numerical inputs, and natural language is not numerical by default.

The solution begins with three linked steps.

First, text is divided into **tokens**: the units the model actually processes. A token may be a full word, part of a word or punctuation. The exact segmentation depends on the tokenizer. ([OpenAI Tokenizer](https://platform.openai.com/tokenizer))

Each token is then represented by a **vector**: a list of numerical values that places the token somewhere in a high-dimensional mathematical space. At initialization those values do not yet encode useful semantics.

Training gives those positions structure. The vectors are adjusted until tokens that appear in similar contexts tend to occupy nearby regions of the learned space.

That learned vector is an **embedding** ([original paper][r2]). "King" and "queen" tend to end up closer than "king" and "coal."

Operations on those positions can capture relationships such as `king − man + woman ≈ queen`.

> A model does not store dictionary definitions inside the vector. It learns statistical geometry: tokens used in similar contexts acquire nearby representations, and useful semantic structure emerges from that geometry during training.

Text, images and audio can all be converted into vectors before deeper processing. That common representation is one reason modern architectures can connect multiple modalities.

{{ include_html("snippets/fundamentos-ia-iag/02-embeddings.html") }}

Once representations are numerical, the next challenge is to process long sequences without losing important relationships between distant elements.

---

## 2. The Transformer: the architecture that changes the scale of the problem

Before the [Transformer (2017)](https://arxiv.org/abs/1706.03762), many sequence models processed text largely **in order**, token after token. That created two practical problems:

1. Training was difficult to parallelize across a sequence.
2. Information from early parts of a long sequence could become difficult to preserve effectively until the end.

The Transformer addressed both through a central mechanism: **attention**.

For each token, the model learns how much relevance to assign to other tokens in the current context. In the sentence "The bank where I sat was wet," the representation of "bank" can attend strongly to "sat" and "wet," pushing the interpretation toward a bench or riverbank context rather than a financial institution—without an explicit handwritten rule for that sentence.

Internally, the model still follows the neural-network principle from Chapter 1: numerical weights are adjusted to reduce training error. What changes is the connectivity pattern. Attention lets positions in the context interact directly instead of relying only on a strictly sequential chain.

The Transformer is especially valuable because the architecture is **general**. It powers modern language models and is a major component of multimodal systems for images, audio, video and code. Not every generative model is a pure Transformer—Stable Diffusion, for example, is a latent diffusion model—but attention-based Transformer components dominate much of today's foundation-model stack.

{{ include_html("snippets/fundamentos-ia-iag/02-transformer.html") }}

The architecture was ready. The next leap came from applying it with unprecedented amounts of data and compute.

---

## 3. Scaling laws: when quantity changes quality

Large language models are pretrained primarily through **self-supervised learning**. A simple prediction objective—such as predicting the next token—can be applied to enormous quantities of raw text without a human label for every example.

In 2020, OpenAI published work on [neural scaling laws][r3], showing that language-model performance followed predictable trends as three variables increased together: model size, training data and compute.

> **Scaling law:** within a particular training regime, increasing compute together with appropriately scaled data and model capacity tends to improve loss and downstream capability in a predictable way.

The surprising part was not simply that larger models improved. At certain scales, systems became useful at tasks that had not been individually programmed: few-shot learning, arithmetic, translation, code synthesis and following complex instructions.

These are often called **emergent capabilities**. Later research has debated how much "emergence" reflects a true discontinuity in the model and how much is produced by discrete evaluation metrics, but the practical increase in broad usefulness with scale is not in doubt.

<details markdown="1">
<summary><strong>What is few-shot learning?</strong></summary>

A model can infer a new task from only a few examples placed directly in the prompt, without updating its weights. Show two or three examples of the format you want and the model can often generalize the pattern to new inputs. GPT-3 demonstrated this behavior at scale in 2020 ([GPT-3 paper][r4]).

</details>

{{ include_html("snippets/fundamentos-ia-iag/02-escalas-curva.html") }}

The same trend becomes concrete when looking across GPT generations: from 117 million parameters in GPT-1 to 175 billion in GPT-3, with substantial jumps in general-purpose language capability along the way.

{{ include_html("snippets/fundamentos-ia-iag/02-escalas.html") }}

### Foundation models

The result of this large-scale pretraining regime is the **foundation model** ([Foundation Models][r6]): a model trained on broad data that can be adapted to many downstream tasks without starting from zero each time.

A single model can write, summarize, translate, classify, extract information and generate code. This is the practical shift introduced by generative AI: many different tasks can now be expressed as different instructions to the same underlying model.

> A foundation model is not one narrow expert. It is a broad pretrained representation that can be adapted to many tasks through prompting, retrieval, fine-tuning or other post-training methods.

Where older ML systems often required one model per task, a foundation model can support many. Adaptation may be as light as changing instructions or as deep as reinforcement learning from human feedback—RLHF, as used in [InstructGPT][r7]—which turns a next-token predictor into a model better aligned with user instructions.

Foundation models trained primarily for language are commonly called **LLMs** (Large Language Models). GPT, Claude, Gemini and Llama are examples.

---

## 4. Standalone LLM, LLM + RAG and agent

Moving to the right does not automatically mean "better." It means more capabilities, more moving parts and more things that can fail.

### Standalone LLM

The model generates from patterns and knowledge encoded during pretraining and post-training.

This is often enough for drafting, summarization, translation, code generation and analysis where broad general knowledge is sufficient.

The limitation is that the model's internal knowledge is static relative to its training and deployment lifecycle. It does not automatically know what happened after training and cannot access private documents unless those documents are supplied as context.

### LLM + RAG — Retrieval-Augmented Generation

RAG addresses the static-knowledge problem by adding retrieval before generation ([RAG paper][r5]).

Documents are converted into embeddings and indexed. When a question arrives, the query is embedded too, and the system retrieves the pieces of information that are closest in semantic space.

Those passages are inserted into the model's context together with the question. The model can then reason over information that was never stored in its weights—for example current documentation, internal policies or private knowledge bases.

The important nuance is that the model does not necessarily learn those documents permanently. It reads the relevant material for the current request, similar to a person consulting a file before answering.

### Agent

An agent adds an execution loop around the model. Instead of only returning one response, the system can decompose a task into steps, call approved tools, inspect their results and decide what to do next.

That can solve workflows a standalone model cannot complete, but the engineering burden increases with every additional action and dependency. Long chains require explicit permissions, observability, evaluation and recovery behavior so that a failure in one step does not silently contaminate the rest of the workflow.

{{ include_html("snippets/fundamentos-ia-iag/02-llm-rag-agente.html") }}

The key product lesson is simple: use the **simplest architecture that satisfies the task**. A standalone LLM is easier to operate than RAG; RAG is easier to reason about than a multi-step agent with external actions.

Any of these configurations still needs an engineering lifecycle if it is going to operate reliably in production.

---

## 5. LLMOps: the production lifecycle for GenAI

LLMOps follows the same spirit as MLOps—capture data, evaluate, deploy, monitor and improve—but with one practical difference for most teams using frontier generative AI:

> **The base model is often a third-party service** consumed through an API rather than a model whose weights the application team trains and controls directly.

In classic MLOps, the central artifact is frequently the trained model. In a basic LLMOps system, the most important application-controlled artifacts are the **prompt, context, retrieval configuration, tool definitions and evaluation suite**.

### What LLMOps manages

**Prompts.** Instructions behave like executable product configuration. A small change can improve or degrade performance, so prompts should be versioned, tested and deployed deliberately.

**Context.** System instructions, conversation history and retrieved documents all affect output quality and cost because they shape what the model sees on each call.

**Evaluation.** When you do not control base-model training, you need evaluation to know whether prompt/context changes actually help. Evaluation may be automatic, human or assisted by another model.

<details markdown="1">
<summary><strong>What is LLM-as-judge?</strong></summary>

Another language model is used as an automated evaluator. The evaluator receives the task, the generated answer and explicit criteria—correctness, concision, evidence quality and so on—and returns a score or verdict. It scales much more cheaply than reviewing every response manually, but it can inherit evaluator biases, so strong systems validate judge behavior against human-reviewed reference sets.

</details>

Latency, cost per request, semantic drift and prompt versioning all become part of a traceable improvement loop.

{{ include_html("snippets/fundamentos-ia-iag/02-llmops.html") }}

> The application can change substantially even when the underlying model stays fixed. That makes iteration cheap, but it also means a prompt or context change can silently regress the system unless automated evaluation catches it.

### External API vs self-hosted open-weight model

The lifecycle above assumes an API model, which is the common starting point. A second route is to host an open-weight model yourself.

The operational tradeoff changes depending on the route.

**External API** — for example providers such as OpenAI, Anthropic, Google or Mistral.

You mainly manage prompts, context, tools, retrieval and evaluation. Cost is typically usage-based. Provider model versions may evolve independently of your application, so regressions need to be caught through your own evaluation suite. Data also leaves your immediate infrastructure boundary unless the provider and deployment arrangement meet your privacy requirements.

<details markdown="1">
<summary><strong>How is privacy commonly handled with external model APIs?</strong></summary>

Enterprise deployments commonly rely on contractual data-processing terms, retention controls, regional data-handling options and industry-specific agreements where applicable. The exact guarantees depend on the provider, product tier and contract, so production teams should verify the current terms for their deployment rather than assuming consumer defaults apply.

</details>

**Self-hosted open-weight model** — for example DeepSeek, Mistral, Qwen or Phi families.

The model runs inside infrastructure you operate. You gain control over model versioning, data location and fine-tuning, but you also take responsibility for inference servers, GPU capacity, upgrades, scaling and hardware observability.

| | External API | Self-hosted open-weight model |
|---|---|---|
| Cost structure | Variable usage cost | Fixed/allocated hardware cost |
| Model-version control | Limited | High |
| Data boundary | Depends on provider/deployment | Your infrastructure |
| Additional ops | Lower | Inference servers, GPUs, scaling |
| Fine-tuning freedom | Provider-dependent | Broad, subject to model license |

The choice is primarily a product and business decision: iteration speed, request volume, privacy requirements, available operations expertise and cost at scale.

{{ include_html("snippets/fundamentos-ia-iag/02-llmops-rutas.html") }}

---

!!! tip "Next reading"
    The next chapter compares classical AI and generative AI across five concrete axes and gives an operational decision matrix: [Chapter 3 — AI vs Generative AI →](./03-ia-vs-ia-generativa.md)

## 6. References

<details markdown="1">
<summary><strong>Primary sources</strong></summary>

| Key | Source | Short description |
| --- | --- | --- |
| R1 | **Vaswani et al. (2017)** — *Attention Is All You Need* ([arXiv][r1]) | Original Transformer paper. |
| R2 | **Mikolov et al. (2013)** — *Efficient Estimation of Word Representations in Vector Space* ([arXiv][r2]) | Foundational modern word-embedding work. |
| R3 | **Kaplan et al. (2020)** — *Scaling Laws for Neural Language Models* ([arXiv][r3]) | Establishes scaling-law relationships for language models. |
| R4 | **Brown et al. (2020)** — *Language Models are Few-Shot Learners* ([arXiv][r4]) | Documents few-shot capability in GPT-3 at scale. |
| R5 | **Lewis et al. (2020)** — *Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks* ([arXiv][r5]) | Foundational RAG paper. |
| R6 | **Bommasani et al. (2021)** — *On the Opportunities and Risks of Foundation Models* ([arXiv][r6]) | Broad framework for foundation models, capabilities and risks. |
| R7 | **Ouyang et al. (2022)** — *Training language models to follow instructions with human feedback* ([arXiv][r7]) | Introduces the InstructGPT RLHF approach for instruction following. |

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
A vector is simply a list of numbers. An embedding is a vector whose position has been shaped by training so that geometry carries useful structure. Similar contexts tend to produce nearby representations, allowing the model to use distance and direction as part of its internal computation.

**Why is the Transformer considered a general architecture?**
Attention lets positions in a sequence interact directly and efficiently, and the same core idea can be applied to tokens representing text, image patches, audio or other modalities. That flexibility is why Transformer-based components dominate modern language models and much of the multimodal stack.

**What is few-shot learning?**
It is the ability to infer a new task from a small number of examples provided in context without updating model weights. GPT-3 made this behavior especially visible at scale: a generic language model could often infer the intended mapping from only a handful of demonstrations.

**What is the main risk of using an agent instead of only RAG?**
An agent adds sequential decisions and external actions. Each additional step, tool and state transition creates another place where an error can appear or propagate. RAG mainly retrieves context and generates an answer; an agent also needs permission boundaries, step-level observability, bounded retries and explicit recovery behavior.
