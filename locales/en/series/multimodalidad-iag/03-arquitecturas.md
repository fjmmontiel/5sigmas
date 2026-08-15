---
title: Multimodal system architectures
description: "Four multimodal architecture families, their differences in quality, cost and latency, and when each way of combining modalities makes sense."
date: 2026-04-02
keywords: "multimodal architectures, early fusion late fusion, ViT, multimodal encoder, multimodal decoder, LLaVA, GPT-4V, generative AI architecture, vision transformer"
tags:
  - AI
  - GenAI
  - Multimodality
---

# Chapter 3 — Architectures: shared spaces, connectors and omni models

This article describes the four architecture families that organize the multimodal field today: a visual encoder with a connector, cross-attention fusion, native tokenization, and omni models with streaming. By reading it, you will understand the practical differences each design creates in reasoning quality, training cost, and production latency, and why multimodal embeddings and multimodal generation are not the same system layer even when they coexist in the same model. It is useful for any reader with a technical foundation who wants to make architecture-selection decisions that are more informed than benchmark rankings alone allow.

Multimodal systems do not have a single standard architecture. There are four different ways to connect different modalities inside a system, and each one has specific consequences for which tasks the model can perform, its computational cost in production, and the latency it introduces into responses.

One distinction is worth making from the start: multimodal embeddings and multimodal generation are different layers of the system. A model can be very strong at cross-modal representation and retrieval and weak at multimodal generation, or the reverse, because those capabilities do not emerge from the same architecture or the same type of training.

Understanding these differences makes it possible to make more informed decisions when selecting or designing a system, because the appropriate architecture depends on the specific use case, not only on which model scores highest on generic benchmarks.

---

## 1. Visual encoder + connector + language model

The most widespread approach in recent years consists of three chained components: a visual encoder that processes the image and produces a high-dimensional representation, a connection module that adapts that representation to the language model's space, and the language model that generates the response conditioned on that visual representation.

This architecture has the advantage that its components can be trained or reused relatively independently. BLIP-2, for example, uses a pretrained visual encoder (EVA-CLIP) and a pretrained language model (OPT or FlanT5), connected by a lightweight module called Q-Former that the system trains with much less compute than would be required to train the two ends from scratch [BLIP-2][r2].

The connector is the most critical design point in this architecture. If it is too simple, it cannot transfer the richness of the visual representation to the language model; if it is too complex, it requires more data and more compute to train correctly. BLIP-2's Q-Former uses a fixed number of query tokens that "compress" the visual information into a fixed-size representation, which has the advantage that processing cost is predictable regardless of image size.

LLaVA adopts an even simpler connector: a linear transformation that projects the visual encoder representations directly into the language model's embedding space [LLaVA][r3]. This simplicity is deliberate, because the language model is powerful enough to learn how to interpret those representations during fine-tuning without requiring a complex connection module.

The limitation of this architecture is that visual information is processed before the text and integrated as a fixed representation. The language model can condition its response on that representation, but it cannot "go back" to the image during generation to search for additional details. For tasks that require iterative inspection of the image, this limitation is highly relevant.

{{ include_html("snippets/multimodalidad-iag/03-encoder-conector-llm.html") }}

---

## 2. Fusion through cross-attention

Flamingo, published by DeepMind in 2022, introduced a different approach: instead of processing the image before the text and passing its representation as input, it inserted cross-attention layers between the layers of the language model [Flamingo][r1]. In these layers, text tokens can attend directly to visual tokens at any point during generation.

This design allows the language model to access visual information dynamically throughout generation. When the model generates a response that refers to a specific element in the image, the cross-attention layers can retrieve the representation of that element when it becomes relevant, instead of depending on that information having been captured in the initial representation.

The difference is visible in tasks that require fine-grained visual reasoning, such as localization, counting elements, or analyzing spatial relationships, where Flamingo demonstrated visual few-shot learning capabilities that encoder-connector-decoder approaches of comparable size could not match at the time.

The cost of this design is serving complexity. Cross-attention layers increase the computational cost of inference and make the model harder to scale horizontally, so for applications that require low latency and a high volume of queries, that overhead can be a real impediment.

{{ include_html("snippets/multimodalidad-iag/03-cross-attention-acceso.html") }}

---

## 3. Native multimodal tokenization

The third approach is the most radical: instead of connecting a visual encoder to a language model through some type of connector, the system discretizes images or audio into tokens of the same type as text tokens, and the model processes all tokens in a unified way.

