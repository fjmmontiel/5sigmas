---
title: "Voice architectures: where the text boundary lives"
description: "Full cascade, audio-native with external TTS, speech-to-speech, and full-duplex are not four equivalent labels. This chapter separates modality, interaction, and orchestration so the architecture can be chosen against observable constraints."
date: 2026-09-07
date_modified: 2026-09-08
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

If the measurement starts when the user stops speaking and ends at the first playable audio, adding `T_STT + T_LLM + T_TTS` as though every stage were serial can count work twice when it already happened or overlaps. In a streaming pipeline, STT can emit interim hypotheses while the user is still speaking, the runtime can start generation once it has the turn and text it needs, and TTS can synthesize the first chunks while the model continues generating. LiveKit's current pipeline architecture explicitly describes this overlap across stages.[^livekit-streaming-pipeline]

A more faithful decomposition is to trace the **critical path** from speech stop to playable audio:

```text
speech_stop_to_first_audio_ms
= duration of the critical path through:
  turn commit / endpointing
  residual STT finalization, if any work remains
  model → first text sufficient to speak
  TTS → first playable audio
  transport + playout buffer
```

*Residual* is the important word: if STT already ran during the turn, that earlier latency should not be added again after `speech_stop`. Likewise, full LLM generation does not block first audio when TTS consumes streamed text. Because the exact overlap depends on the runtime and providers, measure timestamps from the same turn and reconstruct the critical path instead of adding headline latency numbers from isolated components.

The [voice-agent latency budget explorer](/en/tools/voice-latency-budget/) turns that decomposition into an explicit operating budget. The latency chapter in this series will go further and separate work that can overlap from stages that truly block the next one.

### 2. Audio-native input with text output + external TTS

*Half-cascade* is not a formal standard, but the term is now used in production frameworks. LiveKit, for example, defines a *half-cascade* as a realtime model that understands speech and returns text, paired with a separate TTS for output.[^livekit-pipelines] This series uses the term in exactly that sense:

```text
user audio
→ realtime model that understands audio directly
→ streaming response text
→ external TTS
→ audio to the user
```

The difference from a full cascade is on input: the conversational model no longer depends on a transcript as the only representation of the user's turn. The difference from S2S is on output: **speech still sits behind a text boundary**.

This architecture only exists when the realtime provider supports a text-only response modality. LiveKit states that requirement explicitly and warns that provider support varies.[^livekit-pipelines] In OpenAI Realtime, the session contract accepts `output_modalities: ["text"]`, which requests a text-only response; text and audio cannot be requested together for the same response.[^openai-realtime-output-modality] `gpt-realtime-2.1` also declares text/audio input and output plus function calling.[^openai-realtime-model] OpenAI deprecated the older `gpt-realtime` on July 20, 2026 and recommends `gpt-realtime-2.1` before its January 20, 2027 API shutdown.[^openai-realtime-deprecation] This establishes the prerequisite for that specific provider; it should not be generalized to every realtime model.

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

Realtime models can also call tools. `gpt-realtime-2.1` exposes function calling, while Gemini Live expects the application to execute a requested function and send its result back into the session.[^openai-realtime-model][^gemini-tools] Business execution therefore remains an application boundary even when the acoustic path is more integrated.

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

## A second decision: how much runtime do you want to own?

Choosing cascade, half-cascade, or S2S does not decide who implements the runtime. **LiveKit Agents, Pipecat, and a thin direct Python implementation operate at a different layer**: they connect media, models, turn-taking, tools, state, and lifecycle. Any of the three can participate in more than one modality architecture, depending on the providers behind it.

LiveKit Agents makes `AgentSession` the session orchestrator and connects the agent to participants through LiveKit's realtime infrastructure. The framework includes voice-pipeline, turn-detection, interruption, and worker-lifecycle abstractions; agent servers exchange capacity, isolate jobs in separate processes, and can redispatch a session if a worker disappears.[^livekit-agents][^livekit-session][^livekit-server-lifecycle] **That does not make every LiveKit Cloud feature a framework feature.** The Agents framework and SIP can be self-hosted, while managed agent hosting, built-in observability, and other operational surfaces belong to LiveKit Cloud.[^livekit-self-hosting]

