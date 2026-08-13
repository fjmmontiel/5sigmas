---
title: Reasoning Models — test-time compute, chains of thought and systematic failures
description: "Five chapters on how LLMs reason: test-time compute, failure modes, latency, cost and risks when models use tools."
keywords: reasoning models, test-time compute, chain of thought, LLM reasoning, OpenAI o1, DeepSeek R1, RLVR, GRPO, sycophancy, PRM, ORM, AI latency, TTFT, AI overthinking, specification gaming, budget forcing, extended reasoning, LLM failures
date: 2026-04-08
tags:
  - AI
  - LLMs
  - Reasoning
hide:
  - toc
---

# Reasoning Models

{{ include_html("snippets/series_meta.html", series_dir="modelos-razonadores", data_state="complete", data_level="technical", status_label="Complete", level_label="Technical", progress_total="5", extra_rows="<div class=\"series-meta-row\"><span class=\"series-meta-label\">Prerequisites:</span> <span class=\"series-meta-value\"><a href=\"/en/series/fundamentos-ia-iag/00_presentacion_serie/\">AI and Generative AI Foundations</a></span></div>") }}

LLMs can *appear* to reason, but "reasoning" is a deeply human concept. We can nevertheless model it as a **process** made of multiple steps whose execution consumes **physical time** (latency), computational effort (**compute**) and remains fallible (**hallucinations and other failures**).

This series develops one central idea: if reasoning is a process, then execution time is another system variable. You can **pay for more steps**, more samples, more verification or more interaction with tools to **improve answer quality**—but each lever changes cost, latency and failure surface.

## Contents

### 1. **What "reasoning" means for an LLM**
- Which definitions of reasoning can be useful in the context of language models.
- The emergence of explicit reasoning-model product families, with OpenAI o1 as an important inflection point.
- Apple's *The Illusion of Thinking* paper and the subsequent debate and responses.

### 2. **How these systems fail**
- Failure modes are not purely random: shortcuts, systematic errors, objective drift and other recurring patterns.
- Methods for detecting and mitigating these failures.

### 3. **Test-Time Compute**
- Test-time compute as an additional scaling axis for generative AI.
- Levers for exploiting it: more internal steps, more candidate generations and more structure.
- The relationship between higher answer quality, higher cost and higher latency.

### 4. **Physical time: latency, streaming and human interaction**
- "Thinking longer" is cheap in a paper; in a product the user waits, the session costs more and the system gains additional failure points.
- Where the acceptable latency threshold lies for a given task and user.
- Patterns for extracting the benefit of test-time compute without destroying the interactive experience.

### 5. **Risks: overthinking, cost, attacks and alignment**
- Why **more test-time compute** can produce overthinking, unproductive loops and degraded quality.
- Quality vs cost vs latency as a product problem: SLOs, queues, unpredictable bills and user experience.
- New risks with **tools / RAG / browsing**: prompt injection, contaminated context and tool misuse.
- Design criteria: **hard budgets** for time/tokens/tools, **stopping signals**, **verification where critical** and **fallbacks** such as asking for data, degrading gracefully, abstaining or escalating.

---

**Related series:** [AI and Generative AI Foundations](/en/series/fundamentos-ia-iag/00_presentacion_serie/) · [From the Caves to AGI](/en/series/from-cave-to-agi/00_presentacion_serie/)

[View all series](/en/series/){ .md-button }
