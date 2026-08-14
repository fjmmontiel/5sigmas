---
title: Technical Articles
description: "Production engineering notes on realtime AI systems, voice agents, tool calling, latency, orchestration and reliability."
---

# Technical Articles

Deep technical notes focused on the contracts that make AI systems reliable in production: realtime interaction, asynchronous work, tool execution, voice timing, observability and architecture trade-offs.

## Realtime agents and tool timing

- [**Proactive and reactive agents and tool calls**](./proactive-reactive-agent-and-tool-calls.md) — why a model turn should not be the clock that governs asynchronous tools; acceptance, durable work and proactive delivery as separate state machines.
- [**Reactive–proactive voice agents**](./reactive-proactive-voice-agents.md) — how to keep a spoken conversation alive while slow work continues, then deliver results without interrupting the user or duplicating effects.
- [**Three architectures for voice agents**](./voice-agent-architectures.md) — full cascade vs half cascade vs speech-to-speech, including prosody, latency, barge-in, tools and the hybrid S2S-surface architecture.

## Reading order

Start with **Proactive and reactive agents and tool calls** for the general asynchronous runtime. Continue with **Reactive–proactive voice agents** for the interaction/delivery problem. Finish with **Three architectures for voice agents** to compare the modality stack itself.

The articles intentionally separate **technical completion** from **human-visible delivery**. That separation is the recurring design rule across all three notes.
