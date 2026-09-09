---
title: "Latency budget: measure the critical path, not dashboard sums"
description: "How to break down voice-agent latency from speech end to playback, separate capture, network, turn-taking, inference and audio, and optimize without comparing incompatible metrics."
date: 2026-09-10
date_modified: 2026-09-10
tags:
  - AI
  - Voice
  - Realtime
  - Latency
  - Production
---

# Chapter 3 — Latency budget: measure the critical path, not dashboard sums

A provider can return quickly while the agent still feels slow. The reverse can also happen: one internal stage looks expensive in a dashboard but barely changes the user's wait because some of that work overlaps with another stage.

The reason is simple: **conversational latency is not one duration, and it is not the automatic sum of every latency exposed by the components**.

Between the last useful part of the user's turn and the real start of response audio, the path can include:

- microphone capture and processing
- input packetization and transport
- VAD, transcription, and the end-of-turn decision
- model inference
- text aggregation and speech synthesis when TTS is present
- output packetization and transport
- jitter buffers and other queues
- browser, phone, or device playback

{{ include_html("snippets/articulos-tecnicos/voice-latency-critical-path.html") }}

This chapter answers one concrete question: **how do you build a latency budget that matches the path the user actually waits for and lets you find the bottleneck without counting the same work twice?**

## A latency metric needs two explicit boundaries

Saying "we have 400 ms of latency" is incomplete. You need to know **which event starts those 400 ms and which event ends them**.

Three boundaries are especially useful for a voice turn:

```text
t_speech_stop     = observed end of user speech
t_turn_commit     = the system accepts the turn as complete
t_first_playout   = response playback begins
```

They give us:

```text
L_turn     = t_turn_commit   - t_speech_stop
L_response = t_first_playout - t_turn_commit
L_user     = t_first_playout - t_speech_stop
```

If all three timestamps share the same timing contract, then:

```text
L_user = L_turn + L_response
```

That simple definition prevents a common mistake: comparing model `TTFB` with a metric that starts at speech end, or comparing the first TTS chunk with the moment a speaker actually begins playback.

### The clock is part of the definition

Subtracting timestamps from different machines is valid only if you know how their clocks relate. In a distributed system, clock offset or drift can corrupt a small duration.

Use:

- a monotonic clock for durations inside one process or device
- turn IDs and spans to correlate events across services
- explicit clock synchronization when you truly need to subtract timestamps across hosts
- component-produced durations when you cannot reconstruct a global boundary accurately enough

Do not label a subtraction "end-to-end" when its start and end come from unreconciled clocks.

## The critical path matters more than the sum of full stage times

In a classic STT → LLM → TTS pipeline, this expression is tempting:

```text
latency = STT + LLM + TTS + network
```

A streaming pipeline does not necessarily execute that way.

STT can emit partial transcripts while the user is still speaking. The model can start streaming tokens before its complete answer exists. TTS can begin synthesis once it receives enough text while the model continues generating.

After `speech_stop`, the useful question is therefore not "how long did STT take in total?" It is **which residual work still blocks the first audio sample that can be played**.

LiveKit's current metrics reflect these separate boundaries. User turns expose `transcription_delay` and `end_of_turn_delay`. Assistant turns expose `llm_node_ttft`, `tts_node_ttfb`, and `e2e_latency`. The documentation also proposes `EOU + LLM TTFT + TTS TTFB` as a granular approximation for an STT-LLM-TTS pipeline.[^livekit-data-hooks]

That sum is useful inside **that definition and that pipeline**. It is not a physical law for the whole agent. It does not automatically include client acoustic capture, every network leg, or the time until a remote output device produces sound. LiveKit also leaves `llm_node_ttft` and `tts_node_ttfb` empty when a realtime model is used.[^livekit-data-hooks]

The practical rule is:

> Use component metrics to explain a user-facing metric. Do not replace the user-facing metric with a sum of measurements whose boundaries do not match.

## Capture: latency can exist before the runtime sees the first buffer

