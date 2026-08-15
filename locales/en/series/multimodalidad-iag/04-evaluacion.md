---
title: Evaluation of multimodal systems
description: "How to evaluate multimodal systems without confusing benchmarks with real capability: OCR, audio, grounding, reasoning and metric failures."
date: 2026-04-03
keywords: "multimodal model evaluation, multimodal benchmarks, OCRBench, MMAU, VQA, MMMU, multimodal LLM evaluation, grounding, visual hallucination"
tags:
  - AI
  - Evaluation
  - Multimodality
---

# Chapter 4 — Evaluation: measuring without fooling ourselves

This article examines why measuring the real capability of a multimodal system is harder than benchmark rankings suggest. By the end, you will understand grounding and language bias—and why the latter can let a model answer correctly without actually processing the image—how evaluation-data contamination can artificially inflate published results, and what benchmarks such as OCRBench v2, MMAU, ZeroBench and HallusionBench reveal about the field's real limits in documents, audio, long video and spatial reasoning. The article is useful both for technical readers who evaluate models and for anyone who wants to interpret industry comparisons rigorously.

Evaluating whether a language model produces accurate and useful answers is already a complex problem, but adding visual or auditory information multiplies the difficulty in two different ways.

The first is that current multimodality benchmarks have two systematic problems that lead us to overestimate real capabilities: evaluation-data contamination and the dominance of text in benchmarks.

The second is that evaluation has historically been dominated by vision-language tasks, leaving whole capabilities poorly measured: understanding documents with complex layouts, reasoning over audio, temporal coherence in video, or the quality of outputs generated in modalities other than text. OCRBench v2 and MMAU are recent reminders that this space, evaluated only superficially until now, remains difficult even for the strongest current models.

---

## 1. What it means to evaluate grounding

In multimodal systems, grounding is the degree to which the model's answer is supported by the actual content of the image or audio, rather than by statistical inferences about what type of answer is likely given the text of the question. A model can correctly answer “What colour is the car in the image?” without actually processing the image if the colour most common in its training data for cars in similar contexts happens to match the correct answer.

That model is not grounded; it has a strong language bias that produces the right answer for the wrong reason. The difference is invisible as long as the statistical bias and the correct answer point in the same direction.

To measure grounding, benchmarks need examples in which the correct answer violates statistical expectations. If every question about fruit in images has answers that coincide with the fruits most represented in training, there is no way to distinguish a model with genuine visual understanding from one that answers by probability.

The Visual Question Answering Challenge (VQA), historically one of the most widely used benchmarks, has exactly this problem [Goyal et al., 2017][r1]. An analysis published in 2017 showed that a model that completely ignored the images and answered only from the distribution of the most frequent answers for each question type achieved surprisingly high results. Later benchmark improvements introduced balancing techniques to reduce this bias, although they did not eliminate it completely.

{{ include_html("snippets/multimodalidad-iag/04-grounding-concepto.html") }}

---

## 2. The benchmark-contamination problem

The second systematic problem is contamination. Foundation models are pretrained on massive quantities of internet data, and there is no guarantee that image-description pairs or evaluation sets do not appear in those data.

Contamination in text is already a documented problem: models that obtain exceptional results on some reasoning benchmarks can recite the correct answers when given the problem identifier, suggesting that the benchmark appeared in their training data. In multimodality the problem can be even larger, because benchmark images are often publicly available photographs that may have appeared in the pretraining corpus together with their descriptions or labels.

The technical solution is to use benchmarks whose evaluation data did not exist on the internet when the model was pretrained, or whose evaluation data are protected from indexing. In practice, however, the most useful recommendation is to interpret results sceptically when the evaluated model was pretrained at internet scale, especially when the benchmark is old.

The most rigorous laboratories run contamination analyses before publishing results: they search their training data for images similar to those in the evaluation benchmark and exclude those images from the final analysis. Without such an analysis, published results are an upper bound on the model's real capability on that benchmark, not a direct measurement.

{{ include_html("snippets/multimodalidad-iag/04-contaminacion.html") }}

---

## 3. Language bias: answering by probability, not evidence

Language bias, or a language prior, is the tendency of models to generate answers that are statistically probable given the text of the question, regardless of the image content. It is the most subtle form of missing grounding and the hardest to detect with standard benchmarks, because the errors it produces are invisible when the statistical distribution matches the distribution of correct answers.

Ablation experiments are the standard tool for measuring it: the model is given the question without the image, and we observe whether the answer distribution changes significantly. When the model without the image obtains results similar to the model with the image, the language bias is dominating the answer.

