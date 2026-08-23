---
title: Evaluating multimodal systems
description: "How to evaluate multimodal systems without confusing benchmarks with real capability: OCR, audio, grounding, reasoning and metric failures."
date: 2026-04-03
date_modified: 2026-08-23
keywords: "multimodal model evaluation, multimodal benchmarks, OCRBench, MMAU, VQA, MMMU, real AI capabilities, multimodal LLM evaluation, generative AI metrics"
tags:
  - AI
  - Evaluation
  - Multimodality
---

# Chapter 4 — Evaluation: measuring without fooling ourselves

This article explains why the real capability of a multimodal system is harder to measure than benchmark rankings suggest. It covers grounding and language priors, including how a model can answer correctly without actually using the image; how evaluation-data contamination can inflate published results; and what benchmarks such as OCRBench v2, MMAU, ZeroBench and HallusionBench reveal about current limits in documents, audio, long video and spatial reasoning. It is useful both for technical readers evaluating models and for readers who want to interpret model comparisons rigorously.

Evaluating whether a language model produces accurate and useful answers is already difficult. Adding visual or audio inputs makes evaluation harder in two distinct ways.

First, current multimodal benchmarks have two systematic problems that can make real capability look stronger than it is: evaluation-data contamination and the dominance of text in benchmark design.

Second, evaluation has historically focused on vision-language tasks, leaving entire capabilities poorly measured: understanding documents with complex layouts, reasoning over audio, temporal coherence in video and the quality of outputs generated in modalities other than text. OCRBench v2 and MMAU are recent reminders that these under-measured capabilities remain difficult even for the strongest current models.

---

## 1. What it means to evaluate grounding

In multimodal systems, grounding is the degree to which the model's answer is supported by the actual content of the image or audio rather than by statistical expectations derived from the question text. A model can correctly answer "What color is the car in the image?" without actually processing the image if the color most common in similar training examples happens to match the correct answer.

That answer is not grounded in the image; it comes from a strong language prior that happens to produce the right result. The difference is invisible whenever the prior and the correct answer point in the same direction.

To measure grounding, benchmarks need examples in which the correct answer violates statistical expectations. If every question about fruit in images has an answer matching the fruit most represented in training, there is no way to distinguish genuine visual understanding from a model that answers from learned priors.

The Visual Question Answering Challenge (VQA), historically one of the most widely used benchmarks, has exactly this problem [Goyal et al., 2017][r1]. A 2017 analysis showed that a model that completely ignored the images and answered only from the distribution of the most frequent responses for each question type still achieved surprisingly high results. Later benchmark improvements introduced balancing techniques to reduce this bias, although they did not remove it completely.

{{ include_html("snippets/multimodalidad-iag/04-grounding-concepto.html") }}

---

## 2. The problem of benchmark contamination

The second systematic problem is contamination. Foundation models are pretrained on massive amounts of internet data, and there is no guarantee that image-description pairs or evaluation datasets do not appear in those data.

Contamination in text is already a documented problem: models that obtain exceptional results on some reasoning benchmarks can recite the correct answers when given the problem identifier, suggesting that the benchmark was present in their training data. In multimodality, the problem is potentially larger because benchmark images are often publicly available photographs that may have appeared in pretraining together with their descriptions or labels.

The technical solution is to use benchmarks whose evaluation data did not exist on the internet when the model was pretrained or that are protected from indexing. In practice, however, the most useful recommendation is to interpret results skeptically when the evaluated model was pretrained at internet scale, especially if the benchmark is old.

The most rigorous labs perform contamination analyses before publishing results: they search their training data for images similar to those in the evaluation benchmark and exclude those images from the final analysis. Without that analysis, published results are an upper bound on the model's real capability on that benchmark, not a direct measurement. Before turning a difference of a few tenths into a conclusion, the [benchmark reliability explorer](/en/tools/benchmark-reliability/) lets you inspect resolution, invalid items, potential exposure, saturation and ranking sensitivity to task composition.

{{ include_html("snippets/multimodalidad-iag/04-contaminacion.html") }}