Latency may already have accumulated in the device, operating system, and browser before the runtime receives audio.

Media Capture and Streams defines the audio-track `latency` property as the time from the start of processing, for example when sound occurs in the real world, until data is available to the next processing step. The specification also says the value represents the target latency of the configuration and that actual latency can vary.[^w3c-media-capture]

Two consequences follow:

1. Do not treat capture as zero-cost simply because the server receives frames promptly.
2. A browser setting is not a substitute for an acoustic measurement when you need the exact physical microphone-to-application delay.

Echo cancellation, noise suppression, resampling, and buffering can change both latency and quality. Optimizing one without controlling the other can move the problem instead of fixing it.

## Packetization and network: less buffering is not always a better conversation

Audio travels in discrete units. That creates a trade-off between send frequency, overhead, and loss tolerance.

RFC 3551 specifies a default packetization interval for packetized audio of **20 ms or one frame, whichever is longer**, unless the payload format states otherwise. The same standard explains the trade-off: longer packets reduce header overhead but increase delay and make packet loss more noticeable.[^rfc3551]

That 20 ms value is not "WebRTC latency" and it is not a universal setting to copy. It is a standards-based example of why packetization belongs in the budget.

Network variability adds another layer. A de-jitter buffer holds media before playout to absorb arrival-time variation. Packets that arrive too late can miss their playout time.[^rfc7005]

WebRTC makes this layer observable. For `RTCInboundRtpStreamStats`, average time spent in the jitter buffer can be calculated as:

```text
avg_jitter_buffer_delay = jitterBufferDelay / jitterBufferEmittedCount
```

The specification also separates `jitterBufferTargetDelay` from `jitterBufferMinimumDelay`, which helps distinguish the applied target from the minimum delay attributable to network conditions.[^webrtc-stats]

That gives you evidence when a conversation feels slow without assuming inference is responsible.

### RTT is not automatically one-way latency

RTT measures a round trip under its own definition. Dividing it by two assumes, among other things, enough path symmetry and compatible timing. Mobile Internet paths, queues, and radios can be asymmetric.

If you need one-way latency, measure that boundary explicitly or document the assumptions. `RTT / 2` can be an operational estimate. It is not a directly measured truth.

## Turn-taking can dominate even when the model is fast

The previous chapter separated VAD from end-of-turn. This is where the timing consequence appears.

LiveKit defines `end_of_turn_delay` as the interval between speech end and the decision to end the turn. Its `EOUMetrics.end_of_utterance_delay` includes `transcription_delay` when applicable.[^livekit-data-hooks][^livekit-eou]

Reducing model TTFT will not fix an endpointing policy that waits too long. The opposite failure also matters: shortening endpointing aggressively can improve a latency number while increasing premature turn commits.

A production budget should evaluate these together:

```text
end-of-turn latency
+ premature-endpoint rate
+ late-endpoint rate
```

Do not call a configuration better when it wins only on time and loses conversational correctness.

## Inference: service TTFB is not the same as first audible response

A cascade can expose several boundaries:

```text
final transcript
→ first input accepted by the LLM
→ first LLM token
→ enough text for synthesis
→ first TTS chunk
```

Pipecat makes part of this distinction explicit. Its current metrics separate `TTFB`, `Processing Time`, and, for TTS, `Text Aggregation`: the time from the first LLM token to the first complete sentence used for synthesis.[^pipecat-metrics]

Optimizing LLM TTFT alone may therefore leave the experience unchanged if the system waits for a complete sentence before TTS starts. Likewise, a TTS service with good TTFB does not repair slow end-of-turn detection.

Speech-to-speech changes the internal boundary. You may no longer observe STT, LLM, and TTS as three separate services, but the system still has external events: turn completion, request or commit, first audio output, and playout. **Hiding internal stages does not remove the need to measure external boundaries.**

## First generated audio is not first heard audio

A server can produce an audio chunk while the user still hears silence.

The remaining path can include:

