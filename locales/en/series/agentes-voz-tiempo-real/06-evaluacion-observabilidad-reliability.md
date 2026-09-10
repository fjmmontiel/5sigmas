---
title: "Evaluating a voice agent: turn evidence, observability, and reliability"
description: "How to tell whether a voice agent actually works by connecting outcomes, turn-taking, media, tools, and runtime evidence into a failure taxonomy and a production-to-regression loop."
date: 2026-09-10
date_modified: 2026-09-10
tags:
  - AI
  - Voice
  - Realtime
  - Evaluation
  - Observability
  - Reliability
  - Production
---

# Chapter 6 — Evaluating a voice agent: turn evidence, observability, and reliability

A dashboard can show 420 ms average latency, 99.9% successful HTTP requests, and no exceptions while the agent still fails the real task.

The opposite can happen too. A provider can fail, the runtime can recover through fallback, and the user can complete the conversation without noticing. Calling that entire turn a failure collapses an internal recovered fault into user-visible failure.

The useful question is: **what evidence do you need for each turn to decide whether the system did the right thing, which boundary failed, whether it recovered, and what the user actually experienced?**

This chapter builds that evidence model and connects it to offline evaluation, production observability, replay, and regression gates.

## A transcript is not the system's ground truth

A transcript is valuable evidence, but it only describes part of the path. Consider this turn:

```text
User:  “Book the appointment for Tuesday at 3 PM.”
Agent: “Done. Your appointment is booked.”
```

A text judge may rate the response as correct. The tool, however, might have timed out after the external service accepted the mutation, or it might have failed before creating anything. The first case may leave the real state `UNKNOWN`; the second is `FAILED`. The same assistant sentence hides two different business outcomes.

Evaluation needs to connect at least four layers:

1. **Outcome.** Was the user's intent satisfied and is the external state correct?
2. **Conversational control.** Did the turn end at the right point, and were interruption, overlap, and barge-in handled correctly?
3. **Media and perception.** What audio entered, what audio was generated, and what reached the playout boundary?
4. **Runtime and dependencies.** Which provider, tool, process, or transport failed, retried, fell back, or reconnected?

{{ include_html("snippets/articulos-tecnicos/voice-turn-evidence-stack.html") }}

None of those layers replaces the others. A conversation that looks correct in text does not validate media. A clean LLM trace does not prove the user heard the audio. An HTTP 200 from a tool does not prove the agent understood the user's intent.

## The useful unit of analysis is the logical turn

A full session is too coarse for many decisions. A provider request is too narrow. A useful unit is usually a **logical turn**: from evidence that the user is trying to communicate something until the system completes the relevant response or deliberately decides not to respond.

Frameworks do not all define that boundary in exactly the same way. Keep application-level identifiers alongside framework and provider IDs:

```text
session_id
turn_id
speech_id / provider_response_id / tool_call_id
agent_version
prompt_version
model + provider + region
transport/path
started_at / speech_stop / turn_commit / first_playout / turn_end
outcome
first_harmful_observable
root_cause
recovery
user_impact
```

Provider IDs are excellent debugging keys, but they should not become your canonical identity. A fallback can create two provider requests for one turn. A tool retry can create multiple attempts for one logical operation.

### Observed, inferred, and judged are different kinds of evidence

Record where a signal came from:

- **observed:** an event, timestamp, database state, packet counter, or tool result that was actually recorded
- **inferred:** a conclusion derived from multiple signals, such as “likely media degradation after a TURN/TCP route change”
- **judged:** a human or model classification, such as “the answer satisfied the user's intent”

Do not silently promote a probabilistic judge to ground truth. Preserve the judge input, model/version, criterion, output, and, when it matters, calibration against human labels.

## Keep symptom, cause, and recovery separate

A single label such as `LLM_ERROR` throws away most of the information needed to improve the system.

Model failure along separate dimensions:

```text
stage       = turn | media | stt | llm | tts | tool | transport | runtime | business_state
symptom     = no_audio | wrong_answer | late_response | overlap | duplicate_effect | ...
cause       = endpointing | timeout | provider_5xx | auth | queue_saturation | crash | ...
recovery    = none | retry | fallback | reconnect | reconcile | compensate | user_retry
user_impact = none | delay | degraded_audio | repeated_speech | wrong_action | dropped_call
```

The distinction between the **first harmful observable** and the **root cause** is particularly useful. A user may experience a late response because a provider timeout triggered fallback. The harmful observable is latency. The root cause may be the provider timeout. Recovery was fallback. The final task outcome can still be correct.

