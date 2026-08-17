---
title: "AI Agents — from answering to acting"
description: "Five chapters to understand what an AI agent is, how it uses tools, how to evaluate it, which risks it introduces, and what it takes to operate one in production."
date: 2026-07-14
keywords: "AI agents, agentic AI, tool calling, workflows, agent evaluation, prompt injection, agent identity, production AI"
tags:
  - AI
  - Agents
  - Tool Calling
  - Architecture
hide:
  - toc
---

# AI Agents

{{ include_html("snippets/series_meta.html", series_dir="agentes-ia", data_state="complete", data_level="technical", status_label="Complete", level_label="Technical", progress_total="5", extra_rows="<div class=\"series-meta-row\"><span class=\"series-meta-label\">Prerequisites:</span> <span class=\"series-meta-value\"><a href=\"/en/series/fundamentos-ia-iag/00_presentacion_serie/\">AI and Generative AI Foundations</a> · <a href=\"/en/series/modelos-razonadores/00_presentacion_serie/\">Reasoning Models</a></span></div>") }}

A chatbot generates responses. An agent can **decide a sequence of actions**, use tools, observe the result, and decide what to do next.

That does not turn the model into an autonomous entity or remove the need to engineer the surrounding system. Quite the opposite: once a model can read email, query a database, execute code or change a record, the problem is no longer only text quality. State, permissions, evaluation, cost and stopping behavior become part of the system.

This series builds a technical and practical map for separating agent hype from the mechanisms that actually make an agent work.

## Contents

### 1. **What an agent is—and is not**
- Distinguish a chatbot, workflow, copilot and agent.
- Move from a model that answers to a system that pursues an objective.
- Understand autonomy as delegating concrete decisions rather than handing over complete control.

### 2. **The anatomy of an agent**
- The observe–plan–act–verify loop.
- Tools, memory, context, state and runtime.
- Why a tool call is a software contract rather than a magical LLM capability.

### 3. **How to evaluate an agent**
- Reproducible tasks instead of answer-only benchmarks.
- Traces, task success, cost, latency and recovery from failures.
- How an agent can "cheat" its own evaluation.

### 4. **Security: when reading data becomes acting**
- Direct and indirect prompt injection.
- Least privilege, identity, authorization and human confirmation.
- Why a single defensive instruction in the prompt is not enough.

### 5. **From demo to an operable system**
- Budgets, limits, retries, idempotency and observability.
- Asynchronous work and proactive completion without claiming success before the work is finished.
- When a deterministic workflow is the better architecture and when an agent adds real value.

## The thesis of this series

> A reliable agent is not the one that acts most often without asking. It is the one that knows what it is allowed to do, can demonstrate what it did, and knows when to stop.

**Related series:** [AI and Generative AI Foundations](/en/series/fundamentos-ia-iag/00_presentacion_serie/) · [Reasoning Models](/en/series/modelos-razonadores/00_presentacion_serie/) · [Multimodality in Generative AI](/en/series/multimodalidad-iag/00_presentacion_serie/)

[View all series](/en/series/){ .md-button }