Pipecat models the runtime as a sequence of `FrameProcessor`s carrying audio, text, control, and lifecycle frames. The transport is pluggable: its current docs include WebRTC through Daily or LiveKit, SmallWebRTC, and WebSocket for controlled or telephony-oriented paths.[^pipecat-pipeline][^pipecat-transports] Turn management, interruptions, function calling, metrics, and OpenTelemetry are exposed as configurable pipeline primitives.[^pipecat-turns][^pipecat-tools][^pipecat-metrics] **That does not mean Pipecat itself provides a global WebRTC network or a telephone carrier.** Those properties come from the selected transport and service.

With thin or vanilla Python, the runtime still does not disappear: **vanilla means you are not delegating orchestration to this kind of agent framework; it does not mean implementing WebRTC or SIP from scratch**. Two cases need to be separated. On a provider-direct path, the browser can carry audio over WebRTC straight to the realtime provider endpoint while the backend authenticates the user, enforces policy, and owns tools/business state; OpenAI explicitly documents this split between direct WebRTC audio and separate server-side controls.[^openai-realtime-transport] On a lower-level path, the server can own audio over WebSocket, RTP/SIP, or another transport and therefore take on more buffering, packetization, and media lifecycle. In both cases, the application still owns every contract it does not delegate: turn-taking, cancellation, state, tools, retries, reconnect, backpressure, observability, replay/testing, security, and scaling. WebRTC standardizes hard pieces such as ICE/NAT traversal, DTLS/SRTP, codec negotiation, RTCP, echo cancellation, and jitter buffering; who operates them depends on the selected media endpoint.[^openai-webrtc-scale]

### Runtime decision matrix

| Criterion | LiveKit Agents | Pipecat | Thin / vanilla Python |
|---|---|---|---|
| Abstraction boundary | Agent/session inside rooms + worker lifecycle | Frame pipeline + processors + selected transport | Provider events/protocol + your own primitives |
| Media and transport | WebRTC as the primary path; SIP/telephony in the LiveKit ecosystem | Daily, LiveKit, SmallWebRTC, WebSocket, and serializers depending on the case | Provider-direct WebRTC, carrier Media Streams/WebSocket with carrier-defined codec/control contract, or your own SIP/RTP; no agent framework, but the endpoint determines media ownership |
| Pipeline / modality | STT→LLM→TTS, realtime/S2S, and half-cascade when the selected realtime model supports text-only output; swapping a plugin/provider does not normalize audio, events, tools, or turn semantics, and full duplex still depends on the model, transport, and cancellation policy | Composable `FrameProcessor` pipeline for cascaded and S2S/realtime designs; half-cascade only when the selected service/model exposes the required modes and events and the pipeline wires them explicitly; provider swaps can still require changes to frames, audio, tools, and turn handling[^pipecat-cascade-s2s] | Can implement cascade, half-cascade, S2S, or full duplex when the application owns the required protocol contracts; maximum control means maximum ownership |
| Turns, cancellation, tools | `AgentSession` provides turn handling, interruption, events, and tools | Turn strategies, `InterruptionFrame`, cancellation, and function calling are configurable | Your contracts; maximum control and maximum correctness surface |
| Reliability / flow control | `Agent Fallback Adapter` runs STT/TTS/LLM fallback in the agent process; `Inference Fallback Adapter` lives in LiveKit Inference and covers STT/TTS. The in-process adapter does not switch TTS after audio has been pushed or restart an LLM response after text/tool calls have streamed; the managed adapter can restart the request from the beginning after a mid-stream failure. `AgentSession` emits `ErrorEvent`, and `error.recoverable` distinguishes automatic recovery from terminal failure[^livekit-fallback][^livekit-errors] | `CancelFrame`, upstream `ErrorFrame`, and per-processor queues are core primitives; retry/failover and queue bounds or drop/block/coalesce policies remain processor-, transport-, service-, and application-specific rather than one framework-wide guarantee[^pipecat-frame-processor] | You define queue bounds and policy, retry/tool idempotency, cancellation propagation, partial-output rules, error classification, and failure-domain isolation |
| Observability and replay | SDK metrics/data hooks; Cloud adds timeline, traces, and recordings | Metrics frames, observers, and OpenTelemetry; storage/replay remains your design | Instrumentation, correlation IDs, played-audio accounting, and replay are application responsibilities |
| Testing / evals | Text-based local/CI tests; text or audio conversational simulations on LiveKit Cloud; audio exercises STT/LLM/TTS and can degrade input | Pipecat Evals: text/audio scenarios over an eval transport; audio exercises STT/LLM/TTS, not the production transport | You design and maintain the harness, fixtures, fakes, replay, and judges |
| Deployment and failures | Worker capacity, job isolation, and draining are integrated; Cloud can manage hosting | Runner/pipeline lifecycle; hosting depends on your runtime or Pipecat Cloud | You define isolation, autoscaling, draining, reconnect, and recovery |
| Extensibility / lock-in | Less media plumbing; more coupling to LiveKit room/session APIs | Highly extensible through processors/transports; coupled to Pipecat's frame model | Fewer framework dependencies, but stronger dependence on your own contracts and possibly one provider |
| Total cost | Apache-2.0 framework. Self-hosting moves media, compute, and observability onto your infrastructure; LiveKit Cloud meters media/SIP, agent sessions, observability, and inference separately | BSD-2-Clause core. Self-hosting leaves compute, transport, providers, and operations in your stack; Pipecat Cloud can take on hosting/scaling/observability, while transport and models remain separate choices | There may be no framework license, but you still pay for model/provider usage, transport or carrier, backend compute, observability, and the largest engineering/on-call surface of the three paths |

