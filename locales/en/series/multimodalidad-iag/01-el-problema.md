---
title: The real problem of multimodality
description: "What it means to integrate text, images, audio and other modalities, and how perception, alignment, reasoning, generation and action fit together."
date: 2026-04-01
keywords: "multimodal AI, multimodal systems, multimodal LLM, text image audio AI, multimodal perception, multimodal generative AI, GPT-4V, Gemini multimodal"
tags:
  - AI
  - GenAI
  - Multimodality
---

# Chapter 1 — The real problem: integrating different modalities without reducing them too early

This chapter explains what multimodality actually means in AI: not merely that a model can “see” an image, but the broader problem of integrating text, images, audio, video, documents and continuous signals without destroying what each modality contributes. By the end, you will understand why the field goes far beyond vision-language models, the difference between translating a modality into text and keeping it active during reasoning, and the five capabilities—perception, alignment, reasoning, generation and action—that organize modern multimodal systems.

Multimodality is often described as the moment a language model stopped working only with text and began accepting images. That description is not wrong, but it is too narrow for the field as it exists today.

By 2026, systems coexist that represent text, images, video, audio and documents in shared embedding spaces; maintain native spoken dialogue; process interleaved sequences of text, images and video; and inject continuous physical-world signals into inference.

The multimodal problem is therefore not simply what happens when an LLM “sees” an image. It is how to construct systems that can work with heterogeneous signals **without forcing them to lose their useful structure too early**.

!!! abstract "Key idea"
    The central multimodal problem is not combining modalities. It is deciding **when and how to integrate them without destroying what each contributes separately**.

Some systems convert an image into a textual description and delegate all subsequent reasoning to the language model. Others keep visual, acoustic, document or sensor evidence active deeper into representation and decision making.

Both approaches can be useful. They do not solve exactly the same problem. Early translation is cheap and exploits a channel we already handle well; richer multimodal systems try to preserve information that text may discard: position, temporal synchrony, prosody, page layout, continuous state or perceptual context.

---

## 1. A modality is more than an input type

A modality is a distinct way of encoding information about the world.

- **Text** is primarily a discrete sequence of symbols.
- **Images** carry spatial structure.
- **Audio** carries continuous time, rhythm, tone and non-verbal information.
- **Video** combines vision, audio and temporal order.
- **Documents** add layout, tables, formulas, regions and visual hierarchy to text.
- **Embodied systems** may additionally consume depth, state, partial observations, inertial signals and continuous telemetry.

These units are not naturally equivalent. A word, an image patch, an audio frame and a sensor reading describe different structures.

[ImageBind][r4] made this explicit by aligning images, text, audio, depth, thermal signals and IMU data in a shared representation space. [PaLM-E][r5] pushed the same general idea toward embodied systems by feeding visual observations and continuous state into a language model for planning and manipulation. Multimodal embedding products now treat text, images, video, audio and documents as first-class retrieval primitives.

This distinction matters because “multimodal” is still often used as shorthand for vision-language. Vision-language systems are central—from CLIP through Flamingo and BLIP-2—but they do not exhaust the field.

A model that interprets radiographs with textual instructions, indexes complex PDFs, maintains a spoken tool-using conversation, retrieves video from an image example, or plans a robotic action from perception and language belongs to the same broader family. Benchmarks such as [OCRBench v2][r7] and [MMAU][r8] are useful precisely because documents and audio introduce problems that are not reducible to ordinary text-plus-image evaluation.

---

## 2. The problem is not adding modalities, but crossing them without destroying information

A system can accept images and still remain deeply text-centric if it first generates a caption and performs every later step over that caption.

That can be the right design when a coarse semantic summary is enough. It becomes a problem when the task depends on information the caption does not preserve—for example:

- the exact location of an object,
- a small difference between two images,
- handwritten text in one corner,
- event order in audio or video,
- or a change in tone that alters the meaning of a sentence.

It is useful to distinguish three levels:

1. **Translation** — convert one modality into another, usually text.
2. **Alignment** — learn that two different signals refer to related content.
3. **Operational co-presence** — keep multiple modalities available during inference or generation instead of immediately collapsing them into one.

CLIP helped establish robust image–text alignment at scale [r1]. ImageBind extended alignment well beyond the classic pair [r4]. [Flamingo][r2] and [BLIP-2][r3] showed how multimodality can instead be built as bridges between specialized modules. Systems such as Qwen2.5-Omni move the problem into a temporal regime where listening, understanding and generating have to happen under streaming latency constraints [r6].

---

## 3. Shared spaces matter, but they are not the only architecture

One common introduction to multimodality presents a shared representation space almost as the definition of the field. The intuition is useful: if different signals occupy the same semantic geometry, cross-modal retrieval, zero-shot classification and similarity search become much easier.

But it is not a universal architecture.

- **Flamingo** couples pretrained components and handles arbitrarily interleaved text with images or video through cross-attention.
- **BLIP-2** uses a lightweight Querying Transformer as an interface between a frozen visual encoder and a language model.
- **PaLM-E** injects visual observations and continuous state for embodied tasks.
- **Omni models** increasingly combine understanding and generation across modalities under one end-to-end runtime.

A more precise definition is:

> **A system is multimodal when information from multiple modalities participates in representation, inference, generation or action.**

That can be implemented with joint embeddings, connectors, cross-attention, interleaved sequences, more unified architectures or combinations of these patterns.

---

## 4. Five capabilities organize a multimodal system

### Perceive

Convert heterogeneous raw signals into useful representations: read a page, recognize image content, track audio, distinguish speakers or interpret a video sequence.

### Align

