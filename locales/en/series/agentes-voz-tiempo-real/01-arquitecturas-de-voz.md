---
title: "Voice architectures: where the text boundary lives"
description: "Full cascade, audio-native with external TTS, speech-to-speech, and full-duplex are not four equivalent labels. This chapter separates modality, interaction, and orchestration so the architecture can be chosen against observable constraints."
date: 2026-09-07
date_modified: 2026-09-07
keywords: "voice agent architectures, full cascade, half cascade, speech to speech, full duplex, STT LLM TTS, realtime voice"
tags:
  - AI
  - Voice
  - Architecture
  - Realtime
  - Agents
---

# Chapter 1 — Voice architectures: where the text boundary lives

A voice agent has to solve three different problems: **understand audio, decide what to do, and produce audio**. The architecture changes depending on where those responsibilities are separated and which representation crosses each boundary.

The comparison is often reduced to *cascade vs speech-to-speech*, but that mixes concepts from different layers. **Full cascade, audio-native with text output, and speech-to-speech describe where text enters the path. Full-duplex describes whether the system can listen and speak at overlapping times.** A speech-to-speech system can still be strictly turn-based; a cascade can support streaming and interruptions without becoming S2S.

That distinction is the mental model for this chapter: first locate the text boundary, then ask how turns are coordinated.

{{ include_html("snippets/articulos-tecnicos/voice-arch-map.html") }}

## Three modality architectures

### 1. Full cascade: audio → STT → LLM → TTS → audio

A conventional full cascade exposes a contract at every stage:

```text
user audio
→ activity / end-of-turn detection
→ STT
→ text
→ LLM + tools
→ response text
→ TTS
→ audio to the user
```

LiveKit documents this as one of the two main families for building voice agents: a pipeline of specialized STT, LLM, and TTS models, or a direct realtime model.[^livekit-voice]

Its main advantage is not simplicity. A production cascade can become a complicated distributed state machine. The advantage is that **its boundaries are visible**: the transcript can be retained, the TTS can be replaced independently, each stage can be timed, and text-level controls can run before speech is synthesized.

That makes a full cascade particularly useful when the product needs:

- Independent provider choice by language or market.
- A specific TTS for voice identity or pronunciation control.
- Textual inspection of inputs, tool calls, and responses.
- Per-stage optimization and replacement.
- The ability to isolate failures and decide which component to retry, cancel, or replace.

The cost of that modularity is coordination. The STT may still be revising a hypothesis while the LLM has started generating; the TTS may have audio queued when the user interrupts; a tool may continue running after the spoken response has been cancelled. Perceived latency is therefore not just the sum of three model calls.

A useful first approximation is:

```text
T_first_audio ≈
    T_turn_detection
  + T_STT
  + T_model_first_output
  + T_TTS_first_audio
  + T_transport
  + T_playback_buffer
```

The [voice-agent latency budget explorer](/en/tools/voice-latency-budget/) turns that decomposition into an explicit operating budget. The latency chapter in this series will go further and separate work that can overlap from stages that truly block the next one.

### 2. Audio-native input with text output + external TTS

There is no universal definition of *half cascade*. In 5sigmas, the term is only shorthand for this specific contract:

```text
user audio
→ realtime model that understands audio directly
→ streaming response text
→ external TTS
→ audio to the user
```

The difference from a full cascade is on input: the conversational model no longer depends on a transcript as the only representation of the user's turn. The difference from S2S is on output: **speech still sits behind a text boundary**.

Current realtime models can accept audio and produce either text or audio. For example, `gpt-realtime` declares text and audio input/output, function calling, and Realtime transport over WebRTC, WebSocket, or SIP.[^openai-realtime-model] That capability supports an audio-in/text-out design even when the product deliberately keeps a separate TTS.

This architecture is useful when the acoustic signal matters to understanding but the product still needs a specialized synthesizer. Its central trade-off is easy to miss: **prosodic information may reach the model and then be discarded again at the text output boundary**.

If the user sounds rushed or frustrated and the model emits only:

```text
I understand. I'll check it.
```

the TTS still needs its own mechanism for pace, energy, or emphasis. The architecture does not automatically preserve expressive intent across that boundary.

Treat the text between the model and the TTS as an explicit contract rather than a plumbing detail. Plain text may be enough; the contract may carry style instructions; or the synthesizer may derive expression from broader context. That choice should be evaluated with recorded audio, not assumed from the diagram.

### 3. Speech-to-speech: audio → model → audio

In speech-to-speech, the conversational path does not require an intermediate text representation between understanding and generation:

```text
user audio
→ speech-to-speech model
→ agent audio
```

OpenAI describes the Realtime API as a way to stream audio inputs and outputs directly, and notes that an ASR → text model → TTS pipeline can lose emotion, emphasis, and accents while also adding latency.[^openai-realtime-intro] Google Live API likewise provides persistent bidirectional realtime sessions with audio input and native audio output over WebSocket.[^gemini-live]

Fewer modality boundaries can improve conversational timing and remove some of the reconciliation work between STT, LLM, and TTS. But **speech-to-speech does not remove the rest of the system**. The runtime still needs state, tools, permissions, traces, cancellation, idempotency, observability, and a precise record of which audio was actually played to the user.

Realtime models can also call tools. `gpt-realtime` exposes function calling, while Gemini Live expects the application to execute a requested function and send its result back into the session.[^openai-realtime-model][^gemini-tools] Business execution therefore remains an application boundary even when the acoustic path is more integrated.

## Full-duplex is a separate axis

**Full-duplex means input and output can be active at overlapping times.** It does not simply mean that the model accepts audio and returns audio.

