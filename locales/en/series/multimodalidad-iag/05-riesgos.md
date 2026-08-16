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

This article describes the security risks that are specific to multimodal systems: risks that do not exist in text-only models because the threat enters through a modality that ordinary filters do not analyze. By reading it, you will understand how visual prompt injection works (and its audio equivalent documented by WhisperInject), what happens when a tool-using system receives a successful injection, what privacy problems image and document processing introduces, and why the risk profile changes qualitatively when a system not only responds but acts. The article is useful for any team designing or deploying multimodal systems in production, with or without prior AI-security background.

Multimodal systems introduce attack surfaces that do not exist in text-only models. When a system can read images, scanned documents or audio fragments, malicious content in those modalities can alter its behavior in ways that filters designed for text do not detect, because those filters operate on the user's explicit input rather than on what the model extracts from an image while processing it.

Each risk category has its own mechanism and its own defensive-design criteria, but they all share that property: the threat enters through a modality that the system does not analyze with the same tools it uses for text.

A second dimension changes the analysis substantially: the difference between a system that responds and a system that acts. When the system can call tools, modify records, send messages or plan actions over an environment, the error surface and the attack surface grow at the same time.

A successful injection in a system that only generates text produces an incorrect response, but the same injection in a system with tools can trigger an irreversible action. That asymmetry of consequences is why defensive design in multimodality cannot be treated as a minor extension of defensive design for text-only systems.

---

## 1. Visual prompt injection

Prompt injection is an attack in which an attacker places instructions for the model inside content that the model processes as data.

In text-only systems, this means including instructional text in the user's input. In multimodal systems, the instructions can be inside the image itself: a photograph of a document, a screenshot or a product image can contain overlaid or embedded text that the model reads as instructions and follows if it has no mechanism for distinguishing those instructions from data content [Greshake et al., 2023][r1].

This vector is harder to filter than its textual equivalents for several cumulative reasons. Instructions in images do not pass through the system's text filters because they do not exist as text in the input until the model processes them internally, which means that any guardrail applied before inference cannot see them. They can also be visually obfuscated—low-contrast text, rotated text, text integrated into visual patterns—in ways that standard OCR does not detect but the model still interprets, expanding the attack surface without having to bypass any explicit filter. The attacker can also combine visual instructions with normal prompt text to build multi-stage attacks in which the image disables restrictions and the text then exploits that change [Qi et al., 2024][r2][Bailey et al., 2023][r3].

The risk is especially relevant in any system that processes arbitrary documents uploaded by users: invoices, contracts, screenshots and product photographs. In all of those contexts, the content is untrusted and can contain embedded instructions that the system may execute if it is not designed to treat them differently [OWASP][r4][NCSC][r5].

{{ include_html("snippets/multimodalidad-iag/05-prompt-injection-visual.html") }}

The same vector exists in audio. Researchers have shown that it is possible to add imperceptible perturbations to input audio to manipulate audio-language models and force them to generate harmful content or execute malicious instructions even though the human listener never spoke them. WhisperInject documented this effect against audio-language models such as Qwen2.5-Omni: the perturbation is inaudible to humans but bypasses the model's safety protocols with a success rate above 86%, with direct implications for any system that accepts audio as trusted input [2026][r6].

{{ include_html("snippets/multimodalidad-iag/05-whisperinject.html") }}

---

## 2. System leakage and tool manipulation

When a multimodal system has access to tools—API calls, database access, the ability to send messages—visual prompt injection can be used not only to alter the system's response but also to trigger external actions. The image contains instructions that modify the system's behavior (ignore previous instructions, act as though the user had certain permissions, follow an alternative flow) and, once altered, the system executes tools with external effects: sending data to an external URL, deleting records, or generating responses that include content from the system context.

The mechanism works in two phases: the image reconfigures the model's active constraints and, from that point onward, the model acts under that altered configuration using the available tools. This second phase matters especially when the system has extensive system instructions containing configuration information, business logic or user data, because if the attack succeeds in making the model include its system-context content in the response, that information is exposed to the attacker without any output filter necessarily having reviewed it.

Defensive design begins with a least-privilege principle applied to tools: if document processing does not require sending email or modifying database records, those tools should not be available in that context.

The system's output after processing untrusted content should be reviewed before it passes to the next stage of the pipeline, so that a successful injection cannot propagate into irreversible actions.

{{ include_html("snippets/multimodalidad-iag/05-fuga-sistema.html") }}

---

## 3. Privacy: images, documents and metadata

Multimodal systems that process images and documents have access to categories of personal information that text-only systems generally do not handle, and the risk comes not only from external attacks but also from the system's own design when it does not account for the type of data it is ingesting.

An image of an identity document, a photo taken in a private space, a screenshot containing banking information, or a scanned medical document contains sensitive data that should not be stored, processed on unsuitable infrastructure, or included in future training data. The problem is that general-purpose multimodal systems do not always have mechanisms for determining what kind of content they are receiving before they process it.

Image metadata is often ignored even though JPEG images can include EXIF data containing the GPS location where the photo was taken, the device type and the exact time. A system that stores those files without stripping the metadata can therefore extract location information that the user may not have intended to share.

The principle of data minimization applies particularly strongly to multimodal systems: process the image only for the specific task required, do not store it longer than necessary, and do not use it for any secondary purpose without explicit consent.

{{ include_html("snippets/multimodalidad-iag/05-exif-privacidad.html") }}

---

## 4. Data poisoning in systems with continuous learning

When a multimodal system includes some mechanism for continuous learning or for updating its knowledge base from interactions, data poisoning becomes an additional attack surface. The attacker introduces carefully designed content—images or documents—that, when processed and potentially incorporated into the system's learning, changes the representations the model will use in future interactions.