The matrix is intentionally compact. Four responsibilities need to be separated before making the choice because a framework name can hide which layer actually owns a guarantee.

**Recovery is not the same as state continuity.** LiveKit can detect an agent that unexpectedly disconnects and dispatch another agent into the room, but that redistribution does not by itself reconstruct in-memory Python state, a partially executed external tool, or the exact point in the audio that the user already heard.[^livekit-server-lifecycle] Those pieces need application persistence and idempotency. In Pipecat, reconnect and retry are not one framework-wide policy either: the client lifecycle requires starting a new connection after a disconnect, while individual transports or services can implement their own retries; for example, its client WebSocketTransport documents two reconnection attempts and WebSocket-based services apply their own backoff policy.[^pipecat-session-lifecycle][^pipecat-websocket-reconnect][^pipecat-service-events] In vanilla, all of these boundaries and invariants are yours. Treat *transport reconnect*, *runtime restart*, and *business-state recovery* as three separate mechanisms.

**A queue is not backpressure merely because it exists.** Pipecat creates a `FrameProcessorQueue` per processor and constructs it without an explicit size bound; that preserves ordering and priority, but it does not define what the product should do when a consumer falls behind.[^pipecat-frame-processor] Every runtime still needs a boundary-specific limit and policy: block, drop, coalesce, or degrade. Retrying after partial output is also unsafe by default. LiveKit's `Agent Fallback Adapter` makes that concrete: TTS does not switch providers once audio has been pushed, and LLM responses are not restarted by default after text or tool calls have streamed, because repeating work can duplicate speech or external side effects. Its managed `Inference Fallback Adapter` has different semantics and can restart the request from the beginning after a mid-stream failure.[^livekit-fallback] In custom Pipecat paths and vanilla code, those rules—including tool idempotency and cancellation propagation—must be explicit application contracts.

**Security is layered as well.** LiveKit authenticates room access with JWTs that encode identity, room, and permissions, while media/SIP grants remain distinct from backend authorization.[^livekit-tokens] Pipecat core inherits much of its security boundary from the selected transport and deployment; when using Pipecat Cloud, for example, WebSocket connections can be protected with short-lived HMAC session tokens, which is a Cloud capability rather than a universal property of the pipeline.[^pipecat-websocket-auth] In vanilla you must explicitly design client authentication, provider credentials, tool authorization, secret handling, state isolation, and which data can cross each boundary. No framework replaces authorization policy for a tool with real-world side effects.

