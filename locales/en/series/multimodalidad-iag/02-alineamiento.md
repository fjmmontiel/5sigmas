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

This article explains how multimodal systems learn that two different signals refer to the same content: the alignment process. By reading it, you will understand what kind of data is needed to build shared representations, what happens when alignment extends beyond the image–text pair (as ImageBind does with six modalities), and why training-data quality matters more than architecture in determining where a system fails in production. The article is useful whether you have a technical background in machine learning or simply want to understand why models handle some images well and fail systematically on others.

The previous chapter established that multimodality is not limited to the text–image pair or to the existence of a single shared representation space. This chapter describes how alignment between modalities is built: what kind of data is needed, how the problem evolves when there are more than two modalities, and what happens when the data is low quality or poorly structured.

The progression is not arbitrary. Multimodal systems are trained in stages, each building on the previous one, so problems that appear in the final stages almost always have their roots in weaknesses introduced earlier.

---

## 1. Image–text pairs: the foundation and its limits

The starting point is conceptually the simplest: image and text pairs that belong together. A photograph with its caption, a product image with its description, a diagram next to its legend. The internet contains billions of these pairs, and foundational vision–language models such as CLIP or ALIGN were trained by extracting them at scale [CLIP][r1].

Learning from these pairs follows a *contrastive learning* logic: the model learns to project image and text into the same representation space so that matching pairs end up close together and non-matching pairs end up far apart. The loss penalizes the model when it associates an image with another image's description, and rewards it when the representations of the correct pair are similar. That training produces aligned visual and text encoders that can find the description most compatible with an image without having been trained on that exact pair, because the shared space captures semantic relationships in image–text pairs instead of simply memorizing examples.

The limitation of this approach is data noise. A photograph's caption does not always describe precisely what appears in the image: it may refer to something that happened before or after, it may describe context rather than visible content, or it may simply be irrelevant.

When the model learns from millions of these noisy pairs, the representations it builds are statistically strong but fragile in fine details, with visible consequences when the system faces questions that require precision.

The field's response to these weaknesses was not to abandon the contrastive paradigm but to refine it. SigLIP replaced CLIP's classic loss with independent sigmoid pair training, improving stability with smaller batches and producing representations that transfer better to localization tasks [SigLIP][r7].

DINOv2 took a different direction: instead of depending on text supervision, it trains the visual encoder through self-supervision on a curated image collection, producing denser representations that capture fine spatial structure and generalize better to segmentation and visual retrieval [DINOv2][r8]. Both point to the same conclusion: the representation-quality bottleneck in multimodal systems was not only alignment with text, but also the richness of the visual encoder itself.

But the most important limitation is not noise: it is that the image–text pair leaves entire modalities out. Audio, video, documents, and continuous signals do not fit into that framework without additional extensions, and that narrowness constrains what systems can be built by anyone working only with that type of data.

---

## 2. Beyond the pair: aligning multiple modalities

One of the most important observations from the latest stage of the field is that alignment does not need to remain anchored to image–text to work. ImageBind demonstrated this directly: using only pairs that include image as a common denominator (image–text, image–audio, image–depth, image–thermal, image–IMU), the system learns a shared embedding space across six modalities without ever requiring direct audio–text or audio–depth pairs [ImageBind][r5].

The result is that a text query can retrieve audio, an image can retrieve depth or thermal data, and all modalities become aligned transitively through the visual anchor.

That same alignment logic has extended to the product level. Gemini Embedding 2 treats multimodal embedding as a native primitive that unifies text, images, video, audio, and documents in a single representation space usable for cross-modal search, classification, and clustering [Gemini Embedding 2][r6]. The difference from earlier systems is not only quantitative (more modalities) but qualitative: the *embedding* is no longer a by-product of an understanding model, but the central object of the system.

What changes when alignment goes beyond the text–image pair is the structure of the training data.
For vision–language, the internet provided billions of natural pairs.
For audio–text, video–text, or document-layout, high-quality pairs are much scarcer, noisier, and more dependent on human work or controlled synthesis.
That asymmetry in data availability largely explains why system capabilities are asymmetric: models understand images better than audio, and audio better than documents with complex layout.