---

## 3. Language bias: answering from probability, not evidence

A language prior is the tendency of a model to generate answers that are statistically likely given the question text regardless of the image content. It is one of the subtlest forms of missing grounding and one of the hardest to detect with standard benchmarks because the error remains hidden whenever the prior matches the distribution of correct answers.

Ablation experiments are the standard way to measure it: present the question without the image and observe whether the answer distribution changes significantly. If performance remains similar without the image, the language prior is driving much of the answer.

The effect is especially strong where training distributions are skewed: questions about the usual color of certain objects, an animal species when only one animal is visible, or the number of elements in scenes where two or three is the dominant frequency. In each case, the model can learn a highly skewed answer distribution and use it as a shortcut instead of relying on the image.

Benchmarks that resist language priors need deliberate counterexamples: objects with unusual colors, scenes whose object counts violate common expectations, and spatial configurations that are rare in training. [MMStar][r3] and [SEEDBench][r2] are examples of benchmarks designed with explicit attention to this problem.

{{ include_html("snippets/multimodalidad-iag/04-prior-linguistico.html") }}

---

## 4. Metrics beyond accuracy

Final-answer accuracy does not capture everything that matters about a multimodal model's capabilities. More rigorous evaluation adds dimensions that reveal different aspects of visual understanding.

**Consistency.** A genuinely capable model should answer paraphrases of the same question consistently. If the answer changes drastically under a semantically equivalent formulation, the model's visual understanding is not robust; it is sensitive to the surface form of the question.

**Localization when relevant.** When an answer depends on where elements appear in an image, evaluation should verify not only the final answer but also whether the model can localize the relevant elements. A model that correctly answers "there are three cars" but cannot localize them has a different kind of understanding from a model that can, and that difference matters when localization is part of the expected result [Hu et al., 2024][r4].

**Calibration.** Models should express uncertainty when visual content is ambiguous or when the available evidence does not support a clear answer. A model that always responds with high confidence, even for ambiguous images or unanswerable questions, is not properly calibrated. In production, this produces unjustifiably definitive answers where the system should abstain or ask for clarification.

{{ include_html("snippets/multimodalidad-iag/04-metricas-evaluacion.html") }}

---

## 5. Domains where evaluation remains difficult

Multimodal evaluation has been dominated by VQA and visual-grounding tasks because they are easier to automate and convert into benchmarks with single-choice answers. That creates a systematic blind spot: the domains that are hardest to automate are often the ones that reveal the most about current model limitations.

**Documents with complex layouts.** OCRBench v2, published in 2024, evaluated advanced multimodal models on text localization, handwriting recognition and logical reasoning over documents [Liu et al., 2024][r5]. Even models with high VQA scores struggled on real-world documents: text in non-standard orientations, tables with merged cells, mathematical formulas embedded in text flow, or questions that require combining information across several regions of the same document. OmniDocBench, presented at CVPR 2025, extended this evaluation to non-standard layouts with multiple columns, floating figures and elements with non-linear alignment. Across 13 SOTA models, the same pattern appeared: systems that reach 80–90% accuracy on standard text fall to 36.9% on complex-layout reconstruction. The bottleneck is not basic visual recognition, but integrating structure and semantics in scenes that are not linear prose [Ouyang et al., 2025][r10].

{{ include_html("snippets/multimodalidad-iag/04-ocrbench.html") }}

**Expert audio.** MMAU, published by Adobe Research in 2024, evaluated audio understanding and reasoning in three categories: speech, non-verbal environmental sounds and music [Sakshi et al., 2024][r6]. Even the strongest models remained significantly below expert human performance on the hardest tasks in each category. The gap was especially large when the task required reasoning about the cause of a sound rather than merely identifying it, inferring context from multiple simultaneous sound sources, or distinguishing musical variants that share superficial structure. These limits matter for native-audio systems such as Gemini 2.5 or Qwen2.5-Omni, where capability expectations often exceed what available benchmarks can confirm.

