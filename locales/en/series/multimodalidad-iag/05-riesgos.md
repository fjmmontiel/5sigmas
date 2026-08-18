---
title: Security risks in multimodal systems
description: "Visual prompt injection, privacy, context leakage and tool manipulation when a multimodal system can observe and act."
date: 2026-04-03
keywords: "multimodal AI risks, visual prompt injection, AI system security, AI image privacy, multimodal LLM attacks, safety alignment, responsible multimodal AI"
tags:
  - AI
  - GenAI
  - Multimodality
  - Alignment
---

# Chapter 5 — Risks: visual prompt injection, action and operational security

This article covers security risks that are specific to multimodal systems: threats that do not exist in the same form in text-only models because they enter through modalities that ordinary text filters do not inspect. It explains how visual prompt injection works, including the audio equivalent documented by WhisperInject; what happens when a successful injection reaches a tool-using system; what privacy risks come with image and document processing; and why the risk profile changes qualitatively when a system can act rather than only respond. It is intended for teams designing or deploying multimodal systems in production, regardless of their prior AI-security background.

Multimodal systems introduce attack surfaces that text-only models do not have. When a system can read images, scanned documents or audio fragments, malicious content in those modalities can alter its behavior in ways that text-focused filters cannot detect, because those filters operate on the user's explicit input rather than on information the model extracts while processing an image or audio signal.

The mechanisms differ across risk categories, but they share a common property: the threat enters through a modality that the system does not inspect with the same controls it applies to text.

Another distinction changes the risk analysis substantially: whether the system only responds or can also act. Once a system can call tools, modify records, send messages or plan actions in an environment, its error surface and attack surface expand together.

A successful injection in a text-only response system produces an incorrect response. The same injection in a tool-using system can trigger an irreversible action. That difference in consequences is why multimodal defensive design cannot be treated as a minor extension of text-only safeguards.

---

## 1. Visual prompt injection

Prompt injection is an attack in which an attacker places instructions for the model inside content that the model is supposed to process as data.

In text-only systems, this means including instructional text in the user's input. In multimodal systems, the instructions can be embedded inside the image itself: a photograph of a document, a screenshot or a product image can contain overlaid or embedded text that the model reads as instructions and follows if it cannot distinguish those instructions from the data content [Greshake et al., 2023][r1].

This vector is harder to filter than its textual equivalents for several compounding reasons. Instructions inside images do not pass through the system's text filters because they do not exist as text in the input until the model interprets them, so guardrails applied before inference cannot see them. They can also be visually obfuscated—low-contrast text, rotated text or text integrated into visual patterns—in ways that standard OCR does not detect but the model still interprets, expanding the attack surface without bypassing any explicit text filter. An attacker can also combine visual instructions with normal prompt text to build multi-stage attacks in which the image weakens restrictions and the text exploits the resulting behavior [Qi et al., 2024][r2][Bailey et al., 2023][r3].

This matters most in systems that process arbitrary user-uploaded documents such as invoices, contracts, screenshots or product photographs. In all of those cases, the content is untrusted and may contain embedded instructions that the system could follow unless it is explicitly designed to treat them as data rather than control [OWASP][r4][NCSC][r5].

{{ include_html("snippets/multimodalidad-iag/05-prompt-injection-visual.html") }}

The same attack vector exists in audio. Researchers have shown that imperceptible perturbations added to input audio can manipulate audio-language models and cause them to generate harmful content or execute malicious instructions without those instructions being audibly spoken by a human. WhisperInject documented this effect against models such as Qwen2.5-Omni: the perturbation is inaudible to humans but bypasses the model's safety protocols with a success rate above 86%, with direct implications for any system that treats incoming audio as trusted input [2026][r6].

{{ include_html("snippets/multimodalidad-iag/05-whisperinject.html") }}

---

## 2. System leakage and tool manipulation

When a multimodal system can use tools—API calls, database access or message sending—visual prompt injection can do more than alter the generated response. An injected image can contain instructions that change the model's behavior, such as telling it to ignore previous instructions, assume permissions the user does not have or follow a different workflow. If the model accepts those instructions, it may then use its tools to create external effects: sending data to an external URL, deleting records or including system-context content in its response.

The attack has two stages. First, the injected content changes the constraints the model is following. Then the model continues operating under those altered constraints with whatever tools are available. This becomes especially dangerous when system instructions contain configuration data, business logic or user information: if the attack causes the model to reveal that context, the information can reach the attacker before any downstream output control detects it.

Defensive design starts by applying least privilege to tools. If document processing does not require email access or database writes, those capabilities should not be available in that execution context.

Outputs produced after processing untrusted content should also be validated before they can trigger the next stage of a workflow, so a successful injection cannot propagate directly into irreversible actions.