- serialization and packetization
- transport
- jitter buffering
- playback queueing
- the audio graph
- operating-system and hardware output

The Web Audio API separates two useful concepts. `AudioContext.baseLatency` is the processing latency from `AudioDestinationNode` to the audio subsystem. It does not include all downstream processing or the audio graph. `outputLatency` estimates the interval from the user agent asking the host to play a buffer until the first sample is processed by the output device.[^webaudio]

An `audio_chunk_received` event should therefore not be named `playback_started`.

The final observable boundary will differ across browser, mobile, and PSTN paths. Telemetry should say exactly what it knows: **frame sent, frame received, frame queued, playback reported, or acoustically measured audio**.

## A latency budget is a distribution, not a mean

An average can hide a system where most turns are fast but a meaningful fraction accumulates retransmission, jitter, cold starts, or queueing.

In production, retain distributions for important boundaries, for example p50, p90, p95, and p99 when volume supports them. Segment by variables that change the path:

- channel: browser, app, PSTN
- user region and compute region
- transport and codec
- provider and model
- turn length and type
- language
- warm or cold state
- network quality and packet loss
- interrupted or normal turn

Do not turn another product's percentiles into universal targets. The percentiles describe **your** workload only when the metric definition remains stable.

## Human perception provides context, not an SLA

Stivers et al. studied turn-taking in a worldwide sample of **10 languages**. They found a general avoidance of overlapping talk and minimization of silence. Average gaps across languages differed within a range of **250 ms from the cross-language mean**.[^stivers2009]

That finding helps explain why small timing differences can change the feel of a conversation. It does not establish a 250 ms latency target for a voice agent. The paper describes human conversations across languages, not an AI pipeline.

Use it as evidence that timing matters, not as an engineering budget.

## LiveKit, Pipecat, or vanilla: observability changes, the definition does not

The runtime determines which timestamps and correlations you get out of the box.

| Latency question | LiveKit Agents | Pipecat | Vanilla/thin Python |
|---|---|---|---|
| End of turn | `transcription_delay`, `end_of_turn_delay`, and EOU metrics when applicable | Turn tracking plus the observers/frames selected by the pipeline | The provider/VAD/detector event that the app defines as authoritative |
| Service/model | per-plugin metrics, with LLM TTFT and TTS TTFB in cascade | `TTFB`, processing, and text aggregation per processor/service | provider metrics plus timestamps around the SDK or protocol |
| User → bot | `ChatMessage.metrics.e2e_latency` under the Agents definition | `UserBotLatencyObserver` measures user stop → bot start | the app must define and correlate both events |
| Media/network | supplement with client/transport metrics because TTFT does not contain the whole path | depends on the transport and observers you add | WebRTC stats, carrier/media events, and application telemetry |
| Correlation | `speech_id` and traces | frames, observers, and tracing | application-designed trace/turn IDs |

LiveKit documents `e2e_latency` as the time from when the user stopped speaking to when the agent began responding.[^livekit-data-hooks] Pipecat documents `UserBotLatencyObserver` as the interval from the user stopping speech to the bot starting speech.[^pipecat-metrics]

The names look comparable, but **do not publish a framework comparison until you have verified that speech stop, bot start, playback, and transport represent the same boundary in the same experiment**.

### Choose LiveKit Agents when its session contract is already your unit of observation

If your application uses `AgentSession`, per-turn metrics and `speech_id` reduce correlation work. You still need the relevant media telemetry for the real channel when you want to explain capture, network, or playout.

### Choose Pipecat when you want to measure the pipeline through processors and observers

Pipecat fits well when you need TTFB, processing, text aggregation, and user-bot latency inside an explicit composition. That modularity helps identify which processor adds wait, but the metric still inherits the semantics of its service and transport.

### Choose vanilla/thin when you need to control the measurement boundary

It can be appropriate for protocol experiments, provider-direct WebRTC, or highly specific media paths. The application now owns monotonic clocks, turn IDs, spans, media-to-business correlation, export, replay, and the exact definition of every metric.