**Testing and evals are another ownership surface.** LiveKit Agents includes a text-based test framework for messages, tool calls, handoffs, and multi-turn conversations that can run locally or in CI. Its Agent Simulations run on LiveKit Cloud and the current CLI exposes `lk agent simulate audio`: the simulated user speaks and listens over an audio track and the scenario traverses the STT–LLM–TTS pipeline; input can also be degraded with background noise, a low-quality microphone, and packet loss.[^livekit-testing] That covers a real audio surface inside LiveKit's simulation harness, but it does not by itself prove the behavior of a specific PSTN carrier, SIP trunk, end-user device, or real user network. Pipecat includes **Pipecat Evals** as a first-party system: it runs the real agent through an **eval transport** that replaces Daily/WebRTC/telephony, accepts YAML/Python scenarios, and supports text and audio modes. In audio mode, synthesized user speech passes through the agent's real STT and the agent's spoken output uses its real TTS; this covers STT/LLM/TTS, turn-taking, and barge-in, but **not the production transport or real network/telephony conditions**.[^pipecat-evals] WebRTC/PSTN, jitter, packet loss, and specific carrier behavior therefore still need the real transport or a simulator that exercises that layer. Vanilla gives you complete control over clocks, fake transports, replay, and judges, in exchange for building and maintaining all of those surfaces.

**Total cost is not the framework price.** LiveKit Agents is Apache-2.0 and Pipecat core is BSD-2-Clause: being able to run the open-source code without a commercial framework license does not make the system free.[^livekit-license][^pipecat-license] Separate at least five accounts: model/inference, media or carrier, runtime compute, observability/storage, and engineering/operations. LiveKit Cloud documents these as distinct resources: WebRTC/SIP media is metered by time and data transfer, deployed agent sessions by connected time, observability by events and recorded audio, and inference by the underlying model unit.[^livekit-billing] With self-hosting those lines do not disappear; they move to your infrastructure and team. Pipecat follows the same ownership principle: core can run on your servers and Pipecat Cloud can run, scale, and observe the agent for you, while the selected transport and models remain separate costs and contracts.[^pipecat-deployment]

A useful TCO comparison can stay explicit without pretending to have universal prices:

```text
cost_per_successful_minute
= models + media/carrier + runtime_compute
+ observability/storage
+ engineering/on-call amortized per successful minute
```

Do not use one API price as a proxy for total cost. A managed runtime can cost more per metered unit while removing a large amount of operational work; a vanilla stack can produce fewer managed-service invoices while consuming more engineering, on-call, and debugging time. The comparison is only meaningful when task success, audio quality, network conditions, and reliability targets are held constant.

That leaves a practical *developer velocity vs control* distinction: LiveKit moves more media, dispatch, and lifecycle responsibility into existing primitives; Pipecat keeps a broad composition surface inside its frame model; vanilla maximizes control over protocols and scheduling in exchange for a larger correctness, operations, and testing surface. The right option removes undifferentiated work without hiding the layer you actually need to modify.

This is not a ranking, and there is no defensible rule that “vanilla is always lower latency.” LiveKit can add bridges between WebRTC and a model protocol; Pipecat adds frames, queues, and processors; vanilla can remove some of that abstraction but still needs buffering, transport, concurrency control, and recovery. **Without a controlled benchmark on the same hardware, network, provider, model, audio path, and load, this chapter will not publish a numeric framework-overhead ranking.** The useful experiment is to run the same workload and separate provider time, runtime queueing, transport, and playout.

**Do not choose the runtime from proxy signals.** Integration count, GitHub stars, a polished demo, vendor marketing, or a benchmark run with a different model, provider, audio path, or network does not establish latency, reliability, or TCO for your workload. To isolate runtime overhead, hold hardware, network, provider, model, audio path, turn policy, tool load, and concurrency constant. For the complete production-system choice, you may allow differences that are deliberate parts of the design, but record them and do not attribute model-, carrier-, or transport-driven effects to the framework.

### Three concrete choices