That structure lets you answer different questions from the same evidence:

- What is hurting users most often?
- Which dependency creates the most internal failures?
- Which recovery mechanisms prevent those failures from becoming user-visible?
- Which production failures are not represented in regression coverage?

## Voice needs failure classes that chat does not

At minimum, cover these families.

| Boundary | Example failure | Evidence you need |
|---|---|---|
| media ingress | no audio or only one direction arrives | transport events, RTP/WebRTC/carrier counters, track state |
| speech/turn detection | false end of turn or excessive endpoint delay | VAD/EOU events, transcript timing, `turn_id` |
| interruption | backchannel classified as barge-in | speech events, interruption decision, playback state |
| STT | transcript error changes user intent | input audio + transcript + confidence/evidence when available |
| LLM/realtime model | wrong answer, wrong tool, or timeout | request/response trace, tool plan, provider error |
| tool/business state | tool reports success but the effect does not exist | `operation_id`, system of record, reconciliation result |
| TTS | wrong, truncated, or late audio | synthesized chunks, TTS error/latency, expected text |
| playout | audio was generated but did not reach playback | output queue, carrier/player acknowledgement boundary |
| transport | reconnect, unexpected relay, jitter/loss | candidate/path, reconnect events, jitter/loss windows |
| runtime | crash, worker restart, handoff/state loss | process logs, session events, durable-state reconstruction |

Do not use `model_error` as a catch-all for a failed tool, growing jitter buffer, or premature turn close.

## Start every reliability metric with its denominator

A reliability metric is only interpretable when the counted population is explicit.

For example:

```text
turn_failure_rate
  = turns_with_user_visible_failure / eligible_logical_turns

internal_failure_rate
  = turns_with_any_internal_failure / eligible_logical_turns

recovery_success_rate
  = internally_failed_turns_recovered_without_user_visible_failure
    / internally_failed_turns

unknown_effect_rate
  = mutating_actions_ending_UNKNOWN / admitted_mutating_actions

retry_amplification
  = provider_or_tool_attempts / logical_operations
```

Do not compare a turn failure rate whose denominator is turns with a provider error rate whose denominator is requests as if they measured the same thing. Retries and fallback change request counts without necessarily changing turn counts.

Segment metrics by variables that change the mechanism: agent version, provider/model, language, transport, carrier, region, device class, ICE/TURN route, codec, tool, and relevant intent type. Heavy aggregation can hide a severe regression in a small cohort.

For latency, retain distributions per boundary rather than one average. Chapter 3 separated `speech_stop → turn_commit → first_playout`; here those boundaries need to travel with outcome and failure classification instead of living in a separate dashboard.

## An internal failure does not automatically mean release failure

A reliable system is not a system with no internal faults. It is a system that maintains its user contract under an explicit failure model and makes failures visible when it cannot recover.

Example:

```text
attempt 1: TTS provider A -> timeout
fallback: provider B -> first playable audio
outcome: correct response
user impact: +620 ms delay
```

Observability should record the timeout and fallback. Outcome evaluation should not automatically label the turn unsuccessful. If the extra delay violates the interaction budget, the same turn may fail an experience SLO while still completing the task correctly.

Keep at least these dimensions distinct:

- **correctness:** did the system do the right thing?
- **interaction quality:** were turns, interruptions, audio, and timing acceptable?
- **reliability:** did the system preserve its contract under expected faults?
- **recovery cost:** how many retries, fallbacks, or extra seconds were required?

## Use deterministic assertions where a judge is unnecessary

Some properties should be machine-checkable:

- the same `operation_id` must not create two business effects
- cancelled speech must not keep entering the playout queue beyond the agreed cancellation boundary
- one logical operation must not silently acquire a new `turn_id` mid-flight
- an `UNKNOWN` side effect must not become `SUCCESS` without reconciliation or system-of-record evidence
- a destructive tool must not execute without the required state and authorization
- a recovered session must not treat in-memory state as durable state

Use judges for semantic or perceptual properties that cannot be reduced to a deterministic invariant.

## Build evaluation in layers, from cheap to realistic

There is no single eval score that replaces an evaluation strategy. Use a ladder.

### 1. Component tests and invariants

Test parsers, state machines, idempotency, cancellation, audio transforms, and tool adapters with controlled inputs. The goal is reproducibility and fast diagnosis.

### 2. Agent behavior tests

Verify concrete turns, tool arguments, handoffs, policies, and expected responses. Framework helpers can reduce setup, but document which layers they do not exercise.

