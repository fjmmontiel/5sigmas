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

This article describes the four architecture families that organize the multimodal field today: a visual encoder with a connector, cross-attention fusion, native tokenization, and omni models with streaming. It explains the practical differences each design creates in reasoning quality, training cost and production latency, and why multimodal embeddings and multimodal generation remain different system layers even when they coexist in the same model. It is intended for readers with a technical foundation who want to choose architectures based on more than benchmark rankings alone.

Multimodal systems do not have a single standard architecture. Four broad design families connect modalities in different ways, and each affects which tasks the model can perform, how much compute it requires in production and how much latency it adds to a response.

One distinction matters from the start: multimodal embeddings and multimodal generation are different layers of the system. A model can be very strong at cross-modal representation and retrieval and weak at multimodal generation, or the reverse, because those capabilities do not emerge from the same architecture or the same type of training.

Understanding these differences makes architecture selection more concrete. The right design depends on the use case, not simply on which model leads a generic benchmark.

---

## 1. Visual encoder + connector + language model

The most widespread approach in recent years uses three components in sequence: a visual encoder that processes the image and produces a high-dimensional representation, a connector that adapts that representation to the language model's space, and the language model that generates a response conditioned on the visual representation.

This architecture has the advantage that its components can be trained or reused relatively independently. BLIP-2, for example, uses a pretrained visual encoder (EVA-CLIP) and a pretrained language model (OPT or FlanT5), connected by a lightweight module called Q-Former that can be trained with much less compute than would be required to train the two ends from scratch [BLIP-2][r2].

The connector is the critical design point in this architecture. If it is too simple, it cannot transfer the richness of the visual representation to the language model; if it is too complex, it requires more data and compute to train correctly. BLIP-2's Q-Former uses a fixed number of query tokens to compress visual information into a fixed-size representation, which keeps processing cost predictable regardless of image size.

LLaVA adopts an even simpler connector: a linear transformation that projects visual-encoder representations directly into the language model's embedding space [LLaVA][r3]. The simplicity is deliberate. The language model is powerful enough to learn how to interpret those representations during fine-tuning without requiring a complex connection module.

The limitation is that visual information is processed before the text and integrated as a fixed representation. The language model can condition its response on that representation, but it cannot return to the image during generation to inspect additional details. That matters for tasks that require iterative visual inspection.

{{ include_html("snippets/multimodalidad-iag/03-encoder-conector-llm.html") }}

---

## 2. Fusion through cross-attention

Flamingo, published by DeepMind in 2022, introduced a different approach: instead of processing the image before the text and passing its representation as input, it inserted cross-attention layers between the layers of the language model [Flamingo][r1]. In these layers, text tokens can attend directly to visual tokens at any point during generation.

This design lets the language model access visual information dynamically throughout generation. When the model produces a response that refers to a specific element in the image, the cross-attention layers can retrieve that element's representation when it becomes relevant instead of relying on it having been captured in the initial representation.

The advantage is most visible in tasks that require fine-grained visual reasoning, such as localization, counting elements or analyzing spatial relationships. Flamingo demonstrated visual few-shot learning capabilities that encoder-connector-decoder approaches of comparable size could not match at the time.

The trade-off is serving complexity. Cross-attention layers increase inference cost and make the model harder to scale horizontally, so the overhead can become a real constraint in applications that require both low latency and high query volume.

{{ include_html("snippets/multimodalidad-iag/03-cross-attention-acceso.html") }}

---

## 3. Native multimodal tokenization

The third approach removes the connector boundary entirely. Instead of connecting a visual encoder to a language model through a separate module, the system discretizes images or audio into tokens that can be processed alongside text tokens in a unified sequence.

Gemini, developed by Google, was the first large-scale model built around this philosophy from the start [Gemini][r4]. Rather than adapting an existing language model to accept visual inputs, Gemini was designed as a natively multimodal model in which text, image, audio and video are represented in the same token space from the beginning of pretraining.

The theoretical advantages are substantial: the model can learn relationships between modalities that are difficult to capture when representations are generated in separate stages, visual information is not forced through a fixed-capacity connector bottleneck, and the model can generate outputs in modalities other than text.

The practical difficulty is training cost. For native tokenization to produce representations comparable in quality to specialized visual encoders, pretraining has to expose the model to massive quantities of multimodal data. Encoders such as EVA-CLIP or SigLIP have been optimized for years with considerable compute, and reproducing that representation quality in a unified model requires an equivalent or greater investment.

Meta explored this direction with Chameleon, a model that tokenizes images through VQ-VAE and processes them as discrete tokens interleaved with text in the same Transformer, removing the distinction between a separate visual encoder and a language model [Chameleon][r8]. Gemini 1.5 takes a complementary route within the native-tokenization paradigm: it uses a Mixture of Experts (MoE) architecture in which different groups of parameters specialize by modality and content type, allowing total model capacity to scale without increasing inference cost proportionally [Gemini 1.5][r9]. In practice, Gemini 1.5 can process contexts of up to one million multimodal tokens in production, a scale that would be computationally impractical with an equivalent dense architecture.

