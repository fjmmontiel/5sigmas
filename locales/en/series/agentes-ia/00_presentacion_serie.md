---
title: "AI Agents — from answering to acting"
description: "Five chapters to understand what an AI agent is, how it uses tools, how to evaluate it, which risks it introduces, and what production operation requires."
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

{{ include_html("snippets/series_meta.html", series_dir="agentes-ia", data_state="complete", data_level="technical", status_label="Complete", level_label="Technical", progress_total="5", extra_rows="<div class=\"series-meta-row\"><span class=\"series-meta-label\">Prerequisites:</span> <span class=\"series-meta-value\">Basic LLM and software-system concepts</span></div>") }}

A chatbot generates responses. An agent can **decide a sequence of actions**, use tools, and observe what happened before deciding what to do next.

That does not turn the model into an autonomous entity or remove the need to engineer the surrounding system. Quite the opposite: once a model can read email, query a database, execute code, or mutate a record, text quality is no longer the only concern. State, permissions, evaluation, cost, and stopping behavior become part of the product contract.

This series builds a technical and practical map for separating the hype around agents from the mechanisms that actually make them work.

## Contents

### 1. **What an agent is—and is not**
- Distinguish a chatbot, deterministic workflow, copilot, and agent.
- Move from a model that answers to a system that pursues an objective.
- Understand autonomy as delegating specific decisions, not surrendering control.

### 2. **The anatomy of an agent**
- The observe–plan–act–verify loop.
- Tools, memory, context, state, and runtime.
- Why a tool call is a software contract rather than a magical LLM capability.

### 3. **How to evaluate an agent**
- Reproducible tasks instead of answer-only benchmarks.
- Traces, task success, cost, latency, and failure recovery.
- How an agent can exploit weaknesses in its own evaluation.

### 4. **Security: when reading data becomes acting**
- Direct and indirect prompt injection.
- Least privilege, identity, authorization, and human confirmation.
- Why a single defensive instruction in the prompt is not enough.

### 5. **From demo to an operable system**
- Budgets, limits, retries, idempotency, and observability.
- Asynchronous work and honest proactive completion.
- When a deterministic workflow is the better architecture.

## The thesis of this series

> A reliable agent is not the one that acts most often without asking. It is the one that knows what it is allowed to do, can demonstrate what it did, and knows when to stop.

[View all English series](/en/series/){ .md-button }