Gemini, developed by Google, was the first massive-scale model built with this philosophy from the beginning [Gemini][r4]. Instead of adapting an existing language model to accept visual inputs, Gemini was designed as a natively multimodal model in which text, image, audio, and video are represented in the same token space from the start of pretraining.

The theoretical advantages of this approach are substantial: the model can learn relationships between modalities that are not possible when representations are generated in separate stages, visual information is not forced through a connector bottleneck with limited capacity, and the model can generate outputs in any modality rather than only text.

The practical difficulty is training cost. For native tokenization to produce representations with quality comparable to specialized visual encoders, pretraining has to expose the model to massive quantities of multimodal data, because encoders such as EVA-CLIP or SigLIP have been optimized for years with considerable compute, and reproducing that representation quality in a unified model requires an equivalent or greater investment.

Meta explored this direction with Chameleon, a model that tokenizes images through VQ-VAE and processes them as discrete tokens interleaved with text in the same Transformer, removing the distinction between a separate visual encoder and a language model [Chameleon][r8]. Gemini 1.5 takes a complementary route within the native-tokenization paradigm: it adopts a Mixture of Experts (MoE) architecture in which different groups of parameters specialize by modality and content type, which makes it possible to scale total model capacity without scaling inference cost proportionally [Gemini 1.5][r9]. The practical result is that Gemini 1.5 can process contexts of up to one million multimodal tokens in production, a scale that would be computationally impractical with an equivalent dense architecture.

{{ include_html("snippets/multimodalidad-iag/03-tokenizacion-discreta.html") }}

---

## 4. Omni and streaming models: native multimodal input and output

The three previous architectures share an implicit asymmetry: they are optimized to understand input modalities and respond in text. The fourth family breaks that asymmetry by attempting to make both input and output multimodal, often under latency constraints that require streaming processing.

GPT-4o was the first massive-scale model to popularize the idea of an "omni" model: trained end to end on text, image, and audio, with combined text, audio, image, and video input and text, audio, and image output [GPT-4o][r5].

In a 2026 chronology, GPT-4o fits better as a transition point between the VLM stage and the omni stage than as the frontier of the field. Gemini 2.5 Native Audio pushes the native-audio and real-time-dialogue axis [Gemini 2.5 Native Audio][r7], while Qwen2.5-Omni works in streaming mode over text, image, audio, and video and generates text and speech simultaneously [Qwen2.5-Omni][r6].

What distinguishes these systems from the natively multimodal models in the previous section is not only that they generate in several modalities, but that they do so under hard temporal constraints: the model has to perceive, process, and respond while audio or video is still arriving, which imposes very different requirements on attention architecture, active-context size, and decoder design. This difference is what makes omni models a separate family rather than simply an extension of models with native tokenization.

The practical difficulty with these systems is evaluation. There are no established benchmarks that adequately measure the quality of real-time spoken responses, interruption handling, or coherence between text output and voice output when both are generated at the same time. MMAU covers part of the audio-understanding axis, but the evaluation space for streaming multimodal generation remains open.

{{ include_html("snippets/multimodalidad-iag/03-tres-arquitecturas.html") }}

---

## 5. Quality, cost and latency: the trade-off space

Each of the four families occupies a different position in the space between quality, development cost, and operating cost.

The encoder-connector-LLM approach offers the greatest development efficiency: it allows pretrained components to be reused and reduces training cost, and in production its latency is relatively predictable because visual processing is independent of the length of the generated response. That is why it dominates open-source projects and is the most accessible option for teams with limited resources.

Fusion through cross-attention achieves higher quality on fine-grained visual-reasoning tasks, although that benefit comes at a price in inference latency that can be significant when query volume is high. The choice makes sense when localization accuracy and spatial reasoning are more critical than serving cost, which is not always the case.

Natively multimodal models have the greatest long-term structural potential but require training investments that are currently within reach only of the largest AI laboratories, so their production latency and cost depend on the specific implementation and are not directly comparable with the other approaches.

MoE architectures such as Gemini 1.5 partially change this analysis: activating only a fraction of the parameters per token reduces inference cost relative to an equivalent dense model, so the production barrier to entry is lower than total model size suggests.

Omni and streaming models add a new dimension to the trade-off space: first-response latency. A model that generates audio in real time has qualitatively different latency constraints from a model that responds in text after processing an image, because users perceive initial silence much more negatively in a spoken conversation. This means that architecture decisions in this family are dominated by generation-queue design and active-context management more than by representation quality.

For most current applications, the practical choice comes down to variants of the encoder-connector-LLM model with different connector and visual-encoder configurations. In practice, differences in operating cost and latency predictability matter more for production decisions than benchmark scores.