### A hybrid observability stack is often reasonable

You can correlate runtime metrics with `RTCStats`, carrier events, and your own spans. The requirement is one event taxonomy and one turn ID across every layer you intend to compare.

Do not choose a runtime because one dashboard shows a lower number. First verify what starts and ends that number.

## A reproducible procedure for finding the bottleneck

You do not need an invented framework benchmark. You need controlled conditions.

1. **Define the user-facing metric.** For example, `speech_stop → first_playout`.
2. **Hold conditions constant.** Use the same hardware, network path, codec, provider/model, turn policy, audio, and load.
3. **Instrument events, not only services.** Capture speech stop, commit, request, first token/audio, send, receive, and playback.
4. **Correlate by turn.** Do not mix metrics from different requests.
5. **Inspect distributions.** The tail can have a different cause from the median.
6. **Isolate one layer.** Change one policy or component while the rest stays fixed.
7. **Repeat enough trials to estimate variation.** If the experiment is not controlled, do not publish a numeric ranking.
8. **Re-check quality and reliability.** Lower wait time does not compensate for more premature endpoints, degraded audio, or duplicated tool effects.

A minimal trace can look like this:

```text
turn_id
client_capture_stop
server_speech_stop
turn_committed
model_request_start
model_first_output
first_audio_encoded
first_audio_sent
first_audio_received
playback_started
```

Not every architecture can observe every event. That missing visibility is itself information about the abstraction boundary you chose.

## What must be clear before production

A latency budget is ready for QA when you can answer:

- What is the primary user-perceived metric, and what are its exact two boundaries?
- Which clock measures each duration?
- Which part belongs to capture, media/network, turn-taking, inference, and playout?
- Which work happens before speech end, and which residual work remains on the critical path afterward?
- Which metrics come from the framework, which come from the provider, and which come from the OS, browser, or carrier?
- How do you distinguish first byte, first token, first generated audio, and first played audio?
- What jitter, packet loss, and buffering accompany a slow turn?
- Which percentiles do you monitor, and across which segments?
- How do you correlate all observations from the same turn?
- What quality, cost, or reliability trade-off appears when you reduce wait time?

The central idea is this: **build the budget from observable user-facing boundaries inward**. Once `speech_stop → first_playout` is fixed, VAD, network, TTFT, TTS, and buffer metrics can explain that duration. Without a shared boundary, you are only comparing different clocks and dashboards.

## Primary sources

[^livekit-data-hooks]: LiveKit. *Data hooks — Metrics and usage data / Per-turn latency / Measure conversation latency*. https://docs.livekit.io/deploy/observability/data/
[^livekit-eou]: LiveKit. *EOUMetrics API*. https://docs.livekit.io/reference/python/livekit/agents/metrics/index.html
[^pipecat-metrics]: Pipecat. *Metrics*. https://docs.pipecat.ai/pipecat/fundamentals/metrics
[^w3c-media-capture]: W3C. *Media Capture and Streams — latency constrainable property*. https://www.w3.org/TR/mediacapture-streams/
[^webrtc-stats]: W3C. *Identifiers for WebRTC's Statistics API*. https://www.w3.org/TR/webrtc-stats/
[^webaudio]: W3C. *Web Audio API 1.1 — AudioContext baseLatency/outputLatency*. https://www.w3.org/TR/webaudio-1.1/
[^rfc3551]: IETF. RFC 3551. *RTP Profile for Audio and Video Conferences with Minimal Control*. https://www.rfc-editor.org/rfc/rfc3551.html
[^rfc7005]: IETF. RFC 7005. *RTCP XR Block for De-Jitter Buffer Metric Reporting*. https://www.rfc-editor.org/rfc/rfc7005.html
[^stivers2009]: Stivers, T. et al. (2009). *Universals and cultural variation in turn-taking in conversation*. PNAS 106(26), 10587–10592. https://doi.org/10.1073/pnas.0903616106