LiveKit Agents provides a test framework integrated with pytest/Vitest for asserting messages, tool calls, arguments, and handoffs. The current documentation describes these tests as **text-based**, runnable locally or in CI. They use the real LLM provider but do not create a LiveKit room connection.[^livekit-testing]

That is useful evidence about agent logic. It does not certify WebRTC, SIP, a carrier, jitter, real audio VAD, or production playout.

Pipecat Evals runs scenarios against the real agent. Text mode bypasses STT/TTS, while audio mode exercises the STT/LLM/TTS pipeline. The important boundary is that its **eval transport replaces Daily/WebRTC/telephony with a local RTVI/WebSocket server**, so even audio-mode evals do not certify the production transport.[^pipecat-evals]

### 3. Audio and multi-turn scenarios

Add fixed or generated audio, noise, interruptions, difficult pronunciations, goal changes, and adversarial tool outcomes. If the exact audio that failed matters, turn it into a reproducible fixture rather than relying only on newly synthesized audio each run.

### 4. Tests over the deployed transport

Run real or simulated calls over the paths users actually take: browser/WebRTC, SIP/PSTN, or carrier WebSocket. This is where NAT, codec negotiation, packet loss, reconnection, and buffering appear.

### 5. Production evidence and human review

Sample real sessions under explicit privacy and retention rules, identify failure clusters, review ambiguous cases, and turn reproducible failures into regression coverage. Production is not your only eval set. It is a source of cases and distributions that synthetic tests do not know in advance.

## Correct replay means more than resending the transcript

Replay has multiple levels:

1. **Transcript replay:** resend text to test logic, context, and mocked tools.
2. **Audio replay:** reuse the same input audio for STT/turn-taking and, when appropriate, compare output.
3. **Event replay:** reproduce framework/transport events with controlled timing.
4. **Dependency replay:** replace providers/tools with recorded responses to isolate a state machine.
5. **Full-path replay:** traverse the deployed transport and real dependencies or staging equivalents.

Pick the level that can reproduce the mechanism. A prompt regression may reduce to text. A false barge-in requires audio and timing. A reconnect bug may require transport events. A duplicate charge needs the operation ledger and system of record.

Persist agent version, prompt/configuration, and relevant dependency versions so you can explain why a later replay does or does not reproduce an old case.

## Observability should connect the logical turn, not just provider calls

A useful trace has a stable turn span or correlation boundary and links internal attempts to it. Conceptually:

```text
voice.session
└── voice.turn              turn_id=...
    ├── turn.detect
    ├── stt.finalize
    ├── model.response      attempt=1
    ├── tool.operation      operation_id=...
    ├── model.response      attempt=2 / fallback if needed
    ├── tts.synthesize
    └── media.playout
```

Do not put high-cardinality free text, full transcripts, or unique IDs into metric labels. OpenTelemetry recommends that `error.type` be predictable and low-cardinality. Successful operations should not carry `error.type`, which lets consumers derive error rates from one operation metric without creating a separate metric family per failure string.[^otel-errors]

Keep high-cardinality detail in traces, logs, or suitable storage and correlate it with stable IDs.

## LiveKit: separate SDK evidence from Cloud capabilities

LiveKit Agents exposes session data in the SDK: `session.history`, turn-progress events, component/turn/session metrics, and a final `SessionReport`. `ctx.make_session_report()` and `to_dict()` operate on data already collected in the agent process and also work in self-hosted deployments without calling LiveKit Cloud.[^livekit-data]

The SDK also instruments sessions with OpenTelemetry and can export spans to an OTLP-compatible backend.[^livekit-tracing]

**Agent insights** is a LiveKit Cloud capability. Its timeline combines transcripts, traces, logs, and audio. It works for Cloud-deployed agents and self-hosted agents connected to LiveKit Cloud media servers, but not for fully self-hosted media servers.[^livekit-insights]

That distinction matters when comparing stacks. “LiveKit has a timeline with audio” is not the same claim as “the open-source Agents runtime includes that managed backend.”

Session timeline logs also do not cover every server-level failure. The Insights documentation separates crashes, startup failures, and dispatch errors outside a session and points to log drains for that failure domain.[^livekit-insights]

### Recoverable errors are not equivalent to successful turns

`AgentSession` emits `ErrorEvent` for STT, LLM, TTS, and realtime model failures. The `recoverable` property belongs to the contained error object, so the relevant boundary is `ev.error.recoverable`. A recoverable error can be retried automatically; an unrecoverable one closes the session unless the application intervenes.[^livekit-errors]

Record the internal error and the recovery path, then determine the turn outcome from additional evidence. `recoverable=True` describes runtime recovery semantics, not product success.

