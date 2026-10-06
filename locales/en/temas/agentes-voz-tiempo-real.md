---
title: "Realtime voice agents"
seo_title: "Realtime voice agents: architecture, turn-taking, latency and evaluation"
description: "What a realtime voice agent is, how to design its audio path, turn-taking, latency, tools, telephony and evaluation, with 5sigmas guides and interactive tools."
keywords: "realtime voice agents, voice agents, speech to speech, turn taking, voice latency, barge in, WebRTC, SIP, STT, TTS"
date: 2026-09-16
date_modified: 2026-09-16
---

# Realtime voice agents

A **realtime voice agent** is a system that maintains a spoken conversation while coordinating incoming audio, turn detection, inference, outgoing audio and external actions under time constraints. It is not simply a chatbot with STT and TTS: the runtime must decide **when to listen, when to respond, what can be interrupted, and which operations remain active after the conversational turn changes**.

The useful unit of design is the complete system. Natural speech does not compensate for slow endpointing; a fast model does not fix a long playback queue; stopping audio does not automatically cancel a reservation, payment or any other tool that has already executed.

## The 60-second answer

A reliable voice agent separates at least six problems:

1. **Modality path.** It may use a cascade `audio → STT → LLM → TTS → audio`, an audio-in/text-out model with external synthesis, or a speech-to-speech architecture.
2. **Turn-taking.** Detecting speech activity is not the same as deciding that the user has finished. Endpointing, interruption and resumption need explicit state.
3. **Latency budget.** Time to first audio and interruption recovery should be measured on the real critical path, not by adding incompatible dashboard metrics.
4. **Tools and state.** Conversation and external operations have different lifecycles. A durable action needs an identifier, state, idempotency and explicit cancellation semantics.
5. **Transport.** WebRTC, WebSocket, SIP and telephony introduce different buffers, jitter, transcoding and boundaries. Bidirectional transport alone does not imply a full-duplex conversation.
6. **Evaluation.** The final answer is insufficient: turns, actually played audio, interruptions, latency, tools, failures, recovery and final state all need to be observable.

## Voice architectures: where the text boundary lives

The first decision is which representation crosses each component. A **full cascade** keeps explicit boundaries between recognition, reasoning and synthesis; an **audio-in/text-out + TTS** architecture removes the requirement for an external ASR to be the only input while retaining a textual output boundary; a **speech-to-speech** system can model input and output audio without requiring an exposed text-only boundary between understanding and synthesis.

Those families do not determine simultaneity by themselves. **Speech-to-speech and full duplex are different axes**: the first describes modalities; the second describes what the system can listen to, process and produce while it is already speaking.

The engineering guide [Voice-agent architectures: cascade, speech-to-speech and full duplex](/en/articulos-tecnicos/voice-agent-architectures/) compares the three families, including control, streaming, tools and observability. [Chapter 1 of the series](/en/series/agentes-voz-tiempo-real/01-arquitecturas-de-voz/) turns the same decision into a practical design starting point.

## Turn-taking: the problem does not end with VAD

A voice activity detector can indicate that a signal looks like speech. The runtime still has to decide whether that signal opens a turn, whether a pause closes it, whether the user interrupted the agent or whether the signal was only brief noise.

It is therefore useful to separate **acoustic signal**, **turn decision** and **interaction policy**. A system can have good VAD and still cut users off too early or wait too long before responding.

[Turn-taking: detecting speech is not deciding the turn](/en/series/agentes-voz-tiempo-real/02-turn-taking/) develops endpointing, interruptions and conversation states without treating one millisecond threshold as a universal constant.

## Latency: measure the critical path to useful audio

The latency users perceive is not isolated "LLM latency". Time to first audio may include transport, end-of-turn decision, STT or acoustic encoding, inference, TTS, buffering and playback. Some stages overlap; others are serial.

The [voice-agent latency budget explorer](/en/tools/voice-latency-budget/) lets you vary those components and separate **time to first audio**, **barge-in** and overlap assumptions. [Chapter 3](/en/series/agentes-voz-tiempo-real/03-presupuesto-latencia/) explains how to turn a component diagram into a measurable critical-path budget.

## Tools and state: interrupting speech does not undo external effects

A conversation can move on while a tool is still executing. If the user changes a date after a reservation has started, the system needs to know whether the operation is pending, confirmed, cancelable, compensable or already irreversible.

A robust contract separates at least:

- `turn_id`: which turn originated the intent.
- `operation_id`: which durable operation was started.
- execution state: requested, accepted, completed, failed or canceled.
- idempotency: how to avoid duplicating an effect after a retry or reconnect.
- interruption policy: what can stop playback, inference and the tool.

