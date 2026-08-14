---
title: Alignment — from pairs to multimodal interactions
description: "How models learn that different signals describe the same content, and why data quality determines the robustness of multimodal alignment."
date: 2026-04-02
keywords: "multimodal alignment, CLIP, contrastive learning, ImageBind, multimodal embedding, image text representation, multimodal training, visual instruction tuning"
tags:
  - AI
  - GenAI
  - Multimodality
  - Alignment
---

# Chapter 2 — Alignment: from pairs to interactions

This chapter explains how multimodal systems learn that two different signals refer to the same content. By the end, you will understand what training data is required to build aligned representations, what changes when alignment expands beyond image–text pairs, how visual instruction tuning differs from representation learning, and why data quality often determines where a multimodal system fails in production more strongly than one architectural detail.

The previous chapter established that multimodality is broader than image–text and does not require one universal shared representation space. This chapter focuses on the **alignment problem**: how separate modalities become connected strongly enough that information can move between them.

The progression matters. Multimodal systems are commonly trained in stages, and weaknesses introduced early—poor visual features, noisy pairs, missing categories—constrain what later instruction or preference tuning can recover.

---

## 1. Image–text pairs: the foundation and its limits

The conceptually simplest starting point is a dataset of paired images and text: a photo with a caption, a product image with its description, or a diagram with a legend. The web contains billions of naturally occurring pairs, which made large-scale vision–language pretraining possible.

[CLIP][r1] popularized a contrastive-learning formulation. An image encoder and a text encoder map their inputs into representations such that matching pairs become more similar while mismatched pairs become less similar.

> **Contrastive learning does not need the model to generate the caption. It needs the model to distinguish which image and text belong together.**

This produces representations that support cross-modal retrieval and zero-shot classification because the space captures semantic relationships instead of memorizing only individual training examples.

The limitation is data noise. Web captions can be incomplete, contextual, temporally displaced or simply irrelevant to the visible content. Training over huge noisy datasets can still produce statistically powerful representations, but fine-grained grounding remains fragile.

Later work attacked different parts of this bottleneck:

- [SigLIP][r7] replaced CLIP's batch-level softmax contrastive loss with independent sigmoid pair losses, improving stability and transfer in several regimes.
- [DINOv2][r8] took a different route: self-supervised visual representation learning on a curated image collection, producing dense visual features with strong spatial transfer even without text supervision.

The lesson is broader than one loss function. Multimodal quality depends not only on how modalities are aligned, but on the **quality of the modality-specific representation before alignment**.

---

## 2. Beyond pairs: aligning multiple modalities

ImageBind demonstrated an important property of multimodal alignment. It trained with image as a common anchor—image–text, image–audio, image–depth, image–thermal and image–IMU pairs—and learned a shared space over six modalities without requiring every pairwise dataset to exist directly [r5].

If audio and text are both aligned to the same visual anchor, their representations can become useful to one another transitively.

{{ include_html("snippets/multimodalidad-iag/02-imagebind-transitividad.html") }}

This principle has moved into product primitives as multimodal embeddings increasingly represent text, images, video, audio and documents inside one retrieval/search space.

But the data problem becomes harder as modalities expand. High-quality image–text pairs are abundant. Precise audio–text, video–text, document-layout or sensor-language correspondences are much scarcer and more expensive to annotate. That asymmetry helps explain why a model may be much stronger on ordinary images than on complex audio, dense documents or temporally precise video.

---

## 3. Visual instruction tuning: the next layer

Aligned image and text representations do not automatically teach a model to follow instructions such as:

- “What anomaly is visible in this chart?”
- “Transcribe the handwritten note and correct the spelling.”
- “Compare the two diagrams and identify the changed component.”

Instruction-following training typically uses triples:

> **image + textual instruction + expected response**

The model has to condition jointly on the visual evidence and the requested task.

[LLaVA][r2] demonstrated how synthetic visual-instruction data generated with a powerful language model could make this stage much cheaper than fully manual annotation. This became a widely useful pattern because human multimodal annotation is expensive.

Synthetic data scales, but it also inherits the generator's blind spots. If the model creating questions and answers systematically ignores fine spatial relationships or overproduces certain kinds of instructions, the model trained on that data inherits the same skew.

{{ include_html("snippets/multimodalidad-iag/02-instruccion-visual.html") }}

---

## 4. Why data quality dominates the failure profile

One of the most consistent lessons in multimodal systems is that the training-data distribution becomes visible in the model's capability profile.

A model may appear very strong at image description while failing at localization or verification because the training corpus contains many descriptive captions but little precise spatial supervision.