A turn-based S2S system can still behave like this:

```text
user speaks → wait → agent speaks → wait → user speaks
```

A full-duplex system can keep both directions active and continuously decide whether to listen, respond, pause, interrupt, or produce a backchannel. GPT-Live, for example, is explicitly described as a full-duplex architecture that processes input while generating output and makes interaction decisions many times per second.[^gpt-live]

This distinction is not limited to one commercial implementation. Moshi models the user's speech and the assistant's speech as parallel streams, specifically to handle overlapping speech, interruptions, and interjections without relying on explicit turn segmentation.[^moshi]

{{ include_html("snippets/articulos-tecnicos/voice-arch-duplex.html") }}

The practical consequence is that **modality and interaction should be evaluated separately**:

| Question | Full cascade | Audio-native + TTS | Speech-to-speech |
|---|---|---|---|
| Where is text mandatory? | Between STT, LLM, and TTS | Before TTS | It may be absent from the main acoustic path |
| Can the voice change without changing the conversational model? | Yes | Yes | Depends on the provider/model |
| Does the conversational model receive the original acoustic signal? | No, unless a separate channel carries it | Yes | Yes |
| Are transcript and response text natural first-class artifacts? | Yes | Yes on output | They may be derived |
| Can it be full-duplex? | In principle, with more coordination | In principle | Best fit, but not guaranteed by S2S alone |

The last row removes the most common category error: **S2S and full-duplex are not synonyms**.

The table summarizes **design tendencies**, not behavioral guarantees. A provider can add transcripts, voice controls, or better interruption handling to any of these families. The decision still has to be validated on the specific model, transport, TTS, and runtime that will operate the product.

## What each architecture tends to favor

There is no universal winner. A useful architecture decision starts by asking which product property you are least willing to degrade.

{{ include_html("snippets/articulos-tecnicos/voice-arch-decision.html") }}

### Full cascade favors modularity and auditability

It is a strong baseline when the transcript must be a first-class artifact, the product depends on a specific TTS, providers need to be interchangeable by stage, or operational controls are easiest to express on text.

### Audio-native + TTS favors acoustic understanding and voice control

It fits when the model should hear the original signal but the product still needs an external voice, pronunciation controls, or an explicit textual boundary before speech is produced.

### Speech-to-speech reduces boundaries and favors acoustic continuity

It is a strong starting point when conversational rhythm, interruptions, and expressiveness matter more than independent replacement of every stage. In return, the system has to instrument the session more carefully and keep track of what the user actually heard.

## A reproducible way to choose

Before choosing an architecture, prepare the same set of conversations and run each candidate against the same task outcome. Do not compare only happy-path demos.

Include at least:

- Users who interrupt themselves and correct information mid-turn.
- Noise, accents, and different speaking rates.
- Names, numbers, and alphanumeric codes.
- Fast tools and slow tools.
- Responses that must be cancelled during playback.
- Partial failures in STT, model, TTS, or network transport.
- Sessions long enough to expose state-management problems.

Then measure separate properties rather than one average latency:

```text
turn_detection_delay_ms
speech_stop_to_first_audio_ms
barge_in_to_agent_silence_ms
tool_argument_accuracy
task_success_rate
entity_preservation_rate
voice_consistency
cost_per_successful_minute
```

The goal is not to prove that one architecture is newer. It is to determine **which system keeps the conversation usable and completes the task under the constraints your product actually has**.

## What to remember

- Full cascade, audio-native + TTS, and speech-to-speech describe modality boundaries.
- *Half cascade* is not a standard term; here it means the specific audio-in → text-out → TTS contract defined above.
- Speech-to-speech does not imply full-duplex.
- Full-duplex describes temporal overlap and interaction control, not how many models are in the stack.
- Removing modality boundaries does not remove tools, state, permissions, traces, or recovery logic.
- The right architecture depends on what you want to protect: modularity, voice control, acoustic signal, timing, auditability, or portability.

The deeper [voice-agent architecture engineering note](/en/articulos-tecnicos/voice-agent-architectures/) explores streaming contracts, prosody, and a possible separation between the conversational surface and an execution plane. The next chapters in this series will isolate turn-taking, latency, tools, transport, and evaluation instead of mixing them into one comparison.

## References

[^livekit-voice]: LiveKit, [Voice AI quickstart](https://docs.livekit.io/agents/start/voice-ai/). Documents STT–LLM–TTS pipelines and direct realtime models as first-class alternatives.
[^openai-realtime-model]: OpenAI, [GPT-Realtime model](https://developers.openai.com/api/docs/models/gpt-realtime). Text/audio modalities, Realtime transports, and function calling.
[^openai-realtime-intro]: OpenAI, [Introducing the Realtime API](https://openai.com/index/introducing-the-realtime-api/). Describes the ASR → text model → TTS pipeline, loss of acoustic cues, and direct audio streaming.
[^gemini-live]: Google, [Get started with Gemini Live API](https://ai.google.dev/gemini-api/docs/live-api/get-started-sdk). Persistent sessions with realtime audio input and native audio output.
[^gemini-tools]: Google, [Tool use with Live API](https://ai.google.dev/gemini-api/docs/live-api/tools). Function-calling contract and explicit tool-result delivery back into the session.
[^gpt-live]: OpenAI, [Introducing GPT-Live](https://openai.com/index/introducing-gpt-live/), July 8, 2026. Full-duplex architecture and separation between continuous interaction and deeper work.
[^moshi]: Défossez et al. (2024), [Moshi: a speech-text foundation model for real-time dialogue](https://arxiv.org/abs/2410.00037). Full-duplex spoken dialogue with parallel user/assistant streams and no explicit turn segmentation.