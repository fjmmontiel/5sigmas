---
title: Evaluating multimodal systems
description: "How to evaluate multimodal systems without confusing benchmark scores with real capability: grounding, contamination, OCR, audio, long video and hallucination."
date: 2026-04-03
keywords: "multimodal model evaluation, multimodal benchmarks, OCRBench, MMAU, VQA, MMMU, multimodal LLM evaluation, grounding, visual hallucination"
tags:
  - AI
  - Evaluation
  - Multimodality
---

# Chapter 4 — Evaluation: measuring without fooling ourselves

This chapter explains why real multimodal capability is harder to measure than benchmark leaderboards suggest. By the end, you will understand grounding and language priors, why evaluation-data contamination can inflate published scores, which metrics reveal more than final-answer accuracy, and what OCRBench v2, MMAU, MMMU, Video-MME, ZeroBench and HallusionBench reveal about documents, audio, long video, spatial reasoning and visual hallucination.

Multimodal evaluation has two recurring structural problems.

First, models can score well without relying on the modality we think we are testing. Language priors and benchmark contamination can make an answer correct for the wrong reason.

Second, the field historically concentrated on image-question answering because it is easy to automate, while harder capabilities—document structure, expert audio, long-duration temporal reasoning, spatial cognition and multimodal generation—remain much less completely measured.

---

## 1. Grounding: is the answer supported by the evidence?

In a multimodal system, **grounding** is the degree to which the output is supported by the actual image, audio, document or video rather than by a statistical prior over likely answers.

A model may answer “red” to “What colour is the car?” even if it barely processed the image, simply because red cars are common in similar training examples. If the guess happens to be correct, ordinary accuracy cannot distinguish real visual understanding from a shortcut.

Good grounding tests therefore include **counter-prior examples**: unusual colours, uncommon object counts, atypical spatial configurations and cases where the correct answer contradicts the most common linguistic expectation.

[VQA v2][r1] was explicitly motivated by this problem. Earlier VQA datasets allowed surprisingly strong text-only baselines because question form leaked information about likely answers.

{{ include_html("snippets/multimodalidad-iag/04-grounding-concepto.html") }}

---

## 2. Benchmark contamination

Foundation models are trained on enormous internet-scale datasets. Old benchmark images, captions, answer keys and discussion pages can therefore enter pretraining data.

That creates a simple problem: a score may measure **recognition of previously seen evaluation material** in addition to generalization.

The risk is especially difficult in multimodality because benchmark images are often public photographs that may have appeared elsewhere with labels or descriptions. Exact-text deduplication is not enough; near-duplicate images and transformed copies also matter.

A rigorous evaluation pipeline should therefore:

- prefer new or protected test material when possible,
- perform similarity searches against known training corpora when available,
- report contamination analysis alongside scores,
- and interpret results on old public benchmarks as an upper bound on uncontaminated capability rather than unquestioned ground truth.

{{ include_html("snippets/multimodalidad-iag/04-contaminacion.html") }}

---

## 3. Language priors: answering from probability instead of perception

A language prior is the model's tendency to answer from the statistical structure of the question and training corpus even when the image contains the decisive evidence.

A standard diagnostic is **ablation**: ask the same question without the image and compare performance. If scores barely change, the supposedly visual benchmark may mostly be testing language.

The shortcut is strongest when answer distributions are highly skewed—for example common colours, typical object counts or frequent object–attribute combinations.

Benchmarks such as [SEED-Bench][r2] and [MMStar][r3] try to reduce this effect through more carefully selected and balanced examples.

{{ include_html("snippets/multimodalidad-iag/04-prior-linguistico.html") }}

---

## 4. Metrics beyond final-answer accuracy

Accuracy remains useful, but it is not enough.

### Consistency

A robust model should answer semantically equivalent paraphrases consistently. Large changes under superficial wording changes suggest dependence on prompt form rather than stable understanding.

### Localization

When the answer depends on a region of an image, evaluation should verify whether the system can identify that region rather than only produce the final label. Correct counting without any ability to localize the counted objects indicates a different capability profile than grounded detection.

### Calibration and abstention

A model should lower confidence or abstain when evidence is ambiguous or insufficient. Confidently answering unanswerable questions is especially dangerous in multimodal products because fluent language can hide perceptual uncertainty.

{{ include_html("snippets/multimodalidad-iag/04-metricas-evaluacion.html") }}

---

## 5. Domains where current evaluation exposes real limits

### Complex documents

OCR is not only character recognition. Real documents contain columns, tables, merged cells, formulas, figures, handwriting and non-linear reading order.

[OCRBench v2][r5] evaluates localization, handwriting and logical reasoning over documents. OmniDocBench extends the problem to complex page reconstruction and layout understanding. Systems that perform strongly on ordinary text can still collapse when structure and semantics have to be integrated simultaneously.

{{ include_html("snippets/multimodalidad-iag/04-ocrbench.html") }}

### Expert audio

[MMAU][r6] evaluates speech, environmental sounds and music. Hard cases require causal reasoning, multiple simultaneous sound sources or distinctions that cannot be solved by simple audio classification. Native-audio products may therefore appear more general than what current benchmarks actually establish.

### Expert visual reasoning

[MMMU][r7] combines domain knowledge with diagrams, charts, radiographs and other visual evidence across university-level subjects. It exposes a central difference between “recognizing an image” and reasoning over evidence embedded in a technical visual.

### Long video and spatial cognition

