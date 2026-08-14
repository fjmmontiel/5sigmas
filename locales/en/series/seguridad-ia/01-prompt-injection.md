---
title: Prompt injection — when a document can change what the system does
description: "Why prompt injection follows from mixing instructions and untrusted data, how indirect injection changes RAG and agent risk, and which architectural controls separate reading from action."
date: 2026-05-26
keywords: "prompt injection, LLM security, indirect prompt injection, RAG security, AI agent security, dual LLM pattern"
tags:
  - AI
  - Security
  - LLMs
  - Agents
---

# Chapter 1 — Prompt injection

This chapter explains why prompt injection follows from the way LLM systems are constructed. By the end, you will understand what breaks when privileged instructions and untrusted data share the same channel, why indirect injection through RAG and agents raises the severity, why surface filters are not a complete boundary, and which defensive architecture makes sense when a system can read external content and use tools.

Classic software benefits from a distinction between **control** and **data**. The program has an execution path that defines what to do, while input is treated as material to process. That separation is imperfect in real systems, but it creates a useful security boundary.

An LLM receives system instructions, user text, retrieved documents, tool outputs and observations as language-like context. The model does not receive a formal type system that makes one token sequence intrinsically “control” and another intrinsically “data.” All of them can influence the next generated tokens.

That shared channel is the core prompt-injection problem. A stronger system prompt can reduce obvious failures, but it does not change the underlying fact that untrusted language may enter the same context that drives decisions.

---

## 1. The problem begins when external content reaches the model

Treating prompt injection as a writing-quality problem is a category error. Prompt wording matters, but it does not create a hard privilege boundary.

OWASP frames the vulnerability around the absence of clear separation between instructions and data. The model interprets the complete context semantically; there is no general-purpose escaping mechanism equivalent to parameterized SQL that can make arbitrary natural language incapable of influencing behaviour.

{{ include_html("snippets/seguridad-ia/01-control-vs-datos.html") }}

The analogy with SQL injection is therefore limited. Both involve untrusted input influencing system behaviour, but SQL operates inside a formal grammar with strong parser-level separation available. Prompt injection is semantic and probabilistic: the model may reinterpret apparently ordinary content as relevant instructions.

The practical assumption for production is straightforward:

> **Any external content placed into model context should be treated as untrusted influence, even when the application fetched it automatically.**

That includes webpages, documents, email, search results, OCR output, memory written by another agent and tool responses.

---

## 2. Indirect injection changes the trust path

A direct malicious user message is visible at the interaction boundary. Indirect injection is harder because the instruction can be hidden in a source the system already intends to read.

In a RAG or agent pipeline, a document can enter through retrieval, be summarized by one component, and then affect a later planner or tool-using component. By the time the action is proposed, the component with authority may never see the original untrusted source.

Recent research describes a **retrieval barrier**: hostile content only matters if it is selected and inserted into active context. This means retrieval quality and provenance become part of the security model, not only relevance infrastructure.

{{ include_html("snippets/seguridad-ia/01-rag-trigger-fragment.html") }}

The correct product lesson is not to reproduce a particular attack recipe. It is to recognize the causal chain:

1. untrusted content enters an indexed or reachable source;
2. retrieval places it in model context;
3. the model's decision changes;
4. another component may treat the resulting instruction or summary as trusted;
5. tool authority can turn the changed decision into an external effect.

Multi-agent systems can amplify this problem because summaries and observations cross component boundaries with less original context. Functional decomposition does not automatically create trust separation.

---

## 3. Text filters are useful but not a privilege boundary

Input filters, classifiers, rewriters, output monitors and LLM judges can all reduce attack success. They should be evaluated and kept where they add measurable value.

They are incomplete for three reasons.

**Semantic variation.** Harmful intent does not require one fixed phrase or encoding.

**Adaptation.** A persistent attacker can vary inputs in response to observed outputs and learn which surface checks matter.

**Tool authority.** Even a strong content filter does not answer whether the model is authorized to delete a record, send a message or access a credential.

A production system therefore needs security controls whose correctness does not depend entirely on the model interpreting language as intended.

---

## 4. Separate reading from action

A strong defensive pattern is privilege separation. One component can process untrusted content without access to sensitive tools. A privileged component can decide whether to act, but receives a constrained, validated representation rather than the raw hostile document whenever possible.

{{ include_html("snippets/seguridad-ia/01-defensa-en-capas.html") }}

This does not make the system immune to manipulation. A summary can still be wrong. The benefit is structural: the shortest path from arbitrary external text to privileged action is removed.

### Least privilege

Every tool should have the smallest scope required by the workflow. A document summarizer does not need permission to send email or modify production data merely because those capabilities exist elsewhere in the product.

### Structured boundaries

Outputs crossing from retrieval/OCR/browser/auxiliary agents into decision components should be validated as data. Structured schemas can narrow the possible influence surface, even though they do not guarantee factual correctness.

### Independent authorization

The model may propose an action. The runtime should decide whether that user, resource and operation are authorized. Consequential actions may require deterministic policy or human approval.

### Observability

Security controls are more useful when they leave evidence: what source entered context, what was blocked, which policy denied a tool call and what state remained after aborting.

Specialized classifiers such as Anthropic's Constitutional Classifiers are useful in this role as measurable layers of a broader system, not as proof that prompt injection is solved.

---

## 5. What changes in product design

Once external content is considered untrusted influence, several design choices change.

**Evaluation becomes end-to-end.** Testing only direct prompts misses retrieval, memory, tool and multi-step paths.

**Retrieved content is not authority.** Search relevance means “potentially useful,” not “trusted to govern an action.”

**Agents expand the security perimeter.** Planning plus tools increases the consequence of interpretation failures.

**Safety claims need runtime evidence.** A refusal rate alone says little about whether equivalent effects remain reachable through tools or other components.

The useful framing is therefore not “make the model impossible to manipulate.” It is:

> **Reduce the authority untrusted content can acquire, and bound the consequences when model interpretation fails.**

---

## 6. References

- OWASP — *LLM Prompt Injection Prevention Cheat Sheet*.
- Chang et al. (2025) — *Overcoming the Retrieval Barrier: Indirect Prompt Injection in the Wild for LLM Systems*.
- OWASP — *Top 10 for LLM Applications 2025*.
- Anthropic (2025) — *Constitutional Classifiers*.
- Hubinger et al. (2024) — *Sleeper Agents*.

---

## Frequently asked questions

**Is prompt injection just SQL injection for LLMs?**  
Only at a very high level. SQL has a formal grammar and strong code/data separation mechanisms. LLM prompt injection is semantic: natural-language data and instructions can influence the same inference process.

**Why is indirect injection more serious?**  
Because hostile content can enter through documents, email, web pages, retrieval or another agent rather than through the visible user message, and may propagate toward components with more authority.

**Are LLM-based guardrails useful?**  
Yes, as one measured layer. They should not be the sole boundary protecting sensitive tools or resources.

**What is the most important control for tool-using agents?**  
Least privilege plus independent authorization. The component reading untrusted content should not automatically inherit destructive or sensitive capabilities.