**Expert reasoning.** MMMU, published in 2023, evaluated models' ability to reason over visual content in 30 university subjects grouped into 6 disciplines: Art and Design, Business, Science, Health and Medicine, Humanities and Social Sciences, and Engineering and Technology. Unlike image-description benchmarks, MMMU requires domain knowledge as well as visual understanding: reading the image correctly is not enough; the model has to understand what the visual evidence means. The results showed a persistent gap between the best models and expert human performance, especially in disciplines where the image is not merely illustrative but contains the decisive evidence: circuit diagrams, laboratory graphs and radiographs [Yue et al., 2023][r7].

**Long-duration video.** Video-MME, published in 2024, evaluated video understanding over durations ranging from minutes to hours, with questions requiring temporal tracking, analysis of changes between segments and synthesis of information distributed throughout the video. Quality dropped sharply as duration increased: models that understand short videos well failed on long versions of the same tasks because the attention mechanism lost temporal coherence at the scale of minutes or hours, a limitation that image or short-video benchmarks do not capture [Fu et al., 2024][r8]. ZeroBench, published in February 2025, exposed a different limit: it evaluated 20 frontier models on one hundred visual-spatial cognition tasks over static images, and all obtained 0.0% accuracy [Roberts et al., 2025][r11]. The issue is more basic than temporal coherence: current models also fail at pure spatial reasoning on scenes that a three-year-old can solve effortlessly. LVOmniBench, introduced in 2026, confirmed the long-video pattern on real-world videos between 10 and 90 minutes: every open-source model remained below 35% accuracy, with the best evaluated commercial model reaching only 65%.

{{ include_html("snippets/multimodalidad-iag/04-video-degradacion.html") }}

**Visual hallucinations.** HallusionBench, published in 2023, was designed to detect hallucinations specific to vision-language systems: cases where the model claims to see absent elements, denies the presence of visible elements, or assigns incorrect spatial relations to objects that it can identify individually. Visual hallucination appeared consistently across all evaluated models rather than as a marginal phenomenon, and its frequency varied by task type—counting, spatial reasoning and existence—so no model was robust across all categories at once [Liu et al., 2023][r9].

{{ include_html("snippets/multimodalidad-iag/04-hallusionbench.html") }}

**Multimodal outputs.** There are no established benchmarks that adequately measure real-time spoken-response quality, consistency between text and voice generated simultaneously, or the accuracy of images generated from both text and an input image. Without those metrics, the limits of systems with these output modalities are still poorly characterized.

---

!!! tip "Next chapter"
    [Chapter 5 — Risks →](./05-riesgos.md) — Which risks are specific to multimodality, why poor grounding has different consequences depending on the modality, and how the risk profile changes when perception and action are coupled in the same system.

## 6. References

<details markdown="1">
<summary><strong>Core sources</strong></summary>

