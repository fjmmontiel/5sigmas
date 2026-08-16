---
title: "What is an LLM and how does it work?"
seo_title: "What is an LLM: how a large language model works"
description: "What an LLM is, how it tokenizes, learns and generates text, what instruction tuning changes, and the main technical limits."
keywords: "LLM, large language model, tokens, pretraining, Transformer, instruction tuning, RLHF"
date: 2026-04-07
date_modified: 2026-08-16
---

# What is an LLM and how does it work?

An **LLM** (*Large Language Model*) is a neural network trained to estimate which token may come next in a sequence. During pretraining it observes large amounts of text and adjusts its parameters to reduce prediction error. It can then generate text, answer questions, summarize, translate or produce code because many tasks can be formulated as conditional sequence continuation.

The definition is simple. The resulting behaviour is not. A useful way to understand it is to separate four pieces: **tokenization, representation, prediction and adaptation**.

## The 60-second answer

{{ include_html("snippets/temas/llm-token-pipeline.html") }}

The model does not search for a stored sentence or query a database by default. It calculates a probability distribution over the vocabulary, chooses a continuation, and runs the process again with the updated context.

A product system can add memory, retrieval, tools or policies around the model. Those capabilities belong to the complete system, not necessarily to the LLM weights.

## 1. Text becomes tokens

The model does not work directly with words. A **tokenizer** splits text into units that may be complete words, fragments, punctuation or bytes. Each token receives an integer identifier.

{{ include_html("snippets/temas/llm-tokenization.html") }}

The exact segmentation depends on the vocabulary and algorithm. Methods such as Byte Pair Encoding and SentencePiece balance two goals: keeping the vocabulary manageable and representing rare words without turning every character into an independent unit.[^sentencepiece]

Tokenization matters because it affects:

- cost, which is often measured in tokens;
- effective context length;
- representation of languages and code;
- the ease of copying numbers, names or uncommon strings.

## 2. Tokens become representations

Each identifier is transformed into a learned vector called an **embedding**. The model also needs information about each token's position. Without it, a sequence would be only an unordered set.

The vectors pass through a stack of Transformer blocks. Two main operations occur inside each block:

1. **Attention:** each position combines information from other relevant positions.
2. **Feed-forward network:** transforms each position's representation nonlinearly.

Residual connections and normalization stabilize training. As blocks are repeated, representations stop encoding only token identity and begin to incorporate syntax, semantic relationships, references, document structure and other signals useful for prediction.[^transformer]

{{ include_html("snippets/temas/llm-contextual-representation.html") }}

The guide to [the Transformer](/en/temas/transformer/) develops this architecture step by step.

## 3. The base objective is next-token prediction

For an autoregressive LLM, training optimizes the probability of the true token conditioned on the previous ones.

{{ include_html("snippets/temas/llm-next-token.html") }}

The model receives a sequence and must assign high probability to the real token that follows at each position. The gradient indicates how to modify millions or billions of parameters to make fewer errors on the next batch.

At scale, solving that task well requires learning deep regularities. To predict a plausible continuation, the model needs to capture grammar, style, relationships between concepts, coding conventions and part of the statistical structure of the world described in its data.

That does not turn probability into truth. The training objective rewards a continuation compatible with the context, not an externally verified statement.

## 4. Pretraining, instructions and preferences are different stages

A conversational product usually passes through several stages.

{{ include_html("snippets/temas/llm-adaptation-stages.html") }}

### Pretraining

The model learns general patterns from large corpora. The result is a **base model** that completes text but does not necessarily follow instructions well.

### Instruction tuning

The model is trained on instruction-response pairs so it learns to interpret requests and adopt useful response formats. This phase turns general continuation ability into assistant-like behaviour.

### Preference optimization

Human comparisons, reward models or other signals are used to favour responses considered more useful, safe or aligned with the product. InstructGPT was an early demonstration that supervised fine-tuning plus preference learning could improve instruction following without changing the fundamental generative objective.[^instructgpt]

These stages change observable behaviour. They do not guarantee that the model knows a source, stays coherent during a long operation or executes actions reliably.

## Parameters, context and external knowledge

Three different mechanisms are often confused.

| Mechanism | What it contains | When it changes |
|---|---|---|
| **Parameters** | Patterns compressed during training | When the model is trained or fine-tuned |
| **Context** | Instructions, conversation and documents sent in the request | Every interaction |
| **Retrieval or tools** | Information queried or actions executed outside the model | During system execution |

An LLM can answer from its parameters, reason over information included in context, or call a tool. Traceability is very different in each case.

