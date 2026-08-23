---
title: Scale — from AlexNet to foundation models
description: How data, compute and scalable architectures transformed AI after 2012: AlexNet, the Transformer, pretraining, scaling laws and the birth of foundation models.
date: 2026-03-30
date_modified: 2026-08-23
keywords: "AI scaling, AlexNet, Transformer, scaling laws, foundation models, pretraining, GPT history, deep learning history, ImageNet, BERT"
tags:
  - AI
  - LLMs
  - History
---

# Chapter 4 — Scale (≈ 2012–2024)

This chapter explains what happened when deep learning reached sufficient scale: more data, more compute and architectures designed to exploit both. By the end, you will understand why the Transformer reorganized the entire discipline by making training radically more parallelizable, what scaling laws are and why they turned scaling into a scientific methodology with testable predictions, and how massive pretraining produced foundation models—a reusable general base for hundreds of different tasks. The chapter is accessible with a basic understanding of machine learning and is especially useful for understanding the logic behind systems such as GPT-3, BERT and Gemini.

The previous three chapters established the necessary pieces: representing the world with symbols, mechanizing procedures and learning from data. After 2012, those pieces stopped advancing independently. Data, compute, optimization and architecture began reinforcing one another at unprecedented scale.

This chapter follows that regime change. It is not only about the rise of deep learning, but about the point at which progress became increasingly driven by a systematic combination of scale, reuse and transfer, eventually producing models that no longer solved one task but entire families of tasks.

---

## 1. 2012: when scale became central