Learn when separate signals refer to the same underlying content. This powers cross-modal retrieval and multimodal embeddings.

### Reason

Operate over the aligned evidence: compare, verify, locate, summarize, answer questions or follow temporal dependencies.

### Generate

Produce the output modality required by the application: text, structured data, speech, imagery, video or another representation.

### Act

Once the system uses tools or enters a physical environment, multimodality becomes a situated decision problem. Perception has consequences.

Vision-language-action systems such as [RT-2][r9] illustrate this last layer. Instead of ending at text, the model maps visual observations and textual instructions into executable motor commands.

{{ include_html("snippets/multimodalidad-iag/01-vla-pipeline.html") }}

---

## 5. Why multimodality remains difficult

### Different structure and granularity

A text token, an image patch, an audio segment and a document region do not have the same resolution or information density. Correspondences must be learned rather than assumed.

### Time

In audio and video, ordering is part of meaning. A laugh, interruption, pause or event sequence cannot be represented correctly if temporal structure is discarded.

### Grounding

A response can be fluent while being poorly supported by the perceptual source. The model may sound correct while contradicting the image, audio or document it received. Multimodal evaluation therefore has to test whether the output is **grounded in the source evidence**, not only whether the language is plausible.

### Asymmetry

“Any modality in, any modality out” is a useful direction, not a uniform description of deployed systems. Some models excel at retrieval but do not generate; some generate speech but not images; some understand video but mostly answer in text; embodied systems may act but remain narrow outside their control domain.

### Modality collapse

When training distributions are strongly imbalanced, a model can learn to rely mostly on the dominant modality even when another modality contains the decisive evidence.

{{ include_html("snippets/multimodalidad-iag/01-colapso-modal.html") }}

---

## 6. The design question to keep

The central design question is not “How many input types does this model accept?” It is:

> **Which information from each modality must remain available, and until what point in the pipeline, for this task to be solved correctly?**

That determines whether an early caption is sufficient, whether a shared embedding is enough, or whether richer cross-modal interaction must remain active through inference and action.

{{ include_html("snippets/multimodalidad-iag/01-espacio-comun.html") }}

!!! tip "Next chapter"
    [Chapter 2 — Alignment →](./02-alineamiento.md) — How models learn that different signals describe the same content, what changes beyond image–text pairs, and why data quality determines representation robustness.

---

## 7. References

<details markdown="1">
<summary><strong>Core sources</strong></summary>

| Key | Source | Short description |
| --- | --- | --- |
| R1 | **Radford et al. (2021)** — *Learning Transferable Visual Models From Natural Language Supervision* ([arXiv][r1]) | CLIP: large-scale text–image representation learning. |
| R2 | **Alayrac et al. (2022)** — *Flamingo: a Visual Language Model for Few-Shot Learning* ([arXiv][r2]) | Visual encoder + language model connected through cross-attention. |
| R3 | **Li et al. (2023)** — *BLIP-2* ([arXiv][r3]) | Connector architecture between visual encoders and language models. |
| R4 | **Girdhar et al. (2023)** — *ImageBind* ([CVPR][r4]) | Shared representation space across six modalities. |
| R5 | **Driess et al. (2023)** — *PaLM-E* ([arXiv][r5]) | Visual observations and continuous state injected into an embodied language model. |
| R6 | **Qwen Team (2025)** — *Qwen2.5-Omni Technical Report* ([arXiv][r6]) | Omni model with multimodal understanding and streaming generation. |
| R7 | **Liu et al. (2024)** — *OCRBench v2* ([arXiv][r7]) | Evaluation of text localization, handwriting and document reasoning. |
| R8 | **Sakshi et al. (2024)** — *MMAU* ([Adobe Research][r8]) | Audio understanding and reasoning across speech, non-verbal sound and music. |
| R9 | **Brohan et al. (2023)** — *RT-2* ([arXiv][r9]) | Vision-language-action models mapping perception and instructions to robot actions. |

</details>

[r1]: https://arxiv.org/abs/2103.00020
[r2]: https://arxiv.org/abs/2204.14198
[r3]: https://arxiv.org/abs/2301.12597
[r4]: https://openaccess.thecvf.com/content/CVPR2023/html/Girdhar_ImageBind_One_Embedding_Space_To_Bind_Them_All_CVPR_2023_paper
[r5]: https://arxiv.org/abs/2303.03378
[r6]: https://arxiv.org/abs/2503.20215
[r7]: https://arxiv.org/abs/2501.00321
[r8]: https://research.adobe.com/publication/mmau-a-massive-multi-task-audio-understanding-and-reasoning-benchmark/
[r9]: https://arxiv.org/abs/2307.15818

---

## Frequently asked questions

**Why can text and images not be processed with exactly the same structure without transformation?**  
Language is a discrete symbolic sequence, while images are high-dimensional continuous signals with spatial structure and no natural units equivalent to words. A multimodal system has to learn correspondences that are not given in advance.

**What is the difference between reducing a modality to text and keeping it active during reasoning?**  
Early reduction is useful when coarse semantics are enough. It becomes lossy when the task depends on location, timing, layout, prosody or other structure that a caption does not preserve. Keeping the source modality active lets later inference continue using that evidence.

**What is grounding?**  
Grounding is the degree to which an answer is supported by the actual perceptual evidence rather than by a plausible linguistic prior. A grounded answer should remain consistent with the image, audio, document or video supplied to the model.

**Why can a system appear multimodal while relying mostly on text?**  
Because of modality collapse: if training data and objectives reward one channel disproportionately, the system can learn to ignore other available evidence even when those other modalities are more informative for the specific task.
