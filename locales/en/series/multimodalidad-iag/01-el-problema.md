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

This article describes what multimodality really means in AI: not only that a model can "see" images, but the broader problem of integrating text, images, audio, video and continuous signals without destroying what each one contributes. By the end you will understand why the field goes far beyond vision-language models, the difference between translating a modality into text and keeping it active during reasoning, and how the five capabilities (perception, alignment, reasoning, generation and action) that today define a truly multimodal system fit together. The article is accessible if you have some background in language models, although it does not require previous knowledge of computer vision or audio processing.

Multimodality is often explained as if it were the moment when a language model stopped working only with text and began receiving images. That is not wrong, but it is too narrow to describe the field as it exists today.

By 2026, we already have models that represent text, images, video, audio and documents in the same embedding space; systems that maintain spoken dialogue natively; architectures that process interleaved sequences of text, images and video; and models that introduce continuous signals from the physical world into the inference process.

Multimodality is not only about what happens when an LLM "sees" an image, but about how to build systems capable of working with heterogeneous signals without forcing them to lose their structure too early.

!!! abstract "Key idea"
    The central problem of multimodality is not combining modalities, but deciding when and how to integrate them without destroying what each contributes separately.

This distinction matters because not every solution does the same job.

Some systems convert an image into a textual description and delegate all reasoning from that point onward to the language model. Others keep part of the visual, acoustic or document evidence active within the representation and decision process itself.

Both approaches can be useful and can solve real tasks, but they do not solve exactly the same problem. The first reduces the modality as early as possible to use a channel we already handle well, while the second preserves for longer what text does not capture well: position, temporal synchrony, prosodic nuance, document structure, continuous signal or perceptual context. That is where multimodality really begins as a technical problem, rather than as an interface trick.

---

## 1. A modality is not only an input type

We call a modality a distinct way of encoding information about the world. Text is a discrete sequence of symbols, an image has spatial structure, audio adds temporal continuity, tone, rhythm and non-verbal information, and video combines vision, audio and time. A document is not simply an image with letters, because it also contains graphic design, tables, visual hierarchy, formulas, regions and spatial relationships between blocks.

Robotics adds another family of signals that do not fit comfortably into the classic intuition of "content": environment state, depth, partial observations or continuous telemetry.

ImageBind made this explicit by bringing images, text, audio, depth, thermal maps and IMU (inertial) data into a single representation space [ImageBind][r4], while PaLM-E carried that logic into visual observations and continuous state for planning and manipulation tasks [PaLM-E][r5]. Gemini Embedding 2 already incorporates text, images, video, audio and documents as a native product primitive.

This distinction matters because much of the confusion starts here. When people talk about multimodality, they are often actually talking about vision-language systems.

That subfield has been central in recent years and explains a huge fraction of the visible progress, from CLIP to Flamingo or BLIP-2, but it does not exhaust the field.

A system capable of understanding a radiograph with textual instructions, indexing complex PDFs, maintaining a spoken conversation with tools, retrieving a video from an example image or planning a robotic action using perception and language belongs to the same broad family, even though each of those tasks forces a different form of representation and evaluation. [OCRBench v2][r7] and [MMAU][r8] are useful precisely because they force us to recognize that documents and audio are not simply "special cases" of text+image, but domains with their own problems.

---

## 2. The problem is not adding modalities, but crossing them without destroying them

A system can accept an image and still remain deeply text-centric: it only has to turn the image into a caption and perform all subsequent reasoning over that caption.

If the task is to obtain a coarse summary of visual content, cost and simplicity favor that strategy. That strategy breaks down when the task depends not on a description but on where an object is, exactly what part changes between two images, what handwritten text appears in one corner, what happens before and after in an audio clip, or what nuance in speech changes the meaning of a sentence.

At that point, reducing the original signal too early stops being an elegant solution and becomes a source of error.

Three levels help clarify the distinction.

The first is **translation**: converting one modality into another, usually text.

The second is **alignment**: learning that two different signals refer to the same content, even though they do not have the same form.

The third is **operational co-presence**: allowing several modalities to keep participating in inference or generation without being immediately reduced to a single one.

CLIP helped establish the second level by learning robust correspondences between images and text from natural supervision [CLIP][r1], and ImageBind showed that this logic could extend far beyond the classic pair [ImageBind][r4]. [Flamingo][r2] and [BLIP-2][r3], in turn, showed that alignment could also be implemented through bridges between specialized modules, while Gemini 2.5 and [Qwen2.5-Omni][r6] move the problem into a temporal regime where the question is no longer only alignment, but responding, listening and generating under real latency constraints.

---

## 3. The shared space matters, but it is not the only possible architecture

The most common version of an introduction to multimodality treats the shared representation space almost as the essence of the entire field.