The effect is especially strong in categories where training distributions are skewed: questions about the usual colour of certain objects, the species of an animal when only one is visible, or the number of elements in scenes where two or three is the dominant frequency. In all of these cases there is a highly skewed answer distribution that the model learns during training and can use as a shortcut, ignoring the image when the bias is strong enough.

Designing benchmarks that resist language bias requires active techniques: counterexamples in which an object has an unusual colour, scenes where the number of elements violates expectations, and spatial configurations that are uncommon in training. [MMStar][r3] and [SEED-Bench][r2] are examples of benchmarks designed with explicit attention to this problem.

{{ include_html("snippets/multimodalidad-iag/04-prior-linguistico.html") }}

---

## 4. Metrics beyond accuracy

Final-answer accuracy does not capture all the relevant information about a multimodal model's capabilities. More rigorous evaluators include three additional dimensions that reveal different aspects of visual understanding.

**Consistency.** A genuinely capable model should answer paraphrases of the same question consistently. When the answer changes drastically under a semantically equivalent formulation, the model does not have robust understanding of the visual content; it is sensitive to the superficial form of the question.

**Localization when relevant.** For tasks where the answer depends on the location of elements in the image, evaluation should verify not only whether the final answer is correct but also whether the model can indicate where the relevant element is. A model that correctly answers “there are three cars” but cannot delimit where they are has a different kind of understanding from a model that can, and that difference matters in applications where localization is part of the expected result [Hu et al., 2024][r4].

**Calibration.** Models should be able to express uncertainty when the visual content is ambiguous or when the question has no clear answer given the available evidence. A model that always produces a high-confidence answer, even for ambiguous images or questions that cannot be answered without additional information, is not correctly calibrated. In production, that becomes falsely definitive answers in cases where the system should abstain or ask for clarification.

{{ include_html("snippets/multimodalidad-iag/04-metricas-evaluacion.html") }}

---

## 5. Domains where evaluation remains difficult

Multimodality evaluation has been dominated by VQA and visual-grounding tasks because they are the easiest to automate and convert into benchmarks with single-choice answers. That has created a systematic blind spot: the domains that are hardest to automate are precisely those that reveal the most about the models' real limitations.

**Documents with complex layouts.** OCRBench v2, published in 2024, evaluated advanced multimodal models on text localization, handwriting recognition and logical reasoning over documents [Liu et al., 2024][r5]. The results showed that even models with high VQA scores struggle in real document scenarios: text in non-standard orientations, tables with merged cells, mathematical formulas embedded in text flow, or questions that require combining information from several regions of the same document. OmniDocBench, presented at CVPR 2025, extended the evaluation to documents with non-standard layouts: multiple columns, floating figures and elements with non-linear alignment. The evaluation of 13 SOTA models showed the same collapse: systems that reach between 80 and 90% accuracy on standard text fall to 36.9% on complex-layout reconstruction, confirming that the limit is not visual recognition but the integration of structure and semantics in scenes that are not linear prose [Ouyang et al., 2025][r10].

{{ include_html("snippets/multimodalidad-iag/04-ocrbench.html") }}

**Expert audio.** MMAU, published by Adobe Research in 2024, evaluated audio understanding and reasoning in three categories: speech, non-verbal environmental sounds and music [Sakshi et al., 2024][r6]. The results showed that even the strongest models remain significantly below expert human performance on the hardest tasks in each category, with especially marked degradation when the task requires reasoning about the cause of a sound rather than merely identifying it, inferring context from multiple simultaneous sound sources, or distinguishing musical variants that share superficial structure. Those limits are especially relevant for native-audio systems such as Gemini 2.5 or Qwen2.5-Omni, where expectations of capability often exceed what the available benchmarks can actually establish.

**Expert reasoning.** MMMU, published in 2023, evaluated models' ability to reason over visual content in 30 university subjects grouped into six disciplines: Art and Design, Business, Science, Health and Medicine, Humanities and Social Sciences, and Engineering and Technology. Unlike image-description benchmarks, MMMU requires integrating domain knowledge with visual understanding: reading the image is not enough; the model has to know what what it sees means. The results showed a persistent gap between the strongest models and expert human performance, especially in disciplines where the image is not an illustration but contains the decisive evidence: circuit diagrams, laboratory charts and radiographs [Yue et al., 2023][r7].