| Key | Source | Short description |
| --- | --- | --- |
| R1 | **Goyal et al. (2017)** — *Making the V in VQA Matter* ([arXiv][r1]) | Analysis of language priors in VQA and VQA v2. |
| R2 | **Li et al. (2023)** — *SEED-Bench: Benchmarking Multimodal LLMs with Generative Comprehension* ([arXiv][r2]) | Benchmark designed to reduce contamination and language priors. |
| R3 | **Chen et al. (2024)** — *MMStar: Are We on the Right Way for Evaluating Large Vision-Language Models?* ([arXiv][r3]) | Analysis of leakage in multimodal benchmarks and proposal for more rigorous evaluation. |
| R4 | **Hu et al. (2024)** — *Evaluating Visual Grounding in Large Vision-Language Models* ([arXiv][r4]) | Review of visual-grounding evaluation metrics for VLMs, emphasizing localization and calibration. |
| R5 | **Liu et al. (2024)** — *OCRBench v2* ([arXiv][r5]) | Benchmark for text localization, handwriting and logical reasoning over documents. |
| R6 | **Sakshi et al. (2024)** — *MMAU: A Massive Multi-Task Audio Understanding and Reasoning Benchmark* ([Adobe Research][r6]) | Audio-understanding and reasoning benchmark covering speech, non-verbal sounds and music. |
| R7 | **Yue et al. (2023)** — *MMMU: A Massive Multi-discipline Multimodal Understanding and Reasoning Benchmark for Expert AGI* ([arXiv][r7]) | Visual-reasoning benchmark across 57 university disciplines with a persistent gap from expert humans. |
| R8 | **Fu et al. (2024)** — *Video-MME: The First-Ever Comprehensive Evaluation Benchmark of Multi-modal LLMs in Video Analysis* ([arXiv][r8]) | Video-understanding benchmark spanning durations from minutes to hours. |
| R9 | **Liu et al. (2023)** — *HallusionBench: An Advanced Diagnostic Suite for Entangled Language Hallucination and Visual Illusion in Large Vision-Language Models* ([arXiv][r9]) | Benchmark specifically designed to detect visual hallucinations in vision-language systems. |
| R10 | **Ouyang et al. (2024)** — *OmniDocBench: Benchmarking Diverse PDF Document Parsing with Comprehensive Annotations* ([arXiv][r10]) | PDF-parsing benchmark with complex layouts; presented at CVPR 2025. |
| R11 | **Roberts et al. (2025)** — *ZeroBench: An Impossible Visual Benchmark for Contemporary Large Multimodal Models* ([arXiv][r11]) | Impossible benchmark: 20 frontier models evaluated, all at 0.0% on visual-spatial cognition. |

</details>

[r1]: https://arxiv.org/abs/1612.00837 "Making the V in VQA Matter — Goyal et al. 2017"
[r2]: https://arxiv.org/abs/2307.16125 "SEED-Bench — Li et al. 2023"
[r3]: https://arxiv.org/abs/2403.17101 "MMStar — Chen et al. 2024"
[r4]: https://arxiv.org/abs/2402.05862 "Evaluation of VLMs — 2024"
[r5]: https://arxiv.org/abs/2501.00321 "OCRBench v2 — Liu et al. 2024"
[r6]: https://research.adobe.com/publication/mmau-a-massive-multi-task-audio-understanding-and-reasoning-benchmark/ "MMAU — Sakshi et al. 2024"
[r7]: https://arxiv.org/abs/2311.16502 "MMMU — Yue et al. 2023"
[r8]: https://arxiv.org/abs/2405.21075 "Video-MME — Fu et al. 2024"
[r9]: https://arxiv.org/abs/2310.14566 "HallusionBench — Liu et al. 2023"
[r10]: https://arxiv.org/abs/2412.07626 "OmniDocBench — Ouyang et al. 2024"
[r11]: https://arxiv.org/abs/2502.09696 "ZeroBench — Roberts et al. 2025"

---

## Frequently asked questions

**Why can a model score highly on a visual benchmark without actually processing the image?**
Because of language priors: the model answers from the statistical distribution of likely responses given the question text rather than from the visual content. The effect is invisible when that prior matches the correct answer because the model is right for the wrong reasons and an accuracy benchmark cannot distinguish it from a model that did process the image.

**How can you detect whether a system really reasons over the temporal sequence of a video?**
Use the shuffling test described above: pass the video frames to the model in random order before asking the question. If the score does not change or even improves after shuffling, the system is not using the temporal sequence and is answering from semantic cues present in individual frames instead.

**What makes MMMU more demanding than image-description benchmarks?**
MMMU uses university-exam questions across 30 subjects where the image is not merely illustrative but contains the decisive evidence: circuit diagrams, laboratory graphs and radiographs. Reading the image correctly is not enough; the model has to understand what the visual evidence means. The best current models remain significantly below expert human performance in the most technical categories.

**Why does model performance fall so sharply when moving from standard text to documents with complex layouts?**
Because their representations are optimized for natural photographs rather than for integrating spatial structure and semantics at the same time. OCRBench v2 and OmniDocBench show that systems with 80–90% accuracy on standard text fall to 36.9% on complex-layout reconstruction with multiple columns, merged table cells or formulas embedded in text flow.