{{ include_html("snippets/multimodalidad-iag/05-fuga-sistema.html") }}

---

## 3. Privacy: images, documents and metadata

Multimodal systems that process images and documents can access categories of personal information that text-only systems often do not handle. The risk comes not only from external attacks but also from system design that fails to account for the sensitivity of the data being ingested.

An identity document, a photo taken in a private space, a screenshot containing banking information or a scanned medical record may contain sensitive data that should not be stored, processed on unsuitable infrastructure or reused for future training. General-purpose multimodal systems do not always determine the sensitivity of this content before processing it.

Image metadata is another frequently overlooked source of sensitive information. JPEG files can contain EXIF fields with GPS coordinates, device information and an exact timestamp. Storing those files without removing the metadata can therefore retain location information that the user did not intend to share.

Data minimization is especially important for multimodal systems: process an image only for the required task, retain it only as long as necessary and do not reuse it for secondary purposes without explicit consent.

{{ include_html("snippets/multimodalidad-iag/05-exif-privacidad.html") }}

---

## 4. Data poisoning in systems with continuous learning

If a multimodal system continuously learns from interactions or updates a knowledge base from newly ingested content, data poisoning becomes an additional attack surface. An attacker can introduce carefully designed images or documents that, once processed and incorporated into the system's learning or retrieval corpus, alter the representations or evidence used in future interactions.

Unlike prompt injection, this attack can affect the system's long-term behavior rather than a single interaction, which makes it harder to detect and more expensive to reverse.

Multimodal retrieval-augmented generation (RAG) systems are particularly exposed because they index visual documents and later retrieve them as evidence. A malicious document in the knowledge base can be surfaced by attacker-controlled queries and systematically inject false information into future answers.

The strongest mitigation is strict separation between inference and any mechanism that updates the model or knowledge base. Documents should be reviewed before indexing, and content from untrusted sources should either be excluded or admitted only under tightly constrained indexing and retrieval policies.

{{ include_html("snippets/multimodalidad-iag/05-rag-envenenamiento.html") }}

---

## 5. What changes when the system acts

The four risks above exist in any multimodal system. When the system can act through tools, APIs, interfaces or multi-step plans, however, the consequences change qualitatively rather than simply becoming more frequent.

The first change is **reversibility**. An incorrect response can be ignored or corrected. An action against a database, filesystem or external service may not be reversible. Tool-using systems therefore have to assume that a successful injection can create persistent effects, which raises the confidence threshold required before executing any tool with external consequences.

The second change is the **attack surface created by composition**. In systems that chain perception and action—observe an image, reason about it, call a tool, then use the result to choose the next action—a perceptual error can propagate through the entire sequence. A manipulated image that produces an incorrect representation can lead to a completely wrong chain of actions, each of which appears locally reasonable given the state produced by the previous step.

This propagation makes attacks on the perceptual layer much more valuable to an adversary in agentic systems than in systems that only interpret content.

{{ include_html("snippets/multimodalidad-iag/05-agencia-propagacion.html") }}

The third change is **attribution**. In a conversational system, the source of an incorrect response is relatively easy to trace. In a perception–reasoning–action pipeline built from multiple components, a failure may originate in perception, reasoning, tool selection or interpretation of a tool result. That ambiguity complicates both incident diagnosis and assignment of responsibility, with direct implications for logs, alerts and rollback mechanisms.

The corresponding defensive principle is *confinement by stage*: every transition from perception to reasoning to action should include a verification point that checks whether the next action is consistent with the original input. In practice, the output of the perception layer should be treated as untrusted input before it is used to select an action, just as user input is treated as untrusted before it reaches the model.

A fourth change is **hallucinations with action consequences**. In a conversational system, a hallucination produces an incorrect response that the user can discard. In an agentic system, a perceptual hallucination can trigger an action in the environment: the model believes it sees an element that is not there, or believes a condition is satisfied when it is not, and acts accordingly. If the action changes environmental state—a file, a database or a submitted form—the hallucination has created an irreversible effect that may not be identifiable as such in the system logs.

The **agentic infinite loop** is a structural variant of the same problem. A system that perceives the environment, executes an action, observes the result and chooses the next action can enter a cycle in which each observation reinforces the previous action instead of correcting it, especially when perception of the post-action state is biased by what the system expected to see. Such a loop stops only when resources are exhausted or an external supervision mechanism intervenes, not because the system recognizes the underlying error. That makes iteration limits and explicit stopping conditions essential in any perception–action loop.

{{ include_html("snippets/multimodalidad-iag/05-alucinacion-accion.html") }}

---

## 6. Demographic bias and regulatory compliance

The risks of multimodal systems are not limited to active attacks. Vision-language models can encode demographic biases that general-capability benchmarks do not detect. Those biases originate in training data, can be amplified during alignment with human preferences and remain difficult to identify when general benchmarks do not measure them explicitly.