When an answer must depend on current documentation, retrieval is often more verifiable than trusting whatever was compressed during training. When the system must change another system's state, it needs a tool with a contract, validation and idempotency.

## Why scale helps

Performance does not depend only on parameter count. The amount and quality of data, training compute, architecture, context length and adaptation process also matter.

Work on *scaling laws* showed predictable relationships between loss, model size, data and compute. Chinchilla added an important qualification: for a fixed training budget, increasing parameters without enough additional tokens can leave a model undertrained.[^gpt3][^chinchilla]

That is why “larger” is not a sufficient explanation. A useful comparison needs to know the training regime and evaluation task.

## What an LLM can do well

An LLM is particularly useful when the task allows linguistic variation and the result can be verified or corrected:

- transform and summarize text;
- extract information into a schema;
- generate drafts and code;
- classify from instructions and examples;
- translate between representations;
- coordinate tools through structured arguments;
- reason over information present in the context.

The complete system improves when explicit constraints, examples, validators, retrieval and evaluation on real cases are added.

## Limits that do not disappear with a better prompt

### Plausible generation, not a guarantee of truth

The model can produce a fluent false statement. Verbal confidence is not a calibrated estimate of correctness.

### Sensitivity to context

Small changes to instructions, ordering or examples can alter the result. In production, the prompt is part of the software and needs regression tests.

### Incomplete or outdated knowledge

Parameters reflect training data and its cutoff. A model does not automatically know later changes or an organization's private documentation.

### Non-monotonic reasoning

More reasoning tokens or more inference time can help, but can also introduce drift, overthinking or extra cost without improvement. The guide to [reasoning in LLMs](/en/temas/razonamiento/) separates these strategies.

### No reliable operational state by default

Conversation history is not a database. A long-running operation needs explicit state, identifiers, retries and idempotency outside the model.

## How to evaluate an LLM for a real use case

Choosing the model at the top of one benchmark is not enough. A useful evaluation should measure:

1. the real input distribution;
2. the minimum acceptable quality;
3. costly failure modes;
4. latency to a usable output;
5. total system cost;
6. stability under paraphrases;
7. correctness of tools and retrieved data.

The guide to [evaluating AI models](/en/temas/evaluacion-modelos/) proposes a complete stack from static tests to product metrics.

## Where to go deeper in 5sigmas

- [AI and Generative AI Foundations](/en/series/fundamentos-ia-iag/00_presentacion_serie/) to separate software, learning and generation.
- [From the Caves to AGI](/en/series/from-cave-to-agi/00_presentacion_serie/) to understand how representation, learning and scale converge in foundation models.
- [Reasoning Models](/en/series/modelos-razonadores/00_presentacion_serie/) to study inference, verification, latency and failures.
- [Proactive and reactive agents and tool calls](/en/articulos-tecnicos/proactive-reactive-agent-and-tool-calls/) to bring the model into an observable runtime.

## Frequently asked questions

### Is an LLM a database?

No. Its parameters compress learned regularities, but they do not provide exact retrieval, transactional updates or guaranteed provenance. A system can connect the LLM to a database or index, but those are separate components.

### Does an LLM understand language?

It depends on the definition of “understand.” Its representations capture enough syntactic and semantic relationships to solve complex tasks. That does not demonstrate subjective experience or guarantee a correct causal representation of the world.

### Do all LLMs use Transformers?

Most general-purpose language models published in the modern era use Transformers or closely related hybrid architectures. Alternatives based on state-space models and other operations exist, but “LLM” describes scale and function rather than mandating one architecture.

### What is the difference between an LLM and a chatbot?

The LLM is the generative model. The chatbot adds interface, instructions, memory, retrieval, tools, moderation, observability and product policies.

## Primary sources

[^sentencepiece]: Taku Kudo and John Richardson, [*SentencePiece: A simple and language independent subword tokenizer and detokenizer for Neural Text Processing*](https://arxiv.org/abs/1808.06226), 2018.
[^transformer]: Ashish Vaswani et al., [*Attention Is All You Need*](https://arxiv.org/abs/1706.03762), 2017.
[^gpt3]: Tom B. Brown et al., [*Language Models are Few-Shot Learners*](https://arxiv.org/abs/2005.14165), 2020.
[^chinchilla]: Jordan Hoffmann et al., [*Training Compute-Optimal Large Language Models*](https://arxiv.org/abs/2203.15556), 2022.
[^instructgpt]: Long Ouyang et al., [*Training language models to follow instructions with human feedback*](https://arxiv.org/abs/2203.02155), 2022.
