---
title: Prompt injection — when a document can change what the system does
description: "How an instruction hidden in a document can enter an AI system and which controls separate reading from action."
date: 2026-05-26
date_modified: 2026-08-23
keywords: "prompt injection, LLM security, indirect prompt injection, RAG security, AI agent security, dual LLM pattern"
tags:
  - AI
  - Security
  - LLMs
  - Agents
---

# Chapter 1 — Prompt injection

This chapter explains why prompt injection arises from the way LLM systems are built. By the end, the reader will understand what breaks when instructions and data share the same channel, why indirect injection in RAG and agents changes the severity, the limits of filters and post-processing guardrails, and which defensive architecture makes sense when a system can read external content and act through tools.

Traditional software security often relies on a separation. The program has a control plane, where it decides what to do, and a data plane, which holds the material it processes. When that boundary is preserved, many defenses are reasonable because the system knows, at least approximately, which part of the input should be executed and which should only be interpreted.

With an LLM, that boundary becomes blurry. The system prompt, the user's instruction, text retrieved by RAG, a tool output or an observation written by another agent all arrive as natural-language sequences. The model does not receive a hard marker saying “this is control” and “this is data.” It receives tokens and computes the most probable continuation under the complete context.

That is the structural opening for prompt injection. The issue is not a weak model personality or one missing filter; it is that instructions and data travel through the same channel. As long as that condition remains, any untrusted content that reaches context can compete for control of the system.

---

## 1. The problem starts when a document reaches the model

The most common mistake is to treat prompt injection as an exotic version of “write a better system prompt.” That confuses the symptom with the cause.

A better prompt can reduce some obvious failures, but it does not change the important property of the system: the model still processes privileged instructions and external content in the same textual flow. OWASP makes this point directly in its prompt-injection cheat sheet: the vulnerability arises because control language and data are processed together, without a clear separation between the two planes.

{{ include_html("snippets/seguridad-ia/01-control-vs-datos.html") }}

The comparison with SQL injection only helps up to a point. In SQL, the attack exploits unsafe interpolation inside a formal language with strict syntax. In prompt injection, the problem is semantic and probabilistic. The model does not “break” a grammar. It reinterprets the complete context and may prioritize a malicious string over earlier instructions.

That makes the problem harder to contain. Escaping characters is not enough because there is no single delimiter to close and no closed syntax to protect. Adding twenty lines saying “ignore any malicious text” is not enough either, because that command enters the same contextual competition as the malicious text itself.

The practical consequence is simple: if the system reads untrusted content, assume that content is trying to steer the model's decision. Sometimes it will do so explicitly. Other times it will use partial instructions, obfuscation, rewrites of the objective or manipulation of the working context. The underlying mechanism is the same.

---

## 2. The instruction can enter through retrieval

In a simple chat, the attacker still speaks directly to the model. That is already a problem, but the risk remains relatively contained: the malicious input and the effect stay within the same interaction.

The situation changes when the system retrieves external documents or coordinates several steps before responding. In RAG, an agent may read an email, an internal wiki, a PDF or a support note and treat that content as legitimate working material. If a hostile instruction is embedded there, the attack no longer enters through the user's input box. It enters through the supply chain of the system's own context.

That is why recent literature emphasizes the **retrieval barrier**. Indirect injection does not become dangerous merely because it exists, but when malicious content is retrieved and placed inside the top-K that the model will see. The USENIX paper on indirect prompt injection in RAG and agentic systems focuses exactly on this boundary: it splits the attack into a *trigger fragment*, whose job is to guarantee retrieval, and an *attack fragment*, which contains the malicious instruction.

{{ include_html("snippets/seguridad-ia/01-rag-trigger-fragment.html") }}

The reported results show the scale of the risk. That line of work demonstrates fragments of roughly ten tokens capable of forcing near-perfect retrieval across different embeddings and benchmarks, at very low cost per target query. In its most striking experiment, a single poisoned email causes a multi-agent flow with GPT-4o to exfiltrate SSH keys in more than 80% of attempts.

This changes the threat model in two ways. The attacker no longer needs a privileged interactive session with the model; it is enough to contaminate a source the system already considers relevant. Retrieval and orchestration also multiply the damage. The agent that executes a tool may never see the original attack text. It only sees the instruction after another agent or the retrieval layer has normalized it. At that point, the instruction appears to come from a “trusted” part of the pipeline.

Multi-agent systems often look better in a demo than in an audit. Functional separation between agents creates a sense of order, but it also introduces channels where an observation or summary starts being treated as local authority. If one of those observations is contaminated, the rest of the system inherits the contamination with less context for questioning it.

---

## 3. Filtering words does not separate data from instructions

When prompt injection appears, the natural reaction is to add filters: lists of forbidden words, detectors for dangerous instructions, query rewriting, perplexity filters, masking, an extra guardrail layer or an LLM judge. All of these can provide tactical value. The problem is believing they are sufficient.

The first limitation is semantic. An attacker does not need to write “ignore all previous instructions.” The objective can be rephrased, split, obfuscated or hidden inside an apparently innocuous sequence. OWASP lists variants such as typoglycemia, Base64 encoding, or instructions distributed across observations and tool results. None of them requires one perfect static signature to work.

The second limitation is adaptive. The same USENIX work shows that intuitive defenses such as paraphrasing the query, filtering by perplexity or masking tokens produce small improvements that disappear when the attacker optimizes against them. The reason is not mysterious: the defense is still acting on the surface of the text, while the underlying problem remains that the system is willing to grant operational influence to untrusted content if it reaches context.