[AlexNet](https://proceedings.neurips.cc/paper/4824-imagenet-classification-with-deep-convolutional-neural-networks.pdf) won ILSVRC 2012 with a result that changed the field's perception: 15.3% top-5 error versus 26.2% for the runner-up. The system was trained on 1.2 million images using two GTX 580 GPUs for six days, combining a deeper-than-usual network with ReLU, dropout, data augmentation and an efficient GPU implementation.

It is important to understand what this result actually demonstrated. AlexNet did not invent convolutional networks from scratch, nor did it single-handedly establish mature scaling laws. What it clearly showed was that when depth, data, regularization and compute all reach sufficient scale, performance can improve in a way that no longer looks like a small incremental refinement.

The lesson of 2012 was not that architecture had stopped mattering. It was that a good architecture can remain below its potential for years and suddenly take off when hardware and data volume stop being the bottleneck.

{{ include_html("snippets/from-cave-to-agi/04-shock-2012.html") }}

---

## 2. The Transformer and massive pretraining

The next major shift arrived with [*Attention Is All You Need*](https://papers.neurips.cc/paper/7181-attention-is-all-you-need.pdf) in 2017. The Transformer was not merely another language architecture. It reorganized the problem around attention mechanisms, removing recurrence from the model's core and making training far more parallelizable.

Two especially influential trajectories followed. [BERT](https://aclanthology.org/N19-1423.pdf) demonstrated the strength of bidirectional pretraining followed by fine-tuning on specific tasks. [GPT-2](https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf), and later [GPT-3](https://proceedings.neurips.cc/paper/2020/file/1457c0d6bfcb4967418bfb8ac142f64a-Paper.pdf), showed that a sufficiently large autoregressive model could transfer to new tasks directly from context—first with striking zero-shot behavior and then with much stronger few-shot and in-context learning capabilities.

{{ include_html("snippets/from-cave-to-agi/04-transformer-reutilizacion.html") }}

This changed the logic of progress. For a long time, each important task required its own model, pipeline and annotated dataset. Large-scale pretraining increasingly made it more effective to train a general base once and then adapt, fine-tune or condition it for specific uses.

The same family of ideas spread beyond text. [Vision Transformer](https://arxiv.org/pdf/2010.11929) carried the paradigm into vision. [CLIP](https://proceedings.mlr.press/v139/radford21a/radford21a.pdf) aligned images and language at scale. [DALL·E](https://proceedings.mlr.press/v139/ramesh21a/ramesh21a.pdf) and [latent diffusion models](https://openaccess.thecvf.com/content/CVPR2022/papers/Rombach_High-Resolution_Image_Synthesis_With_Latent_Diffusion_Models_CVPR_2022_paper.pdf) demonstrated new ways to generate images from language. Later multimodal systems such as [Gemini 1.5](https://storage.googleapis.com/deepmind-media/gemini/gemini_v1_5_report.pdf) reinforced the idea of a single model capable of working with text, images, audio and video within one system.

{{ include_html("snippets/from-cave-to-agi/04-escala-producto.html") }}

---

## 3. Scale became a methodology

The idea that performance improves relatively predictably as parameters, data and compute increase did not originate with LLMs, but LLMs made it central. Work such as [*Deep Learning Scaling is Predictable, Empirically*](https://arxiv.org/abs/1712.00409), [*Scaling Laws for Neural Language Models*](https://arxiv.org/abs/2001.08361) and [*Training Compute-Optimal Large Language Models*](https://arxiv.org/pdf/2203.15556) progressively strengthened an important intuition: across many regimes, error falls according to stable power-law relationships, and progress depends not only on whether you scale, but on how you allocate the scale.

Explore that allocation directly with the [scaling-laws explorer](/en/tools/scaling-laws/), which keeps the training budget fixed while showing how the balance between parameters and tokens changes.

{{ include_html("snippets/from-cave-to-agi/04-leyes-escala.html") }}

This does not mean scale explains everything. It means that once an architecture and training objective are good enough, increasing resources stops being a secondary implementation choice and becomes part of how the system is designed and its performance is forecast.

To translate abstract compute into a physical budget, the [training compute and energy estimator](/en/tools/training-compute-energy/) turns accelerators, MFU, schedule, average power and PUE into FLOPs, estimated runtime and energy.

An important caution belongs here. The literature on [emergent abilities](https://arxiv.org/pdf/2206.07682) has been influential because it describes abrupt performance jumps on some tasks once models cross certain sizes. But later work, such as [*Are Emergent Abilities of Large Language Models a Mirage?*](https://arxiv.org/pdf/2304.15004), argues that some of this apparent abruptness can depend on the metric or evaluation method. The prudent conclusion is therefore not that every new capability mysteriously appears at a threshold, but that scale has produced new or much more robust capabilities while the strong interpretation of emergence remains debated.

To follow capability progress without mixing incompatible benchmarks or protocols, the [model capability timeline](/en/tools/model-capability-timeline/) tracks published results one benchmark at a time and keeps changes in evaluation conditions visible.

{{ include_html("snippets/from-cave-to-agi/04-emergencia-capacidades.html") }}

---

## 4. Foundation models: one base for many tasks

This leads to the framework of [foundation models](https://crfm.stanford.edu/assets/report.pdf). The central idea is not simply that a model is large, but that it is trained on broad data—typically through large-scale self-supervision—and can then be adapted to a wide variety of downstream tasks.

The technical and economic consequence is enormous. The same base model can serve as reusable infrastructure for writing, summarization, translation, classification, information extraction, code generation, knowledge retrieval and multimodal work, with relatively small adaptations compared with training a new system for every task.

This is the deeper shift of the period. For decades, AI progressed as a collection of specialized systems. With foundation models, the field shifted toward general pretrained bases that are subsequently adapted, aligned or composed for particular uses.

{{ include_html("snippets/from-cave-to-agi/04-preentrenamiento-finetuning.html") }}

---

## 5. What this period made possible

By 2024, the field had changed structurally. AI was no longer conceived primarily as a set of isolated solutions; it increasingly organized itself around larger, reusable and multimodal base models.

That change set up the next stage. Scale was no longer only a matter of adding parameters or data. It became the foundation for a new set of problems: more effective memory, better tool use, more active search and a richer relationship with the world beyond text.

!!! tip "Next chapter"
    [Chapter 5 — Beyond the Transformer →](./05-mas-alla.md) — Which limits pure scaling exposed and which directions the field is opening: inference-time memory, active search, world models and robotics.

---

## 6. References

<details markdown="1">
<summary><strong>Core sources</strong></summary>

| Key | Source | Short description |
| --- | --- | --- |
| R1 | [Krizhevsky, Sutskever & Hinton (2012) — *ImageNet Classification with Deep Convolutional Neural Networks*](https://proceedings.neurips.cc/paper/4824-imagenet-classification-with-deep-convolutional-neural-networks.pdf) | AlexNet and the regime change in vision. |
| R2 | [Vaswani et al. (2017) — *Attention Is All You Need*](https://papers.neurips.cc/paper/7181-attention-is-all-you-need.pdf) | Introduction of the Transformer. |
| R3 | [Devlin et al. (2019) — *BERT*](https://aclanthology.org/N19-1423.pdf) | Bidirectional pretraining and fine-tuning. |
| R4 | [Radford et al. (2019) — *Language Models are Unsupervised Multitask Learners*](https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf) | GPT-2 and zero-shot transfer. |
| R5 | [Brown et al. (2020) — *Language Models are Few-Shot Learners*](https://proceedings.neurips.cc/paper/2020/file/1457c0d6bfcb4967418bfb8ac142f64a-Paper.pdf) | GPT-3 and large-scale in-context learning. |
| R6 | [Dosovitskiy et al. (2020) — *An Image is Worth 16x16 Words*](https://arxiv.org/pdf/2010.11929) | Vision Transformer. |
| R7 | [Radford et al. (2021) — *CLIP*](https://proceedings.mlr.press/v139/radford21a/radford21a.pdf) | Image-language alignment. |
| R8 | [Ramesh et al. (2021) — *Zero-Shot Text-to-Image Generation*](https://proceedings.mlr.press/v139/ramesh21a/ramesh21a.pdf) | DALL·E and text-to-image generation. |
| R9 | [Rombach et al. (2022) — *High-Resolution Image Synthesis with Latent Diffusion Models*](https://openaccess.thecvf.com/content/CVPR2022/papers/Rombach_High-Resolution_Image_Synthesis_With_Latent_Diffusion_Models_CVPR_2022_paper.pdf) | Latent diffusion and efficient image generation. |
| R10 | [Hestness et al. (2017) — *Deep Learning Scaling is Predictable, Empirically*](https://arxiv.org/abs/1712.00409) | Scaling curves in deep learning. |
| R11 | [Kaplan et al. (2020) — *Scaling Laws for Neural Language Models*](https://arxiv.org/abs/2001.08361) | Scaling laws for language models. |
| R12 | [Hoffmann et al. (2022) — *Training Compute-Optimal Large Language Models*](https://arxiv.org/pdf/2203.15556) | Chinchilla and compute-optimal scaling. |
| R13 | [Wei et al. (2022) — *Emergent Abilities of Large Language Models*](https://arxiv.org/pdf/2206.07682) | Influential formulation of the emergence debate. |
| R14 | [Schaeffer et al. (2023) — *Are Emergent Abilities of Large Language Models a Mirage?*](https://arxiv.org/pdf/2304.15004) | Methodological critique of strong emergence claims. |
| R15 | [Bommasani et al. (2021) — *On the Opportunities and Risks of Foundation Models*](https://crfm.stanford.edu/assets/report.pdf) | Conceptual framework for foundation models. |
| R16 | [Gemini Team (2024) — *Gemini 1.5 report*](https://storage.googleapis.com/deepmind-media/gemini/gemini_v1_5_report.pdf) | Multimodality and million-token context. |

</details>

---

## Frequently asked questions

**Why is AlexNet's 2012 success considered a regime change rather than just another milestone?**  
Before AlexNet, computer vision relied heavily on features hand-designed by human experts: the model learned from those representations but did not learn the representation itself. AlexNet showed that a deep network trained directly on pixels could outperform those systems by such a large margin—15.3% versus 26.2% top-5 error on ImageNet—that it changed the field's perception and showed that data and compute—not manual feature design—had become the dominant levers in that regime.

**What architectural advantage does the Transformer have over recurrent networks?**  
Recurrent networks process a sequence step by step, which limits training parallelism and makes long-range dependencies harder to preserve because each step depends on the previous one. With self-attention, the Transformer lets each token directly attend to other positions in the context while training can be massively parallelized. This made it practical to train on data volumes that would previously have been much harder to exploit.

**What do scaling laws imply for investment in AI?**  
They make part of the progress more predictable. In suitable regimes, loss follows approximate power-law relationships with model size, data and compute. This lets teams estimate expected improvements before committing to very expensive training runs and reason about how resources should be allocated, rather than depending only on one-off architectural intuition.

**Why is a foundation model considered infrastructure rather than only a technical advance?**  
Because it is trained once as a general base and then reused across many tasks with comparatively small adaptations, amortizing the high cost of pretraining across many applications. Earlier models were often trained for one narrow task and reused much less broadly. The shift is both technical and economic: the same base can support writing, translation, classification, code generation and multiple modalities, changing the logic of software development.