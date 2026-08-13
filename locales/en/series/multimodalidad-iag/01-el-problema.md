---
title: The real multimodality problem
description: What it means to integrate text, images, audio, video and documents without losing the structure that makes each signal useful.
date: 2026-04-01
keywords: "multimodal AI, multimodal systems, vision language model, text image audio AI, multimodal embeddings"
tags:
  - AI
  - GenAI
  - Multimodality
---

# Chapter 1 — The real problem: integrating different modalities

Multimodality is often described as the moment a language model gained image input. That is useful shorthand, but it is too narrow. Modern systems work with text, images, audio, video and documents, and the difficult part is not simply accepting those inputs. It is **preserving the information that makes each modality distinctive while still allowing the modalities to interact.**

By the end of this chapter you will understand why early conversion to text can lose important evidence, why shared embedding spaces are only one architectural option, and how perception, alignment, reasoning and generation fit together.

---

## 1. A modality is more than an input type

Different modalities encode information with different structure:

- **Text** is primarily a discrete sequence of symbols.
- **Images** contain spatial relationships.
- **Audio** carries continuous timing, rhythm and tone.
- **Video** combines spatial evidence with temporal order.
- **Documents** add layout, tables, formulas and visual hierarchy to text.

The units are not naturally equivalent. A word, an image region and an audio frame represent different kinds of information.

Systems such as CLIP made image–text alignment highly practical. ImageBind later demonstrated a joint embedding approach across a broader collection of modalities. Other architectures keep specialized encoders and connect them later instead of forcing everything into one representation immediately.

{{ include_html("snippets/multimodalidad-iag/01-espacio-comun.html") }}

The shared problem is **correspondence**: how can a system learn that different signals refer to the same concept or event while retaining the structure required by the task?

---

## 2. Translation and alignment are different

A system can accept an image and still be deeply text-centric. It can generate a caption first and perform every later step over that caption.

That is efficient when the task needs only a coarse semantic summary. It is insufficient when the original signal contains details the caption did not preserve: exact location, document layout, temporal ordering, handwriting, prosody or fine-grained visual differences.

It is useful to distinguish three levels:

1. **Translation** — convert one modality into another, usually text.
2. **Alignment** — learn when two different signals refer to related content.
3. **Joint use** — keep more than one modality available during later inference instead of discarding the original evidence immediately.

The architecture should preserve the original modality for as long as the task needs information that a cheaper representation would lose.

---

## 3. A shared embedding space is powerful, not mandatory

The most familiar multimodal pattern maps different signals into a shared semantic geometry. This enables cross-modal retrieval, zero-shot classification and similarity search.

But other systems use specialized modality encoders, cross-attention, interleaved text and visual sequences or more unified representations.

A useful definition is:

> **A system is multimodal when information from multiple modalities participates in representation, inference or generation.**

That describes the capability without assuming one specific internal architecture.

---

## 4. Four capabilities organize the field

**Perceive.** Convert raw signals into useful representations: read a page, recognize image content, follow audio over time or understand a video sequence.

**Align.** Connect separate modalities when they refer to the same underlying content. This is the foundation of cross-modal retrieval and multimodal embeddings.

**Reason.** Compare, locate, verify, summarize or follow temporal dependencies across the available evidence.

**Generate.** Produce the output format required by the application, which may be text, structured data, speech, imagery or another representation.

{{ include_html("snippets/multimodalidad-iag/01-vla-pipeline.html") }}

---

## 5. Why it remains difficult

### Different structure and granularity

Text tokens, image regions and audio frames have different resolution and information density. Connecting them requires learned correspondences rather than a natural one-to-one mapping.

### Time

For audio and video, ordering is part of the meaning. Pauses, interruptions and event sequences cannot be represented correctly if temporal structure is discarded.

### Grounding

A fluent response can still be weakly supported by the perceptual source. Evaluation therefore needs to test whether the output matches the underlying image, audio, document or video—not only whether the language sounds plausible.

### Uneven modality strength

Real systems are rarely equally strong in every direction. One may excel at multimodal retrieval but not generation; another may understand video while answering primarily in text.

### Modality collapse

If the data or architecture strongly favors one modality, the model can learn to rely mostly on that channel and underuse other available evidence.

{{ include_html("snippets/multimodalidad-iag/01-colapso-modal.html") }}

---

## 6. The design question to keep

The central design question is not “How many input types does this model accept?” It is:

> **Which information from each modality must remain available, and until what point in the pipeline, for this task to be solved correctly?**

That determines whether an early caption is enough, whether shared embeddings are sufficient, or whether richer cross-modal interaction is needed throughout inference.

---

!!! tip "Continue the path"
    Return to the [Multimodality series overview](./00_presentacion_serie.md). Chapter 2 — *Alignment* — will be published as the next completed slice.

## References

- **Radford et al. (2021)** — CLIP: image–text representation learning from natural-language supervision.
- **Alayrac et al. (2022)** — Flamingo: visual-language modeling with cross-attention.
- **Li et al. (2023)** — BLIP-2: connecting visual encoders and language models.
- **Girdhar et al. (2023)** — ImageBind: a shared embedding space across multiple modalities.

## Frequently asked questions

**Is a vision-language model automatically fully multimodal?**  
It is multimodal, but the broader field includes audio, video, documents and other signals as well as image–text systems.

**Why not convert every modality to text first?**  
Because text can discard spatial, temporal, layout and prosodic information that may be essential for the task.

**Does multimodality require one shared embedding space?**  
No. Shared embeddings are one powerful architecture among several.

**What is modality collapse?**  
A failure mode where the system relies disproportionately on one modality and underuses other available signals.