## Pipecat: frame-level visibility is useful, but keep product boundaries

Pipecat can emit `MetricsFrame` objects for performance and usage. `UserBotLatencyObserver` measures from detected user-speech stop to bot-speech start and can attach service-level breakdowns when metrics are enabled.[^pipecat-metrics][^pipecat-userbot]

`TurnTrackingObserver` exposes turn start/end and interruption state. Other built-in observers cover LLM activity, transcription, and startup timing.[^pipecat-observers]

For errors, a `FrameProcessor` fires `on_error` before an `ErrorFrame` is propagated upstream. `ErrorFrame` carries an error string, optional exception, source processor, and a `fatal` flag indicating whether the pipeline will be cancelled.[^pipecat-errors]

These primitives can support a detailed pipeline ledger. They should not become the entire product taxonomy. A fatal `ErrorFrame` describes pipeline behavior. It does not tell you whether a booking was committed or whether the caller heard partial audio.

Pipecat's own Evals lifecycle documentation also draws the boundary around local regression coverage: deployed transport, sustained load/concurrency, hidden tool state, production drift, exact-audio replay, and persisted trend comparisons need additional layers.[^pipecat-lifecycle]

## LiveKit Agents vs Pipecat vs vanilla/thin for evaluation and observability

There is no universal winner. The decision depends on how much evidence plumbing and quality infrastructure you want the runtime to own versus your application.

| Dimension | LiveKit Agents | Pipecat | Vanilla/thin Python |
|---|---|---|---|
| runtime events | session events, metrics, reports, OTel | frames, processor events, metrics, observers | you define and emit them |
| tests close to code | text-based behavior/tools/handoff framework | Pipecat Evals text/audio over eval transport | your harness or independent libraries |
| managed observability | Agent insights is LiveKit Cloud, not self-hosted core | Pipecat Cloud extras are managed, not core | your backend/OTel/vendor choice |
| production transport | needs separate evidence from the test framework | eval transport does not certify WebRTC/SIP/telephony | you build/integrate the transport and its test path |
| business failure taxonomy | application-owned | application-owned | application-owned |
| exact replay | export and retain the evidence you need | export and retain the evidence you need | full ownership and full operational responsibility |
| velocity vs control | more built-in conventions and primitives | strong pipeline/frame visibility | maximum control with the largest design/ops surface |

### Choose LiveKit Agents when

You already use its session/media/agent abstractions and want events, metrics, reports, and test helpers aligned to that runtime. If LiveKit Cloud is also an acceptable media/observability plane, Agent insights can remove integration work. Keep business ground truth, sampling policy, regression cases, and any retention beyond the managed service's contract under application control.

### Choose Pipecat when

An explicit pipeline and frame/processor-level instrumentation help you localize faults, and you want repository-local Evals. Keep separate tests for the real transport, load/concurrency, tool side effects, and exact audio whenever those boundaries are part of the risk.

### Choose vanilla/thin Python when

You need your own evidence schema, exhaustive protocol/event access, or a harness that does not fit the framework abstractions. You now own IDs, traces, metrics, structured logs, error taxonomy, sampling, redaction, audio capture, replay, fixtures, judges, dashboards, alerts, retention, CI gates, and correlation with business state. A thinner runtime does not make that system disappear.

### A hybrid is often the clean boundary

Use LiveKit or Pipecat for media/runtime while keeping an **application-owned canonical turn ledger** exported through OpenTelemetry plus your own evaluation store. That preserves quality history across framework changes and keeps business outcome grounded in the system of record.

## Three concrete failures and the evidence they need

### Case 1 — The agent is slow but eventually correct

Evidence:

```text
turn_commit = 10:00:00.000
provider timeout at attempt 1
fallback attempt 2 succeeds
first_playout = 10:00:01.420
business outcome = SUCCESS
```

Do not label this `wrong_answer`. Record provider failure, recovery, and latency impact. The release gate may still fail on interaction latency even though task correctness passes.

### Case 2 — The agent says “booked” while the tool is UNKNOWN

The transcript looks good. The evaluation must resolve the `operation_id` against the system of record. Without commit evidence, the turn is not successful merely because the model claimed success.

Turn this into a regression fixture where the mutating request was sent but its response was lost, and require reconciliation before the agent confirms the action.

### Case 3 — The user barges in but old audio keeps playing

You need audio/timestamps or playout events. Transcript replay cannot reproduce the failure. Preserve the sequence `user_speech_start → interruption accepted → generation cancelled → output queue cleared → playback stopped` and assert the boundary that actually controls the device or carrier.