There is a valid intuition there: when two modalities fall into a common semantic geometry, cross-modal retrieval, zero-shot classification or comparison between different signals become much easier.

But it would be a mistake to turn that intuition into a universal definition. Flamingo is not well described as "everything is in the same space and that's it"; it couples pretrained models and handles arbitrarily interleaved sequences of text with images or videos.

BLIP-2 cannot be reduced to a single geometric cloud either, because it introduces a lightweight Querying Transformer as an interface between the visual encoder and the LLM.

PaLM-E takes another route by injecting visual observations and continuous state into a language model for embodied tasks.

Qwen2.5-Omni pushes toward an end-to-end model with multimodal understanding and generation in streaming. The shared space is a very powerful strategy, but it is neither the only one nor a sufficient definition of the field.

A more precise formulation is this: a system is multimodal when it integrates information from several modalities during representation, inference, generation or action.

That can be achieved with joint embeddings, connectors between modules, cross-attention, interleaved sequences, more unified models or combinations of all of the above.

---

## 4. What capabilities define a multimodal system today

A useful way to structure the problem is to separate five capabilities.

**Perceive.** The system has to convert heterogeneous signals into useful representations: read a page, recognize the content of an image, follow an audio segment, distinguish voices or understand a video sequence.

**Align.** It is not enough to perceive two signals separately, because the system has to learn when they are talking about the same thing. That was the heart of CLIP and remains central to embeddings and retrieval. Gemini Embedding 2 illustrates this layer well because it unifies text, images, video, audio and documents in an embedding space usable for multimodal search, classification and clustering.

**Reason.** Once the signals are aligned, the system has to operate over them: compare, verify, locate, summarize, answer questions or follow temporal dependencies.

**Generate.** A multimodal system does not always end in text. It can produce speech, an image, perhaps video, perhaps a structured representation, perhaps a combination of several outputs. Gemini 2.5 Native Audio and Qwen2.5-Omni are especially useful for explaining this layer because they shift the focus from "understanding an image" toward maintaining a conversation and producing multimodal responses in real time.

**Act.** As soon as the system uses tools or enters a physical environment, multimodality stops being only a matter of understanding and becomes a matter of situated decision-making. PaLM-E is important here because it combines language, observation and continuous state in robotics tasks.

Vision-language-action (VLA) models such as RT-2 go one step further: instead of separating perception from the action command, the model directly converts visual observations and textual instructions into executable motor commands, so that the same reasoning process that generates text can generate physical action [RT-2][r9].

{{ include_html("snippets/multimodalidad-iag/01-vla-pipeline.html") }}

---

## 5. Why it remains difficult

The first difficulty is **structure**. Text, images, audio, video and documents do not naturally share the same granularity: a word, a visual patch, an audio segment or a document region are not equivalent units. The model has to learn correspondences that are not given in advance, and it often learns them incompletely or with biases from the available data.

The second difficulty is **temporality**. In audio and video, order is not a detail but part of the meaning. A system that hears laughter, an interruption or a change in tone is not simply processing "more tokens", but synchrony, rhythm and conversational context.

The third difficulty is **grounding**. A system can produce a verbally impeccable answer without that answer being well supported by the perceptual signal. This problem appears in vision, documents and audio as well: an answer can sound reasonable while not being grounded. That mismatch is one reason why multimodal evaluation cannot rely only on final accuracy or output fluency.

The fourth difficulty is **asymmetry**. The phrase "from any input modality to any output modality" captures the aspiration of the field, but it does not uniformly describe what real systems do. Some are very strong at embeddings and retrieval but do not generate. Others generate speech but not images. Others understand video but still answer mostly in text. Others mix perception and action but are not universal outside their domain. The direction is any-to-any, but the real state of the field remains uneven and architecturally heterogeneous.

The fifth difficulty is **modality collapse**. In systems trained on distributions that are heavily imbalanced across modalities, the model tends to rely almost exclusively on the most represented modality, regardless of which one is most informative for the specific task.

{{ include_html("snippets/multimodalidad-iag/01-colapso-modal.html") }}

---

## 6. What this chapter prepares

From this point onward, the series should not treat multimodality as a synonym for VLMs. That part of the field remains extremely important, but it is no longer enough to organize the whole space.

The rest of the series answers a more general question: how different modalities are aligned, which architectures preserve evidence better, how to evaluate them without fooling ourselves, and what risks appear when perception, generation and action are coupled in the same system.

{{ include_html("snippets/multimodalidad-iag/01-espacio-comun.html") }}

---

!!! tip "Next chapter"
    [Chapter 2 — Alignment →](./02-alineamiento.md) — How models learn that two different signals refer to the same content, what changes when alignment goes beyond the image-text pair, and why data quality determines representation robustness.