[Tools and state: executing actions without breaking the conversation](/en/series/agentes-voz-tiempo-real/04-tools-estado-acciones-asincronas/) develops that lifecycle. [Reactive and proactive voice agents](/en/articulos-tecnicos/reactive-proactive-voice-agents/) connects acoustic activity, playback, barge-in and asynchronous operations.

## WebRTC, SIP and telephony: follow the audio end to end

WebRTC and SIP solve different layers. WebRTC defines realtime communication capabilities between endpoints; SIP is a signaling protocol for establishing, modifying and terminating sessions. Telephony adds carriers, media gateways, codecs, jitter buffers and possible transcoding.

[Chapter 5](/en/series/agentes-voz-tiempo-real/05-webrtc-sip-telefonia-red/) follows that path so latency introduced by the network or media pipeline is not incorrectly attributed to the model.

## Capacity and cost: a fast conversation still has to scale

A demo may work with one call and fail when concurrency, provider limits and billable minutes multiply. The [voice-agent cost and capacity planner](/en/tools/voice-cost-capacity/) separates connected calls, STT/TTS audio, tokens, workers and provider concurrency to estimate monthly cost and capacity.

That keeps two different questions separate: **does it respond fast enough?** and **can it sustain the expected load within budget?**

## How to evaluate a voice agent

A useful evaluation preserves evidence per turn and per operation. At minimum, it should be able to answer:

- what audio the system actually received.
- when it decided that the user had finished or interrupted.
- what output it generated and which part was actually played.
- which tools were proposed, authorized and executed.
- what latency occurred at each relevant boundary.
- whether an interruption left obsolete work running.
- what the final task state was and whether recovery occurred.

[Evaluating a voice agent: turn-level evidence, observability and reliability](/en/series/agentes-voz-tiempo-real/06-evaluacion-observabilidad-reliability/) turns those signals into a reproducible evaluation contract.

## Learning path in 5sigmas

1. [Voice architectures](/en/series/agentes-voz-tiempo-real/01-arquitecturas-de-voz/): decide where modality boundaries live.
2. [Turn-taking](/en/series/agentes-voz-tiempo-real/02-turn-taking/): separate acoustic signal from conversational decisions.
3. [Latency budget](/en/series/agentes-voz-tiempo-real/03-presupuesto-latencia/): measure the critical path.
4. [Tools and state](/en/series/agentes-voz-tiempo-real/04-tools-estado-acciones-asincronas/): govern durable actions and cancellation.
5. [WebRTC, SIP and telephony](/en/series/agentes-voz-tiempo-real/05-webrtc-sip-telefonia-red/): locate transport, buffers and network effects.
6. [Evaluation and observability](/en/series/agentes-voz-tiempo-real/06-evaluacion-observabilidad-reliability/): test the system per turn and per operation.

For hands-on numbers, use [Voice-agent latency](/en/tools/voice-latency-budget/) and [Voice-agent cost and capacity](/en/tools/voice-cost-capacity/). To compare complete architectures, open [the cascade, speech-to-speech and full-duplex guide](/en/articulos-tecnicos/voice-agent-architectures/).

## Frequently asked questions

### Does a speech-to-speech voice agent always have lower latency?

No. It can remove or overlap boundaries that exist in a cascade, but real latency depends on the model, streaming, endpointing, network, buffering and playback. Architectures must be measured with the same start and end definitions.

### Does WebRTC make a voice agent full duplex?

No. WebRTC enables bidirectional realtime communication, but the runtime and model still determine whether the system can listen, update state and produce output while playback is active.

### Does barge-in mean canceling the tool that was running?

No. Barge-in usually describes interrupting spoken output. An external operation needs its own cancellation or compensation semantics, and some already-executed actions cannot be undone.

### What should I measure first in production?

Start with task success, time to first audio, turn-taking errors, interruptions, actually played audio, tool state and recovery. Then segment by language, media route, provider and task type to locate the real cause.

## Primary sources and standards

- [OpenAI — Build more natural voice experiences with GPT-Live-1 in the API](https://openai.com/index/introducing-gpt-live-1-in-the-api/)
- [OpenAI — Realtime API](https://platform.openai.com/docs/guides/realtime)
- [W3C — WebRTC 1.0: Real-Time Communication Between Browsers](https://www.w3.org/TR/webrtc/)
- [IETF — RFC 3261: SIP: Session Initiation Protocol](https://www.rfc-editor.org/rfc/rfc3261)
- [LiveKit — Turns overview](https://docs.livekit.io/agents/logic/turns/)
- [Pipecat — Pipeline fundamentals](https://docs.pipecat.ai/guides/learn/pipeline)