[Video-MME][r8] shows a strong degradation as videos become longer and evidence is distributed across time. Tracking events over minutes or hours is a different problem from answering questions about one image.

[ZeroBench][r11] attacks another weakness: abstract spatial reasoning from static scenes. Its difficult examples show that some apparently simple geometric relationships remain much harder for frontier multimodal systems than for humans.

{{ include_html("snippets/multimodalidad-iag/04-video-degradacion.html") }}

### Visual hallucination

[HallusionBench][r9] tests failures such as claiming an absent object is present, denying a visible element or asserting an incorrect spatial relationship. The failure profile varies across counting, existence and spatial reasoning, which means one aggregate score can hide important weaknesses.

{{ include_html("snippets/multimodalidad-iag/04-hallusionbench.html") }}

### Multimodal outputs

Evaluation becomes even less mature when the output itself is audio, image or video. Real-time speech quality, interruption handling, text–voice consistency and generation conditioned jointly on several input modalities still lack the standardized measurement ecosystem that text generation has accumulated.

---

## 6. A practical evaluation contract

For a production multimodal system, evaluation should include at least:

1. **task accuracy** on representative inputs,
2. **grounding tests** where language priors point toward the wrong answer,
3. **modality ablations** to prove the system actually uses the perceptual input,
4. **consistency** under paraphrase and harmless transformations,
5. **calibration/abstention** for ambiguous evidence,
6. **slice analysis** across image quality, document structure, language, audio conditions and video duration,
7. **contamination controls** for public benchmarks,
8. **end-to-end product metrics** such as latency and tool/action correctness when perception drives downstream operations.

{{ include_html("snippets/multimodalidad-iag/04-metricas-evaluacion.html") }}

!!! tip "Next chapter"
    [Chapter 5 — Risks →](./05-riesgos.md) — What risks become specific to multimodality, how visual/audio input expands the instruction surface, and why perception-to-action systems amplify errors.

---

## 7. References

<details markdown="1">
<summary><strong>Core sources</strong></summary>

| Key | Source | Short description |
| --- | --- | --- |
| R1 | **Goyal et al. (2017)** — *Making the V in VQA Matter* ([arXiv][r1]) | Language priors and VQA v2. |
| R2 | **Li et al. (2023)** — *SEED-Bench* ([arXiv][r2]) | Multimodal generative-comprehension benchmark. |
| R3 | **Chen et al. (2024)** — *MMStar* ([arXiv][r3]) | Benchmark designed to reduce data leakage and text-only shortcuts. |
| R4 | **Hu et al. (2024)** — grounded multimodal evaluation ([arXiv][r4]) | Localization-aware multimodal evaluation. |
| R5 | **Liu et al. (2024)** — *OCRBench v2* ([arXiv][r5]) | OCR, handwriting, localization and document reasoning. |
| R6 | **Sakshi et al. (2024)** — *MMAU* ([Adobe Research][r6]) | Massive multitask audio understanding and reasoning. |
| R7 | **Yue et al. (2023)** — *MMMU* ([arXiv][r7]) | Expert multimodal reasoning across academic disciplines. |
| R8 | **Fu et al. (2024)** — *Video-MME* ([arXiv][r8]) | Long-duration video understanding. |
| R9 | **Liu et al. (2023)** — *HallusionBench* ([arXiv][r9]) | Visual hallucination and reasoning failures. |
| R10 | **Ouyang et al. (2025)** — *OmniDocBench* ([CVPR][r10]) | Complex document parsing and layout reconstruction. |
| R11 | **Roberts et al. (2025)** — *ZeroBench* ([arXiv][r11]) | Difficult visual-spatial cognition benchmark. |

</details>

[r1]: https://arxiv.org/abs/1612.00837
[r2]: https://arxiv.org/abs/2307.16125
[r3]: https://arxiv.org/abs/2403.20330
[r4]: https://arxiv.org/abs/2407.03199
[r5]: https://arxiv.org/abs/2501.00321
[r6]: https://research.adobe.com/publication/mmau-a-massive-multi-task-audio-understanding-and-reasoning-benchmark/
[r7]: https://arxiv.org/abs/2311.16502
[r8]: https://arxiv.org/abs/2405.21075
[r9]: https://arxiv.org/abs/2310.14566
[r10]: https://openaccess.thecvf.com/content/CVPR2025/html/Ouyang_OmniDocBench_Benchmarking_Diverse_PDF_Document_Parsing_with_Comprehensive_Annotations_CVPR_2025_paper.html
[r11]: https://arxiv.org/abs/2502.09696

---

## Frequently asked questions

**How can a model get a visual benchmark question right without using the image?**  
If the question strongly predicts the usual answer, the language prior can be enough. Image-ablation tests reveal this by measuring how much performance remains after the modality is removed.

**Why is contamination especially difficult for multimodal benchmarks?**  
Because near-duplicate images can appear across websites with different crops, captions and transformations. Text deduplication alone cannot prove the model has never seen the evaluation evidence.

**Why do document benchmarks matter if a model already has strong OCR?**  
Recognizing characters is only one step. Real documents require reading order, table structure, formulas, region relationships and cross-page reasoning. Layout and semantics have to be integrated.

**What should I measure if perception triggers actions?**  
Evaluate the complete causal chain: perceptual grounding, calibration, tool/action selection, recovery behaviour and the cost of false positives/negatives. A small perception error can become much more serious once it drives an external action.
