---
title: AI Security — attacks and defenses
description: "A series on how an instruction hidden in a document can influence an AI system, how that risk can persist and which controls constrain actions."
keywords: AI security, prompt injection, LLM jailbreak, AI agents, RAG security, OWASP LLM, AI red teaming
date: 2026-08-06
date_modified: 2026-09-17
tags:
  - AI
  - Security
  - LLMs
hide:
  - toc
---

# AI Security

{{ include_html("snippets/series_meta.html", series_dir="seguridad-ia", data_state="complete", data_level="technical", status_label="Complete", level_label="Technical", progress_total="5", extra_rows="<div class=\"series-meta-row\"><span class=\"series-meta-label\">Prerequisites</span><span class=\"series-meta-value\"><a href=\"/en/series/fundamentos-ia-iag/00_presentacion_serie/\">AI and Generative AI Foundations</a> · <a href=\"/en/series/modelos-razonadores/00_presentacion_serie/\">Reasoning Models</a></span></div>") }}

In software security, a classic defense against [injection](https://cheatsheetseries.owasp.org/cheatsheets/Injection_Prevention_Cheat_Sheet.html) is to prevent untrusted data from changing the syntax or meaning of an instruction executed by an interpreter. That boundary does not solve every attack class, but it does stop that data from becoming control through the same channel. In LLM systems, that separation is no longer sufficient because the system itself consumes [instructions and data through the same medium](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html): natural language.

That changes the risk surface structurally. A document retrieved by RAG, an observation written by another agent, a tool result or a note stored in memory can influence the model as if it were an instruction. [Separating privileges, context and execution](https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html) does not eliminate that influence; it limits which data and actions it can reach if the model follows it.

This series is not a catalogue of new AI security scares. Its goal is to separate mechanisms that are often conflated: which controls reduce the chance that untrusted content changes model behavior, and which controls limit the consequences—accessible data, tools and actions—even when that influence occurs.

{{ include_html("snippets/seguridad-ia/00-series-mapa.html") }}

## Table of contents

### 1. **An instruction hidden in a document can change what the system does**
- What breaks when an LLM processes the control plane and the data plane through the same channel.
- Why indirect injection can be more severe when the system connects untrusted content to tools, data, or privileged actions.
- Which defenses materially change the architecture.

### 2. **Asking the model to ignore its limits**
- How attacks push a model past intended restrictions.
- The difference between an anecdotal bypass and a transferable jailbreak family.
- The role classifiers, streaming guards and rapid response can play.

### 3. **Keeping a dangerous signal inside the system**
- What happens when the system learns, remembers or retrieves content it should not treat as trusted.
- Poisoned RAG stores, agent working memory and persistent backdoors.
- Why removing dangerous knowledge is harder than it appears.

### 4. **Testing the whole path before an incident**
- What security evaluation means for agentic systems rather than isolated prompts.
- What must be tested across pipelines with tools, memory and multiple steps.
- Why a convincing screenshot is not enough to measure a complete causal chain.

### 5. **Limiting what the system can read, change and execute**
- Which defensive architecture makes sense in real systems.
- Where guardrails help and where they do not.
- How to combine policy, sandboxing, human review and telemetry without making the product unusable.

---

**Related series:** [Reasoning Models](/en/series/modelos-razonadores/00_presentacion_serie/) · [AI Agents](/en/series/agentes-ia/00_presentacion_serie/)

[View all series](/en/series/){ .md-button }