**1. Browser or mobile voice assistant.** If real users arrive over variable networks, WebRTC is the natural media baseline. LiveKit Agents fits well when you want rooms, media, agent workers, and optionally managed operations to form one coherent system.[^livekit-agents] Pipecat fits when processor/provider composition is the priority and you want to select Daily or LiveKit as the transport without rewriting the core pipeline.[^pipecat-transports][^pipecat-livekit] A thin/vanilla path can also be genuinely thin: the browser can send audio over WebRTC directly to the provider while the backend retains authentication, ephemeral credentials, tool authorization, and business state.[^openai-realtime-transport] That removes media plumbing from your server but increases coupling to the provider protocol and removes none of the server-side security boundaries.

**2. PSTN agent.** LiveKit is a strong option when you want SIP to terminate into the same room system and dispatch agents through the same lifecycle.[^livekit-sip] Pipecat is attractive when the carrier or streaming API is already chosen and you want serializers, turn strategies, STT/LLM/TTS, and tools to remain a replaceable pipeline; its `FastAPIWebsocketTransport` is explicitly designed for server-side WebSocket and telephony integrations.[^pipecat-telephony] Thin/vanilla does not require operating your own SIP/RTP gateway: a carrier can terminate the call and expose bidirectional media over WebSocket. Twilio Media Streams, for example, sends call audio to your server and accepts audio back.[^twilio-media-streams] That boundary has its own contract. In a bidirectional stream you receive only the inbound track, there is one Stream per Call, and media uses `audio/x-mulaw`, 8 kHz, mono. Outbound media is buffered in order. `mark` reports when Twilio has completed playback of the preceding media; if you send `clear`, Twilio empties the buffer and returns pending `mark` events. That distinguishes audio Twilio played from audio it cleared, but **it does not prove that the person physically heard the sample**. Your server must also validate `X-Twilio-Signature` to authenticate the stream origin.[^twilio-media-streams][^twilio-media-messages] In this design Python owns the WebSocket/audio contract and application call state while Twilio owns telephony termination. It is a thin option when that codec, control surface, and security boundary are sufficient. If the product needs media or carrier control that this boundary does not expose, move down toward SIP/RTP or another media endpoint.

**3. Experimental or low-level custom pipeline.** Pipecat is a useful middle ground when you want custom processors, transport swaps, or per-frame inspection without rebuilding the entire lifecycle.[^pipecat-custom] Vanilla is the better fit when the experiment is the layer the framework would otherwise abstract away — packetization, frame sizing, provider event protocol, a custom duplex scheduler, or exact timestamp instrumentation. The extra implementation work then buys experimental control, not “simplicity.”

There is also a concrete hybrid: **Pipecat can run its pipeline on `LiveKitTransport`**. That lets LiveKit own rooms/WebRTC while Pipecat owns processor composition.[^pipecat-livekit] The hybrid is useful only when each layer has a clear responsibility. Duplicating turn detection, buffering, or retry policy across two runtimes creates more failure states than it removes.

A practical rule is conditional rather than absolute: *use the highest abstraction level that still preserves the control your product actually needs*. If your differentiation is media handling or scheduling, move down the stack. If it is agent logic and tools, spending engineering time rebuilding WebRTC, turn-taking, and worker lifecycle is usually poor allocation.

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
- *Half-cascade* is not a formal standard; here it uses the operational meaning defined above: audio-in → text-out → TTS, and only when the realtime model supports text-only output.
- Speech-to-speech does not imply full-duplex.
- Full-duplex describes temporal overlap and interaction control, not how many models are in the stack.
- LiveKit Agents, Pipecat, and vanilla Python are runtime choices, not modality architectures.
- Thin/vanilla does not determine media ownership: it can use provider-direct WebRTC, carrier Media Streams, or an application-owned SIP/RTP stack.
- Removing modality boundaries does not remove tools, state, permissions, traces, or recovery logic.
- Open source does not mean zero TCO: separate models, media/carrier, runtime, observability, and operations.
- Fewer framework dependencies do not imply lower operational complexity.
- The right architecture depends on what you want to protect: modularity, voice control, acoustic signal, timing, auditability, portability, or runtime control.