{{ include_html("snippets/multimodalidad-iag/02-imagebind-transitividad.html") }}

---

## 3. Visual instruction: the next level

Image–text pairs (and their extensions to other modalities) train representations, but they do not train the model to follow instructions. For a system to answer "what anomalies are in this chart?" or "transcribe the text in this image and correct it," it needs additional training on visual-instruction data.

Visual-instruction data consists of triples: image, textual instruction, and expected response. The model learns to condition jointly on the image and the instruction to generate the correct response, which is the format used by models such as LLaVA or InstructBLIP.

Generating high-quality instruction data is significantly more expensive than extracting pairs from the internet, because it requires either human annotation (expensive and slow) or synthetic generation with powerful language models that receive a description of the image and generate plausible instructions and responses. Synthetic generation scales, but it introduces the generator model's own biases: if the model generating the data has blind spots, the model trained on that data inherits them.

LLaVA, published in 2023, showed that synthetic visual-instruction data generated with GPT-4 could produce models capable of following visual instructions with notable quality relative to the cost of generating the data [LLaVA][r2]. The approach has become common practice for projects without the budget for large-scale human annotation, although the final quality remains bounded by the quality of the model generating the synthetic data.

{{ include_html("snippets/multimodalidad-iag/02-instruccion-visual.html") }}

---

## 4. Why data quality dominates

The most consistent lesson from multimodal systems is that training-data quality determines representation robustness much more than architectural decisions. A model with a suboptimal architecture trained on high-quality data tends to outperform a state-of-the-art architecture trained on noisy data, at least on tasks that the higher-quality data covers well.

That absolute importance of data has two effects that directly change how published results should be interpreted.

The first is that multimodal evaluation benchmarks are often incomplete diagnostically: a model can score highly on image-description tasks while failing on localization or verification tasks simply because its training data emphasized the first and poorly covered the second. The training-data distribution is therefore reflected directly in the model's capability profile.

The second effect is that weaknesses compound through the training chain: if image–text pretraining produces representations where certain image types are only weakly associated with their correct descriptions, later visual-instruction tuning cannot repair that problem from scratch, because it builds on the representations it receives, including their strengths and gaps.

Radford et al. documented this pattern when analyzing CLIP failures on image categories underrepresented in the training data [CLIP][r1]: the model generalized well on common categories and systematically worse on infrequent ones, even when image quality was equivalent. Fixing the problem required rebalancing the data, not changing the architecture.

{{ include_html("snippets/multimodalidad-iag/02-calidad-datos-perfil.html") }}

---

## 5. The role of alignment with human preferences

Beyond supervised training, more recent multimodal models include a phase of alignment with human preferences, analogous to RLHF in language models. In this phase, human evaluators compare model responses to visual questions and indicate which is better, so the model learns to generate responses that people consider useful, correct, and aligned with their expectations.

This phase captures something that pure supervised training cannot measure directly: subjective preferences about how the model should describe what it sees, what level of detail is appropriate for different types of questions, and how to balance precision and readability in responses.

The risk is that evaluator preferences are not uniform and can introduce cultural, gender, or aesthetic biases that become encoded in the model. If evaluators tend to prefer longer, more elaborate descriptions, the model will learn to produce longer answers regardless of whether that length is appropriate for the question. The bias is not in the architecture or the visual data, but in who evaluates and what criteria they apply, making it difficult to detect with standard benchmarks and easier to observe in real use.

{{ include_html("snippets/multimodalidad-iag/02-datos-alineamiento.html") }}

---

!!! tip "Next chapter"
    [Chapter 3 — Architectures →](./03-arquitecturas.md) — The four multimodal architecture families, their differences in quality, cost and latency, and why multimodal embedding and multimodal generation are not the same layer of the system.

## 6. References

<details markdown="1">
<summary><strong>Core sources</strong></summary>