{{ include_html("snippets/multimodalidad-iag/03-tradeoffs.html") }}

---

!!! tip "Next chapter"
    [Chapter 4 — Evaluation →](./04-evaluacion.md) — Why measuring multimodal capability requires more than accuracy on image questions, what OCRBench v2 and MMAU reveal about the field's real limits, and the two systematic problems that make current benchmarks overestimate real capabilities.

## 6. References

<details markdown="1">
<summary><strong>Core sources</strong></summary>

| Key | Source | Short description |
| --- | --- | --- |
| R1 | **Alayrac et al. (2022)** — *Flamingo: a Visual Language Model for Few-Shot Learning* ([arXiv][r1]) | Cross-attention for visual-language fusion. |
| R2 | **Li et al. (2023)** — *BLIP-2: Bootstrapping Language-Image Pre-training* ([arXiv][r2]) | Q-Former as the connector between visual encoder and LLM. |
| R3 | **Liu et al. (2023)** — *Visual Instruction Tuning* ([arXiv][r3]) | LLaVA: linear projection as a simple connector. |
| R4 | **Gemini Team (2023)** — *Gemini: A Family of Highly Capable Multimodal Models* ([arXiv][r4]) | Massive-scale native multimodal architecture. |
| R5 | **OpenAI (2024)** — *Hello GPT-4o* ([blog][r5]) | First massive-scale omni model with native multimodal input and output. |
| R6 | **Qwen Team (2025)** — *Qwen2.5-Omni Technical Report* ([arXiv][r6]) | Omni model with streaming multimodal understanding and generation. |
| R7 | **Google DeepMind (2025)** — *Gemini 2.5 Native Audio* ([blog][r7]) | Native-audio and real-time-dialogue capabilities. |
| R8 | **Chameleon Team (2024)** — *Chameleon: Mixed-Modal Early-Fusion Foundation Models* ([arXiv][r8]) | Meta model with discrete image tokenization through VQ-VAE in the same Transformer as text. |
| R9 | **Gemini Team (2024)** — *Gemini 1.5: Unlocking multimodal understanding across millions of tokens of context* ([arXiv][r9]) | Native multimodal MoE architecture with context up to one million tokens. |

</details>

[r1]: https://arxiv.org/abs/2204.14198 "Flamingo — Alayrac et al. 2022"
[r2]: https://arxiv.org/abs/2301.12597 "BLIP-2 — Li et al. 2023"
[r3]: https://arxiv.org/abs/2304.08485 "LLaVA — Liu et al. 2023"
[r4]: https://arxiv.org/abs/2312.11805 "Gemini — Team Gemini 2023"
[r5]: https://openai.com/index/hello-gpt-4o/ "Hello GPT-4o — OpenAI 2024"
[r6]: https://arxiv.org/abs/2503.20215 "Qwen2.5-Omni Technical Report"
[r7]: https://deepmind.google/models/gemini/audio/ "Gemini 2.5 Native Audio"
[r8]: https://arxiv.org/abs/2405.09818 "Chameleon — Team Chameleon 2024"
[r9]: https://arxiv.org/abs/2403.05530 "Gemini 1.5 — Team Gemini 2024"

---

## Frequently asked questions

**What is the fundamental difference between the encoder-connector-LLM architecture and cross-attention fusion?**
In the encoder-connector-LLM architecture, the image is processed before the text and its representation remains fixed from the start: the language model receives it as input but cannot go back to the image during generation. With cross-attention, as in Flamingo, the model can access visual tokens at any point during generation, which improves quality on tasks that require fine localization or iterative inspection, although it increases the computational cost of inference.

**What advantage does a mixture-of-experts architecture offer in models such as Gemini 1.5?**
It makes it possible to scale the model to hundreds of billions of parameters without scaling inference cost proportionally, because only a fraction of the parameters is activated for each token. That makes it possible to process contexts of up to one million multimodal tokens in production, a scale that would be computationally impractical with an equivalent dense architecture.

**Why use a compression module such as Q-Former instead of projecting every visual patch directly?**
Projecting every patch produces too many visual tokens, which makes inference more expensive and can saturate the language model's context. A compression module uses a fixed number of learnable queries to extract only the visual features most relevant to language, reducing the representation to a predictable size regardless of image size.

**What distinguishes omni models from the other multimodal architectures?**
It is not only that they generate in several modalities, but that they do so under hard temporal constraints: the model has to perceive, process, and respond while audio or video is still arriving. That imposes qualitatively different requirements on attention design, active-context size, and the decoder, which makes omni models a separate family rather than simply an extension of native tokenization.