The European regulatory framework addresses part of this problem directly. The EU AI Act (Regulation 2024/1689) classifies systems by risk and establishes transparency, auditability and bias-evaluation obligations for systems that interact with people or make decisions affecting them [EU AI Act][r7]. Multimodal systems that process images, video or audio of people in high-risk contexts—facial recognition, personnel selection or medical evaluation—fall under the regulation's most demanding categories, with requirements that include activity logs, impact assessment and mandatory human oversight. The applicable risk category therefore determines which additional conformity requirements a system must satisfy before deployment in the EU.

{{ include_html("snippets/multimodalidad-iag/05-riesgos-multimodal.html") }}

---

## 7. References

<details markdown="1">
<summary><strong>Core sources</strong></summary>

| Key | Source | Short description |
| --- | --- | --- |
| R1 | **Greshake et al. (2023)** — *Not What You've Signed Up For: Compromising Real-World LLM-Integrated Applications with Indirect Prompt Injection* ([arXiv][r1]) | Analysis of indirect prompt-injection attacks in LLM systems with tools. |
| R2 | **Qi et al. (2024)** — *Visual Adversarial Examples Jailbreak Aligned Large Language Models* ([arXiv][r2]) | Visual adversarial attacks against aligned language models. |
| R3 | **Bailey et al. (2023)** — *Image Hijacks: Adversarial Images can Control Generative Models at Runtime* ([arXiv][r3]) | Control of generative models through adversarial images. |
| R4 | **OWASP** — *Top 10 for Large Language Model Applications* ([OWASP][r4]) | Reference framework for security risks in LLM applications, including prompt injection. |
| R5 | **NCSC** — *Prompt injection is not SQL injection (it may be worse)* ([NCSC][r5]) | Analysis of why prompt injection in LLMs is structurally harder to mitigate than classical SQL injection. |
| R6 | **(2026)** — *When Good Sounds Go Adversarial: Jailbreaking Audio-Language Models with Benign Inputs* ([arXiv][r6]) | WhisperInject framework: two-stage adversarial-audio attacks against audio-language models (Qwen2.5-Omni, Phi-4-Multimodal) with success rate >86%. |
| R7 | **European Parliament (2024)** — *Regulation (EU) 2024/1689 — Artificial Intelligence Act* ([EUR-Lex][r7]) | EU AI Act: European risk-based regulatory framework and audit requirements for AI systems. |

</details>

[r1]: https://arxiv.org/abs/2302.12173 "Indirect Prompt Injection — Greshake et al. 2023"
[r2]: https://arxiv.org/abs/2306.13213 "Visual Adversarial Examples — Qi et al. 2024"
[r3]: https://arxiv.org/abs/2309.00236 "Image Hijacks — Bailey et al. 2023"
[r4]: https://owasp.org/www-project-top-10-for-large-language-model-applications/ "OWASP LLM Top 10"
[r5]: https://www.ncsc.gov.uk/blog-post/prompt-injection-is-not-sql-injection "Prompt injection is not SQL injection — NCSC"
[r6]: https://arxiv.org/abs/2601.21181 "When Good Sounds Go Adversarial — 2026"
[r7]: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689 "EU AI Act — Regulation (EU) 2024/1689"

---

## Frequently asked questions

**Why is prompt injection harder to filter in multimodal systems than in text-only systems?**
Because malicious instructions can be embedded in an image as visual content rather than appearing as explicit text in the user's input. Text filters cannot see them until the model interprets the image. They can also be obfuscated in ways that standard OCR misses but the model still interprets, expanding the attack surface without requiring the attacker to bypass an explicit text filter.

**What concrete risk does a hallucination introduce in a system that can act on the environment?**
Unlike a conversational system, where a hallucination produces an incorrect response that the user can discard, a tool-using system that hallucinates can execute an action with irreversible external effects: deleting a record, sending data to a URL or calling an API. If the image that caused the failure is not clearly represented in the logs, the source of the problem is difficult to trace afterward.

**What does it mean for a multimodal system to infer sensitive traits from visual or auditory signals unrelated to those traits?**
It means the model can attribute characteristics such as socioeconomic status or a user's history from cues in an image or audio that do not objectively contain that information. That behavior amplifies stereotypes present in the training data and can lead to automated discriminatory treatment without any explicit human decision.

**What changes in the risk profile when the system not only responds but executes autonomous chained steps?**
The fundamental change is irreversibility: every transition from perception to reasoning to action can propagate an initial error through the entire chain, and every step can produce effects that cannot be undone. The longer the autonomous chain, the more opportunities an initial perceptual failure has to propagate and compromise the final outcome, because each subsequent step starts from the incorrect state left by the previous one.