| Key | Source | Short description |
| --- | --- | --- |
| R1 | **Radford et al. (2021)** — *Learning Transferable Visual Models From Natural Language Supervision* ([arXiv][r1]) | CLIP and contrastive learning at scale. |
| R2 | **Liu et al. (2023)** — *Visual Instruction Tuning* ([arXiv][r2]) | LLaVA: synthetic visual-instruction data generation with GPT-4. |
| R3 | **Li et al. (2023)** — *BLIP-2: Bootstrapping Language-Image Pre-training* ([arXiv][r3]) | Staged training strategy for vision–language systems. |
| R4 | **Jain et al. (2023)** — *VCoder: Versatile Vision Encoders for Multimodal Large Language Models* ([arXiv][r4]) | Study of how visual-encoder choice determines a multimodal system's capability profile beyond the LLM architecture. |
| R5 | **Girdhar et al. (2023)** — *ImageBind: One Embedding Space To Bind Them All* ([CVPR][r5]) | Alignment of six modalities using only pairs with image as the anchor. |
| R6 | **Google DeepMind (2026)** — *Gemini Embedding 2* ([blog][r6]) | Native multimodal embeddings across text, images, video, audio, and documents. |
| R7 | **Zhai et al. (2023)** — *Sigmoid Loss for Language Image Pre-Training* ([arXiv][r7]) | SigLIP: independent pairwise sigmoid loss that improves stability relative to CLIP. |
| R8 | **Oquab et al. (2023)** — *DINOv2: Learning Robust Visual Features without Supervision* ([arXiv][r8]) | DINOv2: self-supervised visual encoder with dense representations and stronger spatial generalization. |

</details>

[r1]: https://arxiv.org/abs/2103.00020 "CLIP — Radford et al. 2021"
[r2]: https://arxiv.org/abs/2304.08485 "LLaVA — Liu et al. 2023"
[r3]: https://arxiv.org/abs/2301.12597 "BLIP-2 — Li et al. 2023"
[r4]: https://arxiv.org/abs/2312.14233 "VCoder — Jain et al. 2023"
[r5]: https://openaccess.thecvf.com/content/CVPR2023/html/Girdhar_ImageBind_One_Embedding_Space_To_Bind_Them_All_CVPR_2023_paper "ImageBind — Girdhar et al. CVPR 2023"
[r6]: https://blog.google/innovation-and-ai/technology/developers-tools/gemini-embedding-2/ "Gemini Embedding 2 — Google DeepMind 2026"
[r7]: https://arxiv.org/abs/2303.15343 "SigLIP — Zhai et al. 2023"
[r8]: https://arxiv.org/abs/2304.07193 "DINOv2 — Oquab et al. 2023"

---

## Frequently asked questions

**Why is contrastive learning more efficient than teaching a model to describe images?**
Learning to match images with text that already exists on the internet is much cheaper than predicting every word of a generated description. The method forces visual and text encoders to build a shared space where similar concepts are represented by nearby vectors, without needing to generate new text or annotate images by hand.

**What is the connector module between the visual encoder and the language model for?**
It acts as a bridge between two worlds with different representations. If the connector is too simple, it fails to transfer the richness of the visual signal to the language model. If it is too complex, it requires more data and more compute to train. Connector design is the most critical point in this architecture because it determines how much visual information reaches reasoning.

**What does the visual instruction tuning popularized by LLaVA involve?**
It trains the model on triples of image, textual instruction, and expected response, so it learns to follow complex instructions about visual content instead of only describing what it sees. LLaVA showed that these data can be generated synthetically with a powerful language model, although the trained model inherits the blind spots of the model that generated them.

**What is the difference between learning from image–text pairs and building a shared representation space across six modalities as ImageBind does?**
Image–text pairs align only those two modalities. ImageBind uses image as a common anchor and learns alignment between audio, depth, thermal signals, and IMU without ever seeing direct pairs between those modalities: if audio and image are aligned, and text and image are also aligned, then audio and text become aligned transitively. The result is that a text query can retrieve audio even though they were never paired directly.
