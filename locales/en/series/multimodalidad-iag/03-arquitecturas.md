---
title: Multimodal system architectures
description: "Four multimodal architecture families, their trade-offs in quality, cost and latency, and when each way of combining modalities makes sense."
date: 2026-04-02
keywords: "multimodal architectures, early fusion late fusion, ViT, multimodal encoder, multimodal decoder, LLaVA, GPT-4o, generative AI architecture, vision transformer"
tags:
  - AI
  - GenAI
  - Multimodality
---

# Chapter 3 — Architectures: shared spaces, connectors and omni models

This chapter describes four architecture families that organize the modern multimodal field: visual encoder + connector + language model, cross-attention fusion, native multimodal tokenization, and omni/streaming models. By the end, you will understand what each design changes in reasoning quality, training cost and production latency, and why multimodal embeddings and multimodal generation are different system layers even when one product contains both.

There is no single standard multimodal architecture. The right design depends on what modalities must remain active, whether the system only understands or also generates them, and what latency and serving constraints the product imposes.

A useful distinction comes first:

> **Multimodal representation and multimodal generation are different capabilities.**

A model can be excellent at cross-modal retrieval while being weak at image/audio generation, or vice versa, because the two capabilities do not require identical architectures or training objectives.

---

## 1. Visual encoder + connector + language model

One of the most common families chains three components:

1. a visual encoder processes the image,
2. a connector maps the visual representation into a form the language model can consume,
3. the language model generates the response conditioned on that representation.

[BLIP-2][r2] is a canonical example. It reuses a pretrained visual encoder and a pretrained language model and trains a lightweight Q-Former between them. The connector uses a fixed number of learned query tokens to compress the visual representation before sending it to the language model.

[LLaVA][r3] takes an even simpler approach: a linear projection maps visual features directly into the language-model embedding space, followed by visual instruction tuning.

The advantage is modularity. Teams can reuse powerful pretrained components instead of training an end-to-end multimodal model from scratch.

The limitation is that visual information is largely encoded before text generation begins. If the connector compresses away a detail, the language model cannot necessarily “look back” at the original image later and recover it.

{{ include_html("snippets/multimodalidad-iag/03-encoder-conector-llm.html") }}

---

## 2. Cross-attention fusion

[Flamingo][r1] introduced a different pattern: visual information remains separately represented and cross-attention layers are inserted into the language model so text tokens can attend directly to visual tokens during generation.

This allows access to visual evidence to remain dynamic. When the model generates a statement about one object or region, cross-attention can retrieve the relevant representation at that point rather than relying only on one compressed prefix.

The trade-off is runtime complexity. Cross-attention adds computation during generation and can make inference more expensive to scale than a simpler connector architecture.

That trade-off matters most in high-volume products: an architecture that gives slightly better fine-grained localization can still be the wrong choice if it materially increases latency or accelerator cost for every generated token.

{{ include_html("snippets/multimodalidad-iag/03-cross-attention-acceso.html") }}

---

## 3. Native multimodal tokenization / early fusion

A more radical family tries to reduce the architectural distinction among modalities themselves. Images, audio or other inputs are discretized or embedded into token-like representations and processed in a more unified sequence model.

[Gemini][r4] was designed as a natively multimodal model family rather than as a text model retrofitted with one visual connector. [Chameleon][r8] pushed explicit mixed-modal early fusion by tokenizing images with a discrete image tokenizer and interleaving them with text inside one Transformer.

The structural advantage is that cross-modal relationships can be learned throughout pretraining rather than only through a narrow interface added later.

The practical cost is training scale. Specialized visual/audio encoders encode years of optimization. Relearning comparable representations inside one unified model requires enormous multimodal datasets and compute.

Gemini 1.5 adds another important dimension: a multimodal Mixture-of-Experts architecture can increase total capacity without activating every parameter for every token, helping control inference cost while supporting very long multimodal contexts [r9].

{{ include_html("snippets/multimodalidad-iag/03-tokenizacion-discreta.html") }}

---

## 4. Omni and streaming models

The previous families are often described from the perspective of **understanding multimodal input and answering in text**. Omni models make both input and output multimodal and must often operate under hard real-time constraints.

GPT-4o popularized the “omni” framing at scale: text, image and audio could be processed more natively within one model family rather than through a classical speech-to-text → LLM → text-to-speech cascade [r5].

By 2025–2026 the category broadened. Gemini 2.5 Native Audio emphasized native spoken interaction, while Qwen2.5-Omni described streaming multimodal understanding across text, images, audio and video while generating text and speech [r6][r7].

Streaming changes the architecture problem qualitatively:

- audio and video continue arriving while inference is happening,
- the system has to decide how much context to retain actively,
- first-response latency becomes a core quality metric,
- output streams may need to remain synchronized across text and speech.

Evaluation is correspondingly immature. Traditional VQA or text benchmarks do not measure interruption handling, turn-taking, spoken prosody or coherence between simultaneously generated modalities.

{{ include_html("snippets/multimodalidad-iag/03-tres-arquitecturas.html") }}

---

## 5. Quality, cost and latency: the real trade-off surface

Architecture selection is a production decision, not a benchmark beauty contest.

### Encoder + connector + LLM

- easiest to build from reusable components,
- predictable serving path,
- attractive for open-source and resource-constrained teams,
- may bottleneck fine-grained perceptual information through the connector.

### Cross-attention

- keeps perceptual evidence accessible throughout generation,
- can improve fine-grained visual reasoning,
- adds inference computation and serving complexity.

### Native multimodal / early fusion

- strongest structural potential for learning cross-modal interactions end to end,
- expensive pretraining requirements,
- production cost depends strongly on implementation details such as MoE routing and context length.

### Omni / streaming

- supports native multimodal input and output,
- constrained by real-time latency and active-context management,
- has a substantially harder evaluation and observability problem.

For many practical applications, a connector architecture remains attractive because it balances quality, development cost and latency. For frontier systems, more unified architectures increasingly make sense because the objective is no longer simply “let the language model see an image.”

{{ include_html("snippets/multimodalidad-iag/03-tradeoffs.html") }}

---

!!! tip "Next chapter"
    [Chapter 4 — Evaluation →](./04-evaluacion.md) — Why multimodal evaluation requires more than image-question accuracy, and how grounding, contamination, language priors, OCR, long video and hallucination expose real limits.

---

## 6. References

<details markdown="1">
<summary><strong>Core sources</strong></summary>

| Key | Source | Short description |
| --- | --- | --- |
| R1 | **Alayrac et al. (2022)** — *Flamingo* ([arXiv][r1]) | Cross-attention fusion for visual-language few-shot learning. |
| R2 | **Li et al. (2023)** — *BLIP-2* ([arXiv][r2]) | Q-Former connector between visual encoder and LLM. |
| R3 | **Liu et al. (2023)** — *Visual Instruction Tuning* ([arXiv][r3]) | LLaVA and a simple projected visual connector. |
| R4 | **Gemini Team (2023)** — *Gemini* ([arXiv][r4]) | Natively multimodal model family at large scale. |
| R5 | **OpenAI (2024)** — *Hello GPT-4o* ([blog][r5]) | Large-scale omni model with native multimodal interaction. |
| R6 | **Qwen Team (2025)** — *Qwen2.5-Omni Technical Report* ([arXiv][r6]) | Streaming multimodal understanding and generation. |
| R7 | **Google DeepMind (2025)** — *Gemini 2.5 Native Audio* ([blog][r7]) | Native audio and real-time dialogue capabilities. |
| R8 | **Chameleon Team (2024)** — *Chameleon* ([arXiv][r8]) | Mixed-modal early-fusion with discrete image tokens. |
| R9 | **Gemini Team (2024)** — *Gemini 1.5* ([arXiv][r9]) | Multimodal MoE with very long context. |

</details>

[r1]: https://arxiv.org/abs/2204.14198
[r2]: https://arxiv.org/abs/2301.12597
[r3]: https://arxiv.org/abs/2304.08485
[r4]: https://arxiv.org/abs/2312.11805
[r5]: https://openai.com/index/hello-gpt-4o/
[r6]: https://arxiv.org/abs/2503.20215
[r7]: https://deepmind.google/models/gemini/audio/
[r8]: https://arxiv.org/abs/2405.09818
[r9]: https://arxiv.org/abs/2403.05530

---

## Frequently asked questions

**Why would I choose a connector architecture instead of a natively multimodal model?**  
Because modularity is valuable. You can reuse a strong visual encoder and a strong language model, train a relatively small bridge, and operate the resulting system with more predictable cost than training an end-to-end frontier multimodal model.

**What is the main practical advantage of cross-attention?**  
The language model can access visual evidence dynamically during generation instead of depending only on one fixed compressed representation. That can help on localization, counting and spatial-relation tasks.

**Does native tokenization guarantee better multimodal reasoning?**  
No. It removes one structural bottleneck but demands much more multimodal training data and compute. A unified architecture with weak data can still underperform a modular system with strong specialized encoders.

**Why are omni models a separate operational category?**  
Because streaming perception and generation impose real-time constraints—first-response latency, partial input, turn-taking and synchronized outputs—that do not appear in ordinary offline image-to-text inference.