A third limitation emerges when the system has tools. Then we are no longer talking only about the security of visible output. We are talking about agency. OWASP describes this family as *excessive agency*: the model receives more capability than it needs, and an attacker can redirect it toward actions the developer never intended to allow in that workflow.

The failure mode does not need to be dramatic to matter. An agent designed to read documents can still cause harm if it also has permission to delete files, send emails or execute scripts. At that point, injection stops being a problem of “wrong answer” and becomes a problem of “wrong action with external effects.”

---

## 4. Protection must separate reading from action

Effective defense does not start by writing a stricter prompt. It starts by deciding which part of the system may see untrusted content and which part may act.

One structural defense is privilege separation. The dual-LLM pattern, popularized in practice by Simon Willison and also covered by OWASP, works exactly this way: a quarantined model can read external content but cannot touch tools or sensitive data. The privileged model can act, but it does not read the untrusted content directly. It only receives structured outputs, summaries or labels.

{{ include_html("snippets/seguridad-ia/01-defensa-en-capas.html") }}

That separation does not make the problem trivial, but it breaks the most direct path between hostile text and privileged action. That is the security objective: not an abstract promise of invulnerability, but a clear reduction in the attack path.

The [prompt-injection threat explorer](/en/tools/prompt-injection-threat/) lets you model those end-to-end routes—from untrusted content to data, tools, external egress or persistent memory—and test which architectural boundaries cut each path.

The second useful defense is least privilege. Every tool available to an agent should be justified by the concrete use case and given the smallest possible scope. If the task is to summarize a document, there should not be a path through which that same agent can send emails, delete files or execute arbitrary Python. The smaller the blast radius, the less profitable a successful injection becomes.

A third defense is to enforce boundaries between steps. The output of retrieval, OCR, browsing or an auxiliary agent must be treated as untrusted data before feeding a later decision. That means explicit validation, structured schemas where possible, and human approval points when the next step can produce irreversible harm.

The fourth defense is observability. Guardrails are especially useful when they leave a trace: what they approved, what they blocked, which tool call they aborted, how the alert rate changed and where in the pipeline the deviation occurred. Without that telemetry, the system learns nothing from failed attempts and the next bypass again looks like a surprise.

Specialized classifiers also belong here. Anthropic's work on Constitutional Classifiers is relevant because it demonstrates a pragmatic direction: input and output monitors that can operate in *streaming*, with measurable additional cost, and combined as one layer inside a broader defense-in-depth model. They make sense as one component of a wider system, not as a promise that the problem is solved.

---

## 5. What changes in product

Under this threat model, several product decisions change immediately.

First, security can no longer be evaluated only with direct prompts. You need end-to-end tests with retrieval, tools, memory and multiple steps. The real pipeline matters more than the isolated benchmark because that is where the hostile instruction finds its path toward an action.

Second, retrieved content stops being “knowledge” and becomes “external input.” That forces a review of RAG architectures that are often presented as almost neutral. They are not. Every retrieved document is a package of potential influence over the model.

Third, agents stop being merely a UX improvement. They expand the security perimeter. When a system can observe, decide and execute in sequence, every interpretation error costs more than it would in a chatbot. Not because the model magically becomes more malicious, but because the system has given it more levers.

The practical conclusion is that prompt injection will persist while systems mix control and data in the same channel. A mature response reduces the opportunities for external instructions to gain authority and limits their privileges if they get in.

---

## 6. References

<details markdown="1">
<summary><strong>Core sources</strong></summary>

| Key | Source | Short description |
| --- | --- | --- |
| R1 | **OWASP** — *LLM Prompt Injection Prevention Cheat Sheet* | Explains why the problem arises from mixing instructions and data, and summarizes architectural defenses, validation and least privilege. |
| R2 | **Chang et al. (2025)** — *Overcoming the Retrieval Barrier: Indirect Prompt Injection in the Wild for LLM Systems* | USENIX work on realistic indirect injection in RAG and agentic systems using *trigger fragments*, near-perfect retrieval and end-to-end attacks. |
| R3 | **OWASP Top 10 for LLM Applications 2025** | Operational framework for prompt injection, excessive agency, tool misuse and other vulnerabilities in LLM applications. |
| R4 | **Anthropic (2025)** — *Constitutional Classifiers* | Defense using input/output classifiers, streaming prediction and thousands of hours of red teaming. |
| R5 | **Hubinger et al. (2024)** — *Sleeper Agents* | Shows that malicious behavior activated by triggers can persist after standard safety training. |

</details>

---

## Frequently asked questions

**Is it correct to say that prompt injection is “like SQL injection”?**  
Only in a very general sense: in both cases untrusted data changes system behavior. But the practical difference matters. In SQL injection, the exploit lives inside a formal grammar and can usually be addressed with strict separation between query and parameters. In LLMs the problem is semantic: instructions and data already share the same medium, and the model has no hard boundary between them.

**Why is indirect injection more dangerous than direct prompt injection?**  
Because the attack no longer depends on a frontal interaction with the user and instead hides inside a source the system already considers relevant: an email, a document, a retrieved page or memory written by another agent. At that point, the hostile instruction travels inside the system's own context chain.

**Are guardrails based on another LLM useful?**  
They are useful as an additional layer, not as a substitute for architecture. A guardrail can block obvious cases and improve coverage, but it is still a model processing natural language and therefore shares part of the same attack surface. If the system continues to give broad privileges to the main actor, the guardrail only reduces part of the risk.

**What is the most important defense when an agent uses tools?**  
The combination of least privilege and role separation. The agent that reads untrusted content should not have direct access to destructive or sensitive actions. And the agent that can act should do so over structured inputs and with very limited scopes.