Weaknesses also compound across training stages. If pretraining produces poor representations for certain categories, later instruction tuning starts from those weak features rather than repairing the entire visual representation from scratch.

CLIP's analysis already showed that zero-shot performance varied substantially across categories and subpopulations represented unevenly in the training data [r1]. Improving those failures requires changing the evidence the model sees, not merely attaching a more capable language decoder.

{{ include_html("snippets/multimodalidad-iag/02-calidad-datos-perfil.html") }}

A useful practical principle is:

> **Architecture determines what a model can express efficiently. Data determines which parts of that capacity it actually learns reliably.**

---

## 5. Preference alignment in multimodal systems

After supervised instruction tuning, modern systems may add preference-based post-training analogous to the alignment stages used for language models.

Human evaluators compare responses to multimodal questions and express which answer is better. This can teach qualities that simple supervised targets do not capture cleanly: useful detail, appropriate refusal behaviour, response style, clarity and how much uncertainty to communicate.

But preference data introduces another source of bias. Evaluators differ culturally and professionally, and their preferences may reward verbosity, aesthetic conventions or assumptions that are not universally appropriate.

The bias is no longer only in the visual dataset or architecture. It is also in **who evaluates the model and what they reward**.

{{ include_html("snippets/multimodalidad-iag/02-datos-alineamiento.html") }}

---

!!! tip "Next chapter"
    [Chapter 3 — Architectures →](./03-arquitecturas.md) — The major multimodal architecture families, their trade-offs in quality, cost and latency, and why multimodal embeddings and multimodal generation are different layers of a system.

---

## 6. References

<details markdown="1">
<summary><strong>Core sources</strong></summary>

| Key | Source | Short description |
| --- | --- | --- |
| R1 | **Radford et al. (2021)** — *Learning Transferable Visual Models From Natural Language Supervision* ([arXiv][r1]) | CLIP and large-scale contrastive vision–language learning. |
| R2 | **Liu et al. (2023)** — *Visual Instruction Tuning* ([arXiv][r2]) | LLaVA and synthetic visual-instruction data. |
| R3 | **Li et al. (2023)** — *BLIP-2* ([arXiv][r3]) | Staged training between visual encoders and language models. |
| R4 | **Jain et al. (2023)** — *VCoder* ([arXiv][r4]) | How visual encoders influence multimodal capability profiles. |
| R5 | **Girdhar et al. (2023)** — *ImageBind* ([CVPR][r5]) | Six-modality alignment using image as the common anchor. |
| R6 | **Google DeepMind (2026)** — *Gemini Embedding 2* ([blog][r6]) | Product-level multimodal embeddings spanning text, images, video, audio and documents. |
| R7 | **Zhai et al. (2023)** — *Sigmoid Loss for Language Image Pre-Training* ([arXiv][r7]) | SigLIP's independent sigmoid pair loss. |
| R8 | **Oquab et al. (2023)** — *DINOv2* ([arXiv][r8]) | Self-supervised dense visual representations. |

</details>

[r1]: https://arxiv.org/abs/2103.00020
[r2]: https://arxiv.org/abs/2304.08485
[r3]: https://arxiv.org/abs/2301.12597
[r4]: https://arxiv.org/abs/2312.14233
[r5]: https://openaccess.thecvf.com/content/CVPR2023/html/Girdhar_ImageBind_One_Embedding_Space_To_Bind_Them_All_CVPR_2023_paper
[r6]: https://blog.google/innovation-and-ai/technology/developers-tools/gemini-embedding-2/
[r7]: https://arxiv.org/abs/2303.15343
[r8]: https://arxiv.org/abs/2304.07193

---

## Frequently asked questions

**Why is contrastive learning attractive for image–text pretraining?**  
Natural image–text pairs are abundant and do not require writing a full new target caption for every image. The model learns compatibility between paired representations and can reuse that geometry for retrieval and zero-shot transfer.

**Why does ImageBind not need every possible modality pair?**  
Because image acts as a shared anchor. If text and audio both learn to align with related images, the resulting representation space can support useful cross-modal relationships even without direct audio–text supervision for every example.

**Why can later instruction tuning fail to repair weak visual representations?**  
Instruction tuning builds on the features it receives. If the visual encoder has never learned a distinction reliably, a downstream language model cannot always reconstruct the missing evidence from the instruction alone.

**How can human preference alignment introduce bias?**  
The selected evaluators and rating criteria define what “better” means. Systematic preferences for verbosity, aesthetics, tone or culturally specific interpretations can become encoded in the model's behaviour even when they are unrelated to perceptual correctness.
