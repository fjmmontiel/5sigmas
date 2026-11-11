---
title: Multimodality in Generative AI
description: "What it means to build systems that can perceive, align, reason, generate and act across text, image, audio, video, documents and other signals from the world."
keywords: multimodal AI, multimodal models, CLIP, Flamingo, Gemini, vision language, audio text
date: 2026-04-01
tags:
  - AI
  - GenAI
  - LLMs
  - Multimodality
hide:
  - toc
---
# Multimodality in Generative AI

For a while it was reasonable to describe multimodality as the story of a language model learning to look at images, but that account is now too narrow: the field includes models that combine text, images, video, audio and documents inside a shared representational system.

Gemini was introduced from the beginning as a multimodal family spanning text, audio, image, video and code. Gemini Embedding 2 also turns multimodal embedding into a native primitive across text, images, video, audio and documents. Qwen2.5-Omni pushes streaming multimodal input and output, while PaLM-E reminds us that once robotics or environmental state enters the system, the boundary of the problem moves again.

This series therefore treats multimodality not as an appendix to LLMs or a catalogue of image-text pairs, but as a broader problem: how to preserve evidence from different modalities, align signals when they refer to the same object or event, reason over them without destroying important information, and in some cases produce multimodal outputs or act through tools and the environment.

{{ include_html("snippets/series_meta.html", series_dir="multimodalidad-iag", data_state="complete", data_level="general", status_label="Complete", level_label="General", progress_total="5", extra_rows="<div class=\"series-meta-row\"><span class=\"series-meta-label\">Prerequisites:</span> <span class=\"series-meta-value\"><a href=\"/en/series/fundamentos-ia-iag/00_presentacion_serie/\">AI and Generative AI Foundations</a></span></div>") }}

## Contents

### 1. The real problem: what counts as multimodality
- What a modality is and why text, image, audio, video, documents and sensors behave differently.
- Why "turn everything into text" solves some tasks while throwing away part of the problem.
- What changes when systems move from text-centric designs to multiple input and output modalities.

### 2. Alignment: from pairs to interactions
- How a system learns that two different signals refer to the same object, event or context.
- What changes when alignment is not only image-text, but audio-text, video-audio, document-layout or perception-action.
- Why data structure and data quality matter more than model rhetoric.

### 3. Architectures: shared spaces, connectors and omni models
- Dual encoders, cross-attention, lightweight connectors, interleaved sequences and more unified models.
- The tradeoffs of each family in cost, latency, flexibility and grounding.
- Why multimodal embedding and multimodal generation are not the same layer of the system.

### 4. Evaluation
- Why evaluating multimodality requires more than accuracy on image question answering.
- Grounding, localization, time, documents, audio and heterogeneous output formats.
- What recent benchmarks reveal about the field's actual limits.

### 5. Risks
- Multimodal prompt injection, privacy in documents and images, voice security and tool use.
- What changes when the system does not only answer, but acts.
- Why multimodality expands the attack surface and the error surface at the same time.

---

**Related series:** [AI and Generative AI Foundations](/en/series/fundamentos-ia-iag/00_presentacion_serie/) · [Reasoning Models](/en/series/modelos-razonadores/00_presentacion_serie/)

[View all series](/en/series/){ .md-button }