## 7. References

<details markdown="1">
<summary><strong>Core sources</strong></summary>

| Key | Source | Short description |
| --- | --- | --- |
| R1 | **Radford et al. (2021)** — *Learning Transferable Visual Models From Natural Language Supervision* ([arXiv][r1]) | CLIP: large-scale learning of shared text-image representations. |
| R2 | **Alayrac et al. (2022)** — *Flamingo: a Visual Language Model for Few-Shot Learning* ([arXiv][r2]) | Flamingo: model that combines a visual encoder with an LLM through cross-attention. |
| R3 | **Li et al. (2023)** — *BLIP-2: Bootstrapping Language-Image Pre-training with Frozen Image Encoders and Large Language Models* ([arXiv][r3]) | Connector architecture between visual encoders and language models. |
| R4 | **Girdhar et al. (2023)** — *ImageBind: One Embedding Space To Bind Them All* ([CVPR][r4]) | Joint embedding space across six modalities using only image-paired data. |
| R5 | **Driess et al. (2023)** — *PaLM-E: An Embodied Multimodal Language Model* ([arXiv][r5]) | Injection of visual observations and continuous state into an LLM for embodied planning. |
| R6 | **Qwen Team (2025)** — *Qwen2.5-Omni Technical Report* ([arXiv][r6]) | Omni model with multimodal understanding and generation in streaming. |
| R7 | **Liu et al. (2024)** — *OCRBench v2* ([arXiv][r7]) | Benchmark for evaluating LMMs on text localization, handwriting and document reasoning. |
| R8 | **Sakshi et al. (2024)** — *MMAU: A Massive Multi-Task Audio Understanding and Reasoning Benchmark* ([Adobe Research][r8]) | Audio understanding and reasoning benchmark covering speech, non-verbal sounds and music. |
| R9 | **Brohan et al. (2023)** — *RT-2: Vision-Language-Action Models Transfer Web Knowledge to Robotic Control* ([arXiv][r9]) | VLA models that turn visual observations and textual instructions into executable motor commands. |

</details>

[r1]: https://arxiv.org/abs/2103.00020 "CLIP — Radford et al. 2021"
[r2]: https://arxiv.org/abs/2204.14198 "Flamingo — Alayrac et al. 2022"
[r3]: https://arxiv.org/abs/2301.12597 "BLIP-2 — Li et al. 2023"
[r4]: https://openaccess.thecvf.com/content/CVPR2023/html/Girdhar_ImageBind_One_Embedding_Space_To_Bind_Them_All_CVPR_2023_paper "ImageBind — Girdhar et al. CVPR 2023"
[r5]: https://arxiv.org/abs/2303.03378 "PaLM-E — Driess et al. 2023"
[r6]: https://arxiv.org/abs/2503.20215 "Qwen2.5-Omni — Qwen Team 2025"
[r7]: https://arxiv.org/abs/2501.00321 "OCRBench v2 — Liu et al. 2024"
[r8]: https://research.adobe.com/publication/mmau-a-massive-multi-task-audio-understanding-and-reasoning-benchmark/ "MMAU — Sakshi et al. 2024"
[r9]: https://arxiv.org/abs/2307.15818 "RT-2 — Brohan et al. 2023"

---

## Frequently asked questions

**Why can't text and images be processed with the same structure without prior conversion?**
Language is a discrete sequence of symbols with direct semantic structure. Images are high-dimensional continuous signals with spatial structure, without natural units equivalent to words. For a system to operate with both, it has to learn correspondences that are not given in advance, and it often learns them incompletely or with bias.

**What is the difference between reducing a modality to text and keeping it active during reasoning?**
Reducing an image to its textual description is useful when what matters is coarse semantic content. That reduction breaks down when what matters is where something is, what changes between two images, or what nuance in speech changes the meaning of a sentence: in those cases, reducing the original signal too early is no longer an elegant simplification and becomes a source of error. Keeping the signal active during reasoning is precisely the distinction between translation and operational co-presence.

**What does it mean for a model to have grounding problems, and what are the consequences?**
Grounding is the ability to support an answer with the actual evidence in the perceptual signal rather than only with statistical inferences about which answer is likely. When it fails, the model can produce a verbally correct answer that is not grounded in the image or audio it received: it sounds reasonable but contradicts the physical evidence.

**Why can a system appear multimodal while in practice relying almost only on text?**
This is the effect of modality collapse: when training data are heavily imbalanced across modalities, the model tends to rely almost exclusively on the most represented modality even when another one is more informative for the specific task. Text has much higher semantic density per byte than a noisy image, so in poorly balanced systems the model learns to answer from prior linguistic biases and ignore visual information.