**Long-duration video.** Video-MME, published in 2024, evaluated video understanding over durations ranging from minutes to hours, with questions that require temporal tracking, analysis of changes between segments and synthesis of information distributed across the full video. The evaluation revealed a pronounced decline in quality as duration increases: models that understand short videos well fail on longer versions of the same tasks because the attention mechanism loses temporal coherence at the scale of minutes or hours, a limitation that image or short-video benchmarks do not capture [Fu et al., 2024][r8]. ZeroBench, published in February 2025, exposed another angle of the problem: it evaluated 20 frontier models on one hundred visual-spatial cognition tasks over static images, and every model obtained 0.0% accuracy [Roberts et al., 2025][r11]. This is not a temporal-coherence problem but something more basic: pure spatial reasoning, in scenes that any three-year-old child solves effortlessly, systematically exceeds what any current model can do. LVOmniBench, presented in 2026, confirmed the long-duration pattern with real videos between 10 and 90 minutes: all open-source models remain below 35% accuracy, with the best evaluated commercial model reaching only 65%.

{{ include_html("snippets/multimodalidad-iag/04-video-degradacion.html") }}

**Visual hallucinations.** HallusionBench, published in 2023, was designed to detect hallucinations specific to vision-language systems: cases where the model claims to see absent elements, denies the presence of visible elements, or assigns incorrect spatial relationships to objects that it can identify individually. The results showed that visual hallucination is a consistent pattern across all evaluated models, not a marginal phenomenon, and that frequency varies by task type—counting, spatial reasoning, existence—in such a way that no model is robust across every category at once [Liu et al., 2023][r9].

{{ include_html("snippets/multimodalidad-iag/04-hallusionbench.html") }}

**Multimodal outputs.** There are no established benchmarks that adequately measure real-time spoken-response quality, consistency between text and speech generated simultaneously, or the accuracy of images generated conditioned jointly on text and an input image. This absence of metrics means we do not know precisely where the current limits of systems operating in this space lie.

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
| R3 | **Chen et al. (2024)** — *MMStar: Are We on the Right Way for Evaluating Large Vision-Language Models?* ([arXiv][r3]) | Analysis of leakage in multimodal benchmarks and a proposal for more rigorous evaluation. |
| R4 | **Hu et al. (2024)** — *Evaluating Visual Grounding in Large Vision-Language Models* ([arXiv][r4]) | Review of visual-grounding evaluation metrics for VLMs, with emphasis on localization and calibration. |
| R5 | **Liu et al. (2024)** — *OCRBench v2* ([arXiv][r5]) | Benchmark for text localization, handwriting and logical reasoning over documents. |
| R6 | **Sakshi et al. (2024)** — *MMAU: A Massive Multi-Task Audio Understanding and Reasoning Benchmark* ([Adobe Research][r6]) | Audio understanding and reasoning benchmark covering speech, non-verbal sounds and music. |
| R7 | **Yue et al. (2023)** — *MMMU: A Massive Multi-discipline Multimodal Understanding and Reasoning Benchmark for Expert AGI* ([arXiv][r7]) | Visual-reasoning benchmark across 57 university disciplines with a persistent gap to expert humans. |
| R8 | **Fu et al. (2024)** — *Video-MME: The First-Ever Comprehensive Evaluation Benchmark of Multi-modal LLMs in Video Analysis* ([arXiv][r8]) | Video-understanding benchmark over durations ranging from minutes to hours. |
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
Because of language bias: the model answers from the statistical distribution of likely answers given the question text, not from the visual content. The effect is invisible when that statistical bias matches the correct answer, because the model is right for the wrong reason and an accuracy benchmark cannot distinguish it from a model that actually processed the image.

**How can we detect whether a system really reasons over the temporal sequence of a video?**  
With the shuffling test described in the article: pass the video frames to the model in random order before asking the question. If the score does not change, or even improves after shuffling, the system does not have dynamic temporal reasoning and is answering from semantic cues present in individual frames rather than from the sequence.

**What makes MMMU more demanding than image-description benchmarks?**  
MMMU uses university-exam questions in 30 subjects where the image is not an illustration but contains the decisive evidence: circuit diagrams, laboratory charts and radiographs. Reading the image correctly is not enough; the model has to know what what it sees means. The strongest current models still remain significantly below expert human performance in the most technical categories.

**Why does model performance fall so much when moving from standard text to documents with complex layouts?**  
Because their representations are optimized for natural photographs, not for integrating spatial structure and semantics at the same time. OCRBench v2 and OmniDocBench show that systems with 80–90% accuracy on standard text fall to 36.9% on reconstruction of layouts with multiple columns, merged-cell tables or formulas embedded in text flow.
