---
title: Risks of multimodal AI systems
description: "Security and reliability risks specific to multimodal AI: prompt injection through images and audio, privacy leakage, RAG poisoning, tool amplification and hallucination-to-action failures."
date: 2026-04-04
keywords: "multimodal AI security, visual prompt injection, audio prompt injection, multimodal hallucination, AI privacy, RAG poisoning, tool security, multimodal bias"
tags:
  - AI
  - Multimodality
  - Security
  - Evaluation
---

# Chapter 5 — Risks: when perception becomes part of the attack surface

This chapter closes the Multimodality series by analysing the risks that appear when AI systems stop receiving only trusted text and begin interpreting images, audio, documents, video and physical-world signals. By the end, you will understand why indirect prompt injection becomes a multimodal security problem, how metadata and retrieval pipelines expand the privacy and supply-chain surface, why agent/tool integration amplifies perceptual errors, and which controls belong outside the model itself.

Multimodality increases capability because more of the world becomes usable as context. The same property increases risk because more of the world becomes **instruction-bearing input**.

A document can contain text the user never intended as an instruction. An image can contain adversarial or hidden content. Audio can carry malicious or misleading signals. Retrieved multimodal documents can poison context. And once the model can call tools, a perceptual mistake can turn into an external action.

The security principle that organizes this chapter is:

> **Untrusted perceptual content must never become an authorization boundary merely because a model interpreted it as an instruction.**

---

## 1. Prompt injection expands beyond visible text

Indirect prompt injection occurs when untrusted content contains instructions that compete with the system's intended instructions [r1]. In multimodal systems, that content does not have to be typed into the chat box.

It can appear inside:

- a webpage or PDF being summarized,
- text embedded in an image,
- a screenshot,
- an audio recording,
- a retrieved document,
- or another external object processed by the model.

The dangerous step is not merely that the model “reads” the content. It is when the surrounding system treats instructions recovered from that content as if they were trusted user or system commands.

Visual adversarial work has shown that image content can influence aligned language models in ways that bypass intended behaviour [r2][r3]. The practical product lesson is defensive: OCR or vision output must be treated as **untrusted data**, not as privileged instructions.

{{ include_html("snippets/multimodalidad-iag/05-prompt-injection-visual.html") }}

---

## 2. Audio adds a hidden instruction channel

Native-audio systems introduce a similar problem in a continuous temporal modality. Spoken content, background audio and non-verbal signals may all reach the same inference process.

Recent work such as WhisperInject demonstrates that audio-language models can be manipulated by adversarially constructed but apparently benign audio inputs [r6]. The exact attack techniques are less important for product design than the architectural consequence:

> **Audio should be treated as an untrusted input channel whose semantic interpretation must not automatically acquire tool authority.**

Controls therefore belong at the orchestration layer: explicit tool permissions, action schemas, confirmation for consequential operations, provenance tracking and separation between perception and authorization.

{{ include_html("snippets/multimodalidad-iag/05-whisperinject.html") }}

---

## 3. Tool use amplifies hidden-content failures

A model that only generates text can produce a bad answer. A model that can call tools can turn the same error into a state change.

Consider a system that reads an uploaded screenshot or PDF and has access to email, files, a database or an external API. If hostile content inside the document is interpreted as an instruction, the risk is no longer only incorrect summarization. The system may attempt to disclose data, alter records or trigger external actions.

This is why the model must not be the sole security boundary. The tool layer should independently enforce:

- least-privilege permissions,
- allow-listed operations,
- typed/validated arguments,
- user confirmation for high-impact actions,
- destination and data-flow restrictions,
- and audit logs for every external effect.

{{ include_html("snippets/multimodalidad-iag/05-fuga-sistema.html") }}

---

## 4. Privacy: the payload is larger than what the user sees

Images and documents can contain hidden or secondary information beyond their visible surface: metadata, geolocation, timestamps, author fields, embedded thumbnails, comments or document history.

If the product automatically uploads raw files to an external model provider, this metadata can cross trust boundaries even when the user did not intend to share it.

A robust ingestion pipeline should therefore decide explicitly which metadata to preserve, strip unnecessary fields where appropriate, and document what leaves the user's environment.

{{ include_html("snippets/multimodalidad-iag/05-exif-privacidad.html") }}

---

## 5. Retrieval turns multimodal content into a supply-chain problem

RAG systems retrieve external information and place it into the model's active context. In multimodal RAG, that retrieved evidence may be text, screenshots, images, scanned documents, audio or video.

If the retrieval corpus can be modified by untrusted actors, poisoning becomes a supply-chain risk. A malicious or misleading object can rank highly for a query and then influence the model precisely because retrieval has elevated it into the context window.

The defensive controls are familiar but have to be applied to multimodal content too:

- source provenance,
- access control on indexing,
- document/version integrity,
- trust-aware ranking,
- quarantine for unknown sources,
- and citation/evidence checks before consequential actions.

{{ include_html("snippets/multimodalidad-iag/05-rag-envenenamiento.html") }}

---

## 6. Perception → reasoning → action: errors propagate

The most important multimodal risk appears when a system closes the loop from perception to action.

A visual or acoustic error changes the internal state. That state changes reasoning. Reasoning changes the selected action. The environment then changes, and the next observation is conditioned on the previous mistake.