## Turn production failures into the smallest useful regression

Do not copy every bad production session into a giant end-to-end suite. Minimize the case first.

```text
production failure
→ classify stage/symptom/cause/recovery/impact
→ isolate the smallest reproducible evidence
→ choose transcript/audio/event/dependency/full-path replay
→ add deterministic assertions where possible
→ add a judge only for irreducibly semantic/perceptual properties
→ gate the regression at the cheapest layer that reproduces it
```

If the failure only occurs on PSTN through one carrier, a text test is the wrong gate. If the failure is tool idempotency, a full phone call is unnecessary to block it.

The goal is for every incident to reduce the chance of repeating **the same failure mechanism**, not to accumulate a directory of expensive conversations nobody can diagnose.

## Privacy and security are part of observability design

Audio, transcripts, tool arguments, and traces can contain sensitive data. Define explicitly:

- which signals you collect and why
- what is redacted before leaving the process
- who can read audio, transcripts, and tool payloads
- how long each data class is retained
- what is sampled and what is retained in full
- how data associated with a session or user is deleted when the product requires it

Do not assume a managed service's redaction protects data your application exported elsewhere first. LiveKit, for example, documents that its PII redaction applies to data stored in LiveKit Cloud. Data collected or exported independently by your agent is outside that redaction boundary.[^livekit-pii]

With vanilla, the entire contract is application-owned. With any framework, business state and tool credentials still need controls independent of telemetry.

## A production release checklist for voice-agent quality

Before trusting a release:

1. Define the `turn_id` and timing boundaries shared across components.
2. Separate outcome, interaction quality, media, and runtime/dependency health.
3. Use a taxonomy with stage, symptom, cause, recovery, and user impact.
4. Define every denominator before publishing a rate.
5. Keep internal attempts separate from logical operations.
6. Preserve `UNKNOWN` as a real state for unreconciled side effects.
7. Use deterministic assertions for invariants and judges only where they add signal.
8. Run cheap behavioral tests on every meaningful change.
9. Add audio when the failure depends on STT/TTS/VAD/turn-taking.
10. Test the deployed transport when WebRTC/SIP/carrier/network behavior is part of the risk.
11. Correlate traces, logs, metrics, audio, and tool state under one session/turn/operation schema.
12. Segment quality by version, provider, transport, region, and relevant intent.
13. Preserve both failure and recovery, not only the final state.
14. Minimize production failures into reproducible regression cases.
15. Treat privacy, redaction, access, and retention as part of the observability contract.

An observability platform helps you see events. An evaluation strategy decides what those events mean for the product. Reliability emerges when both are connected by an explicit failure model and every reproducible production failure can become a gate that prevents the same mechanism from returning.

## References

[^livekit-testing]: LiveKit, [Testing and evaluation](https://docs.livekit.io/agents/start/testing/).
[^livekit-data]: LiveKit, [Data hooks](https://docs.livekit.io/deploy/observability/data/).
[^livekit-tracing]: LiveKit, [Export traces](https://docs.livekit.io/deploy/observability/tracing/).
[^livekit-insights]: LiveKit, [Agent insights in LiveKit Cloud](https://docs.livekit.io/deploy/observability/insights/).
[^livekit-errors]: LiveKit, [Events and error handling](https://docs.livekit.io/reference/agents/events/).
[^livekit-pii]: LiveKit, [PII redaction](https://docs.livekit.io/deploy/observability/pii-redaction/).
[^pipecat-evals]: Pipecat, [Pipecat Evals](https://docs.pipecat.ai/pipecat/evals/overview).
[^pipecat-lifecycle]: Pipecat, [Evals Lifecycle](https://docs.pipecat.ai/pipecat/evals/lifecycle).
[^pipecat-metrics]: Pipecat, [Metrics](https://docs.pipecat.ai/pipecat/fundamentals/metrics).
[^pipecat-userbot]: Pipecat, [User-Bot Latency Observer](https://docs.pipecat.ai/api-reference/server/utilities/observers/user-bot-latency-observer).
[^pipecat-observers]: Pipecat, [Observer Pattern](https://docs.pipecat.ai/api-reference/server/utilities/observers/observer-pattern).
[^pipecat-errors]: Pipecat, [FrameProcessor Events — Error Handling](https://docs.pipecat.ai/api-reference/server/events/frame-processor-events).
[^otel-errors]: OpenTelemetry, [Recording errors](https://opentelemetry.io/docs/specs/semconv/general/recording-errors/).