{{ include_html("snippets/multimodalidad-iag/03-tokenizacion-discreta.html") }}

---

## 4. Omni and streaming models: native multimodal input and output

The three previous architectures share an implicit asymmetry: they are optimized to understand input modalities and respond in text. The fourth family breaks that asymmetry by making both input and output multimodal, often under latency constraints that require streaming processing.

GPT-4o was the first large-scale model to popularize the idea of an "omni" model: trained end to end on text, image and audio, with combined text, audio, image and video input and text, audio and image output [GPT-4o][r5].

By 2026, GPT-4o is better viewed as a transition point between the VLM stage and the omni stage than as the frontier of the field. Gemini 2.5 Native Audio extends native audio and real-time dialogue [Gemini 2.5 Native Audio][r7], while Qwen2.5-Omni streams text, image, audio and video inputs and generates text and speech simultaneously [Qwen2.5-Omni][r6].

What distinguishes these systems from the natively multimodal models in the previous section is not only that they generate in several modalities, but that they do so under strict real-time constraints. The model has to perceive, process and respond while audio or video is still arriving, which places different demands on attention design, active-context size and decoder architecture. That is why omni models form a separate family rather than simply extending native tokenization.

Evaluation is the practical difficulty. There are no established benchmarks that adequately measure real-time spoken-response quality, interruption handling, or coherence between text and voice when both are generated simultaneously. MMAU covers part of audio understanding, but evaluation for streaming multimodal generation remains immature.

{{ include_html("snippets/multimodalidad-iag/03-tres-arquitecturas.html") }}

---

## 5. Quality, cost and latency: the trade-off space

Each family occupies a different position across reasoning quality, development cost, serving cost and latency.

The encoder-connector-LLM approach is the most development-efficient. It reuses pretrained components, reduces training cost and offers relatively predictable production latency because visual processing is independent of generated-response length. That is why it dominates open-source projects and remains the most accessible option for teams with limited resources.

Cross-attention fusion can deliver higher quality on fine-grained visual-reasoning tasks, but the gain comes with higher inference latency that can become significant at high query volumes. The trade-off makes sense when localization accuracy and spatial reasoning matter more than serving cost, which is not always the case.

Natively multimodal models have the greatest long-term structural potential but require training investments that are currently within reach only of the largest AI laboratories. Their production latency and cost depend heavily on the implementation and are therefore not directly comparable with the other approaches.

MoE architectures such as Gemini 1.5 change part of this analysis: activating only a fraction of the parameters per token reduces inference cost relative to an equivalent dense model, so serving cost can be lower than total model size alone would suggest.

Omni and streaming models add another dimension: time to first response. A model that generates audio in real time has qualitatively different latency constraints from a model that responds in text after processing an image because users perceive initial silence much more negatively in spoken conversation. Architecture decisions in this family are therefore driven more by generation-queue design and active-context management than by representation quality alone.

For most current applications, the practical choice still comes down to variants of the encoder-connector-LLM design with different connector and visual-encoder configurations. In production, operating cost and latency predictability often matter more than generic benchmark scores.

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
| R4 | **Gemini Team (2023)** — *Gemini: A Family of Highly Capable Multimodal Models* ([arXiv][r4]) | Large-scale native multimodal architecture. |
| R5 | **OpenAI (2024)** — *Hello GPT-4o* ([blog][r5]) | First large-scale omni model with native multimodal input and output. |
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
In the encoder-connector-LLM architecture, the image is processed before the text and its representation remains fixed from the start: the language model receives it as input but cannot return to the image during generation. With cross-attention, as in Flamingo, the model can access visual tokens at any point during generation, which improves quality on tasks that require fine localization or iterative inspection, although it increases inference cost.

**What advantage does a mixture-of-experts architecture offer in models such as Gemini 1.5?**
It allows the model to scale to hundreds of billions of parameters without increasing inference cost proportionally because only a fraction of the parameters is activated for each token. This makes contexts of up to one million multimodal tokens practical in production at a scale that would be computationally impractical with an equivalent dense architecture.

**Why use a compression module such as Q-Former instead of projecting every visual patch directly?**
Projecting every patch produces too many visual tokens, increasing inference cost and potentially saturating the language model's context. A compression module uses a fixed number of learnable queries to extract the visual features most relevant to language, reducing the representation to a predictable size regardless of image size.

**What distinguishes omni models from the other multimodal architectures?**
Omni models differ not just because they generate in several modalities, but because they do so under strict real-time constraints: the model has to perceive, process and respond while audio or video is still arriving. That imposes qualitatively different requirements on attention design, active-context size and the decoder, which makes omni models a separate family rather than simply an extension of native tokenization.