This propagation is structurally similar to error accumulation in agents, but multimodality adds uncertainty at the very first stage: the system may be wrong about what it perceived before planning even begins.

{{ include_html("snippets/multimodalidad-iag/05-agencia-propagacion.html") }}

For high-impact domains, the system should expose and use perceptual uncertainty rather than collapse it into one confident symbolic interpretation.

---

## 7. Hallucination becomes more serious when the output drives action

Multimodal hallucination includes inventing absent objects, misreading a document region, fabricating a relationship between visible elements or confidently describing a sound/event that is not present.

In a conversational assistant, this may lead to a wrong answer. In a tool-using or embodied system, it can produce an incorrect action.

The critical distinction is therefore between **answer correctness** and **decision safety**. A product that lets multimodal generations trigger actions needs stronger controls than a benchmark that simply measures whether one textual answer matches a reference.

Useful controls include:

- abstention on low-confidence evidence,
- secondary verification before high-impact actions,
- deterministic validation against structured sources,
- bounded action spaces,
- and explicit human approval at irreversible boundaries.

{{ include_html("snippets/multimodalidad-iag/05-alucinacion-accion.html") }}

---

## 8. Bias and regulatory obligations

Security risks are not limited to active attacks. Vision-language and audio systems can encode demographic bias from training data and preference alignment, while ordinary capability benchmarks may fail to surface the problem.

The EU AI Act uses a risk-based framework and imposes stronger transparency, logging, human-oversight and risk-management obligations on higher-risk applications, including systems affecting people in areas such as employment, biometrics and health [r7].

For multimodal systems, the regulatory burden is often tied not to the model architecture but to **what perceptual data is processed and what downstream decision it influences**.

{{ include_html("snippets/multimodalidad-iag/05-riesgos-multimodal.html") }}

---

## 9. A production security contract

A multimodal application should assume that every externally supplied modality can be adversarial or misleading.

A practical contract includes:

1. **Treat perceptual content as untrusted data**, even when it contains language-like instructions.
2. **Separate interpretation from authorization.** Tool permissions live outside the model.
3. **Minimize data exposure** by stripping unnecessary metadata and applying explicit retention boundaries.
4. **Track provenance** for retrieved multimodal evidence.
5. **Validate high-impact actions** with deterministic policies or human approval.
6. **Measure grounding and uncertainty**, not only final-answer accuracy.
7. **Log the perception → reasoning → action chain** sufficiently to debug failures.
8. **Evaluate bias and regulatory risk** on application-specific slices rather than only general benchmarks.

!!! tip "Series complete"
    This closes the text/visual Multimodality learning path. Continue through the [full series library →](/en/series/) or deepen evaluation and security in the dedicated topic/technical surfaces as they are published in English.

---

## 10. References

<details markdown="1">
<summary><strong>Core sources</strong></summary>

| Key | Source | Short description |
| --- | --- | --- |
| R1 | **Greshake et al. (2023)** — *Not What You've Signed Up For* ([arXiv][r1]) | Indirect prompt injection in LLM-integrated applications. |
| R2 | **Qi et al. (2024)** — *Visual Adversarial Examples Jailbreak Aligned Large Language Models* ([arXiv][r2]) | Adversarial visual inputs against aligned language models. |
| R3 | **Bailey et al. (2023)** — *Image Hijacks* ([arXiv][r3]) | Runtime control of generative models through adversarial images. |
| R4 | **OWASP** — *Top 10 for Large Language Model Applications* ([OWASP][r4]) | Application security risks including prompt injection and insecure tool use. |
| R5 | **UK NCSC** — *Prompt injection is not SQL injection* ([NCSC][r5]) | Why prompt injection is structurally difficult to eliminate at the model layer. |
| R6 | **(2026)** — *When Good Sounds Go Adversarial* ([arXiv][r6]) | Adversarial-audio research against audio-language models. |
| R7 | **European Union (2024)** — *Regulation (EU) 2024/1689* ([EUR-Lex][r7]) | EU AI Act risk-based regulatory framework. |

</details>

[r1]: https://arxiv.org/abs/2302.12173
[r2]: https://arxiv.org/abs/2306.13213
[r3]: https://arxiv.org/abs/2309.00236
[r4]: https://owasp.org/www-project-top-10-for-large-language-model-applications/
[r5]: https://www.ncsc.gov.uk/blog-post/prompt-injection-is-not-sql-injection
[r6]: https://arxiv.org/abs/2601.21181
[r7]: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689

---

## Frequently asked questions

**Why is multimodal prompt injection different from an ordinary malicious user message?**  
Because the hostile instruction can arrive inside content the user only wanted the model to inspect: a screenshot, document, webpage, audio track or retrieved object. The application has to distinguish data to interpret from authority to act.

**Why are tool permissions more important than trying to make the model ignore every malicious instruction?**  
Prompt-injection resistance is imperfect. Independent permission checks limit the consequence of a model mistake even when the model is persuaded by untrusted content.

**What is the main new privacy risk of image/document inputs?**  
The file can contain metadata and embedded information beyond what is visibly rendered. Products should explicitly define what is uploaded, retained and shared with model providers or downstream services.

**How should a multimodal agent handle uncertain perception?**  
It should carry uncertainty forward, seek additional evidence where possible, and require stronger verification before consequential actions. A low-confidence perceptual guess should not silently become a high-confidence command.
