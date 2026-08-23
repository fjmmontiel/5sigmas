---
title: "What is prompt injection?"
seo_title: "Prompt injection: what it is and how to reduce the risk"
description: "What prompt injection is in LLM systems, why it matters for RAG and agents, and which design principles reduce the risk that external content influences an action."
keywords: "prompt injection, LLM security, indirect prompt injection, RAG security, AI agent security"
date: 2026-08-09
date_modified: 2026-08-23
---

# What is prompt injection?

**Prompt injection** is a security problem in systems built around language models: content that the application intended to treat as data can influence the instructions the model considers relevant. The structural cause is that system rules, conversation, retrieved documents and tool results may all end up represented as natural language inside the same context.

The practical consequence is simple: **reading external information should not give that information authority to govern an action**.

## The 60-second answer

{{ include_html("snippets/seguridad-ia/01-control-vs-datos.html") }}

The model can interpret context. The runtime should decide which content has authority, which tools are available and which actions are allowed.

## Direct and indirect prompt injection

In a **direct injection**, the primary input attempts to change the assistant's objective or rules. In an **indirect injection**, the influence appears inside a source the system consults, such as documentation, a webpage, a message or a tool output.

Indirect injection is especially important in RAG and agent systems because the content can enter through a source the product already uses as input.

## RAG retrieves relevance, not authority

A RAG system selects information because it appears relevant to a query. That selection does not prove that the content is correct, current, authorized or safe to use when deciding an action.

{{ include_html("snippets/seguridad-ia/01-rag-trigger-fragment.html") }}

It helps to separate two questions:

1. Does this document help answer the question?
2. Does this document have authority to change what the system may do?

The second answer should depend on system policy, not on the wording of the document.

The chapter [Prompt injection — when a document can change what the system does](/en/series/seguridad-ia/01-prompt-injection/) develops this architecture with interactive visuals.

## Prompt injection and jailbreaks are not the same thing

{{ include_html("snippets/temas/prompt-injection-taxonomy.html") }}

The categories can overlap, but measuring them separately helps identify which control is actually working.

## Why a stricter prompt is not a security boundary

A clearer system prompt can reduce errors, but it is still natural language interpreted by the model alongside the rest of the context. Filters and classifiers can add coverage, but they should not be the final authority over sensitive operations either.

Stronger defenses come from changing the architecture around the model. The [prompt-injection threat explorer](/en/tools/prompt-injection-threat/) lets you trace paths from untrusted content to sensitive data, tools, external egress or persistent memory and test which architectural boundaries cut each route.

## Defense principles

{{ include_html("snippets/seguridad-ia/01-defensa-en-capas.html") }}

### Treat external content as untrusted

Documents, web content, memory and tool outputs should retain provenance and a trust level.

### Separate reading from acting

The component processing external content does not need to automatically inherit the highest-privilege tools.

### Apply least privilege

Each tool should expose only the operations required for the task and with the smallest possible scope.

### Authorize outside the prompt

User, resource, operation and permissions should be checked by runtime logic before producing an external effect.

### Confirm when impact justifies it

Irreversible or high-impact actions need an additional boundary, such as specific approval or a deterministic policy.

### Preserve traceability

Observability should make it possible to reconstruct which information entered the system, which decision was proposed, which policy was applied and what the final state became.

## How to evaluate a system

A useful evaluation reproduces the real path and separates several stages: external input, retrieval, decision change, proposed tool use, authorization and final effect. That makes it possible to identify where the risk is contained: during retrieval, by policy, or immediately before an operation executes.

{{ include_html("snippets/seguridad-ia/04-causal-chain.html") }}

[Red teaming — test the complete path before the incident](/en/series/seguridad-ia/04-red-teaming/) develops this end-to-end evaluation approach.

## Where to go deeper in 5sigmas

- [Complete AI Security series](/en/series/seguridad-ia/00_presentacion_serie/)
- [Prompt injection](/en/series/seguridad-ia/01-prompt-injection/)
- [Jailbreaks](/en/series/seguridad-ia/02-jailbreaks/)
- [Poisoning and memory](/en/series/seguridad-ia/03-envenenamiento/)
- [Red teaming](/en/series/seguridad-ia/04-red-teaming/)
- [Production controls](/en/series/seguridad-ia/05-controles-produccion/)
- [Agent security](/en/series/agentes-ia/04-seguridad-agentes/)

## Frequently asked questions

### Is prompt injection the same as SQL injection?

Only as a broad analogy. SQL has a formal grammar and a technical separation between query structure and parameters. In LLM systems the problem is semantic: instructions and data can share the same natural-language representation.

### Does using a delimiter eliminate prompt injection?

It can help structure context, but it does not create an authorization boundary by itself. Permissions and sensitive decisions should still live outside the model.

### Does RAG automatically make a system safer?

No. RAG can improve traceability and provide external evidence, but it also introduces new content sources whose provenance and trust controls must be preserved.

### Are tools the problem?

No. Tools are what make the system useful. Risk depends on how their contracts, scopes, validation, authorization and observability are designed.