Unlike prompt injection, this attack does not affect a single interaction but the system's long-term behavior, making it harder to detect and more expensive to reverse.

Multimodal retrieval-augmented generation (RAG) systems, in which the system indexes visual documents and retrieves them to answer questions, are especially vulnerable. A malicious document indexed in the knowledge base can be retrieved for questions controlled by the attacker, systematically injecting false information into future answers.

The most effective mitigation is strict separation between the inference pipeline and any mechanism that updates the model or knowledge base. Documents should be reviewed before they are indexed, and documents from untrusted sources should have limited or no access to the system's knowledge base.

{{ include_html("snippets/multimodalidad-iag/05-rag-envenenamiento.html") }}

---

## 5. What changes when the system acts

The four risks above exist in any multimodal system. But when the system can act—using tools, accessing APIs, controlling interfaces or planning steps in an environment—the consequences expand qualitatively, not merely quantitatively.

The first change is **reversibility**. An incorrect response can be ignored or corrected. An action executed against a database, filesystem or external service may not be reversible. Defensive design in tool-using systems has to assume that any successful injection can have persistent consequences, which raises the confidence threshold required before executing any tool with external effects.

The second change is the **attack surface created by composition**. In systems that chain perception with action—observe an image, reason about it, call a tool, use the result to generate the next action—a perceptual error propagates through the entire chain. A manipulated image that produces an incorrect representation can generate a completely wrong sequence of actions, each of which appears locally reasonable given the preceding state.

That propagation effect makes attacks on the perceptual layer much more valuable to an adversary in agentic systems than in understanding-only systems.

{{ include_html("snippets/multimodalidad-iag/05-agencia-propagacion.html") }}

The third change is **attribution**. In a conversational system, the origin of an incorrect response is relatively traceable. In a perception–reasoning–action pipeline in which each step involves different components, a failure may originate in perception, reasoning, tool selection or interpretation of the tool result. That opacity in the causal chain complicates both post-incident diagnosis and assignment of responsibility, with practical implications for the design of logs, alerts and rollback mechanisms.

The defensive-design principle that follows from these three changes is *confinement by stage*: every transition from perception to reasoning to action should include a verification point where the system can evaluate whether the conditions for the next action are coherent with the original input. In practice, that means treating the output of the perception layer as untrusted input before using it to select an action, just as user input is treated as untrusted before being passed to the model.

A fourth change specific to multimodal agentic systems is **hallucinations with action consequences**. In a conversational system, a hallucination produces an incorrect answer that the user can discard. In an agentic system, a perceptual hallucination produces an action on the environment: the model believes it sees an element that is not there, or believes a condition is satisfied when it is not, and acts accordingly. If that action modifies environmental state—a file, a database, a submitted form—the hallucination has produced an irreversible effect that is not necessarily identifiable as such in the system logs.

The **agentic infinite loop** is a structural variant of the same problem: a system that perceives the environment, executes an action, observes the result and decides on the next action can enter a cycle in which each observation reinforces the previous action instead of correcting it, especially if perception of the post-action state is biased by what the system expected to see. Such a cycle does not end because the error is recognized but because resources are exhausted or an external supervision mechanism intervenes, which underlines the importance of iteration limits and stopping conditions in any perception–action loop.

{{ include_html("snippets/multimodalidad-iag/05-alucinacion-accion.html") }}

---

## 6. Demographic bias and regulatory compliance

The security risks of multimodal systems are not limited to active attacks. Vision-language models can encode demographic biases in ways that general-capability benchmarks do not detect. Those biases come from training data, are amplified during alignment with human preferences, and are difficult to identify because general benchmarks do not measure them explicitly.

The European regulatory framework addresses part of this problem directly. The EU AI Act (Regulation 2024/1689) classifies systems by risk and establishes transparency, auditability and bias-evaluation obligations for systems that interact with people or make decisions affecting them [EU AI Act][r7]. Multimodal systems that process images, video or audio of people in high-risk contexts—facial recognition, personnel selection, medical evaluation—fall under the regulation's most demanding categories, with requirements including activity logs, impact assessment and mandatory human oversight. That classification by risk level is the organizing structure the EU AI Act applies to the field and determines which systems can be deployed in the EU without additional conformity requirements.

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
Because malicious instructions travel inside the image as visual content rather than as explicit text in the user's input. Text filters cannot see them because they do not exist as text until the model processes them internally. They can also be obfuscated in ways that standard OCR does not detect but the model still interprets, expanding the attack surface without having to bypass any explicit filter.

**What concrete risk does a hallucination introduce in a system that can act on the environment?**
Unlike a conversational system, where a hallucination produces an incorrect response that the user can discard, a tool-using system that hallucinates can execute an action with irreversible external effects: deleting a record, sending data to a URL or calling an API. If the image that caused the failure is not clearly represented in the logs, the source of the problem is difficult to trace afterward.

**What does it mean for a multimodal system to infer sensitive traits from visual or auditory signals unrelated to those traits?**
It means the model can attribute characteristics such as socioeconomic status or a user's history from cues in an image or audio that do not objectively contain that information. That behavior amplifies stereotypes present in the training data and can lead to automated discriminatory treatment without any explicit human decision.

**What changes in the risk profile when the system not only responds but executes autonomous chained steps?**
The fundamental change is irreversibility: every transition from perception to reasoning to action can propagate an initial error through the entire chain, and every step can produce effects that cannot be undone. The longer the chain of autonomous steps, the greater the probability that a failure in the perception layer propagates and compromises the complete result, because each subsequent step starts from the incorrect state left by the previous one.