The deeper [voice-agent architecture engineering note](/en/articulos-tecnicos/voice-agent-architectures/) explores streaming contracts, prosody, and a possible separation between the conversational surface and an execution plane. The next chapters in this series will isolate turn-taking, latency, tools, transport, and evaluation instead of mixing them into one comparison.

## References

[^livekit-voice]: LiveKit, [Voice AI quickstart](https://docs.livekit.io/agents/start/voice-ai/). Documents STT–LLM–TTS pipelines and direct realtime models as first-class alternatives.
[^livekit-pipelines]: LiveKit, [Pipeline types](https://docs.livekit.io/agents/models/pipelines/). Defines STT–LLM–TTS, realtime, and *half-cascade*; the latter uses a realtime model for understanding and a separate TTS for output, and requires provider support for a text-only response modality.
[^livekit-streaming-pipeline]: LiveKit, [Sequential pipeline architecture for voice agents](https://livekit.com/blog/sequential-pipeline-architecture-voice-agents), March 23, 2026. Explains how streaming STT, model generation, and TTS overlap, and why end-to-end latency should not be modeled as a strictly blocking sum of complete stage latencies.
[^livekit-agents]: LiveKit, [Agents framework introduction](https://docs.livekit.io/agents/). Describes the open-source framework, WebRTC to end users, pipeline abstractions, and the distinction from managed LiveKit Cloud capabilities.
[^livekit-session]: LiveKit, [AgentSession](https://docs.livekit.io/agents/logic/sessions/). Session orchestration for input, voice pipeline, tools, turn handling, events, and control.
[^livekit-server-lifecycle]: LiveKit, [Server lifecycle](https://docs.livekit.io/agents/server/lifecycle/). Capacity exchange, per-process job isolation, graceful draining, and redispatch after an agent disconnects.
[^livekit-self-hosting]: LiveKit, [Self-hosting overview](https://docs.livekit.io/transport/self-hosting/). Separates self-hostable Agents framework/SIP from managed hosting, observability, and inference in LiveKit Cloud.
[^livekit-license]: LiveKit Agents, [Python package metadata](https://github.com/livekit/agents/blob/main/livekit-agents/pyproject.toml). Declares the `livekit-agents` framework under Apache-2.0.
[^livekit-billing]: LiveKit, [LiveKit Cloud billing](https://docs.livekit.io/deploy/admin/billing/). Documents separate metering for WebRTC/SIP media, agent deployment, observability, and inference and the corresponding usage units; this chapter deliberately does not pin prices, which can change.
[^livekit-sip]: LiveKit, [SIP primer](https://docs.livekit.io/reference/telephony/sip-primer/). SIP/RTP flow for connecting traditional telephony to LiveKit WebRTC applications and rooms.
[^livekit-tokens]: LiveKit, [Tokens & grants](https://docs.livekit.io/home/server/generating-tokens). Documents JWT access tokens, participant identity, room, and media/SIP permissions and grants.
[^livekit-testing]: LiveKit, [Testing and evaluation](https://docs.livekit.io/agents/start/testing/) and [Agent commands](https://docs.livekit.io/reference/developer-tools/livekit-cli/agent/). The test framework is text-based and runs locally/in CI. Agent Simulations run on LiveKit Cloud; the current CLI exposes `lk agent simulate audio`, which runs scenarios through STT–LLM–TTS over a simulated-user audio track and can add background noise, a degraded microphone, and packet loss.
[^livekit-fallback]: LiveKit, [Fallback strategies](https://docs.livekit.io/agents/logic/fallback-strategies/). Separates the in-process `Agent Fallback Adapter` for STT/TTS/LLM from the managed `Inference Fallback Adapter` in LiveKit Inference for STT/TTS. The managed adapter retries on session, connection, and mid-stream failures and can restart a request from the beginning on the next model after a mid-stream failure. The in-process adapter instead applies partial-output guards: TTS does not switch after audio has been pushed, and LLM responses are not restarted by default after text or tool calls have streamed.
[^livekit-errors]: LiveKit, [Events and error handling](https://docs.livekit.io/reference/agents/events/). `AgentSession` emits `ErrorEvent` for STT/LLM/TTS/realtime failures; the error object's `recoverable` field distinguishes automatic recovery from terminal failure after retries are exhausted.
[^pipecat-pipeline]: Pipecat, [Pipeline & Frame Processing](https://docs.pipecat.ai/pipecat/learn/pipeline). Pipeline, `FrameProcessor`, frames, queueing, lifecycle, observers, and metrics.
[^pipecat-frame-processor]: Pipecat, [`FrameProcessor` source](https://github.com/pipecat-ai/pipecat/blob/main/src/pipecat/processors/frame_processor.py). Core implements `FrameProcessorQueue` over `asyncio.PriorityQueue`, prioritizes system frames, processes each processor in its own tasks, and uses `CancelFrame` for cancellation; these primitives do not by themselves define a product-level backpressure or retry policy.
[^pipecat-cascade-s2s]: Pipecat, [Building With OpenAI Audio Models and APIs](https://docs.pipecat.ai/pipecat/features/openai-audio-models-and-apis). Documents both a cascaded STT→LLM→TTS pipeline and a speech-to-speech pipeline over OpenAI Realtime in Pipecat code; it does not imply that every provider supports half-cascade or full duplex.
[^pipecat-transports]: Pipecat, [Transports](https://docs.pipecat.ai/pipecat/learn/transports) and [Choosing a Transport](https://docs.pipecat.ai/client/concepts/choosing-a-transport). Separates pipeline logic from transport and documents Daily, LiveKit, SmallWebRTC, and WebSocket use cases.
[^pipecat-turns]: Pipecat, [User Turn Strategies](https://docs.pipecat.ai/api-reference/server/utilities/turn-management/user-turn-strategies). Configurable turn-start, turn-stop, and interruption strategies.
[^pipecat-tools]: Pipecat, [Function Calling](https://docs.pipecat.ai/pipecat/learn/function-calling). Tools, context, interruption cancellation, and asynchronous function calls.
[^pipecat-metrics]: Pipecat, [Metrics](https://docs.pipecat.ai/pipecat/fundamentals/metrics) and [OpenTelemetry Tracing](https://docs.pipecat.ai/api-reference/server/utilities/opentelemetry). TTFB, processing, usage, observers, and tracing.
[^pipecat-evals]: Pipecat, [Pipecat Evals](https://docs.pipecat.ai/pipecat/evals/overview). First-party development-time evaluation system that runs the real agent over a local eval transport instead of Daily/WebRTC/telephony. Audio mode synthesizes user input, passes it through the agent's real STT, and evaluates its real TTS output; it covers STT/LLM/TTS and conversational behavior, not production transport or real network/telephony conditions.
[^pipecat-license]: Pipecat, [LICENSE](https://github.com/pipecat-ai/pipecat/blob/main/LICENSE). Declares Pipecat core under BSD 2-Clause.
[^pipecat-deployment]: Pipecat, [Pipecat](https://www.pipecat.ai/). The official product surface separates self-hosting of the core from Pipecat Cloud, which runs, scales, and observes agents as a managed service; transport and model services remain selectable pipeline components.
[^pipecat-telephony]: Pipecat, [FastAPIWebsocketTransport](https://docs.pipecat.ai/api-reference/server/services/transport/fastapi-websocket). Server-side WebSocket transport designed for telephony integrations and serializers.
[^pipecat-custom]: Pipecat, [Custom FrameProcessor](https://docs.pipecat.ai/pipecat/fundamentals/custom-frame-processor). Extending a pipeline with application logic while retaining control/lifecycle frames.
[^pipecat-livekit]: Pipecat, [LiveKitTransport](https://docs.pipecat.ai/api-reference/server/services/transport/livekit). Running a Pipecat pipeline over LiveKit rooms/WebRTC, self-hosted or Cloud.
[^pipecat-session-lifecycle]: Pipecat, [Session Lifecycle](https://docs.pipecat.ai/client/concepts/session-lifecycle). Documents session states and that the client must start a new connection after disconnect; it does not define one reconnect policy for every transport.
[^pipecat-websocket-reconnect]: Pipecat, [WebSocketTransport](https://docs.pipecat.ai/api-reference/client/js/transports/websocket). The client WebSocket transport documents two automatic reconnection attempts before graceful disconnect.
[^pipecat-service-events]: Pipecat, [Service Events](https://docs.pipecat.ai/api-reference/server/events/service-events). WebSocket-based services document their own exponential-backoff reconnect policy, separate from client lifecycle.
[^pipecat-websocket-auth]: Pipecat, [WebSocket Authentication](https://docs.pipecat.ai/pipecat-cloud/guides/websocket-authentication). Pipecat Cloud capability for protecting WebSocket connections with short-lived HMAC session tokens; not a universal Pipecat-core property.
[^openai-realtime-transport]: OpenAI Agents SDK, [Realtime Transport Layer](https://openai.github.io/openai-agents-js/guides/voice-agents/transport/). Documents direct browser↔Realtime API WebRTC audio with separate server-side controls, plus WebSocket, SIP, Twilio, and custom transport paths; this separates runtime ownership from media-endpoint ownership.
[^openai-webrtc-scale]: OpenAI, [How OpenAI delivers low-latency voice AI at scale](https://openai.com/index/delivering-low-latency-voice-ai-at-scale/). Details the responsibilities WebRTC standardizes: ICE/NAT traversal, DTLS/SRTP, codecs, RTCP, echo cancellation, and jitter buffering.
[^twilio-media-streams]: Twilio, [Media Streams overview](https://www.twilio.com/docs/voice/media-streams). Documents bidirectional WebSocket streams for realtime AI assistants, one Stream per Call in bidirectional mode, inbound-track reception, and the requirement to validate `X-Twilio-Signature`.
[^twilio-media-messages]: Twilio, [Media Streams — WebSocket Messages](https://www.twilio.com/docs/voice/media-streams/websocket-messages). Documents `audio/x-mulaw` at 8 kHz mono, FIFO buffering for outbound media, and `mark`/`clear` semantics; a returned `mark` represents Twilio-side playback completion or buffer clearing, not physical proof of audibility at the handset.
[^openai-realtime-output-modality]: OpenAI API Reference, [Realtime call/session `output_modalities`](https://developers.openai.com/api/reference/python/resources/realtime/subresources/calls/methods/accept). Documents that `output_modalities: ["text"]` requests a text-only response and that text and audio cannot be requested together for the same response.
[^openai-realtime-model]: OpenAI, [GPT-Realtime-2.1 model](https://developers.openai.com/api/docs/models/gpt-realtime-2.1). Documents the text/audio modalities and function calling of the currently recommended realtime model.
[^openai-realtime-deprecation]: OpenAI, [Deprecations](https://developers.openai.com/api/docs/deprecations), July 20, 2026. Marks `gpt-realtime` as deprecated, schedules its API shutdown for January 20, 2027, and recommends `gpt-realtime-2.1` as the replacement.
[^openai-realtime-intro]: OpenAI, [Introducing the Realtime API](https://openai.com/index/introducing-the-realtime-api/). Describes the ASR → text model → TTS pipeline, loss of acoustic cues, and direct audio streaming.
[^gemini-live]: Google, [Get started with Gemini Live API](https://ai.google.dev/gemini-api/docs/live-api/get-started-sdk). Persistent sessions with realtime audio input and native audio output over WebSocket.
[^gemini-tools]: Google, [Tool use with Live API](https://ai.google.dev/gemini-api/docs/live-api/tools). Function-calling contract and explicit tool-result delivery back into the session.
[^gpt-live]: OpenAI, [Introducing GPT-Live](https://openai.com/index/introducing-gpt-live/), July 8, 2026. Full-duplex architecture and separation between continuous interaction and deeper work.
[^moshi]: Défossez et al. (2024), [Moshi: a speech-text foundation model for real-time dialogue](https://arxiv.org/abs/2410.00037). Full-duplex spoken dialogue with parallel user/assistant streams and no explicit turn segmentation.